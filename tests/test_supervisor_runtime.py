import importlib
import os
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
        return {"intent": "edit_thesis", "confidence": 0.92}


intent_classifier_stub.IntentClassifier = IntentClassifier
sys.modules["app.agent.intent_classifier"] = intent_classifier_stub


plan_executor_stub = types.ModuleType("app.agent.plan_executor")


class PlanExecutor:
    def __init__(self, agents, memory=None, on_event=None):
        self.agents = agents
        self.memory = memory
        self.on_event = on_event

    def execute(self, plan):
        return {"message": "executor stub"}


plan_executor_stub.PlanExecutor = PlanExecutor
sys.modules["app.agent.plan_executor"] = plan_executor_stub


memory_system_stub = types.ModuleType("app.agent.memory_system")


class _DummyProfile:
    def update_from_conversation(self, user_id, message):
        return None


class _DummyConversation:
    def add_turn(self, **kwargs):
        return None


class SharedMemory:
    def __init__(self, user_id, project_id, vector_db, doc_db):
        self.user_id = user_id
        self.project_id = project_id
        self.vector_db = vector_db
        self.doc_db = doc_db
        self.profile = _DummyProfile()
        self.conversation = _DummyConversation()
        self.request_context = {}

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

sys.modules.pop("app.agent.task_planner", None)
sys.modules.pop("app.agent.supervisor", None)
task_planner_module = importlib.import_module("app.agent.task_planner")
supervisor_module = importlib.import_module("app.agent.supervisor")


def _build_supervisor(planner):
    supervisor = supervisor_module.SupervisorAgent.__new__(supervisor_module.SupervisorAgent)
    supervisor.api_key = None
    supervisor.model = "test-model"
    supervisor.registry = types.SimpleNamespace(get_all_agents=lambda: {})
    supervisor.vector_db = object()
    supervisor.doc_db = object()
    supervisor.classifier = types.SimpleNamespace(
        classify=lambda message, history: {"intent": "edit_thesis", "confidence": 0.91}
    )
    supervisor.planner = planner
    supervisor._is_lightweight_greeting = lambda message: False
    supervisor._is_lightweight_general_question = lambda message, context: False
    supervisor._needs_thesis_tools = lambda message, context: False
    supervisor._emit = lambda on_event, event_type, data: None
    supervisor._record_exchange = lambda *args, **kwargs: None
    supervisor._format_memory_context = lambda context: ""
    return supervisor


def test_edit_thesis_plan_uses_editor_replacement_step():
    planner = task_planner_module.TaskPlanner()
    plan = planner.generate_plan(
        intent="edit_thesis",
        user_input="Perbaiki paragraf ini agar lebih akademik.",
        memory_context={"request_context": {"active_paragraphs": [{"paraId": "P-123"}]}},
    )

    assert [step.tool for step in plan.steps] == [
        "read_editor_context",
        "rewrite_text",
        "suggest_replace_text",
    ]
    assert plan.steps[-1].params["target_paragraph_id"] == "P-123"


def test_supervisor_edit_thesis_never_falls_back_to_legacy_loop(monkeypatch):
    planner = types.SimpleNamespace(
        generate_plan=lambda intent, message, context: (_ for _ in ()).throw(ValueError("planner failed"))
    )
    supervisor = _build_supervisor(planner)
    legacy_calls = {"count": 0}

    def fake_legacy_loop(message, context, on_event=None):
        legacy_calls["count"] += 1
        return "legacy result"

    supervisor._run_thesis_tools_loop = fake_legacy_loop

    result = supervisor.process_request(
        user_id="user-1",
        message="Tolong edit paragraf ini.",
        context={"projectId": "project-1", "active_paragraphs": [{"paraId": "P-1", "content": "draft"}]},
    )

    assert legacy_calls["count"] == 0
    assert "Tidak ada perubahan" in result


def test_supervisor_edit_thesis_returns_safe_failure_when_plan_breaks(monkeypatch):
    planner = types.SimpleNamespace(
        generate_plan=lambda intent, message, context: (_ for _ in ()).throw(ValueError("planner failed"))
    )
    supervisor = _build_supervisor(planner)
    legacy_calls = {"count": 0}

    def fake_legacy_loop(message, context, on_event=None):
        legacy_calls["count"] += 1
        return "legacy result"

    supervisor._run_thesis_tools_loop = fake_legacy_loop

    result = supervisor.process_request(
        user_id="user-1",
        message="Tolong edit paragraf ini.",
        context={"projectId": "project-1", "active_paragraphs": [{"paraId": "P-1", "content": "draft"}]},
    )

    assert legacy_calls["count"] == 0
    assert "Tidak ada perubahan" in result


