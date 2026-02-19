# File: app/utils/graph_utils.py
import numpy as np
import logging
# Kita reuse engine yang ada di rag_service biar hemat memori
from app.services.rag_service import LiteContextEngine

logger = logging.getLogger(__name__)

rag_engine = LiteContextEngine()

def calculate_cosine_similarity(vec_a, vec_b):
    try:
        if not vec_a or not vec_b: return 0.0
        a = np.array(vec_a)
        b = np.array(vec_b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0: return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))
    except Exception as e:
        logger.error(f"Math Error: {e}")
        return 0.0

def build_citation_network(papers, threshold=0.4):
    """
    Membangun graph ala Connected Papers.
    """
    nodes = []
    links = []
    embeddings = []

    # 1. PREPARE NODES
    for i, paper in enumerate(papers):
        year = paper.get('year')
        try:
            year_int = int(year)
        except:
            year_int = 0

        # Tentukan Ukuran Node (Basis Awal)
        # Paper baru dikasih boost dikit biar gak tenggelam
        val = 15 if year_int >= 2023 else 10 
        
        nodes.append({
            "id": paper.get('id') or str(i), 
            "title": paper.get('title', 'No Title'),
            "year": year_int,
            "authors": paper.get('author', 'Unknown'), # Pastikan key 'author' sesuai hasil search
            "journal": paper.get('journal', 'Unknown Source'),
            "abstract": paper.get('abstract', '')[:300] + "...",
            "val": val, 
            "group": "recent" if year_int >= 2023 else "background",
            "similarity_score": 0 # Nanti diisi
        })

        # Embedding untuk hitung jarak
        text_content = f"{paper.get('title')} {paper.get('abstract', '')}"
        embeddings.append(rag_engine._get_embedding(text_content))

    # 2. GENERATE LINKS & CLUSTERING
    count = len(papers)
    for i in range(count):
        for j in range(i + 1, count):
            sim_score = calculate_cosine_similarity(embeddings[i], embeddings[j])
            
            # Connected Papers Logic:
            # Hanya hubungkan yang kemiripannya KUAT agar terbentuk cluster jelas
            if sim_score > threshold:
                links.append({
                    "source": nodes[i]['id'],
                    "target": nodes[j]['id'],
                    "value": sim_score, # Ketebalan garis
                })
                
                # Boost ukuran node yang punya banyak koneksi (Central Paper)
                nodes[i]['val'] += sim_score * 2
                nodes[j]['val'] += sim_score * 2

    return {
        "nodes": nodes,
        "links": links
    }