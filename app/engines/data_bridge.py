# File: app/engines/data_bridge.py
# Deskripsi: Data Bridge + Statistical Integrity Guard.
# Connects Analysis feature results to the Writing feature (Bab 4).
# Ensures AI does not fabricate statistics.

from typing import Dict, Any, List, Optional, Tuple
import re
import logging

logger = logging.getLogger(__name__)


class DataBridge:
    """
    Bridges Analysis feature output → Bab 4 AI prompt.
    1. Loads analysis results from project Firestore document
    2. Formats them as structured prompt injection
    3. Validates generated text against real data (Statistical Guard)
    """

    # ──────────────────────────────────────────────────────────────────────
    # 1. LOAD & FORMAT ANALYSIS DATA FOR PROMPT
    # ──────────────────────────────────────────────────────────────────────
    @staticmethod
    def load_from_project(project_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract analysis results from project Firestore document.
        Returns structured dict with descriptive, hypothesis, tables.
        """
        raw_result = project_data.get("data_analysis_result", {})
        analysis_type = project_data.get("data_analysis_type", "")

        if not raw_result:
            return {}

        return {
            "type": analysis_type,
            "summary_table": raw_result.get("summary_table", []),
            "ai_narrative": raw_result.get("ai_narrative_summary", ""),
            "raw": raw_result,
        }

    @staticmethod
    def build_prompt(project_data: Dict[str, Any]) -> str:
        """
        Build the data injection prompt for Bab 4 generation.
        Pulls analysis results and formats as strict AI context.
        """
        data = DataBridge.load_from_project(project_data)
        if not data:
            return ""

        lines = ["[📊 DATA BRIDGE — HASIL ANALISIS DATA (DARI FITUR ANALYSIS)]"]
        lines.append(f"Jenis Analisis: {data['type'] or 'N/A'}")
        lines.append("")

        # Summary table
        summary = data.get("summary_table", [])
        if summary:
            lines.append("TABEL HASIL:")
            if isinstance(summary, list):
                for i, row in enumerate(summary):
                    if isinstance(row, dict):
                        row_text = " | ".join(
                            f"{k}: {v}" for k, v in row.items()
                        )
                        lines.append(f"  {i+1}. {row_text}")
                    else:
                        lines.append(f"  {i+1}. {row}")
            elif isinstance(summary, dict):
                for k, v in summary.items():
                    lines.append(f"  {k}: {v}")
            lines.append("")

        # AI narrative from analysis
        narrative = data.get("ai_narrative", "")
        if narrative:
            lines.append("INTERPRETASI ANALISIS:")
            lines.append(f"  {narrative[:1000]}")
            lines.append("")

        # Extract all numbers for statistical guard
        all_numbers = DataBridge._extract_numbers_from_data(data.get("raw", {}))
        if all_numbers:
            lines.append(f"ANGKA YANG SAH: {', '.join(str(n) for n in sorted(all_numbers)[:50])}")
            lines.append("")

        lines.append("⚠️ ATURAN KETAT:")
        lines.append("  - SEMUA angka statistik di Bab 4 HARUS berasal dari data di atas.")
        lines.append("  - DILARANG KERAS mengarang angka yang tidak ada dalam data analisis.")
        lines.append("  - Jika data belum lengkap, tulis: '[DATA BELUM TERSEDIA]' sebagai placeholder.")

        return "\n".join(lines)

    # ──────────────────────────────────────────────────────────────────────
    # 2. STATISTICAL INTEGRITY GUARD (Post-Generation)
    # ──────────────────────────────────────────────────────────────────────
    @staticmethod
    def validate_statistics(generated_text: str, project_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Post-generation check: scan generated text for numbers and verify
        they exist in the actual analysis results.
        
        Returns: {
            "verified": [...], 
            "suspicious": [...],
            "integrity_score": float
        }
        """
        data = DataBridge.load_from_project(project_data)
        if not data or not generated_text:
            return {"verified": [], "suspicious": [], "integrity_score": 1.0}

        # Get valid numbers from analysis data
        valid_numbers = DataBridge._extract_numbers_from_data(data.get("raw", {}))

        # Get numbers from generated text
        text_numbers = DataBridge._extract_numbers_from_text(generated_text)

        verified = []
        suspicious = []

        for num, context in text_numbers:
            if num in valid_numbers or DataBridge._is_common_number(num):
                verified.append({"number": num, "context": context, "status": "verified"})
            else:
                suspicious.append({
                    "number": num,
                    "context": context,
                    "status": "suspicious",
                    "message": f"Angka {num} tidak ditemukan di data analisis."
                })

        total = len(verified) + len(suspicious)
        score = len(verified) / max(total, 1)

        return {
            "verified": verified,
            "suspicious": suspicious,
            "integrity_score": round(score, 2),
        }

    # ──────────────────────────────────────────────────────────────────────
    # HELPERS
    # ──────────────────────────────────────────────────────────────────────
    @staticmethod
    def _extract_numbers_from_data(data: Any, depth: int = 0) -> set:
        """Recursively extract all numeric values from analysis result"""
        numbers = set()
        if depth > 10:
            return numbers

        if isinstance(data, (int, float)):
            numbers.add(round(data, 4) if isinstance(data, float) else data)
        elif isinstance(data, str):
            for match in re.findall(r'-?\d+\.?\d*', data):
                try:
                    num = float(match)
                    numbers.add(round(num, 4))
                except ValueError:
                    pass
        elif isinstance(data, dict):
            for v in data.values():
                numbers |= DataBridge._extract_numbers_from_data(v, depth + 1)
        elif isinstance(data, list):
            for item in data:
                numbers |= DataBridge._extract_numbers_from_data(item, depth + 1)

        return numbers

    @staticmethod
    def _extract_numbers_from_text(text: str) -> List[Tuple[float, str]]:
        """Extract numbers with surrounding context from generated text"""
        results = []
        # Match decimal numbers like 3.82, 0.001, 67.5, etc.
        for match in re.finditer(r'(\d+\.\d+)', text):
            num = round(float(match.group(1)), 4)
            start = max(0, match.start() - 30)
            end = min(len(text), match.end() + 30)
            context = text[start:end].strip()
            results.append((num, context))
        return results

    @staticmethod
    def _is_common_number(num: float) -> bool:
        """Numbers that are commonly used and don't need verification"""
        common = {0.0, 0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 100.0, 95.0}
        return num in common
