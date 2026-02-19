import { useEffect } from 'react'
import { AnalysisSidebar } from './AnalysisSidebar'
import { AnalysisDialog } from '../analysis/AnalysisDialog'
import { AnalysisLoader } from '../ui/AnalysisLoader'
import { useAnalysisStore } from '../../store/useAnalysisStore'
import { AnimatePresence, motion } from 'framer-motion'

export const AnalysisLayout = ({ children }: { children: React.ReactNode }) => {
    const { theme } = useAnalysisStore() // Get theme from store

    // Global Theme Listener & Initializer
    useEffect(() => {
        const root = window.document.documentElement
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

        const applyTheme = () => {
            const systemDark = mediaQuery.matches
            const isDark = theme === 'dark' || (theme === 'system' && systemDark)

            if (isDark) {
                root.classList.add('dark')
            } else {
                root.classList.remove('dark')
            }
        }

        // Apply theme immediately on mount and when theme changes
        applyTheme()

        // Listen for system changes (only relevant if theme is 'system')
        const handleSystemChange = () => {
            if (theme === 'system') {
                applyTheme()
            }
        }

        mediaQuery.addEventListener('change', handleSystemChange)
        return () => mediaQuery.removeEventListener('change', handleSystemChange)
    }, [theme])

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
