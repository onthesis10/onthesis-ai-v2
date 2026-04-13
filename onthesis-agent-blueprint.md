# OnThesis AI Agent — Blueprint Detail
## Task Planner & Shared Memory System

---

# BAGIAN 1: TASK PLANNER

## Apa itu Task Planner?

Task Planner adalah komponen yang **memecah request user menjadi urutan langkah yang bisa dieksekusi** oleh agent. Tanpa ini, Supervisor harus improvisasi tiap request — hasilnya tidak konsisten.

```
User: "Buatkan literature review dari topik machine learning in education"

Tanpa Planner:
  Supervisor → tebak-tebak → kirim ke Research Agent → selesai (mungkin kurang)

Dengan Planner:
  Step 1: Search papers (Research Agent)
  Step 2: Rank & filter papers (Research Agent)
  Step 3: Extract key findings (Research Agent)
  Step 4: Generate literature review draft (Writing Agent)
  Step 5: Polish academic tone (Writing Agent)
```

---

## 1.1 Struktur Data Task Plan

```python
@dataclass
class TaskStep:
    step_id: str           # "step_1", "step_2", dst.
    agent: str             # "research_agent" | "writing_agent" | "analysis_agent"
    tool: str              # nama tool yang dipanggil
    input_from: str        # "user" | "step_1" | "step_2" | "memory"
    output_to: str         # "step_2" | "memory" | "user"
    params: dict           # parameter tambahan
    depends_on: list[str]  # step mana yang harus selesai dulu

@dataclass
class TaskPlan:
    plan_id: str
    user_query: str
    intent: str
    steps: list[TaskStep]
    estimated_tokens: int
    created_at: datetime
    status: str   # "pending" | "running" | "done" | "failed"
```

---

## 1.2 Intent Classification

Sebelum membuat plan, Planner harus tahu intent-nya dulu.

```python
INTENT_MAP = {
    "literature_review":   ["find_papers", "rank_papers", "extract_findings", "generate_review"],
    "rewrite_paragraph":   ["detect_style", "rewrite_text", "polish_academic"],
    "paraphrase":          ["paraphrase_text"],
    "find_papers":         ["search_openalex", "rank_papers"],
    "analyze_argument":    ["extract_claims", "check_logic", "score_argument"],
    "check_coherence":     ["parse_paragraphs", "check_flow", "flag_issues"],
    "expand_paragraph":    ["analyze_context", "expand_text"],
    "summarize":           ["summarize_text"],
    "citation_format":     ["extract_metadata", "format_citation"],
    "thesis_scoring":      ["check_clarity", "check_argument", "check_tone", "score_overall"],
}
```

Cara klasifikasi yang lebih robust dari sekadar `classify(input)`:

```python
def classify_intent(user_input: str, chat_history: list) -> dict:
    """
    Return:
    {
        "intent": "literature_review",
        "confidence": 0.91,
        "ambiguous": False,
        "fallback_intent": "find_papers"
    }
    """
    
    # Gunakan LLM dengan few-shot examples
    prompt = f"""
    Chat history: {chat_history[-3:]}  # 3 pesan terakhir sebagai konteks
    User input: {user_input}
    
    Klasifikasikan intent dari daftar berikut:
    {list(INTENT_MAP.keys())}
    
    Jawab dalam JSON:
    {{
        "intent": "...",
        "confidence": 0.0-1.0,
        "reasoning": "..."
    }}
    """
    
    result = llm_classify(prompt)
    
    # Jika confidence < 0.7, minta klarifikasi ke user
    if result["confidence"] < 0.7:
        return ask_clarification(user_input)
    
    return result
```

---

## 1.3 Plan Generator

Ini inti dari Task Planner — mengubah intent menjadi langkah konkret.

