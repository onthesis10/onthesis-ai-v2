// ─── useAgentLoop — Agentic Multi-Step AI State Machine (Sprint 5 Extended) ───
// States: IDLE → PLANNING → EXECUTING → REVIEWING → DONE
// Parses SSE events from /api/agent/run for real-time progress.
// Sprint 5: Added pendingDiffs, acceptDiff, rejectDiff, acceptAll, rejectAll
// Bugfix: Stale closure fix (useRef for _handleEvent)
// Bugfix: Firestore persistence after acceptDiff via onSave callback
// Bugfix: Track resolved diffs for history UI

import { useState, useRef, useCallback, useEffect } from 'react';
import { $generateHtmlFromNodes } from '@lexical/html';
import { applyDiffHighlight, commitDiff, revertDiff } from '../components/Editor/plugins/EditorDiffBridge.js';

const AGENT_API = '/api/agent/run';

const AGENT_STATES = {
    IDLE: 'IDLE',
    PLANNING: 'PLANNING',
    EXECUTING: 'EXECUTING',
    REVIEWING: 'REVIEWING',
    EVALUATING: 'EVALUATING',
    REVISING: 'REVISING',
    DONE: 'DONE',
    ERROR: 'ERROR',
};

/**
 * Helper: Get Lexical editor instance from editorRef.
 * editorRef.current._lexicalEditor is the raw Lexical editor
 * exposed by EditorRefPlugin in LexicalEditor.jsx.
 */
function _getLexicalEditor(editorRef) {
    return editorRef?.current?._lexicalEditor || null;
}

/**
 * Agentic loop hook with diff management.
 * @param {Object} options
 * @param {Object} options.editorRef - Ref to Lexical editor API object
 * @param {string} options.projectId - Current project ID
 * @param {string} options.chapterId - Current active chapter ID
 * @param {Function} options.onSave - Callback to persist content to Firestore (receives HTML string)
 */
