from typing import Dict, Any, Generator, Union
from app.orchestrator.modes.base import BaseMode
from app.orchestrator.schema import RequestContext, ExecutionPlan, Step
from app.orchestrator.registry import ModeRegistry
from litellm import completion


@ModeRegistry.register("critique")
class CritiqueMode(BaseMode):
    def __init__(self):
        super().__init__()
        self.mode_name = "critique"

    def prepare_context(self, context: RequestContext) -> Dict[str, Any]:
        return {}

    def generate_plan(self, context: RequestContext) -> ExecutionPlan:
        step = Step(name="critique_text", description="Critique academic content.", tool="llm_critique")
        return ExecutionPlan(
            request_id=str(context.session_id) if context.session_id else "req_CR",
            project_id=context.project_id,
            user_id=context.user_id,
            mode=self.mode_name,
            intent="academic_critique",
            requires_rag=True,
            requires_validation=True,
            degree_level=context.academic_level,
            tone_profile=context.tone_preference,
            steps=[step],
        )

    def execute_step(self, step: Step, context: RequestContext) -> Union[str, Generator, Dict]:
        if step.tool != "llm_critique":
            return "Unknown tool"
        return self._stream(context)

    def _stream(self, context: RequestContext):
        package = context.context_data.get("ACADEMIC_CONTEXT_PACKAGE", {})
        prompt = (
            "Lakukan kritik akademik terstruktur: kekuatan, kelemahan, gap argumentasi, rekomendasi revisi prioritas. "
            "Selalu berbasis konteks project berikut: "
            f"{package}"
        )
        response = completion(
            model="groq/llama-3.3-70b-versatile",
            messages=[{"role": "system", "content": prompt}, {"role": "user", "content": context.user_message}],
            stream=True,
            temperature=0.2,
        )
        for chunk in response:
            content = chunk.choices[0].delta.content
            if content:
                yield content
