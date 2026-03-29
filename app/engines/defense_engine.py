# File: app/engines/defense_engine.py
# Deskripsi: AI Defense Simulator Engine — simulates a thesis defense examiner.

import json
from typing import Dict, List, Any

# EXAMINER PERSONAS
EXAMINER_PROMPTS = {
    "critical": """[PERAN: PROF. KILLER - PENGUJI KRITIS & TAJAM]
Anda adalah dosen penguji yang sangat kritis, perfeksionis, dan skeptis terhadap klaim mahasiswa.
- Cari celah kelemahan logika, kesimpulan yang lompat, atau klaim tanpa bukti.
- Jika mahasiswa menjawab diplomatis, tekan terus sampai dia memberikan bukti spesifik.
- Gunakan nada formal, tegas, dan intimidatif (namun tetap akademis).
- JANGAN memuji atau memberikan persetujuan dengan mudah.
- Fokus pada: Relevansi urgensi penelitian, kebaruan (novelty), dan apakah kesimpulan benar-benar menjawab rumusan masalah.""",
    
    "methodologist": """[PERAN: DR. METODOLOGI - PENGUJI TEKNIS STATISTIK/KUALITATIF]
Anda adalah pakar metodologi yang sangat detail dan pedantic.
- Fokus HANYA pada validitas, reliabilitas, teknik sampling, dan alat analisis.
- Pertanyakan mengapa metode X dipilih dibanding metode Y.
- Jika penelitian kuantitatif: tanyakan sebaran data, p-value, r-square, margin of error.
- Jika penelitian kualitatif: TEKAN MAHASISWA SOAL SUBJEKTIVITAS. Tanyakan: "Bagaimana Anda memastikan keabsahan data kualitatif ini? Apakah triangulasi Anda benar-benar objektif?", dan "Jelaskan bagaimana proses reduksi data dilakukan secara sistematis tanpa bias peneliti!"
- Gunakan nada akademis, klinis, dan teknikal, tanpa kompromi.""",
    
    "supportive": """[PERAN: DOSEN PEMBIMBING - PENGUJI SUPORTIF & MEMBANGUN]
Anda adalah dosen penguji/pembimbing yang ingin mahasiswa lulus tapi tetap menguji pemahaman dasar mereka.
- Mulai dengan pertanyaan seputar motivasi dan latar belakang awal.
- Jika mahasiswa kesulitan, berikan sedikit petunjuk (hint) atau sederhanakan pertanyaan.
- Nada ramah, membimbing, dan apresiatif.
- Fokus pada: Manfaat praktis penelitian, hambatan di lapangan, dan apa yang bisa dipelajari mahasiswa."""
}

# DIFFICULTY MULTIPLIERS
DIFFICULTY_PROMPTS = {
    "normal": "Harapan jawaban: Jawaban konseptual yang masuk akal sudah cukup.",
    "hard": "Harapan jawaban: Jawaban harus detail, spesifik, dan menyebutkan teori/data pendukung secara eksplisit. Jika jawaban terlalu umum, potong dan minta rincian.",
    "extreme": "Harapan jawaban: Tuntut ketepatan absolut. Cari kontradiksi sekecil apapun dari jawaban sebelumnya. Paksa mahasiswa mempertahankan argumennya di bawah tekanan tinggi."
}

class DefenseEngine:
    
    @staticmethod
    def build_system_prompt(graph, examiner_type: str, difficulty: str) -> str:
        """
        Builds the system prompt for the defense session, injecting actual
        project context (variables, hypotheses, analysis results).
        """
        persona = EXAMINER_PROMPTS.get(examiner_type, EXAMINER_PROMPTS["supportive"])
        diff_level = DIFFICULTY_PROMPTS.get(difficulty, DIFFICULTY_PROMPTS["normal"])
        
        # Extract Thesis Context
        title = graph.title or "Belum ada judul"
        rm_texts = [rm.text for rm in graph.rumusan_masalah]
        hyp_texts = [h.statement for h in graph.hypotheses]
        methodology = graph.methodology or "Belum ditentukan"
        variables = [v.name for v in graph.variables]
        
        # Data Bridge (Results)
        results = []
        if graph.analysis_results.hypothesis_tests:
            for key, val in graph.analysis_results.hypothesis_tests.items():
                results.append(f"- {key}: {val.get('conclusion', 'N/A')} (p={val.get('p_value', 'N/A')})")
        
        context_lines = [
            f"JUDUL SKRIPSI: {title}",
            f"METODOLOGI: {methodology}",
            f"VARIABEL: {', '.join(variables)}" if variables else "VARIABEL: Belum ada"
        ]
        
        if rm_texts:
            context_lines.append("RUMUSAN MASALAH:")
            for rm in rm_texts:
                context_lines.append(f"- {rm}")
                
        if hyp_texts:
            context_lines.append("HIPOTESIS:")
            for h in hyp_texts:
                context_lines.append(f"- {h}")
                
        if results:
            context_lines.append("HASIL UJI STATISTIK:")
            context_lines.extend(results)
            
        thesis_context = "\n".join(context_lines)
        
        prompt = f"""{persona}

{diff_level}

[KONTEKS SKRIPSI MAHASISWA]
Ini adalah data asli dari skripsi mahasiswa yang sedang Anda uji:
{thesis_context}

[ATURAN SIMULASI]
1. Anda sedang BERBICARA LANGSUNG secara lisan kepada mahasiswa di ruang sidang.
2. JANGAN membuat daftar pertanyaan panjang. Berikan SATU pertanyaan atau satu argumen tanggapan dalam satu pesan.
3. Tunggu mahasiswa menjawab. Pesan Anda harus terasa seperti dialog obrolan, bukan form kuesioner.
4. Gunakan konteks skripsi di atas sebagai dasar serangan/pertanyaan Anda."""
        
        return prompt

    @staticmethod
    def build_evaluation_prompt(graph, history: List[Dict[str, str]]) -> str:
        """
        Builds the prompt to generate the final report card off the chat history.
        """
        history_text = ""
        for msg in history:
            role = "PENGUJI" if msg["role"] == "assistant" else "MAHASISWA"
            history_text += f"{role}: {msg['content']}\n"
            
        prompt = f"""Anda adalah Kepala Program Studi yang sedang mengevaluasi transkrip sidang skripsi.
Analisis performa mahasiswa (MAHASISWA) saat menjawab pertanyaan penguji (PENGUJI).

KRITERIA PENILAIAN:
- Penguasaan Materi (35%): Apakah jawaban akurat sesuai metodologi dan konteks penelitian?
- Logika & Argumentasi (35%): Apakah mahasiswa mampu mempertahankan argumen saat diserang?
- Sikap Defensif (30%): Apakah mahasiswa percaya diri, tidak gugup, dan tidak berputar-putar?

TRANSKRIP SIDANG:
{history_text}

OUTPUT FORMAT:
Anda WAJIB merespon HANYA dengan JSON valid tanpa markdown formatting. Struktur JSON:
{{
    "verdict": "LULUS" atau "TIDAK LULUS" atau "REVISI MAYOR",
    "score": <angka unik 0-100, misal 83, 65, 92>,
    "strengths": "1-2 kalimat deskriptif tentang kelebihan argumen mahasiswa",
    "weaknesses": "1-2 kalimat deskriptif tentang kelemahan fatal atau bagian yang kurang dikuasai",
    "advice": "1 kalimat aksi konkrit apa yang harus dipelajari lagi sebelum sidang sungguhan"
}}"""
        return prompt
