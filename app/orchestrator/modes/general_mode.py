from typing import Dict, Any, Generator, Union
from app.orchestrator.modes.base import BaseMode
from app.orchestrator.schema import RequestContext, ExecutionPlan, Step
from app.orchestrator.registry import ModeRegistry
import logging
from litellm import completion

logger = logging.getLogger(__name__)

@ModeRegistry.register("general")
class GeneralMode(BaseMode):
    """
    Default mode for general interaction.
    Handles basic chat, navigation, and simple queries.
    """
    
    def __init__(self):
        super().__init__()
        self.mode_name = "general"

    def prepare_context(self, context: RequestContext) -> Dict[str, Any]:
        """
        General mode doesn't need heavy context preparation.
        Maybe just user history if available.
        """
        return {"history_summary": "No history available yet."}

    def generate_plan(self, context: RequestContext) -> ExecutionPlan:
        """
        Simple plan: Just one step to generate response.
        """
        step = Step(
            name="generate_response",
            description="Generate a helpful response to the user.",
            tool="llm_chat",
            params={"model": "groq/llama-3.3-70b-versatile"}
        )
        
        return ExecutionPlan(
            request_id=str(context.session_id) if context.session_id else "req_0",
            mode=self.mode_name,
            steps=[step]
        )

    def execute_step(self, step: Step, context: RequestContext) -> Union[str, Generator, Dict]:
        """
        Executes the chat generation.
        """
        if step.tool == "llm_chat":
            return self._stream_chat(context.user_message)
        return "Unknown tool"

    def _stream_chat(self, message: str) -> Generator:
        """
        Streams response from LLM.
        """
        try:
            response = completion(
                model="groq/llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are OnThesis AI, a helpful academic assistant. Answer briefly and professionally."},
                    {"role": "user", "content": message}
                ],
                stream=True,
                temperature=0.3
            )
            for chunk in response:
                content = chunk.choices[0].delta.content
                if content:
                    yield content
        except Exception as e:
            logger.error(f"General Mode Chat Error: {e}")
            yield f"Error: {str(e)}"
