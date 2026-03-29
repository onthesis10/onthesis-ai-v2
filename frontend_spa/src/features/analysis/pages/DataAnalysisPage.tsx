import { useState, useEffect } from 'react'
import { useAnalysisStore } from '../store/useAnalysisStore'
import { DataView } from '../components/data/DataView'
import { VariableView } from '../components/variable/VariableView'
import { OutputView } from '../components/output/OutputView'
import { AIAssistantView } from '../components/assistant/AIAssistantView'
import { GuideView } from '../components/guide/GuideView'
import { AIDataGeneratorWizard } from '../components/generator/AIDataGeneratorWizard'
import { AnalysisToolbar } from '../components/analysis/AnalysisToolbar'
import { AnalysisDialog } from '../components/analysis/AnalysisDialog'
import { AnalysisLoader } from '../components/ui/AnalysisLoader'
import { AnimatePresence, motion } from 'framer-motion'

export const DataAnalysisPage = () => {
    const viewMode = useAnalysisStore(s => s.viewMode);
    const fetchUserData = useAnalysisStore(s => s.fetchUserData);
    const isAnalyzing = useAnalysisStore(s => s.isAnalyzing);

    useEffect(() => {
        fetchUserData()
    }, [])

    return (
        <div className="flex flex-col h-full w-full space-y-2 p-2 relative">
            {/* Header: Toolbar (Center) & System Controls (Right) */}
            <div className="relative flex items-center justify-center shrink-0 z-40">
                {/* Center: Analysis Tools */}
                <AnalysisToolbar />
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative rounded-xl border border-border/10 bg-background/50 backdrop-blur-sm shadow-sm">
                {viewMode === 'data' && <DataView />}
                {viewMode === 'variable' && <VariableView />}
                {viewMode === 'output' && <OutputView />}
                {viewMode === 'ai-assistant' && <AIAssistantView />}
                {viewMode === 'guide' && <GuideView />}
            </div>

            {/* Global Overlays */}
            <AIDataGeneratorWizard />
            <AnalysisDialog />

            {/* Loader Overlay */}
            <AnimatePresence>
                {isAnalyzing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-background/50 backdrop-blur-sm flex items-center justify-center"
                    >
                        <AnalysisLoader />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
