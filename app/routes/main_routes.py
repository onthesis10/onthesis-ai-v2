# File: app/routes/main_routes.py
# Deskripsi: Route utama dashboard & profil. Refactored to use Service Layer.

import os
import logging
from flask import render_template, request, flash, redirect, url_for, jsonify
from flask_login import login_required, current_user
from firebase_admin import auth
import PyPDF2

from . import main_bp
from app import firestore_db
from app.utils import general_utils, search_utils, ai_utils
# Import Service Baru
from app.services.dashboard_service import DashboardService
from app.utils import search_utils, graph_utils
from app.services.ai_service import AIService

ai_service = AIService()

logger = logging.getLogger(__name__)

# --- HALAMAN VIEW (HTML) ---

@main_bp.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    return render_template('landing.html')

@main_bp.route('/dashboard')
@login_required
def dashboard():
    firebase_custom_token = getattr(current_user, 'firebase_custom_token', None)
    return render_template('spa.html', firebase_custom_token=firebase_custom_token)

@main_bp.route('/projects')
@login_required
def projects():
    firebase_custom_token = getattr(current_user, 'firebase_custom_token', None)
    return render_template('spa.html', firebase_custom_token=firebase_custom_token)

@main_bp.route('/analysis')
@main_bp.route('/analysis/<path:path>')
@login_required
def analysis(path=None):
    firebase_custom_token = getattr(current_user, 'firebase_custom_token', None)
    return render_template('spa.html', firebase_custom_token=firebase_custom_token)

@main_bp.route('/writing')
@main_bp.route('/writing/<path:path>')
@login_required
def writing(path=None):
    firebase_custom_token = getattr(current_user, 'firebase_custom_token', None)
    return render_template('spa.html', firebase_custom_token=firebase_custom_token)

@main_bp.route('/map')
@login_required
def map_page():
    return render_template('research_map.html')

@main_bp.route('/citations')
@login_required
def citation_management():
    firebase_custom_token = getattr(current_user, 'firebase_custom_token', None)
    return render_template('spa.html', firebase_custom_token=firebase_custom_token)

@main_bp.route('/search-references')
@login_required
def search_references():
    return redirect(url_for('main.citation_management'))

@main_bp.route('/paraphrase')
@login_required
def paraphrase_page():
    firebase_custom_token = getattr(current_user, 'firebase_custom_token', None)
    return render_template('spa.html', firebase_custom_token=firebase_custom_token)

@main_bp.route('/chat-ai')
@login_required
def chat_ai():
    return render_template('chat_ai.html')

@main_bp.route('/upgrade')
@login_required
def upgrade_page():
    client_key = os.getenv('MIDTRANS_CLIENT_KEY')
    return render_template('upgrade.html', client_key=client_key)

@main_bp.route('/research-map')
@login_required
def research_map_page():
     # Legacy redirection or same as map_page
    return render_template('research_map.html')

@main_bp.route('/thesis-defense')
@login_required
def thesis_defense():
    return render_template('thesis_defense.html')

@main_bp.route('/defense') # Alias
@login_required
def defense():
    return redirect(url_for('main.thesis_defense'))

# --- HALAMAN PROFIL ---

@main_bp.route('/profile', methods=['GET', 'POST'])
@login_required
def user_profile():
    if request.method == 'POST':
        try:
            new_name = request.form.get('name')
            if not new_name or len(new_name) < 3:
                flash('Nama tampilan harus memiliki setidaknya 3 karakter.', 'danger')
                return redirect(url_for('main.user_profile'))
            
            user_id = str(current_user.id)
            
            # Update Firestore & Auth (Bisa dipindah ke UserService nanti)
            firestore_db.collection('users').document(user_id).update({'displayName': new_name})
            auth.update_user(user_id, display_name=new_name)
            
            flash('Profil berhasil diperbarui!', 'success')
        except Exception as e:
            logger.error(f"Profile Update Error: {e}")
            flash(f'Gagal memperbarui profil: {e}', 'danger')
        return redirect(url_for('main.user_profile'))
    
    client_key = os.getenv('MIDTRANS_CLIENT_KEY')
    return render_template('user-profile.html', midtrans_client_key=client_key)


# --- API ENDPOINTS (REFACTORED) ---

@main_bp.route('/api/dashboard-stats', methods=['GET'])
@login_required
def dashboard_stats():
    """
    API Dashboard Stats.
    Logic dipindah ke DashboardService.
    """
    try:
        stats_data = DashboardService.get_user_stats(current_user.id, current_user.is_pro)
        
        return jsonify({
            'status': 'success',
            'stats': {
                'projects': stats_data['projects'],
                'references': stats_data['references'],
                'isPro': stats_data['isPro']
            },
            'chart': stats_data['chart']
        })

    except Exception as e:
        logger.error(f"Dashboard API Error: {e}")
        return jsonify({'error': str(e)}), 500

