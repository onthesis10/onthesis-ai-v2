import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, ArrowRight, RefreshCcw, Save, X, Settings2 } from 'lucide-react'
import { useAnalysisStore } from '../../store/useAnalysisStore'

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
    const { data } = useAnalysisStore()

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
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full max-w-xl bg-white dark:bg-[#15171b] rounded-xl shadow-2xl border border-white/10 flex flex-col overflow-hidden max-h-[85vh] text-foreground"
                    >
                        <div className="h-14 shrink-0 border-b border-border/40 flex items-center justify-between px-6 bg-secondary/5">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <div className="p-1.5 bg-primary/10 rounded-lg">
                                    <Settings2 className="w-5 h-5 text-primary" />
                                </div>
                                Value Labels: <span className="text-primary font-mono">{variableName}</span>
                            </h3>
                            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-foreground">

                            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border/50">
                                <div className="text-sm text-muted-foreground">
                                    Define labels (e.g. 1 = "Male").
                                    {isRecodeMode && <span className="text-amber-500 font-bold block mt-1">Recode Mode: Text will be converted to Numbers.</span>}
                                </div>
                                <button
                                    onClick={handleAutoDetect}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-secondary transition-colors"
                                >
                                    <RefreshCcw className="w-3.5 h-3.5" /> Auto-Detect
                                </button>
                            </div>

                            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                <div className="grid grid-cols-[80px_1fr_40px] items-center gap-2 mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    <div>Value</div>
                                    <div>Label</div>
                                    <div></div>
                                </div>

                                {rows.map((row, idx) => (
                                    <div key={idx} className="grid grid-cols-[80px_1fr_40px] items-center gap-2">
                                        <input
                                            value={row.value}
                                            onChange={(e) => handleChange(idx, 'value', e.target.value)}
                                            placeholder="1"
                                            className="h-9 px-3 rounded-md border border-input bg-transparent text-sm text-center font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                                        />
                                        <div className="relative">
                                            <input
                                                value={row.label}
                                                onChange={(e) => handleChange(idx, 'label', e.target.value)}
                                                placeholder="Label"
                                                className="h-9 w-full px-3 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                            />
                                            {isRecodeMode && (
                                                <ArrowRight className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 opacity-20" />
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleRemoveRow(idx)}
                                            className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}

                                <button
                                    onClick={handleAddRow}
                                    className="w-full h-9 mt-2 flex items-center justify-center gap-2 rounded-md border border-dashed border-border/50 text-sm text-muted-foreground hover:bg-secondary/50 transition-colors"
                                >
                                    <Plus className="w-4 h-4" /> Add Value Label
                                </button>
                            </div>
                        </div>

                        <div className="h-16 shrink-0 border-t border-border/40 flex items-center justify-end px-6 gap-3 bg-secondary/5">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors text-muted-foreground"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-6 py-2 rounded-lg text-sm font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2"
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
