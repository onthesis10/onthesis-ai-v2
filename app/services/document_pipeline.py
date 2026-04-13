import os
import uuid
from datetime import timedelta
from typing import Any, Dict

from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename


def _build_storage_path(user_id: str, project_id: str, doc_id: str, filename: str) -> str:
    safe_name = secure_filename(filename or "document.pdf") or "document.pdf"
    return f"projects/{user_id}/{project_id}/documents/{doc_id}/{safe_name}"


def save_upload_locally(file_storage: FileStorage, instance_path: str, storage_path: str) -> str:
    local_root = os.path.join(instance_path, "uploads")
    local_path = os.path.join(local_root, storage_path)
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    file_storage.stream.seek(0)
    file_storage.save(local_path)
    file_storage.stream.seek(0)
    return local_path


def upload_to_firebase_storage(file_storage: FileStorage, storage_path: str) -> Dict[str, Any]:
    bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET")
    if not bucket_name:
        return {
            "storage_backend": "local",
            "storage_path": storage_path,
            "file_url": "",
        }

    from firebase_admin import storage

    bucket = storage.bucket(bucket_name)
    blob = bucket.blob(storage_path)
    file_storage.stream.seek(0)
    blob.upload_from_file(
        file_storage.stream,
        content_type=file_storage.mimetype or "application/pdf",
        rewind=True,
    )

    file_url = ""
    try:
        file_url = blob.generate_signed_url(
            expiration=timedelta(days=7),
            method="GET",
            version="v4",
        )
    except Exception:
        try:
            blob.make_public()
            file_url = blob.public_url
        except Exception:
            file_url = ""

    file_storage.stream.seek(0)
    return {
        "storage_backend": "firebase_storage",
        "storage_path": storage_path,
        "file_url": file_url,
    }


def prepare_document_upload(file_storage: FileStorage, user_id: str, project_id: str, instance_path: str) -> Dict[str, Any]:
    doc_id = uuid.uuid4().hex
    filename = secure_filename(file_storage.filename or "document.pdf") or "document.pdf"
    storage_path = _build_storage_path(user_id, project_id, doc_id, filename)
    local_path = save_upload_locally(file_storage, instance_path, storage_path)
    storage_meta = upload_to_firebase_storage(file_storage, storage_path)

    return {
        "doc_id": doc_id,
        "filename": filename,
        "content_type": file_storage.mimetype or "application/pdf",
        "byte_size": int(file_storage.content_length or os.path.getsize(local_path)),
        "local_path": local_path,
        **storage_meta,
    }
