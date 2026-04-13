# OnThesis Agent — Sprint Aktualisasi 40% → 70% Blueprint
**Target**: Effective production-readiness naik dari ~40% ke ~70%  
**Durasi**: 10 hari kerja (2 sprint × 5 hari)  
**Executor**: AI Agent (Antigravity / agentic coding tool)  
**Blueprint acuan**: `onthesis-agent-blueprint.md`  
**Audit acuan**: `AGENT_WRITING_GAP_AUDIT.md`

---

## Cara Membaca Dokumen Ini

Setiap story memiliki format:
- **Objective** — apa yang harus dicapai
- **Files** — file mana yang disentuh
- **Exact changes** — instruksi kode level spesifik
- **Do NOT touch** — batasan agar agent tidak merusak hal yang sudah berjalan
- **Acceptance criteria** — definisi "done" yang bisa diverifikasi
- **Test yang harus dibuat/diubah**

Agent harus mengerjakan story secara berurutan dalam sprint yang sama. Jangan melompat antar sprint.

---

## Ringkasan Target Per Komponen

| Komponen | Sekarang | Target Sprint |
|---|---|---|
| DocumentMemory end-to-end | 35% | 85% |
| UserProfileMemory (real persistence) | 40% | 80% |
| Plan executor (durable trace) | 50% | 80% |
| Unified runtime | 25% | 65% |
| Worker context contract | 20% | 70% |
| SharedMemory.build_agent_context() | 45% | 75% |
| Token budget aktif di routing | 25% | 65% |
| Frontend ↔ backend history sync | 15% | 55% |

---

# SPRINT 1 (Hari 1–5): P0 Blockers

## Story S1-1: Perbaiki Bug `DocumentMemory.get_section()`

**Prioritas**: P0 — blocker untuk semua story DocumentMemory lainnya  
**Estimasi**: 1–2 jam

### Objective
`DocumentMemory.get_section()` memanggil `self.vector_db.scroll(...)` tanpa parameter `order_by`, padahal `QdrantVectorDB.scroll()` mensyaratkannya. Bug ini harus diperbaiki sebelum DocumentMemory bisa dipakai di jalur produksi.

### Files
- `app/agent/memory_system.py` — method `DocumentMemory.get_section()`
- `app/vector_db/qdrant_wrapper.py` (atau path wrapper Qdrant yang dipakai) — periksa signature `scroll()`

### Exact Changes

**Langkah 1**: Cari signature `QdrantVectorDB.scroll()` di wrapper. Catat parameter yang wajib ada. Biasanya berbentuk:
```python
def scroll(self, collection: str, scroll_filter=None, limit=100, order_by: str = None) -> list:
```

**Langkah 2**: Di `DocumentMemory.get_section()`, ubah panggilan `scroll()` agar menyertakan `order_by`. Jika konten chapter diidentifikasi oleh field `chunk_index` atau `position`, gunakan itu. Jika tidak ada field ordering yang jelas, gunakan `"chunk_index"` dan pastikan field tersebut ada di payload saat dokumen di-insert.

Sebelum (contoh bentuk buggy):
```python
def get_section(self, doc_id: str, section: str) -> list[str]:
    results = self.vector_db.scroll(
        collection="thesis_documents",
        scroll_filter={"doc_id": doc_id, "section": section},
        limit=50
    )
    return [r.payload.get("content", "") for r in results]
```

Sesudah:
```python
def get_section(self, doc_id: str, section: str) -> list[str]:
    results = self.vector_db.scroll(
        collection="thesis_documents",
        scroll_filter={"doc_id": doc_id, "section": section},
        limit=50,
        order_by="chunk_index"   # <-- tambahkan ini
    )
    return [r.payload.get("content", "") for r in results]
```

**Langkah 3**: Pastikan `DocumentMemory.add_or_update_chunk()` selalu menyertakan `chunk_index` dalam payload saat menyimpan ke vector DB. Jika tidak ada, tambahkan parameter `chunk_index: int = 0` ke method signature dan sertakan ke payload.

### Do NOT Touch
- Jangan ubah signature `QdrantVectorDB.scroll()` itu sendiri jika sudah ada parameter `order_by` — cukup pastikan caller mengisinya.
- Jangan refactor `DocumentMemory` lebih dari yang diperlukan di story ini.

### Acceptance Criteria
- [ ] `DocumentMemory.get_section("doc_123", "bab_1")` tidak melempar exception terkait `order_by`
- [ ] Return value adalah list string yang terurut berdasarkan `chunk_index`
- [ ] Tidak ada regression pada test yang sudah ada untuk `add_or_update_chunk()`

### Tests
Tambahkan di test file DocumentMemory yang sudah ada:
```python
def test_get_section_returns_ordered_chunks():
    mem = DocumentMemory(fake_vector_db)
    mem.add_or_update_chunk("doc_1", "bab_1", "isi pertama", chunk_index=0)
    mem.add_or_update_chunk("doc_1", "bab_1", "isi kedua", chunk_index=1)
    result = mem.get_section("doc_1", "bab_1")
    assert result[0] == "isi pertama"
    assert result[1] == "isi kedua"
```

---

## Story S1-2: Wire Editor Save ke `DocumentMemory`

**Prioritas**: P0  
**Estimasi**: 3–4 jam

### Objective
Setiap kali user menyimpan konten chapter di editor, konten tersebut harus masuk ke `DocumentMemory.add_or_update_chunk()`. Ini adalah jembatan antara editing harian dan memori agent. Tanpa ini, DocumentMemory tidak pernah terisi data nyata dari user.

### Files
**Backend**:
- `app/routes/editor.py` atau route yang menangani `POST /api/editor/save` (atau endpoint save chapter yang ada)
- `app/agent/memory_system.py` — tidak perlu diubah, hanya dipanggil

**Frontend** (jika save dilakukan via frontend hook):
- `frontend_spa/src/features/writing/hooks/useEditorSave.js` (atau nama yang setara)

### Exact Changes

