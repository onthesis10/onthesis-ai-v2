from flask_socketio import emit, join_room, leave_room
from app.extensions import socketio
import logging

logger = logging.getLogger(__name__)

@socketio.on('connect', namespace='/collab')
def on_connect():
    logger.info("⚡ [CollabSocket] Client connected to /collab namespace")


@socketio.on('join_document', namespace='/collab')
def on_join(data):
    """
    Called when a user connects to a specific document room.
    data: {'document_id': 'xyz', 'user_id': 'abc'}
    """
    document_id = data.get('document_id')
    user_id = data.get('user_id', 'Anonymous')
    if not document_id:
        return
    
    join_room(document_id)
    # Notify others in room
    emit('user_joined', {'user_id': user_id, 'message': f'{user_id} joined the document.'}, to=document_id)
    logger.info(f"User {user_id} joined room {document_id}")

@socketio.on('leave_document', namespace='/collab')
def on_leave(data):
    document_id = data.get('document_id')
    user_id = data.get('user_id', 'Anonymous')
    if not document_id:
        return
    
    leave_room(document_id)
    emit('user_left', {'user_id': user_id, 'message': f'{user_id} left the document.'}, to=document_id)
    logger.info(f"User {user_id} left room {document_id}")

@socketio.on('document_update', namespace='/collab')
def on_document_update(data):
    """
    Handles realtime content syncing (Yjs updates or standard plain deltas).
    """
    document_id = data.get('document_id')
    # Broadcast to everyone in the room EXCEPT the sender
    emit('document_updated', data, to=document_id, include_self=False)

@socketio.on('cursor_move', namespace='/collab')
def on_cursor_move(data):
    """
    Handles realtime cursor awareness.
    """
    document_id = data.get('document_id')
    emit('cursor_moved', data, to=document_id, include_self=False)