```python
def generate_plan(intent: str, user_input: str, memory: SharedMemory) -> TaskPlan:
    
    steps = []
    
    if intent == "literature_review":
        
        # Cek apakah paper sudah ada di memory
        existing_papers = memory.research.get_papers(topic=user_input)
        
        if not existing_papers:
            steps.append(TaskStep(
                step_id="step_1",
                agent="research_agent",
                tool="search_openalex",
                input_from="user",
                output_to="step_2",
                params={"query": user_input, "limit": 10},
                depends_on=[]
            ))
            steps.append(TaskStep(
                step_id="step_2",
                agent="research_agent",
                tool="rank_papers",
                input_from="step_1",
                output_to="step_3",
                params={"strategy": "relevance_recency"},
                depends_on=["step_1"]
            ))
            paper_input = "step_2"
        else:
            # Gunakan paper dari memory — skip search
            paper_input = "memory"
        
        steps.append(TaskStep(
            step_id="step_3",
            agent="research_agent",
            tool="extract_findings",
            input_from=paper_input,
            output_to="step_4",
            params={"max_papers": 5},
            depends_on=["step_2"] if not existing_papers else []
        ))
        
        steps.append(TaskStep(
            step_id="step_4",
            agent="writing_agent",
            tool="generate_literature_review",
            input_from="step_3",
            output_to="step_5",
            params={"style": "academic", "language": "id"},
            depends_on=["step_3"]
        ))
        
        steps.append(TaskStep(
            step_id="step_5",
            agent="writing_agent",
            tool="polish_academic_tone",
            input_from="step_4",
            output_to="user",
            params={},
            depends_on=["step_4"]
        ))
    
    # ... intent lainnya
    
    return TaskPlan(
        plan_id=generate_id(),
        user_query=user_input,
        intent=intent,
        steps=steps,
        estimated_tokens=estimate_tokens(steps),
        created_at=datetime.now(),
        status="pending"
    )
```

---

## 1.4 Plan Executor

Ini yang menjalankan plan step by step.

```python
class PlanExecutor:
    
    def __init__(self, agents: dict, memory: SharedMemory):
        self.agents = agents      # {"research_agent": ResearchAgent(), ...}
        self.memory = memory
        self.results = {}         # simpan output tiap step
        self.max_steps = 6        # hard limit
        self.timeout_per_step = 20  # detik
    
    async def execute(self, plan: TaskPlan) -> str:
        
        plan.status = "running"
        
        for step in plan.steps:
            
            # Cek limit
            if len(self.results) >= self.max_steps:
                break
            
            # Tunggu dependencies
            await self.wait_for_deps(step.depends_on)
            
            # Ambil input
            if step.input_from == "user":
                input_data = plan.user_query
            elif step.input_from == "memory":
                input_data = self.memory.research.get_papers(plan.user_query)
            else:
                input_data = self.results.get(step.input_from)
            
            # Jalankan dengan timeout
            try:
                agent = self.agents[step.agent]
                result = await asyncio.wait_for(
                    agent.run_tool(step.tool, input_data, step.params),
                    timeout=self.timeout_per_step
                )
                self.results[step.step_id] = result
                
                # Simpan ke memory kalau relevan
                if step.tool == "search_openalex":
                    self.memory.research.add_papers(result)
                    
            except asyncio.TimeoutError:
                self.results[step.step_id] = {"error": "timeout", "partial": True}
                plan.status = "partial"
                break
            
            except Exception as e:
                self.results[step.step_id] = {"error": str(e)}
                plan.status = "failed"
                break
        
        # Ambil output final
        final_step = plan.steps[-1]
        final_output = self.results.get(final_step.step_id, "Gagal menghasilkan output")
        
        plan.status = "done"
        
        # Simpan plan ke memory
        self.memory.conversation.add_plan(plan, final_output)
        
        return final_output
```

---

## 1.5 Contoh Alur Lengkap: Literature Review

```
User: "Buatkan literature review tentang AI dalam pendidikan tinggi"

1. Intent Detection
   → intent: "literature_review", confidence: 0.95

2. Plan Generator
   → Cek memory: belum ada paper tentang topik ini
   → Buat 5-step plan

3. Plan Executor
   
   [Step 1] search_openalex("AI in higher education")
   → Hasil: 10 papers dari OpenAlex API
   → Simpan ke research memory
   
   [Step 2] rank_papers(hasil_step_1)
   → Score tiap paper
   → Ambil top 5
   
   [Step 3] extract_findings(top_5_papers)
   → Ringkas temuan utama tiap paper
   → "Smith (2022) menemukan..."
   
   [Step 4] generate_literature_review(findings)
   → Draft literature review dalam bahasa Indonesia
   
   [Step 5] polish_academic_tone(draft)
   → Perbaiki tone akademik
   → Final output ke user

4. Output ke User
   → Teks literature review siap pakai
   → Disertai daftar referensi
```

---
---

# BAGIAN 2: SHARED MEMORY SYSTEM

## Mengapa Memory Penting?

Tanpa memory, tiap request user diperlakukan seperti percakapan baru. Agent tidak tahu:
- Topik tesis user
- Paper apa yang sudah ditemukan
- Draft yang sedang dikerjakan
- Preferensi gaya penulisan

Hasilnya agent terasa bodoh meskipun LLM-nya pintar.

---

## 2.1 Arsitektur Memory

