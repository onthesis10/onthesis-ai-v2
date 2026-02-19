import { useThemeStore } from "@/store/themeStore";
import { cn } from "@/lib/utils";
import { Sparkles, MessageCircle, ArrowRight } from "lucide-react";

export function InsightPanel() {
    const { theme } = useThemeStore();

    const config = {
        light: "bg-gradient-to-r from-[#F5FBFF] to-[#EAF8FF] border border-[#0E5E9C]/10 text-slate-800",
        dark: "bg-gradient-to-r from-[#111F2E] to-[#162A3F] border border-[#00C2FF]/20 shadow-[0_0_30px_rgba(0,194,255,0.05)] text-white",
        // New Happy Mode: Vibrant Aurora Gradient
        happy: "bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 border-none shadow-xl shadow-purple-500/20 text-white",
    }[theme];

    return (
        <div className={cn(
            "rounded-2xl p-6 lg:p-8 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden group hover:scale-[1.005] transition-transform duration-500",
            config
        )}>
            {/* Background Texture/Noise for Premium Feel */}
            {theme === 'happy' && (
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none"></div>
            )}

            {/* Decor Icon */}
            <div className={cn(
                "absolute top-0 right-0 p-8 transition-opacity pointer-events-none",
                theme === 'happy' ? "opacity-10 text-white" : "opacity-5"
            )}>
                <Sparkles className="w-32 h-32" />
            </div>

            <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-lg relative z-10",
                theme === 'dark' ? "bg-[#00C2FF] text-[#0B1622] shadow-[#00C2FF]/20" :
                    theme === 'happy' ? "bg-white/20 backdrop-blur-md border border-white/20 text-white shadow-inner" :
                        "bg-primary text-primary-foreground"
            )}>
                <Sparkles className="w-8 h-8 animate-pulse" />
            </div>

            <div className="flex-1 text-center md:text-left relative z-10">
                <h3 className="text-xl font-bold mb-2 flex items-center justify-center md:justify-start gap-2">
                    AI Insight
                    <span className={cn(
                        "text-[10px] uppercase font-extrabold tracking-widest px-2 py-0.5 rounded-md",
                        theme === 'happy' ? "bg-white/20 text-white border border-white/30" : "bg-primary/10 text-primary border border-primary/20"
                    )}>
                        Daily
                    </span>
                </h3>
                <p className={cn(
                    "leading-relaxed max-w-2xl text-lg",
                    theme === 'happy' ? "text-white/90 font-medium" : "text-muted-foreground"
                )}>
                    "Your writing momentum is strongest in the mornings. Try scheduling a 2-hour Deep Work block tomorrow at 9 AM to finish **Chapter 2** methodology."
                </p>
            </div>

            <button className={cn(
                "shrink-0 h-12 px-6 rounded-xl font-semibold flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap relative z-10",
                theme === 'dark'
                    ? "border border-[#00C2FF]/30 hover:bg-[#00C2FF]/10 text-[#00C2FF]"
                    : theme === 'happy'
                        ? "bg-white text-purple-600 hover:bg-white/90 shadow-lg"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}>
                <MessageCircle className="w-4 h-4" />
                <span>Ask Details</span>
                <ArrowRight className="w-4 h-4" />
            </button>
        </div>
    );
}
