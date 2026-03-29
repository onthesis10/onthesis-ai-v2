import os
import json
import logging
from typing import Dict, Any, Optional, List
import litellm

# Configurasi logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════
# System prompt yang diperkaya: sekarang menerima context injection
# ═══════════════════════════════════════════════════════════════

anti_chatty = "\\n(BERIKAN HANYA TEKS HASILNYA SAJA TANPA KATA PENGANTAR ATAU PENUTUP SEPERTI 'Berikut adalah...' ATAU 'Bagus, teks Anda...')"


WRITING_AGENT_SYSTEM_PROMPT = """\
Kamu adalah Writing Agent untuk OnThesis — seorang penulis akademik setara PhD yang membantu mahasiswa menulis tesis berkualitas jurnal internasional.

IDENTITAS:
Kamu berpikir seperti seorang promotor (pembimbing PhD) yang sangat berpengalaman: tahu struktur argumen, cara mensintesis literatur, hedging language, dan cara membangun tiap bab tesis.

---

PROSES BERPIKIR (CHAIN-OF-THOUGHT):
Sebelum menulis, lakukan langkah berikut secara internal:
1. Pahami TUJUAN bagian yang ditulis (apa yang harus dicapai paragraf ini?)
2. Identifikasi KLAIM UTAMA yang harus disampaikan
3. Tentukan BUKTI/REFERENSI yang mendukung (dari input atau context)
4. Susun STRUKTUR: Kalimat topik → Konteks/latar → Bukti → Analisis → Implikasi → Transisi
5. Pilih TONE yang tepat untuk chapter (Bab 1: persuasif, Bab 2: objektif/sintesis, Bab 3: justifikatif, Bab 4: analitis, Bab 5: konklusif)

---

KAIDAH PENULISAN AKADEMIK (WAJIB):

Bahasa & Gaya:
- Bahasa Indonesia formal akademik (default), kecuali diminta bahasa lain
- DILARANG: "banget", "nih", "sih", "guys", singkatan kasual seperti "dll.", "dsb."
- Kalimat pasif untuk metode: "dilakukan", "dianalisis", "diperoleh", "dikumpulkan"
- Kalimat tidak lebih dari 35 kata. Pecah kalimat panjang.

Hedging Language (untuk klaim tidak pasti):
- Gunakan: "menunjukkan", "mengindikasikan", "cenderung", "tampaknya", "dapat diasumsikan"
- Hindari klaim absolut tanpa referensi: "terbukti", "pasti", "selalu", "tidak pernah"

Struktur Paragraf Akademik (wajib):
- Kalimat topik (1 kalimat apa yang dibahas)
- Elaborasi/latar (1-2 kalimat konteks dan definisi)
- Bukti (1-2 kalimat dengan sitasi: "Menurut X (2021)...")
- Analisis (1-2 kalimat maknanya apa?)
- Transisi (1 kalimat hubungan ke paragraf berikutnya)

---

PANDUAN PER CHAPTER:

Bab 1 (Pendahuluan): Tone persuasif yang membangun urgensi.
- Mulai dari konteks global -> nasional -> lokal -> spesifik
- Tunjukkan gap: "Namun demikian, penelitian yang ada belum..."
- Setiap klaim fenomena HARUS ada data/referensi pendukung

Bab 2 (Tinjauan Pustaka): Tone objektif dan sintesis tingkat tinggi.
- BUKAN daftar paper satu per satu -- WAJIB mensintesis antar-paper
- Gunakan penghubung: "Sejalan dengan X (2020), penelitian Y (2021) juga menemukan..."
- "Berbeda dengan temuan X, penelitian Y menunjukkan..."
- Akhiri setiap sub-bab dengan kalimat gap

Bab 3 (Metodologi): Tone justifikatif.
- Setiap pilihan metode HARUS dijustifikasi dengan argumen dan referensi metodologi
- Gunakan pustaka metodologi: Creswell (2023), Sugiyono, Yin, dll.

Bab 4 (Hasil & Pembahasan): Tone analitis.
- JANGAN hanya mengulang angka -- berikan INSIGHT dan INTERPRETASI
- Hubungkan temuan dengan teori Bab 2: "Hal ini sejalan dengan teori X yang dikemukakan oleh..."
- Bedakan sub-bagian Hasil (deskriptif) dan Pembahasan (interpretatif)

Bab 5 (Kesimpulan): Tone konklusif dan ringkas.
- Jawab SETIAP rumusan masalah secara eksplisit (satu per satu)
- JANGAN menambah temuan baru yang tidak ada di Bab 4
- Saran harus spesifik dan operasional

---

FORMAT TINJAUAN PUSTAKA:
Paragraf 1: Gambaran umum bidang penelitian (tren dekade terkini)
Paragraf 2-N: Sintesis tematik antar-paper (BUKAN daftar)
  "{Penulis} ({Tahun}) menemukan bahwa {temuan}. Diperkuat oleh {Penulis2} ({Tahun2}) yang menunjukkan {temuan2}. Namun, {Penulis3} ({Tahun3}) berpendapat berbeda..."
Paragraf Akhir: Research gap yang jelas

---

ATURAN SITASI:
- JANGAN membuat sitasi yang tidak ada dalam input. HANYA gunakan referensi yang diberikan.
- Format in-text: (Nama, Tahun) atau Nama (Tahun)
- Setiap klaim empiris wajib ada sitasinya

ANTI-PATTERN (HINDARI & DILARANG KERAS):
- HARAM MENGUBAH TOPIK UTAMA: Jika user meminta topik A, JANGAN PERNAH menyimpang ke topik B hanya karena ada di prompt/konteks.
- JANGAN PERNAH mengarang referensi fiktif seperti "Doe (2022)" atau "Smith (2020)". Jika input 'findings' atau 'papers' kosong atau tidak relevan, nyatakan secara eksplisit: "Maaf, literatur atau referensi terkait topik [topik user] belum tersedia di konteks ini."
- Pembuka klise: "Berikut adalah...", "Tentu saja...", "Bagus sekali..."
- Kalimat pengisi: "Hal ini sangat penting untuk diperhatikan."
- Generalisasi tanpa bukti: "Semua penelitian menunjukkan..."
"""

