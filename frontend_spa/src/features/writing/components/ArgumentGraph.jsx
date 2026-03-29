// ─── Phase 3.2: Argument Thread Visualizer ───
// Interactive graph showing claims as nodes and logical relations as edges.
// Uses @xyflow/react for rendering. AI extracts claims from chapter content.

import React, { useState, useCallback, useMemo } from 'react';
import {
    ReactFlow,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Loader2, RefreshCw, GitBranch, AlertCircle } from 'lucide-react';
import { useProject } from '../context/ProjectContext.jsx';
import { useThemeStore } from '@/store/themeStore';
import { api } from '../api/client.js';

// ── Strength → Color Map ──
const strengthColors = {
    1: { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' }, // Very weak — red
    2: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' }, // Weak — amber
    3: { bg: '#FEF9C3', border: '#EAB308', text: '#854D0E' }, // Medium — yellow
    4: { bg: '#D1FAE5', border: '#10B981', text: '#065F46' }, // Strong — green
    5: { bg: '#A7F3D0', border: '#059669', text: '#064E3B' }, // Very strong — dark green
};

// ── Edge type → Style ──
const edgeStyles = {
    supports: { stroke: '#10B981', label: 'mendukung', markerColor: '#10B981' },
    contradicts: { stroke: '#EF4444', label: 'bertentangan', markerColor: '#EF4444' },
    elaborates: { stroke: '#3B82F6', label: 'menjelaskan', markerColor: '#3B82F6' },
};

// ── Custom Node Component ──
function ClaimNode({ data }) {
    const colors = strengthColors[data.strength] || strengthColors[3];
    return (
        <div
            className="rounded-lg shadow-md border-2 px-3 py-2 min-w-[160px] max-w-[220px] cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
            style={{
                backgroundColor: colors.bg,
                borderColor: colors.border,
            }}
            onClick={() => data.onNodeClick?.(data.paragraphIndex)}
        >
            <p className="text-[11px] leading-relaxed font-medium" style={{ color: colors.text }}>
                {data.label}
            </p>
            <div className="flex items-center gap-1 mt-1.5">
                <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                                backgroundColor: i <= data.strength ? colors.border : '#E5E7EB',
                            }}
                        />
                    ))}
                </div>
                <span className="text-[8px] ml-1 opacity-60" style={{ color: colors.text }}>
                    P{(data.paragraphIndex || 0) + 1}
                </span>
            </div>
        </div>
    );
}

const nodeTypes = { claim: ClaimNode };

