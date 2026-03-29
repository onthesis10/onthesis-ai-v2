import { useThemeStore } from "@/store/themeStore";
import { cn } from "@/lib/utils";
import { Play, Wand2, BarChart3, Sparkles, ChevronDown, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";

interface HeroSectionProps {
    userName?: string;
    activeProject: any;
    allProjects: any[];
    onProjectSelect: (project: any) => void;
}

export function HeroSection({ userName = "Kasep", activeProject, allProjects, onProjectSelect }: HeroSectionProps) {
    const { theme } = useThemeStore();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const hasProject = Boolean(activeProject);
    const thesisTitle = activeProject?.title || "Mulai Tesis Baru";
    const progress = activeProject?.progress || 0;
    const currentTheme = (theme as 'light' | 'dark' | 'happy') || 'dark';

    // --- KONFIGURASI TEMA ---
    const themeConfigs = {
        light: {
            container: "bg-white/80 backdrop-blur-3xl border border-white/60 shadow-xl shadow-slate-200/50",
            text: "text-slate-900",
            muted: "text-slate-500",
            accent: "text-blue-600",
            btnPrimary: "bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20",
            btnSecondary: "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50",
            dashboardBg: "bg-white/80 border-white/60 shadow-2xl shadow-blue-900/10",
            dashboardElement: "bg-slate-100",
            gridColor: "rgba(0,0,0,0.04)",
            orbColor: "bg-blue-400/20",
            dropdownTriggerBg: "bg-white/40 border-slate-200/60 hover:bg-white/60 text-slate-700",
            dropdownTriggerActive: "bg-white border-blue-200 shadow-md text-blue-700",
            dropdownContainer: "bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.12)]",
            dropdownItemHover: "hover:bg-slate-100/70 text-slate-600 hover:text-slate-900",
            dropdownItemActive: "bg-blue-50/80 border-blue-100 text-blue-700",
            scrollbarThumb: "rgba(0,0,0,0.2)",
            scrollbarThumbHover: "rgba(37, 99, 235, 0.6)"
        },
        dark: {
            container: "bg-[#0B1120]/80 backdrop-blur-3xl border border-white/10 shadow-2xl shadow-black/50",
            text: "text-white",
            muted: "text-slate-400",
            accent: "text-cyan-400",
            btnPrimary: "bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]",
            btnSecondary: "bg-white/5 border border-white/10 text-white hover:bg-white/10",
            dashboardBg: "bg-[#1e293b]/60 border-white/10 shadow-2xl shadow-black/50",
            dashboardElement: "bg-white/5",
            gridColor: "rgba(255,255,255,0.05)",
            orbColor: "bg-cyan-500/20",
            dropdownTriggerBg: "bg-white/5 border-white/10 hover:bg-white/10 text-white/90",
            dropdownTriggerActive: "bg-[#0f172a] border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)] text-white",
            dropdownContainer: "bg-[#0a1128]/85 backdrop-blur-2xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]",
            dropdownItemHover: "hover:bg-white/5 text-white/60 hover:text-white",
            dropdownItemActive: "bg-cyan-900/20 border-cyan-500/30 text-cyan-300",
            scrollbarThumb: "rgba(255,255,255,0.2)",
            scrollbarThumbHover: "rgba(34, 211, 238, 0.6)"
        },
        happy: {
            container: "bg-gradient-to-br from-indigo-500/90 via-purple-500/90 to-pink-500/90 backdrop-blur-3xl border border-white/20 text-white",
            text: "text-white",
            muted: "text-indigo-100",
            accent: "text-white drop-shadow-md",
            btnPrimary: "bg-white text-indigo-600 font-bold hover:bg-indigo-50 shadow-xl",
            btnSecondary: "bg-white/20 border border-white/30 text-white hover:bg-white/30",
            dashboardBg: "bg-white/20 border-white/30 shadow-2xl shadow-purple-900/20",
            dashboardElement: "bg-white/20",
            gridColor: "rgba(255,255,255,0.1)",
            orbColor: "bg-white/20",
            dropdownTriggerBg: "bg-white/10 border-white/20 hover:bg-white/20 text-white",
            dropdownTriggerActive: "bg-white/30 border-white/50 shadow-lg text-white",
            dropdownContainer: "bg-white/20 backdrop-blur-xl border border-white/30 shadow-[0_8px_32px_rgba(31,38,135,0.2)]",
            dropdownItemHover: "hover:bg-white/10 text-white/80 hover:text-white",
            dropdownItemActive: "bg-white/30 border-white/40 text-white font-semibold",
            scrollbarThumb: "rgba(255,255,255,0.35)",
            scrollbarThumbHover: "rgba(255,255,255,0.8)"
        }
    };

    const config = themeConfigs[currentTheme];

    // Inject Styles dengan Scrollbar Mac OS Presisi
    const styleInjection = `
      @keyframes float-dashboard {
        0%, 100% { transform: translateY(0) rotateX(2deg) rotateY(-12deg); }
        50% { transform: translateY(-15px) rotateX(5deg) rotateY(-10deg); }
      }
      @keyframes grid-move { 0% { transform: translateY(0); } 100% { transform: translateY(40px); } }
      @keyframes shimmer-fast { 0% { transform: translateX(-150%) skewX(-20deg); } 100% { transform: translateX(150%) skewX(-20deg); } }
      @keyframes pulse-soft { 0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } }

      .animate-float-dashboard { animation: float-dashboard 8s ease-in-out infinite; }
      .animate-grid-move { animation: grid-move 4s linear infinite; }
      .animate-shimmer-fast { animation: shimmer-fast 2.5s infinite; }
      .animate-pulse-soft { animation: pulse-soft 3s ease-in-out infinite; }

      @keyframes mac-pop {
        0% { opacity: 0; transform: scale(0.96) translateY(-4px); filter: blur(4px); }
        60% { opacity: 1; transform: scale(1.01) translateY(1px); filter: blur(0px); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
      }
      .animate-mac-pop { animation: mac-pop 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }

      /* --- SCROLLBAR MAC OS PERFECT --- */
      .custom-scroll {
        scrollbar-width: thin;
        scrollbar-color: ${config.scrollbarThumb} transparent;
      }
      .custom-scroll::-webkit-scrollbar {
        width: 14px; /* Area scroll agak lebar supaya mudah diklik */
      }
      .custom-scroll::-webkit-scrollbar-track {
        background: transparent;
      }
      .custom-scroll::-webkit-scrollbar-thumb {
        background-color: ${config.scrollbarThumb};
        border-radius: 100px; /* Sangat bulat */
        /* Trik penting: Border transparan agar ibu jari (thumb) mengecil ke tengah dan punya margin */
        border: 4px solid rgba(0,0,0,0);
        background-clip: padding-box;
      }
      .custom-scroll::-webkit-scrollbar-thumb:hover {
        background-color: ${config.scrollbarThumbHover};
      }
    `;

    return (
        <section className={cn(
            "relative rounded-[24px] p-6 sm:p-8 overflow-visible w-full max-w-6xl mx-auto min-h-[350px] flex items-center transition-colors duration-700",
            config.container
        )}>
            <style>{styleInjection}</style>

            {/* --- 1. BACKGROUND LAYERS --- */}
            <div className="absolute inset-0 overflow-hidden rounded-[24px] pointer-events-none z-0">
                <div className="absolute inset-0 [perspective:1000px] opacity-60">
                    <div className="absolute inset-0 origin-bottom [transform:rotateX(60deg)_scale(2)] bottom-[-50%] h-[200%]">
                        <div className="w-full h-full animate-grid-move" style={{ backgroundSize: '40px 40px', backgroundImage: `linear-gradient(to right, ${config.gridColor} 1px, transparent 1px), linear-gradient(to bottom, ${config.gridColor} 1px, transparent 1px)` }} />
                    </div>
                </div>
                <div className={cn("absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-transparent opacity-80", currentTheme === 'dark' ? "to-[#0B1120]" : "to-white/80")} />
                <div className={cn("absolute -top-[20%] -right-[10%] w-[400px] h-[400px] rounded-full blur-[100px]", config.orbColor)} />
                <div className={cn("absolute -bottom-[20%] -left-[10%] w-[300px] h-[300px] rounded-full blur-[80px]", config.orbColor)} />
            </div>

            {/* --- 2. MAIN LAYOUT --- */}
            <div className="relative z-10 w-full grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">

                {/* === LEFT COLUMN === */}
                <div className="space-y-5 max-w-lg relative z-50">
                    <div className="space-y-2">
                        <h1 className={cn("text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-[1.15]", config.text)}>
                            Riset Lebih Cerdas,<br />
                            <span className={cn(config.accent, "inline-block")}>
                                Menulis Lebih Cepat.
                            </span>
                        </h1>
                        <div className={cn("text-sm leading-relaxed max-w-md", config.muted)}>
                            Selamat datang kembali, <b>{userName}</b>. <br className="hidden md:block" />

                            {hasProject ? (
                                <div className="relative inline-flex items-center gap-2 mt-3 z-[9999]" ref={dropdownRef}>
                                    <span className={cn("text-[11px] uppercase tracking-widest font-bold opacity-70", config.text)}>Aktif:</span>

                                    <div className="relative">
                                        <button
                                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                            className={cn(
                                                "flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg border transition-all duration-300 w-[240px] sm:w-[260px] shadow-sm backdrop-blur-md",
                                                isDropdownOpen ? config.dropdownTriggerActive : config.dropdownTriggerBg
                                            )}
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <Activity className={cn("w-3.5 h-3.5 shrink-0 opacity-70")} />
                                                <span className="truncate font-medium text-[13px]">
                                                    {thesisTitle}
                                                </span>
                                            </div>
                                            <ChevronDown className={cn("w-3.5 h-3.5 shrink-0 transition-transform duration-300 opacity-60", isDropdownOpen && "rotate-180 opacity-100")} />
                                        </button>

                                        {/* Dropdown Container: Overflow Hidden dipisah dari Scroll biar rapi */}
                                        {isDropdownOpen && (
                                            <div className={cn(
                                                "absolute top-[calc(100%+8px)] left-0 w-full rounded-xl z-[9999] animate-mac-pop origin-top shadow-2xl overflow-hidden",
                                                config.dropdownContainer
                                            )}>
                                                {/* Inner Scroll Container */}
                                                <div className="max-h-[165px] w-full overflow-y-auto overflow-x-hidden custom-scroll p-1.5 space-y-0.5 relative">
                                                    {allProjects.map((p) => {
                                                        const isActive = p.id === activeProject.id;
                                                        return (
                                                            <button
                                                                key={p.id}
                                                                onClick={() => {
                                                                    onProjectSelect(p);
                                                                    setIsDropdownOpen(false);
                                                                }}
                                                                className={cn(
                                                                    "w-full text-left px-2.5 py-2 text-sm transition-all duration-200 rounded-lg flex flex-col gap-1.5 border",
                                                                    isActive ? config.dropdownItemActive : cn("border-transparent", config.dropdownItemHover)
                                                                )}
                                                            >
                                                                <div className="flex items-center justify-between w-full">
                                                                    <span className={cn("truncate font-medium text-xs pr-2 opacity-90")}>
                                                                        {p.title}
                                                                    </span>
                                                                    {isActive && <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", currentTheme === 'happy' ? "bg-white" : "bg-current")} />}
                                                                </div>

                                                                <div className="flex items-center gap-2 w-full">
                                                                    <div className={cn("flex-1 h-1 rounded-full overflow-hidden", currentTheme === 'light' ? "bg-slate-200" : "bg-black/30")}>
                                                                        <div
                                                                            className={cn("h-full rounded-full transition-all duration-500",
                                                                                isActive
                                                                                    ? (currentTheme === 'happy' ? "bg-white" : "bg-current")
                                                                                    : (currentTheme === 'light' ? "bg-slate-400/50" : "bg-white/30")
                                                                            )}
                                                                            style={{ width: `${p.progress ?? 0}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-[9px] opacity-60 font-mono w-5 text-right leading-none">
                                                                        {p.progress ?? 0}%
                                                                    </span>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <span className="mt-2 block">Belum ada proyek aktif. Mulai riset barumu sekarang!</span>
                            )}
                        </div>
                    </div>

                    {/* Progress Bar Compact (Themed) */}
                    <div className={cn("border rounded-xl p-3 backdrop-blur-sm max-w-xs mt-6", currentTheme === 'light' ? "bg-white/40 border-white/60" : "bg-white/5 border-white/10")}>
                        <div className="flex justify-between items-end mb-1.5">
                            <span className={cn("text-xs font-medium uppercase tracking-wider opacity-80", config.text)}>
                                {hasProject ? "Status Tesis" : "Setup Awal"}
                            </span>
                            <span className={cn("text-lg font-bold", config.text)}>{progress}%</span>
                        </div>
                        <div className={cn("h-1.5 w-full rounded-full overflow-hidden", currentTheme === 'light' ? "bg-slate-200/80" : "bg-black/20")}>
                            <div
                                className={cn("h-full rounded-full relative overflow-hidden",
                                    currentTheme === 'happy' ? "bg-white" : (currentTheme === 'light' ? "bg-blue-500" : "bg-gradient-to-r from-blue-600 to-cyan-500")
                                )}
                                style={{ width: `${progress}%` }}
                            >
                                <div className="absolute inset-0 bg-white/30 w-full animate-shimmer-fast" />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-row gap-3 pt-1">
                        <Link to="/writing" className={cn(
                            "h-10 px-5 rounded-lg flex items-center justify-center gap-2 font-semibold transition-all hover:-translate-y-0.5 active:scale-95 text-sm",
                            config.btnPrimary
                        )}>
                            <Wand2 className="w-3.5 h-3.5" />
                            Lanjut Menulis
                        </Link>
                        <Link to="/analysis" className={cn(
                            "h-10 px-5 rounded-lg flex items-center justify-center gap-2 font-medium transition-all hover:-translate-y-0.5 active:scale-95 backdrop-blur-md text-sm",
                            config.btnSecondary
                        )}>
                            <BarChart3 className="w-3.5 h-3.5 opacity-70" />
                            Analisis
                        </Link>
                    </div>
                </div>

                {/* === RIGHT COLUMN: COMPACT 3D MOCKUP === */}
                <div className="relative hidden lg:block perspective-[2000px] w-full max-w-[420px] mx-auto lg:mr-0 z-10">
                    <div className={cn(
                        "relative w-full aspect-[4/3] rounded-xl border backdrop-blur-xl transition-all duration-500 animate-float-dashboard",
                        config.dashboardBg
                    )}>
                        <div className="absolute top-0 w-full h-8 border-b border-white/10 flex items-center px-3 gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-red-400/80" />
                            <div className="w-2 h-2 rounded-full bg-amber-400/80" />
                            <div className="w-2 h-2 rounded-full bg-green-400/80" />
                            <div className="ml-auto w-16 h-1 rounded-full bg-current opacity-10" />
                        </div>
                        <div className="absolute inset-0 top-8 flex">
                            <div className="w-10 h-full border-r border-white/10 flex flex-col items-center py-4 gap-3">
                                <div className={cn("w-5 h-5 rounded-md", config.dashboardElement)} />
                                <div className={cn("w-5 h-5 rounded-md opacity-50", config.dashboardElement)} />
                                <div className={cn("w-5 h-5 rounded-md opacity-50", config.dashboardElement)} />
                                <div className="mt-auto w-5 h-5 rounded-full border border-white/20" />
                            </div>
                            <div className="flex-1 p-4 space-y-4">
                                <div className="flex gap-2 items-end h-20 w-full pb-2 border-b border-white/10">
                                    <div className={cn("w-full rounded-t-sm h-[40%]", config.dashboardElement)} />
                                    <div className={cn("w-full rounded-t-sm h-[70%]", config.dashboardElement)} />
                                    <div className={cn("w-full rounded-t-sm h-[50%]", config.dashboardElement)} />
                                    <div className={cn("w-full rounded-t-sm h-[90%] bg-gradient-to-t from-transparent to-current opacity-20")} />
                                </div>
                                <div className="space-y-2">
                                    <div className={cn("h-2 w-3/4 rounded-full", config.dashboardElement)} />
                                    <div className={cn("h-2 w-1/2 rounded-full", config.dashboardElement)} />
                                    <div className={cn("h-2 w-full rounded-full opacity-50", config.dashboardElement)} />
                                </div>
                                <div className="absolute bottom-4 right-4 animate-pulse-soft">
                                    <div className={cn(
                                        "flex items-center gap-2 px-2.5 py-2 rounded-lg shadow-lg border border-white/20 backdrop-blur-md",
                                        currentTheme === 'dark' ? "bg-cyan-500/20 text-cyan-300" : "bg-white/90 text-blue-600"
                                    )}>
                                        <Sparkles className="w-3 h-3 fill-current" />
                                        <div>
                                            <p className="text-[8px] uppercase font-bold tracking-widest opacity-70 leading-none">AI Insight</p>
                                            <p className="text-[10px] font-semibold leading-none">Paraphrasing Ready</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="absolute -bottom-6 left-6 right-6 h-2 bg-black/20 blur-lg rounded-[100%] transform scale-x-90" />
                </div>
            </div>
        </section>
    );
}