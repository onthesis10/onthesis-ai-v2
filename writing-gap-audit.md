# Writing Gap Audit vs `onthesis-agent-blueprint.md`

## Audit Scope And Method

Blueprint utama yang diaudit adalah `onthesis-agent-blueprint.md`, khusus untuk full writing stack: intent classification, task planning, plan execution, shared memory, writing generation, dan integrasi Writing Studio. `PRODUCTION_BLUEPRINT_FINAL.md` dipakai hanya sebagai konteks tambahan ketika implementasi sekarang sudah melampaui blueprint awal.

Metode audit:
- Menurunkan requirement writing dari blueprint ke domain audit yang bisa dicek di source code.
- Memetakan implementasi aktual di backend agent pipeline, writing runtime, memory sync, dan frontend writing studio.
- Memberi status per requirement: `Implemented`, `Partial`, `Missing`, `Diverged`, atau `Extra`.
- Memberi severity gap: `Critical`, `High`, `Medium`, `Low`.

Catatan:
- Audit ini berbasis inspeksi source code, bukan uji end-to-end runtime.
- Tidak ada perubahan API/runtime produk pada audit ini.

## Executive Summary

Secara umum, fondasi writing stack OnThesis sudah jauh lebih maju daripada blueprint awal. Intent classifier, planner, executor, shared memory, writing agent, SSE runtime, editor diff flow, dan Writing Studio UI semuanya sudah ada dan saling terhubung.

Gap utamanya bukan lagi “fitur belum ada”, tetapi:
- beberapa flow inti masih `partial` atau `diverged` dari kontrak blueprint,
- ada fragmentasi antara runtime baru dan jalur legacy,
- area citation/research memory belum konsisten end-to-end,
- dan hampir tidak ada automated test untuk writing stack.

Ringkasan status:
- `Implemented`: intent classification, planner core, writing tools dasar, shared context build, editor diff runtime, SSE writing flow
- `Partial`: literature review end-to-end, document/research memory detail, citation workflow, golden thread usage
- `Diverged`: executor/memory bookkeeping detail, runtime path tunggal
- `Missing`: test coverage writing stack

## Gap Matrix

