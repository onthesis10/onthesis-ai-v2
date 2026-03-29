// ─── GoldenThreadModal — Floating Modal for Golden Thread ───
// Wraps GoldenThreadBar in a centered floating modal.
// Invoked from Command Palette or shortcut, not always visible.

import React, { useEffect, useRef } from 'react';
import { X, Compass } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';
import GoldenThreadBar from './GoldenThreadBar.jsx';

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {(score: number) => void} props.onCoherenceUpdate
 * @param {() => string} props.getEditorContent
 */
export default function GoldenThreadModal({ open, onClose, onCoherenceUpdate, getEditorContent }) {
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';
    const isHappy = theme === 'happy';
    const modalRef = useRef(null);

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

    // Click outside
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (modalRef.current && !modalRef.current.contains(e.target)) {
                onClose();
            }
        };
        const timer = setTimeout(() => document.addEventListener('mousedown', handler), 100);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handler);
        };
    }, [open, onClose]);

    if (!open) return null;

    const bgClass = isDark
        ? 'bg-[#0F172A]/95 border-white/10'
        : isHappy
            ? 'bg-[#FFFDF8]/95 border-orange-200/50'
            : 'bg-white/95 border-gray-200/60';

    const headerBg = isDark
        ? 'bg-[#1E293B]/80 border-white/5'
        : isHappy
            ? 'bg-orange-50/80 border-orange-100'
            : 'bg-gray-50/80 border-gray-100';

    const titleColor = isDark ? 'text-gray-200' : isHappy ? 'text-stone-700' : 'text-gray-800';
    const btnHover = isDark ? 'hover:bg-white/10 text-gray-400' : isHappy ? 'hover:bg-orange-100 text-stone-400' : 'hover:bg-gray-100 text-gray-400';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200" />

            {/* Modal */}
            <div
                ref={modalRef}
                className={`relative w-[700px] max-w-[90vw] max-h-[80vh] ${bgClass} backdrop-blur-xl border shadow-2xl rounded-2xl flex flex-col animate-in fade-in zoom-in-95 duration-300 z-10`}
            >
                {/* Header */}
                <div className={`flex items-center justify-between px-5 py-3.5 shrink-0 border-b rounded-t-2xl ${headerBg}`}>
                    <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? 'bg-cyan-500/20' : isHappy ? 'bg-orange-100' : 'bg-blue-50'}`}>
                            <Compass size={16} className={isDark ? 'text-cyan-400' : isHappy ? 'text-orange-500' : 'text-blue-600'} />
                        </div>
                        <div>
                            <span className={`text-sm font-bold tracking-wide ${titleColor}`}>Golden Thread</span>
                            <p className={`text-[11px] mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                Research coherence map — pastikan konsistensi alur riset
                            </p>
                        </div>
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
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                    <GoldenThreadBar
                        onCoherenceUpdate={onCoherenceUpdate}
                        getEditorContent={getEditorContent}
                        isModal={true}
                    />
                </div>
            </div>
        </div>
    );
}
