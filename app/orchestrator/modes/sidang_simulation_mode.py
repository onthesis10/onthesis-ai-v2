from typing import Dict, Any, Generator, Union
from app.orchestrator.modes.base import BaseMode
from app.orchestrator.schema import RequestContext, ExecutionPlan, Step
from app.orchestrator.registry import ModeRegistry
from litellm import completion


@ModeRegistry.register("sidang_simulation")
class SidangSimulationMode(BaseMode):
    def __init__(self):
        super().__init__()
        self.mode_name = "sidang_simulation"

    def prepare_context(self, context: RequestContext) -> Dict[str, Any]:
        return {}

    def generate_plan(self, context: RequestContext) -> ExecutionPlan:
        step = Step(name="simulate_examiner", description="Generate examiner questions and model answers.", tool="llm_sidang")
        return ExecutionPlan(
            request_id=str(context.session_id) if context.session_id else "req_SD",
            project_id=context.project_id,
            user_id=context.user_id,
            mode=self.mode_name,
            intent="thesis_defense_simulation",
            requires_rag=True,
            requires_validation=True,
            degree_level=context.academic_level,
            tone_profile=context.tone_preference,
            steps=[step],
        )

    def execute_step(self, step: Step, context: RequestContext) -> Union[str, Generator, Dict]:
        if step.tool != "llm_sidang":
            return "Unknown tool"
        prompt = (
            "Simulasikan dosen penguji skripsi. Berikan 5 pertanyaan sulit + alasan pertanyaan + contoh jawaban ideal ringkas. "
            "Fokus pada metodologi, validitas, kontribusi, keterbatasan, dan implikasi praktis."
        )
        response = completion(
            model="groq/llama-3.3-70b-versatile",
            messages=[{"role": "system", "content": prompt}, {"role": "user", "content": context.user_message}],
            stream=True,
            temperature=0.3,
        )
        for chunk in response:
            content = chunk.choices[0].delta.content
            if content:
                yield content
