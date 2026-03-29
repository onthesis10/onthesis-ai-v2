// ─── WritingStudioRoot — Main Orchestrator ───
// Agent-first design: Right panel = Agent, all tools via Command Palette.
// Ctrl+L toggles Agent panel. Cmd+K opens Command Palette.

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    PanelRightClose, PanelRightOpen,
    PanelLeftClose, PanelLeftOpen, Loader2,
    Maximize2, Minimize2, Command,
    AlertTriangle, CheckCircle2
} from 'lucide-react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';

// COMPONENTS
const LexicalEditor = React.lazy(() => import('../components/Editor/LexicalEditor.jsx'));
import AgentPanel from '../components/Assistant/AgentPanel.jsx';
import ProjectSidebar from '../components/ProjectSidebar.jsx';
import ProjectSettingsModal from '../components/ProjectSettingsModal.jsx';
import UpgradeModal from '../components/UI/UpgradeModal.jsx';
import CommandPalette from '../components/CommandPalette.jsx';
import ToolDrawer from '../components/ToolDrawer.jsx';
import GoldenThreadModal from '../components/GoldenThreadModal.jsx';

// CONTEXT & HOOKS
import { useProject } from '../context/ProjectContext.jsx';
import { useThemeStore } from '@/store/themeStore';
import { useEditorStore } from '@/store/editorStore';
import { UPGRADE_EVENT } from '../api/client.js';
import { buildFullContext, invalidateCache } from '../context/ContextBuilder.js';
import commandRegistry from '../core/CommandRegistry.js';
import { useCommandPalette } from '../hooks/useCommandPalette.js';
import { useGlobalShortcuts } from '../hooks/useGlobalShortcuts.js';

// PHASE 2: AcceptAllBanner at editor level
import { AcceptAllBanner } from '../components/Assistant/AgentPanel.jsx';

// PHASE 3: Voice Meter + Sessions
import VoiceMeterPopover from '../components/VoiceMeterPopover.jsx';
import SessionSetupModal from '../components/SessionSetupModal.jsx';
import SessionHUD from '../components/SessionHUD.jsx';
import { useSessionStore } from '@/store/sessionStore';

// PHASE 4: Split Editor
const SplitEditorContainer = React.lazy(() => import('../components/SplitEditorContainer.jsx'));

// Lazy load tool components for drawers
const GeneratorTab = React.lazy(() => import('../components/Assistant/GeneratorTab'));
const ToolsTab = React.lazy(() => import('../components/Assistant/ToolsTab'));
const ContextTab = React.lazy(() => import('../components/ContextTab'));
const AnalysisTab = React.lazy(() => import('../components/Assistant/AnalysisTab'));
const LogicTab = React.lazy(() => import('../components/Assistant/LogicTab'));
const PlannerTab = React.lazy(() => import('../components/Assistant/PlannerTab'));
const DefenseTab = React.lazy(() => import('../components/Assistant/DefenseTab'));
const ArgumentGraph = React.lazy(() => import('../components/ArgumentGraph.jsx'));
const DuplicateRadar = React.lazy(() => import('../components/DuplicateRadar.jsx'));

// ─── Layout Presets ───
const LAYOUT_PRESETS = {
    default: [22, 56, 22],
    writer: [14, 68, 18],
    review: [14, 46, 40],
    focus: [0, 78, 22],
};

// ─── Tool Drawer Config ───
const TOOL_DRAWER_CONFIG = {
    generator: { title: 'Draft Generator', icon: '✨', position: 'bottom' },
    tools: { title: 'Writing Tools', icon: '📚', position: 'bottom' },
    context: { title: 'Context & Diagnostics', icon: '🔍', position: 'bottom' },
    analysis: { title: 'Data Analysis', icon: '📊', position: 'bottom' },
    logic: { title: 'Logic Audit', icon: '🛡️', position: 'right' },
    thread: { title: 'Argument Graph', icon: '🔗', position: 'right' },
    dupes: { title: 'Duplicate Radar', icon: '📋', position: 'bottom' },
    planner: { title: 'Thesis Graph Overview', icon: '🗺️', position: 'right' },
    defense: { title: 'Sidang Prep', icon: '🎓', position: 'right' },
};