| Blueprint requirement | Expected behavior | Current implementation | Status | Severity | Evidence | Recommended action |
| --- | --- | --- | --- | --- | --- | --- |
| Intent classification untuk use case writing | Supervisor mengklasifikasikan intent writing seperti `literature_review`, `rewrite_paragraph`, `paraphrase`, `check_coherence`, lalu minta klarifikasi jika confidence rendah | Intent classifier sudah mencakup intent writing utama, confidence threshold, hard rules untuk literature review, dan fallback `ask_user` saat ambigu | Implemented | Low | `app/agent/intent_classifier.py:182`, `app/agent/intent_classifier.py:238`, `app/agent/intent_classifier.py:329` | Pertahankan; tambahkan test intent classifier untuk request writing yang mirip/ambigu |
| Struktur `TaskPlan` dan `TaskStep` | Planner menyusun plan deterministik berbasis intent dan dependency | `TaskStep`, `TaskPlan`, dan `TaskPlanner.generate_plan()` sudah sesuai shape blueprint dan menangani banyak flow writing | Implemented | Low | `app/agent/task_planner.py:33`, `app/agent/task_planner.py:104` | Tidak perlu redesign; cukup tambahkan regression tests untuk template plan inti |
| Flow literature review berbasis memory | Cek paper di memory, jika belum ada cari paper, rank, extract findings, generate review, polish tone, lalu output siap pakai dengan referensi | Template plan 5-step sudah ada dan reuse paper memory juga ada. Namun flow ini belum aman end-to-end: pencarian memakai `search_papers` berbasis `unified_search`, bukan kontrak `search_openalex`, dan output akhir belum menjamin daftar referensi siap pakai seperti contoh blueprint | Partial | High | `app/agent/task_planner.py:104`, `app/agent/task_planner.py:408`, `app/agent/research_agent.py:92`, `app/agent/research_agent.py:316`, `app/agent/writing_agent.py:520` | Standarkan kontrak literature review: sumber search, bentuk temuan, output akhir, dan daftar referensi yang konsisten |
| Kontrak tool `search_papers` pada research pipeline | Planner/executor harus bisa memanggil tool pencarian paper secara valid untuk flow literature review dan section generation | `TaskPlanner` dan `PlanExecutor` mengandalkan tool `search_papers`, tetapi `ResearchAgent.run_tool()` mereferensikan `self.search_papers` sementara class `ResearchAgent` tidak mendefinisikan method `search_papers` terpisah. Ini membuat research-backed writing flow berisiko gagal di runtime | Missing | Critical | `app/agent/task_planner.py:104`, `app/agent/task_planner.py:338`, `app/agent/research_agent.py:92`, `app/agent/research_agent.py:401` | Tambahkan method `search_papers()` yang eksplisit dengan kontrak input/output stabil, lalu beri test untuk planner flows yang memanggil research tool |
| Rewrite / paraphrase / expand / summarize flow | Request writing sederhana diarahkan ke writing agent lalu dipoles akademik | Flow rewrite, paraphrase, expand, summarize sudah ada di planner dan writing agent; bila editor aktif, hasil bisa diarahkan jadi replacement diff | Implemented | Low | `app/agent/task_planner.py:213`, `app/agent/task_planner.py:234`, `app/agent/task_planner.py:255`, `app/agent/writing_agent.py:453`, `app/agent/writing_agent.py:469`, `app/agent/writing_agent.py:486`, `app/agent/writing_agent.py:503` | Tambahkan tests untuk memastikan setiap intent menghasilkan step planner yang benar dan output editor diff bila konteks editor tersedia |
| Plan executor step-by-step dengan dependency, timeout, partial failure, dan final memory update | Executor menjalankan plan serial, hormati dependency, timeout per step, simpan hasil plan ke memory | Executor sudah punya dependency check, timeout, retry, emit event, dan observability. Namun update memory berbeda dari blueprint: executor hanya `store_plan`, sedangkan turn assistant disimpan terpisah oleh supervisor, bukan `conversation.add_plan(plan, result)` langsung | Diverged | Medium | `app/agent/plan_executor.py:33`, `app/agent/plan_executor.py:176`, `app/agent/plan_executor.py:192`, `app/agent/plan_executor.py:414` | Satukan kontrak memory update setelah eksekusi plan agar trace plan dan hasil assistant selalu tersimpan atomik |
| Conversation memory dengan compression | Simpan riwayat, context window, kompresi turn lama, dan plan trace | Conversation memory sudah punya persistence, context window, compression summary, dan store plan | Implemented | Low | `app/agent/memory_system.py:386`, `app/agent/memory_system.py:425`, `app/agent/memory_system.py:516`, `app/agent/memory_system.py:536` | Tambahkan test untuk kompresi dan restore history agar behavior stabil |
| Document memory untuk draft tesis aktif | Chunk draft tesis, simpan embedding, retrieval semantic untuk konteks writing | Sinkronisasi autosave ke DocumentMemory sudah ada, retrieval semantic dan chapter summary juga ada. Namun implementasi lebih granular dari blueprint dan `get_section()` sekarang mengembalikan list chunks, bukan satu section string seperti kontrak awal | Partial | Medium | `app/routes/context_routes.py:223`, `app/routes/context_routes.py:268`, `app/routes/context_routes.py:284`, `app/agent/memory_system.py:567`, `app/agent/memory_system.py:577`, `app/agent/memory_system.py:598`, `app/agent/memory_system.py:610` | Bekukan kontrak DocumentMemory v2: apakah consumer harus menerima list chunks atau section utuh; dokumentasikan dan selaraskan semua caller |
| Research memory untuk reuse paper + citation helper | Paper hasil search disimpan, bisa diambil ulang, dan citation helper bekerja dari memory persisten | Persist/search paper via vector DB sudah ada, termasuk expiry 30 hari. Namun `get_citations()` masih bergantung pada `self.papers` in-memory instance, sehingga helper citation tidak benar-benar tahan lintas request/process seperti semangat blueprint | Partial | Medium | `app/agent/memory_system.py:660`, `app/agent/memory_system.py:688`, `app/agent/memory_system.py:720`, `app/agent/memory_system.py:747` | Pindahkan citation helper agar bisa membaca dari persistence layer juga, bukan hanya cache instance saat ini |
| User profile memory untuk preferensi writing | Simpan topik tesis, field, style, language, citation style, academic level | User profile memory sudah persist dan meng-update dari percakapan, tetapi ekstraksinya masih regex/keyword heuristics sehingga lebih rapuh dibanding blueprint yang mengarah ke extraction yang lebih robust | Partial | Low | `app/agent/memory_system.py:773`, `app/agent/memory_system.py:844` | Upgrade ekstraksi profile ke parser terstruktur atau LLM ringan dengan fallback regex |
| Shared memory context builder | Supervisor membaca user profile, conversation history, relevant thesis sections, known papers sebelum planning | `SharedMemory.build_agent_context()` sudah membangun paket context utama yang dipakai supervisor/planner | Implemented | Low | `app/agent/memory_system.py:936`, `app/agent/memory_system.py:954`, `app/agent/supervisor.py:474` | Tambahkan test snapshot agar shape context tidak berubah diam-diam |
| Supervisor flow memory -> classify -> plan -> execute | Entry point writing harus deterministic dan project-aware | `SupervisorAgent.process_request()` sudah mengikuti alur tersebut dan memakai context project-scope. Namun untuk `edit_thesis` masih ada fallback ke `legacy thesis_tools_loop`, jadi belum sepenuhnya satu runtime deterministik | Partial | High | `app/agent/supervisor.py:474`, `app/agent/supervisor.py:571`, `app/agent/supervisor.py:589` | Matikan fallback legacy setelah pipeline planner/editor agent stabil, lalu konsolidasikan semua writing edit ke satu jalur |
| Writing agent akademik yang context-aware | Generation harus memakai konteks topik, style, language, citation style, dan menjaga academic constraints | Writing agent sudah cukup lengkap: rewrite, paraphrase, expand, summarize, literature review, chapter, abstract, refine-with-critique, plus memory-enriched prompt | Implemented | Low | `app/agent/writing_agent.py:203`, `app/agent/writing_agent.py:520`, `app/agent/writing_agent.py:601`, `app/agent/writing_agent.py:677`, `app/agent/writing_agent.py:729`, `app/agent/writing_agent.py:748` | Pertahankan; fokus berikutnya pada output contract tests, bukan penambahan fitur baru |
| Editor insertion/replacement via writing agent | Hasil writing bisa masuk ke editor sebagai perubahan terkontrol, bukan overwrite diam-diam | Planner punya insertion/replacement steps, EditorAgent menghasilkan `PENDING_DIFF`, SSE route mengirim event, dan frontend `useAgentLoop` mengaplikasikan diff dengan accept/reject | Implemented | Low | `app/agent/task_planner.py:593`, `app/agent/task_planner.py:623`, `app/agent/editor_agent.py:23`, `app/routes/agent.py:311`, `app/routes/agent.py:430`, `frontend_spa/src/features/writing/hooks/useAgentLoop.js:43`, `frontend_spa/src/features/writing/hooks/useAgentLoop.js:105`, `frontend_spa/src/features/writing/hooks/useAgentLoop.js:276` | Tambahkan integration test minimal untuk event `PENDING_DIFF` sampai commit/revert editor |
| Writing runtime dan studio integration | Frontend writing studio harus mengirim rich context ke runtime writing dan menerima event progress | Writing Studio sudah agent-first: build context, run `/api/agent/run`, punya tool drawer, planner tab, defense tab, golden thread modal, split editor, dan accept-all banner | Implemented | Low | `frontend_spa/src/features/writing/pages/WritingStudioPage.jsx:87`, `frontend_spa/src/features/writing/pages/WritingStudioPage.jsx:234`, `frontend_spa/src/features/writing/pages/WritingStudioPage.jsx:632`, `app/routes/agent.py:311` | Pertahankan; tambahkan smoke test UI atau playwright flow dasar |
| Citation-related writing support | Blueprint menghendaki format citation dan writing integrity yang membantu output akademik | Fitur citation sekarang tersebar di tiga tempat: `writing_agent.format_citation`, `chapter_skills.validate_citations`, dan `diagnostic_agent.verify_citations`. Planner `validate_citations` justru me-route ke diagnostic verifier, bukan ke validator “missing citations” yang lebih dekat dengan blueprint penulisan | Diverged | Medium | `app/agent/writing_agent.py:575`, `app/agent/chapter_skills.py:410`, `app/agent/task_planner.py:799`, `app/agent/diagnostic_agent.py:375`, `app/agent/diagnostic_agent.py:392` | Satukan taxonomy citation workflow: `format`, `missing citation check`, `hallucination verification`, lalu pastikan planner memilih tool yang tepat per intent |
| Golden thread / coherence support | Cross-chapter coherence semestinya membantu quality control writing | Ada support golden thread di planner, diagnostic agent, UI modal, dan project context. Namun ini adalah perluasan dari blueprint awal, dan efektivitasnya sangat bergantung pada context yang dikirim frontend, bukan retrieval lintas bab yang benar-benar wajib | Partial | Medium | `app/agent/task_planner.py:814`, `app/agent/diagnostic_agent.py:178`, `frontend_spa/src/features/writing/pages/WritingStudioPage.jsx:147`, `frontend_spa/src/features/writing/context/ProjectContext.jsx:78` | Definisikan kontrak data golden thread yang wajib ada dan tambahkan fallback retrieval lintas bab jika field manual kosong |
| Runtime writing tunggal | Blueprint mengarah ke satu alur orchestration yang konsisten | Repo masih menyimpan jalur legacy writing: `/api/writing_studio/*`, adapter lama di assistant routes, dan fallback tools loop di supervisor. Ini meningkatkan risiko perilaku berbeda untuk request writing serupa | Diverged | High | `app/api/writing_studio.py:26`, `app/api/writing_studio.py:117`, `app/api/writing_studio.py:170`, `app/routes/agent.py:303`, `app/agent/supervisor.py:589` | Tetapkan `/api/agent/run` sebagai satu-satunya runtime baru, lalu deprecate route/adapter lama secara bertahap dengan checklist migrasi |
| Verification / automated tests untuk writing stack | Setiap flow writing penting seharusnya punya test minimal | Hampir tidak ada test untuk writing stack; file test yang ada hanya `test_generator_backend.py`, `test_pdf_gen.py`, dan `tests/__init__.py` | Missing | High | `test_generator_backend.py`, `test_pdf_gen.py`, `tests/__init__.py` | Tambahkan test prioritas untuk planner templates, executor happy path, memory context build, citation flow, dan SSE diff pipeline |