```
SharedMemory
├── ConversationMemory     ← riwayat chat + plan yang dijalankan
├── DocumentMemory         ← draft tesis, bab, outline user
├── ResearchMemory         ← paper yang sudah dicari + diekstrak
└── UserProfileMemory      ← preferensi, gaya penulisan, topik tesis
```

Setiap layer punya **scope berbeda** dan **TTL (time-to-live) berbeda**.

---

## 2.2 ConversationMemory

Menyimpan konteks percakapan agar agent tidak mengulang hal yang sama.

```python
@dataclass
class ConversationTurn:
    role: str           # "user" | "assistant"
    content: str
    intent: str         # intent yang terdeteksi
    plan_id: str        # plan yang dieksekusi (jika ada)
    timestamp: datetime
    tokens_used: int

class ConversationMemory:
    
    def __init__(self, max_turns: int = 20):
        self.turns: list[ConversationTurn] = []
        self.max_turns = max_turns
        self.plans: dict[str, TaskPlan] = {}
    
    def add_turn(self, role: str, content: str, intent: str = None, plan_id: str = None):
        turn = ConversationTurn(
            role=role,
            content=content,
            intent=intent,
            plan_id=plan_id,
            timestamp=datetime.now(),
            tokens_used=count_tokens(content)
        )
        self.turns.append(turn)
        
        # Trim kalau terlalu panjang — simpan sistem ringkasan
        if len(self.turns) > self.max_turns:
            self._compress_old_turns()
    
    def get_context_window(self, last_n: int = 8) -> list[dict]:
        """
        Ambil N turn terakhir + summary turn lama (kalau ada).
        Format untuk dimasukkan ke LLM.
        """
        recent = self.turns[-last_n:]
        return [{"role": t.role, "content": t.content} for t in recent]
    
    def _compress_old_turns(self):
        """
        Ringkas turn lama supaya tidak buang-buang token.
        Simpan sebagai satu turn "summary".
        """
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
    
    def add_plan(self, plan: TaskPlan, result: str):
        self.plans[plan.plan_id] = plan
        self.add_turn(
            role="assistant",
            content=result,
            intent=plan.intent,
            plan_id=plan.plan_id
        )
```

---

## 2.3 DocumentMemory

Menyimpan draft tesis user agar agent bisa membaca konteks tulisan yang sedang dikerjakan.

```python
@dataclass
class DocumentChunk:
    chunk_id: str
    doc_id: str
    section: str          # "abstract" | "bab_1" | "literature_review" | dst.
    content: str
    version: int
    last_edited: datetime
    embedding: list[float]  # untuk semantic search

@dataclass
class ThesisDocument:
    doc_id: str
    user_id: str
    title: str
    field: str             # "computer science" | "economics" | dst.
    outline: dict          # struktur bab
    chunks: list[DocumentChunk]
    last_updated: datetime

class DocumentMemory:
    
    def __init__(self, vector_db):
        self.vector_db = vector_db   # Qdrant / Weaviate
        self.docs: dict[str, ThesisDocument] = {}
    
    def add_or_update_chunk(self, doc_id: str, section: str, content: str):
        """
        Update konten satu bagian tesis.
        Otomatis buat embedding dan simpan ke vector DB.
        """
        embedding = embed(content)
        
        chunk = DocumentChunk(
            chunk_id=f"{doc_id}_{section}_{int(time.time())}",
            doc_id=doc_id,
            section=section,
            content=content,
            version=self._get_next_version(doc_id, section),
            last_edited=datetime.now(),
            embedding=embedding
        )
        
        # Simpan ke vector DB untuk semantic search
        self.vector_db.upsert(
            collection="thesis_chunks",
            points=[{
                "id": chunk.chunk_id,
                "vector": embedding,
                "payload": {
                    "doc_id": doc_id,
                    "section": section,
                    "content": content
                }
            }]
        )
    
    def get_relevant_context(self, query: str, doc_id: str, top_k: int = 3) -> str:
        """
        Cari bagian tesis yang paling relevan dengan query.
        Dipakai agent saat perlu context dari draft tesis.
        """
        embedding = embed(query)
        
        results = self.vector_db.search(
            collection="thesis_chunks",
            query_vector=embedding,
            filter={"doc_id": doc_id},
            limit=top_k
        )
        
        return "\n\n".join([r.payload["content"] for r in results])
    
    def get_section(self, doc_id: str, section: str) -> str:
        """Ambil satu bagian spesifik dari tesis."""
        results = self.vector_db.scroll(
            collection="thesis_chunks",
            scroll_filter={
                "doc_id": doc_id,
                "section": section
            },
            order_by="version",
            limit=1
        )
        return results[0].payload["content"] if results else ""
```

