import os
import json
import logging
import re
from typing import Dict, Any, Optional, Callable, List

from .agent_registry import AgentRegistry
from .intent_classifier import IntentClassifier
from .task_planner import TaskPlanner, TaskPlan
from .plan_executor import PlanExecutor
from .memory_system import SharedMemory, QdrantVectorDB, FirestoreDocumentDB

# Configurasi logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SUPERVISOR_SYSTEM_PROMPT = """
You are the Supervisor Agent for OnThesis, an AI Thesis Copilot designed to help Indonesian university students write, research, and improve their thesis.

Your job is to:
1. Understand what the user wants
2. Decide which agent or tool should handle it
3. Combine results into a clean, helpful response

---

CONTEXT YOU WILL RECEIVE:
- user_profile: thesis topic, field, writing style, citation style, language preference
- conversation_history: last 6 messages
- relevant_thesis_sections: parts of their thesis draft related to current query
- known_papers: papers already found in previous searches

---

ROUTING RULES:
- If the task involves finding papers, reading abstracts, or building a literature review → route to Research Agent
- If the task involves rewriting, paraphrasing, expanding, or improving text → route to Writing Agent
- If the task involves checking logic, argument strength, coherence, or scoring → route to Analysis Agent
- If the task is simple and conversational → answer directly without routing

---

IMPORTANT CONSTRAINTS:
- Never make up citations. Only use papers from the research memory or tools.
- If you receive JSON output from the Citation Verifier tool (status PLAUSIBLE, SUSPICIOUS, HALLUCINATED), explain it clearly to the user EXACTLY as it is in the JSON. Never invent or add new papers like "Smith (2023)".
- Always respond in the user's preferred language (check user_profile.preferred_language)
- Never loop more than 4 steps to complete a task
- If you are unsure about the user's intent, ask ONE clarifying question. Do not guess and proceed.
- Keep your tone helpful, direct, and academic — like a knowledgeable thesis supervisor

---

OUTPUT FORMAT:
Always end your response with a brief note if there are next steps the user should take.
Example: "Langkah berikutnya: kamu bisa minta saya untuk expand bagian gap penelitian, atau langsung ke penulisan Bab 2."

{memory_context}
"""

MEMORY_CONTEXT_INJECTOR_TEMPLATE = """
=== PROJECT CONTEXT ===
Judul Tesis: {project_title}
Rumusan Masalah: {project_problem}
Metodologi: {project_method}

=== USER PROFILE ===
- Thesis topic  : {topic}
- Field         : {field}
- Writing style : {writing_style}
- Language      : {language}
- Citation style: {citation_style}

=== DRAFT & REFERENCES ===
Relevant thesis sections already written:
{relevant_thesis_sections}

