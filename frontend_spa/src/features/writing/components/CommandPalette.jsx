// ─── CommandPalette — VSCode-grade Command Menu ───
// Fuzzy search, grouped commands, icons, recent history, keyboard navigation.

import React, { useEffect, useMemo, useState, useRef } from 'react';
import Fuse from 'fuse.js';
import * as LucideIcons from 'lucide-react';

const fuseOptions = {
    keys: ['label', 'group', 'shortcut', 'id', 'description'],
    threshold: 0.3,
    distance: 100,
};

// ── Icon resolver ──
function CommandIcon({ name, size = 15, className = '' }) {
    if (!name) return null;
    // Convert kebab-case to PascalCase for lucide-react
    const pascalName = name
        .split('-')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join('');
    const Icon = LucideIcons[pascalName];
    if (!Icon) return null;
    return <Icon size={size} className={className} />;
}

// ── Group order for visual sorting ──
const GROUP_ORDER = ['AI Actions', 'Academic', 'Editor', 'Navigation', 'Layout', 'Project'];

function groupCommands(commands) {
    const groups = {};
    commands.forEach((cmd) => {
        const g = cmd.group || 'Other';
        if (!groups[g]) groups[g] = [];
        groups[g].push(cmd);
    });

    // Sort groups by predefined order
    return GROUP_ORDER.filter((g) => groups[g]?.length > 0).map((g) => ({
        name: g,
        commands: groups[g],
    }));
}