export default function ArgumentGraph({ onJumpToParagraph }) {
    const { activeChapterId, chapters } = useProject();
    const { theme } = useThemeStore();

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [hasData, setHasData] = useState(false);

    const currentChapter = chapters?.find(c => c.id === activeChapterId);

    // ── Fetch Argument Graph from Backend ──
    const fetchGraph = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Get editor content from DOM (simpler than passing ref)
            const editorEl = document.querySelector('#editor-scroller .ContentEditable__root');
            const chapterContent = editorEl?.textContent || '';

            if (chapterContent.length < 50) {
                setError('Konten bab terlalu pendek untuk dianalisis.');
                setIsLoading(false);
                return;
            }

            const result = await api.post('/api/argument-graph', {
                chapter_content: chapterContent,
                chapter_title: currentChapter?.title || '',
            });

            if (result?.nodes?.length > 0) {
                // Convert API nodes → React Flow nodes with auto-layout
                const flowNodes = result.nodes.map((n, idx) => ({
                    id: n.id,
                    type: 'claim',
                    position: {
                        x: (idx % 3) * 260 + 40,
                        y: Math.floor(idx / 3) * 140 + 40,
                    },
                    data: {
                        label: n.text,
                        strength: n.strength,
                        paragraphIndex: n.paragraphIndex,
                        onNodeClick: onJumpToParagraph,
                    },
                }));

                const flowEdges = (result.edges || []).map((e, idx) => {
                    const style = edgeStyles[e.type] || edgeStyles.supports;
                    return {
                        id: `e-${idx}`,
                        source: e.source,
                        target: e.target,
                        label: style.label,
                        type: 'smoothstep',
                        animated: e.type === 'contradicts',
                        style: { stroke: style.stroke, strokeWidth: 2 },
                        labelStyle: { fontSize: 9, fill: style.stroke },
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            color: style.markerColor,
                        },
                    };
                });

                setNodes(flowNodes);
                setEdges(flowEdges);
                setHasData(true);
            } else {
                setError('Tidak ada klaim yang terdeteksi dalam bab ini.');
            }
        } catch (err) {
            console.error('[ArgumentGraph] Error:', err);
            setError('Gagal menganalisis argumen.');
        } finally {
            setIsLoading(false);
        }
    }, [currentChapter, setNodes, setEdges, onJumpToParagraph]);

    // ── Theme ──
    const isDark = theme === 'dark';
    const bgColor = isDark ? '#0F172A' : '#FAFBFC';
    const gridColor = isDark ? '#1E293B' : '#E2E8F0';

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 shrink-0">
                <div className="flex items-center gap-2">
                    <GitBranch size={14} className="text-blue-500" />
                    <span className={`text-[11px] font-bold tracking-wide uppercase ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        Argument Graph
                    </span>
                    {hasData && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                            {nodes.length} claims
                        </span>
                    )}
                </div>
                <button
                    onClick={fetchGraph}
                    disabled={isLoading}
                    className={`flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-md transition-all ${isDark ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-black/5 text-slate-500'} ${isLoading ? 'opacity-50' : ''}`}
                >
                    {isLoading ? (
                        <Loader2 size={11} className="animate-spin" />
                    ) : (
                        <RefreshCw size={11} />
                    )}
                    {isLoading ? 'Analyzing...' : 'Generate'}
                </button>
            </div>

            {/* Graph Area */}
            <div className="flex-1 min-h-0 relative">
                {!hasData && !isLoading && !error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <GitBranch size={36} className={`${isDark ? 'text-slate-700' : 'text-slate-300'}`} />
                        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            Klik "Generate" untuk menganalisis argumen
                        </p>
                        <p className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>
                            AI akan mengekstrak klaim & relasi dari bab aktif
                        </p>
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <AlertCircle size={24} className="text-amber-500" />
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{error}</p>
                    </div>
                )}

                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
                        <Loader2 size={28} className="text-blue-500 animate-spin" />
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            AI sedang mengekstrak klaim & relasi...
                        </p>
                    </div>
                )}

                {hasData && (
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        nodeTypes={nodeTypes}
                        fitView
                        fitViewOptions={{ padding: 0.3 }}
                        proOptions={{ hideAttribution: true }}
                        style={{ background: bgColor }}
                    >
                        <Controls
                            position="bottom-right"
                            showInteractive={false}
                            style={{ borderRadius: 8 }}
                        />
                        <Background color={gridColor} gap={16} size={1} />
                    </ReactFlow>
                )}
            </div>

            {/* Legend */}
            {hasData && (
                <div className={`flex items-center gap-4 px-3 py-1.5 text-[9px] border-t ${isDark ? 'border-white/5 text-slate-500' : 'border-gray-200/50 text-slate-400'}`}>
                    <span className="flex items-center gap-1">
                        <div className="w-3 h-0.5 bg-emerald-500 rounded" /> mendukung
                    </span>
                    <span className="flex items-center gap-1">
                        <div className="w-3 h-0.5 bg-red-500 rounded" /> bertentangan
                    </span>
                    <span className="flex items-center gap-1">
                        <div className="w-3 h-0.5 bg-blue-500 rounded" /> menjelaskan
                    </span>
                    <span className="flex items-center gap-1 ml-auto">
                        🔴 lemah → 🟢 kuat
                    </span>
                </div>
            )}
        </div>
    );
}
