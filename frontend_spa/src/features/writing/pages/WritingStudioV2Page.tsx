/**
 * WritingStudioV2Page — Blueprint §2 + §5 Integration
 *
 * This page wires the new WritingStudioLayout (CSS Grid shell) with
 * existing, working components:
 *   - LexicalEditor (refactor target, works as-is)
 *   - AgentPanel (rebuild target, works as-is for now)
 *   - ProjectContext (existing context provider)
 *
 * Blueprint ref: onthesis-frontend-blueprint.md §2, §5
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { WritingStudioLayout } from '@/layouts/WritingStudioLayout';
import { useProject } from '../context/ProjectContext.jsx';
import { useEditorStore } from '@/store/editorStore';
import { buildFullContext, invalidateCache } from '../context/ContextBuilder.js';
import type { TreeSectionItem, FileStatus } from '../components/FileTree';

// Existing components (will be refactored later but work as-is)
const LexicalEditor = React.lazy(() => import('../components/Editor/LexicalEditor.jsx'));
import AgentPanel from '../components/Assistant/AgentPanel.jsx';
import { EditDuluModal } from '../components/Editor/EditDuluModal';
import { QuickAgentCommand } from '../components/Editor/QuickAgentCommand';
import { EditorContextMenu } from '../components/Editor/EditorContextMenu';
import { DIFF_EDIT_EVENT } from '../components/Editor/nodes/DiffBlockComponent.jsx';
import { ExportModal } from '../components/ExportModal';
import { OnboardingInterview } from '../components/Onboarding/OnboardingInterview';
import { GeneratingStructure } from '../components/Onboarding/GeneratingStructure';

// ── Helpers ──

function chapterStatusToFileStatus(chapter: any): FileStatus {
    if (!chapter) return 'empty';
    if (chapter.status === 'generating') return 'generating';
    if (chapter.status === 'error') return 'error';
    if (chapter.wordCount > 0 || chapter.content) return 'done';
    return 'empty';
}

function buildFileTreeSections(chapters: any[], activeChapterId?: string, pendingDiffsCount: number = 0): TreeSectionItem[] {
    if (!chapters?.length) return [];

    const mapChapter = (c: any) => ({
        id: c.id,
        name: c.title || c.id,
        status: chapterStatusToFileStatus(c),
        wordCount: c.wordCount || 0,
        pendingDiffs: c.id === activeChapterId ? pendingDiffsCount : (c.pendingDiffs || 0),
    });

    const thesisFiles = chapters
        .filter((c: any) => !c.id?.includes('daftar_pustaka') && !c.id?.includes('referensi'))
        .map(mapChapter);

    const refFiles = chapters
        .filter((c: any) => c.id?.includes('daftar_pustaka') || c.id?.includes('referensi'))
        .map(mapChapter);

    const sections: TreeSectionItem[] = [
        { label: 'DRAFT THESIS', files: thesisFiles },
    ];

    if (refFiles.length > 0) {
        sections.push({ label: 'REFERENSI', files: refFiles });
    }

    return sections;
}

// ── Page Component ──

export default function WritingStudioV2Page() {
    const {
        project, projectId, activeChapterId, chapters, content,
        isSaving, isLoading, isContentLoading,
        saveContent, changeActiveChapter, setActiveChapterId,
        goldenThread, references,
        updateChapterSummary, chapterSummaries,
    } = useProject();

    const { wordCount, setWordCount } = useEditorStore();
    const editorRef = useRef<any>(null);
    const previousScopeRef = useRef<{ projectId: string | null; chapterId: string | null }>({
        projectId: null,
        chapterId: null,
    });

    // ── Agent state ──
    const [agentRunState, setAgentRunState] = useState({
        status: 'idle' as 'idle' | 'streaming' | 'error',
        phase: 'idle',
    });

    const [agentPendingDiffs, setAgentPendingDiffs] = useState<any[]>([]);

    const [exportModalOpen, setExportModalOpen] = useState(false);

    // ── Onboarding State ──
    const [onboardingStep, setOnboardingStep] = useState<'none' | 'interview' | 'generating'>('none');

    // Trigger onboarding for new projects
    useEffect(() => {
        if (!isLoading && project?.title === 'Project Baru' && !sessionStorage.getItem('onboardingDone')) {
            setOnboardingStep('interview');
        }
    }, [isLoading, project?.title]);

    const handleOnboardingComplete = useCallback((answers: Record<string, string>) => {
        // Here we could save answers to profile
        setOnboardingStep('generating');
    }, []);

    const handleGeneratingComplete = useCallback(() => {
        sessionStorage.setItem('onboardingDone', 'true');
        setOnboardingStep('none');
    }, []);

    const handlePendingDiffsChange = useCallback((diffs: any[], _acceptAll: any, _rejectAll: any) => {
        setAgentPendingDiffs(diffs);
    }, []);

    // ── Edit Dulu modal state (Blueprint §7.3) ──
    const [editDuluState, setEditDuluState] = useState<{
        open: boolean;
        diffId: string;
        newHtml: string;
    }>({ open: false, diffId: '', newHtml: '' });

    // Listen for 'onthesis-diff-edit' from DiffBlockComponent
    useEffect(() => {
        const handler = (e: CustomEvent) => {
            const { diffId, newHtml } = e.detail;
            setEditDuluState({ open: true, diffId, newHtml: newHtml || '' });
        };
        window.addEventListener(DIFF_EDIT_EVENT, handler as EventListener);
        return () => window.removeEventListener(DIFF_EDIT_EVENT, handler as EventListener);
    }, []);

    const handleEditDuluAccept = useCallback((diffId: string, editedText: string) => {
        // Dispatch a modified accept: update the diff's new_text, then accept
        window.dispatchEvent(new CustomEvent('onthesis-inject-diff-accept-edited', {
            detail: { diffId, editedText },
        }));
        // Also dispatch regular accept to trigger commit in useAgentLoop
        window.dispatchEvent(new CustomEvent('onthesis-diff-accept', {
            detail: { diffId, editedText },
        }));
        setEditDuluState({ open: false, diffId: '', newHtml: '' });
    }, []);

    const handleEditDuluClose = useCallback(() => {
        setEditDuluState({ open: false, diffId: '', newHtml: '' });
    }, []);

    // ── Quick Agent Command ⌘K (Blueprint §5.3) ──
    const [quickCmdOpen, setQuickCmdOpen] = useState(false);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setQuickCmdOpen(v => !v);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const handleQuickCommand = useCallback((command: string) => {
        // Dispatch to AgentPanel via CustomEvent
        window.dispatchEvent(new CustomEvent('onthesis-agent-run-request', {
            detail: {
                task: command,
                projectId: projectId || project?.id,
                chapterId: activeChapterId,
            },
        }));
    }, [projectId, project?.id, activeChapterId]);

    // ── Context Menu (Blueprint §5.4) ──
    const [contextMenu, setContextMenu] = useState<{
        visible: boolean; x: number; y: number; selectedText: string; targetKey?: string;
    }>({ visible: false, x: 0, y: 0, selectedText: '', targetKey: '' });

    useEffect(() => {
        const handler = (e: CustomEvent) => {
            const { x, y, selectedText, targetKey } = e.detail;
            if (selectedText?.trim()) {
                setContextMenu({ visible: true, x, y, selectedText, targetKey });
            }
        };
        window.addEventListener('onthesis-editor-context-menu', handler as EventListener);
        return () => window.removeEventListener('onthesis-editor-context-menu', handler as EventListener);
    }, []);

    const inferContextMenuIntent = (prompt: string) => {
        const normalized = prompt.toLowerCase();
        if (normalized.includes('parafrase')) return 'paraphrase';
        if (normalized.includes('panjangkan') || normalized.includes('kembangkan')) return 'expand_paragraph';
        return 'rewrite_paragraph';
    };

    const handleContextAction = useCallback((prompt: string, _text: string) => {
        const intent = inferContextMenuIntent(prompt);
        window.dispatchEvent(new CustomEvent('onthesis-agent-run-request', {
            detail: {
                task: prompt,
                projectId: projectId || project?.id,
                chapterId: activeChapterId,
                selectedText: contextMenu.selectedText,
                targetKey: contextMenu.targetKey,
                source: 'context_menu',
                intent,
            },
        }));
    }, [projectId, project?.id, activeChapterId, contextMenu.selectedText, contextMenu.targetKey]);

    // ── Cache invalidation on scope change ──
    useEffect(() => {
        const prev = previousScopeRef.current;
        if (prev.projectId && prev.chapterId) invalidateCache(prev);
        if (projectId && activeChapterId) invalidateCache({ projectId, chapterId: activeChapterId });
        previousScopeRef.current = { projectId: projectId || null, chapterId: activeChapterId || null };
    }, [projectId, activeChapterId]);

    // ── Listen for agent state events ──
    useEffect(() => {
        const handler = (event: CustomEvent) => {
            const detail = event?.detail || {};
            setAgentRunState((prev) => ({ ...prev, ...detail }));
        };
        window.addEventListener('onthesis-agent-state', handler as EventListener);
        return () => window.removeEventListener('onthesis-agent-state', handler as EventListener);
    }, []);

    // ── Handlers ──
    const handleFileSelect = useCallback((fileId: string) => {
        if (changeActiveChapter) changeActiveChapter(fileId);
        else if (setActiveChapterId) setActiveChapterId(fileId);
    }, [changeActiveChapter, setActiveChapterId]);

    const handleSave = useCallback(() => {
        const html = editorRef.current?.getHtml();
        if (html) {
            saveContent(html, { mode: 'flush' });
            invalidateCache();
        }
    }, [saveContent]);

    const handleExport = useCallback(() => {
        setExportModalOpen(true);
    }, []);

    // ── Derived state ──
    const fileTreeSections = useMemo(() => buildFileTreeSections(chapters, activeChapterId, agentPendingDiffs?.length || 0), [chapters, activeChapterId, agentPendingDiffs]);
    const currentChapterTitle = chapters?.find((c: any) => c.id === activeChapterId)?.title || 'Pendahuluan';
    const lastSavedTime = isSaving ? undefined : 'baru saja';

    const agentStatus: 'idle' | 'active' | 'error' =
        agentRunState.status === 'streaming' ? 'active'
            : agentRunState.status === 'error' ? 'error'
                : 'idle';

    // ── Loading state ──
    if (isLoading) {
        return (
            <div style={{
                height: '100vh',
                width: '100vw',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--ws-bg-base, #070d14)',
                color: 'var(--ws-text-muted, #445566)',
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <Loader2 size={24} className="animate-spin" />
                    <span style={{ fontFamily: 'var(--ws-font-ui)', fontSize: '12px' }}>
                        Memuat Writing Studio...
                    </span>
                </div>
            </div>
        );
    }

    if (onboardingStep === 'interview') {
        return <OnboardingInterview onComplete={handleOnboardingComplete} />;
    }

    if (onboardingStep === 'generating') {
        return <GeneratingStructure onComplete={handleGeneratingComplete} />;
    }

    return (
        <>
        <WritingStudioLayout
            // TopBar
            projectName={project?.title || project?.name || 'Untitled'}
            isSaving={isSaving}
            lastSaved={lastSavedTime}
            onSave={handleSave}
            onExport={handleExport}
            userInitial="U"
            // FileTree
            sections={fileTreeSections}
            activeFileId={activeChapterId}
            onFileSelect={handleFileSelect}
            // StatusBar
            sectionName={currentChapterTitle}
            agentStatus={agentStatus}
            // Slots
            editorSlot={
                isContentLoading ? (
                    <div style={{
                        display: 'flex',
                        height: '100%',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <Loader2 size={20} className="animate-spin" style={{ opacity: 0.4 }} />
                    </div>
                ) : (
                    <React.Suspense fallback={
                        <div style={{
                            display: 'flex',
                            height: '100%',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Loader2 size={20} className="animate-spin" style={{ opacity: 0.4 }} />
                        </div>
                    }>
                        <LexicalEditor
                            key={activeChapterId}
                            ref={editorRef}
                            projectId={projectId}
                            activeChapterId={activeChapterId}
                            initialContent={content}
                            isStreaming={agentRunState.status === 'streaming'}
                            projectContext={project}
                            onSave={saveContent}
                            references={references}
                            onUpdateSummary={updateChapterSummary}
                        />
                    </React.Suspense>
                )
            }
            agentSlot={
                <AgentPanel
                    editorRef={editorRef}
                    projectId={projectId || project?.id}
                    activeChapterId={activeChapterId}
                    onPendingDiffsChange={handlePendingDiffsChange}
                />
            }
        />

        {/* Blueprint §7.3: Edit Dulu Modal */}
        <EditDuluModal
            open={editDuluState.open}
            diffId={editDuluState.diffId}
            initialText={editDuluState.newHtml}
            onAccept={handleEditDuluAccept}
            onClose={handleEditDuluClose}
        />

        {/* Blueprint §5.3: Quick Agent Command (⌘K) */}
        <QuickAgentCommand
            open={quickCmdOpen}
            onClose={() => setQuickCmdOpen(false)}
            onSubmit={handleQuickCommand}
        />

        {/* Blueprint §5.4: Context Menu */}
        <EditorContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            visible={contextMenu.visible}
            selectedText={contextMenu.selectedText}
            onClose={() => setContextMenu(prev => ({ ...prev, visible: false }))}
            onAction={handleContextAction}
        />

        {/* Blueprint §3.4: Export Modal */}
        <ExportModal
            open={exportModalOpen}
            projectId={projectId || project?.id}
            activeChapterId={activeChapterId}
            activeChapterName={currentChapterTitle}
            projectName={project?.title || project?.name || 'Untitled'}
            onClose={() => setExportModalOpen(false)}
        />
    </>
    );
}
