# ThesisStudio — Refactor Roadmap v2
> Kelanjutan dari VSCode-Grade Engineering Spec yang sudah di-refactor.
> Fokus: Single Agent Panel + Paragraph ID System + Agentic Loop.

---

## Status Saat Ini

Dari roadmap sebelumnya, yang sudah selesai:
- ✅ Command Palette (Cmd+K) + CommandRegistry
- ✅ Resizable Panel System (react-resizable-panels)
- ✅ Rich Context Engine (ContextBuilder.js)
- ✅ Global Keyboard Shortcuts
- ✅ Ghost Text Plugin
- ✅ Paragraph Context Awareness
- ✅ Agentic Loop dasar (useAgentLoop)
- ✅ Inline Diagnostic Squiggles
- ✅ Golden Thread Bar
- ✅ Academic Voice Meter
- ✅ Writing Session Mode

**Yang belum ada dan menjadi fokus roadmap ini:**
- ✅ Paragraph ID System (stable address per paragraf) — `ThesisParagraphNode.js` + `ParagraphIdPlugin.jsx`
- ✅ Single Agent Panel (pengganti multi-tab generator) — `AgentPanel.jsx` (1228 lines)
- ✅ Editor Diff Bridge (highlight + accept/reject per paragraf) — `EditorDiffBridge.js` + `DiffBlockNode.jsx`
- ✅ Agent tools yang bisa edit/insert/delete paragraf langsung — `thesis_tools.py` + `/api/agent/run` SSE endpoint
- ✅ Context memory system (chapter summaries, token management)

---

## Arsitektur Baru: Single Agent Panel

### Masalah dengan multi-tab sekarang

AssistantPanel saat ini punya 7 tab (Generator, Chat, Tools, Analysis, Logic, Defense, Planner). Masalahnya:

1. **Cognitive overhead** — user harus pilih tool dulu sebelum mulai
2. **AI terfragmentasi** — tiap tab adalah silo, tidak ada shared memory
3. **Workflow 2022** — dropdown + form + tombol generate = bukan agentic

### Solusi: 1 chat panel, agent yang punya tools

Persis seperti Cursor AI atau Antigravity — satu chat interface di mana agent bisa:
- Baca konten chapter (`read_chapter`)
- Edit paragraf spesifik (`edit_paragraph`)
- Sisipkan paragraf baru (`insert_paragraph`)
- Hapus paragraf (`delete_paragraph`)
- Buat chapter baru (`create_chapter`)
- Cari referensi (`search_references`)

User tidak perlu tahu tool mana yang dipakai — cukup bilang apa yang mau dikerjakan.

---

## Sprint 1 — Paragraph ID System
**Estimasi: 2–3 hari | CRITICAL FIRST**

Ini prerequisite untuk semua sprint lainnya. Agent butuh "alamat" untuk setiap paragraf. Tanpa stable ID, `edit_paragraph("P-003")` tidak tahu harus edit yang mana.

### Task 1.1 — Buat `ThesisParagraphNode.js`

```js
// nodes/ThesisParagraphNode.js
import { ParagraphNode } from 'lexical';
import { nanoid } from 'nanoid';

export class ThesisParagraphNode extends ParagraphNode {
  static getType() { return 'thesis-paragraph'; }

  constructor(paraId, key) {
    super(key);
    this.__paraId = paraId || 'P-' + nanoid(6);
  }

  // Wajib — ID persist saat serialize/deserialize ke Firestore
  exportJSON() {
    return { ...super.exportJSON(), paraId: this.__paraId, type: 'thesis-paragraph' };
  }
  static importJSON(json) {
    return new ThesisParagraphNode(json.paraId);
  }

  // Expose ke DOM — agent detect via data attribute
  createDOM(config) {
    const dom = super.createDOM(config);
    dom.setAttribute('data-para-id', this.__paraId);
    return dom;
  }

  static clone(node) {
    return new ThesisParagraphNode(node.__paraId, node.__key);
  }

  getParagraphId() { return this.__paraId; }
}
```

**File:** `NEW nodes/ThesisParagraphNode.js`

---