---

## 2.4 ResearchMemory

Mencegah agent mencari paper yang sama dua kali, dan menyimpan findings untuk dipakai ulang.

```python
@dataclass
class StoredPaper:
    paper_id: str          # DOI atau OpenAlex ID
    title: str
    authors: list[str]
    year: int
    abstract: str
    key_findings: str      # hasil ekstraksi oleh agent
    relevance_score: float
    citation_count: int
    doi: str
    source: str            # "openalex" | "semantic_scholar" | "manual"
    topics: list[str]      # tag topik
    added_at: datetime

class ResearchMemory:
    
    def __init__(self, vector_db):
        self.vector_db = vector_db
        self.papers: dict[str, StoredPaper] = {}    # paper_id → paper
        self.topic_index: dict[str, list[str]] = {} # topic → [paper_ids]
    
    def add_papers(self, papers: list[dict]):
        """Simpan hasil search ke memory."""
        for paper_data in papers:
            paper = StoredPaper(**paper_data)
            self.papers[paper.paper_id] = paper
            
            # Index berdasarkan topik
            for topic in paper.topics:
                if topic not in self.topic_index:
                    self.topic_index[topic] = []
                self.topic_index[topic].append(paper.paper_id)
            
            # Simpan embedding abstract ke vector DB
            embedding = embed(paper.abstract)
            self.vector_db.upsert(
                collection="research_papers",
                points=[{
                    "id": paper.paper_id,
                    "vector": embedding,
                    "payload": paper.__dict__
                }]
            )
    
    def get_papers(self, topic: str, min_relevance: float = 0.5) -> list[StoredPaper]:
        """
        Cari paper yang relevan dari memory.
        Kalau tidak ada → return None → trigger pencarian baru.
        """
        embedding = embed(topic)
        
        results = self.vector_db.search(
            collection="research_papers",
            query_vector=embedding,
            score_threshold=min_relevance,
            limit=10
        )
        
        if not results:
            return None
        
        return [StoredPaper(**r.payload) for r in results]
    
    def is_paper_known(self, doi: str) -> bool:
        """Cek apakah paper ini sudah pernah dicari."""
        return doi in [p.doi for p in self.papers.values()]
    
    def get_citations(self, paper_ids: list[str], style: str = "APA") -> list[str]:
        """Generate citation string dari paper yang tersimpan."""
        citations = []
        for pid in paper_ids:
            paper = self.papers.get(pid)
            if paper:
                citations.append(format_citation(paper, style))
        return citations
```

---

## 2.5 UserProfileMemory

Menyimpan preferensi user agar agent tidak perlu bertanya berulang.

```python
@dataclass
class UserProfile:
    user_id: str
    thesis_topic: str              # "implementasi deep learning untuk deteksi kanker"
    field: str                     # "computer science"
    writing_style: str             # "formal" | "semi-formal"
    preferred_language: str        # "id" | "en" | "bilingual"
    citation_style: str            # "APA" | "IEEE" | "Chicago"
    academic_level: str            # "S1" | "S2" | "S3"
    institution: str
    supervisors: list[str]
    last_active: datetime
    
    # Statistik penggunaan
    total_rewrites: int
    total_papers_found: int
    frequently_used_tools: list[str]

class UserProfileMemory:
    
    def __init__(self, db):
        self.db = db
        self.profiles: dict[str, UserProfile] = {}
    
    def get_or_create(self, user_id: str) -> UserProfile:
        if user_id not in self.profiles:
            self.profiles[user_id] = UserProfile(
                user_id=user_id,
                thesis_topic="",
                field="",
                writing_style="formal",
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
        return self.profiles[user_id]
    
    def update_from_conversation(self, user_id: str, message: str):
        """
        Ekstrak informasi profil dari percakapan user.
        Misalnya user bilang "tesis saya tentang X" → update thesis_topic.
        """
        profile = self.get_or_create(user_id)
        
        extracted = extract_profile_hints(message)
        
        if extracted.get("thesis_topic"):
            profile.thesis_topic = extracted["thesis_topic"]
        if extracted.get("field"):
            profile.field = extracted["field"]
        
        self.db.save(profile)
```

---

## 2.6 SharedMemory: Koordinator Semua Layer

