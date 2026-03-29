import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, XCircle, Info, ChevronDown, ChevronUp, RefreshCw, ShieldCheck } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';

const cn = (...classes) => classes.filter(Boolean).join(' ');

/**
 * RuleViolationBanner — displays AcademicRuleEngine validation results.
 * Fetches from /api/thesis-brain/graph/{projectId}/validate?chapter={chapter}
 * Shows errors (red), warnings (yellow), and info (blue) as collapsible items.
 */
const RuleViolationBanner = ({ projectId, chapter }) => {
    const { theme } = useThemeStore();
    const [violations, setViolations] = useState({ errors: [], warnings: [], info: [] });
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    const totalCount = violations.errors.length + violations.warnings.length + violations.info.length;
    const hasErrors = violations.errors.length > 0;
    const hasWarnings = violations.warnings.length > 0;

    const themeConfig = {
        light: {
            errorBg: "bg-red-50 border-red-200 text-red-800",
            warningBg: "bg-amber-50 border-amber-200 text-amber-800",
            infoBg: "bg-sky-50 border-sky-200 text-sky-800",
            successBg: "bg-emerald-50 border-emerald-200 text-emerald-700",
            pillError: "bg-red-100 text-red-700",
            pillWarn: "bg-amber-100 text-amber-700",
            pillInfo: "bg-sky-100 text-sky-700",
            itemBg: "bg-white/60",
        },
        dark: {
            errorBg: "bg-red-500/10 border-red-500/20 text-red-300",
            warningBg: "bg-amber-500/10 border-amber-500/20 text-amber-300",
            infoBg: "bg-sky-500/10 border-sky-500/20 text-sky-300",
            successBg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
            pillError: "bg-red-500/20 text-red-400",
            pillWarn: "bg-amber-500/20 text-amber-400",
            pillInfo: "bg-sky-500/20 text-sky-400",
            itemBg: "bg-white/5",
        },
        happy: {
            errorBg: "bg-red-50 border-red-200 text-red-700",
            warningBg: "bg-orange-50 border-orange-200 text-orange-700",
            infoBg: "bg-sky-50 border-sky-200 text-sky-700",
            successBg: "bg-emerald-50 border-emerald-200 text-emerald-600",
            pillError: "bg-red-100 text-red-600",
            pillWarn: "bg-orange-100 text-orange-600",
            pillInfo: "bg-sky-100 text-sky-600",
            itemBg: "bg-white/60",
        }
    }[theme || 'dark'];

    const fetchValidation = useCallback(async () => {
        if (!projectId || !chapter) return;
        setIsLoading(true);
        try {
            const url = `/api/thesis-brain/graph/${projectId}/validate?chapter=${chapter}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setViolations({
                    errors: data.errors || [],
                    warnings: data.warnings || [],
                    info: data.info || [],
                });
                setHasLoaded(true);
            }
        } catch (err) {
            console.warn('Rule validation fetch failed:', err.message);
        } finally {
            setIsLoading(false);
        }
    }, [projectId, chapter]);

    useEffect(() => {
        fetchValidation();
    }, [fetchValidation]);

    // Don't render if nothing loaded yet or no violations
    if (!hasLoaded || totalCount === 0) {
        if (hasLoaded && totalCount === 0) {
            return (
                <div className={cn("mx-3 mt-2 mb-1 px-3 py-2 rounded-lg border text-[11px] flex items-center gap-2", themeConfig.successBg)}>
                    <ShieldCheck size={13} />
                    <span className="font-medium">Thesis Brain: Semua validasi lolos ✓</span>
                </div>
            );
        }
        return null;
    }

    // Determine banner style based on severity
    const bannerStyle = hasErrors ? themeConfig.errorBg : hasWarnings ? themeConfig.warningBg : themeConfig.infoBg;
    const BannerIcon = hasErrors ? XCircle : hasWarnings ? AlertTriangle : Info;

    return (
        <div className={cn("mx-3 mt-2 mb-1 rounded-lg border text-[11px] overflow-hidden transition-all", bannerStyle)}>
            {/* Header — always visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-3 py-2 flex items-center justify-between gap-2 cursor-pointer"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <BannerIcon size={13} className="shrink-0" />
                    <span className="font-semibold truncate">
                        Thesis Brain: {violations.errors.length > 0 && `${violations.errors.length} error`}
                        {violations.errors.length > 0 && violations.warnings.length > 0 && ', '}
                        {violations.warnings.length > 0 && `${violations.warnings.length} warning`}
                        {(violations.errors.length > 0 || violations.warnings.length > 0) && violations.info.length > 0 && ', '}
                        {violations.info.length > 0 && `${violations.info.length} info`}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        onClick={(e) => { e.stopPropagation(); fetchValidation(); }}
                        className="p-0.5 rounded hover:opacity-70"
                        title="Refresh"
                    >
                        <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </div>
            </button>

            {/* Expanded items */}
            {isExpanded && (
                <div className="px-3 pb-2.5 space-y-1.5">
                    {violations.errors.map((v, i) => (
                        <div key={`e-${i}`} className={cn("px-2.5 py-1.5 rounded-md flex items-start gap-2", themeConfig.itemBg)}>
                            <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 mt-0.5", themeConfig.pillError)}>ERROR</span>
                            <span className="leading-relaxed">{v.message || v}</span>
                        </div>
                    ))}
                    {violations.warnings.map((v, i) => (
                        <div key={`w-${i}`} className={cn("px-2.5 py-1.5 rounded-md flex items-start gap-2", themeConfig.itemBg)}>
                            <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 mt-0.5", themeConfig.pillWarn)}>WARN</span>
                            <span className="leading-relaxed">{v.message || v}</span>
                        </div>
                    ))}
                    {violations.info.map((v, i) => (
                        <div key={`i-${i}`} className={cn("px-2.5 py-1.5 rounded-md flex items-start gap-2", themeConfig.itemBg)}>
                            <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 mt-0.5", themeConfig.pillInfo)}>INFO</span>
                            <span className="leading-relaxed">{v.message || v}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RuleViolationBanner;
