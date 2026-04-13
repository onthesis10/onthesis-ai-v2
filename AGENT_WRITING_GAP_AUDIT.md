# Agent Writing Gap Audit

Tanggal audit: 2026-03-28  
Blueprint acuan: `onthesis-agent-blueprint.md`  
Fokus runtime: `app/agent/supervisor.py`, `app/agent/memory_system.py`, `app/routes/agent.py`, `frontend_spa/src/features/writing/hooks/useAgentLoop.js`, `frontend_spa/src/features/writing/hooks/useStreamGenerator.js`

---

## 1. Ringkasan

Audit ini mengganti total audit sebelumnya karena sebagian gap lama sudah tertutup, tetapi ada gap baru yang sekarang lebih penting terhadap kualitas fitur writing agent.

Baseline implementasi saat ini sudah cukup maju:

- runtime utama agent writing sudah berjalan lewat SSE `POST /api/agent/run`
- supervisor, planner, executor, dan worker agent sudah terhubung
- frontend `AgentPanel` sudah membaca event SSE yang sama dengan backend
- `WritingAgent` sudah lebih dekat ke blueprint dibanding fase awal

Namun, jika dibandingkan langsung dengan blueprint, masalah utama sekarang bukan lagi "agent belum ada", melainkan:

- runtime writing belum benar-benar tunggal
- memory document/profile/plan trace belum durable end-to-end
- kontrak context antar worker belum seragam
- token budgeting, pruning, observability, dan trace execution belum operasional
- riwayat frontend dan backend masih hidup di dua sumber berbeda

Kesimpulan audit:

Sistem writing agent saat ini sudah melewati fase pondasi, tetapi masih berada di fase transisi arsitektur. Gap terbesar ada pada penyatuan runtime, persistence memory, dan standardisasi context contract, bukan pada penambahan tool baru.

---

## 2. Status Yang Sudah Benar

Beberapa gap lama sudah tertutup dan tidak perlu lagi dicatat sebagai masalah utama:

### 2.1 WritingAgent Sudah Context-Aware

- `WritingAgent` sekarang memakai prompt Indonesia sebagai default.
- `WritingAgent._call_llm()` sudah memperkaya system prompt dengan memory context.
- `WritingAgent.run_tool(..., memory=...)` sudah meneruskan memory ke tool methods.

Dampak:

- agent writing tidak lagi sepenuhnya buta terhadap konteks tesis, project, dan preferensi user
- gap lama soal prompt Inggris vs target user Indonesia sudah tidak relevan lagi sebagai temuan utama

### 2.2 `edit_thesis` Sudah Masuk Planner Dulu

- `SupervisorAgent.process_request()` sekarang mencoba `TaskPlanner.generate_plan()` untuk intent `edit_thesis` terlebih dahulu.
- `_run_thesis_tools_loop()` masih ada, tetapi sudah turun menjadi fallback terakhir saat planner gagal.

Dampak:

- gap lama bahwa `edit_thesis` selalu bypass planner sudah tidak akurat lagi

### 2.3 Conversation Memory Sudah Project-Scoped

- `SharedMemory` sekarang memakai `project_scope = "{user_id}:{project_id}"`.
- `ConversationMemory` diinisialisasi dengan scope project, bukan hanya user.

Dampak:

- histori percakapan agent sudah lebih selaras dengan model thesis-per-project di blueprint
- kebocoran memory antar project jauh berkurang

### 2.4 Fallback Web Search Sudah Dinormalisasi Sebelum Persist

- fallback web result dari `ResearchAgent.search_papers()` sekarang dibentuk ke schema paper yang konsisten
- `ResearchMemory.add_papers()` juga mem-filter hasil non-akademik sebelum persistence

Dampak:

- gap lama soal hasil fallback liar masuk ke memory akademik sudah banyak tertutup

### 2.5 SSE `/api/agent/run` Sudah Tersambung ke UI Agent

