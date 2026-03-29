# File: app/api/writing_studio.py
# Deskripsi: Writing Studio API — REAL AI endpoints replacing mocks.
# Handles: copilot chat, reference search, paraphrase, text transform.

from flask import Blueprint, request, jsonify, Response, stream_with_context
from flask_login import login_required, current_user
import logging
import json

logger = logging.getLogger(__name__)

writing_studio_bp = Blueprint('writing_studio', __name__)
LEGACY_ROUTE_HEADERS = {
    "X-OnThesis-Legacy-Route": "true",
    "X-OnThesis-Preferred-Route": "/api/agent/run",
}


def _mark_legacy_response(response):
    logger.warning("Legacy writing_studio route hit; prefer /api/agent/run for new writing-agent flows.")
    for key, value in LEGACY_ROUTE_HEADERS.items():
        response.headers[key] = value
    return response


@writing_studio_bp.route('/chat', methods=['POST'])
@login_required
def chat_copilot():
    """
    AI Research Copilot — context-aware thesis chat.
    Uses the project context for grounded responses.
    Legacy route: new writing-agent runtime should use `/api/agent/run`.
    """
    from app.utils import ai_utils

    try:
        data = request.json
        user_message = data.get('message', '')
        project_id = data.get('projectId', '')

        if not user_message.strip():
            return jsonify({"error": "Message kosong"}), 400

        # Load project context if available
        project_context = None
        references = None

        if project_id:
            try:
                from app.api.research_graph_api import _get_or_create_graph
                graph = _get_or_create_graph(project_id, str(current_user.id))
                project_context = {
                    'title': graph.title,
                    'problem_statement': " | ".join([rm.text for rm in graph.rumusan_masalah]),
                    'methodology': graph.methodology,
                }
                references = graph.references[:5] if graph.references else None
            except Exception as e:
                logger.warning(f"Chat context load failed: {e}")

        # Stream response
        def generate():
            for chunk in ai_utils.get_chat_response_stream(
                user_message,
                project_context=project_context,
                references=references
            ):
                yield chunk

        return _mark_legacy_response(Response(stream_with_context(generate()), mimetype='text/plain'))

    except Exception as e:
        logger.error(f"Chat Copilot Error: {e}")
        return jsonify({"error": str(e)}), 500


@writing_studio_bp.route('/search_references', methods=['POST'])
@login_required
def search_references():
    """
    Search user's references from Firestore citations collection.
    Legacy route: maintained for compatibility while `/api/agent/run` is the preferred runtime.
    """
    from app import firestore_db

    try:
        data = request.json
        query = data.get('query', '').lower().strip()
        project_id = data.get('projectId', '')

        if not query:
            return jsonify({"results": []})

        results = []

        if project_id:
            # Search Firestore citations for this project
            refs_query = firestore_db.collection("citations")\
                .where("projectId", "==", project_id).stream()

            for ref_doc in refs_query:
                ref_data = ref_doc.to_dict()
                title = (ref_data.get('title') or '').lower()
                author = (ref_data.get('author') or '').lower()

                if query in title or query in author:
                    ref_data['id'] = ref_doc.id
                    results.append(ref_data)

        return _mark_legacy_response(jsonify({"results": results[:20]}))

    except Exception as e:
        logger.error(f"Search References Error: {e}")
        return jsonify({"error": str(e)}), 500


@writing_studio_bp.route('/paraphrase', methods=['POST'])
@login_required
def paraphrase_text():
    """
    AI-powered paraphrase with multiple style modes.
    Legacy route: maintained for compatibility while `/api/agent/run` is the preferred runtime.
    """
    from app.utils import ai_utils

    try:
        data = request.json
        text = data.get('text', '').strip()
        mode = data.get('mode', 'academic')

        if not text:
            return jsonify({"error": "No text provided"}), 400

        # Map mode names to support as many academic styles as possible
        style_map = {
            'academic': 'academic',
            'academic_kritis': 'academic_kritis',
            'filosofis': 'filosofis',
            'deskriptif': 'deskriptif',
            'persuasif': 'persuasif',
            'puitis': 'puitis',
            'jurnalistis': 'jurnalistis',
            'eksak': 'eksak',
            'anti_plagiarisme': 'anti_plagiarisme',
            'shorten': 'simple',
            'expand': 'creative',
            'formal': 'formal',
            'simple': 'simple',
            'creative': 'creative',
        }
        style = style_map.get(mode, 'academic')

        result = ai_utils.paraphrase_text(
            user=current_user,
            text=text,
            style=style,
            selected_model='fast'
        )

        return _mark_legacy_response(jsonify({
            "original": text,
            "paraphrased": result
        }))

    except Exception as e:
        logger.error(f"Paraphrase Error: {e}")
        return jsonify({"error": str(e)}), 500


@writing_studio_bp.route('/transform', methods=['POST'])
@login_required
def transform_text():
    """
    AI text transformation for academic writing.
    Modes: formalize, simplify, expand, shorten, grammar
    Legacy route: maintained for compatibility while `/api/agent/run` is the preferred runtime.
    """
    from app.utils import ai_utils

    try:
        data = request.json
        text = data.get('text', '').strip()
        mode = data.get('mode', 'formalize')

        if not text:
            return jsonify({'error': 'No text provided'}), 400

        # Map transform modes to paraphrase styles
        mode_style_map = {
            'formalize': 'academic',
            'simplify': 'simple',
            'expand': 'creative',
            'shorten': 'simple',
            'grammar': 'formal',
        }
        style = mode_style_map.get(mode, 'academic')

        # For grammar mode, use the proofreader
        if mode == 'grammar':
            result = ai_utils.proofread_text(text, user_is_pro=getattr(current_user, 'is_pro', False))
        else:
            result = ai_utils.paraphrase_text(
                user=current_user,
                text=text,
                style=style,
                selected_model='fast'
            )

        return _mark_legacy_response(jsonify({
            'status': 'success',
            'original': text,
            'transformed': result,
            'mode': mode
        }))

    except Exception as e:
        logger.error(f"Transform Error: {e}")
        return jsonify({'error': str(e)}), 500
