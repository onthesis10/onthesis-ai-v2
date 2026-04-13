from types import SimpleNamespace

from app.agent.memory_system import SharedMemory
from app.agent.task_planner import TaskPlanner


def _get_step(plan, tool_name):
    return next((step for step in plan.steps if step.tool == tool_name), None)


def test_generate_plan_skips_paper_search_when_memory_has_known_papers():
    planner = TaskPlanner()

    plan = planner.generate_plan(
        "literature_review",
        "AI untuk deteksi hoaks",
        memory_context={
            "known_papers_on_topic": [
                {
                    "title": "Deteksi Hoaks dengan AI",
                    "topic": "AI untuk deteksi hoaks",
                    "summary": "Model transformer meningkatkan akurasi deteksi hoaks."
                }
            ]
        }
    )

    tools = [step.tool for step in plan.steps]
    assert "search_papers" not in tools
    assert "rank_papers" not in tools

    extract_step = _get_step(plan, "extract_findings")
    assert extract_step is not None
    assert extract_step.input_from == "memory"
    assert extract_step.depends_on == []


def test_generate_plan_emits_paper_search_when_memory_missing_known_papers_key():
    planner = TaskPlanner()

    plan = planner.generate_plan(
        "literature_review",
        "AI untuk deteksi hoaks",
        memory_context={}
    )

    tools = [step.tool for step in plan.steps]
    assert "search_papers" in tools
    assert "rank_papers" in tools

    extract_step = _get_step(plan, "extract_findings")
    assert extract_step is not None
    assert extract_step.input_from == "step_2"
    assert extract_step.depends_on == ["step_2"]


def test_generate_plan_emits_paper_search_when_known_papers_list_is_empty():
    planner = TaskPlanner()

    plan = planner.generate_plan(
        "literature_review",
        "AI untuk deteksi hoaks",
        memory_context={"known_papers_on_topic": []}
    )

    tools = [step.tool for step in plan.steps]
    assert "search_papers" in tools
    assert "rank_papers" in tools

    extract_step = _get_step(plan, "extract_findings")
    assert extract_step is not None
    assert extract_step.input_from == "step_2"
    assert extract_step.depends_on == ["step_2"]


def test_build_agent_context_adds_structured_known_papers_on_topic():
    memory = SharedMemory.__new__(SharedMemory)
    memory.user_id = "user-1"
    memory.project_id = "project-a"
    memory.project_scope = "user-1:project-a"
    memory.profile = SimpleNamespace(
        get_or_create=lambda _user_id: SimpleNamespace(
            thesis_topic="AI untuk deteksi hoaks",
            field="Informatika",
            writing_style="formal",
            citation_style="APA",
            preferred_language="id"
        )
    )
    memory.conversation = SimpleNamespace(get_context_window=lambda last_n=6: [])
    memory.document = SimpleNamespace(
        get_relevant_context=lambda query, doc_id, top_k=2: "Ringkasan draft terkait"
    )
    memory.research = SimpleNamespace(
        get_papers=lambda topic, min_relevance=0.6: [
            {
                "title": "Deteksi Hoaks dengan AI",
                "topics": ["AI untuk deteksi hoaks", "NLP"],
                "key_findings": "Transformer membantu klasifikasi hoaks lebih akurat.",
                "abstract": "Abstract fallback yang tidak dipakai.",
                "year": 2024
            },
            {
                "title": "Kajian NLP untuk Hoaks",
                "topics": [],
                "abstract": "Paper ini membahas teknik NLP untuk klasifikasi hoaks.",
                "year": 2023
            }
        ]
    )

    context = memory.build_agent_context("AI untuk deteksi hoaks")

    assert context["raw_known_papers"] is not None
    assert context["known_papers_summary"].startswith("- Deteksi Hoaks dengan AI (2024)")
    assert context["known_papers_on_topic"] == [
        {
            "title": "Deteksi Hoaks dengan AI",
            "topic": "AI untuk deteksi hoaks",
            "summary": "Transformer membantu klasifikasi hoaks lebih akurat."
        },
        {
            "title": "Kajian NLP untuk Hoaks",
            "topic": "AI untuk deteksi hoaks",
            "summary": "Paper ini membahas teknik NLP untuk klasifikasi hoaks."
        }
    ]
