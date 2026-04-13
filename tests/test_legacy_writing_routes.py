import importlib.util
import sys
import types
from pathlib import Path

from flask import Blueprint, Flask


REPO_ROOT = Path(__file__).resolve().parents[1]
ASSISTANT_ROUTES_PATH = REPO_ROOT / "app" / "routes" / "assistant_routes.py"


class _DummyLimiter:
    def limit(self, *_args, **_kwargs):
        def decorator(func):
            return func

        return decorator


def _install_assistant_route_stubs(monkeypatch):
    app_stub = types.ModuleType("app")
    app_stub.__path__ = [str(REPO_ROOT / "app")]
    app_stub.limiter = _DummyLimiter()
    app_stub.firestore_db = object()
    monkeypatch.setitem(sys.modules, "app", app_stub)

    routes_pkg = types.ModuleType("app.routes")
    routes_pkg.__path__ = [str(REPO_ROOT / "app" / "routes")]
    routes_pkg.assistant_bp = Blueprint("assistant", __name__)
    monkeypatch.setitem(sys.modules, "app.routes", routes_pkg)

    services_pkg = types.ModuleType("app.services")
    services_pkg.__path__ = [str(REPO_ROOT / "app" / "services")]
    monkeypatch.setitem(sys.modules, "app.services", services_pkg)

    ai_service_stub = types.ModuleType("app.services.ai_service")

    class AIService:
        @staticmethod
        def writing_assistant_stream(*_args, **_kwargs):
            raise AssertionError("legacy writing assistant stream should never be called in this test")

    ai_service_stub.AIService = AIService
    monkeypatch.setitem(sys.modules, "app.services.ai_service", ai_service_stub)

    utils_pkg = types.ModuleType("app.utils")
    utils_pkg.__path__ = [str(REPO_ROOT / "app" / "utils")]
    utils_pkg.ai_utils = types.ModuleType("app.utils.ai_utils")
    monkeypatch.setitem(sys.modules, "app.utils", utils_pkg)
    monkeypatch.setitem(sys.modules, "app.utils.ai_utils", utils_pkg.ai_utils)

    citation_helper_stub = types.ModuleType("app.utils.citation_helper")
    citation_helper_stub.generate_bibliography = lambda *_args, **_kwargs: []
    monkeypatch.setitem(sys.modules, "app.utils.citation_helper", citation_helper_stub)

    dotenv_stub = types.ModuleType("dotenv")
    dotenv_stub.load_dotenv = lambda *_args, **_kwargs: None
    monkeypatch.setitem(sys.modules, "dotenv", dotenv_stub)

    firebase_admin_stub = types.ModuleType("firebase_admin")
    firestore_stub = types.ModuleType("firebase_admin.firestore")
    firebase_admin_stub.firestore = firestore_stub
    monkeypatch.setitem(sys.modules, "firebase_admin", firebase_admin_stub)
    monkeypatch.setitem(sys.modules, "firebase_admin.firestore", firestore_stub)

    pypdf_stub = types.ModuleType("pypdf")
    pypdf_stub.PdfReader = object
    monkeypatch.setitem(sys.modules, "pypdf", pypdf_stub)

    bs4_stub = types.ModuleType("bs4")
    bs4_stub.BeautifulSoup = object
    monkeypatch.setitem(sys.modules, "bs4", bs4_stub)

    docx_stub = types.ModuleType("docx")
    docx_stub.Document = object
    monkeypatch.setitem(sys.modules, "docx", docx_stub)

    return routes_pkg.assistant_bp


def _load_assistant_routes_module(monkeypatch):
    assistant_bp = _install_assistant_route_stubs(monkeypatch)
    module_name = "app.routes.assistant_routes"
    sys.modules.pop(module_name, None)

    spec = importlib.util.spec_from_file_location(module_name, ASSISTANT_ROUTES_PATH)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    monkeypatch.setitem(sys.modules, module_name, module)
    spec.loader.exec_module(module)
    return module, assistant_bp


def _build_test_client(monkeypatch):
    module, assistant_bp = _load_assistant_routes_module(monkeypatch)

    app = Flask(__name__)
    app.config["SECRET_KEY"] = "test-secret"
    app.config["LOGIN_DISABLED"] = True

    main_bp = Blueprint("main", __name__)

    @main_bp.route("/writing")
    def writing():
        return "writing"

    app.register_blueprint(main_bp)
    app.register_blueprint(assistant_bp)
    return app.test_client(), module


def test_legacy_writing_pages_redirect_to_canonical_writing_page(monkeypatch):
    client, _module = _build_test_client(monkeypatch)

    response = client.get("/writing-assistant?id=project-123")
    assert response.status_code == 302
    assert response.headers["Location"].endswith("/writing?id=project-123")

    response = client.get("/writing-studio?project_id=project-456")
    assert response.status_code == 302
    assert response.headers["Location"].endswith("/writing?id=project-456")

    response = client.get("/chat")
    assert response.status_code == 302
    assert response.headers["Location"].endswith("/writing")


def test_legacy_writing_api_routes_are_gone(monkeypatch):
    client, _module = _build_test_client(monkeypatch)

    for path in (
        "/api/writing-assistant",
        "/chat/stream",
        "/api/generate-outline",
        "/api/paraphrase",
        "/expand-text",
        "/api/ai/edit-text",
        "/api/assistant/generate-stream",
        "/api/orchestrator/execute",
    ):
        response = client.post(path, json={})
        assert response.status_code == 410
        payload = response.get_json()
        assert payload["error"] == "LEGACY_WRITING_ROUTE_REMOVED"
        assert payload["preferred_route"] == "/api/agent/run"
