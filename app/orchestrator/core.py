from typing import Generator, Union, Dict, Any
from app.orchestrator.schema import RequestContext, ExecutionPlan, Step
from app.orchestrator.registry import ModeRegistry
from app.orchestrator.modes.base import BaseMode
import logging
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)

class AcademicOrchestrator:
    """
    Central Controller for OnThesis AI.
    Coordinates: Context -> Planning -> Mode Execution -> Response
    """

    def __init__(self):
        pass

    def process_request(self, user_id: str, message: str, context_data: Dict[str, Any] = None, mode_name: str = "general") -> Union[Dict, Generator]:
        """
        Main entry point for processing user requests.
        """
        if context_data is None:
            context_data = {}

        # 1. Create Request Context
        request_context = RequestContext(
            user_id=user_id,
            user_message=message,
            context_data=context_data,
            # Extract academic preferences from context_data if available
            academic_level=context_data.get('academic_level', 'S1'),
            field_of_study=context_data.get('field_of_study'),
            tone_preference=context_data.get('tone', 'academic')
        )

        logger.info(f"🚀 Orchestrator received request for User: {user_id}, Mode: {mode_name}")

        # 2. Resolve Mode
        mode: BaseMode = ModeRegistry.get_mode(mode_name)
        if not mode:
            logger.error(f"❌ Mode '{mode_name}' not found. Fallback to 'general'.")
            mode = ModeRegistry.get_mode("general")
            if not mode:
                # Critical failure if general mode missing
                return {"error": "System Error: Default mode not found."}

        # 3. Prepare Context (Retrieval/Pruning)
        try:
            enriched_context = mode.prepare_context(request_context)
            # Update context with enriched data
            request_context.context_data.update(enriched_context)
        except Exception as e:
            logger.error(f"⚠️ Context Preparation Failed: {e}")
            # Continue execution even if enrichment fails, logging the error

        # 4. Generate Execution Plan
        try:
            plan: ExecutionPlan = mode.generate_plan(request_context)
            logger.info(f"📋 Execution Plan Generated: {len(plan.steps)} steps.")
        except Exception as e:
            logger.error(f"❌ Planning Failed: {e}")
            return {"error": f"Failed to generate execution plan: {str(e)}"}

        # 5. Execute Plan
        # For simplicity in V1, we assume linear execution. 
        # Future: DAG execution.
        
        # If the plan has only one step and it's a streaming step (e.g. chat response)
        # we return the generator directly.
        if len(plan.steps) == 1:
            step = plan.steps[0]
            try:
                result = mode.execute_step(step, request_context)
                return result
            except Exception as e:
                logger.error(f"❌ Execution Failed: {e}")
                return {"error": f"Execution failed: {str(e)}"}

        # For multi-step plans, we might need a different handling strategy (e.g. returning a JSON with results)
        results = {}
        for step in plan.steps:
            try:
                step.status = "running"
                res = mode.execute_step(step, request_context)
                step.result = res
                step.status = "completed"
                results[step.name] = res
            except Exception as e:
                step.status = "failed"
                step.error = str(e)
                logger.error(f"❌ Step '{step.name}' Failed: {e}")
                # Stop chain on failure? Or continue? For now, break.
                break
        
        return results