# Template untuk inject konteks dari memory ke system prompt
MEMORY_CONTEXT_TEMPLATE = """

---

KONTEKS PENULISAN SAAT INI:
- Topik tesis  : {thesis_topic}
- Bidang ilmu  : {field}
- Gaya penulisan : {writing_style}
- Bahasa       : {language}
- Gaya sitasi  : {citation_style}

{thesis_context}
{papers_context}
"""


def _build_context_enriched_prompt(base_prompt: str, memory=None) -> str:
    """Membangun system prompt yang diperkaya dengan konteks dari SharedMemory."""
    if not memory or not hasattr(memory, 'profile'):
        return base_prompt

    try:
        # Ekstrak profil user
        profile_mem = getattr(memory, 'profile', None)
        user_id = getattr(memory, 'user_id', '')
        profile = profile_mem.get_or_create(user_id) if profile_mem else None

        thesis_topic = getattr(profile, 'thesis_topic', '') or ''
        field = getattr(profile, 'field', '') or ''
        writing_style = getattr(profile, 'writing_style', 'akademik formal') or 'akademik formal'
        language = getattr(profile, 'preferred_language', 'id') or 'id'
        citation_style = getattr(profile, 'citation_style', 'APA') or 'APA'

        # Cek jika ada request_context (dari editor/frontend)
        request_context = getattr(memory, 'request_context', {}) or {}
        active_paragraphs = request_context.get('active_paragraphs', [])

        # FIX-A: Use project title from request_context if profile is empty
        if not thesis_topic:
            thesis_topic = request_context.get('context_title', '')
        if not field:
            field = request_context.get('context_method', '')

        # Inject project-level context (judul, rumusan masalah, metodologi)
        project_context = ""
        project_title = request_context.get('context_title', '')
        project_problem = request_context.get('context_problem', '')
        project_method = request_context.get('context_method', '')
        if project_title:
            project_context = f"\n=== KONTEKS PROYEK ==="
            project_context += f"\nJudul Tesis: {project_title}"
            if project_problem:
                project_context += f"\nRumusan Masalah: {project_problem}"
            if project_method:
                project_context += f"\nMetodologi: {project_method}"
            project_context += "\n"

        thesis_context = ""
        if active_paragraphs:
            para_previews = []
            for p in active_paragraphs[:5]:  # Max 5 paragraf untuk efisiensi token
                content = p.get('content', '')
                preview = (content[:150] + '…') if len(content) > 150 else content
                para_previews.append(f"  [{p.get('paraId', '?')}]: {preview}")
            thesis_context = "Paragraf aktif di editor:\n" + "\n".join(para_previews)

        # Cek paper yang sudah diketahui
        papers_context = ""
        research_mem = getattr(memory, 'research', None)
        if research_mem and thesis_topic:
            try:
                papers = research_mem.get_papers(thesis_topic, min_relevance=0.5)
                if papers and isinstance(papers, list):
                    paper_list = [f"  - {p.get('title', '?')} ({p.get('year', '?')})" for p in papers[:5]]
                    papers_context = "Paper yang sudah ditemukan:\n" + "\n".join(paper_list)
            except Exception:
                pass  # Jangan gagalkan jika memory error

        context_str = MEMORY_CONTEXT_TEMPLATE.format(
            thesis_topic=thesis_topic or '(belum diketahui)',
            field=field or '(belum diketahui)',
            writing_style=writing_style,
            language='Indonesia' if language == 'id' else language,
            citation_style=citation_style,
            thesis_context=thesis_context,
            papers_context=papers_context,
        )

        return base_prompt + project_context + context_str

    except Exception as e:
        logger.warning(f"Gagal membangun context-enriched prompt: {e}")
        return base_prompt