**Langkah 1**: Temukan endpoint backend yang menerima save konten chapter. Biasanya `POST /api/editor/save` atau `PUT /api/projects/{project_id}/chapters/{chapter_id}`. Jika tidak ada, cari route di `app/routes/` yang meng-handle chapter content update.

**Langkah 2**: Di handler endpoint tersebut, setelah konten berhasil disimpan ke database utama, tambahkan panggilan async ke DocumentMemory:

```python
# Di dalam handler save chapter, setelah DB save berhasil:
from app.agent.memory_system import DocumentMemory, SharedMemory

async def save_chapter_content(request, project_id: str, chapter_id: str):
    body = await request.json()
    content = body.get("content", "")
    
    # ... existing save logic ke DB utama ...
    await db.save_chapter(project_id, chapter_id, content)
    
    # === TAMBAHKAN INI ===
    try:
        shared_mem = SharedMemory(
            user_id=request.state.user_id,
            project_id=project_id,
            vector_db=get_vector_db(),
            db=get_db()
        )
        # Pecah konten jadi chunks (paragraph-level)
        chunks = _split_into_chunks(content, max_chars=800)
        for idx, chunk in enumerate(chunks):
            await shared_mem.document.add_or_update_chunk(
                doc_id=f"{project_id}:{chapter_id}",
                section=chapter_id,
                content=chunk,
                chunk_index=idx
            )
    except Exception as e:
        # Non-fatal — jangan gagalkan save utama karena memory error
        logger.warning(f"DocumentMemory update failed for {project_id}/{chapter_id}: {e}")
    # === AKHIR TAMBAHAN ===
    
    return {"status": "ok"}


def _split_into_chunks(text: str, max_chars: int = 800) -> list[str]:
    """Pecah teks per paragraf, gabungkan paragraf pendek."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks = []
    current = ""
    for para in paragraphs:
        if len(current) + len(para) > max_chars and current:
            chunks.append(current.strip())
            current = para
        else:
            current = (current + "\n\n" + para).strip()
    if current:
        chunks.append(current)
    return chunks if chunks else [text]
```

**Langkah 3**: Pastikan `SharedMemory` bisa diinisialisasi dengan `project_id`. Lihat S1-2 berhubungan dengan S2-1 — jika `SharedMemory.__init__` belum menerima `project_id`, tambahkan parameter tersebut (lihat Story S2-1 untuk detail lebih lanjut tentang SharedMemory init).

**Langkah 4**: Tambahkan juga trigger DocumentMemory saat **chapter pertama kali diload** (bukan hanya saat save), khususnya untuk chapter yang sudah ada sebelum fitur ini aktif. Ini dilakukan via background job ringan:

```python
# Di route GET /api/projects/{project_id}/chapters/{chapter_id}
# Tambahkan setelah fetch chapter content:
asyncio.create_task(
    _backfill_document_memory(project_id, chapter_id, content, user_id)
)

async def _backfill_document_memory(project_id, chapter_id, content, user_id):
    """Isi DocumentMemory jika belum ada chunks untuk chapter ini."""
    shared_mem = SharedMemory(user_id, project_id, get_vector_db(), get_db())
    existing = shared_mem.document.get_section(f"{project_id}:{chapter_id}", chapter_id)
    if not existing:
        chunks = _split_into_chunks(content)
        for idx, chunk in enumerate(chunks):
            await shared_mem.document.add_or_update_chunk(
                doc_id=f"{project_id}:{chapter_id}",
                section=chapter_id,
                content=chunk,
                chunk_index=idx
            )
```

### Do NOT Touch
- Jangan ubah logika save utama ke DB. Tambahan DocumentMemory harus sepenuhnya wrapped di `try/except` dan non-fatal.
- Jangan ubah `DocumentMemory.add_or_update_chunk()` signature kecuali perlu karena S1-1.

### Acceptance Criteria
- [ ] Setelah user save chapter, `DocumentMemory.get_section(project_chapter_id, chapter_id)` mengembalikan konten yang baru disimpan
- [ ] Jika vector DB down, save chapter ke DB utama tetap berhasil (non-fatal)
- [ ] Backfill trigger tidak memblokir response GET chapter

### Tests
```python
@pytest.mark.asyncio
async def test_save_chapter_writes_to_document_memory(mock_vector_db, mock_db):
    # Setup
    shared_mem = SharedMemory("user_1", "proj_1", mock_vector_db, mock_db)
    
    # Simulate save
    await save_chapter_content_handler(
        project_id="proj_1", 
        chapter_id="bab_1",
        content="Bab pertama berisi tentang latar belakang penelitian ini."
    )
    
    # Verify DocumentMemory updated
    result = shared_mem.document.get_section("proj_1:bab_1", "bab_1")
    assert len(result) > 0
    assert "latar belakang" in result[0]

@pytest.mark.asyncio
async def test_save_chapter_succeeds_even_if_document_memory_fails(mock_db):
    # Simulate vector DB failure
    broken_vector_db = Mock(side_effect=Exception("vector db down"))
    # Save should still return 200
    response = await save_chapter_content_handler(
        project_id="proj_1", chapter_id="bab_1",
        content="test", vector_db=broken_vector_db
    )
    assert response["status"] == "ok"
```

---

## Story S1-3: Ganti `DummyDocumentDB` dengan Real Persistence untuk Profile

**Prioritas**: P0  
**Estimasi**: 3–4 jam

### Objective
`SupervisorAgent` saat ini menginisialisasi `UserProfileMemory` dengan `DummyDocumentDB()`. Ini membuat profil user tidak pernah tersimpan permanen. Ganti dengan koneksi ke database nyata (Firestore, PostgreSQL, atau DB yang sudah dipakai aplikasi).

### Files
- `app/agent/supervisor.py` — lokasi `DummyDocumentDB()` ditemukan
- `app/agent/memory_system.py` — `UserProfileMemory` dan backing store-nya
- `app/db/` atau `app/database/` — cari adapter DB yang sudah ada

### Exact Changes

