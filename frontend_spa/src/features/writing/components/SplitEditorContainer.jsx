// ─── SplitEditorContainer — Phase 4: Multi-Chapter Side-by-Side ───
// Opens a secondary chapter editor next to the main editor.

import React, { useState, Suspense, useCallback } from 'react';
import { X, ChevronDown, Loader2 } from 'lucide-react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { useProject } from '../context/ProjectContext.jsx';
import { useThemeStore } from '@/store/themeStore';
import { api } from '../api/client.js';

const LexicalEditor = React.lazy(() => import('./Editor/LexicalEditor.jsx'));

export default function SplitEditorContainer({ onClose }) {
    const { chapters, activeChapterId, projectId } = useProject();
    const { theme } = useThemeStore();
    const [splitChapterId, setSplitChapterId] = useState('');
    const [splitContent, setSplitContent] = useState('');
    const [showChapterPicker, setShowChapterPicker] = useState(true);

    const isDark = theme === 'dark';

    // Get chapters that aren't the active one
    const otherChapters = (chapters || []).filter(ch => ch.id !== activeChapterId);

    const handleSelectChapter = async (chId) => {
        setSplitChapterId(chId);
        setShowChapterPicker(false);
        // Fetch chapter content
        try {
            const res = await fetch(`/api/project/${projectId}/chapter/${chId}`, { credentials: 'include' });
            const data = await res.json();
            setSplitContent(data.content || data.html || '');
        } catch (err) {
            console.error('[SplitEditor] Fetch error:', err);
            setSplitContent('<p>Gagal memuat konten bab.</p>');
        }
    };

    const handleSaveSplitContent = useCallback(async (htmlString) => {
        if (!projectId || !splitChapterId) return;
        try {
            const currentChapter = otherChapters.find(c => c.id === splitChapterId);
            await api.post(`/api/project/${projectId}/chapter/save`, {
                chapterId: splitChapterId,
                content: htmlString,
                title: currentChapter?.title || 'Bab Tanpa Judul',
                index: currentChapter?.index || 0,
                saveMode: 'autosave',
            }, {
                silent: true,
                headers: { 'X-Save-Mode': 'autosave' },
            });
        } catch (err) {
            console.error("[SplitEditor] Save failed:", err);
        }
    }, [projectId, splitChapterId, otherChapters]);

    const selectedChapter = chapters?.find(ch => ch.id === splitChapterId);

    return (
        <div className={`flex flex-col h-full border-l ${isDark ? 'border-white/5 bg-[#0F172A]' : 'border-gray-200 bg-white'}`}>
            {/* Header */}
            <div className={`h-[36px] flex items-center justify-between px-3 shrink-0 border-b ${isDark ? 'border-white/5 bg-[#0B1120]/80' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                    {/* Chapter selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowChapterPicker(!showChapterPicker)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${isDark ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {selectedChapter?.title || 'Pilih Bab'}
                            <ChevronDown size={12} />
                        </button>

                        {showChapterPicker && (
                            <div className={`absolute top-8 left-0 z-50 w-52 rounded-lg border shadow-xl py-1 ${isDark ? 'bg-[#0F172A] border-white/10' : 'bg-white border-gray-200'
                                }`}>
                                {otherChapters.length === 0 ? (
                                    <p className={`px-3 py-2 text-[11px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                                        Tidak ada bab lain.
                                    </p>
                                ) : otherChapters.map(ch => (
                                    <button
                                        key={ch.id}
                                        onClick={() => handleSelectChapter(ch.id)}
                                        className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors ${isDark ? 'text-slate-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                    >
                                        {ch.title}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-white/5 text-slate-500' : 'hover:bg-gray-100 text-gray-400'}`}
                    title="Tutup Split Editor"
                >
                    <X size={14} />
                </button>
            </div>

            {/* Editor content */}
            <div className="flex-1 overflow-hidden">
                {!splitChapterId ? (
                    <div className={`flex flex-col items-center justify-center h-full ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                        <p className="text-xs">Pilih bab untuk ditampilkan.</p>
                    </div>
                ) : (
                    <Suspense fallback={
                        <div className="flex flex-col items-center justify-center h-full opacity-40">
                            <Loader2 className="w-5 h-5 animate-spin mb-2" />
                            <p className="text-[11px]">Loading Editor...</p>
                        </div>
                    }>
                        <LexicalEditor
                            key={splitChapterId}
                            initialContent={splitContent}
                            projectId={projectId}
                            activeChapterId={splitChapterId}
                            onSave={handleSaveSplitContent}
                        />
                    </Suspense>
                )}
            </div>
        </div>
    );
}
