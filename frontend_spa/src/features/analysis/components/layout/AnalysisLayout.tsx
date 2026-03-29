import { useEffect } from 'react'
import { AnalysisSidebar } from './AnalysisSidebar'
import { AnalysisDialog } from '../analysis/AnalysisDialog'
import { AnalysisLoader } from '../ui/AnalysisLoader'
import { useAnalysisStore } from '../../store/useAnalysisStore'
import { AnimatePresence, motion } from 'framer-motion'

export const AnalysisLayout = ({ children }: { children: React.ReactNode }) => {
    // Theme is handled globally by useThemeStore and App.tsx
    // We just need to ensure the layout structure supports the content

    return (
        <div className="flex h-screen w-screen bg-background overflow-hidden relative">
            {/* Sidebar */}
            <AnalysisSidebar />

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-muted/5 dark:bg-background">
                {children}
            </main>

            {/* Global Overlays */}
            <AnalysisDialog />

            <AnimatePresence>
                {useAnalysisStore(state => state.isAnalyzing) && (
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

