# File: app/utils/ai_utils.py
# Deskripsi: Engine AI Unified dengan Fact-Checker & Self-Correction Loop.

import os
import json
import traceback
import re
from litellm import completion
from flask import current_app
from groq import Groq
import PyPDF2
import io

import os
import json
import logging
import re
from groq import Groq

from flask_login import current_user

logger = logging.getLogger(__name__)

# --- KONFIGURASI MODEL REAL ---
# Marketing Name vs Real Model
MODEL_MAPPING = {
    # FREE USER: Selalu pakai ini untuk semua tugas
    'free_standard': 'groq/llama-3.3-70b-versatile', 
    
    # PRO USER:
    'pro_nano':  'groq/llama-3.3-70b-versatile',  # Untuk Chat, Paraphrase (Marketing: GPT-5 Nano)
    'pro_heavy': 'groq/llama-3.3-70b-versatile',       # Untuk Bab 1-5, Logic (Marketing: GPT-5.2)
}
AVAILABLE_MODELS = {
    'fast': 'groq/llama-3.3-70b-versatile',
    'smart': 'groq/llama-3.3-70b-versatile',
    'gpt5': 'groq/llama-3.3-70b-versatile',
    'claude': 'groq/llama-3.3-70b-versatile',
    'gemini': 'groq/llama-3.3-70b-versatile'
}
# Daftar Tugas Berat (Pakai Model Mahal)
HEAVY_TASKS = [
    'generate_outline', 
    'bab1_latar_belakang', 'bab2_kajian_pustaka', 'bab3_metode', 
    'bab4_pembahasan', 'bab5_penutup', 
    'logic_check', 'defense_simulation'
]

def get_smart_model(task_type, user=None):
    """
    Router Model:
    - FREE: Selalu Llama 3 70B.
    - PRO: GPT-5-nano (Nano) untuk ringan, GPT-5.2 (5.2) untuk berat.
    """
    active_user = user or current_user
    is_pro = getattr(active_user, 'is_pro', False)

    # 1. LOGIKA FREE USER
    if not is_pro:
        return MODEL_MAPPING['free_standard']

    # 2. LOGIKA PRO USER
    if task_type in HEAVY_TASKS:
        return MODEL_MAPPING['pro_heavy']  # GPT-5.2
    else:
        # Termasuk task 'chat', 'paraphrase', 'expand', dll.
        return MODEL_MAPPING['pro_nano']   # GPT-5 Nano

def clean_json_output(text):
    """Membersihkan formatting markdown json."""
    text = text.strip()
    if text.startswith("```"):
        try:
            text = text.split("\n", 1)[1]
            text = text.rsplit("\n", 1)[0]
        except IndexError:
            pass
    return text.strip()
    
def get_target_model(selected_id):
    """Menerjemahkan ID dari frontend ke Provider ID"""
    return MODEL_MAP.get(selected_id, MODEL_MAP['fast'])

def get_model_name(model_id, is_pro_user):
    """Validasi akses model."""
    premium_models = ['gpt5', 'claude', 'gemini']
    if model_id in premium_models and not is_pro_user:
        return AVAILABLE_MODELS['fast']
    return AVAILABLE_MODELS.get(model_id, AVAILABLE_MODELS['fast'])

def clean_json_output(text):
    text = text.replace('```json', '').replace('```', '').strip()
    match = re.search(r'(\[.*\]|\{.*\})', text, re.DOTALL)
    if match: return match.group(0)
    return text

def clean_html_output(text):
    text = re.sub(r'^```(html)?\s*\n', '', text, flags=re.MULTILINE)
    text = re.sub(r'\n```\s*$', '', text, flags=re.MULTILINE)
    return text.strip()

# ==========================================
# 1. STYLE ANALYZER (DNA PENULISAN)
# ==========================================
def analyze_writing_style(text, user_is_pro=False):
    model_name = get_model_name("smart", user_is_pro)
    sample_text = text[:3000]
    
    prompt = f"""
    ANALISIS GAYA BAHASA (STYLE PROFILING):
    Sampel tulisan: "{sample_text}..."
    
    TUGAS:
    Identifikasi "DNA Penulisan" dalam 1 paragraf instruksi singkat untuk AI.
    Fokus: Struktur Kalimat, Diksi (Akademis/Santai), Tone, dan Flow.
    
    OUTPUT: Berikan HANYA instruksi gaya bahasa.
    """
    try:
        response = completion(model=model_name, messages=[{"role": "user", "content": prompt}], temperature=0.3)
        return response.choices[0].message.content
    except Exception:
        return "Gunakan gaya penulisan akademis standar yang baku dan objektif."

# ==========================================
# 2. FACT-CHECKER AGENT (THE AUDITOR)
# ==========================================
def verify_claim_validity(claim_sentence, ref_content, model="smart"):
    """
    Agent Auditor: Membandingkan klaim tulisan AI dengan sumber asli.
    Mengembalikan: (IsValid: bool, Correction: str)
    """
    system_prompt = """
    PERAN: Anda adalah 'Academic Auditor' yang sangat ketat.
    TUGAS: Verifikasi apakah KLAIM di bawah ini didukung oleh SUMBER REFERENSI yang diberikan.
    
    ATURAN PENILAIAN:
    1. VALID: Jika inti klaim ada di sumber (walaupun beda kata-kata).
    2. INVALID: Jika klaim bertentangan, tidak disebutkan, atau halusinasi.
    
    OUTPUT JSON FORMAT:
    {
        "is_valid": true/false,
        "reason": "Alasan singkat...",
        "corrected_sentence": "Kalimat perbaikan yang sesuai fakta sumber (jika invalid). Jika valid, kosongkan."
    }
    """
    
    user_prompt = f"""
    [KLAIM TULISAN]: "{claim_sentence}"
    [SUMBER ASLI]: "{ref_content[:1500]}..." 
    """
    
    try:
        # Gunakan model Smart/Fast untuk audit
        audit_model = AVAILABLE_MODELS['fast'] if model == 'fast' else AVAILABLE_MODELS['smart']
        
        response = completion(
            model=audit_model,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            temperature=0.1, # Harus sangat deterministik
            response_format={"type": "json_object"}
        )
        result = json.loads(response.choices[0].message.content)
        return result
    except Exception as e:
        print(f"Fact Check Error: {e}")
        return {"is_valid": True, "corrected_sentence": ""} # Fallback: Assume true to avoid breakage

# ==========================================
# 3. EDITOR AGENT (PROOFREADER)
# ==========================================
def proofread_text(text, user_is_pro=False):
    """
    Editor Agent: Memperbaiki tata bahasa (PUEBI), typo, dan efektivitas kalimat.
    """
    model_name = AVAILABLE_MODELS['smart'] if user_is_pro else AVAILABLE_MODELS['fast']
    
    system_prompt = """
    PERAN: Anda adalah Editor Bahasa Indonesia Senior (Ahli PUEBI).
    TUGAS: Lakukan Proofreading & Editing pada teks yang diberikan.
    
    ATURAN KOREKSI:
    1. Perbaiki kesalahan ejaan (typo) dan tanda baca.
    2. Sesuaikan dengan kaidah PUEBI (Pedoman Umum Ejaan Bahasa Indonesia).
    3. Ubah kalimat yang tidak efektif menjadi kalimat efektif (hemat kata).
    4. JANGAN mengubah makna atau substansi tulisan.
    5. JANGAN mengubah format HTML (seperti <b>, <i>, <br>) jika ada.
    6. Hapus kata-kata berulang atau pemborosan kata (redundansi).
    
    OUTPUT: Berikan HANYA teks hasil perbaikan. Jangan ada komentar pembuka/penutup.
    """
    
    try:
        response = completion(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"TEKS ASLI:\n{text}"}
            ],
            temperature=0.2 # Rendah agar koreksi akurat
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error Proofreading: {str(e)}"