export function useAgentLoop({ editorRef, projectId, chapterId, onSave } = {}) {
    const [agentState, setAgentState] = useState(AGENT_STATES.IDLE);
    const [steps, setSteps] = useState([]);
    const [currentStep, setCurrentStep] = useState(null);
    const [generatedText, setGeneratedText] = useState('');
    const [error, setError] = useState(null);
    const [startTime, setStartTime] = useState(null);

    // Sprint 5: Pending diffs from agent tool calls
    const [pendingDiffs, setPendingDiffs] = useState([]);
    // Sprint 5: Tool call tracking
    const [toolCalls, setToolCalls] = useState([]);
    // Bugfix 3: Track resolved diffs (diffId → 'accepted' | 'rejected')
    const [resolvedDiffs, setResolvedDiffs] = useState({});

    // ── Sprint 6 (Phase 4): Diagnostic events tracking ──
    const [citationFlags, setCitationFlags] = useState([]);
    const [incoherenceWarnings, setIncoherenceWarnings] = useState([]);

    const abortRef = useRef(null);
    // Bugfix 1: Ref to always hold the latest _handleEvent callback
    const handleEventRef = useRef(null);

    /**
     * Handle a single SSE event.
     * IMPORTANT: Defined BEFORE runAgent, stored in handleEventRef
     * so runAgent always calls the latest version (avoids stale closure).
     */
    const _handleEvent = useCallback((event) => {
        const { type } = event;

        switch (type) {
            case 'STEP':
                setCurrentStep({ type, ...event });
                setSteps((prev) => [...prev, event]);
                if (event.step === 'planning') setAgentState(AGENT_STATES.PLANNING);
                else if (event.step === 'executing') setAgentState(AGENT_STATES.EXECUTING);
                else if (event.step === 'reviewing') setAgentState(AGENT_STATES.REVIEWING);
                else if (event.step === 'evaluating') setAgentState(AGENT_STATES.EVALUATING);
                else if (event.step === 'revising') setAgentState(AGENT_STATES.REVISING);
                break;

            case 'TOOL_CALL':
                setCurrentStep({ type, ...event });
                setSteps((prev) => [...prev, event]);
                setAgentState(AGENT_STATES.EXECUTING);
                setToolCalls((prev) => [...prev, {
                    id: event.id,
                    tool: event.tool,
                    args: event.args,
                    status: 'running',
                }]);
                break;

            case 'TOOL_RESULT':
                setSteps((prev) => [...prev, event]);
                setToolCalls((prev) => prev.map(t =>
                    t.id === event.id ? { ...t, status: 'done', result: event.result } : t
                ));
                break;

            // ── Sprint 5: Handle pending diff from agent ──
            case 'PENDING_DIFF':
                if (event.diff) {
                    setPendingDiffs((prev) => [...prev, event.diff]);
                    // Apply visual highlight in editor
                    const editor = _getLexicalEditor(editorRef);
                    if (editor) {
                        try {
                            applyDiffHighlight(editor, event.diff);
                        } catch (e) {
                            console.warn('[AgentLoop] Could not apply diff highlight:', e);
                        }
                    }
                }
                setSteps((prev) => [...prev, event]);
                break;

            // ── Phase 4: Handle Diagnostic Events ──
            case 'CITATION_FLAG':
                if (event.citation_flag) {
                    setCitationFlags((prev) => [...prev, event.citation_flag]);
                    // Here we could also apply a different Lexical highlight (e.g. red underline)
                }
                setSteps((prev) => [...prev, event]);
                break;

            case 'INCOHERENCE_WARNING':
                if (event.warning) {
                    setIncoherenceWarnings((prev) => [...prev, event.warning]);
                }
                setSteps((prev) => [...prev, event]);
                break;

            case 'TEXT_DELTA':
                setGeneratedText((prev) => prev + (event.delta || ''));
                break;

            case 'DONE':
                setSteps((prev) => [...prev, event]);
                setAgentState(AGENT_STATES.DONE);
                break;

            case 'ERROR':
                setError(event.message || 'Unknown agent error');
                setAgentState(AGENT_STATES.ERROR);
                break;

            default:
                console.warn('[AgentLoop] Unknown event type:', type);
        }
    }, [editorRef]);

    // Bugfix 1: Always keep ref pointing to latest _handleEvent
    handleEventRef.current = _handleEvent;

    /**
     * Run the agent with a task and context.
     * @param {string} task - The user's natural language instruction
     * @param {Object} context - Rich context object from ContextBuilder
     * @param {Array} [messages] - Optional conversation history
     */
    const runAgent = useCallback(async (task, context = {}, messages = null, options = {}) => {
        // Reset state
        setSteps([]);
        setCurrentStep(null);
        setGeneratedText('');
        setError(null);
        // Don't clear pendingDiffs — let user accept/reject them even across runs
        // setPendingDiffs([]);  // REMOVED: diffs persist until user acts on them
        setToolCalls([]);
        setAgentState(AGENT_STATES.PLANNING);
        setStartTime(Date.now());

        abortRef.current = new AbortController();

        try {
            const body = {
                task,
                context,
                projectId: projectId || '',
                chapterId: chapterId || '',
            };

            // Include model and mode if provided
            if (options.model) body.model = options.model;
            if (options.mode) body.mode = options.mode;

            // Include message history if provided
            if (messages && messages.length > 0) {
                body.messages = messages;
            }

            const response = await fetch(AGENT_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: abortRef.current.signal,
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Agent failed with status ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Process SSE lines
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith('data:')) continue;

                    const jsonStr = trimmed.replace(/^data:\s*/, '');
                    if (jsonStr === '[DONE]') continue;

                    try {
                        const event = JSON.parse(jsonStr);
                        // Bugfix 1: Use ref to always call latest _handleEvent
                        handleEventRef.current(event);
                    } catch {
                        // Not JSON, skip
                    }
                }
            }

            // Ensure we move to DONE if still running
            setAgentState((prev) => {
                if (prev !== AGENT_STATES.ERROR && prev !== AGENT_STATES.IDLE) {
                    return AGENT_STATES.DONE;
                }
                return prev;
            });

        } catch (err) {
            if (err.name === 'AbortError') {
                setAgentState(AGENT_STATES.IDLE);
            } else {
                setError(err.message);
                setAgentState(AGENT_STATES.ERROR);
            }
        }
    }, [projectId, chapterId]);

    /**
     * Helper: Persist current editor content to Firestore via onSave callback.
     */
    const _persistToFirestore = useCallback(() => {
        if (!onSave) return;
        const editor = _getLexicalEditor(editorRef);
        if (!editor) return;

        try {
            editor.read(() => {
                const html = $generateHtmlFromNodes(editor, null);
                onSave(html);
            });
        } catch (e) {
            console.warn('[AgentLoop] Failed to persist after diff accept:', e);
        }
    }, [editorRef, onSave]);

    // ── Sprint 5: Accept a single diff ──
    const acceptDiff = useCallback((diffId) => {
        const diff = pendingDiffs.find(d => d.diffId === diffId);
        if (!diff) return;

        const editor = _getLexicalEditor(editorRef);
        if (editor) {
            try {
                commitDiff(editor, diff);
            } catch (e) {
                console.error('[AgentLoop] Failed to commit diff:', e);
            }
        }

        // Bugfix 3: Track as resolved
        setResolvedDiffs((prev) => ({ ...prev, [diffId]: 'accepted' }));
        setPendingDiffs((prev) => prev.filter(d => d.diffId !== diffId));

        // Bugfix 2: Persist to Firestore immediately after commit
        // Small timeout to let Lexical state settle after editor.update()
        setTimeout(() => _persistToFirestore(), 100);
    }, [pendingDiffs, editorRef, _persistToFirestore]);

    // ── Sprint 5: Reject a single diff ──
    const rejectDiff = useCallback((diffId) => {
        const diff = pendingDiffs.find(d => d.diffId === diffId);
        if (!diff) return;

        const editor = _getLexicalEditor(editorRef);
        if (editor) {
            try {
                revertDiff(editor, diff);
            } catch (e) {
                console.warn('[AgentLoop] Failed to revert diff:', e);
            }
        }

        // Bugfix 3: Track as resolved
        setResolvedDiffs((prev) => ({ ...prev, [diffId]: 'rejected' }));
        setPendingDiffs((prev) => prev.filter(d => d.diffId !== diffId));
    }, [pendingDiffs, editorRef]);

    // ── Sprint 5: Accept all pending diffs ──
    const acceptAll = useCallback(() => {
        const editor = _getLexicalEditor(editorRef);
        const resolved = {};
        pendingDiffs.forEach(diff => {
            if (editor) {
                try {
                    commitDiff(editor, diff);
                } catch (e) {
                    console.error('[AgentLoop] Failed to commit diff:', e);
                }
            }
            resolved[diff.diffId] = 'accepted';
        });
        // Bugfix 3: Track all as resolved
        setResolvedDiffs((prev) => ({ ...prev, ...resolved }));
        setPendingDiffs([]);

        // Bugfix 2: Persist after all commits
        setTimeout(() => _persistToFirestore(), 150);
    }, [pendingDiffs, editorRef, _persistToFirestore]);

    // ── Sprint 5: Reject all pending diffs ──
    const rejectAll = useCallback(() => {
        const editor = _getLexicalEditor(editorRef);
        const resolved = {};
        pendingDiffs.forEach(diff => {
            if (editor) {
                try {
                    revertDiff(editor, diff);
                } catch (e) {
                    console.warn('[AgentLoop] Failed to revert diff:', e);
                }
            }
            resolved[diff.diffId] = 'rejected';
        });
        // Bugfix 3: Track all as resolved
        setResolvedDiffs((prev) => ({ ...prev, ...resolved }));
        setPendingDiffs([]);
    }, [pendingDiffs, editorRef]);

    /**
     * Bugfix 3: Get the resolution status of a diff.
     * @param {string} diffId
     * @returns {'accepted' | 'rejected' | 'pending'}
     */
    const getDiffStatus = useCallback((diffId) => {
        if (resolvedDiffs[diffId]) return resolvedDiffs[diffId];
        if (pendingDiffs.find(d => d.diffId === diffId)) return 'pending';
        return resolvedDiffs[diffId] || 'unknown';
    }, [resolvedDiffs, pendingDiffs]);

    /**
     * Abort the running agent.
     */
    const abort = useCallback(() => {
        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }
        setAgentState(AGENT_STATES.IDLE);
        setCurrentStep(null);
    }, []);

    /**
     * Reset to initial state.
     */
    const reset = useCallback(() => {
        setAgentState(AGENT_STATES.IDLE);
        setSteps([]);
        setCurrentStep(null);
        setGeneratedText('');
        setError(null);
        setPendingDiffs([]);
        setToolCalls([]);
        setResolvedDiffs({});
        setStartTime(null);
    }, []);

    // ── Sprint 7: Listen for CustomEvents from DiffBlockComponent ──
    useEffect(() => {
        const handleDiffAccept = (e) => acceptDiff(e.detail.diffId);
        const handleDiffReject = (e) => rejectDiff(e.detail.diffId);

        window.addEventListener('onthesis-diff-accept', handleDiffAccept);
        window.addEventListener('onthesis-diff-reject', handleDiffReject);

        // ── Sprint 3: Listen for manual diff injections (for testing) ──
        const handleInjectDiff = (e) => {
            const diff = e.detail.diff;
            if (!diff) return;

            setPendingDiffs((prev) => {
                if (prev.find(d => d.diffId === diff.diffId)) return prev;
                return [...prev, diff];
            });

            const editor = _getLexicalEditor(editorRef);
            if (editor) {
                setTimeout(() => {
                    try {
                        applyDiffHighlight(editor, diff);
                    } catch (err) {
                        console.warn('[AgentLoop] Failed to apply injected diff:', err);
                    }
                }, 50);
            }
        };
        window.addEventListener('onthesis-inject-diff', handleInjectDiff);

        return () => {
            window.removeEventListener('onthesis-diff-accept', handleDiffAccept);
            window.removeEventListener('onthesis-diff-reject', handleDiffReject);
            window.removeEventListener('onthesis-inject-diff', handleInjectDiff);
        };
    }, [acceptDiff, rejectDiff, editorRef]);

    const isRunning = [
        AGENT_STATES.PLANNING,
        AGENT_STATES.EXECUTING,
        AGENT_STATES.REVIEWING,
        AGENT_STATES.EVALUATING,
        AGENT_STATES.REVISING,
    ].includes(agentState);

    /**
     * Resolves a diagnostic citation flag (dismiss or mark resolved).
     */
    const resolveCitationFlag = useCallback((flagId) => {
        setCitationFlags((prev) => prev.filter(f => f.flagId !== flagId));
    }, []);

    return {
        agentState,
        steps,
        currentStep,
        generatedText,
        error,
        startTime,
        isRunning,

        runAgent,
        abort,
        reset,

        pendingDiffs,
        toolCalls,
        acceptDiff,
        rejectDiff,
        acceptAll,
        rejectAll,

        // Bugfix 3: Expose resolved diffs for UI
        resolvedDiffs,
        getDiffStatus,

        // Sprint 6 (Phase 4): Diagnostic UI
        citationFlags,
        incoherenceWarnings,
        resolveCitationFlag,
    };
}

export { AGENT_STATES };
export default useAgentLoop;
