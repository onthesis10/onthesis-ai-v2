# File: app/engines/research_graph.py
# Deskripsi: Structured Research Graph — the "brain" of the thesis.
# Manages entities (variables, theories, hypotheses), relations, constraints,
# and chapter snapshots as a unified graph structure.

from typing import Dict, List, Optional, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime
import logging
import json

logger = logging.getLogger(__name__)


# ==============================================================================
# ENTITIES: Building blocks of the research
# ==============================================================================

class Variable(BaseModel):
    """A research variable (independent, dependent, moderating, etc.)"""
    id: str
    name: str
    type: Literal["independent", "dependent", "moderating", "control", "intervening"]
    indicators: List[str] = Field(default_factory=list)
    operational_definition: str = ""
    supporting_theories: List[str] = Field(default_factory=list)    # IDs of Theory entities
    supporting_refs: List[str] = Field(default_factory=list)        # IDs of Reference entries
    mentioned_in_chapters: List[str] = Field(default_factory=list)  # e.g. ["bab1", "bab2"]
    measurement_scale: Optional[str] = None  # "likert", "ordinal", "interval", "ratio"


class Theory(BaseModel):
    """A theoretical framework supporting the research"""
    id: str
    name: str
    author: str = ""
    year: Optional[int] = None
    description: str = ""
    explains_variables: List[str] = Field(default_factory=list)  # Variable IDs
    source_refs: List[str] = Field(default_factory=list)         # Reference IDs
    key_concepts: List[str] = Field(default_factory=list)


class RumusanMasalah(BaseModel):
    """A research question / problem statement"""
    id: str  # e.g. "RM-1"
    text: str
    maps_to_tujuan: Optional[str] = None      # Tujuan ID
    maps_to_hypothesis: Optional[str] = None  # Hypothesis ID
    question_type: Literal["deskriptif", "komparatif", "asosiatif", "kausal"] = "asosiatif"


class Tujuan(BaseModel):
    """A research objective, directly maps to a Rumusan Masalah"""
    id: str  # e.g. "T-1"
    text: str
    maps_to_rumusan: Optional[str] = None


class Hypothesis(BaseModel):
    """A research hypothesis"""
    id: str  # e.g. "H1"
    statement: str
    maps_to_rumusan: Optional[str] = None
    variables_involved: List[str] = Field(default_factory=list)  # Variable IDs
    analysis_method: Optional[str] = None  # e.g. "regresi_linear", "t_test"
    test_result: Optional[Dict[str, Any]] = None  # Filled from Data Bridge


# ==============================================================================
# RELATIONS: How entities connect
# ==============================================================================

class Relation(BaseModel):
    """Directed relationship between two entities"""
    from_id: str
    to_id: str
    relation_type: Literal[
        "rumusan_to_tujuan",
        "hypothesis_to_rumusan",
        "independent_to_dependent",
        "theory_to_variable",
        "variable_to_indicator",
        "method_to_analysis",
        "ref_to_theory"
    ]
    metadata: Dict[str, Any] = Field(default_factory=dict)


# ==============================================================================
# CONSTRAINTS: Locked entities after chapter approval
# ==============================================================================

class ResearchConstraints(BaseModel):
    """Locked entities that cannot change after certain chapters are approved"""
    locked_variables: List[str] = Field(default_factory=list)       # Variable names
    locked_methodology: Optional[str] = None                         # "quantitative", "qualitative", "mixed"
    locked_analysis_methods: List[str] = Field(default_factory=list) # e.g. ["regresi_linear", "deskriptif"]
    required_sample_size: Optional[int] = None
    citation_style: str = "apa"  # "apa", "harvard", "ieee"
    
    # Which chapters have been approved (locked for editing)
    approved_chapters: List[str] = Field(default_factory=list)  # e.g. ["bab1", "bab2"]


# ==============================================================================
# CHAPTER SNAPSHOT: Summary of written content per chapter
# ==============================================================================

