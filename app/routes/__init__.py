# File: app/routes/__init__.py
# Deskripsi: Mendefinisikan Blueprint dan mengimpor modul-modul route-nya.

from flask import Blueprint

# 1. Definisikan semua blueprint DULUAN
main_bp = Blueprint('main', __name__)
auth_bp = Blueprint('auth', __name__)
assistant_bp = Blueprint('assistant', __name__)
analysis_bp = Blueprint('analysis', __name__)
payment_bp = Blueprint('payment', __name__)
generator_bp = Blueprint('generator', __name__)

# 2. Impor modul-modul route di BAGIAN BAWAH untuk menghindari circular import
# Modul-modul ini akan mengimpor blueprint di atas via "from . import xxx_bp"
from . import main_routes
from . import auth_routes
from . import assistant_routes
from . import analysis_routes
from . import payment_routes
from . import workflow_routes
from . import generator_routes