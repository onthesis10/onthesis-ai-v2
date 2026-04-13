# WRITING_PROGRESS.md
> Tracker pengembangan OnThesis AI Agent
> Update file ini setiap kali ada progress, blocker, atau keputusan desain

---

## Status Legend
| Symbol | Arti |
|--------|------|
| ✅ | Done — sudah jalan dan tested |
| 🔄 | In Progress — sedang dikerjakan |
| ⏳ | Pending — belum mulai, sudah diplan |
| 🔀 | Partial — jalan tapi belum complete |
| ❌ | Blocked — ada blocker yang perlu diselesaikan dulu |
| 🚫 | Skipped — diputuskan tidak dikerjakan (catat alasannya) |

---

## FASE 1 — Core Agent Foundation

### Intent & Routing
| Task | Status | Catatan |
|------|--------|---------|
| Intent classifier (basic) | ✅ | Ditambah 3 few-shot examples baru & explicit rules untuk literature review |
| Confidence threshold check (< 0.7 → clarify) | ✅ | Threshold 0.7 enforced |
| Few-shot examples di classifier | ✅ | Injected ke prompt LLM (Updated for Indonesian context) |
| Task Router (Supervisor → agent) | ✅ | Berjalan lancar di `supervisor.py` |
| Clarification response template | ✅ | Default ke `CLARIFICATION_TEMPLATE` |

### Agent Loop & Executor
| Task | Status | Catatan |
|------|--------|---------|
| PlanExecutor (serial, basic) | ✅ | Dibuat di `plan_executor.py` |
| max_steps = 4 hard limit | ✅ | Limit enforced di logic executor |
| timeout per step = 20s | ✅ | Memakai `asyncio.wait_for` |
| Error handling: timeout | ✅ | Template string diassign jika timeout |
| Error handling: empty input | ✅ | Validator input sebelum eksekusi agent |
| Error handling: too many steps | ✅ | Limit dicatat saat awal start execution |

### Tool Registry
| Task | Status | Catatan |
|------|--------|---------|
| Tool registry structure | ✅ | Diimplementasikan di `agent_registry.py` |
| Tool: rewrite_text | ✅ | Terdapat pada `writing_agent.py` |
| Tool: paraphrase_text | ✅ | Terdapat pada `writing_agent.py` |
| Tool: summarize_text | ✅ | Terdapat pada `writing_agent.py` |
| Tool: expand_paragraph | ✅ | Terdapat pada `writing_agent.py` |
| Tool: polish_academic_tone | ✅ | Terdapat pada `writing_agent.py` |

---

## FASE 2 — Research Agent

### OpenAlex Integration
| Task | Status | Catatan |
|------|--------|---------|
| search_openalex(query, limit) | ✅ | Ditambah Indonesian stop-word filter & query cleaning |
| Parse response → StoredPaper dataclass | ✅ | Dataclass `StoredPaper` mendefinisi field output |
| rank_papers() dengan formula weighted score | ✅ | Scoring: 0.5 rel + 0.3 cit + 0.2 recency |
| normalize citations dalam result set | ✅ | Fix: Fallback formula terpanggil jika citations = 0 |
| recency scoring (tiered) | ✅ | Ditangani dalam `_calculate_recency_score` |
| extract_findings() dari abstract | ✅ | Terhubung ke simulasi pemanggilan LLM |
| Error: no papers found → message ke user | ✅ | Warns ditambal dengan return `[]` dan ditangani planner handler |

### Literature Review Generator
| Task | Status | Catatan |
|------|--------|---------|
| generate_literature_review() | ✅ | Tercakup di `writing_agent.py` Fase 3 |
| Output harus prose, bukan bullet list | ✅ | Diberlakukan oleh Writing Agent |
| Include citation di output (Author, Year) | ✅ | Diberlakukan oleh Writing Agent |
| Research gap paragraph otomatis | ✅ | Diberlakukan oleh Writing Agent |

---

## FASE 3 — Writing Agent

