import gevent
from gevent.timeout import Timeout
import json
import logging
import re
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

        # Preserve the structured literature review contract while allowing the
        # text itself to be polished in the next writing step.
        if source_tool == "generate_literature_review" and target_tool == "polish_academic_tone" and isinstance(data, dict):
            return data

        # Apapun → text tools: pastikan string
        if target_tool in text_tools:
            if isinstance(data, str):
                return data
            if isinstance(data, dict):
                for key in ('review_text', 'text', 'content', 'result', 'output'):
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
        self.plan_result_commit_attempted = False
        self.plan_result_committed = False
        # Tetap ketat, tetapi masih cukup untuk flow aktif seperti literature review dan generate chapter.
        self.max_steps = 6
        self.timeout_per_step = 30
        # Timeout khusus per-tool untuk operasi yang membutuhkan lebih lama
        self.tool_timeouts = {
            "generate_literature_review": 40,
            "search_papers": 60,
            "rank_papers": 25,
            "extract_findings": 30,
            "rewrite_text": 30,
            "paraphrase_text": 30,
            "expand_paragraph": 35,
            "summarize_text": 25,
            "polish_academic_tone": 30,
            "format_citation": 20,
            "verify_citations": 45,
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
        self.max_validation_passes = 2
        self.academic_quality_threshold = 7.0
        self.structure_quality_threshold = 7.0

    def _emit(self, event_type: str, data: dict):
        if not self.on_event:
            return
        try:
            self.on_event(event_type, data)
        except Exception as emit_error:
            logger.warning(f"Gagal emit event {event_type}: {emit_error}")

    def _commit_plan_result(self, conversation, plan: TaskPlan, result: Any) -> None:
        """
        Best-effort commit untuk trace plan dan assistant turn dalam satu helper.
        Jika salah satu write gagal, cukup log error dan jangan mengganggu response user.
        """
        self.plan_result_commit_attempted = True
        self.plan_result_committed = False

        if not conversation or not plan:
            return

        plan_id = getattr(plan, "plan_id", getattr(plan, "id", None))

        try:
            if hasattr(conversation, "add_plan"):
                conversation.add_plan(plan, str(result))
            else:
                raise AttributeError("Conversation object does not support atomic add_plan(plan, result)")
            self.plan_result_committed = True
        except Exception as commit_error:
            logger.error(f"commit_plan_result failed: {commit_error}")

    @staticmethod
    def _extract_json_payload(raw: Any) -> Optional[Dict[str, Any]]:
        if isinstance(raw, dict):
            return raw
        if not isinstance(raw, str):
            return None
        cleaned = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()
        if not cleaned:
            return None
        try:
            parsed = json.loads(cleaned)
            return parsed if isinstance(parsed, dict) else None
        except Exception:
            return None

    @staticmethod
    def _extract_result_text(result: Any) -> str:
        if isinstance(result, str):
            return result
        if isinstance(result, dict):
            diff = result.get("diff")
            if isinstance(diff, dict):
                return str(diff.get("new_text") or diff.get("after") or "")
            for key in ("review_text", "text", "content", "output", "message", "result"):
                value = result.get(key)
                if isinstance(value, str) and value.strip():
                    return value
        return str(result or "")

    @staticmethod
    def _replace_result_text(result: Any, new_text: str) -> Any:
        if isinstance(result, str):
            return new_text
        if isinstance(result, dict):
            updated = dict(result)
            diff = updated.get("diff")
            if isinstance(diff, dict):
                new_diff = dict(diff)
                if "new_text" in new_diff or "after" in new_diff:
                    new_diff["new_text"] = new_text
                    new_diff["after"] = new_text
                    updated["diff"] = new_diff
                    return updated
            for key in ("review_text", "text", "content", "output", "message", "result"):
                if key in updated and isinstance(updated.get(key), str):
                    updated[key] = new_text
                    return updated
        return new_text

    def _run_generation_validators(self, result: Any) -> Dict[str, Any]:
        text = self._extract_result_text(result)
        if not text.strip():
            return {"needs_refine": False, "feedback": []}

        analysis_agent = self.agents.get("analysis_agent")
        diagnostic_agent = self.agents.get("diagnostic_agent")
        feedback = []
        academic_score = None
        structure_score = None

        if analysis_agent:
            score_payload = self._extract_json_payload(
                analysis_agent.score_thesis_quality(text, memory=self.memory)
            )
            score_block = (score_payload or {}).get("scores", {}) if isinstance(score_payload, dict) else {}
            academic_score = float(score_block.get("academic_tone") or score_payload.get("overall") or 10.0)
            structure_score = float(score_block.get("structure") or score_payload.get("overall") or 10.0)
            if academic_score < self.academic_quality_threshold or structure_score < self.structure_quality_threshold:
                feedback.extend(score_payload.get("improvements", []) or [])

        if diagnostic_agent:
            citation_report = diagnostic_agent.analyze_for_missing_citations(text, memory=self.memory)
            if isinstance(citation_report, dict) and citation_report.get("claims_without_citation"):
                feedback.append(
                    f"Tambahkan dukungan sitasi pada {citation_report.get('claims_without_citation')} klaim yang masih lemah."
                )

        deduped_feedback = []
        seen_feedback = set()
        for item in feedback:
            message = str(item or "").strip()
            if not message or message in seen_feedback:
                continue
            seen_feedback.add(message)
            deduped_feedback.append(message)

        return {
            "needs_refine": bool(deduped_feedback),
            "feedback": deduped_feedback,
            "academic_score": academic_score,
            "structure_score": structure_score,
        }

    def _refine_generated_output(self, step, result: Any) -> Any:
        writing_agent = self.agents.get("writing_agent")
        if not writing_agent:
            return result

        candidate = result
        for pass_index in range(1, self.max_validation_passes + 1):
            validation = self._run_generation_validators(candidate)
            if not validation.get("needs_refine"):
                return candidate

            critique = "; ".join(validation.get("feedback", [])[:4]) or "Perkuat kualitas akademik dan struktur argumen."
            self._emit("STEP", {
                "step": "reviewing",
                "message": (
                    f"Validator akademik menemukan gap pada {step.tool}. "
                    f"Refine pass {pass_index}/{self.max_validation_passes}..."
                ),
            })
            revised_text = writing_agent.run_tool(
                "refine_with_critique",
                self._extract_result_text(candidate),
                {"critique": critique},
                memory=self.memory,
            )
            candidate = self._replace_result_text(candidate, self._extract_result_text(revised_text))
        return candidate
    
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
                            and step.tool in ["rewrite_text", "paraphrase_text", "expand_paragraph", "generate_literature_review", "generate_section", "polish_academic_tone"]
                        ):
                            remaining_budget = max(1, step_timeout - (time.time() - step_started_at))
                            logger.info(f"Menjalankan validator loop untuk hasil {step.tool}. Remaining budget={remaining_budget:.2f}s")
                            with Timeout(remaining_budget):
                                self._emit("STEP", {"step": "evaluating", "message": f"Memvalidasi kualitas {step.tool}..."})
                                try:
                                    result = self._refine_generated_output(step, result)
                                except Exception as eval_err:
                                    logger.warning(f"Validator loop terlewati (error): {eval_err}")
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