const STREAM_PHASE_LABELS = {
    planning: 'Merencanakan...',
    executing: 'Menjalankan alat...',
    reviewing: 'Menyusun jawaban...',
    evaluating: 'Mengevaluasi hasil...',
    revising: 'Merevisi hasil...',
    done: 'Selesai',
};

function buildAgentTaskInstruction(task, inputData = {}, activeChapterId) {
    const inputText = inputData?.input_text || '';
    const chapterLabel = activeChapterId ? ` pada ${activeChapterId}` : '';

    switch (task) {
        case 'chat':
            return inputText || 'Jawab pertanyaan pengguna berdasarkan konteks tesis saat ini.';
        case 'continue':
            return `Lanjutkan paragraf akademik berikut${chapterLabel} dengan tetap konsisten terhadap konteks tesis:\n${inputText}`;
        case 'improve':
            return `Perbaiki paragraf berikut agar lebih akademik, koheren, dan jelas${chapterLabel}:\n${inputText}`;
        case 'paraphrase':
            return `Parafrase teks berikut tanpa mengubah makna akademiknya:\n${inputText}`;
        case 'validate_citations':
            return `Periksa sitasi pada draft${chapterLabel} ini dan jelaskan bagian yang bermasalah beserta saran perbaikannya:\n${inputText}`;
        case 'general':
            return inputText
                ? `Bantu tulis atau kembangkan draft akademik berikut${chapterLabel} dengan memanfaatkan konteks tesis saat ini:\n${inputText}`
                : `Buatkan draft akademik yang relevan${chapterLabel} berdasarkan konteks tesis saat ini.`;
        default:
            return inputText || String(task || 'Bantu lanjutkan penulisan tesis berdasarkan konteks saat ini.');
    }
}