export default function CommandPalette({
    open,
    onClose,
    commands = [],
    context,
    onExecute,
    recentCommands = [],
}) {
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    const fuse = useMemo(() => new Fuse(commands, fuseOptions), [commands]);

    const filtered = useMemo(() => {
        if (!query.trim()) return commands;
        return fuse.search(query).map((r) => r.item);
    }, [commands, fuse, query]);

    // Build display list: recent first (if no query), then grouped
    const { flatList, sections } = useMemo(() => {
        if (query.trim()) {
            // When searching: show flat results grouped
            const grouped = groupCommands(filtered);
            const flat = [];
            const secs = [];
            grouped.forEach((g) => {
                secs.push({ name: g.name, startIndex: flat.length });
                g.commands.forEach((cmd) => flat.push(cmd));
            });
            return { flatList: flat, sections: secs };
        }

        // When no query: show recent first, then all grouped
        const flat = [];
        const secs = [];

        if (recentCommands.length > 0) {
            secs.push({ name: 'Terakhir Digunakan', startIndex: 0 });
            recentCommands.forEach((cmd) => flat.push(cmd));
        }

        const grouped = groupCommands(
            commands.filter((cmd) => !recentCommands.some((r) => r.id === cmd.id))
        );
        grouped.forEach((g) => {
            secs.push({ name: g.name, startIndex: flat.length });
            g.commands.forEach((cmd) => flat.push(cmd));
        });

        return { flatList: flat, sections: secs };
    }, [filtered, commands, recentCommands, query]);

    // ── Keyboard handler ──
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose?.();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((prev) => Math.min(prev + 1, flatList.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((prev) => Math.max(prev - 1, 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const cmd = flatList[activeIndex];
                if (cmd) {
                    if (onExecute) {
                        onExecute(cmd.id, context);
                    } else {
                        cmd.handler?.(context);
                        onClose?.();
                    }
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, flatList, activeIndex, context, onClose, onExecute]);

    // Reset on open
    useEffect(() => {
        if (open) {
            setQuery('');
            setActiveIndex(0);
            // Auto focus input
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [open]);

    // Scroll active item into view
    useEffect(() => {
        if (!listRef.current) return;
        const activeEl = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
        activeEl?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    if (!open) return null;

    // ── Find section header positions ──
    const sectionStartSet = new Set(sections.map((s) => s.startIndex));

    return (
        <div
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose?.();
            }}
        >
            <div
                className="w-full max-w-[620px] rounded-2xl shadow-2xl border overflow-hidden
                           bg-white/95 backdrop-blur-2xl border-black/[0.06]
                           dark:bg-[#0B1120]/95 dark:border-white/[0.08]"
                style={{ animation: 'palette-in 0.15s ease-out' }}
            >
                {/* ── Search Input ── */}
                <div className="flex items-center gap-3 px-5 py-3.5 border-b border-black/[0.06] dark:border-white/[0.06]">
                    <LucideIcons.Search size={16} className="text-slate-400 shrink-0" />
                    <input
                        ref={inputRef}
                        autoFocus
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setActiveIndex(0);
                        }}
                        className="w-full bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                        placeholder="Ketik command atau aksi..."
                    />
                    <kbd className="text-[10px] text-slate-400 border border-black/10 dark:border-white/10 rounded px-1.5 py-0.5 shrink-0 font-mono">
                        ESC
                    </kbd>
                </div>

                {/* ── Command List ── */}
                <div ref={listRef} className="max-h-[380px] overflow-y-auto custom-scrollbar py-1">
                    {flatList.length === 0 && (
                        <div className="px-5 py-8 text-sm text-slate-400 text-center">
                            Tidak ada command yang cocok.
                        </div>
                    )}

                    {flatList.map((cmd, idx) => {
                        const isActive = idx === activeIndex;
                        const showHeader = sectionStartSet.has(idx);
                        const section = showHeader
                            ? sections.find((s) => s.startIndex === idx)
                            : null;

                        return (
                            <React.Fragment key={cmd.id + '-' + idx}>
                                {/* Section Header */}
                                {showHeader && section && (
                                    <div className="px-5 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400/80 dark:text-slate-500 select-none">
                                        {section.name}
                                    </div>
                                )}

                                {/* Command Item */}
                                <button
                                    data-index={idx}
                                    onClick={() => {
                                        if (onExecute) {
                                            onExecute(cmd.id, context);
                                        } else {
                                            cmd.handler?.(context);
                                            onClose?.();
                                        }
                                    }}
                                    onMouseEnter={() => setActiveIndex(idx)}
                                    className={`w-full text-left px-5 py-2.5 flex items-center gap-3 transition-colors duration-75 ${isActive
                                        ? 'bg-blue-50/80 dark:bg-white/[0.06]'
                                        : 'bg-transparent hover:bg-slate-50/60 dark:hover:bg-white/[0.03]'
                                        }`}
                                >
                                    {/* Icon */}
                                    <div
                                        className={`w-7 h-7 flex items-center justify-center rounded-lg shrink-0 ${isActive
                                            ? 'bg-blue-100/80 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                                            : 'bg-slate-100/80 text-slate-400 dark:bg-white/[0.06] dark:text-slate-500'
                                            }`}
                                    >
                                        <CommandIcon name={cmd.icon} size={14} />
                                    </div>

                                    {/* Label + Description */}
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-[13px] font-medium truncate ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
                                            }`}>
                                            {cmd.label}
                                        </div>
                                        {cmd.description && (
                                            <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                                                {cmd.description}
                                            </div>
                                        )}
                                    </div>

                                    {/* Shortcut Badge */}
                                    {cmd.shortcut && (
                                        <span className="text-[11px] text-slate-400 dark:text-slate-500 border border-black/[0.08] dark:border-white/[0.1] rounded-md px-2 py-0.5 font-mono shrink-0">
                                            {cmd.shortcut}
                                        </span>
                                    )}
                                </button>
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* ── Footer Hint ── */}
                <div className="px-5 py-2.5 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center gap-4">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1.5">
                        <kbd className="border border-black/10 dark:border-white/10 rounded px-1 py-px font-mono text-[9px]">↑↓</kbd>
                        navigasi
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1.5">
                        <kbd className="border border-black/10 dark:border-white/10 rounded px-1 py-px font-mono text-[9px]">↵</kbd>
                        pilih
                    </span>
                    <span className="text-[10px] text-slate-400 ml-auto">
                        {flatList.length} command{flatList.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            {/* ── Animation keyframes ── */}
            <style>{`
                @keyframes palette-in {
                    from { opacity: 0; transform: translateY(-8px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
}