### Task 1.2 — Buat `ParagraphIdPlugin.jsx`

Plugin yang assign ID ke ParagraphNode biasa yang belum punya ID (untuk konten lama yang sudah tersimpan di Firestore).

```js
// plugins/ParagraphIdPlugin.jsx
export function ParagraphIdPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Transform: ParagraphNode biasa → ThesisParagraphNode
    return editor.registerNodeTransform(ParagraphNode, (node) => {
      if (!(node instanceof ThesisParagraphNode)) {
        const thesis = new ThesisParagraphNode();
        node.replace(thesis, true); // true = transfer children
      }
    });
  }, [editor]);

  return null;
}
```

> ⚠️ **Catatan penting:** Konten lama yang sudah tersimpan di Firestore belum punya `paraId`. Saat plugin ini pertama kali load, dia akan assign ID baru ke semua paragraf lama — ini normal dan expected. Test dengan konten existing dulu, bukan hanya konten baru.

**File:** `NEW plugins/ParagraphIdPlugin.jsx`

---

### Task 1.3 — Register di `LexicalEditor.jsx` (3 baris)

```js
// Tambah import:
import { ThesisParagraphNode } from './nodes/ThesisParagraphNode';
import { ParagraphIdPlugin } from './plugins/ParagraphIdPlugin';

// Tambah ke nodes array (line ~28):
const nodes = [
  // ... existing nodes ...
  ThesisParagraphNode, // ← tambah ini
];

// Tambah di render tree, setelah FloatingToolbarPlugin:
<ParagraphIdPlugin />
```

**File:** `EDIT LexicalEditor.jsx (+3 lines)`

---

### Task 1.4 — Expose `getParagraphsWithIds()` via editorRef

```js
// Di dalam EditorRefPlugin, tambah ke editorRef.current:
getParagraphsWithIds: () => {
  const result = [];
  editor.getEditorState().read(() => {
    $getRoot().getChildren().forEach(node => {
      if (node instanceof ThesisParagraphNode) {
        result.push({
          paraId:  node.getParagraphId(),
          content: node.getTextContent(),
        });
      }
    });
  });
  return result;
},
```

**File:** `EDIT LexicalEditor.jsx (EditorRefPlugin)`

**✅ Deliverable Sprint 1:** Buka editor → inspect DOM → setiap `<p>` punya `data-para-id` yang tidak berubah setelah refresh.

---

## Sprint 2 — Context Memory System
**Estimasi: 2–3 hari | HIGH**

Agent tidak boleh baca semua konten tesis setiap call — untuk tesis 8000 halaman itu 4–6 juta token. Solusinya: 3 layer memory.

```
LONG-TERM MEMORY          WORKING MEMORY         ACTIVE CONTEXT
(Firestore)               (Per-session)          (In-prompt)

Semua konten tesis    →   Summary tiap bab   →   Hanya yang relevan
Tidak masuk prompt        ~100 token/bab         ~6000 token total
```

### Task 2.1 — Tambah `goldenThread` ke `ProjectContext.jsx`

```js
// Tambah state (sudah ada goldenThread dari refactor sebelumnya? extend saja):
const [chapterSummaries, setChapterSummaries] = useState({});

const updateChapterSummary = useCallback(async (chapterId, htmlContent) => {
  // Fire and forget — jangan await, jangan block save
  fetch('/api/summarize-chapter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, chapterId, content: htmlContent })
  })
    .then(r => r.json())
    .then(({ summary }) => {
      setChapterSummaries(prev => ({ ...prev, [chapterId]: summary }));
      // Persist ke Firestore
      db.collection('projects').doc(projectId)
        .update({ [`chapterSummaries.${chapterId}`]: summary })
        .catch(console.warn);
    })
    .catch(console.warn);
}, [projectId]);

// Expose di value:
// chapterSummaries, updateChapterSummary
```

**File:** `EDIT ProjectContext.jsx (~20 lines)`

---

### Task 2.2 — Trigger di `AutoSavePlugin.jsx` (+4 baris)

```js
// Setelah: onServerSave(htmlString);
// Tambah 4 baris:
if (onUpdateSummary && projectId && activeChapterId) {
  onUpdateSummary(activeChapterId, htmlString); // fire and forget
}
```

