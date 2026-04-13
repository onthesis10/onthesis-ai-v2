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
    "app.agent.supervisor",
):
    sys.modules.pop(module_name, None)

task_planner_module = importlib.import_module("app.agent.task_planner")
TaskPlanner = task_planner_module.TaskPlanner


def _editor_context():
    return {
        "request_context": {
            "active_paragraphs": [
                {
                    "paraId": "P-1",
                    "content": "Teks lama yang sedang dipilih.",
                }
            ]
        }
    }


def test_literature_review_plan_has_search_papers_step():
    planner = TaskPlanner()

    plan = planner.generate_plan(
        intent="literature_review",
        user_input="adaptive learning untuk pembelajaran matematika",
        memory_context={},
    )

    tools = [step.tool for step in plan.steps]
    assert "search_papers" in tools
    assert "generate_literature_review" in tools


def test_rewrite_with_editor_produces_diff_step():
    planner = TaskPlanner()

    plan = planner.generate_plan(
        intent="rewrite_paragraph",
        user_input="Perbaiki paragraf ini agar lebih akademik.",
        memory_context=_editor_context(),
    )

    tools = [step.tool for step in plan.steps]
    assert "rewrite_text" in tools
    assert "suggest_replace_text" in tools


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
        return {
            "intent": "unclear",
            "confidence": 0.32,
            "ask_user": "Bisa diperjelas dulu bagian mana yang ingin dibantu?",
        }


intent_classifier_stub.IntentClassifier = IntentClassifier
sys.modules["app.agent.intent_classifier"] = intent_classifier_stub


plan_executor_stub = types.ModuleType("app.agent.plan_executor")


class PlanExecutor:
    def __init__(self, agents, memory=None, on_event=None):
        self.agents = agents
        self.memory = memory
        self.on_event = on_event

    def execute(self, plan):
        return "executor stub"


plan_executor_stub.PlanExecutor = PlanExecutor
sys.modules["app.agent.plan_executor"] = plan_executor_stub


memory_system_stub = types.ModuleType("app.agent.memory_system")


class _DummyProfile:
    def update_from_conversation(self, user_id, message):
        return None


class _DummyConversation:
    def __init__(self):
        self.turns = []

    def add_turn(self, **kwargs):
        self.turns.append(kwargs)


class SharedMemory:
    last_instance = None

    def __init__(self, user_id, project_id, vector_db, doc_db):
        self.user_id = user_id
        self.project_id = project_id
        self.vector_db = vector_db
        self.doc_db = doc_db
        self.profile = _DummyProfile()
        self.conversation = _DummyConversation()
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
sys.modules["app.agent.memory_system"] = memory_system_stub

sys.modules.pop("app.agent.supervisor", None)
supervisor_module = importlib.import_module("app.agent.supervisor")


def test_ambiguous_intent_triggers_ask_user():
    supervisor = supervisor_module.SupervisorAgent.__new__(supervisor_module.SupervisorAgent)
    supervisor.api_key = None
    supervisor.model = "test-model"
    supervisor.registry = types.SimpleNamespace(get_all_agents=lambda: {})
    supervisor.vector_db = object()
    supervisor.doc_db = object()
    supervisor.classifier = types.SimpleNamespace(
        classify=lambda message, history: {
            "intent": "unclear",
            "confidence": 0.21,
            "ask_user": "Bisa diperjelas dulu bagian mana yang ingin dibantu?",
        }
    )
    supervisor.planner = TaskPlanner()
    supervisor._is_lightweight_greeting = lambda message: False
    supervisor._is_lightweight_general_question = lambda message, context: False
    supervisor._needs_thesis_tools = lambda message, context: False
    supervisor._emit = lambda on_event, event_type, data: None
    supervisor._format_memory_context = lambda context: ""

    result = supervisor.process_request(
        user_id="user-1",
        message="tolong bantu",
        context={"projectId": "project-1"},
    )

    assert result == "Bisa diperjelas dulu bagian mana yang ingin dibantu?"


def test_validate_citations_routes_to_lane_2():
    planner = TaskPlanner()

    plan = planner.generate_plan(
        intent="validate_citations",
        user_input="Cek sitasi di paragraf ini.",
        memory_context={},
    )

    tools = [step.tool for step in plan.steps]
    assert "verify_citations" not in tools
    assert "validate_citations" in tools
    assert [step.agent for step in plan.steps] == ["chapter_skills_agent"]