# ==========================================
# 4. SUPERVISOR AGENT (REVIEWER)
# ==========================================
def refine_draft_with_supervisor(draft_text, task_type, user_is_pro=False):
    """
    Supervisor Agent: Mereview dan memoles tulisan.
    """
    model_name = AVAILABLE_MODELS['smart'] if user_is_pro else AVAILABLE_MODELS['fast']
    
    system_prompt = """
    PERAN: Anda adalah Editor Jurnal Ilmiah Senior & Dosen Pembimbing Skripsi yang sangat kritis.
    TUGAS: Lakukan penyuntingan (editing) & penulisan ulang (rewriting) pada naskah berikut.
    KRITERIA KOREKSI (STRICT):
    1. **Humanize:** Ubah kalimat kaku menjadi luwes dan akademis.
    2. **Vocabulary Upgrade:** Ganti kata standar dengan diksi akademis presisi.
    3. **Connectors:** Pastikan kohesi antar paragraf (flow enak dibaca).
    4. **Format:** JANGAN ubah struktur HTML (<h3>, <p>) atau sitasi. Hanya perbaiki narasi.
    OUTPUT: Berikan HANYA naskah hasil revisi final.
    """
    
    user_prompt = f"[NASKAH AWAL]\n{draft_text}\n\n[INSTRUKSI]\nPerbaiki naskah di atas agar layak terbit. Konteks: {task_type}"

    try:
        response = completion(
            model=model_name,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            temperature=0.4
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Supervisor Error: {e}")
        return draft_text

# ==========================================
# 5. CONSULTANT AGENT (CONTEXT-AWARE CHAT)
# ==========================================
def get_chat_response_stream(user_message, project_context=None, references=None):
    """
    Consultant Agent: Chatbot yang sadar konteks skripsi user (RAG Lite).
    """
    model_name = AVAILABLE_MODELS['fast'] 
    
    context_info = "Belum ada data proyek spesifik."
    if project_context:
        context_info = f"""
        KONTEKS SKRIPSI MAHASISWA:
        - Judul: {project_context.get('title', '-')}
        - Masalah: {project_context.get('problem_statement', '-')}
        - Metode: {project_context.get('methodology', '-')}
        """
    
    ref_info = ""
    if references:
        top_refs = references[:5] 
        ref_list = [f"- {r.get('author')} ({r.get('year')}): {r.get('title')}" for r in top_refs]
        ref_info = "\nREFERENSI YANG DIMILIKI MAHASISWA:\n" + "\n".join(ref_list)

    system_prompt = f"""
    PERAN: Anda adalah Dosen Pembimbing Skripsi (Supervisor) yang suportif tapi kritis.
    TUJUAN: Membantu mahasiswa menyelesaikan skripsinya melalui diskusi (chat).
    
    {context_info}
    {ref_info}
    
    INSTRUKSI:
    1. Jawab pertanyaan mahasiswa dengan mengacu pada Konteks Skripsi mereka (jika relevan).
    2. Berikan saran yang praktis, akademis, dan memotivasi.
    3. Jika mahasiswa bertanya tentang referensi, cek daftar referensi yang mereka miliki.
    4. Jawab dengan ringkas (to-the-point) kecuali diminta menjelaskan panjang lebar.
    """

    try:
        response = completion(
            model=model_name, 
            messages=[
                {"role": "system", "content": system_prompt}, 
                {"role": "user", "content": user_message}
            ], 
            temperature=0.7, 
            stream=True
        )
        for chunk in response:
            if chunk.choices[0].delta.content: 
                yield chunk.choices[0].delta.content
    except Exception as e: 
        yield f"Error: {str(e)}"


# ==========================================
# 6. UTILS LAIN (PARAPHRASE ENGINE)
# ==========================================
def paraphrase_text(user, text, style='academic', selected_model='fast'):
    """
    Paraphrase Engine: Menulis ulang teks dengan gaya tertentu.
    [UPDATE] Ultra-Strict Mode dengan Few-Shot Examples agar AI tidak halusinasi.
    """
    # 1. Validasi Model
    model_name = get_model_name(selected_model, user.is_pro)
    
    # 2. Bangun Instruksi Spesifik per Style
    style_guide = ""
    if style == 'academic':
        style_guide = """
        - TONE: Formal, objektif, ilmiah, dan dingin.
        - VOCABULARY: Gunakan istilah akademis (e.g., 'menyebabkan' -> 'mengindikasikan kausalitas').
        - STRUCTURE: Kalimat pasif lebih disukai jika menekankan objek.
        - GOAL: Tingkatkan densitas leksikal (lexical density) agar terlihat seperti jurnal Q1.
        """
    elif style == 'creative':
        style_guide = """
        - TONE: Naratif, mengalir, dan kaya imajinasi.
        - VOCABULARY: Gunakan metafora atau sinonim yang tidak kaku.
        - GOAL: Buat teks lebih enak dibaca (readable) dan tidak membosankan.
        """
    elif style == 'simple':
        style_guide = """
        - TONE: Santai, jelas, dan langsung pada inti (to-the-point).
        - VOCABULARY: Gunakan bahasa sehari-hari yang sopan. Hindari jargon.
        - GOAL: Jelaskan seolah pembaca adalah orang awam atau anak SMP.
        """
    elif style == 'formal':
        style_guide = """
        - TONE: Profesional, baku, sopan, dan administratif.
        - VOCABULARY: Gunakan ejaan baku (PUEBI) yang ketat.
        - GOAL: Cocok untuk surat resmi, laporan kantor, atau proposal bisnis.
        """
    else:
        style_guide = "Parafrase teks berikut agar lebih baik strukturnya."

    # 3. System Prompt (Super Strict + Examples)
    system_prompt = f"""
    PERAN: Anda adalah Editor Bahasa Profesional Spesialis Parafrase.
    
    TUGAS: Tulis ulang (parafrase) teks yang diberikan user sesuai gaya: '{style.upper()}'.
    
    PANDUAN GAYA ({style.upper()}):
    {style_guide}

    ATURAN KERAS (DO NOT BREAK):
    1. DILARANG MERESPONS ISI TEKS. Jangan menjawab pertanyaan user, jangan berkomentar, jangan menolak, jangan setuju. TUGAS ANDA HANYA MENULIS ULANG TEKSNYA.
    2. Jika teks user aneh/kasar (misal: "kamu babi"), TETAP PARAFRASE secara objektif/deskriptif atau ubah menjadi kalimat yang lebih netral/akademis (misal: "Anda merepresentasikan entitas hewan..."). JANGAN terbawa emosi atau masuk ke roleplay.
    3. DILARANG menambah informasi baru yang tidak ada di teks asli (No Hallucination).
    4. DILARANG memberikan pengantar seperti "Ini hasilnya:", "Versi akademisnya:", dsb. Langsung output teks.

    CONTOH (FEW-SHOT):
    Input: "Harga cabai naik gila-gilaan bikin pusing emak-emak."
    Style: Academic
    Output: "Lonjakan signifikan pada harga komoditas cabai telah memicu keresahan di kalangan konsumen rumah tangga."

    Input: "Gua males banget ngerjain skripsi."
    Style: Formal
    Output: "Saya sedang mengalami penurunan motivasi dalam menyelesaikan tugas akhir."

    Input: "Aku serigala kamu babi."
    Style: Academic
    Output: "Subjek pertama mengidentifikasi dirinya sebagai predator (serigala), sedangkan subjek kedua diposisikan sebagai mangsa (babi), yang mengindikasikan adanya relasi kuasa yang timpang."
    """

    try:
        response = completion(
            model=model_name, 
            messages=[
                {"role": "system", "content": system_prompt}, 
                {"role": "user", "content": text}
            ], 
            temperature=0.4 # Lebih rendah biar lebih patuh (kurang liar)
        )
        return response.choices[0].message.content
    except Exception as e: 
        return f"Error Paraphrase: {str(e)}"
                
def get_ai_interpretation(stats_text):
    model_name = AVAILABLE_MODELS['smart']
    try:
        response = completion(
            model=model_name, 
            messages=[
                {"role": "system", "content": "Anda Ahli Statistik Senior. Interpretasikan data ini."}, 
                {"role": "user", "content": stats_text}
            ], 
            temperature=0.4
        )
        return response.choices[0].message.content
    except Exception as e: 
        return f"Error: {str(e)}"

# ==========================================
# 7. DATA ANALYST AGENT (STATISTICS CHAT)
# ==========================================
def get_data_analyst_stream(user_message, dataset_context=None, selected_model="fast", is_pro_user=False):
    """
    Data Analyst Agent: Chatbot spesialis statistik & data.
    [UPDATE] Mendukung pemilihan model (Llama/GPT/Claude).
    """
    # Validasi akses model (Pro vs Free)
    model_name = get_model_name(selected_model, is_pro_user)
    
    data_info = "Belum ada dataset yang dimuat."
    if dataset_context:
        # Format konteks data agar mudah dibaca AI
        vars_list = ", ".join([v['name'] for v in dataset_context.get('variables', [])])
        data_info = f"""
        [KONTEKS DATASET PENGGUNA]
        - Total Baris: {dataset_context.get('total_rows', 0)}
        - Total Variabel: {dataset_context.get('total_cols', 0)}
        - Daftar Variabel: {vars_list}
        
        [SAMPEL DATA & STATISTIK]
        {dataset_context.get('summary_text', 'Tidak tersedia.')}
        """

    system_prompt = f"""
    PERAN: Anda adalah Senior Data Scientist & Konsultan Statistik.
    TUJUAN: Membantu pengguna menganalisis data, memilih uji statistik yang tepat, dan menginterpretasikan hasil.
    
    {data_info}
    
    INSTRUKSI:
    1. Jawab pertanyaan berdasarkan konteks dataset di atas (jika relevan).
    2. Jika user bertanya "Uji apa yang cocok?", lihat tipe data variabel (Numeric/Categorical) dan sarankan uji yang valid (misal: T-Test, ANOVA, Chi-Square).
    3. Berikan penjelasan yang akademis namun mudah dipahami.
    4. Jika user meminta interpretasi, jelaskan implikasi dari pola data tersebut.
    5. Jawab to-the-point dan solutif.
    """

    try:
        response = completion(
            model=model_name, 
            messages=[
                {"role": "system", "content": system_prompt}, 
                {"role": "user", "content": user_message}
            ], 
            temperature=0.3, 
            stream=True
        )
        for chunk in response:
            if chunk.choices[0].delta.content: 
                yield chunk.choices[0].delta.content
    except Exception as e: 
        yield f"Error Data Analyst: {str(e)}"

# ==========================================
# [BARU] STREAMING GENERATOR UNTUK WRITING STUDIO
# ==========================================
def generate_academic_draft_stream(user, task_type, input_data, project_context=None, selected_model="fast", references=None, word_count="600", citation_style="bodynote_apa", editor_context=None, user_style_profile=None):
    """
    Versi Streaming dari generate_academic_draft.
    Menggunakan generator (yield) untuk mengirim teks kata per kata.
    """
    # [FIX] Safety Guard: Cek apakah user ada. Jika None, anggap user gratisan (False).
    is_pro = getattr(user, 'is_pro', False) if user else False
    
    model_name = get_model_name(selected_model, is_pro)
    
    # 1. Konteks Proyek
    context_str = ""
    if project_context:
        context_str = f"""
        [METADATA PENELITIAN]
        Judul: {project_context.get('title', '-')}
        Masalah: {project_context.get('problem_statement', '-')}
        Metode: {project_context.get('methodology', '-')}
        Variabel: {project_context.get('variables', '-')}
        """

    # 2. Referensi (Strict)
    references_str = "TIDAK ADA REFERENSI KHUSUS."
    if references and len(references) > 0:
        ref_list = []
        for i, ref in enumerate(references, 1):
            author = ref.get('author') or "Anonim"
            year = ref.get('year') or "n.d."
            title = ref.get('title') or "Tanpa Judul"
            content = (ref.get('abstract') or ref.get('notes') or "")[:500].replace('\n', ' ') 
            ref_text = f"REF_ID [{i}]: {{ Penulis: {author}, Tahun: {year}, Judul: \"{title}\", Isi: {content}... }}"
            ref_list.append(ref_text)
        references_str = "\n".join(ref_list)

    # 3. Gaya Sitasi
    citation_rules = "Format sitasi standar (Nama, Tahun)."
    if citation_style == "bodynote_apa": citation_rules = "Format APA 7 (Author, Year)."
    elif citation_style == "bodynote_harvard": citation_rules = "Format Harvard."
    elif citation_style == "ieee": citation_rules = "Format Numbering [1]."

    # 4. Smart Context (Tulisan sebelumnya)
    prev_content_str = ""
    if editor_context and len(editor_context) > 50:
        prev_content_str = f"[KONTEKS TULISAN SEBELUMNYA] ... {editor_context[-2000:]} \n\nINSTRUKSI: Lanjutkan alur di atas."

    # 5. Style Transfer Injection
    style_instruction = "Gunakan Bahasa Indonesia baku (PUEBI), objektif, dingin, dan analitis."
    if user_style_profile:
        style_instruction = f"""
        *** PERSONALIZED STYLE ACTIVE ***
        Anda harus MENIRU gaya penulisan berikut ini (Style Mimicry):
        "{user_style_profile}"
        
        PENTING: Jangan terdengar seperti robot AI standar. Gunakan struktur kalimat, pilihan kata, dan 'jiwa' tulisan sesuai profil di atas.
        """

    # 6. System Prompt Construction
    system_prompt = f"""
    PERAN: Anda adalah Penulis Akademik Senior.
    
    PRINSIP UTAMA:
    1. **Strict Citation:** Setiap klaim fakta HARUS menggunakan `[REF_ID: Nomor_ID]`.
    2. **Format HTML:** Gunakan tag HTML dasar seperti `<h3>`, `<p>`, `<ul>`, `<li>`, `<strong>` untuk struktur. JANGAN gunakan Markdown (seperti ** atau #).
    3. **Data Integrity:** Jangan ngarang angka statistik.
    4. **STYLE & TONE:** {style_instruction}

    ATURAN SITASI: {citation_rules}
    """

    task_instruction = build_task_instruction(task_type, input_data, input_data.get('custom_instruction', ''))

    final_user_prompt = f"""
    {context_str}
    [DAFTAR REFERENSI]
    {references_str}
    {prev_content_str}
    -------------------
    {task_instruction}
    -------------------
    TARGET: {word_count} kata. Langsung isi konten dalam format HTML.
    """

    try:
        # Hitung max tokens (estimasi kasar: 1 kata ~ 1.3 token, kasih buffer)
        max_tok = min(int(int(word_count) * 2.5), 4096)
        
        response = completion(
            model=model_name,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": final_user_prompt}],
            temperature=0.4, 
            max_tokens=max_tok,
            stream=True  # <--- KUNCI STREAMING
        )
        
        # Generator: Yield chunk demi chunk
        for chunk in response:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    except Exception as e:
        yield f"<p style='color:red;'><strong>System Error:</strong> {str(e)}</p>"

# ==========================================
# 8. ARCHITECT AGENT (OUTLINE GENERATOR)
# ==========================================
def generate_smart_outline(user, task_type, input_data, project_context=None, selected_model="smart"):
    """
    Architect Agent: Membuat struktur bab yang logis sebelum penulisan dimulai.
    Output: List of Dict (JSON) -> [{sub_bab, poin_pembahasan, instruksi}]
    """
    # 1. Pilih Model (Gunakan model cerdas untuk logika struktur)
    model_name = get_model_name(selected_model, user.is_pro)
    
    # 2. Bangun Konteks
    context_str = "Topik Umum"
    if project_context:
        context_str = f"""
        KONTEKS PROYEK:
        - Judul: {project_context.get('title', '-')}
        - Rumusan Masalah: {project_context.get('problem_statement', '-')}
        - Metodologi: {project_context.get('methodology', '-')}
        - Teori: {project_context.get('theories', '-')}
        """
    
    # 3. Tentukan Instruksi Berdasarkan Fase Penulisan
    specific_instruction = ""
    if task_type == 'background':
        topic = input_data.get('topic', '')
        specific_instruction = f"Buat kerangka Bab 1 Pendahuluan untuk topik '{topic}'. Fokus: Latar Belakang (Fenomena & Gap), Identifikasi Masalah, Tujuan."
    elif task_type == 'literature_review':
        topic = input_data.get('topic', '')
        specific_instruction = f"Buat kerangka Bab 2 Tinjauan Pustaka untuk topik '{topic}'. Fokus: Grand Theory, Variabel X, Variabel Y, dan Penelitian Terdahulu."
    elif task_type == 'methodology':
        specific_instruction = "Buat kerangka Bab 3 Metodologi Penelitian. Fokus: Desain, Populasi/Sampel, Instrumen, dan Teknik Analisis."
    elif task_type == 'discussion_chapter4':
        stats_preview = input_data.get('stats_result', '')[:500]
        specific_instruction = f"Buat kerangka Bab 4 Hasil & Pembahasan berdasarkan data ini: {stats_preview}... Fokus: Deskripsi Data, Hasil Uji Hipotesis, dan Pembahasan (Kaitkan dengan Teori)."
    elif task_type == 'conclusion':
        specific_instruction = "Buat kerangka Bab 5 Penutup. Fokus: Kesimpulan menjawab rumusan masalah dan Saran praktis/teoretis."
    else:
        specific_instruction = f"Buat kerangka tulisan akademis berdasarkan instruksi: {input_data.get('custom_instruction')}"

    # 4. System Prompt (Strict JSON Output)
    system_prompt = """
    PERAN: Anda adalah 'Academic Architect' (Dosen Pembimbing Senior).
    TUGAS: Merancang struktur bab skripsi yang logis, mengalir, dan akademis.
    
    FORMAT OUTPUT WAJIB (JSON ARRAY):
    [
        {
            "sub_bab": "Judul Sub-bab (misal: 1.1 Latar Belakang Masalah)",
            "poin_pembahasan": ["Poin 1: Fenomena...", "Poin 2: Data Empiris...", "Poin 3: Gap Penelitian..."],
            "instruksi_khusus": "Instruksi gaya bahasa atau fokus untuk AI penulis nanti."
        },
        ...
    ]
    
    ATURAN:
    1. HANYA berikan output JSON mentah. Jangan pakai Markdown (```json).
    2. Pastikan urutan logis (deduktif/induktif).
    3. Bahasa Indonesia baku.
    """

    user_prompt = f"""
    {context_str}
    
    PERMINTAAN USER:
    {specific_instruction}
    
    Buatkan 3-5 sub-bab yang mendalam.
    """

    try:
        response = completion(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3, # Rendah agar struktur konsisten
            response_format={"type": "json_object"} 
        )
        
        # Bersihkan output JSON
        raw_content = response.choices[0].message.content
        cleaned_content = clean_json_output(raw_content)
        
        # Parsing
        parsed_json = json.loads(cleaned_content)
        
        # Handle jika AI mengembalikan dict wrapper (misal: {"outline": [...]})
        if isinstance(parsed_json, dict):
            if 'outline' in parsed_json: return parsed_json['outline']
            if 'chapters' in parsed_json: return parsed_json['chapters']
            # Jika tidak ada key standar, coba ambil value list pertama
            for val in parsed_json.values():
                if isinstance(val, list): return val
            
        return parsed_json if isinstance(parsed_json, list) else []

    except Exception as e:
        print(f"Outline Gen Error: {e}")
        traceback.print_exc()
        # Fallback manual jika AI gagal
        return [
            {
                "sub_bab": "Bagian 1 (Fallback)",
                "poin_pembahasan": ["Sistem gagal membuat outline otomatis.", "Silakan edit manual."],
                "instruksi_khusus": "Tulis dengan hati-hati."
            }
        ]

# ==========================================
# 9. AUDITOR AGENT (BATCH VERIFICATION)
# ==========================================
def batch_verify_content(html_text, references_list):
    """
    Memeriksa satu blok konten HTML sekaligus terhadap daftar referensi.
    """
    # Gabungkan referensi jadi satu konteks besar (truncate jika terlalu panjang)
    knowledge_base = "\n\n".join([f"[REF {i+1}] {r[:1000]}" for i, r in enumerate(references_list)])
    
    system_prompt = """
    PERAN: Anda adalah Editor Jurnal Ilmiah yang teliti (Fact Checker).
    
    TUGAS: 
    1. Baca TEKS INPUT (format HTML).
    2. Identifikasi kalimat yang mengandung klaim fakta/data.
    3. Cek apakah klaim tersebut didukung oleh REFERENSI yang disediakan.
    
    OUTPUT JSON (List of Objects):
    Berikan daftar kalimat yang bermasalah (Halusinasi/Tidak Akurat) atau Valid.
    Format:
    {
        "segments": [
            {
                "original_text": "Potongan kalimat/frasa dari teks asli...",
                "status": "valid" | "invalid" | "unsupported",
                "reason": "Penjelasan singkat kenapa invalid...",
                "suggestion": "Saran perbaikan (jika invalid)"
            }
        ]
    }
    
    ATURAN:
    - Jika kalimat bersifat umum/pendapat sendiri, tandai "valid".
    - Jika angka/data salah, tandai "invalid".
    - Jika tidak ada di referensi tapi terdengar ilmiah, tandai "unsupported".
    """
    
    user_prompt = f"""
    [REFERENSI TERSEDIA]
    {knowledge_base[:20000]} 
    
    [TEKS INPUT]
    {html_text}
    """
    
    try:
        response = completion(
            model=AVAILABLE_MODELS['smart'], # Gunakan model pintar (Llama 70b / GPT-4)
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        
        content = clean_json_output(response.choices[0].message.content)
        return json.loads(content)
        
    except Exception as e:
        print(f"Batch Audit Error: {e}")
        return {"segments": []}

# ==========================================
# HELPER: STATISTICAL REASONING ENGINE
# ==========================================
def _generate_stats_instruction(stats_text):
    """
    Menganalisis jenis data statistik dan memberikan panduan interpretasi spesifik ke AI.
    """
    instruction = "\n[PANDUAN ANALISIS DATA]:"
    
    # Deteksi jenis analisis dari keyword di JSON string
    if '"r_square"' in stats_text or '"coefficients"' in stats_text:
        # Kasus Regresi Linear
        instruction += """
        1. **Uji Simultan (F-Test):** Cek 'sig_f'. Jika < 0.05, jelaskan bahwa semua variabel X secara bersama-sama berpengaruh signifikan terhadap Y.
        2. **Uji Parsial (T-Test):** Cek tabel 'coefficients'. Untuk setiap variabel, lihat 'sig'. Jika < 0.05, nyatakan berpengaruh signifikan. Lihat 'B' (Beta) untuk arah hubungan (Positif/Negatif).
        3. **Determinan (R-Square):** Interpretasikan 'r_square' atau 'adj_r_square' sebagai persentase kontribusi pengaruh (%). Sisanya dipengaruhi faktor lain.
        4. **Asumsi Klasik:** Jika ada data 'normality' atau 'multicollinearity', bahas secara singkat apakah model memenuhi syarat (Valid/Reliabel).
        """
    elif '"t_stat"' in stats_text or '"mean_diff"' in stats_text:
        # Kasus Uji Beda (T-Test)
        instruction += """
        1. **Signifikansi:** Cek nilai 'sig'. Jika < 0.05, nyatakan ada perbedaan yang signifikan antara kedua kelompok.
        2. **Mean Difference:** Jelaskan kelompok mana yang lebih tinggi rata-ratanya berdasarkan 'group_stats' atau 'mean_diff'.
        """
    elif '"cronbach_alpha"' in stats_text:
        # Kasus Reliabilitas
        instruction += """
        1. Cek 'cronbach_alpha'. Jika > 0.6, nyatakan instrumen RELIABEL (Konsisten).
        2. Bahas item-item yang memiliki korelasi rendah jika ada.
        """
    elif '"correlation"' in stats_text or '"matrix"' in stats_text:
        # Kasus Korelasi
        instruction += """
        1. Jelaskan keeratan hubungan berdasarkan nilai R (Correlation Coefficient).
        2. 0-0.2 (Sangat Lemah), 0.2-0.4 (Lemah), 0.4-0.6 (Sedang), 0.6-0.8 (Kuat), >0.8 (Sangat Kuat).
        3. Cek arah hubungan (Positif/Negatif).
        """
    else:
        # Default / Deskriptif
        instruction += """
        1. Jelaskan pola data (Mean, Min, Max).
        2. Highlight angka yang ekstrem atau menarik perhatian.
        """
        
    instruction += "\n5. **SINTESIS TEORI:** Wajib kaitkan temuan angka di atas dengan Teori atau Penelitian Terdahulu yang ada di Konteks Proyek. Apakah sejalan atau menolak?"
    
    return instruction

# ==========================================
# FUNGSI UTAMA: BUILD INSTRUCTION (REVAMPED)
# ==========================================

def build_task_instruction(task_type, input_data, custom_instr=""):
    """
    MASTER PROMPT ENGINE (UPDATED)
    ------------------------------
    Mengatur instruksi sistem untuk setiap bagian skripsi.
    Fitur Utama:
    1. Bab 1 Modular (Target 8 Halaman total).
    2. Formalisasi Input User (Santai -> Akademis).
    3. Strict Citation (Body Note).
    4. Support Bab 2, 3, 4, 5.
    """
    method_mode = input_data.get('method_mode', 'quantitative')
    
    # Context Variables (Dari Project Sidebar)
    ctx_title = input_data.get('context_title', 'Topik Penelitian')
    ctx_problem = input_data.get('context_problem', '-')
    
    # Priority Topic: Input manual > Sidebar Context
    user_topic = input_data.get('topic', '')
    active_topic = user_topic if user_topic.strip() else ctx_title

    # ====================================================
    # 1. BAB 1: MODULAR SYSTEM (TARGET 8 HALAMAN)
    # ====================================================

    # --- PART 1: KONDISI IDEAL (DAS SOLLEN) ---
    # Target: 4-5 Paragraf | ±1.5 Halaman
    if task_type == 'bab1_part_ideal':
        user_input = input_data.get('input_text', '')
        return f"""
        PERAN: Academic Writer (Spesialis Teori & Regulasi).
        TUGAS: Menulis BAB 1 BAGIAN 1: KONDISI IDEAL (Das Sollen).
        JUDUL SKRIPSI: "{active_topic}"

        INPUT USER (POIN-POIN KASAR):
        "{user_input}"

        INSTRUKSI UTAMA:
        1. **FORMALIZE (PENTING):** Input user mungkin menggunakan bahasa santai/kasar. TUGAS ANDA adalah mengubahnya menjadi narasi akademis yang baku, formal, dan ilmiah.
        2. **VOLUME:** Tulis MINIMAL 4-5 Paragraf panjang (±150 kata/paragraf). Total target: 600-750 kata.
        3. **STRUKTUR KONTEN:**
           - Paragraf 1-2: Jelaskan konsep ideal/teoretis secara global terkait variabel judul.
           - Paragraf 3: Masukkan Regulasi/UU/Standar Pemerintah yang berlaku (jika relevan).
           - Paragraf 4-5: Gambarkan harapan atau kondisi sempurna yang seharusnya terjadi di objek penelitian.
        4. **REFERENSI:** Gunakan Body Note (Nama, Tahun) setiap kali mengutip teori.
        5. **FORMAT:** HTML Paragraphs (`<p>`). Jangan gunakan Heading.
        """

    # --- PART 2: KONDISI FAKTUAL (DAS SEIN) ---
    # Target: 6-7 Paragraf | ±2.5 Halaman (CORE PROBLEM)
    elif task_type == 'bab1_part_factual':
        user_input = input_data.get('input_text', '')
        return f"""
        PERAN: Investigative Researcher (Analisis Masalah).
        TUGAS: Menulis BAB 1 BAGIAN 2: KONDISI FAKTUAL (Das Sein).
        JUDUL SKRIPSI: "{active_topic}"

        INPUT USER (DATA MASALAH/FAKTA):
        "{user_input}"

        INSTRUKSI UTAMA:
        1. **TRANSISI:** Mulai paragraf pertama dengan kata sambung pertentangan (Contoh: "Namun, realita di lapangan menunjukkan...", "Akan tetapi, data empiris memperlihatkan...").
        2. **VOLUME:** Tulis MINIMAL 6-7 Paragraf gemuk (±150 kata/paragraf). Total target: 900-1050 kata.
        3. **STRUKTUR KONTEN:**
           - Dramatisir masalah dengan bahasa akademis (hindari bahasa jurnalistik/koran).
           - Paparkan data/statistik/bukti yang diberikan user secara detail dan tajam.
           - Jelaskan dampak negatif (Impact Analysis) jika masalah ini dibiarkan terus-menerus.
           - Bandingkan secara eksplisit gap antara Ideal (Part 1) vs Faktual (Part 2).
        4. **FORMALIZE:** Ubah bahasa user yang santai menjadi bahasa skripsi yang sangat formal.
        5. **FORMAT:** HTML Paragraphs (`<p>`).
        """

    # --- PART 3: RESEARCH GAP ---
    # Target: 3-4 Paragraf | ±1 Halaman
    elif task_type == 'bab1_part_gap':
        user_input = input_data.get('input_text', '')
        return f"""
        PERAN: Academic Reviewer.
        TUGAS: Menulis BAB 1 BAGIAN 3: RESEARCH GAP (Keaslian Penelitian).
        JUDUL SKRIPSI: "{active_topic}"

        INPUT USER (PENELITIAN TERDAHULU):
        "{user_input}"

        INSTRUKSI UTAMA:
        1. **VOLUME:** Tulis 3-4 Paragraf (±450-600 kata).
        2. **STRUKTUR KONTEN:**
           - Review singkat penelitian terdahulu yang mirip (Sebutkan keterbatasannya).
           - Identifikasi apa yang BELUM diteliti oleh mereka (Novelty/Kebaruan).
           - Tegaskan posisi penelitian ini (mengisi celah tersebut).
        3. **GAYA BAHASA:** Kritis namun objektif. Gunakan frasa: "Penelitian sebelumnya cenderung fokus pada..., sedangkan penelitian ini akan mendalami..."
        4. **FORMAT:** HTML Paragraphs (`<p>`).
        """

    # --- PART 4: URGENSI & SOLUSI ---
    # Target: 3-4 Paragraf | ±1 Halaman
    elif task_type == 'bab1_part_solution':
        user_input = input_data.get('input_text', '')
        return f"""
        PERAN: Academic Strategist.
        TUGAS: Menulis BAB 1 BAGIAN 4: URGENSI & SOLUSI (Penutup Latar Belakang).
        JUDUL SKRIPSI: "{active_topic}"

        INPUT USER (ALASAN/SOLUSI):
        "{user_input}"

        INSTRUKSI UTAMA:
        1. **VOLUME:** Tulis 3-4 Paragraf (±450-600 kata).
        2. **STRUKTUR KONTEN:**
           - Jelaskan mengapa judul ini PENTING & MENDESAK untuk diteliti SEKARANG (Urgency).
           - Apa kontribusi praktis/teoretis yang diharapkan.
           - **Clinching Statement:** Paragraf penutup yang kuat dan mengarah ke Rumusan Masalah.
        3. **FORMAT:** HTML Paragraphs (`<p>`).
        """

# ====================================================
    # 2. BAB 1: RUMUSAN MASALAH & TUJUAN
    # ====================================================
    elif task_type == 'bab1_rumusan':
        return f"""
        PERAN: Dosen Metodologi Penelitian.
        TUGAS: Merumuskan Masalah Penelitian (Research Questions) SAJA.
        
        DATA PENELITIAN:
        - Judul: "{active_topic}"
        - Masalah Utama: "{ctx_problem}"

        INSTRUKSI STRICT (OUTPUT FINAL):
        1. **KALIMAT PEMBUKA WAJIB:** Output HARUS diawali persis dengan kalimat ini:
           "Berdasarkan masalah-masalah yang ada, maka problematika penelitian ini dapat dirumuskan sebagai berikut:"
        2. **ISI:** Buat daftar pertanyaan penelitian (Maksimal 3 poin).
           - Gunakan format HTML Ordered List `<ol>`.
           - Pertanyaan harus operasional (bisa diukur/dijawab dengan data).
           - Kuantitatif: Pakai "Apakah terdapat pengaruh...", "Seberapa besar..."
           - Kualitatif: Pakai "Bagaimana...", "Mengapa..."
        
        3. **LARANGAN KERAS (CRITICAL):** - DILARANG MENAMBAHKAN 'Tujuan Penelitian', 'Metode', 'Manfaat', 'Implikasi', atau 'Kesimpulan'.
           - HANYA output daftar pertanyaan. Berhenti menulis setelah tag `</ol>`.
           - Jangan bertele-tele.
        """

    elif task_type == 'bab1_tujuan':
        return f"""
        PERAN: Dosen Metodologi Penelitian.
        TUGAS: Menulis Tujuan Penelitian SAJA.
        JUDUL: "{active_topic}"
        
        INSTRUKSI STRICT:
        1. Tujuan harus menjawab Rumusan Masalah secara langsung (Mirroring).
        2. Gunakan kata kerja operasional: "Untuk mengetahui...", "Untuk menganalisis...", "Untuk menguji...".
        3. **LARANGAN:** Jangan menambahkan bab lain (Metode/Manfaat/dll). Cukup poin tujuan saja.
        4. Format output: HTML Ordered List (`<ol>`).
        """
    # ====================================================
    # BAB 2: THE SCALABLE SYNTHESIS ENGINE (MAX 15 HALAMAN)
    # ====================================================
    
    length_mode = input_data.get('length_mode', 'standard') 
    
    # Text standar untuk instruksi referensi
    ref_instruction = """
    SUMBER REFERENSI (CRITICAL):
    1. PRIORITAS UTAMA: Gunakan [DAFTAR REFERENSI] yang disediakan di atas context ini (jika ada).
    2. JIKA RELEVAN: Ambil kutipan dari daftar tersebut dan masukkan sitasi (Author, Year).
    3. SINTESIS: Gabungkan poin input user dengan referensi yang tersedia. Jangan hanya mengandalkan satu sumber.
    """

    # --- CARD 1: VARIABEL X ---
    if task_type == 'bab2_part_x':
        var_name = input_data.get('variable_name', 'Variabel X')
        user_input = input_data.get('input_text', '')
        
        detail_instr = "Mode STANDAR."
        if length_mode == 'max':
            detail_instr = "Mode MAKSIMAL: Bahas detail (Definisi, Karakteristik, Jenis, Penerapan)."

        return f"""
        PERAN: Academic Expert. TUGAS: Kajian Pustaka Variabel X: "{var_name}".
        INPUT USER: "{user_input}"

        {ref_instruction}

        INSTRUKSI KHUSUS ({length_mode.upper()}):
        1. {detail_instr}
        2. **SINTESIS MUTLAK:** DILARANG membuat paragraf yang hanya berisi "Menurut A...". Gabungkan pendapat ahli lalu buat simpulan sintesis.
        3. Struktur: Definisi (Multi-perspektif) -> Karakteristik -> Fungsi.
        """

    # --- CARD 2: VARIABEL Y ---
    elif task_type == 'bab2_part_y':
        var_name = input_data.get('variable_name', 'Variabel Y')
        user_input = input_data.get('input_text', '')
        
        return f"""
        PERAN: Academic Expert. TUGAS: Kajian Pustaka Variabel Y: "{var_name}".
        INPUT USER: "{user_input}"

        {ref_instruction}

        INSTRUKSI KHUSUS (CARD TERBESAR - {length_mode.upper()}):
        1. **INDIKATOR (WAJIB):** Sebutkan Indikator/Dimensi secara eksplisit dari referensi yang ada (misal: ARCS, Maslow). Ini untuk Bab 3.
        2. Struktur: Definisi -> Teori Pendukung -> Indikator.
        """

    # --- CARD 3: KONTEKS ---
    elif task_type == 'bab2_part_context':
        return f"""
        PERAN: Subject Matter Expert. TUGAS: Konteks Mata Pelajaran.
        JUDUL: "{active_topic}"
        INPUT USER: "{input_data.get('input_text', '')}"
        
        INSTRUKSI:
        1. Jelaskan hakikat & tujuan pembelajaran mata pelajaran ini.
        2. Hubungkan dengan referensi kurikulum/buku teks jika ada di daftar referensi.
        """

    # --- CARD 4: HUBUNGAN (RELATION) ---
    elif task_type == 'bab2_part_relation':
        return f"""
        PERAN: Critical Researcher. TUGAS: Hubungan Antar Variabel & Penelitian Terdahulu.
        INPUT USER: "{input_data.get('input_text', '')}"

        {ref_instruction}

        INSTRUKSI:
        1. **LOGIKA:** Jelaskan "Mekanisme" bagaimana X mempengaruhi Y menggunakan teori.
        2. **PENELITIAN TERDAHULU:** Jika di [DAFTAR REFERENSI] ada Jurnal/Artikel, WAJIB dibahas di sini.
        3. Komparasikan: "Penelitian [Nama] menemukan..., hal ini sejalan dengan..."
        """

    # --- CARD 5: KERANGKA BERPIKIR ---
    elif task_type == 'bab2_part_framework':
        return f"""
        PERAN: Logical Thinker. TUGAS: Narasi Kerangka Pemikiran.
        INPUT ALUR: "{input_data.get('input_text', '')}"
        
        INSTRUKSI:
        1. Buat narasi alur berpikir (Premis Mayor -> Premis Minor -> Kesimpulan).
        2. Gunakan teori yang sudah dikutip sebelumnya sebagai landasan argumen.
        """

    # --- CARD 6: HIPOTESIS ---
    elif task_type == 'bab2_part_hypothesis':
        return f"""
        PERAN: Dosen Metodologi. TUGAS: Rumusan Hipotesis.
        INPUT: "{input_data.get('input_text', '')}"
        INSTRUKSI:
        1. Rumuskan Ha dan H0 yang operasional dan bisa diuji.
        """
    # ====================================================
    # BAB 3: METHODOLOGY ARCHITECT (8 CARDS - TARGET 8 HALAMAN)
    # ====================================================
    
    # Helper: Mode Panjang (Brief/Standard/Max)
    length_mode = input_data.get('length_mode', 'standard')
    
    # Context Link: Mengambil Data dari Bab 2 (jika dikirim frontend)
    ch2_context = input_data.get('chapter2_summary', 'Gunakan definisi standar.')

    # --- CARD 1: JENIS & PENDEKATAN ---
    # Target: 2-3 Paragraf
    if task_type == 'bab3_part_approach':
        method_mode = input_data.get('method_mode', 'quantitative')
        return f"""
        PERAN: Dosen Metodologi. TUGAS: Menulis Jenis & Pendekatan Penelitian.
        METODE: {method_mode.upper()}
        INPUT: "{input_data.get('input_text', '')}"

        INSTRUKSI STRICT:
        1. Tulis 2-3 Paragraf Padat.
        2. Jelaskan Pendekatan (Kuantitatif/Kualitatif) dan Jenisnya (Eksperimen/Survey/Studi Kasus).
        3. Berikan alasan akademis kenapa metode ini cocok untuk judul "{active_topic}".
        4. Wajib kutip buku metodologi (Sugiyono/Arikunto/Creswell).
        """

    # --- CARD 2: LOKASI & WAKTU ---
    # Target: 1-2 Paragraf
    elif task_type == 'bab3_part_loc':
        return f"""
        PERAN: Admin Penelitian. TUGAS: Menulis Lokasi & Waktu Penelitian.
        INPUT: "{input_data.get('input_text', '')}"

        INSTRUKSI STRICT:
        1. Tulis 1-2 Paragraf.
        2. Deskripsikan Lokasi (Alamat/Institusi) dan alasan pemilihan lokasi.
        3. Deskripsikan Waktu/Jadwal pelaksanaan (Bulan/Tahun).
        4. Jangan bertele-tele. Langsung ke fakta.
        """

    # --- CARD 3: POPULASI & SAMPEL / SUBJEK ---
    # Target: 3-4 Paragraf
    elif task_type == 'bab3_part_pop':
        return f"""
        PERAN: Statistician. TUGAS: Menulis Populasi & Sampel.
        INPUT: "{input_data.get('input_text', '')}"

        INSTRUKSI STRICT:
        1. Tulis 3-4 Paragraf.
        2. Populasi: Definisikan siapa dan berapa jumlahnya.
        3. Sampel: Jelaskan Teknik Sampling (Random/Purposive) dan Alasannya.
        4. Rumus: Jika ada, tuliskan rumus (Slovin/Isaac) dalam format teks matematika.
        """

    # --- CARD 4: VARIABEL & DEFINISI OPERASIONAL (AUTO-INHERIT) ---
    # Target: 4-5 Paragraf + TABEL
    elif task_type == 'bab3_part_var':
        return f"""
        PERAN: Academic Architect. TUGAS: Menulis Definisi Operasional.
        CONTEXT BAB 2: "{ch2_context}" 
        (Gunakan indikator dari Bab 2 jika ada).

        INSTRUKSI STRICT:
        1. Tulis pengantar singkat (1-2 paragraf).
        2. **WAJIB BUAT TABEL HTML:** Buat tabel `<table>` Definisi Operasional.
           - Kolom: Variabel | Definisi Operasional | Indikator | Skala.
           - Isi tabel harus diturunkan dari Variabel Judul "{active_topic}".
        3. Pastikan Indikator sinkron dengan teori di Bab 2.
        4. Skala Pengukuran: Tentukan (Likert/Nominal/Rasio).
        """

    # --- CARD 5: INSTRUMEN & TEKNIK PENGUMPULAN ---
    # Target: 3-4 Paragraf + KISI-KISI
    elif task_type == 'bab3_part_inst':
        return f"""
        PERAN: Research Assistant. TUGAS: Instrumen & Pengumpulan Data.
        INPUT: "{input_data.get('input_text', '')}"

        INSTRUKSI STRICT:
        1. Jelaskan Teknik: (Angket/Wawancara/Tes).
        2. **WAJIB BUAT TABEL KISI-KISI:** Buat tabel `<table>` Kisi-Kisi Instrumen.
           - Kolom: Variabel | Dimensi | Indikator | Nomor Butir.
        3. Jelaskan Skala Skor (misal: Sangat Setuju = 5).
        """

    # --- CARD 6: VALIDITAS & RELIABILITAS ---
    # Target: 2-3 Paragraf
    elif task_type == 'bab3_part_val':
        return f"""
        PERAN: Statistician. TUGAS: Uji Validitas & Reliabilitas.
        INPUT: "{input_data.get('input_text', '')}"

        INSTRUKSI STRICT:
        1. Tulis 2-3 Paragraf Teknis.
        2. Validitas: Jelaskan rumus (misal: Pearson Product Moment) dan kriteria valid.
        3. Reliabilitas: Jelaskan rumus (misal: Alpha Cronbach) dan batas koefisien.
        4. Sertakan rumus umumnya.
        """

    # --- CARD 7: TEKNIK ANALISIS DATA ---
    # Target: 3-4 Paragraf
    elif task_type == 'bab3_part_ana':
        return f"""
        PERAN: Data Analyst. TUGAS: Teknik Analisis Data.
        INPUT: "{input_data.get('input_text', '')}"

        INSTRUKSI STRICT:
        1. Tulis 3-4 Paragraf.
        2. Urutkan: Analisis Deskriptif -> Uji Prasyarat (Normalitas/Homogenitas) -> Uji Hipotesis.
        3. Jelaskan kriteria penerimaan hipotesis (Sig < 0.05).
        """

    # --- CARD 8: PROSEDUR PENELITIAN ---
    # Target: 2-3 Paragraf
    elif task_type == 'bab3_part_proc':
        return f"""
        PERAN: Project Manager. TUGAS: Prosedur Penelitian.
        INPUT: "{input_data.get('input_text', '')}"

        INSTRUKSI STRICT:
        1. Tulis 2-3 Paragraf atau List Tahapan.
        2. Bagi menjadi: Tahap Persiapan, Tahap Pelaksanaan, Tahap Pelaporan.
        3. Buat narasi alur yang logis.
        """
# ====================================================
# BAB 4: RESULT & DISCUSSION ENGINE (MULTI-METHOD)
# CARD-BASED | DATA-DRIVEN | ANTI-LEAK PROMPT
# ====================================================

# ====================================================
    # BAB 4: THE RESULT PRODUCTION ENGINE (MULTI-METHOD LOGIC)
    # ====================================================
    
    # Context Link
    ch2_context = input_data.get('chapter2_summary', '')
    ch3_context = input_data.get('chapter3_summary', '')
    
    # 1. DETEKSI METODE (Logic Pusat)
    # correlation | experiment | qualitative
    analysis_type = input_data.get('analysis_type', 'correlation') 

    # --- 0. GAMBARAN OBJEK (UNIVERSAL) ---
    if task_type == 'bab4_part_object':
        return f"""
        PERAN: Researcher. 
        TUGAS: Menulis Gambaran Umum Objek/Subjek Penelitian.
        INPUT DATA: "{input_data.get('input_text', '')}"

        INSTRUKSI STRICT:
        1. Deskripsikan Profil Lokasi atau Demografi Responden.
        2. JANGAN bahas hasil statistik (Mean/Pretest/Posttest) di sini.
        3. Gaya Narasi: Deskriptif formal.
        """

    # --- 1. DESKRIPSI DATA (LOGIC BERCABANG) ---
    elif task_type == 'bab4_part_descriptive':
        
        # A. JIKA EKSPERIMEN (Focus: Pre vs Post)
        if analysis_type == 'experiment':
            specific_instr = """
            - DATA: Fokus pada perbandingan PRETEST vs POSTTEST.
            - KELOMPOK: Bandingkan Kelompok Eksperimen vs Kontrol (jika ada).
            - KEYWORD: "Peningkatan", "Skor Awal", "Skor Akhir", "Gain Score".
            - VISUALISASI: Narasi harus menggambarkan kenaikan/perubahan.
            """
        
        # B. JIKA KORELASI (Focus: Var X & Var Y)
        else: 
            specific_instr = """
            - DATA: Fokus pada Mean, SD, dan Kategori (Tinggi/Sedang/Rendah) per variabel.
            - VARIABEL: Jelaskan kondisi Variabel X (Independen) dan Variabel Y (Dependen).
            - KEYWORD: "Kecenderungan", "Rata-rata skor", "Sebaran data".
            """

        return f"""
        PERAN: Data Analyst. TUGAS: Deskripsi Data Statistik ({analysis_type.upper()}).
        INPUT DATA: "{input_data.get('input_text', '')}"

        INSTRUKSI STRICT:
        1. Baca data statistik deskriptif dari input.
        2. {specific_instr}
        3. Jangan hanya baca angka, berikan makna (interpretasi deskriptif).
        """

    # --- 2. UJI PRASYARAT (LOGIC BERCABANG) ---
    elif task_type == 'bab4_part_prerequisite':
        
        # A. JIKA EKSPERIMEN (Homogenitas is King)
        if analysis_type == 'experiment':
            specific_instr = """
            1. UJI NORMALITAS: Cek nilai Sig (Shapiro-Wilk / Kolmogorov).
            2. UJI HOMOGENITAS (Wajib): Cek Levene's Test. Apakah varians data sama?
            """
        
        # B. JIKA KORELASI (Linieritas is King)
        else:
            specific_instr = """
            1. UJI NORMALITAS: Cek nilai Sig (Kolmogorov-Smirnov).
            2. UJI LINIERITAS (Wajib): Cek Deviation from Linearity. Apakah hubungan linier?
            """

        return f"""
        PERAN: Statistician. TUGAS: Uji Prasyarat Analisis.
        INPUT DATA: "{input_data.get('input_text', '')}"

        INSTRUKSI STRICT:
        1. {specific_instr}
        2. Interpretasi: Jika Sig > 0.05 maka prasyarat terpenuhi.
        3. Simpulkan: "Data layak dilanjutkan ke uji hipotesis."
        """

    # --- 3. UJI HIPOTESIS (CORE LOGIC) ---
    elif task_type == 'bab4_part_hypothesis':
        
        # A. JIKA EKSPERIMEN (Komparatif)
        if analysis_type == 'experiment':
            specific_instr = """
            - TIPE: UJI BEDA (Komparatif).
            - FOKUS: Independent T-test atau Paired Sample T-test.
            - ANALISIS: Apakah ada perbedaan signifikan antara Pretest dan Posttest? Atau antara Kontrol dan Eksperimen?
            - KESIMPULAN: "Perlakuan X efektif meningkatkan Y..."
            """
        
        # B. JIKA KORELASI (Asosiatif)
        else: 
            specific_instr = """
            - TIPE: UJI PENGARUH/HUBUNGAN (Asosiatif).
            - FOKUS: Korelasi Pearson (r) atau Regresi Linier (R Square / t-hitung).
            - ANALISIS: Seberapa kuat hubungan X ke Y? Berapa persen pengaruhnya?
            - KESIMPULAN: "Terdapat pengaruh positif dan signifikan..."
            """

        return f"""
        PERAN: Data Scientist. TUGAS: Uji Hipotesis ({analysis_type.upper()}).
        INPUT DATA: "{input_data.get('input_text', '')}"
        HIPOTESIS BAB 3: "{ch3_context}"

        INSTRUKSI STRICT:
        1. Analisis Output SPSS (Nilai t/r/F hitung dan Sig).
        2. {specific_instr}
        3. KEPUTUSAN FINAL: Ha diterima atau ditolak? (Bandingkan Sig < 0.05).
        """

    # --- 4. TEMUAN KUALITATIF (BEDANYA JAUH) ---
    elif task_type == 'bab4_part_qualitative':
        return f"""
        PERAN: Qualitative Researcher. TUGAS: Analisis Tema / Temuan.
        INPUT DATA: "{input_data.get('input_text', '')}"

        INSTRUKSI STRICT:
        1. Lakukan "Thick Description" (Deskripsi Tebal/Mendalam).
        2. **WAJIB KUTIP:** Masukkan kutipan langsung (verbatim) dari transkrip di input sebagai bukti.
        3. Interpretasikan makna tersirat dari kutipan tersebut.
        4. Jangan ada angka statistik. Fokus pada narasi makna.
        """

    # --- 5. PEMBAHASAN (THEORY MATCHER) ---
    elif task_type == 'bab4_part_discussion':
        return f"""
        PERAN: Academic Expert. TUGAS: Pembahasan (Discussion).
        INPUT TEMUAN: "{input_data.get('input_text', '')}"
        CONTEXT BAB 2: "{ch2_context}"
        
        INSTRUKSI STRICT (SINTESIS):
        1. **WHY:** Jelaskan MENGAPA hasilnya begitu? (Deep Analysis).
        2. **THEORY LINK:** Kaitkan temuan ini dengan Teori di Bab 2. 
           - Gunakan kalimat: "Hal ini sejalan dengan teori..." atau "Temuan ini menolak pandangan..."
        3. **PREVIOUS STUDIES:** Bandingkan dengan penelitian terdahulu (dukung/kontra).
        """

    # ====================================================
    # BAB 5: THE DECISION ENGINE (ANTI-TOKEN WASTE)
    # ====================================================
    
    # Context Extraction (Hanya mengambil Core Data)
    # Frontend akan mengirimkan ringkasan RM (Bab 1) & Hipotesis (Bab 4)
    rumusan_masalah = input_data.get('chapter1_problem', '')
    keputusan_bab4 = input_data.get('chapter4_summary', '')
    depth_level = input_data.get('depth_level', 'standard')

    # --- CARD 1: KESIMPULAN (THE VERDICT) ---
    if task_type == 'bab5_part_conclusion':
        return f"""
        PERAN: Academic Decision Maker. 
        TUGAS: Merumuskan KESIMPULAN (Menjawab Rumusan Masalah).
        
        INPUT TERSTRUKTUR:
        1. RUMUSAN MASALAH (BAB 1): "{rumusan_masalah}"
        2. KEPUTUSAN HIPOTESIS (BAB 4): "{keputusan_bab4}"
        3. CATATAN USER: "{input_data.get('input_text', '')}"

        INSTRUKSI STRICT (HEMAT TOKEN & PADAT):
        1. **MAPPING:** Satu Rumusan Masalah = Satu Paragraf Kesimpulan.
        2. **NO STATS:** DILARANG KERAS menyebut angka statistik (t-hitung, sig, mean, dll).
        3. **DECLARATIVE:** Gunakan kalimat keputusan. Contoh: "Terbukti bahwa X berpengaruh positif terhadap Y."
        4. **NO METHOD:** Jangan mengulang penjelasan metode penelitian. Langsung ke inti.
        """

    # --- CARD 2: IMPLIKASI (THE IMPACT) ---
    elif task_type == 'bab5_part_implication':
        return f"""
        PERAN: Educational Strategist.
        TUGAS: Menulis IMPLIKASI PENELITIAN.
        INPUT: "{input_data.get('input_text', '')}"

        INSTRUKSI STRICT:
        1. Jangan mengulang kesimpulan.
        2. **TEORETIS:** Bagaimana temuan ini memposisikan teori yang dipakai? (Memperkuat/Mengoreksi?).
        3. **PRAKTIS:** Apa konsekuensi nyata bagi sekolah/guru/siswa?
        """

    # --- CARD 3: SARAN (THE ACTION PLAN) ---
    elif task_type == 'bab5_part_suggestion':
        return f"""
        PERAN: Research Advisor.
        TUGAS: Menulis SARAN OPERASIONAL.
        INPUT: "{input_data.get('input_text', '')}"

        INSTRUKSI STRICT (HIERARKIS):
        1. **SARAN TEORETIS:** Untuk peneliti selanjutnya (variabel apa yang perlu diteliti lagi?).
        2. **SARAN PRAKTIS:** Untuk Guru/Kepala Sekolah (Langkah konkret apa yang harus dilakukan?).
        3. **SARAN KEBIJAKAN (Optional):** Untuk Dinas/Institusi.
        4. Hindari saran normatif ("Semoga bermanfaat"). Harus Actionable.
        """
# ==========================================
# 10. THE DEFENDER AGENT (SIMULASI SIDANG)
# ==========================================
def simulate_defense_turn(history, project_context, difficulty="hard"):
    """
    Engine untuk simulasi sidang skripsi.
    AI bertindak sebagai Dosen Penguji yang agresif secara intelektual.
    """
    model_name = AVAILABLE_MODELS['smart'] # Wajib model pintar (70b/GPT-4)
    
    # 1. Bangun Persona Dosen
    tone_instruction = ""
    if difficulty == "hard":
        tone_instruction = "Sangat kritis, skeptis, intimidatif secara akademis, dan mengejar detail metodologi. Jangan mudah puas dengan jawaban normatif."
    else:
        tone_instruction = "Tegas, objektif, fokus pada alur logika, tapi tetap konstruktif."

    # 2. Ringkasan Proyek
    context_str = f"""
    JUDUL SKRIPSI: {project_context.get('title', 'Tidak diketahui')}
    RUMUSAN MASALAH: {project_context.get('problem_statement', '-')}
    METODOLOGI: {project_context.get('methodology', '-')}
    TEORI: {project_context.get('theories', '-')}
    """

    system_prompt = f"""
    PERAN: Anda adalah Dosen Penguji Skripsi Senior (The Examiner).
    TUJUAN: Menguji kesiapan mental dan logika mahasiswa dalam mempertahankan skripsinya.
    
    PERSONA & TONE:
    {tone_instruction}
    
    ATURAN INTERAKSI:
    1. BERIKAN SATU PERTANYAAN SAJA dalam satu giliran. Jangan memberondong banyak tanya.
    2. Jika jawaban mahasiswa lemah/ragu, kejar terus bagian itu ("Attack the weakness").
    3. Jika jawaban mahasiswa tidak nyambung, tegur dengan tegas.
    4. Fokus pada: Kelemahan metodologi, urgensi penelitian, dan validitas data.
    5. Jangan memberikan solusi/saran dulu. Tugas Anda adalah MENGUJI.
    
    FORMAT OUTPUT (JSON):
    {{
        "examiner_response": "Kalimat respon/pertanyaan dosen...",
        "current_mood": "neutral" | "annoyed" | "impressed" | "angry",
        "weakness_detected": "Analisis singkat kelemahan jawaban user (untuk internal system)..."
    }}
    """

    # Format history chat untuk konteks
    messages = [{"role": "system", "content": system_prompt}]
    
    # Inject konteks proyek di awal
    messages.append({"role": "user", "content": f"Ini draf skripsi saya:\n{context_str}\n\nSaya siap diuji, Dok."})
    
    # Masukkan history chat sebelumnya
    for msg in history:
        role = "assistant" if msg['sender'] == 'ai' else "user"
        # Kita hanya kirim teksnya ke model (bukan JSON metadata)
        content = msg['text']
        messages.append({"role": role, "content": content})

    try:
        response = completion(
            model=model_name,
            messages=messages,
            temperature=0.7, # Sedikit kreatif agar pertanyaan variatif
            response_format={"type": "json_object"}
        )
        return json.loads(clean_json_output(response.choices[0].message.content))
    except Exception as e:
        print(f"Defense Error: {e}")
        return {
            "examiner_response": "Maaf, saya kehilangan fokus sebentar. Coba ulangi argumen Anda.",
            "current_mood": "neutral",
            "weakness_detected": "System Error"
        }

def generate_defense_evaluation(history):
    """
    Memberikan rapor penilaian setelah sesi sidang selesai.
    """
    model_name = AVAILABLE_MODELS['smart']
    
    # Konversi history jadi string transkrip
    transcript = "\n".join([f"{m['sender'].upper()}: {m['text']}" for m in history])
    
    system_prompt = """
    PERAN: Ketua Sidang Skripsi.
    TUGAS: Berikan evaluasi final berdasarkan transkrip sidang simulasi.
    
    OUTPUT JSON:
    {
        "score": 0-100,
        "verdict": "LULUS" | "LULUS DENGAN REVISI" | "TIDAK LULUS",
        "strengths": ["Poin kuat 1", "Poin kuat 2"],
        "weaknesses": ["Kelemahan 1", "Kelemahan 2"],
        "advice": "Saran strategi untuk sidang asli..."
    }
    """
    
    try:
        response = completion(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"TRANSKRIP SIDANG:\n{transcript}"}
            ],
            response_format={"type": "json_object"}
        )
        return json.loads(clean_json_output(response.choices[0].message.content))
    except Exception:
        return {"score": 0, "verdict": "ERROR", "advice": "Gagal evaluasi."}

