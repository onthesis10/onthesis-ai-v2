# File: app/__init__.py

import logging
import os

import firebase_admin
from dotenv import load_dotenv
from firebase_admin import credentials, firestore
from flask import Flask, Response, request, send_from_directory
from flask_cors import CORS  # kept for compatibility with existing imports/config
from flask_limiter.util import get_remote_address  # kept for compatibility
from flask_login import LoginManager
from flask_talisman import Talisman
from midtransclient import Snap

from app.extensions import limiter, socketio

# Load Environment Variables
load_dotenv()

# --- 1. INISIALISASI GLOBAL ---
db = None
firestore_db = None
midtrans_snap = None
login_manager = LoginManager()
logger = logging.getLogger(__name__)


def create_app():
    global firestore_db, midtrans_snap

    app = Flask(__name__)

    # Konfigurasi App
    app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET_KEY", "rahasia-negara-123")
    app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # Max Upload 16MB

    # Inisialisasi Limiter
    limiter.init_app(app)

    # Inisialisasi SocketIO
    socketio.init_app(app)  # Let it auto-detect based on run.py setup

    # Firebase Client Config (Inject to Frontend)
    app.config["FIREBASE_API_KEY"] = os.getenv("FIREBASE_API_KEY")
    app.config["FIREBASE_AUTH_DOMAIN"] = os.getenv("FIREBASE_AUTH_DOMAIN")
    app.config["FIREBASE_PROJECT_ID"] = os.getenv("FIREBASE_PROJECT_ID")
    app.config["FIREBASE_STORAGE_BUCKET"] = os.getenv("FIREBASE_STORAGE_BUCKET")
    app.config["FIREBASE_MESSAGING_SENDER_ID"] = os.getenv("FIREBASE_MESSAGING_SENDER_ID")
    app.config["FIREBASE_APP_ID"] = os.getenv("FIREBASE_APP_ID")
    app.config["FIREBASE_MEASUREMENT_ID"] = os.getenv("FIREBASE_MEASUREMENT_ID")

    @app.context_processor
    def inject_firebase_client_config():
        return {
            "firebase_client_config": {
                "apiKey": app.config.get("FIREBASE_API_KEY"),
                "authDomain": app.config.get("FIREBASE_AUTH_DOMAIN"),
                "projectId": app.config.get("FIREBASE_PROJECT_ID"),
                "storageBucket": app.config.get("FIREBASE_STORAGE_BUCKET"),
                "messagingSenderId": app.config.get("FIREBASE_MESSAGING_SENDER_ID"),
                "appId": app.config.get("FIREBASE_APP_ID"),
                "measurementId": app.config.get("FIREBASE_MEASUREMENT_ID"),
            }
        }

    @app.before_request
    def log_request_info():
        logger.info(
            "GLOBAL request: method=%s url=%s remote_addr=%s",
            request.method,
            request.url,
            request.remote_addr,
        )
        logger.info("GLOBAL request headers: %s", dict(request.headers))

        # Handle Preflight globally just in case
        if request.method == "OPTIONS":
            resp = Response()

            allowed_origins = [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:5000",
                "http://127.0.0.1:5000",
                os.getenv("FRONTEND_URL", "https://onthesis.app"),
            ]
            origin = request.headers.get("Origin")
            if origin in allowed_origins:
                resp.headers["Access-Control-Allow-Origin"] = origin
            else:
                resp.headers["Access-Control-Allow-Origin"] = allowed_origins[0]

            resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
            resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            resp.headers["Access-Control-Allow-Credentials"] = "true"
            return resp, 200

    @app.after_request
    def add_security_headers(response):
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
        return response

    @app.teardown_request
    def log_request_exception(exc):
        if exc is None:
            return None
        logger.error(
            "Unhandled application error during request",
            exc_info=(type(exc), exc, exc.__traceback__),
        )
        return None

    # FIX 1: Flask-CORS tetap dimatikan. CORS ditangani manual di route/global.
    # CORS(
    #     app,
    #     resources={r"/api/*": {"origins": [
    #         "http://localhost:5173",
    #         "http://127.0.0.1:5173",
    #         "http://localhost:5000",
    #         "http://127.0.0.1:5000"
    #     ]}},
    #     expose_headers=["Content-Disposition", "Content-Type", "Content-Length"],
    #     supports_credentials=True
    # )

    # --- 2. SETUP FIREBASE (AUTO-DETECT) ---
    if not firebase_admin._apps:
        cred_path = os.getenv("FIREBASE_CREDENTIALS") or os.getenv("FIREBASE_CREDENTIALS_JSON")
        if cred_path:
            cred_path = cred_path.strip().strip('"').strip("'")

        # Kalau .env kosong, cari file serviceAccountKey.json di folder root
        if not cred_path:
            possible_path = os.path.join(os.getcwd(), "serviceAccountKey.json")
            if os.path.exists(possible_path):
                cred_path = possible_path
                print(f"[OK] Auto-detect Service Account: {cred_path}")

        if cred_path and os.path.exists(cred_path):
            try:
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                print("[FIRE] Firebase Connected Successfully!")
            except Exception as e:
                print(f"[ERROR] Firebase Auth Error: {e}")
        else:
            print("[WARNING] Service Account Key tidak ditemukan. Mencoba Application Default Credentials...")
            firebase_admin.initialize_app()

    try:
        firestore_db = firestore.client()
    except Exception as e:
        print(f"[ERROR] Gagal koneksi Firestore: {e}")

    # --- 3. SETUP MIDTRANS ---
    midtrans_snap = Snap(
        is_production=False,
        server_key=os.getenv("MIDTRANS_SERVER_KEY"),
        client_key=os.getenv("MIDTRANS_CLIENT_KEY"),
    )

    # --- 4. SETUP LOGIN MANAGER ---
    login_manager.init_app(app)
    login_manager.login_view = "auth.login_page"
    login_manager.login_message = "Silakan login untuk mengakses halaman ini."

    from app.models import User

    @login_manager.user_loader
    def load_user(user_id):
        if not firestore_db:
            return None
        try:
            doc = firestore_db.collection("users").document(user_id).get()
            if doc.exists:
                return User.from_firestore(doc)
        except Exception:
            return None
        return None

    # --- 5. KONFIGURASI CSP (CONTENT SECURITY POLICY) ---
    csp = {
        "default-src": [
            "'self'",
            "https://*.gstatic.com",
            "https://*.googleapis.com",
            "https://*.firebaseio.com",
        ],
        "script-src": [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            "https://cdnjs.cloudflare.com",
            "https://cdn.jsdelivr.net",
            "https://unpkg.com",
            "https://www.googletagmanager.com",
            "https://app.sandbox.midtrans.com",
            "https://app.midtrans.com",
            "https://apis.google.com",
            "https://cdn.plot.ly",
            "https://cdn.tailwindcss.com",
            "https://www.gstatic.com",
            "https://*.firebaseio.com",
            "https://*.googleapis.com",
        ],
        "style-src": [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
            "https://cdn.jsdelivr.net",
            "https://cdnjs.cloudflare.com",
            "https://unpkg.com",
        ],
        "font-src": [
            "'self'",
            "https://fonts.gstatic.com",
            "https://cdnjs.cloudflare.com",
            "data:",
        ],
        "connect-src": [
            "'self'",
            "http://localhost:5000",
            "http://127.0.0.1:5000",
            "ws://localhost:*",
            "https://secure.gravatar.com",
            "https://app.sandbox.midtrans.com",
            "https://app.midtrans.com",
            "https://*.googleapis.com",
            "https://*.firebaseio.com",
            "https://identitytoolkit.googleapis.com",
            "https://securetoken.googleapis.com",
            "https://firestore.googleapis.com",
            "https://www.gstatic.com",
        ],
        "img-src": [
            "'self'",
            "data:",
            "https:",
            "https://*.googleusercontent.com",
        ],
        "frame-src": [
            "'self'",
            "https://*.firebaseapp.com",
            "https://app.midtrans.com",
            "https://app.sandbox.midtrans.com",
        ],
        "object-src": "'none'",
        "base-uri": "'self'",
    }

    # Talisman(
    #     app,
    #     content_security_policy=csp,
    #     force_https=False,
    #     permissions_policy={
    #         "geolocation": "()",
    #         "microphone": "()",
    #         "camera": "()",
    #     },
    # )

    @app.route("/favicon.ico")
    def favicon():
        return send_from_directory(
            os.path.join(app.root_path, "static", "images"),
            "logo-onthesis.png",
            mimetype="image/vnd.microsoft.icon",
        )

    # --- 6. REGISTER BLUEPRINTS ---
    from app.routes import analysis_bp, assistant_bp, auth_bp, generator_bp, main_bp, payment_bp
    from app.api.defense_api import bp as defense_bp
    from app.routes.agent_routes import agent_bp
    from app.routes.context_routes import context_bp
    from app.routes.export_routes import export_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(assistant_bp)
    app.register_blueprint(analysis_bp)
    app.register_blueprint(payment_bp)
    app.register_blueprint(generator_bp)
    app.register_blueprint(context_bp)
    app.register_blueprint(export_bp)
    # LEGACY: dataset-analysis agent — tidak aktif untuk writing pipeline
    app.register_blueprint(agent_bp, url_prefix="/legacy/agent")
    app.register_blueprint(defense_bp, url_prefix="/api/defense")

    from app.routes.ai_settings_routes import ai_settings_bp

    app.register_blueprint(ai_settings_bp)

    from app.routes.productivity_routes import productivity_bp

    app.register_blueprint(productivity_bp, url_prefix="/api/productivity")

    # New Thesis Agent Core API Route
    from app.routes.agent import agent_api_bp

    app.register_blueprint(agent_api_bp)

    # Thesis Brain - Research Graph API
    from app.api.research_graph_api import research_graph_bp

    app.register_blueprint(research_graph_bp, url_prefix="/api/thesis-brain")

    # RAG Pipeline API
    from app.api.rag_api import rag_bp

    app.register_blueprint(rag_bp, url_prefix="/api/rag")

    # Register WebSocket Routes
    from .routes import collab_sockets

    return app
