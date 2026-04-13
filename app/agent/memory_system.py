import time
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional, TYPE_CHECKING
import os
import json
import redis
from contextlib import suppress
import logging
import uuid
import hashlib

logger = logging.getLogger(__name__)

redis_url = os.environ.get("REDIS_URL")
redis_client = redis.from_url(redis_url) if redis_url else None

from .task_planner import TaskPlan

if TYPE_CHECKING:
    from .research_agent import StoredPaper

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
import google.generativeai as genai

# --- QDRANT VECTOR DB & EMBEDDING ---

VECTOR_COLLECTION_ALIASES = {
    "research_papers": "research_papers_v2",
    "thesis_chunks": "thesis_chunks_v2",
    "thesis_summaries": "thesis_summaries_v2",
}

def embed(text: str) -> List[float]:
    """Generate embeddings using Gemini text-embedding-004 (3072 dimensions) with caching"""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("WARNING: GEMINI_API_KEY is missing. Returning zero vector.")
        return [0.0] * 3072
        
    import hashlib
    text_hash = hashlib.md5(text.encode('utf-8')).hexdigest()
    cache_key = f"embed_cache:{text_hash}"
    
    if redis_client:
        with suppress(Exception):
            cached = redis_client.get(cache_key)
            if cached:
                return json.loads(cached)
    
    try:
        genai.configure(api_key=api_key)
        response = genai.embed_content(
            model="models/gemini-embedding-001",
            content=text
        )
        vec = response['embedding']
        
        if redis_client:
            with suppress(Exception):
                redis_client.setex(cache_key, 86400, json.dumps(vec))
                
        return vec
    except Exception as e:
        print(f"Embedding error: {e}")
        raise e

class QdrantVectorDB:
    def __init__(self):
        url = os.environ.get("QDRANT_URL")
        api_key = os.environ.get("QDRANT_API_KEY")
        
        if not url or not api_key:
            logger.info("Qdrant key belum di set, defaulting to in-memory")
            self.client = QdrantClient(":memory:")
        else:
            try:
                # Set timeout to 60s to handle cloud latency
                self.client = QdrantClient(url=url, api_key=api_key, timeout=60)
            except Exception as e:
                print(f"Failed to connect to Qdrant Cloud: {e}. Falling back to local in-memory.")
                self.client = QdrantClient(":memory:")
            
        self._ensure_collections()

    def _resolve_collection_name(self, collection: str) -> str:
        return VECTOR_COLLECTION_ALIASES.get(collection, collection)
        
    def _ensure_collections(self):
        collections = ["research_papers", "thesis_chunks", "thesis_summaries"]
        for logical_collection in collections:
            col = self._resolve_collection_name(logical_collection)
            # Note: During testing, we ensure that the dimensions match 3072.
            if self.client.collection_exists(col):
                info = self.client.get_collection(col)
                if info.config.params.vectors.size != 3072:
                    print(f"Collection {col} has wrong dimension, recreating...")
                    self.client.delete_collection(col)
                    self.client.create_collection(
                        collection_name=col,
                        vectors_config=VectorParams(size=3072, distance=Distance.COSINE),
                    )
            else:
                self.client.create_collection(
                    collection_name=col,
                    vectors_config=VectorParams(size=3072, distance=Distance.COSINE),
                )
            
            for field_name, field_schema in (
                ("doc_id", "keyword"),
                ("paper_id", "keyword"),
                ("scope_id", "keyword"),
                ("user_id", "keyword"),
                ("project_id", "keyword"),
                ("chapter_id", "keyword"),
            ):
                try:
                    self.client.create_payload_index(
                        collection_name=col,
                        field_name=field_name,
                        field_schema=field_schema,
                    )
                except Exception:
                    pass  # Already exists or transient error
            
            if logical_collection == "thesis_chunks":
                try:
                    self.client.create_payload_index(
                        collection_name=col,
                        field_name="section",
                        field_schema="keyword",
                    )
                except Exception:
                    pass
                # S1-1: Ensure chunk_index index for ordering
                try:
                    self.client.create_payload_index(
                        collection_name=col,
                        field_name="chunk_index",
                        field_schema="integer",
                    )
                except Exception:
                    pass

    def upsert(self, collection: str, points: List[Dict]):
        collection = self._resolve_collection_name(collection)
        qdrant_points = []
        for p in points:
            point_id = p["id"]
            if isinstance(point_id, str):
                try:
                    uuid.UUID(point_id)
                except ValueError:
                    point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, point_id))
                    
            qdrant_points.append(PointStruct(
                id=point_id,
                vector=p["vector"],
                payload=p.get("payload", {})
            ))
        self.client.upsert(collection_name=collection, points=qdrant_points)

    def search(self, collection: str, query_vector: List[float], filter: dict = None, score_threshold: float = None, limit: int = 10):
        collection = self._resolve_collection_name(collection)
        qdrant_filter = None
        if filter:
            must_conditions = [FieldCondition(key=k, match=MatchValue(value=v)) for k, v in filter.items()]
            qdrant_filter = Filter(must=must_conditions)
            
        res = self.client.query_points(
            collection_name=collection,
            query=query_vector,
            query_filter=qdrant_filter,
            limit=limit,
            score_threshold=score_threshold
        )
        return res.points

    def scroll(self, collection: str, scroll_filter: dict, order_by: str, limit: int):
        collection = self._resolve_collection_name(collection)
        qdrant_filter = None
        if scroll_filter:
            must_conditions = [FieldCondition(key=k, match=MatchValue(value=v)) for k, v in scroll_filter.items()]
            qdrant_filter = Filter(must=must_conditions)
            
        records, next_page = self.client.scroll(
            collection_name=collection,
            scroll_filter=qdrant_filter,
            limit=limit,
            with_payload=True
        )
        return records