def test_supervisor_edit_thesis_pipeline_handles_new_runtime_without_legacy(monkeypatch):
    plan = task_planner_module.TaskPlan(
        plan_id="plan-1",
        user_query="edit",
        intent="edit_thesis",
        steps=[types.SimpleNamespace(step_id="step_1", tool="rewrite_text")],
        estimated_tokens=100,
        created_at=task_planner_module.datetime.now(),
        status="pending",
    )
    planner = types.SimpleNamespace(generate_plan=lambda intent, message, context: plan)
    supervisor = _build_supervisor(planner)
    legacy_calls = {"count": 0}

    class FakeExecutor:
        def __init__(self, agents, memory=None, on_event=None):
            self.agents = agents

        def execute(self, plan):
            return {
                "diff": {
                    "type": "edit",
                    "paraId": "P-1",
                    "reason": "Perbaikan teks otomatis dari Agent.",
                }
            }

    supervisor._run_thesis_tools_loop = lambda *args, **kwargs: legacy_calls.__setitem__("count", legacy_calls["count"] + 1)
    monkeypatch.setattr(supervisor_module, "PlanExecutor", FakeExecutor)

    result = supervisor.process_request(
        user_id="user-1",
        message="Tolong edit paragraf ini.",
        context={"projectId": "project-1", "active_paragraphs": [{"paraId": "P-1", "content": "draft"}]},
    )

    assert legacy_calls["count"] == 0
    assert "menyiapkan revisi paragraf" in result


def test_supervisor_special_modes_use_active_runtime_without_planner(monkeypatch):
    planner_calls = {"count": 0}

    def _unexpected_plan(*args, **kwargs):
        planner_calls["count"] += 1
        raise AssertionError("planner should not run for special mode")

    supervisor = _build_supervisor(types.SimpleNamespace(generate_plan=_unexpected_plan))
    monkeypatch.setattr(
        supervisor,
        "_run_special_mode",
        lambda mode, memory, user_message, agent_context: f"special::{mode}",
    )

    result = supervisor.process_request(
        user_id="user-1",
        message="Tolong buat peta konsep dari draft ini.",
        context={"projectId": "project-1", "requestedTask": "concept_map"},
    )

    assert result == "special::concept_map"
    assert planner_calls["count"] == 0


def test_lightweight_greeting_detection_matches_short_salutations():
    supervisor = supervisor_module.SupervisorAgent.__new__(supervisor_module.SupervisorAgent)

    assert supervisor._is_lightweight_greeting("halo") is True
    assert supervisor._is_lightweight_greeting("Hi agent") is True
    assert supervisor._is_lightweight_greeting("tolong revisi paragraf") is False


def test_lightweight_general_question_detection_respects_context_and_markers():
    supervisor = supervisor_module.SupervisorAgent.__new__(supervisor_module.SupervisorAgent)

    assert supervisor._is_lightweight_general_question("Apa itu rumusan masalah?", {}) is True
    assert supervisor._is_lightweight_general_question("Buat abstrak untuk saya", {}) is False
    assert supervisor._is_lightweight_general_question(
        "Apa itu rumusan masalah?",
        {"active_paragraphs": [{"paraId": "P-1"}]},
    ) is False


def test_needs_thesis_tools_only_when_editor_context_and_edit_keywords_exist():
    supervisor = supervisor_module.SupervisorAgent.__new__(supervisor_module.SupervisorAgent)

    assert supervisor._needs_thesis_tools(
        "Tolong revisi paragraf ini",
        {"active_paragraphs": [{"paraId": "P-1"}]},
    ) is True
    assert supervisor._needs_thesis_tools(
        "Apa itu metodologi penelitian?",
        {"active_paragraphs": [{"paraId": "P-1"}]},
    ) is False
    assert supervisor._needs_thesis_tools("Tolong revisi paragraf ini", {}) is False


