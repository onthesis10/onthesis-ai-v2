# ─── Phase 2 + Phase 3 Backend Routes ───
# Phase 2: Ghost Text, Quick Fix, Paragraph Analysis, Agentic AI
# Phase 3: Coherence Check, Argument Graph, Voice Score

import json
import logging
import time
from flask import Blueprint, request, jsonify, Response, stream_with_context
from flask_login import login_required, current_user
import litellm

from . import assistant_bp
from app import limiter

logger = logging.getLogger(__name__)


# ==============================================================================
# GHOST TEXT — Fast inline completion (max 80 tokens)
# ==============================================================================

@assistant_bp.route('/api/ghost-complete', methods=['POST'])
@login_required
@limiter.limit("30 per minute")
def ghost_complete():
    """Fast AI completion for Ghost Text plugin."""
    try:
        data = request.get_json()
        context_text = data.get('context', '')
        heading = data.get('heading', '')

        if not context_text or len(context_text.strip()) < 20:
            return jsonify({'completion': ''}), 200

        system_prompt = """Kamu adalah asisten penulisan skripsi akademik.
Tugasmu: LANJUTKAN teks yang diberikan user dengan 1-2 kalimat yang natural dan akademis.
ATURAN:
- Tulis dalam bahasa yang SAMA dengan teks konteks (Indonesia/Inggris).
- Gunakan gaya penulisan formal akademik.
- JANGAN ulangi teks yang sudah ditulis.
- JANGAN tambahkan keterangan, label, atau penjelasan. HANYA tulis kelanjutan teksnya.
- Maksimal 1-2 kalimat pendek."""

        user_prompt = f"""Konteks heading: {heading}

Teks terakhir:
{context_text[-800:]}

Lanjutkan (1-2 kalimat):"""

        response = litellm.completion(
            model="groq/llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=80,
            temperature=0.7,
            stream=False
        )

        completion = response.choices[0].message.content.strip()
        if completion.startswith('"') and completion.endswith('"'):
            completion = completion[1:-1]

        return jsonify({'completion': completion}), 200

    except Exception as e:
        logger.error(f"Ghost Complete Error: {e}")
        return jsonify({'completion': ''}), 200


# ==============================================================================
# QUICK FIX — AI text editing for diagnostic fixes
# ==============================================================================

@assistant_bp.route('/api/writing/quick-fix', methods=['POST'])
@login_required
@limiter.limit("20 per minute")
def writing_quick_fix():
    """
    Quick fix endpoint for diagnostic issues.
    Modes: formalize, shorten, paraphrase, improve
    """
    try:
        data = request.get_json()
        text = data.get('text', '')
        mode = data.get('mode', 'improve')

        if not text or len(text.strip()) < 5:
            return jsonify({'result': text}), 200

        prompts = {
            'formalize': f"""Ubah kalimat berikut menjadi bahasa akademis formal. 
JANGAN mengubah makna. HANYA formalkan gaya bahasa.
Teks: "{text}"
Versi formal:""",

            'shorten': f"""Pecah kalimat panjang berikut menjadi 2-3 kalimat pendek yang lebih mudah dipahami.
Pertahankan makna dan bahasa yang sama.
Teks: "{text}"
Versi lebih pendek:""",

            'paraphrase': f"""Parafrase kalimat berikut dengan cara yang berbeda namun tetap akademis.
Jangan ubah makna. Gunakan kata-kata berbeda dan struktur kalimat berbeda.
Teks: "{text}"
Versi parafrase:""",

            'improve': f"""Perbaiki kalimat berikut agar lebih akademis, koheren, dan jelas.
Teks: "{text}"
Versi perbaikan:""",
        }

        prompt = prompts.get(mode, prompts['improve'])

        response = litellm.completion(
            model="groq/llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "Kamu adalah editor akademik. Tulis HANYA hasilnya tanpa keterangan tambahan."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=300,
            temperature=0.5,
            stream=False
        )

        result = response.choices[0].message.content.strip()
        if result.startswith('"') and result.endswith('"'):
            result = result[1:-1]

        return jsonify({'result': result, 'mode': mode}), 200

    except Exception as e:
        logger.error(f"AI Edit Text Error: {e}")
        return jsonify({'result': text, 'error': str(e)}), 200


# ==============================================================================
# PARAGRAPH ANALYSIS — coherence, voice score, citation density
# ==============================================================================

@assistant_bp.route('/api/analyze/paragraph', methods=['POST'])
@login_required
@limiter.limit("15 per minute")
def analyze_paragraph():
    """
    Analyze a single paragraph for academic quality metrics.
    Returns: coherence (0-100), voiceScore (0-100), citationDensity, suggestions.
    """
    try:
        data = request.get_json()
        paragraph = data.get('text', '')
        heading = data.get('heading', '')

        if not paragraph or len(paragraph.strip()) < 20:
            return jsonify({
                'coherence': 0, 'voiceScore': 0,
                'citationDensity': 0, 'suggestions': []
            }), 200

        prompt = f"""Analisis paragraf akademik berikut. Berikan skor dan saran perbaikan.

Heading: {heading}
Paragraf: "{paragraph}"

Jawab HANYA dalam format JSON berikut (tanpa markdown, tanpa penjelasan):
{{
    "coherence": <skor 0-100, seberapa koheren dan logis paragraf ini>,
    "voiceScore": <skor 0-100, seberapa akademis gaya penulisan>,
    "citationDensity": <jumlah sitasi yang terdeteksi>,
    "suggestions": [
        "<saran perbaikan 1 (max 1 kalimat)>",
        "<saran perbaikan 2 (max 1 kalimat)>"
    ]
}}"""

        response = litellm.completion(
            model="groq/llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "Kamu adalah penilai kualitas penulisan akademik. Jawab HANYA dalam JSON yang valid."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=300,
            temperature=0.3,
            stream=False
        )

        raw = response.choices[0].message.content.strip()

        # Parse JSON response
        try:
            # Clean markdown code fence if present
            if raw.startswith('```'):
                raw = raw.split('\n', 1)[1].rsplit('```', 1)[0].strip()
            result = json.loads(raw)
        except json.JSONDecodeError:
            result = {
                'coherence': 70, 'voiceScore': 70,
                'citationDensity': 0, 'suggestions': ['Tidak dapat menganalisis paragraf ini.']
            }

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Paragraph Analysis Error: {e}")
        return jsonify({
            'coherence': 0, 'voiceScore': 0,
            'citationDensity': 0, 'suggestions': [str(e)]
        }), 200