class InMemoryProfileStore:
    """In-memory mock DB untuk test environment. Formerly DummyDocumentDB."""
    def save(self, profile):
        pass

    def load_profile(self, user_id: str):
        return None

    def save_plan(self, scope_id: str, plan: TaskPlan):
        return None

    def get_recent_plans(self, user_id: str, project_id: str, limit: int = 5):
        return []


# Backward compatibility alias
DummyDocumentDB = InMemoryProfileStore


class FirestoreDocumentDB:
    """Persistence backend untuk profile user dan trace plan agent."""

    def _get_firestore(self):
        try:
            from app import firestore_db
            return firestore_db
        except Exception as exc:
            logger.warning(f"FirestoreDocumentDB unavailable: {exc}")
            return None

    def save(self, profile):
        db = self._get_firestore()
        if not db or not profile:
            return
        try:
            payload = asdict(profile)
            payload["last_active"] = profile.last_active.isoformat()
            db.collection("agent_user_profiles").document(str(profile.user_id)).set(payload, merge=True)
        except Exception as exc:
            logger.warning(f"Failed to persist agent user profile: {exc}")

    def load_profile(self, user_id: str):
        db = self._get_firestore()
        if not db:
            return None
        try:
            doc = db.collection("agent_user_profiles").document(str(user_id)).get()
            if not doc.exists:
                return None
            data = doc.to_dict() or {}
            if data.get("last_active"):
                data["last_active"] = datetime.fromisoformat(data["last_active"])
            return data
        except Exception as exc:
            logger.warning(f"Failed to load agent user profile: {exc}")
            return None

    def save_plan(self, scope_id: str, plan: TaskPlan):
        db = self._get_firestore()
        if not db or not plan:
            return
        try:
            user_id, project_id = (scope_id.split(":", 1) + [""])[:2]
            payload = {
                "scope_id": scope_id,
                "user_id": user_id,
                "project_id": project_id,
                "plan_id": plan.plan_id,
                "user_query": plan.user_query,
                "intent": plan.intent,
                "estimated_tokens": plan.estimated_tokens,
                "status": plan.status,
                "created_at": plan.created_at.isoformat() if isinstance(plan.created_at, datetime) else str(plan.created_at),
                "saved_at": datetime.now().isoformat(),
                "steps": [
                    {
                        "step_id": step.step_id,
                        "agent": step.agent,
                        "tool": step.tool,
                        "input_from": step.input_from,
                        "output_to": step.output_to,
                        "params": step.params,
                        "depends_on": step.depends_on,
                    }
                    for step in plan.steps
                ],
                "execution_trace": getattr(plan, "execution_trace", []),
            }
            db.collection("agent_plan_traces").document(plan.plan_id).set(payload, merge=True)
        except Exception as exc:
            logger.warning(f"Failed to persist agent plan trace: {exc}")

    def get_recent_plans(self, user_id: str, project_id: str, limit: int = 5) -> list:
        """S1-4: Retrieve recent plan traces for a user+project pair."""
        db = self._get_firestore()
        if not db:
            return []
        try:
            query = (
                db.collection("agent_plan_traces")
                .where("user_id", "==", user_id)
                .where("project_id", "==", project_id)
                .order_by("saved_at", direction="DESCENDING")
                .limit(limit)
            )
            results = []
            for doc in query.stream():
                data = doc.to_dict()
                results.append({
                    "plan_id": data.get("plan_id"),
                    "intent": data.get("intent"),
                    "user_query": data.get("user_query"),
                    "status": data.get("status"),
                    "created_at": data.get("created_at"),
                })
            return results
        except Exception as exc:
            logger.warning(f"Failed to load recent plan traces: {exc}")
            return []

def count_tokens(text: str) -> int:
    """Estimasi jumlah token teks secara kasar (1 token ≈ 4 huruf)."""
    return len(str(text)) // 4

def format_citation(paper: "StoredPaper", style: str) -> str:
    """Helper formatting sitasi statis untuk memory system."""
    authors = ", ".join(paper.authors) if paper.authors else "Unknown"
    return f"{authors} ({paper.year}). {paper.title}. DOI: {paper.doi}"


