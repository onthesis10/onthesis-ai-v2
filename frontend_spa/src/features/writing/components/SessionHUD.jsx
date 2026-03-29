// ─── Phase 3.4: Session HUD — Floating Minimal Heads-Up Display ───
// Shows during active writing session: timer countdown, words written, end button.

import React from 'react';
import { Timer, Target, X, CheckCircle2 } from 'lucide-react';
import { useSessionStore } from '@/store/sessionStore';
import { useEditorStore } from '@/store/editorStore';
import { useThemeStore } from '@/store/themeStore';

export default function SessionHUD() {
    const { isActive, wordGoal, targetChapter, getFormattedTime, getWordsWritten, getProgress, endSession } = useSessionStore();
    const { wordCount } = useEditorStore();
    const { theme } = useThemeStore();

    if (!isActive) return null;

    const timeStr = getFormattedTime();
    const wordsWritten = getWordsWritten(wordCount);
    const progress = getProgress(wordCount);
    const goalReached = wordsWritten >= wordGoal;

    const isDark = theme === 'dark';

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className={`flex items-center gap-4 px-5 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl ${isDark
                    ? 'bg-[#1E293B]/90 border-white/10'
                    : 'bg-white/90 border-gray-200/60'
                }`}>
                {/* Timer */}
                <div className="flex items-center gap-2">
                    <Timer size={14} className="text-violet-500" />
                    <span className={`text-lg font-black tabular-nums ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        {timeStr}
                    </span>
                </div>

                {/* Divider */}
                <div className={`w-[1px] h-6 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />

                {/* Words Progress */}
                <div className="flex items-center gap-2">
                    <Target size={14} className={goalReached ? 'text-emerald-500' : 'text-amber-500'} />
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                            <span className={`text-sm font-bold tabular-nums ${goalReached ? 'text-emerald-500' : isDark ? 'text-white' : 'text-slate-800'}`}>
                                {wordsWritten}
                            </span>
                            <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                / {wordGoal}
                            </span>
                            {goalReached && <CheckCircle2 size={12} className="text-emerald-500" />}
                        </div>
                        {/* Progress Bar */}
                        <div className={`w-20 h-1 rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${goalReached ? 'bg-emerald-500' : 'bg-violet-500'}`}
                                style={{ width: `${Math.min(100, progress)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Chapter */}
                {targetChapter && (
                    <>
                        <div className={`w-[1px] h-6 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                        <span className={`text-[10px] font-medium max-w-[120px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {targetChapter}
                        </span>
                    </>
                )}

                {/* End Button */}
                <button
                    onClick={() => endSession(wordCount)}
                    className={`ml-2 flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${isDark
                            ? 'bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400'
                            : 'bg-gray-100 hover:bg-red-50 text-slate-500 hover:text-red-500'
                        }`}
                >
                    <X size={12} />
                    END
                </button>
            </div>
        </div>
    );
}