class ChapterSnapshot(BaseModel):
    """Snapshot of a chapter's content for cross-chapter coherence"""
    chapter_id: str  # e.g. "bab1", "bab2"
    status: Literal["empty", "draft", "in_progress", "near_complete", "review", "approved"] = "empty"
    summary: str = ""  # Auto-generated 1-paragraph summary
    key_entities_used: List[str] = Field(default_factory=list)  # Entity IDs used in this chapter
    theories_referenced: List[str] = Field(default_factory=list)  # Theory IDs
    word_count: int = 0
    last_updated: Optional[str] = None
    

# ==============================================================================
# ANALYSIS RESULTS: Bridge from Analysis feature
# ==============================================================================

class AnalysisResults(BaseModel):
    """Structured data from the Analysis feature (Data Bridge)"""
    descriptive: Dict[str, Any] = Field(default_factory=dict)
    hypothesis_tests: List[Dict[str, Any]] = Field(default_factory=list)
    tables: List[Dict[str, Any]] = Field(default_factory=list)
    methodology_used: Optional[str] = None
    sample_size: Optional[int] = None
    raw_json: Dict[str, Any] = Field(default_factory=dict)


# ==============================================================================
# THE RESEARCH GRAPH: Complete thesis state
# ==============================================================================

class ResearchGraph(BaseModel):
    """
    The complete Structured Research Graph.
    This is the 'brain' of the thesis — every layer reads from this.
    """
    project_id: str
    user_id: str
    
    # === METADATA ===
    title: str = ""
    field_of_study: str = ""
    academic_level: Literal["S1", "S2", "S3"] = "S1"
    methodology: Literal["quantitative", "qualitative", "mixed", ""] = ""
    population_sample: str = ""
    
    # === ENTITIES ===
    variables: List[Variable] = Field(default_factory=list)
    theories: List[Theory] = Field(default_factory=list)
    rumusan_masalah: List[RumusanMasalah] = Field(default_factory=list)
    tujuan: List[Tujuan] = Field(default_factory=list)
    hypotheses: List[Hypothesis] = Field(default_factory=list)
    
    # === RELATIONS ===
    relations: List[Relation] = Field(default_factory=list)
    
    # === CONSTRAINTS ===
    constraints: ResearchConstraints = Field(default_factory=ResearchConstraints)
    
    # === CHAPTER SNAPSHOTS ===
    chapter_snapshots: Dict[str, ChapterSnapshot] = Field(default_factory=lambda: {
        "bab1": ChapterSnapshot(chapter_id="bab1"),
        "bab2": ChapterSnapshot(chapter_id="bab2"),
        "bab3": ChapterSnapshot(chapter_id="bab3"),
        "bab4": ChapterSnapshot(chapter_id="bab4"),
        "bab5": ChapterSnapshot(chapter_id="bab5"),
    })
    
    # === ANALYSIS DATA (from Data Bridge) ===
    analysis_results: AnalysisResults = Field(default_factory=AnalysisResults)
    
    # === REFERENCES POOL ===
    references: List[Dict[str, Any]] = Field(default_factory=list)
    
    # === TIMESTAMPS ===
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

    # ==========================================================================
    # HELPER METHODS
    # ==========================================================================
    
    def get_variable_by_id(self, var_id: str) -> Optional[Variable]:
        return next((v for v in self.variables if v.id == var_id), None)
    
    def get_variable_names(self) -> List[str]:
        return [v.name for v in self.variables]
    
    def get_theory_by_id(self, theory_id: str) -> Optional[Theory]:
        return next((t for t in self.theories if t.id == theory_id), None)
    
    def get_locked_variable_names(self) -> List[str]:
        return self.constraints.locked_variables
    
    def is_chapter_approved(self, chapter_id: str) -> bool:
        return chapter_id in self.constraints.approved_chapters
    
    def get_chapter_summary(self, chapter_id: str) -> str:
        snap = self.chapter_snapshots.get(chapter_id)
        return snap.summary if snap else ""
    
    def get_dependent_chapters(self, target_chapter: str) -> List[str]:
        """Get chapters that the target chapter depends on"""
        CHAPTER_DEPS = {
            "bab1": [],
            "bab2": ["bab1"],
            "bab3": ["bab1", "bab2"],
            "bab4": ["bab1", "bab2", "bab3"],
            "bab5": ["bab1", "bab4"],
        }
        return CHAPTER_DEPS.get(target_chapter, [])
    
    def build_coherence_prompt(self, target_chapter: str) -> str:
        """Build coherence constraints for AI prompt based on chapter dependencies"""
        deps = self.get_dependent_chapters(target_chapter)
        if not deps:
            return ""
        
        lines = ["COHERENCE CONSTRAINTS (WAJIB DIPATUHI):"]
        for dep in deps:
            snap = self.chapter_snapshots.get(dep)
            if snap and snap.summary:
                lines.append(f"- {dep.upper()}: {snap.summary}")
                if snap.key_entities_used:
                    lines.append(f"  Entities: {', '.join(snap.key_entities_used)}")
        
        # Add locked variables
        if self.constraints.locked_variables:
            lines.append(f"\nVARIABEL TERKUNCI (JANGAN PERKENALKAN VARIABEL BARU):")
            for vname in self.constraints.locked_variables:
                lines.append(f"  - {vname}")
        
        # Add locked methodology
        if self.constraints.locked_methodology:
            lines.append(f"\nMETODOLOGI TERKUNCI: {self.constraints.locked_methodology}")
        
        lines.append("\nATURAN: JANGAN memperkenalkan entitas (variabel, teori, metode) yang tidak ada dalam daftar di atas.")
        
        return "\n".join(lines)
    
    def build_full_context_prompt(self, target_chapter: str) -> str:
        """Build the complete thesis context for AI prompt injection"""
        parts = []
        
        # 1. Research Metadata
        parts.append(f"""[METADATA PENELITIAN]
Judul: {self.title}
Bidang: {self.field_of_study}
Level: {self.academic_level}
Metodologi: {self.methodology}
Populasi/Sampel: {self.population_sample}""")
        
        # 2. Variables
        if self.variables:
            var_lines = ["[VARIABEL PENELITIAN]"]
            for v in self.variables:
                indicators_str = ", ".join(v.indicators) if v.indicators else "-"
                var_lines.append(f"  - {v.name} ({v.type}): Indikator=[{indicators_str}]")
            parts.append("\n".join(var_lines))
        
        # 3. Rumusan Masalah
        if self.rumusan_masalah:
            rm_lines = ["[RUMUSAN MASALAH]"]
            for rm in self.rumusan_masalah:
                rm_lines.append(f"  {rm.id}: {rm.text}")
            parts.append("\n".join(rm_lines))
        
        # 4. Hypotheses
        if self.hypotheses:
            h_lines = ["[HIPOTESIS]"]
            for h in self.hypotheses:
                h_lines.append(f"  {h.id}: {h.statement}")
            parts.append("\n".join(h_lines))
        
        # 5. Theories
        if self.theories:
            t_lines = ["[KERANGKA TEORI]"]
            for t in self.theories:
                t_lines.append(f"  - {t.name} ({t.author}, {t.year}): {t.description[:150]}")
            parts.append("\n".join(t_lines))
        
        # 6. Coherence from previous chapters
        coherence = self.build_coherence_prompt(target_chapter)
        if coherence:
            parts.append(coherence)
        
        # 7. Analysis results (for Bab 4)
        if target_chapter in ["bab4", "bab5"] and self.analysis_results.hypothesis_tests:
            data_lines = ["[DATA ANALISIS (dari fitur Analysis)]"]
            if self.analysis_results.descriptive:
                data_lines.append(f"  Deskriptif: {json.dumps(self.analysis_results.descriptive, ensure_ascii=False)[:500]}")
            for ht in self.analysis_results.hypothesis_tests:
                data_lines.append(f"  Uji: {ht.get('test', '-')} → p={ht.get('p_value', '-')}, hasil={ht.get('conclusion', '-')}")
            data_lines.append("  ATURAN: JANGAN mengarang angka statistik. Gunakan HANYA data di atas.")
            parts.append("\n".join(data_lines))
        
        # 8. References
        if self.references:
            ref_lines = ["[POOL REFERENSI]"]
            for i, ref in enumerate(self.references[:15], 1):
                author = ref.get("author", "Anonim")
                year = ref.get("year", "n.d.")
                title = ref.get("title", "Tanpa Judul")
                ref_lines.append(f"  [{i}] {author} ({year}). {title}")
            parts.append("\n".join(ref_lines))
        
        return "\n\n".join(parts)

    def to_firestore_dict(self) -> Dict[str, Any]:
        """Serialize to Firestore-safe dictionary"""
        data = self.model_dump()
        # Convert chapter_snapshots dict for Firestore compatibility
        data["updated_at"] = datetime.utcnow().isoformat()
        return data
    
    @classmethod
    def from_firestore_dict(cls, data: Dict[str, Any]) -> "ResearchGraph":
        """Deserialize from Firestore dictionary"""
        if not data:
            return cls(project_id="", user_id="")
        return cls(**data)

    @classmethod
    def build_from_project(cls, project_data: Dict[str, Any], project_id: str, user_id: str) -> "ResearchGraph":
        """
        Build a ResearchGraph from existing project data in Firestore.
        This bridges the gap between old project format and new graph format.
        """
        graph = cls(
            project_id=project_id,
            user_id=user_id,
            title=project_data.get("title", ""),
            field_of_study=project_data.get("field_of_study", ""),
            academic_level=project_data.get("academic_level", "S1"),
            methodology=project_data.get("methodology", ""),
            population_sample=project_data.get("population_sample", ""),
        )
        
        # Parse variables from string if needed
        variables_raw = project_data.get("variables_indicators", project_data.get("variables", ""))
        if isinstance(variables_raw, str) and variables_raw.strip():
            # Try to parse structured variables
            lines = [l.strip() for l in variables_raw.split("\n") if l.strip()]
            for i, line in enumerate(lines, 1):
                var_type = "independent" if i == 1 else "dependent"
                graph.variables.append(Variable(
                    id=f"var-{i}",
                    name=line.strip("- "),
                    type=var_type,
                ))
        elif isinstance(variables_raw, list):
            for i, v in enumerate(variables_raw, 1):
                if isinstance(v, dict):
                    graph.variables.append(Variable(
                        id=v.get("id", f"var-{i}"),
                        name=v.get("name", f"Variable {i}"),
                        type=v.get("type", "independent"),
                        indicators=v.get("indicators", []),
                    ))
                elif isinstance(v, str):
                    graph.variables.append(Variable(
                        id=f"var-{i}", name=v, type="independent"
                    ))
        
        # Parse problem statements
        problem_raw = project_data.get("problem_statement", "")
        if problem_raw:
            # Split by numbered lists or newlines
            import re
            questions = re.split(r'\d+[\.\)]\s*', problem_raw)
            questions = [q.strip() for q in questions if q.strip()]
            for i, q in enumerate(questions, 1):
                graph.rumusan_masalah.append(RumusanMasalah(
                    id=f"RM-{i}",
                    text=q,
                    maps_to_tujuan=f"T-{i}",
                    maps_to_hypothesis=f"H{i}",
                ))
        
        # Parse hypothesis
        hypothesis_raw = project_data.get("hypothesis", "")
        if hypothesis_raw:
            import re
            hyps = re.split(r'[Hh]\d+[\.\:\)]\s*', hypothesis_raw)
            hyps = [h.strip() for h in hyps if h.strip()]
            for i, h in enumerate(hyps, 1):
                graph.hypotheses.append(Hypothesis(
                    id=f"H{i}",
                    statement=h,
                    maps_to_rumusan=f"RM-{i}",
                ))
        
        # Parse theoretical framework
        framework_raw = project_data.get("theoretical_framework", "")
        if framework_raw:
            graph.theories.append(Theory(
                id="theory-1",
                name="Kerangka Teori",
                description=framework_raw[:500],
            ))
        
        # Load references
        refs = project_data.get("references", [])
        if isinstance(refs, list):
            graph.references = refs
        
        # Lock constraints based on methodology
        if graph.methodology:
            graph.constraints.locked_methodology = graph.methodology
        if graph.variables:
            graph.constraints.locked_variables = [v.name for v in graph.variables]
        
        return graph
