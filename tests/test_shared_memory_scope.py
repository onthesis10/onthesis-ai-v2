from datetime import datetime
from types import SimpleNamespace

import pytest

import app.agent.memory_system as memory_system_module
from app.agent.memory_system import DummyDocumentDB, SharedMemory
from app.agent.task_planner import TaskPlan
from app.routes.agent import _build_pruned_context


class FakeRedis:
    def __init__(self):
        self.store = {}

    def get(self, key):
        return self.store.get(key)

    def setex(self, key, ttl, value):
        self.store[key] = value

    def set(self, key, value):
        self.store[key] = value


class FakeSearchResult:
    def __init__(self, payload):
        self.payload = payload
        self.score = 1.0


class FakeVectorDB:
    def __init__(self):
        self.collections = {
            "thesis_chunks": [],
            "thesis_summaries": [],
        }
        self.last_scroll_order_by = None

    def upsert(self, collection, points):
        for point in points:
            payload = point["payload"]
            self.collections.setdefault(collection, [])
            existing = [
                item for item in self.collections[collection]
                if item.payload.get("doc_id") == payload.get("doc_id")
                and item.payload.get("chapter_id") == payload.get("chapter_id")
                and item.payload.get("section") == payload.get("section")
            ]
            for item in existing:
                self.collections[collection].remove(item)
            self.collections[collection].append(FakeSearchResult(payload))

    def search(self, collection, query_vector, filter=None, limit=10, score_threshold=None):
        records = self.collections.get(collection, [])
        if filter:
            doc_id = filter.get("doc_id")
            records = [item for item in records if item.payload.get("doc_id") == doc_id]
        return records[:limit]

    def scroll(self, collection, scroll_filter, order_by=None, limit=20):
        self.last_scroll_order_by = order_by
        records = self.collections.get(collection, [])
        filtered = []
        for item in records:
            if all(item.payload.get(key) == value for key, value in (scroll_filter or {}).items()):
                filtered.append(item)
        return filtered[:limit]


class RecordingDocumentDB(DummyDocumentDB):
    def __init__(self, profile_payload=None):
        self.profile_payload = profile_payload
        self.saved_plans = []

    def load_profile(self, user_id: str):
        return self.profile_payload

    def save_plan(self, scope_id: str, plan):
        self.saved_plans.append((scope_id, plan))


def test_chapter_summary_is_isolated_per_project_for_same_user():
    vector_db = FakeVectorDB()
    project_a = SharedMemory("user-1", "project-a", vector_db, DummyDocumentDB())
    project_b = SharedMemory("user-1", "project-b", vector_db, DummyDocumentDB())

    project_a.document.add_or_update_chapter_summary(project_a.project_scope, "bab1", "Ringkasan A")
    project_b.document.add_or_update_chapter_summary(project_b.project_scope, "bab1", "Ringkasan B")

    summaries_a = project_a.document.get_all_chapter_summaries(project_a.project_scope)
    summaries_b = project_b.document.get_all_chapter_summaries(project_b.project_scope)

    assert [item["summary"] for item in summaries_a] == ["Ringkasan A"]
    assert [item["summary"] for item in summaries_b] == ["Ringkasan B"]


def test_conversation_history_is_isolated_per_project(monkeypatch):
    fake_redis = FakeRedis()
    monkeypatch.setattr(memory_system_module, "redis_client", fake_redis)

    project_a = SharedMemory("user-1", "project-a", FakeVectorDB(), DummyDocumentDB())
    project_a.conversation.add_turn("user", "Halo dari project A")

    project_b = SharedMemory("user-1", "project-b", FakeVectorDB(), DummyDocumentDB())
    history = project_b.conversation.get_context_window()

    assert history == []


def test_user_profile_stays_global_across_projects(monkeypatch):
    fake_redis = FakeRedis()
    monkeypatch.setattr(memory_system_module, "redis_client", fake_redis)

    project_a = SharedMemory("user-1", "project-a", FakeVectorDB(), DummyDocumentDB())
    project_a.profile.update_from_conversation("user-1", "skripsi saya tentang machine learning untuk pendidikan")

    project_b = SharedMemory("user-1", "project-b", FakeVectorDB(), DummyDocumentDB())
    profile = project_b.profile.get_or_create("user-1")

    assert "machine learning" in profile.thesis_topic


