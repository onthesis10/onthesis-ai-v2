"""
diagnostic_agent.py — Proactive Diagnostic Mode (Phase 4)

Provides background analysis tools for proactive thesis quality checking:
  - analyze_for_missing_citations: Scan text for unsupported claims
  - check_golden_thread: Verify cross-chapter coherence (RQ→Findings→Conclusion)
  - auto_flag_claims: Identify strong claims needing citations
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional
from .memory_system import build_memory_prompt_context

logger = logging.getLogger(__name__)

DIAGNOSTIC_SYSTEM_PROMPT = """\
Kamu adalah agen diagnostik untuk tesis akademik Indonesia.
Tugasmu adalah mendeteksi masalah kualitas penulisan secara proaktif:
- Klaim tanpa sitasi
- Ketidakselarasan antar-bab (golden thread)
- Argumen lemah atau tautologis

ATURAN:
- Berikan temuan yang SPESIFIK dan TERUKUR
- Jangan rekomendasikan perubahan yang tidak diminta
- Fokus pada flagging, bukan rewriting
- Output dalam Bahasa Indonesia
"""


class DiagnosticAgent:
    """
    Agent untuk analisis diagnostik proaktif.
    Mendeteksi masalah kualitas tesis secara background.
    """

    def __init__(self):
        self.api_key = os.environ.get("LLM_API_KEY")
        self.model = os.environ.get("DIAGNOSTIC_AGENT_MODEL", "groq/llama-3.1-8b-instant")

        if not self.api_key:
            logger.warning("LLM_API_KEY not set. Diagnostic LLM calls may fail.")

    def _call_llm(self, prompt: str, system_prompt: str = DIAGNOSTIC_SYSTEM_PROMPT, memory: Any = None) -> str:
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
            response = litellm.completion(
                model=self.model,
                messages=messages,
                api_key=self.api_key,
                max_tokens=1200,
            )
            return response.choices[0].message.content
        except RateLimitError:
            logger.warning(f"| Diagnostic | RateLimit, fallback to {fallback_model}")
            if not fallback_api_key:
                return '{"error": "RateLimit and no fallback API key"}'
            try:
                response = litellm.completion(
                    model=fallback_model,
                    messages=messages,
                    api_key=fallback_api_key,
                    max_tokens=1200,
                )
                return response.choices[0].message.content
            except Exception as e:
                logger.error(f"| Diagnostic | Fallback failed: {e}")
                return f'{{"error": "{e}"}}'
        except Exception as e:
            logger.error(f"| Diagnostic | LLM call failed: {e}")
            return f'{{"error": "{e}"}}'

    # ── Tool 1: Analyze for Missing Citations ───────────────────────

    def analyze_for_missing_citations(self, paragraphs: Any, **kwargs) -> Dict[str, Any]:
        """
        Memindai paragraf aktif untuk mendeteksi klaim tanpa sitasi.

        Args:
            paragraphs: List of paragraph dicts or a single text string.

        Returns:
            Dict with list of citation flags.
        """
        if isinstance(paragraphs, str):
            text_to_scan = paragraphs
            para_map = [{"paraId": "unknown", "content": paragraphs}]
        elif isinstance(paragraphs, list):
            para_map = paragraphs
            text_to_scan = "\n\n".join(
                f"[{p.get('paraId', '?')}] {p.get('content', '')}" for p in paragraphs
            )
        else:
            return {"citation_flags": [], "message": "Input tidak valid."}

        if not text_to_scan.strip():
            return {"citation_flags": [], "message": "Tidak ada teks untuk dianalisis."}

        prompt = f"""Analisis teks berikut dan identifikasi SETIAP kalimat yang mengandung klaim faktual
tanpa sitasi. Klaim faktual adalah pernyataan yang membutuhkan bukti dari sumber eksternal.

TEKS:
{text_to_scan}

