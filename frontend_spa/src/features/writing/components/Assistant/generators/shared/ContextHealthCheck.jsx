import React from 'react';
import { AlertTriangle, Settings, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';
import { cn } from '@/lib/utils';

/**
 * ContextHealthCheck
 * Premium empty-state when user hasn't filled Project metadata.
 * Supports 3-mode theme (light/dark/happy).
 */
const ContextHealthCheck = ({ project, children }) => {
    const { theme } = useThemeStore();

    const hasTitle = project?.title && project?.title !== 'Proyek Baru';
    const hasProblem = project?.problem_statement && project?.problem_statement.trim().length > 10;
    const isReady = hasTitle && hasProblem;

    // Theme config matching AppSidebar.tsx
    const ts = {
        light: {
            outerBg: "bg-gradient-to-b from-slate-50 to-white",
            cardBg: "bg-white/80 backdrop-blur-xl border border-black/5 shadow-xl shadow-black/5",
            iconContainer: "bg-amber-50 border border-amber-100",
            iconColor: "text-amber-500",
            title: "text-slate-800",
            subtitle: "text-slate-500",
            checklistBg: "bg-slate-50/80 border border-black/5",
            checkDone: "text-emerald-500",
            checkPending: "text-red-400",
            checkLabel: "text-slate-600",
            checkLabelDone: "text-slate-800 font-semibold",
            divider: "bg-black/5",
            ctaBg: "bg-[#007AFF] text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30",
            footerText: "text-slate-400",
            settingsIcon: "text-[#007AFF]",
        },
        dark: {
            outerBg: "bg-gradient-to-b from-[#0B1120] to-[#1E293B]/50",
            cardBg: "bg-[#1E293B]/60 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/30",
            iconContainer: "bg-amber-500/10 border border-amber-500/20",
            iconColor: "text-amber-400",
            title: "text-slate-100",
            subtitle: "text-slate-400",
            checklistBg: "bg-black/20 border border-white/5",
            checkDone: "text-emerald-400",
            checkPending: "text-red-400",
            checkLabel: "text-slate-400",
            checkLabelDone: "text-slate-200 font-semibold",
            divider: "bg-white/5",
            ctaBg: "bg-[#0EA5E9] text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30",
            footerText: "text-slate-500",
            settingsIcon: "text-cyan-400",
        },
        happy: {
            outerBg: "bg-gradient-to-b from-orange-50/50 to-white",
            cardBg: "bg-white/80 backdrop-blur-xl border border-orange-100 shadow-xl shadow-orange-500/5",
            iconContainer: "bg-orange-50 border border-orange-100",
            iconColor: "text-orange-500",
            title: "text-stone-800",
            subtitle: "text-stone-500",
            checklistBg: "bg-orange-50/50 border border-orange-100",
            checkDone: "text-emerald-500",
            checkPending: "text-red-400",
            checkLabel: "text-stone-500",
            checkLabelDone: "text-stone-800 font-semibold",
            divider: "bg-orange-100",
            ctaBg: "bg-gradient-to-r from-orange-400 to-rose-400 text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30",
            footerText: "text-stone-400",
            settingsIcon: "text-orange-500",
        }
    }[theme] || {};

    if (!isReady) {
        const items = [
            {
                done: hasTitle,
                label: "Judul Project",
                hint: "Nama penelitian yang spesifik"
            },
            {
                done: hasProblem,
                label: "Rumusan Masalah",
                hint: "Min. 10 karakter, jelas & terukur"
            }
        ];

        const completedCount = items.filter(i => i.done).length;

        return (
            <div className={cn("flex flex-col items-center justify-center h-full p-6", ts.outerBg)}>
                {/* Floating Card */}
                <div className={cn("w-full max-w-[280px] rounded-2xl p-6 text-center transition-all duration-500", ts.cardBg)}>

                    {/* Animated Icon */}
                    <div className="flex justify-center mb-5">
                        <div className={cn("p-4 rounded-2xl transition-colors", ts.iconContainer)}>
                            <AlertTriangle size={28} className={cn("animate-pulse", ts.iconColor)} strokeWidth={1.8} />
                        </div>
                    </div>

                    {/* Title */}
                    <h3 className={cn("text-base font-bold mb-2 tracking-tight", ts.title)}>
                        Lengkapi Data Project
                    </h3>
                    <p className={cn("text-xs leading-relaxed mb-6", ts.subtitle)}>
                        AI butuh konteks agar hasil akurat dan relevan — tanpa halusinasi.
                    </p>

                    {/* Progress */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className={cn("text-[10px] font-bold uppercase tracking-widest", ts.subtitle)}>
                                Kelengkapan
                            </span>
                            <span className={cn("text-[10px] font-bold", completedCount === items.length ? ts.checkDone : ts.checkPending)}>
                                {completedCount}/{items.length}
                            </span>
                        </div>
                        <div className={cn("h-1 rounded-full overflow-hidden", ts.divider)}>
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all duration-700",
                                    completedCount === items.length
                                        ? "bg-emerald-500"
                                        : completedCount > 0
                                            ? (theme === 'happy' ? "bg-orange-400" : "bg-amber-400")
                                            : "bg-red-400"
                                )}
                                style={{ width: `${(completedCount / items.length) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Checklist */}
                    <div className={cn("rounded-xl p-3 space-y-2.5 mb-6", ts.checklistBg)}>
                        {items.map((item, i) => (
                            <div key={i} className="flex items-start gap-2.5">
                                {item.done ? (
                                    <CheckCircle2 size={16} className={cn("shrink-0 mt-0.5", ts.checkDone)} />
                                ) : (
                                    <div className={cn("w-4 h-4 rounded-full border-2 shrink-0 mt-0.5", ts.checkPending, "border-current opacity-60")} />
                                )}
                                <div className="text-left">
                                    <div className={cn("text-xs", item.done ? ts.checkLabelDone : ts.checkLabel)}>
                                        {item.label}
                                    </div>
                                    {!item.done && (
                                        <div className={cn("text-[10px] mt-0.5 opacity-70", ts.subtitle)}>
                                            {item.hint}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* CTA Button */}
                    <button
                        onClick={() => {
                            // Find the settings button in ProjectSidebar and trigger it  
                            const settingsBtn = document.querySelector('[data-settings-trigger]');
                            if (settingsBtn) settingsBtn.click();
                        }}
                        className={cn(
                            "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 active:scale-[0.98]",
                            ts.ctaBg
                        )}
                    >
                        <Settings size={14} />
                        Buka Pengaturan Project
                        <ChevronRight size={14} />
                    </button>
                </div>

                {/* Footer Hint */}
                <p className={cn("text-[10px] mt-5 flex items-center gap-1", ts.footerText)}>
                    <Settings size={10} className={ts.settingsIcon} />
                    Klik "Pengaturan Project" di sidebar kiri
                </p>
            </div>
        );
    }

    return <>{children}</>;
};

export default ContextHealthCheck;