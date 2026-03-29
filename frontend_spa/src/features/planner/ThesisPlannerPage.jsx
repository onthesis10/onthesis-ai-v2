import React, { useState, useEffect, useMemo } from 'react';
import { useThemeStore } from '@/store/themeStore';

const API_BASE = '/api/thesis-brain';

// ═══════════════════════════════════════════════════════════════════
// THEME CONFIG
// ═══════════════════════════════════════════════════════════════════
const THEMES = {
    light: {
        bg: '#ffffff', card: '#f8fafc', cardBorder: '#e2e8f0',
        text: '#1e293b', textMuted: '#64748b', textLight: '#94a3b8',
        accent: '#6366f1', accentBg: '#eef2ff',
        success: '#10b981', successBg: '#ecfdf5',
        warning: '#f59e0b', warningBg: '#fffbeb',
        error: '#ef4444', errorBg: '#fef2f2',
        info: '#3b82f6', infoBg: '#eff6ff',
        progressBg: '#e2e8f0', progressFill: '#6366f1',
        headerBg: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    },
    dark: {
        bg: '#0f172a', card: '#1e293b', cardBorder: '#334155',
        text: '#f1f5f9', textMuted: '#94a3b8', textLight: '#64748b',
        accent: '#818cf8', accentBg: 'rgba(99,102,241,0.15)',
        success: '#34d399', successBg: 'rgba(16,185,129,0.15)',
        warning: '#fbbf24', warningBg: 'rgba(245,158,11,0.15)',
        error: '#f87171', errorBg: 'rgba(239,68,68,0.15)',
        info: '#60a5fa', infoBg: 'rgba(59,130,246,0.15)',
        progressBg: '#334155', progressFill: '#818cf8',
        headerBg: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    },
    happy: {
        bg: '#fffbf5', card: '#fff7ed', cardBorder: '#fed7aa',
        text: '#1c1917', textMuted: '#78716c', textLight: '#a8a29e',
        accent: '#f97316', accentBg: '#fff7ed',
        success: '#22c55e', successBg: '#f0fdf4',
        warning: '#eab308', warningBg: '#fefce8',
        error: '#ef4444', errorBg: '#fef2f2',
        info: '#06b6d4', infoBg: '#ecfeff',
        progressBg: '#fed7aa', progressFill: '#f97316',
        headerBg: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
    },
};

const STATUS_MAP = {
    empty: { label: 'Belum Ditulis', icon: '⬜', color: 'textLight' },
    draft: { label: 'Draft', icon: '📝', color: 'warning' },
    in_progress: { label: 'Sedang Ditulis', icon: '✍️', color: 'info' },
    near_complete: { label: 'Hampir Selesai', icon: '🔄', color: 'accent' },
    review: { label: 'Review', icon: '👀', color: 'warning' },
    approved: { label: 'Approved ✅', icon: '✅', color: 'success' },
};

const CHAPTER_DEPS = {
    bab1: [],
    bab2: ['bab1'],
    bab3: ['bab1', 'bab2'],
    bab4: ['bab1', 'bab2', 'bab3'],
    bab5: ['bab1', 'bab4'],
};