OUTPUT (JSON ONLY):
{{
  "flags": [
    {{
      "paraId": "ID paragraf",
      "claim": "kalimat klaim",
      "severity": "high|medium|low",
      "suggestion": "jenis referensi yang cocok"
    }}
  ],
  "total_claims": <jumlah klaim ditemukan>,
  "claims_with_citation": <jumlah yang sudah punya sitasi>,
  "claims_without_citation": <jumlah tanpa sitasi>
}}"""

        try:
            llm_result = self._call_llm(prompt, memory=kwargs.get("memory"))
            # Try to parse as JSON
            try:
                parsed = json.loads(llm_result)
                flags = parsed.get("flags", [])
            except json.JSONDecodeError:
                # Fallback: return raw text
                return {
                    "citation_flags": [],
                    "raw_analysis": llm_result,
                    "message": "Analisis selesai tetapi tidak bisa di-parse sebagai JSON.",
                }

            # Build citation_flag events
            import time
            import uuid as uuid_mod

            citation_flags = []
            for f in flags:
                citation_flags.append({
                    "flagId": f"flag_{int(time.time() * 1000)}_{uuid_mod.uuid4().hex[:6]}",
                    "paraId": f.get("paraId", "unknown"),
                    "claim": f.get("claim", ""),
                    "severity": f.get("severity", "medium"),
                    "message": "Klaim kuat terdeteksi. Butuh referensi untuk mendukung argumen ini.",
                    "suggestion": f.get("suggestion", "Tambahkan sitasi dari paper empiris."),
                })

            return {
                "citation_flags": citation_flags,
                "total_claims": parsed.get("total_claims", 0),
                "claims_without_citation": parsed.get("claims_without_citation", 0),
            }
        except Exception as e:
            logger.error(f"Error analyze_for_missing_citations: {e}")
            return {"citation_flags": [], "error": str(e)}

    # ── Tool 2: Check Golden Thread ─────────────────────────────────

    def check_golden_thread(
        self,
        bab1_rq: str = "",
        bab4_findings: str = "",
        bab5_conclusion: str = "",
        **kwargs,
    ) -> Dict[str, Any]:
        """
        Memeriksa koherensi silang antar-bab (Golden Thread).
        Memastikan kesimpulan menjawab RQ dan findings terhubung ke RQ.

        Returns:
            Dict with coherence analysis and warnings.
        """
        if not bab1_rq and not bab4_findings and not bab5_conclusion:
            return {
                "coherent": True,
                "warnings": [],
                "message": "Tidak ada data antar-bab untuk diperiksa.",
            }

        prompt = f"""Periksa koherensi "benang merah" (golden thread) tesis berikut:

RUMUSAN MASALAH (BAB 1):
{bab1_rq or 'Tidak tersedia.'}

TEMUAN UTAMA (BAB 4):
{bab4_findings or 'Tidak tersedia.'}

KESIMPULAN (BAB 5):
{bab5_conclusion or 'Tidak tersedia.'}

TUGAS:
1. Periksa apakah setiap RQ di Bab 1 terjawab oleh temuan di Bab 4
2. Periksa apakah kesimpulan di Bab 5 hanya menjawab RQ (tidak menambah temuan baru)
3. Identifikasi inkonsistensi atau putusnya benang merah

OUTPUT (JSON ONLY):
{{
  "coherent": true/false,
  "score": 1-10,
  "warnings": [
    {{
      "type": "rq_not_answered" | "conclusion_mismatch" | "new_finding_in_conclusion" | "finding_without_rq",
      "description": "penjelasan masalah",
      "affected_chapters": ["Bab 1", "Bab 4"],
      "suggestion": "saran perbaikan"
    }}
  ],
  "summary": "ringkasan koherensi"
}}"""

        try:
            llm_result = self._call_llm(prompt, memory=kwargs.get("memory"))
            try:
                parsed = json.loads(llm_result)
                return {
                    "coherent": parsed.get("coherent", True),
                    "score": parsed.get("score", 0),
                    "warnings": parsed.get("warnings", []),
                    "summary": parsed.get("summary", ""),
                }
            except json.JSONDecodeError:
                return {
                    "coherent": True,
                    "warnings": [],
                    "raw_analysis": llm_result,
                    "message": "Analisis selesai tetapi tidak bisa di-parse sebagai JSON.",
                }
        except Exception as e:
            logger.error(f"Error check_golden_thread: {e}")
            return {"coherent": True, "warnings": [], "error": str(e)}

    # ── Tool 3: Auto-Flag Claims ────────────────────────────────────

    def auto_flag_claims(self, paragraph_id: str, text: str, **kwargs) -> Dict[str, Any]:
        """
        Mengidentifikasi kalimat dengan klaim kuat yang membutuhkan sitasi
        dalam satu paragraf spesifik.

        Returns:
            Dict with flagging results for a single paragraph.
        """
        if not text.strip():
            return {"flags": [], "paraId": paragraph_id}

        prompt = f"""Identifikasi kalimat-kalimat dalam paragraf berikut yang MEMBUTUHKAN sitasi referensi:

PARAGRAF [{paragraph_id}]:
{text}

