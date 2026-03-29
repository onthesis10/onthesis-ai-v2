import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, ArrowRight, RefreshCcw, Save, X, Settings2 } from 'lucide-react'
import { useAnalysisStore } from '../../store/useAnalysisStore'
import { useThemeStore } from '@/store/themeStore'
import { cn } from '@/lib/utils'

interface ValueLabelsModalProps {
    isOpen: boolean
    onClose: () => void
    variableName: string
    currentLabels: Record<string, string>
    onSave: (labels: Record<string, string>, recodeMapping?: Record<string, number>) => void
}

export const ValueLabelsModal = ({ isOpen, onClose, variableName, currentLabels = {}, onSave }: ValueLabelsModalProps) => {
    const [rows, setRows] = useState<{ value: string; label: string }[]>([])
    const [uniqueValues, setUniqueValues] = useState<string[]>([])
    const [isRecodeMode, setIsRecodeMode] = useState(false)
    const data = useAnalysisStore(s => s.data);
    const { theme } = useThemeStore()

    // --- Theme Config ---
    const activeConfig = {
        light: {
            overlay: "bg-slate-900/20 backdrop-blur-sm",
            modal: "bg-white/90 border-white/20 shadow-2xl backdrop-blur-3xl ring-1 ring-black/5",
            header: "bg-black/5 border-black/5",
            footer: "bg-black/5 border-black/5",
            textMain: "text-slate-800",
            textMuted: "text-slate-500",
            iconBg: "bg-[#007AFF]/10 text-[#007AFF]",
            btnPrimary: "bg-[#007AFF] text-white hover:opacity-90 shadow-md shadow-blue-500/20",
            btnSecondary: "hover:bg-black/5 text-slate-600",
            input: "border-black/10 bg-white/50 focus:ring-[#007AFF]/50 text-slate-700",
            infoBox: "bg-[#007AFF]/5 border-[#007AFF]/10",
            dangerBtn: "hover:bg-red-500/10 text-slate-400 hover:text-red-500",
            addRow: "border-black/10 text-slate-500 hover:bg-black/5 hover:text-slate-700"
        },
        dark: {
            overlay: "bg-[#0B1120]/60 backdrop-blur-sm",
            modal: "bg-[#1E293B]/90 border-white/10 shadow-2xl backdrop-blur-3xl ring-1 ring-white/5",
            header: "bg-white/5 border-white/10",
            footer: "bg-white/5 border-white/10",
            textMain: "text-white",
            textMuted: "text-slate-400",
            iconBg: "bg-[#0EA5E9]/10 text-[#0EA5E9]",
            btnPrimary: "bg-[#0EA5E9] text-white hover:opacity-90 shadow-[0_0_20px_-5px_rgba(14,165,233,0.5)]",
            btnSecondary: "hover:bg-white/10 text-slate-300",
            input: "border-white/10 bg-black/20 focus:ring-[#0EA5E9]/50 text-white",
            infoBox: "bg-white/5 border-white/10",
            dangerBtn: "hover:bg-red-500/10 text-slate-500 hover:text-red-400",
            addRow: "border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"
        },
        happy: {
            overlay: "bg-orange-900/20 backdrop-blur-sm",
            modal: "bg-white/95 border-white/60 shadow-2xl shadow-orange-500/10 backdrop-blur-3xl ring-1 ring-orange-100",
            header: "bg-orange-50/50 border-orange-100",
            footer: "bg-orange-50/50 border-orange-100",
            textMain: "text-stone-800",
            textMuted: "text-stone-500",
            iconBg: "bg-orange-100 text-orange-500",
            btnPrimary: "bg-gradient-to-r from-orange-400 to-rose-400 text-white hover:opacity-90 shadow-lg shadow-orange-500/25 border-transparent",
            btnSecondary: "hover:bg-orange-100 text-stone-600",
            input: "border-orange-200 bg-white/50 focus:ring-orange-300/50 text-stone-700",
            infoBox: "bg-orange-50 border-orange-100",
            dangerBtn: "hover:bg-red-500/10 text-stone-400 hover:text-red-500",
            addRow: "border-orange-200 text-stone-500 hover:bg-orange-50 hover:text-orange-600"
        }
    }[theme || 'dark']

    useEffect(() => {
        if (isOpen) {
            // Convert dictionary to array rows
            const initialRows = Object.entries(currentLabels).map(([val, lbl]) => ({
                value: val,
                label: lbl
            }))
            if (initialRows.length === 0) {
                setRows([{ value: '', label: '' }])
            } else {
                setRows(initialRows)
            }

            // Fetch Unique Values from Data for "Auto-Detect"
            if (data && variableName) {
                // Safe access to row data
                const unique = Array.from(new Set(data.map(row => String(row[variableName] ?? ''))))
                    .filter(v => v !== '' && v !== 'undefined' && v !== 'null')
                setUniqueValues(unique.slice(0, 50)) // Limit 50 uniques
            }
        }
    }, [isOpen, variableName, currentLabels, data])

    const handleAddRow = () => {
        setRows([...rows, { value: '', label: '' }])
    }

    const handleRemoveRow = (index: number) => {
        const newRows = [...rows]
        newRows.splice(index, 1)
        setRows(newRows)
    }

    const handleChange = (index: number, field: 'value' | 'label', val: string) => {
        const newRows = [...rows]
        newRows[index] = { ...newRows[index], [field]: val }
        setRows(newRows)
    }

    const handleAutoDetect = () => {
        const isNumericData = uniqueValues.every(v => !isNaN(Number(v)))

        if (!isNumericData && uniqueValues.length > 0) {
            // Text Data -> Suggest Recode (1="Male", 2="Female")
            setIsRecodeMode(true)
            const generatedRows = uniqueValues.map((val, idx) => ({
                value: (idx + 1).toString(), // Code
                label: val // Label match text
            }))
            setRows(generatedRows)
        } else {
            // Number Data -> Just populate values
            const generatedRows = uniqueValues.map(val => ({
                value: val,
                label: ''
            }))
            setRows(generatedRows)
            setIsRecodeMode(false)
        }
    }

    const handleSave = () => {
        const labelsDict: Record<string, string> = {}
        const recodeMap: Record<string, number> = {}

        rows.forEach(r => {
            if (r.value) {
                labelsDict[r.value] = r.label

                if (isRecodeMode && r.label) {
                    const numVal = Number(r.value)
                    if (!isNaN(numVal)) {
                        recodeMap[r.label] = numVal
                    }
                }
            }
        })

        if (isRecodeMode && Object.keys(recodeMap).length > 0) {
            onSave(labelsDict, recodeMap)
        } else {
            onSave(labelsDict)
        }
        onClose()
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className={cn("fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 transition-all", activeConfig.overlay)}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className={cn("w-full max-w-2xl rounded-2xl flex flex-col overflow-hidden max-h-[90vh] shadow-2xl", activeConfig.modal)}
                    >
                        {/* Header */}
                        <div className={cn("h-16 shrink-0 border-b flex items-center justify-between px-6", activeConfig.header)}>
                            <h3 className={cn("font-bold text-lg flex items-center gap-3", activeConfig.textMain)}>
                                <div className={cn("p-1.5 rounded-lg border border-transparent shadow-sm", activeConfig.iconBg, theme === 'happy' && 'bg-white')}>
                                    <Settings2 className="w-5 h-5" />
                                </div>
                                Value Labels: <span className={cn("font-mono px-2 py-0.5 rounded-md text-sm", activeConfig.infoBox)}>{variableName}</span>
                            </h3>
                            <button onClick={onClose} className={cn("p-2 rounded-full transition-colors", activeConfig.btnSecondary)}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">

                            {/* Info Box */}
                            <div className={cn("flex items-center justify-between p-4 rounded-xl border", activeConfig.infoBox)}>
                                <div className={cn("text-sm", activeConfig.textMuted)}>
                                    <span className={cn("font-semibold", activeConfig.textMain)}>Define labels</span> (e.g. 1 = "Male").
                                    {isRecodeMode && (
                                        <span className={cn("font-bold block mt-1", theme === 'happy' ? "text-orange-500" : "text-amber-500")}>
                                            Recode Mode: Text will be converted to Numbers.
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={handleAutoDetect}
                                    className={cn("flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all shadow-sm border border-transparent", theme === 'happy' ? "bg-white text-orange-500 hover:ring-1 hover:ring-orange-200" : "bg-white/10 text-inherit hover:bg-white/20")}
                                >
                                    <RefreshCcw className="w-3.5 h-3.5" /> Auto-Detect
                                </button>
                            </div>

                            {/* Rows Area */}
                            <div className="space-y-2 pr-1">
                                <div className={cn("grid grid-cols-[80px_1fr_40px] items-center gap-3 mb-3 px-2 text-[10px] font-bold uppercase tracking-widest", activeConfig.textMuted)}>
                                    <div>Value</div>
                                    <div>Label</div>
                                    <div></div>
                                </div>

                                {rows.map((row, idx) => (
                                    <div key={idx} className="grid grid-cols-[80px_1fr_40px] items-center gap-3">
                                        <input
                                            value={row.value}
                                            onChange={(e) => handleChange(idx, 'value', e.target.value)}
                                            placeholder="1"
                                            className={cn("h-10 px-3 rounded-lg border outline-none text-sm text-center font-mono font-medium transition-all focus:ring-2", activeConfig.input)}
                                        />
                                        <div className="relative">
                                            <input
                                                value={row.label}
                                                onChange={(e) => handleChange(idx, 'label', e.target.value)}
                                                placeholder="Enter label..."
                                                className={cn("h-10 w-full px-4 rounded-lg border outline-none text-sm font-medium transition-all focus:ring-2", activeConfig.input)}
                                            />
                                            {isRecodeMode && (
                                                <ArrowRight className="w-4 h-4 text-inherit absolute right-4 top-1/2 -translate-y-1/2 opacity-30" />
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleRemoveRow(idx)}
                                            className={cn("h-10 w-10 flex items-center justify-center rounded-lg transition-colors", activeConfig.dangerBtn)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}

                                <button
                                    onClick={handleAddRow}
                                    className={cn("w-full h-10 mt-4 flex items-center justify-center gap-2 rounded-lg border border-dashed font-semibold text-sm transition-all", activeConfig.addRow)}
                                >
                                    <Plus className="w-4 h-4" /> Add Value Label
                                </button>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className={cn("h-16 shrink-0 border-t flex items-center justify-end px-6 gap-3", activeConfig.footer)}>
                            <button
                                onClick={onClose}
                                className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-colors", activeConfig.btnSecondary)}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className={cn("px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2", activeConfig.btnPrimary)}
                            >
                                <Save className="w-4 h-4" /> Apply {isRecodeMode ? '& Recode' : ''}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}