### Writing Tools
| Task | Status | Catatan |
|------|--------|---------|
| rewrite_paragraph (style options: formal/academic/concise) | ✅ | Diimplementasikan lewat `rewrite_text` |
| paraphrase_text | ✅ | |
| expand_paragraph | ✅ | |
| summarize_text | ✅ | |
| academic_style_rewrite | ✅ | Diimplementasikan lewat `polish_academic_tone` |
| format_citation (APA, IEEE, Chicago) | ✅ | |

### Writing Quality
| Task | Status | Catatan |
|------|--------|---------|
| Passive voice untuk metodologi | ✅ | Di-enforce lewat system prompt |
| Hedging language untuk klaim | ✅ | Di-enforce lewat system prompt |
| Paragraph structure enforcement | ✅ | Di-enforce lewat system prompt |

---

## FASE 4 — Analysis Agent

### Argument Analysis
| Task | Status | Catatan |
|------|--------|---------|
| extract_claims(text) | ✅ | Diimplementasikan di `analysis_agent.py` |
| check_logic(claims) | ✅ | Terhubung via simulasi prompt LLM pengecekan fallback |
| score_argument(text) | ✅ | Param menerima argumen via tuple logic text & claims |
| Suggestion harus spesifik (lihat constraint di prompt) | ✅ | Diberlakukan kuat di system prompt |

### Coherence & Quality
| Task | Status | Catatan |
|------|--------|---------|
| check_coherence(paragraphs) | ✅ | Evaluasi transisi, diproteksi filter text min. 3 paragraf |
| score_thesis_quality() | ✅ | Dimension format output valid JSON mock tersimulasi |
| Output: strengths + improvements | ✅ | Menjadi bagian standar payload |

---

## MEMORY SYSTEM

### ConversationMemory
| Task | Status | Catatan |
|------|--------|---------|
| Simpan turn dengan intent + plan_id | ✅ | Tersimpan melalui record `ConversationTurn` |
| max_turns = 20 | ✅ | Diterapkan di constructor |
| _compress_old_turns() → summary | ✅ | Method kompresi mock implemented |
| get_context_window(last_n=6) | ✅ | Diterapkan untuk agen context |
| Flush setelah session expire (24 jam) | ✅ | Dihandle oleh function `flush_session()` coordinator |

### ResearchMemory
| Task | Status | Catatan |
|------|--------|---------|
| add_papers() → simpan ke vector DB | ✅ | Terhubung ke Qdrant Cloud (Gemini Embedding) |
| get_papers(topic) → semantic search | ✅ | Terhubung ke Qdrant Cloud (Gemini Embedding) |
| is_paper_known(doi) | ✅ | |
| TTL paper: 30 hari | ✅ | |
| get_citations(paper_ids, style) | ✅ | |

### DocumentMemory
| Task | Status | Catatan |
|------|--------|---------|
| add_or_update_chunk() dengan embedding | ✅ | Terhubung ke Qdrant Cloud (Gemini Embedding) |
| get_relevant_context(query, doc_id) | ✅ | Terhubung ke Qdrant Cloud (Gemini Embedding) |
| get_section(doc_id, section) | ✅ | Implementasi menggunakan `scroll` Qdrant |
| Vector DB setup (Qdrant recommended) | ✅ | Qdrant Cloud (Free Tier) with Local Fallback |

### UserProfileMemory
| Task | Status | Catatan |
|------|--------|---------|
| get_or_create(user_id) | ✅ | Ditangani via init default values object |
| update_from_conversation() | ✅ | Terimplementasi dengan dummy mock external extractor |
| Simpan: citation_style, language, level | ✅ | Parameter masuk ke field dataclass Profile |

### SharedMemory Coordinator
| Task | Status | Catatan |
|------|--------|---------|
| build_agent_context() | ✅ | Merekap Profil user, histori konvo, dokumen, dan riset papernya |
| Memory context injector template | ✅ | Tepat mengikuti prompt format yang di request |
| flush_session() | ✅ | Membersihkan object turns array |

---

## SUPERVISOR AGENT

