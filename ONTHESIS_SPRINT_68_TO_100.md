# OnThesis Writing Stack — Sprint Plan
## Dari 68% → 100% Production-Ready

> **Basis:** `writing-gap-audit.md`  
> **Target:** Konsolidasi kontrak, eliminasi legacy path, tutup test coverage  
> **Prinsip:** Jangan tambah fitur baru — rapikan yang sudah ada sampai stabil

---

## Progress Tracker

| Area | Sekarang | Target |
|------|----------|--------|
| Planner & Executor | 75% | 100% |
| Shared Memory | 65% | 100% |
| Writing Runtime & UX | 85% | 100% |
| Citation & Quality Layer | 50% | 100% |
| Test Coverage | 5% | 80% |
| **Overall** | **68%** | **100%** |

---

## SPRINT 1 — Critical Fix: `search_papers` + Runtime Konsolidasi
**Durasi:** 2 hari  
**Priority:** 🔴 Critical + High

### Story 1.1 — Tambahkan `search_papers()` di ResearchAgent
**File target:** `app/agent/research_agent.py`  
**Severity:** Critical  
**Problem:** `TaskPlanner` dan `PlanExecutor` memanggil `self.search_papers` tapi method ini tidak ada di class `ResearchAgent`, menyebabkan runtime crash pada research-backed writing flow.

**Task:**
```
1. Buat method eksplisit `search_papers(query, filters, limit)` di ResearchAgent
2. Kontrak input:
   {
     "query": str,
     "filters": { "year_from": int, "field": str },
     "limit": int  // default 10
   }
3. Kontrak output:
   [
     {
       "paper_id": str,
       "title": str,
       "authors": list[str],
       "year": int,
       "abstract": str,
       "source": "openalex|web",
       "citation_key": str
     }
   ]
4. Internally: wrapper dari unified_search yang sudah ada,
   tapi ekspos kontrak yang stabil ke planner
5. Registrasikan sebagai tool di run_tool()
```

**Acceptance Criteria:**
- [ ] `ResearchAgent.search_papers()` exist dan callable
- [ ] Input/output sesuai kontrak di atas
- [ ] `run_tool('search_papers', params)` berfungsi
- [ ] Literature review flow tidak crash di runtime

---

### Story 1.2 — Konsolidasikan Runtime ke `/api/agent/run`
**File target:** `app/agent/supervisor.py`, `app/routes/agent.py`  
**Severity:** High  
**Problem:** `edit_thesis` masih fallback ke `legacy thesis_tools_loop`, bikin behavior tidak deterministik.

**Task:**
```
1. Identifikasi semua kondisi yang masih trigger legacy fallback
   di supervisor.py:571 dan supervisor.py:589
2. Pastikan EditorAgent + planner pipeline bisa handle semua
   case yang sebelumnya fallback ke legacy
3. Tambahkan feature flag: DISABLE_LEGACY_WRITING_LOOP=true
4. Test dengan feature flag aktif — pastikan tidak ada regresi
5. Hapus legacy path setelah stabil
```

**Acceptance Criteria:**
- [ ] Semua `edit_thesis` request mengalir ke `/api/agent/run`
- [ ] Tidak ada `thesis_tools_loop` yang terpanggil
- [ ] Feature flag bisa toggle untuk rollback darurat
- [ ] Behavior konsisten untuk semua intent writing

---

## SPRINT 2 — Memory Contract Freeze
**Durasi:** 2 hari  
**Priority:** 🟡 Medium-High

### Story 2.1 — Bekukan Kontrak `DocumentMemory` v2
**File target:** `app/agent/memory_system.py`, `app/routes/context_routes.py`  
**Problem:** `get_section()` sekarang return list chunks, tapi caller masih expect single string. Kontrak implisit, rawan breaking change diam-diam.

**Task:**
```
1. Audit semua caller get_section() di codebase:
   grep -r "get_section" app/

2. Putuskan kontrak resmi:
   OPSI A: get_section() → str (join chunks, backward compat)
   OPSI B: get_section() → list[Chunk] (granular, breaking)
   OPSI C: get_section(raw=False) → str | list[Chunk]

3. Implementasikan kontrak yang dipilih
4. Update semua caller agar sesuai
5. Dokumentasikan di docstring:
   """
   DocumentMemory v2 Contract:
   - get_section(section_id) → str (joined chunks)
   - get_section(section_id, raw=True) → list[ChunkDict]
   - ChunkDict: { text, embedding_id, position, updated_at }
   """
```

