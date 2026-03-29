// ─── Phase 3.3: Voice Meter Popover ───
// Clickable badge in StatusBar with floating popover showing voice breakdown.
// Uses client-side voiceScorer.js for zero-latency scoring.

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, ChevronUp, X } from 'lucide-react';
import { scoreVoice } from '../core/voiceScorer.js';
import { useThemeStore } from '@/store/themeStore';

// ── Score Color Helper ──
function getScoreColor(score) {
    if (score >= 80) return { text: 'text-emerald-500', bg: 'bg-emerald-500', bgLight: 'bg-emerald-500/10' };
    if (score >= 60) return { text: 'text-amber-500', bg: 'bg-amber-500', bgLight: 'bg-amber-500/10' };
    return { text: 'text-red-500', bg: 'bg-red-500', bgLight: 'bg-red-500/10' };
}

// ── Category Labels ──
const CATEGORIES = [
    { key: 'passive', label: 'Passive Voice', desc: 'Keseimbangan kalimat aktif/pasif' },
    { key: 'hedging', label: 'Hedging', desc: 'Penggunaan bahasa ragu-ragu' },
    { key: 'formality', label: 'Formality', desc: 'Tingkat formalitas bahasa' },
    { key: 'colloquial', label: 'Colloquial Free', desc: 'Bebas dari bahasa informal' },
];

export default function VoiceMeterPopover({ getEditorContent }) {
    const { theme } = useThemeStore();
    const [isOpen, setIsOpen] = useState(false);
    const [voiceData, setVoiceData] = useState(null);
    const popoverRef = useRef(null);
    const timerRef = useRef(null);

    // ── Auto-score with debounce ──
    const updateScore = useCallback(() => {
        const content = getEditorContent?.();
        if (content) {
            const result = scoreVoice(content);
            setVoiceData(result);
        }
    }, [getEditorContent]);

    // Debounced scoring every 3s
    useEffect(() => {
        updateScore(); // Initial score
        timerRef.current = setInterval(updateScore, 3000);
        return () => clearInterval(timerRef.current);
    }, [updateScore]);

    // ── Close on outside click ──
    useEffect(() => {
        function handleClickOutside(e) {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        }
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const isDark = theme === 'dark';
    const score = voiceData?.overall ?? 0;
    const colors = getScoreColor(score);

    return (
        <div className="relative" ref={popoverRef}>
            {/* Badge Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all ${isOpen ? colors.bgLight : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                title="Academic Voice Score"
            >
                <Mic size={10} className={colors.text} />
                <span className={`text-[11px] font-bold ${colors.text}`}>
                    {score > 0 ? `${score}` : '—'}
                </span>
            </button>

            {/* Popover */}
            {isOpen && voiceData && (
                <div
                    className={`absolute bottom-full right-0 mb-2 w-[280px] rounded-xl shadow-2xl border overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200 ${isDark
                            ? 'bg-[#1E293B] border-white/10'
                            : 'bg-white border-gray-200'
                        }`}
                >
                    {/* Header */}
                    <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                        <div className="flex items-center gap-2">
                            <Mic size={14} className={colors.text} />
                            <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                                Academic Voice
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-lg font-black ${colors.text}`}>{score}</span>
                            <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>/100</span>
                        </div>
                    </div>

                    {/* Category Breakdown */}
                    <div className="px-4 py-3 space-y-3">
                        {CATEGORIES.map(cat => {
                            const catScore = voiceData[cat.key] || 0;
                            const catColors = getScoreColor(catScore);
                            return (
                                <div key={cat.key}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`text-[10px] font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                            {cat.label}
                                        </span>
                                        <span className={`text-[10px] font-bold ${catColors.text}`}>
                                            {catScore}
                                        </span>
                                    </div>
                                    {/* Bar */}
                                    <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${catColors.bg}`}
                                            style={{ width: `${catScore}%` }}
                                        />
                                    </div>
                                    <p className={`text-[9px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                        {cat.desc}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Details Footer */}
                    {voiceData.details && (
                        <div className={`px-4 py-2 text-[9px] border-t flex items-center gap-3 ${isDark ? 'border-white/5 text-slate-500' : 'border-gray-100 text-slate-400'}`}>
                            <span>{voiceData.details.sentenceCount} kalimat</span>
                            <span>{voiceData.details.passiveCount} pasif</span>
                            <span>{voiceData.details.hedgingCount} hedging</span>
                            {voiceData.details.informalCount > 0 && (
                                <span className="text-red-400">{voiceData.details.informalCount} informal</span>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