## Key Findings By Subsystem

### 1. Planner And Executor

Planner dan executor sudah menjadi tulang punggung writing stack, dan secara umum sesuai dengan arah blueprint. Bagian yang paling terasa belum “rapi final” adalah kontrak end-to-end per flow, terutama literature review, citation workflow, dan persistensi hasil plan ke memory yang masih dibagi antara executor dan supervisor.

### 2. Shared Memory

Shared memory sudah nyata dipakai, bukan lagi konsep. Conversation, document, research, dan user profile memory semuanya ada. Gap terbesarnya ada di konsistensi kontrak data:
- Document memory sudah berevolusi ke chunk-level model yang lebih kuat, tapi belum dirapikan dokumentasinya
- Research memory belum sepenuhnya tahan lintas request untuk helper sitasi
- User profile extraction masih heuristic-heavy

### 3. Writing Runtime And UX

Dari sisi produk, writing stack saat ini justru lebih maju dari blueprint awal: SSE runtime, pending diff, accept/reject, tool drawers, golden thread modal, split editor, dan chapter summaries sudah memberi UX yang cukup kaya. Risiko utamanya justru fragmentasi jalur runtime baru vs legacy, bukan kekurangan surface area.

### 4. Citation And Coherence Quality Layer

Lapisan quality control sudah mulai terbentuk, tetapi masih tersebar:
- ada formatting,
- ada missing-citation analysis,
- ada citation verification,
- ada golden-thread check.

