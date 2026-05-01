// ─── AgentPanel — Polished Elegant Version v2 ───
// Fixes: ThinkingSteps only when running, sequential phase updates
// Improvements: elegant step bar, duration timer, better empty state

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Send, Sparkles, Check, X, ChevronDown, ChevronRight, ChevronUp,
    AlertTriangle, StopCircle, Wrench, FileEdit, Plus,
    Trash2, Search, FolderPlus, CheckCheck, XCircle, Zap,
    PenLine, Eye, Lock, History, MessageSquarePlus
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext.jsx';
import { buildFullContext } from '../../context/ContextBuilder.js';
import useAgentLoop, { AGENT_STATES } from '../../hooks/useAgentLoop.js';
import { useThemeStore } from '@/store/themeStore';
import { saveAgentSession, loadAgentSession, listAgentSessions, deleteAgentSession, clearAllAgentSessions } from '../../services/agentHistoryService.js';

const TOOL_ICONS = {
    read_editor_context: Eye,
    suggest_replace_text: PenLine,
    suggest_insert_text: Plus,
    suggest_delete_text: Trash2,
    suggest_replace: PenLine,
    suggest_insert: Plus,
    suggest_delete: Trash2,
    search_papers: Search,
    rank_papers: Zap,
    extract_findings: Sparkles,
    generate_full_chapter: FolderPlus,
    generate_chapter: FolderPlus,
    verify_citations: CheckCheck,
    validate_citations: CheckCheck,
    check_golden_thread: Lock,
    read_chapter: Eye,
    edit_paragraph: PenLine,
    insert_paragraph: Plus,
    delete_paragraph: Trash2,
    search_references: Search,
    create_chapter: FolderPlus,
};

const TOOL_LABELS = {
    read_editor_context: 'Membaca konteks editor',
    suggest_replace_text: 'Merevisi paragraf',
    suggest_insert_text: 'Menambahkan paragraf',
    suggest_delete_text: 'Menghapus paragraf',
    suggest_replace: 'Merevisi paragraf',
    suggest_insert: 'Menambahkan paragraf',
    suggest_delete: 'Menghapus paragraf',
    search_papers: 'Mencari paper',
    rank_papers: 'Merangking paper',
    extract_findings: 'Mengekstrak temuan',
    generate_full_chapter: 'Menyusun draft bab',
    generate_chapter: 'Menyusun draft bab',
    verify_citations: 'Memeriksa sitasi',
    validate_citations: 'Memeriksa sitasi',
    check_golden_thread: 'Memeriksa golden thread',
    search_references: 'Mencari referensi',
    read_chapter: 'Membaca bab (legacy)',
    insert_paragraph: 'Menyisipkan paragraf (legacy)',
    edit_paragraph: 'Mengedit paragraf (legacy)',
    delete_paragraph: 'Menghapus paragraf (legacy)',
};

const PHASES = ['planning', 'searching', 'writing', 'evaluating', 'revising', 'done'];
const PHASE_LABELS = {
    planning: 'Planning',
    searching: 'Searching',
    writing: 'Writing',
    evaluating: 'Evaluating',
    revising: 'Revising',
    done: 'Done',
};
const SEARCH_TOOLS = new Set(['search_references', 'read_chapter', 'search_papers', 'rank_papers', 'extract_findings']);
const WRITING_TOOLS = new Set([
    'insert_paragraph',
    'edit_paragraph',
    'delete_paragraph',
    'suggest_insert',
    'suggest_replace',
    'suggest_delete',
    'suggest_insert_text',
    'suggest_replace_text',
    'suggest_delete_text',
    'generate_full_chapter',
    'generate_chapter',
    'rewrite_text',
]);

function getFriendlyToolLabel(toolName) {
    return TOOL_LABELS[toolName] || 'Processing...';
}

