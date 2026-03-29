// ─── Zustand Store: Editor State ───
// Central state for editor layout, paragraph tracking, and command history.
// Follows the "Plugins, Not Monoliths" principle — no business logic here.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useEditorStore = create(
    persist(
        (set, get) => ({
            // ── Layout ──
            layoutPreset: 'default', // 'default' | 'writer' | 'review' | 'focus'
            isZenMode: false,
            leftSidebarOpen: true,
            rightSidebarOpen: true,

            // ── Editor Tracking ──
            activeParagraphKey: null,
            activeParagraphText: '',
            activeHeadingContext: [],
            wordCount: 0,
            diagnostics: [],

            // ── Command History ──
            recentCommands: [], // last 5 command IDs

            // ── Actions: Layout ──
            setLayoutPreset: (preset) => {
                set({ layoutPreset: preset });
            },
            toggleZenMode: () => set((s) => ({ isZenMode: !s.isZenMode })),
            setZenMode: (v) => set({ isZenMode: v }),
            toggleLeftSidebar: () => set((s) => ({ leftSidebarOpen: !s.leftSidebarOpen })),
            toggleRightSidebar: () => set((s) => ({ rightSidebarOpen: !s.rightSidebarOpen })),
            setLeftSidebarOpen: (v) => set({ leftSidebarOpen: v }),
            setRightSidebarOpen: (v) => set({ rightSidebarOpen: v }),

            // ── Actions: Editor ──
            setActiveParagraphKey: (key) => set({ activeParagraphKey: key }),
            setActiveParagraphText: (text) => set({ activeParagraphText: text }),
            setActiveHeadingContext: (ctx) => set({ activeHeadingContext: ctx }),
            setWordCount: (count) => set({ wordCount: count }),
            setDiagnostics: (diags) => set({ diagnostics: diags }),

            // ── Actions: Commands ──
            pushRecentCommand: (cmdId) => {
                const prev = get().recentCommands.filter((id) => id !== cmdId);
                set({ recentCommands: [cmdId, ...prev].slice(0, 5) });
            },
        }),
        {
            name: 'onthesis-editor-store',
            partialize: (state) => ({
                layoutPreset: state.layoutPreset,
                leftSidebarOpen: state.leftSidebarOpen,
                rightSidebarOpen: state.rightSidebarOpen,
                recentCommands: state.recentCommands,
            }),
        }
    )
);
