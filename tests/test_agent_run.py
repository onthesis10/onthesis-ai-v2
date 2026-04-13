import json
from types import SimpleNamespace

from flask import Flask

import app.routes.agent as agent_routes


SAMPLE_CONTEXT = {
    "context_title": "Implementasi Machine Learning untuk Prediksi Kelulusan Mahasiswa",
    "context_problem": "Bagaimana penerapan algoritma Random Forest dapat memprediksi kelulusan mahasiswa?",
    "context_method": "Metode kuantitatif dengan pendekatan machine learning",
    "active_paragraphs": [
        {
            "paraId": "P-abc001",
            "content": "Pendidikan tinggi di Indonesia mengalami perkembangan yang sangat pesat dalam beberapa tahun terakhir."
        },
        {
            "paraId": "P-abc002",
            "content": "Teknologi informasi yang sangat berkembang pesat bikin banyak universitas harus ikut-ikutan pakai sistem digital buat mengelola data mahasiswa."
        },
        {
            "paraId": "P-abc003",
            "content": "Machine learning merupakan cabang dari artificial intelligence yang memungkinkan komputer belajar dari data tanpa diprogram secara eksplisit (Mitchell, 1997)."
        }
    ],
    "references_text": "[1] Mitchell, T.M. (1997). Machine Learning. McGraw-Hill.\n[2] Breiman, L. (2001). Random Forests. Machine Learning, 45(1), 5-32.",
    "active_chapter_id": "chapter_bab2",
    "chapters_summary": [
        {"id": "chapter_bab1", "title": "BAB I Pendahuluan", "summary": "Latar belakang, rumusan masalah, dan tujuan penelitian", "wordCount": 1200},
        {"id": "chapter_bab2", "title": "BAB II Tinjauan Pustaka", "summary": "Landasan teori machine learning dan random forest", "wordCount": 800},
    ]
}


class FakeSupervisor:
    def __init__(self, scenario):
        self.scenario = scenario

    def process_request(self, user_id, message, context, on_event=None):
        if self.scenario == "editing":
            on_event("STEP", {"step": "planning", "message": "Menganalisis permintaan..."})
            on_event("STEP", {"step": "executing", "message": "Menjalankan rencana editing..."})
            on_event("TOOL_CALL", {
                "id": "tool-1",
                "tool": "suggest_replace_text",
                "args": {"target_paragraph_id": "P-abc002"},
            })
            on_event("TOOL_RESULT", {
                "id": "tool-1",
                "tool": "suggest_replace_text",
                "result": {
                    "diff": {
                        "diffId": "diff-123",
                        "type": "edit",
                        "paraId": "P-abc002",
                        "reason": "Perbaikan gaya akademik",
                    }
                },
            })
            on_event("TEXT_DELTA", {"delta": "Paragraf telah diperbaiki menjadi lebih akademik."})
            return "Paragraf telah diperbaiki menjadi lebih akademik."

        on_event("TEXT_DELTA", {"delta": "Halo! Tentu, saya bisa membantu menulis tesis Anda."})
        return "Halo! Tentu, saya bisa membantu menulis tesis Anda."


def _collect_sse_events(payload, monkeypatch, scenario):
    app = Flask(__name__)
    monkeypatch.setattr(agent_routes, "current_user", SimpleNamespace(id="test-user"), raising=False)
    monkeypatch.setattr(agent_routes.run_agent_sse, "_supervisor", FakeSupervisor(scenario), raising=False)

    with app.test_request_context("/api/agent/run", method="POST", json=payload):
        response = agent_routes.run_agent_sse.__wrapped__()
        raw_stream = "".join(
            chunk.decode() if isinstance(chunk, bytes) else chunk
            for chunk in response.response
        )

    events = []
    for line in raw_stream.splitlines():
        if not line.startswith("data:"):
            continue
        json_str = line[len("data:"):].strip()
        if not json_str or json_str == "[DONE]":
            continue
        events.append(json.loads(json_str))
    return events