**Langkah 1**: Di `supervisor.py`, cari inisialisasi yang berbentuk:
```python
# Sebelum (bentuk buggy):
profile_db = DummyDocumentDB()
self.memory = SharedMemory(user_id=user_id, vector_db=vector_db, db=profile_db)
```

**Langkah 2**: Periksa adapter DB yang sudah ada di `app/db/`. Jika ada `FirestoreDB`, `PostgresDB`, atau `SQLiteDB`, gunakan itu. Jika tidak ada, buat adapter minimal:

```python
# app/db/profile_store.py — buat file baru jika belum ada
class ProfileStore:
    """
    Persistent backing store untuk UserProfile.
    Gunakan Firestore jika sudah dipakai, atau fallback ke SQLite.
    """
    
    def __init__(self, firestore_client=None, sqlite_path: str = None):
        self._mode = "firestore" if firestore_client else "sqlite"
        if self._mode == "firestore":
            self._fs = firestore_client
            self._collection = "user_profiles"
        else:
            import sqlite3, json
            self._path = sqlite_path or "/tmp/onthesis_profiles.db"
            self._conn = sqlite3.connect(self._path, check_same_thread=False)
            self._conn.execute(
                "CREATE TABLE IF NOT EXISTS profiles "
                "(user_id TEXT PRIMARY KEY, data TEXT, updated_at TEXT)"
            )
            self._conn.commit()
    
    def save(self, profile) -> None:
        import json, datetime
        data = profile.__dict__ if hasattr(profile, '__dict__') else dict(profile)
        # Serialize datetime fields
        serialized = {
            k: v.isoformat() if hasattr(v, 'isoformat') else v
            for k, v in data.items()
        }
        if self._mode == "firestore":
            self._fs.collection(self._collection).document(profile.user_id).set(serialized)
        else:
            self._conn.execute(
                "INSERT OR REPLACE INTO profiles VALUES (?, ?, ?)",
                (profile.user_id, json.dumps(serialized), datetime.datetime.utcnow().isoformat())
            )
            self._conn.commit()
    
    def load(self, user_id: str) -> dict | None:
        import json
        if self._mode == "firestore":
            doc = self._fs.collection(self._collection).document(user_id).get()
            return doc.to_dict() if doc.exists else None
        else:
            row = self._conn.execute(
                "SELECT data FROM profiles WHERE user_id = ?", (user_id,)
            ).fetchone()
            return json.loads(row[0]) if row else None
```

**Langkah 3**: Update `UserProfileMemory.get_or_create()` agar load dari DB sebelum membuat profil baru:

```python
# Di memory_system.py, class UserProfileMemory:

def get_or_create(self, user_id: str) -> UserProfile:
    if user_id not in self.profiles:
        # === TAMBAHKAN: Coba load dari persistent store dulu ===
        saved = self.db.load(user_id) if self.db else None
        if saved:
            self.profiles[user_id] = UserProfile(**saved)
        else:
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
```

**Langkah 4**: Pastikan `UserProfileMemory.update_from_conversation()` memanggil `self.db.save(profile)` setelah update (ini sudah ada di blueprint — verifikasi bahwa implementasinya benar-benar memanggil save).

**Langkah 5**: Di `supervisor.py`, update inisialisasi:
```python
# Sesudah — gunakan real store:
from app.db.profile_store import ProfileStore
from app.dependencies import get_firestore_client  # atau equivalent

profile_store = ProfileStore(firestore_client=get_firestore_client())
self.memory = SharedMemory(
    user_id=user_id,
    project_id=project_id,
    vector_db=get_vector_db(),
    db=profile_store
)
```

### Do NOT Touch
- Jangan hapus `DummyDocumentDB` dari codebase — rename menjadi `InMemoryProfileStore` dan pertahankan untuk test environment.
- Jangan ubah `UserProfile` dataclass structure.

### Acceptance Criteria
- [ ] `UserProfileMemory.get_or_create("user_123")` mengembalikan profil yang sama setelah `SupervisorAgent` di-restart (atau diinisialisasi ulang)
- [ ] `update_from_conversation()` menyebabkan perubahan yang tersimpan ke DB
- [ ] Test environment masih bisa menggunakan `InMemoryProfileStore` sebagai mock

### Tests
```python
def test_user_profile_persists_across_memory_instances(real_profile_store):
    mem1 = UserProfileMemory(real_profile_store)
    profile = mem1.get_or_create("user_abc")
    profile.thesis_topic = "machine learning pendidikan"
    mem1.db.save(profile)
    
    # Simulasi restart: buat instance baru
    mem2 = UserProfileMemory(real_profile_store)
    loaded = mem2.get_or_create("user_abc")
    assert loaded.thesis_topic == "machine learning pendidikan"
```

---

## Story S1-4: Durable Plan Trace di `PlanExecutor`

**Prioritas**: P0  
**Estimasi**: 2–3 jam

### Objective
Saat ini `ConversationMemory.store_plan()` hanya menyimpan plan di memori proses — bukan durable. Setelah restart atau Redis down, trace hilang. Blueprint mengasumsikan plan execution trace bisa dijadikan audit trail. Target story ini: plan dan execution trace tersimpan ke DB yang sama dengan profile store.

### Files
- `app/agent/memory_system.py` — `ConversationMemory.store_plan()` dan `PlanExecutor.execute()`
- `app/agent/supervisor.py` — periksa di mana `PlanExecutor` diinisialisasi
- `app/db/profile_store.py` — extend untuk menyimpan plan trace (dari S1-3)

### Exact Changes

**Langkah 1**: Extend `ProfileStore` (atau buat `PlanTraceStore` terpisah) untuk menyimpan plan trace:

