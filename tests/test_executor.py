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
    "app.agent.supervisor",
):
    sys.modules.pop(module_name, None)

task_planner_module = importlib.import_module("app.agent.task_planner")
plan_executor_module = importlib.import_module("app.agent.plan_executor")

TaskPlan = task_planner_module.TaskPlan
TaskStep = task_planner_module.TaskStep
PlanExecutor = plan_executor_module.PlanExecutor
ERROR_MESSAGES = plan_executor_module.ERROR_MESSAGES


class FakeConversation:
    def __init__(self, fail_on=None):
        self.fail_on = fail_on
        self.store_plan_calls = []
        self.add_plan_calls = []
        self.user_turns = []
        self.assistant_turns = []
        self.plans = {}

    def store_plan(self, plan):
        self.store_plan_calls.append(plan.plan_id)
        if self.fail_on == "store_plan":
            raise RuntimeError("store plan failed")
        self.plans[plan.plan_id] = plan

    def add_assistant_turn(self, content, intent=None, plan_id=None):
        self.assistant_turns.append(
            {"content": content, "intent": intent, "plan_id": plan_id}
        )
        if self.fail_on == "assistant":
            raise RuntimeError("assistant turn failed")

    def add_plan(self, plan, result):
        self.add_plan_calls.append(plan.plan_id)
        previous_plans = dict(self.plans)
        previous_turns = list(self.assistant_turns)
        try:
            self.store_plan(plan)
            self.add_assistant_turn(result, intent=plan.intent, plan_id=plan.plan_id)
        except Exception:
            self.plans = previous_plans
            self.assistant_turns = previous_turns
            raise

    def add_turn(self, role, content, intent=None, plan_id=None):
        bucket = self.user_turns if role == "user" else self.assistant_turns
        bucket.append(
            {"role": role, "content": content, "intent": intent, "plan_id": plan_id}
        )


def _make_plan(intent="rewrite_paragraph"):
    return TaskPlan(
        plan_id="plan-1",
        user_query="Perbaiki paragraf ini.",
        intent=intent,
        steps=[
            TaskStep(
                step_id="step_1",
                agent="writing_agent",
                tool="rewrite_text",
                input_from="user",
                output_to="user",
                params={},
                depends_on=[],
            )
        ],
        estimated_tokens=100,
        created_at=task_planner_module.datetime.now(),
        status="pending",
    )


def test_plan_and_turn_committed_together():
    executor = PlanExecutor(agents={})
    conversation = FakeConversation()
    plan = _make_plan()

    executor._commit_plan_result(conversation, plan, "Hasil akhir.")

    assert conversation.add_plan_calls == ["plan-1"]
    assert list(conversation.plans.keys()) == ["plan-1"]
    assert conversation.assistant_turns == [
        {"content": "Hasil akhir.", "intent": "rewrite_paragraph", "plan_id": "plan-1"}
    ]
    assert executor.plan_result_committed is True


def test_commit_does_not_raise_on_memory_failure():
    executor = PlanExecutor(agents={})
    conversation = FakeConversation(fail_on="assistant")
    plan = _make_plan()

    executor._commit_plan_result(conversation, plan, "Hasil akhir.")

    assert conversation.add_plan_calls == ["plan-1"]
    assert conversation.plans == {}
    assert conversation.assistant_turns == []
    assert executor.plan_result_committed is False
    assert executor.plan_result_commit_attempted is True


agent_registry_stub = types.ModuleType("app.agent.agent_registry")


class AgentRegistry:
    def __init__(self):
        self.agents = {}

    def get_all_agents(self):
        return self.agents

    def get_agent(self, name):
        return self.agents.get(name)


agent_registry_stub.AgentRegistry = AgentRegistry
sys.modules["app.agent.agent_registry"] = agent_registry_stub


intent_classifier_stub = types.ModuleType("app.agent.intent_classifier")


class IntentClassifier:
    def __init__(self, confidence_threshold=0.7):
        self.confidence_threshold = confidence_threshold

    def classify(self, message, history):
        return {"intent": "rewrite_paragraph", "confidence": 0.94}


intent_classifier_stub.IntentClassifier = IntentClassifier
sys.modules["app.agent.intent_classifier"] = intent_classifier_stub


memory_system_stub = types.ModuleType("app.agent.memory_system")


class _DummyProfile:
    def update_from_conversation(self, user_id, message):
        return None


