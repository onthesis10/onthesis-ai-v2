from datetime import datetime

from app.agent.plan_executor import ERROR_MESSAGES, PlanExecutor
from app.agent.task_planner import TaskPlan, TaskStep
from app.routes.assistant_routes import _legacy_generator_task_to_agent_prompt


class DummyAgent:
    def run_tool(self, tool_name, input_data, params, memory=None):
        return f"ran:{tool_name}"


def test_plan_executor_fails_fast_when_plan_exceeds_step_budget():
    events = []
    executor = PlanExecutor(
        agents={"research_agent": DummyAgent()},
        memory=None,
        on_event=lambda event_type, payload: events.append((event_type, payload)),
    )

    plan = TaskPlan(
        plan_id="plan-over-budget",
        user_query="Tolong bantu literature review lengkap",
        intent="literature_review",
        steps=[
            TaskStep(f"step_{idx}", "research_agent", "search_papers", "user", "user", {}, [])
            for idx in range(1, executor.max_steps + 2)
        ],
        estimated_tokens=1000,
        created_at=datetime.utcnow(),
        status="pending",
    )

    result = executor.execute(plan)

    assert result == ERROR_MESSAGES["too_many_steps"]
    assert plan.status == "failed"
    assert any(event_type == "ERROR" for event_type, _ in events)
    assert any("batas" in payload["message"].lower() for event_type, payload in events if event_type == "ERROR")


def test_legacy_generator_prompt_maps_bab2_task_to_agent_instruction():
    prompt = _legacy_generator_task_to_agent_prompt(
        "bab2_part_framework",
        {
            "context_title": "Pengaruh AI pada Pembelajaran",
            "context_problem": "Mahasiswa kesulitan menyusun argumen akademik",
            "input_text": "Fokus pada kerangka pemikiran.",
        },
        thesis_context_str="Bab 1 sudah menjelaskan gap penelitian.",
    )

    assert "kerangka pemikiran" in prompt.lower()
    assert "Pengaruh AI pada Pembelajaran" in prompt
    assert "Mahasiswa kesulitan menyusun argumen akademik" in prompt
    assert "Bab 1 sudah menjelaskan gap penelitian." in prompt


def test_legacy_generator_prompt_keeps_validate_citations_explicit():
    prompt = _legacy_generator_task_to_agent_prompt(
        "validate_citations",
        {"input_text": "Menurut Smith (2020), ..."},
    )

    assert "periksa" in prompt.lower()
    assert "sitasi" in prompt.lower()