def build_memory_prompt_context(memory: Any, include_conversation: bool = True) -> str:
    """
    Bangun ringkasan context yang konsisten untuk semua worker agent.
    Fungsi ini sengaja ringan: hanya memakai profile + request_context + conversation ringkas,
    tanpa retrieval semantic tambahan.
    """
    if not memory:
        return ""

    try:
        profile = None
        if hasattr(memory, "profile") and hasattr(memory.profile, "get_or_create"):
            profile = memory.profile.get_or_create(getattr(memory, "user_id", ""))

        req_ctx = getattr(memory, "request_context", {}) or {}
        active_paragraphs = req_ctx.get("active_paragraphs", []) or []
        paragraph_preview = []
        for paragraph in active_paragraphs[:3]:
            content = str(paragraph.get("content", "")).strip()
            if content:
                preview = content[:180] + ("..." if len(content) > 180 else "")
                paragraph_preview.append(f"- [{paragraph.get('paraId', '?')}] {preview}")

        recent_history = []
        if include_conversation and hasattr(memory, "conversation"):
            for turn in memory.conversation.get_context_window(last_n=4):
                if isinstance(turn, dict) and turn.get("role") and turn.get("content"):
                    recent_history.append(f"- {turn['role']}: {str(turn['content'])[:180]}")

        sections = [
            "=== SHARED AGENT CONTEXT ===",
            f"Project title: {req_ctx.get('context_title', '') or getattr(profile, 'thesis_topic', '') or '-'}",
            f"Problem statement: {req_ctx.get('context_problem', '-')}",
            f"Methodology: {req_ctx.get('context_method', '-')}",
            f"Writing style: {getattr(profile, 'writing_style', 'academic formal') if profile else 'academic formal'}",
            f"Language: {getattr(profile, 'preferred_language', 'id') if profile else 'id'}",
            f"Citation style: {getattr(profile, 'citation_style', 'APA') if profile else 'APA'}",
        ]

        if paragraph_preview:
            sections.append("Active editor paragraphs:")
            sections.extend(paragraph_preview)

        references_text = req_ctx.get("references_text", "")
        if references_text:
            sections.append("Reference preview:")
            sections.append(references_text[:600])

        if recent_history:
            sections.append("Recent conversation:")
            sections.extend(recent_history)

        sections.append("=== END SHARED CONTEXT ===")
        return "\n".join(sections)
    except Exception as exc:
        logger.warning(f"Failed to build shared agent context: {exc}")
        return ""

# --- CONVERSATION MEMORY ---

@dataclass
class ConversationTurn:
    role: str           # "user" | "assistant" | "system"
    content: str
    intent: Optional[str]
    plan_id: Optional[str]
    timestamp: datetime
    tokens_used: int
    
    def to_dict(self):
        return {
            "role": self.role, "content": self.content, 
            "intent": self.intent, "plan_id": self.plan_id, 
            "timestamp": self.timestamp.isoformat(), "tokens_used": self.tokens_used
        }
        
    @classmethod
    def from_dict(cls, d):
        return cls(d["role"], d["content"], d.get("intent"), d.get("plan_id"), 
                   datetime.fromisoformat(d["timestamp"]), d.get("tokens_used", 0))

