from flask_socketio import SocketIO
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os

redis_url = os.getenv('REDIS_URL')

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=redis_url or "memory://",  # fallback kalau None
    default_limits=["1000 per hour"]
)

import logging
logger = logging.getLogger(__name__)

socketio = SocketIO(
    cors_allowed_origins="*",
    message_queue=redis_url,
    async_mode='gevent',
    ping_timeout=30,
    ping_interval=25,
    logger=True,
    engineio_logger=True
)