@main_bp.route('/api/maintenance/cleanup-orphans', methods=['POST'])
@login_required
def cleanup_orphans():
    """
    API Maintenance: Clean Orphaned Citations.
    Logic dipindah ke DashboardService.
    """
    try:
        result = DashboardService.cleanup_orphaned_citations(current_user.id)
        
        return jsonify({
            'status': 'success', 
            'message': f"Berhasil membersihkan {result['deleted_count']} referensi hantu.",
            'valid_projects': result['valid_projects_count']
        })

    except Exception as e:
        logger.error(f"Cleanup API Error: {e}")
        return jsonify({'error': str(e)}), 500

# --- API LAINNYA (Existing) ---

@main_bp.route('/api/get-user-projects', methods=['GET'])
@login_required
def get_user_projects():
    """API untuk mengambil daftar proyek riset milik user."""
    # TODO: Pindahkan ke ProjectService di iterasi berikutnya
    try:
        projects = []
        project_docs = firestore_db.collection('projects').where('userId', '==', str(current_user.id)).stream()
        
        for doc in project_docs:
            data = doc.to_dict()
            projects.append({
                'id': doc.id,
                'title': data.get('title', 'Proyek Tanpa Nama')
            })
        return jsonify(projects)
    except Exception as e:
        logger.error(f"Error fetching projects: {e}")
        return jsonify({"error": "Gagal mengambil data proyek."}), 500

@main_bp.route('/api/unified-search-references', methods=['POST'])
@login_required
def api_unified_search():
    if not request.is_json:
        return jsonify({"error": "Request harus berupa JSON"}), 400
        
    try:
        data = request.get_json()
        query = data.get('query')
        if not query: return jsonify({"error": "Query kosong"}), 400

        # CCTV Log
        general_utils.log_user_activity(firestore_db, current_user.id, 'search', {'query': query})

        results = search_utils.unified_search(
            query=query,
            sources=data.get('sources'),
            year=data.get('year')
        )
        return jsonify({"message": "Success", "results": results}), 200

    except Exception as e:
        logger.error(f"Search API Error: {e}")
        return jsonify({'error': str(e)}), 500


@main_bp.route('/api/analyze-document', methods=['POST'])
@login_required
def analyze_document():
    if 'document' not in request.files: return jsonify({'error': 'File required'}), 400
    file = request.files['document']
    
    try:
        # CCTV Log
        general_utils.log_user_activity(firestore_db, current_user.id, 'analysis', {'type': 'doc_extract'})

        # --- LOGIKA BARU (Simple Extract) ---
        # Kita baca langsung PDF-nya di sini tanpa bergantung pada ai_utils yang error
        
        pdf_reader = PyPDF2.PdfReader(file)
        full_text = ""
        
        # Limit 30 halaman biar cepat
        max_pages = min(len(pdf_reader.pages), 30)
        for i in range(max_pages):
            page_text = pdf_reader.pages[i].extract_text()
            if page_text:
                full_text += page_text + "\n"
        
        clean_text = full_text.strip()

        if not clean_text: 
            return jsonify({'error': 'File unreadable/scanned'}), 400

        # Return format yang diharapkan frontend
        metadata = {
            'title': file.filename,
            'author': 'Dokumen Upload',
            'year': '2024',
            'journal': 'PDF Reference',
            'abstract': clean_text[:500] + "...", # Preview
            'full_text': clean_text # Simpan full text jika perlu
        }

        return jsonify({'status': 'success', 'references': [metadata]})

    except Exception as e:
        logger.error(f"Doc Analysis Error: {e}")
        return jsonify({'error': str(e)}), 500

@main_bp.route('/api/research-graph', methods=['POST'])
@login_required
def get_research_graph():
    data = request.json
    query = data.get('query')
    limit = data.get('limit', 15)

    if not query:
        return jsonify({'error': 'Query is required'}), 400
    
    try:
        # 1. Cari Paper
        # Kita panggil search_utils
        raw_results = search_utils.unified_search(query=query, sources=['crossref', 'openalex', 'doaj'], limit=limit)
        
        # Normalisasi hasil
        papers = raw_results if isinstance(raw_results, list) else raw_results.get('results', [])

        # 2. Bangun Graph
        # [FIX DISINI] Gunakan nama fungsi yang benar dari graph_utils
        graph_data = graph_utils.build_citation_network(papers)
        
        return jsonify({
            'status': 'success',
            'query': query,
            'data': graph_data
        })

    except Exception as e:
        logger.error(f"Graph API Error: {e}")
        return jsonify({'error': str(e)}), 500

