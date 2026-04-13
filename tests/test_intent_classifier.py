import importlib
import json
import os
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
litellm_exceptions_stub.RateLimitError = RuntimeError
sys.modules.setdefault("litellm.exceptions", litellm_exceptions_stub)

for module_name in ("app.agent.intent_classifier",):
    sys.modules.pop(module_name, None)

intent_classifier_module = importlib.import_module("app.agent.intent_classifier")
IntentClassifier = intent_classifier_module.IntentClassifier
CLARIFICATION_TEMPLATE = intent_classifier_module.CLARIFICATION_TEMPLATE


def test_literature_review_topic_shortcut_has_high_confidence():
    classifier = IntentClassifier()

    result = classifier.classify("Buatkan literature review tentang machine learning untuk pendidikan.", [])

    assert result["intent"] == "literature_review"
    assert result["confidence"] >= 0.90


def test_citation_workflow_shortcut_routes_to_validate_citations():
    classifier = IntentClassifier()

    result = classifier.classify("Tolong cek sitasi di paragraf ini.", [])

    assert result["intent"] == "validate_citations"
    assert result["confidence"] >= 0.90


def test_mixed_language_citation_input_still_hits_citation_workflow():
    classifier = IntentClassifier()

    result = classifier.classify("Please cek sitasi untuk paragraph ini ya.", [])

    assert result["intent"] == "validate_citations"


def test_single_word_abstrak_triggers_clarification():
    classifier = IntentClassifier()

    result = classifier.classify("abstrak", [])

    assert result["intent"] == "unclear"
    assert "ask_user" in result


def test_empty_input_returns_unclear_when_llm_is_low_confidence(monkeypatch):
    classifier = IntentClassifier()
    monkeypatch.setattr(
        classifier,
        "_call_llm",
        lambda prompt: json.dumps(
            {
                "intent": "general_question",
                "confidence": 0.12,
                "needs_clarification": True,
                "clarification_question": "Bisa diperjelas dulu apa yang ingin dibantu?",
            }
        ),
    )

    result = classifier.classify("", [])

    assert result["intent"] == "unclear"
    assert result["ask_user"] == "Bisa diperjelas dulu apa yang ingin dibantu?"


def test_ambiguous_bab2_feedback_request_asks_for_clarification(monkeypatch):
    classifier = IntentClassifier()
    monkeypatch.setattr(
        classifier,
        "_call_llm",
        lambda prompt: json.dumps(
            {
                "intent": "unclear",
                "confidence": 0.41,
                "needs_clarification": True,
                "clarification_question": "Kamu ingin saya analisis kualitasnya, perbaiki gayanya, atau cari referensi tambahan?",
            }
        ),
    )

    result = classifier.classify("Ini bab 2 saya, gimana menurutmu?", [])

    assert result["intent"] == "unclear"
    assert "analisis kualitasnya" in result["ask_user"]


def test_write_abstract_request_routes_to_write_abstract():
    classifier = IntentClassifier()

    result = classifier.classify("Tolong buatkan abstrak berdasarkan judul dan metode ini.", [])

    assert result["intent"] == "write_abstract"
    assert result["confidence"] >= 0.90


def test_low_confidence_llm_result_uses_default_clarification_template(monkeypatch):
    classifier = IntentClassifier()
    monkeypatch.setattr(
        classifier,
        "_call_llm",
        lambda prompt: json.dumps(
            {
                "intent": "general_question",
                "confidence": 0.20,
                "needs_clarification": True,
                "clarification_question": "",
            }
        ),
    )

    result = classifier.classify("bantu tesis", [])

    assert result["intent"] == "unclear"
    assert result["ask_user"] == CLARIFICATION_TEMPLATE


def test_web_search_shortcut_is_detected_without_llm():
    classifier = IntentClassifier(confidence_threshold=0.7)

    result = classifier.classify("Tolong cari di internet tren AI terbaru", [])

    assert result["intent"] == "web_search"
    assert result["confidence"] > 0.9


def test_generate_chapter_shortcut_is_detected():
    classifier = IntentClassifier(confidence_threshold=0.7)

    result = classifier.classify("Buatkan bab 2 lengkap untuk saya", [])

    assert result["intent"] == "generate_chapter"


def test_research_question_shortcut_is_detected():
    classifier = IntentClassifier(confidence_threshold=0.7)

    result = classifier.classify("Buatkan rumusan masalah untuk topik ini", [])

    assert result["intent"] == "research_questions"


def test_research_objectives_shortcut_is_detected():
    classifier = IntentClassifier(confidence_threshold=0.7)

    result = classifier.classify("Buatkan tujuan penelitian saya", [])

    assert result["intent"] == "research_objectives"