```python
# Tambahkan ke app/db/profile_store.py atau buat app/db/plan_trace_store.py

class PlanTraceStore:
    """Persistent store untuk plan execution traces."""
    
    def __init__(self, firestore_client=None, sqlite_path: str = None):
        # Setup mirip ProfileStore
        self._mode = "firestore" if firestore_client else "sqlite"
        if self._mode == "sqlite":
            import sqlite3
            self._path = sqlite_path or "/tmp/onthesis_plans.db"
            self._conn = sqlite3.connect(self._path, check_same_thread=False)
            self._conn.execute("""
                CREATE TABLE IF NOT EXISTS plan_traces (
                    plan_id TEXT PRIMARY KEY,
                    user_id TEXT,
                    project_id TEXT,
                    intent TEXT,
                    user_query TEXT,
                    status TEXT,
                    steps_json TEXT,
                    final_output TEXT,
                    created_at TEXT,
                    completed_at TEXT
                )
            """)
            self._conn.commit()
    
    def save_plan(self, plan, user_id: str, project_id: str, final_output: str = None):
        import json, datetime
        steps_data = []
        for step in plan.steps:
            steps_data.append({
                "step_id": step.step_id,
                "agent": step.agent,
                "tool": step.tool,
                "status": getattr(step, "status", "unknown"),
                "error": getattr(step, "error", None)
            })
        
        if self._mode == "sqlite":
            self._conn.execute("""
                INSERT OR REPLACE INTO plan_traces
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                plan.plan_id,
                user_id,
                project_id,
                plan.intent,
                plan.user_query,
                plan.status,
                json.dumps(steps_data),
                final_output or "",
                plan.created_at.isoformat() if hasattr(plan.created_at, 'isoformat') else str(plan.created_at),
                datetime.datetime.utcnow().isoformat()
            ))
            self._conn.commit()
        elif self._mode == "firestore":
            self._fs.collection("plan_traces").document(plan.plan_id).set({
                "user_id": user_id,
                "project_id": project_id,
                "intent": plan.intent,
                "user_query": plan.user_query,
                "status": plan.status,
                "steps": steps_data,
                "final_output": final_output or "",
                "created_at": plan.created_at,
                "completed_at": datetime.datetime.utcnow()
            })
    
    def get_recent_plans(self, user_id: str, project_id: str, limit: int = 5) -> list[dict]:
        if self._mode == "sqlite":
            import json
            rows = self._conn.execute("""
                SELECT plan_id, intent, user_query, status, created_at
                FROM plan_traces
                WHERE user_id = ? AND project_id = ?
                ORDER BY created_at DESC LIMIT ?
            """, (user_id, project_id, limit)).fetchall()
            return [
                {"plan_id": r[0], "intent": r[1], "user_query": r[2], 
                 "status": r[3], "created_at": r[4]}
                for r in rows
            ]
        return []
```

**Langkah 2**: Update `PlanExecutor.execute()` agar memanggil `plan_trace_store.save_plan()` setelah eksekusi selesai:

```python
# Di PlanExecutor.execute(), bagian akhir sebelum return:
# Setelah: plan.status = "done"

# === TAMBAHKAN ===
if hasattr(self, 'plan_trace_store') and self.plan_trace_store:
    try:
        self.plan_trace_store.save_plan(
            plan=plan,
            user_id=self.user_id,
            project_id=self.project_id,
            final_output=str(final_output)[:2000]  # truncate jika terlalu panjang
        )
    except Exception as e:
        logger.warning(f"Plan trace save failed: {e}")
# === AKHIR TAMBAHAN ===

return final_output
```

**Langkah 3**: Tambahkan `plan_trace_store`, `user_id`, dan `project_id` ke `PlanExecutor.__init__()`:
```python
def __init__(self, agents: dict, memory: SharedMemory, 
             plan_trace_store=None, user_id: str = None, project_id: str = None):
    self.agents = agents
    self.memory = memory
    self.plan_trace_store = plan_trace_store
    self.user_id = user_id
    self.project_id = project_id
    self.results = {}
    self.max_steps = 6
    self.timeout_per_step = 20
```

**Langkah 4**: Update inisialisasi `PlanExecutor` di `supervisor.py` untuk menyertakan `plan_trace_store`.

### Do NOT Touch
- Jangan ubah `TaskPlan` atau `TaskStep` dataclass.
- Jangan ubah core execution logic di `PlanExecutor.execute()` — hanya tambahkan persistence call.

### Acceptance Criteria
- [ ] Setelah `PlanExecutor.execute()` selesai, trace tersimpan di `plan_traces` table/collection
- [ ] `PlanTraceStore.get_recent_plans(user_id, project_id)` mengembalikan minimal plan yang baru saja dieksekusi
- [ ] Jika trace store gagal, eksekusi plan tetap berhasil (non-fatal)

---

## Story S1-5: Unified Runtime — Migrasi Generator Chapters ke SSE Loop

**Prioritas**: P0 (parsial — mulai migrasi, selesaikan di Sprint 2)  
**Estimasi**: 4–5 jam

### Objective
Generator tabs (Chapter 1–5) masih memakai `useStreamGenerator.js` dengan endpoint `POST /api/assistant/generate-stream`. Target story ini: buat adapter layer sehingga generator tabs memanggil `/api/agent/run` yang sama dengan `AgentPanel`, tanpa breaking change pada UX.

### Files
**Frontend**:
- `frontend_spa/src/features/writing/hooks/useStreamGenerator.js` — jangan ubah interface-nya, ubah implementasinya
- `frontend_spa/src/features/writing/components/Assistant/generators/Chapter1-5/index.jsx` — periksa apakah ada params khusus
- `frontend_spa/src/features/writing/hooks/useAgentLoop.js` — tambahkan mode `generator`

**Backend**:
- `app/routes/agent.py` — `POST /api/agent/run` — pastikan bisa menerima request dari generator context

### Exact Changes

**Langkah 1**: Di `useStreamGenerator.js`, bungkus implementasi lama dan tambahkan feature flag:

