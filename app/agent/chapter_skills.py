"""
chapter_skills.py — PhD Skills per Chapter (Phase 2)

Provides chapter-specific thesis writing skills (Bab 1-5):

Bab 1 (Pendahuluan):
  - draft_research_questions: Draft rumusan masalah yang tajam dan spesifik
  - draft_research_objectives: Draft tujuan penelitian yang selaras dengan rumusan masalah
  - formulate_research_gap: Build urgency and identify prior research weaknesses
  - align_rq_with_objectives: Check RQ-Objectives alignment

Bab 2 (Tinjauan Pustaka):
  - generate_literature_matrix: Comparative table of papers
  - synthesize_arguments: Bridging sentences between contrasting papers
  - validate_citations: Verify all claims have citations

Bab 3 (Metodologi):
  - justify_methodology: Academic justification for chosen method
  - generate_research_flowchart: Mermaid.js diagram from steps

Bab 4 (Hasil & Pembahasan):
  - interpret_data_table: Narrative insights from raw data
  - correlate_with_bab2: Link findings back to Bab 2 theory

Bab 5 (Kesimpulan):
  - summarize_to_rq: Conclusions answering only the RQ
  - draft_limitations_and_future_work: Future research suggestions from method weaknesses
"""

import os
import json
import logging
import re
from typing import Dict, Any, List, Optional
from .memory_system import build_memory_prompt_context

logger = logging.getLogger(__name__)

# ─── Specialized System Prompts per Chapter ─────────────────────────

BAB1_PROMPT = """\
Kamu adalah pakar penulis Bab 1 (Pendahuluan) tesis akademik Indonesia.
Tugasmu adalah membangun urgensi penelitian dan merumuskan masalah.

ATURAN:
- Gunakan bahasa Indonesia formal akademik
- Gunakan sudut pandang pasif: "dilakukan", "dianalisis"
- Setiap klaim harus didukung referensi
- Struktur paragraf: Konteks → Gap → Urgensi → Rumusan Masalah
"""

BAB2_PROMPT = """\
Kamu adalah pakar penulis Bab 2 (Tinjauan Pustaka) tesis akademik Indonesia.
Tugasmu adalah melakukan sintesis tingkat tinggi, BUKAN sekadar melist paper.

ATURAN:
- Bandingkan dan kontraskan temuan antar-paper, jangan hanya merangkum satu per satu
- Gunakan kalimat penghubung: "Sejalan dengan...", "Bertolak belakang...", "Memperluas temuan..."
- Setiap paragraf minimal merujuk 2-3 paper
- Akhiri dengan research gap yang jelas
"""

BAB3_PROMPT = """\
Kamu adalah pakar penulis Bab 3 (Metodologi) tesis akademik Indonesia.
Tugasmu adalah menjelaskan dan menjustifikasi metode penelitian.

ATURAN:
- Justifikasi setiap pilihan metode dengan argumen akademik
- Jelaskan populasi, sampel, teknik sampling dengan detail
- Gunakan referensi metodologi (Creswell, Sugiyono, etc.)
- Flowchart dalam format Mermaid.js jika diminta
"""

BAB4_PROMPT = """\
Kamu adalah pakar penulis Bab 4 (Hasil & Pembahasan) tesis akademik Indonesia.
Tugasmu adalah "membunyikan" data — menginterpretasi, bukan mengulang angka.

ATURAN:
- Jangan hanya mengulang angka dari tabel, berikan INSIGHT
- Hubungkan temuan dengan teori di Bab 2
- Gunakan frasa: "Hal ini menunjukkan bahwa...", "Temuan ini sejalan dengan..."
- Bedakan antara deskripsi hasil dan pembahasan/interpretasi
- JANGAN buat data atau angka palsu — hanya interpretasikan data yang diberikan
"""

BAB5_PROMPT = """\
Kamu adalah pakar penulis Bab 5 (Kesimpulan) tesis akademik Indonesia.
Tugasmu adalah meringkas temuan dan menyusun saran.

ATURAN:
- Kesimpulan HANYA menjawab rumusan masalah, tidak menambahkan temuan baru
- Saran harus spesifik dan bisa diimplementasikan
- Limitasi diambil dari kelemahan metode di Bab 3
- Saran penelitian selanjutnya harus menjembatani gap yang masih ada
"""