def test_all_writing_intents_produce_non_empty_plan():
    planner = TaskPlanner()

    intents = [
        "rewrite_paragraph",
        "paraphrase",
        "expand_paragraph",
        "summarize",
        "literature_review",
        "validate_citations",
    ]

    for intent in intents:
        plan = planner.generate_plan(
            intent=intent,
            user_input="Contoh instruksi akademik.",
            memory_context={},
        )
        assert len(plan.steps) > 0, f"Plan kosong untuk intent: {intent}"


def test_find_papers_plan_contains_search_and_rank_steps():
    planner = TaskPlanner()

    plan = planner.generate_plan(
        intent="find_papers",
        user_input="paper terbaru tentang AI untuk pendidikan",
        memory_context={},
    )

    assert [step.tool for step in plan.steps] == ["search_papers", "rank_papers"]
    assert plan.steps[-1].output_to == "user"


def test_generate_section_plan_adds_editor_insertion_step():
    planner = TaskPlanner()

    plan = planner.generate_plan(
        intent="generate_section",
        user_input="buat subbab latar belakang",
        memory_context={"request_context": {"active_paragraphs": [{"paraId": "P-9"}]}},
    )

    assert [step.tool for step in plan.steps][-1] == "suggest_insert_text"
    assert plan.steps[-1].params["target_paragraph_id"] == "P-9"


def test_generate_chapter_plan_maps_requested_chapter_and_inserts_to_editor():
    planner = TaskPlanner()

    plan = planner.generate_plan(
        intent="generate_chapter",
        user_input="Tolong buatkan Bab 3 metodologi penelitian",
        memory_context={"request_context": {"active_paragraphs": [{"paraId": "P-10"}]}},
    )

    tools = [step.tool for step in plan.steps]
    assert tools[:5] == [
        "search_papers",
        "rank_papers",
        "extract_findings",
        "generate_full_chapter",
        "polish_academic_tone",
    ]
    assert tools[-1] == "suggest_insert_text"
    assert plan.steps[3].params["chapter_type"] == "metodologi"
    assert plan.steps[3].params["chapter_number"] == "3"


def test_write_abstract_plan_polishes_then_inserts_when_editor_context_exists():
    planner = TaskPlanner()

    plan = planner.generate_plan(
        intent="write_abstract",
        user_input="Buat abstrak penelitian ini",
        memory_context={"request_context": {"active_paragraphs": [{"paraId": "P-11"}]}},
    )

    assert [step.tool for step in plan.steps] == [
        "write_abstract",
        "polish_academic_tone",
        "suggest_insert_text",
    ]


def test_general_question_plan_uses_conversational_rewrite_fallback():
    planner = TaskPlanner()

    plan = planner.generate_plan(
        intent="general_question",
        user_input="Apa bedanya rumusan masalah dan tujuan penelitian?",
        memory_context={},
    )

    assert len(plan.steps) == 1
    assert plan.steps[0].tool == "rewrite_text"
    assert plan.steps[0].params["style"] == "conversational academic"


def test_research_question_plan_uses_request_context_and_editor_insert():
    planner = TaskPlanner()

    plan = planner.generate_plan(
        intent="research_questions",
        user_input="Bantu rumuskan pertanyaan penelitian",
        memory_context={
            "request_context": {
                "context_title": "Adopsi AI dalam pembelajaran",
                "context_problem": "Implementasi belum merata",
                "context_objectives": "Mengidentifikasi faktor adopsi",
                "context_method": "mixed methods",
                "active_paragraphs": [{"paraId": "P-12"}],
            }
        },
    )

    assert plan.steps[0].tool == "draft_research_questions"
    assert plan.steps[0].params["topic"] == "Adopsi AI dalam pembelajaran"
    assert plan.steps[-1].tool == "suggest_insert_text"


def test_methodology_justify_plan_polishes_and_inserts():
    planner = TaskPlanner()

    plan = planner.generate_plan(
        intent="methodology_justify",
        user_input="mixed methods",
        memory_context={"request_context": {"active_paragraphs": [{"paraId": "P-13"}]}},
    )

    assert [step.tool for step in plan.steps] == [
        "justify_methodology",
        "polish_academic_tone",
        "suggest_insert_text",
    ]


def test_data_interpretation_plan_reads_interpretation_then_insert():
    planner = TaskPlanner()

    plan = planner.generate_plan(
        intent="data_interpretation",
        user_input="Tolong interpretasikan tabel ini",
        memory_context={"request_context": {"active_paragraphs": [{"paraId": "P-14"}]}},
    )

    assert [step.tool for step in plan.steps] == [
        "interpret_data_table",
        "correlate_with_bab2",
        "suggest_insert_text",
    ]