class ConversationMemory:
    def __init__(self, scope_id: str, max_turns: int = 20, db: Any = None):
        self.scope_id = scope_id
        self.turns: List[ConversationTurn] = []
        self.max_turns = max_turns
        self.plans: Dict[str, TaskPlan] = {}
        self.db = db
        self.load()
        
    def load(self):
        if redis_client:
            data = redis_client.get(f"conv:{self.scope_id}")
            if data:
                with suppress(Exception):
                    raw = json.loads(data)
                    self.turns = [ConversationTurn.from_dict(t) for t in raw]
                    
    def save(self):
        if redis_client:
            raw = json.dumps([t.to_dict() for t in self.turns])
            redis_client.setex(f"conv:{self.scope_id}", 86400, raw) # 24 jam TTL

    def _build_turn(self, role: str, content: str, intent: str = None, plan_id: str = None) -> ConversationTurn:
        return ConversationTurn(
            role=role,
            content=content,
            intent=intent,
            plan_id=plan_id,
            timestamp=datetime.now(),
            tokens_used=count_tokens(content)
        )

    def _append_turn(self, turn: ConversationTurn):
        self.turns.append(turn)

        # Trim kalau terlalu panjang (kompresi)
        if len(self.turns) > self.max_turns:
            self._compress_old_turns()

        self.save()

    def add_turn(self, role: str, content: str, intent: str = None, plan_id: str = None):
        turn = self._build_turn(role=role, content=content, intent=intent, plan_id=plan_id)
        self._append_turn(turn)

    def add_assistant_turn(self, content: str, intent: str = None, plan_id: str = None):
        self.add_turn(
            role="assistant",
            content=content,
            intent=intent,
            plan_id=plan_id,
        )
            
    def get_context_window(self, last_n: int = 6) -> List[Dict]:
        recent = self.turns[-last_n:]
        return [{"role": t.role, "content": t.content} for t in recent]

    def get_full_history(self) -> List[Dict[str, Any]]:
        return [turn.to_dict() for turn in self.turns]

    def replace_from_messages(self, messages: List[Dict[str, Any]]):
        sanitized_turns: List[ConversationTurn] = []
        for message in messages or []:
            if not isinstance(message, dict):
                continue
            role = str(message.get("role", "")).strip().lower()
            content = str(message.get("content", "")).strip()
            if role not in {"user", "assistant", "system"} or not content:
                continue

            timestamp_value = message.get("timestamp")
            timestamp = datetime.now()
            if isinstance(timestamp_value, (int, float)):
                with suppress(Exception):
                    timestamp = datetime.fromtimestamp(float(timestamp_value) / 1000.0)
            elif isinstance(timestamp_value, str):
                with suppress(Exception):
                    timestamp = datetime.fromisoformat(timestamp_value.replace("Z", "+00:00"))

            sanitized_turns.append(ConversationTurn(
                role=role,
                content=content,
                intent=message.get("intent"),
                plan_id=message.get("plan_id"),
                timestamp=timestamp,
                tokens_used=count_tokens(content),
            ))

        self.turns = sanitized_turns[-self.max_turns:]
        self.save()
        
    def _summarize(self, turns: List[ConversationTurn]) -> str:
        """Merangkum turn lama menggunakan LLM agar konteks tidak hilang."""
        try:
            import litellm
            from litellm.exceptions import RateLimitError

            turns_text = "\n".join([
                f"{t.role}: {t.content[:200]}" for t in turns if t.content
            ])
            # Batasi input agar tidak overbudget token
            if len(turns_text) > 3000:
                turns_text = turns_text[:3000] + "\n...(terpotong)"

            prompt = (
                "Rangkum percakapan berikut menjadi 3-5 kalimat padat. "
                "Fokus pada: topik yang dibahas, keputusan yang diambil, "
                "dan informasi penting yang perlu diingat.\n\n"
                f"Percakapan:\n{turns_text}\n\nRangkuman:"
            )

            api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("LLM_API_KEY")
            model = "gemini/gemini-2.5-flash"  # Gunakan model murah untuk summarize

            if not api_key:
                # Fallback ke summarize sederhana jika tidak ada API key
                topics = set()
                for t in turns:
                    if t.intent and t.intent != 'summary':
                        topics.add(t.intent)
                topics_str = ", ".join(topics) if topics else "umum"
                return f"Percakapan {len(turns)} pesan sebelumnya membahas topik: {topics_str}."

            try:
                response = litellm.completion(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    api_key=api_key,
                    max_tokens=200,
                )
                return response.choices[0].message.content.strip()
            except (RateLimitError, Exception) as e:
                logger.warning(f"LLM summarize gagal, fallback ke ringkasan sederhana: {e}")
                topics = set()
                for t in turns:
                    if t.intent and t.intent != 'summary':
                        topics.add(t.intent)
                topics_str = ", ".join(topics) if topics else "umum"
                return f"Percakapan {len(turns)} pesan sebelumnya membahas topik: {topics_str}."

        except Exception as e:
            logger.error(f"Error di _summarize: {e}")
            return f"Ringkasan {len(turns)} pesan sebelumnya (gagal diproses)."
        
    def _compress_old_turns(self):
        old_turns = self.turns[:-self.max_turns]
        summary = self._summarize(old_turns)
        
        summary_turn = ConversationTurn(
            role="system",
            content=f"[Ringkasan percakapan sebelumnya]: {summary}",
            intent="summary",
            plan_id=None,
            timestamp=datetime.now(),
            tokens_used=count_tokens(summary)
        )
        
        self.turns = [summary_turn] + self.turns[-self.max_turns:]
        
    def store_plan(self, plan: TaskPlan):
        self.plans[plan.plan_id] = plan
        if self.db and hasattr(self.db, "save_plan"):
            self.db.save_plan(self.scope_id, plan)

    def add_plan(self, plan: TaskPlan, result: str):
        previous_turns = list(self.turns)
        previous_plans = dict(self.plans)
        assistant_turn = self._build_turn(
            role="assistant",
            content=result,
            intent=plan.intent,
            plan_id=plan.plan_id,
        )

        try:
            self.store_plan(plan)
            self._append_turn(assistant_turn)
        except Exception:
            self.turns = previous_turns
            self.plans = previous_plans
            with suppress(Exception):
                self.save()
            raise

# --- DOCUMENT MEMORY ---

@dataclass
class DocumentChunk:
    chunk_id: str
    doc_id: str
    section: str          
    content: str
    version: int
    last_edited: datetime
    # embedding: List[float] # No longer stored locally in dataclass if using Qdrant

@dataclass
class ThesisDocument:
    doc_id: str
    user_id: str
    title: str
    field: str             
    outline: dict          
    chunks: List[DocumentChunk]
    last_updated: datetime

