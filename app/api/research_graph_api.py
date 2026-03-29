# File: app/api/research_graph_api.py
# Deskripsi: CRUD API for the Research Graph.
# Endpoints for managing the thesis brain from the frontend.

from __future__ import annotations

import logging
import json
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from firebase_admin import firestore as fb_firestore

from app import firestore_db
from app.engines.rule_engine import AcademicRuleEngine
from app.engines.thesis_context import ThesisContextCompiler

logger = logging.getLogger(__name__)

research_graph_bp = Blueprint('research_graph', __name__)

# ==============================================================================
# COLLECTION NAME
# ==============================================================================
GRAPH_COLLECTION = "research_graphs"


def _graph_models():
    from app.engines.research_graph import (
        ResearchGraph,
        Variable,
        Theory,
        RumusanMasalah,
        Tujuan,
        Hypothesis,
        ChapterSnapshot,
    )

    return {
        "ResearchGraph": ResearchGraph,
        "Variable": Variable,
        "Theory": Theory,
        "RumusanMasalah": RumusanMasalah,
        "Tujuan": Tujuan,
        "Hypothesis": Hypothesis,
        "ChapterSnapshot": ChapterSnapshot,
    }


# ==============================================================================
# HELPER: Get or Create Graph
# ==============================================================================
def _get_or_create_graph(project_id: str, user_id: str) -> ResearchGraph:
    """
    Get Research Graph, always re-synced from current project settings.
    Preserves manually-added graph data (chapter snapshots, theories via API).
    """
    ResearchGraph = _graph_models()["ResearchGraph"]
    doc_ref = firestore_db.collection(GRAPH_COLLECTION).document(project_id)
    doc = doc_ref.get()
    
    # Load existing graph (for preserving manual edits)
    existing_graph = None
    if doc.exists:
        data = doc.to_dict()
        if data.get("user_id") == user_id:
            existing_graph = ResearchGraph.from_firestore_dict(data)
    
    # Always rebuild from latest project settings
    proj_ref = firestore_db.collection("projects").document(project_id)
    proj_doc = proj_ref.get()
    
    if proj_doc.exists:
        proj_data = proj_doc.to_dict()
        if proj_data.get("userId") == user_id:
            fresh_graph = ResearchGraph.build_from_project(proj_data, project_id, user_id)
            
            # Merge: keep chapter snapshots & theories from existing graph
            if existing_graph:
                # Preserve chapter snapshots (user progress)
                for ch_id, snapshot in existing_graph.chapter_snapshots.items():
                    if snapshot.status != "empty":
                        fresh_graph.chapter_snapshots[ch_id] = snapshot
                
                # Preserve manually-added theories not in fresh build
                fresh_theory_names = {t.name.lower() for t in fresh_graph.theories}
                for theory in existing_graph.theories:
                    if theory.name.lower() not in fresh_theory_names:
                        fresh_graph.theories.append(theory)
            
            # Save the re-synced graph
            doc_ref.set(fresh_graph.to_firestore_dict())
            logger.info(f"🔄 Research Graph re-synced for project {project_id}")
            return fresh_graph
    
    # Fallback: return existing or empty
    if existing_graph:
        return existing_graph
    return ResearchGraph(project_id=project_id, user_id=user_id)


def _save_graph(graph: ResearchGraph):
    """Save Research Graph to Firestore"""
    doc_ref = firestore_db.collection(GRAPH_COLLECTION).document(graph.project_id)
    doc_ref.set(graph.to_firestore_dict())


# ==============================================================================
# API ENDPOINTS
# ==============================================================================

@research_graph_bp.route('/graph/<project_id>', methods=['GET'])
@login_required
def get_graph(project_id):
    """Get the Research Graph for a project"""
    try:
        graph = _get_or_create_graph(project_id, str(current_user.id))
        return jsonify({
            "status": "success",
            "graph": graph.to_firestore_dict()
        })
    except Exception as e:
        logger.error(f"Get Graph Error: {e}")
        return jsonify({"error": str(e)}), 500