class SharedMemory:
    last_instance = None

    def __init__(self, user_id, project_id, vector_db, doc_db):
        self.user_id = user_id
        self.project_id = project_id
        self.vector_db = vector_db
        self.doc_db = doc_db
        self.profile = _DummyProfile()
        self.conversation = FakeConversation()
        self.request_context = {}
        SharedMemory.last_instance = self

    def build_agent_context(self, message):
        return {
            "conversation_history": [],
            "request_context": self.request_context,
        }


class QdrantVectorDB:
    pass


class FirestoreDocumentDB:
    pass


memory_system_stub.SharedMemory = SharedMemory
memory_system_stub.QdrantVectorDB = QdrantVectorDB
memory_system_stub.FirestoreDocumentDB = FirestoreDocumentDB
memory_system_stub.count_tokens = lambda text: len(str(text))
memory_system_stub.build_memory_prompt_context = lambda memory, include_conversation=True: ""
sys.modules["app.agent.memory_system"] = memory_system_stub

sys.modules.pop("app.agent.supervisor", None)
supervisor_module = importlib.import_module("app.agent.supervisor")


def test_no_double_write_when_executor_commits(monkeypatch):
    class FakeExecutor:
        last_instance = None

        def __init__(self, agents, memory=None, on_event=None):
            self.memory = memory
            self.plan_result_commit_attempted = False
            self.plan_result_committed = False
            FakeExecutor.last_instance = self

        def execute(self, plan):
            return "Paragraf hasil revisi."

        def _commit_plan_result(self, conversation, plan, result):
            self.plan_result_commit_attempted = True
            conversation.add_plan(plan, result)
            self.plan_result_committed = True

    monkeypatch.setattr(supervisor_module, "PlanExecutor", FakeExecutor)

    supervisor = supervisor_module.SupervisorAgent.__new__(supervisor_module.SupervisorAgent)
    supervisor.api_key = None
    supervisor.model = "test-model"
    supervisor.registry = types.SimpleNamespace(get_all_agents=lambda: {})
    supervisor.vector_db = object()
    supervisor.doc_db = object()
    supervisor.classifier = types.SimpleNamespace(
        classify=lambda message, history: {"intent": "rewrite_paragraph", "confidence": 0.95}
    )
    plan = _make_plan()
    supervisor.planner = types.SimpleNamespace(
        generate_plan=lambda intent, user_input, memory_context=None: plan
    )
    supervisor._is_lightweight_greeting = lambda message: False
    supervisor._is_lightweight_general_question = lambda message, context: False
    supervisor._needs_thesis_tools = lambda message, context: False
    supervisor._emit = lambda on_event, event_type, data: None
    supervisor._format_memory_context = lambda context: ""
    supervisor._synthesize_final_response = lambda raw_output, context: str(raw_output)

    result = supervisor.process_request(
        user_id="user-1",
        message="Tolong rewrite paragraf ini.",
        context={"projectId": "project-1"},
    )

    conversation = SharedMemory.last_instance.conversation

    assert result == "Paragraf hasil revisi."
    assert conversation.store_plan_calls == ["plan-1"]
    assert conversation.user_turns == [
        {
            "role": "user",
            "content": "Tolong rewrite paragraf ini.",
            "intent": "rewrite_paragraph",
            "plan_id": "plan-1",
        }
    ]
    assert conversation.assistant_turns == [
        {
            "content": "Paragraf hasil revisi.",
            "intent": "rewrite_paragraph",
            "plan_id": "plan-1",
        }
    ]


class RecordingAgent:
    def __init__(self, responses=None, side_effects=None):
        self.responses = list(responses or [])
        self.side_effects = list(side_effects or [])
        self.calls = []

    def run_tool(self, tool, input_data, params, memory=None):
        self.calls.append((tool, input_data, params))
        if self.side_effects:
            effect = self.side_effects.pop(0)
            if isinstance(effect, Exception):
                raise effect
            if callable(effect):
                return effect(tool, input_data, params, memory)
            return effect
        if self.responses:
            return self.responses.pop(0)
        return f"{tool}:{input_data}"


def _make_executor_plan(steps):
    return TaskPlan(
        plan_id="plan-exec",
        user_query="Input user",
        intent="rewrite_paragraph",
        steps=steps,
        estimated_tokens=300,
        created_at=task_planner_module.datetime.now(),
        status="pending",
    )


def test_executor_runs_steps_in_order():
    first_agent = RecordingAgent(responses=["draft-1"])
    second_agent = RecordingAgent(responses=["draft-2"])
    executor = PlanExecutor(
        agents={"agent_a": first_agent, "agent_b": second_agent}
    )
    plan = _make_executor_plan(
        [
            TaskStep("step_1", "agent_a", "rewrite_text", "user", "step_2", {}, []),
            TaskStep("step_2", "agent_b", "polish_academic_tone", "step_1", "user", {}, ["step_1"]),
        ]
    )

    result = executor.execute(plan)

    assert result == "draft-2"
    assert first_agent.calls[0][0] == "rewrite_text"
    assert second_agent.calls[0][0] == "polish_academic_tone"
    assert second_agent.calls[0][1] == "draft-1"