@main_bp.route('/api/research-insight', methods=['POST'])
@login_required
def get_research_insight():
    data = request.json
    papers = data.get('papers', [])
    
    if not papers:
        return jsonify({'error': 'No papers provided'}), 400

    try:
        # Panggil otak AI baru kita
        insight = ai_service.generate_research_landscape_analysis(papers)
        return jsonify({
            'status': 'success',
            'data': insight
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
        
# app/routes/main_routes.py

# --- API Simpan Referensi ---
@main_bp.route('/api/save-reference', methods=['POST'])
@login_required
def save_reference():
    """
    Menyimpan paper dari Research Map ke Project User.
    Disimpan sebagai file JSON sederhana di folder user untuk sementara.
    """
    try:
        paper_data = request.json
        if not paper_data:
            return jsonify({'error': 'No data provided'}), 400
            
        user_id = current_user.id
        
        # Format data yang akan disimpan (Standardized)
        ref_entry = {
            "id": paper_data.get('id'),
            "title": paper_data.get('title'),
            "authors": paper_data.get('authors'),
            "year": paper_data.get('year'),
            "journal": paper_data.get('journal'),
            "abstract": paper_data.get('abstract'),
            "doi": paper_data.get('doi'),
            "url": paper_data.get('pdfUrl'),
            "saved_at": datetime.now().isoformat()
        }
        
        # Simpan ke 'references.json' milik user (Simple Storage)
        # Nanti bisa diupgrade ke SQLite/Firebase
        user_folder = os.path.join('instance', 'users', user_id)
        os.makedirs(user_folder, exist_ok=True)
        
        ref_file = os.path.join(user_folder, 'saved_references.json')
        
        current_refs = []
        if os.path.exists(ref_file):
            with open(ref_file, 'r') as f:
                try:
                    current_refs = json.load(f)
                except: pass
        
        # Cek duplikasi
        if not any(r['id'] == ref_entry['id'] for r in current_refs):
            current_refs.append(ref_entry)
            with open(ref_file, 'w') as f:
                json.dump(current_refs, f, indent=2)
                
        return jsonify({'status': 'success', 'message': 'Referensi tersimpan'})

    except Exception as e:
        logger.error(f"Save Ref Error: {e}")
        return jsonify({'error': str(e)}), 500

@main_bp.route('/api/expand-graph', methods=['POST'])
@login_required
def expand_graph():
    """
    Endpoint untuk Snowballing: Mengambil paper terkait dari satu node.
    """
    data = request.json
    doi = data.get('doi')
    original_id = data.get('id')
    
    if not doi:
        return jsonify({'error': 'DOI is required for snowballing'}), 400

    try:
        # 1. Cari Related Papers (Snowball)
        new_papers = search_utils.get_openalex_related(doi, limit=6) # Ambil 6 cited + 6 refs = 12 total
        
        if not new_papers:
            return jsonify({'status': 'empty', 'message': 'Tidak ditemukan relasi tambahan.'})

        # 2. Bangun Graph Fragment (Node & Link baru)
        # Kita pakai graph_utils untuk bikin node-nya, tapi link-nya kita bikin manual
        # agar terhubung ke 'original_id' (pusat snowball)
        
        nodes = []
        links = []
        
        # Reuse existing util for consistent formatting/embedding if needed
        # Tapi disini kita manual saja biar cepat dan pasti connect
        for p in new_papers:
            node_id = p['id']
            nodes.append({
                "id": node_id,
                "title": p['title'],
                "year": p['year'],
                "authors": p['author'],
                "journal": p['journal'],
                "abstract": p['abstract'][:300] + "...",
                "val": 8, # Ukuran agak lebih kecil dari search utama
                "group": "snowball", # Warna beda dikit nanti
                "doi": p['doi'],
                "pdfUrl": p['pdfUrl']
            })
            
            # Buat Link ke Origin
            links.append({
                "source": original_id, # Hubungkan ke node yang diklik
                "target": node_id,
                "value": 0.8 # Koneksi kuat
            })

        return jsonify({
            'status': 'success',
            'data': { 'nodes': nodes, 'links': links }
        })

    except Exception as e:
        logger.error(f"Snowball Error: {e}")
        return jsonify({'error': str(e)}), 500
    
@main_bp.route('/.well-known/appspecific/com.chrome.devtools.json')
def chrome_devtools_silencer():
    return jsonify({}), 200
