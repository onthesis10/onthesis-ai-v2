import os
import json
import logging
import numpy as np
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

try:
    from sentence_transformers import SentenceTransformer
    embedder = SentenceTransformer('all-MiniLM-L6-v2')
    HAS_SEMANTIC = True
except ImportError:
    embedder = None
    HAS_SEMANTIC = False
    logger.warning("⚠️ Sentence-Transformers not found. RAG running in Keyword Mode.")

class RagEngine:
    """
    Retrieval Augmented Generation Engine.
    Manages document indexing and context retrieval.
    """
    
    def __init__(self, storage_path="instance/vector_store"):
        self.storage_path = storage_path
        if not os.path.exists(self.storage_path):
            os.makedirs(self.storage_path)

    def _get_embedding(self, text: str) -> List[float]:
        if HAS_SEMANTIC and embedder:
            return embedder.encode(text, convert_to_numpy=True).tolist()
        return []

    def _cosine_similarity(self, vec_a, vec_b):
        if not vec_a or not vec_b: return 0.0
        return np.dot(vec_a, vec_b) / (np.linalg.norm(vec_a) * np.linalg.norm(vec_b))

    def retrieve(self, query: str, user_id: str, k: int = 5) -> List[Dict]:
        """
        Retrieves relevant context chunks for a given query.
        """
        all_chunks = []
        user_files = [f for f in os.listdir(self.storage_path) if f.startswith(f"{user_id}_")]
        
        for filename in user_files:
            try:
                with open(os.path.join(self.storage_path, filename), 'r') as f:
                    all_chunks.extend(json.load(f))
            except Exception:
                continue

        if not all_chunks:
            return []

        scored_chunks = []
        
        # Semantic Search
        if HAS_SEMANTIC:
            query_vec = self._get_embedding(query)
            for chunk in all_chunks:
                if 'vector' in chunk:
                    score = self._cosine_similarity(query_vec, chunk['vector'])
                    if score > 0.25:
                        scored_chunks.append((score, chunk))
        
        # Keyword Fallback (if semantic results are low)
        if len(scored_chunks) < k:
            query_words = set(query.lower().split())
            for chunk in all_chunks:
                chunk_words = set(chunk.get('content', '').lower().split())
                score = len(query_words.intersection(chunk_words)) / len(query_words) if query_words else 0
                if score > 0.1:
                    scored_chunks.append((score * 0.5, chunk)) # Penalty for keyword match

        # Sort and return top-k
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        return [chunk for _, chunk in scored_chunks[:k]]

    def index_document(self, doc_id: str, user_id: str, content: str, metadata: Dict = None):
        """
        Indexes a document text (simple chunking).
        """
        # Simple splitting by paragraphs
        paragraphs = [p.strip() for p in content.split('\n\n') if len(p.strip()) > 50]
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
            
        # Save to file
        filename = os.path.join(self.storage_path, f"{user_id}_{doc_id}.json")
        with open(filename, 'w') as f:
            json.dump(chunks, f)
        
        return len(chunks)
