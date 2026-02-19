import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, ArrowLeft } from 'lucide-react'
import { useAnalysisStore } from '../../store/useAnalysisStore'
import { Step1Context } from './Step1Context'
import { Step2Structure } from './Step2Structure'
import { Step3Behavior } from './Step3Behavior'
import { Step4Preview } from './Step4Preview'
import { cn } from '@/lib/utils'

export const AIDataGeneratorWizard = () => {
    const { isGeneratorOpen, toggleGenerator, setData, setVariables, setViewMode } = useAnalysisStore()
    const [step, setStep] = useState(1)

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
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-lg p-2 md:p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="w-full h-full max-w-[95vw] max-h-[92vh] bg-background rounded-3xl shadow-2xl border border-white/10 flex flex-col overflow-hidden relative"
                >
                    {/* Minimalist Progress Bar */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-secondary/30 z-20">
                        <motion.div
                            className="h-full bg-gradient-to-r from-cyan-400 to-blue-600 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                            initial={{ width: "25%" }}
                            animate={{ width: `${step * 25}%` }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                        />
                    </div>

                    {/* Floating Close Button */}
                    <button
                        onClick={() => toggleGenerator(false)}
                        className="absolute top-4 right-4 z-50 p-2.5 bg-background/50 hover:bg-red-500/10 hover:text-red-500 border border-border/50 rounded-full transition-all backdrop-blur-md"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Step Content - Full Height */}
                    <div className="flex-1 relative overflow-hidden flex flex-col">
                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-10 custom-scrollbar">
                            {/* Breadcrumb Indicator - Clean Style */}
                            <div className="mb-8 flex items-center gap-3 text-sm font-medium opacity-60">
                                <span className={cn(step >= 1 ? "text-cyan-500" : "")}>Konteks</span>
                                <span className="text-muted-foreground">/</span>
                                <span className={cn(step >= 2 ? "text-cyan-500" : "")}>Variabel</span>
                                <span className="text-muted-foreground">/</span>
                                <span className={cn(step >= 3 ? "text-cyan-500" : "")}>Hubungan</span>
                                <span className="text-muted-foreground">/</span>
                                <span className={cn(step >= 4 ? "text-cyan-500" : "")}>Review</span>
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
                                    "px-5 py-2.5 rounded-full backdrop-blur-xl border border-white/10 font-medium transition-all",
                                    step === 1 ? "opacity-0 pointer-events-none" : "bg-black/40 hover:bg-black/60 text-white"
                                )}
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>

                            <button
                                onClick={handleNext}
                                className="flex items-center gap-2 px-8 py-3 rounded-full font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 transition-all"
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