def test_process_request_fast_path_for_greeting_records_and_returns_message():
    supervisor = _build_supervisor(types.SimpleNamespace(generate_plan=lambda *args, **kwargs: None))
    supervisor._is_lightweight_greeting = lambda message: True
    recorded = []
    supervisor._record_exchange = lambda memory, user_message, intent, response, plan_id=None: recorded.append(
        (user_message, intent, response)
    )

    result = supervisor.process_request(
        user_id="user-1",
        message="halo",
        context={"projectId": "project-1"},
    )

    assert "bisa saya bantu" in result.lower()
    assert recorded[0][1] == "greeting"


def test_process_request_fast_path_for_general_question_uses_minimal_context():
    supervisor = _build_supervisor(types.SimpleNamespace(generate_plan=lambda *args, **kwargs: None))
    supervisor._is_lightweight_general_question = lambda message, context: True
    supervisor._answer_general_question = lambda message, context: f"jawaban::{context}"
    supervisor._record_exchange = lambda *args, **kwargs: None

    result = supervisor.process_request(
        user_id="user-1",
        message="Apa itu rumusan masalah?",
        context={"projectId": "project-1", "context_title": "Topik Uji"},
    )

    assert "Topik Uji" in result


def test_process_request_requires_project_id():
    supervisor = _build_supervisor(types.SimpleNamespace(generate_plan=lambda *args, **kwargs: None))

    try:
        supervisor.process_request(user_id="user-1", message="halo", context={})
    except ValueError as exc:
        assert "projectId" in str(exc)
    else:
        raise AssertionError("process_request seharusnya menolak context tanpa projectId")


def test_process_request_unclear_intent_returns_clarification():
    supervisor = _build_supervisor(types.SimpleNamespace(generate_plan=lambda *args, **kwargs: None))
    supervisor.classifier = types.SimpleNamespace(
        classify=lambda message, history: {
            "intent": "unclear",
            "confidence": 0.2,
            "ask_user": "Bagian mana yang ingin direvisi dulu?",
        }
    )
    supervisor._record_exchange = lambda *args, **kwargs: None

    result = supervisor.process_request(
        user_id="user-1",
        message="bantu dong",
        context={"projectId": "project-1"},
    )

    assert result == "Bagian mana yang ingin direvisi dulu?"


def test_process_request_generate_plan_failure_returns_fallback():
    planner = types.SimpleNamespace(
        generate_plan=lambda intent, message, context: (_ for _ in ()).throw(RuntimeError("planner meledak"))
    )
    supervisor = _build_supervisor(planner)
    supervisor.classifier = types.SimpleNamespace(
        classify=lambda message, history: {"intent": "rewrite_paragraph", "confidence": 0.91}
    )
    supervisor._record_exchange = lambda *args, **kwargs: None

    result = supervisor.process_request(
        user_id="user-1",
        message="Perbaiki paragraf ini.",
        context={"projectId": "project-1"},
    )

    assert "kesulitan memecah instruksimu" in result.lower()


