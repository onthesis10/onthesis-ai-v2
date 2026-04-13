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

litellm_stub = types.ModuleType("litellm")
litellm_stub.completion = lambda *args, **kwargs: None
sys.modules.setdefault("litellm", litellm_stub)

memory_system_stub = types.ModuleType("app.agent.memory_system")
memory_system_stub.build_memory_prompt_context = lambda memory, include_conversation=True: ""
memory_system_stub.count_tokens = lambda text: len(str(text))
sys.modules["app.agent.memory_system"] = memory_system_stub

for module_name in (
    "app.agent.citation_router",
    "app.agent.task_planner",
    "app.agent.writing_agent",
    "app.agent.chapter_skills",
):
    sys.modules.pop(module_name, None)

citation_router = importlib.import_module("app.agent.citation_router")
task_planner_module = importlib.import_module("app.agent.task_planner")
writing_agent_module = importlib.import_module("app.agent.writing_agent")
chapter_skills_module = importlib.import_module("app.agent.chapter_skills")
TaskPlanner = task_planner_module.TaskPlanner
WritingAgent = writing_agent_module.WritingAgent
ChapterSkillsAgent = chapter_skills_module.ChapterSkillsAgent


def test_format_intent_routes_to_lane_1():
    assert citation_router.route("format_citation") == "lane_1_format"
    assert citation_router.get_handler("format_reference") == "writing_agent.format_citation"


def test_validate_intent_routes_to_lane_2_not_lane_3():
    assert citation_router.route("validate_citations") == "lane_2_missing_check"
    assert citation_router.get_handler("validate_citations") == "chapter_skills.validate_citations"


def test_verify_intent_routes_to_lane_3():
    assert citation_router.route("verify_citations") == "lane_3_accuracy_verify"
    assert citation_router.get_handler("citation_hallucination") == "diagnostic_agent.verify_citations"


def test_unknown_intent_defaults_to_lane_2():
    assert citation_router.route("unknown_citation_intent") == "lane_2_missing_check"
    assert citation_router.get_handler("unknown_citation_intent") == "chapter_skills.validate_citations"


def test_all_lane_handlers_are_valid_strings():
    for lane, handler in citation_router.LANE_HANDLERS.items():
        assert lane.startswith("lane_")
        assert isinstance(handler, str)
        assert handler.count(".") == 1
        assert handler.split(".", 1)[0] in {"writing_agent", "chapter_skills", "diagnostic_agent"}


def test_planner_uses_router_for_citation_intents():
    planner = TaskPlanner()

    validate_plan = planner.generate_plan("validate_citations", "cek sitasi paragraf ini")
    format_plan = planner.generate_plan("citation_format", "formatkan referensi ini")
    verify_plan = planner.generate_plan("verify_citations", "verifikasi sitasi ini")

    assert [(step.agent, step.tool) for step in validate_plan.steps] == [
        ("chapter_skills_agent", "validate_citations")
    ]
    assert format_plan.steps[0].agent == "writing_agent"
    assert format_plan.steps[0].tool == "format_citation"
    assert format_plan.steps[0].params["style"] == "APA"
    assert [(step.agent, step.tool) for step in verify_plan.steps] == [
        ("diagnostic_agent", "verify_citations")
    ]


class FakeResearchMemory:
    def __init__(self, citations):
        self.citations = citations
        self.calls = []

    async def get_citations(self, paper_ids, style="APA"):
        self.calls.append((list(paper_ids), style))
        return self.citations


class FakeMemory:
    def __init__(self, citations):
        self.research = FakeResearchMemory(citations)


def _make_findings():
    return [
        {
            "paper_id": "paper-1",
            "title": "Paper 1",
            "year": 2024,
            "authors": ["Author One"],
            "abstract": "Abstract paper one",
            "key_findings": "Finding one",
        },
        {
            "paper_id": "paper-2",
            "title": "Paper 2",
            "year": 2023,
            "authors": ["Author Two"],
            "abstract": "Abstract paper two",
            "key_findings": "Finding two",
        },
    ]


def _make_citations():
    return [
        {
            "paper_id": "paper-1",
            "citation_key": "author1_2024_paper1",
            "formatted": "Author One (2024). Paper 1.",
            "doi": "10.1000/paper1",
        },
        {
            "paper_id": "paper-2",
            "citation_key": "author2_2023_paper2",
            "formatted": "Author Two (2023). Paper 2.",
            "doi": "10.1000/paper2",
        },
    ]


def test_litreview_output_contract_has_references_key(monkeypatch):
    agent = WritingAgent()
    monkeypatch.setattr(agent, "_call_llm", lambda prompt, max_tokens=None, memory=None: "Review text.")

    result = agent.generate_literature_review(_make_findings(), memory=FakeMemory(_make_citations()))

    assert "references" in result
    assert isinstance(result["references"], list)


def test_litreview_references_sourced_from_get_citations(monkeypatch):
    memory = FakeMemory(_make_citations())
    agent = WritingAgent()
    monkeypatch.setattr(agent, "_call_llm", lambda prompt, max_tokens=None, memory=None: "Review text.")

    result = agent.generate_literature_review(_make_findings(), memory=memory)

    assert memory.research.calls == [(["paper-1", "paper-2"], "APA")]
    assert [reference["citation_key"] for reference in result["references"]] == [
        "author1_2024_paper1",
        "author2_2023_paper2",
    ]


def test_citation_format_apa_shape(monkeypatch):
    agent = WritingAgent()
    monkeypatch.setattr(
        agent,
        "_call_llm",
        lambda prompt, memory=None: "Author One (2024). Paper 1. Journal of Testing.",
    )

    result = agent.format_citation(
        {
            "title": "Paper 1",
            "authors": ["Author One"],
            "year": 2024,
            "doi": "10.1000/paper1",
        },
        style="APA",
    )

    assert "Author One" in result
    assert "2024" in result


def test_missing_citation_check_returns_structured_output(monkeypatch):
    agent = ChapterSkillsAgent()
    monkeypatch.setattr(
        agent,
        "_call_llm",
        lambda prompt, system_prompt, max_tokens=None, memory=None: (
            "## Hasil Validasi Sitasi\n\n"
            "### Klaim TANPA Sitasi (✗):\n"
            "1. \"Pembelajaran adaptif meningkatkan motivasi siswa.\" — ✗ PERLU DITAMBAHKAN REFERENSI\n"
            "   Saran: Tambahkan referensi empiris terkait motivasi belajar.\n"
        ),
    )

    result = agent.validate_citations("Pembelajaran adaptif meningkatkan motivasi siswa.")

    assert isinstance(result, dict)
    assert result["has_uncited_claims"] is True
    assert result["total_sentences"] == 1
    assert result["coverage_ratio"] == 0.0
    assert result["uncited_sentences"] == [
        {
            "sentence": "Pembelajaran adaptif meningkatkan motivasi siswa.",
            "position": 0,
            "suggestion": "Tambahkan referensi empiris terkait motivasi belajar.",
        }
    ]