Kalimat yang membutuhkan sitasi:
- Klaim statistik/angka tanpa sumber
- Generalisasi luas ("semua peneliti setuju...")
- Pernyataan kausal ("X menyebabkan Y")
- Definisi tanpa atribusi

OUTPUT (JSON ONLY):
{{
  "claims_needing_citation": [
    {{
      "sentence": "kalimat lengkap",
      "reason": "mengapa butuh sitasi",
      "priority": "high|medium|low"
    }}
  ],
  "total_sentences": <jumlah kalimat>,
  "flagged_count": <jumlah yang di-flag>
}}"""

        try:
            llm_result = self._call_llm(prompt, memory=kwargs.get("memory"))
            try:
                parsed = json.loads(llm_result)
                return {
                    "paraId": paragraph_id,
                    "flags": parsed.get("claims_needing_citation", []),
                    "total_sentences": parsed.get("total_sentences", 0),
                    "flagged_count": parsed.get("flagged_count", 0),
                }
            except json.JSONDecodeError:
                return {
                    "paraId": paragraph_id,
                    "flags": [],
                    "raw_analysis": llm_result,
                }
        except Exception as e:
            logger.error(f"Error auto_flag_claims: {e}")
            return {"paraId": paragraph_id, "flags": [], "error": str(e)}

    # ── Executor Interface ──────────────────────────────────────────

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
            "analyze_for_missing_citations": self._dispatch_analyze_citations,
            "check_golden_thread": self._dispatch_golden_thread,
            "auto_flag_claims": self._dispatch_auto_flag,
            "verify_citations": self._dispatch_verify_citations,
        }

        if tool_name not in tools_map:
            raise ValueError(f"Tool '{tool_name}' not found in DiagnosticAgent")

        try:
            return tools_map[tool_name](input_data, params, memory)
        except Exception as e:
            logger.error(f"Error in Diagnostic tool '{tool_name}': {e}")
            return {"error": str(e)}

    def _dispatch_analyze_citations(self, input_data, params, memory):
        if isinstance(input_data, str):
            return self.analyze_for_missing_citations(paragraphs=input_data, memory=memory)
        if isinstance(input_data, list):
            return self.analyze_for_missing_citations(paragraphs=input_data, memory=memory)
        # Try to get paragraphs from memory context
        if memory and hasattr(memory, "request_context"):
            paras = memory.request_context.get("active_paragraphs", [])
            if paras:
                return self.analyze_for_missing_citations(paragraphs=paras, memory=memory)
        return self.analyze_for_missing_citations(paragraphs=str(input_data), memory=memory)

    def _dispatch_golden_thread(self, input_data, params, memory):
        if isinstance(input_data, dict):
            return self.check_golden_thread(
                bab1_rq=input_data.get("bab1_rq", params.get("bab1_rq", "")),
                bab4_findings=input_data.get("bab4_findings", params.get("bab4_findings", "")),
                bab5_conclusion=input_data.get("bab5_conclusion", params.get("bab5_conclusion", "")),
                memory=memory,
            )
        return self.check_golden_thread(
            bab1_rq=params.get("bab1_rq", ""),
            bab4_findings=params.get("bab4_findings", str(input_data)),
            bab5_conclusion=params.get("bab5_conclusion", ""),
            memory=memory,
        )

    def _dispatch_auto_flag(self, input_data, params, memory):
        if isinstance(input_data, dict):
            return self.auto_flag_claims(
                paragraph_id=input_data.get("paragraph_id", params.get("paragraph_id", "")),
                text=input_data.get("text", params.get("text", "")),
                memory=memory,
            )
        return self.auto_flag_claims(
            paragraph_id=params.get("paragraph_id", ""),
            text=str(input_data),
            memory=memory,
        )

    def _dispatch_verify_citations(self, input_data, params, memory):
        text = params.get("text", "")
        if not text and isinstance(input_data, str):
            text = input_data
        
        # Fallback ke editor context di memory jika teks sangat pendek (misal: "tolong cek sitasi")
        if len(text.strip()) < 100 and memory and hasattr(memory, "request_context"):
            paras = memory.request_context.get("active_paragraphs", [])
            if paras:
                editor_text = "\n\n".join(p.get("content", "") for p in paras if "content" in p)
                if editor_text.strip():
                    text = text + "\n\n[EDITOR CONTEXT]:\n" + editor_text

        return self.verify_citations(text=text, memory=memory)

    # ── Tool 4: Verify Citations ────────────────────────────────────

    def verify_citations(self, text: str, **kwargs) -> Dict[str, Any]:
        """
        Memverifikasi integritas sitasi dalam teks menggunakan OpenAlex API.
        Mengekstrak sitasi dan mem-flag sebagai PLAUSIBLE, SUSPICIOUS, atau HALLUCINATED.
        """
        if not text.strip():
            return {"citations": [], "message": "Teks kosong."}
            
        prompt = f"""Ekstrak semua sitasi akademik asli (berupa nama penulis dan tahun) dari teks berikut.