```javascript
// frontend_spa/src/features/writing/hooks/useStreamGenerator.js
// JANGAN HAPUS implementasi lama — wrap dulu

import { useAgentLoop } from './useAgentLoop';
import { useCallback, useRef, useState } from 'react';

const USE_AGENT_RUNTIME = true; // Feature flag — set false untuk rollback

export function useStreamGenerator({ projectId, chapterId, userId }) {
  const agentLoop = useAgentLoop({ projectId, userId });
  const [isStreaming, setIsStreaming] = useState(false);
  const [output, setOutput] = useState('');
  const abortRef = useRef(null);

  const generate = useCallback(async ({ prompt, generatorType, context }) => {
    if (!USE_AGENT_RUNTIME) {
      // Legacy path — jangan hapus sampai migrasi verified
      return legacyGenerate({ prompt, generatorType, context });
    }

    setIsStreaming(true);
    setOutput('');

    // Map generator type ke intent yang dikenali supervisor
    const intentMap = {
      'chapter_1': 'generate_chapter',
      'chapter_2': 'generate_chapter',
      'literature_review': 'literature_review',
      'paraphrase': 'paraphrase',
      'rewrite': 'rewrite_paragraph',
    };
    
    const mappedIntent = intentMap[generatorType] || 'generate_chapter';

    // Build message yang kompatibel dengan /api/agent/run
    const agentMessage = {
      message: prompt,
      intent_hint: mappedIntent,
      chapter_id: chapterId,
      generator_context: context || {},
      // Flag agar supervisor tahu ini dari generator, bukan AgentPanel
      source: 'generator_tab'
    };

    try {
      abortRef.current = new AbortController();
      
      const eventSource = await agentLoop.run(agentMessage, {
        signal: abortRef.current.signal,
        onTextDelta: (delta) => setOutput(prev => prev + delta),
        onDone: () => setIsStreaming(false),
        onError: (err) => {
          console.error('Generator agent error:', err);
          setIsStreaming(false);
        }
      });

      return eventSource;
    } catch (err) {
      setIsStreaming(false);
      throw err;
    }
  }, [agentLoop, chapterId, projectId]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return { generate, abort, isStreaming, output };
}
```

**Langkah 2**: Di `useAgentLoop.js`, tambahkan method `run()` yang bisa dipanggil secara programatik (bukan hanya dari form submit):

```javascript
// Di useAgentLoop.js, tambahkan method run yang return-able:
const run = useCallback(async (messagePayload, callbacks = {}) => {
  const { onTextDelta, onDone, onError, signal } = callbacks;
  
  const response = await fetch('/api/agent/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: messagePayload.message,
      project_id: projectId,
      user_id: userId,
      messages_history: getRecentHistory(), // dari state loop
      ...messagePayload
    }),
    signal
  });

  if (!response.ok) throw new Error(`Agent run failed: ${response.status}`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(l => l.startsWith('data:'));
    
    for (const line of lines) {
      try {
        const event = JSON.parse(line.slice(5));
        if (event.type === 'TEXT_DELTA' && onTextDelta) onTextDelta(event.delta);
        if (event.type === 'DONE' && onDone) onDone(event);
        if (event.type === 'ERROR' && onError) onError(event);
      } catch (e) { /* skip malformed event */ }
    }
  }
}, [projectId, userId, getRecentHistory]);

// Pastikan run di-expose dari hook:
return { ..., run };
```

**Langkah 3**: Di backend `app/routes/agent.py`, pastikan `run_agent_sse()` menangani `source: 'generator_tab'` dari request body — tidak perlu logic khusus, tapi jangan reject karena field tidak dikenal.

**Langkah 4**: Verifikasi `Chapter1-5/index.jsx` masih bisa menerima `output` dan `isStreaming` dari hook yang baru. Interface tidak berubah, hanya implementasi di dalam hook.

### Do NOT Touch
- Jangan hapus `legacyGenerate` dari `useStreamGenerator.js` — pertahankan sebagai rollback
- Jangan ubah `AgentPanel.jsx` — migrasi ini tidak boleh merusak panel utama
- Jangan ubah `POST /api/assistant/generate-stream` backend route

### Acceptance Criteria
- [ ] Chapter generator tabs menghasilkan output melalui `/api/agent/run` (verifiable dari network tab browser)
- [ ] Output quality tidak berbeda signifikan dari sebelumnya
- [ ] `USE_AGENT_RUNTIME = false` mengembalikan ke legacy path tanpa error
- [ ] `AgentPanel` tidak terpengaruh

---

# SPRINT 2 (Hari 6–10): P1 — Architecture Hardening

## Story S2-1: Standardisasi `SharedMemory` Init dengan `project_id`

**Prioritas**: P1 — prasyarat untuk semua story lainnya di Sprint 2  
**Estimasi**: 2 jam

### Objective
`SharedMemory` saat ini diinisialisasi dengan `user_id` saja. Blueprint dan implementasi sekarang sudah pakai `project_scope = "{user_id}:{project_id}"`, tetapi `project_id` tidak selalu tersedia saat init. Story ini menstandarkan init dan memastikan semua caller menyertakan `project_id`.

### Files
- `app/agent/memory_system.py` — `SharedMemory.__init__()`
- `app/agent/supervisor.py` — caller utama
- `app/routes/agent.py` — caller dari route

### Exact Changes

**Langkah 1**: Pastikan `SharedMemory.__init__()` memiliki signature:
```python
def __init__(self, user_id: str, project_id: str, vector_db, db):
    self.user_id = user_id
    self.project_id = project_id
    self.scope = f"{user_id}:{project_id}"
    self.conversation = ConversationMemory(max_turns=20, scope=self.scope)
    self.document = DocumentMemory(vector_db)
    self.research = ResearchMemory(vector_db)
    self.profile = UserProfileMemory(db)
```

**Langkah 2**: Update semua caller. Cari semua `SharedMemory(` di codebase dan pastikan `project_id` disertakan.

**Langkah 3**: Di `app/routes/agent.py`, pastikan `project_id` diambil dari request body:
```python
# Di run_agent_sse():
project_id = body.get("project_id") or "default"
user_id = request.state.user_id
shared_mem = SharedMemory(user_id=user_id, project_id=project_id, 
                          vector_db=get_vector_db(), db=get_db())
```

### Acceptance Criteria
- [ ] Tidak ada `SharedMemory(user_id=...)` tanpa `project_id` di seluruh codebase
- [ ] `shared_mem.scope` selalu berformat `"{user_id}:{project_id}"`

---