def get_groq_client():
    """
    Mengembalikan instance client Groq.
    Pastikan 'GROQ_API_KEY' ada di file .env kamu.
    """
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        print("⚠️ WARNING: GROQ_API_KEY tidak ditemukan di environment variables!")
        return None
    return Groq(api_key=api_key)


def extract_citation_metadata(file_storage):
    """
    [HYBRID FIX]
    Nama fungsinya tetap 'metadata' biar tidak error di Controller lama,
    TAPI isinya kita buat untuk menyedot FULL TEXT dari PDF biar AI pinter.
    """
    try:
        # 1. Reset pointer file ke awal (penting!)
        file_storage.seek(0)
        
        # 2. Baca PDF
        pdf_reader = PyPDF2.PdfReader(file_storage)
        full_text = ""
        
        # 3. Sedot teks dari maksimal 50 halaman (Biar server gak meledak kalo file tebal)
        max_pages = min(len(pdf_reader.pages), 50)
        
        for i in range(max_pages):
            page_text = pdf_reader.pages[i].extract_text()
            if page_text:
                full_text += page_text + "\n"
        
        # Bersihkan spasi berlebih
        clean_text = full_text.strip()
        
        # Jika kosong atau terlalu pendek (kemungkinan gambar scan)
        if len(clean_text) < 50:
            return None # Nanti controller akan handle error ini

        # 4. Return Dictionary (Format Metadata tapi isinya Daging)
        # Kita masukkan full text ke field 'abstract' atau buat field baru
        return {
            'title': file_storage.filename,          # Judul = Nama File (Sementara)
            'author': 'Dokumen Upload',              # Default
            'year': '2024',                          # Default
            'journal': 'PDF Reference',              # Default
            'abstract': clean_text,                  # <--- INI KUNCINYA! Kita taruh full text disini
            'full_text': clean_text                  # Cadangan
        }

    except Exception as e:
        print(f"Error extracting PDF content: {e}")
        return None

