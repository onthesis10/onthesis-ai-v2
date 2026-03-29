import { motion } from 'framer-motion'
import {
    Database, Sparkles, Keyboard, Calculator,
    BarChart2, Activity, ArrowLeftRight, GitBranch,
    TrendingUp, Scale, PieChart, Table2, BarChart3,
    MessageCircle, BookOpen, FolderKanban, Save, FileSpreadsheet
} from 'lucide-react'
import { useAnalysisStore, ViewMode } from '../../store/useAnalysisStore'
import { useThemeStore } from '@/store/themeStore' // Import Theme Store
import { cn } from '@/lib/utils'

// Import komponen Shadcn UI
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export const AnalysisToolbar = () => {
    const openAnalysis = useAnalysisStore(s => s.openAnalysis);
    const toggleGenerator = useAnalysisStore(s => s.toggleGenerator);
    const viewMode = useAnalysisStore(s => s.viewMode);
    const setViewMode = useAnalysisStore(s => s.setViewMode);
    const { theme } = useThemeStore()

    // --- Theme Config (Matches AppSidebar.tsx) ---
    const themeStyles = {
        light: {
            container: "bg-[#F5F5F7]/80 border-black/5",
            pillNav: "bg-white/50 border-black/5",
            active: "text-white shadow-md shadow-blue-500/20",     // Text & Shadow only (bg handled by motion)
            activeBg: "#007AFF",                                   // For framer motion bg
            inactive: "text-slate-500 hover:text-slate-900 hover:bg-black/5",
            actionBtn: "text-slate-500 hover:bg-black/5 hover:text-slate-900",
            analyzeBtn: "bg-[#007AFF] text-white hover:bg-[#007AFF]/90 shadow-blue-500/20",
            dropdown: "bg-white/80 border-white/20"
        },
        dark: {
            container: "bg-[#0B1120]/80 border-white/5",
            pillNav: "bg-black/20 border-white/5",
            active: "text-white shadow-[0_0_20px_-5px_rgba(14,165,233,0.5)]",
            activeBg: "#0EA5E9",
            inactive: "text-slate-400 hover:text-slate-200 hover:bg-white/5",
            actionBtn: "text-slate-400 hover:bg-white/5 hover:text-slate-200",
            analyzeBtn: "bg-[#0EA5E9] text-white hover:bg-[#0EA5E9]/90 shadow-cyan-500/20",
            dropdown: "bg-[#1E293B]/90 border-white/10"
        },
        happy: {
            // Tropical Morning
            container: "bg-[#FFFCF5]/80 border-orange-100/50",
            pillNav: "bg-orange-50/50 border-orange-100/30",
            active: "text-white font-bold shadow-lg shadow-orange-500/25",
            activeBg: "linear-gradient(to right, #fb923c, #fb7185)", // Orange-400 to Rose-400
            inactive: "text-stone-500 hover:bg-orange-50/80 hover:text-orange-600",
            actionBtn: "text-stone-500 hover:bg-orange-50/80 hover:text-orange-600",
            analyzeBtn: "bg-gradient-to-r from-orange-400 to-rose-400 text-white hover:shadow-orange-500/40 shadow-orange-500/25",
            dropdown: "bg-white/90 border-orange-100"
        }
    }[theme || 'light']

    const activeConfig = themeStyles

    // Struktur Menu Analisis
    const menuFamilies = [
        { title: "Descriptive", icon: BarChart2, items: [{ label: "Descriptive Summary", id: "descriptive-analysis" }, { label: "Frequency Table", id: "frequency-table" }] },
        { title: "Assumption", icon: Activity, items: [{ label: "Normality Test", id: "normality" }] },
        { title: "Comparison", icon: ArrowLeftRight, items: [{ label: "Independent T-Test", id: "independent-ttest" }, { label: "Paired T-Test", id: "paired-ttest" }, { label: "One-Way ANOVA", id: "oneway-anova" }] },
        { title: "Relationship", icon: GitBranch, items: [{ label: "Correlation", id: "correlation-analysis" }] },
        { title: "Prediction", icon: TrendingUp, items: [{ label: "Linear Regression", id: "linear-regression" }] },
        { title: "Non-Parametric", icon: Scale, items: [{ label: "Mann-Whitney U", id: "mann-whitney" }, { label: "Wilcoxon Signed", id: "wilcoxon" }, { label: "Kruskal-Wallis", id: "kruskal-wallis" }] },
        { title: "Reliability", icon: PieChart, items: [{ label: "Reliability", id: "reliability" }, { label: "Validity", id: "validity" }, { label: "Chi-Square", id: "chi-square" }] }
    ]

    const viewOptions: { id: ViewMode; label: string; icon: any }[] = [
        { id: 'data', label: 'Data', icon: Database },
        { id: 'variable', label: 'Vars', icon: Table2 },
        { id: 'output', label: 'Output', icon: BarChart3 },
        { id: 'ai-assistant', label: 'AI', icon: MessageCircle },
        { id: 'guide', label: 'Guide', icon: BookOpen },
    ]

    return (
        <div className="sticky top-2 z-50 w-fit mx-auto mb-2"> {/* Reduced marging and top offset */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={cn(
                    "flex items-center gap-1.5 backdrop-blur-3xl p-1.5 rounded-full shadow-xl ring-1 ring-black/5 transition-colors duration-500",
                    activeConfig.container
                )}
            >

                {/* --- 1. View Switcher --- */}
                <nav className={cn("flex items-center p-1 rounded-full border transition-colors duration-500", activeConfig.pillNav)}>
                    {viewOptions.map((option) => {
                        const isActive = viewMode === option.id
                        return (
                            <button
                                key={option.id}
                                onClick={() => setViewMode(option.id)}
                                className={cn(
                                    "relative flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all duration-300 z-10",
                                    isActive ? activeConfig.active : activeConfig.inactive
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="pill-nav"
                                        className="absolute inset-0 rounded-full shadow-sm"
                                        style={{ background: activeConfig.activeBg }}
                                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                    />
                                )}
                                <span className="relative flex items-center gap-1.5 z-20">
                                    <option.icon className={cn("w-4 h-4", isActive ? "stroke-[2.5px]" : "stroke-[2px]")} />
                                    <span className="hidden sm:inline">{option.label}</span>
                                </span>
                            </button>
                        )
                    })}
                </nav>

                <div className="h-6 w-px bg-current opacity-10 mx-1" />

                {/* --- 2. Action Tools --- */}
                <div className="flex items-center gap-1.5">

                    {/* DATA MENU */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className={cn("flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-colors outline-none", activeConfig.actionBtn)}>
                                <FolderKanban className="w-4 h-4" />
                                <span className="hidden sm:inline">Project</span>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className={cn("w-48 rounded-xl backdrop-blur-xl", activeConfig.dropdown)}>
                            <DropdownMenuLabel>Data Management</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2 cursor-pointer">
                                <FileSpreadsheet className="w-3.5 h-3.5 opacity-70" /> Open Dataset...
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="gap-2 text-indigo-600 focus:text-indigo-700 focus:bg-indigo-50 cursor-pointer"
                                onClick={() => toggleGenerator(true)}
                            >
                                <Sparkles className="w-3.5 h-3.5" /> AI Generator
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2 cursor-pointer">
                                <Save className="w-3.5 h-3.5 opacity-70" /> Save Project
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* INPUT BUTTON */}
                    <button
                        onClick={() => useAnalysisStore.getState().initManualInput()}
                        className={cn("flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-colors outline-none", activeConfig.actionBtn)}
                    >
                        <Keyboard className="w-4 h-4" />
                        <span className="hidden sm:inline">Input</span>
                    </button>

                    {/* ANALYZE MENU */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={cn("flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm outline-none ml-1", activeConfig.analyzeBtn)}
                            >
                                <Calculator className="w-4 h-4" />
                                Analyze
                            </motion.button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end" sideOffset={8} className={cn("w-56 rounded-xl p-1.5 backdrop-blur-xl", activeConfig.dropdown)}>
                            <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5 font-normal">
                                Select Analysis Method
                            </DropdownMenuLabel>

                            {menuFamilies.map((fam) => (
                                <DropdownMenuSub key={fam.title}>
                                    <DropdownMenuSubTrigger className="rounded-lg text-xs py-2 px-2.5 cursor-pointer flex items-center gap-2">
                                        <fam.icon className="w-3.5 h-3.5 opacity-70" />
                                        <span>{fam.title}</span>
                                    </DropdownMenuSubTrigger>

                                    <DropdownMenuPortal>
                                        <DropdownMenuSubContent className={cn("w-48 rounded-xl p-1 shadow-lg", activeConfig.dropdown)}>
                                            {fam.items.map((item) => (
                                                <DropdownMenuItem
                                                    key={item.id}
                                                    onClick={() => openAnalysis(item.id)}
                                                    className="rounded-lg text-xs py-2 px-2.5 cursor-pointer"
                                                >
                                                    {item.label}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                </DropdownMenuSub>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                </div>
            </motion.div>
        </div>
    )
}