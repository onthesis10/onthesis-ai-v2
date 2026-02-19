import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, AlertCircle } from 'lucide-react'
import { useAnalysisStore } from '../../store/useAnalysisStore'
import { VariableSelector } from './VariableSelector'

export const AnalysisDialog = () => {
    const { activeAnalysis, closeAnalysis, variables } = useAnalysisStore()

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
                    bucket2: { label: 'Independent Variable(s) (Block 1)', max: undefined }
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
                    setAnalysisError(result.error || "Analysis failed on server.")
                }

            } catch (err: any) {
                setAnalysisError(err.message || "Network request failed.")
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
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-2xl bg-white dark:bg-[#15171b] rounded-xl shadow-2xl border border-white/10 flex flex-col overflow-hidden max-h-[85vh]"
                >
                    {/* Header */}
                    <div className="h-14 shrink-0 border-b border-border/40 flex items-center justify-between px-6 bg-secondary/5">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <span className="w-2 h-6 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-sm"></span>
                            {config.title}
                        </h3>
                        <button onClick={closeAnalysis} className="p-2 hover:bg-secondary rounded-full transition-colors">
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">

                        {error && (
                            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        <VariableSelector
                            label={config.bucket1.label}
                            availableVars={sourceVars}
                            selectedVars={targetVars1}
                            maxLimit={config.bucket1.max}
                            onAdd={(vars) => moveVars(vars, sourceVars, setSourceVars, targetVars1, setTargetVars1)}
                            onRemove={(vars) => moveVars(vars, targetVars1, setTargetVars1, sourceVars, setSourceVars)}
                        />

                        {config.bucket2 && (
                            <div className="pt-4 border-t border-border/30">
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
                    <div className="h-16 shrink-0 border-t border-border/40 flex items-center justify-end px-6 gap-3 bg-secondary/5">
                        <button
                            onClick={closeAnalysis}
                            className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors text-muted-foreground"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleRun}
                            className="px-6 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
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