class DocumentMemory:
    def __init__(self, vector_db, user_id: Optional[str] = None, project_id: Optional[str] = None):
        self.vector_db = vector_db
        self.user_id = str(user_id) if user_id else ""
        self.project_id = str(project_id) if project_id else ""
        self.versions_counter = {} # chunk_id -> int

    def _resolve_scope(self, doc_id: Optional[str] = None) -> Dict[str, str]:
        user_id = self.user_id
        project_id = self.project_id

        if (not user_id or not project_id) and doc_id and ":" in str(doc_id):
            inferred_user, inferred_project = str(doc_id).split(":", 1)
            user_id = user_id or inferred_user
            project_id = project_id or inferred_project

        scope: Dict[str, str] = {}
        if user_id:
            scope["user_id"] = user_id
        if project_id:
            scope["project_id"] = project_id
        if user_id and project_id:
            scope["scope_id"] = f"{user_id}:{project_id}"
        return scope

    def _build_filter(self, doc_id: Optional[str] = None, **extra: Any) -> Dict[str, Any]:
        scoped_filter: Dict[str, Any] = {}
        scope = self._resolve_scope(doc_id=doc_id)
        if scope.get("scope_id"):
            scoped_filter["scope_id"] = scope["scope_id"]
        elif doc_id:
            scoped_filter["doc_id"] = doc_id

        for key, value in extra.items():
            if value is not None and value != "":
                scoped_filter[key] = value
        return scoped_filter
        
    def _get_next_version(self, doc_id: str, section: str) -> int:
        key = f"{doc_id}_{section}"
        self.versions_counter[key] = self.versions_counter.get(key, 0) + 1
        return self.versions_counter[key]
        
    def add_or_update_chunk(self, doc_id: str, section: str, content: str, chunk_index: int = 0):
        embedding = embed(content)
        version = self._get_next_version(doc_id, section)
        chunk_id = f"{doc_id}_{section}_v{version}_{int(time.time())}"
        
        self.vector_db.upsert(
            collection="thesis_chunks",
            points=[{
                "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, chunk_id)),
                "vector": embedding,
                "payload": {
                    "doc_id": doc_id,
                    "section": section,
                    "content": content,
                    "version": version,
                    "chunk_index": chunk_index,
                    "last_edited": datetime.now().isoformat(),
                    "schema_version": 2,
                    **self._resolve_scope(doc_id=doc_id),
                }
            }]
        )
        
    def get_relevant_context(self, query: str, doc_id: str, top_k: int = 3) -> str:
        embedding = embed(query)
        results = self.vector_db.search(
            collection="thesis_chunks",
            query_vector=embedding,
            filter=self._build_filter(doc_id=doc_id),
            limit=top_k
        )
        if not results:
            return ""
        return "\n\n".join([r.payload["content"] for r in results])
        
    def get_section(self, doc_id: str, section: str, raw: bool = False) -> Optional[Any]:
        """
        DocumentMemory v2 Contract
        --------------------------
        raw=False (default):
            return str — chunks di-join dengan '\n\n'
            backward compatible dengan semua caller lama

        raw=True:
            return list[ChunkDict]
            ChunkDict: {
                text: str,
                embedding_id: str,
                position: int,
                updated_at: str  # ISO format
            }

        Return None jika section tidak ditemukan.
        """
        results = self.vector_db.scroll(
            collection="thesis_chunks",
            scroll_filter=self._build_filter(doc_id=doc_id, section=section),
            order_by="chunk_index",
            limit=50
        )
        if not results:
            return None
        # Sort by chunk_index ascending, tiebreak by version descending
        sorted_results = sorted(
            results,
            key=lambda r: (r.payload.get("chunk_index", 0), -r.payload.get("version", 0))
        )
        if raw:
            return [
                {
                    "text": record.payload.get("content", ""),
                    "embedding_id": str(getattr(record, "id", "") or ""),
                    "position": int(record.payload.get("chunk_index", 0) or 0),
                    "updated_at": str(record.payload.get("last_edited", "") or ""),
                }
                for record in sorted_results
            ]
        return "\n\n".join(record.payload.get("content", "") for record in sorted_results)

    def add_or_update_chapter_summary(self, doc_id: str, chapter_id: str, summary: str):
        """Saves or updates a concise summary of a chapter into Qdrant."""
        embedding = embed(summary)
        
        self.vector_db.upsert(
            collection="thesis_summaries",
            points=[{
                "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{doc_id}_{chapter_id}_summary")),
                "vector": embedding,
                "payload": {
                    "doc_id": doc_id,
                    "chapter_id": chapter_id,
                    "summary": summary,
                    "last_updated": datetime.now().isoformat(),
                    "schema_version": 2,
                    **self._resolve_scope(doc_id=doc_id),
                }
            }]
        )
        
    def get_all_chapter_summaries(self, doc_id: str) -> List[Dict]:
        """Retrieves all summaries for a specific thesis."""
        results = self.vector_db.scroll(
            collection="thesis_summaries",
            scroll_filter=self._build_filter(doc_id=doc_id),
            order_by=None,
            limit=20
        )
        return [r.payload for r in results]

# --- RESEARCH MEMORY ---

