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
import { SettingsPopover } from '../components/layout/SettingsPopover'
import { Settings } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

export const DataAnalysisPage = () => {
    const { viewMode, fetchUserData, isAnalyzing } = useAnalysisStore()
    const [showSettings, setShowSettings] = useState(false)

    useEffect(() => {
        fetchUserData()
    }, [])

    return (
        <div className="flex flex-col h-full w-full space-y-4 p-4 relative">
            {/* Header: Toolbar (Left) & System Controls (Right) */}
            {/* Header: Toolbar (Center) & System Controls (Right) */}
            <div className="relative flex items-center justify-center shrink-0 z-40">
                {/* Center: Analysis Tools */}
                <AnalysisToolbar />

                {/* Right: System Controls (Absolute) */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button
                        onClick={() => setShowSettings(true)}
                        className="flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground hover:bg-white/50 hover:text-foreground transition-all duration-200 border border-transparent hover:border-border/40 hover:shadow-sm"
                        title="Settings"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
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

            {/* Settings Overlay */}
            <AnimatePresence>
                {showSettings && (
                    <SettingsPopover onClose={() => setShowSettings(false)} />
                )}
            </AnimatePresence>

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