**File:** `EDIT AutoSavePlugin.jsx (+4 lines)`

---

### Task 2.3 — Update `ContextBuilder.js`

Extend ContextBuilder yang sudah ada dengan chapter summaries. Token budget per call:

| Komponen | Token | Catatan |
|---|---|---|
| Project metadata | ~200 | title, RQ, methodology |
| Chapter summaries (5 bab) | ~500 | 100 token/bab — bukan full text |
| Bab aktif full content | ~4000 | satu-satunya yang full |
| Paragraf relevan (semantic search) | ~500 | dari bab lain |
| References relevan | ~400 | top 8 |
| Tool schemas | ~800 | definisi 6 tools |
| System prompt | ~500 | instruksi agent |
| **TOTAL** | **~6900** | untuk tesis 8000 halaman sekalipun |

```js
// lib/contextBuilder.js — update fungsi yang sudah ada
export function buildContext(project, chapters, chapterSummaries, activeChapterId, editorRef) {
  return {
    project: {
      title:            project.title,
      researchQuestion: project.problem_statement,
      methodology:      project.methodology,
      variables:        project.variables_indicators,
    },
    // Summary saja — bukan full text bab lain
    chapters: chapters.map(ch => ({
      id:        ch.id,
      title:     ch.title,
      summary:   chapterSummaries[ch.id] || 'belum di-summarize',
      wordCount: ch.wordCount,
      status:    ch.status,
    })),
    // Bab aktif — full content dengan paragraph IDs
    activeParagraphs: editorRef.current?.getParagraphsWithIds() || [],
    references:       project.references?.slice(0, 10) || [],
    goldenThread:     project.goldenThread || {},
  };
}
```

**File:** `EDIT lib/contextBuilder.js`

**✅ Deliverable Sprint 2:** Log `buildContext()` output di console — total token estimate harus di bawah 7000 apapun panjang tesisnya.

---

## Sprint 3 — Editor Diff Bridge
**Estimasi: 3–4 hari | CORE**

Jembatan antara "diff object dari agent" dan "Lexical editor state". Ini yang bikin paragraf highlight hijau/biru/merah saat agent propose perubahan.

### Task 3.1 — Buat `plugins/EditorDiffBridge.js`

```js
// plugins/EditorDiffBridge.js

// 1. Apply highlight (belum commit — hanya CSS)
export function applyDiffHighlight(editor, diff) {
  const dom = editor.getRootElement()
    ?.querySelector(`[data-para-id="${diff.paraId}"]`);
  if (!dom) return;

  dom.classList.remove('diff-edit', 'diff-add', 'diff-del');
  dom.classList.add(`diff-${diff.type}`);
  dom.dataset.diffId = diff.diffId;
}

// 2. Commit ke Lexical state (setelah user Accept)
export function commitDiff(editor, diff) {
  editor.update(() => {
    if (diff.type === 'edit') {
      const node = findNodeByParaId(diff.paraId, editor);
      if (node) replaceNodeContent(editor, node, diff.after);

    } else if (diff.type === 'insert') {
      const anchor = findNodeByParaId(diff.anchorId, editor);
      if (anchor) {
        const newNode = new ThesisParagraphNode(diff.paraId);
        // inject content dari diff.after
        anchor.insertAfter(newNode);
        injectContentIntoNode(editor, newNode, diff.after);
      }

    } else if (diff.type === 'delete') {
      const node = findNodeByParaId(diff.paraId, editor);
      node?.remove();
    }
  });
}

// 3. Revert highlight (setelah user Reject — no state change)
export function revertDiff(editor, diff) {
  const dom = editor.getRootElement()
    ?.querySelector(`[data-para-id="${diff.paraId}"]`);
  if (dom) {
    dom.classList.remove('diff-edit', 'diff-add', 'diff-del');
    delete dom.dataset.diffId;
  }
}

// Helper
function findNodeByParaId(paraId, editor) {
  let found = null;
  editor.getEditorState().read(() => {
    $getRoot().getChildren().forEach(node => {
      if (node instanceof ThesisParagraphNode && node.getParagraphId() === paraId) {
        found = node;
      }
    });
  });
  return found;
}
```