class ResearchMemory:
    def __init__(self, vector_db, user_id: Optional[str] = None, project_id: Optional[str] = None):
        self.vector_db = vector_db
        self.user_id = str(user_id) if user_id else ""
        self.project_id = str(project_id) if project_id else ""
        self.papers: Dict[str, "StoredPaper"] = {}
        self.topic_index: Dict[str, List[str]] = {}

    def _resolve_scope(self) -> Dict[str, str]:
        scope: Dict[str, str] = {}
        if self.user_id:
            scope["user_id"] = self.user_id
        if self.project_id:
            scope["project_id"] = self.project_id
        if self.user_id and self.project_id:
            scope["scope_id"] = f"{self.user_id}:{self.project_id}"
        return scope

    def _build_filter(self, **extra: Any) -> Dict[str, Any]:
        scoped_filter: Dict[str, Any] = {}
        scope = self._resolve_scope()
        if scope.get("scope_id"):
            scoped_filter["scope_id"] = scope["scope_id"]
        else:
            if scope.get("user_id"):
                scoped_filter["user_id"] = scope["user_id"]
            if scope.get("project_id"):
                scoped_filter["project_id"] = scope["project_id"]

        for key, value in extra.items():
            if value is not None and value != "":
                scoped_filter[key] = value
        return scoped_filter

    def _build_citation_key(self, payload: Dict[str, Any]) -> str:
        citation_key = str(payload.get("citation_key") or "").strip()
        if citation_key:
            return citation_key

        doi = str(payload.get("doi") or "").strip().lower()
        if doi:
            return doi.replace("/", "_").replace(":", "_")

        paper_id = str(payload.get("paper_id") or "").strip().lower()
        if paper_id:
            return paper_id.replace("/", "_").replace(":", "_")

        title = str(payload.get("title") or "unknown").strip().lower()
        return "_".join(title.split())[:64] or "unknown"

    def _normalize_paper_payload(self, paper_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        required = ("paper_id", "title", "authors", "year", "abstract", "relevance_score", "citation_count", "doi", "source", "topics")
        if any(field not in paper_data for field in required):
            return None

        payload = dict(paper_data)
        payload["citation_key"] = self._build_citation_key(payload)
        payload.setdefault("key_findings", "")
        payload.setdefault("added_at", datetime.now())
        payload.setdefault("last_refreshed_at", datetime.now().isoformat())
        payload.setdefault("expires_at", (datetime.now() + timedelta(days=30)).isoformat())
        payload.setdefault("is_academic_source", payload.get("source") != "web_search")
        payload.setdefault("schema_version", 2)
        payload.update({k: v for k, v in self._resolve_scope().items() if v})
        return payload

    def _coerce_stored_paper_payload(self, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        normalized = self._normalize_paper_payload(payload)
        if not normalized:
            return None

        added_at = normalized.get("added_at")
        if isinstance(added_at, str):
            try:
                normalized["added_at"] = datetime.fromisoformat(added_at)
            except Exception:
                normalized["added_at"] = datetime.now()
        elif not isinstance(added_at, datetime):
            normalized["added_at"] = datetime.now()

        return normalized

    def _cache_paper_payload(self, payload: Dict[str, Any]) -> Optional["StoredPaper"]:
        from .research_agent import StoredPaper

        normalized = self._coerce_stored_paper_payload(payload)
        if not normalized:
            return None

        allowed_fields = getattr(StoredPaper, "__dataclass_fields__", {}) or {}
        paper_payload = {
            key: value for key, value in normalized.items()
            if key in allowed_fields
        }
        paper = StoredPaper(**paper_payload)
        self.papers[paper.paper_id] = paper

        for topic in paper.topics:
            if topic not in self.topic_index:
                self.topic_index[topic] = []
            if paper.paper_id not in self.topic_index[topic]:
                self.topic_index[topic].append(paper.paper_id)

        return paper

    def _format_as_citation(self, paper: "StoredPaper", style: str = "APA") -> Dict[str, Any]:
        return {
            "paper_id": paper.paper_id,
            "citation_key": paper.citation_key or self._build_citation_key(paper.__dict__),
            "formatted": format_citation(paper, style),
            "doi": paper.doi or None,
        }

    async def _fetch_papers_from_db(self, paper_ids: List[str]) -> List["StoredPaper"]:
        fetched: List["StoredPaper"] = []
        seen_ids = set()

        for paper_id in paper_ids:
            try:
                records = self.vector_db.scroll(
                    collection="research_papers",
                    scroll_filter=self._build_filter(paper_id=paper_id),
                    order_by=None,
                    limit=1,
                )
            except Exception as exc:
                logger.warning("ResearchMemory DB fetch failed for %s: %s", paper_id, exc)
                continue

            for record in records or []:
                payload = dict(getattr(record, "payload", {}) or {})
                if not payload:
                    continue
                if self._is_expired(payload):
                    continue
                if payload.get("is_academic_source") is False:
                    continue

                payload.setdefault("paper_id", paper_id)
                paper = self._cache_paper_payload(payload)
                if paper and paper.paper_id not in seen_ids:
                    fetched.append(paper)
                    seen_ids.add(paper.paper_id)

        return fetched

    def _is_expired(self, payload: Dict[str, Any]) -> bool:
        expires_at = payload.get("expires_at")
        if not expires_at:
            return False
        try:
            return datetime.fromisoformat(expires_at) < datetime.now()
        except Exception:
            return False
        
    def add_papers(self, papers: List[Dict]):
        for paper_data in papers:
            normalized_payload = self._coerce_stored_paper_payload(paper_data)
            if not normalized_payload:
                logger.warning("Skipping paper without normalized schema in ResearchMemory.add_papers")
                continue
            if normalized_payload.get("is_academic_source") is False:
                logger.info("Skipping non-academic fallback result from ResearchMemory persistence")
                continue

            # Hilangkan final_score jika masuk via ranker dictionary
            normalized_payload.pop('final_score', None)

            paper = self._cache_paper_payload(normalized_payload)
            if not paper:
                continue
                
            embedding = embed(paper.abstract)
            scope_id = normalized_payload.get("scope_id")
            point_id = f"{scope_id}:{paper.paper_id}" if scope_id else paper.paper_id
            self.vector_db.upsert(
                collection="research_papers",
                points=[{
                    "id": point_id,
                    "vector": embedding,
                    "payload": normalized_payload
                }]
            )
            
    def get_papers(self, topic: str, min_relevance: float = 0.5) -> Optional[List[Dict]]:
        embedding = embed(topic)
        results = self.vector_db.search(
            collection="research_papers",
            query_vector=embedding,
            filter=self._build_filter(),
            score_threshold=min_relevance,
            limit=10
        )
        if not results:
            print(f"DEBUG get_papers: empty search result for {topic}")
            return None
        
        filtered_results = []
        for r in results:
            payload = dict(r.payload)
            if self._is_expired(payload):
                continue
            if payload.get("is_academic_source") is False:
                continue
            payload['relevance_score'] = r.score
            filtered_results.append(payload)

        return filtered_results or None
        
    def is_paper_known(self, doi: str) -> bool:
        return doi in [p.doi for p in self.papers.values()]

    async def get_citations(self, paper_ids: List[str], style: str = "APA") -> List[Dict[str, Any]]:
        """
        Ambil citations dari cache instance dulu (fast path).
        Kalau ada yang missing → fallback ke persistence layer.
        Expiry 30 hari tetap dihormati dari DB.
        """
        ordered_ids = [paper_id for paper_id in paper_ids if paper_id]
        if not ordered_ids:
            return []

        cached_by_id: Dict[str, "StoredPaper"] = {}
        for paper_id in ordered_ids:
            paper = self.papers.get(paper_id)
            if not paper:
                continue
            if self._is_expired(paper.__dict__):
                continue
            cached_by_id[paper_id] = paper

        missing_ids = [paper_id for paper_id in ordered_ids if paper_id not in cached_by_id]
        if missing_ids:
            from_db = await self._fetch_papers_from_db(missing_ids)
            for paper in from_db:
                cached_by_id[paper.paper_id] = paper

        citations: List[Dict[str, Any]] = []
        for paper_id in ordered_ids:
            paper = cached_by_id.get(paper_id)
            if paper:
                citations.append(self._format_as_citation(paper, style))

        return citations

# --- USER PROFILE MEMORY ---

@dataclass
class UserProfile:
    user_id: str
    thesis_topic: str
    field: str
    writing_style: str
    preferred_language: str
    citation_style: str
    academic_level: str
    institution: str
    supervisors: List[str]
    last_active: datetime
    total_rewrites: int
    total_papers_found: int
    frequently_used_tools: List[str]

class UserProfileMemory:
    def __init__(self, db):
        self.db = db
        self.profiles: Dict[str, UserProfile] = {}
        
    def get_or_create(self, user_id: str) -> UserProfile:
        if user_id in self.profiles:
            return self.profiles[user_id]

        # Coba load dari Redis
        if redis_client:
            data = redis_client.get(f"profile:{user_id}")
            if data:
                with suppress(Exception):
                    d = json.loads(data)
                    d["last_active"] = datetime.fromisoformat(d["last_active"])
                    profile = UserProfile(**d)
                    self.profiles[user_id] = profile
                    return profile

        if self.db and hasattr(self.db, "load_profile"):
            stored = self.db.load_profile(user_id)
            if stored:
                base_profile = UserProfile(
                    user_id=user_id,
                    thesis_topic="",
                    field="",
                    writing_style="academic formal",
                    preferred_language="id",
                    citation_style="APA",
                    academic_level="S1",
                    institution="",
                    supervisors=[],
                    last_active=datetime.now(),
                    total_rewrites=0,
                    total_papers_found=0,
                    frequently_used_tools=[]
                )
                merged_profile = {**base_profile.__dict__, **stored}
                profile = UserProfile(**merged_profile)
                self.profiles[user_id] = profile
                self.save_profile(profile)
                return profile

        profile = UserProfile(
            user_id=user_id,
            thesis_topic="",
            field="",
            writing_style="academic formal",
            preferred_language="id",
            citation_style="APA",
            academic_level="S1",
            institution="",
            supervisors=[],
            last_active=datetime.now(),
            total_rewrites=0,
            total_papers_found=0,
            frequently_used_tools=[]
        )
        self.profiles[user_id] = profile
        return profile
        
    def save_profile(self, profile: UserProfile):
        if redis_client:
            d = profile.__dict__.copy()
            d["last_active"] = d["last_active"].isoformat()
            if hasattr(redis_client, "set"):
                redis_client.set(f"profile:{profile.user_id}", json.dumps(d))
            else:
                redis_client.setex(f"profile:{profile.user_id}", 315360000, json.dumps(d))

    def update_from_conversation(self, user_id: str, message: str):
        """Ekstrak informasi profil dari pesan user menggunakan keyword matching."""
        import re
        profile = self.get_or_create(user_id)
        msg_lower = message.lower()
        updated = False

        # --- Deteksi topik tesis ---
        topic_patterns = [
            r'(?:tesis|skripsi|penelitian|riset)\s+(?:saya|ku|ini)\s+(?:tentang|mengenai|terkait|adalah)\s+(.+?)(?:\.|,|$)',
            r'(?:topik|judul)\s+(?:tesis|skripsi|penelitian)\s+(?:saya|ku)?\s*(?:adalah|:)?\s*(.+?)(?:\.|,|$)',
            r'(?:saya|aku)\s+(?:sedang|lagi)\s+(?:meneliti|menulis|mengerjakan)\s+(?:tentang\s+)?(.+?)(?:\.|,|$)',
        ]
        for pat in topic_patterns:
            match = re.search(pat, msg_lower)
            if match:
                topic = match.group(1).strip()
                if len(topic) > 5 and len(topic) < 200:
                    profile.thesis_topic = topic
                    updated = True
                    logger.info(f"| PROFILE | Terdeteksi topik tesis: '{topic}'")
                break

        # --- Deteksi bidang ilmu ---
        field_keywords = {
            'computer science': ['komputer', 'informatika', 'software', 'machine learning', 'deep learning', 'ai ', 'artificial intelligence', 'data science', 'programming'],
            'education': ['pendidikan', 'pembelajaran', 'kurikulum', 'pedagogik', 'siswa', 'mahasiswa', 'dosen', 'guru'],
            'economics': ['ekonomi', 'bisnis', 'manajemen', 'akuntansi', 'keuangan', 'marketing', 'pemasaran'],
            'engineering': ['teknik', 'mesin', 'sipil', 'elektro', 'arsitektur', 'industri'],
            'health sciences': ['kesehatan', 'kedokteran', 'keperawatan', 'farmasi', 'gizi', 'medis'],
            'social sciences': ['sosial', 'politik', 'hukum', 'komunikasi', 'psikologi', 'sosiologi'],
            'agriculture': ['pertanian', 'agroteknologi', 'peternakan', 'perikanan', 'kehutanan'],
        }
        if not profile.field:
            for field_name, keywords in field_keywords.items():
                if any(kw in msg_lower for kw in keywords):
                    profile.field = field_name
                    updated = True
                    logger.info(f"| PROFILE | Terdeteksi bidang: '{field_name}'")
                    break

        # --- Deteksi gaya sitasi ---
        citation_map = {
            'APA': ['apa', 'apa style', 'apa 7'],
            'IEEE': ['ieee'],
            'Chicago': ['chicago', 'turabian'],
            'Harvard': ['harvard'],
            'Vancouver': ['vancouver'],
        }
        for style_name, keywords in citation_map.items():
            if any(kw in msg_lower for kw in keywords):
                if profile.citation_style != style_name:
                    profile.citation_style = style_name
                    updated = True
                    logger.info(f"| PROFILE | Terdeteksi gaya sitasi: '{style_name}'")
                break

        # --- Deteksi jenjang akademik ---
        level_map = {
            'S1': ['s1', 'sarjana', 'undergraduate', 'skripsi'],
            'S2': ['s2', 'magister', 'master', 'tesis'],
            'S3': ['s3', 'doktor', 'doctoral', 'disertasi', 'phd'],
        }
        for level_name, keywords in level_map.items():
            if any(kw in msg_lower for kw in keywords):
                if profile.academic_level != level_name:
                    profile.academic_level = level_name
                    updated = True
                    logger.info(f"| PROFILE | Terdeteksi jenjang: '{level_name}'")
                break

        # --- Deteksi preferensi bahasa ---
        if any(kw in msg_lower for kw in ['in english', 'write in english', 'bahasa inggris']):
            if profile.preferred_language != 'en':
                profile.preferred_language = 'en'
                updated = True

        if updated:
            profile.last_active = datetime.now()
            if hasattr(self.db, 'save'):
                self.db.save(profile)
            self.save_profile(profile)
            self.profiles[user_id] = profile
        else:
            # Tetap update last_active
            profile.last_active = datetime.now()
            if hasattr(self.db, 'save'):
                self.db.save(profile)
            self.save_profile(profile)

# --- SHARED MEMORY COORDINATOR ---

class SharedMemory:
    """Mengikat semua modul memory (Conversation, Document, Research, User Profile)"""
    def __init__(self, user_id: str, project_id: str, vector_db, db):
        if not project_id:
            raise ValueError("SharedMemory requires project_id for project-scoped retrieval")

        self.user_id = str(user_id)
        self.project_id = str(project_id)
        self.project_scope = f"{self.user_id}:{self.project_id}"
        self.db = db
        self.conversation = ConversationMemory(scope_id=self.project_scope, max_turns=20, db=db)
        self.document = DocumentMemory(vector_db, user_id=self.user_id, project_id=self.project_id)
        self.research = ResearchMemory(vector_db, user_id=self.user_id, project_id=self.project_id)
        self.profile = UserProfileMemory(db)

    def _project_doc_id(self) -> str:
        return self.project_scope
        
    def build_agent_context(self, current_query: str) -> Dict[str, Any]:
        profile = self.profile.get_or_create(self.user_id)
        request_context = getattr(self, "request_context", {}) or {}
        skip_semantic_retrieval = bool(request_context.get("_skip_semantic_retrieval"))
        precomputed_pruned_context = request_context.get("_pruned_context", "")

        known_papers = []
        if not skip_semantic_retrieval:
            known_papers = self.research.get_papers(topic=current_query, min_relevance=0.6)
        known_papers_on_topic = []
        if known_papers:
            # Flatten paper text format
            known_papers_str = "\n".join([f"- {p.get('title')} ({p.get('year')})" for p in known_papers])
            for paper in known_papers:
                topics = paper.get("topics") or []
                primary_topic = next((topic for topic in topics if topic), current_query)
                summary = paper.get("key_findings") or paper.get("abstract") or ""
                known_papers_on_topic.append({
                    "title": paper.get("title"),
                    "topic": primary_topic,
                    "summary": summary
                })
        else:
            known_papers_str = "Belum ada paper tersimpan untuk topik ini."

        relevant_sections = precomputed_pruned_context or ""
        if not relevant_sections and not skip_semantic_retrieval:
            relevant_sections = self.document.get_relevant_context(
                current_query,
                doc_id=self._project_doc_id(),
                top_k=2
            )
        if not relevant_sections:
            relevant_sections = "Belum ada draft tersimpan."
            
        return {
            "user_profile": {
                "thesis_topic": profile.thesis_topic,
                "field": profile.field,
                "writing_style": profile.writing_style,
                "citation_style": profile.citation_style,
                "preferred_language": profile.preferred_language
            },
            "conversation_history": self.conversation.get_context_window(last_n=6),
            "relevant_thesis_sections": relevant_sections,
            "known_papers_summary": known_papers_str,
            "known_papers_on_topic": known_papers_on_topic,
            "raw_known_papers": known_papers
        }
        
    def flush_session(self):
        self.conversation.turns = []
        self.conversation.save()
