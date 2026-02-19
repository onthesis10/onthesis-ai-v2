// FILE: src/components/ProjectSidebar.jsx

import React, { useState } from 'react';
import { 
    FolderOpen, Settings, Plus, FileText, BookOpen, Search, 
    LayoutGrid, Quote, Copy, Crown, ChevronDown, Check
} from 'lucide-react';
import ReferenceSearchModal from './ReferenceSearchModal.jsx';
import ProjectSettingsModal from './ProjectSettingsModal.jsx';
import { useToast } from './UI/ToastProvider.jsx';
import { useProject } from '../context/ProjectContext.jsx'; 

export default function ProjectSidebar({ onInsertCitation }) {
    const { addToast } = useToast();
    const { 
        project, projectsList, 
        chapters = [], activeChapterId, changeActiveChapter, 
        loadProject, createNewProject, isSaving, isContentLoading,
        addReference, isPro
    } = useProject();

    const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('structure'); 
    const [isRefModalOpen, setIsRefModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    
    const safeData = project || {};

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

    // --- MAC STYLE HELPERS ---
    const activeTabClass = "bg-white dark:bg-[#636366] text-black dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.1)]";
    const inactiveTabClass = "text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white";

    return (
        // CONTAINER: Background transparan karena parent (WritingStudioRoot) sudah punya Glass Effect
        <div className="w-full flex flex-col h-full bg-transparent relative">
            
            {/* 1. PROJECT SELECTOR (Mac Style Dropdown) */}
            <div className="mb-4 px-1">
                <button 
                    onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-transparent hover:border-black/5 transition-all group relative"
                >
                    {/* Icon Box */}
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-b from-blue-500 to-blue-600 flex items-center justify-center shrink-0 shadow-sm border border-blue-400/20">
                        <FolderOpen size={15} className="text-white drop-shadow-sm" />
                    </div>
                    
                    <div className="flex-1 text-left overflow-hidden">
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold tracking-wide flex items-center gap-2">
                            PROJECT ACTIVE
                            {isPro && <Crown size={10} className="text-blue-500" />}
                            {isSaving && <span className="text-[9px] text-orange-500 font-normal animate-pulse">●</span>}
                        </div>
                        <div className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate pr-4 relative">
                            {safeData.title || "Untitled Project"}
                            <ChevronDown size={12} className="absolute right-0 top-1/2 -translate-y-1/2 opacity-50"/>
                        </div>
                    </div>
                </button>
                
                {/* DROPDOWN MENU */}
                {projectDropdownOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setProjectDropdownOpen(false)}/>
                        <div className="absolute top-16 left-2 right-2 bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 origin-top">
                            <div className="max-h-[220px] overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
                                <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Switch Project</div>
                                {projectsList && projectsList.length > 0 ? (
                                    projectsList.map(p => (
                                        <button 
                                            key={p.id} 
                                            onClick={() => { loadProject(p.id); setProjectDropdownOpen(false); }} 
                                            className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition-colors ${
                                                project?.id === p.id 
                                                ? 'bg-blue-500 text-white font-medium' 
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10'
                                            }`}
                                        >
                                            <FileText size={12} className={project?.id === p.id ? "text-white/80" : "opacity-50"}/>
                                            <span className="flex-1 truncate">{p.title || "Untitled"}</span>
                                            {project?.id === p.id && <Check size={12} />}
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-2 text-center text-xs text-gray-400">No other projects</div>
                                )}
                                
                                <div className="h-px bg-gray-200 dark:bg-white/10 my-1"></div>
                                
                                <button onClick={() => { createNewProject(); setProjectDropdownOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium transition-colors">
                                    <Plus size={14}/> Create New Project
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* 2. TAB SWITCHER (Mac Segmented Control) */}
            <div className="grid grid-cols-2 p-1 mx-1 bg-gray-200/50 dark:bg-white/10 rounded-lg mb-4">
                <button 
                    onClick={() => setActiveTab('structure')}
                    className={`flex items-center justify-center gap-2 py-1.5 rounded-md text-[11px] font-medium transition-all ${activeTab === 'structure' ? activeTabClass : inactiveTabClass}`}
                >
                    <LayoutGrid size={13} /> Struktur
                </button>
                <button 
                    onClick={() => setActiveTab('references')}
                    className={`flex items-center justify-center gap-2 py-1.5 rounded-md text-[11px] font-medium transition-all ${activeTab === 'references' ? activeTabClass : inactiveTabClass}`}
                >
                    <BookOpen size={13} /> Referensi
                </button>
            </div>

            {/* 3. CONTENT AREA */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-1 pb-4">
                
                {/* TAB 1: CHAPTERS */}
                {activeTab === 'structure' && (
                    <div className="space-y-0.5">
                        {chapters.map((chapter) => (
                            <button
                                key={chapter.id}
                                onClick={() => changeActiveChapter(chapter.id)}
                                disabled={isContentLoading}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all group ${
                                    activeChapterId === chapter.id 
                                    ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' 
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5'
                                }`}
                            >
                                <FileText size={14} className={activeChapterId === chapter.id ? "text-white" : "text-gray-400 group-hover:text-gray-600"} />
                                <span className="text-xs font-medium truncate flex-1 text-left">{chapter.title}</span>
                                {activeChapterId === chapter.id && <div className="w-1.5 h-1.5 rounded-full bg-white/50"></div>}
                            </button>
                        ))}
                        
                        {/* Settings Shortcut */}
                        <button 
                            onClick={() => setIsSettingsOpen(true)}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 transition-all mt-4"
                        >
                            <Settings size={14} className="opacity-70" />
                            <span className="text-xs font-medium">Pengaturan Project</span>
                        </button>
                    </div>
                )}

                {/* TAB 2: REFERENCES */}
                {activeTab === 'references' && (
                    <div className="space-y-3 px-1">
                         <button onClick={() => setIsRefModalOpen(true)} className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 shadow-sm">
                            <Search size={14} /> Cari Referensi Online
                        </button>

                        <div className="space-y-2">
                            {displayedReferences.length > 0 ? displayedReferences.map((ref, idx) => (
                                <div key={idx} className="bg-white/60 dark:bg-white/5 p-3 rounded-xl border border-gray-200/50 dark:border-white/10 hover:border-blue-400/30 transition-all group">
                                    <div className="flex items-start gap-2.5 mb-2">
                                        <div className="mt-0.5 shrink-0 w-4 h-4 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center text-[9px] font-bold text-gray-500">
                                            {displayedReferences.length - idx}
                                        </div>
                                        <div>
                                            <div className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 line-clamp-2 leading-snug">{ref.title}</div>
                                            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-500">
                                                <span className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400 font-medium">{ref.year || "?"}</span>
                                                <span className="truncate max-w-[120px] opacity-80">{ref.author}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Action Buttons (Hidden until hover) */}
                                    <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <button 
                                            onClick={() => onInsertCitation && onInsertCitation(`(${ref.author ? ref.author.split(',')[0].split(' ').pop() : 'Anonim'}, ${ref.year})`)}
                                            className="flex-1 py-1 bg-black/5 dark:bg-white/10 hover:bg-blue-500 hover:text-white text-gray-500 rounded-md text-[10px] font-medium flex items-center justify-center gap-1 transition-colors"
                                        >
                                            <Quote size={10} /> Cite
                                        </button>
                                        <button 
                                            onClick={() => handleCopyBib(ref)}
                                            className="flex-1 py-1 bg-black/5 dark:bg-white/10 hover:bg-green-600 hover:text-white text-gray-500 rounded-md text-[10px] font-medium flex items-center justify-center gap-1 transition-colors"
                                        >
                                            <Copy size={10} /> Bib
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-10 flex flex-col items-center opacity-40">
                                    <BookOpen size={24} className="mb-2 text-gray-400"/>
                                    <div className="text-[10px] text-gray-500">Belum ada referensi</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <ReferenceSearchModal isOpen={isRefModalOpen} onClose={() => setIsRefModalOpen(false)} onReferenceAdded={handleAddReference} />
            <ProjectSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}/>
        </div>
    );
}