## Story S2-2: Worker Context Contract Seragam

**Prioritas**: P1  
**Estimasi**: 4–5 jam

### Objective
Hanya `WritingAgent` yang context-aware. `ResearchAgent`, `AnalysisAgent`, `DiagnosticAgent`, dan `ChapterSkillsAgent` belum memakai `SharedMemory.build_agent_context()`. Standardisasi ini memastikan semua worker punya akses ke konteks yang sama.

### Files
- `app/agent/memory_system.py` — `SharedMemory.build_agent_context()`
- `app/agent/research_agent.py`
- `app/agent/analysis_agent.py`
- `app/agent/diagnostic_agent.py`
- `app/agent/chapter_skills_agent.py`
- `app/agent/base_agent.py` (jika ada base class)

### Exact Changes

**Langkah 1**: Pastikan semua agent memiliki `base class` yang menerima `memory` parameter. Jika belum ada base class, buat:

```python
# app/agent/base_agent.py
class BaseAgent:
    def __init__(self, memory: 'SharedMemory' = None):
        self.memory = memory
    
    def get_context(self, query: str) -> dict:
        """Ambil context standar untuk query ini."""
        if not self.memory:
            return {}
        return self.memory.build_agent_context(query)
    
    async def run_tool(self, tool_name: str, input_data, params: dict = None, memory=None):
        """Override di subclass. memory param untuk backward compat."""
        raise NotImplementedError
```

**Langkah 2**: Update setiap agent untuk menggunakan context. Pola yang harus diikuti:

```python
# Contoh: research_agent.py
class ResearchAgent(BaseAgent):
    
    async def run_tool(self, tool_name: str, input_data, params: dict = None, memory=None):
        # Gunakan memory dari parameter atau dari self
        active_memory = memory or self.memory
        
        # Build context HANYA jika perlu (hindari retrieval mahal untuk operasi sederhana)
        context = {}
        if active_memory and tool_name in ["search_papers", "generate_literature_review"]:
            context = active_memory.build_agent_context(str(input_data)[:200])
        
        if tool_name == "search_papers":
            return await self._search_papers(input_data, params, context)
        elif tool_name == "rank_papers":
            return await self._rank_papers(input_data, params, context)
        # ... etc
    
    async def _search_papers(self, query, params, context: dict):
        # Gunakan context["user_profile"] untuk personalisasi hasil
        user_profile = context.get("user_profile", {})
        field = user_profile.get("field", "")
        
        # Enrich query dengan field dari profil
        enriched_query = f"{query} {field}".strip() if field else query
        
        # ... existing search logic dengan enriched_query ...
```

**Langkah 3**: Terapkan pola yang sama ke `AnalysisAgent`, `DiagnosticAgent`, dan `ChapterSkillsAgent`. Minimal: tambahkan `memory` parameter ke `__init__` dan `run_tool()`.

**Langkah 4**: Pastikan `SupervisorAgent` meneruskan `memory` saat menginisialisasi worker agents:
```python
# Di supervisor.py, saat init agents:
self.agents = {
    "research_agent": ResearchAgent(memory=self.memory),
    "writing_agent": WritingAgent(memory=self.memory),
    "analysis_agent": AnalysisAgent(memory=self.memory),
    "diagnostic_agent": DiagnosticAgent(memory=self.memory),
    "chapter_skills_agent": ChapterSkillsAgent(memory=self.memory),
}
```

### Do NOT Touch
- Jangan ubah logic bisnis di dalam setiap tool method — hanya tambahkan context injection
- Jangan ubah signature `run_tool(tool_name, input_data, params)` yang sudah ada — `memory` harus jadi optional parameter

### Acceptance Criteria
- [ ] Semua 5 agent (`Writing`, `Research`, `Analysis`, `Diagnostic`, `ChapterSkills`) memiliki `memory` attribute
- [ ] `ResearchAgent` menggunakan `user_profile.field` untuk enrich search query ketika tersedia
- [ ] Context injection tidak menambahkan latency lebih dari 200ms untuk tool yang tidak membutuhkan retrieval

### Tests
```python
def test_research_agent_uses_profile_context(mock_memory):
    mock_memory.build_agent_context.return_value = {
        "user_profile": {"field": "computer science", "thesis_topic": "deep learning"},
        "conversation_history": [],
        "relevant_thesis_sections": [],
        "known_papers_on_topic": None
    }
    
    agent = ResearchAgent(memory=mock_memory)
    # Verify context is used
    mock_memory.build_agent_context.assert_called_once()
```

---

## Story S2-3: Aktifkan Token Budget dan Fast-Path di Runtime Utama

**Prioritas**: P1  
**Estimasi**: 3 jam

### Objective
Dua hal yang perlu diselesaikan:
1. `TaskPlanner.estimated_tokens` sudah dihitung tapi tidak dipakai — hubungkan ke routing decision
2. Greeting dan general question masih memicu retrieval/embedding berat — tambahkan fast-path

### Files
- `app/routes/agent.py` — `run_agent_sse()` — tambahkan fast-path sebelum memory retrieval
- `app/agent/supervisor.py` — `process_request()` — gunakan estimated_tokens
- `app/agent/task_planner.py` — verifikasi `estimated_tokens` sudah dihitung

### Exact Changes

**Langkah 1**: Di `app/routes/agent.py`, pindahkan `_build_pruned_context()` agar dipakai oleh `run_agent_sse()`:

```python
# Di run_agent_sse(), sebelum memanggil supervisor.process_request():

# === FAST PATH CHECK ===
message = body.get("message", "")
fast_path_intents = _classify_fast_path(message)

if fast_path_intents:
    # Greeting, pertanyaan umum — skip memory retrieval
    if fast_path_intents == "greeting":
        yield _sse_event("TEXT_DELTA", {"delta": "Halo! Ada yang bisa saya bantu dengan tesis Anda?"})
        yield _sse_event("DONE", {})
        return
    # Untuk fast path lain, tetap lanjut ke supervisor tapi dengan flag
    body["skip_memory_retrieval"] = True

# === PRUNED CONTEXT ===
messages_history = body.get("messages_history", [])
pruned_context = _build_pruned_context(
    messages_history=messages_history,
    max_tokens=2000,
    project_context=body.get("project_context", {})
)
body["pruned_messages_history"] = pruned_context
```

