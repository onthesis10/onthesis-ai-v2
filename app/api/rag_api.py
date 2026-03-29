# File: app/api/rag_api.py
# Deskripsi: RAG Pipeline API — endpoints for indexing, searching, and validating citations.

from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
import logging

from app.engines.rag_engine_v2 import (
    index_reference, index_all_references, remove_reference,
    retrieve_for_chapter, validate_citations, build_rag_context_prompt,
    extract_text_from_pdf
)

logger = logging.getLogger(__name__)

rag_bp = Blueprint('rag', __name__)


@rag_bp.route('/references/<project_id>/index-all', methods=['POST'])
@login_required
def index_all(project_id):
    """Index all references for a project into the vector store."""
    try:
        count = index_all_references(project_id, str(current_user.id))
        return jsonify({
            "status": "success",
            "indexed_count": count,
            "message": f"Berhasil index {count} referensi"
        })
    except Exception as e:
        logger.error(f"Index All Error: {e}")
        return jsonify({"error": str(e)}), 500


@rag_bp.route('/references/<project_id>/index', methods=['POST'])
@login_required
def index_single(project_id):
    """Index a single reference."""
    try:
        data = request.get_json()
        ref_data = data.get("reference", {})
        text_content = data.get("text_content", "")

        success = index_reference(project_id, ref_data, text_content)

        return jsonify({
            "status": "success" if success else "skip",
            "message": "Referensi berhasil di-index" if success else "Index dilewati (ChromaDB unavailable)"
        })
    except Exception as e:
        logger.error(f"Index Single Error: {e}")
        return jsonify({"error": str(e)}), 500


@rag_bp.route('/references/<project_id>/remove/<ref_id>', methods=['DELETE'])
@login_required
def remove_ref(project_id, ref_id):
    """Remove a reference from the vector store."""
    try:
        success = remove_reference(project_id, ref_id)
        return jsonify({
            "status": "success" if success else "skip",
        })
    except Exception as e:
        logger.error(f"Remove Ref Error: {e}")
        return jsonify({"error": str(e)}), 500


@rag_bp.route('/references/<project_id>/search', methods=['POST'])
@login_required
def search_refs(project_id):
    """Search references using RAG retrieval."""
    try:
        data = request.get_json()
        query = data.get("query", "")
        chapter = data.get("chapter", "bab1")
        n_results = data.get("n_results", 5)

        results = retrieve_for_chapter(project_id, query, chapter, n_results)

        return jsonify({
            "status": "success",
            "results": results,
            "count": len(results)
        })
    except Exception as e:
        logger.error(f"RAG Search Error: {e}")
        return jsonify({"error": str(e)}), 500


@rag_bp.route('/citations/<project_id>/validate', methods=['POST'])
@login_required
def validate_text_citations(project_id):
    """
    Validate citations in a generated text against the reference pool.
    Detects phantom citations and ungrounded claims.
    """
    try:
        data = request.get_json()
        generated_text = data.get("text", "")

        if not generated_text:
            return jsonify({"error": "No text provided"}), 400

        result = validate_citations(generated_text, project_id)

        return jsonify({
            "status": "success",
            **result
        })
    except Exception as e:
        logger.error(f"Citation Validate Error: {e}")
        return jsonify({"error": str(e)}), 500
