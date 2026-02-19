# Production Blueprint Final – OnThesis Academic Intelligence System (Firebase Stack)

## Scope
Blueprint ini fokus pada:

- Arsitektur detail
- Logic orchestration
- Data flow konkret
- Production robustness
- **Belum** membahas cost dan deployment

---

## I. Core Architectural Principle

**OnThesis bukan chatbot general-purpose.**  
OnThesis adalah **Domain-Specific Academic Reasoning Engine**.

Karena itu desain sistem harus berbasis:

- Deterministic orchestration
- Structured pipelines
- Context-aware reasoning
- Document-grounded intelligence
- Academic validation layer

---

## II. Production System Architecture

```text
Frontend (React SPA)
    ↓
Firebase Auth (JWT)
    ↓
Backend API (FastAPI)
    ↓
Academic Orchestrator
    ↓
---------------------------------------------------
| Context Engine                                  |
| Intent Router                                   |
| Mode Registry                                   |
| RAG Engine                                      |
| Concept Map Engine                              |
| Academic Generator                              |
| Validator Engine                                |
---------------------------------------------------
    ↓
LLM Layer (multi-model abstraction)
    ↓
Response Formatter
```

### Storage Layer

- Firestore → metadata
- Firebase Storage → dokumen mentah
- Vector DB → embeddings (namespace per project)
- Redis → cache (retrieval + context)

---

## III. Firebase Data Structure (Final)

### 1) `users`

```text
users/{uid}
    email
    plan_tier
    academic_profile:
        default_degree_level
        default_field
    usage:
        monthly_tokens
        last_reset
    created_at
```

### 2) `projects`

```text
projects/{project_id}
    uid
    title
    degree_level
    field
    research_type
    methodology
    variables[]
    problem_statement
    abstract_snapshot
    context_summary
    created_at
    updated_at
```

> `context_summary` adalah ringkasan global auto-generated dari seluruh dokumen.  
> Digunakan untuk context injection cepat tanpa retrieval penuh di setiap request.

### 3) `documents` (subcollection)

```text
projects/{project_id}/documents/{doc_id}
    type (bab1, bab2, jurnal, proposal)
    file_url
    token_count
    chunk_count
    embedding_status (pending | processing | ready)
    created_at
```

### 4) `conversations`

```text
projects/{project_id}/conversations/{chat_id}
    mode
    context_snapshot
    last_summary
    created_at
```

### 5) `messages`

```text
conversations/{chat_id}/messages/{message_id}
    role
    content
    token_usage
    timestamp
```

---

## IV. Document Processing Pipeline (Async Worker)

Saat user upload file:

1. Upload ke Firebase Storage
2. Simpan record dokumen ke Firestore
3. Trigger task queue ke worker
4. Worker mengeksekusi pipeline:

```text
1. Download file
2. Extract text
3. Clean & normalize
4. Chunk (1000 tokens, overlap 150)
5. Generate embeddings
6. Insert ke Vector DB
7. Update Firestore embedding_status = ready
8. Update project context_summary (LLM summarize global)
```

`context_summary` wajib dipelihara karena menjadi komponen utama quick context injection.

---

## V. Academic Orchestrator (Production Detail)

Core execution object:

```python
class AcademicOrchestrator:
    def execute(request):
        plan = build_execution_plan(request)
        context = ContextEngine.build(plan)
        retrieved_docs = RAGEngine.retrieve(plan, context)
        draft = ModeRegistry.run(plan, context, retrieved_docs)
        validated = Validator.review(draft, plan)
        final = post_process(validated)
        return final
```

---

## VI. Execution Plan Object

```text
ExecutionPlan:
    request_id
    project_id
    user_id
    mode
    intent
    requires_rag (bool)
    requires_validation (bool)
    degree_level
    tone_profile
    max_tokens
```

Execution plan dibentuk **sebelum generation** agar alur deterministic dan tidak mengandalkan improvisasi model.

---

