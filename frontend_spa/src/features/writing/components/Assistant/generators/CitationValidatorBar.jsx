import React, { useState, useCallback } from 'react';
import { ShieldAlert, ShieldCheck, Ghost, BookX, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';

const cn = (...classes) => classes.filter(Boolean).join(' ');

/**
 * CitationValidatorBar — post-generation citation validation.
 * Calls /api/rag/citations/{projectId}/validate to detect:
 * - Phantom citations (AI-invented references not in user's pool)
 * - Ungrounded claims (flagged with [BUTUH REFERENSI])
 * Shows results as an action bar below the generated output.
 */
const CitationValidatorBar = ({ projectId, generatedText }) => {
    const { theme } = useThemeStore();
    const [result, setResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const cfg = {
        light: {
            bar: "bg-slate-50 border-slate-200 text-slate-700",
            btn: "bg-white border-slate-200 text-slate-600 hover:bg-slate-100 shadow-sm",
            phantom: "bg-red-50 border-red-200 text-red-700",
            ungrounded: "bg-amber-50 border-amber-200 text-amber-700",
            verified: "bg-emerald-50 border-emerald-200 text-emerald-700",
            pill: "bg-slate-100 text-slate-600",
        },
        dark: {
            bar: "bg-white/5 border-white/10 text-slate-300",
            btn: "bg-white/10 border-white/10 text-slate-300 hover:bg-white/15",
            phantom: "bg-red-500/10 border-red-500/20 text-red-300",
            ungrounded: "bg-amber-500/10 border-amber-500/20 text-amber-300",
            verified: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
            pill: "bg-white/10 text-slate-400",
        },
        happy: {
            bar: "bg-orange-50/50 border-orange-200 text-stone-700",
            btn: "bg-white border-orange-200 text-stone-600 hover:bg-orange-50 shadow-sm",
            phantom: "bg-red-50 border-red-200 text-red-600",
            ungrounded: "bg-orange-50 border-orange-200 text-orange-600",
            verified: "bg-emerald-50 border-emerald-200 text-emerald-600",
            pill: "bg-orange-100 text-stone-600",
        }
    }[theme || 'dark'];

    const handleValidate = useCallback(async () => {
        if (!projectId || !generatedText) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/rag/citations/${projectId}/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: generatedText }),
            });
            if (res.ok) {
                const data = await res.json();
                setResult(data);
                setIsExpanded(true);
            }
        } catch (err) {
            console.warn('Citation validation failed:', err.message);
        } finally {
            setIsLoading(false);
        }
    }, [projectId, generatedText]);

    if (!projectId || !generatedText) return null;

    const phantomCount = result?.phantom_citations?.length || 0;
    const ungroundedCount = result?.ungrounded_claims?.length || 0;
    const verifiedCount = result?.verified?.length || 0;
    const totalCitations = result?.total_citations || 0;
    const score = result?.integrity_score;
    const hasIssues = phantomCount > 0 || ungroundedCount > 0;

    return (
        <div className={cn("border-t", cfg.bar)}>
            {/* Action Bar */}
            <div className="px-4 py-2 flex items-center justify-between">
                {!result ? (
                    <button
                        onClick={handleValidate}
                        disabled={isLoading}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer",
                            cfg.btn
                        )}
                    >
                        {isLoading ? (
                            <><Loader2 size={11} className="animate-spin" /> Memeriksa sitasi...</>
                        ) : (
                            <><ShieldAlert size={11} /> Cek Sitasi</>
                        )}
                    </button>
                ) : (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center gap-2 cursor-pointer"
                    >
                        {hasIssues ? (
                            <ShieldAlert size={12} className="text-amber-500" />
                        ) : (
                            <ShieldCheck size={12} className="text-emerald-500" />
                        )}
                        <span className="text-[10px] font-bold">
                            {totalCitations} sitasi • {verifiedCount} verified
                            {phantomCount > 0 && ` • ${phantomCount} phantom`}
                            {ungroundedCount > 0 && ` • ${ungroundedCount} butuh ref`}
                        </span>

                        {/* Score Badge */}
                        {score !== undefined && (
                            <span className={cn(
                                "px-1.5 py-0.5 rounded text-[9px] font-bold",
                                score >= 0.8 ? "bg-emerald-500/20 text-emerald-500" :
                                    score >= 0.5 ? "bg-amber-500/20 text-amber-500" :
                                        "bg-red-500/20 text-red-500"
                            )}>
                                {Math.round(score * 100)}%
                            </span>
                        )}

                        {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>
                )}

                {result && (
                    <button
                        onClick={() => { setResult(null); setIsExpanded(false); }}
                        className={cn("text-[9px] font-medium px-2 py-1 rounded", cfg.pill)}
                    >
                        Reset
                    </button>
                )}
            </div>

            {/* Expanded Results */}
            {isExpanded && result && (
                <div className="px-4 pb-3 space-y-2">
                    {/* Phantom Citations */}
                    {phantomCount > 0 && (
                        <div className={cn("rounded-lg border p-2.5 space-y-1.5", cfg.phantom)}>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                                <Ghost size={11} /> Phantom Citations ({phantomCount})
                            </div>
                            {result.phantom_citations.map((p, i) => (
                                <div key={i} className="text-[11px] leading-relaxed pl-5">
                                    <span className="font-mono font-bold">{p.citation}</span>
                                    <span className="opacity-70 ml-1">— {p.reason}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Ungrounded Claims */}
                    {ungroundedCount > 0 && (
                        <div className={cn("rounded-lg border p-2.5 space-y-1.5", cfg.ungrounded)}>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                                <BookX size={11} /> Butuh Referensi ({ungroundedCount})
                            </div>
                            {result.ungrounded_claims.map((u, i) => (
                                <div key={i} className="text-[11px] leading-relaxed pl-5">
                                    <span className="font-medium">"{u}"</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* All Good */}
                    {!hasIssues && verifiedCount > 0 && (
                        <div className={cn("rounded-lg border p-2.5", cfg.verified)}>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold">
                                <ShieldCheck size={11} /> Semua {verifiedCount} sitasi terverifikasi ✓
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CitationValidatorBar;