def test_executor_respects_step_dependency():
    failing_agent = RecordingAgent(side_effects=[RuntimeError("step failed")])
    blocked_agent = RecordingAgent(responses=["should-not-run"])
    executor = PlanExecutor(
        agents={"agent_a": failing_agent, "agent_b": blocked_agent}
    )
    plan = _make_executor_plan(
        [
            TaskStep("step_1", "agent_a", "rewrite_text", "user", "step_2", {}, []),
            TaskStep("step_2", "agent_b", "polish_academic_tone", "step_1", "user", {}, ["step_1"]),
        ]
    )

    result = executor.execute(plan)

    assert result == ERROR_MESSAGES["general"]
    assert blocked_agent.calls == []
    assert plan.status == "failed"


def test_executor_timeout_surfaces_message_for_non_critical_step():
    # Known behavior: executor saat ini menghentikan plan lebih awal ketika
    # step awal timeout, sehingga langkah berikutnya belum dijalankan.
    def raise_timeout(tool, input_data, params, memory):
        raise plan_executor_module.Timeout()

    timeout_agent = RecordingAgent(side_effects=[raise_timeout])
    later_agent = RecordingAgent(responses=["final"])
    executor = PlanExecutor(
        agents={"agent_a": timeout_agent, "agent_b": later_agent}
    )
    plan = _make_executor_plan(
        [
            TaskStep("step_1", "agent_a", "rewrite_text", "user", "step_2", {}, []),
            TaskStep("step_2", "agent_b", "summarize_text", "user", "user", {}, []),
        ]
    )

    result = executor.execute(plan)

    assert result == ERROR_MESSAGES["timeout"]
    assert later_agent.calls == []
    assert plan.status == "partial"


def test_executor_emits_progress_event_per_step():
    events = []
    agent = RecordingAgent(responses=["draft", "polished"])
    executor = PlanExecutor(
        agents={"writer": agent},
        on_event=lambda event_type, data: events.append({"type": event_type, **data}),
    )
    plan = _make_executor_plan(
        [
            TaskStep("step_1", "writer", "rewrite_text", "user", "step_2", {}, []),
            TaskStep("step_2", "writer", "polish_academic_tone", "step_1", "user", {}, ["step_1"]),
        ]
    )

    result = executor.execute(plan)

    assert result == "polished"
    tool_events = [event for event in events if event["type"] in {"TOOL_CALL", "TOOL_RESULT"}]
    assert len(tool_events) >= 4
    assert {event["step_id"] for event in tool_events} == {"step_1", "step_2"}


def test_executor_retry_on_transient_failure():
    flaky_agent = RecordingAgent(
        side_effects=[RuntimeError("temporary issue"), "recovered output"]
    )
    executor = PlanExecutor(agents={"writer": flaky_agent})
    plan = _make_executor_plan(
        [TaskStep("step_1", "writer", "search_papers", "user", "user", {}, [])]
    )

    result = executor.execute(plan)

    assert result == "recovered output"
    assert len(flaky_agent.calls) == 2
    assert plan.execution_trace[0]["status"] == "error"
    assert plan.execution_trace[1]["status"] == "success"


def test_executor_runs_validator_refine_loop_for_low_quality_writing():
    class ValidationWritingAgent:
        def __init__(self):
            self.calls = []

        def run_tool(self, tool, input_data, params, memory=None):
            self.calls.append((tool, input_data, params))
            if tool == "rewrite_text":
                return "Draft awal dengan struktur lemah."
            if tool == "refine_with_critique":
                return "Draft revisi lebih akademik dan terstruktur."
            return input_data

    class ValidationAnalysisAgent:
        def __init__(self):
            self.calls = []

        def score_thesis_quality(self, text, memory=None):
            self.calls.append(text)
            if "revisi" in text.lower():
                return '{"scores":{"academic_tone":8,"structure":8},"overall":8,"improvements":[]}'
            return '{"scores":{"academic_tone":6,"structure":6},"overall":6,"improvements":["Perjelas struktur paragraf","Perkuat diksi akademik"]}'

    class ValidationDiagnosticAgent:
        def analyze_for_missing_citations(self, text, memory=None):
            return {"claims_without_citation": 0}

    writer = ValidationWritingAgent()
    analysis = ValidationAnalysisAgent()
    diagnostic = ValidationDiagnosticAgent()
    executor = PlanExecutor(
        agents={
            "writing_agent": writer,
            "analysis_agent": analysis,
            "diagnostic_agent": diagnostic,
        }
    )
    plan = _make_executor_plan(
        [TaskStep("step_1", "writing_agent", "rewrite_text", "user", "user", {}, [])]
    )

    result = executor.execute(plan)

    assert result == "Draft revisi lebih akademik dan terstruktur."
    assert [call[0] for call in writer.calls] == ["rewrite_text", "refine_with_critique"]
    assert len(analysis.calls) >= 2