**File:** `NEW plugins/EditorDiffBridge.js`

---

### Task 3.2 — CSS untuk diff states (tambah ke editorTheme.js)

```js
// styles/editorTheme.js atau globals.css
.diff-edit {
  background: rgba(59, 130, 246, 0.06);
  border-left: 2.5px solid #3B82F6;
  padding-left: 10px;
  margin-left: -13px;
  border-radius: 0 4px 4px 0;
}
.diff-add {
  background: rgba(34, 197, 94, 0.07);
  border-left: 2.5px solid #22C55E;
  padding-left: 10px;
  margin-left: -13px;
}
.diff-del {
  background: rgba(239, 68, 68, 0.07);
  border-left: 2.5px solid #EF4444;
  opacity: 0.65;
  text-decoration: line-through;
}
```

**File:** `EDIT styles/editorTheme.js`

**✅ Deliverable Sprint 3:** Panggil `applyDiffHighlight(editor, { type: 'edit', paraId: 'P-xxx' })` dari console — paragraf harus highlight biru.

---

## Sprint 4 — Agent Tools Backend
**Estimasi: 3–4 hari | CORE**

Backend endpoint `/api/agent/run` yang berjalan sebagai SSE stream dengan tool calling.

### Task 4.1 — Tool Registry

```js
// backend/agentTools.js
export const THESIS_TOOLS = [
  {
    name: 'read_chapter',
    description: 'Baca konten chapter atau range paragraf untuk konteks',
    input_schema: {
      type: 'object',
      properties: {
        chapter_id: { type: 'string' },
        mode: { type: 'string', enum: ['full', 'summary', 'range'] },
        para_range: { type: 'string', description: 'e.g. P-001..P-010' }
      },
      required: ['chapter_id']
    }
  },
  {
    name: 'edit_paragraph',
    description: 'Ganti konten paragraf berdasarkan para_id. Perubahan jadi pending diff.',
    input_schema: {
      type: 'object',
      properties: {
        para_id:     { type: 'string' },
        new_content: { type: 'string' },
        reason:      { type: 'string' }
      },
      required: ['para_id', 'new_content', 'reason']
    }
  },
  {
    name: 'insert_paragraph',
    description: 'Sisipkan paragraf baru setelah anchor_id. Jadi pending diff.',
    input_schema: {
      type: 'object',
      properties: {
        anchor_id: { type: 'string' },
        position:  { type: 'string', enum: ['after', 'before'] },
        content:   { type: 'string' },
        reason:    { type: 'string' }
      },
      required: ['anchor_id', 'content']
    }
  },
  {
    name: 'delete_paragraph',
    description: 'Hapus paragraf. Jadi pending diff — user masih bisa reject.',
    input_schema: {
      type: 'object',
      properties: {
        para_id: { type: 'string' },
        reason:  { type: 'string' }
      },
      required: ['para_id', 'reason']
    }
  },
  {
    name: 'search_references',
    description: 'Cari referensi dari database project yang relevan',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number' }
      },
      required: ['query']
    }
  },
  {
    name: 'create_chapter',
    description: 'Buat chapter/bab baru di project',
    input_schema: {
      type: 'object',
      properties: {
        title:    { type: 'string' },
        position: { type: 'number' }
      },
      required: ['title']
    }
  }
];
```

**File:** `NEW backend/agentTools.js`

---

### Task 4.2 — Agent Executor