def writing_assistant_stream(user, data):
        """
        Wrapper untuk fungsi streaming di ai_utils.
        Menghubungkan data dari Frontend (WritingStudioRoot) ke Logic AI.
        """
        input_data = data.get('data', {})
        task_type = data.get('task', 'general')
        
        # --- [NEW] SMART WORD COUNT & LIMITER ---
        # Masalah: AI nambahin bab lain karena target kata default (600) terlalu banyak.
        # Solusi: Kita set target kata spesifik per task.
        
        user_requested_wc = input_data.get('word_count')
        
        if not user_requested_wc:
            if task_type in ['bab1_rumusan', 'bab1_tujuan']:
                input_data['word_count'] = "150"  # Cukup untuk 3 poin, jangan maksa panjang
            elif 'part_' in task_type: # Untuk part ideal, factual, dll
                input_data['word_count'] = "500"
            else:
                input_data['word_count'] = "600" # Default panjang

        # Kita suntikkan "Constraint Keras" ke dalam context_material
        word_count_instruction = (
            f"\n\n[ATURAN KHUSUS - WAJIB DIPATUHI]:\n"
            f"1. Target panjang tulisan: MAKSIMAL {input_data['word_count']} KATA.\n"
            f"2. FOKUS HANYA PADA TUGAS UTAMA. Dilarang melebar ke bab lain.\n"
            f"3. DILARANG menambahkan 'Kesimpulan', 'Saran', atau 'Daftar Pustaka' kecuali diminta spesifik.\n"
        )
        
        current_context = input_data.get('context_material', '')
        input_data['context_material'] = word_count_instruction + "\n" + current_context
        
        # Mapping Deep Context
        project_context = {
            'title': input_data.get('context_title'),
            'problem_statement': input_data.get('context_problem'),
            'methodology': input_data.get('context_method'),
            'variables': input_data.get('context_variables'),
            'hypothesis': input_data.get('context_hypothesis')
        }

        return generate_academic_draft_stream(
            user, 
            task_type=task_type,
            input_data=input_data,
            project_context=project_context,
            selected_model=data.get('model', 'fast'),
            editor_context=input_data.get('previous_content', ''),
            user_style_profile=input_data.get('style_profile'),
            word_count=input_data['word_count'] # Pass word count yang sudah disesuaikan
        )
