from app.agent.intent_classifier import IntentClassifier
from app.agent.task_planner import TaskPlanner


def test_classifier_routes_rumusan_masalah_to_bab1_intent():
    classifier = IntentClassifier(confidence_threshold=0.7)
    result = classifier.classify("buatkan rumusan masalah sesuai topik saya", [])

    assert result["intent"] == "research_questions"
    assert result["needs_clarification"] is False


def test_classifier_routes_tujuan_penelitian_to_bab1_intent():
    classifier = IntentClassifier(confidence_threshold=0.7)
    result = classifier.classify("susun tujuan penelitian berdasarkan rumusan masalah saya", [])

    assert result["intent"] == "research_objectives"
    assert result["needs_clarification"] is False


def test_planner_uses_bab1_tool_for_rumusan_masalah():
    planner = TaskPlanner()
    memory_context = {
        "request_context": {
            "context_title": "Pengaruh LMS terhadap motivasi belajar siswa",
            "context_problem": "",
            "context_objectives": "",
            "context_method": "Kuantitatif",
            "active_paragraphs": [{"paraId": "P-1", "content": "Pendahuluan"}],
        }
    }

    plan = planner.generate_plan("research_questions", "buatkan rumusan masalah sesuai topik saya", memory_context)
    tools = [step.tool for step in plan.steps]

    assert "draft_research_questions" in tools
    assert "summarize_to_rq" not in tools
    assert "draft_limitations_and_future_work" not in tools


def test_planner_uses_bab1_tool_for_tujuan_penelitian():
    planner = TaskPlanner()
    memory_context = {
        "request_context": {
            "context_title": "Pengaruh LMS terhadap motivasi belajar siswa",
            "context_problem": "1. Bagaimana penggunaan LMS?",
            "context_objectives": "",
            "context_method": "Kuantitatif",
            "active_paragraphs": [{"paraId": "P-1", "content": "Pendahuluan"}],
        }
    }

    plan = planner.generate_plan("research_objectives", "susun tujuan penelitian", memory_context)
    tools = [step.tool for step in plan.steps]

    assert "draft_research_objectives" in tools
    assert "summarize_to_rq" not in tools