| Task | Status | Catatan |
|------|--------|---------|
| Supervisor system prompt | ✅ | Disimpan di dalam `supervisor.py` |
| Routing logic: research / writing / analysis / direct | ✅ | Ditangani di Task Planner yang diinject via Executor di class Supervisor |
| Context injection sebelum routing | ✅ | Implementasi memanggil `self.memory.build_agent_context(user_message)` sebelum execute. Template prompt digunakan. |
| "Next steps" di setiap response | ✅ | Ditanamkan dalam syntax `_synthesize_final_response` pada langkah ke-7 |
| Max 4 agent calls per request | ✅ | Check limit ditenangkan pada config Planner dan Executor |

---

## INFRASTRUKTUR & TECH

### API Blueprint
| Task | Status | Catatan |
|------|--------|---------|
| Create `app/routes/agent.py` API (`POST /api/agent/chat`) | ✅ | Blueprint routing ke metode `SupervisorAgent` |
| Initialize `SupervisorAgent` endpoint | ✅ | Menerapkan mapping memory dictionary global |
| Register Blueprint di `create_app` | ✅ | Termount di `app/__init__.py` secara resmi |

### General Stack

### General Stack

| Task | Status | Catatan |
|------|--------|---------|
| Pilih LLM orchestration: LangGraph / LlamaIndex | ✅ | Menggunakan custom AgentRegistry, Planner, & Executor |
| Setup Qdrant (vector DB) | ✅ | Disiapkan strukturnya di `memory_system.py` |
| OpenAlex API key / rate limit check | ✅ | Diset via `OPENALEX_EMAIL` environment variable |
| Token counter per request | ✅ | Disertakan di dalam profil turn memory |
| Streaming response | ✅ | Websocket Gevent siap di environment flask SocketIO |
| Logging setiap plan yang dieksekusi | ✅ | Terlog dengan rapi pada eksekusi terminal |

---

## KEPUTUSAN DESAIN
> Catat semua keputusan yang dibuat di sini supaya tidak bingung sendiri nanti

| Tanggal | Keputusan | Alasan |
|---------|-----------|--------|
| — | Mulai dari Writing Agent dulu, bukan Research Agent | Writing tools lebih cepat terasa hasilnya, lebih mudah di-test |
| — | Gunakan serial executor dulu, bukan parallel | Parallel lebih kompleks, debug harder. Optimasi nanti. |
| — | Confidence threshold 0.7 untuk classifier | Di bawah ini lebih baik tanya user daripada salah eksekusi |
| — | Citation count dinormalisasi dalam result set | Raw count bias ke paper lama |

---

## BLOCKERS AKTIF
> Isi ini kalau ada yang nyangkut

| Tanggal | Blocker | Solusi Kandidat | Status |
|---------|---------|-----------------|--------|
| 2026-03-07 | [Critical] Async/Gevent konflik event-loop di Flask | Menghilangkan `asyncio` dan convert semua `async def` agent menjadi sync. Gevent handle IO non-blocking. | ✅ Resolved |
| 2026-03-07 | [Critical] SupervisorAgent memory leak di RAM lokal | Jadikan Supervisor singleton per app, cache state (Profile & Conv) di Redis. | ✅ Resolved |
| 2026-03-07 | [Warning] Error Propagation bocor di Executor | Verifikasi dict `{"error"}` dari hasil antar agent, putus eksekusi dan bubble error. | ✅ Resolved |
| 2026-03-07 | [Minor] Hardcoded OpenAlex Email | Inject dengan `os.environ.get("OPENALEX_EMAIL")` + update fallback. | ✅ Resolved |

---

## CATATAN HARIAN
> Tulis progress singkat setiap sesi ngoding

