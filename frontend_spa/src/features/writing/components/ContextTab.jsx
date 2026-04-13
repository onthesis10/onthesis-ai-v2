// ─── ContextTab — Paragraph Context + Diagnostics + Quick Fixes ───
// Live context panel with working quick-fix buttons that call AI.

import React, { useCallback } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { AlertTriangle, CheckCircle, FileText, Hash, Type, Zap, Copy, Sparkles } from 'lucide-react';

const SEVERITY_STYLES = {
    error: { icon: '🔴', border: 'border-red-500/20', bg: 'bg-red-500/5', text: 'text-red-400' },
    warning: { icon: '🟡', border: 'border-amber-500/20', bg: 'bg-amber-500/5', text: 'text-amber-400' },
    info: { icon: '🔵', border: 'border-blue-500/20', bg: 'bg-blue-500/5', text: 'text-blue-400' },
};

export default function ContextTab() {
    const activeParagraphText = useEditorStore((s) => s.activeParagraphText);
    const activeHeadingContext = useEditorStore((s) => s.activeHeadingContext);
    const wordCount = useEditorStore((s) => s.wordCount);
    const diagnostics = useEditorStore((s) => s.diagnostics);

    // Build heading breadcrumb
    const headingPath = activeHeadingContext?.length > 0
        ? activeHeadingContext.map((h) => h.text).join(' › ')
        : 'Dokumen';

    // Count diagnostics by severity
    const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
    const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;
    const infoCount = diagnostics.filter((d) => d.severity === 'info').length;

    // ── Quick Fix Handlers ──
    const handleQuickFix = useCallback(async (diag) => {
        const actionMap = {
            'Formalkan dengan AI': { mode: 'formalize', text: diag.excerpt },
            'Pecah kalimat dengan AI': { mode: 'shorten', text: diag.excerpt },
            'Sisipkan sitasi': null, // Citation modal — deferred
            'Parafrase dengan AI': { mode: 'paraphrase', text: diag.excerpt },
        };

        const action = actionMap[diag.quickFixLabel];
        if (!action) {
            // For citation: copy excerpt to clipboard for now
            if (diag.quickFixLabel === 'Sisipkan sitasi') {
                try {
                    await navigator.clipboard.writeText(diag.excerpt);
                    alert('Teks disalin ke clipboard. Gunakan fitur sitasi untuk menambahkan referensi.');
                } catch { /* ignore */ }
            }
            return;
        }

        try {
            const projectId =
                new URLSearchParams(window.location.search).get('id')
                || localStorage.getItem('last_active_project_id')
                || 'writing-workspace';
            const promptMap = {
                formalize: `Ubah teks berikut menjadi bahasa akademik formal. Jangan tambahkan penjelasan. Kembalikan hanya hasil revisinya:\n${action.text}`,
                shorten: `Pecah teks berikut menjadi 2-3 kalimat yang lebih ringkas dan jelas tanpa mengubah makna. Kembalikan hanya hasil revisinya:\n${action.text}`,
                paraphrase: `Parafrase teks berikut tanpa mengubah makna akademiknya. Kembalikan hanya hasil revisinya:\n${action.text}`,
            };

            const res = await fetch('/api/agent/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    task: promptMap[action.mode] || promptMap.paraphrase,
                    projectId,
                    chapterId: '',
                    context: {
                        requestedTask: action.mode,
                        active_paragraphs: [],
                        selection_html: action.text,
                        quick_fix_excerpt: action.text,
                        response_mode: 'text_only',
                    },
                }),
            });

            if (!res.ok) throw new Error('AI request failed');
            if (!res.body) throw new Error('No response body');

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let result = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                const events = buffer.split('\n\n');
                buffer = events.pop() || '';

                for (const rawEvent of events) {
                    const trimmed = rawEvent.trim();
                    if (!trimmed.startsWith('data:')) continue;
                    const payload = trimmed.replace(/^data:\s*/, '');
                    if (!payload || payload === '[DONE]') continue;

                    const event = JSON.parse(payload);
                    if (event.type === 'TEXT_DELTA') {
                        result += event.delta || '';
                    }
                    if (event.type === 'PENDING_DIFF' && !result.trim()) {
                        result = event.diff?.new_text || event.diff?.after || '';
                    }
                    if (event.type === 'ERROR') {
                        throw new Error(event.message || 'AI request failed');
                    }
                }
            }

            if (result) {
                // Copy fixed text to clipboard and notify user
                await navigator.clipboard.writeText(result);
                alert(`✅ Hasil AI telah disalin ke clipboard:\n\n"${result.slice(0, 150)}..."\n\nPaste di editor untuk mengganti teks yang bermasalah.`);
            }
        } catch (err) {
            console.error('[QuickFix] Error:', err);
            alert('Gagal menjalankan quick fix. Coba lagi.');
        }
    }, []);

    return (
        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
            {/* ── Header ── */}
            <div className="px-4 pt-4 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                    <Sparkles size={12} className="text-blue-400" />
                    Konteks Paragraf Aktif
                </h3>
            </div>

            {/* ── Heading Path ── */}
            <div className="px-4 pb-3">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Hash size={12} className="shrink-0" />
                    <span className="truncate">{headingPath}</span>
                </div>
            </div>

            {/* ── Active Paragraph Preview ── */}
            <div className="px-4 pb-3">
                <div className="p-3 rounded-lg bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-2">
                        <Type size={12} className="text-slate-400" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Paragraf Aktif
                        </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-4">
                        {activeParagraphText || <span className="italic text-slate-400">Klik pada paragraf di editor...</span>}
                    </p>
                    {activeParagraphText && (
                        <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                            <span>{activeParagraphText.trim().split(/\s+/).length} kata</span>
                            <span>•</span>
                            <span>{activeParagraphText.split(/[.!?]+/).filter(s => s.trim()).length} kalimat</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Stats ── */}
            <div className="px-4 pb-3 grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-500/5 text-center border border-blue-200/30 dark:border-blue-500/10">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{wordCount}</div>
                    <div className="text-[10px] text-blue-400 dark:text-blue-500 uppercase tracking-wide">Kata</div>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-500/5 text-center border border-amber-200/30 dark:border-amber-500/10">
                    <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{warningCount}</div>
                    <div className="text-[10px] text-amber-400 dark:text-amber-500 uppercase tracking-wide">Warning</div>
                </div>
                <div className="p-2.5 rounded-lg bg-red-50/50 dark:bg-red-500/5 text-center border border-red-200/30 dark:border-red-500/10">
                    <div className="text-lg font-bold text-red-600 dark:text-red-400">{errorCount}</div>
                    <div className="text-[10px] text-red-400 dark:text-red-500 uppercase tracking-wide">Error</div>
                </div>
            </div>

            {/* ── Diagnostics List ── */}
            {diagnostics.length > 0 && (
                <div className="px-4 pb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <FileText size={12} className="text-slate-400" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Issues ({diagnostics.length})
                        </span>
                    </div>
                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {diagnostics.slice(0, 30).map((diag, idx) => {
                            const s = SEVERITY_STYLES[diag.severity] || SEVERITY_STYLES.info;
                            return (
                                <div
                                    key={idx}
                                    className={`p-2.5 rounded-lg border text-xs ${s.bg} ${s.border}`}
                                >
                                    <div className="flex items-start gap-2">
                                        <span className="text-[10px] mt-0.5">{s.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-slate-700 dark:text-slate-300 mb-0.5">
                                                {diag.message}
                                            </div>
                                            <div className="text-slate-400 dark:text-slate-500 truncate text-[11px] italic">
                                                "{diag.excerpt}"
                                            </div>
                                        </div>
                                    </div>
                                    {diag.quickFixLabel && (
                                        <button
                                            onClick={() => handleQuickFix(diag)}
                                            className={`mt-2 ml-5 flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md
                                                transition-all duration-200 
                                                bg-white/60 dark:bg-white/[0.06] border border-slate-200/50 dark:border-white/10
                                                hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:border-blue-300/50 dark:hover:border-blue-500/20
                                                text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300`}
                                        >
                                            <Zap size={10} />
                                            {diag.quickFixLabel}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {diagnostics.length === 0 && (
                <div className="px-4 py-8 text-center">
                    <CheckCircle size={24} className="mx-auto text-green-400/80 mb-3" />
                    <p className="text-xs text-slate-400 font-medium">Tidak ada issues terdeteksi</p>
                    <p className="text-[10px] text-slate-400/60 mt-1">Diagnostik otomatis scan setiap 5 detik</p>
                </div>
            )}

            {/* ── Keyboard Hints ── */}
            <div className="mt-auto px-4 py-3 border-t border-slate-200/30 dark:border-white/5">
                <div className="text-[10px] text-slate-400/70 space-y-0.5">
                    <div>👻 Ghost Text: <kbd className="px-1 py-0.5 rounded bg-slate-200/50 dark:bg-white/10 text-[9px]">Tab</kbd> accept · <kbd className="px-1 py-0.5 rounded bg-slate-200/50 dark:bg-white/10 text-[9px]">Ctrl+→</kbd> word · <kbd className="px-1 py-0.5 rounded bg-slate-200/50 dark:bg-white/10 text-[9px]">Esc</kbd> dismiss</div>
                    <div>⚡ Agent: <kbd className="px-1 py-0.5 rounded bg-slate-200/50 dark:bg-white/10 text-[9px]">Ctrl+K</kbd> → "Agent"</div>
                </div>
            </div>
        </div>
    );
}