**Acceptance Criteria:**
- [ ] Kontrak terdokumentasi di docstring
- [ ] Semua caller konsisten
- [ ] Tidak ada caller yang bergantung pada perilaku implisit
- [ ] Unit test untuk kedua mode return

---

### Story 2.2 — Fix `ResearchMemory` Citation Helper Lintas Request
**File target:** `app/agent/memory_system.py:747`  
**Problem:** `get_citations()` bergantung `self.papers` in-memory instance — tidak tahan lintas request/process restart.

**Task:**
```
1. Refactor get_citations() agar:
   - Pertama cek self.papers (cache instance)
   - Fallback ke persistence layer (vector DB) kalau cache kosong
   
2. Implementasi:
   async def get_citations(self, paper_ids: list[str]) -> list[Citation]:
       cached = [p for p in self.papers if p.id in paper_ids]
       missing_ids = set(paper_ids) - {p.id for p in cached}
       
       if missing_ids:
           from_db = await self.vector_db.get_papers_by_ids(missing_ids)
           cached.extend(from_db)
       
       return [self._to_citation(p) for p in cached]

3. Pastikan expiry 30 hari tetap dihormati dari persistence layer
```

**Acceptance Criteria:**
- [ ] `get_citations()` berfungsi setelah process restart
- [ ] Cache instance tetap dipakai kalau ada (performance)
- [ ] Expiry logic tetap bekerja dari DB
- [ ] Test: simulate restart → get_citations masih return data

---

### Story 2.3 — Bekukan Kontrak Literature Review End-to-End
**File target:** `app/agent/task_planner.py:104`, `app/agent/research_agent.py`  
**Problem:** Flow literature review belum punya kontrak yang jelas dari search → findings → output.

**Task:**
```
1. Definisikan kontrak eksplisit:

   INPUT ke flow:
   {
     "topic": str,
     "variables": list[str],
     "min_papers": int,  // default 5
     "citation_style": "APA|IEEE|Vancouver"
   }

   OUTPUT dari flow:
   {
     "review_text": str,        // paragraf siap pakai
     "references": [            // daftar referensi
       {
         "citation_key": str,
         "formatted": str,      // e.g. "Author (2023). Title. Journal."
         "doi": str | null
       }
     ],
     "papers_used": int,
     "coverage_note": str       // catatan gap kalau paper kurang
   }

2. Update TaskPlanner template literature_review agar 
   produce output sesuai kontrak di atas

3. Pastikan WritingAgent.generate_literature_review()
   return sesuai kontrak
```

**Acceptance Criteria:**
- [ ] Kontrak terdokumentasi
- [ ] Output selalu include `references` list yang siap render
- [ ] Tidak ada literature review yang return tanpa daftar referensi
- [ ] Test dengan topic sederhana → verify output shape

---

## SPRINT 3 — Citation Taxonomy Unification
**Durasi:** 2 hari  
**Priority:** 🟡 Medium

### Story 3.1 — Satukan Citation Workflow Jadi 3 Lane
**File target:** `app/agent/writing_agent.py:575`, `app/agent/chapter_skills.py:410`, `app/agent/task_planner.py:799`, `app/agent/diagnostic_agent.py:375`  
**Problem:** Fitur citation tersebar di 3 tempat dengan routing yang tidak konsisten.

**Task:**
```
Definisikan 3 lane yang jelas:

LANE 1: format_citation
  - Input: raw citation data
  - Output: string formatted (APA/IEEE/Vancouver)
  - Owner: writing_agent.format_citation()
  - Trigger: intent = 'format_citation'

LANE 2: check_missing_citations
  - Input: paragraph text
  - Output: { has_uncited_claims: bool, uncited_sentences: list }
  - Owner: chapter_skills.validate_citations()
  - Trigger: intent = 'check_citations' atau post-generate hook

LANE 3: verify_citation_accuracy
  - Input: citation + original paper
  - Output: { is_accurate: bool, issues: list, suggestion: str }
  - Owner: diagnostic_agent.verify_citations()
  - Trigger: intent = 'verify_citations' atau quality check

Implementasi:
1. Buat citation_router.py yang map intent → lane
2. Update TaskPlanner agar gunakan citation_router
3. Pastikan planner validate_citations → lane 2, bukan lane 3
4. Dokumentasikan di CITATION_WORKFLOW.md
```