```js
// backend/agentExecutor.js
export async function executeAgentTool(toolName, input, ctx) {
  const { projectId, chapterId } = ctx;

  switch (toolName) {

    case 'read_chapter': {
      const chapter = await getChapter(projectId, input.chapter_id);

      // Chapter terlalu panjang? Return summary + warning
      if (input.mode !== 'full' && chapter.wordCount > 2000) {
        return {
          summary: chapter.aiSummary || 'belum di-summarize',
          wordCount: chapter.wordCount,
          warning: `Chapter ${input.chapter_id} panjang (${chapter.wordCount} kata). Gunakan mode:'range' untuk baca bagian spesifik.`
        };
      }

      return { paragraphs: chapter.paragraphs, wordCount: chapter.wordCount };
    }

    // edit, insert, delete — TIDAK langsung ke DB
    // Return pending diff → frontend yang apply setelah user approve
    case 'edit_paragraph': {
      const before = await getParagraphContent(projectId, chapterId, input.para_id);
      return {
        success: true,
        diff: {
          diffId:  'diff_' + Date.now(),
          type:    'edit',
          paraId:  input.para_id,
          before,
          after:   input.new_content,
          reason:  input.reason,
        }
      };
    }

    case 'insert_paragraph': {
      return {
        success: true,
        diff: {
          diffId:   'diff_' + Date.now(),
          type:     'insert',
          paraId:   'P-' + nanoid(6), // ID baru untuk paragraf yang disisipkan
          anchorId: input.anchor_id,
          position: input.position || 'after',
          after:    input.content,
          reason:   input.reason,
        }
      };
    }

    case 'delete_paragraph': {
      const before = await getParagraphContent(projectId, chapterId, input.para_id);
      return {
        success: true,
        diff: {
          diffId: 'diff_' + Date.now(),
          type:   'delete',
          paraId: input.para_id,
          before,
          reason: input.reason,
        }
      };
    }

    case 'search_references': {
      const refs = await searchProjectReferences(projectId, input.query, input.limit || 5);
      return { references: refs };
    }

    case 'create_chapter': {
      // create_chapter langsung ke DB — tidak butuh approve
      const newChapter = await createChapter(projectId, {
        title:    input.title,
        position: input.position || 99,
        content:  '',
      });
      return { success: true, chapterId: newChapter.id };
    }
  }
}
```

**File:** `NEW backend/agentExecutor.js`

---

### Task 4.3 — SSE Endpoint `/api/agent/run`

```js
// backend/routes/agent.js
export async function runAgentHandler(req, res) {
  const { projectId, chapterId, messages, context } = req.body;

  // Setup SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const emit = (event, data) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  const systemPrompt = buildSystemPrompt(context); // dari contextBuilder
  let conversationMessages = [...messages];
  const MAX_ITER = 8;

  try {
    for (let i = 0; i < MAX_ITER; i++) {
      const response = await anthropic.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 4096,
        system:     systemPrompt,
        tools:      THESIS_TOOLS,
        messages:   conversationMessages,
      });

      // Stream text ke frontend
      for (const block of response.content) {
        if (block.type === 'text' && block.text) {
          emit('text', { content: block.text });
        }
      }

      // Selesai
      if (response.stop_reason === 'end_turn') {
        emit('done', {}); break;
      }

      // Tool calls
      if (response.stop_reason === 'tool_use') {
        const toolResults = [];

        for (const block of response.content) {
          if (block.type !== 'tool_use') continue;

          emit('tool_call', { id: block.id, name: block.name, input: block.input });

          const result = await executeAgentTool(block.name, block.input, { projectId, chapterId });

          emit('tool_result', { id: block.id, name: block.name, result });

          // Kalau ada pending diff → kirim ke frontend untuk highlight editor
          if (result.diff) {
            emit('pending_diff', result.diff);
          }

          toolResults.push({
            type:        'tool_result',
            tool_use_id: block.id,
            content:     JSON.stringify(result),
          });
        }

        conversationMessages = [
          ...conversationMessages,
          { role: 'assistant', content: response.content },
          { role: 'user',      content: toolResults },
        ];
      }
    }
  } catch (err) {
    emit('error', { message: err.message });
  } finally {
    res.end();
  }
}
```

**File:** `NEW backend/routes/agent.js`

**✅ Deliverable Sprint 4:** Panggil endpoint dengan Postman/curl → SSE events muncul → `pending_diff` event ter-emit dengan benar.

---

## Sprint 5 — useAgentLoop.js (extend yang sudah ada)
**Estimasi: 2 hari | FRONTEND**

Extend `useAgentLoop` yang sudah ada dari refactor sebelumnya dengan kemampuan handle `pending_diff` events dan expose `acceptDiff`/`rejectDiff`.

