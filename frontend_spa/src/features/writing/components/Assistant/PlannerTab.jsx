// FILE: PlannerTab.jsx — Thesis Planner embedded in Writing Assistant

import React, { useState, useEffect, useMemo } from 'react';
import { useThemeStore } from '@/store/themeStore';
import { cn } from '@/lib/utils';
import {
    Map, CheckCircle2, AlertTriangle, Lock, Unlock,
    RefreshCw, ChevronDown, BarChart2, Target, FlaskConical,
    FileText, BookOpen, Layers
} from 'lucide-react';

const API_BASE = '/api/thesis-brain';

const STATUS_MAP = {
    empty: { label: 'Belum', icon: '⬜', color: 'slate' },
    draft: { label: 'Draft', icon: '📝', color: 'amber' },
    in_progress: { label: 'Proses', icon: '✍️', color: 'blue' },
    near_complete: { label: 'Hampir', icon: '🔄', color: 'indigo' },
    review: { label: 'Review', icon: '👀', color: 'amber' },
    approved: { label: 'OK ✅', icon: '✅', color: 'emerald' },
};

const BAB_SHORT = { bab1: 'B1', bab2: 'B2', bab3: 'B3', bab4: 'B4', bab5: 'B5' };
const BAB_LABEL = {
    bab1: 'Pendahuluan',
    bab2: 'Kajian Pustaka',
    bab3: 'Metodologi',
    bab4: 'Hasil & Pembahasan',
    bab5: 'Penutup',
};

const DEPS = { bab1: [], bab2: ['bab1'], bab3: ['bab1', 'bab2'], bab4: ['bab1', 'bab2', 'bab3'], bab5: ['bab1', 'bab4'] };

const LIVE_PHASE_LABELS = {
    planning: 'AI sedang merencanakan',
    executing: 'AI sedang mengeksekusi',
    reviewing: 'AI sedang menyusun hasil',
    evaluating: 'AI sedang mengevaluasi',
    revising: 'AI sedang merevisi',
    done: 'Run AI selesai',
};

