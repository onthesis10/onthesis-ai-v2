import os
import json
import logging
import re
import numpy as np
from typing import List, Dict, Tuple

logger = logging.getLogger(__name__)

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None
    logger.warning("Sentence-Transformers not found. RAG running in Keyword Mode.")

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
            logger.warning("Semantic embedder disabled under gevent to avoid concurrent.futures LoopExit. RAG stays in Keyword Mode.")
            _gevent_warning_emitted = True
        return None

    if _embedder_load_attempted:
        return None

    _embedder_load_attempted = True

    if SentenceTransformer is None:
        return None

    try:
        embedder = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("Semantic embedder loaded successfully.")
        return embedder
    except Exception as exc:
        logger.warning(f"Semantic embedder failed to load. RAG stays in Keyword Mode: {exc}")
        return None



class RagEngine:
    """
    Retrieval engine with rerank, metadata filters, diversity scoring,
    and confidence output for academic context retrieval.
    """

    def __init__(self, storage_path="instance/vector_store"):
        self.storage_path = storage_path
        if not os.path.exists(self.storage_path):
            os.makedirs(self.storage_path)

    def _get_embedding(self, text: str) -> List[float]:
        active_embedder = _get_embedder()
        if active_embedder:
            return active_embedder.encode(text, convert_to_numpy=True).tolist()
        return []

    def _cosine_similarity(self, vec_a, vec_b):
        if not vec_a or not vec_b:
            return 0.0
        norm_a = np.linalg.norm(vec_a)
        norm_b = np.linalg.norm(vec_b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(vec_a, vec_b) / (norm_a * norm_b))

    def _load_user_chunks(self, user_id: str) -> List[Dict]:
        all_chunks = []
        user_files = [f for f in os.listdir(self.storage_path) if f.startswith(f"{user_id}_")]
        for filename in user_files:
            try:
                with open(os.path.join(self.storage_path, filename), "r", encoding="utf-8") as f:
                    all_chunks.extend(json.load(f))
            except Exception:
                continue
        return all_chunks

    def _keyword_score(self, query: str, content: str) -> float:
        query_words = set(re.findall(r"\w+", query.lower()))
        if not query_words:
            return 0.0
        chunk_words = set(re.findall(r"\w+", (content or '').lower()))
        return len(query_words.intersection(chunk_words)) / len(query_words)

    def _apply_diversity(self, scored: List[Tuple[float, Dict]], limit: int) -> List[Tuple[float, Dict]]:
        selected = []
        seen_docs = set()
        for score, chunk in scored:
            doc_id = chunk.get("doc_id")
            if doc_id and doc_id not in seen_docs:
                selected.append((score, chunk))
                seen_docs.add(doc_id)
            if len(selected) >= limit:
                return selected
        # fill remaining if needed
        for item in scored:
            if item not in selected:
                selected.append(item)
            if len(selected) >= limit:
                break
        return selected

    def retrieve_with_confidence(self, query: str, user_id: str, k: int = 5, threshold: float = 0.2, chapter: str = None) -> Dict[str, object]:
        all_chunks = self._load_user_chunks(user_id)
        if chapter:
            all_chunks = [c for c in all_chunks if str(c.get('metadata', {}).get('chapter', '')).lower() == chapter.lower()]
        if not all_chunks:
            return {"documents": [], "confidence": 0.0}

        scored_chunks = []
        query_vec = self._get_embedding(query) if _get_embedder() else []

        for chunk in all_chunks:
            semantic = self._cosine_similarity(query_vec, chunk.get('vector', [])) if query_vec else 0.0
            keyword = self._keyword_score(query, chunk.get('content', ''))
            score = max(semantic, keyword * 0.6)
            if score >= threshold:
                scored_chunks.append((score, chunk))

        # fallback to top candidates even if below threshold
        if not scored_chunks:
            for chunk in all_chunks:
                score = self._keyword_score(query, chunk.get('content', '')) * 0.4
                if score > 0:
                    scored_chunks.append((score, chunk))

        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        top20 = scored_chunks[:20]
        reranked = self._apply_diversity(top20, k)

        confidences = [s for s, _ in reranked]
        confidence = sum(confidences) / len(confidences) if confidences else 0.0
        confidence = max(0.0, min(1.0, confidence))

        docs = []
        for score, chunk in reranked:
            payload = dict(chunk)
            payload["retrieval_score"] = round(score, 4)
            docs.append(payload)

        return {"documents": docs, "confidence": round(confidence, 4)}

    def retrieve(self, query: str, user_id: str, k: int = 5) -> List[Dict]:
        return self.retrieve_with_confidence(query=query, user_id=user_id, k=k)["documents"]

    def index_document(self, doc_id: str, user_id: str, content: str, metadata: Dict = None):
        """Indexes a document using paragraph-level chunking."""
        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", content) if len(p.strip()) > 50]
        chunks = []
        for p in paragraphs:
            vector = self._get_embedding(p)
            chunks.append({
                "content": p,
                "vector": vector,
                "doc_id": doc_id,
                "user_id": user_id,
                "metadata": metadata or {}
            })

        filename = os.path.join(self.storage_path, f"{user_id}_{doc_id}.json")
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(chunks, f)
        return len(chunks)