# ==============================================================================
# CHAPTER SUMMARY — Context Memory System (Sprint 2)
# ==============================================================================

# @assistant_bp.route('/api/summarize-chapter', methods=['POST'])
@login_required
@limiter.limit("10 per minute")
def summarize_chapter():
    """
    Generate a concise 3-5 sentence summary of a chapter.
    Part of the 3-layer memory system:
      LONG-TERM (Firestore) → WORKING (summaries ~100 tok/ch) → ACTIVE (in-prompt)
    """
    try:
        data = request.get_json()
        project_id = data.get('projectId', '')
        chapter_id = data.get('chapterId', '')
        content = data.get('content', '')

        if not content or len(content.strip()) < 50:
            return jsonify({'summary': 'Bab ini belum memiliki konten yang cukup untuk dirangkum.'}), 200

        # Strip HTML tags for cleaner summarization
        import re
        clean_text = re.sub(r'<[^>]+>', ' ', content)
        clean_text = re.sub(r'\s+', ' ', clean_text).strip()

        # Cap input to avoid token overflow
        max_chars = 6000
        if len(clean_text) > max_chars:
            clean_text = clean_text[:max_chars] + '...'

        prompt = f"""Rangkum konten bab skripsi berikut dalam 3-5 kalimat.
Fokus pada: argumen utama, metodologi yang dibahas, dan temuan/klaim kunci.
Tulis dalam bahasa yang sama dengan konten asli.
JANGAN tambahkan keterangan atau label. Tulis rangkuman langsung.

Konten:
{clean_text}

Rangkuman (3-5 kalimat):"""

        response = litellm.completion(
            model="groq/llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "Kamu adalah AI yang merangkum konten akademik secara padat dan akurat. Jawab langsung tanpa label atau format khusus."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=200,
            temperature=0.3,
            stream=False
        )

        summary = response.choices[0].message.content.strip()
        # Clean up if AI wraps in quotes
        if summary.startswith('"') and summary.endswith('"'):
            summary = summary[1:-1]

        # Persist to Firestore if project context available
        if project_id and chapter_id:
            try:
                from firebase_admin import firestore as fs
                db = fs.client()
                db.collection('users').document(current_user.id) \
                    .collection('projects').document(project_id) \
                    .update({f'chapterSummaries.{chapter_id}': summary})
            except Exception as persist_err:
                logger.warning(f"Could not persist chapter summary: {persist_err}")

        return jsonify({'summary': summary}), 200

    except Exception as e:
        logger.error(f"Summarize Chapter Error: {e}")
        return jsonify({'summary': '', 'error': str(e)}), 200

# ==============================================================================
# AGENTIC LOOP — Real tool-calling AI with paragraph-level editing (Sprint 4)
# ==============================================================================

import re as _re
import uuid as _uuid

