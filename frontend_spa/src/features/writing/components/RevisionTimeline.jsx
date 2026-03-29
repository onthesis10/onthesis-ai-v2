// ─── RevisionTimeline — Phase 4: AI Revision History ───
// Shows timeline of chapter revisions with AI narratives and diff preview.

import React, { useState, useEffect, useCallback } from 'react';
import { History, Clock, FileText, RotateCcw, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useProject } from '../context/ProjectContext.jsx';
import { useThemeStore } from '@/store/themeStore';
import RevisionDiffModal from './RevisionDiffModal.jsx';

export default function RevisionTimeline() {
    const { activeChapterId, chapters } = useProject();
    const { theme } = useThemeStore();
    const [revisions, setRevisions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(null); // expanded revision id
    const [diffModal, setDiffModal] = useState(null); // { revisionId, html }

    const isDark = theme === 'dark';

    const fetchRevisions = useCallback(async () => {
        if (!activeChapterId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/revisions/${activeChapterId}`, { credentials: 'include' });
            const data = await res.json();
            setRevisions(data.revisions || []);
        } catch (err) {
            console.error('[RevisionTimeline] Fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [activeChapterId]);

    useEffect(() => { fetchRevisions(); }, [fetchRevisions]);

    const handleViewDiff = async (revisionId) => {
        try {
            const res = await fetch(`/api/revisions/${activeChapterId}/${revisionId}`, { credentials: 'include' });
            const data = await res.json();
            setDiffModal({ revisionId, html: data.html, wordCount: data.wordCount });
        } catch (err) {
            console.error('[RevisionTimeline] Diff fetch error:', err);
        }
    };

    const formatTime = (isoString) => {
        if (!isoString) return '—';
        const d = new Date(isoString);
        const now = new Date();
        const diff = Math.floor((now - d) / 60000);
        if (diff < 1) return 'Baru saja';
        if (diff < 60) return `${diff} menit lalu`;
        if (diff < 1440) return `${Math.floor(diff / 60)} jam lalu`;
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-white/5' : 'border-gray-200/60'}`}>
                <div className="flex items-center gap-2">
                    <History size={15} className="text-sky-500" />
                    <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        Revision History
                    </span>
                </div>
                <button
                    onClick={fetchRevisions}
                    className={`p-1 rounded-md transition-colors ${isDark ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}
                    title="Refresh"
                >
                    <RotateCcw size={13} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2">
                {loading ? (
                    <div className="flex items-center justify-center py-12 opacity-40">
                        <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                ) : revisions.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center py-12 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                        <History size={28} className="mb-2 opacity-30" />
                        <p className="text-xs">Belum ada revisi tersimpan.</p>
                        <p className="text-[10px] opacity-60 mt-1">Revisi dibuat otomatis saat menyimpan.</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {revisions.map((rev, i) => (
                            <div
                                key={rev.id}
                                className={`rounded-lg transition-all duration-200 border ${expanded === rev.id
                                        ? isDark ? 'bg-sky-500/5 border-sky-500/20' : 'bg-sky-50 border-sky-200/50'
                                        : isDark ? 'bg-white/[0.02] border-white/5 hover:bg-white/5' : 'bg-white border-gray-100 hover:bg-gray-50'
                                    }`}
                            >
                                {/* Row */}
                                <button
                                    onClick={() => setExpanded(expanded === rev.id ? null : rev.id)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                                >
                                    {/* Timeline dot */}
                                    <div className="flex flex-col items-center shrink-0">
                                        <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-sky-500' : isDark ? 'bg-slate-600' : 'bg-gray-300'}`} />
                                        {i < revisions.length - 1 && (
                                            <div className={`w-[1px] h-4 mt-1 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <Clock size={11} className={isDark ? 'text-slate-500' : 'text-gray-400'} />
                                            <span className={`text-[11px] font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                                {formatTime(rev.timestamp)}
                                            </span>
                                            <span className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                                                {rev.wordCount || 0} kata
                                            </span>
                                        </div>
                                        {rev.narrative && (
                                            <p className={`text-[11px] mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                                {rev.narrative}
                                            </p>
                                        )}
                                    </div>

                                    {/* Expand */}
                                    {expanded === rev.id ? <ChevronUp size={14} className="opacity-30" /> : <ChevronDown size={14} className="opacity-30" />}
                                </button>

                                {/* Expanded actions */}
                                {expanded === rev.id && (
                                    <div className={`px-3 pb-2.5 pt-0 flex items-center gap-2 border-t ml-8 ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                                        <button
                                            onClick={() => handleViewDiff(rev.id)}
                                            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors bg-sky-500/10 text-sky-500 hover:bg-sky-500/20"
                                        >
                                            <FileText size={11} /> Lihat Diff
                                        </button>
                                        {rev.narrative && (
                                            <p className={`text-[10px] flex-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                                                {rev.narrative}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Diff Modal */}
            {diffModal && (
                <RevisionDiffModal
                    revisionHtml={diffModal.html}
                    revisionWordCount={diffModal.wordCount}
                    onClose={() => setDiffModal(null)}
                />
            )}
        </div>
    );
}
