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

litellm_exceptions_stub = types.ModuleType("litellm.exceptions")
litellm_exceptions_stub.RateLimitError = Exception
sys.modules.setdefault("litellm.exceptions", litellm_exceptions_stub)

for module_name in (
    "app.agent.task_planner",
    "app.agent.plan_executor",
    "app.agent.writing_agent",
):
    sys.modules.pop(module_name, None)

task_planner_module = importlib.import_module("app.agent.task_planner")
plan_executor_module = importlib.import_module("app.agent.plan_executor")
writing_agent_module = importlib.import_module("app.agent.writing_agent")

WritingAgent = writing_agent_module.WritingAgent
TaskPlanner = task_planner_module.TaskPlanner
PlanExecutor = plan_executor_module.PlanExecutor


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


def _make_findings(count=2):
    findings = []
    for idx in range(count):
        findings.append(
            {
                "paper_id": f"paper-{idx+1}",
                "title": f"Paper {idx+1}",
                "year": 2024 - idx,
                "authors": [f"Author {idx+1}"],
                "abstract": f"Abstract {idx+1}",
                "key_findings": f"Finding {idx+1}",
            }
        )
    return findings


def _make_citations(count=2):
    citations = []
    for idx in range(count):
        citations.append(
            {
                "paper_id": f"paper-{idx+1}",
                "citation_key": f"key_{idx+1}",
                "formatted": f"Author {idx+1} (2024). Paper {idx+1}.",
                "doi": f"10.1000/{idx+1}",
            }
        )
    return citations


def test_litreview_output_always_has_required_keys(monkeypatch):
    agent = WritingAgent()
    monkeypatch.setattr(agent, "_call_llm", lambda prompt, max_tokens=None, memory=None: "Review text.")

    result = agent.generate_literature_review(_make_findings(1), memory=FakeMemory(_make_citations(1)))

    assert set(result.keys()) == {"review_text", "references", "papers_used", "coverage_note"}


def test_litreview_references_not_missing_when_papers_found(monkeypatch):
    agent = WritingAgent()
    monkeypatch.setattr(agent, "_call_llm", lambda prompt, max_tokens=None, memory=None: "Review text.")

    result = agent.generate_literature_review(_make_findings(2), memory=FakeMemory(_make_citations(2)))

    assert len(result["references"]) == 2
    assert all(reference["citation_key"] for reference in result["references"])


def test_litreview_papers_used_matches_references_count(monkeypatch):
    agent = WritingAgent()
    monkeypatch.setattr(agent, "_call_llm", lambda prompt, max_tokens=None, memory=None: "Review text.")

    result = agent.generate_literature_review(_make_findings(3), memory=FakeMemory(_make_citations(3)))

    assert result["papers_used"] == len(result["references"]) == 3


def test_litreview_coverage_note_filled_when_papers_insufficient(monkeypatch):
    agent = WritingAgent()
    monkeypatch.setattr(agent, "_call_llm", lambda prompt, max_tokens=None, memory=None: "Review text.")

    result = agent.generate_literature_review(
        _make_findings(1),
        min_papers=5,
        memory=FakeMemory(_make_citations(1)),
    )

    assert result["coverage_note"]
    assert "1 paper" in result["coverage_note"]


def test_litreview_review_text_never_empty(monkeypatch):
    agent = WritingAgent()
    monkeypatch.setattr(agent, "_call_llm", lambda prompt, max_tokens=None, memory=None: "")

    result = agent.generate_literature_review([], memory=FakeMemory([]))

    assert isinstance(result["review_text"], str)
    assert result["review_text"]


def test_litreview_citations_use_persistent_get_citations(monkeypatch):
    citations = _make_citations(2)
    memory = FakeMemory(citations)
    agent = WritingAgent()
    monkeypatch.setattr(agent, "_call_llm", lambda prompt, max_tokens=None, memory=None: "Review text.")

    result = agent.generate_literature_review(_make_findings(2), memory=memory)

    assert memory.research.calls == [(["paper-1", "paper-2"], "APA")]
    assert result["references"] == [
        {
            "citation_key": "key_1",
            "formatted": "Author 1 (2024). Paper 1.",
            "doi": "10.1000/1",
        },
        {
            "citation_key": "key_2",
            "formatted": "Author 2 (2024). Paper 2.",
            "doi": "10.1000/2",
        },
    ]


def test_literature_review_plan_keeps_generate_step_and_min_papers():
    planner = TaskPlanner()
    plan = planner.generate_plan("literature_review", "adaptive learning")

    litreview_step = next(step for step in plan.steps if step.tool == "generate_literature_review")

    assert litreview_step.params["min_papers"] == 5


def test_literature_review_executor_preserves_contract_after_polish(monkeypatch):
    writing_agent = WritingAgent()
    monkeypatch.setattr(
        writing_agent,
        "generate_literature_review",
        lambda findings, style="akademik formal", language="id", min_papers=5, memory=None: {
            "review_text": "Draft review",
            "references": _make_citations(1),
            "papers_used": 1,
            "coverage_note": "",
        },
    )
    monkeypatch.setattr(writing_agent, "polish_academic_tone", lambda text, memory=None: f"Polished: {text}")

    plan = task_planner_module.TaskPlan(
        plan_id="plan-1",
        user_query="adaptive learning",
        intent="literature_review",
        steps=[
            task_planner_module.TaskStep(
                step_id="step_1",
                agent="writing_agent",
                tool="generate_literature_review",
                input_from="user",
                output_to="step_2",
                params={"style": "academic formal", "language": "id", "min_papers": 5},
                depends_on=[],
            ),
            task_planner_module.TaskStep(
                step_id="step_2",
                agent="writing_agent",
                tool="polish_academic_tone",
                input_from="step_1",
                output_to="user",
                params={},
                depends_on=["step_1"],
            ),
        ],
        estimated_tokens=100,
        created_at=task_planner_module.datetime.now(),
        status="pending",
    )

    executor = PlanExecutor(agents={"writing_agent": writing_agent})
    result = executor.execute(plan)

    assert isinstance(result, dict)
    assert result["review_text"] == "Polished: Draft review"
    assert len(result["references"]) == 1
