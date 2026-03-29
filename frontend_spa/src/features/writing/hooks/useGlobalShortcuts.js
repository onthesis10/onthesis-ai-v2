// ─── useGlobalShortcuts — Keyboard First System ───
// Register global keyboard shortcuts. Driven by the roadmap spec.
// Principle: "Keyboard First" — every action reachable from keyboard.

import { useEffect, useCallback } from 'react';

/**
 * @param {Object} handlers
 * @param {() => void} handlers.onOpenPalette — Cmd+K
 * @param {() => void} handlers.onRunAI — Cmd+Enter
 * @param {() => void} handlers.onSave — Cmd+S
 * @param {() => void} handlers.onToggleZen — Alt+Z
 * @param {() => void} handlers.onInsertCitation — Cmd+Shift+C
 * @param {() => void} handlers.onAskSelection — Cmd+/
 * @param {() => void} handlers.onToggleAgent — Ctrl+L (toggle agent panel)
 * @param {() => void} handlers.onToggleLeftSidebar — Cmd+B
 */
export function useGlobalShortcuts({
    onOpenPalette,
    onRunAI,
    onSave,
    onToggleZen,
    onInsertCitation,
    onAskSelection,
    onToggleAgent,
    onToggleLeftSidebar,
}) {
    const handler = useCallback(
        (e) => {
            const isCmd = e.metaKey || e.ctrlKey;
            const isShift = e.shiftKey;
            const isAlt = e.altKey;
            const key = e.key?.toLowerCase();

            // ── Ctrl + L → Toggle Agent Panel ──
            if (isCmd && !isShift && !isAlt && key === 'l') {
                e.preventDefault();
                onToggleAgent?.();
                return;
            }

            // ── Cmd + K → Command Palette ──
            if (isCmd && !isShift && key === 'k') {
                e.preventDefault();
                onOpenPalette?.();
                return;
            }

            // ── Cmd + Enter → AI: Run draft / Continue ──
            if (isCmd && !isShift && e.key === 'Enter') {
                e.preventDefault();
                onRunAI?.();
                return;
            }

            // ── Cmd + S → Save ──
            if (isCmd && !isShift && key === 's') {
                e.preventDefault();
                onSave?.();
                return;
            }

            // ── Alt + Z → Toggle Zen Mode ──
            if (isAlt && !isCmd && key === 'z') {
                e.preventDefault();
                onToggleZen?.();
                return;
            }

            // ── Cmd + Shift + C → Insert Citation ──
            if (isCmd && isShift && key === 'c') {
                e.preventDefault();
                onInsertCitation?.();
                return;
            }

            // ── Cmd + / → Ask AI about selection ──
            if (isCmd && !isShift && key === '/') {
                e.preventDefault();
                onAskSelection?.();
                return;
            }

            // ── Cmd + B → Toggle Left Sidebar ──
            if (isCmd && !isShift && key === 'b') {
                e.preventDefault();
                onToggleLeftSidebar?.();
                return;
            }
        },
        [
            onOpenPalette,
            onRunAI,
            onSave,
            onToggleZen,
            onInsertCitation,
            onAskSelection,
            onToggleAgent,
            onToggleLeftSidebar,
        ]
    );

    useEffect(() => {
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handler]);
}

export default useGlobalShortcuts;
