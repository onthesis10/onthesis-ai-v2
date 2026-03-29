# app/services/rag_service.py

import os
import json
import logging
import re
import numpy as np
from typing import List, Dict

# Library PDF
try:
    from pypdf import PdfReader
except ImportError:
    logging.warning("Library pypdf belum terinstall. Install dengan 'pip install pypdf'")
    PdfReader = None

# --- [UPGRADE] Semantic Core ---
try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None

embedder = None
_embedder_load_attempted = False
_gevent_warning_emitted = False


def _is_gevent_runtime() -> bool:
    try:
        from gevent import monkey
        return monkey.is_module_patched("socket")
    except Exception:
        return False


def _get_embedder():
    global embedder, _embedder_load_attempted, _gevent_warning_emitted

    if embedder is not None:
        return embedder

    if _is_gevent_runtime():
        if not _gevent_warning_emitted:
            logging.warning(
                "Semantic Engine disabled under gevent to avoid concurrent.futures LoopExit. Falling back to keyword mode."
            )
            _gevent_warning_emitted = True
        return None

    if _embedder_load_attempted:
        return None

    _embedder_load_attempted = True

    if SentenceTransformer is None:
        logging.warning(
            "Sentence-Transformers tidak ditemukan. Mode Semantic non-aktif. Install dengan 'pip install sentence-transformers'"
        )
        return None

    try:
        embedder = SentenceTransformer("all-MiniLM-L6-v2")
        logging.info("Semantic Engine (Sentence-Transformers) berhasil dimuat.")
        return embedder
    except Exception as exc:
        logging.warning(f"Semantic Engine gagal dimuat. Fallback ke keyword mode: {exc}")
        return None


class LiteContextEngine:
    """
    Versi 'Pro' untuk RAG Engine.
    Menggunakan Hybrid Search:
    1. Semantic Search (Vektor) -> Memahami makna (Dampak Finansial ~= Kerugian Ekonomi).
    2. Fallback ke Keyword Matching jika model gagal load.
    """

    def __init__(self, storage_path="instance/vector_store"):
        self.storage_path = storage_path
        if not os.path.exists(self.storage_path):
            os.makedirs(self.storage_path)

    def _get_embedding(self, text: str):
        """Mengubah teks menjadi vektor angka (List of Floats)."""
        active_embedder = _get_embedder()
        if active_embedder:
            return active_embedder.encode(text, convert_to_numpy=True).tolist()
        return []

    def _cosine_similarity(self, vec_a, vec_b):
        """Menghitung kemiripan sudut antara dua vektor."""
        if not vec_a or not vec_b:
            return 0.0

        a = np.array(vec_a)
        b = np.array(vec_b)
        dot_product = np.dot(a, b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)

        if norm_a == 0 or norm_b == 0:
            return 0.0

        return dot_product / (norm_a * norm_b)

    def process_document(self, file_path: str, doc_id: str, user_id: str):
        """
        Membaca PDF, memecahnya jadi chunks, DAN menghitung vektornya.
        """
        if PdfReader is None:
            return {"status": "error", "message": "pypdf is not installed"}

        try:
            reader = PdfReader(file_path)
            chunks = []

            full_text = ""
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    full_text += text + "\n"

            raw_parts = re.split(r"\n\s*\n", full_text)

            for part in raw_parts:
                cleaned_text = part.strip()
                if len(cleaned_text) > 50:
                    vector = self._get_embedding(cleaned_text)
                    chunks.append(
                        {
                            "content": cleaned_text,
                            "vector": vector,
                            "source": os.path.basename(file_path),
                            "doc_id": doc_id,
                            "user_id": user_id,
                        }
                    )

            storage_file = os.path.join(self.storage_path, f"{user_id}_{doc_id}.json")
            with open(storage_file, "w", encoding="utf-8") as f:
                json.dump(chunks, f)

            return {"status": "success", "chunks_count": len(chunks)}

        except Exception as e:
            logging.error(f"Error processing document: {e}")
            return {"status": "error", "message": str(e)}

    def search_context(self, query: str, user_id: str, k: int = 4) -> List[Dict]:
        """
        Mencari potongan teks paling relevan menggunakan Semantic Search.
        """
        try:
            all_chunks = []
            user_files = [f for f in os.listdir(self.storage_path) if f.startswith(f"{user_id}_")]

            if not user_files:
                return []

            for filename in user_files:
                try:
                    with open(os.path.join(self.storage_path, filename), "r", encoding="utf-8") as f:
                        all_chunks.extend(json.load(f))
                except Exception as load_err:
                    logging.error(f"Gagal load chunk {filename}: {load_err}")
                    continue

            if not all_chunks:
                return []

            scored_chunks = []
            has_semantic = _get_embedder() is not None

            if has_semantic:
                query_vector = self._get_embedding(query)
                for chunk in all_chunks:
                    if chunk.get("vector"):
                        score = self._cosine_similarity(query_vector, chunk["vector"])
                        if score > 0.25:
                            scored_chunks.append((score, chunk))

            if len(scored_chunks) < k:
                query_words = set(query.lower().split())
                for chunk in all_chunks:
                    chunk_words = set(chunk.get("content", "").lower().split())
                    intersect = query_words.intersection(chunk_words)
                    score = len(intersect) / len(query_words) if query_words else 0
                    if score > 0.1 and not any(c["content"] == chunk["content"] for _, c in scored_chunks):
                        scored_chunks.append((score * 0.5, chunk))

            scored_chunks.sort(key=lambda x: x[0], reverse=True)

            results = []
            for score, chunk in scored_chunks[:k]:
                clean_chunk = chunk.copy()
                clean_chunk.pop("vector", None)
                results.append(clean_chunk)

            return results

        except Exception as e:
            logging.error(f"Error searching context: {e}")
            return []