export default function WritingStudioRoot() {
    // ─── 1. STATE FROM CONTEXT ───
    const {
        project, projectId, activeChapterId, chapters, content,
        isSaving, isLoading, isContentLoading, isPro,
        saveContent, showUpgradeModal, setShowUpgradeModal,
        changeActiveChapter, setActiveChapterId,
        goldenThread, references,
        updateChapterSummary, chapterSummaries, // Sprint 2: Context Memory
    } = useProject();

    const { theme } = useThemeStore();
    const [agentRunState, setAgentRunState] = useState({
        status: 'idle',
        streamData: '',
        error: null,
        phase: 'idle',
    });
    const { status, streamData, error, phase } = agentRunState;

    // ─── 2. ZUSTAND EDITOR STORE ───
    const {
        isZenMode, toggleZenMode, setZenMode,
        leftSidebarOpen, toggleLeftSidebar, setLeftSidebarOpen,
        rightSidebarOpen, toggleRightSidebar, setRightSidebarOpen,
        layoutPreset, setLayoutPreset,
        wordCount, setWordCount,
        diagnostics,
        pushRecentCommand,
    } = useEditorStore();

    // ─── 3. LOCAL UI STATE ───
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [coherenceScore, setCoherenceScore] = useState(null);
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [isSplitMode, setIsSplitMode] = useState(false);
    const [showGoldenThread, setShowGoldenThread] = useState(false);
    const [activeToolDrawer, setActiveToolDrawer] = useState(null); // null | 'generator' | 'tools' | etc.
    const [panelSizes, setPanelSizes] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('writing_panel_sizes');
            if (saved) return JSON.parse(saved);
        }
        return LAYOUT_PRESETS.default;
    });

    const editorRef = useRef(null);
    const panelGroupRef = useRef(null);
    const previousScopeRef = useRef({ projectId: null, chapterId: null });

    // ── Agent state from AgentPanel (unified — no duplicate useAgentLoop) ──
    const [agentPendingDiffs, setAgentPendingDiffs] = useState([]);
    const agentAcceptAllRef = useRef(null);
    const agentRejectAllRef = useRef(null);

    const handlePendingDiffsChange = useCallback((diffs, acceptAllFn, rejectAllFn) => {
        setAgentPendingDiffs(diffs);
        agentAcceptAllRef.current = acceptAllFn;
        agentRejectAllRef.current = rejectAllFn;
    }, []);

    // ─── PHASE 3: Session Store ───
    const { isActive: sessionActive, startSession, endSession: endSessionStore } = useSessionStore();

    // ─── 4. COMMAND PALETTE ───
    const {
        isOpen: showCommandPalette,
        open: openPalette,
        close: closePalette,
        commands: paletteCommands,
        executeCommand,
        getRecentFirst,
    } = useCommandPalette();

    // ─── 5. LISTENERS ───
    useEffect(() => {
        const handleUpgradeTrigger = () => setShowUpgradeModal && setShowUpgradeModal(true);
        if (typeof window !== 'undefined') window.addEventListener(UPGRADE_EVENT, handleUpgradeTrigger);
        return () => window.removeEventListener(UPGRADE_EVENT, handleUpgradeTrigger);
    }, [setShowUpgradeModal]);

    useEffect(() => {
        const previousScope = previousScopeRef.current;

        if (previousScope.projectId && previousScope.chapterId) {
            invalidateCache(previousScope);
        }

        if (projectId && activeChapterId) {
            invalidateCache({ projectId, chapterId: activeChapterId });
        }

        previousScopeRef.current = {
            projectId: projectId || null,
            chapterId: activeChapterId || null,
        };
    }, [projectId, activeChapterId]);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const handleAgentState = (event) => {
            const nextState = event?.detail || {};
            setAgentRunState((prev) => ({
                ...prev,
                ...nextState,
            }));
        };

        window.addEventListener('onthesis-agent-state', handleAgentState);
        return () => window.removeEventListener('onthesis-agent-state', handleAgentState);
    }, []);

    // ─── 6. HANDLERS ───
    const handleInsertToEditor = useCallback((text) => {
        editorRef.current?.insertContent(text);
    }, []);

    const openCitationModal = useCallback(() => {
        setActiveToolDrawer('tools');
        setRightSidebarOpen(true);
    }, [setRightSidebarOpen]);

    const handleRunAI = useCallback((task, inputData = {}) => {
        if (!project) return alert("Pilih Project Dulu!");

        // Rich Context — "Context is King"
        const contextPayload = buildFullContext({
            project,
            projectId,
            chapters,
            activeChapterId,
            chapterId: activeChapterId,
            chapterHtml: editorRef.current?.getHtml(),
            references: project.references,
            selectionHtml: editorRef.current?.getSelectionHtml?.(),
            activeNodeContext: editorRef.current?.getActiveNodeContext?.(),
            goldenThread,
            chapterSummaries, // Sprint 2
            editorRef,        // Sprint 2
        });

        const agentTask = buildAgentTaskInstruction(task, inputData, activeChapterId);
        const payload = {
            task: agentTask,
            projectId,
            chapterId: activeChapterId,
            context: {
                ...contextPayload,
                ...inputData,
                requestedTask: task,
                references_raw: project.references || [],
            }
        };

        window.dispatchEvent(new CustomEvent('onthesis-agent-run-request', {
            detail: {
                ...payload,
                mode: 'planning',
                model: 'llama-70b',
                source: 'writing-studio',
            },
        }));
        if (!rightSidebarOpen) setRightSidebarOpen(true);
    }, [project, projectId, chapters, activeChapterId, goldenThread, chapterSummaries, rightSidebarOpen, setRightSidebarOpen]);

    const handleStopAI = useCallback(() => {
        window.dispatchEvent(new CustomEvent('onthesis-agent-abort-request', {
            detail: { source: 'writing-studio' },
        }));
    }, []);

    const handleLayoutChange = useCallback((sizes) => {
        setPanelSizes(sizes);
        if (typeof window !== 'undefined') {
            localStorage.setItem('writing_panel_sizes', JSON.stringify(sizes));
        }
    }, []);

    // Layout preset handler
    const handleSetLayoutPreset = useCallback((preset) => {
        setLayoutPreset(preset);
        const sizes = LAYOUT_PRESETS[preset] || LAYOUT_PRESETS.default;
        setPanelSizes(sizes);
        if (typeof window !== 'undefined') {
            localStorage.setItem('writing_panel_sizes', JSON.stringify(sizes));
        }
        // If focus mode, collapse left sidebar
        if (preset === 'focus') {
            setLeftSidebarOpen(false);
        } else {
            setLeftSidebarOpen(true);
        }
    }, [setLayoutPreset, setLeftSidebarOpen]);

    // Force save
    const handleForceSave = useCallback(() => {
        const html = editorRef.current?.getHtml();
        if (html) {
            saveContent(html);
            invalidateCache(); // Clear context cache on save
        }
    }, [saveContent]);

    // ─── 7. KEYBOARD SHORTCUTS ───
    useGlobalShortcuts({
        onOpenPalette: openPalette,
        onRunAI: () => handleRunAI('general', { input_text: editorRef.current?.getSelectionHtml?.() || '' }),
        onSave: handleForceSave,
        onToggleZen: toggleZenMode,
        onInsertCitation: openCitationModal,
        onAskSelection: () => {
            const sel = editorRef.current?.getSelectionHtml?.() || '';
            if (sel) handleRunAI('chat', { input_text: `Jelaskan ini: ${sel}` });
        },
        onToggleAgent: toggleRightSidebar,
        onToggleLeftSidebar: toggleLeftSidebar,
    });

    // ─── 8. COMMAND PALETTE CONTEXT ───
    const paletteContext = useMemo(() => ({
        handleRunAI,
        toggleLeftSidebar,
        toggleRightSidebar,
        toggleZen: toggleZenMode,
        focusEditor: () => editorRef.current?.focus?.(),
        openSettings: () => setIsSettingsOpen(true),
        setLayoutPreset: handleSetLayoutPreset,
        forceSave: handleForceSave,
        getSelectionText: () => editorRef.current?.getSelectionHtml?.() || '',
        openCitationModal,
        jumpChapter: (dir) => {
            if (!chapters?.length) return;
            const idx = chapters.findIndex(c => c.id === activeChapterId);
            if (idx === -1) return;
            const nextIdx = dir === 'next' ? Math.min(idx + 1, chapters.length - 1) : Math.max(idx - 1, 0);
            if (chapters[nextIdx]) {
                if (changeActiveChapter) {
                    changeActiveChapter(chapters[nextIdx].id);
                } else if (setActiveChapterId) {
                    setActiveChapterId(chapters[nextIdx].id);
                }
            }
        },
        // Tool Drawers — open floating panels from command palette
        openToolDrawer: (toolId) => {
            setActiveToolDrawer(toolId);
        },
        // Golden Thread — open as floating modal
        openGoldenThread: () => {
            setShowGoldenThread(true);
        },
        // Session
        openSession: () => setShowSessionModal(true),
        // Split Editor
        splitRight: () => setIsSplitMode(true),
        closeSplit: () => setIsSplitMode(false),
    }), [handleRunAI, toggleLeftSidebar, toggleRightSidebar, toggleZenMode, handleSetLayoutPreset, handleForceSave, openCitationModal, chapters, activeChapterId, changeActiveChapter, setActiveChapterId, project, goldenThread, rightSidebarOpen, setRightSidebarOpen]);

    // ─── 9. LOADING SCREEN ───
    if (isLoading) {
        return (
            <div className="h-full w-full flex items-center justify-center font-sans">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                    <span className="text-xs font-medium text-gray-400 tracking-wide">Loading...</span>
                </div>
            </div>
        );
    }

    const currentChapterTitle = chapters?.find(c => c.id === activeChapterId)?.title || "Editor";

    // Build recent commands list for palette
    const { recent: recentCmds } = getRecentFirst();

    /* ─── THEME — Antigravity-style flat tokens ─── */
    const isDark = theme === 'dark';
    const isHappy = theme === 'happy';
    const ts = {
        sidebarBg: isDark ? 'bg-[#0B1120] border-white/[0.06]' : isHappy ? 'bg-[#FFFCF5] border-orange-100/40' : 'bg-[#F9FAFB] border-[#E5E7EB]/60',
        editorBg: isDark ? 'bg-[#0F172A]' : isHappy ? 'bg-[#FFFDF8]' : 'bg-white',
        headerBg: isDark ? 'bg-[#0B1120]/90 border-white/[0.06]' : isHappy ? 'bg-[#FFFCF5]/90 border-orange-100/40' : 'bg-white/90 border-[#E5E7EB]/60',
        textMain: isDark ? 'text-[#E5E7EB]' : isHappy ? 'text-stone-700' : 'text-[#111827]',
        textMuted: isDark ? 'text-[#6B7280]' : isHappy ? 'text-stone-400' : 'text-[#9CA3AF]',
        divider: isDark ? 'border-white/[0.06]' : isHappy ? 'border-orange-100/40' : 'border-[#E5E7EB]',
        btnHover: isDark ? 'hover:bg-white/[0.06]' : isHappy ? 'hover:bg-orange-50' : 'hover:bg-[#F3F4F6]',
        btnText: isDark ? 'text-[#6B7280]' : isHappy ? 'text-stone-400' : 'text-[#9CA3AF]',
        statusBg: isDark ? 'bg-[#0B1120] border-white/[0.06]' : isHappy ? 'bg-[#FFFCF5] border-orange-100/30' : 'bg-[#FAFAFA] border-[#E5E7EB]/50',
    };
    const btnIcon = `w-7 h-7 flex items-center justify-center rounded-md ${ts.btnText} ${ts.btnHover} transition-colors`;

    return (
        <>
            {/* WORKSPACE CONTAINER */}
            <div className={`flex flex-col h-full w-full overflow-hidden font-sans transition-colors duration-300 ${ts.textMain}`}>

                <div className="flex-1 flex overflow-hidden">
                    <PanelGroup direction="horizontal" onLayout={handleLayoutChange} className="flex-1">
                        {/* A. LEFT SIDEBAR */}
                        <Panel defaultSize={panelSizes[0]} minSize={12} collapsible collapsed={!leftSidebarOpen || isZenMode} onCollapse={() => setLeftSidebarOpen(false)} onExpand={() => setLeftSidebarOpen(true)}>
                            <aside className={`h-full border-r ${ts.sidebarBg} flex flex-col`}>
                                <div className="flex-1 overflow-y-auto custom-scrollbar px-0 pt-3">
                                    <ProjectSidebar onInsertCitation={handleInsertToEditor} onOpenSettings={() => setIsSettingsOpen(true)} />
                                </div>
                            </aside>
                        </Panel>

                        <PanelResizeHandle className={`w-[4px] bg-transparent ${isDark ? 'hover:bg-cyan-500/15' : 'hover:bg-blue-500/10'} transition-colors cursor-col-resize`} />

                        {/* B. CENTER CANVAS */}
                        <Panel defaultSize={panelSizes[1]} minSize={35}>
                            <main className={`flex flex-col h-full min-w-0 relative transition-all duration-300 z-10 ${ts.editorBg}`}>

                                {/* ── Minimal Toolbar ── */}
                                {!isZenMode && !sessionActive && (
                                    <header className={`h-[40px] flex items-center justify-between px-3 shrink-0 z-20 sticky top-0 border-b ${ts.headerBg} backdrop-blur-md`}>
                                        {/* Left: sidebar toggle + chapter title */}
                                        <div className="flex items-center gap-2 min-w-0">
                                            <button onClick={toggleLeftSidebar} className={btnIcon} title="Toggle sidebar (Ctrl+B)">
                                                {leftSidebarOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
                                            </button>
                                            <span className={`text-[12px] font-semibold truncate ${ts.textMain} flex items-center gap-1.5`}>
                                                {currentChapterTitle}
                                                {isSaving && <span className={`text-[9px] font-normal ${isDark ? 'text-cyan-400' : 'text-blue-500'} animate-pulse`}>saving</span>}
                                            </span>
                                        </div>

                                        {/* Right: essential actions only */}
                                        <div className="flex items-center gap-0.5">
                                            <button onClick={openPalette} className={`${btnIcon} gap-1`} title="Command Palette (Ctrl+K)">
                                                <Command size={13} />
                                            </button>
                                            <button onClick={toggleRightSidebar} className={btnIcon} title="Toggle Agent (Ctrl+L)">
                                                {rightSidebarOpen ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
                                            </button>
                                        </div>
                                    </header>
                                )}

                                {/* Golden Thread removed from here — now invoked via Command Palette as modal */}

                                {/* ── Sprint 6: AcceptAll Banner (from AgentPanel) ── */}
                                {agentPendingDiffs?.length > 0 && (
                                    <AcceptAllBanner
                                        count={agentPendingDiffs.length}
                                        onAcceptAll={() => agentAcceptAllRef.current?.()}
                                        onRejectAll={() => agentRejectAllRef.current?.()}
                                    />
                                )}

                                {/* EDITOR AREA */}
                                <div className={`flex-1 overflow-hidden relative ${ts.editorBg} flex`} id="editor-scroller">
                                    <div className={`${isSplitMode ? 'w-1/2' : 'w-full'} h-full transition-all duration-300`}>
                                        {isContentLoading ? (
                                            <div className="flex h-full flex-col items-center justify-center opacity-40">
                                                <Loader2 className="w-6 h-6 text-gray-400 animate-spin mb-2" />
                                                <p className={`text-xs font-medium ${ts.textMuted}`}>Loading Content...</p>
                                            </div>
                                        ) : (
                                            <React.Suspense fallback={
                                                <div className="flex h-full flex-col items-center justify-center opacity-40">
                                                    <Loader2 className="w-6 h-6 text-gray-400 animate-spin mb-2" />
                                                    <p className={`text-xs font-medium ${ts.textMuted}`}>Loading Editor...</p>
                                                </div>
                                            }>
                                                <LexicalEditor
                                                    key={activeChapterId} ref={editorRef}
                                                    projectId={projectId} activeChapterId={activeChapterId}
                                                    initialContent={content} isStreaming={status === 'streaming'}
                                                    projectContext={project} onSave={saveContent}
                                                    references={references} // [NEW] Untuk @ Mention
                                                    hideRibbon={sessionActive}
                                                    onUpdateSummary={updateChapterSummary}
                                                />
                                            </React.Suspense>
                                        )}
                                    </div>

                                    {/* Phase 4: Split Editor Panel */}
                                    {isSplitMode && (
                                        <React.Suspense fallback={
                                            <div className="w-1/2 flex items-center justify-center opacity-40">
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            </div>
                                        }>
                                            <div className="w-1/2 h-full">
                                                <SplitEditorContainer onClose={() => setIsSplitMode(false)} />
                                            </div>
                                        </React.Suspense>
                                    )}
                                </div>

                                {/* ── Status Bar — Premium MS Word Style ── */}
                                {!isZenMode && (
                                    <div className={`h-[28px] flex items-center justify-between px-4 shrink-0 border-t text-[11px] ${ts.statusBg} ${ts.textMuted} font-medium tracking-wide`}>
                                        {/* Left side: Pages, Words, Language */}
                                        <div className="flex items-center gap-4">
                                            {/* Page Estimator: approx 250 words per page */}
                                            <span className="tabular-nums hover:text-gray-700 dark:hover:text-gray-300 cursor-default transition-colors">
                                                Halaman {Math.max(1, Math.ceil(wordCount / 250))} dari {Math.max(1, Math.ceil(wordCount / 250))}
                                            </span>
                                            <span className="tabular-nums hover:text-gray-700 dark:hover:text-gray-300 cursor-default transition-colors">
                                                {wordCount} kata
                                            </span>
                                            <span className="flex items-center gap-1.5 hover:text-gray-700 dark:hover:text-gray-300 cursor-default transition-colors">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>
                                                Indonesian (ID)
                                            </span>
                                        </div>

                                        {/* Right side: Status, Tools, Shortcuts */}
                                        <div className="flex items-center gap-3">
                                            {status === 'streaming' ? (
                                                <span className={`flex items-center gap-1.5 font-semibold ${isDark ? 'text-cyan-400' : 'text-blue-600'} animate-pulse`}>
                                                    <Loader2 size={11} className="animate-spin" />
                                                    {STREAM_PHASE_LABELS[phase] || 'Memproses AI...'}
                                                </span>
                                            ) : (
                                                <div className="flex items-center gap-3">
                                                    {diagnostics.length > 0 ? (
                                                        <span className="flex items-center gap-1.5 text-amber-500 hover:text-amber-600 cursor-pointer transition-colors" title={`${diagnostics.length} issues found`}>
                                                            <AlertTriangle size={11} />
                                                            {diagnostics.length} issue{diagnostics.length !== 1 ? 's' : ''}
                                                        </span>
                                                    ) : (
                                                        <span className={`flex items-center gap-1.5 ${isDark ? 'text-emerald-400/80' : 'text-emerald-600/80'} hover:opacity-100 cursor-pointer transition-opacity`} title="No issues">
                                                            <CheckCircle2 size={11} />
                                                            Dokumen bersih
                                                        </span>
                                                    )}
                                                    {coherenceScore != null && (
                                                        <span className={`flex items-center gap-1.5 font-bold ${coherenceScore >= 80 ? (isDark ? 'text-emerald-400' : 'text-emerald-600')
                                                            : coherenceScore >= 60 ? 'text-amber-500'
                                                                : 'text-red-500'
                                                            }`} title={`Skor Koherensi: ${coherenceScore}`}>
                                                            ◆ {coherenceScore}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            <div className="w-[1px] h-3 bg-gray-300 dark:bg-gray-700 mx-1" />
                                            <VoiceMeterPopover getEditorContent={() => editorRef.current?.getHtml()} />
                                            <div className="w-[1px] h-3 bg-gray-300 dark:bg-gray-700 mx-1" />
                                            <span className="opacity-60 flex items-center gap-1 font-mono text-[10px]">
                                                <Command size={10} />K <span className="mx-0.5">•</span> L
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* HUD Zen Mode */}
                                {isZenMode && (
                                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in zoom-in-95 duration-300">
                                        <button
                                            onClick={() => setZenMode(false)}
                                            className="px-4 py-2 rounded-lg bg-[#333] text-white border border-white/10 text-xs font-bold shadow-lg hover:bg-black transition-all flex items-center gap-2"
                                        >
                                            <Minimize2 size={12} /> EXIT ZEN MODE
                                        </button>
                                    </div>
                                )}
                            </main>
                        </Panel>

                        <PanelResizeHandle className={`w-[4px] bg-transparent ${isDark ? 'hover:bg-cyan-500/15' : 'hover:bg-blue-500/10'} transition-colors cursor-col-resize`} />

                        {/* C. RIGHT SIDEBAR */}
                        <Panel defaultSize={panelSizes[2]} minSize={15} collapsible collapsed={!rightSidebarOpen || isZenMode} onCollapse={() => setRightSidebarOpen(false)} onExpand={() => setRightSidebarOpen(true)}>
                            <aside className={`h-full border-l ${ts.sidebarBg} flex flex-col`}>
                                <AgentPanel
                                    editorRef={editorRef}
                                    projectId={projectId || project?.id}
                                    activeChapterId={activeChapterId}
                                    onPendingDiffsChange={handlePendingDiffsChange}
                                />
                            </aside>
                        </Panel>
                    </PanelGroup>
                </div>

                <ProjectSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
                <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal && setShowUpgradeModal(false)} />

                {/* Phase 3: Session Modal + HUD */}
                <SessionSetupModal
                    isOpen={showSessionModal}
                    onClose={() => setShowSessionModal(false)}
                    onStart={({ duration, wordGoal, targetChapter }) => {
                        startSession({ duration, wordGoal, targetChapter, currentWordCount: wordCount });
                        setLeftSidebarOpen(false);
                        setRightSidebarOpen(false);
                    }}
                />
                <SessionHUD />
            </div>

            {/* Command Palette */}
            <CommandPalette
                open={showCommandPalette}
                onClose={closePalette}
                commands={paletteCommands}
                context={paletteContext}
                onExecute={(id, ctx) => {
                    commandRegistry.execute(id, ctx);
                    pushRecentCommand(id);
                    closePalette();
                }}
                recentCommands={recentCmds}
            />

            {/* ── Golden Thread Modal (invoked via Cmd+K → "Golden Thread") ── */}
            <GoldenThreadModal
                open={showGoldenThread}
                onClose={() => setShowGoldenThread(false)}
                onCoherenceUpdate={setCoherenceScore}
                getEditorContent={() => editorRef.current?.getHtml()}
            />

            {/* ── Tool Drawer (invoked via Cmd+K → tool commands) ── */}
            {activeToolDrawer && TOOL_DRAWER_CONFIG[activeToolDrawer] && (
                <ToolDrawer
                    open={true}
                    onClose={() => setActiveToolDrawer(null)}
                    title={TOOL_DRAWER_CONFIG[activeToolDrawer].title}
                    icon={<span className="text-base">{TOOL_DRAWER_CONFIG[activeToolDrawer].icon}</span>}
                    position={TOOL_DRAWER_CONFIG[activeToolDrawer].position}
                >
                    <React.Suspense fallback={
                        <div className="flex items-center justify-center h-32 text-xs opacity-40">
                            <Loader2 className="w-5 h-5 animate-spin" />
                        </div>
                    }>
                        <div className="p-4">
                            {activeToolDrawer === 'generator' && (
                                <GeneratorTab
                                    status={status} streamData={streamData} error={error}
                                    onRunAI={handleRunAI} onStop={handleStopAI} onInsert={handleInsertToEditor}
                                    getEditorContent={() => editorRef.current?.getHtml()}
                                    activeChapterId={activeChapterId} chapters={chapters} projectData={project}
                                    isPro={isPro} editorRef={editorRef}
                                />
                            )}
                            {activeToolDrawer === 'tools' && (
                                <ToolsTab
                                    status={status} streamData={streamData} error={error}
                                    onRunAI={handleRunAI} onStop={handleStopAI} onInsert={handleInsertToEditor}
                                    projectId={projectId || project?.id}
                                    getEditorContent={() => editorRef.current?.getHtml()}
                                    activeChapterId={activeChapterId} chapters={chapters} projectData={project}
                                    isPro={isPro} editorRef={editorRef}
                                />
                            )}
                            {activeToolDrawer === 'context' && <ContextTab />}
                            {activeToolDrawer === 'analysis' && <AnalysisTab projectId={project?.id} onInsert={handleInsertToEditor} />}
                            {activeToolDrawer === 'logic' && <LogicTab projectData={project} />}
                            {activeToolDrawer === 'thread' && <ArgumentGraph onJumpToParagraph={() => { }} />}
                            {activeToolDrawer === 'dupes' && <DuplicateRadar getEditorContent={() => editorRef.current?.getHtml()} />}
                            {activeToolDrawer === 'planner' && <PlannerTab projectData={project} liveRunStatus={status} liveRunPhase={phase} />}
                            {activeToolDrawer === 'defense' && <DefenseTab projectData={project} />}
                        </div>
                    </React.Suspense>
                </ToolDrawer>
            )}
        </>
    );
}
