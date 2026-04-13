from app.engines.rule_engine import AcademicRuleEngine
import traceback

class MockAnalysisResults:
    def __init__(self):
        self.hypothesis_tests = {}
        self.descriptive_stats = {}

class MockResearchGraph:
    def __init__(self, methodology="quantitative"):
        self.methodology = methodology
        self.hypotheses = []
        self.variables = []
        self.population_sample = None
        self.analysis_results = MockAnalysisResults()
        self.rumusan_masalah = []
        self.tujuan_penelitian = []
        self.population = 0
        self.sample = 0
        self.constraints = ""
        self.locked_analysis_methods = []

    def __getattr__(self, name):
        return None

graph = MockResearchGraph()
try:
    AcademicRuleEngine.validate(graph)
    print("SUCCESS")
except Exception as e:
    print("FAILED WITH ERROR:")
    traceback.print_exc()
