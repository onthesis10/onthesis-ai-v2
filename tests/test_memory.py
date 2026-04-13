import importlib
import asyncio
import sys
import types
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]

app_package = types.ModuleType("app")
app_package.__path__ = [str(REPO_ROOT / "app")]
sys.modules.setdefault("app", app_package)
sys.modules["app"].__path__ = [str(REPO_ROOT / "app")]

agent_package = types.ModuleType("app.agent")
agent_package.__path__ = [str(REPO_ROOT / "app" / "agent")]
sys.modules.setdefault("app.agent", agent_package)
sys.modules["app.agent"].__path__ = [str(REPO_ROOT / "app" / "agent")]
sys.modules["app"].agent = sys.modules["app.agent"]

utils_package = types.ModuleType("app.utils")
utils_package.__path__ = [str(REPO_ROOT / "app" / "utils")]
sys.modules.setdefault("app.utils", utils_package)
sys.modules["app.utils"].__path__ = [str(REPO_ROOT / "app" / "utils")]
sys.modules["app"].utils = sys.modules["app.utils"]

task_planner_stub = types.ModuleType("app.agent.task_planner")


@dataclass
class TaskPlan:
    plan_id: str = "plan"
    user_query: str = ""
    intent: str = ""
    steps: list = None
    estimated_tokens: int = 0
    created_at: object = None
    status: str = "pending"


task_planner_stub.TaskPlan = TaskPlan
sys.modules.setdefault("app.agent.task_planner", task_planner_stub)

redis_stub = types.ModuleType("redis")
redis_stub.from_url = lambda url: None
sys.modules["redis"] = redis_stub

litellm_stub = types.ModuleType("litellm")
litellm_stub.completion = lambda *args, **kwargs: None
sys.modules.setdefault("litellm", litellm_stub)

memory_system_support_stub = types.ModuleType("app.agent.memory_system")
memory_system_support_stub.build_memory_prompt_context = lambda memory, include_conversation=True: ""

search_utils_stub = types.ModuleType("app.utils.search_utils")
search_utils_stub.unified_search = lambda **kwargs: []
sys.modules.setdefault("app.utils.search_utils", search_utils_stub)

qdrant_stub = types.ModuleType("qdrant_client")


class QdrantClient:
    def __init__(self, *args, **kwargs):
        pass

    def collection_exists(self, *args, **kwargs):
        return True

    def get_collection(self, *args, **kwargs):
        return types.SimpleNamespace(
            config=types.SimpleNamespace(params=types.SimpleNamespace(vectors=types.SimpleNamespace(size=3072)))
        )

    def create_collection(self, *args, **kwargs):
        return None

    def delete_collection(self, *args, **kwargs):
        return None

    def create_payload_index(self, *args, **kwargs):
        return None


qdrant_stub.QdrantClient = QdrantClient
sys.modules.setdefault("qdrant_client", qdrant_stub)

qdrant_models_stub = types.ModuleType("qdrant_client.models")


class Distance:
    COSINE = "cosine"


class VectorParams:
    def __init__(self, size, distance):
        self.size = size
        self.distance = distance


class PointStruct:
    def __init__(self, id, vector, payload):
        self.id = id
        self.vector = vector
        self.payload = payload


class Filter:
    def __init__(self, must=None):
        self.must = must or []


class FieldCondition:
    def __init__(self, key, match):
        self.key = key
        self.match = match


class MatchValue:
    def __init__(self, value):
        self.value = value


qdrant_models_stub.Distance = Distance
qdrant_models_stub.VectorParams = VectorParams
qdrant_models_stub.PointStruct = PointStruct
qdrant_models_stub.Filter = Filter
qdrant_models_stub.FieldCondition = FieldCondition
qdrant_models_stub.MatchValue = MatchValue
sys.modules.setdefault("qdrant_client.models", qdrant_models_stub)

google_stub = types.ModuleType("google")
google_stub.__path__ = []
sys.modules.setdefault("google", google_stub)

genai_stub = types.ModuleType("google.generativeai")
genai_stub.configure = lambda **kwargs: None
genai_stub.embed_content = lambda **kwargs: {"embedding": [0.0, 0.0, 0.0]}
sys.modules.setdefault("google.generativeai", genai_stub)

research_agent_stub = types.ModuleType("app.agent.research_agent")


