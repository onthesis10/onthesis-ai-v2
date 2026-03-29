import uuid
import os
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Any, Optional

# Configurasi logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class TaskStep:
    step_id: str           # "step_1", "step_2", dst.
    agent: str             # "research_agent" | "writing_agent" | "analysis_agent"
    tool: str              # nama tool yang dipanggil
    input_from: str        # "user" | "step_1" | "step_2" | "memory"
    output_to: str         # "step_2" | "memory" | "user"
    params: Dict[str, Any] # parameter tambahan
    depends_on: List[str]  # step mana yang harus selesai dulu

@dataclass
class TaskPlan:
    plan_id: str
    user_query: str
    intent: str
    steps: List[TaskStep]
    estimated_tokens: int
    created_at: datetime
    status: str            # "pending" | "running" | "done" | "failed" | "partial"

class TaskPlanner:
    """
    Coordinator yang bertugas memecah (breakdown) intent user menjadi
    urutan langkah (TaskStep) yang spesifik untuk dikerjakan oleh masing-masing agent.
    """
    
    def __init__(self):
        self.api_key = os.environ.get("LLM_API_KEY")
        self.model = os.environ.get("PLANNER_MODEL", "groq/llama-3.1-8b-instant")

    def _generate_id(self) -> str:
        return str(uuid.uuid4())

    def _estimate_tokens(self, steps: List[TaskStep]) -> int:
        """
        Estimasi kasar jumlah token berdasarkan tipe agent dan tool.
        """
        token_cost = {
            "search_papers": 500,
            "rank_papers": 300,
            "extract_findings": 2000,
            "generate_literature_review": 1500,
            "polish_academic_tone": 800,
            "generate_section": 1000,
            "rewrite_text": 600,
            "paraphrase_text": 600,
            "expand_paragraph": 600,
            "summarize_text": 600,
            "format_citation": 400,
            "extract_claims": 600,
            "check_logic": 600,
            "score_argument": 600,
            "check_coherence": 600,
            "score_thesis_quality": 800,
            # V2 Chapter Skills
            "formulate_research_gap": 1200,
            "draft_research_questions": 900,
            "draft_research_objectives": 900,
            "align_rq_with_objectives": 1000,
            "generate_literature_matrix": 1500,
            "synthesize_arguments": 800,
            "validate_citations": 1200,
            "justify_methodology": 1000,
            "generate_research_flowchart": 800,
            "interpret_data_table": 1200,
            "correlate_with_bab2": 1200,
            "summarize_to_rq": 800,
            "draft_limitations_and_future_work": 1000,
            # V2 Diagnostic
            "analyze_for_missing_citations": 1200,
            "check_golden_thread": 1000,
            # V2 Editor
            "read_editor_context": 100,
            "suggest_replace_text": 200,
            "suggest_insert_text": 200,
            "suggest_delete_text": 100,
            # V3 Power Agent
            "search_and_summarize": 400,
            "fetch_url_text": 200,
            "search_web": 300,
            "search_academic": 300,
            "generate_full_chapter": 3000,
            "write_abstract": 800,
            "refine_with_critique": 1000,
        }
        
        total = 0
        for s in steps:
            total += token_cost.get(s.tool, 500)
        return total

    def generate_plan(self, intent: str, user_input: str, memory_context: Optional[Dict[str, Any]] = None) -> TaskPlan:
        """
        Mengubah intent dan input user menjadi TaskPlan berurutan.
        Menggunakan `memory_context` jika tersedia untuk reuse search papers.
        """
        steps = []
        logger.info(f"Membangun task plan untuk intent '{intent}'")
        
        # Ekstrak memori kalau ada
        known_papers_on_topic = None
        if isinstance(memory_context, dict):
            known_papers_on_topic = memory_context.get("known_papers_on_topic")
        has_existing_papers = isinstance(known_papers_on_topic, list) and len(known_papers_on_topic) > 0

        if intent == "literature_review":
            
            if not has_existing_papers:
                steps.append(TaskStep(
                    step_id="step_1",
                    agent="research_agent",
                    tool="search_papers",
                    input_from="user",
                    output_to="step_2",
                    params={"query": user_input, "limit": 10},
                    depends_on=[]
                ))
                steps.append(TaskStep(
                    step_id="step_2",
                    agent="research_agent",
                    tool="rank_papers",
                    input_from="step_1",
                    output_to="step_3",
                    params={"strategy": "relevance_recency"},
                    depends_on=["step_1"]
                ))
                paper_input = "step_2"
            else:
                # Reuse paper dari instance shared memory. Skip pencarian.
                paper_input = "memory"
            
            steps.append(TaskStep(
                step_id="step_3",
                agent="research_agent",
                tool="extract_findings",
                input_from=paper_input,
                output_to="step_4",
                params={"max_papers": 5},
                depends_on=["step_2"] if not has_existing_papers else []
            ))
            
            steps.append(TaskStep(
                step_id="step_4",
                agent="writing_agent",
                tool="generate_literature_review",
                input_from="step_3",
                output_to="step_5",
                params={"style": "academic formal", "language": "id"},
                depends_on=["step_3"]
            ))
            
            steps.append(TaskStep(
                step_id="step_5",
                agent="writing_agent",
                tool="polish_academic_tone",
                input_from="step_4",
                output_to="user",
                params={},
                depends_on=["step_4"]
            ))
            
        elif intent == "find_papers":
            steps.append(TaskStep(
                step_id="step_1",
                agent="research_agent",
                tool="search_papers",
                input_from="user",
                output_to="step_2",
                params={"query": user_input, "limit": 10},
                depends_on=[]
            ))
            steps.append(TaskStep(
                step_id="step_2",
                agent="research_agent",
                tool="rank_papers",
                input_from="step_1",
                output_to="user",
                params={"strategy": "relevance_recency"},
                depends_on=["step_1"]
            ))
            
        elif intent == "rewrite_paragraph":
            steps.append(TaskStep(
                step_id="step_1",
                agent="writing_agent",
                tool="rewrite_text",
                input_from="user",
                output_to="step_2",
                params={"style": "academic formal"},
                depends_on=[]
            ))
            steps.append(TaskStep(
                step_id="step_2",
                agent="writing_agent",
                tool="polish_academic_tone",
                input_from="step_1",
                output_to="user",
                params={},
                depends_on=["step_1"]
            ))
            steps = self._add_editor_replacement_step(steps, memory_context, "step_2")

        elif intent == "paraphrase":
            steps.append(TaskStep(
                step_id="step_1",
                agent="writing_agent",
                tool="paraphrase_text",
                input_from="user",
                output_to="step_2",
                params={},
                depends_on=[]
            ))
            steps.append(TaskStep(
                step_id="step_2",
                agent="writing_agent",
                tool="polish_academic_tone",
                input_from="step_1",
                output_to="user",
                params={},
                depends_on=["step_1"]
            ))
            steps = self._add_editor_replacement_step(steps, memory_context, "step_2")
            
        elif intent == "expand_paragraph":
            steps.append(TaskStep(
                step_id="step_1",
                agent="writing_agent",
                tool="expand_paragraph",
                input_from="user",
                output_to="step_2",
                params={"direction": "more academic detail"},
                depends_on=[]
            ))
            steps.append(TaskStep(
                step_id="step_2",
                agent="writing_agent",
                tool="polish_academic_tone",
                input_from="step_1",
                output_to="user",
                params={},
                depends_on=["step_1"]
            ))
            steps = self._add_editor_replacement_step(steps, memory_context, "step_2")
            
        elif intent == "summarize":
            steps.append(TaskStep(
                step_id="step_1",
                agent="writing_agent",
                tool="summarize_text",
                input_from="user",
                output_to="user",
                params={"length": "1 paragraph"},
                depends_on=[]
            ))
            
        elif intent == "academic_style":
            steps.append(TaskStep(
                step_id="step_1",
                agent="writing_agent",
                tool="polish_academic_tone",
                input_from="user",
                output_to="user",
                params={},
                depends_on=[]
            ))
            steps = self._add_editor_replacement_step(steps, memory_context, "step_1")
            
        elif intent == "citation_format":
            steps.append(TaskStep(
                step_id="step_1",
                agent="writing_agent",
                tool="format_citation",
                input_from="user",
                output_to="user",
                params={"style": "APA"},  # Bisa di-override berdasarkan memori profile
                depends_on=[]
            ))
            
        elif intent == "analyze_argument":
            steps.append(TaskStep(
                step_id="step_1",
                agent="analysis_agent",
                tool="extract_claims",
                input_from="user",
                output_to="step_2",
                params={},
                depends_on=[]
            ))
            steps.append(TaskStep(
                step_id="step_2",
                agent="analysis_agent",
                tool="check_logic",
                input_from="step_1",
                output_to="step_3",
                params={},
                depends_on=["step_1"]
            ))
            steps.append(TaskStep(
                step_id="step_3",
                agent="analysis_agent",
                tool="score_argument",
                input_from="user",  # butuh full text juga
                output_to="user",
                params={"claims_input": "step_2"},
                depends_on=["step_2"]
            ))
            
        elif intent == "check_coherence":
            steps.append(TaskStep(
                step_id="step_1",
                agent="analysis_agent",
                tool="check_coherence",
                input_from="user",
                output_to="user",
                params={},
                depends_on=[]
            ))
            
        elif intent == "thesis_scoring":
            steps.append(TaskStep(
                step_id="step_1",
                agent="analysis_agent",
                tool="score_thesis_quality",
                input_from="user",
                output_to="user",
                params={},
                depends_on=[]
            ))
            
        elif intent == "generate_section":
            # Research-backed section generation:
            # Step 1-3: Search & extract findings from real papers
            # Step 4: Generate section using findings as context
            # Step 5: Polish academic tone
            # Step 6: Insert into editor as PENDING_DIFF

            # Build a search query from the user input + project title
            search_query = user_input
            if memory_context:
                req_ctx = memory_context.get("request_context", {})
                project_title = req_ctx.get("context_title", "")
                if project_title and project_title.lower() not in search_query.lower():
                    search_query = f"{project_title} {search_query}"

            if not has_existing_papers:
                steps.append(TaskStep(
                    step_id="step_1",
                    agent="research_agent",
                    tool="search_papers",
                    input_from="user",
                    output_to="step_2",
                    params={"query": search_query, "limit": 10},
                    depends_on=[]
                ))
                steps.append(TaskStep(
                    step_id="step_2",
                    agent="research_agent",
                    tool="rank_papers",
                    input_from="step_1",
                    output_to="step_3",
                    params={"strategy": "relevance_recency"},
                    depends_on=["step_1"]
                ))
                findings_input = "step_2"
            else:
                findings_input = "memory"

            steps.append(TaskStep(
                step_id="step_3",
                agent="research_agent",
                tool="extract_findings",
                input_from=findings_input,
                output_to="step_4",
                params={"max_papers": 5},
                depends_on=["step_2"] if not has_existing_papers else []
            ))
            steps.append(TaskStep(
                step_id="step_4",
                agent="writing_agent",
                tool="generate_section",
                input_from="step_3",
                output_to="step_5",
                params={"style": "academic formal"},
                depends_on=["step_3"]
            ))
            steps.append(TaskStep(
                step_id="step_5",
                agent="writing_agent",
                tool="polish_academic_tone",
                input_from="step_4",
                output_to="user",
                params={},
                depends_on=["step_4"]
            ))
            # FIX-C: Add editor insertion step so generated text produces PENDING_DIFF
            steps = self._add_editor_insertion_step(steps, memory_context, "step_5")

        elif intent == "web_search":
            # Live web/internet lookup → synthesize findings
            steps.append(TaskStep(
                step_id="step_1",
                agent="web_search_agent",
                tool="search_and_summarize",
                input_from="user",
                output_to="step_2",
                params={"num_results": 5, "academic_only": False},
                depends_on=[]
            ))
            steps.append(TaskStep(
                step_id="step_2",
                agent="writing_agent",
                tool="generate_section",
                input_from="step_1",
                output_to="user",
                params={
                    "style": "academic formal",
                    "instruction": "Ringkas dan sintesiskan hasil pencarian web menjadi teks akademik yang informatif dan terstruktur."
                },
                depends_on=["step_1"]
            ))

        elif intent == "generate_chapter":
            import re
            m = re.search(r'bab\s*(\d+|[ivxIVX]+|one|two|three|empat|lima)', user_input.lower())
            chapter_number = m.group(1) if m else "auto"
            
            chapter_map = {
                "1": "pendahuluan", "i": "pendahuluan", "one": "pendahuluan", "satu": "pendahuluan",
                "2": "tinjauan_pustaka", "ii": "tinjauan_pustaka", "two": "tinjauan_pustaka", "dua": "tinjauan_pustaka",
                "3": "metodologi", "iii": "metodologi", "three": "metodologi", "tiga": "metodologi",
                "4": "hasil_pembahasan", "iv": "hasil_pembahasan", "four": "hasil_pembahasan", "empat": "hasil_pembahasan",
                "5": "kesimpulan", "v": "kesimpulan", "five": "kesimpulan", "lima": "kesimpulan"
            }
            chapter_type = chapter_map.get(chapter_number.lower(), "auto")
            
            # Full chapter generation with real research backing
            # Step 1: search relevant papers
            # Step 2: rank + extract findings
            # Step 3: generate full chapter via chapter_skills
            # Step 4: polish academic tone
            steps.append(TaskStep(
                step_id="step_1",
                agent="research_agent",
                tool="search_papers",
                input_from="user",
                output_to="step_2",
                params={"query": user_input, "limit": 8},
                depends_on=[]
            ))
            steps.append(TaskStep(
                step_id="step_2",
                agent="research_agent",
                tool="rank_papers",
                input_from="step_1",
                output_to="step_3",
                params={"strategy": "relevance_recency"},
                depends_on=["step_1"]
            ))
            steps.append(TaskStep(
                step_id="step_3",
                agent="research_agent",
                tool="extract_findings",
                input_from="step_2",
                output_to="step_4",
                params={"max_papers": 5},
                depends_on=["step_2"]
            ))
            steps.append(TaskStep(
                step_id="step_4",
                agent="writing_agent",
                tool="generate_full_chapter",
                input_from="step_3",
                output_to="step_5",
                params={
                    "chapter_type": chapter_type,
                    "chapter_number": chapter_number,
                    "instruction": user_input,
                    "style": "academic formal"
                },
                depends_on=["step_3"]
            ))
            steps.append(TaskStep(
                step_id="step_5",
                agent="writing_agent",
                tool="polish_academic_tone",
                input_from="step_4",
                output_to="user",
                params={},
                depends_on=["step_4"]
            ))
            steps = self._add_editor_insertion_step(steps, memory_context, "step_5")

        elif intent == "write_abstract":
            # Abstract writing: gather context → write structured abstract
            steps.append(TaskStep(
                step_id="step_1",
                agent="writing_agent",
                tool="write_abstract",
                input_from="user",
                output_to="step_2",
                params={"style": "academic formal", "language": "id"},
                depends_on=[]
            ))
            steps.append(TaskStep(
                step_id="step_2",
                agent="writing_agent",
                tool="polish_academic_tone",
                input_from="step_1",
                output_to="user",
                params={},
                depends_on=["step_1"]
            ))
            steps = self._add_editor_insertion_step(steps, memory_context, "step_2")

        elif intent == "general_question":
            # For general questions, we may not need a full pipeline, just answer directly.
            # Usually handled bypassing task planner, but putting a fallback:
            steps.append(TaskStep(
                step_id="step_1",
                agent="writing_agent",  # as a fallback to just generate text
                tool="rewrite_text",    # or a generic conversational tool if added later
                input_from="user",
                output_to="user",
                params={"style": "conversational academic"},
                depends_on=[]
            ))
        # ── V2: Chapter-Specific Intents ──
        elif intent == "research_questions":
            steps = self._plan_research_questions(user_input, memory_context)

        elif intent == "research_objectives":
            steps = self._plan_research_objectives(user_input, memory_context)

        elif intent == "research_gap":
            steps = self._plan_research_gap(user_input, memory_context)

        elif intent == "methodology_justify":
            steps = self._plan_methodology_justify(user_input, memory_context)

        elif intent == "data_interpretation":
            steps = self._plan_data_interpretation(user_input, memory_context)

        elif intent == "thesis_conclusion":
            steps = self._plan_thesis_conclusion(user_input, memory_context)

        elif intent == "validate_citations":
            steps = self._plan_validate_citations(user_input, memory_context)

        elif intent == "golden_thread_check":
            steps = self._plan_golden_thread(user_input, memory_context)

        elif intent == "edit_thesis":
            steps = self._plan_edit_thesis(user_input, memory_context)

        else:
            # V2: Try LLM-based dynamic plan generation for unknown intents
            steps = self._try_dynamic_plan(intent, user_input, memory_context)
            if not steps:
                logger.warning(f"Intent {intent} tidak memiliki template fallback pada Planner.")

        return TaskPlan(
            plan_id=self._generate_id(),
            user_query=user_input,
            intent=intent,
            steps=steps,
            estimated_tokens=self._estimate_tokens(steps),
            created_at=datetime.now(),
            status="pending"
        )

    # ═══════════════════════════════════════════════════════════
    # V2 CHAPTER-SPECIFIC PLAN TEMPLATES
    # ═══════════════════════════════════════════════════════════

    def _get_request_context(self, memory_context: Optional[Dict]) -> Dict[str, Any]:
        if not isinstance(memory_context, dict):
            return {}
        req_ctx = memory_context.get("request_context", {})
        return req_ctx if isinstance(req_ctx, dict) else {}

    def _add_editor_insertion_step(self, steps: List[TaskStep], memory_context: Optional[Dict], last_step_id: str) -> List[TaskStep]:
        """Menambahkan step untuk memasukkan hasil ke Lexical Editor jika ada paragraf aktif."""
        active_paras = []
        if memory_context:
            active_paras = memory_context.get("active_paragraphs", [])
            if not active_paras:
                req_ctx = memory_context.get("request_context", {})
                active_paras = req_ctx.get("active_paragraphs", [])
        target_para = active_paras[-1].get("paraId") if active_paras else ""
        
        if target_para:
            for step in steps:
                if step.step_id == last_step_id:
                    step.output_to = "step_insert"
            
            steps.append(TaskStep(
                step_id="step_insert",
                agent="editor_agent",
                tool="suggest_insert_text",
                input_from=last_step_id,
                output_to="user",
                params={
                    "target_paragraph_id": target_para,
                    "position": "after",
                    "reason": "Draft otomatis dari Agent."
                },
                depends_on=[last_step_id]
            ))
        return steps

    def _add_editor_replacement_step(self, steps: List[TaskStep], memory_context: Optional[Dict], last_step_id: str) -> List[TaskStep]:
        """Menambahkan step untuk mengganti isi paragraf aktif dengan hasil Lexical Editor."""
        active_paras = []
        if memory_context:
            active_paras = memory_context.get("active_paragraphs", [])
            if not active_paras:
                req_ctx = memory_context.get("request_context", {})
                active_paras = req_ctx.get("active_paragraphs", [])
        target_para = active_paras[-1].get("paraId") if active_paras else ""
        
        if target_para:
            for step in steps:
                if step.step_id == last_step_id:
                    step.output_to = "step_replace"
            
            steps.append(TaskStep(
                step_id="step_replace",
                agent="editor_agent",
                tool="suggest_replace_text",
                input_from=last_step_id,
                output_to="user",
                params={
                    "target_paragraph_id": target_para,
                    "reason": "Perbaikan teks otomatis dari Agent."
                },
                depends_on=[last_step_id]
            ))
        return steps

    def _plan_research_gap(self, user_input: str, memory_context: Optional[Dict]) -> List[TaskStep]:
        """Plan for Bab 1: Research Gap formulation."""
        steps = [
            TaskStep(
                step_id="step_1",
                agent="editor_agent",
                tool="read_editor_context",
                input_from="user",
                output_to="step_2",
                params={"mode": "full"},
                depends_on=[]
            ),
            TaskStep(
                step_id="step_2",
                agent="chapter_skills_agent",
                tool="formulate_research_gap",
                input_from="user",
                output_to="step_3",
                params={"topic": user_input},
                depends_on=["step_1"]
            ),
            TaskStep(
                step_id="step_3",
                agent="chapter_skills_agent",
                tool="align_rq_with_objectives",
                input_from="step_1",
                output_to="user",
                params={},
                depends_on=["step_2"]
            ),
        ]
        return self._add_editor_insertion_step(steps, memory_context, "step_3")

    def _plan_research_questions(self, user_input: str, memory_context: Optional[Dict]) -> List[TaskStep]:
        """Plan for Bab 1: Rumusan masalah."""
        req_ctx = self._get_request_context(memory_context)
        steps = [
            TaskStep(
                step_id="step_1",
                agent="chapter_skills_agent",
                tool="draft_research_questions",
                input_from="user",
                output_to="user",
                params={
                    "topic": req_ctx.get("context_title", ""),
                    "project_problem": req_ctx.get("context_problem", ""),
                    "project_objectives": req_ctx.get("context_objectives", ""),
                    "methodology": req_ctx.get("context_method", ""),
                },
                depends_on=[]
            ),
        ]
        return self._add_editor_insertion_step(steps, memory_context, "step_1")

    def _plan_research_objectives(self, user_input: str, memory_context: Optional[Dict]) -> List[TaskStep]:
        """Plan for Bab 1: Tujuan penelitian."""
        req_ctx = self._get_request_context(memory_context)
        steps = [
            TaskStep(
                step_id="step_1",
                agent="chapter_skills_agent",
                tool="draft_research_objectives",
                input_from="user",
                output_to="user",
                params={
                    "topic": req_ctx.get("context_title", ""),
                    "project_problem": req_ctx.get("context_problem", ""),
                    "project_objectives": req_ctx.get("context_objectives", ""),
                    "methodology": req_ctx.get("context_method", ""),
                },
                depends_on=[]
            ),
        ]
        return self._add_editor_insertion_step(steps, memory_context, "step_1")

    def _plan_methodology_justify(self, user_input: str, memory_context: Optional[Dict]) -> List[TaskStep]:
        """Plan for Bab 3: Methodology justification."""
        steps = [
            TaskStep(
                step_id="step_1",
                agent="chapter_skills_agent",
                tool="justify_methodology",
                input_from="user",
                output_to="step_2",
                params={"method_name": user_input},
                depends_on=[]
            ),
            TaskStep(
                step_id="step_2",
                agent="writing_agent",
                tool="polish_academic_tone",
                input_from="step_1",
                output_to="user",
                params={},
                depends_on=["step_1"]
            ),
        ]
        return self._add_editor_insertion_step(steps, memory_context, "step_2")

    def _plan_data_interpretation(self, user_input: str, memory_context: Optional[Dict]) -> List[TaskStep]:
        """Plan for Bab 4: Data interpretation + theory correlation."""
        steps = [
            TaskStep(
                step_id="step_1",
                agent="chapter_skills_agent",
                tool="interpret_data_table",
                input_from="user",
                output_to="step_2",
                params={},
                depends_on=[]
            ),
            TaskStep(
                step_id="step_2",
                agent="chapter_skills_agent",
                tool="correlate_with_bab2",
                input_from="step_1",
                output_to="user",
                params={},
                depends_on=["step_1"]
            ),
        ]
        return self._add_editor_insertion_step(steps, memory_context, "step_2")

    def _plan_thesis_conclusion(self, user_input: str, memory_context: Optional[Dict]) -> List[TaskStep]:
        """Plan for Bab 5: Conclusion + limitations."""
        steps = [
            TaskStep(
                step_id="step_1",
                agent="chapter_skills_agent",
                tool="summarize_to_rq",
                input_from="user",
                output_to="step_2",
                params={},
                depends_on=[]
            ),
            TaskStep(
                step_id="step_2",
                agent="chapter_skills_agent",
                tool="draft_limitations_and_future_work",
                input_from="user",
                output_to="user",
                params={},
                depends_on=["step_1"]
            ),
        ]
        return self._add_editor_insertion_step(steps, memory_context, "step_2")

    def _plan_validate_citations(self, user_input: str, memory_context: Optional[Dict]) -> List[TaskStep]:
        """Plan for citation validation."""
        # Gunakan input langsung dari user agar kutipan di dalam chat/prompt bisa terekstrak
        return [
            TaskStep(
                step_id="step_1",
                agent="diagnostic_agent",
                tool="verify_citations",
                input_from="user",
                output_to="user",
                params={},
                depends_on=[]
            ),
        ]

    def _plan_golden_thread(self, user_input: str, memory_context: Optional[Dict]) -> List[TaskStep]:
        """Plan for golden thread coherence check."""
        req_ctx = self._get_request_context(memory_context)
        golden_thread = req_ctx.get("golden_thread", {}) if isinstance(req_ctx.get("golden_thread", {}), dict) else {}
        return [
            TaskStep(
                step_id="step_1",
                agent="diagnostic_agent",
                tool="check_golden_thread",
                input_from="user",
                output_to="user",
                params={
                    "bab1_rq": golden_thread.get("researchQuestion", req_ctx.get("context_problem", "")),
                    "bab4_findings": golden_thread.get("findings", ""),
                    "bab5_conclusion": golden_thread.get("conclusion", ""),
                },
                depends_on=[]
            ),
        ]

    def _plan_edit_thesis(self, user_input: str, memory_context: Optional[Dict]) -> List[TaskStep]:
        """Plan for editor-based thesis editing."""
        return [
            TaskStep(
                step_id="step_1",
                agent="editor_agent",
                tool="read_editor_context",
                input_from="user",
                output_to="step_2",
                params={"mode": "full"},
                depends_on=[]
            ),
            TaskStep(
                step_id="step_2",
                agent="writing_agent",
                tool="rewrite_text",
                input_from="step_1",
                output_to="user",
                params={"style": "academic formal"},
                depends_on=["step_1"]
            ),
        ]

    # ═══════════════════════════════════════════════════════════
    # V2 DYNAMIC PLAN GENERATION (LLM Fallback)
    # ═══════════════════════════════════════════════════════════

    def _try_dynamic_plan(self, intent: str, user_input: str, memory_context: Optional[Dict]) -> List[TaskStep]:
        """
        LLM-based dynamic plan generator for unknown intents.
        Falls back to empty list if LLM call fails.
        """
        try:
            import litellm
            import re as re_mod
            prompt = (
                "You are a task planner for a thesis writing assistant.\n"
                "Given the user's intent and input, generate a JSON array of execution steps.\n\n"
                "Available agents and tools:\n"
                "- editor_agent: read_editor_context, suggest_replace_text, suggest_insert_text, suggest_delete_text\n"
                "- writing_agent: rewrite_text, paraphrase_text, expand_paragraph, summarize_text, polish_academic_tone, format_citation, generate_literature_review\n"
                "- research_agent: search_papers, rank_papers, extract_findings\n"
                "- analysis_agent: extract_claims, check_logic, score_argument, check_coherence, score_thesis_quality\n"
                "- chapter_skills_agent: formulate_research_gap, align_rq_with_objectives, generate_literature_matrix, synthesize_arguments, validate_citations, justify_methodology, generate_research_flowchart, interpret_data_table, correlate_with_bab2, summarize_to_rq, draft_limitations_and_future_work\n"
                "- diagnostic_agent: analyze_for_missing_citations, check_golden_thread, auto_flag_claims\n\n"
                f"Intent: {intent}\n"
                f"User Input: {user_input}\n\n"
                "Output a JSON array of steps. Each step has:\n"
                '- step_id: "step_1", "step_2", etc.\n'
                "- agent: agent name\n"
                "- tool: tool name\n"
                '- input_from: "user" or previous step_id\n'
                '- output_to: next step_id or "user"\n'
                "- depends_on: list of step_ids that must complete first\n\n"
                "Output ONLY valid JSON array, no explanation."
            )

            response = litellm.completion(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                api_key=self.api_key,
                max_tokens=800,
            )
            raw = response.choices[0].message.content.strip()

            # Extract JSON array
            json_match = re_mod.search(r'\[.*\]', raw, re_mod.DOTALL)
            if json_match:
                raw = json_match.group(0)

            steps_data = json.loads(raw)
            steps = []
            for s in steps_data:
                steps.append(TaskStep(
                    step_id=s.get("step_id", f"step_{len(steps)+1}"),
                    agent=s.get("agent", "writing_agent"),
                    tool=s.get("tool", "rewrite_text"),
                    input_from=s.get("input_from", "user"),
                    output_to=s.get("output_to", "user"),
                    params=s.get("params", {}),
                    depends_on=s.get("depends_on", []),
                ))
            return steps
        except Exception as e:
            logger.warning(f"Dynamic plan generation failed: {e}. Returning empty plan.")
            return []
