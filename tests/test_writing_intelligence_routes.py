import importlib.util
import sys
import types
from pathlib import Path

from flask import Blueprint, Flask


REPO_ROOT = Path(__file__).resolve().parents[1]
ROUTES_PATH = REPO_ROOT / "app" / "routes" / "writing_intelligence_routes.py"


class _DummyLimiter:
    def limit(self, *_args, **_kwargs):
        def decorator(func):
            return func

        return decorator


def _load_module(monkeypatch):
    app_stub = types.ModuleType("app")
    app_stub.__path__ = [str(REPO_ROOT / "app")]
    app_stub.limiter = _DummyLimiter()
    monkeypatch.setitem(sys.modules, "app", app_stub)

    routes_pkg = types.ModuleType("app.routes")
    routes_pkg.__path__ = [str(REPO_ROOT / "app" / "routes")]
    routes_pkg.assistant_bp = Blueprint("assistant", __name__)
    monkeypatch.setitem(sys.modules, "app.routes", routes_pkg)

    litellm_stub = types.ModuleType("litellm")
    monkeypatch.setitem(sys.modules, "litellm", litellm_stub)

    module_name = "app.routes.writing_intelligence_routes"
    sys.modules.pop(module_name, None)
    spec = importlib.util.spec_from_file_location(module_name, ROUTES_PATH)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    monkeypatch.setitem(sys.modules, module_name, module)
    spec.loader.exec_module(module)
    return routes_pkg.assistant_bp


def test_legacy_quick_fix_route_is_removed(monkeypatch):
    assistant_bp = _load_module(monkeypatch)

    app = Flask(__name__)
    app.config["SECRET_KEY"] = "test-secret"
    app.config["LOGIN_DISABLED"] = True
    app.register_blueprint(assistant_bp)

    client = app.test_client()
    response = client.post("/api/writing/quick-fix", json={"text": "Kalimat uji", "mode": "formalize"})

    assert response.status_code == 410
    payload = response.get_json()
    assert payload["error"] == "LEGACY_WRITING_ROUTE_REMOVED"
    assert payload["preferred_route"] == "/api/agent/run"