def test_thesis_conclusion_plan_uses_summary_and_limitations():
    planner = TaskPlanner()

    plan = planner.generate_plan(
        intent="thesis_conclusion",
        user_input="Susun kesimpulan bab 5",
        memory_context={"request_context": {"active_paragraphs": [{"paraId": "P-15"}]}},
    )

    assert [step.tool for step in plan.steps] == [
        "summarize_to_rq",
        "draft_limitations_and_future_work",
        "suggest_insert_text",
    ]


def test_golden_thread_plan_uses_request_context_values():
    planner = TaskPlanner()

    plan = planner.generate_plan(
        intent="golden_thread_check",
        user_input="Cek golden thread saya",
        memory_context={
            "request_context": {
                "context_problem": "Mengapa adopsi AI rendah?",
                "golden_thread": {
                    "findings": "Temuan menunjukkan hambatan kompetensi digital",
                    "conclusion": "Pelatihan diperlukan",
                },
            }
        },
    )

    assert len(plan.steps) == 1
    assert plan.steps[0].tool == "check_golden_thread"
    assert plan.steps[0].params["bab1_rq"] == "Mengapa adopsi AI rendah?"
    assert "hambatan kompetensi digital" in plan.steps[0].params["bab4_findings"]


def test_web_search_plan_summarizes_search_results_into_section():
    planner = TaskPlanner()

    plan = planner.generate_plan(
        intent="web_search",
        user_input="Cari perkembangan terbaru AI education",
        memory_context={},
    )

    assert [step.tool for step in plan.steps] == [
        "search_and_summarize",
        "generate_section",
    ]


def test_edit_thesis_uses_new_pipeline(monkeypatch):
    plan = task_planner_module.TaskPlan(
        plan_id="plan-1",
        user_query="edit",
        intent="edit_thesis",
        steps=[
            task_planner_module.TaskStep(
                step_id="step_1",
                agent="editor_agent",
                tool="read_editor_context",
                input_from="user",
                output_to="step_2",
                params={"mode": "full"},
                depends_on=[],
            ),
            task_planner_module.TaskStep(
                step_id="step_2",
                agent="writing_agent",
                tool="rewrite_text",
                input_from="step_1",
                output_to="step_replace",
                params={"style": "academic formal"},
                depends_on=["step_1"],
            ),
            task_planner_module.TaskStep(
                step_id="step_replace",
                agent="editor_agent",
                tool="suggest_replace_text",
                input_from="step_2",
                output_to="user",
                params={"target_paragraph_id": "P-1", "reason": "Perbaikan teks otomatis dari Agent."},
                depends_on=["step_2"],
            ),
        ],
        estimated_tokens=100,
        created_at=task_planner_module.datetime.now(),
        status="pending",
    )

    class FakeExecutor:
        def __init__(self, agents, memory=None, on_event=None):
            self.memory = memory
            self.plan_result_commit_attempted = False

        def execute(self, plan):
            return {
                "diff": {
                    "type": "edit",
                    "diffId": "diff-1",
                    "paraId": "P-1",
                    "before": "lama",
                    "after": "baru",
                }
            }

        def _commit_plan_result(self, conversation, plan, result):
            self.plan_result_commit_attempted = True

    monkeypatch.setattr(supervisor_module, "PlanExecutor", FakeExecutor)

    supervisor = supervisor_module.SupervisorAgent.__new__(supervisor_module.SupervisorAgent)
    supervisor.api_key = None
    supervisor.model = "test-model"
    supervisor.registry = types.SimpleNamespace(get_all_agents=lambda: {})
    supervisor.vector_db = object()
    supervisor.doc_db = object()
    supervisor.classifier = types.SimpleNamespace(
        classify=lambda message, history: {"intent": "edit_thesis", "confidence": 0.95}
    )
    supervisor.planner = types.SimpleNamespace(
        generate_plan=lambda intent, user_input, memory_context=None: plan
    )
    supervisor._is_lightweight_greeting = lambda message: False
    supervisor._is_lightweight_general_question = lambda message, context: False
    supervisor._needs_thesis_tools = lambda message, context: False
    supervisor._emit = lambda on_event, event_type, data: None
    supervisor._format_memory_context = lambda context: ""

    result = supervisor.process_request(
        user_id="user-1",
        message="Tolong edit paragraf ini.",
        context={
            "projectId": "project-1",
            "active_paragraphs": [{"paraId": "P-1", "content": "teks lama"}],
        },
    )

    assert "review perubahan" in result.lower()