def test_build_agent_context_reads_semantic_context_from_composite_project_scope():
    memory = SharedMemory.__new__(SharedMemory)
    memory.user_id = "user-1"
    memory.project_id = "project-a"
    memory.project_scope = "user-1:project-a"
    memory.profile = SimpleNamespace(
        get_or_create=lambda _user_id: SimpleNamespace(
            thesis_topic="AI",
            field="Informatika",
            writing_style="formal",
            citation_style="APA",
            preferred_language="id"
        )
    )
    memory.conversation = SimpleNamespace(get_context_window=lambda last_n=6: [])
    memory.research = SimpleNamespace(get_papers=lambda topic, min_relevance=0.6: None)

    captured = {}

    def fake_get_relevant_context(query, doc_id, top_k=2):
        captured["query"] = query
        captured["doc_id"] = doc_id
        captured["top_k"] = top_k
        return "Fragmen khusus project A"

    memory.document = SimpleNamespace(get_relevant_context=fake_get_relevant_context)

    context = memory.build_agent_context("Bahas metodologi AI")

    assert captured["doc_id"] == "user-1:project-a"
    assert context["relevant_thesis_sections"] == "Fragmen khusus project A"


def test_document_memory_returns_latest_section_version():
    vector_db = FakeVectorDB()
    memory = SharedMemory("user-1", "project-a", vector_db, DummyDocumentDB())

    memory.document.add_or_update_chunk(memory.project_scope, "bab_1", "Versi pertama")
    memory.document.add_or_update_chunk(memory.project_scope, "bab_1", "Versi terbaru")

    latest = memory.document.get_section(memory.project_scope, "bab_1")

    assert latest == "Versi terbaru"
    assert vector_db.last_scroll_order_by == "version"


def test_shared_memory_requires_project_id():
    with pytest.raises(ValueError, match="project_id"):
        SharedMemory("user-1", "", FakeVectorDB(), DummyDocumentDB())


def test_build_pruned_context_requires_scope_ids():
    with pytest.raises(ValueError, match="user_id"):
        _build_pruned_context("task", {}, "", "project-a")

    with pytest.raises(ValueError, match="project_id"):
        _build_pruned_context("task", {}, "user-1", "")


def test_supervisor_process_request_requires_project_id():
    from app.agent.supervisor import SupervisorAgent

    supervisor = SupervisorAgent.__new__(SupervisorAgent)
    supervisor._emit = lambda *args, **kwargs: None

    with pytest.raises(ValueError, match="context\\.projectId"):
        supervisor.process_request("user-1", "Tolong bantu", context={})


def test_user_profile_can_load_from_document_db(monkeypatch):
    fake_redis = FakeRedis()
    monkeypatch.setattr(memory_system_module, "redis_client", fake_redis)

    db = RecordingDocumentDB(profile_payload={
        "user_id": "user-1",
        "thesis_topic": "Analisis AI untuk pendidikan",
        "field": "Informatika",
        "writing_style": "formal",
        "citation_style": "APA",
        "preferred_language": "id",
        "last_active": datetime.now(),
    })

    memory = SharedMemory("user-1", "project-a", FakeVectorDB(), db)
    profile = memory.profile.get_or_create("user-1")

    assert profile.thesis_topic == "Analisis AI untuk pendidikan"
    assert profile.field == "Informatika"


def test_conversation_memory_persists_plan_trace_to_document_db():
    db = RecordingDocumentDB()
    memory = SharedMemory("user-1", "project-a", FakeVectorDB(), db)
    plan = TaskPlan(
        plan_id="plan-123",
        user_query="Bantu revisi paragraf",
        intent="rewrite_paragraph",
        steps=[],
        estimated_tokens=800,
        created_at=datetime.now(),
        status="done",
    )
    plan.execution_trace = [{"step_id": "step_1", "status": "success"}]

    memory.conversation.store_plan(plan)

    assert db.saved_plans
    saved_scope, saved_plan = db.saved_plans[0]
    assert saved_scope == "user-1:project-a"
    assert saved_plan.plan_id == "plan-123"
    assert saved_plan.execution_trace[0]["status"] == "success"
