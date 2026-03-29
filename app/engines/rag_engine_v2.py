# File: app/engines/rag_engine_v2.py
# Deskripsi: RAG Pipeline v2 — ChromaDB-based vector search for thesis references.
# Supports 3 retrieval modes: Claim (Bab 1,4,5), Theory (Bab 2), Method (Bab 3).

import os
import re
import logging
import hashlib
from typing import List, Dict, Any, Optional, Literal

logger = logging.getLogger(__name__)

# ==============================================================================
# ChromaDB Setup (Lazy Init)
# ==============================================================================

_chroma_client = None
_collection_cache = {}


def _get_chroma_client():
    """Lazy-init ChromaDB client with persistent storage."""
    global _chroma_client
    if _chroma_client is None:
        try:
            import chromadb
            persist_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'chroma_data')
            os.makedirs(persist_dir, exist_ok=True)
            _chroma_client = chromadb.PersistentClient(path=persist_dir)
            logger.info(f"✅ ChromaDB initialized at {persist_dir}")
        except ImportError:
            logger.warning("⚠️ chromadb not installed, RAG will use fallback keyword search")
            return None
    return _chroma_client


def _get_collection(project_id: str):
    """Get or create a ChromaDB collection for a project's references."""
    if project_id in _collection_cache:
        return _collection_cache[project_id]

    client = _get_chroma_client()
    if client is None:
        return None

    collection_name = f"thesis_refs_{hashlib.md5(project_id.encode()).hexdigest()[:12]}"
    collection = client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"}
    )
    _collection_cache[project_id] = collection
    return collection


# ==============================================================================
# PDF / TEXT CHUNKING
# ==============================================================================

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> List[str]:
    """Split text into overlapping chunks for embedding."""
    if not text or len(text) < 50:
        return [text] if text else []

    words = text.split()
    chunks = []
    start = 0

    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        if len(chunk.strip()) > 20:
            chunks.append(chunk.strip())
        start += chunk_size - overlap

    return chunks


