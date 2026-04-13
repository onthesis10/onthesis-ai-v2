import importlib.util
import sys
import types
import uuid
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from flask import Blueprint, Flask
from flask_login import LoginManager, UserMixin


REPO_ROOT = Path(__file__).resolve().parents[1]
ASSISTANT_ROUTES_PATH = REPO_ROOT / "app" / "routes" / "assistant_routes.py"


class _DummyLimiter:
    def limit(self, *_args, **_kwargs):
        def decorator(func):
            return func

        return decorator


class _FakeSnapshot:
    def __init__(self, doc_id, data):
        self.id = doc_id
        self._data = data
        self.exists = data is not None
        self.reference = None

    def to_dict(self):
        return dict(self._data or {})


class _FakeDocumentRef:
    def __init__(self, db, collection_name, doc_id):
        self.db = db
        self.collection_name = collection_name
        self.id = doc_id

    def get(self):
        data = self.db._collections.setdefault(self.collection_name, {}).get(self.id)
        snapshot = _FakeSnapshot(self.id, data)
        snapshot.reference = self
        return snapshot

    def set(self, data, merge=False):
        collection = self.db._collections.setdefault(self.collection_name, {})
        if merge and self.id in collection:
            merged = dict(collection[self.id])
            merged.update(data)
            collection[self.id] = merged
        else:
            collection[self.id] = dict(data)

    def update(self, data):
        self.set(data, merge=True)

    def delete(self):
        self.db._collections.setdefault(self.collection_name, {}).pop(self.id, None)


class _FakeQuery:
    def __init__(self, db, collection_name, filters=None):
        self.db = db
        self.collection_name = collection_name
        self.filters = list(filters or [])

    def where(self, field, op, value):
        assert op == "=="
        return _FakeQuery(self.db, self.collection_name, self.filters + [(field, value)])

    def stream(self):
        collection = self.db._collections.setdefault(self.collection_name, {})
        snapshots = []
        for doc_id, data in collection.items():
            if all(data.get(field) == value for field, value in self.filters):
                snapshot = _FakeSnapshot(doc_id, data)
                snapshot.reference = _FakeDocumentRef(self.db, self.collection_name, doc_id)
                snapshots.append(snapshot)
        return snapshots


class _FakeCollection(_FakeQuery):
    def __init__(self, db, collection_name):
        super().__init__(db, collection_name, [])

    def document(self, doc_id):
        return _FakeDocumentRef(self.db, self.collection_name, doc_id)

    def add(self, data):
        doc_id = uuid.uuid4().hex[:8]
        ref = self.document(doc_id)
        ref.set(data)
        return datetime.now(), ref


class _FakeFirestoreDB:
    def __init__(self):
        self._collections = {}

    def collection(self, name):
        return _FakeCollection(self, name)


def _load_module(monkeypatch):
    fake_db = _FakeFirestoreDB()

    app_stub = types.ModuleType("app")
    app_stub.__path__ = [str(REPO_ROOT / "app")]
    app_stub.limiter = _DummyLimiter()
    app_stub.firestore_db = fake_db
    monkeypatch.setitem(sys.modules, "app", app_stub)

    routes_pkg = types.ModuleType("app.routes")
    routes_pkg.__path__ = [str(REPO_ROOT / "app" / "routes")]
    routes_pkg.assistant_bp = Blueprint("assistant", __name__)
    monkeypatch.setitem(sys.modules, "app.routes", routes_pkg)

    services_pkg = types.ModuleType("app.services")
    services_pkg.__path__ = [str(REPO_ROOT / "app" / "services")]
    monkeypatch.setitem(sys.modules, "app.services", services_pkg)

    ai_service_stub = types.ModuleType("app.services.ai_service")
    ai_service_stub.AIService = type("AIService", (), {})
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
    firestore_stub.SERVER_TIMESTAMP = datetime(2026, 4, 8, 12, 0, 0)
    firestore_stub.Increment = lambda value: value
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

    module_name = "app.routes.assistant_routes"
    sys.modules.pop(module_name, None)
    spec = importlib.util.spec_from_file_location(module_name, ASSISTANT_ROUTES_PATH)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    monkeypatch.setitem(sys.modules, module_name, module)
    spec.loader.exec_module(module)
    return routes_pkg.assistant_bp, fake_db


def _build_client(monkeypatch):
    assistant_bp, fake_db = _load_module(monkeypatch)

    app = Flask(__name__)
    app.config["SECRET_KEY"] = "test-secret"

    login_manager = LoginManager()
    login_manager.init_app(app)

    @dataclass
    class TestUser(UserMixin):
        id: str
        email: str = "user@example.com"
        is_pro: bool = False

    @login_manager.user_loader
    def load_user(user_id):
        return TestUser(user_id)

    app.register_blueprint(assistant_bp)
    return app.test_client(), fake_db


def _login(client, user_id="user-1"):
    with client.session_transaction() as session:
        session["_user_id"] = user_id
        session["_fresh"] = True


def test_projects_api_requires_login(monkeypatch):
    client, _fake_db = _build_client(monkeypatch)

    response = client.get("/api/projects")

    assert response.status_code == 401


def test_projects_and_citations_flow_through_backend_api(monkeypatch):
    client, _fake_db = _build_client(monkeypatch)
    _login(client)

    create_project = client.post(
        "/api/projects",
        json={"title": "Project API", "status": "ON GOING", "progress": 40},
    )
    project_payload = create_project.get_json()
    project_id = project_payload["project"]["id"]

    list_projects = client.get("/api/projects")
    projects_payload = list_projects.get_json()

    create_citation = client.post(
        "/api/citations",
        json={
            "projectId": project_id,
            "title": "Paper A",
            "author": "Author One",
            "year": "2024",
        },
    )
    citation_payload = create_citation.get_json()
    citation_id = citation_payload["citation"]["id"]

    list_citations = client.get(f"/api/citations?projectId={project_id}")
    citations_payload = list_citations.get_json()

    delete_project = client.delete(f"/api/projects/{project_id}")
    list_citations_after_delete = client.get(f"/api/citations?projectId={project_id}")

    assert create_project.status_code == 201
    assert project_payload["project"]["title"] == "Project API"
    assert list_projects.status_code == 200
    assert len(projects_payload["projects"]) == 1
    assert create_citation.status_code == 201
    assert citation_payload["citation"]["id"] == citation_id
    assert len(citations_payload["citations"]) == 1
    assert delete_project.status_code == 200
    assert list_citations_after_delete.get_json()["citations"] == []
