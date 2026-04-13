from app.agent.memory_system import ResearchMemory
from app.agent.research_agent import ResearchAgent


class FakeVectorDB:
    def __init__(self):
        self.saved = []

    def upsert(self, collection, points):
        self.saved.extend(points)

    def search(self, *args, **kwargs):
        return []


def test_non_academic_fallback_results_are_not_persisted():
    vector_db = FakeVectorDB()
    memory = ResearchMemory(vector_db)

    memory.add_papers([
        {
            "paper_id": "web-1",
            "title": "Artikel blog",
            "authors": [],
            "year": 2026,
            "abstract": "Ringkasan artikel",
            "key_findings": "Ringkasan artikel",
            "relevance_score": 0.35,
            "citation_count": 0,
            "doi": "",
            "source": "web_search",
            "topics": ["ai"],
            "is_academic_source": False,
        }
    ])

    assert vector_db.saved == []


def test_search_papers_web_fallback_returns_normalized_schema(monkeypatch):
    agent = ResearchAgent()

    monkeypatch.setattr("app.utils.search_utils.unified_search", lambda *args, **kwargs: [])

    class FakeWebSearchAgent:
        def search_academic(self, query, num_results=5):
            return [{
                "title": "AI in Education Trends",
                "snippet": "Latest overview about AI in education.",
                "url": "https://example.com/ai-education",
            }]

    monkeypatch.setattr("app.agent.web_search_tool.WebSearchAgent", FakeWebSearchAgent)

    results = agent.search_papers("AI in education", limit=5, memory=None)

    assert len(results) == 1
    result = results[0]
    assert result["paper_id"]
    assert result["source"] == "web_search"
    assert result["is_academic_source"] is False
    assert "relevance_score" in result
    assert "citation_count" in result
    assert "topics" in result and result["topics"] == ["AI in education"]

