import { useState, useEffect } from 'react'
import { useAnalysisStore } from '../../store/useAnalysisStore'
import { useThemeStore, type ThemeMode } from '@/store/themeStore'
import {
    BarChart3,
    Sparkles,
    BrainCircuit, Lightbulb, ChevronRight, History, Trash2, Calendar, Loader, FileText
} from 'lucide-react'
import { motion } from 'framer-motion'
import { customToast } from '../../lib/customToast'
import { cn } from '@/lib/utils'

import { ChartRenderer } from '../../visualization/ChartRenderer'
import { transformAnalysisChartToNormalizedData } from '../../visualization/utils/analysisAdapter'
import ReactMarkdown from 'react-markdown'
import { ExportMenu } from '../ui/ExportMenu'
import { DocxGenerator } from '../../services/export/docxGenerator'
import { PdfClient } from '../../services/export/pdfClient'
import { ExportMapper } from '../../services/export/mapper'
import { AnalysisLoader } from '../ui/AnalysisLoader'

export const OutputView = () => {
    const analysisResult = useAnalysisStore(s => s.analysisResult);
    const setAnalysisResult = useAnalysisStore(s => s.setAnalysisResult);
    const isAnalyzing = useAnalysisStore(s => s.isAnalyzing);
    const analysisInterpretation = useAnalysisStore(s => s.analysisInterpretation);
    const analysisError = useAnalysisStore(s => s.analysisError);
    const analysisHistory = useAnalysisStore(s => s.analysisHistory);
    const fetchHistory = useAnalysisStore(s => s.fetchHistory);
    const deleteHistory = useAnalysisStore(s => s.deleteHistory);
    const setAnalysisError = useAnalysisStore(s => s.setAnalysisError);

    const { theme } = useThemeStore()

    const [explainingChart, setExplainingChart] = useState<string | null>(null)
    const [chartExplanations, setChartExplanations] = useState<Record<string, string>>({})
    const [isExporting, setIsExporting] = useState(false)
    const [insightLoadingText, setInsightLoadingText] = useState("Analyzing...")
    const [isGeneratingInsight, setIsGeneratingInsight] = useState(false)

    useEffect(() => {
        let interval: NodeJS.Timeout
        if (isGeneratingInsight) {
            const messages = ["Connecting...", "Reading Data...", "Analyzing Trends...", "Finalizing Insight..."]
            let i = 0
            setInsightLoadingText(messages[0])
            interval = setInterval(() => {
                i = (i + 1) % messages.length
                setInsightLoadingText(messages[i])
            }, 2000)
        }
        return () => clearInterval(interval)
    }, [isGeneratingInsight])

    const handleExport = async (format: 'pdf' | 'docx') => {
        if (!analysisResult) return

        setIsExporting(true)
        try {
            const chartImages = {}
            const schema = ExportMapper.mapToSchema(
                analysisResult,
                analysisInterpretation,
                useAnalysisStore.getState().userData,
                chartImages,
                useAnalysisStore.getState().researchContext
            )

            if (format === 'docx') {
                await DocxGenerator.generate(schema)
                customToast.success("Export DOCX berhasil")
            } else {
                await PdfClient.generate(schema)
                customToast.success("Export PDF berhasil")
            }
        } catch (e) {
            console.error("Export failed:", e)
            customToast.error("Gagal melakukan export")
        } finally {
            setIsExporting(false)
        }
    }

    const handleAIInsight = async () => {
        if (analysisInterpretation) {
            customToast.success("Insight AI sudah tersedia")
            return
        }

        setIsGeneratingInsight(true)
        try {
            const res = await fetch('/api/interpret-result', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    result_data: JSON.stringify(analysisResult),
                    context: useAnalysisStore.getState().researchContext
                })
            })
            const json = await res.json()
            if (json.status === 'success') {
                useAnalysisStore.getState().setInterpretation(json.interpretation)
                customToast.success("Insight AI berhasil dibuat")
            } else {
                customToast.error("Gagal membuat insight AI: " + json.message)
            }
        } catch (e) {
            console.error("AI Insight failed:", e)
            customToast.error("Gagal menghubungi layanan AI")
        } finally {
            setIsGeneratingInsight(false)
        }
    }

    useEffect(() => {
        fetchHistory()
    }, [])

    useEffect(() => {
        if (analysisResult && analysisError) {
            setAnalysisError(null)
        }
    }, [analysisResult, analysisError])

    // Show error toast when analysisError is set to prevent freezing illusion
    useEffect(() => {
        if (analysisError) {
            customToast.error(analysisError);
        }
    }, [analysisError])

    const handleExplainChart = async (chartId: string, chartData: any) => {
        setExplainingChart(chartId)
        try {
            const res = await fetch('/api/interpret-chart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: chartData.title || `Chart ${chartId}`,
                    type: chartData.type,
                    data: chartData.data
                })
            })
            const json = await res.json()
            if (json.status === 'success') {
                setChartExplanations(prev => ({ ...prev, [chartId]: json.explanation }))
            } else {
                setChartExplanations(prev => ({ ...prev, [chartId]: "Available on PRO Plan." }))
            }
        } catch (e) {
            console.error(e)
            customToast.error("Gagal meminta penjelasan AI")
        } finally {
            setExplainingChart(null)
        }
    }

    // --- THEME CONFIG (Matched with AppSidebar) ---
    const activeConfig = {
        light: {
            containerBg: "bg-[#F5F5F7] text-slate-700",
            emptyState: "bg-[#F5F5F7] text-slate-500",
            emptyIconRing: "ring-black/5 bg-white text-slate-400",
            panelBg: "bg-white/80 border-white/20 shadow-xl backdrop-blur-3xl ring-1 ring-black/5",
            cardBg: "bg-white/80 border-transparent shadow-sm hover:shadow-md ring-1 ring-black/5 backdrop-blur-xl",
            textMain: "text-slate-500",
            textMuted: "text-slate-400",
            textTitle: "text-slate-900",
            iconBg: "bg-[#007AFF]/10 text-[#007AFF] border-transparent",
            btnPrimary: "bg-[#007AFF] text-white shadow-md shadow-blue-500/20 hover:opacity-90 border-transparent",
            btnSecondary: "bg-white/80 hover:bg-black/5 text-slate-600 border-black/5 backdrop-blur-xl",
            insightCard: "bg-white/80 ring-1 ring-black/5 shadow-sm",
            insightIcon: "text-[#007AFF] bg-[#007AFF]/10",
            tableRowHover: "hover:bg-black/5 group",
            tableHeader: "bg-black/5 text-slate-500 border-transparent",
            statCardBg: "bg-white/50 border-black/5",
            historyItemHover: "hover:bg-black/5 border-transparent",
            chartExplainBtnReady: "bg-emerald-50 text-emerald-600 border-emerald-200",
            chartExplainBtnNormal: "bg-[#007AFF]/10 text-[#007AFF] border-transparent hover:bg-[#007AFF]/20"
        },
        dark: {
            containerBg: "bg-[#0B1120] text-slate-300",
            emptyState: "bg-[#0B1120] text-slate-500",
            emptyIconRing: "ring-white/5 bg-white/5 text-slate-400",
            panelBg: "bg-[#1E293B]/80 border-white/10 shadow-2xl backdrop-blur-3xl ring-1 ring-white/5",
            cardBg: "bg-[#1E293B]/50 border-white/5 shadow-sm hover:shadow-md backdrop-blur-xl",
            textMain: "text-slate-400",
            textMuted: "text-slate-500",
            textTitle: "text-white",
            iconBg: "bg-[#0EA5E9]/10 text-[#0EA5E9] border-transparent",
            btnPrimary: "bg-[#0EA5E9] text-white shadow-[0_0_20px_-5px_rgba(14,165,233,0.5)] hover:opacity-90 border-transparent",
            btnSecondary: "bg-white/5 hover:bg-white/10 text-slate-300 border-white/5 backdrop-blur-xl",
            insightCard: "bg-[#1E293B]/50 ring-1 ring-white/5 shadow-sm",
            insightIcon: "text-[#0EA5E9] bg-[#0EA5E9]/10",
            tableRowHover: "hover:bg-white/5 group",
            tableHeader: "bg-white/5 text-slate-400 border-transparent",
            statCardBg: "bg-white/5 border-transparent",
            historyItemHover: "hover:bg-white/5 border-transparent",
            chartExplainBtnReady: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
            chartExplainBtnNormal: "bg-white/5 text-slate-300 border-white/5 hover:bg-white/10"
        },
        happy: {
            containerBg: "bg-[#FFFCF5] text-stone-600",
            emptyState: "bg-[#FFFCF5] text-stone-400",
            emptyIconRing: "ring-orange-100 bg-white text-orange-300",
            panelBg: "bg-white/80 border-white/60 shadow-xl shadow-orange-500/10 backdrop-blur-3xl ring-1 ring-orange-100",
            cardBg: "bg-white/60 border-transparent shadow-sm hover:shadow-md ring-1 ring-orange-100 backdrop-blur-xl hover:bg-white/80",
            textMain: "text-stone-500",
            textMuted: "text-stone-400",
            textTitle: "text-stone-900",
            iconBg: "bg-orange-50 text-orange-500 border-transparent",
            btnPrimary: "bg-gradient-to-r from-orange-400 to-rose-400 text-white shadow-lg shadow-orange-500/25 hover:opacity-90 border-transparent",
            btnSecondary: "bg-white/80 hover:bg-orange-50 text-orange-600 border-orange-100 backdrop-blur-xl",
            insightCard: "bg-white/80 ring-1 ring-orange-100 shadow-sm shadow-orange-500/5",
            insightIcon: "text-orange-500 bg-orange-50",
            tableRowHover: "hover:bg-orange-50/50 group",
            tableHeader: "bg-orange-50/50 text-stone-500 border-transparent",
            statCardBg: "bg-white/50 border-orange-50",
            historyItemHover: "hover:bg-white/60 border-transparent hover:ring-1 hover:ring-orange-100",
            chartExplainBtnReady: "bg-emerald-50 text-emerald-600 border-emerald-200",
            chartExplainBtnNormal: "bg-orange-50 text-orange-500 border-transparent hover:bg-orange-100"
        }
    }[theme as ThemeMode || 'dark'];

    if (!analysisResult && !isAnalyzing) {
        return (
            <div className={cn("flex flex-col items-center justify-center h-full transition-colors duration-500", activeConfig.emptyState)}>
                <div className={cn("w-24 h-24 rounded-full flex items-center justify-center mb-6 ring-4 transition-all", activeConfig.emptyIconRing)}>
                    <BarChart3 className="w-10 h-10 opacity-80" />
                </div>
                <h3 className={cn("text-xl font-bold mb-2 tracking-tight", activeConfig.textTitle)}>Belum Ada Analisis</h3>
                <p className={cn("max-w-md text-center font-medium", activeConfig.textMuted)}>
                    Pilih variabel dan jalankan analisis di panel Data View untuk melihat hasil visualisasi di sini.
                </p>
                {/* History Quick Access for Empty State */}
                <div className="mt-8 w-full max-w-sm">
                    <h4 className={cn("text-xs font-bold uppercase tracking-wider mb-3 text-center", activeConfig.textMuted)}>Riwayat Terakhir</h4>
                    <div className="space-y-2">
                        {analysisHistory.slice(0, 3).map((item: any) => (
                            <div
                                key={item.id}
                                className={cn("group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border", activeConfig.cardBg, activeConfig.historyItemHover)}
                                onClick={() => {
                                    setAnalysisResult(item, true);
                                    customToast.success("Analisis dimuat");
                                }}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={cn("p-2 rounded-lg", activeConfig.iconBg)}>
                                        <History className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className={cn("text-sm font-bold truncate transition-colors", activeConfig.textTitle)}>
                                            {item.title || "Tanpa Judul"}
                                        </p>
                                        <p className={cn("text-[10px] uppercase font-bold tracking-wider", activeConfig.textMuted)}>
                                            {new Date(item.timestamp).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight className={cn("w-4 h-4", activeConfig.textMuted)} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    const formattedDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div className={cn("h-full flex flex-col overflow-hidden relative transition-colors duration-500", activeConfig.containerBg)}>

            {/* Background Ambient Glow (Dark Mode Only - Adjusted to Cyan) */}
            {theme === 'dark' && (
                <>
                    <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#0EA5E9]/10 rounded-full blur-[100px] pointer-events-none" />
                    <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
                </>
            )}

            {/* Header Toolbar (Floating Glass) */}
            <div className={cn("flex items-center justify-between px-6 py-4 z-40 transition-all sticky top-4 mx-6 rounded-2xl border", activeConfig.panelBg)}>
                <div className="flex items-center gap-4">
                    <div className={cn("p-2.5 rounded-xl border shadow-sm", activeConfig.iconBg)}>
                        <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className={cn("text-lg font-bold tracking-tight drop-shadow-sm", activeConfig.textTitle)}>
                            {analysisResult?.title || "Hasil Analisis"}
                        </h2>
                        <div className={cn("flex items-center gap-2 text-xs font-semibold uppercase tracking-wider", activeConfig.textMuted)}>
                            <span>
                                {analysisResult?.method || "Analisis Statistik"}
                            </span>
                            <span className="opacity-50">•</span>
                            <span className="flex items-center gap-1 opacity-80">
                                <Calendar className="w-3 h-3" />
                                {formattedDate}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Header Actions */}
                    <div className={cn("flex items-center gap-2 mr-4 border-r pr-4", theme === 'dark' ? "border-white/10" : "border-black/5")}>
                        <button
                            onClick={handleAIInsight}
                            disabled={isGeneratingInsight || !!analysisInterpretation}
                            className={cn(
                                "relative overflow-hidden px-4 py-1.5 text-xs font-bold rounded-lg flex items-center gap-2 transition-all border",
                                isGeneratingInsight
                                    ? "opacity-50 cursor-not-allowed w-[160px] justify-center text-current"
                                    : activeConfig.btnPrimary
                            )}
                        >
                            {isGeneratingInsight && (
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                    animate={{ x: ['-100%', '100%'] }}
                                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                />
                            )}
                            {isGeneratingInsight ? (
                                <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    <span key={insightLoadingText} className="animate-in fade-in slide-in-from-bottom-1 duration-300">
                                        {insightLoadingText}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>{analysisInterpretation ? 'Insight Ready' : 'AI Insight'}</span>
                                </>
                            )}
                        </button>
                        <button className={cn("px-3 py-1.5 text-xs font-bold rounded-lg border transition-all backdrop-blur-sm", activeConfig.btnSecondary)}>
                            Share
                        </button>
                        <ExportMenu onExport={handleExport} isExporting={isExporting} />
                    </div>

                    {/* History Dropdown */}
                    <div className="relative group z-50">
                        <button className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border transition-all backdrop-blur-sm", activeConfig.btnSecondary)}>
                            <History className="w-4 h-4" />
                            <span className="text-sm font-semibold">Riwayat</span>
                        </button>

                        <div className={cn("absolute top-full right-0 mt-2 w-80 border rounded-xl overflow-hidden hidden group-hover:block animate-in fade-in slide-in-from-top-2 duration-200 z-[100]", activeConfig.panelBg)}>
                            <div className={cn("p-3 border-b", theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-black/5 bg-black/5')}>
                                <h4 className={cn("text-xs font-bold uppercase tracking-wider", activeConfig.textMuted)}>Riwayat Analisis</h4>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                                {!analysisHistory || analysisHistory.length === 0 ? (
                                    <div className={cn("p-8 text-center text-sm font-medium", activeConfig.textMuted)}>
                                        Belum ada riwayat tersimpan.
                                    </div>
                                ) : (
                                    analysisHistory.map((item: any) => (
                                        <div
                                            key={item.id}
                                            className={cn("group/item flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer mb-1 last:mb-0", activeConfig.historyItemHover)}
                                            onClick={() => {
                                                setAnalysisResult(item, true);
                                                customToast.success("Analisis dimuat dari riwayat");
                                            }}
                                        >
                                            <div className="flex-1 min-w-0 pr-3">
                                                <p className={cn("text-sm font-bold truncate transition-colors", activeConfig.textTitle)}>
                                                    {item.title || "Tanpa Judul"}
                                                </p>
                                                <p className={cn("text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5", activeConfig.textMuted)}>
                                                    <Calendar className="w-3 h-3 opacity-70" />
                                                    {item.timestamp ? new Date(item.timestamp).toLocaleString('id-ID') : 'Baru saja'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm("Hapus riwayat ini?")) {
                                                        deleteHistory(item.id);
                                                        customToast.success("Riwayat dihapus");
                                                    }
                                                }}
                                                className="p-1.5 text-red-500/70 hover:text-red-600 hover:bg-red-500/10 rounded-full opacity-0 group-hover/item:opacity-100 transition-all bg-transparent border-0 outline-none"
                                                title="Hapus Riwayat"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-24">
                <div className="p-6 space-y-6 animate-in fade-in zoom-in-95 duration-300">

                    {/* 1. Statistical Conclusion (Green Card) - "Insight from BE" */}
                    {analysisResult?.statistical_insight && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn("rounded-2xl p-6 relative overflow-hidden group transition-all border", theme === 'happy' ? "bg-emerald-50/80 border-emerald-200" : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-500/30")}
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Sparkles className="w-24 h-24 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="flex items-start gap-4 relative z-10">
                                <div className="p-3 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                                    <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-100 tracking-tight">Statistical Conclusion</h3>
                                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 rounded text-[10px] font-bold text-emerald-700 dark:text-emerald-400 tracking-wider uppercase">
                                            AUTOMATED
                                        </span>
                                    </div>
                                    <p className="text-emerald-800 dark:text-emerald-200/80 leading-relaxed text-sm font-semibold">
                                        {analysisResult.statistical_insight}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* 2. AI Interpretation - "Explain with AI" */}
                    {analysisInterpretation && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className={cn("rounded-2xl p-6 relative overflow-hidden transition-all border", activeConfig.insightCard)}
                        >
                            <div className={cn("absolute top-0 left-0 w-1 h-full", theme === 'happy' ? "bg-gradient-to-b from-orange-400 to-rose-400" : (theme === 'dark' ? "bg-gradient-to-b from-[#0EA5E9] to-blue-500" : "bg-[#007AFF]"))}></div>
                            <div className="flex items-start gap-4">
                                <div className={cn("p-3 rounded-xl", activeConfig.insightIcon)}>
                                    <BrainCircuit className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h3 className={cn("text-lg font-bold mb-3 flex items-center gap-2", activeConfig.textTitle)}>
                                        AI Interpretation
                                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border", theme === 'happy' ? "bg-orange-100 text-orange-600 border-orange-200" : "bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-100 dark:border-blue-500/20")}>Powered by Onthesis</span>
                                    </h3>
                                    <div className={cn("prose prose-sm max-w-none leading-relaxed font-medium", theme === 'dark' ? "prose-invert" : "prose-slate", theme === 'happy' && "prose-stone")}>
                                        <ReactMarkdown>{analysisInterpretation}</ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* 3. Tables - "Table Hasil" */}
                    <div className="grid grid-cols-1 gap-6">
                        {/* Detailed Table (Priority) */}
                        {analysisResult?.summary_table && analysisResult.summary_table.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className={cn("rounded-2xl overflow-hidden border transition-all", activeConfig.cardBg)}
                            >
                                <div className={cn("px-6 py-4 border-b flex items-center justify-between", activeConfig.tableHeader)}>
                                    <div className="flex items-center gap-3">
                                        <div className={cn("w-1 h-5 rounded-full", theme === 'happy' ? "bg-orange-400" : (theme === 'dark' ? "bg-[#0EA5E9]" : "bg-[#007AFF]"))}></div>
                                        <h3 className={cn("text-base font-bold", activeConfig.textTitle)}>Summary Statistics</h3>
                                    </div>
                                    <div className={activeConfig.textMuted}>
                                        <BarChart3 className="w-4 h-4" />
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className={cn("border-b", activeConfig.tableHeader)}>
                                                {Object.keys(analysisResult.summary_table[0]).map((header) => (
                                                    <th key={header} className="py-4 px-6 text-xs font-black uppercase tracking-widest whitespace-nowrap">
                                                        {header.replace(/_/g, ' ')}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className={cn("divide-y", theme === 'dark' ? 'divide-white/5' : 'divide-black/5')}>
                                            {analysisResult.summary_table.map((row: any, idx: number) => (
                                                <tr key={idx} className={cn("transition-colors", activeConfig.tableRowHover)}>
                                                    {Object.values(row).map((val: any, i) => (
                                                        <td key={i} className={cn("py-4 px-6 text-sm whitespace-nowrap font-mono font-medium transition-colors", activeConfig.textMain, `group-hover:${activeConfig.textTitle}`)}>
                                                            {typeof val === 'number'
                                                                ? (Number.isInteger(val) ? val : val.toFixed(4))
                                                                : String(val)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}

                        {/* Simple Summary (Secondary) */}
                        {analysisResult?.summary && !analysisResult?.summary_table && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className={cn("rounded-2xl p-6 border transition-all", activeConfig.cardBg)}
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={cn("w-1 h-5 rounded-full", theme === 'happy' ? "bg-orange-400" : (theme === 'dark' ? "bg-[#0EA5E9]" : "bg-[#007AFF]"))}></div>
                                    <h3 className={cn("text-base font-bold", activeConfig.textTitle)}>General Metrics</h3>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {Object.entries(analysisResult.summary).map(([key, value]: [string, any]) => (
                                        <div key={key} className={cn("p-4 rounded-xl border", activeConfig.statCardBg)}>
                                            <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-1", activeConfig.textMuted)}>{key.replace(/_/g, ' ')}</p>
                                            <p className={cn("text-lg font-mono font-bold", activeConfig.textTitle)}>
                                                {typeof value === 'number'
                                                    ? value.toLocaleString('id-ID', { maximumFractionDigits: 4 })
                                                    : String(value)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* 4. Charts - "Charts sesuai uji analisis" */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {analysisResult?.charts && Object.entries(analysisResult.charts).map(([key, chartData]: [string, any]) => (
                            <div key={key} className={cn("rounded-xl p-4 border transition-all flex flex-col group", activeConfig.cardBg)}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className={cn("flex-shrink-0 p-1.5 rounded-lg transition-colors", activeConfig.iconBg)}>
                                            <BarChart3 className="w-4 h-4" />
                                        </div>
                                        <h4 className={cn("font-bold text-xs tracking-wide truncate", activeConfig.textTitle)} title={chartData.title}>
                                            {chartData.title}
                                        </h4>
                                    </div>
                                    <button
                                        onClick={() => handleExplainChart(key, chartData)}
                                        disabled={explainingChart === key}
                                        className={cn(
                                            "flex-shrink-0 px-3 py-1 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm border",
                                            chartExplanations[key] ? activeConfig.chartExplainBtnReady : activeConfig.chartExplainBtnNormal
                                        )}
                                    >
                                        {explainingChart === key ? <Loader className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                        {chartExplanations[key] ? 'Insight Loaded' : 'AI Explain'}
                                    </button>
                                </div>

                                <div className={cn("h-60 w-full rounded-lg border p-1 overflow-hidden relative flex-1 min-h-[240px]", activeConfig.statCardBg)}>
                                    <ChartRenderer
                                        data={transformAnalysisChartToNormalizedData(chartData)}
                                    />
                                </div>

                                {chartExplanations[key] && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className={cn("mt-3 p-3 rounded-lg relative overflow-hidden border", activeConfig.insightCard)}
                                    >
                                        <div className={cn("absolute top-0 left-0 w-0.5 h-full", theme === 'happy' ? "bg-orange-400" : "bg-amber-500")}></div>
                                        <div className="flex gap-2.5">
                                            <Lightbulb className={cn("w-4 h-4 flex-shrink-0 mt-0.5 animate-pulse", theme === 'happy' ? "text-orange-500" : "text-amber-500")} />
                                            <div className="space-y-1">
                                                <p className={cn("text-[10px] font-bold uppercase tracking-widest", theme === 'happy' ? 'text-orange-700' : 'text-amber-700 dark:text-amber-300')}>AI Visualization Insight</p>
                                                <p className={cn("text-xs leading-relaxed font-semibold", activeConfig.textTitle)}>{chartExplanations[key]}</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {/* OVERLAY LOADER */}
            {(isExporting || isGeneratingInsight) && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 dark:bg-[#0B1120]/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <AnalysisLoader
                        messages={
                            isExporting
                                ? ["Preparing Document...", "Formatting Tables (APA 7)...", "Rendering High-Res Charts...", "Finalizing Export..."]
                                : ["Connecting to AI...", "Reading Analysis Context...", "identifying Patterns...", "Writing Interpretation...", "Finalizing Insight..."]
                        }
                    />
                </div>
            )}
        </div>
    )
}