def test_agent_run(monkeypatch):
    payload = {
        "task": "Perbaiki gaya penulisan paragraf P-abc002 agar lebih akademis dan formal. Paragraf itu terlalu kasual.",
        "context": SAMPLE_CONTEXT,
        "projectId": "test-project-001",
        "chapterId": "chapter_bab2",
        "model": "llama-70b",
        "mode": "planning",
    }

    events = _collect_sse_events(payload, monkeypatch, scenario="editing")
    counts = {}
    full_text = ""

    for event in events:
        event_type = event.get("type", "UNKNOWN")
        counts[event_type] = counts.get(event_type, 0) + 1
        if event_type == "TEXT_DELTA":
            full_text += event.get("delta", "")

    assert counts.get("DONE", 0) == 1
    assert counts.get("ERROR", 0) == 0
    assert counts.get("STEP", 0) >= 2
    assert counts.get("TOOL_CALL", 0) >= 1
    assert counts.get("PENDING_DIFF", 0) >= 1
    assert full_text


def test_agent_run_emits_diagnostic_events(monkeypatch):
    class DiagnosticSupervisor(FakeSupervisor):
        def process_request(self, user_id, message, context, on_event=None):
            on_event("STEP", {"step": "executing", "message": "Menjalankan diagnosis..."})
            on_event("TOOL_RESULT", {
                "id": "tool-diag-1",
                "tool": "analyze_for_missing_citations",
                "result": {
                    "citation_flags": [
                        {"flagId": "flag-1", "paraId": "P-abc001", "claim": "Klaim tanpa sitasi"}
                    ]
                },
            })
            on_event("TOOL_RESULT", {
                "id": "tool-diag-2",
                "tool": "check_golden_thread",
                "result": {
                    "warnings": [
                        {"type": "rq_not_answered", "description": "RQ belum terjawab"}
                    ]
                },
            })
            on_event("TEXT_DELTA", {"delta": "Diagnosis selesai."})
            return "Diagnosis selesai."

    payload = {
        "task": "Cek sitasi dan benang merah",
        "context": SAMPLE_CONTEXT,
        "projectId": "test-project-001",
        "chapterId": "chapter_bab2",
        "model": "llama-70b",
        "mode": "planning",
    }

    app = Flask(__name__)
    monkeypatch.setattr(agent_routes, "current_user", SimpleNamespace(id="test-user"), raising=False)
    monkeypatch.setattr(agent_routes.run_agent_sse, "_supervisor", DiagnosticSupervisor("diagnostic"), raising=False)

    with app.test_request_context("/api/agent/run", method="POST", json=payload):
        response = agent_routes.run_agent_sse.__wrapped__()
        raw_stream = "".join(
            chunk.decode() if isinstance(chunk, bytes) else chunk
            for chunk in response.response
        )

    event_types = [
        json.loads(line[len("data:"):].strip()).get("type")
        for line in raw_stream.splitlines()
        if line.startswith("data:") and line[len("data:"):].strip() not in ("", "[DONE]")
    ]

    assert "CITATION_FLAG" in event_types
    assert "INCOHERENCE_WARNING" in event_types
    assert "DONE" in event_types


def test_conversational(monkeypatch):
    payload = {
        "task": "Halo, bisa bantu saya menulis tesis?",
        "context": {"context_title": "Test Thesis"},
        "projectId": "test-project-001",
        "model": "llama-70b",
    }

    events = _collect_sse_events(payload, monkeypatch, scenario="conversation")
    counts = {}

    for event in events:
        event_type = event.get("type", "UNKNOWN")
        counts[event_type] = counts.get(event_type, 0) + 1

    assert counts.get("TEXT_DELTA", 0) > 0
    assert counts.get("TOOL_CALL", 0) == 0
    assert counts.get("DONE", 0) == 1


