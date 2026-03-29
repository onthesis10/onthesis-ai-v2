import gevent
from gevent.timeout import Timeout
import logging
import time
from typing import Dict, Any, Optional
from dataclasses import dataclass

from .task_planner import TaskPlan, TaskStep

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Definisi error messages standard seperti di prompt section 9
ERROR_MESSAGES = {
    "timeout": (
        "Proses ini memakan waktu lebih lama dari biasanya. "
        "Saya akan lanjutkan dengan data yang sudah ada. "
        "Hasilnya mungkin kurang lengkap — mau saya coba ulang?"
    ),
    "empty_input": (
        "Sepertinya kamu belum mengirim teks yang ingin diproses. "
        "Paste paragraf atau section yang ingin kamu proses di sini."
    ),
    "too_many_steps": (
        "Request ini terlalu kompleks untuk dijalankan sekaligus. "
        "Saya akan pecah menjadi dua bagian. Mulai dari langkah pertama dulu, ya."
    ),
    "general": (
        "Ups, ada kesalahan saat memproses permintaanmu. Bisa coba lagi?"
    )
}

class PlanExecutor:
    """
    Menjalankan plan (TaskPlan) secara step by step (serial).
    Menerapkan timeout, dependency injection, dan DataAdapter antar-langkah.
    """
    
    # ── DataAdapter: transformasi output antar step ──
    @staticmethod
    def _adapt_data(data, source_tool: str, target_tool: str):
        """
        Transform data antar-step ke kontrak input tool berikutnya.
        Centralized here so planner templates can stay simple while each worker
        receives the shape it actually expects.
        """
        import json as _json

        # Error propagation — pass through
        if isinstance(data, dict) and "error" in data:
            return data

        # search/rank → extract/generate: pastikan list
        list_source = {"search_papers", "rank_papers", "extract_findings"}
        list_target = {"rank_papers", "extract_findings", "generate_literature_review"}
        if source_tool in list_source and target_tool in list_target:
            if isinstance(data, list):
                return data
            if isinstance(data, str):
                try:
                    parsed = _json.loads(data)
                    return parsed if isinstance(parsed, list) else [parsed]
                except (ValueError, TypeError):
                    return [{"text": data}]
            return [data] if data else []

        # read_editor_context → text tools: extract paragraph content as joined string
        text_tools = {"rewrite_text", "paraphrase_text", "expand_paragraph",
                      "summarize_text", "polish_academic_tone", "generate_section",
                      "suggest_replace_text", "suggest_insert_text"}
        if source_tool == "read_editor_context" and target_tool in text_tools:
            if isinstance(data, dict):
                paragraphs = data.get("paragraphs", [])
                if paragraphs and isinstance(paragraphs, list):
                    return "\n\n".join(
                        p.get("content", "") for p in paragraphs if p.get("content")
                    )
                # Fallback: try message or stringify
                return data.get("message", str(data))
            return str(data) if data else ""

        # FIX-D: text tools → editor suggestion tools: pass text as-is
        editor_suggestion_tools = {"suggest_insert_text", "suggest_replace_text"}
        if target_tool in editor_suggestion_tools and isinstance(data, str):
            return data  # EditorAgent.run_tool will map this to new_markdown

        # Apapun → text tools: pastikan string
        if target_tool in text_tools:
            if isinstance(data, str):
                return data
            if isinstance(data, dict):
                for key in ('text', 'content', 'result', 'output'):
                    if key in data:
                        return str(data[key])
                return _json.dumps(data, ensure_ascii=False)
            return str(data) if data is not None else ""

        # Apapun → format_citation: pastikan dict
        if target_tool == "format_citation":
            if isinstance(data, dict):
                return data
            if isinstance(data, str):
                try:
                    return _json.loads(data)
                except (ValueError, TypeError):
                    return {"raw": data}
            return {"raw": str(data)}

        # Default: return as-is
        return data

    def _resolve_param_references(self, value):
        """Resolve params yang mereferensikan step_id menjadi output step aktual."""
        if isinstance(value, str) and value in self.results:
            return self.results[value]
        if isinstance(value, list):
            return [self._resolve_param_references(item) for item in value]
        if isinstance(value, dict):
            return {key: self._resolve_param_references(item) for key, item in value.items()}
        return value

    
    def __init__(self, agents: dict, memory=None, on_event=None):
        self.agents = agents      # {"research_agent": ResearchAgent(), "writing_agent": WritingAgent(), ...}
        self.memory = memory      # Instance dari SharedMemory
        self.on_event = on_event
        self.results = {}         # Menyimpan output per step berdasarkan step_id
        # Tetap ketat, tetapi masih cukup untuk flow aktif seperti literature review dan generate chapter.
        self.max_steps = 6
        self.timeout_per_step = 30
        # Timeout khusus per-tool untuk operasi yang membutuhkan lebih lama
        self.tool_timeouts = {
            "generate_literature_review": 40,
            "search_papers": 35,
            "rank_papers": 25,
            "extract_findings": 30,
            "rewrite_text": 30,
            "paraphrase_text": 30,
            "expand_paragraph": 35,
            "summarize_text": 25,
            "polish_academic_tone": 30,
            "format_citation": 20,
        }
        self.retryable_tools = {
            "search_papers",
            "rank_papers",
            "extract_findings",
            "generate_literature_review",
            "generate_section",
            "polish_academic_tone",
            "refine_with_critique",
        }
        self.max_retries_per_step = 1
        self.high_token_threshold = 5000

    def _emit(self, event_type: str, data: dict):
        if not self.on_event:
            return
        try:
            self.on_event(event_type, data)
        except Exception as emit_error:
            logger.warning(f"Gagal emit event {event_type}: {emit_error}")
    
    def wait_for_deps(self, depends_on: list[str]):
        """
        Karena ini adalah executor serial sederhana, saat langkah ke-N dieksekusi,
        langkah < N harusnya sudah selesai. Method ini hanya untuk verifikasi log.
        """
        for count in range(3): # Tunggu sebentar untuk kepastian
            all_done = all(dep in self.results for dep in depends_on)
            if all_done:
                return True
            gevent.sleep(0.1)
        return False
        
    def execute(self, plan: TaskPlan) -> str:
        """
        Menjalankan TaskPlan dan mereturn output dari langkah terakhir.
        """
        logger.info(f"Menerima plan eksekusi dengan {len(plan.steps)} steps. Limit: {self.max_steps}")
        plan.status = "running"
        plan.execution_trace = []
        self.results.clear()
        allow_self_evaluation = plan.estimated_tokens <= self.high_token_threshold

        if not allow_self_evaluation:
            self._emit("STEP", {
                "step": "planning",
                "message": "Context cukup besar, mode hemat token aktif untuk menjaga stabilitas eksekusi.",
            })
        
        if len(plan.steps) > self.max_steps:
            logger.warning(f"Plan {plan.plan_id} melebihi batas {self.max_steps} steps.")
            plan.status = "failed"
            self._emit("ERROR", {
                "message": f"Rencana terlalu panjang ({len(plan.steps)} langkah). Batas saat ini {self.max_steps} langkah."
            })
            return ERROR_MESSAGES["too_many_steps"]

        for idx, step in enumerate(plan.steps):
            
            logger.info(f"Mengeksekusi step [{step.step_id}] - {step.tool} ({step.agent})")
            
            # Verifikasi dependensi tersedia di self.results
            valid_deps = self.wait_for_deps(step.depends_on)
            if not valid_deps and step.depends_on:
                logger.error(f"Dependencies untuk {step.step_id} belum terpenuhi: {step.depends_on}")
                self.results[step.step_id] = {"error": "dependency failure"}
                plan.status = "failed"
                break
                
            # Ambil data input
            input_data = None
            if step.input_from == "user":
                input_data = plan.user_query
                if not str(input_data).strip():
                    return ERROR_MESSAGES["empty_input"]
            elif step.input_from == "memory":
                # Mengambil dari SharedMemory jika ada
                if self.memory and hasattr(self.memory, 'research'):
                    input_data = self.memory.research.get_papers(plan.user_query)
                else:
                    input_data = [] # Fallback
            else:
                input_data = self.results.get(step.input_from)
                # ERROR PROPAGATION CHECK
                if isinstance(input_data, dict) and "error" in input_data:
                    logger.error(f"Menghentikan eksekusi karena input {step.input_from} error.")
                    plan.status = "failed"
                    self.results[step.step_id] = input_data
                    break
            # ── DataAdapter: adaptasi tipe data antar step ──
            if step.input_from not in ("user", "memory") and input_data is not None:
                # Cari source tool dari step sebelumnya
                source_step = next((s for s in plan.steps if s.step_id == step.input_from), None)
                source_tool = source_step.tool if source_step else ""
                input_data = self._adapt_data(input_data, source_tool, step.tool)
                logger.info(f"DataAdapter: {source_tool} → {step.tool} (type: {type(input_data).__name__})")

            # Cari instance agen yang sesuai di registry `self.agents`
            agent = self.agents.get(step.agent)
            if not agent:
                logger.error(f"Agent {step.agent} tak ditemukan di registry.")
                plan.status = "failed"
                self.results[step.step_id] = {"error": f"Agent {step.agent} not found"}
                break

            resolved_params = self._resolve_param_references(step.params or {})
            
            # Eksekusi dengan Timeout limit
            step_timeout = self.tool_timeouts.get(step.tool, self.timeout_per_step)
            max_attempts = 1 + (self.max_retries_per_step if step.tool in self.retryable_tools else 0)
            attempt = 0

            while attempt < max_attempts:
                attempt += 1
                step_started_at = time.time()
                trace_entry = {
                    "step_id": step.step_id,
                    "agent": step.agent,
                    "tool": step.tool,
                    "attempt": attempt,
                }

                try:
                    self._emit("TOOL_CALL", {
                        "id": step.step_id,
                        "step_id": step.step_id,
                        "agent": step.agent,
                        "tool": step.tool,
                        "args": resolved_params,
                        "attempt": attempt,
                    })
                    with Timeout(step_timeout):
                        # Inject memory into agent tool execution
                        result = agent.run_tool(step.tool, input_data, resolved_params, memory=self.memory)
                        # Autosave search results to ResearchMemory
                        if step.tool == "search_papers" and self.memory and hasattr(self.memory, 'research'):
                            self.memory.research.add_papers(result)

                        # --- PHASE 3.2: SELF-EVALUATION LOOP ---
                        if (
                            allow_self_evaluation
                            and step.agent == "writing_agent"
                            and step.tool in ["rewrite_text", "paraphrase_text", "expand_paragraph", "generate_literature_review"]
                        ):
                            analysis_agent = self.agents.get("analysis_agent")
                            writing_agent = self.agents.get("writing_agent")
                            if analysis_agent and writing_agent:
                                remaining_budget = max(1, step_timeout - (time.time() - step_started_at))
                                logger.info(f"Menjalankan self-evaluation loop untuk hasil {step.tool}. Remaining budget={remaining_budget:.2f}s")
                                with Timeout(remaining_budget):
                                    self._emit("STEP", {"step": "evaluating", "message": f"Mengevaluasi {step.tool}..."})
                                    try:
                                        score_json_str = analysis_agent.score_thesis_quality(result, memory=self.memory)
                                        import json
                                        import re
                                        clean_json = re.sub(r'```(?:json)?\s*|\s*```', '', score_json_str).strip()
                                        score_data = json.loads(clean_json)
                                        if float(score_data.get("overall", 10.0)) < 7.0:
                                            improvements_list = score_data.get("improvements", ["Kualitas kurang akademis"])
                                            improvements = ", ".join(improvements_list)
                                            self._emit("STEP", {"step": "revising", "message": f"Kritik: {improvements} - Sedang merevisi..."})
                                            logger.info(f"Self-evaluation score < 7.0 ({score_data.get('overall')}). Revising... Kritik: {improvements}")
                                            result = writing_agent.run_tool(
                                                "refine_with_critique",
                                                result,
                                                {"critique": improvements},
                                                memory=self.memory,
                                            )
                                            logger.info("Revisi selesai.")
                                    except Exception as eval_err:
                                        logger.warning(f"Self-evaluation terlewati (error/JSON invalid): {eval_err}")
                        # ---------------------------------------

                    duration_ms = int((time.time() - step_started_at) * 1000)
                    trace_entry.update({"status": "success", "duration_ms": duration_ms})
                    plan.execution_trace.append(trace_entry)
                    self.results[step.step_id] = result
                    self._emit("TOOL_RESULT", {
                        "id": step.step_id,
                        "step_id": step.step_id,
                        "agent": step.agent,
                        "tool": step.tool,
                        "result": result,
                        "attempt": attempt,
                        "duration_ms": duration_ms,
                    })
                    break

                except Timeout:
                    duration_ms = int((time.time() - step_started_at) * 1000)
                    logger.warning(f"Timeout (>{step_timeout}s) pada step: {step.step_id} attempt={attempt}")
                    trace_entry.update({"status": "timeout", "duration_ms": duration_ms})
                    plan.execution_trace.append(trace_entry)

                    if attempt < max_attempts:
                        self._emit("STEP", {
                            "step": "executing",
                            "message": f"Langkah {step.step_id} timeout, mencoba ulang sekali lagi...",
                        })
                        gevent.sleep(0.2)
                        continue

                    self.results[step.step_id] = {"error": "timeout", "partial": True}
                    self._emit("TOOL_RESULT", {
                        "id": step.step_id,
                        "step_id": step.step_id,
                        "agent": step.agent,
                        "tool": step.tool,
                        "result": self.results[step.step_id],
                        "attempt": attempt,
                        "duration_ms": duration_ms,
                    })
                    self._emit("ERROR", {
                        "message": f"Langkah {step.step_id} melebihi batas waktu {step_timeout} detik."
                    })
                    plan.status = "partial"
                    if idx < len(plan.steps) - 1:
                        return ERROR_MESSAGES["timeout"]
                    break

                except Exception as e:
                    duration_ms = int((time.time() - step_started_at) * 1000)
                    logger.error(f"Error eksekusi pada {step.step_id} attempt={attempt}: {str(e)}")
                    trace_entry.update({"status": "error", "duration_ms": duration_ms, "error": str(e)})
                    plan.execution_trace.append(trace_entry)

                    if attempt < max_attempts:
                        self._emit("STEP", {
                            "step": "executing",
                            "message": f"Langkah {step.step_id} gagal, mencoba ulang sekali lagi...",
                        })
                        gevent.sleep(0.2)
                        continue

                    self.results[step.step_id] = {"error": str(e)}
                    self._emit("TOOL_RESULT", {
                        "id": step.step_id,
                        "step_id": step.step_id,
                        "agent": step.agent,
                        "tool": step.tool,
                        "result": self.results[step.step_id],
                        "attempt": attempt,
                        "duration_ms": duration_ms,
                    })
                    plan.status = "failed"
                    break

            if plan.status in {"failed", "partial"} and isinstance(self.results.get(step.step_id), dict) and "error" in self.results.get(step.step_id):
                break

        # Selesai loop. Ambil nilai result dari tool terakhir untuk dikembalikan ke user
        if plan.status == "running":
            plan.status = "done"
            
        final_step = plan.steps[-1]
        final_output = self.results.get(final_step.step_id)
        
        # Format ke string raw jika return-nya berupa output object / string
        if isinstance(final_output, dict) and "error" in final_output:
            if final_output["error"] == "timeout":
                return ERROR_MESSAGES["timeout"]
            elif final_output["error"] == "empty_input":
                return ERROR_MESSAGES["empty_input"]
            return ERROR_MESSAGES["general"]
        
        # Simpan state plan selesai di ConversationMemory jika ada memory
        if self.memory and hasattr(self.memory, 'conversation'):
            self.memory.conversation.store_plan(plan)

        # S2-5: Minimal Observability - Step Latency Summary
        if plan.execution_trace:
            total_ms = sum(t.get("duration_ms", 0) for t in plan.execution_trace)
            steps_summary = "; ".join(
                f"{t.get('step_id', '?')}[{t.get('tool', '?')}]={t.get('duration_ms', 0)}ms({t.get('status', '?')})"
                for t in plan.execution_trace
            )
            logger.info(
                f"[Observability] Plan {plan.plan_id} "
                f"status={plan.status} "
                f"total_ms={total_ms} "
                f"steps={len(plan.execution_trace)} "
                f"detail: {steps_summary}"
            )

        return final_output if final_output is not None else ERROR_MESSAGES["general"]