@research_graph_bp.route('/graph/<project_id>', methods=['PUT'])
@login_required
def update_graph(project_id):
    """Update the full Research Graph"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data"}), 400
        
        # Load existing graph to verify ownership
        graph = _get_or_create_graph(project_id, str(current_user.id))
        if graph.user_id != str(current_user.id):
            return jsonify({"error": "Unauthorized"}), 403
        
        # Merge updates
        for key, value in data.items():
            if hasattr(graph, key) and key not in ("project_id", "user_id", "created_at"):
                setattr(graph, key, value)
        
        _save_graph(graph)
        
        return jsonify({"status": "success"})
    except Exception as e:
        logger.error(f"Update Graph Error: {e}")
        return jsonify({"error": str(e)}), 500


@research_graph_bp.route('/graph/<project_id>/variables', methods=['POST'])
@login_required
def add_variable(project_id):
    """Add or update a variable in the Research Graph"""
    try:
        Variable = _graph_models()["Variable"]
        data = request.get_json()
        graph = _get_or_create_graph(project_id, str(current_user.id))
        
        variable = Variable(**data)
        
        # Check if variable already exists (update) or is new (add)
        existing_idx = next(
            (i for i, v in enumerate(graph.variables) if v.id == variable.id),
            None
        )
        
        if existing_idx is not None:
            graph.variables[existing_idx] = variable
        else:
            graph.variables.append(variable)
        
        # Auto-lock variables
        graph.constraints.locked_variables = [v.name for v in graph.variables]
        
        _save_graph(graph)
        
        return jsonify({"status": "success", "variable": variable.model_dump()})
    except Exception as e:
        logger.error(f"Add Variable Error: {e}")
        return jsonify({"error": str(e)}), 500


@research_graph_bp.route('/graph/<project_id>/variables/<var_id>', methods=['DELETE'])
@login_required
def delete_variable(project_id, var_id):
    """Remove a variable from the Research Graph"""
    try:
        graph = _get_or_create_graph(project_id, str(current_user.id))
        graph.variables = [v for v in graph.variables if v.id != var_id]
        graph.constraints.locked_variables = [v.name for v in graph.variables]
        _save_graph(graph)
        
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@research_graph_bp.route('/graph/<project_id>/hypotheses', methods=['POST'])
@login_required
def add_hypothesis(project_id):
    """Add or update a hypothesis"""
    try:
        Hypothesis = _graph_models()["Hypothesis"]
        data = request.get_json()
        graph = _get_or_create_graph(project_id, str(current_user.id))
        
        hypothesis = Hypothesis(**data)
        
        existing_idx = next(
            (i for i, h in enumerate(graph.hypotheses) if h.id == hypothesis.id),
            None
        )
        
        if existing_idx is not None:
            graph.hypotheses[existing_idx] = hypothesis
        else:
            graph.hypotheses.append(hypothesis)
        
        _save_graph(graph)
        
        return jsonify({"status": "success", "hypothesis": hypothesis.model_dump()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@research_graph_bp.route('/graph/<project_id>/theories', methods=['POST'])
@login_required
def add_theory(project_id):
    """Add or update a theory"""
    try:
        Theory = _graph_models()["Theory"]
        data = request.get_json()
        graph = _get_or_create_graph(project_id, str(current_user.id))
        
        theory = Theory(**data)
        
        existing_idx = next(
            (i for i, t in enumerate(graph.theories) if t.id == theory.id),
            None
        )
        
        if existing_idx is not None:
            graph.theories[existing_idx] = theory
        else:
            graph.theories.append(theory)
        
        _save_graph(graph)
        
        return jsonify({"status": "success", "theory": theory.model_dump()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@research_graph_bp.route('/graph/<project_id>/chapters/<chapter_id>/snapshot', methods=['PUT'])
@login_required
def update_chapter_snapshot(project_id, chapter_id):
    """Update a chapter's snapshot (summary, status, word count)"""
    try:
        ChapterSnapshot = _graph_models()["ChapterSnapshot"]
        data = request.get_json()
        graph = _get_or_create_graph(project_id, str(current_user.id))
        
        if chapter_id not in graph.chapter_snapshots:
            graph.chapter_snapshots[chapter_id] = ChapterSnapshot(chapter_id=chapter_id)
        
        snapshot = graph.chapter_snapshots[chapter_id]
        
        if "summary" in data:
            snapshot.summary = data["summary"]
        if "status" in data:
            snapshot.status = data["status"]
        if "word_count" in data:
            snapshot.word_count = data["word_count"]
        if "key_entities_used" in data:
            snapshot.key_entities_used = data["key_entities_used"]
        if "theories_referenced" in data:
            snapshot.theories_referenced = data["theories_referenced"]
        
        from datetime import datetime
        snapshot.last_updated = datetime.utcnow().isoformat()
        
        # If chapter is approved, apply coherence locks
        if snapshot.status == "approved":
            try:
                from app.engines.coherence_engine import CoherenceEngine
                CoherenceEngine.apply_locks_on_approval(graph, chapter_id)
            except Exception as lock_err:
                logger.warning(f"⚠️ Coherence lock failed: {lock_err}")
        
        _save_graph(graph)
        
        return jsonify({"status": "success", "snapshot": snapshot.model_dump()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@research_graph_bp.route('/graph/<project_id>/validate', methods=['GET'])
@login_required
def validate_graph(project_id):
    """Run validation checks on the Research Graph"""
    try:
        chapter = request.args.get("chapter", "")
        graph = _get_or_create_graph(project_id, str(current_user.id))
        
        if chapter:
            result = ThesisContextCompiler.validate_before_generation(graph, chapter)
        else:
            violations = AcademicRuleEngine.validate(graph)
            result = {
                "errors": [v.to_dict() for v in violations if v.severity == "error"],
                "warnings": [v.to_dict() for v in violations if v.severity == "warning"],
                "info": [v.to_dict() for v in violations if v.severity == "info"],
            }
        
        # Merge Consistency Validator results (non-fatal)
        try:
            from app.engines.consistency_validator import ResearchConsistencyValidator
            consistency_violations = ResearchConsistencyValidator.validate(graph, chapter)
            result.setdefault("errors", []).extend(
                [v.to_dict() for v in consistency_violations if v.severity == "error"]
            )
            result.setdefault("warnings", []).extend(
                [v.to_dict() for v in consistency_violations if v.severity == "warning"]
            )
            result.setdefault("info", []).extend(
                [v.to_dict() for v in consistency_violations if v.severity == "info"]
            )
        except Exception as cv_err:
            import traceback
            logger.error(f"⚠️ Consistency Validator error: {cv_err}\n{traceback.format_exc()}")
        
        # Merge Coherence Engine results (non-fatal)
        try:
            from app.engines.coherence_engine import CoherenceEngine
            coherence_violations = CoherenceEngine.validate(graph, chapter)
            result.setdefault("errors", []).extend(
                [v.to_dict() for v in coherence_violations if v.severity == "error"]
            )
            result.setdefault("warnings", []).extend(
                [v.to_dict() for v in coherence_violations if v.severity == "warning"]
            )
            result.setdefault("info", []).extend(
                [v.to_dict() for v in coherence_violations if v.severity == "info"]
            )
        except Exception as coh_err:
            import traceback
            logger.error(f"⚠️ Coherence Engine error: {coh_err}\n{traceback.format_exc()}")
        
        return jsonify({"status": "success", **result})
    except Exception as e:
        import traceback
        logger.error(f"❌ Validate graph error: {e}\n{traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500


@research_graph_bp.route('/graph/<project_id>/validate-stats', methods=['POST'])
@login_required
def validate_statistics(project_id):
    """Post-generation: check if statistics in generated text match analysis data"""
    try:
        data = request.get_json() or {}
        generated_text = data.get("text", "")
        if not generated_text:
            return jsonify({"error": "No text provided"}), 400

        proj_ref = firestore_db.collection("projects").document(project_id)
        proj_doc = proj_ref.get()
        if not proj_doc.exists:
            return jsonify({"error": "Project not found"}), 404

        from app.engines.data_bridge import DataBridge
        result = DataBridge.validate_statistics(generated_text, proj_doc.to_dict())
        return jsonify({"status": "success", **result})
    except Exception as e:
        import traceback
        logger.error(f"❌ Stat validation error: {e}\n{traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500


@research_graph_bp.route('/graph/<project_id>/context/<chapter_id>', methods=['GET'])
@login_required
def get_compiled_context(project_id, chapter_id):
    """Get the compiled AI context for a specific chapter (for debugging/preview)"""
    try:
        section_type = request.args.get("section", "")
        graph = _get_or_create_graph(project_id, str(current_user.id))
        
        compiled = ThesisContextCompiler.compile(graph, chapter_id, section_type)
        
        return jsonify({
            "status": "success",
            "context": compiled,
            "variables": graph.get_variable_names(),
            "methodology": graph.methodology,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@research_graph_bp.route('/graph/<project_id>/sync', methods=['POST'])
@login_required
def sync_from_project(project_id):
    """Re-sync the Research Graph from current project data"""
    try:
        models = _graph_models()
        ResearchGraph = models["ResearchGraph"]
        proj_ref = firestore_db.collection("projects").document(project_id)
        proj_doc = proj_ref.get()
        
        if not proj_doc.exists:
            return jsonify({"error": "Project not found"}), 404
        
        proj_data = proj_doc.to_dict()
        if proj_data.get("userId") != str(current_user.id):
            return jsonify({"error": "Unauthorized"}), 403
        
        # Also load references
        refs_query = firestore_db.collection("citations")\
            .where("projectId", "==", project_id).stream()
        
        references = []
        for ref_doc in refs_query:
            ref_data = ref_doc.to_dict()
            ref_data["id"] = ref_doc.id
            references.append(ref_data)
        
        proj_data["references"] = references
        
        # Rebuild graph
        graph = ResearchGraph.build_from_project(proj_data, project_id, str(current_user.id))
        
        # Preserve existing chapter snapshots if any
        existing_ref = firestore_db.collection(GRAPH_COLLECTION).document(project_id)
        existing_doc = existing_ref.get()
        if existing_doc.exists:
            existing_data = existing_doc.to_dict()
            existing_graph = ResearchGraph.from_firestore_dict(existing_data)
            # Merge snapshots (keep existing if they have content)
            for ch_id, snap in existing_graph.chapter_snapshots.items():
                if snap.summary and ch_id in graph.chapter_snapshots:
                    graph.chapter_snapshots[ch_id] = snap
        
        _save_graph(graph)
        
        return jsonify({
            "status": "success",
            "message": "Research Graph synced from project data",
            "graph": graph.to_firestore_dict()
        })
    except Exception as e:
        logger.error(f"Sync Graph Error: {e}")
        return jsonify({"error": str(e)}), 500


# ==============================================================================
# CHAPTER SNAPSHOT AUTO-GENERATION
# ==============================================================================

@research_graph_bp.route('/graph/<project_id>/chapters/<chapter_id>/auto-snapshot', methods=['POST'])
@login_required
def auto_generate_snapshot(project_id, chapter_id):
    """
    Auto-generate a chapter snapshot from the written content.
    Uses AI to summarize the chapter sections into a concise snapshot.
    Called by frontend when user saves or finishes a chapter.
    """
    try:
        ChapterSnapshot = _graph_models()["ChapterSnapshot"]
        data = request.get_json() or {}
        # sections_content: dict of {section_key: html_content}
        sections_content = data.get("sections", {})
        
        if not sections_content:
            return jsonify({"error": "No sections content provided"}), 400
        
        graph = _get_or_create_graph(project_id, str(current_user.id))
        
        # Build a text summary from all sections
        combined_text = ""
        word_count = 0
        entity_names = []
        
        for key, content in sections_content.items():
            if content and isinstance(content, str):
                # Strip HTML tags for word counting
                import re
                clean = re.sub(r'<[^>]+>', '', content)
                word_count += len(clean.split())
                combined_text += f"\n[{key}]: {clean[:500]}\n"
                
                # Detect entity names used
                for var in graph.variables:
                    if var.name.lower() in clean.lower():
                        entity_names.append(var.name)
        
        # Generate AI summary if content is substantial
        summary = ""
        if word_count > 50:
            try:
                from app.utils.ai_utils import safe_completion as completion
                from app.utils.ai_utils import get_smart_model
                
                model = get_smart_model("light")
                
                response = completion(
                    model=model,
                    messages=[
                        {"role": "system", "content": (
                            "You are a thesis writing assistant. "
                            "Summarize the following chapter content in 2-3 sentences in Indonesian. "
                            "Focus on: main arguments, theories used, and key findings/methods. "
                            "Be concise and factual."
                        )},
                        {"role": "user", "content": combined_text[:3000]}
                    ],
                    max_tokens=200,
                    temperature=0.3,
                )
                summary = response.choices[0].message.content.strip()
            except Exception as e:
                logger.warning(f"AI snapshot failed, using fallback: {e}")
                # Fallback: first 200 chars of combined text
                summary = combined_text[:200].strip() + "..."
        else:
            summary = combined_text[:200].strip()
        
        # Determine status based on word count
        status = "draft"
        if word_count > 1000:
            status = "in_progress"
        if word_count > 3000:
            status = "near_complete"
        
        # Detect theories referenced
        theories_used = []
        for theory in graph.theories:
            for content in sections_content.values():
                if content and theory.name.lower() in str(content).lower():
                    theories_used.append(theory.name)
                    break
        
        # Update snapshot
        if chapter_id not in graph.chapter_snapshots:
            graph.chapter_snapshots[chapter_id] = ChapterSnapshot(chapter_id=chapter_id)
        
        snapshot = graph.chapter_snapshots[chapter_id]
        snapshot.summary = summary
        snapshot.status = status
        snapshot.word_count = word_count
        snapshot.key_entities_used = list(set(entity_names))
        snapshot.theories_referenced = list(set(theories_used))
        
        from datetime import datetime
        snapshot.last_updated = datetime.utcnow().isoformat()
        
        _save_graph(graph)
        
        return jsonify({
            "status": "success",
            "snapshot": snapshot.model_dump(),
            "word_count": word_count
        })
        
    except Exception as e:
        logger.error(f"Auto Snapshot Error: {e}")
        return jsonify({"error": str(e)}), 500