def test_research_gap_shortcut_is_detected():
    classifier = IntentClassifier(confidence_threshold=0.7)

    result = classifier.classify("Tolong bantu research gap penelitian ini", [])

    assert result["intent"] == "research_gap"


def test_methodology_justify_shortcut_is_detected():
    classifier = IntentClassifier(confidence_threshold=0.7)

    result = classifier.classify("Apa justifikasi metodologi mixed methods?", [])

    assert result["intent"] == "methodology_justify"


def test_data_interpretation_shortcut_is_detected():
    classifier = IntentClassifier(confidence_threshold=0.7)

    result = classifier.classify("Tolong interpretasi data dan hubungkan dengan teori", [])

    assert result["intent"] == "data_interpretation"


def test_thesis_conclusion_shortcut_is_detected():
    classifier = IntentClassifier(confidence_threshold=0.7)

    result = classifier.classify("Bantu susun kesimpulan dan limitasi penelitian", [])

    assert result["intent"] == "thesis_conclusion"


def test_golden_thread_shortcut_is_detected():
    classifier = IntentClassifier(confidence_threshold=0.7)

    result = classifier.classify("Cek golden thread antar bab saya", [])

    assert result["intent"] == "golden_thread_check"


def test_json_decode_error_returns_unclear(monkeypatch):
    classifier = IntentClassifier(confidence_threshold=0.7)
    monkeypatch.setattr(classifier, "_call_llm", lambda prompt: "not-json")

    result = classifier.classify("Pertanyaan ambigu", [])

    assert result["intent"] == "unclear"
    assert result["error"] == "json_parse_error"


def test_abstract_conceptual_question_falls_back_to_llm(monkeypatch):
    classifier = IntentClassifier(confidence_threshold=0.7)
    monkeypatch.setattr(
        classifier,
        "_call_llm",
        lambda prompt: json.dumps(
            {
                "intent": "general_question",
                "confidence": 0.91,
                "needs_clarification": False,
            }
        ),
    )

    result = classifier.classify("Apa itu abstract?", [])

    assert result["intent"] == "general_question"


def test_call_llm_uses_primary_model_successfully(monkeypatch):
    classifier = IntentClassifier(confidence_threshold=0.7)
    classifier.api_key = "primary-key"

    local_litellm = types.ModuleType("litellm")
    local_litellm.completion = lambda **kwargs: types.SimpleNamespace(
        choices=[types.SimpleNamespace(message=types.SimpleNamespace(content='{"intent":"ok"}'))]
    )
    local_exceptions = types.ModuleType("litellm.exceptions")
    local_exceptions.RateLimitError = RuntimeError
    monkeypatch.setitem(sys.modules, "litellm", local_litellm)
    monkeypatch.setitem(sys.modules, "litellm.exceptions", local_exceptions)

    assert classifier._call_llm("prompt") == '{"intent":"ok"}'


def test_call_llm_uses_fallback_model_when_primary_fails(monkeypatch):
    classifier = IntentClassifier(confidence_threshold=0.7)
    classifier.api_key = "primary-key"
    monkeypatch.setenv("GEMINI_API_KEY", "fallback-key")

    calls = {"count": 0}

    def fake_completion(**kwargs):
        calls["count"] += 1
        if calls["count"] == 1:
            raise RuntimeError("limit")
        return types.SimpleNamespace(
            choices=[types.SimpleNamespace(message=types.SimpleNamespace(content='{"intent":"fallback"}'))]
        )

    local_litellm = types.ModuleType("litellm")
    local_litellm.completion = fake_completion
    local_exceptions = types.ModuleType("litellm.exceptions")
    local_exceptions.RateLimitError = RuntimeError
    monkeypatch.setitem(sys.modules, "litellm", local_litellm)
    monkeypatch.setitem(sys.modules, "litellm.exceptions", local_exceptions)

    assert classifier._call_llm("prompt") == '{"intent":"fallback"}'


def test_call_llm_raises_when_primary_and_fallback_fail(monkeypatch):
    classifier = IntentClassifier(confidence_threshold=0.7)
    classifier.api_key = "primary-key"
    monkeypatch.setenv("GEMINI_API_KEY", "fallback-key")

    local_litellm = types.ModuleType("litellm")
    local_litellm.completion = lambda **kwargs: (_ for _ in ()).throw(RuntimeError("still failing"))
    local_exceptions = types.ModuleType("litellm.exceptions")
    local_exceptions.RateLimitError = RuntimeError
    monkeypatch.setitem(sys.modules, "litellm", local_litellm)
    monkeypatch.setitem(sys.modules, "litellm.exceptions", local_exceptions)

    try:
        classifier._call_llm("prompt")
    except RuntimeError as exc:
        assert "still failing" in str(exc)
    else:
        raise AssertionError("_call_llm seharusnya melempar error saat primary dan fallback gagal")
