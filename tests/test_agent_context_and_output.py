import app.agent.supervisor as supervisor_module
from app.agent.chapter_skills import ChapterSkillsAgent
from app.agent.supervisor import SupervisorAgent


def test_align_rq_with_objectives_uses_project_settings(monkeypatch):
    agent = ChapterSkillsAgent()
    captured = {}

    def fake_call_llm(prompt, *_args, **_kwargs):
        captured["prompt"] = prompt
        return "ok"

    monkeypatch.setattr(agent, "_call_llm", fake_call_llm)

    class MemoryStub:
        request_context = {
            "context_problem": "1. Bagaimana penerapan LMS di sekolah?\n2. Apa hambatannya?",
            "context_objectives": "1. Untuk menganalisis penerapan LMS.\n2. Untuk mengidentifikasi hambatan.",
        }

    input_data = {"paragraphs": []}
    result = agent._dispatch_align(input_data, {}, MemoryStub())

    assert result == "ok"
    assert "PROJECT SETTINGS:" in captured["prompt"]
    assert "Bagaimana penerapan LMS di sekolah?" in captured["prompt"]
    assert "Untuk menganalisis penerapan LMS." in captured["prompt"]
    assert "Jangan menulis \"tidak ditemukan\"" in captured["prompt"]


def test_supervisor_humanizes_diff_output():
    supervisor = SupervisorAgent()

    text = supervisor._humanize_final_output({
        "success": True,
        "diff": {
            "diffId": "diff_123",
            "type": "insert",
            "paraId": "P-abc002",
            "reason": "Draft otomatis dari Agent.",
        },
    })

    assert "menyiapkan draft baru" in text
    assert "P-abc002" in text
    assert "Draft otomatis dari Agent." in text
    assert "{" not in text


def test_supervisor_fast_path_greeting_skips_heavy_context_build(monkeypatch):
    class FakeConversation:
        def add_turn(self, *args, **kwargs):
            return None

    class FakeSharedMemory:
        def __init__(self, user_id, project_id, vector_db, db):
            self.user_id = user_id
            self.project_id = project_id
            self.vector_db = vector_db
            self.db = db
            self.request_context = {}
            self.conversation = FakeConversation()

        def build_agent_context(self, *_args, **_kwargs):
            raise AssertionError("Greeting ringan tidak boleh memicu build_agent_context")

    monkeypatch.setattr(supervisor_module, "SharedMemory", FakeSharedMemory)

    supervisor = SupervisorAgent.__new__(SupervisorAgent)
    supervisor.vector_db = object()
    supervisor.doc_db = object()
    supervisor._emit = lambda *args, **kwargs: None

    response = supervisor.process_request(
        "user-1",
        "halo",
        context={"projectId": "project-a"},
    )

    assert "Halo!" in response


def test_supervisor_merges_route_messages_history_into_classifier(monkeypatch):
    captured = {}

    class FakeConversation:
        def add_turn(self, *args, **kwargs):
            return None

    class FakeSharedMemory:
        def __init__(self, user_id, project_id, vector_db, db):
            self.user_id = user_id
            self.project_id = project_id
            self.vector_db = vector_db
            self.db = db
            self.request_context = {}
            self.conversation = FakeConversation()
            self.profile = type("Profile", (), {
                "update_from_conversation": lambda *_args, **_kwargs: None,
            })()

        def build_agent_context(self, *_args, **_kwargs):
            return {
                "user_profile": {},
                "conversation_history": [{"role": "assistant", "content": "riwayat-memory"}],
                "relevant_thesis_sections": "draft",
                "known_papers_summary": "paper",
            }

    class FakeClassifier:
        def classify(self, message, history):
            captured["message"] = message
            captured["history"] = history
            return {"intent": "greeting", "confidence": 0.99}

    monkeypatch.setattr(supervisor_module, "SharedMemory", FakeSharedMemory)

    supervisor = SupervisorAgent.__new__(SupervisorAgent)
    supervisor.vector_db = object()
    supervisor.doc_db = object()
    supervisor._emit = lambda *args, **kwargs: None
    supervisor.classifier = FakeClassifier()
    supervisor.planner = object()
    supervisor.registry = object()

    response = supervisor.process_request(
        "user-1",
        "halo lagi",
        context={
            "projectId": "project-a",
            "messages_history": [
                {"role": "user", "content": "pesan lama user"},
                {"role": "assistant", "content": "balasan lama agent"},
            ],
        },
    )

    assert "Halo!" in response
    assert captured["message"] == "halo lagi"
    assert captured["history"] == [
        {"role": "assistant", "content": "riwayat-memory"},
        {"role": "user", "content": "pesan lama user"},
        {"role": "assistant", "content": "balasan lama agent"},
    ]
