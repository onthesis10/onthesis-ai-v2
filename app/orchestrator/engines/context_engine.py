from typing import Dict, Any, List


class ContextEngine:
    """Builds an ACADEMIC_CONTEXT_PACKAGE from static metadata, summary, conversation, and RAG."""

    @staticmethod
    def build(plan, request_context, retrieved_docs: List[Dict[str, Any]] | None = None) -> Dict[str, Any]:
        context_data = request_context.context_data or {}
        project_meta = {
            "title": context_data.get("context_title") or context_data.get("title", ""),
            "methodology": context_data.get("context_method") or context_data.get("methodology", ""),
            "variables": context_data.get("context_variables") or context_data.get("variables", ""),
            "degree_level": request_context.academic_level,
            "field": request_context.field_of_study,
        }

        package = {
            "project_metadata": project_meta,
            "context_summary": context_data.get("context_summary", ""),
            "conversation_snapshot": context_data.get("conversation_snapshot", ""),
            "last_messages": context_data.get("history", [])[-3:],
            "retrieved_documents": retrieved_docs or [],
            "request_intent": plan.intent,
            "mode": plan.mode,
        }

        return {"ACADEMIC_CONTEXT_PACKAGE": package}