# ─── Tool Definitions (OpenAI function calling format for litellm) ───
THESIS_AGENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "read_chapter",
            "description": "Baca konten chapter atau range paragraf untuk konteks. Gunakan mode 'summary' untuk chapter panjang, 'full' untuk chapter pendek, 'range' untuk paragraf spesifik.",
            "parameters": {
                "type": "object",
                "properties": {
                    "chapter_id": {"type": "string", "description": "ID chapter yang ingin dibaca"},
                    "mode": {"type": "string", "enum": ["full", "summary", "range"], "description": "Mode baca: full (semua), summary (ringkasan), range (paragraf tertentu)"},
                    "para_range": {"type": "string", "description": "Range paragraf, e.g. 'P-001..P-010'. Hanya untuk mode 'range'."}
                },
                "required": ["chapter_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "edit_paragraph",
            "description": "Ganti konten paragraf berdasarkan para_id. Perubahan menjadi pending diff — user yang approve.",
            "parameters": {
                "type": "object",
                "properties": {
                    "para_id": {"type": "string", "description": "ID paragraf target (e.g. 'P-abc123')"},
                    "new_content": {"type": "string", "description": "Konten baru untuk menggantikan paragraf"},
                    "reason": {"type": "string", "description": "Alasan singkat mengapa paragraf ini perlu diedit"}
                },
                "required": ["para_id", "new_content", "reason"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "insert_paragraph",
            "description": "Sisipkan paragraf baru setelah (atau sebelum) paragraf tertentu. Menjadi pending diff.",
            "parameters": {
                "type": "object",
                "properties": {
                    "anchor_id": {"type": "string", "description": "ID paragraf acuan posisi (e.g. 'P-abc123')"},
                    "position": {"type": "string", "enum": ["after", "before"], "description": "Posisi relatif: after (setelah) atau before (sebelum) anchor"},
                    "content": {"type": "string", "description": "Konten paragraf baru"},
                    "reason": {"type": "string", "description": "Alasan mengapa paragraf perlu ditambahkan"}
                },
                "required": ["anchor_id", "content"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_paragraph",
            "description": "Hapus paragraf. Menjadi pending diff — user masih bisa reject.",
            "parameters": {
                "type": "object",
                "properties": {
                    "para_id": {"type": "string", "description": "ID paragraf yang ingin dihapus"},
                    "reason": {"type": "string", "description": "Alasan mengapa paragraf perlu dihapus"}
                },
                "required": ["para_id", "reason"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_references",
            "description": "Cari referensi dari database project yang relevan dengan topik tertentu.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Kata kunci pencarian referensi"},
                    "limit": {"type": "integer", "description": "Jumlah maksimal referensi yang dicari. HARUS BERUPA ANGKA INTEGER, BUKAN STRING (contoh: 5)."}
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_chapter",
            "description": "Buat chapter/bab baru di project. Langsung dibuat (tidak butuh approve).",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Judul bab baru"},
                    "position": {"type": "number", "description": "Posisi urutan bab (default: di akhir)"}
                },
                "required": ["title"]
            }
        }
    }
]


# ─── Tool Executor ───
def _execute_agent_tool(tool_name, tool_input, ctx):
    """Execute a single agent tool and return the result."""
    project_id = ctx.get('project_id', '')
    chapter_id = ctx.get('chapter_id', '')
    user_id = ctx.get('user_id', '')
    context = ctx.get('context', {})

    try:
        from firebase_admin import firestore as fs
        db = fs.client()
    except Exception:
        db = None

    if tool_name == 'read_chapter':
        target_chapter = tool_input.get('chapter_id', chapter_id)
        mode = tool_input.get('mode', 'summary')

        if not db or not project_id:
            return {"error": "No database connection or project ID"}

        try:
            chap_doc = db.collection('projects').document(project_id) \
                .collection('chapters').document(target_chapter).get()

            if not chap_doc.exists:
                return {"error": f"Chapter '{target_chapter}' not found"}

            chap_data = chap_doc.to_dict()
            content = chap_data.get('content', '')
            title = chap_data.get('title', '')

            # Strip HTML for word count
            clean = _re.sub(r'<[^>]+>', ' ', content)
            clean = _re.sub(r'\s+', ' ', clean).strip()
            word_count = len(clean.split()) if clean else 0

            if mode == 'summary' or (mode != 'full' and word_count > 2000):
                # Return summary from chapterSummaries if available
                proj_doc = db.collection('projects').document(project_id).get()
                summaries = proj_doc.to_dict().get('chapterSummaries', {}) if proj_doc.exists else {}
                summary = summaries.get(target_chapter, 'Belum di-summarize')
                return {
                    "title": title,
                    "summary": summary,
                    "wordCount": word_count,
                    "warning": f"Chapter panjang ({word_count} kata). Gunakan mode:'range' untuk baca bagian spesifik." if word_count > 2000 else None
                }

            return {"title": title, "content": clean[:8000], "wordCount": word_count}

        except Exception as e:
            return {"error": str(e)}

    if tool_name == 'edit_paragraph':
        # Return pending diff — frontend applies after user approves
        para_id = tool_input.get('para_id', '')

        # Try to get current content from context's active_paragraphs
        paras = context.get('active_paragraphs', context.get('activeParagraphs', []))
        before = ''
        for p in paras:
            if p.get('paraId') == para_id:
                before = p.get('content', '')
                break

        return {
            "success": True,
            "diff": {
                "diffId": f"diff_{_uuid.uuid4().hex[:8]}",
                "type": "edit",
                "paraId": para_id,
                "before": before,
                "after": tool_input.get('new_content', ''),
                "reason": tool_input.get('reason', ''),
            }
        }

    elif tool_name == 'insert_paragraph':
        try:
            new_para_id = 'P-' + _uuid.uuid4().hex[:6]
        except Exception:
            new_para_id = f'P-{int(time.time() * 1000) % 999999:06d}'

        return {
            "success": True,
            "diff": {
                "diffId": f"diff_{_uuid.uuid4().hex[:8]}",
                "type": "insert",
                "paraId": new_para_id,
                "anchorId": tool_input.get('anchor_id', ''),
                "position": tool_input.get('position', 'after'),
                "after": tool_input.get('content', ''),
                "reason": tool_input.get('reason', ''),
            }
        }

    elif tool_name == 'delete_paragraph':
        para_id = tool_input.get('para_id', '')

        # Get before content from context
        paras = context.get('active_paragraphs', context.get('activeParagraphs', []))
        before = ''
        for p in paras:
            if p.get('paraId') == para_id:
                before = p.get('content', '')
                break

        return {
            "success": True,
            "diff": {
                "diffId": f"diff_{_uuid.uuid4().hex[:8]}",
                "type": "delete",
                "paraId": para_id,
                "before": before,
                "reason": tool_input.get('reason', ''),
            }
        }

    elif tool_name == 'search_references':
        query = tool_input.get('query', '')
        limit = tool_input.get('limit', 5)

        # Search from raw references (array) or references_text (string)
        refs = context.get('references_raw', context.get('references', []))
        
        # If refs is a string (references_text), return it directly
        if isinstance(refs, str):
            if not refs:
                return {"references": [], "message": "Tidak ada referensi yang tersimpan di project ini."}
            return {"references_text": refs, "total": refs.count('[')}
        
        if not refs:
            # Try to fetch from Firestore
            if db and project_id:
                try:
                    proj_doc = db.collection('projects').document(project_id).get()
                    if proj_doc.exists:
                        refs = proj_doc.to_dict().get('references', [])
                except Exception:
                    pass
        
        if not refs:
            return {"references": [], "message": "Tidak ada referensi yang tersimpan di project ini."}

        # Simple keyword matching
        query_lower = query.lower()
        matched = []
        for ref in refs:
            ref_text = json.dumps(ref, ensure_ascii=False).lower() if isinstance(ref, dict) else str(ref).lower()
            if any(word in ref_text for word in query_lower.split()):
                matched.append(ref)
            if len(matched) >= limit:
                break

        # If no keyword match, return first N refs
        if not matched:
            matched = refs[:limit]

        return {"references": matched, "total": len(matched)}

    elif tool_name == 'create_chapter':
        if not db or not project_id:
            return {"error": "No database connection or project ID"}

        try:
            title = tool_input.get('title', 'Bab Baru')
            position = tool_input.get('position', 99)

            new_chap_ref = db.collection('projects').document(project_id) \
                .collection('chapters').document()
            new_chap_ref.set({
                'title': title,
                'content': '',
                'order': position,
                'wordCount': 0,
                'status': 'draft',
                'createdAt': time.time(),
            })
            return {"success": True, "chapterId": new_chap_ref.id, "title": title}

        except Exception as e:
            return {"error": str(e)}

    else:
        return {"error": f"Unknown tool: {tool_name}"}

# ─── Thesis Structure Schema — Per-Bab with Paragraph Flow ───
THESIS_BAB_SCHEMA = {
    "1": """BAB I PENDAHULUAN:
1.1 Latar Belakang (6-10 paragraf, urutan ketat):
  P1:Konteks fenomena umum(kondisi makro) P2:Data statistik(angka,sumber resmi) P3:Masalah spesifik(gap ideal vs realitas) P4:Urgensi(dampak jika tidak diteliti) P5:Riset terdahulu ringkas(2-3 studi,HANYA dari ref tersimpan) P6:Research gap(belum diteliti) P7:Justifikasi(mengapa penelitian ini)
1.2 Identifikasi Masalah: daftar numbered dari latar belakang
1.3 Batasan Masalah: subjek,variabel,lokasi,waktu
1.4 Rumusan Masalah: pertanyaan penelitian numbered
1.5 Tujuan: selaras 1:1 dgn rumusan
1.6 Manfaat: 1.6.1 Teoritis + 1.6.2 Praktis
1.7 Sistematika: deskripsi isi Bab I-V""",
    "2": """BAB II KAJIAN PUSTAKA:
2.1 Landasan Teori:
  2.1.1 Var X: P1:Definisi(2-3 ahli dari ref) P2:Dimensi/aspek P3:Indikator P4:Model teori
  2.1.2 Var Y: sama struktur dgn 2.1.1
  2.1.3 Teori Pendukung: hubungkan X dan Y
2.2 Penelitian Terdahulu: per penelitian(peneliti,tahun,metode,hasil) HANYA dari ref → P-akhir:analisis gap
2.3 Kerangka Pemikiran: P1:Narasi hubungan logis P2:Penjelasan diagram
2.4 Hipotesis: H1 dan H0""",
    "3": """BAB III METODOLOGI:
3.1 Jenis Penelitian: 1P(kuant/kual/mixed+justifikasi)
3.2 Pendekatan: 1P(survey/eksperimen/studi kasus+alasan)
3.3 Lokasi&Waktu: 1P
3.4 Populasi&Sampel: P1:Populasi P2:Sampel(rumus) P3:Teknik sampling
3.5 Variabel: P1:X(independen) P2:Y(dependen) P3:Kontrol
3.6 Def.Operasional: tabel(variabel|definisi|indikator|skala)
3.7 Teknik Pengumpulan: kuesioner/wawancara/observasi
3.8 Instrumen: item,skala Likert
3.9 Uji Instrumen: P1:Validitas P2:Reliabilitas
3.10 Teknik Analisis: P1:Deskriptif P2:Uji asumsi P3:Statistik""",
    "4": """BAB IV HASIL&PEMBAHASAN:
4.1 Gambaran Umum: P1:Profil institusi P2:Karakteristik responden(tabel)
4.2 Deskripsi Data: statistik deskriptif per variabel
4.3 Analisis: P1:Validitas(tabel) P2:Reliabilitas(Cronbach) P3:Uji asumsi P4:Statistik utama
4.4 Pembahasan: P1:Interpretasi hasil P2:Bandingkan dgn teori Bab II P3:Bandingkan dgn riset terdahulu""",
    "5": """BAB V PENUTUP:
5.1 Kesimpulan: 1P per rumusan masalah — jawaban LANGSUNG
5.2 Implikasi: P1:Teoritis P2:Praktis
5.3 Keterbatasan: keterbatasan metodologi
5.4 Saran: P1:Peneliti selanjutnya P2:Praktisi P3:Institusi""",
}


def _detect_active_bab(chapters, active_chapter_id):
    """Detect which bab number is active from chapter title."""
    for ch in chapters:
        if ch.get('id') == active_chapter_id:
            title = (ch.get('title', '') or '').lower()
            for num in ['1', '2', '3', '4', '5']:
                if f'bab {num}' in title or title.startswith(f'{num}.'):
                    return num
            # Roman numeral matching
            roman_map = {'i': '1', 'ii': '2', 'iii': '3', 'iv': '4', 'v': '5'}
            for roman, num in roman_map.items():
                if f'bab {roman}' in title and f'bab {roman}i' not in title:
                    return num
            # Heuristic from keywords
            if any(k in title for k in ['pendahuluan', 'latar belakang']):
                return '1'
            if any(k in title for k in ['kajian', 'pustaka', 'teori', 'tinjauan']):
                return '2'
            if any(k in title for k in ['metod']):
                return '3'
            if any(k in title for k in ['hasil', 'pembahasan']):
                return '4'
            if any(k in title for k in ['kesimpulan', 'saran', 'penutup']):
                return '5'
    return None


# ─── Build System Prompt for Agent (TOKEN OPTIMIZED) ───
def _build_agent_system_prompt(context):
    """Build compact but sharp system prompt.
    Keeps full references (critical). Schema is per-bab with paragraph flow.
    """
    title = context.get('context_title', '')
    problem = context.get('context_problem', '')
    methodology = context.get('context_method', '')
    objectives = context.get('context_objectives', '')
    
    chapters = context.get('chapters_summary', [])
    active_paragraphs = context.get('active_paragraphs', context.get('activeParagraphs', []))
    golden_thread = context.get('golden_thread', context.get('goldenThread', {}))
    references_text = context.get('references_text', '')
    active_chapter_id = context.get('active_chapter_id', '')

    # Chapter list — compact
    ch_list = ', '.join(
        f"{ch.get('title','?')}(ID:{ch.get('id','?')})"
        for ch in chapters[:8]
    ) or 'Belum ada'

    # Active paragraphs — max 8 with enough context
    para_list = []
    for p in active_paragraphs[:8]:
        content = p.get('content', '')
        preview = (content[:120] + '…') if len(content) > 120 else content
        para_list.append(f"[{p.get('paraId','?')}]: {preview}")

    # Golden thread — compact
    gt_compact = ''
    if golden_thread and isinstance(golden_thread, dict):
        gt_parts = []
        for k in ['researchQuestion', 'hypothesis', 'methodology']:
            v = golden_thread.get(k, '')
            if v and v != 'N/A':
                gt_parts.append(f"{k}={v[:80]}")
        gt_compact = ' | '.join(gt_parts) if gt_parts else 'Belum diisi'
    else:
        gt_compact = 'Belum diisi'

    # Detect active bab → inject that bab's detailed schema
    active_bab = _detect_active_bab(chapters, active_chapter_id)
    bab_schema = ''
    if active_bab and active_bab in THESIS_BAB_SCHEMA:
        bab_schema = f"\n{THESIS_BAB_SCHEMA[active_bab]}"

    system = f"""AI skripsi assistant. Menulis seperti dosen pembimbing — presisi, substansial, tanpa basa-basi.

PROJECT: {title or 'N/A'}
RQ: {problem or 'N/A'}
Tujuan: {objectives or 'N/A'}
Metode: {methodology or 'N/A'}
Golden Thread: {gt_compact}

Bab: {ch_list}
Bab Aktif ID: {active_chapter_id}
{bab_schema}

Paragraf aktif:
{chr(10).join(para_list) if para_list else '  (kosong — gunakan read_chapter)'}

REFERENSI TERSIMPAN (gunakan HANYA ini untuk sitasi):
{references_text if references_text else '  Belum ada referensi'}

TOOLS: edit/insert/delete → pending diff. Gunakan para_id dari daftar. read_chapter untuk baca isi bab. search_references untuk cari ref spesifik.

⚠️ ATURAN TOOLS (KRITIS — JANGAN LANGGAR):
- DILARANG menulis konten paragraf sebagai teks biasa di chat. SEMUA konten HARUS masuk melalui tools.
- Jika diminta menulis/edit paragraf → WAJIB gunakan edit_paragraph atau insert_paragraph tool.
- JANGAN pernah output seperti "<P-001>: [isi paragraf]" sebagai teks. Itu SALAH.
- Setiap perubahan konten = 1 tool call. User akan melihat tombol Accept/Reject untuk setiap perubahan.
- Kamu BOLEH menulis penjelasan/analisis singkat sebagai teks, tapi KONTEN PARAGRAF SKRIPSI harus lewat tool.
- ATURAN CHIT-CHAT: Jika user HANYA menyapa (misal: "hi", "halo", "selamat pagi") ATAU bertanya hal umum/meminta saran tanpa secara eksplisit menyuruh menulis/mengedit konten skripsi, JANGAN panggil tool `insert_paragraph` maupun `edit_paragraph`. Cukup jawab dengan teks biasa (ramah dan siap membantu).

ATURAN PENULISAN & SITASI (KRITIS):
- Langsung substansi. DILARANG kalimat generik: "dilatarbelakangi oleh", "Oleh karena itu", "Di era modern", dsb.
- Kalimat impersonal, padat, bermakna, bervariasi.
- WAJIB gunakan REFERENSI TERSIMPAN di atas sebagai SUMBER UTAMA.
- Format sitasi/bodynote di akhir/tengah kalimat WAJIB berbentuk: (Nama Belakang Penulis, Tahun). Contoh: (Nunnally, 1978) atau (Hair et al., 2019).
- DILARANG KERAS mengarang referensi yang tidak ada di "REFERENSI TERSIMPAN" atau mencampuradukkan data. Gunakan `search_references` jika butuh spesifik.
- 1 paragraf = 1 ide pokok, 4-8 kalimat.
- Koheren dgn paragraf sekitar, transisi implisit.

ATURAN STRUKTUR (KRITIS):
- IKUTI urutan paragraf dari STRUKTUR BAB di atas. Setiap paragraf HARUS sesuai posisinya.
- Jika user minta isi Latar Belakang: P1(konteks) → P2(data) → P3(masalah) → dst sesuai schema.
- JANGAN loncat urutan. JANGAN campur konten section berbeda dalam satu paragraf.
- CEK posisi paragraf di editor — paragraf baru harus masuk di tempat yang benar sesuai alur.

CONTOH ALUR BENAR:
1. User: "Buatkan latar belakang"
2. Kamu: Jelaskan rencana singkat (teks biasa)
3. Kamu: Panggil insert_paragraph untuk P1 (konteks fenomena)
4. Kamu: Panggil insert_paragraph untuk P2 (data statistik)
5. dst...

CONTOH SALAH (JANGAN LAKUKAN):
- Menulis "<P-006>: [isi paragraf]" di chat tanpa tool call
- Menulis seluruh konten bab sebagai teks biasa"""

    return system



# @assistant_bp.route('/api/agent/run', methods=['POST'])
# @login_required
# @limiter.limit("5 per minute")
# def agent_run():
#     """
#     Agentic AI endpoint with real tool calling.
#     Uses litellm with OpenAI function calling format.
#     Supports model and mode selection from frontend.
#     Returns SSE stream with events: text, tool_call, tool_result, pending_diff, done, error.
#     """
#
#     # ── Model Map (key → litellm model string, pro_only flag) ──
#     MODEL_MAP = {
#         'llama-70b': {'model': 'groq/llama-3.3-70b-versatile', 'pro_only': False, 'label': 'Llama 3.3 70B'},
#         'deepseek-r1': {'model': 'groq/deepseek-r1-distill-llama-70b', 'pro_only': True, 'label': 'DeepSeek R1 70B'},
#         'gemma-9b': {'model': 'groq/gemma2-9b-it', 'pro_only': False, 'label': 'Gemma 2 9B (Fast)'},
#     }
#     DEFAULT_MODEL = 'llama-70b'
#
#     # ── Mode Config ──
#     MODE_CONFIG = {
#         'planning': {'max_tokens': 4096, 'max_iterations': 8, 'temperature': 0.5},
#         'fast': {'max_tokens': 2048, 'max_iterations': 3, 'temperature': 0.7},
#     }
#     DEFAULT_MODE = 'planning'
#
#     try:
#         data = request.get_json()
#         task = data.get('task', '')
#         context = data.get('context', {})
#         messages_history = data.get('messages', [])
#         project_id = data.get('projectId', '')
#         chapter_id = data.get('chapterId', '')
#         requested_model = data.get('model', DEFAULT_MODEL)
#         requested_mode = data.get('mode', DEFAULT_MODE)
#
#         if not task and not messages_history:
#             return jsonify({'error': 'Task or messages required'}), 400
#
#         # Resolve model — fallback if Pro-only and user is not Pro
#         is_pro = getattr(current_user, 'is_pro', False) if current_user else False
#         model_entry = MODEL_MAP.get(requested_model, MODEL_MAP[DEFAULT_MODEL])
#         if model_entry.get('pro_only') and not is_pro:
#             model_entry = MODEL_MAP[DEFAULT_MODEL]
#             requested_model = DEFAULT_MODEL
#
#         litellm_model = model_entry['model']
#
#         # Resolve mode
#         mode_cfg = MODE_CONFIG.get(requested_mode, MODE_CONFIG[DEFAULT_MODE])
#
#         def generate_agent_stream():
#             try:
#                 start_time = time.time()
#                 MAX_ITERATIONS = mode_cfg['max_iterations']
#
#                 # Build system prompt with context
#                 system_prompt = _build_agent_system_prompt(context)
#
#                 # Build conversation messages
#                 conversation = []
#
#                 # Include history if provided
#                 if messages_history:
#                     for msg in messages_history:
#                         conversation.append({
#                             "role": msg.get("role", "user"),
#                             "content": msg.get("content", "")
#                         })
#                 else:
#                     conversation.append({"role": "user", "content": task})
#
#                 tool_ctx = {
#                     'project_id': project_id,
#                     'chapter_id': chapter_id,
#                     'user_id': str(current_user.id),
#                     'context': context,
#                 }
#
#                 # ─── Agentic Loop ───
#                 for iteration in range(MAX_ITERATIONS):
#                     try:
#                         response = litellm.completion(
#                             model=litellm_model,
#                             messages=[
#                                 {"role": "system", "content": system_prompt},
#                                 *conversation
#                             ],
#                             tools=THESIS_AGENT_TOOLS,
#                             tool_choice="auto",
#                             max_tokens=mode_cfg['max_tokens'],
#                             temperature=mode_cfg['temperature'],
#                             stream=False,
#                         )
#                     except Exception as llm_err:
#                         logger.error(f"LLM Error in iteration {iteration}: {llm_err}")
#                         yield f"data: {json.dumps({'type': 'ERROR', 'message': str(llm_err)})}\n\n"
#                         return
#
#                     msg = response.choices[0].message
#                     finish_reason = response.choices[0].finish_reason
#
#                     # Emit text content if present
#                     if msg.content:
#                         yield f"data: {json.dumps({'type': 'TEXT_DELTA', 'delta': msg.content})}\n\n"
#
#                     # Check if we're done (no tool calls)
#                     if finish_reason != 'tool_calls' or not msg.tool_calls:
#                         elapsed = round(time.time() - start_time, 1)
#                         yield "data: {}\n\n".format(json.dumps({
#                             'type': 'DONE',
#                             'summary': f'Selesai dalam {elapsed}s ({iteration + 1} iterasi)'
#                         }))
#                         return
#
#                     # Process tool calls
#                     # Add assistant message with tool calls to conversation
#                     assistant_msg = {"role": "assistant", "content": msg.content or ""}
#                     assistant_msg["tool_calls"] = []
#
#                     tool_results_for_conversation = []
#
#                     for tool_call in msg.tool_calls:
#                         tc_id = tool_call.id
#                         tc_name = tool_call.function.name
#                         try:
#                             tc_args = json.loads(tool_call.function.arguments)
#                         except json.JSONDecodeError:
#                             tc_args = {}
#
#                         # Emit tool_call event
#                         yield "data: {}\n\n".format(json.dumps({
#                             'type': 'TOOL_CALL',
#                             'id': tc_id,
#                             'tool': tc_name,
#                             'args': tc_args,
#                             'step': 'executing',
#                             'message': f'🔧 Menjalankan {tc_name}...'
#                         }))
#
#                         # Execute the tool
#                         result = _execute_agent_tool(tc_name, tc_args, tool_ctx)
#
#                         # Emit tool_result event
#                         yield "data: {}\n\n".format(json.dumps({
#                             'type': 'TOOL_RESULT',
#                             'id': tc_id,
#                             'tool': tc_name,
#                             'result': result,
#                             'step': 'executing',
#                             'message': f'✅ {tc_name} selesai'
#                         }))
#
#                         # If result has a diff, emit pending_diff
#                         if isinstance(result, dict) and result.get('diff'):
#                             yield "data: {}\n\n".format(json.dumps({
#                                 'type': 'PENDING_DIFF',
#                                 'diff': result['diff']
#                             }))
#
#                         # Build tool call entry for conversation
#                         assistant_msg["tool_calls"].append({
#                             "id": tc_id,
#                             "type": "function",
#                             "function": {
#                                 "name": tc_name,
#                                 "arguments": json.dumps(tc_args)
#                             }
#                         })
#
#                         # Build tool result for conversation
#                         tool_results_for_conversation.append({
#                             "role": "tool",
#                             "tool_call_id": tc_id,
#                             "content": json.dumps(result, ensure_ascii=False)
#                         })
#
#                     # Append assistant message and tool results to conversation
#                     conversation.append(assistant_msg)
#                     conversation.extend(tool_results_for_conversation)
#
#                 # If we exhaust iterations
#                 yield "data: {}\n\n".format(json.dumps({
#                     'type': 'DONE',
#                     'summary': f'Selesai setelah {MAX_ITERATIONS} iterasi (batas maksimum)'
#                 }))
#
#             except Exception as e:
#                 logger.error(f"Agent Stream Error: {e}")
#                 yield f"data: {json.dumps({'type': 'ERROR', 'message': str(e)})}\n\n"
#
#         return Response(
#             stream_with_context(generate_agent_stream()),
#             mimetype='text/event-stream',
#             headers={
#                 'Cache-Control': 'no-cache',
#                 'X-Accel-Buffering': 'no',
#             }
#         )
#
#     except Exception as e:
#         logger.error(f"Agent Run Error: {e}")
#         return jsonify({'error': str(e)}), 500



# ==============================================================================
# PHASE 3: GOLDEN THREAD — Coherence Check
# ==============================================================================

@assistant_bp.route('/api/check-coherence', methods=['POST'])
@login_required
@limiter.limit("10 per minute")
def check_coherence():
    """
    AI checks alignment between Golden Thread nodes and chapter content.
    Returns overall score + per-node status (aligned/misaligned).
    """
    try:
        data = request.get_json()
        golden_thread = data.get('golden_thread', {})
        chapter_content = data.get('chapter_content', '')
        project_meta = data.get('project_meta', {})
        active_chapter = data.get('active_chapter', '')

        if not golden_thread or not any(golden_thread.values()):
            return jsonify({
                'overallScore': 0,
                'nodes': [],
                'message': 'Golden Thread belum diisi.'
            }), 200

        # Build prompt
        thread_summary = "\n".join([
            f"- {key}: {val}" for key, val in golden_thread.items() if val
        ])

        prompt = f"""Kamu adalah evaluator koherensi penelitian akademik.

Berikut adalah Golden Thread (benang merah) sebuah skripsi:
{thread_summary}

Judul: {project_meta.get('title', 'N/A')}
Bab aktif: {active_chapter}

Konten bab (ringkas):
{chapter_content[:3000]}

TUGAS:
Evaluasi apakah 5 node Golden Thread (researchQuestion, hypothesis, methodology, findings, conclusion) saling konsisten dan tercermin dalam konten bab.

Jawab HANYA dalam format JSON berikut (tanpa markdown):
{{
    "overallScore": <skor 0-100>,
    "nodes": [
        {{"name": "researchQuestion", "status": "aligned|misaligned|empty", "message": "<penjelasan singkat max 15 kata>"}},
        {{"name": "hypothesis", "status": "aligned|misaligned|empty", "message": "<penjelasan>"}},
        {{"name": "methodology", "status": "aligned|misaligned|empty", "message": "<penjelasan>"}},
        {{"name": "findings", "status": "aligned|misaligned|empty", "message": "<penjelasan>"}},
        {{"name": "conclusion", "status": "aligned|misaligned|empty", "message": "<penjelasan>"}}
    ]
}}"""

        response = litellm.completion(
            model="groq/llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "Kamu adalah evaluator koherensi penelitian. Jawab HANYA dalam JSON valid."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.3,
            stream=False
        )

        raw = response.choices[0].message.content.strip()

        try:
            if raw.startswith('```'):
                raw = raw.split('\n', 1)[1].rsplit('```', 1)[0].strip()
            result = json.loads(raw)
        except json.JSONDecodeError:
            result = {
                'overallScore': 50,
                'nodes': [
                    {'name': k, 'status': 'empty' if not v else 'aligned', 'message': ''}
                    for k, v in golden_thread.items()
                ]
            }

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Coherence Check Error: {e}")
        return jsonify({'overallScore': 0, 'nodes': [], 'error': str(e)}), 200


# ==============================================================================
# PHASE 3: ARGUMENT GRAPH — Extract claims and relations from chapter
# ==============================================================================

@assistant_bp.route('/api/argument-graph', methods=['POST'])
@login_required
@limiter.limit("5 per minute")
def argument_graph():
    """
    AI extracts claims (as nodes) and logical relations (as edges) from chapter content.
    Returns graph data for @xyflow/react rendering.
    """
    try:
        data = request.get_json()
        chapter_content = data.get('chapter_content', '')
        chapter_title = data.get('chapter_title', '')

        if not chapter_content or len(chapter_content.strip()) < 50:
            return jsonify({'nodes': [], 'edges': []}), 200

        prompt = f"""Kamu adalah analis argumen akademik.

Judul Bab: {chapter_title}

Konten:
{chapter_content[:4000]}

TUGAS: Ekstrak klaim-klaim utama dan relasi logis antar klaim dari konten di atas.

Jawab HANYA dalam format JSON (tanpa markdown):
{{
    "nodes": [
        {{
            "id": "c1",
            "text": "<klaim utama, max 20 kata>",
            "strength": <1-5, 1=lemah/tanpa bukti, 5=sangat kuat/multi-sitasi>,
            "paragraphIndex": <index paragraf asal, mulai 0>
        }}
    ],
    "edges": [
        {{
            "source": "c1",
            "target": "c2",
            "type": "supports|contradicts|elaborates"
        }}
    ]
}}

ATURAN:
- Maksimal 8 nodes, 10 edges.
- Setiap klaim harus singkat dan jelas.
- Strength 1-2 = merah (lemah), 3 = kuning (cukup), 4-5 = hijau (kuat).
- Relasi harus logis dan berdasar konten."""

        response = litellm.completion(
            model="groq/llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "Kamu adalah analis argumen akademik. Jawab HANYA dalam JSON valid."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=800,
            temperature=0.3,
            stream=False
        )

        raw = response.choices[0].message.content.strip()

        try:
            if raw.startswith('```'):
                raw = raw.split('\n', 1)[1].rsplit('```', 1)[0].strip()
            result = json.loads(raw)
        except json.JSONDecodeError:
            result = {'nodes': [], 'edges': []}

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Argument Graph Error: {e}")
        return jsonify({'nodes': [], 'edges': [], 'error': str(e)}), 200


# ==============================================================================
# PHASE 3: VOICE SCORE — Deep academic voice analysis
# ==============================================================================

@assistant_bp.route('/api/voice-score', methods=['POST'])
@login_required
@limiter.limit("10 per minute")
def voice_score():
    """
    AI-powered deep academic voice analysis.
    Returns per-category scores: passive, hedging, formality, colloquial.
    """
    try:
        data = request.get_json()
        text = data.get('text', '')

        if not text or len(text.strip()) < 30:
            return jsonify({
                'overall': 0,
                'passive': 0, 'hedging': 0,
                'formality': 0, 'colloquial': 0,
                'suggestions': []
            }), 200

        prompt = f"""Analisis gaya penulisan akademik teks berikut:

"{text[:2000]}"

Beri skor 0-100 untuk setiap kategori:
1. passive: Apakah penggunaan kalimat pasif seimbang? (100 = sempurna, active-passive balance)
2. hedging: Apakah hedging language tepat? (100 = tepat, tidak berlebihan/kurang)
3. formality: Seberapa formal gaya bahasa? (100 = sangat formal akademik)
4. colloquial: Apakah bebas dari bahasa informal? (100 = tidak ada bahasa informal)

Jawab HANYA dalam format JSON (tanpa markdown):
{{
    "overall": <rata-rata skor>,
    "passive": <skor 0-100>,
    "hedging": <skor 0-100>,
    "formality": <skor 0-100>,
    "colloquial": <skor 0-100>,
    "suggestions": [
        "<saran perbaikan 1 (max 1 kalimat)>",
        "<saran perbaikan 2 (max 1 kalimat)>"
    ]
}}"""

        response = litellm.completion(
            model="groq/llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "Kamu adalah penilai gaya penulisan akademik. Jawab HANYA dalam JSON valid."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=300,
            temperature=0.3,
            stream=False
        )

        raw = response.choices[0].message.content.strip()

        try:
            if raw.startswith('```'):
                raw = raw.split('\n', 1)[1].rsplit('```', 1)[0].strip()
            result = json.loads(raw)
        except json.JSONDecodeError:
            result = {
                'overall': 50, 'passive': 50, 'hedging': 50,
                'formality': 50, 'colloquial': 50,
                'suggestions': ['Tidak dapat menganalisis gaya penulisan.']
            }

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Voice Score Error: {e}")
        return jsonify({
            'overall': 0, 'passive': 0, 'hedging': 0,
            'formality': 0, 'colloquial': 0,
            'suggestions': [str(e)]
        }), 200


# ==============================================================================
# PHASE 4: REVISION HISTORY — AI Narrative + Snapshot Management
# ==============================================================================

@assistant_bp.route('/api/revision-summary', methods=['POST'])
@login_required
@limiter.limit("20 per minute")
def revision_summary():
    """Generate AI narrative summary of a diff between two revision snapshots."""
    try:
        data = request.get_json()
        diff_text = data.get('diff', '')
        chapter_title = data.get('chapterTitle', 'Bab')

        if not diff_text or len(diff_text.strip()) < 10:
            return jsonify({'narrative': 'Tidak ada perubahan signifikan.'}), 200

        response = litellm.completion(
            model="groq/llama-3.3-70b-versatile",
            messages=[{
                "role": "system",
                "content": "Kamu adalah AI yang menganalisis perubahan dokumen akademik. Berikan narasi singkat 2 kalimat dalam Bahasa Indonesia tentang apa yang berubah. Fokus pada konten, bukan format."
            }, {
                "role": "user",
                "content": f"Berikut diff dari {chapter_title}:\n\n{diff_text[:3000]}\n\nBuat narasi singkat 2 kalimat."
            }],
            max_tokens=120,
            temperature=0.3
        )

        narrative = response.choices[0].message.content.strip()
        return jsonify({'narrative': narrative}), 200

    except Exception as e:
        logger.error(f"Revision Summary Error: {e}")
        return jsonify({'narrative': f'Gagal membuat narasi: {str(e)}'}), 200


@assistant_bp.route('/api/revisions/<chapter_id>', methods=['GET'])
@login_required
def get_revisions(chapter_id):
    """Fetch all revisions for a chapter from Firestore."""
    try:
        from firebase_admin import firestore as fs
        db = fs.client()

        revisions_ref = (
            db.collection('users').document(current_user.id)
            .collection('chapters').document(chapter_id)
            .collection('revisions')
            .order_by('timestamp', direction='DESCENDING')
            .limit(30)
        )

        revisions = []
        for doc in revisions_ref.stream():
            rev = doc.to_dict()
            rev['id'] = doc.id
            # Convert Firestore timestamp to ISO string
            if rev.get('timestamp'):
                rev['timestamp'] = rev['timestamp'].isoformat() if hasattr(rev['timestamp'], 'isoformat') else str(rev['timestamp'])
            # Don't send full HTML in list — too heavy
            rev.pop('html', None)
            revisions.append(rev)

        return jsonify({'revisions': revisions}), 200

    except Exception as e:
        logger.error(f"Get Revisions Error: {e}")
        return jsonify({'revisions': [], 'error': str(e)}), 200


@assistant_bp.route('/api/revisions/<chapter_id>', methods=['POST'])
@login_required
@limiter.limit("60 per hour")
def save_revision(chapter_id):
    """Save an HTML snapshot as a new revision."""
    try:
        from firebase_admin import firestore as fs
        db = fs.client()

        data = request.get_json()
        html_content = data.get('html', '')
        word_count = data.get('wordCount', 0)
        narrative = data.get('narrative', '')

        revision_data = {
            'html': html_content,
            'wordCount': word_count,
            'narrative': narrative,
            'timestamp': fs.SERVER_TIMESTAMP,
            'userId': current_user.id,
        }

        rev_ref = (
            db.collection('users').document(current_user.id)
            .collection('chapters').document(chapter_id)
            .collection('revisions')
        )
        doc_ref = rev_ref.add(revision_data)

        return jsonify({'success': True, 'id': doc_ref[1].id}), 200

    except Exception as e:
        logger.error(f"Save Revision Error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@assistant_bp.route('/api/revisions/<chapter_id>/<revision_id>', methods=['GET'])
@login_required
def get_revision_html(chapter_id, revision_id):
    """Fetch full HTML content of a specific revision."""
    try:
        from firebase_admin import firestore as fs
        db = fs.client()

        doc = (
            db.collection('users').document(current_user.id)
            .collection('chapters').document(chapter_id)
            .collection('revisions').document(revision_id)
            .get()
        )

        if doc.exists:
            rev = doc.to_dict()
            return jsonify({'html': rev.get('html', ''), 'wordCount': rev.get('wordCount', 0)}), 200
        else:
            return jsonify({'html': '', 'error': 'Revision not found'}), 404

    except Exception as e:
        logger.error(f"Get Revision HTML Error: {e}")
        return jsonify({'html': '', 'error': str(e)}), 500


# ==============================================================================
# PHASE 4: SEMANTIC DUPLICATE DETECTOR
# ==============================================================================

@assistant_bp.route('/api/semantic-similarity', methods=['POST'])
@login_required
@limiter.limit("10 per minute")
def semantic_similarity():
    """AI-powered semantic similarity check between paragraphs."""
    try:
        data = request.get_json()
        chapter_content = data.get('content', '')

        if not chapter_content or len(chapter_content.strip()) < 100:
            return jsonify({'pairs': [], 'message': 'Konten terlalu pendek untuk analisis.'}), 200

        response = litellm.completion(
            model="groq/llama-3.3-70b-versatile",
            messages=[{
                "role": "system",
                "content": """Kamu adalah AI pendeteksi duplikasi semantik dalam tulisan akademik.
Tugas: temukan pasangan paragraf yang memiliki MAKNA yang sama/mirip meski kata-kata berbeda.

Output JSON (tanpa markdown):
{
  "pairs": [
    {
      "paragraphA": { "index": 0, "excerpt": "kutipan 30 kata pertama..." },
      "paragraphB": { "index": 3, "excerpt": "kutipan 30 kata pertama..." },
      "similarity": 0.87,
      "reason": "Penjelasan singkat kenapa mirip"
    }
  ]
}

Rules:
- Hanya report similarity > 0.75
- Maksimal 5 pairs
- Index = urutan paragraf (0-based)
- excerpt = 30 kata pertama paragraf"""
            }, {
                "role": "user",
                "content": f"Analisis paragraf berikut untuk duplikasi semantik:\n\n{chapter_content[:6000]}"
            }],
            max_tokens=600,
            temperature=0.1
        )

        raw = response.choices[0].message.content.strip()
        if raw.startswith('```'):
            raw = raw.split('\n', 1)[-1].rsplit('```', 1)[0]

        try:
            result = json.loads(raw)
        except json.JSONDecodeError:
            result = {'pairs': []}

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Semantic Similarity Error: {e}")
        return jsonify({'pairs': [], 'error': str(e)}), 200
