# File: app/__init__.py

import os
import firebase_admin
from firebase_admin import credentials, firestore
from flask import Flask, send_from_directory, request
from flask_login import LoginManager
from flask_talisman import Talisman
from flask_cors import CORS  # 🔥 IMPORT BARU: UNTUK MENGATASI NETWORK ERROR
from midtransclient import Snap
from dotenv import load_dotenv

# Load Environment Variables
load_dotenv()

# --- 1. INISIALISASI GLOBAL ---
db = None
firestore_db = None
midtrans_snap = None
login_manager = LoginManager()

def create_app():
    global firestore_db, midtrans_snap

    app = Flask(__name__)
    
    # Konfigurasi App
    app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'rahasia-negara-123')
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Max Upload 16MB

    # Firebase Client Config (Inject to Frontend)
    app.config['FIREBASE_API_KEY'] = os.getenv('FIREBASE_API_KEY')
    app.config['FIREBASE_AUTH_DOMAIN'] = os.getenv('FIREBASE_AUTH_DOMAIN')
    app.config['FIREBASE_PROJECT_ID'] = os.getenv('FIREBASE_PROJECT_ID')
    app.config['FIREBASE_STORAGE_BUCKET'] = os.getenv('FIREBASE_STORAGE_BUCKET')
    app.config['FIREBASE_MESSAGING_SENDER_ID'] = os.getenv('FIREBASE_MESSAGING_SENDER_ID')
    app.config['FIREBASE_APP_ID'] = os.getenv('FIREBASE_APP_ID')

    @app.before_request
    def log_request_info():
        import sys
        sys.stdout.write(f"🌍 [GLOBAL] Request: {request.method} {request.url}\n")
        sys.stdout.write(f"🌍 [GLOBAL] Headers: {dict(request.headers)}\n")
        sys.stdout.flush()
        
        # Handle Preflight globally just in case
        if request.method == "OPTIONS":
             from flask import Response
             resp = Response()
             resp.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
             resp.headers['Access-Control-Allow-Headers'] = '*'
             resp.headers['Access-Control-Allow-Methods'] = '*'
             resp.headers['Access-Control-Allow-Credentials'] = 'true'
             return resp, 200


    # 🔥 FIX 1: LEPAS Flask-CORS (Kita handle manual di route/global biar gak conflict)
    # CORS(app, 
    #      resources={r"/api/*": {"origins": [
    #          "http://localhost:5173",
    #          "http://127.0.0.1:5173",
    #          "http://localhost:5000",
    #          "http://127.0.0.1:5000"
    #      ]}},
    #      expose_headers=["Content-Disposition", "Content-Type", "Content-Length"],
    #      supports_credentials=True
    # )

    # --- 2. SETUP FIREBASE (AUTO-DETECT) ---
    if not firebase_admin._apps:
        # Coba 1: Ambil dari .env
        cred_path = os.getenv('FIREBASE_CREDENTIALS')
        
        # Coba 2: Kalau .env kosong, cari file 'serviceAccountKey.json' di folder root
        if not cred_path:
            possible_path = os.path.join(os.getcwd(), 'serviceAccountKey.json')
            if os.path.exists(possible_path):
                cred_path = possible_path
                print(f"[OK] Auto-detect Service Account: {cred_path}")

        # Eksekusi Login Firebase
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
    
    # Inisialisasi Client Firestore
    try:
        firestore_db = firestore.client()
    except Exception as e:
        print(f"❌ Gagal koneksi Firestore: {e}")

    # --- 3. SETUP MIDTRANS ---
    midtrans_snap = Snap(
        is_production=False, 
        server_key=os.getenv('MIDTRANS_SERVER_KEY'),
        client_key=os.getenv('MIDTRANS_CLIENT_KEY')
    )

    # --- 4. SETUP LOGIN MANAGER ---
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login_page'
    login_manager.login_message = "Silakan login untuk mengakses halaman ini."

    from app.models import User 

    @login_manager.user_loader
    def load_user(user_id):
        if not firestore_db: return None
        try:
            doc = firestore_db.collection('users').document(user_id).get()
            if doc.exists:
                return User.from_firestore(doc)
        except Exception:
            return None
        return None

    # --- 5. KONFIGURASI CSP (CONTENT SECURITY POLICY) ---
    # 🔥 FIX 2: UPDATE CSP AGAR LOCALHOST TIDAK DIBLOKIR
    csp = {
        'default-src': [
            '\'self\'',
            'https://*.gstatic.com',
            'https://*.googleapis.com',
            'https://*.firebaseio.com',
        ],
        'script-src': [
            '\'self\'',
            '\'unsafe-inline\'',
            '\'unsafe-eval\'',
            'https://cdnjs.cloudflare.com',
            'https://cdn.jsdelivr.net',
            'https://unpkg.com',
            'https://www.googletagmanager.com',
            'https://app.sandbox.midtrans.com',
            'https://app.midtrans.com',
            'https://apis.google.com',
            'https://cdn.plot.ly',
            'https://cdn.tailwindcss.com',
            'https://www.gstatic.com',
            'https://*.firebaseio.com',
            'https://*.googleapis.com',
        ],
        'style-src': [
            '\'self\'',
            '\'unsafe-inline\'',
            'https://fonts.googleapis.com',
            'https://cdn.jsdelivr.net',
            'https://cdnjs.cloudflare.com',
            'https://unpkg.com',
        ],
        'font-src': [
            '\'self\'',
            'https://fonts.gstatic.com',
            'https://cdnjs.cloudflare.com',
            'data:',
        ],
        'connect-src': [
            '\'self\'',
            'http://localhost:5000',      # 🔥 IZINKAN LOCALHOST
            'http://127.0.0.1:5000',      # 🔥 IZINKAN IP LOCAL
            'ws://localhost:*',           # Untuk WebSocket (Dev Mode)
            'https://secure.gravatar.com',
            'https://app.sandbox.midtrans.com',
            'https://app.midtrans.com',
            'https://*.googleapis.com',
            'https://*.firebaseio.com',
            'https://identitytoolkit.googleapis.com',
            'https://securetoken.googleapis.com',
            'https://firestore.googleapis.com',
            'https://www.gstatic.com',
        ],
        'img-src': [
            '\'self\'',
            'data:',
            'https:',
            'https://*.googleusercontent.com',
        ],
        'frame-src': [
            '\'self\'',
            'https://*.firebaseapp.com',
            'https://app.midtrans.com',
            'https://app.sandbox.midtrans.com',
        ],
        'object-src': '\'none\'',
        'base-uri': '\'self\''
    }

    # Talisman(app, 
    #          content_security_policy=csp, 
    #          force_https=False,
    #          permissions_policy={
    #             'geolocation': '()',
    #             'microphone': '()',
    #             'camera': '()'
    #          }) 

    # 🔥 FIX 3: TAMBAHKAN ROUTE FAVICON (Biar gak error 404 di console)
    @app.route('/favicon.ico')
    def favicon():
        return send_from_directory(
            os.path.join(app.root_path, 'static', 'images'),
            'logo-onthesis.png', # Pastikan ada file ini atau ganti nama filenya
            mimetype='image/vnd.microsoft.icon'
        )

    # --- 6. REGISTER BLUEPRINTS ---
    from app.routes import main_bp, auth_bp, assistant_bp, analysis_bp, payment_bp, generator_bp
    from app.routes.context_routes import context_bp
    from app.routes.export_routes import export_bp
    from app.routes.agent_routes import agent_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(assistant_bp)
    app.register_blueprint(analysis_bp)
    app.register_blueprint(payment_bp)
    app.register_blueprint(generator_bp)
    app.register_blueprint(context_bp)
    app.register_blueprint(export_bp)
    app.register_blueprint(agent_bp)
    
    from app.routes.productivity_routes import productivity_bp
    app.register_blueprint(productivity_bp, url_prefix='/api/productivity')
    
    # Writing Studio API
    from app.api.writing_studio import writing_studio_bp
    app.register_blueprint(writing_studio_bp, url_prefix='/api/writing_studio')

    return app