- route `app/routes/agent.py` memanggil `SupervisorAgent.process_request()` dan memancarkan `STEP`, `TOOL_CALL`, `TOOL_RESULT`, `PENDING_DIFF`, `CITATION_FLAG`, `INCOHERENCE_WARNING`, `TEXT_DELTA`, dan `DONE`
- `useAgentLoop.js` sudah memproses event-event tersebut
- `AgentPanel.jsx` sudah memakai loop ini sebagai runtime agent utama

Dampak:

- kontrak SSE backend dan panel agent frontend sekarang benar-benar hidup

---

## 3. Gap Aktual vs Blueprint

### 3.1 Runtime Masih Belum Tunggal

Blueprint mengarah ke satu loop agent terpusat. Kondisi repo sekarang masih belum sampai ke sana.

Temuan di source code:

- runtime utama writing agent memang sudah `POST /api/agent/run`
- tetapi generator UI masih memakai `useStreamGenerator.js` dengan endpoint default `POST /api/assistant/generate-stream`
- generator chapters di `frontend_spa/src/features/writing/components/Assistant/generators/Chapter1-5/index.jsx` masih memakai hook lama itu
- legacy route `app/api/writing_studio.py` masih aktif untuk `/chat`, `/search_references`, `/paraphrase`, dan `/transform`
- `app/orchestrator/modes/writing_mode.py` masih ada sebagai jalur writing lain
- `SupervisorAgent._run_thesis_tools_loop()` juga masih hidup sebagai fallback execution path

Dampak:

- arsitektur writing agent belum benar-benar "one writing loop"
- debugging, telemetry, dan standardisasi kontrak output masih terfragmentasi
- ada risiko perilaku berbeda antara AgentPanel dan generator tabs walaupun user merasa memakai fitur writing yang sama

Prioritas: P0

### 3.2 DocumentMemory Belum Hidup End-to-End

Blueprint menempatkan `DocumentMemory` sebagai memori inti draft tesis. Implementasi saat ini baru sebagian.

Temuan di source code:

- `DocumentMemory.add_or_update_chunk()` dan `get_relevant_context()` sudah ada
- tetapi jalur produksi writing/editor belum terlihat menulis draft editor ke `DocumentMemory` secara reguler
- penggunaan yang jelas di runtime sekarang baru chapter summary lewat `add_or_update_chapter_summary()`
- test memang mencakup `add_or_update_chunk()` dan `get_section()`, tetapi itu belum membuktikan integrasi dengan flow save editor
- ada bug nyata: `DocumentMemory.get_section()` memanggil `self.vector_db.scroll(...)` tanpa `order_by`, padahal wrapper `QdrantVectorDB.scroll()` mensyaratkan parameter `order_by`

Dampak:

- blueprint "draft thesis memory" belum benar-benar terhubung ke editing harian user
- memory dokumen masih lebih dekat ke utilitas retrieval parsial, belum menjadi source of truth draft
- bug `get_section()` berpotensi pecah saat dipakai di jalur produksi yang lebih aktif

Prioritas: P0

### 3.3 Persistence Memory Belum Sesuai Blueprint

Blueprint mengasumsikan memory profile, conversation, document, dan plan trace dapat bertahan dan membentuk perilaku agent yang semakin konsisten. Persistensi sekarang masih parsial.

Temuan di source code:

- `SupervisorAgent` masih membuat `DummyDocumentDB()` sebagai backing store profile DB
- `UserProfileMemory` pada praktiknya bergantung pada Redis untuk persistence profile, bukan DB nyata
- `ConversationMemory.save()` juga hanya aktif jika Redis tersedia
- `ConversationMemory.store_plan()` hanya menyimpan metadata plan di memori proses, tidak durable
- jika Redis tidak tersedia, banyak state penting turun ke mode non-persisten

Dampak:

- profil dan trace plan belum memenuhi ekspektasi blueprint untuk memory jangka panjang
- restart instance atau absennya Redis bisa memutus kontinuitas agent
- data plan execution belum bisa dijadikan audit trail yang andal

