# File: app/engines/rule_engine.py
# Deskripsi: Academic Rule Engine — hard rules that AI CANNOT violate.
# Validates research consistency based on methodology type.

from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)


# ==============================================================================
# RESEARCH METHODOLOGY RULES
# ==============================================================================

RESEARCH_RULES = {
    "quantitative": {
        "must_have": [
            ("hipotesis", "Hipotesis penelitian"),
            ("variabel_operasional", "Variabel dengan indikator/definisi operasional"),
            ("populasi_sampel", "Populasi dan sampel penelitian"),
            ("teknik_analisis", "Teknik analisis data (regresi, t-test, dll)"),
        ],
        "must_not": [
            ("coding_theme", "Tema coding/kategorisasi kualitatif"),
            ("triangulasi", "Teknik triangulasi"),
            ("saturasi_data", "Saturasi data / kejenuhan data"),
        ],
        "bab4_requires": [
            "deskriptif",          # Statistik deskriptif
            "uji_hipotesis",       # Pengujian hipotesis
        ],
        "sample_rules": {
            "regresi": {"min_sample": 30, "rule": "n ≥ 10k (k=jumlah variabel prediktor)"},
            "regresi_linear": {"min_sample": 30, "rule": "n ≥ 10k"},
            "t_test": {"min_sample": 20, "rule": "n ≥ 20 per kelompok"},
            "anova": {"min_sample": 15, "rule": "n ≥ 15 per kelompok"},
            "sem": {"min_sample": 100, "rule": "n ≥ 100 atau 5-10x parameter"},
            "chi_square": {"min_sample": 30, "rule": "expected count ≥ 5 per cell"},
            "korelasi": {"min_sample": 30, "rule": "n ≥ 30"},
        },
    },
    "qualitative": {
        "must_have": [
            ("fokus_penelitian", "Fokus penelitian (bukan hipotesis)"),
            ("informan", "Informan / partisipan"),
            ("teknik_pengumpulan", "Teknik pengumpulan data (wawancara, observasi, dll)"),
            ("teknik_keabsahan", "Teknik keabsahan data (triangulasi, member check)"),
        ],
        "must_not": [
            ("hipotesis", "Hipotesis (tidak berlaku di kualitatif)"),
            ("uji_statistik", "Uji statistik parametrik/non-parametrik"),
            ("populasi_sampel_random", "Teknik sampling random/probability"),
        ],
        "bab4_requires": [
            "reduksi_data",
            "penyajian_data",
            "penarikan_kesimpulan",
        ],
        "sample_rules": {},
    },
    "mixed": {
        "must_have": [
            ("desain_mixed", "Desain mixed methods (sequential/concurrent)"),
            ("fase_kuantitatif", "Fase kuantitatif (variabel, hipotesis)"),
            ("fase_kualitatif", "Fase kualitatif (informan, pengumpulan data)"),
        ],
        "must_not": [],
        "bab4_requires": [
            "hasil_kuantitatif",
            "hasil_kualitatif",
            "integrasi_temuan",
        ],
        "sample_rules": {},
    },
}


# ==============================================================================
# VALIDATION RESULT
# ==============================================================================

class RuleViolation:
    """A single rule violation"""
    def __init__(self, severity: str, code: str, message: str, suggestion: str = ""):
        self.severity = severity  # "error", "warning", "info"
        self.code = code
        self.message = message
        self.suggestion = suggestion
    
    def to_dict(self) -> Dict[str, str]:
        return {
            "severity": self.severity,
            "code": self.code,
            "message": self.message,
            "suggestion": self.suggestion,
        }


# ==============================================================================
# ACADEMIC RULE ENGINE
# ==============================================================================

