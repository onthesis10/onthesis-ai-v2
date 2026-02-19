import { useState, useEffect } from 'react'
import { useAnalysisStore } from '../../store/useAnalysisStore'
import {
    BarChart3,
    Sparkles,
    BrainCircuit, Lightbulb, ChevronRight, History, Trash2, Calendar, Loader, FileText
} from 'lucide-react'
import { motion } from 'framer-motion'
import { customToast } from '../../lib/customToast'

import { ChartRenderer } from '../../visualization/ChartRenderer'
import { transformAnalysisChartToNormalizedData } from '../../visualization/utils/analysisAdapter'
import ReactMarkdown from 'react-markdown'
import { ExportMenu } from '../ui/ExportMenu'
import { DocxGenerator } from '../../services/export/docxGenerator'
import { PdfClient } from '../../services/export/pdfClient'
import { ExportMapper } from '../../services/export/mapper'
import { AnalysisLoader } from '../ui/AnalysisLoader' // Import Loader


export const OutputView = () => {
    const {
        analysisResult,
        setAnalysisResult,
        isAnalyzing,
        analysisInterpretation,
        analysisError,
        analysisHistory,
        fetchHistory,
        deleteHistory,
        setAnalysisError,
    } = useAnalysisStore()

    const [explainingChart, setExplainingChart] = useState<string | null>(null)
    const [chartExplanations, setChartExplanations] = useState<Record<string, string>>({})
    const [isExporting, setIsExporting] = useState(false)
    const [insightLoadingText, setInsightLoadingText] = useState("Analyzing...")
    const [isGeneratingInsight, setIsGeneratingInsight] = useState(false)

    // Cycle text for AI Insight Loader
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
            // Collect chart images if needed (for now passing empty or implementing capture later)
            const chartImages = {}

            const schema = ExportMapper.mapToSchema(
                analysisResult,
                analysisInterpretation,
                useAnalysisStore.getState().userData,
                chartImages,
                useAnalysisStore.getState().researchContext
            )

            // Artificial delay to show off the loader if it's too fast, or just let it be.
            // But user asked for "smooth & alive", so maybe a tiny min-wait if it's instant?
            // For now, relies on actual process time.

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


    // Load history on mount
    useEffect(() => {
        fetchHistory()
    }, [])

    // Clear error when mounting if we have a result
    useEffect(() => {
        if (analysisResult && analysisError) {
            setAnalysisError(null)
        }
    }, [analysisResult, analysisError])

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

    if (!analysisResult && !isAnalyzing) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950">
                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-6 ring-4 ring-slate-200 dark:ring-slate-800/30">
                    <BarChart3 className="w-10 h-10 text-slate-400 dark:opacity-50" />
                </div>
                <h3 className="text-xl font-medium text-slate-700 dark:text-slate-200 mb-2">Belum Ada Analisis</h3>
                <p className="max-w-md text-center text-slate-500 dark:text-slate-500">
                    Pilih variabel dan jalankan analisis di panel Data View untuk melihat hasil visualisasi di sini.
                </p>
                {/* History Quick Access for Empty State */}
                <div className="mt-8 w-full max-w-sm">
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-600 uppercase tracking-wider mb-3 text-center">Riwayat Terakhir</h4>
                    <div className="space-y-2">
                        {analysisHistory.slice(0, 3).map((item: any) => (
                            <div
                                key={item.id}
                                className="group flex items-center justify-between p-3 bg-white dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-all border border-slate-200 dark:border-transparent hover:border-indigo-500/20 shadow-sm dark:shadow-none"
                                onClick={() => {
                                    setAnalysisResult(item, true);
                                    customToast.success("Analisis dimuat");
                                }}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-500 dark:text-indigo-400">
                                        <History className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                                            {item.title || "Tanpa Judul"}
                                        </p>
                                        <p className="text-[10px] text-slate-500">
                                            {new Date(item.timestamp).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    // --- Helper to formatted Date ---
    const formattedDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div className="h-full flex flex-col overflow-hidden relative transition-colors duration-500 bg-slate-50 dark:bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] dark:from-slate-900 dark:via-[#0B1121] dark:to-black text-slate-900 dark:text-slate-200">

            {/* Background Ambient Glow (Dark Mode Only) */}
            <>
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none hidden dark:block" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none hidden dark:block" />
            </>

            {/* Header Toolbar (Floating Glass) */}
            <div className="flex items-center justify-between px-6 py-4 z-40 transition-all sticky top-4 mx-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-lg dark:shadow-2xl shadow-slate-200/50 dark:shadow-black/50">

                <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl border shadow-sm dark:shadow-lg bg-white dark:bg-gradient-to-br dark:from-indigo-500/20 dark:to-cyan-500/20 border-slate-200 dark:border-white/10 text-indigo-600 dark:text-cyan-400">
                        <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white drop-shadow-sm">
                            {analysisResult?.title || "Hasil Analisis"}
                        </h2>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="px-2 py-0.5 rounded-full border bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/5 shadow-inner">
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
                    <div className="flex items-center gap-2 mr-4 border-r border-slate-200 dark:border-white/10 pr-4">
                        <button
                            onClick={handleAIInsight}
                            disabled={isGeneratingInsight || !!analysisInterpretation}
                            className={`relative overflow-hidden px-4 py-1.5 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-all border border-indigo-400/20 group
                            ${isGeneratingInsight
                                    ? 'bg-indigo-900/50 cursor-not-allowed w-[160px] justify-center'
                                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] w-auto'
                                }`}
                        >
                            {isGeneratingInsight && (
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                                    animate={{ x: ['-100%', '100%'] }}
                                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                />
                            )}
                            {isGeneratingInsight ? (
                                <>
                                    <Loader className="w-4 h-4 animate-spin text-indigo-300" />
                                    <span key={insightLoadingText} className="animate-in fade-in slide-in-from-bottom-1 duration-300 text-indigo-200">
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
                        <button className="px-3 py-1.5 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-lg border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-all backdrop-blur-sm shadow-sm dark:shadow-none">
                            Share
                        </button>
                        <ExportMenu onExport={handleExport} isExporting={isExporting} />
                    </div>

                    {/* History Dropdown */}
                    <div className="relative group z-50">
                        <button
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all bg-white dark:bg-slate-800/40 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40 hover:text-slate-900 dark:hover:text-white backdrop-blur-sm shadow-sm dark:shadow-none"
                        >
                            <History className="w-4 h-4" />
                            <span className="text-sm font-medium">Riwayat</span>
                        </button>

                        <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-[#0f172a]/95 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl dark:shadow-black/50 overflow-hidden hidden group-hover:block animate-in fade-in slide-in-from-top-2 duration-200 z-[100] backdrop-blur-xl">
                            <div className="p-3 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5">
                                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Riwayat Analisis</h4>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                                {!analysisHistory || analysisHistory.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500 text-sm">
                                        Belum ada riwayat tersimpan.
                                    </div>
                                ) : (
                                    analysisHistory.map((item: any) => (
                                        <div
                                            key={item.id}
                                            className="group/item flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer mb-1 last:mb-0"
                                            onClick={() => {
                                                setAnalysisResult(item, true); // true = skip saving to history again
                                                customToast.success("Analisis dimuat dari riwayat");
                                            }}
                                        >
                                            <div className="flex-1 min-w-0 pr-3">
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate group-hover/item:text-indigo-600 dark:group-hover/item:text-cyan-400 transition-colors">
                                                    {item.title || "Tanpa Judul"}
                                                </p>
                                                <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
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
                                                className="p-1.5 text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full opacity-0 group-hover/item:opacity-100 transition-all"
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
                            className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-6 relative overflow-hidden group hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-all shadow-sm dark:shadow-none"
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
                                        <h3 className="text-lg font-bold text-emerald-900 dark:text-white tracking-tight">Statistical Conclusion</h3>
                                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 rounded text-[10px] font-bold text-emerald-700 dark:text-emerald-400 tracking-wider uppercase">
                                            AUTOMATED
                                        </span>
                                    </div>
                                    <p className="text-emerald-800 dark:text-slate-300 leading-relaxed text-sm font-medium">
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
                            className="bg-white dark:bg-[#1e293b]/50 border border-slate-200 dark:border-indigo-500/20 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden shadow-sm dark:shadow-none"
                        >
                            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-500"></div>
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
                                    <BrainCircuit className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                        AI Interpretation
                                        <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/20 rounded-full text-[10px] text-indigo-600 dark:text-indigo-300 font-normal border border-indigo-100 dark:border-indigo-500/20">Powered by Onthesis</span>
                                    </h3>
                                    <div className="prose prose-sm prose-slate dark:prose-invert max-w-none leading-relaxed">
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
                                className="bg-white dark:bg-[#1e293b]/80 border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl"
                            >
                                <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-white/[0.02]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Summary Statistics</h3>
                                    </div>
                                    <div className="text-slate-400 dark:text-slate-500">
                                        <BarChart3 className="w-4 h-4" />
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-white/5">
                                                {Object.keys(analysisResult.summary_table[0]).map((header) => (
                                                    <th key={header} className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                                                        {header.replace(/_/g, ' ')}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                            {analysisResult.summary_table.map((row: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                                    {Object.values(row).map((val: any, i) => (
                                                        <td key={i} className="py-4 px-6 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap font-mono group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
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
                                className="bg-white dark:bg-[#1e293b]/80 border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm dark:shadow-none"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-1 h-5 bg-emerald-500 rounded-full"></div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">General Metrics</h3>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {Object.entries(analysisResult.summary).map(([key, value]: [string, any]) => (
                                        <div key={key} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-white/5">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{key.replace(/_/g, ' ')}</p>
                                            <p className="text-lg font-mono font-bold text-slate-900 dark:text-white">
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
                            <div key={key} className="bg-white dark:bg-[#1e293b]/80 border border-slate-200 dark:border-white/5 rounded-xl p-4 hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all group shadow-sm dark:shadow-lg backdrop-blur-sm flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className="flex-shrink-0 p-1.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-300 transition-colors">
                                            <BarChart3 className="w-4 h-4" />
                                        </div>
                                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs tracking-wide truncate" title={chartData.title}>
                                            {chartData.title}
                                        </h4>
                                    </div>
                                    <button
                                        onClick={() => handleExplainChart(key, chartData)}
                                        disabled={explainingChart === key}
                                        className={`flex-shrink-0 px-3 py-1 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm dark:shadow-lg border ${chartExplanations[key]
                                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                                            : 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/20 dark:to-orange-500/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20 hover:border-amber-300 dark:hover:border-amber-500/40'
                                            }`}
                                    >
                                        {explainingChart === key ? <Loader className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                        {chartExplanations[key] ? 'Insight Loaded' : 'AI Explain'}
                                    </button>
                                </div>

                                <div className="h-60 w-full bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-white/5 p-1 overflow-hidden relative flex-1 min-h-[240px]">
                                    <ChartRenderer
                                        data={transformAnalysisChartToNormalizedData(chartData)}
                                    />
                                </div>

                                {chartExplanations[key] && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="mt-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-500/20 rounded-lg relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 left-0 w-0.5 h-full bg-amber-500"></div>
                                        <div className="flex gap-2.5">
                                            <Lightbulb className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5 animate-pulse" />
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-widest">AI Visualization Insight</p>
                                                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">{chartExplanations[key]}</p>
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
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
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