**Langkah 2**: Tambahkan `_classify_fast_path()` di `app/routes/agent.py`:

```python
def _classify_fast_path(message: str) -> str | None:
    """
    Klasifikasi cepat tanpa LLM untuk request yang tidak perlu memory retrieval.
    Return: 'greeting' | 'general_question' | None
    """
    message_lower = message.strip().lower()
    
    GREETING_PATTERNS = [
        "halo", "hai", "hello", "hi", "selamat pagi", "selamat siang",
        "selamat sore", "selamat malam", "apa kabar", "hei"
    ]
    
    # Greeting: pesan pendek yang dimulai dengan kata sapaan
    if len(message_lower) < 50:
        if any(message_lower.startswith(g) for g in GREETING_PATTERNS):
            return "greeting"
        # Pertanyaan singkat yang tidak mengandung kata kunci akademik
        ACADEMIC_KEYWORDS = [
            "tesis", "bab", "referensi", "paper", "literature", "tulis",
            "edit", "parafrase", "analisis", "coherence", "citation"
        ]
        if not any(kw in message_lower for kw in ACADEMIC_KEYWORDS):
            if message_lower.endswith("?") and len(message_lower.split()) < 8:
                return "general_question"
    
    return None
```

**Langkah 3**: Di `supervisor.py`, setelah `TaskPlanner.generate_plan()` menghasilkan plan, periksa `estimated_tokens` untuk routing:

```python
# Di process_request(), setelah generate_plan():
plan = await self.planner.generate_plan(intent, message, self.memory)

# === TOKEN BUDGET CHECK ===
MAX_TOKENS_FOR_SIMPLE_PATH = 2000
if plan.estimated_tokens and plan.estimated_tokens > MAX_TOKENS_FOR_SIMPLE_PATH:
    # Log ke observability (story S2-4)
    logger.info(f"High token plan: {plan.estimated_tokens} tokens, intent={plan.intent}")
    
    # Untuk request sangat besar, pertimbangkan notifikasi ke user
    if plan.estimated_tokens > 8000:
        yield _supervisor_event("STEP", {
            "message": f"Memproses permintaan kompleks (~{plan.estimated_tokens // 1000}K token)..."
        })
```

### Acceptance Criteria
- [ ] Request "halo" atau "apa kabar" tidak memicu `memory.build_agent_context()` (verifiable via log)
- [ ] Request dengan `estimated_tokens > 8000` menghasilkan STEP event informasi ke frontend
- [ ] `_build_pruned_context()` dipanggil oleh `run_agent_sse()` sebelum meneruskan ke supervisor

### Tests
```python
def test_greeting_skips_memory_retrieval(mock_memory, test_client):
    response = test_client.post("/api/agent/run", json={
        "message": "halo",
        "project_id": "proj_1"
    })
    # Memory should not be called
    mock_memory.build_agent_context.assert_not_called()

def test_fast_path_classifier():
    assert _classify_fast_path("halo") == "greeting"
    assert _classify_fast_path("hai, apa kabar?") == "greeting"
    assert _classify_fast_path("tolong tulis bab 2 tesis saya") is None
    assert _classify_fast_path("bantu saya membuat literature review") is None
```

---

## Story S2-4: Frontend ↔ Backend History Sync (Partial)

**Prioritas**: P1  
**Estimasi**: 3–4 jam

### Objective
`agentHistoryService.js` menyimpan session history di Firebase subcollection dan localStorage. Backend conversation memory berjalan di Redis. Tidak ada sinkronisasi. Target story ini: buat satu-arah sync — saat `AgentPanel` memulai session baru, load history dari backend endpoint; saat session selesai, persist ke backend.

### Files
**Frontend**:
- `frontend_spa/src/features/writing/services/agentHistoryService.js`
- `frontend_spa/src/features/writing/hooks/useAgentLoop.js`

**Backend**:
- `app/routes/agent.py` — tambahkan endpoint `GET /api/agent/history`
- `app/agent/memory_system.py` — `ConversationMemory.get_context_window()`

### Exact Changes

**Langkah 1**: Tambahkan endpoint `GET /api/agent/history` di `app/routes/agent.py`:

```python
@router.get("/api/agent/history")
async def get_agent_history(
    project_id: str,
    limit: int = 10,
    request: Request = None
):
    """
    Load recent conversation history untuk project ini.
    Dipakai frontend saat AgentPanel pertama kali dibuka.
    """
    user_id = request.state.user_id
    
    shared_mem = SharedMemory(
        user_id=user_id, 
        project_id=project_id,
        vector_db=get_vector_db(),
        db=get_db()
    )
    
    # Get from ConversationMemory (Redis atau in-memory)
    history = shared_mem.conversation.get_context_window(last_n=limit)
    
    # Also get recent plans
    plan_traces = []
    if hasattr(shared_mem, 'plan_trace_store') and shared_mem.plan_trace_store:
        plan_traces = shared_mem.plan_trace_store.get_recent_plans(
            user_id=user_id, project_id=project_id, limit=3
        )
    
    return {
        "history": history,
        "plan_traces": plan_traces,
        "source": "backend_memory"
    }
```

**Langkah 2**: Update `agentHistoryService.js` untuk fetch dari backend saat init:

```javascript
// Di agentHistoryService.js, tambahkan:

export async function loadHistoryFromBackend(projectId) {
  try {
    const res = await fetch(`/api/agent/history?project_id=${projectId}&limit=10`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.history || [];
  } catch (err) {
    console.warn('Could not load backend history, using local:', err);
    return null;
  }
}

export async function getHistoryWithFallback(projectId) {
  // Coba backend dulu
  const backendHistory = await loadHistoryFromBackend(projectId);
  if (backendHistory && backendHistory.length > 0) {
    return { history: backendHistory, source: 'backend' };
  }
  
  // Fallback ke Firebase/localStorage
  const localHistory = await loadLocalHistory(projectId); // existing function
  return { history: localHistory || [], source: 'local' };
}
```