## VII. Context Engine (Critical)

Context dibangun dari 4 layer:

1. **Static Project Metadata**
   - Judul
   - Metodologi
   - Variabel
   - Degree level
2. **Context Summary**
   - Ringkasan global project
3. **Conversation Snapshot**
   - Ringkasan 5–10 pesan terakhir
4. **Retrieved Documents (RAG)**

Outputnya adalah satu paket terstruktur:

```text
ACADEMIC_CONTEXT_PACKAGE
```

---

## VIII. RAG Engine (Production)

Flow utama:

```text
query_embedding
→ vector search (namespace = project_id)
→ top 20
→ re-rank similarity
→ drop below threshold
→ top 5 final
```

Hardening yang harus ada:

- Metadata filter per bab
- Diversity scoring
- Confidence score output

Jika confidence rendah, sistem harus merespons dengan **epistemic humility** (mengakui keterbatasan bukti/konteks).

---

## IX. Mode Registry System

Gunakan plugin architecture:

```python
class BasePipeline:
    prepare()
    generate()
    post_process()
    validate()
```

### Modes Production v1

1. **writing**
   - Structured academic output
   - RAG required
2. **critique**
   - Analytical breakdown
   - Weakness identification
   - Improvement suggestions
3. **concept_map**
   - Main concept extraction
   - Hierarchy detection
   - Relationship classification
   - JSON graph output
4. **mind_map**
   - Eksploratif
   - Non-linear associative mapping
5. **sidang_simulation**
   - Persona-based questioning engine

---

## X. Concept Map Engine (Detailed)

Pipeline:

```text
1. Extract candidate concepts (LLM pass 1)
2. Normalize terms (post-process)
3. Cluster by hierarchy (LLM pass 2)
4. Detect relation type
5. Validate JSON schema
```

Output schema:

```json
{
  "nodes": [{"id": "...", "label": "...", "level": 1}],
  "edges": [{"source": "...", "target": "...", "relation_type": "..."}]
}
```

Schema validator wajib dieksekusi sebelum payload dikirim ke frontend.

---

## XI. Academic Generation Framework

Semua output generation harus melalui structure enforcement.

Internal template:

```text
[Theoretical Framing]
[Argument Development]
[Evidence Integration]
[Analytical Linkage]
[Synthesis]
```

Degree-level modifier:

- S1 → moderate complexity
- S2 → analytical
- S3 → critical dengan theoretical depth

---

## XII. Validator Engine (Double Pass)

### Pass 1 – Structural Integrity

- Logical flow jelas
- Coherent transition
- Thesis statement kuat

### Pass 2 – Academic Integrity

- Deteksi unsupported claim
- Deteksi overconfidence
- Deteksi citation hallucination pattern

Jika gagal validasi:

- Lakukan refinement prompt berbasis feedback spesifik
- Ulangi pass validasi sampai memenuhi ambang minimum

---

## XIII. Conversation Memory Strategy

Jangan inject seluruh history.

Strategi:

- Auto-summary tiap 15 message
- Simpan sebagai `context_snapshot`
- Inject snapshot + 3 pesan terakhir

Tujuan: token usage stabil dan latency terjaga.

---

## XIV. Security Design

- Namespace vector per project
- JWT verification di setiap request
- Strict Firestore rule berdasarkan `uid`
- File access via signed URL

---

## XV. System Characteristics (Target)

### Latency Target

- Writing mode < 8 detik
- Concept map < 6 detik
- Critique < 10 detik

### Scalability

- Stateless backend API
- Horizontal scaling API
- Worker dipisah dari request path

### Robustness

- Retry pada embedding failure
- Graceful fallback jika RAG gagal

---

## Final Outcome

Dengan blueprint ini, OnThesis menjadi:

- Project-aware
- Document-grounded
- Structured reasoning
- Academic-validator enforced
- Multi-mode intelligent system
- Production scalable

**Bukan sekadar AI wrapper.**