def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from a PDF file using PyMuPDF (fitz)."""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        # Fallback to PyPDF2
        try:
            import PyPDF2
            with open(pdf_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                text = ""
                for page in reader.pages:
                    text += page.extract_text() or ""
                return text
        except Exception as e2:
            logger.error(f"PyPDF2 fallback also failed: {e2}")
            return ""


# ==============================================================================
# INDEXING: Add References to Vector Store
# ==============================================================================

def index_reference(project_id: str, ref_data: Dict[str, Any], text_content: str = "") -> bool:
    """
    Index a single reference into the project's vector store.
    ref_data: {id, title, author, year, abstract, ...}
    text_content: full text content (from PDF parsing if available)
    """
    collection = _get_collection(project_id)
    if collection is None:
        logger.warning("ChromaDB not available, skipping index")
        return False

    ref_id = ref_data.get("id", "")
    if not ref_id:
        return False

    # Build text to index: title + abstract + full content
    title = ref_data.get("title", "")
    author = ref_data.get("author", "")
    year = ref_data.get("year", "")
    abstract = ref_data.get("abstract", "")

    full_text = f"{title}\n{author} ({year})\n{abstract}\n{text_content}"

    # Chunk the text
    chunks = chunk_text(full_text)
    if not chunks:
        chunks = [f"{title} by {author} ({year}). {abstract}"]

    # Add each chunk with metadata
    ids = []
    documents = []
    metadatas = []

    for i, chunk in enumerate(chunks):
        chunk_id = f"{ref_id}_chunk_{i}"
        ids.append(chunk_id)
        documents.append(chunk)
        metadatas.append({
            "ref_id": ref_id,
            "title": title[:200],
            "author": author[:100],
            "year": str(year),
            "chunk_index": i,
            "total_chunks": len(chunks),
            # Tag content type for mode-specific retrieval
            "content_type": _classify_content(chunk),
        })

    try:
        # Upsert (add or update)
        collection.upsert(
            ids=ids,
            documents=documents,
            metadatas=metadatas,
        )
        logger.info(f"📚 Indexed ref '{title[:50]}' → {len(chunks)} chunks")
        return True
    except Exception as e:
        logger.error(f"Index error: {e}")
        return False


def index_all_references(project_id: str, user_id: str) -> int:
    """
    Index all references for a project from Firestore citations.
    Returns count of successfully indexed refs.
    """
    from app import firestore_db

    refs_query = firestore_db.collection("citations")\
        .where("projectId", "==", project_id).stream()

    count = 0
    for ref_doc in refs_query:
        ref_data = ref_doc.to_dict()
        ref_data["id"] = ref_doc.id

        # If there's a PDF URL, try to get its content
        text_content = ref_data.get("full_text", "")

        if index_reference(project_id, ref_data, text_content):
            count += 1

    logger.info(f"📚 Indexed {count} references for project {project_id}")
    return count


def _classify_content(text: str) -> str:
    """Classify a chunk as claim, theory, or method content."""
    text_lower = text.lower()

    theory_keywords = [
        "teori", "theory", "konsep", "concept", "framework", "kerangka",
        "paradigma", "paradigm", "model", "perspektif", "pendekatan teori",
        "menurut", "menyatakan bahwa", "mendefinisikan"
    ]

    method_keywords = [
        "metode", "method", "teknik", "technique", "sampel", "sample",
        "populasi", "population", "instrumen", "instrument", "validitas",
        "reliabilitas", "analisis data", "data analysis", "regresi",
        "regression", "korelasi", "correlation", "kuesioner", "wawancara"
    ]

    theory_score = sum(1 for kw in theory_keywords if kw in text_lower)
    method_score = sum(1 for kw in method_keywords if kw in text_lower)

    if theory_score > method_score and theory_score >= 2:
        return "theory"
    elif method_score > theory_score and method_score >= 2:
        return "method"
    return "claim"


# ==============================================================================
# RETRIEVAL: 3-Mode RAG Search
# ==============================================================================

RAGMode = Literal["claim", "theory", "method"]


def retrieve(
    project_id: str,
    query: str,
    mode: RAGMode = "claim",
    n_results: int = 5,
    chapter: str = ""
) -> List[Dict[str, Any]]:
    """
    3-Mode RAG retrieval:
    - claim: General factual retrieval (Bab 1, 4, 5)
    - theory: Filter for theory/framework chunks (Bab 2)
    - method: Filter for methodology chunks (Bab 3)
    """
    collection = _get_collection(project_id)

    # Fallback to keyword search if ChromaDB unavailable
    if collection is None:
        return _fallback_keyword_search(project_id, query, n_results)

    # Build where filter for mode-specific retrieval
    where_filter = None
    if mode == "theory":
        where_filter = {"content_type": "theory"}
    elif mode == "method":
        where_filter = {"content_type": "method"}

    try:
        results = collection.query(
            query_texts=[query],
            n_results=n_results,
            where=where_filter,
        )

        # Format results
        formatted = []
        seen_refs = set()

        if results and results.get("documents"):
            for i, doc in enumerate(results["documents"][0]):
                meta = results["metadatas"][0][i] if results.get("metadatas") else {}
                distance = results["distances"][0][i] if results.get("distances") else 0

                ref_id = meta.get("ref_id", "")

                # Deduplicate by ref_id (keep best chunk)
                if ref_id in seen_refs:
                    continue
                seen_refs.add(ref_id)

                formatted.append({
                    "ref_id": ref_id,
                    "title": meta.get("title", ""),
                    "author": meta.get("author", ""),
                    "year": meta.get("year", ""),
                    "content": doc[:500],
                    "relevance": round(1 - distance, 3) if distance else 0,
                    "content_type": meta.get("content_type", "claim"),
                })

        return formatted

    except Exception as e:
        logger.error(f"RAG retrieve error: {e}")
        return _fallback_keyword_search(project_id, query, n_results)


def _fallback_keyword_search(
    project_id: str, query: str, n_results: int = 5
) -> List[Dict[str, Any]]:
    """Fallback keyword search when ChromaDB is unavailable."""
    from app import firestore_db

    try:
        refs = firestore_db.collection("citations")\
            .where("projectId", "==", project_id).stream()

        results = []
        query_words = set(query.lower().split())

        for ref_doc in refs:
            ref_data = ref_doc.to_dict()
            title = (ref_data.get("title") or "").lower()
            abstract = (ref_data.get("abstract") or "").lower()
            author = (ref_data.get("author") or "").lower()

            # Simple relevance scoring
            combined = f"{title} {abstract} {author}"
            score = sum(1 for w in query_words if w in combined)

            if score > 0:
                results.append({
                    "ref_id": ref_doc.id,
                    "title": ref_data.get("title", ""),
                    "author": ref_data.get("author", ""),
                    "year": ref_data.get("year", ""),
                    "content": abstract[:500] if abstract else title,
                    "relevance": score / max(len(query_words), 1),
                    "content_type": "claim",
                })

        results.sort(key=lambda x: x["relevance"], reverse=True)
        return results[:n_results]

    except Exception as e:
        logger.error(f"Fallback search error: {e}")
        return []


# ==============================================================================
# CHAPTER-AWARE RETRIEVAL
# ==============================================================================

def retrieve_for_chapter(
    project_id: str,
    query: str,
    chapter: str,
    n_results: int = 5,
) -> List[Dict[str, Any]]:
    """
    Auto-select RAG mode based on chapter:
    - Bab 1, 4, 5 → claim mode
    - Bab 2 → theory mode
    - Bab 3 → method mode
    """
    CHAPTER_MODE_MAP = {
        "bab1": "claim",
        "bab2": "theory",
        "bab3": "method",
        "bab4": "claim",
        "bab5": "claim",
    }
    mode = CHAPTER_MODE_MAP.get(chapter, "claim")
    return retrieve(project_id, query, mode=mode, n_results=n_results, chapter=chapter)


# ==============================================================================
# BUILD RAG CONTEXT FOR PROMPT
# ==============================================================================

def build_rag_context_prompt(
    project_id: str,
    query: str,
    chapter: str,
    n_results: int = 5,
) -> str:
    """
    Build a formatted RAG context block for injection into AI prompts.
    Returns a string ready to add to the system prompt.
    """
    results = retrieve_for_chapter(project_id, query, chapter, n_results)

    if not results:
        return ""

    lines = ["[REFERENSI RELEVAN dari database user]"]
    for i, r in enumerate(results, 1):
        author = r.get("author", "Anonim")
        year = r.get("year", "n.d.")
        title = r.get("title", "Tanpa Judul")
        content = r.get("content", "")[:300]
        relevance = r.get("relevance", 0)

        lines.append(f"  [{i}] {author} ({year}). \"{title}\"")
        if content:
            lines.append(f"      Kutipan: {content}")
        lines.append(f"      Relevansi: {relevance:.0%}")

    lines.append("")
    lines.append("ATURAN SITASI:")
    lines.append("- Gunakan HANYA referensi dari daftar di atas.")
    lines.append("- Jika klaim tidak bisa di-backup oleh referensi di atas, tulis: [BUTUH REFERENSI: topik]")
    lines.append("- JANGAN mengarang referensi yang tidak ada di daftar.")

    return "\n".join(lines)


# ==============================================================================
# CITATION ENFORCER (Post-Generation)
# ==============================================================================

def validate_citations(generated_text: str, project_id: str) -> Dict[str, Any]:
    """
    Post-generation citation validation:
    1. Extract all citations from text (Author, Year)
    2. Check each against reference pool
    3. Flag phantom citations (AI-invented)
    4. Flag ungrounded claims (no citation)
    """
    from app import firestore_db

    # 1. Extract citations from text: (Author, Year) pattern
    citation_pattern = r'\(([A-Z][a-zA-Z\s&.,]+),?\s*(\d{4})\)'
    found_citations = re.findall(citation_pattern, generated_text)

    # 2. Load reference pool
    refs = firestore_db.collection("citations")\
        .where("projectId", "==", project_id).stream()

    ref_pool = {}
    for ref_doc in refs:
        ref_data = ref_doc.to_dict()
        author = (ref_data.get("author") or "").lower()
        year = str(ref_data.get("year", ""))
        key = f"{author}_{year}"
        ref_pool[key] = {
            "id": ref_doc.id,
            "title": ref_data.get("title", ""),
            "author": ref_data.get("author", ""),
            "year": year,
        }

    # 3. Check each citation
    verified = []
    phantom = []

    for author, year in found_citations:
        author_clean = author.strip().lower()
        key = f"{author_clean}_{year}"

        # Loose matching: check if any ref matches
        matched = False
        for pool_key, pool_ref in ref_pool.items():
            pool_author = pool_ref["author"].lower()
            if (author_clean in pool_author or pool_author in author_clean) and year == pool_ref["year"]:
                verified.append({
                    "citation": f"({author.strip()}, {year})",
                    "matched_ref": pool_ref,
                })
                matched = True
                break

        if not matched:
            phantom.append({
                "citation": f"({author.strip()}, {year})",
                "reason": "Referensi ini TIDAK ADA di database user. Kemungkinan halusinasi AI."
            })

    # 4. Check for [BUTUH REFERENSI] flags
    ungrounded = re.findall(r'\[BUTUH REFERENSI:\s*([^\]]+)\]', generated_text)

    return {
        "total_citations": len(found_citations),
        "verified": verified,
        "phantom_citations": phantom,
        "ungrounded_claims": ungrounded,
        "integrity_score": len(verified) / max(len(found_citations), 1) if found_citations else 1.0,
    }


# ==============================================================================
# DELETE REFERENCE FROM INDEX
# ==============================================================================

def remove_reference(project_id: str, ref_id: str) -> bool:
    """Remove a reference's chunks from the vector store."""
    collection = _get_collection(project_id)
    if collection is None:
        return False

    try:
        # Delete all chunks for this ref
        collection.delete(
            where={"ref_id": ref_id}
        )
        logger.info(f"🗑️ Removed ref {ref_id} from index")
        return True
    except Exception as e:
        logger.error(f"Remove ref error: {e}")
        return False