def test_agent_run_precomputes_pruned_context_for_substantive_requests(monkeypatch):
    seen = {}

    class CapturingSupervisor:
        def process_request(self, user_id, message, context, on_event=None):
            seen["context"] = context
            on_event("TEXT_DELTA", {"delta": "ok"})
            return "ok"

    app = Flask(__name__)
    monkeypatch.setattr(agent_routes, "current_user", SimpleNamespace(id="test-user"), raising=False)
    monkeypatch.setattr(agent_routes.run_agent_sse, "_supervisor", CapturingSupervisor(), raising=False)
    monkeypatch.setattr(agent_routes, "_build_pruned_context", lambda *args, **kwargs: "KONTEKS-RINGKAS")

    payload = {
        "task": "Tolong bantu susun draft Bab 2 yang lebih akademik",
        "context": SAMPLE_CONTEXT,
        "projectId": "test-project-001",
        "chapterId": "chapter_bab2",
    }

    with app.test_request_context("/api/agent/run", method="POST", json=payload):
        response = agent_routes.run_agent_sse.__wrapped__()
        _ = "".join(
            chunk.decode() if isinstance(chunk, bytes) else chunk
            for chunk in response.response
        )

    assert seen["context"]["_pruned_context"] == "KONTEKS-RINGKAS"
    assert seen["context"]["_skip_semantic_retrieval"] is True


def test_agent_run_skips_pruned_context_for_lightweight_greeting(monkeypatch):
    class CapturingSupervisor:
        def process_request(self, user_id, message, context, on_event=None):
            on_event("TEXT_DELTA", {"delta": "halo"})
            return "halo"

    monkeypatch.setattr(agent_routes, "current_user", SimpleNamespace(id="test-user"), raising=False)
    monkeypatch.setattr(agent_routes.run_agent_sse, "_supervisor", CapturingSupervisor(), raising=False)

    def fail_if_called(*_args, **_kwargs):
        raise AssertionError("_build_pruned_context tidak boleh dipanggil untuk greeting ringan")

    monkeypatch.setattr(agent_routes, "_build_pruned_context", fail_if_called)

    payload = {
        "task": "halo",
        "context": {"context_title": "Test Thesis"},
        "projectId": "test-project-001",
    }

    events = _collect_sse_events(payload, monkeypatch, scenario="conversation")

    assert any(event.get("type") == "DONE" for event in events)


def test_agent_history_sync_and_clear(monkeypatch):
    app = Flask(__name__)

    class FakeConversation:
        def __init__(self):
            self.turns = []

        def get_full_history(self):
            return list(self.turns)

        def replace_from_messages(self, messages):
            self.turns = [
                {
                    "role": message["role"],
                    "content": message["content"],
                    "timestamp": message.get("timestamp", "2026-01-01T00:00:00"),
                }
                for message in messages
            ]

    class FakeSharedMemory:
        store = {}

        def __init__(self, user_id, project_id, vector_db, db):
            key = (user_id, project_id)
            if key not in self.store:
                self.store[key] = FakeConversation()
            self.conversation = self.store[key]

        def flush_session(self):
            self.conversation.turns = []

    monkeypatch.setattr(agent_routes, "current_user", SimpleNamespace(id="test-user"), raising=False)
    monkeypatch.setattr(agent_routes, "SharedMemory", FakeSharedMemory)
    monkeypatch.setattr(agent_routes, "QdrantVectorDB", lambda: object())
    monkeypatch.setattr(agent_routes, "FirestoreDocumentDB", lambda: object())

    with app.test_request_context(
        "/api/agent/history/test-project",
        method="PUT",
        json={"messages": [
            {"role": "user", "content": "Halo agent", "timestamp": "2026-03-28T10:00:00"},
            {"role": "assistant", "content": "Halo juga", "timestamp": "2026-03-28T10:00:05"},
        ]},
    ):
        response, status_code = agent_routes.sync_agent_history.__wrapped__("test-project")
        assert status_code == 200

    with app.test_request_context("/api/agent/history/test-project", method="GET"):
        response, status_code = agent_routes.get_agent_history.__wrapped__("test-project")
        data = response.get_json()
        assert status_code == 200
        assert data["sessions"][0]["messages"][0]["content"] == "Halo agent"
        assert data["sessions"][0]["messages"][1]["content"] == "Halo juga"

    with app.test_request_context("/api/agent/history/test-project", method="DELETE"):
        response, status_code = agent_routes.clear_agent_history.__wrapped__("test-project")
        assert status_code == 200

    with app.test_request_context("/api/agent/history/test-project", method="GET"):
        response, status_code = agent_routes.get_agent_history.__wrapped__("test-project")
        data = response.get_json()
        assert status_code == 200
        assert data["sessions"] == []
