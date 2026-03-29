# File: app/engines/consistency_validator.py
# Deskripsi: Research Consistency Validator — 6 cross-entity relationship checks.
# Complements the AcademicRuleEngine (which checks static methodology rules).
# This validator checks RELATIONSHIPS between entities across the Research Graph.

from typing import List
import logging

logger = logging.getLogger(__name__)


class ConsistencyViolation:
    """A single consistency violation"""
    def __init__(self, severity: str, code: str, message: str, suggestion: str = ""):
        self.severity = severity
        self.code = code
        self.message = message
        self.suggestion = suggestion

    def to_dict(self):
        return {
            "severity": self.severity,
            "code": self.code,
            "message": self.message,
            "suggestion": self.suggestion,
        }


class ResearchConsistencyValidator:
    """
    6 cross-entity relationship checks:
    1. Analisis ↔ Tujuan alignment
    2. Referensi ↔ Teori coverage
    3. Hipotesis ↔ Hasil (post Bab 4)
    4. Variable usage consistency
    5. Tujuan ↔ Kesimpulan (post Bab 5)
    6. Independent/Dependent variable balance
    """

    @staticmethod
    def validate(graph, chapter: str = "") -> List[ConsistencyViolation]:
        """Run all 6 consistency checks"""
        violations = []

        violations.extend(ResearchConsistencyValidator._check_analysis_tujuan(graph))
        violations.extend(ResearchConsistencyValidator._check_ref_theory(graph))
        violations.extend(ResearchConsistencyValidator._check_hypothesis_results(graph))
        violations.extend(ResearchConsistencyValidator._check_variable_consistency(graph))
        violations.extend(ResearchConsistencyValidator._check_tujuan_kesimpulan(graph))
        violations.extend(ResearchConsistencyValidator._check_var_balance(graph))

        return violations

    # ──────────────────────────────────────────────────────────────────────
    # CHECK 1: Analisis ↔ Tujuan
    # Tujuan "mengukur pengaruh" → analisis harus regresi/korelasi
    # Tujuan "mendeskripsikan" → deskriptif OK
    # ──────────────────────────────────────────────────────────────────────
    @staticmethod
    def _check_analysis_tujuan(graph) -> List[ConsistencyViolation]:
        violations = []
        if graph.methodology != "quantitative":
            return violations

        analysis_methods = set()
        for h in graph.hypotheses:
            if h.analysis_method:
                analysis_methods.add(h.analysis_method.lower())
        for m in graph.constraints.locked_analysis_methods:
            analysis_methods.add(m.lower())

        for tujuan in graph.tujuan:
            text = tujuan.text.lower()

            # "menganalisis pengaruh" / "mengukur pengaruh" needs regression
            needs_inferential = any(kw in text for kw in [
                "pengaruh", "hubungan", "korelasi", "perbedaan",
                "membandingkan", "effect", "relationship"
            ])

            if needs_inferential and analysis_methods:
                has_inferential = any(m in analysis_methods for m in [
                    "regresi", "regresi_linear", "regresi_berganda",
                    "korelasi", "t_test", "anova", "sem", "chi_square",
                    "path_analysis", "mann_whitney", "wilcoxon"
                ])
                if not has_inferential:
                    violations.append(ConsistencyViolation(
                        severity="warning",
                        code="ANALYSIS_TUJUAN_MISMATCH",
                        message=f"Tujuan '{tujuan.id}' mengukur pengaruh/hubungan, "
                                f"tapi metode analisis hanya: {', '.join(analysis_methods)}.",
                        suggestion="Tambahkan metode inferensial (regresi, korelasi, dll) "
                                   "yang sesuai dengan tujuan penelitian."
                    ))

        return violations

    # ──────────────────────────────────────────────────────────────────────
    # CHECK 2: Referensi ↔ Teori
    # Setiap teori yang dibahas harus punya ≥1 referensi primer
    # ──────────────────────────────────────────────────────────────────────
    @staticmethod
    def _check_ref_theory(graph) -> List[ConsistencyViolation]:
        violations = []

        for theory in graph.theories:
            if not theory.source_refs:
                violations.append(ConsistencyViolation(
                    severity="warning",
                    code="THEORY_NO_REF",
                    message=f"Teori '{theory.name}' ({theory.author or 'tanpa author'}) "
                            f"belum punya referensi primer.",
                    suggestion=f"Tambahkan referensi yang memuat teori "
                               f"'{theory.name}' ke daftar pustaka."
                ))

        return violations

    # ──────────────────────────────────────────────────────────────────────
    # CHECK 3: Hipotesis ↔ Hasil (setelah Bab 4)
    # Setiap hipotesis harus punya test_result setelah Bab 4 approved/draft
    # ──────────────────────────────────────────────────────────────────────
    @staticmethod
    def _check_hypothesis_results(graph) -> List[ConsistencyViolation]:
        violations = []

        bab4 = graph.chapter_snapshots.get("bab4")
        if not bab4 or bab4.status in ("empty",):
            return violations  # Bab 4 belum ditulis — skip

        for h in graph.hypotheses:
            if not h.test_result:
                violations.append(ConsistencyViolation(
                    severity="error" if bab4.status == "approved" else "warning",
                    code="H_NO_RESULT",
                    message=f"Hipotesis '{h.id}' ({h.statement[:60]}...) "
                            f"belum diuji di Bab 4.",
                    suggestion=f"Jalankan analisis data untuk menguji hipotesis ini, "
                               f"lalu update hasilnya di Research Graph."
                ))

        return violations

    # ──────────────────────────────────────────────────────────────────────
    # CHECK 4: Variable usage consistency
    # Variabel yang ada di graph harus konsisten — ada di ≥2 chapters
    # ──────────────────────────────────────────────────────────────────────
    @staticmethod
    def _check_variable_consistency(graph) -> List[ConsistencyViolation]:
        violations = []

        # Count how many chapters have content
        active_chapters = sum(
            1 for ch in graph.chapter_snapshots.values()
            if ch.status not in ("empty",)
        )

        if active_chapters < 2:
            return violations  # Not enough chapters to check consistency

        for var in graph.variables:
            mentioned = len(var.mentioned_in_chapters) if var.mentioned_in_chapters else 0
            if mentioned == 0:
                violations.append(ConsistencyViolation(
                    severity="info",
                    code="VAR_UNUSED",
                    message=f"Variabel '{var.name}' belum direferensikan di chapter manapun.",
                    suggestion="Pastikan variabel ini digunakan di Bab 1 (latar belakang), "
                               "Bab 2 (teori), dan Bab 3 (operasionalisasi)."
                ))
            elif mentioned == 1 and active_chapters >= 3:
                violations.append(ConsistencyViolation(
                    severity="info",
                    code="VAR_LIMITED_USE",
                    message=f"Variabel '{var.name}' hanya direferensikan di "
                            f"{var.mentioned_in_chapters[0]}.",
                    suggestion="Variabel penelitian seharusnya konsisten muncul di "
                               "bab 1, 2, 3, dan 4."
                ))

        return violations

    # ──────────────────────────────────────────────────────────────────────
    # CHECK 5: Tujuan ↔ Kesimpulan (setelah Bab 5)
    # Setiap tujuan harus terjawab di Bab 5
    # ──────────────────────────────────────────────────────────────────────
    @staticmethod
    def _check_tujuan_kesimpulan(graph) -> List[ConsistencyViolation]:
        violations = []

        bab5 = graph.chapter_snapshots.get("bab5")
        if not bab5 or bab5.status in ("empty",):
            return violations

        bab5_entities = bab5.key_entities_used or []

        for tujuan in graph.tujuan:
            if tujuan.id not in bab5_entities:
                violations.append(ConsistencyViolation(
                    severity="warning" if bab5.status == "draft" else "error",
                    code="TUJUAN_NOT_CONCLUDED",
                    message=f"Tujuan '{tujuan.id}' ({tujuan.text[:60]}...) "
                            f"belum terjawab di Bab 5 Kesimpulan.",
                    suggestion="Pastikan kesimpulan menjawab setiap tujuan penelitian."
                ))

        return violations

    # ──────────────────────────────────────────────────────────────────────
    # CHECK 6: Independent / Dependent variable balance
    # Minimal 1 independent + 1 dependent (quantitative)
    # ──────────────────────────────────────────────────────────────────────
    @staticmethod
    def _check_var_balance(graph) -> List[ConsistencyViolation]:
        violations = []

        if graph.methodology != "quantitative":
            return violations

        if not graph.variables:
            return violations

        types = [v.var_type.lower() for v in graph.variables if v.var_type]
        has_independent = any(t in ("independent", "independen", "bebas", "x") for t in types)
        has_dependent = any(t in ("dependent", "dependen", "terikat", "y") for t in types)

        if not has_independent and not has_dependent:
            # Vars exist but none typed — info only
            violations.append(ConsistencyViolation(
                severity="info",
                code="VAR_TYPE_MISSING",
                message="Variabel belum dikelompokkan menjadi independen/dependen.",
                suggestion="Tentukan tipe setiap variabel (independen/X atau dependen/Y) "
                           "di Project Settings."
            ))
        elif not has_independent:
            violations.append(ConsistencyViolation(
                severity="warning",
                code="NO_INDEPENDENT_VAR",
                message="Tidak ada variabel independen (X) — penelitian kuantitatif "
                        "biasanya butuh minimal 1 variabel independen.",
                suggestion="Tambahkan variabel independen di Project Settings."
            ))
        elif not has_dependent:
            violations.append(ConsistencyViolation(
                severity="warning",
                code="NO_DEPENDENT_VAR",
                message="Tidak ada variabel dependen (Y) — penelitian kuantitatif "
                        "biasanya butuh minimal 1 variabel dependen.",
                suggestion="Tambahkan variabel dependen di Project Settings."
            ))

        return violations