@dataclass
class StoredPaper:
    paper_id: str
    title: str
    authors: list
    year: int
    abstract: str
    key_findings: str
    relevance_score: float
    citation_count: int
    doi: str
    source: str
    topics: list
    citation_key: str = ""
    is_academic_source: bool = True
    last_refreshed_at: str | None = None
    expires_at: str | None = None
    added_at: object = None


research_agent_stub.StoredPaper = StoredPaper
sys.modules.setdefault("app.agent.research_agent", research_agent_stub)

sys.modules.pop("app.agent.memory_system", None)
memory_module = importlib.import_module("app.agent.memory_system")
ConversationMemory = memory_module.ConversationMemory
DocumentMemory = memory_module.DocumentMemory
InMemoryProfileStore = memory_module.InMemoryProfileStore
ResearchMemory = memory_module.ResearchMemory
SharedMemory = memory_module.SharedMemory
UserProfileMemory = memory_module.UserProfileMemory


class FakeRecord:
    def __init__(self, record_id, content, chunk_index, version, last_edited):
        self.id = record_id
        self.payload = {
            "content": content,
            "chunk_index": chunk_index,
            "version": version,
            "last_edited": last_edited,
        }


class FakeVectorDB:
    def __init__(self, records):
        self.records = records

    def scroll(self, collection, scroll_filter, order_by, limit):
        return self.records


def test_get_section_default_returns_str():
    memory = DocumentMemory(
        FakeVectorDB(
            [
                FakeRecord("chunk-2", "Second chunk", 1, 1, "2026-03-31T10:00:00"),
                FakeRecord("chunk-1", "First chunk", 0, 1, "2026-03-31T09:00:00"),
            ]
        )
    )

    result = memory.get_section("doc-1", "chapter_1")

    assert isinstance(result, str)
    assert result == "First chunk\n\nSecond chunk"


def test_get_section_raw_returns_list_of_chunks():
    memory = DocumentMemory(
        FakeVectorDB([FakeRecord("chunk-1", "Only chunk", 0, 1, "2026-03-31T09:00:00")])
    )

    result = memory.get_section("doc-1", "chapter_1", raw=True)

    assert isinstance(result, list)
    assert result == [
        {
            "text": "Only chunk",
            "embedding_id": "chunk-1",
            "position": 0,
            "updated_at": "2026-03-31T09:00:00",
        }
    ]


def test_get_section_chunk_shape_has_required_keys():
    memory = DocumentMemory(
        FakeVectorDB([FakeRecord("chunk-1", "Chunk body", 2, 1, "2026-03-31T11:00:00")])
    )

    chunk = memory.get_section("doc-1", "chapter_2", raw=True)[0]

    assert set(chunk.keys()) == {"text", "embedding_id", "position", "updated_at"}
    assert isinstance(chunk["text"], str)
    assert isinstance(chunk["embedding_id"], str)
    assert isinstance(chunk["position"], int)
    assert isinstance(chunk["updated_at"], str)


def test_get_section_returns_none_if_not_found():
    memory = DocumentMemory(FakeVectorDB([]))

    assert memory.get_section("doc-1", "chapter_1") is None
    assert memory.get_section("doc-1", "chapter_1", raw=True) is None


def test_all_callers_receive_expected_type():
    memory = DocumentMemory(
        FakeVectorDB([FakeRecord("chunk-1", "Chunk body", 0, 1, "2026-03-31T11:00:00")])
    )

    default_result = memory.get_section("doc-1", "chapter_1")
    raw_result = memory.get_section("doc-1", "chapter_1", raw=True)

    assert isinstance(default_result, str)
    assert isinstance(raw_result, list)
    assert all(isinstance(chunk, dict) for chunk in raw_result)


class FakeResearchRecord:
    def __init__(self, record_id, payload):
        self.id = record_id
        self.payload = payload


class FakeResearchVectorDB:
    def __init__(self):
        self.records = {}

    def upsert(self, collection, points):
        for point in points:
            payload = dict(point["payload"])
            record_id = point["id"]
            self.records[str(record_id)] = FakeResearchRecord(str(record_id), payload)

    def search(self, collection, query_vector, filter=None, score_threshold=None, limit=10):
        filter = filter or {}
        matches = []
        for record in self.records.values():
            payload = record.payload
            if all(payload.get(key) == value for key, value in filter.items()):
                matches.append(FakeContextSearchRecord(payload, score=payload.get("relevance_score", 0.91)))
        return matches[:limit]

    def scroll(self, collection, scroll_filter, order_by, limit):
        scroll_filter = scroll_filter or {}
        matches = []
        for record in self.records.values():
            payload = record.payload
            if all(payload.get(key) == value for key, value in scroll_filter.items()):
                matches.append(record)
        return matches[:limit]


