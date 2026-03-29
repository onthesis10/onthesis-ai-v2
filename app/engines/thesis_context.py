# File: app/engines/thesis_context.py
# Deskripsi: Thesis Context Compiler — compiles the Research Graph into
# rich, structured prompts for each chapter and section.
# This replaces the minimal context passing that existed before.

import logging
from typing import Dict, Any, Optional
from app.engines.research_graph import ResearchGraph
from app.engines.rule_engine import AcademicRuleEngine

logger = logging.getLogger(__name__)


class ThesisContextCompiler:
    """
    Compiles the complete thesis context for AI prompt injection.
    Takes a ResearchGraph and produces structured prompt sections.
    """
    
    @staticmethod
    def compile(graph: ResearchGraph, target_chapter: str, section_type: str = "") -> str:
        """
        Build the complete AI context prompt for a specific chapter/section.
        
        Args:
            graph: The research graph
            target_chapter: e.g. "bab1", "bab2", "bab3", "bab4", "bab5"
            section_type: e.g. "ideal", "factual", "gap", "solution", "rumusan", etc.
        
        Returns:
            Complete context string to inject into system/user prompt
        """
        parts = []
        
        # 1. Full research context (always included)
        full_context = graph.build_full_context_prompt(target_chapter)
        if full_context:
            parts.append(full_context)
        
        # 2. Academic rules (always included)
        rule_prompt = AcademicRuleEngine.build_rule_prompt(graph)
        if rule_prompt:
            parts.append(rule_prompt)
        
        # 3. Chapter-specific constraints
        chapter_constraints = ThesisContextCompiler._build_chapter_constraints(
            graph, target_chapter, section_type
        )
        if chapter_constraints:
            parts.append(chapter_constraints)
        
        # 4. Full Reference Pool (so AI knows what refs exist)
        ref_pool = ThesisContextCompiler._build_reference_pool(graph)
        if ref_pool:
            parts.append(ref_pool)

        # 5. Citation enforcement
        citation_rules = ThesisContextCompiler._build_citation_rules(graph, target_chapter)
        if citation_rules:
            parts.append(citation_rules)
        
        # 6. Cross-Chapter Reference Context
        cross_chapter = ThesisContextCompiler._build_cross_chapter_context(graph, target_chapter)
        if cross_chapter:
            parts.append(cross_chapter)
            
        # 7. Coherence enforcement (entity locks + chapter deps)
        try:
            from app.engines.coherence_engine import CoherenceEngine
            coherence_prompt = CoherenceEngine.build_enforcement_prompt(graph, target_chapter)
            if coherence_prompt:
                parts.append(coherence_prompt)
        except Exception as coh_err:
            logger.warning(f"⚠️ Coherence prompt failed (non-fatal): {coh_err}")
        
        # 7. Data Bridge (Bab 4: inject analysis results)
        if target_chapter == "bab4":
            try:
                from app.engines.data_bridge import DataBridge
                from app import firestore_db
                proj_doc = firestore_db.collection("projects").document(graph.project_id).get()
                if proj_doc.exists:
                    data_prompt = DataBridge.build_prompt(proj_doc.to_dict())
                    if data_prompt:
                        parts.append(data_prompt)
            except Exception as db_err:
                logger.warning(f"⚠️ Data Bridge failed (non-fatal): {db_err}")
                
        # 8. Adaptive Prompt (Academic level & Field of study)
        try:
            from app.engines.adaptive_prompt import build_adaptive_prompt
            adaptive_prompt = build_adaptive_prompt(graph)
            if adaptive_prompt:
                parts.append(adaptive_prompt)
        except Exception as adp_err:
            logger.warning(f"⚠️ Adaptive Prompt failed (non-fatal): {adp_err}")
        
        return "\n\n".join(parts)
    
    @staticmethod
    def _build_reference_pool(graph: ResearchGraph) -> str:
        """Fetch all citations from Firestore and build a formatted pool."""
        try:
            from app import firestore_db
            refs_query = firestore_db.collection("citations").where("projectId", "==", graph.project_id).stream()
            
            ref_lines = []
            for i, doc in enumerate(refs_query, 1):
                data = doc.to_dict()
                author = data.get("author", "Anonim")
                year = data.get("year", "n.d.")
                title = data.get("title", "Tanpa Judul")
                ref_lines.append(f"{i}. {author} ({year}). \"{title}\"")
                
            if not ref_lines:
                return ""
                
            return "[POOL REFERENSI USER]\nIni adalah daftar lengkap referensi yang dimiliki user:\n" + "\n".join(ref_lines)
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to build reference pool: {e}")
            return ""
    
    @staticmethod
    def _build_chapter_constraints(graph: ResearchGraph, chapter: str, section: str) -> str:
        """Build chapter-specific writing constraints"""
        
        if chapter == "bab1":
            return """[ATURAN BAB 1 — PENDAHULUAN]
- Perkenalkan variabel utama: """ + ", ".join(graph.get_variable_names()) + """
- Rumusan masalah harus spesifik dan terukur
- Tujuan harus menjawab setiap rumusan masalah
- Gunakan data/fakta yang kredibel untuk latar belakang"""
        
        elif chapter == "bab2":
            theory_names = [t.name for t in graph.theories]
            var_names = graph.get_variable_names()
            return f"""[ATURAN BAB 2 — KAJIAN PUSTAKA]
- HANYA bahas teori yang relevan dengan variabel: {', '.join(var_names)}
- Teori yang sudah terdaftar: {', '.join(theory_names) if theory_names else 'Belum ada'}
- Setiap variabel WAJIB punya landasan teori
- JANGAN memperkenalkan variabel baru yang tidak ada di Bab 1
- Kerangka berpikir harus menunjukkan hubungan antar variabel
- RAG MODE: THEORY-ONLY — hanya retrieve teori/konsep dari referensi"""

        elif chapter == "bab3":
            methods = graph.constraints.locked_analysis_methods
            return f"""[ATURAN BAB 3 — METODOLOGI]
- Metodologi terkunci: {graph.methodology}
- Teknik analisis: {', '.join(methods) if methods else 'Belum ditentukan'}
- Populasi/Sampel: {graph.population_sample or 'Belum ditentukan'}
- Jelaskan berdasarkan referensi metodologi
- RAG MODE: METHOD-SPECIFIC — hanya retrieve referensi metodologi"""
        
        elif chapter == "bab4":
            return """[ATURAN BAB 4 — HASIL & PEMBAHASAN]
- DILARANG mengarang angka statistik
- Semua angka HARUS dari Data Bridge (fitur Analysis)
- Setiap hipotesis WAJIB diuji dan dilaporkan
- Kaitkan temuan dengan teori di Bab 2
- RAG MODE: CLAIM-GROUNDED — setiap klaim harus ada sumber"""
        
        elif chapter == "bab5":
            rm_texts = [rm.text for rm in graph.rumusan_masalah]
            return f"""[ATURAN BAB 5 — PENUTUP]
- Kesimpulan WAJIB menjawab setiap Rumusan Masalah:
""" + "\n".join([f"  - {rm}" for rm in rm_texts]) + """
- Saran harus praktis dan teoretis
- JANGAN memperkenalkan temuan/data baru
- Rangkum berdasarkan hasil Bab 4"""

        return ""

    @staticmethod
    def _build_citation_rules(graph: ResearchGraph, chapter: str) -> str:
        """Build citation enforcement rules based on chapter"""
        
        if chapter in ["bab1", "bab4", "bab5"]:
            mode = "CLAIM-GROUNDED"
            rule = """Setiap klaim faktual WAJIB disertai sitasi (Author, Year).
Jika tidak ada referensi yang mendukung, tulis: '[BUTUH REFERENSI: topik X]' sebagai penanda.
JANGAN mengarang referensi yang tidak ada di Pool Referensi."""
        elif chapter == "bab2":
            mode = "THEORY-ONLY"
            rule = """Hanya gunakan teori yang relevan dengan variabel terdaftar.
Setiap definisi konsep harus disertai (Author, Year).
JANGAN memperkenalkan teori di luar scope variabel."""
        elif chapter == "bab3":
            mode = "METHOD-SPECIFIC"
            rule = """Jelaskan metode berdasarkan referensi.
Setiap teknik yang disebutkan harus ada sumber."""
        else:
            return ""
        
        return f"""[CITATION ENFORCEMENT — Mode: {mode}]
{rule}"""

    @staticmethod
    def _build_cross_chapter_context(graph: ResearchGraph, chapter: str) -> str:
        """Build context from previous chapters to maintain continuity."""
        parts = []
        snaps = graph.chapter_snapshots
        
        if chapter == "bab2":
            if snaps.get("bab1") and snaps["bab1"].summary:
                parts.append(f"Ringkasan Bab 1:\n{snaps['bab1'].summary}")
                
        elif chapter == "bab3":
            if snaps.get("bab1") and snaps["bab1"].summary:
                parts.append(f"Ringkasan Bab 1:\n{snaps['bab1'].summary}")
            if snaps.get("bab2") and snaps["bab2"].summary:
                parts.append(f"Ringkasan Bab 2 (Teori Utama):\n{snaps['bab2'].summary}")
                
        elif chapter == "bab4":
            # For Bab 4, we need specific RM, Tujuan, and Hipotesis from Bab 1 & 2
            rm_texts = [rm.text for rm in graph.rumusan_masalah]
            if rm_texts:
                parts.append("Rumusan Masalah (Bab 1):\n- " + "\n- ".join(rm_texts))
            
            hyp_texts = [h.statement for h in graph.hypotheses]
            if hyp_texts:
                parts.append("Hipotesis (Bab 2):\n- " + "\n- ".join(hyp_texts))
                
            if snaps.get("bab3") and snaps["bab3"].summary:
                parts.append(f"Ringkasan Metodologi (Bab 3):\n{snaps['bab3'].summary}")
                
        elif chapter == "bab5":
            rm_texts = [rm.text for rm in graph.rumusan_masalah]
            if rm_texts:
                parts.append("Rumusan Masalah (yang harus dijawab):\n- " + "\n- ".join(rm_texts))
            
            if snaps.get("bab4") and snaps["bab4"].summary:
                parts.append(f"Temuan Utama (Bab 4):\n{snaps['bab4'].summary}")
                
        if not parts:
            return ""
            
        return "[CROSS-CHAPTER CONTEXT]\nInformasi dari bab sebelumnya untuk menjaga kesinambungan:\n\n" + "\n\n".join(parts)

    @staticmethod
    def validate_before_generation(graph: ResearchGraph, target_chapter: str) -> Dict[str, Any]:
        """
        Run validation checks before AI generation.
        Returns: {"can_generate": bool, "violations": [...], "warnings": [...]}
        """
        violations = AcademicRuleEngine.validate(graph)
        
        errors = [v.to_dict() for v in violations if v.severity == "error"]
        warnings = [v.to_dict() for v in violations if v.severity == "warning"]
        
        # For bab4, check if analysis data exists
        if target_chapter == "bab4":
            if not graph.analysis_results.hypothesis_tests and not graph.analysis_results.descriptive:
                warnings.append({
                    "severity": "warning",
                    "code": "NO_ANALYSIS_DATA",
                    "message": "Belum ada data analisis dari fitur Analysis.",
                    "suggestion": "Jalankan analisis data di fitur Analysis terlebih dahulu."
                })
        
        return {
            "can_generate": len(errors) == 0,  # Errors block generation, warnings don't
            "errors": errors,
            "warnings": warnings,
        }