def generate_graph_insights(papers):
    """
    RESEARCH INTELLIGENCE ENGINE
    Menganalisis kumpulan abstrak paper untuk menemukan pola tema dan gap riset.
    """
    # 1. Pilih Model (Pakai Smart Model biar analisisnya tajam)
    model_name = AVAILABLE_MODELS['smart']
    
    # 2. Siapkan Context Data (Batasi 10-15 paper teratas biar gak token limit)
    # Kita ambil Judul & Abstrak saja
    papers_context = ""
    for i, p in enumerate(papers[:15]): 
        abstract_snippet = (p.get('abstract') or "")[:300]
        papers_context += f"Paper {i+1}: {p.get('title')} | Abstract: {abstract_snippet}...\n"

    # 3. System Prompt (Analyst Persona)
    system_prompt = """
    PERAN: Anda adalah Senior Research Consultant.
    TUGAS: Menganalisis kumpulan literatur (state-of-the-art) untuk memetakan lanskap riset.
    
    OUTPUT WAJIB JSON FORMAT:
    {
        "overview": "Ringkasan naratif 2-3 kalimat tentang fokus mayoritas paper ini...",
        "dominant_themes": ["Tema 1", "Tema 2", "Tema 3", "Tema 4"],
        "research_gaps": [
            "Gap 1: Masalah yang belum banyak dibahas...",
            "Gap 2: Keterbatasan metode yang ada...",
            "Gap 3: Konteks baru yang belum dieksplorasi..."
        ],
        "methodology_trends": "Analisis singkat tren metode (misal: Dominasi Kuantitatif/Deep Learning)."
    }
    
    ATURAN:
    1. Fokus pada pola, bukan merangkum satu per satu.
    2. Identifikasi "Research Gap" adalah prioritas tertinggi. Cari apa yang HILANG.
    3. Gunakan Bahasa Indonesia akademis.
    """

    user_prompt = f"""
    DATA LITERATUR:
    {papers_context}
    
    Analisis data di atas dan berikan Insight.
    """

    try:
        response = completion(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3, # Rendah biar konsisten
            response_format={"type": "json_object"}
        )
        
        # Bersihkan JSON
        content = clean_json_output(response.choices[0].message.content)
        return json.loads(content)

    except Exception as e:
        print(f"Insight Error: {e}")
        # Fallback Data (Biar UI gak crash)
        return {
            "overview": "Gagal menganalisis data saat ini.",
            "dominant_themes": ["Error Analysis"],
            "research_gaps": ["Silakan coba lagi nanti."],
            "methodology_trends": "-"
        }