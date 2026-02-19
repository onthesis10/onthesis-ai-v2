import { motion } from 'framer-motion'
import {
    Database, Sparkles, Keyboard, Calculator,
    BarChart2, Activity, ArrowLeftRight, GitBranch,
    TrendingUp, Scale, PieChart, Table2, BarChart3,
    Bot, BookOpen, LayoutGrid, Save, FileSpreadsheet
} from 'lucide-react'
import { useAnalysisStore, ViewMode } from '../../store/useAnalysisStore'
import { cn } from '@/lib/utils'

// Import komponen Shadcn UI (sesuaikan path import kamu)
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
import { Button } from "@/components/ui/button" // Optional, bisa pakai button biasa

export const AnalysisToolbar = () => {
    const { openAnalysis, toggleGenerator, viewMode, setViewMode } = useAnalysisStore()

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
        { id: 'ai-assistant', label: 'AI', icon: Bot },
        { id: 'guide', label: 'Guide', icon: BookOpen },
    ]

    return (
        <div className="sticky top-4 z-50 w-fit mx-auto mb-6">
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex items-center gap-1.5 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 p-1.5 rounded-full shadow-xl shadow-zinc-200/20 dark:shadow-black/40 ring-1 ring-black/5"
            >

                {/* --- 1. View Switcher (Tetap menggunakan Framer Motion agar smooth) --- */}
                <nav className="flex items-center bg-zinc-100/50 dark:bg-zinc-900/50 p-1 rounded-full border border-zinc-200/50 dark:border-zinc-800/50">
                    {viewOptions.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => setViewMode(option.id)}
                            className={cn(
                                "relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-200 z-10",
                                viewMode === option.id
                                    ? "text-zinc-900 dark:text-zinc-50"
                                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                            )}
                        >
                            {viewMode === option.id && (
                                <motion.div
                                    layoutId="pill-nav"
                                    className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-full shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                />
                            )}
                            <span className="relative flex items-center gap-1.5">
                                <option.icon className={cn("w-3.5 h-3.5", viewMode === option.id ? "stroke-[2.5px]" : "stroke-[2px]")} />
                                <span className="hidden sm:inline">{option.label}</span>
                            </span>
                        </button>
                    ))}
                </nav>

                <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

                {/* --- 2. Action Tools (Menggunakan Shadcn Dropdown) --- */}
                <div className="flex items-center gap-1">

                    {/* DATA MENU */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-zinc-400">
                                <LayoutGrid className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Project</span>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl">
                            <DropdownMenuLabel>Data Management</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2 cursor-pointer">
                                <FileSpreadsheet className="w-3.5 h-3.5 opacity-70" /> Open Dataset...
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="gap-2 text-indigo-600 dark:text-indigo-400 focus:text-indigo-700 focus:bg-indigo-50 cursor-pointer"
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
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                    >
                        <Keyboard className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Input</span>
                    </button>

                    {/* ANALYZE MENU (The Star of the Show) */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-sm transition-colors outline-none"
                            >
                                <Calculator className="w-3.5 h-3.5" />
                                Analyze
                            </motion.button>
                        </DropdownMenuTrigger>

                        {/* DropdownMenuContent:
                            - align="end": Agar menu muncul rata kanan dengan tombol.
                            - sideOffset: Memberi jarak sedikit dari tombol.
                        */}
                        <DropdownMenuContent align="end" sideOffset={8} className="w-56 rounded-xl p-1.5">
                            <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5 font-normal">
                                Select Analysis Method
                            </DropdownMenuLabel>

                            {menuFamilies.map((fam) => (
                                <DropdownMenuSub key={fam.title}>
                                    <DropdownMenuSubTrigger className="rounded-lg text-xs py-2 px-2.5 cursor-pointer flex items-center gap-2">
                                        <fam.icon className="w-3.5 h-3.5 opacity-70 text-zinc-500 dark:text-zinc-400" />
                                        <span>{fam.title}</span>
                                        {/* Chevron otomatis ditangani oleh SubTrigger */}
                                    </DropdownMenuSubTrigger>

                                    {/* Sub Menu Content */}
                                    <DropdownMenuPortal>
                                        <DropdownMenuSubContent className="w-48 rounded-xl p-1 shadow-lg border-zinc-200 dark:border-zinc-800">
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