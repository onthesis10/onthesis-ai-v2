import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    PenTool,
    PieChart,
    Sun,
    Moon,
    Sparkles,
    PanelLeftClose,
    PanelLeftOpen,
    FolderKanban,
    MessageCircle,
    BookMarked,
    FileText,
    Map,
    GraduationCap,
    Settings,
    HelpCircle,
    Zap,
    LogOut,
    MoreVertical,
    CheckCircle2
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { OnThesisLogo } from '@/components/ui/OnThesisLogo';
import { useThemeStore, type ThemeMode } from '@/store/themeStore';

/* ─── Config ─── */
const menuItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/projects', icon: FolderKanban, label: 'Projects' },
    { to: '/writing', icon: PenTool, label: 'Writing Studio' },
    { to: '/analysis', icon: PieChart, label: 'Data Analysis' },
    { to: '/chat', icon: MessageCircle, label: 'AI Chat' },
];

const featureItems = [
    { to: '/citations', icon: BookMarked, label: 'Citation Manager' },
    { to: '/paraphrase', icon: FileText, label: 'Paraphrase AI' },
    { to: '/research-map', icon: Map, label: 'Research Map' },
    { to: '/thesis-defense', icon: GraduationCap, label: 'Defense Prep' },
];

const generalItems = [
    { to: '/settings', icon: Settings, label: 'Settings' },
    { to: '/help', icon: HelpCircle, label: 'Help' },
];

const themeIcons: Record<ThemeMode, typeof Sun> = {
    light: Sun,
    dark: Moon,
    happy: Sparkles,
};

interface UserInfo {
    email: string;
    displayName: string;
    photoURL: string | null;
    isPro: boolean;
}

interface AppSidebarProps {
    user: UserInfo | null;
}

