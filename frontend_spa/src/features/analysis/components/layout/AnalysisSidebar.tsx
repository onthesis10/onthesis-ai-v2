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

import { useThemeStore } from '@/store/themeStore'

export const AnalysisSidebar = () => {
    const viewMode = useAnalysisStore(s => s.viewMode);
    const setViewMode = useAnalysisStore(s => s.setViewMode);
    const isSidebarOpen = useAnalysisStore(s => s.isSidebarOpen);
    const toggleSidebar = useAnalysisStore(s => s.toggleSidebar);
    const { theme } = useThemeStore()

    /* ─── THEME CONFIG (Polished & Expensive Look) ─── */
    const themeStyles = {
        light: {
            sidebar: "bg-[#F5F5F7]/80 border-r border-black/5 backdrop-blur-3xl",
            textMain: "text-slate-500 font-medium",
            textActive: "text-white font-semibold",
            bgActive: "bg-[#007AFF] shadow-md shadow-blue-500/20",
            bgHover: "hover:bg-black/5 hover:text-slate-900",
            sectionLabel: "text-slate-400",
            toggleBtn: "text-slate-400 hover:text-slate-700 hover:bg-black/5",
        },
        dark: {
            sidebar: "bg-[#0B1120]/70 border-r border-white/5 backdrop-blur-3xl",
            textMain: "text-slate-400 font-medium",
            textActive: "text-white font-semibold",
            bgActive: "bg-[#0EA5E9] shadow-[0_0_20px_-5px_rgba(14,165,233,0.5)]",
            bgHover: "hover:bg-white/5 hover:text-slate-200",
            sectionLabel: "text-slate-500",
            toggleBtn: "text-slate-500 hover:text-slate-200 hover:bg-white/5",
        },
        happy: {
            sidebar: "bg-[#FFFCF5]/70 border-r border-orange-100/50 backdrop-blur-3xl",
            textMain: "text-stone-500 font-medium",
            textActive: "text-white font-bold",
            bgActive: "bg-gradient-to-r from-orange-400 to-rose-400 shadow-lg shadow-orange-500/25",
            bgHover: "hover:bg-orange-50/80 hover:text-orange-600",
            sectionLabel: "text-stone-400",
            toggleBtn: "text-orange-300 hover:text-orange-500 hover:bg-orange-50",
        }
    }[theme || 'light'];

    const activeConfig = themeStyles;

    return (
        <motion.div
            initial={false}
            animate={{ width: isSidebarOpen ? 260 : 72 }}
            className={cn(
                "h-screen flex flex-col shrink-0 transition-[width] duration-500 cubic-bezier(0.25,1,0.5,1) z-[90]",
                activeConfig.sidebar
            )}
        >
            {/* Logo Section */}
            <div className="h-[72px] flex items-center shrink-0 relative px-5">
                <div className={cn(
                    "flex-1 flex items-center transition-all duration-500",
                    isSidebarOpen ? "justify-start" : "justify-center"
                )}>
                    <OnThesisLogo
                        variant={isSidebarOpen ? 'animated' : 'animated-icon'}
                        className="h-8 w-auto"
                    />
                </div>

                <div className={cn(
                    "absolute right-4 top-1/2 -translate-y-1/2 transition-all duration-300 z-20",
                    !isSidebarOpen ? "opacity-0 pointer-events-none translate-x-4" : "opacity-100 translate-x-0"
                )}>
                    <button
                        onClick={toggleSidebar}
                        className={cn("p-2 rounded-lg transition-all", activeConfig.toggleBtn)}
                    >
                        <Menu className="w-4 h-4 stroke-[1.5]" />
                    </button>
                </div>
            </div>

            {!isSidebarOpen && (
                <div className="flex justify-center mb-6 mt-2 animate-in fade-in zoom-in duration-300">
                    <button
                        onClick={toggleSidebar}
                        className={cn("p-2.5 rounded-xl shadow-sm transition-all border border-transparent", activeConfig.bgActive, activeConfig.textActive)}
                    >
                        <Menu className="w-4 h-4 stroke-[2]" />
                    </button>
                </div>
            )}

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-1 scrollbar-none">

                {/* Workspace Group */}
                <div className="space-y-0.5">
                    {isSidebarOpen ? (
                        <p className={cn(
                            "px-3 pt-5 pb-2 text-[10px] font-bold uppercase tracking-widest font-sans select-none",
                            activeConfig.sectionLabel
                        )}>Workspace</p>
                    ) : <div className="my-2 mx-auto w-4 h-[1px] bg-border/20" />}

                    <NavItem
                        active={viewMode === 'data'}
                        onClick={() => setViewMode('data')}
                        icon={<Database className="w-[18px] h-[18px]" />}
                        label="Data View"
                        collapsed={!isSidebarOpen}
                        themeConfig={activeConfig}
                    />
                    <NavItem
                        active={viewMode === 'variable'}
                        onClick={() => setViewMode('variable')}
                        icon={<Table2 className="w-[18px] h-[18px]" />}
                        label="Variable View"
                        collapsed={!isSidebarOpen}
                        themeConfig={activeConfig}
                    />
                    <NavItem
                        active={viewMode === 'output'}
                        onClick={() => setViewMode('output')}
                        icon={<BarChart3 className="w-[18px] h-[18px]" />}
                        label="Analysis Output"
                        collapsed={!isSidebarOpen}
                        themeConfig={activeConfig}
                    />
                </div>

                {/* Tools Group */}
                <div className="space-y-0.5">
                    {isSidebarOpen ? (
                        <p className={cn(
                            "px-3 pt-5 pb-2 text-[10px] font-bold uppercase tracking-widest font-sans select-none",
                            activeConfig.sectionLabel
                        )}>Tools</p>
                    ) : <div className="my-2 mx-auto w-4 h-[1px] bg-border/20" />}


                    <NavItem
                        active={viewMode === 'ai-assistant'}
                        onClick={() => setViewMode('ai-assistant')}
                        icon={<Bot className="w-[18px] h-[18px]" />}
                        label="AI Assistant"
                        collapsed={!isSidebarOpen}
                        themeConfig={activeConfig}
                    />
                    <NavItem
                        active={viewMode === 'guide'}
                        onClick={() => setViewMode('guide')}
                        icon={<BookOpen className="w-[18px] h-[18px]" />}
                        label="User Guide"
                        collapsed={!isSidebarOpen}
                        themeConfig={activeConfig}
                    />
                </div>
            </div>

            {/* No Footer - Minimalist */}
            <div className="shrink-0 py-4 px-3" />

        </motion.div>
    )
}

const NavItem = ({ active, onClick, icon, label, collapsed, themeConfig }: any) => (
    <button
        onClick={onClick}
        title={collapsed ? label : undefined}
        className={cn(
            "flex items-center transition-all duration-300 group relative overflow-hidden rounded-lg",
            collapsed ? "w-9 h-9 justify-center mx-auto my-1.5" : "w-full gap-3 px-3 py-2 mx-0",
            "text-[13px] tracking-wide",
            active ? themeConfig.textActive : themeConfig.textMain,
            active ? themeConfig.bgActive : themeConfig.bgHover
        )}
    >
        <span className={cn("relative z-10 shrink-0 transition-transform duration-300", active ? "scale-100" : "scale-100 group-hover:scale-110")}>{icon}</span>
        {!collapsed && <span className="relative z-10 truncate">{label}</span>}
    </button>
)