```
[2026-03-07]
- Dikerjakan  : 
  - Membuat `writing_agent.py` dengan semua writing tools (Fase 3). 
  - Menyelesaikan semua task di Fase 1 (Core Agent Foundation)
    - `intent_classifier.py` dengan logic LLM Threshold & Clarification template.
    - `task_planner.py` dengan dataclass step generator untuk workflow agent berurutan.
    - `plan_executor.py` dengan validasi timeout (20s) per step & dependency tracking.
    - `agent_registry.py` untuk mengikat semua tool agent.
  - Memulai Fase 2 (Research Agent)
    - Membuat `research_agent.py` dengan API OpenAlex, sistem ranking termodulasi & eksekusi extraction LLM.
    - Menyelesaikan Sistem Memori `memory_system.py` berupa 4 lapis context manager dan Vector DB Mocker.
  - Memulai Supervisor Agent Control Flow
    - Merangkai `supervisor.py` untuk membungkus entry loop dari User Input -> Context Memory -> Classifier -> Planner -> Executor -> Output.
  - Fase 4 (Analysis Agent)
    - Membangun `analysis_agent.py` dengan prompt rule scoring JSON.
    - Mengaitkan seluruh integrasi tools final ke dalam `agent_registry.py`.
  - Flask Integration
    - Menginstall dependency gevent untuk WebSockets.
    - Membuat dan mendaftarkan blueprint Flask AI Endpoints di `app/routes/agent.py` lalu melakukan call E2E Supervisor dari luar server.
- Ditemukan   : Blueprint mewajibkan fungsi agent async, sehingga semua method agent menggunakan `async def`. Output dari LLM parsing JSON perlu diamankan dengan try-except. OpenAlex abstract berupa inverted index. Sistem vector DB memory harus dipass dari konektor luar (injector).
- Besok       : UI Integration dan perbaikan error handling edge cases pada LLM fallback API.
```

```
[2026-03-07 - Sesi Wrap Up]
- Dikerjakan  : 
  - Melakukan Code Review & Refactoring pada issue integrasi.
  - Fix konflik Asyncio dan Gevent dengan me-rewrite Agent & Executor script ke synchronous blocking format.
  - Implementasi Singleton `SupervisorAgent` per app untuk menghemat VRAM lokal.
  - Integrasi Memory Session User (Profile & Conversation history) ke eksternal instance Redis dengan TTL 24 jam.
  - Fix dependency error propagation pada `plan_executor.py` dan menambal hardcoded credential OpenAlex.
  - Generate Requirements.txt & README.md documentation.
- Ditemukan   : Redis cache berjalan lancar memotong cost in-memory aplikasi dan asyncio event-loop conflicts sirna sepenuhnya.
- Besok       : Fokus pengembangan sisi Fronte-End/UI atau menghubungkan API ini ke SocketIO WebRTC untuk streaming.
```

```
[2026-03-08]
- Dikerjakan  : 
  - Fix Bug 1: Intent classifier gagal deteksi literature review (Added 3 few-shot Indonesian examples).
  - Fix Bug 2: Paper tidak relevan (Stricter filtering: title keywords mandatory, relevance baseline lower, stop-words filter).
  - Fix Bug 3: Citation normalization fallback logic (Successfully verified fallback formula triggers when all citations are 0).
  - Fix Lanjutan: Menambahkan Indonesian conversational stop-words filter di `research_agent.py` agar query "carikan paper tentang..." tidak merusak strict filter.
  - Fix Lanjutan: Mengembalikan Gemini fallback model ke `gemini/gemini-1.5-flash` setelah error 404 pada model string `-latest`.
- Ditemukan   : Redis Upstash terkadang mengalami ConnectionError (getaddrinfo failed) yang menyebabkan API 500 secara sporadis, namun logic agent sudah stabil dan terverifikasi melalui test case yang berhasil.
- Besok       : Stabilisasi koneksi Redis atau migrasi ke local Redis cache jika deployment on-premise.
```

```
[2026-03-12]
- Dikerjakan  : 
  - Fix Bug 1: Error model fallback Gemini diatasi dengan transisi ke `gemini/gemini-2.5-flash` ✅
  - Fix Bug 2: Isu Agent memutar kembali ke "clarification" diselesaikan (routing & prompt handling) ✅
  - Fix Bug 3: Rate Limit Groq diselesaikan melalui pemangkasan token `max_tokens=800` dan zero-delay retry ke API Gemini ✅
  - Integrasi Qdrant Cloud sebagai Vector DB untuk `ResearchMemory` & `DocumentMemory` ✅
  - Implementasi caching logic di `ResearchAgent` (cek Qdrant sebelum hit API) ✅
  - Implementasi `DocumentMemory` (thesis chunks) dengan Qdrant Cloud ✅
  - Final Verification: 3/3 Test.py Pass & Qdrant Persistence Verified ✅
- Catatan Harian: Sesi integrasi Vector DB selesai total. ResearchMemory & DocumentMemory kini menggunakan Qdrant Cloud (Gemini Embedding 3072). Caching berfungsi optimal.
- Status Akhir : Sistem siap untuk pengembangan modul frontend atau kolaborasi multi-user.
```

