// ─── AgentProgressPanel — Real-time Agent Step Visualizer ───
// Collapsible strip above editor showing agent progress.

import React, { useState, useEffect, useRef } from 'react';
import {
    Brain, Search, FileText, CheckCircle, XCircle,
    Loader2, ChevronDown, ChevronUp, Clock, Square
} from 'lucide-react';
import { AGENT_STATES } from '../hooks/useAgentLoop';

const STEP_ICONS = {
    planning: Brain,
    executing: FileText,
    reviewing: Search,
    search_references: Search,
    get_chapter: FileText,
    analyze_argument: Brain,
    insert_text: FileText,
};

function StepIcon({ step, size = 14 }) {
    const Icon = STEP_ICONS[step] || Brain;
    return <Icon size={size} />;
}

function ElapsedTimer({ startTime }) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!startTime) return;
        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [startTime]);

    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return (
        <span className="text-[11px] text-slate-400 font-mono tabular-nums">
            {mins}:{secs.toString().padStart(2, '0')}
        </span>
    );
}

export default function AgentProgressPanel({ agentState, steps, currentStep, startTime, onAbort, error, generatedText }) {
    const [expanded, setExpanded] = useState(false);
    const logRef = useRef(null);

    // Auto-scroll log
    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [steps]);

    // Don't render if idle
    if (agentState === AGENT_STATES.IDLE && steps.length === 0) return null;

    const isRunning = [AGENT_STATES.PLANNING, AGENT_STATES.EXECUTING, AGENT_STATES.REVIEWING].includes(agentState);
    const isDone = agentState === AGENT_STATES.DONE;
    const isError = agentState === AGENT_STATES.ERROR;

    // Status color
    const statusColor = isRunning
        ? 'from-blue-500/10 to-purple-500/10 border-blue-500/20'
        : isDone
            ? 'from-green-500/10 to-emerald-500/10 border-green-500/20'
            : isError
                ? 'from-red-500/10 to-orange-500/10 border-red-500/20'
                : 'from-slate-500/10 to-slate-500/10 border-slate-500/20';

    const statusLabel = {
        [AGENT_STATES.PLANNING]: '🧠 Planning...',
        [AGENT_STATES.EXECUTING]: '⚡ Executing...',
        [AGENT_STATES.REVIEWING]: '🔍 Reviewing...',
        [AGENT_STATES.DONE]: '✅ Done',
        [AGENT_STATES.ERROR]: '❌ Error',
        [AGENT_STATES.IDLE]: 'Idle',
    };

    return (
        <div
            className={`
                mx-2 mb-1 rounded-lg border bg-gradient-to-r backdrop-blur-sm
                transition-all duration-300 overflow-hidden
                ${statusColor}
            `}
            style={{
                animation: isRunning ? 'pulse 2s infinite' : 'none',
            }}
        >
            {/* ── Header ── */}
            <div
                className="flex items-center justify-between px-3 py-2 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-2">
                    {isRunning ? (
                        <Loader2 size={14} className="text-blue-400 animate-spin" />
                    ) : isDone ? (
                        <CheckCircle size={14} className="text-green-400" />
                    ) : isError ? (
                        <XCircle size={14} className="text-red-400" />
                    ) : null}
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        AI Agent {statusLabel[agentState] || agentState}
                    </span>
                    {currentStep?.message && isRunning && (
                        <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                            — {currentStep.message}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {startTime && (
                        <div className="flex items-center gap-1">
                            <Clock size={10} className="text-slate-400" />
                            <ElapsedTimer startTime={startTime} />
                        </div>
                    )}
                    <span className="text-[10px] text-slate-400 bg-slate-200/50 dark:bg-white/[0.06] rounded px-1.5 py-0.5">
                        {steps.length} steps
                    </span>
                    {isRunning && onAbort && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onAbort(); }}
                            className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                            title="Abort"
                        >
                            <Square size={12} />
                        </button>
                    )}
                    {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </div>
            </div>

            {/* ── Error ── */}
            {isError && error && (
                <div className="px-3 pb-2 text-xs text-red-400">{error}</div>
            )}

            {/* ── Expanded Log ── */}
            {expanded && steps.length > 0 && (
                <div
                    ref={logRef}
                    className="px-3 pb-3 max-h-[200px] overflow-y-auto custom-scrollbar border-t border-white/5 mt-1 pt-2"
                >
                    <div className="space-y-1">
                        {steps.map((step, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-[11px]">
                                <StepIcon step={step.step || step.tool} size={12} />
                                <div className="flex-1 min-w-0">
                                    <span className="font-medium text-slate-500 dark:text-slate-400">
                                        {step.type === 'TOOL_CALL' ? `🔧 ${step.tool}` : step.type}
                                    </span>
                                    {step.message && (
                                        <span className="ml-1.5 text-slate-400 dark:text-slate-500 truncate">
                                            {step.message}
                                        </span>
                                    )}
                                    {step.summary && (
                                        <span className="ml-1.5 text-green-400">
                                            {step.summary}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Live Text Preview ── */}
            {expanded && generatedText && generatedText.length > 0 && (
                <div className="px-3 pb-3 border-t border-white/5">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 mt-2">
                        📝 Preview ({generatedText.split(/\s+/).length} kata)
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed max-h-[120px] overflow-y-auto custom-scrollbar bg-black/5 dark:bg-white/[0.02] rounded-md p-2">
                        {generatedText.length > 300 ? '...' + generatedText.slice(-300) : generatedText}
                    </div>
                </div>
            )}
        </div>
    );
}
