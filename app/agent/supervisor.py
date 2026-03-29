import os
import json
import logging
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

THESIS_TOOLS_SUPERVISOR_PROMPT = """
Kamu adalah thesis agent yang membantu user menulis tesis.
Gunakan tools yang tersedia untuk membaca, mengedit, dan mencari referensi.
Fokus pada konteks chapter aktif dan referensi proyek.

PENTING UNTUK TOOL CALLING: 
Pastikan semua parameter angka (seperti 'limit' pada pencarian) dikirim sebagai INTEGER murni tanpa tanda kutip (contoh: 5, bukan "5").

Setelah selesai, berikan ringkasan perubahan secara singkat.
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

    def _run_thesis_tools_loop(
        self,
        user_message: str,
        context: Dict[str, Any],
        on_event: Optional[Callable[[str, Dict[str, Any]], None]] = None,
    ) -> str:
        import litellm
        from litellm.exceptions import RateLimitError
        from app.services.thesis_tools import ALL_THESIS_TOOLS

        model = context.get("_llm_model", os.environ.get("SUPERVISOR_AGENT_MODEL", "groq/llama-3.3-70b-versatile"))
        api_key = os.environ.get("GROQ_API_KEY") or os.environ.get("LLM_API_KEY")
        fallback_model = "gemini/gemini-2.5-flash"
        fallback_api_key = os.environ.get("GEMINI_API_KEY")

        # Inject paragraph context into the prompt so the LLM knows the paraIds
        active_paragraphs = context.get("active_paragraphs", [])
        para_context = "\n".join([f"[{p.get('paraId')}] {p.get('content')}" for p in active_paragraphs]) if active_paragraphs else "Tidak ada paragraf aktif."
        
        dynamic_system_prompt = THESIS_TOOLS_SUPERVISOR_PROMPT + f"\n\nDAFTAR PARAGRAF AKTIF SAAT INI (dengan paraId):\n{para_context}\nGunakan ID paragraf di atas untuk melakukan editing, JANGAN berhalusinasi (misal jangan gunakan 'P-abc123')."

        thesis_agent = self.registry.get_agent("thesis_tools_agent")
        conversation: List[Dict[str, Any]] = [{"role": "user", "content": user_message}]
        collected_text: List[str] = []

        for _ in range(4):
            try:
                response = litellm.completion(
                    model=model,
                    messages=[{"role": "system", "content": dynamic_system_prompt}] + conversation,
                    tools=ALL_THESIS_TOOLS,
                    tool_choice="auto",
                    max_tokens=2048,
                    temperature=0.3,
                    timeout=60,
                    api_key=api_key,
                )
            except RateLimitError:
                if not fallback_api_key:
                    raise
                response = litellm.completion(
                    model=fallback_model,
                    messages=[{"role": "system", "content": dynamic_system_prompt}] + conversation,
                    tools=ALL_THESIS_TOOLS,
                    tool_choice="auto",
                    max_tokens=2048,
                    temperature=0.3,
                    timeout=60,
                    api_key=fallback_api_key,
                )

            choice = response.choices[0]
            message = choice.message

            if message.content:
                collected_text.append(message.content)
                self._emit(on_event, "TEXT_DELTA", {"delta": message.content})

            tool_calls = getattr(message, "tool_calls", []) or []
            if not tool_calls or choice.finish_reason == "stop":
                break

            assistant_msg: Dict[str, Any] = {"role": "assistant", "content": message.content or ""}
            assistant_msg["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    },
                }
                for tc in tool_calls
            ]
            conversation.append(assistant_msg)

            for tc in tool_calls:
                tool_name = tc.function.name
                tool_call_id = tc.id
                try:
                    tool_args = json.loads(tc.function.arguments or "{}")
                except json.JSONDecodeError:
                    tool_args = {}

                self._emit(on_event, "TOOL_CALL", {
                    "id": tool_call_id,
                    "tool": tool_name,
                    "args": tool_args,
                })

                result = thesis_agent.run_tool(
                    tool_name=tool_name,
                    input_data=tool_args,
                    params={},
                    context=context,
                )
                self._emit(on_event, "TOOL_RESULT", {
                    "id": tool_call_id,
                    "tool": tool_name,
                    "result": result,
                })

                conversation.append({
                    "role": "tool",
                    "tool_call_id": tool_call_id,
                    "content": json.dumps(result, ensure_ascii=False),
                })

        return "\n".join([part for part in collected_text if part]).strip()

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
        
        # 3. Intent Classification
        histori = agent_context.get("conversation_history", [])
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
            # Sekarang edit_thesis ikut pipeline standard (plan→execute)
            # _run_thesis_tools_loop() hanya sebagai fallback terakhir
            logger.info("Intent edit_thesis → routing melalui TaskPlanner pipeline")
            self._emit(on_event, "STEP", {"step": "planning", "message": "Menyusun rencana editing..."})
            try:
                executor = PlanExecutor(agents=self.registry.get_all_agents(), memory=memory, on_event=on_event)
                plan = self.planner.generate_plan(intent, message, agent_context)
                if plan.steps:
                    self._emit(on_event, "STEP", {"step": "executing", "message": "Menjalankan rencana editing..."})
                    raw_output = executor.execute(plan)
                    self._emit(on_event, "STEP", {"step": "reviewing", "message": "Menyajikan teks hasil editan..."})
                    final_answer = self._humanize_final_output(raw_output)
                    self._record_exchange(memory, message, intent, str(final_answer), plan_id=plan.plan_id)
                    self._emit(on_event, "TEXT_DELTA", {"delta": str(final_answer)})
                    return final_answer
                else:
                    raise ValueError("Plan edit_thesis kosong, fallback ke thesis tools")
            except Exception as plan_err:
                logger.warning(
                    "TaskPlanner gagal untuk edit_thesis, fallback legacy thesis_tools_loop dipakai sementara: %s",
                    plan_err,
                )
                self._emit(on_event, "STEP", {"step": "executing", "message": "Menjalankan thesis tools..."})
                thesis_text = self._run_thesis_tools_loop(message, context or {}, on_event=on_event)
                if not thesis_text:
                    thesis_text = "Perintah selesai diproses melalui thesis tools."
                self._record_exchange(memory, message, intent, thesis_text)
                self._emit(on_event, "TEXT_DELTA", {"delta": thesis_text})
                return thesis_text
        
        # 4. Filter obrolan general bypass (Opsional, Planner menyediakan fallback logic)
        # Akan dihandle planner kalau general question masuk plan generator
        
        # 5. Generate Plan
        try:
            plan = self.planner.generate_plan(intent, message, agent_context)
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
                citations = raw_output.get("citations", [])
                if not citations:
                    final_answer = "Tidak ada sitasi yang berhasil diverifikasi."
                else:
                    lines = ["**Hasil Verifikasi Sitasi:**\n"]
                    for i, c in enumerate(citations, 1):
                        status = c.get('status', 'ERROR')
                        emoji = "✅" if status == "PLAUSIBLE" else ("⚠️" if status == "SUSPICIOUS" else "❌")
                        reason = str(c.get('reason', '')).replace('\n', ' ')
                        cite_context = str(c.get('context', '')).replace('\n', ' ')
                        lines.append(f"{i}. **{c.get('author')} ({c.get('year')})** {emoji} `{status}`\n   > *Alasan:* {reason}\n   > *Konteks:* \"{cite_context}\"\n")
                    final_answer = "\n".join(lines)
            else:
                final_answer = self._humanize_final_output(raw_output)
            self._record_exchange(memory, message, intent, str(final_answer), plan_id=plan.plan_id)
            self._emit(on_event, "TEXT_DELTA", {"delta": str(final_answer)})
            return str(final_answer)
        else:
            self._emit(on_event, "STEP", {"step": "reviewing", "message": "Menyusun jawaban akhir..."})
            final_answer = self._synthesize_final_response(raw_output, formatted_context_str)
            self._record_exchange(memory, message, intent, final_answer, plan_id=plan.plan_id)
            self._emit(on_event, "TEXT_DELTA", {"delta": final_answer})
            return final_answer
