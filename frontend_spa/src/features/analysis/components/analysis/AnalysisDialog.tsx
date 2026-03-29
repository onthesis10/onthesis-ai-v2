import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, AlertCircle } from 'lucide-react'
import { useAnalysisStore } from '../../store/useAnalysisStore'
import { VariableSelector } from './VariableSelector'
import { useThemeStore, type ThemeMode } from '@/store/themeStore'
import { cn } from '@/lib/utils'
import { customToast } from '../../lib/customToast'

export const AnalysisDialog = () => {
    const activeAnalysis = useAnalysisStore(s => s.activeAnalysis);
    const closeAnalysis = useAnalysisStore(s => s.closeAnalysis);
    const variables = useAnalysisStore(s => s.variables);
    const { theme } = useThemeStore()

    // Local state for variable buckets
    const [sourceVars, setSourceVars] = useState<any[]>([])
    const [targetVars1, setTargetVars1] = useState<any[]>([]) // e.g., Dependent / Test Vars / Row
    const [targetVars2, setTargetVars2] = useState<any[]>([]) // e.g., Grouping / Independent / Col

    const [error, setError] = useState<string | null>(null)

    // Reset state when dialog opens
    useEffect(() => {
        if (activeAnalysis) {
            setSourceVars(variables)
            setTargetVars1([])
            setTargetVars2([])
            setError(null)
        }
    }, [activeAnalysis, variables])

    // --- THEME CONFIG (Glassmorphism & Premium Layout) ---
    const activeConfig = {
        light: {
            overlay: "bg-slate-900/20 backdrop-blur-sm",
            modal: "bg-white/95 border-white/20 shadow-2xl backdrop-blur-3xl ring-1 ring-black/5",
            header: "bg-black/5 border-black/5",
            footer: "bg-black/5 border-black/5",
            textMain: "text-slate-800",
            accentBar: "bg-[#007AFF]",
            closeBtn: "text-slate-400 hover:text-slate-600 hover:bg-black/5",
            btnCancel: "text-slate-500 hover:text-slate-700 hover:bg-black/5",
            btnRun: "bg-[#007AFF] text-white hover:opacity-90 shadow-md shadow-blue-500/20 border-transparent",
            divider: "border-black/5",
            errorBox: "bg-red-50 border-red-100 text-red-600"
        },
        dark: {
            overlay: "bg-[#0B1120]/60 backdrop-blur-sm",
            modal: "bg-[#1E293B]/95 border-white/10 shadow-2xl backdrop-blur-3xl ring-1 ring-white/5",
            header: "bg-white/5 border-white/10",
            footer: "bg-white/5 border-white/10",
            textMain: "text-white",
            accentBar: "bg-[#0EA5E9]",
            closeBtn: "text-slate-500 hover:text-slate-300 hover:bg-white/5",
            btnCancel: "text-slate-400 hover:text-slate-200 hover:bg-white/5",
            btnRun: "bg-[#0EA5E9] text-white hover:opacity-90 shadow-[0_0_20px_-5px_rgba(14,165,233,0.5)] border-transparent",
            divider: "border-white/10",
            errorBox: "bg-red-500/10 border-red-500/20 text-red-400"
        },
        happy: {
            overlay: "bg-orange-900/20 backdrop-blur-sm",
            modal: "bg-white/95 border-white/60 shadow-2xl shadow-orange-500/10 backdrop-blur-3xl ring-1 ring-orange-100",
            header: "bg-orange-50/50 border-orange-100",
            footer: "bg-orange-50/50 border-orange-100",
            textMain: "text-stone-800",
            accentBar: "bg-orange-400",
            closeBtn: "text-orange-400 hover:text-orange-600 hover:bg-orange-100/50",
            btnCancel: "text-stone-500 hover:text-stone-700 hover:bg-orange-100/50",
            btnRun: "bg-gradient-to-r from-orange-400 to-rose-400 text-white hover:opacity-90 shadow-lg shadow-orange-500/25 border-transparent",
            divider: "border-orange-100",
            errorBox: "bg-red-50 border-red-200 text-red-600"
        }
    }[theme as ThemeMode || 'dark']

    if (!activeAnalysis) return null

    // --- CONFIGURATION LOGIC ---
    const getConfig = (type: string) => {
        switch (type) {
            case 'descriptive-analysis':
            case 'frequency-table':
            case 'normality':
            case 'reliability':
            case 'validity':
                return {
                    title: type === 'reliability' ? 'Reliability Analysis' :
                        type === 'validity' ? 'Item Validity' :
                            type === 'normality' ? 'Normality Test' :
                                type === 'frequency-table' ? 'Frequency Table' : 'Descriptive Statistics',
                    bucket1: { label: 'Variables', max: undefined },
                    bucket2: null // One bucket only
                }
            case 'correlation-analysis':
                return {
                    title: 'Bivariate Correlations',
                    bucket1: { label: 'Variables', max: undefined },
                    bucket2: null
                }
            case 'independent-ttest':
            case 'mann-whitney':
                return {
                    title: type === 'mann-whitney' ? 'Mann-Whitney U' : 'Independent-Samples T-Test',
                    bucket1: { label: 'Test Variable(s)', max: 1 }, // Currently support 1 at a time for simplicity or verify BE supports multiple
                    bucket2: { label: 'Grouping Variable', max: 1 }
                }
            case 'paired-ttest':
            case 'wilcoxon':
                return {
                    title: type === 'wilcoxon' ? 'Wilcoxon Signed Rank' : 'Paired-Samples T-Test',
                    bucket1: { label: 'Paired Variables (Select 2)', max: 2 },
                    bucket2: null
                }
            case 'oneway-anova':
            case 'kruskal-wallis':
                return {
                    title: type === 'kruskal-wallis' ? 'Kruskal-Wallis H' : 'One-Way ANOVA',
                    bucket1: { label: 'Dependent List', max: 1 },
                    bucket2: { label: 'Factor', max: 1 }
                }
            case 'linear-regression':
                return {
                    title: 'Linear Regression',
                    bucket1: { label: 'Dependent Variable', max: 1 },
                    bucket2: { label: 'Independent Variable(s)', max: undefined }
                }
            case 'chi-square':
                return {
                    title: 'Chi-Square Analysis',
                    bucket1: { label: 'Row Data', max: 1 },
                    bucket2: { label: 'Column Data', max: 1 }
                }
            default:
                return { title: 'Analysis', bucket1: { label: 'Variables' }, bucket2: null }
        }
    }

    const config = getConfig(activeAnalysis)

    // --- HANDLERS ---
    const handleRun = () => {
        // Validation check before closing anything
        try {
            // 0. Pre-flight Validation
            const currentVarNames = new Set(variables.map(v => v.name))
            const allSelected = [...targetVars1, ...targetVars2]
            const invalidVars = allSelected.filter(v => !currentVarNames.has(v.name))

            if (invalidVars.length > 0) {
                const missingNames = invalidVars.map(v => v.name).join(', ')
                throw new Error(`Data Mismatch: Variables '${missingNames}' not found. Please refresh.`)
            }

            if (['independent-ttest', 'mann-whitney', 'oneway-anova', 'kruskal-wallis'].includes(activeAnalysis)) {
                if (targetVars2.length === 0 || targetVars1.length === 0) throw new Error("Please select both Grouping and Test variables.")
            } else if (activeAnalysis === 'linear-regression') {
                if (targetVars1.length === 0 || targetVars2.length === 0) throw new Error("Please select Dependent and Independent variables.")
            } else if (activeAnalysis === 'chi-square') {
                if (targetVars1.length === 0 || targetVars2.length === 0) throw new Error("Please select both variables.")
            } else if (['paired-ttest', 'wilcoxon', 'correlation-analysis'].includes(activeAnalysis)) {
                if (targetVars1.length < 2) throw new Error("Please select at least 2 variables.")
            } else {
                if (targetVars1.length === 0) throw new Error("Please select at least one variable.")
            }
        } catch (e: any) {
            setError(e.message)
            return // Stop execution if validation fails
        }

        // --- SUCCESSFUL START ---
        // 1. Close Dialog and Switch View
        closeAnalysis()
        const { setViewMode, setIsAnalyzing, setAnalysisResult, setInterpretation, setAnalysisError } = useAnalysisStore.getState()

        setViewMode('output')
        setAnalysisResult(null)
        setAnalysisError(null)
        setIsAnalyzing(true) // Start Global Loader

        // 2. Perform Async Analysis (Fire and Forget from UI perspective)
        const executeAnalysis = async () => {
            try {
                const startTime = Date.now()

                // FORCE SYNC DATASET TO BACKEND BEFORE ANALYSIS
                const state = useAnalysisStore.getState();
                await fetch('/api/project/upload-dataset', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        data: state.data,
                        variables: state.variables,
                        project_id: 'default' // MUST be 'default' because execute_analysis loads 'default'
                    })
                });

                // Construct Payload
                let payload: any = {}
                let varsToSend: string[] = []

                if (['independent-ttest', 'mann-whitney', 'oneway-anova', 'kruskal-wallis'].includes(activeAnalysis)) {
                    varsToSend = [targetVars2[0].name, targetVars1[0].name]
                    payload = { variables: varsToSend }
                } else if (activeAnalysis === 'linear-regression') {
                    varsToSend = [...targetVars2.map(v => v.name), targetVars1[0].name]
                    payload = { variables: varsToSend }
                } else if (activeAnalysis === 'chi-square') {
                    varsToSend = [targetVars1[0].name, targetVars2[0].name]
                    payload = { variables: varsToSend }
                } else {
                    varsToSend = targetVars1.map(v => v.name)
                    payload = { variables: varsToSend }
                }

                const res = await fetch(`/api/run-analysis/${activeAnalysis}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })

                const result = await res.json()

                // Enforce artificial delay for smooth UX (min 1.5s)
                const elapsed = Date.now() - startTime
                if (elapsed < 1500) {
                    await new Promise(r => setTimeout(r, 1500 - elapsed))
                }

                if (result.success) {
                    setAnalysisResult(result.data)
                    setInterpretation(null)
                } else {
                    const errMsg = result.error || "Analysis failed on server."
                    setAnalysisError(errMsg)
                    customToast.error(errMsg)
                }

            } catch (err: any) {
                const errMsg = err.message || "Network request failed."
                setAnalysisError(errMsg)
                customToast.error(errMsg)
            } finally {
                setIsAnalyzing(false) // Stop Global Loader
            }
        }

        executeAnalysis()
    }

    // Helper to move vars
    const moveVars = (vars: any[], from: any[], setFrom: Function, to: any[], setTo: Function) => {
        setFrom(from.filter(v => !vars.find(x => x.id === v.id)))
        setTo([...to, ...vars])
    }

    return (
        <AnimatePresence>
            <div className={cn("fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 transition-all", activeConfig.overlay)}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={cn("w-full max-w-3xl rounded-3xl flex flex-col overflow-hidden max-h-[90vh] shadow-2xl", activeConfig.modal)}
                >
                    {/* Header */}
                    <div className={cn("h-16 shrink-0 border-b flex items-center justify-between px-6", activeConfig.header)}>
                        <h3 className={cn("font-bold text-lg tracking-tight flex items-center gap-3", activeConfig.textMain)}>
                            <span className={cn("w-1.5 h-6 rounded-full", activeConfig.accentBar)}></span>
                            {config.title}
                        </h3>
                        <button onClick={closeAnalysis} className={cn("p-2 rounded-full transition-colors", activeConfig.closeBtn)}>
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

                        {error && (
                            <div className={cn("border text-sm p-4 rounded-xl flex items-center gap-3 font-medium", activeConfig.errorBox)}>
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                {error}
                            </div>
                        )}

                        <div className="px-1">
                            <VariableSelector
                                label={config.bucket1.label}
                                availableVars={sourceVars}
                                selectedVars={targetVars1}
                                maxLimit={config.bucket1.max}
                                onAdd={(vars) => moveVars(vars, sourceVars, setSourceVars, targetVars1, setTargetVars1)}
                                onRemove={(vars) => moveVars(vars, targetVars1, setTargetVars1, sourceVars, setSourceVars)}
                            />
                        </div>

                        {config.bucket2 && (
                            <div className={cn("pt-6 mt-6 border-t px-1", activeConfig.divider)}>
                                <VariableSelector
                                    label={config.bucket2.label}
                                    availableVars={sourceVars}
                                    selectedVars={targetVars2}
                                    maxLimit={config.bucket2.max}
                                    onAdd={(vars) => moveVars(vars, sourceVars, setSourceVars, targetVars2, setTargetVars2)}
                                    onRemove={(vars) => moveVars(vars, targetVars2, setTargetVars2, sourceVars, setSourceVars)}
                                />
                            </div>
                        )}

                    </div>

                    {/* Footer */}
                    <div className={cn("h-20 shrink-0 border-t flex items-center justify-end px-6 gap-3", activeConfig.footer)}>
                        <button
                            onClick={closeAnalysis}
                            className={cn("px-5 py-2.5 rounded-xl text-sm font-bold transition-colors", activeConfig.btnCancel)}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleRun}
                            className={cn(
                                "px-8 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                                activeConfig.btnRun
                            )}
                        >
                            <Play className="w-4 h-4 fill-white" />
                            Run Analysis
                        </button>
                    </div>

                </motion.div>
            </div>
        </AnimatePresence>
    )
}