import { useThemeStore } from "@/store/themeStore";
import { cn } from "@/lib/utils";
import { FileText, BookOpen, Quote, ArrowUpRight } from "lucide-react";

interface StatsGridProps {
    stats: {
        projects: number;
        references: number;
        isPro: boolean;
    };
    loading: boolean;
}

export function StatsGrid({ stats, loading }: StatsGridProps) {
    const { theme } = useThemeStore();

    // Configuration for different themes
    const getThemeConfig = (index: number) => {
        if (theme === 'happy') {
            const gradients = [
                "bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 shadow-indigo-500/30 text-white",
                "bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-purple-500/30 text-white", // Changed second one
                "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 shadow-teal-500/30 text-white",
            ];
            return {
                card: cn(
                    gradients[index % gradients.length],
                    "border-none shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
                ),
                iconBg: "bg-white/20 backdrop-blur-md text-white",
                text: "text-white/90",
                value: "text-white",
                arrow: "text-white/80 border-white/20 hover:bg-white/20"
            };
        }

        // Standard themes
        const config = {
            light: {
                card: "bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200/50 transition-all duration-300",
                iconBg: "",
                text: "text-slate-500",
                value: "text-slate-900",
                arrow: "text-slate-400 border-slate-200 hover:bg-slate-50 hover:text-blue-600"
            },
            dark: {
                card: "bg-[#111F2E]/80 backdrop-blur-xl border border-[#1E3A5F]/50 shadow-none hover:bg-[#162A3F] hover:border-[#00C2FF]/30 transition-all duration-300",
                iconBg: "",
                text: "text-slate-400",
                value: "text-white",
                arrow: "text-slate-500 border-white/5 hover:bg-[#00C2FF]/10 hover:text-[#00C2FF] hover:border-[#00C2FF]/20"
            },
        }[theme as 'light' | 'dark'];

        return config;
    };

    const cards = [
        { label: "Active Projects", value: stats.projects, icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
        { label: "References", value: stats.references, icon: BookOpen, color: "text-indigo-500", bg: "bg-indigo-500/10" },
        { label: "Status", value: stats.isPro ? "PRO Plan" : "Free Plan", icon: Quote, color: stats.isPro ? "text-amber-500" : "text-slate-500", bg: stats.isPro ? "bg-amber-500/10" : "bg-slate-500/10" },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {cards.map((card, idx) => {
                const styles = getThemeConfig(idx);

                return (
                    <div
                        key={idx}
                        className={cn(
                            "relative p-6 rounded-2xl flex flex-col justify-between h-[140px] group cursor-pointer overflow-hidden",
                            styles.card
                        )}
                    >
                        {/* Glass Shine Effect for Happy Mode */}
                        {theme === 'happy' && (
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/20 pointer-events-none" />
                        )}

                        <div className="flex justify-between items-start relative z-10">
                            <div className={cn(
                                "p-3 rounded-xl transition-transform group-hover:scale-110 duration-500",
                                theme === 'happy' ? styles.iconBg : cn(card.bg, card.color)
                            )}>
                                <card.icon className="w-6 h-6" />
                            </div>

                            <div className={cn(
                                "w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0",
                                styles.arrow
                            )}>
                                <ArrowUpRight className="w-4 h-4" />
                            </div>
                        </div>

                        <div className="relative z-10">
                            <h4 className={cn(
                                "text-3xl font-extrabold tracking-tight group-hover:translate-x-1 transition-transform duration-300",
                                styles.value
                            )}>
                                {loading ? "..." : card.value}
                            </h4>
                            <p className={cn("text-sm font-medium mt-1 uppercase tracking-wide opacity-90", styles.text)}>
                                {card.label}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
