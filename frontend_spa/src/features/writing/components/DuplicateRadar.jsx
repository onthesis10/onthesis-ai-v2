// ─── DuplicateRadar — Phase 4: Semantic Duplicate Detector ───
// Lists paragraph pairs with similar meaning, powered by AI analysis.

import React, { useState, useCallback } from 'react';
import { Copy, AlertTriangle, Loader2, RefreshCw, ArrowRight } from 'lucide-react';
import { useProject } from '../context/ProjectContext.jsx';
import { useThemeStore } from '@/store/themeStore';

export default function DuplicateRadar({ getEditorContent }) {
    const { activeChapterId } = useProject();
    const { theme } = useThemeStore();
    const [pairs, setPairs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const isDark = theme === 'dark';

    const runScan = useCallback(async () => {
        const content = getEditorContent?.();
        if (!content || content.length < 100) {
            setError('Konten terlalu pendek untuk analisis duplikasi.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/semantic-similarity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ content }),
            });
            const data = await res.json();
            setPairs(data.pairs || []);
            if (data.pairs?.length === 0) {
                setError('Tidak ditemukan duplikasi semantik. ✓');
            }
        } catch (err) {
            console.error('[DuplicateRadar] Error:', err);
            setError('Gagal menjalankan analisis.');
        } finally {
            setLoading(false);
        }
    }, [getEditorContent]);

    const getSimilarityColor = (score) => {
        if (score >= 0.9) return 'text-red-500 bg-red-500/10';
        if (score >= 0.8) return 'text-amber-500 bg-amber-500/10';
        return 'text-sky-500 bg-sky-500/10';
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                <div className="flex items-center gap-2">
                    <Copy size={15} className="text-amber-500" />
                    <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        Duplicate Radar
                    </span>
                </div>
                <button
                    onClick={runScan}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors bg-sky-500/10 text-sky-500 hover:bg-sky-500/20 disabled:opacity-40"
                >
                    {loading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                    Scan
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-sky-500" />
                        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                            Menganalisis kesamaan semantik...
                        </p>
                    </div>
                ) : pairs.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center py-12 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                        <Copy size={28} className="mb-2 opacity-30" />
                        <p className="text-xs text-center">
                            {error || 'Klik "Scan" untuk mendeteksi duplikasi semantik antar paragraf.'}
                        </p>
                        <p className="text-[10px] opacity-60 mt-1">AI akan menemukan paragraf bermakna serupa.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {pairs.map((pair, i) => (
                            <div
                                key={i}
                                className={`rounded-lg border p-3 transition-all ${isDark ? 'bg-white/[0.02] border-white/5 hover:bg-white/5' : 'bg-white border-gray-100 hover:bg-gray-50'
                                    }`}
                            >
                                {/* Similarity badge */}
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle size={12} className="text-amber-500" />
                                        <span className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                            Paragraf {(pair.paragraphA?.index ?? 0) + 1}
                                            <ArrowRight size={10} className="inline mx-1 opacity-40" />
                                            Paragraf {(pair.paragraphB?.index ?? 0) + 1}
                                        </span>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getSimilarityColor(pair.similarity)}`}>
                                        {Math.round((pair.similarity || 0) * 100)}% mirip
                                    </span>
                                </div>

                                {/* Excerpts */}
                                <div className="space-y-1.5">
                                    <div className={`text-[11px] px-2 py-1.5 rounded border-l-2 border-sky-500/40 ${isDark ? 'bg-white/[0.02] text-slate-400' : 'bg-gray-50 text-gray-600'}`}>
                                        "{pair.paragraphA?.excerpt || '...'}"
                                    </div>
                                    <div className={`text-[11px] px-2 py-1.5 rounded border-l-2 border-amber-500/40 ${isDark ? 'bg-white/[0.02] text-slate-400' : 'bg-gray-50 text-gray-600'}`}>
                                        "{pair.paragraphB?.excerpt || '...'}"
                                    </div>
                                </div>

                                {/* Reason */}
                                {pair.reason && (
                                    <p className={`text-[10px] mt-2 italic ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                                        💡 {pair.reason}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
