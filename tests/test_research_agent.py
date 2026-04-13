import sys
import types
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

litellm_stub = types.ModuleType("litellm")
litellm_stub.completion = lambda *args, **kwargs: None
sys.modules["litellm"] = litellm_stub

litellm_exceptions_stub = types.ModuleType("litellm.exceptions")
litellm_exceptions_stub.RateLimitError = Exception
sys.modules["litellm.exceptions"] = litellm_exceptions_stub

memory_system_stub = types.ModuleType("app.agent.memory_system")
memory_system_stub.build_memory_prompt_context = lambda memory: ""
sys.modules["app.agent.memory_system"] = memory_system_stub

search_utils_stub = types.ModuleType("app.utils.search_utils")
search_utils_stub.unified_search = lambda **kwargs: []
sys.modules["app.utils.search_utils"] = search_utils_stub

sys.modules.pop("app.agent.research_agent", None)

from app.agent.research_agent import ResearchAgent


def test_run_tool_search_papers_dispatches_successfully(monkeypatch):
    agent = ResearchAgent()

    monkeypatch.setattr(
        "app.agent.research_agent.unified_search",
        lambda **kwargs: [
            {
                "id": "crossref_10.1000/example",
                "title": "Machine Learning in Education",
                "author": "Smith, J., Doe, A.",
                "year": 2024,
                "abstract": "Machine learning improves education outcomes in higher education.",
                "doi": "10.1000/example",
            }
        ],
    )

    result = agent.run_tool("search_papers", "machine learning in education", {"limit": 5})

    assert isinstance(result, list)
    assert len(result) == 1
    assert result[0]["source"] == "crossref"
    assert result[0]["paper_id"] == "crossref_10.1000/example"


def test_search_papers_normalizes_mixed_sources(monkeypatch):
    agent = ResearchAgent()
    captured = {}

    def fake_unified_search(**kwargs):
        captured.update(kwargs)
        return [
            {
                "id": "crossref_10.1000/example",
                "title": "AI for Education",
                "author": "Smith, J.",
                "year": "2024",
                "abstract": "AI for education improves teaching quality.",
                "doi": "10.1000/example",
            },
            {
                "id": "https://openalex.org/W123456",
                "title": "AI in Higher Education",
                "author": "Lee, K.",
                "year": 2023,
                "abstract": "AI in higher education supports adaptive learning systems.",
                "doi": "",
            },
            {
                "id": "pubmed_12345",
                "title": "Education Analytics Study",
                "author": "Garcia, M.",
                "year": 2022,
                "abstract": "Analytics in education reveals student performance trends.",
                "doi": "",
            },
        ]

    monkeypatch.setattr("app.agent.research_agent.unified_search", fake_unified_search)

    result = agent.search_papers(
        query="AI education",
        filters={"year_from": 2021, "field": "higher education"},
        limit=3,
    )

    assert captured["year"] == 2021
    assert len(result) == 3
    assert [paper["source"] for paper in result] == ["crossref", "openalex", "pubmed"]
    for paper in result:
        assert isinstance(paper["authors"], list)
        assert isinstance(paper["citation_key"], str)
        assert paper["citation_key"]
        assert set(
            ["paper_id", "title", "authors", "year", "abstract", "source", "citation_key"]
        ).issubset(paper.keys())


def test_search_papers_uses_web_fallback_when_academic_search_empty(monkeypatch):
    agent = ResearchAgent()

    monkeypatch.setattr("app.agent.research_agent.unified_search", lambda **kwargs: [])

    class FakeWebSearchAgent:
        def search_academic(self, query, num_results=10):
            return [
                {
                    "title": "Web result paper",
                    "snippet": "Relevant academic summary from the web.",
                    "url": "https://example.com/paper",
                }
            ]

    monkeypatch.setattr("app.agent.web_search_tool.WebSearchAgent", FakeWebSearchAgent)

    result = agent.search_papers("adaptive learning", limit=4)

    assert len(result) == 1
    assert result[0]["source"] == "web"
    assert result[0]["is_academic_source"] is False
    assert result[0]["citation_key"]


def test_search_papers_results_include_research_memory_required_fields(monkeypatch):
    agent = ResearchAgent()

    monkeypatch.setattr(
        "app.agent.research_agent.unified_search",
        lambda **kwargs: [
            {
                "id": "doaj_abc123",
                "title": "Adaptive Learning Systems",
                "author": "Tan, R.",
                "year": 2021,
                "abstract": "Adaptive learning systems personalize instruction for students.",
                "doi": "",
            }
        ],
    )

    papers = agent.search_papers("adaptive learning systems", limit=3)

    required_keys = {
        "paper_id",
        "title",
        "authors",
        "year",
        "abstract",
        "relevance_score",
        "citation_count",
        "doi",
        "source",
        "topics",
    }

    assert required_keys.issubset(papers[0].keys())
    assert papers[0]["source"] == "doaj"


def test_search_papers_citation_key_is_deterministic(monkeypatch):
    agent = ResearchAgent()

    monkeypatch.setattr(
        "app.agent.research_agent.unified_search",
        lambda **kwargs: [
            {
                "id": "eric_001",
                "title": "Thesis Writing Support Systems",
                "author": "Rahman, A.",
                "year": 2020,
                "abstract": "Support systems improve thesis writing outcomes for students.",
                "doi": "",
            }
        ],
    )

    first = agent.search_papers("thesis writing support", limit=1)
    second = agent.search_papers("thesis writing support", limit=1)

    assert first[0]["citation_key"] == second[0]["citation_key"]