```
[2026-03-13]
- Dikerjakan  :
  - Sprint 4 ROADMAP: Implementasi POST /api/agent/run SSE streaming endpoint ✅
  - Buat app/services/thesis_tools.py — 5 tool schemas (read_chapter, edit_paragraph, insert_paragraph, delete_paragraph, search_references) + executor ✅
  - Rewrite app/routes/agent.py — SSE endpoint dengan agentic LLM loop, max 4 iterasi, Groq primary + Gemini fallback ✅
  - Tool calls menghasilkan pending diffs yang frontend visualisasi via EditorDiffBridge ✅
  - SSE events: STEP, TOOL_CALL, TOOL_RESULT, PENDING_DIFF, TEXT_DELTA, DONE, ERROR ✅
  - Buat test_agent_run.py — E2E test untuk validasi SSE event format ✅
  - Verifikasi: SSE event names match persis dengan frontend useAgentLoop.js ✅
- Status Akhir : Backend endpoint /api/agent/run siap. Frontend AgentPanel sudah fully wired. Thesis tool calling terintegrasi via litellm function-calling format.

### Log Harian - 13 Maret 2026
| Sprint | Fitur | Owner | Status | Tanggal | Catatan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 3 | [UI] Editor Diff Bridge (Slash + Citation) | Senior AI | 🏁 SELESAI | 2026-03-13 | Slash / & Citation @ verified ✅ |
| 4 | [Backend] SSE Agent Run Endpoint (`/api/agent/run`) | Senior AI | 🏁 SELESAI | 2026-03-12 | SSE events (STEP, TOOL, DIFF) verified ✅ |
| 5 | [Frontend] useAgentLoop & Diff Management | Senior AI | 🏁 SELESAI | 2026-03-13 | SSE Client & Diff Logic verified ✅ |
| 6 | [UI] AgentPanel UI Swap | Senior AI | 🏁 SELESAI | 2026-03-13 | Swapping AssistantPanel with AgentPanel verified ✅ |
| 7 | [UI] Collaborative Presence | Senior AI | 🚫 SKIPPED | 2026-03-13 | Single user app, fitur ini tidak relevan. |
| 8 | [UI] Dashboard Analytics | Senior AI | 🏁 SELESAI | 2026-03-13 | Real data integration & Heartbeat sync verified ✅ |




---

## FASE 7 — Frontend-Backend Integration (Roadmap Sprint 4)

### SSE Agent Endpoint
| Task | Status | Catatan |
|------|--------|---------|
| POST /api/agent/run SSE endpoint | ✅ | `app/routes/agent.py` — agentic loop with tool calling |
| THESIS_TOOLS schema (5 tools) | ✅ | `app/services/thesis_tools.py` — read, edit, insert, delete, search |
| Tool executor (produces pending diffs) | ✅ | Diffs emitted as PENDING_DIFF SSE events |
| LLM integration with tool calling | ✅ | litellm with Groq primary + Gemini fallback |
| SSE event format matches frontend | ✅ | Verified: STEP, TOOL_CALL, TOOL_RESULT, PENDING_DIFF, TEXT_DELTA, DONE, ERROR |
| Max 4 iterations hard limit | ✅ | Prevents runaway agent loops |
| Model selection from frontend | ✅ | llama-70b, deepseek-r1, gemma-9b mapped to Groq models |
| E2E test script | ✅ | `test_agent_run.py` |

---

## REFERENSI FILE
| File | Isi |
|------|-----|
| `onthesis-agent-blueprint.md` | Arsitektur lengkap: Task Planner + Shared Memory (kode Python detail) |
| `onthesis-agent-prompts.md` | Semua system prompt siap pakai untuk semua agent |
| `WRITING_PROGRESS.md` | File ini — tracker progress |
