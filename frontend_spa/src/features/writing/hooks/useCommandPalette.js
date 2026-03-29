// ─── useCommandPalette Hook ───
// Manages Command Palette state, recent commands, and execution.
// Centralizes palette logic that was previously scattered.

import { useState, useCallback, useEffect, useRef } from 'react';
import { commandRegistry } from '../core/CommandRegistry.js';
import { useEditorStore } from '@/store/editorStore';

/**
 * Hook to manage the Command Palette lifecycle.
 * @returns {{ isOpen, open, close, toggle, commands, executeCommand }}
 */
export function useCommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [commands, setCommands] = useState(() => commandRegistry.getAll());
    const pushRecentCommand = useEditorStore((s) => s.pushRecentCommand);
    const recentCommandIds = useEditorStore((s) => s.recentCommands);

    // Subscribe to registry changes — update state only when registry notifies
    useEffect(() => {
        const unsub = commandRegistry.subscribe((cmds) => {
            setCommands(cmds);
        });
        return unsub;
    }, []);

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen((v) => !v), []);

    /**
     * Execute a command and track it in recent history.
     * @param {string} id - Command ID
     * @param {Object} ctx - Runtime context
     */
    const executeCommand = useCallback(
        (id, ctx) => {
            commandRegistry.execute(id, ctx);
            pushRecentCommand(id);
            close();
        },
        [pushRecentCommand, close]
    );

    /**
     * Get commands sorted with recent ones first (when no query).
     */
    const getRecentFirst = useCallback(() => {
        const recent = recentCommandIds
            .map((id) => commandRegistry.get(id))
            .filter(Boolean);
        const rest = commands.filter((cmd) => !recentCommandIds.includes(cmd.id));
        return { recent, rest };
    }, [commands, recentCommandIds]);

    return {
        isOpen,
        open,
        close,
        toggle,
        commands,
        executeCommand,
        getRecentFirst,
    };
}

export default useCommandPalette;