**Acceptance Criteria:**
- [ ] `citation_router.py` exist dengan routing jelas
- [ ] Planner selalu pilih lane yang tepat per intent
- [ ] Tidak ada intent citation yang salah route
- [ ] Test: 3 intent berbeda → 3 lane berbeda dipanggil

---

### Story 3.2 — Fix Executor-Memory Bookkeeping
**File target:** `app/agent/plan_executor.py:414`, `app/agent/supervisor.py`  
**Problem:** Plan trace dan assistant result disimpan di dua tempat berbeda (executor `store_plan`, supervisor simpan turn) — tidak atomik.

**Task:**
```
1. Buat satu fungsi atomic:
   async def commit_plan_result(plan, result, conversation):
       await conversation.add_plan(plan, result)
       await conversation.add_assistant_turn(result.final_output)

2. Panggil commit_plan_result() dari executor setelah selesai,
   bukan dari supervisor setelah-fakta

3. Supervisor tidak lagi perlu simpan turn secara terpisah
   (delegate ke executor)

4. Pastikan tidak ada double-write
```

**Acceptance Criteria:**
- [ ] Plan trace dan assistant turn selalu tersimpan atomik
- [ ] Tidak ada case di mana plan tersimpan tapi turn tidak (atau sebaliknya)
- [ ] Test: simulate plan execution → verify both stored

---

## SPRINT 4 — Test Coverage
**Durasi:** 3 hari  
**Priority:** 🔴 High (missing completely)

### Story 4.1 — Tests Planner Templates
**File target:** `tests/test_planner.py` (buat baru)

```python
# tests/test_planner.py

def test_literature_review_plan_shape():
    """Template literature_review harus produce 5 steps yang benar"""
    planner = TaskPlanner()
    plan = planner.generate_plan(intent='literature_review', context={...})
    assert len(plan.steps) == 5
    step_tools = [s.tool for s in plan.steps]
    assert 'search_papers' in step_tools
    assert 'generate_literature_review' in step_tools

def test_rewrite_plan_uses_editor_when_context_available():
    """Rewrite dengan editor context harus produce replacement diff step"""
    plan = planner.generate_plan(
        intent='rewrite_paragraph',
        context={'editor_active': True, 'selection': 'some text'}
    )
    assert any(s.tool == 'replace_selection' for s in plan.steps)

def test_ambiguous_intent_triggers_ask_user():
    """Intent dengan confidence rendah harus fallback ke ask_user"""
    plan = planner.generate_plan(intent='unknown_low_confidence', ...)
    assert plan.steps[0].tool == 'ask_user'

def test_citation_intent_routes_to_correct_lane():
    """validate_citations harus route ke check_missing, bukan verify"""
    plan = planner.generate_plan(intent='validate_citations', ...)
    assert plan.steps[0].tool == 'check_missing_citations'
    assert plan.steps[0].tool != 'verify_citation_accuracy'
```

---

### Story 4.2 — Tests Executor Happy Path
**File target:** `tests/test_executor.py` (buat baru)

```python
# tests/test_executor.py

async def test_executor_runs_plan_serially():
    """Steps dijalankan serial sesuai dependency"""
    ...

async def test_executor_respects_timeout():
    """Step yang timeout tidak block step berikutnya (kalau non-critical)"""
    ...

async def test_executor_commits_atomically():
    """Plan trace dan assistant turn tersimpan bersamaan"""
    ...

async def test_executor_emits_sse_events():
    """Setiap step emit progress event ke SSE"""
    ...
```

---

### Story 4.3 — Tests Memory Context Build
**File target:** `tests/test_memory.py` (buat baru)

```python
# tests/test_memory.py

def test_shared_memory_context_shape():
    """build_agent_context() harus return shape yang konsisten"""
    ctx = memory.build_agent_context(user_id, project_id)
    assert 'user_profile' in ctx
    assert 'conversation_history' in ctx
    assert 'relevant_sections' in ctx
    assert 'known_papers' in ctx

def test_document_memory_get_section_contract():
    """get_section() harus return str; raw=True return list[Chunk]"""
    result = doc_memory.get_section('1.1')
    assert isinstance(result, str)
    
    raw = doc_memory.get_section('1.1', raw=True)
    assert isinstance(raw, list)
    assert all('text' in chunk for chunk in raw)

def test_research_memory_citation_survives_restart():
    """get_citations() tetap bisa diakses setelah re-instantiate"""
    # Save paper
    memory1 = ResearchMemory(user_id)
    await memory1.save_paper(paper)
    
    # Re-instantiate (simulate restart)
    memory2 = ResearchMemory(user_id)
    citations = await memory2.get_citations([paper.id])
    assert len(citations) == 1
```