def test_process_request_general_execution_error_returns_system_message(monkeypatch):
    plan = task_planner_module.TaskPlan(
        plan_id="plan-err",
        user_query="tolong bantu",
        intent="find_papers",
        steps=[
            task_planner_module.TaskStep(
                step_id="step_1",
                agent="research_agent",
                tool="search_papers",
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

    class ExplodingExecutor:
        def __init__(self, agents, memory=None, on_event=None):
            self.plan_result_commit_attempted = False

        def execute(self, plan):
            raise RuntimeError("executor boom")

    monkeypatch.setattr(supervisor_module, "PlanExecutor", ExplodingExecutor)

    supervisor = _build_supervisor(types.SimpleNamespace(generate_plan=lambda *args, **kwargs: plan))
    supervisor.classifier = types.SimpleNamespace(
        classify=lambda message, history: {"intent": "find_papers", "confidence": 0.95}
    )
    supervisor._record_planned_exchange = lambda *args, **kwargs: None
    supervisor._record_exchange = lambda *args, **kwargs: None
    supervisor._synthesize_final_response = lambda raw_output, context: str(raw_output)

    result = supervisor.process_request(
        user_id="user-1",
        message="Cari paper terbaru",
        context={"projectId": "project-1"},
    )

    assert "executor boom" in result


def test_format_memory_context_includes_profile_and_request_context():
    supervisor = supervisor_module.SupervisorAgent.__new__(supervisor_module.SupervisorAgent)

    formatted = supervisor._format_memory_context(
        {
            "user_profile": {
                "thesis_topic": "Adopsi AI",
                "field": "Pendidikan",
                "writing_style": "formal",
                "preferred_language": "id",
                "citation_style": "APA",
            },
            "request_context": {
                "context_title": "Judul Tesis",
                "context_problem": "Masalah penelitian",
                "context_method": "mixed methods",
            },
            "relevant_thesis_sections": "Draft bab 1",
            "known_papers_summary": "Paper A (2024)",
        }
    )

    assert "Judul Tesis" in formatted
    assert "Adopsi AI" in formatted
    assert "Paper A (2024)" in formatted


def test_humanize_final_output_supports_message_output_success_and_error():
    supervisor = supervisor_module.SupervisorAgent.__new__(supervisor_module.SupervisorAgent)

    assert supervisor._humanize_final_output({"message": "hasil"}) == "hasil"
    assert supervisor._humanize_final_output({"output": "keluaran"}) == "keluaran"
    assert "Silakan cek hasil" in supervisor._humanize_final_output({"success": True})
    assert "kendala" in supervisor._humanize_final_output({"error": "gagal"})


def test_record_exchange_and_user_turn_write_to_conversation():
    supervisor = supervisor_module.SupervisorAgent.__new__(supervisor_module.SupervisorAgent)

    class Conversation:
        def __init__(self):
            self.turns = []

        def add_turn(self, **kwargs):
            self.turns.append(kwargs)

    memory = types.SimpleNamespace(conversation=Conversation())

    supervisor._record_exchange(memory, "user msg", "rewrite_paragraph", "assistant msg", plan_id="plan-1")
    supervisor._record_user_turn(memory, "next user", "find_papers", plan_id="plan-2")

    assert memory.conversation.turns[0]["role"] == "user"
    assert memory.conversation.turns[1]["role"] == "assistant"
    assert memory.conversation.turns[2]["plan_id"] == "plan-2"


def test_record_planned_exchange_uses_atomic_conversation_add_plan():
    supervisor = supervisor_module.SupervisorAgent.__new__(supervisor_module.SupervisorAgent)
    captured = {"user_calls": 0, "add_plan": []}

    supervisor._record_user_turn = lambda memory, user_message, intent, plan_id=None: captured.__setitem__(
        "user_calls", captured["user_calls"] + 1
    )

    class Conversation:
        def add_plan(self, plan, result):
            captured["add_plan"].append((plan.plan_id, result))

    memory = types.SimpleNamespace(conversation=Conversation())
    plan = types.SimpleNamespace(plan_id="plan-77")

    supervisor._record_planned_exchange(
        executor=None,
        memory=memory,
        user_message="tolong bantu",
        intent="rewrite_paragraph",
        assistant_message="hasil baru",
        plan=plan,
    )

    assert captured["user_calls"] == 1
    assert captured["add_plan"] == [("plan-77", "hasil baru")]


def test_supervisor_init_builds_core_components(monkeypatch):
    monkeypatch.delenv("LLM_API_KEY", raising=False)

    supervisor = supervisor_module.SupervisorAgent()

    assert hasattr(supervisor.registry, "get_all_agents")
    assert hasattr(supervisor.registry, "get_agent")
    assert hasattr(supervisor.classifier, "classify")
    assert getattr(supervisor.classifier, "confidence_threshold", None) == 0.7
    assert hasattr(supervisor.planner, "generate_plan")


def test_synthesize_final_response_returns_raw_output_when_api_key_missing():
    supervisor = supervisor_module.SupervisorAgent.__new__(supervisor_module.SupervisorAgent)
    supervisor.api_key = None
    supervisor.model = "test-model"

    result = supervisor._synthesize_final_response("hasil mentah", "ctx")

    assert result == "hasil mentah"


def test_answer_general_question_returns_busy_message_when_api_key_missing():
    supervisor = supervisor_module.SupervisorAgent.__new__(supervisor_module.SupervisorAgent)
    supervisor.api_key = None
    supervisor.model = "test-model"

    result = supervisor._answer_general_question("Apa itu abstrak?", "ctx")

    assert "API Key tidak tersedia" in result


def test_synthesize_final_response_uses_primary_llm_when_available(monkeypatch):
    litellm_stub = types.ModuleType("litellm")
    litellm_stub.completion = lambda **kwargs: types.SimpleNamespace(
        choices=[types.SimpleNamespace(message=types.SimpleNamespace(content="jawaban supervisor"))]
    )
    litellm_exceptions = types.ModuleType("litellm.exceptions")
    litellm_exceptions.RateLimitError = RuntimeError
    sys.modules["litellm"] = litellm_stub
    sys.modules["litellm.exceptions"] = litellm_exceptions

    supervisor = supervisor_module.SupervisorAgent.__new__(supervisor_module.SupervisorAgent)
    supervisor.api_key = "primary-key"
    supervisor.model = "primary-model"

    result = supervisor._synthesize_final_response("hasil mentah", "ctx")

    assert result == "jawaban supervisor"


def test_synthesize_final_response_falls_back_to_raw_output_when_fallback_missing(monkeypatch):
    def explode(**kwargs):
        raise RuntimeError("rate limit")

    litellm_stub = types.ModuleType("litellm")
    litellm_stub.completion = explode
    litellm_exceptions = types.ModuleType("litellm.exceptions")
    litellm_exceptions.RateLimitError = RuntimeError
    sys.modules["litellm"] = litellm_stub
    sys.modules["litellm.exceptions"] = litellm_exceptions
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    supervisor = supervisor_module.SupervisorAgent.__new__(supervisor_module.SupervisorAgent)
    supervisor.api_key = "primary-key"
    supervisor.model = "primary-model"

    result = supervisor._synthesize_final_response("hasil mentah", "ctx")

    assert result == "hasil mentah"


def test_answer_general_question_uses_fallback_llm(monkeypatch):
    calls = {"count": 0}

    def completion(**kwargs):
        calls["count"] += 1
        if calls["count"] == 1:
            raise RuntimeError("limit")
        return types.SimpleNamespace(
            choices=[types.SimpleNamespace(message=types.SimpleNamespace(content="jawaban fallback"))]
        )

    litellm_stub = types.ModuleType("litellm")
    litellm_stub.completion = completion
    litellm_exceptions = types.ModuleType("litellm.exceptions")
    litellm_exceptions.RateLimitError = RuntimeError
    sys.modules["litellm"] = litellm_stub
    sys.modules["litellm.exceptions"] = litellm_exceptions
    monkeypatch.setenv("GEMINI_API_KEY", "fallback-key")

    supervisor = supervisor_module.SupervisorAgent.__new__(supervisor_module.SupervisorAgent)
    supervisor.api_key = "primary-key"
    supervisor.model = "primary-model"

    result = supervisor._answer_general_question("Apa itu abstrak?", "ctx")

    assert result == "jawaban fallback"


def test_process_request_validate_citations_formats_skip_synthesis_output(monkeypatch):
    plan = task_planner_module.TaskPlan(
        plan_id="plan-citation",
        user_query="cek sitasi",
        intent="validate_citations",
        steps=[
            task_planner_module.TaskStep(
                step_id="step_1",
                agent="chapter_skills_agent",
                tool="validate_citations",
                input_from="user",
                output_to="user",
                params={},
                depends_on=[],
            )
        ],
        estimated_tokens=50,
        created_at=task_planner_module.datetime.now(),
        status="pending",
    )

    class CitationExecutor:
        def __init__(self, agents, memory=None, on_event=None):
            self.plan_result_commit_attempted = False

        def execute(self, plan):
            return {
                "has_uncited_claims": True,
                "uncited_sentences": [
                    {
                        "sentence": "Klaim penting tanpa sitasi.",
                        "position": 0,
                        "suggestion": "Tambahkan sitasi empiris terbaru.",
                    }
                ],
                "total_sentences": 3,
                "coverage_ratio": 0.67,
            }

        def _commit_plan_result(self, conversation, plan, result):
            self.plan_result_commit_attempted = True

    monkeypatch.setattr(supervisor_module, "PlanExecutor", CitationExecutor)

    supervisor = _build_supervisor(types.SimpleNamespace(generate_plan=lambda *args, **kwargs: plan))
    supervisor.classifier = types.SimpleNamespace(
        classify=lambda message, history: {"intent": "validate_citations", "confidence": 0.95}
    )
    supervisor._record_planned_exchange = lambda *args, **kwargs: None

    result = supervisor.process_request(
        user_id="user-1",
        message="Tolong cek sitasi di bab ini",
        context={"projectId": "project-1"},
    )

    assert "Hasil Validasi Sitasi" in result
    assert "Klaim penting tanpa sitasi." in result
