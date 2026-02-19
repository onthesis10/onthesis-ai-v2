import os
from dotenv import load_dotenv
from app import create_app

# 1. LOAD ENVIRONMENT VARIABLES DULUAN
# Ini wajib dipanggil sebelum create_app() biar config terbaca
load_dotenv()

# 2. Buat Aplikasi
app = create_app()

if __name__ == "__main__":
    # Cek apakah debug mode aktif dari .env (Opsional)
    debug_mode = os.getenv('FLASK_DEBUG', 'True') == 'True'
    
    print("Server starting...")
    print(f"Environment loaded. Secret Key exists: {bool(os.getenv('SECRET_KEY'))}")
    
    app.run(debug=debug_mode)