### Task 5.1 — Extend `useAgentLoop.js`

```js
// hooks/useAgentLoop.js — tambah ke yang sudah ada

export function useAgentLoop({ editorRef, projectId, chapterId }) {
  // ... state yang sudah ada ...
  const [pendingDiffs, setPendingDiffs] = useState([]);

  // Extend handler SSE events
  const handleSSEEvent = useCallback((event, data) => {
    switch (event) {
      case 'text':
        appendAiText(data.content); break;

      case 'tool_call':
        setToolCalls(prev => [...prev, { ...data, status: 'running' }]); break;

      case 'tool_result':
        setToolCalls(prev => prev.map(t =>
          t.id === data.id ? { ...t, status: 'done', result: data.result } : t
        )); break;

      // ← INI YANG BARU
      case 'pending_diff':
        setPendingDiffs(prev => [...prev, data]);
        applyDiffHighlight(editorRef.current?.editor, data); // highlight di editor
        break;

      case 'done':
        setAgentStatus('done'); break;
    }
  }, [editorRef]);

  // Accept satu diff
  const acceptDiff = useCallback((diffId) => {
    const diff = pendingDiffs.find(d => d.diffId === diffId);
    if (!diff) return;
    commitDiff(editorRef.current?.editor, diff);      // apply ke Lexical
    saveParagraphChange(diff, projectId, chapterId);  // persist ke Firestore
    setPendingDiffs(prev => prev.filter(d => d.diffId !== diffId));
  }, [pendingDiffs, editorRef, projectId, chapterId]);

  // Reject satu diff
  const rejectDiff = useCallback((diffId) => {
    const diff = pendingDiffs.find(d => d.diffId === diffId);
    if (!diff) return;
    revertDiff(editorRef.current?.editor, diff); // hapus highlight, no state change
    setPendingDiffs(prev => prev.filter(d => d.diffId !== diffId));
  }, [pendingDiffs, editorRef]);

  const acceptAll = useCallback(() => {
    pendingDiffs.forEach(diff => acceptDiff(diff.diffId));
  }, [pendingDiffs, acceptDiff]);

  const rejectAll = useCallback(() => {
    pendingDiffs.forEach(diff => rejectDiff(diff.diffId));
  }, [pendingDiffs, rejectDiff]);

  return {
    // ... yang sudah ada ...
    pendingDiffs,
    acceptDiff,
    rejectDiff,
    acceptAll,
    rejectAll,
  };
}
```

**File:** `EDIT hooks/useAgentLoop.js`

---

## Sprint 6 — AgentPanel.jsx + Swap AssistantPanel
**Estimasi: 3–4 hari | UI FINAL**

Ini sprint terakhir dan paling visible. Buat `AgentPanel.jsx` berdasarkan design `thesis-agent-design.html`, lalu swap `AssistantPanel.jsx`.

### Task 6.1 — Buat `AgentPanel.jsx`

Komponen yang harus ada di dalam AgentPanel:

```
AgentPanel/
  ├── HistoryView          — daftar conversation sebelumnya (dari localStorage)
  ├── MessageList          — render messages[] dengan tool cards
  │   ├── UserMessage      — bubble user
  │   ├── AiMessage        — text response AI
  │   ├── ToolCallCard     — collapsible, status running/done, show args + result
  │   └── DiffActionCard   — inline Accept/Reject per pending diff
  ├── AcceptAllBanner      — banner di atas editor saat ada pending diffs
  ├── QuickChips           — contextual shortcut chips, berubah tergantung bab aktif
  └── AgentInput           — textarea + model selector + send button
```

Pola dari `ChatInterface.jsx` lama yang harus di-carry:
- `getStorageKey(pid)` → `onthesis_agent_history_${pid}` (ganti key supaya tidak bentrok)
- `useEffect` pada `project?.id` → reload history saat ganti project
- `isPro` check + `setShowUpgradeModal`

**File:** `NEW components/Assistant/AgentPanel.jsx`

---

### Task 6.2 — Swap `AssistantPanel.jsx`

