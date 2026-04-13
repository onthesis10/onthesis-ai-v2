from gevent import monkey
monkey.patch_all(thread=False)
import os
import sys
import errno
import socket
import logging
import traceback
from datetime import datetime
from dotenv import load_dotenv

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="backslashreplace")

# 1. SETUP LOGGING KE FILE (PENTING UNTUK DEBUG CRASH)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[
        logging.FileHandler("server_debug.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("run_server")

# 2. LOAD ENVIRONMENT
load_dotenv()

from app import create_app
from app.extensions import socketio


def _module_path(module_name):
    module = sys.modules.get(module_name)
    return getattr(module, "__file__", "not-loaded")


def _log_runtime_sources(app):
    logger.info("Loaded module path: app.routes.main_routes=%s", _module_path("app.routes.main_routes"))
    logger.info("Loaded module path: app.routes.assistant_routes=%s", _module_path("app.routes.assistant_routes"))
    logger.info("Loaded module path: app.utils.search_utils=%s", _module_path("app.utils.search_utils"))
    logger.info("Loaded module path: app.api.writing_studio=%s", _module_path("app.api.writing_studio"))

    try:
        endpoint, _ = app.url_map.bind("127.0.0.1").match("/api/unified-search-references", method="POST")
        logger.info("Resolved POST /api/unified-search-references -> %s", endpoint)
    except Exception:
        logger.exception("Failed to resolve /api/unified-search-references during startup")


def _port_is_available(host, port):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.bind((host, port))
    except OSError as exc:
        if exc.errno == errno.EADDRINUSE:
            return False
        raise
    finally:
        sock.close()
    return True

def main():
    try:
        # Load config
        debug_mode = os.getenv('FLASK_DEBUG', 'True') == 'True'
        host = os.getenv('HOST', '0.0.0.0')
        port = int(os.getenv('PORT', '5000'))

        if not _port_is_available(host, port):
            logger.error(
                "Port %s sudah dipakai di %s. Biasanya masih ada server lama yang jalan. "
                "Hentikan proses lama atau jalankan server baru dengan PORT berbeda, misalnya: "
                "`PORT=5001 ./.venv/bin/python run.py`",
                port,
                host,
            )
            sys.exit(1)

        app = create_app()
        _log_runtime_sources(app)
        
        logger.info("==========================================")
        logger.info(f"OnThesis Server starting at {datetime.now()}")
        logger.info(f"URL: http://127.0.0.1:{port}")
        logger.info(f"Debug Mode: {debug_mode}")
        logger.info("Note: GEVENT ENABLED for Windows WebSocket stability")
        logger.info("==========================================")
        
        # Jalankan server
        # Di Windows, threading lebih stabil untuk dev mode
        socketio.run(
            app, 
            debug=debug_mode, 
            host=host,
            port=port,
            use_reloader=False, # Disable reloader for eventlet stability on Windows
            log_output=True
        )
    except Exception as e:
        logger.error("FATAL ERROR - Server crashed at startup!")
        logger.error(traceback.format_exc())
        with open("crash_report.txt", "a") as f:
            f.write(f"\n[{datetime.now()}] STARTUP CRASH:\n")
            f.write(traceback.format_exc())
            f.write("-" * 50 + "\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
