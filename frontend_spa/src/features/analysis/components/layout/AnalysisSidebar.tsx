import { motion } from 'framer-motion'
import { useAnalysisStore } from '../../store/useAnalysisStore'
import {
    Database,
    Table2,
    BarChart3,
    Bot,
    BookOpen,
    Menu // Burger Icon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { OnThesisLogo } from '../ui/OnThesisLogo'

export const AnalysisSidebar = () => {
    const { viewMode, setViewMode, isSidebarOpen, toggleSidebar } = useAnalysisStore()

    return (
        <motion.div
            initial={false}
            animate={{ width: isSidebarOpen ? 260 : 80 }}
            className="h-screen flex flex-col shrink-0 z-[90] bg-background/95 backdrop-blur-3xl border-r border-border/10 relative transition-all duration-300"
        >
            {/* Logo Section */}
            <div className="h-20 flex items-center justify-between px-4 shrink-0 mt-2">
                <div className={cn("flex items-center transition-all duration-300", isSidebarOpen ? "justify-start" : "justify-center w-full")}>
                    <OnThesisLogo
                        variant={isSidebarOpen ? 'animated' : 'icon-only'}
                        className="h-9 w-auto"
                    />
                </div>
                {/* Burger Toggle - Only visible when open, or always visible? 
                    User asked to "hide pakai burger button". 
                    If closed, we need a way to open it. 
                    Usually the toggle is the burger itself.
                */}
                {isSidebarOpen && (
                    <button
                        onClick={toggleSidebar}
                        className="p-1.5 rounded-xl text-muted-foreground hover:bg-muted/50 transition-colors"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* If closed, show burger to open at top or bottom? 
                User said "minimalist... hide pakai burger button". 
                Typically implies a toggle. 
                Let's put a toggle at the top if closed too.
            */}
            {!isSidebarOpen && (
                <div className="flex justify-center mb-4">
                    <button
                        onClick={toggleSidebar}
                        className="p-2 rounded-xl text-muted-foreground hover:bg-muted/50 transition-colors"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-4 space-y-6">

                {/* Workspace Group */}
                <div className="space-y-1 px-3">
                    {isSidebarOpen && <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Workspace</p>}

                    <NavItem
                        active={viewMode === 'data'}
                        onClick={() => setViewMode('data')}
                        icon={<Database className="w-5 h-5" />}
                        label="Data View"
                        collapsed={!isSidebarOpen}
                    />
                    <NavItem
                        active={viewMode === 'variable'}
                        onClick={() => setViewMode('variable')}
                        icon={<Table2 className="w-5 h-5" />}
                        label="Variable View"
                        collapsed={!isSidebarOpen}
                    />
                    <NavItem
                        active={viewMode === 'output'}
                        onClick={() => setViewMode('output')}
                        icon={<BarChart3 className="w-5 h-5" />}
                        label="Analysis Output"
                        collapsed={!isSidebarOpen}
                    />
                </div>

                {/* Tools Group */}
                <div className="space-y-1 px-3">
                    {isSidebarOpen && <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Tools</p>}

                    <NavItem
                        active={viewMode === 'ai-assistant'}
                        onClick={() => setViewMode('ai-assistant')}
                        icon={<Bot className="w-5 h-5" />}
                        label="AI Assistant"
                        collapsed={!isSidebarOpen}
                    />
                    <NavItem
                        active={viewMode === 'guide'}
                        onClick={() => setViewMode('guide')}
                        icon={<BookOpen className="w-5 h-5" />}
                        label="User Guide"
                        collapsed={!isSidebarOpen}
                    />
                </div>
            </div>

            {/* No Footer - Minimalist */}
            <div className="shrink-0 py-4 px-3" />

        </motion.div>
    )
}

const NavItem = ({ active, onClick, icon, label, collapsed }: any) => (
    <button
        onClick={onClick}
        title={collapsed ? label : undefined}
        className={cn(
            "flex items-center transition-all duration-200 group relative overflow-hidden rounded-xl",
            collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full gap-3 px-3 py-2.5",
            "text-sm font-medium",
            active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        )}
    >
        <span className={cn("relative z-10 shrink-0", active ? "text-primary" : "")}>{icon}</span>
        {!collapsed && <span className="relative z-10 truncate">{label}</span>}
        {active && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/5 bg-primary rounded-r-full" />
        )}
    </button>
)