```jsx
// AssistantPanel.jsx — setelah refactor (dari 184 baris jadi ~15 baris)
import AgentPanel from './Assistant/AgentPanel';

// Semua import lama di-comment, tidak dihapus:
// import GeneratorTab from './Assistant/GeneratorTab';
// import ChatInterface from './Assistant/ChatInterface';
// import AnalysisTab from './Assistant/AnalysisTab';
// ... dst

export default function AssistantPanel(props) {
  return (
    <div className="flex flex-col h-full bg-transparent">
      <AgentPanel {...props} />
    </div>
  );
}
```

> Semua tab lama tetap ada di filesystem. Tidak ada yang dihapus. Kalau ada issue dengan AgentPanel, 1 line uncomment dan semua tabs balik.

**File:** `EDIT AssistantPanel.jsx (184 → ~15 lines)`

---

### Task 6.3 — Tambah `AcceptAllBanner` ke `WritingStudioRoot.jsx`

Banner yang muncul di atas editor saat ada pending diffs dari agent:

```jsx
// Di WritingStudioRoot.jsx, di atas editor area:
{pendingDiffs.length > 0 && (
  <AcceptAllBanner
    count={pendingDiffs.length}
    onAcceptAll={acceptAll}
    onRejectAll={rejectAll}
    onClose={() => {/* dismiss banner tapi keep diffs */}}
  />
)}
```

**File:** `EDIT WritingStudioRoot.jsx`

**✅ Deliverable Sprint 6:** Full end-to-end — user kirim pesan → tool cards muncul → diff highlight di editor → Accept All/Reject All bekerja → konten tersimpan ke Firestore.

---

## Backend Endpoints yang Dibutuhkan

| Endpoint | Method | Deskripsi | Sprint |
|---|---|---|---|
| `/api/agent/run` | POST → SSE | Agent loop dengan tool calling | 4 |
| `/api/summarize-chapter` | POST | Generate summary 3–5 kalimat per bab | 2 |
| `/api/ghost-complete` | POST | Ghost text (Haiku, max 80 token) | sudah ada |
| `/api/analyze/paragraph` | POST | Coherence, voice, citation score | sudah ada |

---

## Timeline

| Minggu | Sprint | Deliverable |
|---|---|---|
| 1 | Sprint 1 — Paragraph ID | `data-para-id` stable di setiap `<p>` DOM |
| 2 | Sprint 2 — Context Memory | Chapter summaries auto-update, token budget <7k |
| 3 | Sprint 3 — Diff Bridge | Paragraf bisa di-highlight dari console |
| 4–5 | Sprint 4 — Backend | SSE endpoint + pending_diff events |
| 6 | Sprint 5 — Frontend Loop | `acceptDiff`/`rejectDiff` bekerja |
| 7 | Sprint 6 — AgentPanel UI | Full swap, end-to-end working |

---

## Dependencies Baru

| Package | Kegunaan | Prioritas |
|---|---|---|
| `nanoid` | Generate stable paragraph IDs | CRITICAL |
| `@anthropic-ai/sdk` | Tool calling di backend | CRITICAL (mungkin sudah ada) |

Tidak ada dependency frontend baru — semua pakai yang sudah ada dari refactor sebelumnya.

---

## Prinsip yang Tidak Berubah dari Roadmap Sebelumnya

1. **Context is King** — Setiap AI call bawa full context (research question + chapter summaries + golden thread)
2. **Plugins, Not Monoliths** — Setiap fitur = plugin terpisah
3. **Streams, Not Waits** — Semua AI response via SSE
4. **Accountability Trail** — Semua perubahan agent = pending diff dulu, user yang approve
5. **Keyboard First** — Semua aksi bisa dari Command Palette

---

## Mulai Dari Mana Besok

**File pertama yang harus dibuat:** `nodes/ThesisParagraphNode.js`

Bisa selesai dalam 2 jam. Itu yang unlock semua sprint berikutnya. Tanpa stable paragraph ID, agent tidak punya "alamat" — semua tool calls (`edit_paragraph`, `insert_paragraph`, `delete_paragraph`) tidak akan bisa jalan.
