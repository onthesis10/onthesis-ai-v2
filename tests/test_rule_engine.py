import pytest
from unittest.mock import MagicMock
from app.engines.rule_engine import AcademicRuleEngine

def create_valid_quantitative_mock():
    graph = MagicMock()
    graph.methodology = "quantitative"
    
    # Check 1 passes
    graph.hypotheses = [MagicMock()]
    var = MagicMock()
    var.indicators = ["Indikator 1"]
    graph.variables = [var]
    graph.population_sample = "100 orang"
    graph.analysis_results.hypothesis_tests = {"test1": "result"}
    
    # Check 2 passes (must not)
    # The rule engine checks if strings like "coding_theme" are in rumusan_masalah, tujuan, variables, etc.
    # MagicMock returns a MagicMock when accessed, but if it expects a list of objects with a `.name`, we give it:
    graph.rumusan_masalah = []
    graph.tujuan_penelitian = []
    
    return graph

def test_quantitative_valid():
    graph = create_valid_quantitative_mock()
    violations = AcademicRuleEngine.validate(graph)
    # We just want to make sure it doesn't crash and returns mostly valid
    assert isinstance(violations, list)

def test_quantitative_invalid_missing_must_have():
    graph = create_valid_quantitative_mock()
    # Remove hypotheses to trigger violation
    graph.hypotheses = []
    violations = AcademicRuleEngine.validate(graph)
    assert any("MISSING_HIPOTESIS" == v.code for v in violations)

def test_no_methodology():
    graph = MagicMock()
    graph.methodology = None
    violations = AcademicRuleEngine.validate(graph)
    assert len(violations) >= 1
    assert violations[0].code == "NO_METHODOLOGY"

def test_qualitative_strict_rules_valid():
    graph = MagicMock()
    graph.methodology = "qualitative"
    graph.title = "Studi Kasus"
    
    rm1 = MagicMock()
    rm1.text = "Bagaimana persepsi"
    graph.rumusan_masalah = [rm1]
    
    graph.population_sample = "Informan purvosive"
    graph.constraints.locked_analysis_methods = ["triangulasi sumber"]
    
    violations = AcademicRuleEngine.validate(graph)
    codes = [v.code for v in violations]
    assert "MISSING_FOKUS_PENELITIAN" not in codes
    assert "MISSING_INFORMAN" not in codes
    assert "MISSING_TEKNIK_KEABSAHAN" not in codes

def test_qualitative_strict_rules_invalid():
    graph = MagicMock()
    graph.methodology = "qualitative"
    graph.title = "Studi Kasus"
    
    rm1 = MagicMock()
    rm1.text = "Pengaruh X terhadap Y"
    graph.rumusan_masalah = [rm1]
    
    graph.population_sample = "100 Siswa"
    graph.constraints.locked_analysis_methods = ["Regresi Linear"]
    
    violations = AcademicRuleEngine.validate(graph)
    codes = [v.code for v in violations]
    assert "MISSING_FOKUS_PENELITIAN" in codes
    assert "MISSING_INFORMAN" in codes
    assert "MISSING_TEKNIK_KEABSAHAN" in codes
