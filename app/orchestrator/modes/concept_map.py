from typing import Dict, Any, Generator, Union
from app.orchestrator.modes.base import BaseMode
from app.orchestrator.schema import RequestContext, ExecutionPlan, Step
from app.orchestrator.registry import ModeRegistry
from litellm import completion
import json


@ModeRegistry.register("concept_map")
class ConceptMapMode(BaseMode):
    def __init__(self):
        super().__init__()
        self.mode_name = "concept_map"

    def prepare_context(self, context: RequestContext) -> Dict[str, Any]:
        return {}

    def generate_plan(self, context: RequestContext) -> ExecutionPlan:
        step = Step(name="generate_concept_map", description="Generate JSON structure for concept map.", tool="llm_json")
        return ExecutionPlan(
            request_id=str(context.session_id) if context.session_id else "req_CM",
            project_id=context.project_id,
            user_id=context.user_id,
            mode=self.mode_name,
            intent="concept_mapping",
            requires_rag=True,
            requires_validation=True,
            degree_level=context.academic_level,
            tone_profile=context.tone_preference,
            steps=[step],
        )

    def execute_step(self, step: Step, context: RequestContext) -> Union[str, Generator, Dict]:
        if step.tool == "llm_json":
            return self._generate_json(context.user_message)
        return {"error": "Unknown tool"}

    def _generate_json(self, topic: str) -> Dict:
        system_prompt = (
            "Generate concept map as JSON only with this schema: "
            "{nodes:[{id,label,level}],edges:[{source,target,relation_type}]}. "
            "level is integer hierarchy (1=root). relation_type: hierarchical|causal|associative."
        )
        try:
            response = completion(
                model="groq/llama-3.3-70b-versatile",
                messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": topic}],
                response_format={"type": "json_object"},
                temperature=0.1,
            )
            content = response.choices[0].message.content
            payload = json.loads(content)
            payload.setdefault("nodes", [])
            payload.setdefault("edges", [])
            return payload
        except Exception as e:
            return {"error": str(e), "nodes": [], "edges": []}