export default function PlannerTab({ projectData, liveRunStatus, liveRunPhase }) {
    const { theme } = useThemeStore();
    const projectId = projectData?.id;

    const [graph, setGraph] = useState(null);
    const [validation, setValidation] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!projectId) { setLoading(false); return; }
        (async () => {
            setLoading(true);
            try {
                const [g, v] = await Promise.all([
                    fetch(`${API_BASE}/graph/${projectId}`).then(r => r.json()),
                    fetch(`${API_BASE}/graph/${projectId}/validate`).then(r => r.json()),
                ]);
                if (g.status === 'success' && g.graph) setGraph(g.graph);
                setValidation(v);
            } catch (e) { console.error('Planner error:', e); }
            finally { setLoading(false); }
        })();
    }, [projectId]);

    const snaps = graph?.chapter_snapshots || {};
    const errors = validation?.errors || [];
    const warnings = validation?.warnings || [];
    const rm = graph?.rumusan_masalah || [];
    const tujuan = graph?.tujuan || [];
    const hypotheses = graph?.hypotheses || [];
    const variables = graph?.variables || [];

    // Theme styles
    const ts = {
        light: {
            card: 'bg-white/80 border-black/5', text: 'text-slate-800', muted: 'text-slate-500',
            success: 'text-emerald-600', error: 'text-red-500', warning: 'text-amber-600',
            accent: 'text-blue-600', sBg: 'bg-slate-50', hdr: 'bg-gradient-to-r from-blue-500 to-indigo-500',
            lockBg: 'bg-emerald-50 border-emerald-200', unlockBg: 'bg-slate-50 border-slate-200',
            progressBg: 'bg-slate-200', progressFill: 'bg-blue-500',
        },
        dark: {
            card: 'bg-[#1E293B]/80 border-white/5', text: 'text-slate-200', muted: 'text-slate-400',
            success: 'text-emerald-400', error: 'text-red-400', warning: 'text-amber-400',
            accent: 'text-cyan-400', sBg: 'bg-black/20', hdr: 'bg-gradient-to-r from-indigo-600 to-purple-600',
            lockBg: 'bg-emerald-900/20 border-emerald-700', unlockBg: 'bg-black/20 border-white/5',
            progressBg: 'bg-white/10', progressFill: 'bg-cyan-500',
        },
        happy: {
            card: 'bg-white/80 border-orange-100', text: 'text-stone-800', muted: 'text-stone-500',
            success: 'text-emerald-600', error: 'text-red-500', warning: 'text-amber-600',
            accent: 'text-orange-500', sBg: 'bg-orange-50/30', hdr: 'bg-gradient-to-r from-orange-400 to-rose-400',
            lockBg: 'bg-emerald-50 border-emerald-200', unlockBg: 'bg-orange-50 border-orange-200',
            progressBg: 'bg-orange-200', progressFill: 'bg-orange-500',
        },
    }[theme] || {};

    if (loading) {
        return (
            <div className={cn("flex flex-col items-center justify-center py-16 gap-3", ts.muted)}>
                <RefreshCw size={20} className="animate-spin opacity-50" />
                <span className="text-xs font-medium">Memuat Planner...</span>
            </div>
        );
    }

    if (!projectId) {
        return (
            <div className={cn("flex flex-col items-center justify-center py-16 gap-3 px-6 text-center", ts.muted)}>
                <Map size={24} className="opacity-30" />
                <span className="text-xs font-medium">Pilih project terlebih dahulu</span>
            </div>
        );
    }

    const chapEntries = Object.entries(BAB_LABEL);
    const totalBab = chapEntries.length;
    const writtenBab = chapEntries.filter(([id]) => (snaps[id]?.status || 'empty') !== 'empty').length;
    const approvedBab = chapEntries.filter(([id]) => snaps[id]?.status === 'approved').length;

    return (
        <div className="p-3 space-y-3 animate-in fade-in slide-in-from-bottom-1 duration-200">
            {/* HEADER */}
            <div className={cn("rounded-xl p-3 text-white", ts.hdr)}>
                <div className="flex items-center gap-2 mb-1">
                    <Map size={16} />
                    <span className="text-sm font-bold">Thesis Graph Overview</span>
                </div>
                <p className="text-[10px] opacity-80 truncate">{graph?.title || projectData?.title || '-'}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide">
                        Overview
                    </span>
                    <span className="text-[10px] opacity-80">
                        Menampilkan graph dan validasi Thesis Brain, bukan live execution planner.
                    </span>
                </div>
                {liveRunStatus === 'streaming' && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide">
                        <RefreshCw size={10} className="animate-spin" />
                        {LIVE_PHASE_LABELS[liveRunPhase] || 'AI sedang berjalan'}
                    </div>
                )}
            </div>

            {/* STATS ROW */}
            <div className="grid grid-cols-3 gap-2">
                <MiniStat ts={ts} icon={<FileText size={12} />} label="Ditulis" val={`${writtenBab}/${totalBab}`} />
                <MiniStat ts={ts} icon={<CheckCircle2 size={12} />} label="Approved" val={`${approvedBab}/${totalBab}`} />
                <MiniStat ts={ts} icon={<BarChart2 size={12} />} label="Variabel" val={variables.length} />
            </div>

            {/* VALIDATION ALERTS */}
            {(errors.length > 0 || warnings.length > 0) && (
                <div className={cn("rounded-xl p-2.5 border text-[10px] space-y-1", errors.length > 0 ? 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800' : 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800')}>
                    {errors.slice(0, 3).map((e, i) => (
                        <div key={`e-${i}`} className={cn("flex items-start gap-1.5", ts.error)}>
                            <AlertTriangle size={10} className="mt-0.5 shrink-0" />
                            <span>{e.message}</span>
                        </div>
                    ))}
                    {warnings.slice(0, 3).map((w, i) => (
                        <div key={`w-${i}`} className={cn("flex items-start gap-1.5", ts.warning)}>
                            <AlertTriangle size={10} className="mt-0.5 shrink-0" />
                            <span>{w.message}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* CHAPTER PROGRESS */}
            <div className={cn("rounded-xl border overflow-hidden", ts.card)}>
                <div className={cn("px-3 py-2 text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5", ts.muted, ts.sBg)}>
                    <Layers size={10} /> Progress Bab
                </div>
                <div className="divide-y divide-black/5 dark:divide-white/5">
                    {chapEntries.map(([babId, label]) => {
                        const snap = snaps[babId] || { status: 'empty' };
                        const st = STATUS_MAP[snap.status] || STATUS_MAP.empty;
                        const deps = DEPS[babId] || [];
                        const progress = snap.status === 'approved' ? 100 : snap.status === 'near_complete' ? 80 : snap.status === 'review' ? 70 : snap.status === 'in_progress' ? 50 : snap.status === 'draft' ? 30 : 0;

                        return (
                            <div key={babId} className="px-3 py-2">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs">{st.icon}</span>
                                        <span className={cn("text-[11px] font-bold", ts.text)}>{BAB_SHORT[babId]} — {label}</span>
                                    </div>
                                    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                                        snap.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                            snap.status === 'empty' ? 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500' :
                                                'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    )}>{st.label}</span>
                                </div>
                                <div className={cn("h-1 rounded-full overflow-hidden", ts.progressBg)}>
                                    <div className={cn("h-full rounded-full transition-all duration-500", ts.progressFill)} style={{ width: `${progress}%` }} />
                                </div>
                                {deps.length > 0 && (
                                    <div className={cn("flex gap-1.5 mt-1 text-[9px]", ts.muted)}>
                                        {deps.map(d => (
                                            <span key={d} className={snaps[d]?.status === 'approved' ? ts.success : ts.muted}>
                                                {snaps[d]?.status === 'approved' ? '✅' : '⬜'}{BAB_SHORT[d]}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* RM → TUJUAN → HIPOTESIS TREE */}
            {rm.length > 0 && (
                <div className={cn("rounded-xl border overflow-hidden", ts.card)}>
                    <div className={cn("px-3 py-2 text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5", ts.muted, ts.sBg)}>
                        <Target size={10} /> Dependency Map
                    </div>
                    <div className="p-2 space-y-1.5">
                        {rm.map((r, i) => {
                            const matchT = tujuan.find(t => t.id === r.maps_to_tujuan);
                            const matchH = hypotheses.find(h => h.maps_to_rumusan === r.id);
                            return (
                                <div key={r.id} className={cn("rounded-lg p-2 border", ts.sBg, theme === 'dark' ? 'border-white/5' : 'border-black/5')}>
                                    <div className={cn("text-[11px] font-bold mb-1", ts.text)}>
                                        {r.id}: {r.text?.slice(0, 80)}{r.text?.length > 80 ? '...' : ''}
                                    </div>
                                    <div className="pl-2 space-y-0.5 text-[10px]">
                                        <div className={matchT ? ts.success : ts.error}>
                                            {matchT ? `✅ Tujuan: ${matchT.text?.slice(0, 60)}` : '❌ Belum ada Tujuan'}
                                        </div>
                                        <div className={matchH ? ts.success : graph?.methodology === 'qualitative' ? ts.muted : ts.warning}>
                                            {matchH ? `✅ H: ${matchH.statement?.slice(0, 60)}` :
                                                graph?.methodology === 'qualitative' ? '— Kualitatif' : '⚠️ Belum ada Hipotesis'}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ENTITY LOCKS */}
            {graph?.constraints && (
                <div className={cn("rounded-xl border overflow-hidden", ts.card)}>
                    <div className={cn("px-3 py-2 text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5", ts.muted, ts.sBg)}>
                        <Lock size={10} /> Entity Locks
                    </div>
                    <div className="p-2 space-y-1.5">
                        <LockRow ts={ts} label="Variabel" items={graph.constraints.locked_variables || []}
                            locked={(graph.constraints.approved_chapters || []).includes('bab1')} />
                        <LockRow ts={ts} label="Metodologi"
                            items={graph.constraints.locked_methodology ? [graph.constraints.locked_methodology] : []}
                            locked={(graph.constraints.approved_chapters || []).includes('bab3')} />
                    </div>
                </div>
            )}
        </div>
    );
}

function MiniStat({ ts, icon, label, val }) {
    return (
        <div className={cn("rounded-lg border p-2 flex items-center gap-2", ts.card)}>
            <span className={ts.accent}>{icon}</span>
            <div>
                <div className={cn("text-sm font-extrabold leading-none", ts.text)}>{val}</div>
                <div className={cn("text-[9px] mt-0.5", ts.muted)}>{label}</div>
            </div>
        </div>
    );
}

function LockRow({ ts, label, items, locked }) {
    return (
        <div className={cn("rounded-lg border p-2 text-[10px]", locked ? ts.lockBg : ts.unlockBg)}>
            <div className={cn("font-bold flex items-center gap-1 mb-0.5", locked ? ts.success : ts.muted)}>
                {locked ? <Lock size={10} /> : <Unlock size={10} />} {label}
            </div>
            {items.length > 0
                ? items.map((it, i) => <div key={i} className={ts.text}>• {it}</div>)
                : <div className={cn("italic", ts.muted)}>—</div>}
        </div>
    );
}