function truncateText(value, limit = 50) {
    const text = String(value || '');
    return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function friendlyStepMessage(event) {
    if (!event) return '⚙️ Memproses...';
    const tool = event.tool || event?.args?.tool || '';
    const step = event.step || '';
    if (tool === 'search_references') {
        const query = event?.args?.query || '';
        return `🔍 Mencari referensi tentang ${query || 'topik terkait'}...`;
    }
    if (tool === 'search_papers') {
        const query = event?.args?.query || '';
        return `🔍 Mencari paper tentang ${query || 'topik terkait'}...`;
    }
    if (tool === 'rank_papers') return '📊 Menilai dan mengurutkan paper...';
    if (tool === 'extract_findings') return '✨ Mengekstrak temuan utama...';
    if (tool === 'read_editor_context') return '📖 Membaca konteks editor...';
    if (tool === 'suggest_insert_text' || tool === 'suggest_insert') return '✍️ Menyusun paragraf baru...';
    if (tool === 'suggest_replace_text' || tool === 'suggest_replace') return '✏️ Merevisi paragraf...';
    if (tool === 'suggest_delete_text' || tool === 'suggest_delete') return '🗑️ Menghapus paragraf...';
    if (tool === 'generate_full_chapter' || tool === 'generate_chapter') return '🧱 Menyusun draft bab...';
    if (tool === 'verify_citations' || tool === 'validate_citations') return '✅ Memeriksa sitasi...';
    if (tool === 'check_golden_thread') return '🧭 Memeriksa alur argumen...';
    if (tool === 'read_chapter') return '📖 Membaca konteks bab...';
    if (tool === 'insert_paragraph') return '✍️ Menyusun paragraf baru...';
    if (tool === 'edit_paragraph') return '✏️ Mengedit paragraf...';
    if (tool === 'delete_paragraph') return '🗑️ Menghapus paragraf...';
    if (step === 'planning') return '🧠 Merencanakan langkah...';
    if (step === 'executing') return '⚙️ Mengeksekusi...';
    if (step === 'reviewing') return '✍️ Menyusun jawaban akhir...';
    if (step === 'evaluating') return '🔎 Mengevaluasi hasil...';
    if (step === 'revising') return '🛠️ Merevisi berdasarkan evaluasi...';
    if (step === 'done') return '✅ Selesai.';
    return '⚙️ Memproses...';
}

function getToolPrimaryParam(toolName, args = {}) {
    if (!args || typeof args !== 'object') return '';
    if (toolName === 'search_references' || toolName === 'search_papers') return args.query || '';
    if (toolName === 'read_editor_context') return args.mode || '';
    if (toolName === 'suggest_replace_text' || toolName === 'suggest_replace' || toolName === 'suggest_delete_text' || toolName === 'suggest_delete') {
        return args.target_paragraph_id || '';
    }
    if (toolName === 'suggest_insert_text' || toolName === 'suggest_insert') return args.target_paragraph_id || '';
    if (toolName === 'generate_full_chapter' || toolName === 'generate_chapter') return args.chapter_type || args.chapter_number || '';
    if (toolName === 'edit_paragraph' || toolName === 'delete_paragraph') return args.para_id || '';
    if (toolName === 'insert_paragraph') return args.anchor_id || '';
    return '';
}

function normalizePaperResults(result) {
    if (!result) return [];
    const data = typeof result === 'string' ? (() => { try { return JSON.parse(result); } catch { return {}; } })() : result;
    if (Array.isArray(data)) return data;
    const list = data.references || data.papers || data.results || [];
    if (Array.isArray(list) && list.length > 0) return list;
    return [];
}

function normalizeToolPayload(payload) {
    if (!payload) return null;
    if (typeof payload === 'string') {
        try {
            return JSON.parse(payload);
        } catch {
            return payload;
        }
    }
    return payload;
}

function summarizeToolArgs(toolName, args = {}) {
    if (!args || typeof args !== 'object') return [];

    const pairs = [];
    if (toolName === 'search_references' || toolName === 'search_papers') {
        if (args.query) pairs.push(['Query', args.query]);
    } else if (toolName === 'read_editor_context') {
        if (args.mode) pairs.push(['Mode', args.mode]);
    } else if (toolName === 'suggest_replace_text' || toolName === 'suggest_replace' || toolName === 'suggest_delete_text' || toolName === 'suggest_delete') {
        if (args.target_paragraph_id) pairs.push(['Paragraf', args.target_paragraph_id]);
    } else if (toolName === 'suggest_insert_text' || toolName === 'suggest_insert') {
        if (args.target_paragraph_id) pairs.push(['Setelah paragraf', args.target_paragraph_id]);
    } else if (toolName === 'generate_full_chapter' || toolName === 'generate_chapter') {
        if (args.chapter_type || args.chapter_number) pairs.push(['Bab', args.chapter_type || args.chapter_number]);
    }

    if (pairs.length > 0) return pairs;

    return Object.entries(args)
        .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
        .slice(0, 4)
        .map(([key, value]) => [key, Array.isArray(value) ? value.join(', ') : String(value)]);
}

function summarizeToolResult(toolName, result) {
    const data = normalizeToolPayload(result);
    if (!data) return '';
    if (typeof data === 'string') return data;

    const diff = data.diff;
    if (diff && typeof diff === 'object') {
        const action = {
            insert: 'Usulan paragraf baru sudah disiapkan.',
            edit: 'Usulan revisi paragraf sudah disiapkan.',
            delete: 'Usulan penghapusan paragraf sudah disiapkan.',
        }[diff.type] || 'Usulan perubahan editor sudah disiapkan.';
        const target = diff.paraId || diff.anchorId;
        const reason = diff.reason ? ` Alasan: ${diff.reason}` : '';
        return `${action}${target ? ` Target: ${target}.` : ''}${reason}`;
    }

    if (toolName === 'read_editor_context') {
        const total = data.total || data.paragraphs?.length || data.summaries?.length || 0;
        return total > 0
            ? `${total} bagian konteks editor berhasil dibaca.`
            : (data.message || 'Konteks editor berhasil dibaca.');
    }

    if (toolName === 'rank_papers') {
        const ranked = data.ranked_papers || data.papers || data.results || [];
        if (Array.isArray(ranked) && ranked.length > 0) return `${ranked.length} paper selesai dinilai dan diurutkan.`;
    }

    if (toolName === 'extract_findings') {
        const findings = data.findings || data.results || [];
        if (Array.isArray(findings) && findings.length > 0) return `${findings.length} temuan utama berhasil diekstrak.`;
    }

    if (toolName === 'verify_citations' || toolName === 'validate_citations') {
        const citations = data.citations || data.results || [];
        if (Array.isArray(citations) && citations.length > 0) return `${citations.length} sitasi selesai diperiksa.`;
    }

    if (typeof data.message === 'string' && data.message.trim()) return data.message.trim();
    if (typeof data.output === 'string' && data.output.trim()) return data.output.trim();
    if (typeof data.result === 'string' && data.result.trim()) return data.result.trim();
    if (data.success === true) return 'Tool selesai diproses.';

    return '';
}

// ─── Thinking dots ───
function ThinkingDots({ color = 'currentColor', size = 6 }) {
    return (
        <span className="ap-thinking-dots" aria-hidden="true" style={{ color }}>
            <span className="ap-dot" style={{ width: size, height: size }} />
            <span className="ap-dot" style={{ width: size, height: size }} />
            <span className="ap-dot" style={{ width: size, height: size }} />
        </span>
    );
}

// ─── Elegant horizontal step bar ───
function ThinkingSteps({ phase = 'planning', theme }) {
    const t = tok(theme);
    const activeIdx = PHASES.indexOf(phase);

    return (
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 2px 4px' }}>
            {PHASES.map((item, idx) => {
                const isDone = phase === 'done' ? true : activeIdx > idx;
                const isActive = activeIdx === idx && phase !== 'done';
                const isPending = activeIdx < idx && phase !== 'done';

                return (
                    <React.Fragment key={item}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            {/* Dot */}
                            <div style={{
                                width: 20, height: 20, borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: isDone ? t.accent : isActive ? t.accentBg : 'transparent',
                                border: `1.5px solid ${isDone ? t.accent : isActive ? t.accent : t.border}`,
                                transition: 'all 300ms ease',
                                flexShrink: 0,
                            }}>
                                {isDone
                                    ? <Check size={10} style={{ color: '#fff' }} />
                                    : isActive
                                        ? <ThinkingDots color={t.accent} size={3} />
                                        : <div style={{ width: 5, height: 5, borderRadius: '50%', background: t.border }} />
                                }
                            </div>
                            {/* Label */}
                            <span style={{
                                fontSize: 9, fontWeight: isActive ? 700 : 500,
                                color: isDone || isActive ? t.accent : t.textDim,
                                letterSpacing: '0.06em', textTransform: 'uppercase',
                                transition: 'color 300ms ease',
                                whiteSpace: 'nowrap',
                            }}>
                                {PHASE_LABELS[item]}
                            </span>
                        </div>
                        {/* Connector line */}
                        {idx < PHASES.length - 1 && (
                            <div style={{
                                flex: 1, height: 1.5, marginBottom: 14, marginLeft: 2, marginRight: 2,
                                background: isDone
                                    ? t.accent
                                    : `linear-gradient(90deg, ${isActive ? t.accent : t.border} 0%, ${t.border} 100%)`,
                                transition: 'background 300ms ease',
                            }} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

// ─── Markdown renderer ───
function renderMarkdown(text, t) {
    if (!text) return null;
    const lines = text.split('\n');
    const elements = [];
    let listItems = [];
    let listType = null;

    const flushList = () => {
        if (listItems.length === 0) return;
        const tag = listType === 'ol' ? 'ol' : 'ul';
        elements.push(
            React.createElement(tag, {
                key: `list-${elements.length}`,
                style: { margin: '4px 0', paddingLeft: 18, fontSize: 11.5, lineHeight: 1.65, color: t.text, listStyleType: listType === 'ol' ? 'decimal' : 'disc' }
            }, listItems.map((li, i) => React.createElement('li', { key: i, style: { marginBottom: 2 } }, formatInline(li, t))))
        );
        listItems = [];
        listType = null;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)/);
        if (headingMatch) {
            flushList();
            const level = headingMatch[1].length;
            const sizes = { 1: 14, 2: 12.5, 3: 11.5 };
            elements.push(React.createElement('div', { key: `h-${i}`, style: { fontSize: sizes[level] || 11.5, fontWeight: 700, color: t.text, margin: '8px 0 3px', letterSpacing: '-0.01em' } }, formatInline(headingMatch[2], t)));
            continue;
        }
        const olMatch = trimmed.match(/^\d+\.\s+(.+)/);
        if (olMatch) { if (listType !== 'ol') flushList(); listType = 'ol'; listItems.push(olMatch[1]); continue; }
        const ulMatch = trimmed.match(/^[-*]\s+(.+)/);
        if (ulMatch) { if (listType !== 'ul') flushList(); listType = 'ul'; listItems.push(ulMatch[1]); continue; }
        if (trimmed.startsWith('```')) {
            flushList();
            const codeLines = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith('```')) { codeLines.push(lines[i]); i++; }
            elements.push(React.createElement('pre', { key: `code-${i}`, style: { fontFamily: t.mono, fontSize: 10, color: t.textMid, background: t.surface2, borderRadius: 6, padding: '8px 10px', margin: '4px 0', overflowX: 'auto', whiteSpace: 'pre-wrap', border: `1px solid ${t.border}`, lineHeight: 1.5 } }, codeLines.join('\n')));
            continue;
        }
        if (!trimmed) { flushList(); continue; }
        flushList();
        elements.push(React.createElement('p', { key: `p-${i}`, style: { fontSize: 11.5, lineHeight: 1.65, color: t.text, margin: '2px 0' } }, formatInline(trimmed, t)));
    }
    flushList();
    return elements;
}

function formatInline(text, t) {
    const parts = [];
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)|(\\n)|([^*`\\]+|[*`\\])/g;
    let match; let key = 0;
    while ((match = regex.exec(text)) !== null) {
        if (match[2]) parts.push(React.createElement('strong', { key: key++, style: { fontWeight: 600, color: t.text } }, match[2]));
        else if (match[3]) parts.push(React.createElement('em', { key: key++, style: { fontStyle: 'italic', color: t.textMid } }, match[3]));
        else if (match[4]) parts.push(React.createElement('code', { key: key++, style: { fontFamily: t.mono, fontSize: 10, background: t.surface2, padding: '1px 4px', borderRadius: 3, color: t.accent } }, match[4]));
        else parts.push(match[0]);
    }
    return parts.length > 0 ? parts : text;
}

const QUICK_CHIPS = [
    { label: 'Perbaiki gaya akademis', prompt: 'Perbaiki gaya penulisan paragraf yang dipilih agar lebih akademis dan formal.' },
    { label: 'Tambah paragraf', prompt: 'Tambahkan paragraf baru yang mengembangkan argumen utama di bab ini.' },
    { label: 'Cek koherensi', prompt: 'Periksa koherensi antar paragraf di bab ini dan berikan saran perbaikan.' },
    { label: 'Tambah sitasi', prompt: 'Identifikasi klaim yang membutuhkan sitasi dan tambahkan referensi yang relevan.' },
];

const EXAMPLE_PROMPTS = [
    { icon: '🔍', text: 'Carikan 5 paper terbaru tentang topik tesis saya' },
    { icon: '✏️', text: 'Perbaiki paragraf ini agar lebih akademis dan formal' },
    { icon: '🧠', text: 'Analisis koherensi dan argumen di bab ini' },
];

const AGENT_MODELS = [
    { id: 'llama-70b', label: 'Llama 3.3 70B', shortLabel: 'Llama 70B', proOnly: false },
    { id: 'deepseek-r1', label: 'DeepSeek R1 70B', shortLabel: 'DeepSeek R1', proOnly: true },
    { id: 'gemma-9b', label: 'Gemma 2 9B', shortLabel: 'Gemma 9B', proOnly: false },
];

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');
  .ap-root * { box-sizing: border-box; }
  .ap-root { font-family: 'DM Sans', sans-serif; }
  .ap-scroll::-webkit-scrollbar { width: 3px; height: 3px; }
  .ap-scroll::-webkit-scrollbar-track { background: transparent; }
  .ap-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 2px; }
  .ap-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.14); }
  .ap-scroll-light::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); }
  .ap-scroll-light::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.16); }
  @keyframes ap-shimmer { 0%{opacity:0.4} 50%{opacity:1} 100%{opacity:0.4} }
  .ap-shimmer { animation: ap-shimmer 1.8s ease-in-out infinite; }
  @keyframes ap-caret { 0%,100%{opacity:1} 50%{opacity:0} }
  .ap-caret { animation: ap-caret 1s step-end infinite; }
  @keyframes ap-slide-up { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  .ap-slide-up { animation: ap-slide-up 0.22s ease; }
  @keyframes ap-fade { from{opacity:0} to{opacity:1} }
  .ap-fade { animation: ap-fade 0.18s ease; }
  @keyframes ap-spin { to{transform:rotate(360deg)} }
  .ap-spin { animation: ap-spin 0.9s linear infinite; }
  @keyframes ap-pulse { 0%,100%{transform:scale(1);opacity:0.7} 50%{transform:scale(1.3);opacity:1} }
  .ap-pulse { animation: ap-pulse 1.4s ease-in-out infinite; }
  @keyframes ap-dot-seq { 0%,100%{opacity:0.3;transform:translateY(0)} 20%{opacity:1;transform:translateY(-1px)} }
  .ap-thinking-dots { display:inline-flex;align-items:center;gap:4px; }
  .ap-thinking-dots .ap-dot { border-radius:999px;background:currentColor;opacity:0.3;animation:ap-dot-seq 1.2s linear infinite; }
  .ap-thinking-dots .ap-dot:nth-child(1) { animation-delay:0s; }
  .ap-thinking-dots .ap-dot:nth-child(2) { animation-delay:0.4s; }
  .ap-thinking-dots .ap-dot:nth-child(3) { animation-delay:0.8s; }
  .ap-textarea { field-sizing: content; }
  .ap-chip::after { content:'';position:absolute;bottom:0;left:50%;right:50%;height:1px;background:currentColor;opacity:0.4;transition:left 0.2s ease,right 0.2s ease; }
  .ap-chip:hover::after { left:0;right:0; }
  .ap-tool-card { transition:max-height 0.2s ease,opacity 0.2s ease; }
`;

let stylesInjected = false;
function injectStyles() {
    if (stylesInjected || typeof document === 'undefined') return;
    const el = document.createElement('style');
    el.textContent = STYLES;
    document.head.appendChild(el);
    stylesInjected = true;
}

function tok(themeMode) {
    const isDark = themeMode === 'dark';
    const isHappy = themeMode === 'happy';
    if (isHappy) return {
        bg: 'rgba(255,252,245,0.7)', surface: '#FFFFFF', surface2: '#FFF8ED',
        border: 'rgba(251,146,60,0.2)', borderFocus: 'rgba(249,115,22,0.4)',
        text: '#292524', textMid: '#78716C', textDim: '#A8A29E',
        accent: '#F97316', accentBg: 'rgba(249,115,22,0.1)', accentGlow: '0 0 12px rgba(249,115,22,0.2)',
        userBubble: '#FFFFFF', green: '#10B981', red: '#F43F5E',
        mono: "'Geist Mono','JetBrains Mono',monospace",
    };
    if (isDark) return {
        bg: 'rgba(11,17,32,0.7)', surface: '#0F172A', surface2: '#1E293B',
        border: 'rgba(255,255,255,0.08)', borderFocus: 'rgba(14,165,233,0.4)',
        text: '#F8FAFC', textMid: '#94A3B8', textDim: '#64748B',
        accent: '#0EA5E9', accentBg: 'rgba(14,165,233,0.1)', accentGlow: '0 0 12px rgba(14,165,233,0.2)',
        userBubble: '#1E293B', green: '#10B981', red: '#EF4444',
        mono: "'Geist Mono','JetBrains Mono',monospace",
    };
    return {
        bg: 'rgba(245,245,247,0.8)', surface: '#FFFFFF', surface2: '#F8FAFC',
        border: 'rgba(0,0,0,0.05)', borderFocus: 'rgba(0,122,255,0.3)',
        text: '#0F172A', textMid: '#64748B', textDim: '#94A3B8',
        accent: '#007AFF', accentBg: 'rgba(0,122,255,0.08)', accentGlow: '0 0 12px rgba(0,122,255,0.15)',
        userBubble: '#FFFFFF', green: '#059669', red: '#DC2626',
        mono: "'Geist Mono','JetBrains Mono',monospace",
    };
}

// ─── Tool Call Card with duration timer ───
function ToolCallCard({ toolCall, theme }) {
    const [open, setOpen] = useState(false);
    const [elapsed, setElapsed] = useState(null);
    const startRef = useRef(Date.now());
    const isDark = theme === 'dark';
    const t = tok(theme);
    const Icon = TOOL_ICONS[toolCall.tool] || Wrench;
    const done = toolCall.status === 'done';
    const friendlyName = getFriendlyToolLabel(toolCall.tool);
    const primaryParam = getToolPrimaryParam(toolCall.tool, toolCall.args);
    const headerLabel = primaryParam ? `${friendlyName}: ${truncateText(primaryParam, 35)}` : friendlyName;
    const papers = (toolCall.tool === 'search_references' || toolCall.tool === 'search_papers') && done
        ? normalizePaperResults(toolCall.result)
        : [];
    const argLines = summarizeToolArgs(toolCall.tool, toolCall.args);
    const resultSummary = done ? summarizeToolResult(toolCall.tool, toolCall.result) : '';

    useEffect(() => {
        if (done) {
            setElapsed(((Date.now() - startRef.current) / 1000).toFixed(1));
            return;
        }
        const interval = setInterval(() => {
            setElapsed(((Date.now() - startRef.current) / 1000).toFixed(1));
        }, 100);
        return () => clearInterval(interval);
    }, [done]);

    return (
        <div className="ap-tool-card" style={{ border: `1px solid ${t.border}`, borderRadius: 8, overflow: 'hidden', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
            <button onClick={() => setOpen(v => !v)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                {done
                    ? <Check size={10} style={{ color: t.green, flexShrink: 0 }} />
                    : <ThinkingDots color={t.accent} size={4} />
                }
                <Icon size={10} style={{ color: t.accent, flexShrink: 0 }} />
                <span style={{ fontFamily: t.mono, fontSize: 10, color: t.textMid, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>
                    {headerLabel}
                </span>
                {elapsed && (
                    <span style={{ fontFamily: t.mono, fontSize: 9, color: done ? t.textDim : t.accent, flexShrink: 0, marginRight: 4 }}>
                        {elapsed}s
                    </span>
                )}
                <span style={{ color: t.textDim, flexShrink: 0 }}>
                    {open ? <ChevronDown size={9} /> : <ChevronRight size={9} />}
                </span>
            </button>

            {open && (
                <div className="ap-fade" style={{ padding: '8px 10px', borderTop: `1px solid ${t.border}`, background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
                    {toolCall.args && (
                        <div style={{ marginBottom: 6 }}>
                            <span style={{ fontFamily: t.mono, fontSize: 9, color: t.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>args</span>
                            <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                {argLines.length > 0 ? argLines.map(([label, value], idx) => (
                                    <div key={`${label}-${idx}`} style={{ fontSize: 10, color: t.textMid, lineHeight: 1.45 }}>
                                        <span style={{ fontFamily: t.mono, color: t.textDim }}>{label}:</span>{' '}
                                        <span>{truncateText(value, 120)}</span>
                                    </div>
                                )) : (
                                    <div style={{ fontSize: 10, color: t.textDim, fontStyle: 'italic' }}>Tidak ada parameter penting yang perlu ditampilkan.</div>
                                )}
                            </div>
                        </div>
                    )}
                    {papers.length > 0 ? (
                        <div>
                            <span style={{ fontFamily: t.mono, fontSize: 9, color: t.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                {papers.length} paper ditemukan
                            </span>
                            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {papers.slice(0, 3).map((paper, idx) => {
                                    const title = truncateText(paper?.title || 'Untitled', 50);
                                    const author = Array.isArray(paper?.authors) ? paper.authors[0] : (paper?.author || paper?.authors || 'Unknown');
                                    const year = paper?.year || 'n/a';
                                    const scoreRaw = Number(paper?.relevance_score ?? paper?.final_score ?? 0.6);
                                    const scoreNorm = Number.isFinite(scoreRaw) ? (scoreRaw > 1 ? Math.min(1, scoreRaw / 100) : Math.min(1, scoreRaw)) : 0.6;
                                    const filled = Math.max(1, Math.min(5, Math.round(scoreNorm * 5)));

                                    return (
                                        <div key={idx} style={{ border: `1px solid ${t.border}`, borderLeft: `2px solid ${t.accent}`, borderRadius: 6, padding: '7px 9px', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
                                            <div style={{ fontSize: 10.5, color: t.text, fontWeight: 600, lineHeight: 1.4, marginBottom: 3 }}>{title}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: 9.5, color: t.textMid }}>{truncateText(String(author), 26)} · {year}</span>
                                                <span style={{ fontFamily: t.mono, fontSize: 9, color: t.accent, letterSpacing: 1 }}>
                                                    {'●'.repeat(filled)}{'○'.repeat(5 - filled)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                                {papers.length > 3 && <span style={{ fontSize: 10, color: t.textDim, fontStyle: 'italic' }}>+{papers.length - 3} paper lainnya</span>}
                            </div>
                        </div>
                    ) : resultSummary && (
                        <div>
                            <span style={{ fontFamily: t.mono, fontSize: 9, color: t.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>hasil</span>
                            <div className="ap-scroll" style={{ fontSize: 10, color: t.textMid, marginTop: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 100, overflowY: 'auto', lineHeight: 1.55 }}>
                                {resultSummary}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Diff Action Card ───
function DiffActionCard({ diff, onAccept, onReject, theme, status }) {
    const t = tok(theme);
    const isDark = theme === 'dark';
    const resolved = status === 'accepted' || status === 'rejected';
    const previewText = diff.new_text || diff.after || '';
    const cfg = {
        edit: { color: t.accent, label: 'Edit', Icon: PenLine },
        insert: { color: t.green, label: 'Insert', Icon: Plus },
        delete: { color: t.red, label: 'Delete', Icon: Trash2 },
    }[diff.type] || { color: t.accent, label: 'Change', Icon: FileEdit };

    return (
        <div className="ap-slide-up" style={{ border: `1px solid ${t.border}`, borderLeft: `2px solid ${cfg.color}`, borderRadius: 8, padding: '10px 12px', background: isDark ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.015)', opacity: resolved ? 0.55 : 1, transition: 'opacity 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: diff.reason ? 7 : 0 }}>
                <cfg.Icon size={11} style={{ color: cfg.color, flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: cfg.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{cfg.label}</span>
                <span style={{ fontFamily: t.mono, fontSize: 9, color: t.textDim, marginLeft: 'auto' }}>{diff.paraId}</span>
            </div>
            {diff.reason && <p style={{ fontSize: 11, color: t.textMid, lineHeight: 1.55, marginBottom: 8 }}>{diff.reason}</p>}
            {(diff.type === 'edit' || diff.type === 'insert') && previewText && (
                <div className="ap-scroll" style={{ fontFamily: t.mono, fontSize: 10, color: t.textMid, background: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.03)', borderRadius: 5, padding: '6px 8px', maxHeight: 72, overflowY: 'auto', lineHeight: 1.55, marginBottom: 9 }}>
                    {previewText.substring(0, 220)}{previewText.length > 220 ? '…' : ''}
                </div>
            )}
            {resolved ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: status === 'accepted' ? (isDark ? 'rgba(52,211,153,0.1)' : 'rgba(5,150,105,0.08)') : (isDark ? 'rgba(248,113,113,0.1)' : 'rgba(220,38,38,0.08)'), color: status === 'accepted' ? t.green : t.red }}>
                    {status === 'accepted' ? <Check size={10} /> : <X size={10} />}
                    {status === 'accepted' ? 'Accepted' : 'Rejected'}
                </div>
            ) : (
                <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => onAccept(diff.diffId)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '5px 0', borderRadius: 5, fontSize: 10.5, fontWeight: 600, border: 'none', cursor: 'pointer', background: isDark ? 'rgba(52,211,153,0.12)' : 'rgba(5,150,105,0.1)', color: t.green, transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(52,211,153,0.2)' : 'rgba(5,150,105,0.18)'} onMouseLeave={e => e.currentTarget.style.background = isDark ? 'rgba(52,211,153,0.12)' : 'rgba(5,150,105,0.1)'}>
                        <Check size={11} /> Accept
                    </button>
                    <button onClick={() => onReject(diff.diffId)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '5px 0', borderRadius: 5, fontSize: 10.5, fontWeight: 600, border: 'none', cursor: 'pointer', background: isDark ? 'rgba(248,113,113,0.1)' : 'rgba(220,38,38,0.08)', color: t.red, transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(248,113,113,0.2)' : 'rgba(220,38,38,0.15)'} onMouseLeave={e => e.currentTarget.style.background = isDark ? 'rgba(248,113,113,0.1)' : 'rgba(220,38,38,0.08)'}>
                        <X size={11} /> Reject
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Accept All Banner ───
export function AcceptAllBanner({ count, onAcceptAll, onRejectAll, onClose }) {
    if (!count) return null;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: 'linear-gradient(90deg, #92400E 0%, #B45309 100%)', borderBottom: '1px solid rgba(251,191,36,0.2)' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#FCD34D' }} className="ap-pulse" />
            <span style={{ flex: 1, fontSize: 10.5, color: 'rgba(255,255,255,0.9)', fontWeight: 500, letterSpacing: '0.01em' }}>{count} perubahan menunggu persetujuan</span>
            <button onClick={onAcceptAll} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}>
                <CheckCheck size={10} /> Accept All
            </button>
            <button onClick={onRejectAll} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: 'rgba(0,0,0,0.15)', color: 'rgba(255,255,255,0.75)', border: 'none', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.28)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.15)'}>
                <XCircle size={10} /> Reject All
            </button>
            {onClose && <button onClick={onClose} style={{ padding: 3, borderRadius: 4, background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}><X size={10} /></button>}
        </div>
    );
}

// ─── Chat History Item ───
function ChatHistoryItem({ title, time, active, onClick, onDelete, theme }) {
    const isDark = theme === 'dark';
    const t = tok(theme);
    return (
        <div onClick={onClick} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', borderRadius: 6, background: active ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)') : 'transparent', transition: 'background 0.2s', border: `1px solid ${active ? t.borderFocus : 'transparent'}`, marginBottom: 4 }} onMouseEnter={e => { if (!active) e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'; }} onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden' }}>
                <span style={{ fontSize: 13, fontWeight: active ? 600 : 500, color: active ? t.text : (isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)'), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
                <span style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>{time}</span>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ padding: 4, background: 'transparent', border: 'none', cursor: 'pointer', color: t.textDim }} onMouseEnter={e => e.currentTarget.style.color = t.red} onMouseLeave={e => e.currentTarget.style.color = t.textDim}>
                <Trash2 size={14} />
            </button>
        </div>
    );
}

function formatTimeAgo(timestamp) {
    const rtf = new Intl.RelativeTimeFormat('id', { numeric: 'auto' });
    const diff = (timestamp - Date.now()) / 1000;
    if (Math.abs(diff) < 60) return 'Baru saja';
    if (Math.abs(diff) < 3600) return rtf.format(Math.round(diff / 60), 'minute');
    if (Math.abs(diff) < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
    return rtf.format(Math.round(diff / 86400), 'day');
}

// ==========================================
// MAIN AGENT PANEL
// ==========================================
export default function AgentPanel({ editorRef, projectId, activeChapterId, onPendingDiffsChange, ...restProps }) {
    injectStyles();

    const { project, chapters, isPro, setShowUpgradeModal, references, goldenThread, chapterSummaries, saveContent } = useProject();
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';
    const t = tok(theme);

    const [sessions, setSessions] = useState([]);
    const [activeSessionId, setActiveSessionId] = useState('project-session');
    const [showHistory, setShowHistory] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [input, setInput] = useState('');
    const [selectedMode, setSelectedMode] = useState('planning');
    const [selectedModel, setSelectedModel] = useState('llama-70b');
    const [showModelDropdown, setShowModelDropdown] = useState(false);

    // ─── BUG FIX: Sequential phase tracking ───
    const [currentPhase, setCurrentPhase] = useState(null);

    const inputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const sessionIdForProject = project?.id ? `project:${project.id}` : 'project-session';

    const agent = useAgentLoop({
        editorRef,
        projectId: projectId || project?.id,
        chapterId: activeChapterId,
        onSave: saveContent,
    });

    // ─── BUG FIX: Update phase sequentially from tool calls ───
    useEffect(() => {
        if (!agent.isRunning) {
            // Don't reset immediately — let "done" show briefly
            if (agent.agentState === AGENT_STATES.DONE) {
                setCurrentPhase('done');
                const t = setTimeout(() => setCurrentPhase(null), 2000);
                return () => clearTimeout(t);
            }
            return;
        }

        const currentStepType = agent.currentStep?.type;
        const currentStepName = agent.currentStep?.step;

        if (currentStepType === 'STEP') {
            if (currentStepName === 'evaluating' || currentStepName === 'revising') {
                setCurrentPhase(currentStepName);
                return;
            }
            if (currentStepName === 'planning') {
                setCurrentPhase('planning');
                return;
            }
            if (currentStepName === 'reviewing') {
                setCurrentPhase('writing');
                return;
            }
        }

        const runningTools = (agent.toolCalls || [])
            .filter(tc => tc.status === 'running')
            .map(tc => tc.tool);
        const hasSearch = runningTools.some(toolName => SEARCH_TOOLS.has(toolName));
        const hasWrite = runningTools.some(toolName => WRITING_TOOLS.has(toolName));

        if (hasWrite) {
            setCurrentPhase('writing');
            return;
        }
        if (hasSearch) {
            setCurrentPhase('searching');
            return;
        }
        if (currentStepType === 'STEP' && currentStepName === 'executing') {
            setCurrentPhase('writing');
            return;
        }
        setCurrentPhase('planning');
    }, [agent.isRunning, agent.toolCalls, agent.agentState, agent.currentStep]);

    useEffect(() => {
        onPendingDiffsChange?.(agent.pendingDiffs, agent.acceptAll, agent.rejectAll);
    }, [agent.pendingDiffs, agent.acceptAll, agent.rejectAll, onPendingDiffsChange]);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const payload = {
            status: agent.isRunning ? 'streaming' : (agent.agentState === AGENT_STATES.ERROR ? 'error' : 'idle'),
            phase: currentPhase || (agent.agentState === AGENT_STATES.DONE ? 'done' : 'idle'),
            streamData: agent.generatedText,
            error: agent.error,
        };
        window.dispatchEvent(new CustomEvent('onthesis-agent-state', { detail: payload }));
        return undefined;
    }, [agent.isRunning, agent.agentState, agent.generatedText, agent.error, currentPhase]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, agent.generatedText, agent.steps]);
    useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);

    useEffect(() => {
        if (!project?.id) return;
        const load = async () => {
            const loadedSessions = await listAgentSessions(project.id);
            setSessions(loadedSessions || []);
            if (loadedSessions && loadedSessions.length > 0) {
                setActiveSessionId(loadedSessions[0].id);
                setChatMessages(loadedSessions[0].messages || []);
            } else {
                setActiveSessionId(`project:${project.id}`);
                setChatMessages([]);
            }
            setInput('');
            setShowHistory(false);
        };
        load();
    }, [project?.id]);

    useEffect(() => {
        if (!project?.id || !activeSessionId) return;
        let calculatedTitle = 'New Chat';
        setSessions(prev => {
            const existingIdx = prev.findIndex(s => s.id === activeSessionId);
            let next = [...prev];
            if (chatMessages.length === 0) {
                next = [];
            } else {
                const titleMatch = chatMessages.find(m => m.role === 'user');
                let title = titleMatch ? titleMatch.content.substring(0, 30) : 'New Chat';
                if (titleMatch && titleMatch.content.length > 30) title += '...';
                calculatedTitle = title;
                const sessionData = { id: activeSessionId, title, updatedAt: Date.now(), messages: chatMessages };
                if (existingIdx >= 0) next[existingIdx] = sessionData;
                else next.unshift(sessionData);
                next.sort((a, b) => b.updatedAt - a.updatedAt);
            }
            return next;
        });
        if (chatMessages.length > 0) saveAgentSession(project.id, activeSessionId, chatMessages, calculatedTitle).catch(console.error);
    }, [chatMessages, activeSessionId, project?.id]);

    const startAgentRun = useCallback((message, context, history = [], options = {}, appendUserMessage = true) => {
        const trimmed = String(message || '').trim();
        if (!trimmed || agent.isRunning) return false;
        if (appendUserMessage) {
            setChatMessages(prev => [...prev, { role: 'user', content: trimmed, timestamp: Date.now() }]);
        }
        agent.runAgent(trimmed, context || {}, history, options);
        return true;
    }, [agent]);

    useEffect(() => {
        if (!project?.id || typeof window === 'undefined') return undefined;

        const handleExternalRun = (event) => {
            const detail = event?.detail || {};
            if (detail.projectId && detail.projectId !== (projectId || project?.id)) return;
            if (detail.chapterId && activeChapterId && detail.chapterId !== activeChapterId) return;

            const task = detail.task || '';
            const context = detail.context || {};
            const messages = detail.messages || [];
            const options = {
                model: detail.model || selectedModel,
                mode: detail.mode || selectedMode,
                selectedText: detail.selectedText,
                targetKey: detail.targetKey,
                source: detail.source,
                intent: detail.intent
            };
            startAgentRun(task, context, messages, options, true);
        };

        const handleExternalAbort = () => {
            if (agent.isRunning) {
                agent.abort();
            }
        };

        window.addEventListener('onthesis-agent-run-request', handleExternalRun);
        window.addEventListener('onthesis-agent-abort-request', handleExternalAbort);
        return () => {
            window.removeEventListener('onthesis-agent-run-request', handleExternalRun);
            window.removeEventListener('onthesis-agent-abort-request', handleExternalAbort);
        };
    }, [project?.id, projectId, activeChapterId, selectedModel, selectedMode, startAgentRun, agent]);

    useEffect(() => {
        if (agent.agentState === AGENT_STATES.DONE && agent.generatedText) {
            setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: agent.generatedText,
                toolCalls: agent.toolCalls,
                pendingDiffs: agent.pendingDiffs,
                steps: agent.steps,
                diffOutcomes: agent.resolvedDiffs,
                timestamp: Date.now(),
            }]);
        }
    }, [agent.agentState, agent.generatedText, agent.toolCalls, agent.pendingDiffs, agent.steps, agent.resolvedDiffs]);

    const handleSend = useCallback(async (e) => {
        e?.preventDefault();
        const trimmed = input.trim();
        if (!trimmed || agent.isRunning) return;
        if (!isPro && chatMessages.length > 30) {
            setChatMessages(prev => [...prev, { role: 'warning', content: 'Kuota chat gratis habis. Upgrade ke Pro untuk unlimited agent chat.' }]);
            setShowUpgradeModal?.(true);
            return;
        }
        let context = {};
        try {
            context = buildFullContext({ project, chapters, activeChapterId, chapterHtml: editorRef?.current?.getHtml?.(), references: references || project?.references || [], selectionHtml: editorRef?.current?.getSelectionHtml?.() || '', activeNodeContext: editorRef?.current?.getActiveNodeContext?.(), goldenThread, chapterSummaries: chapterSummaries || {}, editorRef, forceRefresh: true });
            if (references?.length > 0) context.references_raw = references;
        } catch {
            context = { context_title: project?.title || '', context_problem: project?.problem_statement || '', context_method: project?.methodology || '', active_paragraphs: editorRef?.current?.getParagraphsWithIds?.() || [], chapter_html: editorRef?.current?.getHtml?.() || '', active_chapter_id: activeChapterId, projectId: projectId || project?.id };
        }
        const history = chatMessages.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({ role: m.role, content: m.content || '' }));
        setInput('');
        startAgentRun(trimmed, context, history, { model: selectedModel, mode: selectedMode }, true);
    }, [input, agent, project, activeChapterId, editorRef, isPro, chatMessages, selectedModel, selectedMode, startAgentRun, projectId, references, goldenThread, chapterSummaries]);

    const handleChipClick = useCallback((prompt) => {
        if (showHistory) setShowHistory(false);
        setInput(prompt);
        setTimeout(() => inputRef.current?.focus(), 50);
    }, [showHistory]);

    const handleNewChat = useCallback(() => {
        if (agent.isRunning) return;
        if (chatMessages.length === 0) { setShowHistory(false); return; }
        if (project?.id) clearAllAgentSessions(project.id).catch(console.error);
        setSessions([]);
        setActiveSessionId(sessionIdForProject);
        setChatMessages([]);
        agent.reset();
        setShowHistory(false);
    }, [agent, chatMessages.length, project?.id, sessionIdForProject]);

    const switchSession = useCallback(async (id) => {
        if (agent.isRunning) return;
        const target = sessions.find(s => s.id === id);
        if (target) {
            setActiveSessionId(id);
            setChatMessages(target.messages || []);
            agent.reset();
            setShowHistory(false);
            const fullSession = await loadAgentSession(project?.id, id);
            if (fullSession && fullSession.id === id) setChatMessages(fullSession.messages || []);
        }
    }, [sessions, agent, project?.id]);

    const deleteSession = useCallback(async (id) => {
        setSessions(prev => {
            const next = prev.filter(s => s.id !== id);
            if (id === activeSessionId) {
                if (next.length > 0) { setActiveSessionId(next[0].id); setChatMessages(next[0].messages); }
                else { setActiveSessionId(sessionIdForProject); setChatMessages([]); }
                agent.reset();
            }
            return next;
        });
        if (project?.id) await deleteAgentSession(project.id, id);
    }, [activeSessionId, project?.id, agent, sessionIdForProject]);

    const currentModelLabel = AGENT_MODELS.find(m => m.id === selectedModel)?.shortLabel || 'Llama 70B';

    return (
        <div className="ap-root" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: t.bg, transition: 'background 0.25s' }}>

            {/* ── HEADER ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 9px', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: agent.isRunning ? t.accent : t.textDim, boxShadow: agent.isRunning && isDark ? `0 0 8px ${t.accent}88` : 'none', transition: 'all 0.3s' }} className={agent.isRunning ? 'ap-pulse' : ''} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: t.text, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Agent</span>
                    {/* Model indicator */}
                    <span style={{ fontSize: 9, color: t.textDim, fontFamily: t.mono, letterSpacing: '0.03em' }}>· {currentModelLabel}</span>
                    {agent.isRunning && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 2 }}>
                            <span style={{ fontFamily: t.mono, fontSize: 9, color: t.accent, letterSpacing: '0.04em' }}>{agent.agentState}</span>
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button onClick={handleNewChat} title="Chat baru" style={{ padding: 5, borderRadius: 5, border: 'none', background: 'transparent', cursor: 'pointer', color: t.textDim, transition: 'color 0.15s, background 0.15s', display: 'flex', alignItems: 'center' }} onMouseEnter={e => { e.currentTarget.style.color = t.accent; e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} onMouseLeave={e => { e.currentTarget.style.color = t.textDim; e.currentTarget.style.background = 'transparent' }}>
                        <MessageSquarePlus size={13} />
                    </button>
                    <button onClick={() => setShowHistory(h => !h)} title="Riwayat chat" style={{ padding: 5, borderRadius: 5, border: 'none', background: showHistory ? t.surface2 : 'transparent', cursor: 'pointer', color: showHistory ? t.text : t.textDim, transition: 'color 0.15s, background 0.15s', display: 'flex', alignItems: 'center' }} onMouseEnter={e => { if (!showHistory) { e.currentTarget.style.color = t.text; e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' } }} onMouseLeave={e => { if (!showHistory) { e.currentTarget.style.color = t.textDim; e.currentTarget.style.background = 'transparent' } }}>
                        <History size={13} />
                    </button>
                </div>
            </div>

            {/* ── ACCEPT ALL BANNER ── */}
            {agent.pendingDiffs.length > 0 && (
                <AcceptAllBanner count={agent.pendingDiffs.length} onAcceptAll={agent.acceptAll} onRejectAll={agent.rejectAll} />
            )}

            {/* ── BUG FIX: ThinkingSteps ONLY when agent is running or just done ── */}
            {currentPhase && (
                <div style={{ padding: '6px 14px 0', flexShrink: 0 }}>
                    <ThinkingSteps phase={currentPhase} theme={theme} />
                </div>
            )}

            {/* ── MESSAGES ── */}
            <div className={`ap-scroll ${isDark ? '' : 'ap-scroll-light'}`} style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {showHistory ? (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: t.text, letterSpacing: '0.02em' }}>Riwayat Chat</span>
                            {sessions.length > 0 && (
                                <button onClick={async () => { if (window.confirm('Hapus semua riwayat chat?')) { setSessions([]); setChatMessages([]); setActiveSessionId(sessionIdForProject); agent.reset(); if (project?.id) await clearAllAgentSessions(project.id); } }} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: 'transparent', fontSize: 10, fontWeight: 500, color: t.textDim, cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.color = t.red} onMouseLeave={e => e.currentTarget.style.color = t.textDim}>
                                    Hapus Semua
                                </button>
                            )}
                        </div>
                        {sessions.length === 0
                            ? <div style={{ textAlign: 'center', padding: '40px 20px', color: t.textDim, fontSize: 11.5 }}>Belum ada riwayat chat.</div>
                            : sessions.map(session => <ChatHistoryItem key={session.id} title={session.title} time={formatTimeAgo(session.updatedAt)} active={session.id === activeSessionId} onClick={() => switchSession(session.id)} onDelete={() => deleteSession(session.id)} theme={theme} />)
                        }
                    </div>
                ) : (
                    <>
                        {/* ─── IMPROVED Empty state ─── */}
                        {chatMessages.length === 0 && !agent.isRunning && (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 20px', gap: 20 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.surface2 }}>
                                    <Sparkles size={17} style={{ color: t.accent }} />
                                </div>
                                <div>
                                    <p style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 6 }}>Thesis Agent</p>
                                    <p style={{ fontSize: 11, color: t.textMid, lineHeight: 1.65, maxWidth: 220 }}>
                                        Agent bisa membaca bab, mencari referensi, dan mengedit tesis kamu secara langsung.
                                    </p>
                                </div>
                                {/* Example prompts */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', maxWidth: 280 }}>
                                    {EXAMPLE_PROMPTS.map((ep, i) => (
                                        <button key={i} onClick={() => handleChipClick(ep.text)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: `1px solid ${t.border}`, background: t.surface2, color: t.textMid, cursor: 'pointer', textAlign: 'left', fontSize: 11, transition: 'border-color 0.15s, color 0.15s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent + '55'; e.currentTarget.style.color = t.text; }} onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textMid; }}>
                                            <span style={{ fontSize: 14, flexShrink: 0 }}>{ep.icon}</span>
                                            <span style={{ lineHeight: 1.4 }}>{ep.text}</span>
                                        </button>
                                    ))}
                                </div>
                                {/* Quick chips */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center' }}>
                                    {QUICK_CHIPS.map((chip, i) => (
                                        <button key={i} onClick={() => handleChipClick(chip.prompt)} className="ap-chip" style={{ position: 'relative', padding: '4px 10px', borderRadius: 5, fontSize: 10, fontWeight: 500, border: `1px solid ${t.border}`, background: 'transparent', color: t.textDim, cursor: 'pointer', transition: 'color 0.15s, border-color 0.15s' }} onMouseEnter={e => { e.currentTarget.style.color = t.text; e.currentTarget.style.borderColor = t.accent + '66'; }} onMouseLeave={e => { e.currentTarget.style.color = t.textDim; e.currentTarget.style.borderColor = t.border; }}>
                                            {chip.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Message list */}
                        {chatMessages.map((msg, idx) => {
                            if (msg.role === 'warning') return (
                                <div key={idx} className="ap-slide-up" style={{ display: 'flex', gap: 8, padding: '10px 12px', borderRadius: 8, border: `1px solid rgba(245,158,11,0.2)`, background: isDark ? 'rgba(245,158,11,0.05)' : 'rgba(245,158,11,0.06)' }}>
                                    <AlertTriangle size={12} style={{ color: '#F59E0B', flexShrink: 0, marginTop: 1 }} />
                                    <div>
                                        <p style={{ fontSize: 11, color: t.textMid, marginBottom: 7, lineHeight: 1.5 }}>{msg.content}</p>
                                        <button onClick={() => setShowUpgradeModal?.(true)} style={{ padding: '4px 10px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: t.accent, color: isDark ? '#000' : '#fff', border: 'none', cursor: 'pointer' }}>Upgrade</button>
                                    </div>
                                </div>
                            );
                            if (msg.role === 'user') return (
                                <div key={idx} className="ap-slide-up" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <div style={{ maxWidth: '82%', padding: '8px 11px', borderRadius: '10px 10px 3px 10px', background: t.userBubble, border: `1px solid ${t.border}`, fontSize: 11.5, lineHeight: 1.6, color: t.text }}>{msg.content}</div>
                                </div>
                            );
                            if (msg.role === 'assistant') return (
                                <div key={idx} className="ap-slide-up" style={{ display: 'flex', gap: 9 }}>
                                    <div style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.accentBg }}>
                                        <Sparkles size={9} style={{ color: t.accent }} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {msg.content && <div style={{ fontSize: 11.5, lineHeight: 1.65, color: t.text }}>{renderMarkdown(msg.content, t)}</div>}
                                        {msg.toolCalls?.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{msg.toolCalls.map((tc, i) => <ToolCallCard key={i} toolCall={tc} theme={theme} />)}</div>}
                                        {msg.pendingDiffs?.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{msg.pendingDiffs.map((diff, i) => <DiffActionCard key={i} diff={diff} onAccept={agent.acceptDiff} onReject={agent.rejectDiff} theme={theme} status={agent.getDiffStatus(diff.diffId)} />)}</div>}
                                    </div>
                                </div>
                            );
                            return null;
                        })}

                        {/* Live streaming */}
                        {agent.isRunning && (
                            <div style={{ display: 'flex', gap: 9 }}>
                                <div style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.accentBg }}>
                                    <Sparkles size={9} style={{ color: t.accent }} className="ap-shimmer" />
                                </div>
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {agent.currentStep && (
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 4, background: t.accentBg, border: `1px solid ${t.accent}33`, alignSelf: 'flex-start' }}>
                                            <ThinkingDots color={t.accent} size={3} />
                                            <span style={{ fontFamily: t.mono, fontSize: 9, color: t.accent, fontWeight: 500 }}>{friendlyStepMessage(agent.currentStep)}</span>
                                        </div>
                                    )}
                                    {agent.toolCalls.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{agent.toolCalls.map((tc, i) => <ToolCallCard key={i} toolCall={tc} theme={theme} />)}</div>}
                                    {agent.pendingDiffs.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{agent.pendingDiffs.map((diff, i) => <DiffActionCard key={i} diff={diff} onAccept={agent.acceptDiff} onReject={agent.rejectDiff} theme={theme} status="pending" />)}</div>}
                                    {agent.generatedText && (
                                        <div style={{ fontSize: 11.5, lineHeight: 1.65, color: t.text }}>
                                            {renderMarkdown(agent.generatedText, t)}
                                            <span className="ap-caret" style={{ color: t.accent, marginLeft: 1 }}>▍</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {agent.error && (
                            <div style={{ display: 'flex', gap: 7, padding: '8px 11px', borderRadius: 7, fontSize: 11, border: `1px solid rgba(248,113,113,0.2)`, background: isDark ? 'rgba(248,113,113,0.06)' : 'rgba(220,38,38,0.05)', color: t.red }}>
                                <AlertTriangle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                                {agent.error}
                            </div>
                        )}

                        {!agent.isRunning && agent.pendingDiffs.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <span style={{ fontSize: 10, color: t.accent, fontWeight: 600, letterSpacing: '0.04em' }}>{agent.pendingDiffs.length} perubahan menunggu</span>
                                {agent.pendingDiffs.map((diff, i) => <DiffActionCard key={diff.diffId || i} diff={diff} onAccept={agent.acceptDiff} onReject={agent.rejectDiff} theme={theme} status="pending" />)}
                            </div>
                        )}
                    </>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* ── INPUT AREA ── */}
            <div style={{ padding: '10px 12px 12px', flexShrink: 0, borderTop: `1px solid ${t.border}` }}>
                {!agent.isRunning && chatMessages.length > 0 && (
                    <div className={`ap-scroll ${isDark ? '' : 'ap-scroll-light'}`} style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 8 }}>
                        {QUICK_CHIPS.slice(0, 3).map((chip, i) => (
                            <button key={i} onClick={() => handleChipClick(chip.prompt)} style={{ padding: '3px 9px', borderRadius: 4, fontSize: 9.5, fontWeight: 500, border: `1px solid ${t.border}`, background: t.surface2, color: t.textMid, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'color 0.15s, border-color 0.15s' }} onMouseEnter={e => { e.currentTarget.style.color = t.text; e.currentTarget.style.borderColor = t.accent + '55'; }} onMouseLeave={e => { e.currentTarget.style.color = t.textMid; e.currentTarget.style.borderColor = t.border; }}>
                                {chip.label}
                            </button>
                        ))}
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '9px 11px', borderRadius: 9, border: `1px solid ${t.border}`, background: t.surface2, transition: 'border-color 0.2s, box-shadow 0.2s' }} onFocusCapture={e => { e.currentTarget.style.borderColor = t.borderFocus; e.currentTarget.style.boxShadow = t.accentGlow; }} onBlurCapture={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.boxShadow = 'none'; }}>
                    <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }} placeholder="Instruksikan agent..." rows={1} disabled={agent.isRunning} className="ap-textarea" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontSize: 11.5, lineHeight: 1.55, color: t.text, minHeight: 22, maxHeight: 88, fontFamily: 'inherit', overflowY: 'auto' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        {agent.isRunning && (
                            <button onClick={agent.abort} style={{ padding: 4, borderRadius: 5, border: 'none', background: 'transparent', cursor: 'pointer', color: t.red, display: 'flex', alignItems: 'center', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <StopCircle size={13} />
                            </button>
                        )}
                        <button onClick={handleSend} disabled={!input.trim() || agent.isRunning} style={{ padding: '4px 5px', borderRadius: 5, border: 'none', background: input.trim() && !agent.isRunning ? t.accentBg : 'transparent', color: input.trim() && !agent.isRunning ? t.accent : t.textDim, cursor: input.trim() && !agent.isRunning ? 'pointer' : 'default', display: 'flex', alignItems: 'center', transition: 'background 0.15s, color 0.15s', boxShadow: input.trim() && !agent.isRunning ? t.accentGlow : 'none' }}>
                            <Send size={13} strokeWidth={2} />
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, padding: '0 2px' }}>
                    <button onClick={() => setSelectedMode(m => m === 'planning' ? 'fast' : 'planning')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 9.5, fontWeight: 500, color: selectedMode === 'fast' ? t.accent : t.textDim, transition: 'color 0.15s', letterSpacing: '0.03em' }} onMouseEnter={e => e.currentTarget.style.color = t.text} onMouseLeave={e => e.currentTarget.style.color = selectedMode === 'fast' ? t.accent : t.textDim}>
                        <Zap size={9} />
                        {selectedMode === 'planning' ? 'Planning' : 'Fast'}
                    </button>

                    <div style={{ position: 'relative' }}>
                        <button onClick={() => setShowModelDropdown(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 9.5, fontWeight: 500, color: t.textDim, transition: 'color 0.15s', letterSpacing: '0.02em' }} onMouseEnter={e => e.currentTarget.style.color = t.text} onMouseLeave={e => e.currentTarget.style.color = t.textDim}>
                            <ChevronUp size={9} />
                            {currentModelLabel}
                            {isPro && <span style={{ width: 5, height: 5, borderRadius: '50%', background: t.accent, boxShadow: isDark ? `0 0 5px ${t.accent}` : 'none', marginLeft: 1 }} />}
                        </button>
                        {showModelDropdown && (
                            <>
                                <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowModelDropdown(false)} />
                                <div className="ap-fade" style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: 6, zIndex: 100, minWidth: 164, borderRadius: 8, padding: '4px', border: `1px solid ${t.border}`, background: isDark ? '#161616' : '#FFFFFF', boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)' : '0 8px 24px rgba(0,0,0,0.12)' }}>
                                    {AGENT_MODELS.map(model => {
                                        const locked = model.proOnly && !isPro;
                                        const active = selectedModel === model.id;
                                        return (
                                            <button key={model.id} onClick={() => { if (locked) { setShowUpgradeModal?.(true); setShowModelDropdown(false); return; } setSelectedModel(model.id); setShowModelDropdown(false); }} style={{ width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: 5, border: 'none', cursor: locked ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: active ? 600 : 400, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: active ? t.accentBg : 'transparent', color: active ? t.accent : locked ? t.textDim : t.textMid, transition: 'background 0.12s, color 0.12s' }} onMouseEnter={e => { if (!locked && !active) { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = t.text; } }} onMouseLeave={e => { if (!locked && !active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.textMid; } }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{model.label}{locked && <Lock size={8} style={{ color: t.textDim }} />}</span>
                                                {active && <Check size={10} style={{ color: t.accent }} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