export function AppSidebar({ user }: AppSidebarProps) {
    const [collapsed, setCollapsed] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const { theme, cycleTheme } = useThemeStore();
    const location = useLocation();

    // Derived State
    const displayName = user?.displayName || 'Guest';
    const email = user?.email || 'Loading...';
    const initials = user?.displayName
        ? user.displayName.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
        : '..';
    const isPro = user?.isPro || false;

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const ThemeIcon = themeIcons[theme];

    const isActive = (to: string) =>
        to === '/dashboard'
            ? location.pathname === '/dashboard'
            : location.pathname.startsWith(to);

    /* ─── THEME CONFIG (Polished & Expensive Look) ─── */
    const themeStyles = {
        light: {
            // macOS Finder Style: Light gray translucent
            sidebar: "bg-[#F5F5F7]/80 border-r border-black/5 backdrop-blur-3xl",
            textMain: "text-slate-500 font-medium",
            textActive: "text-white font-semibold",
            // Classic Apple Blue Active State
            bgActive: "bg-[#007AFF] shadow-md shadow-blue-500/20",
            bgHover: "hover:bg-black/5 hover:text-slate-900",
            popup: "bg-white/80 border-white/20 shadow-2xl backdrop-blur-3xl ring-1 ring-black/5",
            divider: "bg-black/5",
            userCard: "hover:bg-white/50 border-transparent",
            toggleBtn: "text-slate-400 hover:text-slate-700 hover:bg-black/5",
            sectionLabel: "text-slate-400"
        },
        dark: {
            // Deep Space Glass
            sidebar: "bg-[#0B1120]/70 border-r border-white/5 backdrop-blur-3xl",
            textMain: "text-slate-400 font-medium",
            textActive: "text-white font-semibold",
            // Neon Cyan Accent
            bgActive: "bg-[#0EA5E9] shadow-[0_0_20px_-5px_rgba(14,165,233,0.5)]",
            bgHover: "hover:bg-white/5 hover:text-slate-200",
            popup: "bg-[#1E293B]/80 border-white/10 shadow-2xl backdrop-blur-3xl ring-1 ring-white/5",
            divider: "bg-white/5",
            userCard: "hover:bg-white/5 border-transparent",
            toggleBtn: "text-slate-500 hover:text-slate-200 hover:bg-white/5",
            sectionLabel: "text-slate-500"
        },
        happy: {
            // Tropical Morning (Clean & Expensive) - NO PURPLE
            // Background warm white glass
            sidebar: "bg-[#FFFCF5]/70 border-r border-orange-100/50 backdrop-blur-3xl",
            textMain: "text-stone-500 font-medium",
            textActive: "text-white font-bold",
            // Gradient Orange-Rose (Warm & Happy)
            bgActive: "bg-gradient-to-r from-orange-400 to-rose-400 shadow-lg shadow-orange-500/25",
            bgHover: "hover:bg-orange-50/80 hover:text-orange-600",
            popup: "bg-white/80 border-white/60 shadow-xl shadow-orange-500/10 backdrop-blur-3xl ring-1 ring-orange-100",
            divider: "bg-orange-100",
            userCard: "hover:bg-white/60 border-transparent hover:shadow-sm hover:ring-1 hover:ring-orange-100",
            toggleBtn: "text-orange-300 hover:text-orange-500 hover:bg-orange-50",
            sectionLabel: "text-stone-400"
        }
    }[theme as ThemeMode || 'dark'];

    const activeConfig = themeStyles;

    /* ─── Render Nav Item ─── */
    const renderNavItem = (item: { to: string; icon: typeof LayoutDashboard; label: string }) => {
        const active = isActive(item.to);

        return (
            <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                    "group relative flex items-center gap-3 rounded-lg transition-all duration-300 ease-out select-none overflow-hidden",
                    collapsed
                        ? "w-9 h-9 justify-center mx-auto my-1.5"
                        : "w-full px-3 py-2 mx-0", // Increased padding for cleaner look
                    "text-[13px] tracking-wide",
                    active ? activeConfig.textActive : activeConfig.textMain,
                    active ? activeConfig.bgActive : activeConfig.bgHover
                )}
                title={collapsed ? item.label : undefined}
            >
                <item.icon className={cn(
                    "relative z-10 w-[18px] h-[18px] shrink-0 transition-transform duration-300",
                    active ? "scale-100" : "scale-100 group-hover:scale-110"
                )} />

                {!collapsed && (
                    <span className="relative z-10 truncate">{item.label}</span>
                )}
            </NavLink>
        );
    };

    const renderLabel = (text: string) =>
        !collapsed ? (
            <p className={cn(
                "px-3 pt-5 pb-2 text-[10px] font-bold uppercase tracking-widest font-sans select-none",
                activeConfig.sectionLabel
            )}>
                {text}
            </p>
        ) : (
            <div className={cn("my-2 mx-auto w-4 h-[1px]", activeConfig.divider)} />
        );

    return (
        <aside
            className={cn(
                "h-screen sticky top-0 flex flex-col shrink-0 transition-[width] duration-500 cubic-bezier(0.25,1,0.5,1) z-[60]",
                activeConfig.sidebar,
                collapsed ? "w-[72px]" : "w-[260px]" // Wider sidebar for "Expensive" feel
            )}
        >
            {/* ─── HEADER ─── */}
            <div className="h-[72px] flex items-center shrink-0 relative px-5">
                <div className={cn(
                    "flex-1 flex items-center transition-all duration-500",
                    collapsed ? "justify-center" : "justify-start"
                )}>
                    <div
                        className="cursor-pointer transition-transform hover:scale-105 active:scale-95"
                        onClick={() => !collapsed && setCollapsed(true)}
                    >
                        <OnThesisLogo
                            variant={collapsed ? 'animated-icon' : 'animated'}
                            className="h-8 w-auto" // Slightly smaller logo for elegance
                        />
                    </div>
                </div>

                <div className={cn(
                    "absolute right-4 top-1/2 -translate-y-1/2 transition-all duration-300 z-20",
                    collapsed ? "opacity-0 pointer-events-none translate-x-4" : "opacity-100 translate-x-0"
                )}>
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className={cn("p-2 rounded-lg transition-all", activeConfig.toggleBtn)}
                    >
                        <PanelLeftClose className="w-4 h-4 stroke-[1.5]" />
                    </button>
                </div>
            </div>

            {/* ─── NAV ─── */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-6 space-y-1 scrollbar-none">
                {collapsed && (
                    <div className="flex justify-center mb-6 mt-2 animate-in fade-in zoom-in duration-300">
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className={cn("p-2.5 rounded-xl shadow-sm transition-all border border-transparent", activeConfig.bgActive, activeConfig.textActive)}
                        >
                            <PanelLeftOpen className="w-4 h-4 stroke-[2]" />
                        </button>
                    </div>
                )}

                <div className="space-y-0.5">{renderLabel('Workspace')}{menuItems.map(renderNavItem)}</div>
                <div className="space-y-0.5">{renderLabel('Research Tools')}{featureItems.map(renderNavItem)}</div>
                <div className="space-y-0.5">{renderLabel('System')}{generalItems.map(renderNavItem)}</div>
            </nav>

            {/* ─── FOOTER & POPUP ─── */}
            <div className="shrink-0 px-3 pb-6 pt-2 relative" ref={menuRef}>

                {/* POPUP MENU */}
                <div className={cn(
                    "absolute rounded-2xl border p-2 transition-all duration-300 cubic-bezier(0.2, 0.8, 0.2, 1) z-[9999]",
                    activeConfig.popup,
                    collapsed
                        ? "left-[calc(100%+12px)] bottom-6 w-64 origin-bottom-left"
                        : "bottom-[calc(100%+8px)] left-2 right-2 origin-bottom",
                    isMenuOpen
                        ? "opacity-100 scale-100 translate-y-0 visible"
                        : "opacity-0 scale-95 translate-y-2 invisible"
                )}>
                    {/* User Profile Header in Popup */}
                    <div className={cn(
                        "flex items-center gap-3 px-3 py-3 mb-2 rounded-xl",
                        theme === 'happy' ? "bg-orange-50/50" : "bg-black/5 dark:bg-white/5"
                    )}>
                        <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-white/20",
                            theme === 'happy' ? "bg-gradient-to-br from-orange-400 to-rose-500" : "bg-gradient-to-br from-blue-500 to-cyan-600"
                        )}>
                            {initials}
                        </div>
                        <div className="overflow-hidden">
                            <p className={cn("text-sm font-bold truncate", activeConfig.textMain)}>{displayName}</p>
                            <p className={cn("text-xs truncate opacity-60", activeConfig.textMain)}>{email}</p>
                        </div>
                    </div>

                    <NavLink to="/upgrade" className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1 group", activeConfig.bgHover, activeConfig.textMain)}>
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                            <Zap className="w-4 h-4 fill-current" />
                        </div>
                        <span className="flex-1 font-semibold">Upgrade to Pro</span>
                    </NavLink>

                    <button onClick={cycleTheme} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1", activeConfig.bgHover, activeConfig.textMain)}>
                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-colors", theme === 'happy' ? "bg-white border-orange-200 text-orange-500" : "bg-white/10 border-white/10")}>
                            <ThemeIcon className="w-4 h-4" />
                        </div>
                        <span className="flex-1 text-left">Theme: {theme.charAt(0).toUpperCase() + theme.slice(1)}</span>
                    </button>

                    <div className={cn("h-px w-full my-2", activeConfig.divider)} />

                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20">
                        <LogOut className="w-4 h-4" />
                        <span className="text-left">Sign out</span>
                    </button>
                </div>

                {/* USER CARD TRIGGER (Simplified & Elegant) */}
                <div
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={cn(
                        "flex items-center gap-3 rounded-2xl p-2 cursor-pointer transition-all duration-300 group select-none border",
                        activeConfig.userCard,
                        collapsed ? "justify-center p-0 h-10 w-10 border-transparent bg-transparent" : "justify-between pr-4"
                    )}
                >
                    <div className={cn("flex items-center gap-3", collapsed ? "justify-center" : "flex-1 min-w-0")}>
                        <div className="relative shrink-0">
                            <div className={cn(
                                "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ring-2 ring-white dark:ring-[#0B1120] overflow-hidden transition-transform group-hover:scale-105",
                                theme === 'happy' ? "bg-gradient-to-tr from-orange-400 to-rose-400" : "bg-gradient-to-br from-blue-500 to-cyan-500"
                            )}>
                                {initials}
                            </div>
                            <span className={cn(
                                "absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white dark:ring-[#0B1120]",
                                isPro
                                    ? (theme === 'happy' ? "bg-amber-400" : "bg-amber-500")
                                    : (theme === 'happy' ? "bg-emerald-400" : "bg-emerald-500")
                            )} />
                        </div>

                        {!collapsed && (
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <p className={cn("text-[13px] font-bold truncate leading-none mb-1", activeConfig.textMain)}>{displayName}</p>
                                <p className={cn("text-[11px] font-medium truncate leading-none opacity-60", activeConfig.textMain)}>
                                    {isPro ? "Pro Plan" : "Free Plan"}
                                </p>
                            </div>
                        )}
                    </div>

                    {!collapsed && (
                        <div className={cn("transition-colors", theme === 'happy' ? "text-orange-300 group-hover:text-orange-500" : "text-slate-400 group-hover:text-slate-600")}>
                            <MoreVertical className="w-4 h-4" />
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}