Masalahnya, taxonomy dan routing-nya belum bersatu. Secara engineering, ini rawan membuat user mendapat hasil yang berbeda untuk intent yang mirip.

## Priority Fix List

1. Konsolidasikan runtime writing ke `/api/agent/run` dan hilangkan fallback legacy yang masih memecah perilaku.
2. Bekukan kontrak literature review end-to-end: source search, bentuk findings, output akhir, dan daftar referensi.
3. Satukan taxonomy fitur citation menjadi tiga lane yang jelas: formatting, missing-citation detection, dan hallucination verification.
4. Rapikan kontrak memory v2, terutama `DocumentMemory` dan `ResearchMemory`, agar caller tidak bergantung pada perilaku implisit.
5. Tambahkan automated tests untuk planner, executor, shared memory context, citation flow, dan SSE pending diff.

## Notes On Divergence And Extra Features Already Ahead Of Blueprint

Beberapa bagian repo sudah melampaui blueprint awal:
- SSE streaming runtime untuk agent progress
- pending diff editor workflow dengan accept/reject
- chapter summaries dan pruned context
- self-evaluation + revise loop di executor
- golden thread UI dan diagnostics
- split editor, command palette, dan tool drawer ecosystem

Artinya, backlog berikutnya sebaiknya tidak lagi fokus pada “menambah banyak fitur writing baru”, tetapi pada:
- konsolidasi kontrak,
- pengurangan legacy path,
- dan penambahan test/verification supaya fitur yang sudah banyak itu stabil.
