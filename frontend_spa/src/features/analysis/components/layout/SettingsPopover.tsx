import { motion } from 'framer-motion'
import { ChevronLeft, Sparkles, Sun, Moon, Monitor } from 'lucide-react'
import { useAnalysisStore } from '../../store/useAnalysisStore'
import { cn } from '@/lib/utils'

export const SettingsPopover = ({ onClose }: { onClose: () => void }) => {
    const { theme, setTheme } = useAnalysisStore()

    return (
        <div style={{ zIndex: 9999, position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="relative w-full max-w-sm bg-background/80 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-3xl p-6 overflow-hidden ring-1 ring-black/5"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Preferences</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Customize your workspace</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 rotate-180" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Theme Segmented Control */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-primary" /> Theme
                        </label>
                        <div className="grid grid-cols-3 gap-2 bg-muted/40 p-1.5 rounded-2xl border border-white/10">
                            <button
                                onClick={() => setTheme('light')}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-2 py-3 rounded-xl text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20",
                                    theme === 'light'
                                        ? "bg-white dark:bg-slate-700 text-foreground shadow-md ring-1 ring-black/5 scale-[1.02]"
                                        : "text-muted-foreground hover:text-foreground hover:bg-white/40"
                                )}
                            >
                                <Sun className={cn("w-5 h-5", theme === 'light' ? "text-amber-500 fill-amber-500" : "")} />
                                Light
                            </button>
                            <button
                                onClick={() => setTheme('dark')}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-2 py-3 rounded-xl text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20",
                                    theme === 'dark'
                                        ? "bg-slate-950 text-white shadow-md ring-1 ring-white/10 scale-[1.02]"
                                        : "text-muted-foreground hover:text-foreground hover:bg-white/40"
                                )}
                            >
                                <Moon className={cn("w-5 h-5", theme === 'dark' ? "text-blue-400 fill-blue-400" : "")} />
                                Dark
                            </button>
                            <button
                                onClick={() => setTheme('system')}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-2 py-3 rounded-xl text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20",
                                    theme === 'system'
                                        ? "bg-background text-foreground shadow-md ring-1 ring-black/5 scale-[1.02]"
                                        : "text-muted-foreground hover:text-foreground hover:bg-white/40"
                                )}
                            >
                                <Monitor className="w-5 h-5" />
                                System
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