Prioritas: P0

### 3.4 Shared Context Belum Konsisten di Semua Worker

Blueprint menghendaki `SharedMemory.build_agent_context()` menjadi dasar context semua agent. Sekarang penerapannya masih tidak merata.

Temuan di source code:

- `WritingAgent` sudah context-aware
- `ResearchAgent`, `AnalysisAgent`, `DiagnosticAgent`, dan `ChapterSkillsAgent` belum memakai kontrak context injection yang setara
- `messages_history` dari route `app/routes/agent.py` sudah dikirim ke runtime context
- tetapi `SupervisorAgent` tetap memakai `agent_context.get("conversation_history")` dari backend memory, bukan `messages_history` dari request sebagai sumber percakapan aktif
- akibatnya chat history UI, Redis conversation memory, dan worker context belum menyatu

Dampak:

- konteks yang dipakai worker berbeda-beda tergantung agent
- hasil reasoning antar worker tidak sepenuhnya konsisten
- frontend history dan backend history bisa drift

Prioritas: P1

### 3.5 Token Budget dan Context Pruning Belum Aktif Secara Operasional

Blueprint menempatkan token estimation dan context management sebagai bagian penting untuk efisiensi. Implementasi sekarang masih baru setengah jalan.

Temuan di source code:

- `TaskPlanner` menghitung `estimated_tokens`, tetapi nilainya belum dipakai untuk keputusan routing atau budgeting
- `_build_pruned_context()` ada di `app/routes/agent.py`, tetapi belum dipakai oleh `run_agent_sse()`
- `SupervisorAgent.process_request()` memanggil `memory.build_agent_context(message)` sebelum intent final diputuskan
- itu berarti greeting atau pertanyaan umum tetap bisa memicu retrieval/embedding memory yang tidak perlu

Dampak:

- sistem masih bisa boros token dan retrieval pada request ringan
- context pruning yang seharusnya jadi guardrail belum benar-benar melindungi runtime utama

Prioritas: P1

### 3.6 Observability dan Executor Robustness Masih Kurang

Blueprint menekankan executor yang aman, terukur, dan dapat dilacak. Implementasi sekarang belum sampai sana.

Temuan di source code:

- belum ada retry policy per-step
- belum ada metrics terstruktur untuk step latency, cache hit rate, fallback rate, atau memory hit rate
- plan execution trace belum durable
- self-evaluation loop di `PlanExecutor.execute()` masih memanggil method privat `WritingAgent._call_llm()` secara langsung

Dampak:

- error handling masih cukup rapuh pada operasi LLM yang fluktuatif
- sulit melihat bottleneck nyata di production
- kontrak executor terhadap worker belum sebersih blueprint

Prioritas: P2

### 3.7 Frontend Agent History Belum Sinkron dengan Backend Memory

Blueprint mengasumsikan shared memory yang koheren. Saat ini frontend dan backend masih menyimpan histori di tempat berbeda.

Temuan di source code:

- `agentHistoryService.js` menyimpan session history di Firebase subcollection dan localStorage fallback
- backend conversation memory berjalan di Redis
- tidak ada sinkronisasi eksplisit antara history panel dengan `ConversationMemory`

Dampak:

- belum ada source of truth tunggal untuk percakapan agent
- user bisa melihat history panel yang tidak identik dengan memory yang dipakai supervisor
- auditability dan replay request masih lemah

Prioritas: P1

---

## 4. Apa Yang Harus Dikerjakan

### P0

- Satukan semua writing-agent flow ke `/api/agent/run`; `useStreamGenerator` dan generator tabs harus migrasi ke loop SSE yang sama dengan `AgentPanel`.
- Wire editor/project content ke `DocumentMemory.add_or_update_chunk()` pada save, snapshot penting, atau perubahan chapter yang relevan.
- Ganti `DummyDocumentDB` dengan persistence nyata untuk profile dan plan trace.
- Perbaiki bug `DocumentMemory.get_section()` agar sinkron dengan signature `QdrantVectorDB.scroll()`.

