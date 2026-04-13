import importlib.util
import sys
import types
from pathlib import Path

from flask import Flask


REPO_ROOT = Path(__file__).resolve().parents[1]
AGENT_ROUTES_PATH = REPO_ROOT / "app" / "routes" / "agent.py"


def _load_agent_routes(monkeypatch):
    app_stub = types.ModuleType("app")
    app_stub.__path__ = [str(REPO_ROOT / "app")]
    monkeypatch.setitem(sys.modules, "app", app_stub)

    routes_pkg = types.ModuleType("app.routes")
    routes_pkg.__path__ = [str(REPO_ROOT / "app" / "routes")]
    monkeypatch.setitem(sys.modules, "app.routes", routes_pkg)

    flask_login_stub = types.ModuleType("flask_login")
    flask_login_stub.login_required = lambda func: func
    flask_login_stub.current_user = types.SimpleNamespace(id="user-test")
    monkeypatch.setitem(sys.modules, "flask_login", flask_login_stub)

    memory_system_stub = types.ModuleType("app.agent.memory_system")
    memory_system_stub.QdrantVectorDB = object
    memory_system_stub.SharedMemory = object
    memory_system_stub.FirestoreDocumentDB = object
    memory_system_stub.count_tokens = lambda text: len(str(text))
    monkeypatch.setitem(sys.modules, "app.agent.memory_system", memory_system_stub)

    gevent_stub = types.ModuleType("gevent")
    gevent_queue_stub = types.ModuleType("gevent.queue")

    class DummyQueue:
        def __init__(self):
            self.items = []

        def put(self, item):
            self.items.append(item)

        def get(self):
            return self.items.pop(0)

    gevent_stub.spawn = lambda func: func()
    gevent_queue_stub.Queue = DummyQueue
    monkeypatch.setitem(sys.modules, "gevent", gevent_stub)
    monkeypatch.setitem(sys.modules, "gevent.queue", gevent_queue_stub)

    supervisor_stub = types.ModuleType("app.agent.supervisor")

    class SupervisorAgent:
        last_context = None

        def process_request(self, user_id, message, context=None, on_event=None):
            SupervisorAgent.last_context = context
            if on_event:
                on_event("TEXT_DELTA", {"delta": f"mode::{context.get('_mode')}"})
            return f"mode::{context.get('_mode')}"

    supervisor_stub.SupervisorAgent = SupervisorAgent
    monkeypatch.setitem(sys.modules, "app.agent.supervisor", supervisor_stub)

    module_name = "app.routes.agent"
    sys.modules.pop(module_name, None)
    spec = importlib.util.spec_from_file_location(module_name, AGENT_ROUTES_PATH)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    monkeypatch.setitem(sys.modules, module_name, module)
    spec.loader.exec_module(module)
    return module, supervisor_stub.SupervisorAgent


def test_agent_run_forwards_mode_into_active_runtime(monkeypatch):
    module, supervisor_cls = _load_agent_routes(monkeypatch)

    app = Flask(__name__)
    app.config["TESTING"] = True
    app.register_blueprint(module.agent_api_bp)

    client = app.test_client()
    response = client.post(
        "/api/agent/run",
        json={
            "projectId": "project-1",
            "task": "Buat peta konsep dari draft ini.",
            "mode": "concept_map",
            "context": {"requestedTask": "concept_map"},
        },
    )

    body = response.get_data(as_text=True)

    assert response.status_code == 200
    assert "mode::concept_map" in body
    assert supervisor_cls.last_context["_mode"] == "concept_map"
    assert supervisor_cls.last_context["requestedTask"] == "concept_map"
