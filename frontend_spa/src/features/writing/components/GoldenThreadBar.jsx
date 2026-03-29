// ─── Phase 3.1: Golden Thread — Research Coherence Map ───
// Collapsible strip below toolbar showing 5 research coherence nodes.
// Each node is inline-editable. On save/check, AI verifies alignment.

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    ChevronDown, ChevronUp, HelpCircle, CheckCircle2,
    AlertTriangle, Loader2, RefreshCw, Sparkles,
    Target, Lightbulb, FlaskConical, BarChart3, Flag
} from 'lucide-react';
import { useProject } from '../context/ProjectContext.jsx';
import { useThemeStore } from '@/store/themeStore';
import { api } from '../api/client.js';

// ── Node Definitions ──
const THREAD_NODES = [
    { key: 'researchQuestion', label: 'Research Question', icon: Target, color: 'blue' },
    { key: 'hypothesis', label: 'Hypothesis', icon: Lightbulb, color: 'purple' },
    { key: 'methodology', label: 'Methodology', icon: FlaskConical, color: 'emerald' },
    { key: 'findings', label: 'Findings', icon: BarChart3, color: 'amber' },
    { key: 'conclusion', label: 'Conclusion', icon: Flag, color: 'rose' },
];

// ── Color Maps ──
const NODE_COLORS = {
    blue: { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', icon: 'text-blue-500', ring: 'ring-blue-400/30' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-800', icon: 'text-purple-500', ring: 'ring-purple-400/30' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', icon: 'text-emerald-500', ring: 'ring-emerald-400/30' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', icon: 'text-amber-500', ring: 'ring-amber-400/30' },
    rose: { bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-200 dark:border-rose-800', icon: 'text-rose-500', ring: 'ring-rose-400/30' },
};

export default function GoldenThreadBar({ onCoherenceUpdate, getEditorContent, isModal = false }) {
    const { goldenThread, updateGoldenThread, project, chapters, activeChapterId } = useProject();
    const { theme } = useThemeStore();

    const [isExpanded, setIsExpanded] = useState(true);
    const [isChecking, setIsChecking] = useState(false);
    const [coherenceResult, setCoherenceResult] = useState(null); // { overallScore, nodes[] }
    const [editingNode, setEditingNode] = useState(null);
    const [editValue, setEditValue] = useState('');
    const inputRef = useRef(null);

    // Theme config
    const ts = {
        light: {
            barBg: 'bg-gradient-to-r from-slate-50/90 to-gray-50/90 backdrop-blur-md',
            barBorder: 'border-gray-200/60',
            headerText: 'text-slate-700',
            mutedText: 'text-slate-400',
            scoreBg: 'bg-white',
            scoreBorder: 'border-gray-200',
            btnHover: 'hover:bg-black/5',
            connectorLine: 'bg-gray-300',
        },
        dark: {
            barBg: 'bg-gradient-to-r from-[#0B1120]/80 to-[#0F172A]/80 backdrop-blur-md',
            barBorder: 'border-white/5',
            headerText: 'text-slate-200',
            mutedText: 'text-slate-500',
            scoreBg: 'bg-[#1E293B]',
            scoreBorder: 'border-white/10',
            btnHover: 'hover:bg-white/5',
            connectorLine: 'bg-slate-700',
        },
        happy: {
            barBg: 'bg-gradient-to-r from-orange-50/80 to-amber-50/80 backdrop-blur-md',
            barBorder: 'border-orange-100/50',
            headerText: 'text-stone-700',
            mutedText: 'text-stone-400',
            scoreBg: 'bg-white',
            scoreBorder: 'border-orange-100',
            btnHover: 'hover:bg-orange-50',
            connectorLine: 'bg-orange-200',
        },
    }[theme] || {};

    // ── Start Editing ──
    const startEditing = useCallback((nodeKey) => {
        setEditingNode(nodeKey);
        setEditValue(goldenThread[nodeKey] || '');
        setTimeout(() => inputRef.current?.focus(), 50);
    }, [goldenThread]);

    // ── Save Edit ──
    const saveEdit = useCallback(() => {
        if (editingNode && editValue !== goldenThread[editingNode]) {
            updateGoldenThread({ [editingNode]: editValue });
        }
        setEditingNode(null);
    }, [editingNode, editValue, goldenThread, updateGoldenThread]);

    // ── Cancel Edit ──
    const cancelEdit = useCallback(() => {
        setEditingNode(null);
        setEditValue('');
    }, []);

    // ── Check Coherence (AI) ──
    const checkCoherence = useCallback(async () => {
        setIsChecking(true);
        try {
            const chapterContent = getEditorContent?.() || '';
            const result = await api.post('/api/check-coherence', {
                golden_thread: goldenThread,
                chapter_content: chapterContent,
                project_meta: {
                    title: project?.title,
                    problem_statement: project?.problem_statement,
                    methodology: project?.methodology,
                    theoretical_framework: project?.theoretical_framework,
                },
                active_chapter: chapters?.find(c => c.id === activeChapterId)?.title || '',
            });

            if (result) {
                setCoherenceResult(result);
                onCoherenceUpdate?.(result.overallScore || 0);
            }
        } catch (err) {
            console.error('[GoldenThread] Coherence check failed:', err);
        } finally {
            setIsChecking(false);
        }
    }, [goldenThread, project, chapters, activeChapterId, getEditorContent, onCoherenceUpdate]);

    // ── Get Node Status ──
    const getNodeStatus = (nodeKey) => {
        if (!coherenceResult?.nodes) return null;
        return coherenceResult.nodes.find(n => n.name === nodeKey);
    };

    // ── Score Color ──
    const getScoreColor = (score) => {
        if (score >= 80) return 'text-emerald-500';
        if (score >= 60) return 'text-amber-500';
        return 'text-red-500';
    };

    const getScoreBgColor = (score) => {
        if (score >= 80) return 'from-emerald-500/10 to-emerald-500/5';
        if (score >= 60) return 'from-amber-500/10 to-amber-500/5';
        return 'from-red-500/10 to-red-500/5';
    };

    // ── Modal Mode: Skip collapsible wrapper, show nodes directly ──
    if (isModal) {
        return (
            <div className="space-y-4">
                {/* Coherence Score + Check Button */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {coherenceResult?.overallScore != null && (
                            <span className={`text-sm font-bold px-3 py-1 rounded-full ${getScoreColor(coherenceResult.overallScore)} bg-gradient-to-r ${getScoreBgColor(coherenceResult.overallScore)}`}>
                                {coherenceResult.overallScore}/100
                            </span>
                        )}
                    </div>
                    <button
                        onClick={checkCoherence}
                        disabled={isChecking}
                        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${ts.btnHover} ${ts.mutedText} ${isChecking ? 'opacity-50' : ''} border ${ts.barBorder}`}
                    >
                        {isChecking ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        {isChecking ? 'Checking...' : 'Check Coherence'}
                    </button>
                </div>

                {/* Nodes Grid */}
                <div className="grid grid-cols-1 gap-3">
                    {THREAD_NODES.map((node) => {
                        const Icon = node.icon;
                        const colors = NODE_COLORS[node.color];
                        const status = getNodeStatus(node.key);
                        const value = goldenThread[node.key] || '';
                        const isEditing = editingNode === node.key;

                        return (
                            <div
                                key={node.key}
                                className={`rounded-xl border ${colors.border} ${colors.bg} p-3 transition-all duration-200 cursor-pointer group relative ${isEditing ? `ring-2 ${colors.ring}` : 'hover:shadow-md'}`}
                                onClick={() => !isEditing && startEditing(node.key)}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${colors.bg}`}>
                                        <Icon size={14} className={colors.icon} />
                                    </div>
                                    <span className={`text-xs font-bold uppercase tracking-wider ${ts.mutedText}`}>
                                        {node.label}
                                    </span>
                                    {status && (
                                        <span className="ml-auto" title={status.message}>
                                            {status.status === 'aligned' ? (
                                                <CheckCircle2 size={14} className="text-emerald-500" />
                                            ) : status.status === 'misaligned' ? (
                                                <AlertTriangle size={14} className="text-amber-500" />
                                            ) : (
                                                <HelpCircle size={14} className="text-slate-400" />
                                            )}
                                        </span>
                                    )}
                                </div>

                                {isEditing ? (
                                    <textarea
                                        ref={inputRef}
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={saveEdit}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                                            if (e.key === 'Escape') cancelEdit();
                                        }}
                                        className={`w-full text-sm bg-transparent border-none outline-none resize-none leading-relaxed ${ts.headerText}`}
                                        rows={2}
                                        placeholder={`Describe your ${node.label.toLowerCase()}...`}
                                    />
                                ) : (
                                    <p className={`text-sm leading-relaxed ${value ? ts.headerText : ts.mutedText} ${!value ? 'italic' : ''}`}>
                                        {value || `Click to add ${node.label.toLowerCase()}...`}
                                    </p>
                                )}

                                {status?.message && status.status === 'misaligned' && (
                                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 leading-tight">
                                        ⚠ {status.message}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ── Standard Bar Mode: Collapsible strip ──
    return (
        <div className={`border-b ${ts.barBorder} transition-all duration-300`}>
            {/* ── Header (Always Visible) ── */}
            <div
                className={`flex items-center justify-between px-4 py-1.5 cursor-pointer select-none ${ts.barBg}`}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <Sparkles size={13} className="text-amber-500" />
                    <span className={`text-[11px] font-bold tracking-wide uppercase ${ts.headerText}`}>
                        Golden Thread
                    </span>

                    {/* Coherence Score Badge */}
                    {coherenceResult?.overallScore != null && (
                        <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${getScoreColor(coherenceResult.overallScore)} bg-gradient-to-r ${getScoreBgColor(coherenceResult.overallScore)}`}>
                            {coherenceResult.overallScore}/100
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    {/* Check Coherence Button */}
                    <button
                        onClick={(e) => { e.stopPropagation(); checkCoherence(); }}
                        disabled={isChecking}
                        className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md transition-all ${ts.btnHover} ${ts.mutedText} ${isChecking ? 'opacity-50' : ''}`}
                        title="AI Coherence Check"
                    >
                        {isChecking ? (
                            <Loader2 size={11} className="animate-spin" />
                        ) : (
                            <RefreshCw size={11} />
                        )}
                        {isChecking ? 'Checking...' : 'Check'}
                    </button>

                    {isExpanded ? (
                        <ChevronUp size={14} className={ts.mutedText} />
                    ) : (
                        <ChevronDown size={14} className={ts.mutedText} />
                    )}
                </div>
            </div>

            {/* ── Expanded Content: 5 Nodes ── */}
            {isExpanded && (
                <div className={`px-4 py-3 ${ts.barBg} animate-in fade-in slide-in-from-top-1 duration-200`}>
                    <div className="flex items-start gap-1">
                        {THREAD_NODES.map((node, idx) => {
                            const Icon = node.icon;
                            const colors = NODE_COLORS[node.color];
                            const status = getNodeStatus(node.key);
                            const value = goldenThread[node.key] || '';
                            const isEditing = editingNode === node.key;

                            return (
                                <React.Fragment key={node.key}>
                                    {/* Connector Line */}
                                    {idx > 0 && (
                                        <div className="flex items-center pt-5 px-0">
                                            <div className={`w-4 h-[2px] ${ts.connectorLine} rounded-full opacity-40`} />
                                        </div>
                                    )}

                                    {/* Node Card */}
                                    <div
                                        className={`flex-1 min-w-0 rounded-lg border ${colors.border} ${colors.bg} p-2 transition-all duration-200 cursor-pointer group relative ${isEditing ? `ring-2 ${colors.ring}` : 'hover:shadow-sm'}`}
                                        onClick={() => !isEditing && startEditing(node.key)}
                                    >
                                        {/* Node Header */}
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Icon size={12} className={colors.icon} />
                                            <span className={`text-[9px] font-bold uppercase tracking-wider ${ts.mutedText}`}>
                                                {node.label}
                                            </span>

                                            {/* Status Icon */}
                                            {status && (
                                                <span className="ml-auto" title={status.message}>
                                                    {status.status === 'aligned' ? (
                                                        <CheckCircle2 size={11} className="text-emerald-500" />
                                                    ) : status.status === 'misaligned' ? (
                                                        <AlertTriangle size={11} className="text-amber-500" />
                                                    ) : (
                                                        <HelpCircle size={11} className="text-slate-400" />
                                                    )}
                                                </span>
                                            )}
                                        </div>

                                        {/* Node Content */}
                                        {isEditing ? (
                                            <textarea
                                                ref={inputRef}
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onBlur={saveEdit}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                                                    if (e.key === 'Escape') cancelEdit();
                                                }}
                                                className={`w-full text-[11px] bg-transparent border-none outline-none resize-none leading-relaxed ${ts.headerText}`}
                                                rows={2}
                                                placeholder={`Describe your ${node.label.toLowerCase()}...`}
                                            />
                                        ) : (
                                            <p className={`text-[11px] leading-relaxed truncate ${value ? ts.headerText : ts.mutedText} ${!value ? 'italic' : ''}`}>
                                                {value || `Click to add ${node.label.toLowerCase()}...`}
                                            </p>
                                        )}

                                        {/* Status Message Tooltip */}
                                        {status?.message && status.status === 'misaligned' && (
                                            <p className="text-[9px] text-amber-600 dark:text-amber-400 mt-1 leading-tight">
                                                ⚠ {status.message}
                                            </p>
                                        )}
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