DILARANG keras mengarang atau membuat-buat referensi yang tidak ada di dalam teks tersebut!
Beri output JSON ONLY. Jangan berikan teks lain selain JSON.

TEKS:
{text}

OUTPUT (JSON ONLY):
{{
  "citations": [
    {{
      "author": "Nama Penulis Utama (kunci)",
      "year": "Tahun",
      "context": "kalimat tempat sitasi ini berada"
    }}
  ]
}}"""
        try:
            llm_result = self._call_llm(prompt, memory=kwargs.get("memory"))
            llm_result = llm_result.strip()
            
            # Robust JSON extraction: cari kurung kurawal pertama dan terakhir
            start_idx = llm_result.find('{')
            end_idx = llm_result.rfind('}')
            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                json_str = llm_result[start_idx:end_idx+1]
            else:
                json_str = llm_result
                
            parsed = json.loads(json_str)
            citations = parsed.get("citations", [])
        except Exception as e:
            logger.warning(f"Groq failed mapping JSON, trying fallback to larger Llama model: {e}")
            if self.api_key:
                try:
                    import litellm
                    fallback_response = litellm.completion(
                        model="groq/llama-3.3-70b-versatile",
                        messages=[{"role": "user", "content": prompt}],
                        api_key=self.api_key,
                        max_tokens=1200,
                        temperature=0.1
                    )
                    llm_result = fallback_response.choices[0].message.content.strip()
                    start_idx = llm_result.find('{')
                    end_idx = llm_result.rfind('}')
                    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                        json_str = llm_result[start_idx:end_idx+1]
                    else:
                        json_str = llm_result
                    
                    try:
                        parsed = json.loads(json_str)
                        citations = parsed.get("citations", [])
                    except Exception as parse_e:
                        with open("debug_fallback.log", "a") as f:
                            f.write(f"Fallback Parse Error: {parse_e}\nRaw String: {json_str}\n\n")
                        raise parse_e
                        
                except Exception as e2:
                    logger.error(f"Fallback Llama 70B also failed: {e2}")
                    with open("debug_fallback.log", "a") as f:
                        f.write(f"Fallback Execution Error: {e2}\n")
                    return {"citations": [], "error": "Gagal mengekstrak sitasi."}
            else:
                logger.error(f"Failed to parse citations from LLM: {e}")
                logger.error(f"Raw LLM Output: {llm_result}")
                return {"citations": [], "error": "Gagal mengekstrak sitasi."}

            
        import requests
        results = []
        for cite in citations:
            author = cite.get("author", "")
            year = cite.get("year", "")
            context = cite.get("context", "")
            
            if not author or not year:
                continue
                
            query = f"{author} {year}"
            status = "SUSPICIOUS"
            reason = "Format sitasi tidak lengkap."
            
            try:
                resp = requests.get(
                    "https://api.openalex.org/works",
                    params={"search": query, "per-page": 3, "mailto": "admin@onthesis.com"},
                    timeout=10
                )
                if resp.status_code == 200:
                    data = resp.json()
                    works = data.get("results", [])
                    if works:
                        match_found = False
                        for w in works:
                            w_year = str(w.get("publication_year", ""))
                            authorships = w.get("authorships", [])
                            author_names = [a.get("author", {}).get("display_name", "").lower() for a in authorships]
                            
                            if str(year) in w_year or any(author.lower() in an for an in author_names):
                                match_found = True
                                break
                                
                        if match_found:
                            status = "PLAUSIBLE"
                            reason = "Ditemukan kecocokan di database OpenAlex."
                        else:
                            status = "SUSPICIOUS"
                            reason = "Ditemukan paper mirip, tapi penulis/tahun tidak persis cocok."
                    else:
                        status = "HALLUCINATED"
                        reason = f"Tidak ada paper yang cocok di OpenAlex untuk '{author} {year}'."
            except Exception as e:
                logger.warning(f"OpenAlex verification failed for {query}: {e}")
                status = "SUSPICIOUS"
                reason = "Gagal memverifikasi ke database eksternal API."
                
            results.append({
                "author": author,
                "year": year,
                "context": context,
                "status": status,
                "reason": reason
            })
            
        return {
            "total_checked": len(results),
            "citations": results
        }