### P1

- Definisikan shared worker context contract yang sama untuk `WritingAgent`, `ResearchAgent`, `AnalysisAgent`, `DiagnosticAgent`, dan `ChapterSkillsAgent`.
- Putuskan `messages_history` dipakai sungguhan oleh supervisor/classifier atau dihapus dari route agar tidak menjadi konteks palsu.
- Aktifkan token budget dan context pruning di runtime utama, bukan hanya di helper yang belum dipakai.
- Tambahkan fast-path agar greeting dan general question tidak memicu retrieval mahal dari memory/vector search.
- Satukan strategi history antara frontend agent session dan backend conversation memory.

### P2

- Tambahkan metrics step latency, fallback rate, memory hit rate, dan structured execution trace.
- Tambahkan retry policy per-step untuk operasi LLM yang layak diulang.
- Rapikan self-evaluation loop agar tidak memanggil method privat worker secara langsung.
- Jika ingin upgrade UX lebih jauh, aktifkan streaming tool output dari worker writing, bukan hanya final `TEXT_DELTA`.

---

## 5. Dampak API dan Interface

Audit ini menegaskan arah kontrak target yang seharusnya dipakai fase berikutnya:

- `POST /api/agent/run` harus menjadi satu-satunya SSE runtime untuk writing-agent.
- `POST /api/assistant/generate-stream` dan `/api/writing_studio/*` harus diposisikan sebagai adapter sementara atau deprecated path, bukan arsitektur final.
- `SharedMemory` harus menjadi source of truth untuk conversation, document, research, dan profile sesuai scope project/user.
- Semua worker `agent.run_tool(..., memory=...)` harus memakai contract context yang sama, bukan hanya WritingAgent.

---

## 6. Test Plan Yang Direkomendasikan

- Tambahkan backend contract test untuk memastikan generator tabs yang dimigrasi tetap menghasilkan event SSE yang sama dengan `AgentPanel`.
- Tambahkan test produksi untuk write/read `DocumentMemory` dari flow save editor, bukan hanya unit test fake vector DB.
- Tambahkan test yang memastikan `messages_history` benar-benar dipakai, atau dihapus secara eksplisit dari runtime.
- Tambahkan test bahwa greeting dan general question tidak memicu retrieval/embedding berat.
- Tambahkan test persistence boundary untuk memastikan profile dan plan trace tetap tersedia setelah restart atau fallback storage.
- Tambahkan test migrasi legacy route agar adapter lama tidak merusak kontrak payload/event frontend.

---

## 7. Assumptions dan Defaults

- File ini mengganti total audit lama, bukan menambahkan delta di bawah isi sebelumnya.
- Scope audit difokuskan ke writing feature dan agent runtime, bukan seluruh modul defense atau analysis yang tidak memengaruhi jalur writing utama.
- Legacy path boleh tetap ada sementara, tetapi harus diperlakukan sebagai transitional debt, bukan desain akhir.

---

## 8. Kesimpulan

Jika dibandingkan dengan blueprint, OnThesis writing agent saat ini sudah melewati fase eksperimen awal dan sudah punya runtime utama yang nyata. Yang masih kurang sekarang bukan jumlah fitur agent, tetapi penyatuan arsitektur dan kedisiplinan kontrak.

Prioritas terdekat seharusnya bukan menambah tool baru, melainkan:

- menyatukan semua jalur writing ke satu runtime
- membuat memory document/profile/plan trace benar-benar durable
- menyeragamkan context contract antar worker
- mengaktifkan budgeting, pruning, dan observability di runtime yang benar-benar dipakai

Setelah empat hal itu dibereskan, barulah pengembangan agent writing akan naik kelas dari "fitur yang sudah hidup" menjadi "sistem agent thesis yang stabil, hemat, dan koheren sesuai blueprint".
