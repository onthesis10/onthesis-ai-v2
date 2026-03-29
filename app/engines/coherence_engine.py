# File: app/engines/coherence_engine.py
# Deskripsi: Cross-Chapter Coherence Engine.
# Enforces entity consistency, detects topic drift, and manages chapter locks.

from typing import List, Dict, Any, Set
import logging
import re

logger = logging.getLogger(__name__)


class CoherenceViolation:
    """A single coherence violation"""
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


# ══════════════════════════════════════════════════════════════════════════════
# CHAPTER DEPENDENCIES — which chapters depend on which
# ══════════════════════════════════════════════════════════════════════════════
CHAPTER_DEPS = {
    "bab1": [],
    "bab2": ["bab1"],
    "bab3": ["bab1", "bab2"],
    "bab4": ["bab1", "bab2", "bab3"],
    "bab5": ["bab1", "bab4"],
}

# What gets locked after which chapter
LOCK_TRIGGERS = {
    "bab1": ["variables", "rumusan_masalah"],
    "bab3": ["methodology", "analysis_methods"],
}


class CoherenceEngine:
    """
    Cross-chapter coherence enforcement:
    1. Entity Lock — freeze variables/methodology after chapter approval
    2. Topic Drift Detection — keyword overlap check between chapters
    3. Dependency Enforcement — build coherence prompts
    """

    # ──────────────────────────────────────────────────────────────────────
    # 1. ENTITY LOCK VALIDATION
    # ──────────────────────────────────────────────────────────────────────
    @staticmethod
    def check_entity_locks(graph, target_chapter: str) -> List[CoherenceViolation]:
        """
        Check if entities are locked by approved chapters.
        Called before generation to warn about potential violations.
        """
        violations = []
        approved = set(graph.constraints.approved_chapters)

        if not approved:
            return violations

        # If Bab 1 is approved, variables are locked
        if "bab1" in approved and target_chapter != "bab1":
            locked_vars = graph.constraints.locked_variables
            if locked_vars:
                violations.append(CoherenceViolation(
                    severity="info",
                    code="ENTITY_LOCK_VARS",
                    message=f"Variabel terkunci dari Bab 1: {', '.join(locked_vars)}.",
                    suggestion="Variabel tidak boleh berubah. Jika perlu perubahan, "
                               "revisi Bab 1 terlebih dahulu."
                ))

        # If Bab 3 is approved, methodology is locked
        if "bab3" in approved and target_chapter in ("bab4", "bab5"):
            if graph.constraints.locked_methodology:
                violations.append(CoherenceViolation(
                    severity="info",
                    code="ENTITY_LOCK_METHOD",
                    message=f"Metodologi terkunci: {graph.constraints.locked_methodology}.",
                    suggestion="Metode penelitian tidak boleh berubah di Bab 4 dan 5."
                ))

        return violations

    # ──────────────────────────────────────────────────────────────────────
    # 2. AUTO-LOCK ON APPROVAL
    # ──────────────────────────────────────────────────────────────────────
    @staticmethod
    def apply_locks_on_approval(graph, approved_chapter: str):
        """
        Auto-lock entities when a chapter is approved.
        Called by update_chapter_snapshot when status → 'approved'.
        """
        if approved_chapter not in graph.constraints.approved_chapters:
            graph.constraints.approved_chapters.append(approved_chapter)

        if approved_chapter == "bab1":
            # Lock all current variables
            graph.constraints.locked_variables = [v.name for v in graph.variables]
            logger.info(f"🔒 Variables locked: {graph.constraints.locked_variables}")

        elif approved_chapter == "bab3":
            # Lock methodology
            graph.constraints.locked_methodology = graph.methodology
            # Lock analysis methods
            methods = set()
            for h in graph.hypotheses:
                if h.analysis_method:
                    methods.add(h.analysis_method)
            graph.constraints.locked_analysis_methods = list(methods)
            logger.info(f"🔒 Methodology locked: {graph.methodology}, "
                        f"Methods: {graph.constraints.locked_analysis_methods}")

    # ──────────────────────────────────────────────────────────────────────
    # 3. TOPIC DRIFT DETECTION
    # ──────────────────────────────────────────────────────────────────────
    @staticmethod
    def detect_topic_drift(graph, target_chapter: str) -> List[CoherenceViolation]:
        """
        Detect topic drift by comparing keyword overlap between
        dependent chapter summaries and the target chapter's variables/theories.
        Lightweight: uses keyword matching, no external embeddings needed.
        """
        violations = []
        deps = CHAPTER_DEPS.get(target_chapter, [])

        if not deps:
            return violations

        # Collect expected keywords from graph entities
        expected_keywords = set()
        for v in graph.variables:
            expected_keywords.update(CoherenceEngine._tokenize(v.name))
        for t in graph.theories:
            expected_keywords.update(CoherenceEngine._tokenize(t.name))
        for rm in graph.rumusan_masalah:
            expected_keywords.update(CoherenceEngine._tokenize(rm.text))

        if not expected_keywords:
            return violations

        # Check each dependency chapter's summary
        for dep in deps:
            snap = graph.chapter_snapshots.get(dep)
            if not snap or not snap.summary:
                continue

            summary_keywords = CoherenceEngine._tokenize(snap.summary)
            if not summary_keywords:
                continue

            # Calculate keyword overlap
            overlap = expected_keywords & summary_keywords
            overlap_ratio = len(overlap) / max(len(expected_keywords), 1)

            if overlap_ratio < 0.15 and len(snap.summary) > 50:
                violations.append(CoherenceViolation(
                    severity="warning",
                    code="TOPIC_DRIFT",
                    message=f"{dep.upper()} mungkin menyimpang dari topik utama "
                            f"(overlap: {overlap_ratio:.0%}).",
                    suggestion=f"Review {dep.upper()} untuk memastikan masih relevan "
                               f"dengan variabel dan rumusan masalah."
                ))

        return violations

    # ──────────────────────────────────────────────────────────────────────
    # 4. BUILD COHERENCE ENFORCEMENT PROMPT
    # ──────────────────────────────────────────────────────────────────────
    @staticmethod
    def build_enforcement_prompt(graph, target_chapter: str) -> str:
        """
        Build coherence enforcement text to inject into AI prompt.
        Combines entity locks + dependency summaries.
        """
        lines = []
        approved = set(graph.constraints.approved_chapters)

        # Entity locks
        if graph.constraints.locked_variables:
            lines.append("[🔒 ENTITY LOCK — VARIABEL TERKUNCI]")
            for v in graph.constraints.locked_variables:
                lines.append(f"  - {v}")
            lines.append("ATURAN: DILARANG memperkenalkan variabel baru "
                          "yang tidak ada dalam daftar di atas.")
            lines.append("")

        if graph.constraints.locked_methodology:
            lines.append(f"[🔒 METHODOLOGY LOCK: {graph.constraints.locked_methodology}]")
            lines.append("ATURAN: DILARANG mengubah atau mengganti metodologi.")
            lines.append("")

        # Chapter dependency summaries
        deps = CHAPTER_DEPS.get(target_chapter, [])
        if deps:
            has_summaries = False
            for dep in deps:
                snap = graph.chapter_snapshots.get(dep)
                if snap and snap.summary:
                    if not has_summaries:
                        lines.append("[📋 RINGKASAN BAB SEBELUMNYA — WAJIB KONSISTEN]")
                        has_summaries = True
                    lines.append(f"  {dep.upper()}: {snap.summary}")
                    if snap.key_entities_used:
                        lines.append(f"    Entitas: {', '.join(snap.key_entities_used)}")

            if has_summaries:
                lines.append("")
                lines.append("ATURAN: Konten yang dihasilkan HARUS konsisten dengan "
                              "bab-bab sebelumnya di atas.")

        return "\n".join(lines) if lines else ""

    # ──────────────────────────────────────────────────────────────────────
    # 5. FULL COHERENCE CHECK (for validate endpoint)
    # ──────────────────────────────────────────────────────────────────────
    @staticmethod
    def validate(graph, target_chapter: str = "") -> List[CoherenceViolation]:
        """Run all coherence checks"""
        violations = []
        chapter = target_chapter or "bab1"

        violations.extend(CoherenceEngine.check_entity_locks(graph, chapter))
        violations.extend(CoherenceEngine.detect_topic_drift(graph, chapter))

        return violations

    # ──────────────────────────────────────────────────────────────────────
    # HELPERS
    # ──────────────────────────────────────────────────────────────────────
    @staticmethod
    def _tokenize(text: str) -> Set[str]:
        """Simple keyword extraction — lowercase, filter short/common words"""
        if not text:
            return set()

        STOPWORDS = {
            "dan", "atau", "yang", "di", "ke", "dari", "untuk", "pada",
            "dengan", "ini", "itu", "adalah", "dalam", "tidak", "akan",
            "oleh", "dapat", "juga", "sudah", "belum", "ada", "serta",
            "lebih", "antara", "telah", "harus", "setiap", "agar", "bagi",
            "the", "and", "or", "of", "in", "to", "for", "is", "are",
            "a", "an", "be", "was", "were", "been", "has", "have",
            "bagaimana", "apakah", "seberapa", "berapa",
        }

        words = set(re.findall(r'[a-zA-Z]{3,}', text.lower()))
        return words - STOPWORDS
