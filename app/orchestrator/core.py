from typing import Generator, Union, Dict, Any
import logging
from app.orchestrator.schema import RequestContext, ExecutionPlan
from app.orchestrator.registry import ModeRegistry
from app.orchestrator.modes.base import BaseMode
from app.orchestrator import modes  # noqa: F401 (load mode registrations)
from app.orchestrator.engines.rag_engine import RagEngine
from app.orchestrator.engines.validator_engine import ValidatorEngine
from app.orchestrator.engines.context_engine import ContextEngine

logger = logging.getLogger(__name__)


class AcademicOrchestrator:
    """Central controller for Context -> Plan -> Retrieve -> Execute -> Validate."""

    def __init__(self):
        self.rag_engine = RagEngine()
        self.validator = ValidatorEngine()

    def process_request(self, user_id: str, message: str, context_data: Dict[str, Any] = None, mode_name: str = "general") -> Union[Dict, Generator]:
        if context_data is None:
            context_data = {}

        request_context = RequestContext(
            user_id=str(user_id),
            project_id=context_data.get("projectId") or context_data.get("project_id"),
            user_message=message,
            context_data=context_data,
            academic_level=context_data.get("academic_level", "S1"),
            field_of_study=context_data.get("field_of_study") or context_data.get("field"),
            tone_preference=context_data.get("tone", "academic"),
        )

        mode: BaseMode = ModeRegistry.get_mode(mode_name) or ModeRegistry.get_mode("general")
        if not mode:
            return {"error": "System Error: no mode registered"}

        try:
            enriched = mode.prepare_context(request_context)
            request_context.context_data.update(enriched or {})
            plan: ExecutionPlan = mode.generate_plan(request_context)
        except Exception as e:
            logger.error(f"Planning failed: {e}")
            return {"error": f"Failed to build execution plan: {str(e)}"}

        rag_result = {"documents": [], "confidence": 0.0}
        if plan.requires_rag:
            rag_result = self.rag_engine.retrieve_with_confidence(
                query=message,
                user_id=str(user_id),
                k=5,
                chapter=context_data.get("chapter"),
            )
            request_context.context_data["rag_confidence"] = rag_result["confidence"]
            if rag_result["confidence"] < 0.25:
                request_context.context_data["epistemic_notice"] = (
                    "Referensi relevan terbatas. Jawaban disusun dengan kehati-hatian epistemik."
                )

        context_package = ContextEngine.build(plan, request_context, rag_result["documents"])
        request_context.context_data.update(context_package)

        # Single-step streaming/text/json modes
        if len(plan.steps) == 1:
            try:
                result = mode.execute_step(plan.steps[0], request_context)
                return result
            except Exception as e:
                logger.error(f"Execution failed: {e}")
                return {"error": f"Execution failed: {str(e)}"}

        results = {}
        for step in plan.steps:
            try:
                results[step.name] = mode.execute_step(step, request_context)
            except Exception as e:
                return {"error": f"Step {step.name} failed: {str(e)}"}

        # Optional validator pass for non-stream aggregated outputs
        if plan.requires_validation and isinstance(results, dict):
            for k, v in list(results.items()):
                if isinstance(v, str):
                    results[f"{k}_validation"] = self.validator.review(v, requires_validation=True)

        return results