class WritingAgent:
    """
    Writing Agent bertanggung jawab untuk memproses, memparafrase, merangkum, 
    serta memperbaiki gaya bahasa teks akademik.
    
    Sekarang mendukung memory context injection sehingga setiap output
    disesuaikan dengan topik tesis, bahasa, dan gaya sitasi user.
    """
    
    def __init__(self):
        """
        Inisialisasi Writing Agent
        Semua config diambil melalui environment variables (tidak ada hardcoded token/keys).
        """
        self.api_key = os.environ.get("LLM_API_KEY")
        self.model = os.environ.get("WRITING_AGENT_MODEL", "groq/llama-3.1-8b-instant")
        
        if not self.api_key:
            logger.warning("LLM_API_KEY environment variable is not set. Pemanggilan LLM kemungkinan akan gagal.")

    def _call_llm(
        self,
        prompt: str,
        system_prompt: str = WRITING_AGENT_SYSTEM_PROMPT,
        max_tokens: Optional[int] = None,
        memory: Any = None,
    ) -> str:
        """
        Wrapper untuk litellm dengan model default dari env dan fallback ke Gemini.
        Sekarang menerima `memory` untuk context injection ke system prompt.
        """
        import litellm
        from litellm.exceptions import RateLimitError
        
        fallback_api_key = os.environ.get("GEMINI_API_KEY")
        fallback_model = "gemini/gemini-2.5-flash"

        # Inject memory context ke system prompt
        enriched_system_prompt = _build_context_enriched_prompt(system_prompt, memory)

        messages = [
            {"role": "system", "content": enriched_system_prompt},
            {"role": "user", "content": prompt}
        ]
        
        try:
            logger.info(f"| DEBUG | WritingAgent -> Mencoba Primary: {self.model}")
            logger.info(f"WritingAgent memanggil LLM Primary ({self.model})")
            response = litellm.completion(
                model=self.model,
                messages=messages,
                api_key=self.api_key,
                max_tokens=max_tokens
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.info(f"| DEBUG | WritingAgent -> Primary Limit! Error: {str(e)}")
            logger.info(f"| DEBUG | WritingAgent -> Mencoba Fallback: {fallback_model}")
            logger.warning(f"RateLimit hit pada LLM Primary, mencoba fallback ke {fallback_model}...")
            if not fallback_api_key:
                logger.error("API_KEY tidak di-set. Fallback gagal.")
                raise e
            try:
                response = litellm.completion(
                    model=fallback_model,
                    messages=messages,
                    api_key=fallback_api_key,
                    max_tokens=max_tokens
                )
                logger.info(f"| DEBUG | WritingAgent -> Fallback Sukses ({fallback_model})")
                return response.choices[0].message.content
            except Exception as fallback_e:
                logger.error(f"| DEBUG | WritingAgent -> Fallback Gagal! Error: {str(fallback_e)}")
                logger.error(f"Fallback LLM gagal: {str(fallback_e)}")
                raise fallback_e

    def _call_llm_stream(
        self,
        prompt: str,
        system_prompt: str = WRITING_AGENT_SYSTEM_PROMPT,
        max_tokens: Optional[int] = None,
        memory: Any = None,
    ):
        """
        Versi streaming dari _call_llm(). Yields chunk string secara real-time.
        Digunakan untuk UX yang lebih responsif via SSE.
        """
        import litellm
        from litellm.exceptions import RateLimitError

        fallback_api_key = os.environ.get("GEMINI_API_KEY")
        fallback_model = "gemini/gemini-2.5-flash"
        enriched_system_prompt = _build_context_enriched_prompt(system_prompt, memory)

        messages = [
            {"role": "system", "content": enriched_system_prompt},
            {"role": "user", "content": prompt}
        ]

        def _stream_from_model(model, api_key):
            response = litellm.completion(
                model=model,
                messages=messages,
                api_key=api_key,
                max_tokens=max_tokens,
                stream=True
            )
            for chunk in response:
                content = chunk.choices[0].delta.content
                if content:
                    yield content

        try:
            logger.info(f"| DEBUG | WritingAgent Stream -> Primary: {self.model}")
            yield from _stream_from_model(self.model, self.api_key)
        except Exception:
            logger.warning(f"RateLimit hit, fallback stream ke {fallback_model}")
            if not fallback_api_key:
                yield "Error: API key untuk fallback belum di-set."
                return
            try:
                yield from _stream_from_model(fallback_model, fallback_api_key)
            except Exception as e:
                logger.error(f"Fallback stream gagal: {e}")
                yield f"Error: {str(e)}"
        except Exception as e:
            logger.error(f"LLM Stream gagal: {e}")
            yield f"Error: {str(e)}"

    def stream_tool(self, tool_name: str, input_data: Any, params: Dict[str, Any],
                    memory: Any = None, on_chunk=None, **kwargs) -> str:
        """
        Versi streaming dari run_tool(). Yields chunks via on_chunk callback
        dan mengembalikan output lengkap sebagai string.
        """
        # Bangun prompt sesuai tool (reuse logic dari non-streaming methods)
        prompt_map = {
            "generate_section": lambda t, p: (
                f"Buatkan teks baru berdasarkan instruksi berikut dengan gaya {p.get('style', 'akademik formal')}. "
                f"Pastikan isinya akademis dan komprehensif.\n\n"
                f"Instruksi:\n{t}\n\nTeks yang dihasilkan:\n(BERIKAN HANYA TEKS HASILNYA SAJA TANPA KATA PENGANTAR)"
            ),
            "rewrite_text": lambda t, p: (
                f"Tulis ulang teks berikut dengan gaya {p.get('style', 'akademik formal')}. "
                f"Pertahankan makna inti, tingkatkan kejelasan dan alur akademik.\n\n"
                f"Teks asli:\n{t}\n\nHasil penulisan ulang:" + anti_chatty
            ),
            "paraphrase_text": lambda t, p: (
                f"Parafrase teks berikut agar terhindar dari plagiarisme. "
                f"Gunakan kata-kata dan struktur kalimat yang berbeda.\n\n"
                f"Teks asli:\n{t}\n\nHasil parafrase:" + anti_chatty
            ),
            "expand_paragraph": lambda t, p: (
                f"Kembangkan paragraf berikut dengan fokus pada: {p.get('direction', 'detail akademis lebih dalam')}.\n\n"
                f"Paragraf asli:\n{t}\n\nParagraf yang dikembangkan:"
            ),
            "summarize_text": lambda t, p: (
                f"Rangkum teks berikut secara padat. Panjang target: {p.get('length', '1 paragraf')}.\n\n"
                f"Teks asli:\n{t}\n\nRangkuman:"
            ),
            "polish_academic_tone": lambda t, p: (
                f"Perbaiki teks berikut agar sesuai standar penulisan akademik bahasa Indonesia formal.\n\n"
                f"Teks asli:\n{t}\n\nTeks yang diperbaiki:"
            ),
        }

        if tool_name not in prompt_map:
            # Fallback ke non-streaming untuk tools yang tidak support stream
            return self.run_tool(tool_name, input_data, params, memory=memory, **kwargs)

        text_input = str(input_data) if input_data is not None else ""
        prompt = prompt_map[tool_name](text_input, params)

        full_output = []
        for chunk in self._call_llm_stream(prompt, memory=memory):
            full_output.append(chunk)
            if on_chunk:
                on_chunk(chunk)

        return "".join(full_output)

    # ═══════════════════════════════════════════════════════════════
    # Tool Methods — Semua prompt sekarang dalam bahasa Indonesia
    # dan menerima memory untuk context injection
    # ═══════════════════════════════════════════════════════════════


    def generate_section(self, text: str, style: str = "akademik formal", memory: Any = None) -> str:
        """
        Menghasilkan paragraf atau bagian teks baru dari awal (from scratch) berdasarkan instruksi user.
        Jika input berupa research findings (list of papers), gunakan sebagai sumber referensi.
        """
        try:
            # FIX-B: Extract project title to make prompt context-aware
            project_title = ""
            if memory and hasattr(memory, 'request_context'):
                rc = getattr(memory, 'request_context', {}) or {}
                project_title = rc.get('context_title', '')

            title_instruction = ""
            if project_title:
                title_instruction = (
                    f"Judul tesis yang sedang dikerjakan: \"{project_title}\". "
                    f"PENTING: Konten yang dihasilkan HARUS relevan dan sesuai dengan judul tesis tersebut. "
                )

            # Check if input is research findings (from extract_findings step)
            findings_section = ""
            user_instruction = text
            if isinstance(text, str):
                try:
                    parsed = json.loads(text)
                    if isinstance(parsed, list) and len(parsed) > 0 and isinstance(parsed[0], dict) and 'title' in parsed[0]:
                        # This is a list of papers with findings
                        findings_parts = []
                        for p in parsed[:5]:
                            authors = p.get('authors', [])
                            author_str = authors[0] if authors else 'Unknown'
                            year = p.get('year', '?')
                            title = p.get('title', '')
                            findings = p.get('key_findings', '')
                            abstract = p.get('abstract', '')
                            findings_parts.append(
                                f"- {author_str} ({year}): \"{title}\"\n"
                                f"  Temuan: {findings or abstract[:200]}"
                            )
                        findings_section = (
                            "\n\nREFERENSI AKADEMIK YANG HARUS DIGUNAKAN:\n"
                            + "\n".join(findings_parts) + "\n\n"
                            "ATURAN SITASI:\n"
                            "- WAJIB mengutip paper-paper di atas dengan format (Author, Year) dalam teks.\n"
                            "- Sintesis temuan antar paper, BUKAN daftar satu per satu.\n"
                            "- Setiap klaim harus didukung oleh minimal satu referensi.\n"
                        )
                        user_instruction = f"Tulis bagian tesis yang relevan berdasarkan referensi yang diberikan"
                except (json.JSONDecodeError, TypeError, IndexError):
                    pass  # Not JSON, use text as-is

            prompt = (
                f"Buatkan teks baru berdasarkan instruksi berikut dengan gaya {style}. "
                + title_instruction
                + f"Pastikan isinya sangat terstuktur, akademis, dan komprehensif.\n\n"
                f"Instruksi:\n{user_instruction}\n"
                + findings_section
                + f"\nTeks yang dihasilkan:\n(BERIKAN HANYA TEKS HASILNYA SAJA TANPA KATA PENGANTAR ATAU PENUTUP)"
            )
            return self._call_llm(prompt, memory=memory)
        except Exception as e:
            logger.error(f"Gagal melakukan generate_section: {str(e)}")
            return f"Error: {str(e)}"
    def rewrite_text(self, text: str, style: str = "akademik formal", memory: Any = None) -> str:
        """
        Menulis ulang paragraf untuk meningkatkan kejelasan dan gaya akademik.
        """
        try:
            prompt = (
                f"Tulis ulang teks berikut dengan gaya {style}. "
                f"Pertahankan makna inti, tingkatkan kejelasan dan alur akademik.\n\n"
                f"Teks asli:\n{text}\n\n"
                f"Hasil penulisan ulang:" + anti_chatty
            )
            return self._call_llm(prompt, memory=memory)
        except Exception as e:
            logger.error(f"Gagal melakukan rewrite_text: {str(e)}")
            return f"Error: {str(e)}"

    def paraphrase_text(self, text: str, memory: Any = None) -> str:
        """
        Memparafrase teks untuk mengurangi kesamaan similarity (plagiasi) tanpa mengubah makna.
        """
        try:
            prompt = (
                f"Parafrase teks berikut agar terhindar dari plagiarisme. "
                f"Gunakan kata-kata dan struktur kalimat yang berbeda, "
                f"namun pertahankan makna inti secara utuh.\n\n"
                f"Teks asli:\n{text}\n\n"
                f"Hasil parafrase:" + anti_chatty
            )
            return self._call_llm(prompt, memory=memory)
        except Exception as e:
            logger.error(f"Gagal melakukan paraphrase_text: {str(e)}")
            return f"Error: {str(e)}"

    def expand_paragraph(self, text: str, direction: str = "detail akademis lebih dalam", memory: Any = None) -> str:
        """
        Memperluas paragraf pendek dengan detail akademis yang relevan sesuai arah/konteks.
        """
        try:
            prompt = (
                f"Kembangkan paragraf berikut dengan fokus pada: {direction}. "
                f"Tambahkan penjelasan, contoh, atau elaborasi yang relevan secara akademis. "
                f"Tetap pada topik dan jangan menambah kalimat pengisi yang tidak bermakna.\n\n"
                f"Paragraf asli:\n{text}\n\n"
                f"Paragraf yang dikembangkan:"
            )
            return self._call_llm(prompt, memory=memory)
        except Exception as e:
            logger.error(f"Gagal melakukan expand_paragraph: {str(e)}")
            return f"Error: {str(e)}"

    def summarize_text(self, text: str, length: str = "1 paragraf", memory: Any = None) -> str:
        """
        Merangkum bagian teks panjang secara ringkas tanpa kehilangan inti informasi.
        """
        try:
            prompt = (
                f"Rangkum teks berikut secara padat dan informatif. "
                f"Panjang target: {length}. "
                f"Pertahankan poin-poin utama dan informasi kunci.\n\n"
                f"Teks asli:\n{text}\n\n"
                f"Rangkuman:"
            )
            return self._call_llm(prompt, memory=memory)
        except Exception as e:
            logger.error(f"Gagal melakukan summarize_text: {str(e)}")
            return f"Error: {str(e)}"

    def generate_literature_review(
        self, findings: Any, style: str = "akademik formal", language: str = "id", memory: Any = None
    ) -> str:
        """
        Menghasilkan bagian Literature Review dari temuan (findings) yang diekstrak.
        Menerima list[dict] findings ATAU string text (untuk fleksibilitas data flow).
        """
        try:
            # Handle berbagai format input (list/dict/string)
            if isinstance(findings, list):
                findings_str = json.dumps(findings, indent=2, ensure_ascii=False)
            elif isinstance(findings, dict):
                findings_str = json.dumps(findings, indent=2, ensure_ascii=False)
            else:
                findings_str = str(findings)

            lang_label = "bahasa Indonesia" if language == "id" else language

            prompt = (
                f"Buatkan bagian tinjauan pustaka (literature review) dalam {lang_label} "
                f"dengan gaya {style} berdasarkan temuan-temuan berikut.\n\n"
                f"ATURAN:\n"
                f"- Tulis sebagai paragraf naratif yang mengalir, BUKAN daftar bullet.\n"
                f"- Sintesis temuan antar paper, bukan sekedar daftar satu per satu.\n"
                f"- Batasi ke 3-5 paper kunci, ringkas namun informatif.\n"
                f"- Akhiri dengan celah penelitian (research gap) jika memungkinkan.\n\n"
                f"Data temuan:\n{findings_str}\n\n"
                f"Tinjauan pustaka:" + anti_chatty
            )
            return self._call_llm(prompt, max_tokens=1200, memory=memory)
        except Exception as e:
            logger.error(f"Gagal melakukan generate_literature_review: {str(e)}")
            return f"Error: {str(e)}"

    def polish_academic_tone(self, text: str, memory: Any = None) -> str:
        """
        Memperbaiki tulisan agar sesuai dengan standar akademik bahasa Indonesia formal.
        """
        try:
            prompt = (
                f"Perbaiki teks berikut agar sepenuhnya sesuai standar penulisan akademik "
                f"bahasa Indonesia yang formal.\n\n"
                f"ATURAN:\n"
                f"- Gunakan kalimat pasif di bagian metode (dilakukan, dianalisis, diperoleh)\n"
                f"- Gunakan bahasa hedging untuk klaim (menunjukkan, mengindikasikan, cenderung)\n"
                f"- Hindari kata-kata kasual atau informal\n"
                f"- Pastikan setiap paragraf punya kalimat topik yang jelas\n\n"
                f"Teks asli:\n{text}\n\n"
                f"Teks yang telah diperbaiki:" + anti_chatty
            )
            return self._call_llm(prompt, memory=memory)
        except Exception as e:
            logger.error(f"Gagal melakukan polish_academic_tone: {str(e)}")
            return f"Error: {str(e)}"

    def format_citation(self, paper: Any, style: str = "APA", memory: Any = None) -> str:
        """
        Memformat data paper menjadi kutipan dengan gaya tertentu (APA, IEEE, Chicago).
        """
        try:
            if isinstance(paper, dict):
                paper_str = json.dumps(paper, indent=2, ensure_ascii=False)
            else:
                paper_str = str(paper)

            prompt = (
                f"Format metadata paper berikut menjadi format sitasi {style} yang benar.\n\n"
                f"Data paper:\n{paper_str}\n\n"
                f"Sitasi dalam format {style}:"
            )
            return self._call_llm(prompt, memory=memory)
        except Exception as e:
            logger.error(f"Gagal melakukan format_citation: {str(e)}")
            return f"Error: {str(e)}"

    # ═══════════════════════════════════════════════════════════════
    # Executor Interface — Sekarang meneruskan memory ke setiap tool
    # ═══════════════════════════════════════════════════════════════
    # NEW PhD-Level Tools
    # ═══════════════════════════════════════════════════════════════

    def generate_full_chapter(
        self,
        text: str,
        chapter_type: str = "auto",
        chapter_number: str = "auto",
        instruction: str = "",
        style: str = "akademik formal",
        memory: Any = None
    ) -> str:
        """
        Menulis satu bab tesis lengkap (~800-1200 kata) berdasarkan instruksi dan konteks.
        chapter_type: pendahuluan | tinjauan_pustaka | metodologi | hasil_pembahasan | kesimpulan | auto
        """
        CHAPTER_GUIDE = {
            "pendahuluan": (
                "Tulis Bab 1 (Pendahuluan) yang mencakup: (1) Latar Belakang yang membangun urgensi dari umum ke spesifik, "
                "(2) Identifikasi Masalah, (3) Rumusan Masalah, (4) Tujuan Penelitian, (5) Manfaat Penelitian. "
                "Gunakan data/referensi untuk mendukung setiap klaim di latar belakang."
            ),
            "tinjauan_pustaka": (
                "Tulis Bab 2 (Tinjauan Pustaka) yang mencakup: (1) Kajian teori utama yang relevan, "
                "(2) Penelitian terdahulu yang disintesis secara tematik (BUKAN daftar), "
                "(3) Kerangka pemikiran / research gap. Setiap sub-bab minimal 2-3 paragraf."
            ),
            "metodologi": (
                "Tulis Bab 3 (Metodologi Penelitian) yang mencakup: (1) Jenis dan pendekatan penelitian (justifikasi), "
                "(2) Populasi dan sampel, (3) Teknik pengumpulan data, (4) Instrumen penelitian, "
                "(5) Teknik analisis data. Setiap pilihan metode HARUS dijustifikasi secara akademik."
            ),
            "hasil_pembahasan": (
                "Tulis Bab 4 (Hasil dan Pembahasan) yang mencakup: (1) Deskripsi hasil per rumusan masalah, "
                "(2) Pembahasan yang menghubungkan temuan dengan teori di Bab 2, "
                "(3) Implikasi temuan. Bedakan antara sub-bagian Hasil dan Pembahasan."
            ),
            "kesimpulan": (
                "Tulis Bab 5 (Kesimpulan dan Saran) yang mencakup: (1) Kesimpulan yang menjawab setiap rumusan masalah "
                "secara eksplisit, (2) Keterbatasan penelitian, (3) Saran praktis dan saran penelitian selanjutnya. "
                "JANGAN menambah temuan baru yang tidak ada di Bab 4."
            ),
        }
        
        resolved_type = chapter_type
        if resolved_type == "auto" and instruction:
            resolved_type = "pendahuluan" # safe fallback
            
        chapter_guide = CHAPTER_GUIDE.get(resolved_type.lower(), CHAPTER_GUIDE["pendahuluan"])
        
        if chapter_type == "auto":
            chapter_guide = (
                f"Bab yang diminta tidak terdeteksi eksplisit. Instruksi user: '{instruction}'. "
                "Tulis struktur bab secara logis sesuai dengan instruksi yang diminta (apakah itu Bab 2, Bab 3, dll). "
                "Kaver pendahuluan teori, referensi, atau temuan sesuai kebutuhan."
            )

        try:
            project_title = ""
            if memory and hasattr(memory, 'request_context'):
                rc = getattr(memory, 'request_context', {}) or {}
                project_title = rc.get('context_title', '')

            title_ctx = f'Judul tesis: "{project_title}". ' if project_title else ""
            instruction_ctx = f"Instruksi spesifik dari pengguna: {instruction}\n" if instruction else ""

            prompt = (
                f"{title_ctx}{instruction_ctx}\n"
                f"Temuan riset untuk referensi tambahan:\n{text}\n\n"
                f"PANDUAN PENULISAN (WAJIB DIIKUTI):\n{chapter_guide}\n\n"
                f"Tulis dalam gaya {style}, bahasa Indonesia akademik formal. "
                f"Panjang minimal 6 paragraf substansial. "
                f"BERIKAN HANYA TEKS BAB TERSEBUT, tanpa pengantar atau penutup meta."
            )
            return self._call_llm(prompt, max_tokens=2500, memory=memory)
        except Exception as e:
            logger.error(f"Gagal melakukan generate_full_chapter: {str(e)}")
            return f"Error: {str(e)}"

    def write_abstract(
        self,
        text: str,
        memory: Any = None,
        **kwargs
    ) -> str:
        """
        Menulis abstrak terstruktur (Latar Belakang -> Tujuan -> Metode -> Hasil -> Simpulan).
        Input `text` bisa berupa instruksi bebas atau JSON dengan key: title, problem, method, findings, conclusion.
        """
        try:
            import json as _json
            struct = None
            if isinstance(text, str):
                try:
                    struct = _json.loads(text)
                except (ValueError, TypeError):
                    pass

            if isinstance(struct, dict):
                title = struct.get('title', '')
                problem = struct.get('problem', '')
                method = struct.get('method', '')
                findings = struct.get('findings', '')
                conclusion = struct.get('conclusion', '')
                context_str = (
                    f"Judul: {title}\nRumusan Masalah/Tujuan: {problem}\n"
                    f"Metode: {method}\nHasil/Temuan: {findings}\nKesimpulan: {conclusion}"
                )
            else:
                context_str = str(text)

            prompt = (
                f"Tulis abstrak akademik formal berdasarkan informasi berikut:\n{context_str}\n\n"
                "STRUKTUR ABSTRAK (ikuti urutan ini):\n"
                "1. Latar belakang singkat (1-2 kalimat: konteks dan urgensi)\n"
                "2. Tujuan penelitian (1 kalimat)\n"
                "3. Metode penelitian (1-2 kalimat: pendekatan, sampel, teknik)\n"
                "4. Hasil utama (2-3 kalimat temuan kunci)\n"
                "5. Simpulan dan implikasi (1-2 kalimat)\n\n"
                "ATURAN:\n"
                "- Total 150-250 kata\n"
                "- Bahasa Indonesia formal akademik\n"
                "- JANGAN gunakan bullet point\n"
                "- Tulis dalam 1 paragraf atau 2 paragraf maksimal\n"
                "- BERIKAN HANYA TEKS ABSTRAK tanpa pengantar atau penutup"
            )
            return self._call_llm(prompt, max_tokens=600, memory=memory)
        except Exception as e:
            logger.error(f"Gagal melakukan write_abstract: {str(e)}")
            return f"Error: {str(e)}"

    def refine_with_critique(self, text: str, critique: str = "", memory: Any = None) -> str:
        """
        Merevisi teks berdasarkan kritik spesifik dari evaluator (mis. dari self-evaluation loop).
        """
        try:
            prompt = (
                f"Teks yang perlu direvisi:\n{text}\n\n"
                f"Kritik / saran perbaikan:\n{critique or 'Perbaiki kualitas akademik secara keseluruhan.'}\n\n"
                "INSTRUKSI: Tulis ulang teks di atas dengan MEMPERHATIKAN SETIAP kritik di atas. "
                "Pertahankan makna inti. Hasilkan teks yang lebih baik dari versi aslinya. "
                "BERIKAN HANYA TEKS YANG SUDAH DIREVISI, tanpa pengantar."
            )
            return self._call_llm(prompt, memory=memory)
        except Exception as e:
            logger.error(f"Gagal melakukan refine_with_critique: {str(e)}")
            return f"Error: {str(e)}"

    # ═══════════════════════════════════════════════════════════════

    def run_tool(self, tool_name: str, input_data: Any, params: Dict[str, Any], memory: Any = None, **kwargs) -> Any:
        """
        Method generik yang dipanggil Executor saat menjalankan TaskPlan.
        Sekarang meneruskan `memory` ke setiap tool method agar context-aware.
        """
        tools_map = {
            "generate_section": self.generate_section,
            "rewrite_text": self.rewrite_text,
            "paraphrase_text": self.paraphrase_text,
            "expand_paragraph": self.expand_paragraph,
            "summarize_text": self.summarize_text,
            "generate_literature_review": self.generate_literature_review,
            "polish_academic_tone": self.polish_academic_tone,
            "format_citation": self.format_citation,
            # New PhD-Level Tools
            "generate_full_chapter": self.generate_full_chapter,
            "write_abstract": self.write_abstract,
            "refine_with_critique": self.refine_with_critique,
        }
        
        if tool_name not in tools_map:
            raise ValueError(f"Tool {tool_name} tidak ditemukan pada Writing Agent")
            
        try:
            func = tools_map[tool_name]
            
            # Bersihkan params dari key yang sudah di-handle secara eksplisit
            clean_params = {k: v for k, v in params.items() if k not in ('memory',)}
            
            if tool_name == "generate_literature_review":
                return func(findings=input_data, memory=memory, **clean_params)
            elif tool_name == "format_citation":
                return func(paper=input_data, memory=memory, **clean_params)
            elif tool_name == "generate_full_chapter":
                return func(text=str(input_data) if input_data is not None else "", memory=memory, **clean_params)
            elif tool_name == "refine_with_critique":
                critique = clean_params.pop("critique", "")
                return func(text=str(input_data) if input_data is not None else "", critique=critique, memory=memory, **clean_params)
            else:
                # Pastikan input_data adalah string untuk tool text-based
                text_input = str(input_data) if input_data is not None else ""
                return func(text=text_input, memory=memory, **clean_params)
            
        except Exception as e:
            logger.error(f"Terjadi kesalahan ketika mengeksekusi tool {tool_name}: {str(e)}")
            return {"error": str(e), "partial": True}
