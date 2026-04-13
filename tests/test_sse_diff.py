import importlib
import sys
import types
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]

app_package = types.ModuleType("app")
app_package.__path__ = [str(REPO_ROOT / "app")]
sys.modules.setdefault("app", app_package)

agent_package = types.ModuleType("app.agent")
agent_package.__path__ = [str(REPO_ROOT / "app" / "agent")]
sys.modules.setdefault("app.agent", agent_package)
app_package.agent = agent_package

for module_name in (
    "app.agent.task_planner",
    "app.agent.plan_executor",
    "app.agent.editor_agent",
):
    sys.modules.pop(module_name, None)

task_planner_module = importlib.import_module("app.agent.task_planner")
plan_executor_module = importlib.import_module("app.agent.plan_executor")
editor_agent_module = importlib.import_module("app.agent.editor_agent")

TaskPlanner = task_planner_module.TaskPlanner
PlanExecutor = plan_executor_module.PlanExecutor
EditorAgent = editor_agent_module.EditorAgent


class FakeMemory:
    def __init__(self, request_context):
        self.request_context = request_context


class FakeWritingAgent:
    def run_tool(self, tool_name, input_data, params, memory=None):
        if tool_name == "rewrite_text":
            return f"Rewritten: {input_data}"
        if tool_name == "polish_academic_tone":
            return f"Polished: {input_data}"
        raise ValueError(f"Unexpected tool {tool_name}")


def collect_sse_events(intent="rewrite_paragraph", context=None, message="Perbaiki paragraf ini."):
    planner = TaskPlanner()
    runtime_context = {"request_context": context or {}}
    plan = planner.generate_plan(intent=intent, user_input=message, memory_context=runtime_context)
    events = []

    def on_event(event_type, data):
        event = {"type": event_type}
        if isinstance(data, dict):
            event.update(data)
        events.append(event)
        if event_type == "TOOL_RESULT":
            result = data.get("result")
            if isinstance(result, dict) and result.get("diff"):
                events.append({"type": "PENDING_DIFF", "diff": result["diff"]})

    executor = PlanExecutor(
        agents={
            "writing_agent": FakeWritingAgent(),
            "editor_agent": EditorAgent(),
        },
        memory=FakeMemory(context or {}),
        on_event=on_event,
    )
    executor.execute(plan)
    return events


class FakeDiffSession:
    def __init__(self, diff):
        self.pending = {diff["diffId"]: diff}
        self.current_text = diff.get("old_text", "")

    def accept(self, diff_id):
        diff = self.pending.pop(diff_id)
        if diff["type"] in {"edit", "insert"}:
            self.current_text = diff.get("new_text", "")

    def reject(self, diff_id):
        diff = self.pending.pop(diff_id)
        self.current_text = diff.get("old_text", "")


def _editor_context():
    return {
        "active_paragraphs": [
            {
                "paraId": "P-1",
                "content": "Teks lama",
            }
        ]
    }


def test_rewrite_intent_emits_pending_diff_event():
    events = collect_sse_events(context=_editor_context())

    diff_events = [event for event in events if event["type"] == "PENDING_DIFF"]
    assert len(diff_events) > 0


def test_pending_diff_has_required_fields():
    events = collect_sse_events(context=_editor_context())
    diff_event = next(event for event in events if event["type"] == "PENDING_DIFF")
    diff = diff_event["diff"]

    assert "old_text" in diff
    assert "new_text" in diff
    assert "diffId" in diff
    assert "diff_id" in diff
    assert diff["old_text"] == "Teks lama"


def test_accept_diff_removes_pending_state():
    events = collect_sse_events(context=_editor_context())
    diff = next(event["diff"] for event in events if event["type"] == "PENDING_DIFF")
    session = FakeDiffSession(diff)

    session.accept(diff["diffId"])

    assert diff["diffId"] not in session.pending
    assert session.current_text == diff["new_text"]


def test_reject_diff_restores_original():
    events = collect_sse_events(context=_editor_context())
    diff = next(event["diff"] for event in events if event["type"] == "PENDING_DIFF")
    session = FakeDiffSession(diff)
    session.current_text = diff["new_text"]

    session.reject(diff["diffId"])

    assert diff["diffId"] not in session.pending
    assert session.current_text == "Teks lama"
