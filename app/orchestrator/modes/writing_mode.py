from typing import Dict, Any, Generator, Union
from app.orchestrator.modes.base import BaseMode
from app.orchestrator.schema import RequestContext, ExecutionPlan, Step
from app.orchestrator.registry import ModeRegistry
from app.orchestrator.engines.tone_controller import ToneController
import logging
from litellm import completion

logger = logging.getLogger(__name__)


@ModeRegistry.register("writing")
class WritingMode(BaseMode):
    def __init__(self):
        super().__init__()
        self.mode_name = "writing"

    def prepare_context(self, context: RequestContext) -> Dict[str, Any]:
        return {"academic_formatting_rules": "APA Style", "requires_rag": True}

    def generate_plan(self, context: RequestContext) -> ExecutionPlan:
        step = Step(
            name="academic_writing",
            description="Generate structured academic writing.",
            tool="llm_writing",
            params={"model": "groq/llama-3.3-70b-versatile"},
        )
        return ExecutionPlan(
            request_id=str(context.session_id) if context.session_id else "req_0",
            project_id=context.project_id,
            user_id=context.user_id,
            mode=self.mode_name,
            intent="academic_writing",
            requires_rag=True,
            requires_validation=True,
            degree_level=context.academic_level,
            tone_profile=context.tone_preference,
            steps=[step],
        )

    def execute_step(self, step: Step, context: RequestContext) -> Union[str, Generator, Dict]:
        if step.tool == "llm_writing":
            return self._stream_writing(context)
        return "Unknown tool"

    def _stream_writing(self, context: RequestContext) -> Generator:
        try:
            field = context.field_of_study or "General"
            tone_instruction = ToneController.get_system_instruction(context.academic_level, context.tone_preference)
            package = context.context_data.get("ACADEMIC_CONTEXT_PACKAGE", {})
            rag_docs = package.get("retrieved_documents", [])
            rag_preview = "\n".join([f"- {d.get('content', '')[:220]}" for d in rag_docs[:5]])

            system_prompt = (
                f"You are an expert academic writer in {field}.\n"
                f"{tone_instruction}\n"
                "Use this structure strictly: [Theoretical Framing] [Argument Development] [Evidence Integration] [Analytical Linkage] [Synthesis].\n"
                "If evidence confidence is low, explicitly state uncertainty and recommend additional references.\n"
                f"Project context:\n{package}\n"
                f"Retrieved references:\n{rag_preview}\n"
            )

            response = completion(
                model="groq/llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": context.user_message},
                ],
                stream=True,
                temperature=0.3,
            )
            for chunk in response:
                content = chunk.choices[0].delta.content
                if content:
                    yield content
        except Exception as e:
            logger.error(f"Writing Mode Error: {e}")
            yield f"Error: {str(e)}"
