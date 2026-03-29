// ─── ToolDrawer — Reusable Floating Drawer for Command Palette Tools ───
// Slides up from bottom or in from right. Used for stateful tools
// (Draft Generator, Analysis, Defense Prep, etc.) invoked via Cmd+K.
// Principle: Tools stay accessible without cluttering the main panel.

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';

/**
 * @param {Object} props
 * @param {boolean} props.open - Whether the drawer is visible
 * @param {() => void} props.onClose - Close handler
 * @param {string} props.title - Drawer header title
 * @param {React.ReactNode} props.icon - Header icon element
 * @param {'bottom'|'right'} [props.position='bottom'] - Slide direction
 * @param {React.ReactNode} props.children - Content
 */
export default function ToolDrawer({ open, onClose, title, icon, position = 'bottom', children }) {
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';
    const isHappy = theme === 'happy';
    const drawerRef = useRef(null);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, onClose]);

    // Click outside to close
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (drawerRef.current && !drawerRef.current.contains(e.target)) {
                onClose();
            }
        };
        // Slight delay to prevent immediate close on open
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handler);
        }, 100);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handler);
        };
    }, [open, onClose]);

    if (!open) return null;

    // Theme styles
    const bgClass = isDark
        ? 'bg-[#0F172A]/95 border-white/10'
        : isHappy
            ? 'bg-[#FFFDF8]/95 border-orange-200/50'
            : 'bg-white/95 border-gray-200/60';

    const headerBg = isDark
        ? 'bg-[#1E293B]/80'
        : isHappy
            ? 'bg-orange-50/80'
            : 'bg-gray-50/80';

    const titleColor = isDark ? 'text-gray-200' : isHappy ? 'text-stone-700' : 'text-gray-800';
    const btnHover = isDark ? 'hover:bg-white/10 text-gray-400' : isHappy ? 'hover:bg-orange-100 text-stone-400' : 'hover:bg-gray-100 text-gray-400';

    // Position classes
    const isBottom = position === 'bottom';
    const positionClasses = isBottom
        ? 'inset-x-0 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[90%] md:max-w-5xl bottom-0 max-h-[85vh] h-[65vh] rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)]'
        : 'right-0 top-0 bottom-0 w-[420px] max-w-[90vw] rounded-l-2xl shadow-[-10px_0_40px_rgba(0,0,0,0.1)]';

    const animateClass = isBottom
        ? 'animate-in slide-in-from-bottom duration-300'
        : 'animate-in slide-in-from-right duration-300';

    return (
        // Backdrop
        <div className="fixed inset-0 z-50 flex">
            {/* Dim overlay */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200" />

            {/* Drawer */}
            <div
                ref={drawerRef}
                className={`absolute ${positionClasses} ${animateClass} ${bgClass} backdrop-blur-xl border shadow-2xl flex flex-col z-10`}
            >
                {/* Header */}
                <div className={`flex items-center justify-between px-4 py-3 shrink-0 border-b ${headerBg} ${isDark ? 'border-white/5' : isHappy ? 'border-orange-100' : 'border-gray-100'} ${isBottom ? 'rounded-t-2xl' : 'rounded-tl-2xl'}`}>
                    <div className="flex items-center gap-2.5">
                        {/* Drag handle for bottom drawer */}
                        {isBottom && (
                            <div className={`w-8 h-1 rounded-full mx-auto absolute top-1.5 left-1/2 -translate-x-1/2 ${isDark ? 'bg-white/20' : 'bg-gray-300'}`} />
                        )}
                        {icon && <span className={isDark ? 'text-cyan-400' : isHappy ? 'text-orange-500' : 'text-blue-600'}>{icon}</span>}
                        <span className={`text-sm font-bold tracking-wide ${titleColor}`}>{title}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${btnHover}`}
                        title="Close (Esc)"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
}