def _make_mock_paper(**overrides):
    now = datetime.now()
    paper = {
        "paper_id": "paper-1",
        "title": "Adaptive Learning in Higher Education",
        "authors": ["Smith, J."],
        "year": 2024,
        "abstract": "Adaptive learning improves personalization for students.",
        "key_findings": "",
        "relevance_score": 0.92,
        "citation_count": 14,
        "doi": "10.1000/adaptive-learning",
        "source": "openalex",
        "topics": ["adaptive learning"],
        "citation_key": "smith_2024_adaptive_learning",
        "last_refreshed_at": now.isoformat(),
        "expires_at": (now + timedelta(days=30)).isoformat(),
        "added_at": now,
        "is_academic_source": True,
    }
    paper.update(overrides)
    return paper


def test_get_citations_hits_cache_first():
    vector_db = FakeResearchVectorDB()
    memory = ResearchMemory(vector_db=vector_db)
    memory.add_papers([_make_mock_paper()])

    citations = asyncio.run(memory.get_citations(["paper-1"]))

    assert len(citations) == 1
    assert citations[0]["citation_key"] == "smith_2024_adaptive_learning"
    assert citations[0]["paper_id"] == "paper-1"


def test_get_citations_fallback_to_db_when_cache_empty():
    vector_db = FakeResearchVectorDB()
    seed_memory = ResearchMemory(vector_db=vector_db)
    seed_memory.add_papers([_make_mock_paper()])

    fresh_memory = ResearchMemory(vector_db=vector_db)
    citations = asyncio.run(fresh_memory.get_citations(["paper-1"]))

    assert len(citations) == 1
    assert citations[0]["citation_key"] == "smith_2024_adaptive_learning"
    assert "paper-1" in fresh_memory.papers


def test_get_citations_survives_reinstantiation():
    vector_db = FakeResearchVectorDB()
    memory1 = ResearchMemory(vector_db=vector_db)
    memory1.add_papers([_make_mock_paper()])

    memory2 = ResearchMemory(vector_db=vector_db)
    citations = asyncio.run(memory2.get_citations(["paper-1"]))

    assert len(citations) == 1
    assert citations[0]["citation_key"] == "smith_2024_adaptive_learning"


def test_get_citations_respects_30_day_expiry():
    vector_db = FakeResearchVectorDB()
    expired_paper = _make_mock_paper(
        paper_id="paper-expired",
        citation_key="expired_key",
        expires_at=(datetime.now() - timedelta(days=1)).isoformat(),
    )
    seed_memory = ResearchMemory(vector_db=vector_db)
    seed_memory.add_papers([expired_paper])

    fresh_memory = ResearchMemory(vector_db=vector_db)
    citations = asyncio.run(fresh_memory.get_citations(["paper-expired"]))

    assert citations == []


def test_get_citations_partial_cache_hit():
    vector_db = FakeResearchVectorDB()
    cached_paper = _make_mock_paper(paper_id="paper-cache", citation_key="cache_key")
    db_paper = _make_mock_paper(
        paper_id="paper-db",
        citation_key="db_key",
        doi="10.1000/db-paper",
        title="Database Only Paper",
    )

    seed_memory = ResearchMemory(vector_db=vector_db)
    seed_memory.add_papers([cached_paper, db_paper])

    partial_memory = ResearchMemory(vector_db=vector_db)
    partial_memory.add_papers([cached_paper])
    citations = asyncio.run(partial_memory.get_citations(["paper-cache", "paper-db"]))

    assert [citation["citation_key"] for citation in citations] == ["cache_key", "db_key"]
    assert "paper-db" in partial_memory.papers