const BAB_LABEL = {
    bab1: 'Bab 1 — Pendahuluan',
    bab2: 'Bab 2 — Kajian Pustaka',
    bab3: 'Bab 3 — Metodologi',
    bab4: 'Bab 4 — Hasil & Pembahasan',
    bab5: 'Bab 5 — Penutup',
};

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function ThesisPlannerPage() {
    const { mode } = useThemeStore();
    const t = THEMES[mode] || THEMES.light;

    const [graph, setGraph] = useState(null);
    const [validation, setValidation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [projectId, setProjectId] = useState('');

    // Load project ID from localStorage
    useEffect(() => {
        const savedPid = localStorage.getItem('selectedProjectId');
        if (savedPid) setProjectId(savedPid);
    }, []);

    // Load graph & validation when projectId is set
    useEffect(() => {
        if (!projectId) { setLoading(false); return; }
        (async () => {
            setLoading(true);
            try {
                const [graphRes, valRes] = await Promise.all([
                    fetch(`${API_BASE}/graph/${projectId}`).then(r => r.json()),
                    fetch(`${API_BASE}/graph/${projectId}/validate`).then(r => r.json()),
                ]);
                if (graphRes.status === 'success' && graphRes.graph) setGraph(graphRes.graph);
                setValidation(valRes);
            } catch (e) {
                console.error('Planner load error:', e);
            } finally {
                setLoading(false);
            }
        })();
    }, [projectId]);

    // Computed stats
    const stats = useMemo(() => {
        if (!graph) return null;
        const snaps = graph.chapter_snapshots || {};
        const chapters = Object.values(snaps);
        const total = chapters.length || 5;
        const written = chapters.filter(c => c.status !== 'empty').length;
        const approved = chapters.filter(c => c.status === 'approved').length;
        const variables = graph.variables || [];
        const rm = graph.rumusan_masalah || [];
        const tujuan = graph.tujuan || [];
        const hypotheses = graph.hypotheses || [];
        const theories = graph.theories || [];
        return { total, written, approved, variables, rm, tujuan, hypotheses, theories, snaps };
    }, [graph]);

    const errors = validation?.errors?.length || 0;
    const warnings = validation?.warnings?.length || 0;
    const infos = validation?.info?.length || 0;

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: t.textMuted }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 12, animation: 'spin 1s linear infinite' }}>⏳</div>
                    <p>Memuat Research Planner...</p>
                </div>
            </div>
        );
    }

    if (!projectId) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: t.textMuted }}>
                <div style={{ textAlign: 'center', maxWidth: 400 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
                    <h2 style={{ color: t.text, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Research Planner</h2>
                    <p>Pilih project di halaman Writing terlebih dahulu untuk mengaktifkan Thesis Planner.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto', color: t.text }}>
            {/* HEADER */}
            <div style={{
                background: t.headerBg, borderRadius: 16, padding: '28px 32px',
                marginBottom: 24, color: '#fff',
            }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                    🗺️ Thesis Planner
                </h1>
                <p style={{ opacity: 0.85, fontSize: 14 }}>
                    {graph?.title || 'Dependency Map & Research Progress'}
                </p>
            </div>

            {/* PROGRESS OVERVIEW */}
            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
                    <StatCard t={t} icon="📄" label="Bab Ditulis" value={`${stats.written}/${stats.total}`} />
                    <StatCard t={t} icon="✅" label="Bab Approved" value={`${stats.approved}/${stats.total}`} />
                    <StatCard t={t} icon="📐" label="Variabel" value={stats.variables.length} />
                    <StatCard t={t} icon="❓" label="Rumusan Masalah" value={stats.rm.length} />
                    <StatCard t={t} icon="🎯" label="Tujuan" value={stats.tujuan.length} />
                    <StatCard t={t} icon="📊" label="Hipotesis" value={stats.hypotheses.length} />
                </div>
            )}

            {/* VALIDATION SUMMARY */}
            {validation && (errors > 0 || warnings > 0) && (
                <div style={{
                    background: errors > 0 ? t.errorBg : t.warningBg,
                    border: `1px solid ${errors > 0 ? t.error : t.warning}33`,
                    borderRadius: 12, padding: '16px 20px', marginBottom: 24,
                }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: errors > 0 ? t.error : t.warning }}>
                        ⚠️ Validation Issues: {errors} error, {warnings} warning, {infos} info
                    </div>
                    {(validation.errors || []).map((v, i) => (
                        <div key={`e-${i}`} style={{ fontSize: 13, marginBottom: 4, color: t.error }}>
                            ❌ {v.message}
                        </div>
                    ))}
                    {(validation.warnings || []).slice(0, 5).map((v, i) => (
                        <div key={`w-${i}`} style={{ fontSize: 13, marginBottom: 4, color: t.warning }}>
                            ⚠️ {v.message}
                        </div>
                    ))}
                </div>
            )}

            {/* DEPENDENCY MAP */}
            {stats && (
                <div style={{
                    background: t.card, border: `1px solid ${t.cardBorder}`,
                    borderRadius: 16, padding: 24, marginBottom: 24,
                }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        📋 Research Dependency Map
                    </h2>

                    {/* RM → Tujuan → Hipotesis tree */}
                    {stats.rm.length > 0 ? (
                        <div style={{ marginBottom: 24 }}>
                            {stats.rm.map((rm, i) => {
                                const matchingT = stats.tujuan.find(t => t.id === rm.maps_to_tujuan);
                                const matchingH = stats.hypotheses.find(h => h.maps_to_rumusan === rm.id);
                                return (
                                    <div key={rm.id} style={{
                                        background: t.bg, borderRadius: 12, padding: '14px 18px',
                                        marginBottom: 10, border: `1px solid ${t.cardBorder}`,
                                    }}>
                                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
                                            {rm.id}: {rm.text?.slice(0, 100)}{rm.text?.length > 100 ? '...' : ''}
                                        </div>
                                        <div style={{ paddingLeft: 16, fontSize: 13, color: t.textMuted }}>
                                            <div style={{ marginBottom: 3 }}>
                                                {matchingT
                                                    ? <span style={{ color: t.success }}>✅ Tujuan {matchingT.id}: {matchingT.text?.slice(0, 80)}</span>
                                                    : <span style={{ color: t.error }}>❌ Belum ada Tujuan</span>}
                                            </div>
                                            <div>
                                                {matchingH
                                                    ? <span style={{ color: t.success }}>✅ Hipotesis {matchingH.id}: {matchingH.statement?.slice(0, 80)}</span>
                                                    : graph?.methodology === 'qualitative'
                                                        ? <span style={{ color: t.textLight }}>— Kualitatif (tanpa hipotesis)</span>
                                                        : <span style={{ color: t.warning }}>⚠️ Belum ada Hipotesis</span>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p style={{ color: t.textMuted, fontSize: 13 }}>
                            Belum ada Rumusan Masalah. Tambahkan di Project Settings.
                        </p>
                    )}
                </div>
            )}

            {/* CHAPTER PROGRESS + DEPENDENCY ARROWS */}
            {stats && (
                <div style={{
                    background: t.card, border: `1px solid ${t.cardBorder}`,
                    borderRadius: 16, padding: 24, marginBottom: 24,
                }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        📈 Chapter Progress & Dependencies
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {Object.entries(BAB_LABEL).map(([babId, label]) => {
                            const snap = stats.snaps[babId] || { status: 'empty' };
                            const statusInfo = STATUS_MAP[snap.status] || STATUS_MAP.empty;
                            const deps = CHAPTER_DEPS[babId] || [];
                            const depsApproved = deps.filter(d => (stats.snaps[d] || {}).status === 'approved');
                            const depsReady = deps.length === 0 || depsApproved.length === deps.length;
                            const progress = snap.status === 'approved' ? 100
                                : snap.status === 'near_complete' ? 80
                                    : snap.status === 'review' ? 70
                                        : snap.status === 'in_progress' ? 50
                                            : snap.status === 'draft' ? 30 : 0;

                            return (
                                <div key={babId} style={{
                                    background: t.bg, borderRadius: 12, padding: '14px 18px',
                                    border: `1px solid ${snap.status === 'approved' ? t.success + '44' : t.cardBorder}`,
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span>{statusInfo.icon}</span>
                                            <span style={{ fontWeight: 600, fontSize: 14 }}>{label}</span>
                                        </div>
                                        <span style={{
                                            fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                                            background: t[statusInfo.color + 'Bg'] || t.accentBg,
                                            color: t[statusInfo.color] || t.accent,
                                        }}>
                                            {statusInfo.label}
                                        </span>
                                    </div>
                                    {/* Progress bar */}
                                    <div style={{
                                        height: 6, borderRadius: 3, background: t.progressBg,
                                        marginBottom: 6, overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            height: '100%', borderRadius: 3, background: t.progressFill,
                                            width: `${progress}%`, transition: 'width 0.5s ease',
                                        }} />
                                    </div>
                                    {/* Deps */}
                                    {deps.length > 0 && (
                                        <div style={{ fontSize: 12, color: t.textMuted }}>
                                            Depends on: {deps.map(d => (
                                                <span key={d} style={{
                                                    marginRight: 6,
                                                    color: (stats.snaps[d] || {}).status === 'approved' ? t.success : t.textLight,
                                                }}>
                                                    {(stats.snaps[d] || {}).status === 'approved' ? '✅' : '⬜'} {d.toUpperCase()}
                                                </span>
                                            ))}
                                            {!depsReady && (
                                                <span style={{ color: t.warning, fontWeight: 600 }}>
                                                    — belum siap, approve dependensi dulu
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {/* Summary if exists */}
                                    {snap.summary && (
                                        <div style={{
                                            fontSize: 12, color: t.textMuted, marginTop: 6,
                                            fontStyle: 'italic', lineHeight: 1.5,
                                        }}>
                                            "{snap.summary.slice(0, 150)}{snap.summary.length > 150 ? '...' : ''}"
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ENTITY LOCKS */}
            {graph?.constraints && (
                <div style={{
                    background: t.card, border: `1px solid ${t.cardBorder}`,
                    borderRadius: 16, padding: 24,
                }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        🔒 Entity Locks
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
                        <LockCard t={t}
                            label="Variabel"
                            items={graph.constraints.locked_variables || []}
                            locked={(graph.constraints.approved_chapters || []).includes('bab1')}
                        />
                        <LockCard t={t}
                            label="Metodologi"
                            items={graph.constraints.locked_methodology ? [graph.constraints.locked_methodology] : []}
                            locked={(graph.constraints.approved_chapters || []).includes('bab3')}
                        />
                        <LockCard t={t}
                            label="Teknik Analisis"
                            items={graph.constraints.locked_analysis_methods || []}
                            locked={(graph.constraints.approved_chapters || []).includes('bab3')}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════
function StatCard({ t, icon, label, value }) {
    return (
        <div style={{
            background: t.card, border: `1px solid ${t.cardBorder}`,
            borderRadius: 12, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
        }}>
            <span style={{ fontSize: 24 }}>{icon}</span>
            <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: t.text }}>{value}</div>
                <div style={{ fontSize: 12, color: t.textMuted }}>{label}</div>
            </div>
        </div>
    );
}

function LockCard({ t, label, items, locked }) {
    return (
        <div style={{
            background: locked ? t.successBg : t.bg,
            border: `1px solid ${locked ? t.success + '44' : t.cardBorder}`,
            borderRadius: 12, padding: '14px 16px',
        }}>
            <div style={{
                fontSize: 13, fontWeight: 700, marginBottom: 8,
                color: locked ? t.success : t.textMuted,
                display: 'flex', alignItems: 'center', gap: 6,
            }}>
                {locked ? '🔒' : '🔓'} {label}
            </div>
            {items.length > 0 ? (
                items.map((item, i) => (
                    <div key={i} style={{
                        fontSize: 13, padding: '3px 0', color: t.text,
                    }}>
                        • {item}
                    </div>
                ))
            ) : (
                <div style={{ fontSize: 12, color: t.textLight, fontStyle: 'italic' }}>
                    Belum ada data
                </div>
            )}
        </div>
    );
}
