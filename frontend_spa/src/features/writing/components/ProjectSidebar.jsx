// FILE: src/components/ProjectSidebar.jsx
// Antigravity-style — Ultra clean, flat, functional. No visual noise.

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
    ChevronDown, Check, Plus, FileText, BookOpen, Search,
    Quote, Copy, Settings, History, Crown, Hash, Trash2,
    Edit2, Compass, Library, FlaskConical, BarChart2, CheckCircle,
    LayoutTemplate, X
} from 'lucide-react';
import ReferenceSearchModal from './ReferenceSearchModal.jsx';
import ProjectSettingsModal from './ProjectSettingsModal.jsx';
import RevisionTimeline from './RevisionTimeline.jsx';
import { useToast } from './UI/ToastProvider.jsx';
import { useProject } from '../context/ProjectContext.jsx';
import { useThemeStore } from '@/store/themeStore';

export default function ProjectSidebar({ onInsertCitation }) {
    const { addToast } = useToast();
    const {
        project, projectsList,
        chapters = [], activeChapterId, changeActiveChapter,
        loadProject, createNewProject, isSaving, isContentLoading,
        addReference, isPro, createChapter, deleteChapter, renameChapter
    } = useProject();

    const { theme } = useThemeStore();

    const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('structure');
    const [isRefModalOpen, setIsRefModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [chapterToDelete, setChapterToDelete] = useState(null);
    const [chapterToRename, setChapterToRename] = useState(null);
    const [renameTitleInput, setRenameTitleInput] = useState('');

    const safeData = project || {};

    // ── Dynamic Chapter Icons ──
    const getChapterIcon = (title) => {
        const t = (title || '').toLowerCase();
        if (t.includes('pendahuluan')) return Compass;
        if (t.includes('pustaka') || t.includes('teori')) return Library;
        if (t.includes('metode') || t.includes('metodologi')) return FlaskConical;
        if (t.includes('hasil') || t.includes('pembahasan') || t.includes('analisis')) return BarChart2;
        if (t.includes('penutup') || t.includes('kesimpulan')) return CheckCircle;
        return FileText;
    };

    // ── Bib utils (untouched logic) ──
    const getFormattedBib = (ref) => {
        if (ref.formatted_citation) return ref.formatted_citation;
        const authors = ref.author || "Anonim";
        const year = ref.year || "n.d.";
        const title = ref.title || "Tanpa Judul";
        const publisher = ref.publisher || ref.journal || ref.website || "";
        return `${authors}. (${year}). ${title}. ${publisher}.`;
    };

    const handleCopyBib = (ref) => {
        navigator.clipboard.writeText(getFormattedBib(ref));
        if (addToast) addToast("Format Daftar Pustaka disalin!", "success");
    };

    const handleAddReference = (newRef) => addReference(newRef);
    const displayedReferences = safeData.references ? [...safeData.references].reverse() : [];

    /* ─── THEME ─── */
    const isDark = theme === 'dark';
    const isHappy = theme === 'happy';

    const c = {
        // Text
        label: isDark ? 'text-[#6B7280]' : isHappy ? 'text-stone-400' : 'text-[#9CA3AF]',
        text: isDark ? 'text-[#D1D5DB]' : isHappy ? 'text-stone-700' : 'text-[#374151]',
        textMuted: isDark ? 'text-[#4B5563]' : isHappy ? 'text-stone-400' : 'text-[#6B7280]',
        // Backgrounds
        activeBg: isDark ? 'bg-white/[0.08]' : isHappy ? 'bg-orange-50' : 'bg-[#F3F4F6]',
        activeAccent: isDark ? 'text-cyan-400' : isHappy ? 'text-orange-500' : 'text-blue-600',
        hoverBg: isDark ? 'hover:bg-white/[0.04]' : isHappy ? 'hover:bg-orange-50/50' : 'hover:bg-[#F9FAFB]',
        // Segment
        segBg: isDark ? 'bg-white/[0.04]' : isHappy ? 'bg-orange-50/40' : 'bg-[#F3F4F6]',
        segActive: isDark ? 'bg-white/[0.08] text-white' : isHappy ? 'bg-white text-orange-600 shadow-sm' : 'bg-white text-[#111827] shadow-sm',
        segInactive: isDark ? 'text-[#6B7280] hover:text-[#9CA3AF]' : isHappy ? 'text-stone-400 hover:text-stone-600' : 'text-[#9CA3AF] hover:text-[#6B7280]',
        // Elements
        border: isDark ? 'border-white/[0.06]' : isHappy ? 'border-orange-100/50' : 'border-[#E5E7EB]',
        dropBg: isDark ? 'bg-[#1F2937]' : isHappy ? 'bg-white' : 'bg-white',
        dropItem: isDark ? 'text-[#D1D5DB] hover:bg-white/[0.06]' : isHappy ? 'text-stone-600 hover:bg-orange-50' : 'text-[#374151] hover:bg-[#F3F4F6]',
        dropActive: isDark ? 'bg-cyan-500/20 text-cyan-400' : isHappy ? 'bg-orange-100 text-orange-600' : 'bg-blue-50 text-blue-600',
        refCard: isDark ? 'border-white/[0.06] hover:border-white/[0.12]' : isHappy ? 'border-orange-100 hover:border-orange-200' : 'border-[#E5E7EB] hover:border-[#D1D5DB]',
        searchBtn: isDark ? 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20' : isHappy ? 'bg-orange-50 text-orange-500 hover:bg-orange-100' : 'bg-blue-50 text-blue-600 hover:bg-blue-100',
        createBtn: isDark ? 'text-cyan-400 hover:bg-white/[0.04]' : isHappy ? 'text-orange-500 hover:bg-orange-50' : 'text-blue-600 hover:bg-blue-50',
    };

    return (
        <div className="w-full flex flex-col h-full bg-transparent relative select-none">

            {/* ── 1. PROJECT SELECTOR — Flat, minimal ── */}
            <div className="px-3 mb-3">
                <button
                    onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg ${c.hoverBg} transition-colors group`}
                >
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center ${isDark ? 'bg-cyan-500/15 text-cyan-400' : isHappy ? 'bg-orange-100 text-orange-500' : 'bg-blue-50 text-blue-600'}`}>
                        <LayoutTemplate size={14} />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                        <div className={`text-[10px] ${c.label} font-medium tracking-wide uppercase leading-none mb-0.5 flex items-center gap-1`}>
                            Project
                            {isPro && <Crown size={8} className="text-amber-400" />}
                            {isSaving && <span className="text-[8px] text-amber-400 animate-pulse">●</span>}
                        </div>
                        <div className={`text-[12px] font-semibold ${c.text} truncate leading-tight`}>
                            {safeData.title || "Untitled"}
                        </div>
                    </div>
                    <ChevronDown size={12} className={`${c.textMuted} opacity-0 group-hover:opacity-100 transition-opacity`} />
                </button>

                {/* DROPDOWN */}
                {projectDropdownOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setProjectDropdownOpen(false)} />
                        <div className={`absolute top-14 left-3 right-3 ${c.dropBg} border ${c.border} rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 origin-top`}>
                            <div className="max-h-[200px] overflow-y-auto custom-scrollbar p-1 space-y-0.5">
                                <div className={`px-2 py-1 text-[9px] font-semibold ${c.label} uppercase tracking-wider`}>Switch</div>
                                {projectsList && projectsList.length > 0 ? (
                                    projectsList.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => { loadProject(p.id); setProjectDropdownOpen(false); }}
                                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] flex items-center gap-2 transition-colors ${project?.id === p.id ? c.dropActive : c.dropItem}`}
                                        >
                                            <Hash size={10} className="opacity-40" />
                                            <span className="flex-1 truncate">{p.title || "Untitled"}</span>
                                            {project?.id === p.id && <Check size={10} />}
                                        </button>
                                    ))
                                ) : (
                                    <div className={`p-2 text-center text-[10px] ${c.textMuted}`}>No other projects</div>
                                )}
                                <div className={`h-px my-0.5 ${c.border}`}></div>
                                <button onClick={() => { createNewProject(); setProjectDropdownOpen(false); }} className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] ${c.createBtn} font-medium`}>
                                    <Plus size={11} /> New Project
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ── 2. TAB SWITCHER — Minimal segmented control ── */}
            <div className={`flex p-0.5 mx-3 ${c.segBg} rounded-md mb-3`}>
                {[
                    { id: 'structure', label: 'Bab', icon: FileText },
                    { id: 'references', label: 'Ref', icon: BookOpen },
                    { id: 'history', label: 'Log', icon: History },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] font-medium transition-all ${activeTab === tab.id ? c.segActive : c.segInactive}`}
                    >
                        <tab.icon size={11} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── 3. CONTENT ── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4">

                {/* CHAPTERS */}
                {activeTab === 'structure' && (
                    <div className="space-y-px">
                        {chapters.map((chapter, idx) => {
                            const isActive = activeChapterId === chapter.id;
                            return (
                                <div key={chapter.id} className="relative group/chap">
                                    <button
                                        onClick={() => changeActiveChapter(chapter.id)}
                                        disabled={isContentLoading}
                                        className={`w-full flex items-center pr-14 pl-2.5 py-2.5 rounded-lg transition-all text-left ${isActive
                                            ? `${c.activeBg} font-semibold`
                                            : `${c.hoverBg} text-[#6B7280] hover:text-[#374151]`
                                            }`}
                                    >
                                        <span className={`w-6 flex justify-center shrink-0 ${isActive ? (isDark ? 'text-cyan-400' : 'text-blue-500') : 'text-[#D1D5DB]'}`}>
                                            {React.createElement(getChapterIcon(chapter.title), { size: 13, strokeWidth: isActive ? 2.5 : 2 })}
                                        </span>
                                        <span className={`text-[11.5px] truncate flex-1 tracking-tight ${isActive ? c.activeAccent : ''} ${!isActive && isDark ? 'text-[#D1D5DB]' : ''}`}>
                                            {chapter.title}
                                        </span>
                                        {isActive && <div className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-cyan-400' : 'bg-blue-500'} absolute right-3 top-1/2 -translate-y-1/2`}></div>}
                                    </button>

                                    {/* Action Buttons (Hover) */}
                                    <div className={`absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover/chap:opacity-100 transition-opacity ${isActive ? 'bg-white shadow-sm rounded-md px-0.5 py-0.5' : ''}`}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setRenameTitleInput(chapter.title);
                                                setChapterToRename(chapter.id);
                                            }}
                                            className={`p-1.5 rounded-md text-[#9CA3AF] hover:text-[#4B5563] hover:bg-gray-100 transition-all`}
                                            title="Ganti Nama Bab"
                                        >
                                            <Edit2 size={11} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setChapterToDelete(chapter.id); }}
                                            className={`p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-all ${chapters.length <= 1 ? 'hidden' : ''}`}
                                            title="Hapus Bab"
                                            disabled={chapters.length <= 1}
                                        >
                                            <Trash2 size={11} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Add Chapter Button */}
                        <button
                            onClick={() => createChapter('Bab Baru')}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg ${c.hoverBg} text-[#9CA3AF] hover:text-[#374151] transition-colors mt-1`}
                        >
                            <span className="w-5 flex justify-center opacity-60"><Plus size={11} /></span>
                            <span className="text-[11px] font-medium">Tambah Bab</span>
                        </button>

                        {/* Settings */}
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg ${c.hoverBg} ${c.textMuted} transition-colors mt-3`}
                        >
                            <Settings size={11} className="opacity-50" />
                            <span className="text-[11px] font-medium">Settings</span>
                        </button>
                    </div>
                )}

                {/* RENAME CHAPTER MODAL */}
                {chapterToRename && typeof document !== 'undefined' ? createPortal(
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                                <h3 className="text-[13px] font-semibold text-gray-800">Ganti Nama Bab</h3>
                                <button onClick={() => setChapterToRename(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                            </div>
                            <div className="p-5">
                                <input
                                    autoFocus
                                    type="text"
                                    value={renameTitleInput}
                                    onChange={(e) => setRenameTitleInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            renameChapter(chapterToRename, renameTitleInput);
                                            setChapterToRename(null);
                                        }
                                    }}
                                    className="w-full text-[13px] px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    placeholder="Masukkan nama bab baru..."
                                />
                            </div>
                            <div className="px-5 py-3 bg-gray-50 flex justify-end gap-2">
                                <button
                                    onClick={() => setChapterToRename(null)}
                                    className="px-4 py-1.5 text-[11px] font-medium text-gray-500 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={() => {
                                        renameChapter(chapterToRename, renameTitleInput);
                                        setChapterToRename(null);
                                    }}
                                    className="px-4 py-1.5 text-[11px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                                >
                                    Simpan Perubahan
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                ) : null}

                {/* DELETE CHAPTER CONFIRM MODAL */}
                {chapterToDelete && typeof document !== 'undefined' ? createPortal(
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="px-6 py-6 text-center">
                                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Trash2 size={24} className="text-red-500" />
                                </div>
                                <h3 className="text-[15px] font-semibold text-gray-900 mb-2">Hapus Bab?</h3>
                                <p className="text-[13px] text-gray-500">
                                    Apakah Anda yakin ingin menghapus bab ini secara permanen? Aksi ini tidak dapat dibatalkan.
                                </p>
                            </div>
                            <div className="px-5 py-3 bg-gray-50 flex justify-end gap-2">
                                <button
                                    onClick={() => setChapterToDelete(null)}
                                    className="flex-1 px-4 py-2 text-[12px] font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={() => {
                                        deleteChapter(chapterToDelete);
                                        setChapterToDelete(null);
                                    }}
                                    className="flex-1 px-4 py-2 text-[12px] font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
                                >
                                    Ya, Hapus
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                ) : null}
                {/* REFERENCES */}
                {activeTab === 'references' && (
                    <div className="space-y-2 px-0.5">
                        <button onClick={() => setIsRefModalOpen(true)} className={`w-full py-1.5 ${c.searchBtn} rounded-lg text-[10px] font-semibold transition-all flex items-center justify-center gap-1.5`}>
                            <Search size={11} /> Cari Referensi
                        </button>

                        <div className="space-y-1.5">
                            {displayedReferences.length > 0 ? displayedReferences.map((ref, idx) => (
                                <div key={idx} className={`p-2.5 rounded-lg border ${c.refCard} transition-all group`}>
                                    <div className="flex items-start gap-2">
                                        <span className={`text-[8px] font-mono ${c.textMuted} mt-0.5 shrink-0`}>
                                            [{displayedReferences.length - idx}]
                                        </span>
                                        <div className="min-w-0">
                                            <div className={`text-[10px] font-semibold ${c.text} line-clamp-2 leading-snug`}>{ref.title}</div>
                                            <div className={`flex items-center gap-1.5 mt-1 text-[9px] ${c.textMuted}`}>
                                                <span>{ref.year || "?"}</span>
                                                <span className="opacity-30">·</span>
                                                <span className="truncate">{ref.author}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Hover actions */}
                                    <div className={`flex gap-1 mt-1.5 pt-1.5 border-t ${c.border} opacity-0 group-hover:opacity-100 transition-opacity`}>
                                        <button
                                            onClick={() => onInsertCitation && onInsertCitation(`(${ref.author ? ref.author.split(',')[0].split(' ').pop() : 'Anonim'}, ${ref.year})`)}
                                            className={`flex-1 py-0.5 rounded text-[9px] font-medium flex items-center justify-center gap-1 ${c.hoverBg} ${c.textMuted}`}
                                        >
                                            <Quote size={8} /> Cite
                                        </button>
                                        <button
                                            onClick={() => handleCopyBib(ref)}
                                            className={`flex-1 py-0.5 rounded text-[9px] font-medium flex items-center justify-center gap-1 ${c.hoverBg} ${c.textMuted}`}
                                        >
                                            <Copy size={8} /> Bib
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-8 flex flex-col items-center">
                                    <BookOpen size={18} className={`mb-1.5 ${c.textMuted} opacity-30`} />
                                    <div className={`text-[10px] ${c.textMuted}`}>Belum ada referensi</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* HISTORY */}
                {activeTab === 'history' && (
                    <RevisionTimeline />
                )}
            </div>

            <ReferenceSearchModal isOpen={isRefModalOpen} onClose={() => setIsRefModalOpen(false)} onReferenceAdded={handleAddReference} />
            <ProjectSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    );
}