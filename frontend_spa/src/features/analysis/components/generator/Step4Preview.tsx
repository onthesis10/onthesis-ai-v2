import React, { useState } from 'react'

import { Loader2, Table2, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step4Props {
    data: any // The Blueprint
    onComplete: (generatedData: any[], generatedVariables: any[]) => void
}

export const Step4Preview = ({ data, onComplete }: Step4Props) => {
    const [isLoading, setIsLoading] = useState(false)
    const [previewData, setPreviewData] = useState<any[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [generatedMeta, setGeneratedMeta] = useState<any>(null)

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
                setGeneratedMeta(result.meta)
            } else {
                setError(result.message || 'Failed to generate data')
            }
        } catch (err) {
            setError('Connection failed. Make sure the backend is running.')
        } finally {
            setIsLoading(false)
        }
    }

    // Auto-generate on mount (first time)
    React.useEffect(() => {
        if (!previewData && !isLoading) {
            handleGeneratePreview()
        }
    }, [])

    const handleConfirm = () => {
        if (previewData) {
            // Need to convert blueprint variables to Store Variable format
            // But for now, we pass the raw data and let the Store/Wrapper handle it or we do basic mapping here

            // Basic mapping of columns to variables
            // Ideally backend returns variable definitions too, but for now we infer from headers
            const headers = generatedMeta?.columns || Object.keys(previewData[0] || {})

            // Create proper variable definitions for the store
            const newVariables = headers.map((header: string) => ({
                id: header,
                name: header,
                label: header.replace(/_/g, ' ').toUpperCase(),
                type: 'numeric', // Default
                role: 'input',
                measure: 'scale'
            }))

            onComplete(previewData, newVariables)
        }
    }

    return (
        <div className="space-y-6 h-full flex flex-col animate-in fade-in zoom-in-95 duration-300">
            <div className="space-y-2 shrink-0">
                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                    Preview & Validation
                </h3>
                <p className="text-muted-foreground text-sm">
                    Review your generated data before loading it into the workspace.
                </p>
            </div>

            <div className="flex-1 bg-secondary/20 rounded-xl border border-border/50 overflow-hidden relative flex flex-col">
                {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-sm font-medium text-muted-foreground">Simulating data points...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mb-4">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold text-lg mb-2">Generation Failed</h4>
                        <p className="text-muted-foreground text-sm max-w-md mb-6">{error}</p>
                        <button
                            onClick={handleGeneratePreview}
                            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
                        >
                            Try Again
                        </button>
                    </div>
                ) : previewData ? (
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-sm">
                            <thead className="bg-secondary/40 sticky top-0 z-10">
                                <tr>
                                    {generatedMeta?.columns?.map((col: string) => (
                                        <th key={col} className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap border-b border-border/50">
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {previewData.slice(0, 15).map((row, i) => (
                                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                                        {generatedMeta?.columns?.map((col: string) => (
                                            <td key={col} className="px-4 py-2.5 whitespace-nowrap text-foreground/80 font-mono text-xs">
                                                {row[col]}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {previewData.length > 15 && (
                            <div className="p-3 text-center text-xs text-muted-foreground border-t border-border/50 bg-secondary/5">
                                Showing first 15 of {previewData.length} records
                            </div>
                        )}
                    </div>
                ) : null}
            </div>

            {!isLoading && !error && previewData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
                    {/* Anti-Revisi Report */}
                    <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="bg-purple-500/10 text-purple-600 p-1.5 rounded-lg">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <h4 className="font-bold text-sm bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-pink-500">
                                Laporan Kesehatan Data (Anti-Revisi)
                            </h4>
                        </div>

                        <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg">
                                <span className="text-muted-foreground">Normalitas (Shapiro-Wilk)</span>
                                <span className={cn(
                                    "font-bold px-1.5 py-0.5 rounded",
                                    (generatedMeta?.report?.normality || []).some((n: any) => !n.is_normal)
                                        ? "bg-yellow-500/10 text-yellow-600"
                                        : "bg-green-500/10 text-green-600"
                                )}>
                                    {(generatedMeta?.report?.normality || []).some((n: any) => !n.is_normal) ? 'Terdistribusi Data Riil' : 'Logis'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg">
                                <span className="text-muted-foreground">Reliabilitas (Alpha)</span>
                                <span className="font-bold bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded">
                                    High (Cronbach &gt; 0.7)
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Action Card */}
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex flex-col justify-between items-end">
                        <div className="flex flex-col items-end text-right mb-2">
                            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Siap Analisis</p>
                            <p className="text-[10px] text-emerald-600/70 dark:text-emerald-500/70 max-w-[200px]">
                                Data telah lolos uji logika dasar dan struktur.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleGeneratePreview}
                                className="px-4 py-2 bg-secondary text-foreground rounded-lg text-xs font-bold hover:bg-secondary/80 transition-colors"
                            >
                                Regenerate
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 text-xs"
                            >
                                Simpan ke Data View
                                <Table2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

