import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, ArrowLeft } from 'lucide-react'
import { useAnalysisStore } from '../../store/useAnalysisStore'
import { Step1Context } from './Step1Context'
import { Step2Structure } from './Step2Structure'
import { Step3Behavior } from './Step3Behavior'
import { Step4Preview } from './Step4Preview'
import { useThemeStore } from '@/store/themeStore'
import { cn } from '@/lib/utils'

export const AIDataGeneratorWizard = () => {
    const isGeneratorOpen = useAnalysisStore(s => s.isGeneratorOpen);
    const toggleGenerator = useAnalysisStore(s => s.toggleGenerator);
    const setData = useAnalysisStore(s => s.setData);
    const setVariables = useAnalysisStore(s => s.setVariables);
    const setViewMode = useAnalysisStore(s => s.setViewMode);
    const { theme } = useThemeStore()
    const [step, setStep] = useState(1)

    // Theme Configs
    const themeStyles = {
        light: {
            overlay: "bg-white/40",
            modal: "bg-white/90 border border-slate-200/50 shadow-2xl ring-1 ring-slate-200",
            progressBg: "bg-slate-100",
            progressFill: "bg-gradient-to-r from-blue-500 to-indigo-600 shadow-blue-500/30",
            closeBtn: "bg-white border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200",
            breadcrumbActive: "text-blue-600 font-bold",
            breadcrumbDim: "text-slate-400",
            btnBack: "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50",
            btnNext: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30"
        },
        dark: {
            overlay: "bg-black/60",
            modal: "bg-[#0F172A]/90 border border-white/10 shadow-2xl shadow-black/50 ring-1 ring-white/5",
            progressBg: "bg-white/5",
            progressFill: "bg-gradient-to-r from-cyan-400 to-blue-500 shadow-cyan-500/30",
            closeBtn: "bg-white/5 border-white/10 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30",
            breadcrumbActive: "text-cyan-400 font-bold",
            breadcrumbDim: "text-slate-500",
            btnBack: "bg-white/5 border border-white/10 text-white hover:bg-white/10",
            btnNext: "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/30"
        },
        happy: {
            overlay: "bg-orange-50/60",
            modal: "bg-white/90 border border-orange-200 shadow-2xl shadow-orange-500/10 ring-1 ring-orange-200",
            progressBg: "bg-orange-100",
            progressFill: "bg-gradient-to-r from-orange-400 to-rose-400 shadow-orange-500/30",
            closeBtn: "bg-white border-orange-200 text-orange-500 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200",
            breadcrumbActive: "text-orange-500 font-bold",
            breadcrumbDim: "text-orange-300",
            btnBack: "bg-white border border-orange-200 text-orange-600 hover:bg-orange-50",
            btnNext: "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30"
        }
    }[theme || 'dark']

    const activeConfig = themeStyles

    // Blueprint State
    const [blueprint, setBlueprint] = useState({
        research_type: 'experiment',
        field: '', // Bidang Studi
        sample_size: 60,
        variables: [
            { id: 'v1', name: 'Motivasi', type: 'likert', params: { scale: 5, items: 10 } },
            { id: 'v2', name: 'Prestasi', type: 'numeric', params: { mean: 75, std: 10, min: 0, max: 100 } }
        ],
        relationships: [
            { var1_id: 'v1', var2_id: 'v2', correlation: 0.7 }
        ]
    })

    const updateBlueprint = (key: string, value: any) => {
        setBlueprint(prev => ({ ...prev, [key]: value }))
    }

    const handleNext = () => setStep(prev => Math.min(prev + 1, 4))
    const handleBack = () => setStep(prev => Math.max(prev - 1, 1))

    const handleComplete = async (generatedData: any[], generatedVariables: any[]) => {
        setData(generatedData)
        setVariables(generatedVariables)

        try {
            await fetch('/api/project/upload-dataset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: generatedData,
                    variables: generatedVariables,
                    project_id: 'default'
                })
            })
        } catch (error) {
            console.error("Failed to auto-sync generated data:", error)
        }

        toggleGenerator(false)
        setViewMode('data')
        setTimeout(() => setStep(1), 500)
    }

    if (!isGeneratorOpen) return null

    return (
        <AnimatePresence>
            <div className={cn("absolute inset-0 z-[100] flex items-center justify-center backdrop-blur-md p-2 md:p-6 transition-colors duration-500", activeConfig.overlay)}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className={cn(
                        "w-full h-full max-w-6xl max-h-[95%] rounded-3xl flex flex-col overflow-hidden relative backdrop-blur-xl transition-all duration-500",
                        activeConfig.modal
                    )}
                >
                    {/* Minimalist Progress Bar */}
                    <div className={cn("absolute top-0 left-0 w-full h-1 z-20", activeConfig.progressBg)}>
                        <motion.div
                            className={cn("h-full", activeConfig.progressFill)}
                            initial={{ width: "25%" }}
                            animate={{ width: `${step * 25}%` }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                        />
                    </div>

                    {/* Floating Close Button */}
                    <button
                        onClick={() => toggleGenerator(false)}
                        className={cn(
                            "absolute top-4 right-4 z-50 p-2.5 rounded-full transition-all backdrop-blur-md",
                            activeConfig.closeBtn
                        )}
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Step Content - Full Height */}
                    <div className="flex-1 relative overflow-hidden flex flex-col">
                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-10 pb-24 md:pb-28 custom-scrollbar">
                            {/* Breadcrumb Indicator - Clean Style */}
                            <div className="mb-8 flex items-center gap-3 text-sm transition-colors duration-300">
                                <span className={step >= 1 ? activeConfig.breadcrumbActive : activeConfig.breadcrumbDim}>Konteks</span>
                                <span className={activeConfig.breadcrumbDim}>/</span>
                                <span className={step >= 2 ? activeConfig.breadcrumbActive : activeConfig.breadcrumbDim}>Variabel</span>
                                <span className={activeConfig.breadcrumbDim}>/</span>
                                <span className={step >= 3 ? activeConfig.breadcrumbActive : activeConfig.breadcrumbDim}>Hubungan</span>
                                <span className={activeConfig.breadcrumbDim}>/</span>
                                <span className={step >= 4 ? activeConfig.breadcrumbActive : activeConfig.breadcrumbDim}>Review</span>
                            </div>

                            <AnimatePresence mode="wait">
                                {step === 1 && (
                                    <Step1Context key="step1" data={blueprint} updateData={updateBlueprint} />
                                )}
                                {step === 2 && (
                                    <Step2Structure key="step2" data={blueprint} updateData={updateBlueprint} />
                                )}
                                {step === 3 && (
                                    <Step3Behavior key="step3" data={blueprint} updateData={updateBlueprint} />
                                )}
                                {step === 4 && (
                                    <Step4Preview key="step4" data={blueprint} onComplete={handleComplete} />
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Minimal Floating Navigation (Bottom) */}
                    {step < 4 && (
                        <div className="absolute bottom-6 right-6 z-40 flex items-center gap-3">
                            <button
                                onClick={handleBack}
                                disabled={step === 1}
                                className={cn(
                                    "px-5 py-2.5 rounded-full backdrop-blur-xl font-medium transition-all shadow-sm",
                                    step === 1 ? "opacity-0 pointer-events-none" : activeConfig.btnBack
                                )}
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>

                            <button
                                onClick={handleNext}
                                className={cn("flex items-center gap-2 px-8 py-3 rounded-full font-bold transition-all", activeConfig.btnNext)}
                            >
                                Lanjut
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    )
}


