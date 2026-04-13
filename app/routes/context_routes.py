import os
import logging
import datetime
import time
import uuid
from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename
from firebase_admin import firestore
from bs4 import BeautifulSoup

# Import Internal App
from app import firestore_db, limiter
from app.services.document_pipeline import prepare_document_upload
from app.services.rag_service import LiteContextEngine

context_bp = Blueprint('context', __name__)
rag_engine = LiteContextEngine()
logger = logging.getLogger(__name__)
BACKGROUND_TASK_STATE = {
    "memory_sync": {},
    "revision": {},
}


def _split_into_chunks(text: str, max_chars: int = 800) -> list:
    """Pecah teks per paragraf, gabungkan paragraf pendek agar chunk tidak terlalu kecil."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks = []
    current = ""
    for para in paragraphs:
        if len(current) + len(para) > max_chars and current:
            chunks.append(current.strip())
            current = para
        else:
            current = (current + "\n\n" + para).strip()
    if current:
        chunks.append(current)
    return chunks if chunks else [text]
# =========================================================
# BAGIAN 1: RAG / REFERENCE UPLOAD (LESTARI)
# =========================================================

ALLOWED_EXTENSIONS = {'pdf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def _html_to_plain_text(html_content: str) -> str:
    soup = BeautifulSoup(html_content or "", "html.parser")
    return soup.get_text("\n", strip=True)


def _should_run_background_task(bucket: str, task_key: str, content: str, *, min_interval_seconds: int, min_size_delta: int) -> bool:
    now = time.monotonic()
    content_length = len(content or "")
    previous = BACKGROUND_TASK_STATE[bucket].get(task_key)

    if previous:
        interval_ok = (now - previous["ts"]) >= min_interval_seconds
        delta_ok = abs(content_length - previous["length"]) >= min_size_delta
        if not interval_ok and not delta_ok:
            return False

    BACKGROUND_TASK_STATE[bucket][task_key] = {
        "ts": now,
        "length": content_length,
    }
    return True

@context_bp.route('/api/upload-reference', methods=['POST'])
@login_required
def upload_reference():
    if 'file' not in request.files: return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    user_id = str(current_user.id)
    project_id = str(request.form.get('projectId') or request.args.get('projectId') or '').strip()
    
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file'}), 400
    if not project_id:
        return jsonify({'error': 'projectId is required'}), 400

    project_ref = firestore_db.collection('projects').document(project_id)
    project_doc = project_ref.get()
    if not project_doc.exists or project_doc.to_dict().get('userId') != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
        
    try:
        upload_meta = prepare_document_upload(file, user_id, project_id, current_app.instance_path)
        document_ref = project_ref.collection('documents').document(upload_meta['doc_id'])
        document_payload = {
            'id': upload_meta['doc_id'],
            'projectId': project_id,
            'userId': user_id,
            'filename': upload_meta['filename'],
            'original_filename': file.filename,
            'content_type': upload_meta['content_type'],
            'byte_size': upload_meta['byte_size'],
            'storage_backend': upload_meta['storage_backend'],
            'storage_path': upload_meta['storage_path'],
            'file_url': upload_meta['file_url'],
            'embedding_status': 'queued',
            'chunk_count': 0,
            'token_count': 0,
            'context_summary': '',
            'created_at': firestore.SERVER_TIMESTAMP,
            'updated_at': firestore.SERVER_TIMESTAMP,
        }
        document_ref.set(document_payload, merge=True)

        def process_document_background():
            try:
                document_ref.set({
                    'embedding_status': 'processing',
                    'updated_at': firestore.SERVER_TIMESTAMP,
                }, merge=True)
                result = rag_engine.process_document(
                    upload_meta['local_path'],
                    upload_meta['doc_id'],
                    user_id,
                    project_id=project_id,
                )
                if result.get('status') != 'success':
                    raise RuntimeError(result.get('message') or 'Unknown processing error')

                document_ref.set({
                    'embedding_status': 'ready',
                    'chunk_count': int(result.get('chunks_count') or 0),
                    'token_count': int(result.get('token_count') or 0),
                    'context_summary': result.get('context_summary', ''),
                    'updated_at': firestore.SERVER_TIMESTAMP,
                    'processed_at': firestore.SERVER_TIMESTAMP,
                }, merge=True)

                ready_docs = [
                    doc.to_dict() or {}
                    for doc in project_ref.collection('documents').where('embedding_status', '==', 'ready').stream()
                ]
                summary_blocks = [
                    str(item.get('context_summary', '')).strip()
                    for item in ready_docs
                    if str(item.get('context_summary', '')).strip()
                ]
                project_ref.set({
                    'context_summary': "\n\n".join(summary_blocks[:5]),
                    'updated_at': firestore.SERVER_TIMESTAMP,
                    'updatedAt': firestore.SERVER_TIMESTAMP,
                    'lastUpdated': firestore.SERVER_TIMESTAMP,
                }, merge=True)
            except Exception as process_error:
                logger.error(f"Document processing error: {process_error}")
                document_ref.set({
                    'embedding_status': 'error',
                    'error': str(process_error),
                    'updated_at': firestore.SERVER_TIMESTAMP,
                }, merge=True)

        try:
            from gevent import spawn
            spawn(process_document_background)
        except Exception:
            process_document_background()

        return jsonify({
            'status': 'accepted',
            'document': {
                'id': upload_meta['doc_id'],
                'filename': upload_meta['filename'],
                'file_url': upload_meta['file_url'],
                'embedding_status': 'queued',
                'chunk_count': 0,
                'token_count': 0,
                'context_summary': '',
            }
        }), 202
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@context_bp.route('/api/projects/<project_id>/documents', methods=['GET'])
@login_required
def list_project_documents(project_id):
    try:
        project_ref = firestore_db.collection('projects').document(project_id)
        project_doc = project_ref.get()
        if not project_doc.exists or project_doc.to_dict().get('userId') != str(current_user.id):
            return jsonify({'error': 'Unauthorized'}), 403

        documents = []
        for doc in project_ref.collection('documents').stream():
            data = doc.to_dict() or {}
            documents.append({
                'id': doc.id,
                'filename': data.get('filename', ''),
                'file_url': data.get('file_url', ''),
                'embedding_status': data.get('embedding_status', 'queued'),
                'chunk_count': int(data.get('chunk_count') or 0),
                'token_count': int(data.get('token_count') or 0),
                'context_summary': data.get('context_summary', ''),
                'updated_at': data.get('updated_at').isoformat() if hasattr(data.get('updated_at'), 'isoformat') else str(data.get('updated_at', '')),
            })

        documents.sort(key=lambda item: item.get('updated_at', ''), reverse=True)
        return jsonify({'status': 'success', 'documents': documents}), 200
    except Exception as e:
        logger.error(f"List Documents Error: {e}")
        return jsonify({'status': 'error', 'documents': [], 'message': str(e)}), 500

# =========================================================
# BAGIAN 2: SCALABLE PROJECT CONTEXT (FIXED)
# =========================================================
@context_bp.route('/api/project-context/<project_id>', methods=['GET'])
@login_required
def get_project_context(project_id):
    try:
        doc_ref = firestore_db.collection('projects').document(project_id)
        doc = doc_ref.get()

        if not doc.exists:
            return jsonify({'status': 'error', 'message': 'Project not found'}), 404

        data = doc.to_dict()
        if data.get('userId') != str(current_user.id):
            return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403

        # 1. AMBIL SEMUA CHAPTER
        chapters_ref = doc_ref.collection('chapters').stream()
        
        raw_chapters = []
        for ch in chapters_ref:
            d = ch.to_dict()
            raw_chapters.append({
                'id': ch.id, # Ini DocumentSnapshot, jadi .id BISA
                'title': d.get('title', 'Untitled'),
                'original_index': d.get('index', 99)
            })

        # 2. LOGIKA SORTING PINTAR
        def get_sort_weight(chapter):
            # Pakai .get() biar aman kalau key title gak ada (walau default sudah ada)
            title = chapter.get('title', '').lower()
            if 'pendahuluan' in title: return 0
            if 'pustaka' in title or 'landasan' in title: return 1
            if 'metode' in title: return 2
            if 'hasil' in title or 'pembahasan' in title: return 3
            if 'penutup' in title or 'kesimpulan' in title: return 4
            return 99

        raw_chapters.sort(key=get_sort_weight)

        # 3. RE-INDEXING (BUG FIX DISINI)
        chapters_structure = []
        for new_index, ch in enumerate(raw_chapters):
            chapters_structure.append({
                'id': ch['id'], # [FIX] Pakai kurung siku karena 'ch' adalah dictionary
                'title': ch['title'],
                'index': new_index 
            })

        # Logic Migrasi Legacy
        if not chapters_structure and 'content' in data:
            chapters_structure.append({'id': 'chapter_1', 'title': 'Draft Utama', 'is_legacy': True})

        # 4. AMBIL REFERENSI
        refs_query = firestore_db.collection('citations')\
            .where('projectId', '==', project_id)\
            .stream()
            
        references_list = []
        for r in refs_query:
            r_data = r.to_dict()
            r_data['id'] = r.id
            if 'created_at' in r_data:
                ts = r_data['created_at']
                r_data['created_at'] = ts.isoformat() if hasattr(ts, 'isoformat') else str(ts)
            references_list.append(r_data)
        
        references_list.sort(key=lambda x: x.get('created_at', ''), reverse=True)

        # 5. RESPONSE
        response_data = {
            'id': doc.id,
            'title': data.get('title', 'Untitled Project'),
            'student_name': data.get('student_name', ''), 
            'university': data.get('university', ''),
            'degree_level': data.get('degree_level', 'S1'),
            
            # Konteks
            'problem_statement': data.get('problem_statement', ''),
            'research_objectives': data.get('research_objectives', ''),
            'significance': data.get('significance', ''),
            'theoretical_framework': data.get('theoretical_framework', ''),
            'variables_indicators': data.get('variables_indicators', ''),
            'methodology': data.get('methodology', 'quantitative'),
            'population_sample': data.get('population_sample', ''),
            'data_analysis': data.get('data_analysis', ''),
            
            # Additional Context Fields for AI Generate
            'study_field': data.get('study_field', ''),
            'hypothesis': data.get('hypothesis', ''),
            'keywords': data.get('keywords', ''),
            'scope_limitations': data.get('scope_limitations', ''),
            
            'chapters_structure': chapters_structure,
            'references': references_list,
            'updatedAt': data.get('updatedAt', '')
        }
        return jsonify(response_data), 200

    except Exception as e:
        import traceback
        traceback.print_exc() 
        return jsonify({'status': 'error', 'message': str(e)}), 500
                
@context_bp.route('/api/project/<project_id>/chapter/<chapter_id>', methods=['GET'])
@login_required
def get_chapter_content(project_id, chapter_id):
    """Mengambil isi konten spesifik per bab."""
    try:
        proj_ref = firestore_db.collection('projects').document(project_id)
        proj = proj_ref.get()
        if not proj.exists or proj.to_dict().get('userId') != str(current_user.id):
             return jsonify({'error': 'Unauthorized'}), 403

        if chapter_id == 'legacy_content':
            return jsonify({'content': proj.to_dict().get('content', '')})

        chap_doc = proj_ref.collection('chapters').document(chapter_id).get()
        content = ""
        if chap_doc.exists:
            content = chap_doc.to_dict().get('content', '')
        
        return jsonify({'content': content})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@context_bp.route('/api/project/<project_id>/chapter/save', methods=['POST'])
@login_required
@limiter.limit("500 per hour")
def save_chapter_content(project_id):
    try:
        import gevent
        from app.agent.memory_system import FirestoreDocumentDB, QdrantVectorDB, SharedMemory
        from app.services.revision_service import _compute_diff_and_narrative
        
        payload = request.get_json()
        chap_id = payload.get('chapterId', 'chapter_1')
        new_content = payload.get('content', '')
        save_mode = str(
            payload.get('saveMode')
            or request.headers.get('X-Save-Mode')
            or request.headers.get('Silent')
            or 'manual'
        ).lower()
        is_autosave = save_mode == 'autosave' or save_mode == 'true'
        
        # Persiapan Data Update
        update_data = {
            'content': new_content, 
            'updated_at': firestore.SERVER_TIMESTAMP,
            'index': payload.get('index', 0)
        }
        
        # [FIX] Hanya update judul jika dikirim frontend dan BUKAN default jelek
        new_title = payload.get('title')
        if new_title and new_title not in ['Bab Tanpa Judul', '']:
            update_data['title'] = new_title

        chap_ref = firestore_db.collection('projects').document(project_id)\
            .collection('chapters').document(chap_id)
            
        old_doc = chap_ref.get()
        old_content = ""
        if old_doc.exists:
             old_content = old_doc.to_dict().get('content', '')
        
        chap_ref.set(update_data, merge=True) # merge=True agar field lain aman

        firestore_db.collection('projects').document(project_id)\
            .update({'updated_at': firestore.SERVER_TIMESTAMP})
            
        def sync_document_memory_background(project_id_str, user_id, chapter_id, html_content):
             try:
                 plain_text = _html_to_plain_text(html_content)
                 if len(plain_text.strip()) < 50:
                     return

                 shared_memory = SharedMemory(
                     user_id,
                     project_id_str,
                     QdrantVectorDB(),
                     FirestoreDocumentDB(),
                 )
                 # S1-2: Split into paragraph-level chunks for granular retrieval
                 chunks = _split_into_chunks(plain_text, max_chars=800)
                 doc_id = shared_memory.project_scope
                 for idx, chunk in enumerate(chunks):
                     shared_memory.document.add_or_update_chunk(
                         doc_id=doc_id,
                         section=chapter_id,
                         content=chunk,
                         chunk_index=idx,
                     )
             except Exception as e:
                 logger.error(f"Background DocumentMemory sync error: {e}")

        # Revision Logic
        def save_revision_background(old_text, new_text, chapter_title_str, user_id, chapter_id, lightweight=False):
             try:
                 # Check word counts
                 def word_count(html_str):
                     import html2text
                     h2t = html2text.HTML2Text()
                     h2t.ignore_links = True
                     h2t.ignore_images = True
                     return len(h2t.handle(html_str).split())
                
                 wc_old = word_count(old_text)
                 wc_new = word_count(new_text)
                 
                 import litellm
                 from firebase_admin import firestore as fs
                 
                 diff_text = _compute_diff_and_narrative(old_text, new_text, chapter_title_str)
                 
                 # Only save if there's a meaningful difference (wc changes > 10 or narrative is significant)
                 if abs(wc_old - wc_new) > 10 or diff_text != "Tidak ada perubahan signifikan pada konten ini.":
                      if lightweight:
                          narrative_text = "Snapshot autosave tersimpan. Ringkasan revisi AI dilewati untuk menjaga editor tetap responsif."
                      else:
                          response = litellm.completion(
                            model="groq/llama-3.3-70b-versatile",
                            messages=[{
                                "role": "system",
                                "content": "Kamu adalah AI yang menganalisis perubahan dokumen akademik. Berikan narasi singkat 2 kalimat dalam Bahasa Indonesia tentang apa yang berubah. Fokus pada konten, bukan format."
                            }, {
                                "role": "user",
                                "content": f"Berikut diff dari {chapter_title_str}:\n\n{diff_text[:3000]}\n\nBuat narasi singkat 2 kalimat."
                            }],
                            max_tokens=120,
                            temperature=0.3
                          )
                          narrative_text = response.choices[0].message.content.strip()
                      
                      db = fs.client()
                      rev_ref = (
                        db.collection('users').document(user_id)
                        .collection('chapters').document(chapter_id)
                        .collection('revisions')
                      )
                      
                      revision_data = {
                            'html': new_text,
                            'wordCount': wc_new,
                            'narrative': narrative_text,
                            'timestamp': fs.SERVER_TIMESTAMP,
                            'userId': user_id,
                      }
                      rev_ref.add(revision_data)

             except Exception as e:
                 logger.error(f"Background Revision Error: {e}")

        task_key = f"{current_user.id}:{project_id}:{chap_id}"
        should_sync_memory = _should_run_background_task(
            "memory_sync",
            task_key,
            new_content,
            min_interval_seconds=45 if is_autosave else 10,
            min_size_delta=400 if is_autosave else 120,
        )
        should_save_revision = _should_run_background_task(
            "revision",
            task_key,
            new_content,
            min_interval_seconds=180 if is_autosave else 30,
            min_size_delta=1200 if is_autosave else 250,
        )

        if should_sync_memory:
            gevent.spawn(sync_document_memory_background, project_id, str(current_user.id), chap_id, new_content)

        if should_save_revision:
            gevent.spawn(
                save_revision_background,
                old_content,
                new_content,
                update_data.get('title', 'Bab'),
                str(current_user.id),
                chap_id,
                is_autosave,
            )
            
        return jsonify({'status': 'success'}), 200
    except Exception as e: return jsonify({'error': str(e)}), 500

@context_bp.route('/api/project-update/<project_id>', methods=['POST'])
@login_required
def update_project_meta(project_id):
    """
    Update Metadata Global (Judul, Penulis, Variabel) - BUKAN KONTEN BAB.
    """
    try:
        payload = request.get_json()
        print(f"[CONTEXT UPDATE] Payload: {payload}")

        # 1. Bersihkan Payload untuk DB (Tambahkan Timestamp)
        db_payload = payload.copy()
        db_payload['updatedAt'] = firestore.SERVER_TIMESTAMP

        # 2. Update Firestore (Pakai SET MERGE biar aman)
        doc_ref = firestore_db.collection('projects').document(project_id)
        doc_ref.set(db_payload, merge=True)

        # 3. FIX SENTINEL ERROR: Ganti Timestamp dengan String untuk Response JSON
        response_payload = payload.copy()
        response_payload['updatedAt'] = datetime.datetime.now().isoformat()

        return jsonify({'status': 'success', 'data': response_payload}), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'status': 'error', 'message': str(e)}), 500

# =========================================================
# BAGIAN 3: MANAJEMEN REFERENSI (TAMBAHAN WAJIB)
# =========================================================

@context_bp.route('/api/project/<project_id>/references/add', methods=['POST'])
@login_required
def add_project_reference(project_id):
    """
    Menyimpan referensi baru ke koleksi 'citations'.
    PENTING: Ini pasangan dari logika GET referensi tadi.
    """
    try:
        payload = request.get_json()
        
        # Validasi sederhana
        if not payload or 'title' not in payload:
            return jsonify({'status': 'error', 'message': 'Invalid reference data'}), 400

        # Persiapan data untuk Firestore
        ref_data = {
            'projectId': project_id,
            'userId': str(current_user.id),
            'title': payload.get('title', 'No Title'),
            'authors': payload.get('authors', 'Unknown'),
            'year': payload.get('year', ''),
            'journal': payload.get('journal', ''),
            'doi': payload.get('doi', ''),
            'url': payload.get('url', ''),
            'type': payload.get('type', 'journal'),
            'created_at': firestore.SERVER_TIMESTAMP
        }

        # Simpan ke koleksi 'citations'
        doc_ref = firestore_db.collection('citations').add(ref_data)
        
        # Return ID dokumen yang baru dibuat
        # (doc_ref[1] adalah referensi dokumennya)
        new_id = doc_ref[1].id
        
        return jsonify({
            'status': 'success', 
            'message': 'Reference saved',
            'id': new_id
        }), 200

    except Exception as e:
        logger.error(f"Error adding reference: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# =========================================================
# BAGIAN 4: MANAJEMEN CHAPTER (TAMBAHAN WAJIB)
# =========================================================

@context_bp.route('/api/project/<project_id>/chapter/create', methods=['POST'])
@login_required
def create_chapter(project_id):
    """
    Membuat chapter/bab baru.
    """
    try:
        payload = request.get_json() or {}
        title = payload.get('title', 'Bab Baru')
        
        # Cari urutan maksimal (index) saat ini agar bisa diletakkan di akhir
        doc_ref = firestore_db.collection('projects').document(project_id)
        if doc_ref.get().to_dict().get('userId') != str(current_user.id):
            return jsonify({'error': 'Unauthorized'}), 403

        chapters_ref = doc_ref.collection('chapters').stream()
        max_index = -1
        for ch in chapters_ref:
            ch_data = ch.to_dict()
            if ch_data.get('index', 0) > max_index:
                max_index = ch_data.get('index', 0)

        new_index = max_index + 1 if max_index >= 0 else 0

        new_doc_ref = doc_ref.collection('chapters').document()
        new_doc_ref.set({
            'title': title,
            'content': '',
            'index': new_index,
            'created_at': firestore.SERVER_TIMESTAMP,
            'updated_at': firestore.SERVER_TIMESTAMP
        })

        return jsonify({
            'status': 'success',
            'chapter': {
                'id': new_doc_ref.id,
                'title': title,
                'index': new_index
            }
        }), 200

    except Exception as e:
        logger.error(f"Error creating chapter: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@context_bp.route('/api/project/<project_id>/chapter/<chapter_id>/delete', methods=['DELETE'])
@login_required
def delete_chapter(project_id, chapter_id):
    """
    Menghapus sebuah chapter/bab.
    """
    try:
        doc_ref = firestore_db.collection('projects').document(project_id)
        if doc_ref.get().to_dict().get('userId') != str(current_user.id):
            return jsonify({'error': 'Unauthorized'}), 403

        # Hapus doc
        doc_ref.collection('chapters').document(chapter_id).delete()

        return jsonify({'status': 'success', 'message': 'Chapter deleted'}), 200

    except Exception as e:
        logger.error(f"Error deleting chapter: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@context_bp.route('/api/project/<project_id>/chapter/<chapter_id>/rename', methods=['PUT'])
@login_required
def rename_chapter(project_id, chapter_id):
    """
    Mengganti nama/judul sebuah chapter/bab.
    """
    try:
        payload = request.get_json() or {}
        new_title = payload.get('title')
        
        if not new_title:
             return jsonify({'status': 'error', 'message': 'Title is required'}), 400

        doc_ref = firestore_db.collection('projects').document(project_id)
        if doc_ref.get().to_dict().get('userId') != str(current_user.id):
            return jsonify({'error': 'Unauthorized'}), 403

        # Update doc
        doc_ref.collection('chapters').document(chapter_id).update({
             'title': new_title,
             'updated_at': firestore.SERVER_TIMESTAMP
        })

        return jsonify({'status': 'success', 'message': 'Chapter renamed', 'title': new_title}), 200

    except Exception as e:
        logger.error(f"Error renaming chapter: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500
