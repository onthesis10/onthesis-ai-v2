from datetime import datetime

from app.agent.plan_executor import PlanExecutor
from app.agent.task_planner import TaskPlan, TaskStep


class RecordingAgent:
    def __init__(self):
        self.received = []

    def run_tool(self, tool_name, input_data, params, memory=None, **kwargs):
        self.received.append({
            "tool": tool_name,
            "input_data": input_data,
            "params": params,
        })
        if tool_name == "extract_claims":
            return '{"claims": ["klaim utama"]}'
        if tool_name == "score_argument":
            return {
                "text": input_data,
                "claims_input": params.get("claims_input"),
            }
        return input_data


def test_executor_resolves_step_references_inside_params():
    analysis_agent = RecordingAgent()
    executor = PlanExecutor(
        agents={"analysis_agent": analysis_agent},
        memory=None,
        on_event=None,
    )

    plan = TaskPlan(
        plan_id="plan-1",
        user_query="Paragraf tesis yang perlu dianalisis",
        intent="analyze_argument",
        steps=[
            TaskStep(
                step_id="step_1",
                agent="analysis_agent",
                tool="extract_claims",
                input_from="user",
                output_to="step_2",
                params={},
                depends_on=[],
            ),
            TaskStep(
                step_id="step_2",
                agent="analysis_agent",
                tool="score_argument",
                input_from="user",
                output_to="user",
                params={"claims_input": "step_1"},
                depends_on=["step_1"],
            ),
        ],
        estimated_tokens=1200,
        created_at=datetime.now(),
        status="pending",
    )

    result = executor.execute(plan)

    assert result["claims_input"] == '{"claims": ["klaim utama"]}'
    assert analysis_agent.received[-1]["params"]["claims_input"] == '{"claims": ["klaim utama"]}'
    assert getattr(plan, "execution_trace", [])
    assert plan.execution_trace[-1]["status"] == "success"


def test_executor_retries_retryable_tool_once():
    class FlakyResearchAgent:
        def __init__(self):
            self.calls = 0

        def run_tool(self, tool_name, input_data, params, memory=None, **kwargs):
            self.calls += 1
            if self.calls == 1:
                raise RuntimeError("temporary failure")
            return [{"title": "Paper A"}]

    agent = FlakyResearchAgent()
    executor = PlanExecutor(
        agents={"research_agent": agent},
        memory=None,
        on_event=None,
    )

    plan = TaskPlan(
        plan_id="plan-retry",
        user_query="Cari paper tentang AI",
        intent="find_papers",
        steps=[
            TaskStep(
                step_id="step_1",
                agent="research_agent",
                tool="search_papers",
                input_from="user",
                output_to="user",
                params={"query": "AI", "limit": 5},
                depends_on=[],
            ),
        ],
        estimated_tokens=500,
        created_at=datetime.now(),
        status="pending",
    )

    result = executor.execute(plan)

    assert result == [{"title": "Paper A"}]
    assert agent.calls == 2
    assert [entry["status"] for entry in plan.execution_trace] == ["error", "success"]
