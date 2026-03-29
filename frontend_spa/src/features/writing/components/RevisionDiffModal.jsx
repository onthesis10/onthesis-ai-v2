// ─── RevisionDiffModal — Phase 4: Revision Diff Viewer ───
// Modal overlay showing diff between current content and a specific revision.

import React, { useMemo } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';

export default function RevisionDiffModal({ revisionHtml, revisionWordCount, onClose, onRestore }) {
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';

    // Simple HTML-to-text for display
    const plainText = useMemo(() => {
        if (!revisionHtml) return '';
        const div = document.createElement('div');
        div.innerHTML = revisionHtml;
        return div.textContent || div.innerText || '';
    }, [revisionHtml]);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className={`relative w-[90%] max-w-3xl max-h-[80vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${isDark ? 'bg-[#0F172A] border-white/10' : 'bg-white border-gray-200'
                }`}>
                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                    <div>
                        <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            Revision Snapshot
                        </h3>
                        <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                            {revisionWordCount || 0} kata
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {onRestore && (
                            <button
                                onClick={() => { onRestore(revisionHtml); onClose(); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors"
                            >
                                <RotateCcw size={12} /> Restore
                            </button>
                        )}
                        <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}>
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className={`flex-1 overflow-y-auto p-6 custom-scrollbar ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <div
                        className="prose prose-sm dark:prose-invert max-w-none"
                        style={{ fontFamily: 'Times New Roman', fontSize: '12pt', lineHeight: '2.0' }}
                        dangerouslySetInnerHTML={{ __html: revisionHtml }}
                    />
                </div>
            </div>
        </div>
    );
}
