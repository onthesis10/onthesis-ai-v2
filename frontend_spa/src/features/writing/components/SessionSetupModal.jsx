// ─── Phase 3.4: Session Setup Modal ───
// Modal to configure writing session: duration, word goal, target chapter.

import React, { useState } from 'react';
import { X, Timer, Target, BookOpen, Zap } from 'lucide-react';
import { useProject } from '../context/ProjectContext.jsx';
import { useThemeStore } from '@/store/themeStore';

const DURATION_OPTIONS = [
    { value: 15, label: '15 min', desc: 'Quick burst' },
    { value: 25, label: '25 min', desc: 'Pomodoro' },
    { value: 45, label: '45 min', desc: 'Deep focus' },
    { value: 60, label: '60 min', desc: 'Marathon' },
];

const WORD_GOAL_OPTIONS = [100, 200, 300, 500, 750, 1000];

export default function SessionSetupModal({ isOpen, onClose, onStart }) {
    const { chapters, activeChapterId } = useProject();
    const { theme } = useThemeStore();

    const [duration, setDuration] = useState(25);
    const [wordGoal, setWordGoal] = useState(300);
    const [targetChapter, setTargetChapter] = useState(activeChapterId || '');

    if (!isOpen) return null;

    const isDark = theme === 'dark';
    const cardBg = isDark ? 'bg-[#1E293B]' : 'bg-white';
    const borderColor = isDark ? 'border-white/10' : 'border-gray-200';
    const textMain = isDark ? 'text-slate-200' : 'text-slate-700';
    const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
    const selectBg = isDark ? 'bg-[#0F172A] border-white/10 text-slate-200' : 'bg-gray-50 border-gray-200 text-slate-700';

    const handleStart = () => {
        const chapterTitle = chapters?.find(c => c.id === targetChapter)?.title || '';
        onStart({ duration, wordGoal, targetChapter: chapterTitle });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`w-[420px] rounded-2xl shadow-2xl border ${cardBg} ${borderColor} overflow-hidden animate-in zoom-in-95 duration-200`}>
                {/* Header */}
                <div className={`flex items-center justify-between px-5 py-4 border-b ${borderColor}`}>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                            <Zap size={16} className="text-white" />
                        </div>
                        <div>
                            <h2 className={`text-sm font-bold ${textMain}`}>Writing Session</h2>
                            <p className={`text-[10px] ${textMuted}`}>Deep work mode — fokus menulis</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 ${textMuted}`}>
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="px-5 py-4 space-y-5">
                    {/* Duration */}
                    <div>
                        <label className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider mb-2 ${textMuted}`}>
                            <Timer size={12} /> Durasi
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {DURATION_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setDuration(opt.value)}
                                    className={`flex flex-col items-center py-2 px-1 rounded-lg border text-center transition-all ${duration === opt.value
                                            ? 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-1 ring-violet-500/30'
                                            : `${borderColor} ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`
                                        }`}
                                >
                                    <span className={`text-sm font-bold ${duration === opt.value ? '' : textMain}`}>{opt.label}</span>
                                    <span className={`text-[9px] ${duration === opt.value ? 'text-violet-500' : textMuted}`}>{opt.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Word Goal */}
                    <div>
                        <label className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider mb-2 ${textMuted}`}>
                            <Target size={12} /> Target Kata
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {WORD_GOAL_OPTIONS.map(goal => (
                                <button
                                    key={goal}
                                    onClick={() => setWordGoal(goal)}
                                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${wordGoal === goal
                                            ? 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-1 ring-violet-500/30'
                                            : `${borderColor} ${textMain} ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`
                                        }`}
                                >
                                    {goal} kata
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Target Chapter */}
                    <div>
                        <label className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider mb-2 ${textMuted}`}>
                            <BookOpen size={12} /> Target Bab
                        </label>
                        <select
                            value={targetChapter}
                            onChange={(e) => setTargetChapter(e.target.value)}
                            className={`w-full px-3 py-2 rounded-lg border text-xs font-medium outline-none ${selectBg}`}
                        >
                            {chapters?.map(ch => (
                                <option key={ch.id} value={ch.id}>{ch.title}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Footer */}
                <div className={`px-5 py-4 border-t ${borderColor} flex items-center justify-between`}>
                    <p className={`text-[10px] ${textMuted}`}>
                        Semua panel akan disembunyikan selama sesi
                    </p>
                    <button
                        onClick={handleStart}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-bold rounded-lg hover:opacity-90 transition-all shadow-lg shadow-violet-500/20"
                    >
                        <Zap size={14} />
                        Mulai Sesi
                    </button>
                </div>
            </div>
        </div>
    );
}
