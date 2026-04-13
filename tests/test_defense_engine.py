import pytest
from app.engines.defense_engine import DefenseEngine

class MockVariable:
    def __init__(self, name):
        self.name = name

class MockAnalysisResults:
    def __init__(self):
        self.hypothesis_tests = {}

class MockGraph:
    def __init__(self):
        self.title = "Pengaruh AI terhadap Produktivitas"
        self.rumusan_masalah = []
        self.hypotheses = []
        self.methodology = "quantitative"
        self.variables = [MockVariable("AI"), MockVariable("Produktivitas")]
        self.analysis_results = MockAnalysisResults()

def test_build_system_prompt_critical_hard():
    graph = MockGraph()
    prompt = DefenseEngine.build_system_prompt(graph, examiner_type="critical", difficulty="hard")
    
    # Check persona
    assert "PROF. KILLER" in prompt
    # Check difficulty
    assert "Jawaban harus detail" in prompt
    # Check context injection
    assert "Pengaruh AI" in prompt
    assert "AI, Produktivitas" in prompt

def test_build_system_prompt_supportive_normal():
    graph = MockGraph()
    prompt = DefenseEngine.build_system_prompt(graph, examiner_type="supportive", difficulty="normal")
    
    assert "DOSEN PEMBIMBING" in prompt
    assert "Jawaban konseptual" in prompt

def test_build_evaluation_prompt():
    graph = MockGraph()
    history = [
        {"role": "assistant", "content": "Mengapa Anda memilih metode regresi linier?"},
        {"role": "user", "content": "Karena variabel terikat saya berskala rasio dan memenuhi asumsi normalitas."}
    ]
    prompt = DefenseEngine.build_evaluation_prompt(graph, history)
    
    # Ensure chat history is formatted properly
    assert "PENGUJI: Mengapa Anda memilih" in prompt
    assert "MAHASISWA: Karena variabel terikat saya" in prompt
    # Ensure JSON schema requirement is stated
    assert "OUTPUT FORMAT" in prompt
    assert "\"verdict\":" in prompt