```python
class SharedMemory:
    
    def __init__(self, user_id: str, vector_db, db):
        self.user_id = user_id
        self.conversation = ConversationMemory(max_turns=20)
        self.document = DocumentMemory(vector_db)
        self.research = ResearchMemory(vector_db)
        self.profile = UserProfileMemory(db)
    
    def build_agent_context(self, current_query: str) -> dict:
        """
        Buat context lengkap untuk agent.
        Dipanggil sebelum agent mulai bekerja.
        """
        profile = self.profile.get_or_create(self.user_id)
        
        return {
            "user_profile": {
                "thesis_topic": profile.thesis_topic,
                "field": profile.field,
                "style": profile.writing_style,
                "citation_style": profile.citation_style,
                "language": profile.preferred_language,
            },
            "conversation_history": self.conversation.get_context_window(last_n=6),
            "relevant_thesis_sections": self.document.get_relevant_context(
                query=current_query,
                doc_id=self.user_id,
                top_k=2
            ),
            "known_papers_on_topic": self.research.get_papers(
                topic=current_query,
                min_relevance=0.6
            )
        }
    
    def flush_session(self):
        """Bersihkan data sementara setelah sesi selesai."""
        self.conversation.turns = []
```

---

## 2.7 Kapan Memory Di-flush?

Ini yang sering tidak dipikirkan dan bikin bug di production.

```
ConversationMemory:
  → Di-compress otomatis setelah > 20 turns
  → Di-flush total setelah user logout / session expire (24 jam)

DocumentMemory:
  → TIDAK pernah di-flush otomatis
  → Hanya di-update kalau user edit atau upload draft baru
  → User bisa hapus manual

ResearchMemory:
  → Paper tetap tersimpan selama 30 hari
  → Di-refresh kalau user minta cari ulang ("cari paper terbaru tentang X")
  → Citation count di-update setiap 7 hari

UserProfileMemory:
  → Tidak pernah di-flush
  → Selalu di-update bertahap dari percakapan
```

---

## 2.8 Integrasi Task Planner + Memory: Flow Lengkap

```
User Request
     │
     ▼
┌──────────────────────────────────────┐
│  SUPERVISOR AGENT                    │
│                                      │
│  1. memory.build_agent_context()     │ ← baca semua memory
│  2. classify_intent(query, context)  │
│  3. generate_plan(intent, context)   │ ← planner gunakan memory
│  4. executor.execute(plan)           │
│                                      │
└──────────────────────────────────────┘
              │
    ┌─────────┴──────────┐
    │          │          │
 Research   Writing   Analysis
  Agent      Agent     Agent
    │          │          │
    └─────────┬──────────┘
              │
    Update SharedMemory
    (papers, draft, profile)
              │
              ▼
         Final Output
         ke User
```

---

## 2.9 Estimasi Biaya Token per Request

Supaya tidak boros tanpa disadari.

```
Literature Review (full):
  Step 1 search:       ~500 tokens
  Step 2 rank:         ~300 tokens
  Step 3 extract x5:   ~2000 tokens
  Step 4 draft:        ~1500 tokens
  Step 5 polish:       ~800 tokens
  Context (memory):    ~400 tokens
  ─────────────────────────────────
  Total:               ~5500 tokens per request

Rewrite Paragraph:
  Input paragraph:     ~300 tokens
  Rewrite:             ~600 tokens
  Context:             ~200 tokens
  ─────────────────────────────────
  Total:               ~1100 tokens per request

Catatan:
  Gunakan gpt-4o-mini atau claude-haiku untuk step sederhana
  Simpan ke ResearchMemory untuk hindari re-search (hemat ~1800 token)
```

---

## 2.10 Ringkasan Komponen yang Perlu Dibangun

```
PRIORITAS 1 (Minggu 1–2):
  ☐ ConversationMemory (paling basic, langsung berpengaruh)
  ☐ Intent classifier dengan confidence threshold
  ☐ PlanExecutor sederhana (serial, belum parallel)

PRIORITAS 2 (Minggu 3–4):
  ☐ ResearchMemory + OpenAlex integration
  ☐ TaskStep dengan depends_on
  ☐ Timeout & error handling di executor

PRIORITAS 3 (Minggu 5–6):
  ☐ DocumentMemory + vector DB
  ☐ UserProfileMemory + auto-update dari chat
  ☐ SharedMemory.build_agent_context()

PRIORITAS 4 (Minggu 7–8):
  ☐ Memory compression (old turns)
  ☐ Memory TTL & flush policy
  ☐ Token estimation per plan
```

---

*Blueprint ini dirancang untuk OnThesis sebagai AI Thesis Copilot. Implementasi bertahap sesuai prioritas di atas akan menghasilkan agent yang terasa koheren, tidak boros token, dan semakin pintar seiring pemakaian.*