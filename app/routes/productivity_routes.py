from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app.services.productivity_service import ProductivityService
import logging

productivity_bp = Blueprint('productivity', __name__)
logger = logging.getLogger(__name__)

@productivity_bp.route('/sync', methods=['POST'])
@login_required
def sync_session():
    """
    Simpan sesi produktivitas (timer selesai/stopped).
    Payload: { "duration": 120 } (seconds)
    """
    try:
        data = request.get_json()
        duration = data.get('duration')
        
        if not duration or not isinstance(duration, (int, float)) or duration <= 0:
            return jsonify({'error': 'Invalid duration'}), 400
            
        success, message = ProductivityService.log_session(current_user.id, int(duration))
        
        if success:
            return jsonify({'message': 'Session logged', 'status': 'success'}), 200
        else:
            return jsonify({'error': message}), 500
            
    except Exception as e:
        logger.error(f"Sync error: {e}")
        return jsonify({'error': str(e)}), 500

@productivity_bp.route('/stats', methods=['GET'])
@login_required
def get_stats():
    """
    Ambil statistik user (Level, Total Jam, Streak, dll).
    """
    stats = ProductivityService.get_stats(current_user.id)
    if stats:
        return jsonify(stats), 200
    else:
        return jsonify({'error': 'Failed to fetch stats'}), 500

@productivity_bp.route('/heatmap', methods=['GET'])
@login_required
def get_heatmap():
    """
    Ambil data untuk heatmap kalender.
    """
    data = ProductivityService.get_heatmap(current_user.id)
    return jsonify(data), 200
