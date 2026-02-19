// FILE: src/WritingStudioRoot.jsx

import React, { useState, useRef, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import {
    PanelRightClose, PanelRightOpen,
    PanelLeftClose, PanelLeftOpen, LogOut, Loader2,
    Sun, Moon, Maximize2, Minimize2, Sparkles
} from 'lucide-react';

// COMPONENTS
import LexicalEditor from '../components/Editor/LexicalEditor.jsx';
import AssistantPanel from '../components/AssistantPanel.jsx';
import ProjectSidebar from '../components/ProjectSidebar.jsx';
import ProjectSettingsModal from '../components/ProjectSettingsModal.jsx';
import UpgradeModal from '../components/UI/UpgradeModal.jsx';

// CONTEXT & HOOKS
import { useStreamGenerator } from '../hooks/useStreamGenerator.js';
import { useProject } from '../context/ProjectContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { UPGRADE_EVENT } from '../api/client.js';

export default function WritingStudioRoot() {
    // 1. STATE MANAGEMENT
    const {
        project, projectId, activeChapterId, chapters, content,
        isSaving, isLoading, isContentLoading, isPro,
        saveContent, showUpgradeModal, setShowUpgradeModal
    } = useProject();

    const { theme, toggleTheme } = useTheme();
    const { generate, stop, status, streamData, error } = useStreamGenerator();

    // UI Layout State
    const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
    const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState('generator');
    const [isZenMode, setIsZenMode] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const editorRef = useRef(null);

    // 2. LISTENERS
    useEffect(() => {
        const handleUpgradeTrigger = () => setShowUpgradeModal && setShowUpgradeModal(true);
        if (typeof window !== 'undefined') window.addEventListener(UPGRADE_EVENT, handleUpgradeTrigger);
        return () => window.removeEventListener(UPGRADE_EVENT, handleUpgradeTrigger);
    }, [setShowUpgradeModal]);

    // 3. HANDLERS
    const handleInsertToEditor = (text) => { editorRef.current?.insertContent(text); };
    const handleRunAI = (task, inputData) => {
        if (!project) return alert("Pilih Project Dulu!");
        const referencesText = project.references?.map((r, i) => `[${i + 1}] ${r.title}`).join('\n') || "";
        const payload = {
            projectId, task,
            data: { ...inputData, context_material: `REF:\n${referencesText}\n\nCONTENT:\n${editorRef.current?.getHtml()}` },
            model: inputData.model || 'fast'
        };
        generate('/api/writing-assistant', payload);
        if (activeTab === 'analysis') setActiveTab('generator');
        if (!rightSidebarOpen) setRightSidebarOpen(true);
    };

    // 4. LOADING SCREEN
    if (isLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-[#F5F5F7] dark:bg-[#1E1E1E] font-sans">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                    <span className="text-xs font-medium text-gray-400 tracking-wide">Loading...</span>
                </div>
            </div>
        );
    }

    const currentChapterTitle = chapters?.find(c => c.id === activeChapterId)?.title || "Editor";

    // --- MAC STYLE UTILS (FLAT & CLEAN) ---
    // Hapus border rounded/gap yang tidak perlu. Kita main Border 1px solid aja.
    const sidebarBg = "bg-[#F5F5F7] dark:bg-[#1E1E1E] border-gray-200 dark:border-white/10";
    const btnMac = "w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-all duration-200";

    return (
        <>
            <Toaster position="bottom-center" toastOptions={{
                className: '!bg-white/90 dark:!bg-[#2C2C2C]/90 !backdrop-blur-xl !text-black dark:!text-white !shadow-2xl !rounded-xl !border !border-black/5',
                style: { fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', fontSize: '13px' }
            }} />

            {/* GLOBAL CONTAINER */}
            <div className="flex h-screen w-screen bg-white dark:bg-[#1E1E1E] text-[#1D1D1F] dark:text-[#F5F5F7] overflow-hidden font-sans transition-colors duration-300">

                {/* A. LEFT SIDEBAR */}
                <aside className={`${leftSidebarOpen && !isZenMode ? 'w-[260px] translate-x-0 opacity-100' : '-translate-x-full w-0 opacity-0'} h-full border-r ${sidebarBg} flex flex-col transition-all duration-300 relative z-30`}>
                    <div className="h-[52px] px-5 flex items-center justify-between shrink-0 drag-region">
                        <div className="flex items-center gap-2 group">
                            <div className="w-3 h-3 rounded-full bg-[#FF5F57] border border-[#E0443E] shadow-sm"></div>
                            <div className="w-3 h-3 rounded-full bg-[#FEBC2E] border border-[#D89E24] shadow-sm"></div>
                            <div className="w-3 h-3 rounded-full bg-[#28C840] border border-[#1AAB29] shadow-sm"></div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute left-20">
                            <span className="text-xs font-medium text-gray-400">OnThesis</span>
                        </div>
                        <button onClick={() => window.location.href = '/dashboard'} className={btnMac} title="Dashboard">
                            <LogOut size={14} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-0"> {/* Padding 0 biar list mepet */}
                        <ProjectSidebar onInsertCitation={handleInsertToEditor} onOpenSettings={() => setIsSettingsOpen(true)} />
                    </div>
                </aside>

                {/* B. CENTER CANVAS (Main Content) */}
                <main className="flex-1 flex flex-col h-full min-w-0 relative transition-all duration-300 z-10 bg-white dark:bg-[#1E1E1E]">

                    {/* Toolbar (Sticky Top) */}
                    {!isZenMode && (
                        <header className={`h-[52px] flex items-center justify-between px-4 shrink-0 z-20 sticky top-0 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#1E1E1E]`}>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setLeftSidebarOpen(!leftSidebarOpen)} className={btnMac}>
                                    {leftSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
                                </button>
                                <div className="h-4 w-[1px] bg-gray-300 dark:bg-gray-700"></div>
                                <div className="flex flex-col justify-center">
                                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                        {currentChapterTitle}
                                        {isSaving && <span className="text-[10px] text-gray-400 font-normal">Saving...</span>}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={toggleTheme} className={`${btnMac} w-8 h-6 rounded`} title={`Current: ${theme.charAt(0).toUpperCase() + theme.slice(1)} Mode`}>
                                    {theme === 'light' && <Moon size={14} />}
                                    {theme === 'dark' && <Sparkles size={14} />}
                                    {theme === 'happy' && <Sun size={14} />}
                                </button>
                                <button onClick={() => setIsZenMode(true)} className={`${btnMac} w-8 h-6 rounded`} title="Focus">
                                    <Maximize2 size={14} />
                                </button>
                                <button onClick={() => setRightSidebarOpen(!rightSidebarOpen)} className={`${btnMac} w-8 h-6 rounded`}>
                                    {rightSidebarOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
                                </button>
                            </div>
                        </header>
                    )}

                    {/* EDITOR AREA (VS CODE STYLE: NO GAPS, NO PADDING) */}
                    <div className="flex-1 overflow-hidden relative bg-white dark:bg-[#1E1E1E]" id="editor-scroller">
                        {/* DISINI PERUBAHAN UTAMANYA:
                            - Tidak ada 'p-4' atau 'p-6'.
                            - Tidak ada 'rounded'.
                            - Tidak ada 'shadow'.
                            - Langsung w-full h-full.
                            - Editor mepet kiri kanan atas bawah. 
                        */}
                        <div className="w-full h-full">
                            {isContentLoading ? (
                                <div className="flex h-full flex-col items-center justify-center opacity-40">
                                    <Loader2 className="w-6 h-6 text-gray-400 animate-spin mb-2" />
                                    <p className="text-xs font-medium text-gray-400">Loading Content...</p>
                                </div>
                            ) : (
                                <LexicalEditor
                                    key={activeChapterId} ref={editorRef}
                                    projectId={projectId} activeChapterId={activeChapterId}
                                    initialContent={content} isStreaming={status === 'streaming'}
                                    projectContext={project} onSave={saveContent}
                                />
                            )}
                        </div>
                    </div>

                    {/* HUD Zen Mode */}
                    {isZenMode && (
                        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in zoom-in-95 duration-300">
                            <button
                                onClick={() => setIsZenMode(false)}
                                className="px-4 py-2 rounded-lg bg-[#333] text-white border border-white/10 text-xs font-bold shadow-lg hover:bg-black transition-all flex items-center gap-2"
                            >
                                <Minimize2 size={12} /> EXIT ZEN MODE
                            </button>
                        </div>
                    )}
                </main>

                {/* C. RIGHT SIDEBAR */}
                <aside className={`${rightSidebarOpen && !isZenMode ? 'w-[360px] translate-x-0 opacity-100' : 'translate-x-full w-0 opacity-0'} h-full border-l ${sidebarBg} flex flex-col transition-all duration-300 relative z-30`}>
                    <AssistantPanel
                        activeTab={activeTab} setActiveTab={setActiveTab}
                        status={status} streamData={streamData} error={error}
                        onRunAI={handleRunAI} onStop={stop} onInsert={handleInsertToEditor}
                        getEditorContent={() => editorRef.current?.getHtml()}
                        activeChapterId={activeChapterId} chapters={chapters} projectData={project}
                        isPro={isPro}
                    />
                </aside>

                <ProjectSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
                <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal && setShowUpgradeModal(false)} />
            </div>
        </>
    );
}