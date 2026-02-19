from typing import Dict, Any, Generator, Union
from app.orchestrator.modes.base import BaseMode
from app.orchestrator.schema import RequestContext, ExecutionPlan, Step
from app.orchestrator.registry import ModeRegistry
from litellm import completion
import json


@ModeRegistry.register("mind_map")
class MindMapMode(BaseMode):
    def __init__(self):
        super().__init__()
        self.mode_name = "mind_map"

    def prepare_context(self, context: RequestContext) -> Dict[str, Any]:
        return {}

    def generate_plan(self, context: RequestContext) -> ExecutionPlan:
        step = Step(name="generate_mind_map", description="Generate associative map JSON.", tool="llm_mind_map")
        return ExecutionPlan(
            request_id=str(context.session_id) if context.session_id else "req_MM",
            project_id=context.project_id,
            user_id=context.user_id,
            mode=self.mode_name,
            intent="mind_mapping",
            requires_rag=False,
            requires_validation=True,
            degree_level=context.academic_level,
            tone_profile=context.tone_preference,
            steps=[step],
        )

    def execute_step(self, step: Step, context: RequestContext) -> Union[str, Generator, Dict]:
        if step.tool != "llm_mind_map":
            return {"error": "Unknown tool"}
        prompt = "Output JSON only: {nodes:[{id,label,level}],edges:[{source,target,relation_type}]} with exploratory associative links."
        response = completion(
            model="groq/llama-3.3-70b-versatile",
            messages=[{"role": "system", "content": prompt}, {"role": "user", "content": context.user_message}],
            response_format={"type": "json_object"},
            temperature=0.4,
        )
        try:
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            return {"error": str(e), "nodes": [], "edges": []}