class AcademicRuleEngine:
    """
    Validates thesis structure against academic methodology rules.
    Returns list of violations with severity levels.
    """

    @staticmethod
    def validate(research_graph) -> List[RuleViolation]:
        """Run all validation checks against the research graph"""
        violations = []
        
        methodology = research_graph.methodology
        if not methodology or methodology not in RESEARCH_RULES:
            violations.append(RuleViolation(
                severity="error",
                code="NO_METHODOLOGY",
                message="Metodologi penelitian belum ditentukan.",
                suggestion="Pilih metodologi (quantitative/qualitative/mixed) di Project Settings."
            ))
            return violations
        
        rules = RESEARCH_RULES[methodology]
        
        # Check 1: must_have entities
        violations.extend(AcademicRuleEngine._check_must_have(research_graph, rules))
        
        # Check 2: must_not entities  
        violations.extend(AcademicRuleEngine._check_must_not(research_graph, rules))
        
        # Check 3: Rumusan Masalah ↔ Tujuan alignment
        violations.extend(AcademicRuleEngine._check_rm_tujuan_alignment(research_graph))
        
        # Check 4: Variable ↔ Theory coverage
        violations.extend(AcademicRuleEngine._check_theory_coverage(research_graph))
        
        # Check 5: Hypothesis ↔ Rumusan Masalah alignment (quantitative only)
        if methodology == "quantitative":
            violations.extend(AcademicRuleEngine._check_hypothesis_alignment(research_graph))
        
        # Check 6: Method ↔ Question type alignment
        violations.extend(AcademicRuleEngine._check_method_question_alignment(research_graph))
        
        # Check 7: Sample size rules
        violations.extend(AcademicRuleEngine._check_sample_size(research_graph, rules))
        
        # Check 8: Section Completeness
        violations.extend(AcademicRuleEngine._check_section_completeness(research_graph, rules))
        
        return violations

    @staticmethod
    def _check_must_have(graph, rules) -> List[RuleViolation]:
        """Check required entities exist"""
        violations = []
        checks = {
            "hipotesis": len(graph.hypotheses) > 0,
            "variabel_operasional": any(v.indicators for v in graph.variables),
            "populasi_sampel": bool(graph.population_sample),
            "teknik_analisis": any(h.analysis_method for h in graph.hypotheses) or bool(graph.constraints.locked_analysis_methods),
            "fokus_penelitian": bool(graph.title) and len(graph.rumusan_masalah) > 0 and not any(word in rm.text.lower() for rm in graph.rumusan_masalah for word in ["pengaruh", "hubungan", "dampak", "signifikansi"]),
            "informan": bool(graph.population_sample) and any(word in graph.population_sample.lower() for word in ["informan", "partisipan", "subjek", "narasumber", "purposive", "snowball"]),
            "teknik_pengumpulan": True,  # Future NLP check: wawancara, observasi
            "teknik_keabsahan": bool(graph.constraints.locked_analysis_methods) and any(word in method.lower() for method in graph.constraints.locked_analysis_methods for word in ["triangulasi", "member check", "kredibilitas", "dependabilitas"]),
            "desain_mixed": graph.methodology == "mixed",
            "fase_kuantitatif": len(graph.hypotheses) > 0 if graph.methodology == "mixed" else True,
            "fase_kualitatif": True,  # Hard to detect
        }
        
        for entity_key, label in rules.get("must_have", []):
            if entity_key in checks and not checks[entity_key]:
                violations.append(RuleViolation(
                    severity="error",
                    code=f"MISSING_{entity_key.upper()}",
                    message=f"WAJIB ADA: {label}",
                    suggestion=f"Tambahkan {label} di Project Settings atau Research Graph."
                ))
        
        return violations

    @staticmethod
    def _check_must_not(graph, rules) -> List[RuleViolation]:
        """Check forbidden elements don't exist"""
        violations = []
        # For now, this is checked at generation time via prompt constraints
        # Future: scan chapter content for forbidden terms
        return violations

    @staticmethod
    def _check_rm_tujuan_alignment(graph) -> List[RuleViolation]:
        """Every Rumusan Masalah should have a matching Tujuan"""
        violations = []
        
        if not graph.rumusan_masalah:
            return violations
        
        tujuan_ids = {t.id for t in graph.tujuan}
        
        for rm in graph.rumusan_masalah:
            if rm.maps_to_tujuan and rm.maps_to_tujuan not in tujuan_ids:
                violations.append(RuleViolation(
                    severity="warning",
                    code="RM_NO_TUJUAN",
                    message=f"Rumusan Masalah '{rm.id}' belum punya Tujuan Penelitian yang sesuai.",
                    suggestion=f"Buat Tujuan Penelitian yang menjawab: '{rm.text[:80]}...'"
                ))
        
        return violations

    @staticmethod
    def _check_theory_coverage(graph) -> List[RuleViolation]:
        """Every variable should have at least one supporting theory"""
        violations = []
        
        for var in graph.variables:
            if not var.supporting_theories:
                violations.append(RuleViolation(
                    severity="warning",
                    code="VAR_NO_THEORY",
                    message=f"Variabel '{var.name}' belum punya teori pendukung.",
                    suggestion=f"Tambahkan teori yang menjelaskan variabel '{var.name}' di Bab 2."
                ))
        
        return violations

    @staticmethod
    def _check_hypothesis_alignment(graph) -> List[RuleViolation]:
        """Every hypothesis should map to a rumusan masalah (quantitative)"""
        violations = []
        
        rm_ids = {rm.id for rm in graph.rumusan_masalah}
        
        for h in graph.hypotheses:
            if h.maps_to_rumusan and h.maps_to_rumusan not in rm_ids:
                violations.append(RuleViolation(
                    severity="warning",
                    code="H_NO_RM",
                    message=f"Hipotesis '{h.id}' tidak terhubung ke Rumusan Masalah manapun.",
                    suggestion=f"Pastikan hipotesis '{h.statement[:60]}...' menjawab salah satu RM."
                ))
        
        # Check: are there RM without hypothesis?
        h_rm_ids = {h.maps_to_rumusan for h in graph.hypotheses if h.maps_to_rumusan}
        for rm in graph.rumusan_masalah:
            if rm.id not in h_rm_ids:
                violations.append(RuleViolation(
                    severity="warning",
                    code="RM_NO_HYPOTHESIS",
                    message=f"Rumusan Masalah '{rm.id}' belum punya hipotesis.",
                    suggestion=f"Buat hipotesis untuk: '{rm.text[:80]}...'"
                ))
        
        return violations

    @staticmethod
    def _check_method_question_alignment(graph) -> List[RuleViolation]:
        """Check if methodology matches the type of research questions"""
        violations = []
        
        for rm in graph.rumusan_masalah:
            text_lower = rm.text.lower()
            
            # "pengaruh" / "effect" → should be quantitative
            if ("pengaruh" in text_lower or "effect" in text_lower or "berpengaruh" in text_lower):
                if graph.methodology == "qualitative":
                    violations.append(RuleViolation(
                        severity="error",
                        code="METHOD_QUESTION_MISMATCH",
                        message=f"RM '{rm.id}' bertanya tentang 'pengaruh', tapi metodologi = kualitatif.",
                        suggestion="Ubah metodologi ke kuantitatif atau ubah RM agar tidak mengukur 'pengaruh'."
                    ))
            
            # "bagaimana pengalaman" / "makna" → should be qualitative
            if ("pengalaman" in text_lower or "makna" in text_lower or "persepsi" in text_lower):
                if graph.methodology == "quantitative":
                    violations.append(RuleViolation(
                        severity="warning",
                        code="METHOD_QUESTION_WARNING",
                        message=f"RM '{rm.id}' bertanya tentang 'pengalaman/makna', biasanya cocok kualitatif.",
                        suggestion="Pertimbangkan apakah pendekatan kualitatif lebih sesuai."
                    ))
        
        return violations

    @staticmethod
    def _check_sample_size(graph, rules) -> List[RuleViolation]:
        """Check if sample size meets minimum requirements for the analysis method"""
        violations = []
        sample_rules = rules.get("sample_rules", {})
        
        if not graph.analysis_results.sample_size and not graph.constraints.required_sample_size:
            return violations
        
        actual_sample = graph.analysis_results.sample_size or graph.constraints.required_sample_size or 0
        
        for h in graph.hypotheses:
            if h.analysis_method and h.analysis_method in sample_rules:
                rule = sample_rules[h.analysis_method]
                min_n = rule["min_sample"]
                if actual_sample > 0 and actual_sample < min_n:
                    violations.append(RuleViolation(
                        severity="error",
                        code="SAMPLE_TOO_SMALL",
                        message=f"Sampel ({actual_sample}) terlalu kecil untuk {h.analysis_method}. Minimal: {min_n}.",
                        suggestion=f"Aturan: {rule['rule']}. Tambah sampel atau ubah metode analisis."
                    ))
        
        return violations

    @staticmethod
    def _check_section_completeness(graph, rules) -> List[RuleViolation]:
        """Check if chapters map to required sections/data."""
        violations = []
        methodology = graph.methodology
        
        # Bab 1 Core Sections
        if not graph.rumusan_masalah:
            violations.append(RuleViolation("warning", "MISSING_SECT_RM", "Bab 1: Sub-bab Rumusan Masalah kosong.", "Isi minimal 1 rumusan masalah utama."))
        if not graph.tujuan:
            violations.append(RuleViolation("warning", "MISSING_SECT_TUJUAN", "Bab 1: Sub-bab Tujuan Penelitian kosong.", "Tentukan tujuan yang selaras dengan rumusan masalah."))
            
        # Bab 2 Core Sections
        if not graph.theories:
            violations.append(RuleViolation("warning", "MISSING_SECT_THEORY", "Bab 2: Sub-bab Kajian Teori kosong.", "Tambahkan grand theory atau referensi konsep."))
            
        # Bab 4 Core Sections based on methodology
        if methodology == "quantitative":
            if not graph.analysis_results.descriptive:
                violations.append(RuleViolation("warning", "MISSING_SECT_DESC", "Bab 4: Sub-bab Statistik Deskriptif belum ada.", "Jalankan olah data deskriptif di fitur Analysis."))
            if not graph.analysis_results.hypothesis_tests:
                violations.append(RuleViolation("warning", "MISSING_SECT_HYP_TEST", "Bab 4: Sub-bab Hasil Uji Hipotesis belum ada.", "Jalankan uji hipotesis (misal: regresi/t-test) di fitur Analysis."))
                
        elif methodology == "qualitative":
            # For qual, we just expect the user to have some context or summary added manually
            pass 
            
        return violations

    @staticmethod
    def build_rule_prompt(graph) -> str:
        """Build prompt constraints based on methodology rules"""
        methodology = graph.methodology
        if not methodology or methodology not in RESEARCH_RULES:
            return ""
        
        rules = RESEARCH_RULES[methodology]
        lines = [f"[ATURAN AKADEMIK — Metodologi {methodology.upper()}]"]
        
        # Must not
        for entity_key, label in rules.get("must_not", []):
            lines.append(f"  ❌ DILARANG: {label}")
        
        # Must have
        for entity_key, label in rules.get("must_have", []):
            lines.append(f"  ✅ WAJIB: {label}")
        
        if methodology == "quantitative":
            lines.append("  📊 Setiap klaim harus didukung data/referensi.")
            lines.append("  📊 JANGAN mengarang angka statistik.")
        elif methodology == "qualitative":
            lines.append("  📝 Fokus pada interpretasi makna dan deskripsi mendalam.")
            lines.append("  📝 JANGAN menggunakan uji statistik parametrik.")
        
        return "\n".join(lines)