def test_research_memory_is_project_scoped_for_search_and_citations():
    vector_db = FakeResearchVectorDB()
    project_a = ResearchMemory(vector_db=vector_db, user_id="user-1", project_id="project-a")
    project_b = ResearchMemory(vector_db=vector_db, user_id="user-1", project_id="project-b")

    shared_id_a = _make_mock_paper(
        paper_id="paper-shared",
        citation_key="scope_a_key",
        title="Paper for Scope A",
        topics=["adaptive learning"],
    )
    shared_id_b = _make_mock_paper(
        paper_id="paper-shared",
        citation_key="scope_b_key",
        title="Paper for Scope B",
        doi="10.1000/project-b",
        topics=["adaptive learning"],
    )

    project_a.add_papers([shared_id_a])
    project_b.add_papers([shared_id_b])

    search_a = project_a.get_papers("adaptive learning")
    search_b = project_b.get_papers("adaptive learning")
    citations_a = asyncio.run(project_a.get_citations(["paper-shared"]))
    citations_b = asyncio.run(project_b.get_citations(["paper-shared"]))

    assert [paper["citation_key"] for paper in search_a] == ["scope_a_key"]
    assert [paper["citation_key"] for paper in search_b] == ["scope_b_key"]
    assert [citation["citation_key"] for citation in citations_a] == ["scope_a_key"]
    assert [citation["citation_key"] for citation in citations_b] == ["scope_b_key"]


class FakeContextSearchRecord:
    def __init__(self, payload, score=0.91):
        self.payload = payload
        self.score = score


class FakeContextVectorDB:
    def __init__(self, search_results=None):
        self.search_results = list(search_results or [])

    def search(self, collection, query_vector, filter=None, score_threshold=None, limit=10):
        return self.search_results[:limit]

    def scroll(self, collection, scroll_filter, order_by, limit):
        return []

    def upsert(self, collection, points):
        return None


def test_shared_memory_context_has_all_required_keys():
    # Current runtime contract masih memakai relevant_thesis_sections/known_papers_summary,
    # belum alias ke relevant_sections/known_papers seperti draft sprint note.
    vector_db = FakeContextVectorDB()
    memory = SharedMemory("user-1", "project-1", vector_db, InMemoryProfileStore())

    context = memory.build_agent_context("adaptive learning")

    required = [
        "user_profile",
        "conversation_history",
        "relevant_thesis_sections",
        "known_papers_summary",
        "known_papers_on_topic",
        "raw_known_papers",
    ]
    for key in required:
        assert key in context, f"Missing key: {key}"


def test_shared_memory_context_shape_stable():
    vector_db = FakeContextVectorDB()
    memory = SharedMemory("user-1", "project-1", vector_db, InMemoryProfileStore())

    ctx1 = memory.build_agent_context("adaptive learning")
    ctx2 = memory.build_agent_context("adaptive learning")

    assert ctx1.keys() == ctx2.keys()
    assert type(ctx1["user_profile"]) is type(ctx2["user_profile"])
    assert type(ctx1["conversation_history"]) is type(ctx2["conversation_history"])


def test_conversation_memory_compression_preserves_content(monkeypatch):
    conversation = ConversationMemory(scope_id="user-1:project-1", max_turns=2, db=InMemoryProfileStore())
    monkeypatch.setattr(
        conversation,
        "_summarize",
        lambda turns: "Topik penting: adaptive learning dan metodologi campuran.",
    )

    conversation.add_turn("user", "Saya meneliti adaptive learning.")
    conversation.add_turn("assistant", "Baik, kita fokus pada adaptive learning.")
    conversation.add_turn("user", "Metodenya mixed methods.")

    assert conversation.turns[0].role == "system"
    assert "adaptive learning" in conversation.turns[0].content.lower()
    assert any("mixed methods" in turn.content.lower() for turn in conversation.turns)


def test_conversation_add_plan_rolls_back_on_turn_failure():
    class FailingConversationMemory(ConversationMemory):
        def _append_turn(self, turn):
            raise RuntimeError("assistant turn failed")

    conversation = FailingConversationMemory(scope_id="user-1:project-1", db=InMemoryProfileStore())
    plan = TaskPlan(plan_id="plan-atomic", intent="rewrite_paragraph", steps=[])

    try:
        conversation.add_plan(plan, "Hasil akhir.")
    except RuntimeError:
        pass

    assert conversation.plans == {}
    assert conversation.turns == []


def test_user_profile_update_does_not_overwrite_with_empty():
    profiles = UserProfileMemory(db=InMemoryProfileStore())
    profile = profiles.get_or_create("user-1")
    profile.thesis_topic = "adaptive learning"
    profile.field = "education"

    profiles.update_from_conversation("user-1", "Halo, saya mau lanjut menulis.")

    updated_profile = profiles.get_or_create("user-1")
    assert updated_profile.thesis_topic == "adaptive learning"
    assert updated_profile.field == "education"
