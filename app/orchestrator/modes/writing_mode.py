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
    """
    Specialized mode for Academic Writing.
    Handles strict academic tone, citations, and structural requirements.
    """

    def __init__(self):
        super().__init__()
        self.mode_name = "writing"

    def prepare_context(self, context: RequestContext) -> Dict[str, Any]:
        """
        Enrich context with specific academic data (e.g. references).
        """
        # Placeholder: In real implementation, this would look up RAG/VectorDB
        return {"references": [], "academic_formatting_rules": "APA Style"}

    def generate_plan(self, context: RequestContext) -> ExecutionPlan:
        """
        Determine if this is a simple writing task or a complex multi-step generation.
        """
        # Logic to determine task complexity could go here.
        # For now, treat everything as a single 'write' step.
        
        step = Step(
            name="academic_writing",
            description="Generate academic content based on user request.",
            tool="llm_writing",
            params={
                "model": "groq/llama-3.3-70b-versatile",
                "tone": context.tone_preference,
                "level": context.academic_level
            }
        )
        
        return ExecutionPlan(
            request_id=str(context.session_id) if context.session_id else "req_0",
            mode=self.mode_name,
            steps=[step]
        )

    def execute_step(self, step: Step, context: RequestContext) -> Union[str, Generator, Dict]:
        """
        Executes the writing task.
        """
        if step.tool == "llm_writing":
            return self._stream_writing(context)
        return "Unknown tool"

    def _stream_writing(self, context: RequestContext) -> Generator:
        """
        Streams academic writing response.
        """
        try:
            field = context.field_of_study or "General"
            level = context.academic_level
            tone_pref = context.tone_preference

            # Get tone instruction from controller
            tone_instruction = ToneController.get_system_instruction(level, tone_pref)
            
            # Extract Project Context
            project_context = ""
            if context.context_data:
                p_title = context.context_data.get('context_title')
                p_problem = context.context_data.get('context_problem')
                p_method = context.context_data.get('context_method')
                p_vars = context.context_data.get('context_variables')
                
                if p_title:
                    project_context = (
                        f"\n\nCURRENT PROJECT CONTEXT:\n"
                        f"Title: {p_title}\n"
                        f"Problem Statement: {p_problem}\n"
                        f"Methodology: {p_method}\n"
                        f"Variables: {p_vars}\n"
                        f"Instruction: Ensure all responses are strictly aligned with this project context.\n"
                    )

            system_prompt = (
                f"You are an expert academic writer in the field of {field}.\n"
                f"{tone_instruction}\n"
                f"{project_context}\n"
                "Additional Rules:\n"
                "1. Use formal, objective, and precise language.\n"
                "2. Avoid colloquialisms and vague statements.\n"
                "3. Structure your response logically with clear arguments.\n"
            )

            response = completion(
                model="groq/llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": context.user_message}
                ],
                stream=True,
                temperature=0.3
            )
            for chunk in response:
                content = chunk.choices[0].delta.content
                if content:
                    yield content
        except Exception as e:
            logger.error(f"Writing Mode Error: {e}")
            yield f"Error: {str(e)}"