---

### Story 4.4 — Tests SSE Diff Pipeline
**File target:** `tests/test_sse_diff.py` (buat baru)

```python
# tests/test_sse_diff.py

async def test_pending_diff_event_emitted():
    """EditorAgent harus emit PENDING_DIFF event via SSE"""
    events = []
    async for event in agent_run(intent='rewrite', ...):
        events.append(event)
    
    diff_events = [e for e in events if e.type == 'PENDING_DIFF']
    assert len(diff_events) > 0
    assert 'old_text' in diff_events[0].data
    assert 'new_text' in diff_events[0].data

async def test_accept_diff_commits_to_editor():
    """Accept PENDING_DIFF harus commit perubahan ke state editor"""
    ...

async def test_reject_diff_reverts_to_original():
    """Reject PENDING_DIFF harus rollback ke teks lama"""
    ...
```

---

### Story 4.5 — Tests Intent Classifier Edge Cases
**File target:** `tests/test_intent_classifier.py` (buat baru)

```python
# tests/test_intent_classifier.py

def test_similar_writing_intents_classified_correctly():
    cases = [
        ("ubah kalimat ini lebih formal", "rewrite_paragraph"),
        ("parafrasekan paragraf berikut", "paraphrase"),
        ("panjangkan bagian ini", "expand"),
        ("buatkan literature review tentang ML", "literature_review"),
        ("cek apakah ada klaim tanpa sitasi", "validate_citations"),
    ]
    for text, expected_intent in cases:
        result = classifier.classify(text)
        assert result.intent == expected_intent

def test_low_confidence_triggers_ask_user():
    result = classifier.classify("bantu tesis gw dong")
    assert result.intent == 'ask_user' or result.confidence < 0.6
```

---

## SPRINT 5 — Polish & User Profile
**Durasi:** 1 hari  
**Priority:** 🟢 Low

### Story 5.1 — Upgrade User Profile Extraction
**File target:** `app/agent/memory_system.py:773`  
**Problem:** Ekstraksi profile masih regex/heuristic, rawan salah.

**Task:**
```
1. Buat structured extractor dengan LLM ringan:

   SYSTEM: "Extract thesis profile from this conversation turn.
   Return JSON: { topic, field, language, citation_style, level }"
   
2. Fallback ke regex kalau LLM call gagal
3. Konfidensi per field: jika rendah → jangan overwrite existing
```

---

### Story 5.2 — Smoke Test UI (opsional tapi recommended)
**Tool:** Playwright  
**Scope minimal:**
```
1. User buka Writing Studio → tidak crash
2. User ketik request → agent response muncul
3. Pending diff muncul → user bisa accept → text berubah
4. User bisa reject diff → text kembali ke semula
```

---

## Urutan Eksekusi Rekomendasi

```
MINGGU 1:
Hari 1-2  →  Sprint 1 (search_papers + runtime konsolidasi)
Hari 3-4  →  Sprint 2 (memory contract freeze)
Hari 5    →  Sprint 3 story 3.1 (citation taxonomy)

MINGGU 2:
Hari 6    →  Sprint 3 story 3.2 (executor-memory atomic)
Hari 7-9  →  Sprint 4 (test coverage semua area)
Hari 10   →  Sprint 5 (polish + smoke test)
```

---

## Definition of Done (100%)

Sistem dianggap production-ready 100% ketika:

- [ ] `search_papers` exist dan tidak crash di runtime
- [ ] Semua writing request lewat `/api/agent/run` — zero legacy fallback
- [ ] `DocumentMemory` dan `ResearchMemory` punya kontrak tertulis di docstring
- [ ] `get_citations()` berfungsi lintas request/restart
- [ ] Literature review selalu output `review_text` + `references` list
- [ ] Citation routing konsisten: format / missing-check / verify ke lane yang tepat
- [ ] Plan trace + assistant turn tersimpan atomik
- [ ] Test coverage ≥ 80% untuk: planner, executor, memory, citation, SSE diff
- [ ] Intent classifier test pass untuk semua edge cases writing
- [ ] Smoke test UI: Writing Studio tidak crash untuk happy path

---

*Sprint plan ini adalah living document. Update status setiap story setelah selesai.*
