import importlib.util
import io
import sys
import types
import uuid
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from flask import Blueprint, Flask
from flask_login import LoginManager, UserMixin


REPO_ROOT = Path(__file__).resolve().parents[1]
CONTEXT_ROUTES_PATH = REPO_ROOT / "app" / "routes" / "context_routes.py"


class _DummyLimiter:
    def limit(self, *_args, **_kwargs):
        def decorator(func):
            return func

        return decorator


class _FakeSnapshot:
    def __init__(self, doc_id, data, reference):
        self.id = doc_id
        self._data = data
        self.reference = reference
        self.exists = data is not None

    def to_dict(self):
        return dict(self._data or {})


class _FakeDocumentRef:
    def __init__(self, db, collection_path, doc_id):
        self.db = db
        self.collection_path = collection_path
        self.id = doc_id

    def _collection_store(self):
        return self.db._collections.setdefault(self.collection_path, {})

    def get(self):
        data = self._collection_store().get(self.id)
        return _FakeSnapshot(self.id, data, self)

    def set(self, data, merge=False):
        store = self._collection_store()
        if merge and self.id in store:
            merged = dict(store[self.id])
            merged.update(data)
            store[self.id] = merged
        else:
            store[self.id] = dict(data)

    def update(self, data):
        self.set(data, merge=True)

    def delete(self):
        self._collection_store().pop(self.id, None)

    def collection(self, name):
        return _FakeCollection(self.db, f"{self.collection_path}/{self.id}/{name}")


class _FakeQuery:
    def __init__(self, db, collection_path, filters=None):
        self.db = db
        self.collection_path = collection_path
        self.filters = list(filters or [])

    def where(self, field, op, value):
        assert op == "=="
        return _FakeQuery(self.db, self.collection_path, self.filters + [(field, value)])

    def stream(self):
        store = self.db._collections.setdefault(self.collection_path, {})
        snapshots = []
        for doc_id, data in store.items():
            if all(data.get(field) == value for field, value in self.filters):
                ref = _FakeDocumentRef(self.db, self.collection_path, doc_id)
                snapshots.append(_FakeSnapshot(doc_id, data, ref))
        return snapshots


class _FakeCollection(_FakeQuery):
    def __init__(self, db, collection_path):
        super().__init__(db, collection_path, [])

    def document(self, doc_id):
        return _FakeDocumentRef(self.db, self.collection_path, doc_id)

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
    app_stub.firestore_db = fake_db
    app_stub.limiter = _DummyLimiter()
    monkeypatch.setitem(sys.modules, "app", app_stub)

    services_pkg = types.ModuleType("app.services")
    services_pkg.__path__ = [str(REPO_ROOT / "app" / "services")]
    monkeypatch.setitem(sys.modules, "app.services", services_pkg)

    document_pipeline_stub = types.ModuleType("app.services.document_pipeline")
    document_pipeline_stub.prepare_document_upload = lambda file_storage, user_id, project_id, instance_path: {
        "doc_id": "doc-1",
        "filename": "paper.pdf",
        "content_type": "application/pdf",
        "byte_size": 123,
        "local_path": "/tmp/paper.pdf",
        "storage_backend": "firebase_storage",
        "storage_path": f"projects/{user_id}/{project_id}/documents/doc-1/paper.pdf",
        "file_url": "https://storage.example/paper.pdf",
    }
    monkeypatch.setitem(sys.modules, "app.services.document_pipeline", document_pipeline_stub)

    rag_service_stub = types.ModuleType("app.services.rag_service")

    class LiteContextEngine:
        def process_document(self, file_path, doc_id, user_id, project_id=""):
            return {
                "status": "success",
                "chunks_count": 3,
                "token_count": 120,
                "context_summary": "Ringkasan referensi utama.",
            }

    rag_service_stub.LiteContextEngine = LiteContextEngine
    monkeypatch.setitem(sys.modules, "app.services.rag_service", rag_service_stub)

    firebase_admin_stub = types.ModuleType("firebase_admin")
    firestore_stub = types.ModuleType("firebase_admin.firestore")
    firestore_stub.SERVER_TIMESTAMP = datetime(2026, 4, 8, 12, 0, 0)
    firebase_admin_stub.firestore = firestore_stub
    monkeypatch.setitem(sys.modules, "firebase_admin", firebase_admin_stub)
    monkeypatch.setitem(sys.modules, "firebase_admin.firestore", firestore_stub)

    bs4_stub = types.ModuleType("bs4")

    class BeautifulSoup:
        def __init__(self, html, parser):
            self.html = html

        def get_text(self, separator="\n", strip=True):
            return str(self.html)

    bs4_stub.BeautifulSoup = BeautifulSoup
    monkeypatch.setitem(sys.modules, "bs4", bs4_stub)

    gevent_stub = types.ModuleType("gevent")
    gevent_stub.spawn = lambda func: func()
    monkeypatch.setitem(sys.modules, "gevent", gevent_stub)

    module_name = "app.routes.context_routes"
    sys.modules.pop(module_name, None)
    spec = importlib.util.spec_from_file_location(module_name, CONTEXT_ROUTES_PATH)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    monkeypatch.setitem(sys.modules, module_name, module)
    spec.loader.exec_module(module)
    return module, fake_db


def _build_client(monkeypatch):
    module, fake_db = _load_module(monkeypatch)
    app = Flask(__name__)
    app.config["SECRET_KEY"] = "test-secret"
    app.instance_path = "/tmp"

    login_manager = LoginManager()
    login_manager.init_app(app)

    @dataclass
    class TestUser(UserMixin):
        id: str

    @login_manager.user_loader
    def load_user(user_id):
        return TestUser(user_id)

    app.register_blueprint(module.context_bp)
    return app.test_client(), fake_db


def _login(client, user_id="user-1"):
    with client.session_transaction() as session:
        session["_user_id"] = user_id
        session["_fresh"] = True


def test_upload_reference_updates_document_metadata_and_project_summary(monkeypatch):
    client, fake_db = _build_client(monkeypatch)
    _login(client)

    fake_db.collection("projects").document("project-1").set({
        "userId": "user-1",
        "title": "Project Uji",
    })

    response = client.post(
        "/api/upload-reference",
        data={
            "projectId": "project-1",
            "file": (io.BytesIO(b"%PDF-1.4 test"), "paper.pdf"),
        },
        content_type="multipart/form-data",
    )

    payload = response.get_json()
    documents_response = client.get("/api/projects/project-1/documents")
    documents_payload = documents_response.get_json()
    project_doc = fake_db.collection("projects").document("project-1").get().to_dict()

    assert response.status_code == 202
    assert payload["document"]["id"] == "doc-1"
    assert documents_response.status_code == 200
    assert len(documents_payload["documents"]) == 1
    assert documents_payload["documents"][0]["embedding_status"] == "ready"
    assert documents_payload["documents"][0]["chunk_count"] == 3
    assert documents_payload["documents"][0]["token_count"] == 120
    assert "Ringkasan referensi utama." in project_doc["context_summary"]
