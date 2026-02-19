import re
from typing import Dict, Any, List


class ValidatorEngine:
    """Double-pass validator: structural integrity + academic integrity."""

    TRANSITION_MARKERS = ["oleh karena itu", "selanjutnya", "namun", "di sisi lain", "berdasarkan"]

    def _pass_structure(self, content: str) -> List[str]:
        issues = []
        paragraphs = [p.strip() for p in content.split("\n") if p.strip()]
        if len(paragraphs) < 2:
            issues.append("Struktur terlalu pendek; minimal dua paragraf argumentatif.")
        if not any(marker in content.lower() for marker in self.TRANSITION_MARKERS):
            issues.append("Transisi antar-argumen kurang jelas.")
        if len(content.split()) < 80:
            issues.append("Konten terlalu singkat untuk output akademik.")
        return issues

    def _pass_academic_integrity(self, content: str) -> List[str]:
        issues = []
        lowered = content.lower()
        overconfident_patterns = [r"pasti", r"100%", r"tanpa keraguan", r"mutlak benar"]
        if any(re.search(pattern, lowered) for pattern in overconfident_patterns):
            issues.append("Ditemukan overconfidence language tanpa nuansa epistemik.")

        if re.search(r"\([A-Za-z]+,\s*\d{4}\)", content) and "referensi" not in lowered and "sumber" not in lowered:
            issues.append("Potensi citation hallucination: sitasi ada tanpa konteks sumber eksplisit.")

        unsupported_claim_markers = ["membuktikan bahwa", "telah dipastikan", "jelas menunjukkan"]
        if any(marker in lowered for marker in unsupported_claim_markers) and "data" not in lowered:
            issues.append("Potensi klaim unsupported karena tidak ada indikasi data/bukti.")
        return issues

    def review(self, content: str, requires_validation: bool = True) -> Dict[str, Any]:
        if not requires_validation:
            return {"valid": True, "score": 1.0, "issues": [], "content": content}

        structure_issues = self._pass_structure(content)
        integrity_issues = self._pass_academic_integrity(content)
        issues = structure_issues + integrity_issues

        score = max(0.0, 1.0 - (0.12 * len(issues)))
        return {
            "valid": len(issues) == 0,
            "score": round(score, 3),
            "issues": issues,
            "content": content,
        }
