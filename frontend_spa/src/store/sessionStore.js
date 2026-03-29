// ─── Phase 3.4: Session Store — Writing Session State Management ───
// Zustand store for deep work mode: timer, word goals, session tracking.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSessionStore = create(
    persist(
        (set, get) => ({
            // ── Session State ──
            isActive: false,
            startTime: null,
            duration: 25,       // minutes
            wordGoal: 300,
            wordsAtStart: 0,    // word count when session started
            targetChapter: '',

            // ── Timer ──
            timeRemaining: 0,   // seconds
            intervalId: null,

            // ── History ──
            sessionHistory: [],  // last 10 sessions

            // ── Actions ──
            startSession: ({ duration, wordGoal, targetChapter, currentWordCount }) => {
                const state = get();
                if (state.isActive) return;

                const durationSecs = duration * 60;

                // Start countdown timer
                const id = setInterval(() => {
                    const s = get();
                    if (!s.isActive) {
                        clearInterval(id);
                        return;
                    }
                    const remaining = s.timeRemaining - 1;
                    if (remaining <= 0) {
                        // Auto-end session
                        get().endSession(currentWordCount);
                    } else {
                        set({ timeRemaining: remaining });
                    }
                }, 1000);

                set({
                    isActive: true,
                    startTime: Date.now(),
                    duration,
                    wordGoal,
                    targetChapter,
                    wordsAtStart: currentWordCount || 0,
                    timeRemaining: durationSecs,
                    intervalId: id,
                });
            },

            endSession: (currentWordCount) => {
                const state = get();
                if (!state.isActive) return;

                // Clear timer
                if (state.intervalId) clearInterval(state.intervalId);

                // Calculate stats
                const wordsWritten = Math.max(0, (currentWordCount || 0) - state.wordsAtStart);
                const elapsedMinutes = Math.round((Date.now() - state.startTime) / 60000);

                // Save to history
                const sessionRecord = {
                    id: Date.now(),
                    date: new Date().toISOString(),
                    duration: elapsedMinutes,
                    targetDuration: state.duration,
                    wordGoal: state.wordGoal,
                    wordsWritten,
                    targetChapter: state.targetChapter,
                    goalReached: wordsWritten >= state.wordGoal,
                };

                set(s => ({
                    isActive: false,
                    startTime: null,
                    timeRemaining: 0,
                    intervalId: null,
                    sessionHistory: [sessionRecord, ...s.sessionHistory].slice(0, 10),
                }));

                return sessionRecord;
            },

            // ── Helpers ──
            getFormattedTime: () => {
                const rem = get().timeRemaining;
                const mins = Math.floor(rem / 60);
                const secs = rem % 60;
                return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            },

            getWordsWritten: (currentWordCount) => {
                return Math.max(0, (currentWordCount || 0) - get().wordsAtStart);
            },

            getProgress: (currentWordCount) => {
                const written = get().getWordsWritten(currentWordCount);
                const goal = get().wordGoal;
                return goal > 0 ? Math.min(100, Math.round((written / goal) * 100)) : 0;
            },
        }),
        {
            name: 'onthesis-session-store',
            partialize: (state) => ({
                sessionHistory: state.sessionHistory,
            }),
        }
    )
);
