from typing import Dict, Any, Generator, Union
from app.orchestrator.modes.base import BaseMode
from app.orchestrator.schema import RequestContext, ExecutionPlan, Step
from app.orchestrator.registry import ModeRegistry
from litellm import completion
import json
import re

@ModeRegistry.register("concept_map")
class ConceptMapMode(BaseMode):
    """
    Mode for generating Concept Maps and Knowledge Graphs.
    Output is strictly JSON conformant to a schema.
    """
    
    def __init__(self):
        super().__init__()
        self.mode_name = "concept_map"

    def prepare_context(self, context: RequestContext) -> Dict[str, Any]:
        return {}

    def generate_plan(self, context: RequestContext) -> ExecutionPlan:
        step = Step(
            name="generate_concept_map",
            description="Generate JSON structure for concept map.",
            tool="llm_json",
            params={
                "model": "groq/llama-3.3-70b-versatile"
            }
        )
        return ExecutionPlan(
            request_id=str(context.session_id) if context.session_id else "req_CM",
            mode=self.mode_name,
            steps=[step]
        )

    def execute_step(self, step: Step, context: RequestContext) -> Union[str, Generator, Dict]:
        if step.tool == "llm_json":
            return self._generate_json(context.user_message)
        return "Unknown tool"

    def _generate_json(self, topic: str) -> Dict:
        """
        Generates concept map JSON.
        """
        system_prompt = (
            "You are a Knowledge Graph Generator.\n"
            "Task: Create a Concept Map for the user's topic.\n"
            "Output Format: JSON ONLY.\n"
            "Schema:\n"
            "{\n"
            "  \"nodes\": [{\"id\": \"1\", \"label\": \"Main Concept\", \"type\": \"core\"}],\n"
            "  \"edges\": [{\"source\": \"1\", \"target\": \"2\", \"relation\": \"causes\"}]\n"
            "}\n"
            "Relation Types: hierarchical, causal, associative.\n"
        )
        
        try:
            response = completion(
                model="groq/llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": topic}
                ],
                response_format={"type": "json_object"},
                temperature=0.1
            )
            content = response.choices[0].message.content
            # Basic cleaning
            if "```" in content:
                content = content.split("```json")[-1].split("```")[0].strip()
            return json.loads(content)
        except Exception as e:
            return {"error": str(e)}