Papers already found for this topic:
{known_papers_summary}
=== END CONTEXT ===
"""

class SupervisorAgent:
    """
    Supervisor Agent berperan sebagai entry point interaksi dengan User.
    Ia melakukan memori injection context, klasifikasi intent, generate planning, 
    eksekusi oleh agent worker, dan pengembalian respon final yang disempurnakan.
    """
    
    def __init__(self):
        # Load environment setting LLMs
        self.api_key = os.environ.get("LLM_API_KEY")
        self.model = os.environ.get("SUPERVISOR_AGENT_MODEL", "groq/llama-3.1-8b-instant")
        
        if not self.api_key:
            logger.warning("LLM_API_KEY is not set. Final response synthesis will be mocked.")
            
        # Core Components Initialization
        self.registry = AgentRegistry()
        
        # Activating Qdrant for memory scope
        self.vector_db = QdrantVectorDB()
        self.doc_db = FirestoreDocumentDB()
        
        # 2. Intent Classifier
        self.classifier = IntentClassifier(confidence_threshold=0.7)
        
        # 3. Task Planner
        self.planner = TaskPlanner()
        
    def _format_memory_context(self, context: Dict[str, Any]) -> str:
        """Format context dictionary into string template for LLM injection."""
        prof = context.get('user_profile', {})
        req_ctx = context.get('request_context', {})
        return MEMORY_CONTEXT_INJECTOR_TEMPLATE.format(
            project_title=req_ctx.get('context_title', 'Belum diatur'),
            project_problem=req_ctx.get('context_problem', 'Belum diatur'),
            project_method=req_ctx.get('context_method', 'Belum diatur'),
            topic=prof.get('thesis_topic', ''),
            field=prof.get('field', ''),
            writing_style=prof.get('writing_style', ''),
            language=prof.get('preferred_language', 'id'),
            citation_style=prof.get('citation_style', 'APA'),
            relevant_thesis_sections=context.get('relevant_thesis_sections', 'Belum ada draft tersimpan.'),
            known_papers_summary=context.get('known_papers_summary', 'Belum ada paper tersimpan untuk topik ini.')
        )

    def _humanize_final_output(self, raw_output: Any) -> str:
        """Convert internal dict/tool payloads into human-readable assistant text."""
        if isinstance(raw_output, str):
            return raw_output

        if isinstance(raw_output, dict):
            diff = raw_output.get("diff")
            if isinstance(diff, dict):
                action = {
                    "insert": "menyiapkan draft baru",
                    "edit": "menyiapkan revisi paragraf",
                    "delete": "menyiapkan penghapusan paragraf",
                }.get(diff.get("type"), "menyiapkan perubahan")
                target = diff.get("paraId") or diff.get("anchorId") or "editor aktif"
                reason = str(diff.get("reason", "")).strip()
                message = f"Saya sudah {action} untuk {target}."
                if reason:
                    message += f"\n\nFokus perubahan: {reason}"
                message += "\n\nSilakan review perubahan yang muncul di panel editor, lalu accept jika sudah sesuai."
                return message

            message = raw_output.get("message")
            if isinstance(message, str) and message.strip():
                return message.strip()

            output = raw_output.get("output")
            if isinstance(output, str) and output.strip():
                return output.strip()

            if raw_output.get("success") is True:
                return "Permintaan sudah diproses. Silakan cek hasil yang muncul di panel agent dan editor."

            if raw_output.get("error"):
                return f"Terjadi kendala saat memproses hasil agen: {raw_output.get('error')}"

        return str(raw_output or "")

    def _build_edit_pipeline_failure_response(self, error: Exception, context: Optional[Dict[str, Any]]) -> str:
        """
        Best-effort response when the edit pipeline cannot safely complete.
        """
        logger.error("Edit pipeline failed: %s", error)

        has_editor_context = bool((context or {}).get("active_paragraphs"))
        if has_editor_context:
            return (
                "Saya belum berhasil menjalankan revisi editor lewat pipeline baru untuk permintaan ini. "
                "Tidak ada perubahan yang diterapkan ke editor. Coba gunakan instruksi yang lebih spesifik "
                "seperti rewrite atau paraphrase paragraf aktif."
            )

        return (
            "Saya belum berhasil memproses permintaan edit ini lewat pipeline baru. "
            "Tidak ada perubahan yang diterapkan. Coba ulangi dengan konteks editor yang aktif atau instruksi yang lebih spesifik."
        )

    def _record_exchange(
        self,
        memory: SharedMemory,
        user_message: str,
        intent: str,
        assistant_message: str,
        plan_id: Optional[str] = None,
    ) -> None:
        if not memory or not hasattr(memory, "conversation"):
            return
        memory.conversation.add_turn(
            role="user",
            content=user_message,
            intent=intent,
            plan_id=plan_id,
        )
        memory.conversation.add_turn(
            role="assistant",
            content=assistant_message,
            intent=intent,
            plan_id=plan_id,
        )

    def _record_user_turn(
        self,
        memory: SharedMemory,
        user_message: str,
        intent: str,
        plan_id: Optional[str] = None,
    ) -> None:
        if not memory or not hasattr(memory, "conversation"):
            return
        memory.conversation.add_turn(
            role="user",
            content=user_message,
            intent=intent,
            plan_id=plan_id,
        )

    def _record_planned_exchange(
        self,
        executor: Any,
        memory: SharedMemory,
        user_message: str,
        intent: str,
        assistant_message: str,
        plan: Optional[TaskPlan],
    ) -> None:
        """
        Simpan user turn terpisah, lalu delegasikan commit assistant turn + plan
        ke executor agar tidak terjadi double write.
        """
        plan_id = getattr(plan, "plan_id", getattr(plan, "id", None)) if plan else None
        self._record_user_turn(memory, user_message, intent, plan_id=plan_id)

        if not memory or not hasattr(memory, "conversation") or not plan:
            return

        conversation = memory.conversation
        if executor and hasattr(executor, "_commit_plan_result"):
            executor._commit_plan_result(conversation, plan, assistant_message)
            if getattr(executor, "plan_result_commit_attempted", False):
                return

        try:
            if hasattr(conversation, "add_plan"):
                conversation.add_plan(plan, assistant_message)
            else:
                raise AttributeError("Conversation object does not support atomic add_plan(plan, result)")
        except Exception as commit_error:
            logger.error(f"Fallback planned exchange commit failed: {commit_error}")

    def _synthesize_final_response(self, raw_output: str, context: str) -> str:
        """
        Menyintesis final response ke bentuk yang lebih rapi menggunakan LLM 
        sesuai gaya Supervisor dan OUTPUT FORMAT rules. Falback ke Gemini jika RateLimit.
        """
        if isinstance(raw_output, dict):
            raw_output = self._humanize_final_output(raw_output)

        if not self.api_key:
            return raw_output
            
        import litellm
        from litellm.exceptions import RateLimitError
        fallback_api_key = os.environ.get("GEMINI_API_KEY")
        fallback_model = "gemini/gemini-2.5-flash"

        sys_prompt = SUPERVISOR_SYSTEM_PROMPT.replace("{memory_context}", context)
        
        try:
            logger.info(f"| DEBUG | Supervisor -> Mencoba Primary: {self.model}")
            response = litellm.completion(
                model=self.model,
                messages=[
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": f"Please synthesize and refine this agent output into a proper supervisor response:\n\n{raw_output}"}
                ],
                api_key=self.api_key
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.info(f"| DEBUG | Supervisor -> Primary Limit! Error: {str(e)}")
            logger.info(f"| DEBUG | Supervisor -> Mencoba Fallback: {fallback_model}")
            logger.warning(f"RateLimit hit pada Supervisor LLM Primary, fallback ke {fallback_model}...")
            if not fallback_api_key:
                return raw_output
            try:
                response = litellm.completion(
                    model=fallback_model,
                    messages=[
                        {"role": "system", "content": sys_prompt},
                        {"role": "user", "content": f"Please synthesize and refine this agent output into a proper supervisor response:\n\n{raw_output}"}
                    ],
                    api_key=fallback_api_key
                )
                logger.info(f"| DEBUG | Supervisor -> Fallback Sukses ({fallback_model})")
                return response.choices[0].message.content
            except Exception as fallback_e:
                logger.error(f"| DEBUG | Supervisor -> Fallback Gagal! Error: {str(fallback_e)}")
                return raw_output

    def _answer_general_question(self, user_message: str, context: str) -> str:
        """Menjawab pertanyaan umum menggunakan LLM Supervisor dengan context lengkap."""
        if not self.api_key:
            return "Maaf, API Key tidak tersedia untuk menjawab pertanyaan."
            
        import litellm
        from litellm.exceptions import RateLimitError
        fallback_api_key = os.environ.get("GEMINI_API_KEY")
        fallback_model = "gemini/gemini-2.5-flash"

        sys_prompt = SUPERVISOR_SYSTEM_PROMPT.replace("{memory_context}", context)
        
        try:
            response = litellm.completion(
                model=self.model,
                messages=[
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": user_message}
                ],
                api_key=self.api_key
            )
            return response.choices[0].message.content
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"RateLimit hit pada Supervisor LLM Primary, fallback ke {fallback_model}...")
            if not fallback_api_key:
                return "Maaf, sistem sedang sibuk (Rate Limit). Coba lagi nanti."
            try:
                response = litellm.completion(
                    model=fallback_model,
                    messages=[
                        {"role": "system", "content": sys_prompt},
                        {"role": "user", "content": user_message}
                    ],
                    api_key=fallback_api_key
                )
                return response.choices[0].message.content
            except Exception as fallback_e:
                return "Maaf, gagal menjawab pertanyaan saat ini."

    def _handle_conversational(self, user_message: str, context: str) -> str:
        """Fallback untuk chat intent (conversational) bypassing planner/executor."""
        return self._answer_general_question(user_message, context)

    def _needs_thesis_tools(self, user_message: str, context: Optional[Dict[str, Any]]) -> bool:
        if not isinstance(context, dict):
            return False
        has_editor_context = bool(context.get("active_paragraphs")) or bool(context.get("references_text")) or bool(context.get("references_raw"))
        if not has_editor_context:
            return False
        msg = (user_message or "").lower()
        keywords = [
            "paragraf", "revisi", "edit", "perbaiki", "ubah", "hapus", "tambahkan",
            "sisip", "insert", "chapter", "bab", "sitasi", "referensi", "kutipan",
        ]
        return any(k in msg for k in keywords)

    def _emit(self, on_event: Optional[Callable[[str, Dict[str, Any]], None]], event_type: str, data: Dict[str, Any]):
        if not on_event:
            return
        try:
            on_event(event_type, data)
        except Exception as emit_error:
            logger.warning(f"Gagal mengirim event {event_type}: {emit_error}")

    def _is_lightweight_greeting(self, message: str) -> bool:
        msg = (message or "").strip().lower()
        if not msg:
            return False
        lightweight_greetings = {
            "halo", "hai", "hi", "hello", "pagi", "siang", "sore", "malam",
            "halo agent", "hai agent", "hi agent", "hey", "ping",
        }
        return msg in lightweight_greetings

    def _is_lightweight_general_question(self, message: str, context: Optional[Dict[str, Any]]) -> bool:
        msg = (message or "").strip().lower()
        if not msg:
            return False
        # Hindari shortcut ini kalau ada konteks editor aktif karena biasanya user ingin
        # pertanyaan yang grounded ke draft aktif, bukan jawaban generik.
        if isinstance(context, dict) and context.get("active_paragraphs"):
            return False
        imperative_markers = (
            "buat", "bikin", "tulis", "susun", "generate", "perbaiki", "revisi",
            "parafrase", "paraphrase", "expand", "lanjutkan", "cari", "carikan",
        )
        if any(marker in msg for marker in imperative_markers):
            return False
        question_markers = (
            "bagaimana", "gimana", "apa itu", "apa ", "kenapa", "mengapa",
            "jelaskan", "how", "why", "what",
        )
        thesis_terms = (
            "skripsi", "tesis", "abstrak", "rumusan masalah", "tujuan penelitian",
            "sitasi", "metodologi", "bab 1", "bab 2", "bab 3", "bab 4", "bab 5",
            "literature review", "tinjauan pustaka",
        )
        word_count = len(msg.split())
        return word_count <= 14 and any(marker in msg for marker in question_markers) and any(term in msg for term in thesis_terms)

    def _build_minimal_context(self, context: Optional[Dict[str, Any]]) -> str:
        req_ctx = context or {}
        return MEMORY_CONTEXT_INJECTOR_TEMPLATE.format(
            project_title=req_ctx.get('context_title', 'Belum diatur'),
            project_problem=req_ctx.get('context_problem', 'Belum diatur'),
            project_method=req_ctx.get('context_method', 'Belum diatur'),
            topic=req_ctx.get('context_title', ''),
            field='',
            writing_style='academic formal',
            language='id',
            citation_style='APA',
            relevant_thesis_sections='Belum ada konteks draft yang dipakai untuk fast-path.',
            known_papers_summary='Belum ada paper yang diambil pada fast-path ini.',
        )

    def _resolve_runtime_mode(self, context: Optional[Dict[str, Any]]) -> str:
        req_ctx = context or {}
        raw_mode = (
            req_ctx.get("_mode")
            or req_ctx.get("requestedTask")
            or req_ctx.get("mode")
            or "writing"
        )
        return str(raw_mode).strip().lower()

    def _extract_primary_text(self, user_message: str, context: Optional[Dict[str, Any]]) -> str:
        req_ctx = context or {}
        active_paragraphs = req_ctx.get("active_paragraphs") or []
        paragraph_texts = []
        for paragraph in active_paragraphs:
            if isinstance(paragraph, dict):
                content = str(paragraph.get("content", "")).strip()
                if content:
                    paragraph_texts.append(content)
        if paragraph_texts:
            return "\n\n".join(paragraph_texts)
        references_text = str(req_ctx.get("references_text", "")).strip()
        if references_text:
            return references_text
        return str(user_message or "").strip()

    def _extract_json_payload(self, raw_text: Any) -> Optional[Dict[str, Any]]:
        if isinstance(raw_text, dict):
            return raw_text
        if not isinstance(raw_text, str):
            return None
        cleaned = re.sub(r"```(?:json)?\s*|\s*```", "", raw_text).strip()
        if not cleaned:
            return None
        try:
            parsed = json.loads(cleaned)
            return parsed if isinstance(parsed, dict) else None
        except Exception:
            return None

    def _call_supervisor_llm(self, user_prompt: str, context: str, temperature: float = 0.3) -> str:
        if not self.api_key:
            return ""

        import litellm

        fallback_api_key = os.environ.get("GEMINI_API_KEY")
        fallback_model = "gemini/gemini-2.5-flash"
        sys_prompt = SUPERVISOR_SYSTEM_PROMPT.replace("{memory_context}", context)

        try:
            response = litellm.completion(
                model=self.model,
                messages=[
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                api_key=self.api_key,
                temperature=temperature,
            )
            return response.choices[0].message.content
        except Exception as primary_error:
            logger.warning(f"Supervisor special-mode primary failed, fallback to {fallback_model}: {primary_error}")
            if not fallback_api_key:
                return ""
            try:
                response = litellm.completion(
                    model=fallback_model,
                    messages=[
                        {"role": "system", "content": sys_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    api_key=fallback_api_key,
                    temperature=temperature,
                )
                return response.choices[0].message.content
            except Exception as fallback_error:
                logger.warning(f"Supervisor special-mode fallback failed: {fallback_error}")
                return ""

    def _format_critique_response(
        self,
        score_data: Optional[Dict[str, Any]],
        coherence_data: Optional[Dict[str, Any]],
        citation_data: Optional[Dict[str, Any]],
        golden_thread_data: Optional[Dict[str, Any]],
        llm_summary: str = "",
    ) -> str:
        lines: List[str] = ["**Critique Akademik**"]

        scores = (score_data or {}).get("scores", {}) if isinstance(score_data, dict) else {}
        overall = (score_data or {}).get("overall")
        strengths = list((score_data or {}).get("strengths", []) or [])
        improvements = list((score_data or {}).get("improvements", []) or [])

        if scores:
            score_parts = []
            for key in ("clarity", "argument", "academic_tone", "structure", "originality"):
                if key in scores:
                    score_parts.append(f"{key}={scores[key]}")
            if score_parts:
                overall_suffix = f", overall={overall}" if overall is not None else ""
                lines.append("Skor: " + ", ".join(score_parts) + overall_suffix)

        if strengths:
            lines.append("Kekuatan utama: " + "; ".join(str(strength) for strength in strengths[:3]))

        if improvements:
            lines.append("Prioritas revisi: " + "; ".join(str(item) for item in improvements[:4]))

        transitions = (coherence_data or {}).get("transitions", []) if isinstance(coherence_data, dict) else []
        transition_issues = [
            str(item.get("issue", "")).strip()
            for item in transitions
            if isinstance(item, dict) and str(item.get("issue", "")).strip()
        ]
        if transition_issues:
            lines.append("Isu struktur: " + "; ".join(transition_issues[:3]))

        if isinstance(citation_data, dict) and citation_data.get("claims_without_citation"):
            lines.append(
                f"Temuan sitasi: {citation_data.get('claims_without_citation')} klaim masih membutuhkan referensi tambahan."
            )

        if isinstance(golden_thread_data, dict) and golden_thread_data.get("coherent") is False:
            warnings = golden_thread_data.get("warnings", []) or []
            if warnings:
                warning_text = "; ".join(str(warning.get("issue", warning)) for warning in warnings[:3])
                lines.append("Benang merah: " + warning_text)

        if llm_summary:
            lines.append("")
            lines.append(llm_summary.strip())

        if len(lines) == 1:
            lines.append("Belum ada temuan spesifik yang bisa dipastikan dari validator. Coba beri potongan teks atau paragraf aktif yang lebih jelas.")

        lines.append("")
        lines.append("Langkah berikutnya: jika mau, saya bisa ubah critique ini langsung menjadi revisi paragraf yang lebih kuat.")
        return "\n".join(lines)

    def _run_special_mode(
        self,
        mode: str,
        memory: SharedMemory,
        user_message: str,
        agent_context: Dict[str, Any],
    ) -> str:
        req_ctx = getattr(memory, "request_context", {}) or {}
        formatted_context = self._format_memory_context(agent_context)
        source_text = self._extract_primary_text(user_message, req_ctx)
        active_paragraphs = req_ctx.get("active_paragraphs") or []
        registry_getter = getattr(self.registry, "get_agent", None)
        analysis_agent = registry_getter("analysis_agent") if callable(registry_getter) else None
        diagnostic_agent = registry_getter("diagnostic_agent") if callable(registry_getter) else None

        if mode == "critique":
            score_data = None
            coherence_data = None
            citation_data = None
            golden_thread_data = None

            if analysis_agent and source_text:
                score_data = self._extract_json_payload(
                    analysis_agent.score_thesis_quality(source_text, memory=memory)
                )
                coherence_data = self._extract_json_payload(
                    analysis_agent.check_coherence(source_text, memory=memory)
                )

            if diagnostic_agent and source_text:
                paragraph_input = active_paragraphs if active_paragraphs else source_text
                with_citation_memory = diagnostic_agent.analyze_for_missing_citations(
                    paragraph_input,
                    memory=memory,
                )
                if isinstance(with_citation_memory, dict):
                    citation_data = with_citation_memory

                golden_thread = req_ctx.get("golden_thread", {}) if isinstance(req_ctx.get("golden_thread", {}), dict) else {}
                if golden_thread or req_ctx.get("context_problem"):
                    golden_thread_data = diagnostic_agent.check_golden_thread(
                        bab1_rq=golden_thread.get("researchQuestion", req_ctx.get("context_problem", "")),
                        bab4_findings=golden_thread.get("findings", source_text),
                        bab5_conclusion=golden_thread.get("conclusion", source_text),
                        memory=memory,
                    )

            llm_summary = self._call_supervisor_llm(
                (
                    "Berikan kritik akademik yang tajam namun konstruktif untuk materi berikut. "
                    "Fokus pada logika argumen, kualitas akademik, struktur, dan prioritas revisi. "
                    "Jawab ringkas dalam Bahasa Indonesia.\n\n"
                    f"MATERI:\n{source_text}"
                ),
                formatted_context,
                temperature=0.2,
            )
            return self._format_critique_response(
                score_data=score_data,
                coherence_data=coherence_data,
                citation_data=citation_data,
                golden_thread_data=golden_thread_data,
                llm_summary=llm_summary,
            )

        if mode == "concept_map":
            prompt = (
                "Buat peta konsep tekstual dari materi berikut. "
                "Gunakan format node dan relasi yang mudah dibaca, tunjukkan hubungan sebab-akibat atau hierarki konsep, "
                "dan tutup dengan 2-3 insight tentang gap atau koneksi yang paling penting.\n\n"
                f"MATERI:\n{source_text}"
            )
            response = self._call_supervisor_llm(prompt, formatted_context, temperature=0.2)
            if response:
                return response
            return (
                "**Concept Map**\n"
                f"- Topik inti: {req_ctx.get('context_title') or 'Tesis aktif'}\n"
                f"- Masalah utama: {req_ctx.get('context_problem') or 'Belum terdefinisi'}\n"
                f"- Materi sumber: {source_text[:500]}\n\n"
                "Langkah berikutnya: saya bisa ubah peta konsep ini menjadi outline Bab 2 atau kerangka presentasi."
            )

        if mode == "mind_map":
            prompt = (
                "Buat mind map tekstual yang ringkas dan hierarkis dari materi berikut. "
                "Gunakan struktur bullet tree yang rapi: ide pusat -> cabang utama -> detail penting. "
                "Tutup dengan saran cabang yang masih kurang.\n\n"
                f"MATERI:\n{source_text}"
            )
            response = self._call_supervisor_llm(prompt, formatted_context, temperature=0.25)
            if response:
                return response
            return (
                "**Mind Map**\n"
                f"- Ide pusat: {req_ctx.get('context_title') or 'Topik penelitian'}\n"
                f"- Cabang 1: {req_ctx.get('context_problem') or 'Rumusan masalah'}\n"
                f"- Cabang 2: {req_ctx.get('context_method') or 'Metodologi'}\n"
                f"- Cabang 3: {source_text[:280]}\n\n"
                "Langkah berikutnya: saya bisa turunkan mind map ini menjadi subbab atau daftar slide."
            )

        if mode == "sidang_simulation":
            prompt = (
                "Simulasikan mini sidang skripsi berdasarkan konteks berikut. "
                "Berikan 3 pertanyaan penguji yang realistis dan menantang, lalu untuk masing-masing sertakan jawaban ideal singkat "
                "serta satu follow-up risk yang perlu diwaspadai mahasiswa. "
                "Jawab dalam Bahasa Indonesia.\n\n"
                f"MATERI:\n{source_text}"
            )
            response = self._call_supervisor_llm(prompt, formatted_context, temperature=0.45)
            if response:
                return response
            return (
                "**Simulasi Sidang Singkat**\n"
                "1. Apa urgensi utama penelitian ini?\n"
                "Jawaban ideal: jelaskan gap penelitian, dampak praktis, dan alasan metodologi dipilih.\n"
                "2. Mengapa metode yang dipakai paling tepat?\n"
                "Jawaban ideal: hubungkan desain riset dengan karakter data dan tujuan penelitian.\n"
                "3. Apa kontribusi temuan terhadap rumusan masalah?\n"
                "Jawaban ideal: jawab tiap rumusan masalah secara eksplisit dan konsisten.\n\n"
                "Langkah berikutnya: saya bisa lanjutkan dengan sesi tanya-jawab sidang yang lebih agresif per peran penguji."
            )

        return ""

    def process_request(
        self,
        user_id: str,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        on_event: Optional[Callable[[str, Dict[str, Any]], None]] = None,
    ) -> str:
        """
        Entry point utama untuk query User.
        Alur (End-to-End Flow): context -> classify -> plan -> execute -> fallback memory
        """
        logger.info(f"== User [{user_id}] == Request: {message[:50]}...")
        project_id = (context or {}).get("projectId")
        if not project_id:
            raise ValueError("SupervisorAgent.process_request requires context.projectId")

        # Fast path untuk greeting ringan agar tidak memicu retrieval memory/vector search
        # yang tidak diperlukan.
        if self._is_lightweight_greeting(message):
            memory = SharedMemory(user_id, project_id, self.vector_db, self.doc_db)
            memory.request_context = context or {}
            response = "Halo! Ada yang bisa saya bantu dengan penulisan skripsi atau riset Anda hari ini?"
            self._record_exchange(memory, message, "greeting", response)
            self._emit(on_event, "TEXT_DELTA", {"delta": response})
            return response

        if self._is_lightweight_general_question(message, context):
            memory = SharedMemory(user_id, project_id, self.vector_db, self.doc_db)
            memory.request_context = context or {}
            response = self._answer_general_question(message, self._build_minimal_context(context))
            self._record_exchange(memory, message, "general_question", response)
            self._emit(on_event, "TEXT_DELTA", {"delta": response})
            return response

        self._emit(on_event, "STEP", {"step": "planning", "message": "Menganalisis permintaan..."})
        
        # Initialize memory and executor dynamically per request
        memory = SharedMemory(user_id, project_id, self.vector_db, self.doc_db)
        memory.request_context = context or {}
        # 1. Update profil dasar dari text message if any (Mock implementation di memory_system)
        memory.profile.update_from_conversation(user_id, message)

        # 2. Build Memory Context Injector
        agent_context = memory.build_agent_context(message)
        if context:
            agent_context["request_context"] = context
        request_messages = (context or {}).get("messages_history") or []
        if isinstance(request_messages, list) and request_messages:
            merged_history = []
            for item in request_messages[-6:]:
                if isinstance(item, dict) and item.get("role") and item.get("content"):
                    merged_history.append({"role": item["role"], "content": item["content"]})
            if merged_history:
                memory_history = agent_context.get("conversation_history", [])
                agent_context["conversation_history"] = (memory_history + merged_history)[-6:]
        formatted_context_str = self._format_memory_context(agent_context)
        runtime_mode = self._resolve_runtime_mode(context)

        if runtime_mode in {"critique", "concept_map", "mind_map", "sidang_simulation"}:
            mode_labels = {
                "critique": "Menganalisis kritik akademik...",
                "concept_map": "Menyusun concept map...",
                "mind_map": "Menyusun mind map...",
                "sidang_simulation": "Menyiapkan simulasi sidang...",
            }
            self._emit(on_event, "STEP", {"step": "planning", "message": mode_labels.get(runtime_mode, "Memproses mode khusus...")})
            special_response = self._run_special_mode(runtime_mode, memory, message, agent_context)
            if not special_response.strip():
                special_response = "Mode khusus ini belum menghasilkan output. Coba kirim konteks atau materi yang lebih spesifik."
            self._record_exchange(memory, message, runtime_mode, special_response)
            self._emit(on_event, "TEXT_DELTA", {"delta": special_response})
            return special_response
        
        # 3. Intent Classification
        histori = agent_context.get("conversation_history", [])
        allowed_requested_intents = {"rewrite_paragraph", "paraphrase", "expand_paragraph"}
        requested_intent = str((context or {}).get("requested_intent") or "").strip()
        if requested_intent in allowed_requested_intents and (context or {}).get("source") == "context_menu":
            intent_res = {
                "intent": requested_intent,
                "confidence": 1.0,
                "key_entities": [],
                "needs_clarification": False,
            }
            logger.info(f"Classified intent: {requested_intent} (confidence: 1.0, source: context_menu)")
        else:
            intent_res = self.classifier.classify(message, histori)
        intent = intent_res.get("intent", "unclear")

        # Only use fallback keyword matching if the intent is unclear
        if intent == "unclear" and self._needs_thesis_tools(message, context):
            intent = "edit_thesis"
            intent_res["confidence"] = 0.8
        
        logger.info(f"| DEBUG | Supervisor -> FULL INTENT RES: {intent_res}")
        
        if intent == "greeting":
            logger.info(f"Intent greeting detected. Bypassing planner.")
            response = "Halo! Ada yang bisa saya bantu dengan penulisan skripsi atau riset Anda hari ini?"
            self._record_exchange(memory, message, "greeting", response)
            self._emit(on_event, "TEXT_DELTA", {"delta": response})
            return response

        if intent == "general_question":
            logger.info(f"Intent general_question detected. Bypassing planner.")
            self._emit(on_event, "STEP", {"step": "reviewing", "message": "Merumuskan jawaban..."})
            response = self._answer_general_question(message, formatted_context_str)
            self._record_exchange(memory, message, "general_question", response)
            self._emit(on_event, "TEXT_DELTA", {"delta": response})
            return response


        if intent == "unclear" or intent_res.get("ask_user"):
            logger.info(f"Intent unclear. Details: {intent_res}")
            # Response clarification langsung save turn chat 
            response = intent_res.get("ask_user")
            self._record_exchange(memory, message, "unclear", response)
            self._emit(on_event, "TEXT_DELTA", {"delta": response})
            return response

        logger.info(f"Terkonfirmasi Intent => {intent} (Confidence: {intent_res.get('confidence', 0):.2f})")

        if intent == "edit_thesis":
            logger.info("Intent edit_thesis → routing melalui TaskPlanner pipeline")
            self._emit(on_event, "STEP", {"step": "planning", "message": "Menyusun rencana editing..."})
            try:
                executor = PlanExecutor(agents=self.registry.get_all_agents(), memory=memory, on_event=on_event)
                selected_text = str((context or {}).get("selected_text") or "").strip()
                plan = self.planner.generate_plan(intent, selected_text or message, agent_context)
                if plan.steps:
                    self._emit(on_event, "STEP", {"step": "executing", "message": "Menjalankan rencana editing..."})
                    raw_output = executor.execute(plan)
                    self._emit(on_event, "STEP", {"step": "reviewing", "message": "Menyajikan teks hasil editan..."})
                    final_answer = self._humanize_final_output(raw_output)
                    self._record_planned_exchange(executor, memory, message, intent, str(final_answer), plan)
                    self._emit(on_event, "TEXT_DELTA", {"delta": str(final_answer)})
                    return final_answer
                else:
                    raise ValueError("Plan edit_thesis kosong")
            except Exception as plan_err:
                pipeline_failure = self._build_edit_pipeline_failure_response(plan_err, context)
                self._record_exchange(memory, message, intent, pipeline_failure)
                self._emit(on_event, "TEXT_DELTA", {"delta": pipeline_failure})
                return pipeline_failure
        
        # 4. Filter obrolan general bypass (Opsional, Planner menyediakan fallback logic)
        # Akan dihandle planner kalau general question masuk plan generator
        
        editor_text_intents = {"rewrite_paragraph", "paraphrase", "expand_paragraph", "academic_style", "edit_thesis"}
        selected_text = str((context or {}).get("selected_text") or "").strip()
        planner_input = selected_text if intent in editor_text_intents and selected_text else message

        # 5. Generate Plan
        try:
            plan = self.planner.generate_plan(intent, planner_input, agent_context)
            logger.info(f"Plan generated dengan {len(plan.steps)} langkah.")
            if not plan.steps:
                raise ValueError("Plan generate kosong")
        except Exception as e:
            logger.error(f"Gagal generate task plan: {str(e)}")
            fallback = "Maaf, saya kesulitan memecah instruksimu menjadi format agen. Coba gunakan frasa sederhana."
            self._record_exchange(memory, message, intent, fallback)
            self._emit(on_event, "TEXT_DELTA", {"delta": fallback})
            return fallback

        # 6. Execute Plan
        try:
            executor = PlanExecutor(agents=self.registry.get_all_agents(), memory=memory, on_event=on_event)
            self._emit(on_event, "STEP", {"step": "executing", "message": "Menjalankan rencana agen..."})
            # Executor otomatis menangani simpan memory ke Conversaton Memory setelah success plan 
            raw_output = executor.execute(plan)
        except Exception as e:
            logger.error(f"Gagal saat Task Plan Executor running: {str(e)}")
            raw_output = f"Terjadi kesalahan di sistem saat mengeksekusi agen: {str(e)}"
            
        # 7. Final Response Synthesis (opsional untuk memperhalus output tools)
        skip_synthesis_intents = ["generate_section", "edit_thesis", "paraphrase", "rewrite_paragraph", "expand_paragraph", "academic_style", "thesis_conclusion", "research_gap", "validate_citations"]
        
        if intent in skip_synthesis_intents:
            logger.info(f"Bypassing final synthesis for intent {intent} to preserve raw text format.")
            self._emit(on_event, "STEP", {"step": "reviewing", "message": "Menyajikan hasil akhir..."})
            
            if intent == "validate_citations" and isinstance(raw_output, dict):
                uncited_sentences = raw_output.get("uncited_sentences", [])
                total_sentences = int(raw_output.get("total_sentences") or 0)
                coverage_ratio = float(raw_output.get("coverage_ratio") or 0.0)
                if not raw_output.get("has_uncited_claims"):
                    final_answer = (
                        f"Semua kalimat yang terdeteksi tampak sudah memiliki sitasi. "
                        f"Cakupan sitasi: {coverage_ratio:.0%} dari {total_sentences} kalimat."
                    )
                else:
                    lines = [
                        "**Hasil Validasi Sitasi:**",
                        f"Ditemukan {len(uncited_sentences)} kalimat yang masih membutuhkan sitasi dari total {total_sentences} kalimat.",
                        f"Cakupan sitasi saat ini: {coverage_ratio:.0%}.",
                        "",
                    ]
                    for i, item in enumerate(uncited_sentences, 1):
                        suggestion = str(item.get("suggestion", "")).strip()
                        position = item.get("position", -1)
                        position_label = f"Kalimat #{position + 1}" if isinstance(position, int) and position >= 0 else "Posisi tidak terdeteksi"
                        line = f"{i}. {position_label}: \"{item.get('sentence', '')}\""
                        if suggestion:
                            line += f"\n   Saran: {suggestion}"
                        lines.append(line)
                    final_answer = "\n".join(lines)
            else:
                final_answer = self._humanize_final_output(raw_output)
            self._record_planned_exchange(executor, memory, message, intent, str(final_answer), plan)
            self._emit(on_event, "TEXT_DELTA", {"delta": str(final_answer)})
            return str(final_answer)
        else:
            self._emit(on_event, "STEP", {"step": "reviewing", "message": "Menyusun jawaban akhir..."})
            final_answer = self._synthesize_final_response(raw_output, formatted_context_str)
            self._record_planned_exchange(executor, memory, message, intent, final_answer, plan)
            self._emit(on_event, "TEXT_DELTA", {"delta": final_answer})
            return final_answer