**Langkah 3**: Di `useAgentLoop.js`, gunakan `getHistoryWithFallback` saat init:

```javascript
// Di useAgentLoop hook, saat component mount:
useEffect(() => {
  async function initHistory() {
    const { history, source } = await getHistoryWithFallback(projectId);
    setMessages(history);
    if (source === 'local') {
      console.warn('AgentPanel using local history — backend memory not available');
    }
  }
  if (projectId) initHistory();
}, [projectId]);
```

### Do NOT Touch
- Jangan hapus localStorage fallback — ini safety net yang penting
- Jangan ubah `AgentPanel.jsx` layout

### Acceptance Criteria
- [ ] `GET /api/agent/history?project_id=X` mengembalikan JSON dengan field `history` dan `plan_traces`
- [ ] Saat `AgentPanel` mount, ia mencoba load dari backend sebelum localStorage
- [ ] Jika backend history endpoint gagal (network error), fallback ke lokal terjadi tanpa error di UI

---

## Story S2-5: Minimal Observability — Step Latency Logging

**Prioritas**: P2 (dikerjakan jika Story S2-1 sampai S2-4 selesai sebelum hari ke-10)  
**Estimasi**: 2 jam

### Objective
Tambahkan structured logging untuk step latency di `PlanExecutor`, sehingga bottleneck bisa diidentifikasi di production.

### Files
- `app/agent/supervisor.py` — `PlanExecutor.execute()`

### Exact Changes

```python
# Di PlanExecutor.execute(), wrap setiap step execution:
import time

for step in plan.steps:
    step_start = time.monotonic()
    
    try:
        # ... existing execution logic ...
        result = await asyncio.wait_for(
            agent.run_tool(step.tool, input_data, step.params),
            timeout=self.timeout_per_step
        )
        step_duration_ms = (time.monotonic() - step_start) * 1000
        
        # Structured log — pakai logger yang sudah ada di project
        logger.info("plan_step_completed", extra={
            "plan_id": plan.plan_id,
            "step_id": step.step_id,
            "agent": step.agent,
            "tool": step.tool,
            "duration_ms": round(step_duration_ms, 2),
            "status": "success"
        })
        
    except asyncio.TimeoutError:
        step_duration_ms = (time.monotonic() - step_start) * 1000
        logger.warning("plan_step_timeout", extra={
            "plan_id": plan.plan_id,
            "step_id": step.step_id,
            "tool": step.tool,
            "duration_ms": round(step_duration_ms, 2),
            "timeout_threshold": self.timeout_per_step
        })
        # ... existing timeout handling ...
```

### Acceptance Criteria
- [ ] Setiap step execution menghasilkan log dengan `plan_id`, `step_id`, `tool`, `duration_ms`, `status`
- [ ] Timeout step menghasilkan log warning dengan info threshold

---

# Checklist Akhir Sprint

Sebelum sprint dinyatakan selesai, agent harus memverifikasi:

## P0 Verification
- [ ] `DocumentMemory.get_section()` tidak crash (S1-1)
- [ ] Save chapter menulis ke DocumentMemory (S1-2) — verifikasi manual: save chapter, cek vector DB
- [ ] `UserProfileMemory` bertahan setelah restart (S1-3) — verifikasi: set `thesis_topic`, restart, load ulang
- [ ] Plan trace tersimpan di DB setelah agent selesai (S1-4)
- [ ] Generator tabs menggunakan `/api/agent/run` (S1-5) — verifikasi via browser network tab

## P1 Verification
- [ ] Semua worker agent punya `memory` attribute (S2-2)
- [ ] Greeting tidak memicu retrieval (S2-3) — verifikasi via log
- [ ] `GET /api/agent/history` mengembalikan data (S2-4)

## Regression Check
- [ ] `AgentPanel` masih berjalan normal (test manual)
- [ ] Legacy generator path masih bisa diaktifkan via `USE_AGENT_RUNTIME = false`
- [ ] Semua existing test pass (jalankan test suite penuh)
- [ ] Save chapter ke DB utama tetap berhasil (tidak terpengaruh memory error)

---

# Perkiraan Kenaikan Coverage Setelah Sprint

| Komponen | Sebelum | Prediksi Sesudah |
|---|---|---|
| DocumentMemory end-to-end | 35% | 85% ✅ |
| UserProfileMemory persistence | 40% | 80% ✅ |
| Plan executor durable | 50% | 80% ✅ |
| Unified runtime | 25% | 65% ↗ |
| Worker context contract | 20% | 70% ✅ |
| SharedMemory.build_agent_context() | 45% | 75% ✅ |
| Token budget aktif | 25% | 65% ↗ |
| Frontend ↔ backend history | 15% | 55% ↗ |
| **Effective overall** | **40%** | **~72%** 🎯 |

---

# Hal yang TIDAK Dikerjakan di Sprint Ini

Sprint ini secara sadar tidak mengerjakan hal berikut. Ini bukan kelalaian — ini out-of-scope yang disengaja:

- **Memory TTL/flush policy** — perlu keputusan product soal retention (tetap P2)
- **Retry policy per-step** — perlu observability data dulu untuk tahu step mana yang layak diretry
- **Self-evaluation loop cleanup** — tidak mengubah eksekusi PlanExecutor yang memanggil `WritingAgent._call_llm()` secara langsung; ini arsitektur yang bisa dibersihkan setelah 70% tercapai
- **Streaming tool output dari worker** — upgrade UX, bukan kebutuhan arsitektur
- **Full deprecation legacy routes** — `/api/writing_studio/*` tetap ada; legacy routes hanya di-flag sebagai deprecated, belum dihapus

---

*Dokumen ini dirancang untuk dibaca oleh AI agent yang akan mengeksekusi implementasi. Setiap instruksi bersifat idempotent — aman dijalankan ulang jika ada step yang gagal di tengah jalan.*