class ChapterSkillsAgent:
    """
    Agent dengan kemampuan PhD-level untuk setiap bab tesis (Bab 1-5).
    Setiap skill memiliki prompt khusus yang disesuaikan dengan kebutuhan
    penulisan akademik per bab.
    """

    def __init__(self):
        self.api_key = os.environ.get("LLM_API_KEY")
        self.model = os.environ.get("CHAPTER_SKILLS_MODEL", "groq/llama-3.1-8b-instant")

        if not self.api_key:
            logger.warning("LLM_API_KEY not set. Chapter skills LLM calls may fail.")

    def _call_llm(self, prompt: str, system_prompt: str, max_tokens: Optional[int] = None, memory: Any = None) -> str:
        """LLM call with Groq primary + Gemini fallback."""
        import litellm
        from litellm.exceptions import RateLimitError

        fallback_api_key = os.environ.get("GEMINI_API_KEY")
        fallback_model = "gemini/gemini-2.5-flash"

        enriched_system_prompt = system_prompt
        shared_context = build_memory_prompt_context(memory)
        if shared_context:
            enriched_system_prompt = f"{system_prompt}\n\n{shared_context}"

        messages = [
            {"role": "system", "content": enriched_system_prompt},
            {"role": "user", "content": prompt},
        ]

        try:
            logger.info(f"| ChapterSkills | Primary: {self.model}")
            response = litellm.completion(
                model=self.model,
                messages=messages,
                api_key=self.api_key,
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content
        except RateLimitError as e:
            logger.warning(f"| ChapterSkills | RateLimit, fallback to {fallback_model}")
            if not fallback_api_key:
                raise e
            try:
                response = litellm.completion(
                    model=fallback_model,
                    messages=messages,
                    api_key=fallback_api_key,
                    max_tokens=max_tokens,
                )
                return response.choices[0].message.content
            except Exception as fallback_e:
                logger.error(f"| ChapterSkills | Fallback failed: {fallback_e}")
                raise fallback_e
        except Exception as e:
            logger.error(f"| ChapterSkills | LLM call failed: {e}")
            raise e

    def _split_sentences(self, text: str) -> List[str]:
        parts = re.split(r'(?<=[.!?])\s+', str(text or "").strip())
        return [part.strip() for part in parts if part and part.strip()]

    def _normalize_sentence_text(self, text: str) -> str:
        return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', str(text or ''))).strip().lower()

    def _find_sentence_position(self, candidate: str, source_sentences: List[str]) -> int:
        normalized_candidate = self._normalize_sentence_text(candidate)
        if not normalized_candidate:
            return -1
        candidate_prefix = normalized_candidate[:80]
        for idx, source_sentence in enumerate(source_sentences):
            normalized_source = self._normalize_sentence_text(source_sentence)
            if not normalized_source:
                continue
            if (
                normalized_candidate == normalized_source
                or normalized_candidate in normalized_source
                or normalized_source in normalized_candidate
                or (candidate_prefix and candidate_prefix in normalized_source)
            ):
                return idx
        return -1

    def _normalize_validate_output(self, raw: Any, source_text: str) -> Dict[str, Any]:
        """
        Normalize validate_citations output into a stable structured contract.
        """
        contract = {
            "has_uncited_claims": False,
            "uncited_sentences": [],
            "total_sentences": 0,
            "coverage_ratio": 0.0,
        }

        source_sentences = self._split_sentences(source_text)
        contract["total_sentences"] = len(source_sentences)

        if isinstance(raw, dict) and "has_uncited_claims" in raw:
            uncited_sentences = raw.get("uncited_sentences") or []
            normalized_uncited = []
            if isinstance(uncited_sentences, list):
                for item in uncited_sentences:
                    if not isinstance(item, dict):
                        continue
                    sentence = str(item.get("sentence") or "").strip()
                    if not sentence:
                        continue
                    position = item.get("position")
                    if not isinstance(position, int) or position < 0:
                        position = self._find_sentence_position(sentence, source_sentences)
                    normalized_uncited.append(
                        {
                            "sentence": sentence,
                            "position": position,
                            "suggestion": str(item.get("suggestion") or "").strip(),
                        }
                    )
            contract.update(
                {
                    "has_uncited_claims": bool(raw.get("has_uncited_claims") or normalized_uncited),
                    "uncited_sentences": normalized_uncited,
                    "total_sentences": contract["total_sentences"],
                    "coverage_ratio": 0.0,
                }
            )
            if contract["total_sentences"] > 0:
                contract["coverage_ratio"] = max(
                    0.0,
                    1.0 - (len(normalized_uncited) / contract["total_sentences"]),
                )
            return contract

        raw_text = str(raw or "").strip()
        if not raw_text:
            if contract["total_sentences"] > 0:
                contract["coverage_ratio"] = 1.0
            return contract

        uncited_entries: List[Dict[str, Any]] = []
        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
        pending_suggestion = ""
        summary_keywords = (
            "total klaim",
            "dengan sitasi",
            "tanpa sitasi:",
            "cakupan",
            "coverage",
            "ringkasan",
            "ditemukan",
            "total kalimat",
            "kalimat tanpa sitasi",
        )

        for line in lines:
            lowered = line.lower()
            if lowered.startswith("saran:"):
                pending_suggestion = line.split(":", 1)[1].strip()
                if uncited_entries and not uncited_entries[-1].get("suggestion"):
                    uncited_entries[-1]["suggestion"] = pending_suggestion
                continue

            if line.startswith("#"):
                continue

            if (
                line.startswith("-")
                or line.startswith("•")
                or re.match(r'^\d+\s*$', line)
                or any(keyword in lowered for keyword in summary_keywords)
            ):
                continue

            if "✗" not in line and "tanpa sitasi" not in lowered and "perlu ditambahkan referensi" not in lowered:
                continue

            quoted_matches = re.findall(r'["“](.*?)["”]', line)
            if quoted_matches:
                sentence = quoted_matches[0].strip()
            else:
                sentence = re.sub(r'^\d+\.\s*', '', line).strip()
                sentence = re.sub(r'—\s*✗.*$', '', sentence).strip()
                sentence = re.sub(r'✗.*$', '', sentence).strip()
                sentence = re.sub(r'\bPERLU DITAMBAHKAN REFERENSI\b.*$', '', sentence, flags=re.IGNORECASE).strip()
            suggestion = pending_suggestion if pending_suggestion else ""
            pending_suggestion = ""

            position = self._find_sentence_position(sentence, source_sentences)

            if position < 0:
                continue

            uncited_entries.append(
                {
                    "sentence": sentence,
                    "position": position,
                    "suggestion": suggestion,
                }
            )

        has_uncited_claims = bool(uncited_entries)
        if not has_uncited_claims:
            keywords = ("tanpa sitasi", "perlu ditambahkan referensi", "uncited")
            has_uncited_claims = any(keyword in raw_text.lower() for keyword in keywords)

        covered_sentences = max(contract["total_sentences"] - len(uncited_entries), 0)
        if contract["total_sentences"] > 0:
            contract["coverage_ratio"] = covered_sentences / contract["total_sentences"]
        else:
            contract["coverage_ratio"] = 0.0

        contract["has_uncited_claims"] = has_uncited_claims
        contract["uncited_sentences"] = uncited_entries
        return contract

    # ════════════════════════════════════════════════════════════════
    # BAB 1: PENDAHULUAN
    # ════════════════════════════════════════════════════════════════

    def formulate_research_gap(self, topic: str, literature_summary: str = "", **kwargs) -> str:
        """
        Membangun paragraf yang mengidentifikasi kelemahan penelitian terdahulu
        dan merumuskan gap penelitian.
        """
        prompt = f"""Topik penelitian: {topic}

Ringkasan literatur yang ada:
{literature_summary or 'Belum ada ringkasan literatur.'}

TUGAS:
Buatkan 2-3 paragraf yang:
1. Menjelaskan konteks/state-of-the-art penelitian terkait topik ini
2. Mengidentifikasi secara eksplisit kelemahan/gap dari penelitian terdahulu
3. Membangun urgensi mengapa gap ini penting untuk diisi
4. Merumuskan arah penelitian yang diusulkan

Format: Paragraf akademik formal dalam Bahasa Indonesia."""
        try:
            return self._call_llm(prompt, BAB1_PROMPT, max_tokens=1200, memory=kwargs.get("memory"))
        except Exception as e:
            return f"Error formulate_research_gap: {e}"

    def draft_research_questions(
        self,
        topic: str,
        project_problem: str = "",
        project_objectives: str = "",
        methodology: str = "",
        user_instruction: str = "",
        **kwargs,
    ) -> str:
        """
        Menyusun rumusan masalah Bab 1 berdasarkan topik dan project setting.
        """
        prompt = f"""Susun Rumusan Masalah untuk proposal/tesis berikut.

JUDUL / TOPIK:
{topic or 'Belum diisi.'}

PROJECT SETTINGS — RUMUSAN MASALAH SAAT INI:
{project_problem or 'Belum diisi.'}

PROJECT SETTINGS — TUJUAN PENELITIAN:
{project_objectives or 'Belum diisi.'}

METODOLOGI:
{methodology or 'Belum diisi.'}

INSTRUKSI USER:
{user_instruction or 'Buatkan rumusan masalah yang tajam dan spesifik.'}

TUGAS:
1. Susun 2-4 rumusan masalah dalam bentuk pertanyaan penelitian.
2. Rumusan masalah harus spesifik, fokus, dan realistis untuk dijawab oleh metodologi penelitian.
3. Jika project setting sudah punya rumusan masalah, rapikan dan sempurnakan, jangan mengabaikannya.
4. Jika project setting belum punya rumusan masalah, turunkan dari judul/topik dan tujuan penelitian yang tersedia.

LARANGAN KERAS:
- JANGAN menulis kesimpulan.
- JANGAN menulis keterbatasan penelitian.
- JANGAN menulis saran penelitian selanjutnya.
- JANGAN keluar dari konteks Bab 1.

FORMAT OUTPUT:
## Rumusan Masalah
1. ...
2. ...
3. ..."""
        try:
            return self._call_llm(prompt, BAB1_PROMPT, max_tokens=700, memory=kwargs.get("memory"))
        except Exception as e:
            return f"Error draft_research_questions: {e}"

    def draft_research_objectives(
        self,
        topic: str,
        project_problem: str = "",
        project_objectives: str = "",
        methodology: str = "",
        user_instruction: str = "",
        **kwargs,
    ) -> str:
        """
        Menyusun tujuan penelitian Bab 1 yang selaras dengan rumusan masalah.
        """
        prompt = f"""Susun Tujuan Penelitian untuk proposal/tesis berikut.

JUDUL / TOPIK:
{topic or 'Belum diisi.'}

PROJECT SETTINGS — RUMUSAN MASALAH:
{project_problem or 'Belum diisi.'}

PROJECT SETTINGS — TUJUAN PENELITIAN SAAT INI:
{project_objectives or 'Belum diisi.'}

METODOLOGI:
{methodology or 'Belum diisi.'}

INSTRUKSI USER:
{user_instruction or 'Susun tujuan penelitian yang selaras dengan rumusan masalah.'}

TUGAS:
1. Susun tujuan penelitian yang menjawab setiap rumusan masalah.
2. Gunakan bentuk kalimat akademik seperti "Untuk mengetahui..." atau "Untuk menganalisis...".
3. Jika project setting sudah punya tujuan penelitian, rapikan dan sempurnakan, jangan mengabaikannya.

LARANGAN KERAS:
- JANGAN menulis kesimpulan.
- JANGAN menulis keterbatasan penelitian.
- JANGAN menulis saran penelitian selanjutnya.
- JANGAN keluar dari konteks Bab 1.

FORMAT OUTPUT:
## Tujuan Penelitian
1. ...
2. ...
3. ..."""
        try:
            return self._call_llm(prompt, BAB1_PROMPT, max_tokens=700, memory=kwargs.get("memory"))
        except Exception as e:
            return f"Error draft_research_objectives: {e}"

    def _compose_alignment_source_text(
        self,
        text: str = "",
        project_problem: str = "",
        project_objectives: str = "",
    ) -> str:
        parts = []
        clean_text = (text or "").strip()
        clean_problem = (project_problem or "").strip()
        clean_objectives = (project_objectives or "").strip()

        if clean_text:
            parts.append(f"TEKS BAB 1 AKTIF:\n{clean_text}")

        if clean_problem or clean_objectives:
            parts.append(
                "PROJECT SETTINGS:\n"
                f"Rumusan Masalah:\n{clean_problem or 'Belum diisi di project setting.'}\n\n"
                f"Tujuan Penelitian:\n{clean_objectives or 'Belum diisi di project setting.'}"
            )

        if not parts:
            return "Tidak ada teks Bab 1 maupun project setting yang tersedia."

        return "\n\n".join(parts)

    def align_rq_with_objectives(self, text: str, **kwargs) -> str:
        """
        Mengecek sinkronisasi antara Rumusan Masalah (RQ) dan Tujuan Penelitian.
        Jika tidak sinkron, memberikan saran perbaikan.
        """
        project_problem = kwargs.get("project_problem", "")
        project_objectives = kwargs.get("project_objectives", "")
        source_text = self._compose_alignment_source_text(
            text=text,
            project_problem=project_problem,
            project_objectives=project_objectives,
        )

        prompt = f"""Analisis konteks Bab 1 berikut dan periksa keselarasan antara Rumusan Masalah dan Tujuan Penelitian:

{source_text}

TUGAS:
1. Identifikasi setiap Rumusan Masalah (RQ) yang ditemukan
2. Identifikasi setiap Tujuan Penelitian yang ditemukan
3. Periksa apakah SETIAP RQ memiliki Tujuan yang bersesuaian (dan sebaliknya)
4. Jika ada ketidakselarasan, berikan rekomendasi perbaikan yang spesifik

ATURAN PENTING:
- Jika project setting berisi Rumusan Masalah atau Tujuan Penelitian, gunakan itu sebagai sumber utama meskipun teks Bab 1 aktif belum lengkap.
- Jangan menulis "tidak ditemukan" jika data tersebut sebenarnya tersedia di project setting.
- Jika salah satu bagian memang belum tersedia sama sekali, nyatakan dengan jelas bagian mana yang belum tersedia.

Output dalam format:
## Analisis Keselarasan RQ-Tujuan

### Rumusan Masalah:
1. ...

### Tujuan Penelitian:
1. ...

### Status Keselarasan:
- RQ1 ↔ Tujuan 1: [Selaras/Tidak Selaras] — [penjelasan]

### Rekomendasi (jika perlu):
..."""
        try:
            return self._call_llm(prompt, BAB1_PROMPT, max_tokens=1000, memory=kwargs.get("memory"))
        except Exception as e:
            return f"Error align_rq_with_objectives: {e}"

    # ════════════════════════════════════════════════════════════════
    # BAB 2: TINJAUAN PUSTAKA
    # ════════════════════════════════════════════════════════════════

    def generate_literature_matrix(self, papers_json: str, **kwargs) -> str:
        """
        Mengubah kumpulan paper menjadi tabel Markdown komparasi.
        """
        prompt = f"""Dari data paper berikut, buatkan tabel perbandingan literatur dalam format Markdown:

{papers_json}

FORMAT OUTPUT:
| No | Penulis (Tahun) | Judul | Metode | Temuan Utama | Limitasi |
|----|-----------------|-------|--------|--------------|----------|
| 1  | ...             | ...   | ...    | ...          | ...      |

Setelah tabel, tambahkan 1 paragraf ringkasan sintesis yang menghubungkan temuan antar-paper.

PENTING: Hanya gunakan informasi yang ada di data paper. JANGAN mengarang."""
        try:
            return self._call_llm(prompt, BAB2_PROMPT, max_tokens=1500, memory=kwargs.get("memory"))
        except Exception as e:
            return f"Error generate_literature_matrix: {e}"

    def synthesize_arguments(self, paper_a: str, paper_b: str, **kwargs) -> str:
        """
        Menganalisis dua paper yang berpotensi bertentangan dan membuat
        kalimat penghubung sintesis.
        """
        prompt = f"""Analisis dua paper berikut dan buat kalimat penghubung sintesis:

PAPER A:
{paper_a}

PAPER B:
{paper_b}

TUGAS:
1. Identifikasi posisi/argumen utama masing-masing paper
2. Temukan persamaan dan perbedaan
3. Buat 2-3 kalimat sintesis akademik yang menghubungkan kedua paper

CONTOH FORMAT:
"Meskipun Smith (2020) berpendapat bahwa X, temuan Johnson (2021) menunjukkan anomali berupa Y. Hal ini mengindikasikan bahwa Z masih menjadi perdebatan di kalangan akademisi."

Jawab dalam Bahasa Indonesia formal akademik."""
        try:
            return self._call_llm(prompt, BAB2_PROMPT, max_tokens=800, memory=kwargs.get("memory"))
        except Exception as e:
            return f"Error synthesize_arguments: {e}"

    def validate_citations(self, text: str, known_papers: str = "", **kwargs) -> Dict[str, Any]:
        """
        Memastikan setiap klaim dalam teks memiliki sitasi.
        Mengembalikan output terstruktur untuk klaim tanpa sitasi.
        """
        prompt = f"""Periksa teks berikut dan identifikasi klaim yang tidak memiliki sitasi:

TEKS:
{text}

REFERENSI YANG DIKETAHUI:
{known_papers or 'Tidak ada daftar referensi tersedia.'}

TUGAS:
1. Identifikasi setiap kalimat yang berisi klaim faktual atau argumen kuat
2. Periksa apakah klaim tersebut sudah memiliki sitasi (Penulis, Tahun)
3. Tandai klaim tanpa sitasi

OUTPUT FORMAT:
## Hasil Validasi Sitasi

### Klaim dengan Sitasi (✓):
1. "[kalimat]" — (Penulis, Tahun) ✓

### Klaim TANPA Sitasi (✗):
1. "[kalimat]" — ✗ PERLU DITAMBAHKAN REFERENSI
   Saran: [jenis referensi yang cocok]

### Ringkasan:
- Total klaim: X
- Dengan sitasi: Y
- Tanpa sitasi: Z"""
        try:
            raw_output = self._call_llm(prompt, BAB2_PROMPT, max_tokens=1200, memory=kwargs.get("memory"))
            return self._normalize_validate_output(raw_output, text)
        except Exception as e:
            logger.error("validate_citations failed: %s", e)
            return self._normalize_validate_output("", text)

    # ════════════════════════════════════════════════════════════════
    # BAB 3: METODOLOGI
    # ════════════════════════════════════════════════════════════════

    def justify_methodology(self, method_name: str, research_question: str = "", **kwargs) -> str:
        """
        Menulis argumen akademis mengapa metode X paling cocok untuk RQ Y.
        """
        prompt = f"""Metode yang dipilih: {method_name}
Rumusan masalah: {research_question or 'Tidak diberikan.'}

TUGAS:
Tulis 2-3 paragraf justifikasi akademis yang menjelaskan:
1. Definisi dan karakteristik metode {method_name}
2. Mengapa metode ini paling tepat untuk menjawab rumusan masalah tersebut
3. Referensi ahli metodologi yang mendukung pilihan ini (misal: Creswell, Sugiyono, dll.)
4. Keunggulan metode ini dibanding alternatif lain

Bahasa Indonesia formal akademik, dengan referensi metodologi."""
        try:
            return self._call_llm(prompt, BAB3_PROMPT, max_tokens=1000, memory=kwargs.get("memory"))
        except Exception as e:
            return f"Error justify_methodology: {e}"

    def generate_research_flowchart(self, steps: str, **kwargs) -> str:
        """
        Menghasilkan kode Mermaid.js dari langkah-langkah penelitian.
        """
        prompt = f"""Langkah-langkah penelitian:
{steps}

TUGAS:
Konversi langkah-langkah di atas menjadi diagram alur penelitian menggunakan kode Mermaid.js.

ATURAN:
- Gunakan format flowchart TD (top-down)
- Setiap langkah harus jelas dan diberi label deskriptif
- Gunakan decision diamond untuk titik keputusan jika ada
- Tambahkan komentar singkat pada langkah penting

OUTPUT: Berikan HANYA kode Mermaid.js dalam code block, tanpa penjelasan tambahan.

```mermaid
flowchart TD
    ...
```"""
        try:
            return self._call_llm(prompt, BAB3_PROMPT, max_tokens=800, memory=kwargs.get("memory"))
        except Exception as e:
            return f"Error generate_research_flowchart: {e}"

    # ════════════════════════════════════════════════════════════════
    # BAB 4: HASIL & PEMBAHASAN
    # ════════════════════════════════════════════════════════════════

    def interpret_data_table(self, table_data: str, **kwargs) -> str:
        """
        Membaca data mentah dan mengekstrak narasi insight tanpa halusinasi.
        """
        prompt = f"""Data hasil penelitian:
{table_data}

TUGAS:
Tulis interpretasi naratif dari data di atas yang mencakup:
1. Deskripsi umum pola/tren yang terlihat dari data
2. Temuan utama (hal yang menonjol/signifikan)
3. Perbandingan antar-kategori/variabel jika relevan
4. Interpretasi makna dari angka-angka tersebut

ATURAN PENTING:
- JANGAN membuat data/angka yang tidak ada di input
- Gunakan frasa: "Data menunjukkan bahwa...", "Terlihat bahwa...", "Hal ini mengindikasikan..."
- Bedakan antara deskripsi hasil dan interpretasi/pembahasan
- Gunakan Bahasa Indonesia formal akademik"""
        try:
            return self._call_llm(prompt, BAB4_PROMPT, max_tokens=1200, memory=kwargs.get("memory"))
        except Exception as e:
            return f"Error interpret_data_table: {e}"

    def correlate_with_bab2(self, finding: str, literature_summary: str = "", **kwargs) -> str:
        """
        Menyambungkan temuan Bab 4 dengan teori di Bab 2.
        Ini adalah skill tersulit bagi mahasiswa — agen melakukannya otomatis.
        """
        prompt = f"""TEMUAN BAB 4:
{finding}

TINJAUAN PUSTAKA BAB 2:
{literature_summary or 'Ringkasan Bab 2 tidak tersedia.'}

TUGAS:
Tulis 2-3 paragraf pembahasan yang menghubungkan temuan Bab 4 dengan teori di Bab 2:
1. Sebutkan temuan spesifik dari data
2. Hubungkan dengan teori/penelitian terdahulu: "Temuan ini sejalan dengan penelitian X (Tahun) yang menyatakan..."
3. Jelaskan perbedaan jika ada: "Berbeda dengan temuan Y (Tahun), penelitian ini menunjukkan..."
4. Berikan analisis mengapa temuan ini masuk akal secara teoritis

PENTING: Hanya referensikan teori yang disebutkan di ringkasan Bab 2.
Bahasa Indonesia formal akademik."""
        try:
            return self._call_llm(prompt, BAB4_PROMPT, max_tokens=1200, memory=kwargs.get("memory"))
        except Exception as e:
            return f"Error correlate_with_bab2: {e}"

    # ════════════════════════════════════════════════════════════════
    # BAB 5: KESIMPULAN
    # ════════════════════════════════════════════════════════════════

    def summarize_to_rq(self, bab4_text: str, research_questions: str = "", **kwargs) -> str:
        """
        Mengekstrak kesimpulan dari Bab 4 yang HANYA menjawab rumusan masalah.
        """
        prompt = f"""TEKS BAB 4 (HASIL & PEMBAHASAN):
{bab4_text}

RUMUSAN MASALAH:
{research_questions or 'Rumusan masalah tidak diberikan.'}

TUGAS:
Tulis kesimpulan yang:
1. Menjawab SETIAP rumusan masalah satu per satu secara eksplisit
2. Tidak menambahkan temuan baru yang tidak ada di Bab 4
3. Ringkas dan padat (1-2 kalimat per RQ)
4. Menggunakan bahasa yang tegas: "Berdasarkan hasil penelitian, ditemukan bahwa..."

FORMAT:
Berdasarkan hasil penelitian dan pembahasan, dapat disimpulkan:
1. [Jawaban RQ 1]
2. [Jawaban RQ 2]
..."""
        try:
            return self._call_llm(prompt, BAB5_PROMPT, max_tokens=800, memory=kwargs.get("memory"))
        except Exception as e:
            return f"Error summarize_to_rq: {e}"

    def draft_limitations_and_future_work(self, methodology_text: str, **kwargs) -> str:
        """
        Mengidentifikasi kelemahan metode di Bab 3 dan mengubahnya
        menjadi saran penelitian selanjutnya.
        """
        prompt = f"""TEKS METODOLOGI BAB 3:
{methodology_text}

TUGAS:
1. Identifikasi 3-5 keterbatasan/kelemahan dari metode penelitian yang digunakan
2. Untuk setiap keterbatasan, rumuskan saran penelitian selanjutnya yang spesifik

FORMAT OUTPUT:
## Keterbatasan Penelitian

1. **[Keterbatasan 1]**: [penjelasan]
2. **[Keterbatasan 2]**: [penjelasan]
...

## Saran Penelitian Selanjutnya

1. [Saran spesifik berdasarkan keterbatasan 1]
2. [Saran spesifik berdasarkan keterbatasan 2]
...

Bahasa Indonesia formal akademik."""
        try:
            return self._call_llm(prompt, BAB5_PROMPT, max_tokens=1000, memory=kwargs.get("memory"))
        except Exception as e:
            return f"Error draft_limitations_and_future_work: {e}"

    # ════════════════════════════════════════════════════════════════
    # EXECUTOR INTERFACE
    # ════════════════════════════════════════════════════════════════

    def run_tool(
        self,
        tool_name: str,
        input_data: Any,
        params: Dict[str, Any],
        memory: Any = None,
        **kwargs,
    ) -> Any:
        """Standard interface called by PlanExecutor."""
        tools_map = {
            # Bab 1
            "draft_research_questions": self._dispatch_research_questions,
            "draft_research_objectives": self._dispatch_research_objectives,
            "formulate_research_gap": self._dispatch_gap,
            "align_rq_with_objectives": self._dispatch_align,
            # Bab 2
            "generate_literature_matrix": self._dispatch_matrix,
            "synthesize_arguments": self._dispatch_synth,
            "validate_citations": self._dispatch_validate,
            # Bab 3
            "justify_methodology": self._dispatch_justify,
            "generate_research_flowchart": self._dispatch_flowchart,
            # Bab 4
            "interpret_data_table": self._dispatch_interpret,
            "correlate_with_bab2": self._dispatch_correlate,
            # Bab 5
            "summarize_to_rq": self._dispatch_summarize,
            "draft_limitations_and_future_work": self._dispatch_limitations,
        }

        if tool_name not in tools_map:
            raise ValueError(f"Tool '{tool_name}' not found in ChapterSkillsAgent")

        try:
            return tools_map[tool_name](input_data, params, memory)
        except Exception as e:
            logger.error(f"Error in ChapterSkills tool '{tool_name}': {e}")
            return {"error": str(e), "partial": True}

    # ── Dispatch Helpers ────────────────────────────────────────────

    def _dispatch_gap(self, input_data, params, memory):
        topic = str(input_data) if not isinstance(input_data, dict) else input_data.get("topic", "")
        lit = params.get("literature_summary", "")
        if isinstance(input_data, dict):
            lit = input_data.get("literature_summary", lit)
        return self.formulate_research_gap(topic=topic, literature_summary=lit, memory=memory)

    def _dispatch_research_questions(self, input_data, params, memory):
        request_context = getattr(memory, "request_context", {}) if memory else {}
        topic = params.get("topic") or request_context.get("context_title") or str(input_data or "")
        return self.draft_research_questions(
            topic=topic,
            project_problem=params.get("project_problem") or request_context.get("context_problem", ""),
            project_objectives=params.get("project_objectives") or request_context.get("context_objectives", ""),
            methodology=params.get("methodology") or request_context.get("context_method", ""),
            user_instruction=str(input_data or ""),
            memory=memory,
        )

    def _dispatch_research_objectives(self, input_data, params, memory):
        request_context = getattr(memory, "request_context", {}) if memory else {}
        topic = params.get("topic") or request_context.get("context_title") or str(input_data or "")
        return self.draft_research_objectives(
            topic=topic,
            project_problem=params.get("project_problem") or request_context.get("context_problem", ""),
            project_objectives=params.get("project_objectives") or request_context.get("context_objectives", ""),
            methodology=params.get("methodology") or request_context.get("context_method", ""),
            user_instruction=str(input_data or ""),
            memory=memory,
        )

    def _dispatch_align(self, input_data, params, memory):
        text = ""
        if isinstance(input_data, dict):
            paragraphs = input_data.get("paragraphs") or []
            if isinstance(paragraphs, list) and paragraphs:
                text = "\n\n".join(
                    str(paragraph.get("content", "")).strip()
                    for paragraph in paragraphs
                    if str(paragraph.get("content", "")).strip()
                )
            if not text:
                summaries = input_data.get("summaries") or []
                if isinstance(summaries, list) and summaries:
                    text = "\n".join(
                        str(summary.get("summary", "")).strip()
                        for summary in summaries
                        if str(summary.get("summary", "")).strip()
                    )
            if not text:
                text = str(input_data.get("message", "")).strip()
        if not text:
            text = str(input_data or "")

        request_context = getattr(memory, "request_context", {}) if memory else {}
        return self.align_rq_with_objectives(
            text=text,
            project_problem=request_context.get("context_problem", ""),
            project_objectives=request_context.get("context_objectives", ""),
            memory=memory,
        )

    def _dispatch_matrix(self, input_data, params, memory):
        papers = input_data if isinstance(input_data, str) else json.dumps(input_data, indent=2, ensure_ascii=False)
        return self.generate_literature_matrix(papers_json=papers, memory=memory)

    def _dispatch_synth(self, input_data, params, memory):
        if isinstance(input_data, dict):
            return self.synthesize_arguments(
                paper_a=input_data.get("paper_a", ""),
                paper_b=input_data.get("paper_b", ""),
                memory=memory,
            )
        return self.synthesize_arguments(paper_a=str(input_data), paper_b=params.get("paper_b", ""), memory=memory)

    def _dispatch_validate(self, input_data, params, memory):
        known = params.get("known_papers", "")
        if isinstance(input_data, dict):
            return self.validate_citations(
                text=input_data.get("text", ""),
                known_papers=input_data.get("known_papers", known),
                memory=memory,
            )
        return self.validate_citations(text=str(input_data), known_papers=known, memory=memory)

    def _dispatch_justify(self, input_data, params, memory):
        if isinstance(input_data, dict):
            return self.justify_methodology(
                method_name=input_data.get("method_name", ""),
                research_question=input_data.get("research_question", params.get("research_question", "")),
                memory=memory,
            )
        return self.justify_methodology(
            method_name=str(input_data),
            research_question=params.get("research_question", ""),
            memory=memory,
        )

    def _dispatch_flowchart(self, input_data, params, memory):
        return self.generate_research_flowchart(steps=str(input_data), memory=memory)

    def _dispatch_interpret(self, input_data, params, memory):
        return self.interpret_data_table(table_data=str(input_data), memory=memory)

    def _dispatch_correlate(self, input_data, params, memory):
        if isinstance(input_data, dict):
            return self.correlate_with_bab2(
                finding=input_data.get("finding", ""),
                literature_summary=input_data.get("literature_summary", params.get("literature_summary", "")),
                memory=memory,
            )
        return self.correlate_with_bab2(
            finding=str(input_data),
            literature_summary=params.get("literature_summary", ""),
            memory=memory,
        )

    def _dispatch_summarize(self, input_data, params, memory):
        if isinstance(input_data, dict):
            return self.summarize_to_rq(
                bab4_text=input_data.get("bab4_text", ""),
                research_questions=input_data.get("research_questions", params.get("research_questions", "")),
                memory=memory,
            )
        return self.summarize_to_rq(
            bab4_text=str(input_data),
            research_questions=params.get("research_questions", ""),
            memory=memory,
        )

    def _dispatch_limitations(self, input_data, params, memory):
        return self.draft_limitations_and_future_work(methodology_text=str(input_data), memory=memory)
