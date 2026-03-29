# File: app/api/defense_api.py
# Deskripsi: AI Defense Simulator API — exposes /start, /answer, and /evaluate endpoints.

from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
import logging
import json

from app.utils.ai_utils import generate_text
from app.api.research_graph_api import _get_or_create_graph
from app.engines.defense_engine import DefenseEngine

logger = logging.getLogger(__name__)

bp = Blueprint('defense_api', __name__, url_prefix='/api/defense')


@bp.route('/start', methods=['POST'])
@login_required
def start_defense_session():
    """Start a new defense session with a specific examiner and difficulty."""
    data = request.json or {}
    examiner_type = data.get('examiner_type', 'supportive')
    difficulty = data.get('difficulty', 'normal')
    project_context = data.get('project_context', {})
    project_id = data.get('projectId', '')  # Note: Frontend might not easily send this inside defense tab yet, we'll try to get it
    
    # Try getting the current active project ID if not explicitly sent
    if not project_id:
        from app import firestore_db
        # Fallback to fetching highest updated project for user (basic fallback)
        projects = firestore_db.collection("projects").where("userId", "==", str(current_user.id)).order_by("updatedAt", direction="DESCENDING").limit(1).get()
        if projects:
            project_id = projects[0].id
            
    if not project_id:
        return jsonify({"message": "Pilih project terlebih dahulu di menu dashboard."}), 400

    try:
        graph = _get_or_create_graph(project_id, str(current_user.id))
        
        # Build strict persona system prompt
        system_prompt = DefenseEngine.build_system_prompt(graph, examiner_type, difficulty)
        
        # Instruct AI to open the session
        user_prompt = "Sidang dimulai. Berikan pernyataan pembuka (1 kalimat) dan ajukan pertanyaan pertama Anda berdasarkan konteks penelitian saya."
        
        # Call LLM
        response = generate_text(
            user_prompt=user_prompt,
            system_prompt=system_prompt,
            model_tier='pro' if difficulty == 'extreme' else 'standard'
        )
        
        return jsonify({
            "status": "success",
            "message": response
        })
        
    except Exception as e:
        logger.error(f"Error starting defense: {e}")
        return jsonify({"message": "Gagal memulai sidang."}), 500


@bp.route('/answer', methods=['POST'])
@login_required
def answer_defense_question():
    """Submit user answer and get examiner's follow-up or next question."""
    data = request.json or {}
    answer = data.get('answer', '')
    history = data.get('history', [])  # [{"role": "user"/"assistant", "content": "..."}]
    examiner_type = data.get('examiner_type', 'supportive')
    difficulty = data.get('difficulty', 'normal')
    project_id = data.get('projectId', '')
    
    if not project_id:
        from app import firestore_db
        projects = firestore_db.collection("projects").where("userId", "==", str(current_user.id)).order_by("updatedAt", direction="DESCENDING").limit(1).get()
        if projects:
            project_id = projects[0].id

    try:
        graph = _get_or_create_graph(project_id, str(current_user.id))
        system_prompt = DefenseEngine.build_system_prompt(graph, examiner_type, difficulty)
        
        # Build conversation history
        chat_format = []
        # Exclude system messages from history feed to reduce token usage
        clean_history = [m for m in history if m.get('role') != 'system']
        
        # Add historical messages (limit to last 6 turns to keep context window clean)
        for msg in clean_history[-6:]:
            # Convert roles to generic if using google gemini, but our util handles it
            chat_format.append({"role": msg["role"], "content": msg["content"]})
            
        # Append latest answer
        chat_format.append({"role": "user", "content": answer})
        
        # Call LLM with History
        # We need a new utility function for multi-turn chat if generate_text doesn't support it well, 
        # but passing chat history in prompt works too:
        history_text = "\n".join([f"{'PENGUJI' if m['role']=='assistant' else 'SAYA'}: {m['content']}" for m in chat_format])
        
        prompt = f"""[TRANSKRIP SIDANG BERJALAN]
{history_text}

Sebagai dosen penguji, evaluasi jawaban terakhir saya. Berikan sanggahan logis jika jawaban lemah, ATAU ajukan pertanyaan baru jika jawaban memuaskan.
Usahakan dialog tetap pendek (maks 3-4 kalimat). JANGAN bertele-tele."""
        
        response = generate_text(
            user_prompt=prompt,
            system_prompt=system_prompt,
            model_tier='pro' if difficulty == 'extreme' else 'standard'
        )
        
        return jsonify({
            "status": "success",
            "message": response
        })
        
    except Exception as e:
        logger.error(f"Error answering defense: {e}")
        return jsonify({"message": "Terjadi kesalahan sistem penguji."}), 500


@bp.route('/evaluate', methods=['POST'])
@login_required
def evaluate_defense_session():
    """End session and generate grading report."""
    data = request.json or {}
    history = data.get('history', [])
    project_id = data.get('projectId', '')
    
    if not project_id:
        from app import firestore_db
        projects = firestore_db.collection("projects").where("userId", "==", str(current_user.id)).order_by("updatedAt", direction="DESCENDING").limit(1).get()
        if projects:
            project_id = projects[0].id
            
    try:
        graph = _get_or_create_graph(project_id, str(current_user.id))
        
        # Clean history
        clean_history = [m for m in history if m.get('role') != 'system']
        if len(clean_history) < 2:
            return jsonify({"score": 0, "verdict": "BATAL", "advice": "Sesi sidang terlalu singkat."})
            
        prompt = DefenseEngine.build_evaluation_prompt(graph, clean_history)
        
        raw_response = generate_text(
            user_prompt=prompt,
            system_prompt="Anda adalah Evaluator Sidang Skripsi Akademik. Jawab dengan JSON saja.",
            model_tier='pro'
        )
        
        # Parse JSON
        try:
            # Strip backticks if any
            clean_json = raw_response.replace("```json", "").replace("```", "").strip()
            report = json.loads(clean_json)
            
            # Ensure keys exist
            return jsonify({
                "verdict": report.get("verdict", "SELESAI"),
                "score": report.get("score", 70),
                "strengths": report.get("strengths", "-"),
                "weaknesses": report.get("weaknesses", "-"),
                "advice": report.get("advice", "-")
            })
            
        except json.JSONDecodeError:
            logger.error(f"Failed to parse defense eval JSON: {raw_response}")
            return jsonify({
                "verdict": "SELESAI",
                "score": 75,
                "strengths": "Berusaha menjawab pertanyaan.",
                "weaknesses": "Error in AI evaluation parsing.",
                "advice": "Terus berlatih."
            })

    except Exception as e:
        logger.error(f"Error evaluating defense: {e}")
        return jsonify({"message": "Gagal mengevaluasi."}), 500
