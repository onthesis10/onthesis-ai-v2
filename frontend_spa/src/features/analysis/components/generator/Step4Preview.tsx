import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Loader2, AlertCircle, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { cn } from '@/lib/utils'

interface Step4Props {
    data: any
    onComplete: (data: any[], vars: any[]) => void
}

export const Step4Preview = ({ data, onComplete }: Step4Props) => {
    const { theme } = useThemeStore()

    const themeStyles = {
        light: {
            title: "from-blue-600 to-indigo-600",
            textMuted: "text-slate-500",
            textMain: "text-slate-800",
            container: "bg-slate-50 border-slate-200",
            tableHeader: "bg-slate-100 border-slate-200 text-slate-600",
            tableRow: "border-slate-200 hover:bg-slate-100/50",
            tableCell: "text-slate-700",
            badgeSafe: "bg-emerald-100 text-emerald-700",
            badgeWarn: "bg-amber-100 text-amber-700",
            cardAction: "bg-emerald-50 border-emerald-200",
            btnSubmit: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20",
            btnRegen: "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
            loaderGradient: "from-blue-500 to-indigo-500",
            errorBox: "bg-rose-50 border-rose-200"
        },
        dark: {
            title: "from-cyan-400 to-blue-500",
            textMuted: "text-slate-400",
            textMain: "text-slate-200",
            container: "bg-secondary/20 border-border/50",
            tableHeader: "bg-secondary/50 border-white/10 text-slate-300",
            tableRow: "border-white/5 hover:bg-white/5",
            tableCell: "text-slate-300",
            badgeSafe: "bg-emerald-500/20 text-emerald-400",
            badgeWarn: "bg-yellow-500/20 text-yellow-400",
            cardAction: "bg-emerald-500/5 border-emerald-500/20",
            btnSubmit: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20",
            btnRegen: "bg-secondary/30 text-slate-300 hover:bg-secondary/50 border-white/10",
            loaderGradient: "from-cyan-500 to-blue-500",
            errorBox: "bg-red-500/10 border-red-500/20"
        },
        happy: {
            title: "from-rose-500 to-orange-500",
            textMuted: "text-orange-600/70",
            textMain: "text-stone-800",
            container: "bg-white/60 border-orange-200",
            tableHeader: "bg-orange-100/50 border-orange-200 text-orange-800",
            tableRow: "border-orange-100 hover:bg-orange-50",
            tableCell: "text-stone-700",
            badgeSafe: "bg-emerald-100 text-emerald-700",
            badgeWarn: "bg-amber-100 text-amber-700",
            cardAction: "bg-emerald-50 border-emerald-200",
            btnSubmit: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20",
            btnRegen: "bg-white border-orange-200 text-orange-600 hover:bg-orange-50",
            loaderGradient: "from-orange-400 to-rose-400",
            errorBox: "bg-rose-50 border-rose-200"
        }
    }[theme || 'dark']

    const activeConfig = themeStyles

    const [isLoading, setIsLoading] = useState(true)
    const [previewData, setPreviewData] = useState<any[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [stats, setStats] = useState<any>(null)

    const handleGeneratePreview = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const response = await fetch('/api/generate-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })

            const result = await response.json()

            if (result.status === 'success') {
                setPreviewData(result.data)
                setStats(result.meta)
            } else {
                setError(result.message || 'Failed to generate data')
            }
        } catch (err: any) {
            console.error("Preview generation failed:", err)
            setError(err.message || 'Connection failed. Make sure the backend is running.')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        handleGeneratePreview()
    }, [])

    const handleConfirm = () => {
        if (!previewData) return
        onComplete(previewData, data.variables || [])
    }

    return (
        <div className="space-y-6 h-full flex flex-col animate-in fade-in zoom-in-95 duration-300">
            <div className="shrink-0 space-y-2">
                <h3 className={cn("text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r", activeConfig.title)}>
                    Preview & Validation
                </h3>
                <p className={cn("text-sm", activeConfig.textMuted)}>
                    Verifikasi sampel data sebelum di-load ke dalam tabel utama.
                </p>
            </div>

            {/* Main Preview Area */}
            <div className={cn("flex-1 rounded-xl border overflow-hidden relative flex flex-col backdrop-blur-sm", activeConfig.container)}>
                {isLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                        <div className="relative">
                            <div className={cn("absolute inset-0 bg-gradient-to-r rounded-full blur-xl opacity-50 animate-pulse", activeConfig.loaderGradient)} />
                            <Loader2 className={cn("w-12 h-12 animate-spin relative z-10", activeConfig.title.includes('cyan') ? 'text-cyan-400' : activeConfig.title.includes('emerald') ? 'text-emerald-500' : 'text-orange-500')} />
                        </div>
                        <p className={cn("text-sm font-medium mt-4 animate-pulse", activeConfig.textMain)}>Generating data pattern...</p>
                        <p className={cn("text-xs opacity-60 mt-1", activeConfig.textMuted)}>Menyesuaikan {data.variables?.length || 0} variabel untuk {data.sample_size || 60} baris.</p>
                    </div>
                ) : error ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                        <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4", activeConfig.errorBox)}>
                            <AlertCircle className="w-8 h-8 text-rose-500" />
                        </div>
                        <p className="text-rose-500 font-bold mb-2">Generation Failed</p>
                        <p className={cn("text-sm max-w-md", activeConfig.textMuted)}>{error}</p>
                        <button
                            onClick={handleGeneratePreview}
                            className={cn("mt-6 px-4 py-2 border rounded-lg transition-colors flex items-center gap-2 text-sm", activeConfig.btnRegen)}
                        >
                            <RefreshCw className="w-4 h-4" /> Coba Lagi
                        </button>
                    </div>
                ) : previewData ? (
                    <>
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead className={cn("sticky top-0 z-10 backdrop-blur-md", activeConfig.tableHeader)}>
                                    <tr>
                                        <th className="p-3 border-b border-r font-semibold w-16 text-center">No</th>
                                        {(data.variables || []).map((v: any) => (
                                            <th key={v.id} className="p-3 border-b border-r font-semibold">
                                                <div className="flex flex-col">
                                                    <span>{v.name}</span>
                                                    <span className="text-[10px] opacity-60 font-normal">{v.type}</span>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewData.slice(0, 10).map((row, idx) => (
                                        <tr key={idx} className={cn("border-b transition-colors", activeConfig.tableRow)}>
                                            <td className={cn("p-2 border-r text-center opacity-50", activeConfig.tableCell)}>{idx + 1}</td>
                                            {(data.variables || []).map((v: any) => {
                                                const val = row[v.name]
                                                return (
                                                    <td key={v.id} className={cn("p-2 border-r", activeConfig.tableCell)}>
                                                        {typeof val === 'number' && v.type !== 'likert' ? val.toFixed(2) : val}
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {previewData.length > 10 && (
                                <div className={cn("text-center p-3 text-xs border-b border-dashed", activeConfig.textMuted, activeConfig.tableRow)}>
                                    ... menampilkan 10 dari {previewData.length} baris data ...
                                </div>
                            )}
                        </div>
                    </>
                ) : null}
            </div>

            {/* Action Card */}
            {!isLoading && !error && previewData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
                    <div className={cn("border rounded-xl p-4 flex flex-col justify-center items-start gap-2", activeConfig.container)}>
                        <h4 className={cn("text-xs font-bold uppercase tracking-wider", activeConfig.textMuted)}>Data Quality Report</h4>
                        <div className="flex flex-wrap gap-2 mt-1">
                            <span className={cn("px-2 py-1 rounded text-[10px] font-medium flex items-center gap-1", activeConfig.badgeSafe)}>
                                <CheckCircle2 className="w-3 h-3" /> N = {previewData.length} Berhasil
                            </span>
                            {stats?.normality && (
                                <span className={cn(
                                    "px-2 py-1 rounded text-[10px] font-medium transition-colors",
                                    stats.normality > 0.05 ? activeConfig.badgeSafe : activeConfig.badgeWarn
                                )}>
                                    Distribusi {stats.normality > 0.05 ? 'Normal' : 'Non-Normal'}
                                </span>
                            )}
                            {stats?.reliability && (
                                <span className={cn(
                                    "px-2 py-1 rounded text-[10px] font-medium transition-colors",
                                    stats.reliability > 0.7 ? activeConfig.badgeSafe : activeConfig.badgeWarn
                                )}>
                                    Alpha = {stats.reliability.toFixed(2)}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className={cn("border rounded-xl p-4 flex flex-col justify-center items-end gap-3", activeConfig.cardAction)}>
                        <p className={cn("text-xs font-medium text-right max-w-[200px]", activeConfig.textMuted)}>Data siap digunakan. Silakan simpan untuk mulai analisis.</p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleGeneratePreview}
                                className={cn("px-4 py-2 border rounded-lg transition-colors flex items-center gap-2 text-xs font-medium hover:bg-slate-100", activeConfig.btnRegen)}
                            >
                                <RefreshCw className="w-3.5 h-3.5" /> Re-Generate
                            </button>
                            <button
                                onClick={handleConfirm}
                                className={cn("px-5 py-2 font-bold rounded-lg shadow-lg transition-all flex items-center gap-2 text-xs", activeConfig.btnSubmit)}
                            >
                                Simpan ke Data View
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