def test_adapt_data_converts_json_string_list_for_extract_findings():
    adapted = PlanExecutor._adapt_data(
        '[{"title":"Paper A"}]',
        source_tool="search_papers",
        target_tool="extract_findings",
    )

    assert adapted == [{"title": "Paper A"}]


def test_adapt_data_extracts_editor_context_into_plain_text():
    adapted = PlanExecutor._adapt_data(
        {"paragraphs": [{"content": "Paragraf 1"}, {"content": "Paragraf 2"}]},
        source_tool="read_editor_context",
        target_tool="rewrite_text",
    )

    assert adapted == "Paragraf 1\n\nParagraf 2"


def test_adapt_data_preserves_literature_review_contract_for_polish_step():
    payload = {"review_text": "Draft lit review", "references": [{"id": "p1"}]}

    adapted = PlanExecutor._adapt_data(
        payload,
        source_tool="generate_literature_review",
        target_tool="polish_academic_tone",
    )

    assert adapted is payload


def test_resolve_param_references_handles_nested_structures():
    executor = PlanExecutor(agents={})
    executor.results = {
        "step_1": "hasil-1",
        "step_2": {"nested": "hasil-2"},
    }

    resolved = executor._resolve_param_references(
        {
            "single": "step_1",
            "items": ["step_1", {"value": "step_2"}],
        }
    )

    assert resolved == {
        "single": "hasil-1",
        "items": ["hasil-1", {"value": {"nested": "hasil-2"}}],
    }


def test_executor_returns_too_many_steps_when_plan_exceeds_limit():
    executor = PlanExecutor(agents={"writer": RecordingAgent(responses=["ok"])})
    executor.max_steps = 1
    plan = _make_executor_plan(
        [
            TaskStep("step_1", "writer", "rewrite_text", "user", "step_2", {}, []),
            TaskStep("step_2", "writer", "polish_academic_tone", "step_1", "user", {}, ["step_1"]),
        ]
    )

    result = executor.execute(plan)

    assert result == ERROR_MESSAGES["too_many_steps"]
    assert plan.status == "failed"


def test_executor_returns_empty_input_message_for_blank_user_input():
    executor = PlanExecutor(agents={"writer": RecordingAgent(responses=["ok"])})
    plan = task_planner_module.TaskPlan(
        plan_id="plan-empty",
        user_query="   ",
        intent="rewrite_paragraph",
        steps=[
            TaskStep("step_1", "writer", "rewrite_text", "user", "user", {}, [])
        ],
        estimated_tokens=10,
        created_at=task_planner_module.datetime.now(),
        status="pending",
    )

    result = executor.execute(plan)

    assert result == ERROR_MESSAGES["empty_input"]


def test_executor_returns_general_error_when_agent_missing():
    executor = PlanExecutor(agents={})
    plan = _make_executor_plan(
        [TaskStep("step_1", "missing_agent", "rewrite_text", "user", "user", {}, [])]
    )

    result = executor.execute(plan)

    assert result == ERROR_MESSAGES["general"]
    assert plan.status == "failed"


def test_executor_memory_input_reads_papers_from_memory():
    class ResearchMemory:
        def get_papers(self, query):
            return [{"title": query}]

    class SharedMemory:
        research = ResearchMemory()

    agent = RecordingAgent(responses=["done"])
    executor = PlanExecutor(agents={"writer": agent}, memory=SharedMemory())
    plan = task_planner_module.TaskPlan(
        plan_id="plan-memory",
        user_query="adaptive learning",
        intent="literature_review",
        steps=[
            TaskStep("step_1", "writer", "generate_section", "memory", "user", {}, [])
        ],
        estimated_tokens=10,
        created_at=task_planner_module.datetime.now(),
        status="pending",
    )

    result = executor.execute(plan)

    assert result == "done"
    assert agent.calls[0][1] == [{"title": "adaptive learning"}]
