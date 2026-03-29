import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
    CheckCircle2,
    Crown,       // Ikon baru untuk Premium
    LifeBuoy,    // Ikon baru untuk Bantuan
    Palette,     // Ikon baru untuk Tema
    User         // Ikon baru untuk Profil
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { OnThesisLogo } from '@/components/ui/OnThesisLogo';
import { useThemeStore, type ThemeMode } from '@/store/themeStore';
import { AccountModal } from './AccountModal';

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
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
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

    const navigate = useNavigate();

    const handleLogout = () => {
        import('@/lib/firebase').then(({ auth }) => {
            if (auth) {
                auth.signOut().then(() => {
                    navigate('/login');
                });
            }
        });
    };

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

    const themeStyles = {
        light: {
            sidebar: "bg-[#F5F5F7]/80 border-r border-black/5 backdrop-blur-3xl",
            textMain: "text-slate-500 font-medium",
            textActive: "text-slate-900 font-semibold",
            bgActive: "bg-[#007AFF] text-white shadow-md shadow-blue-500/20",
            bgHover: "hover:bg-black/5 hover:text-slate-900",
            popup: "bg-white/95 border-black/5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] backdrop-blur-xl",
            divider: "bg-black/5",
            userCard: "bg-white border-black/5 shadow-sm hover:bg-black/[0.02]",
            toggleBtn: "text-slate-400 hover:text-slate-700 hover:bg-black/5",
            sectionLabel: "text-slate-400"
        },
        dark: {
            sidebar: "bg-[#0B1120]/70 border-r border-white/5 backdrop-blur-3xl",
            textMain: "text-slate-400 font-medium",
            textActive: "text-white font-semibold",
            bgActive: "bg-[#0EA5E9] shadow-[0_0_20px_-5px_rgba(14,165,233,0.5)]",
            bgHover: "hover:bg-white/5 hover:text-slate-200",
            popup: "bg-[#1E293B]/95 border-white/10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] backdrop-blur-xl",
            divider: "bg-white/5",
            userCard: "bg-[#0F172A]/80 border-white/5 shadow-sm hover:bg-white/5",
            toggleBtn: "text-slate-500 hover:text-slate-200 hover:bg-white/5",
            sectionLabel: "text-slate-500"
        },
        happy: {
            sidebar: "bg-[#FFFCF5]/70 border-r border-orange-100/50 backdrop-blur-3xl",
            textMain: "text-stone-500 font-medium",
            textActive: "text-stone-800 font-bold",
            bgActive: "bg-gradient-to-r from-orange-400 to-rose-400 shadow-lg shadow-orange-500/25",
            bgHover: "hover:bg-orange-50/80 hover:text-orange-600",
            popup: "bg-white/95 border-orange-100 shadow-[0_20px_40px_-15px_rgba(249,115,22,0.15)] backdrop-blur-xl",
            divider: "bg-orange-100",
            userCard: "bg-white border-orange-100 shadow-sm hover:border-orange-200 hover:shadow-md",
            toggleBtn: "text-orange-400 hover:text-orange-600 hover:bg-orange-50",
            sectionLabel: "text-stone-400"
        }
    }[theme as ThemeMode || 'dark'];

    const activeConfig = themeStyles;

    /* ─── Render Nav Item ─── */
    const renderNavItem = (item: { to: string; icon: any; label: string }) => {
        const active = isActive(item.to);
        return (
            <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                    "group relative flex items-center gap-3 rounded-xl transition-all duration-300 ease-out select-none overflow-hidden",
                    collapsed ? "w-10 h-10 justify-center mx-auto my-1.5" : "w-full px-3 py-2.5 mx-0",
                    "text-[13px] tracking-wide",
                    active ? activeConfig.textActive : activeConfig.textMain,
                    active ? activeConfig.bgActive : activeConfig.bgHover
                )}
                title={collapsed ? item.label : undefined}
            >
                <item.icon className={cn(
                    "relative z-10 w-[18px] h-[18px] shrink-0 transition-transform duration-300",
                    active ? "scale-100" : "scale-100 group-hover:scale-110",
                    !active && "opacity-80 group-hover:opacity-100"
                )} strokeWidth={active ? 2.5 : 2} />

                {!collapsed && (
                    <span className="relative z-10 truncate font-medium">{item.label}</span>
                )}
            </NavLink>
        );
    };

    const renderLabel = (text: string) =>
        !collapsed ? (
            <p className={cn("px-3 pt-6 pb-2 text-[10px] font-bold uppercase tracking-widest font-sans select-none", activeConfig.sectionLabel)}>
                {text}
            </p>
        ) : (
            <div className={cn("my-3 mx-auto w-4 h-[1px]", activeConfig.divider)} />
        );

    return (
        <aside
            className={cn(
                "h-screen sticky top-0 flex flex-col shrink-0 transition-[width] duration-500 cubic-bezier(0.25,1,0.5,1) z-[60]",
                activeConfig.sidebar,
                collapsed ? "w-[64px]" : "w-[260px]"
            )}
        >
            {/* ─── HEADER ─── */}
            <div className={cn("h-[72px] flex items-center shrink-0 relative transition-all duration-300", collapsed ? "px-0 justify-center" : "px-5")}>
                <div className={cn("flex-1 flex items-center transition-all duration-500", collapsed ? "justify-center" : "justify-start")}>
                    <div
                        className={cn("transition-transform hover:scale-105 active:scale-95", collapsed ? "cursor-pointer" : "cursor-default")}
                        onClick={() => collapsed && setCollapsed(false)}
                        title={collapsed ? "Expand Sidebar" : undefined}
                    >
                        <OnThesisLogo variant={collapsed ? 'animated-icon' : 'animated'} className={cn("w-auto transition-all duration-300", collapsed ? "h-9" : "h-8")} />
                    </div>
                </div>

                <div className={cn("absolute right-4 top-1/2 -translate-y-1/2 transition-all duration-300 z-20", collapsed ? "opacity-0 pointer-events-none translate-x-4" : "opacity-100 translate-x-0")}>
                    <button onClick={() => setCollapsed(!collapsed)} className={cn("p-2 rounded-xl transition-all", activeConfig.toggleBtn)}>
                        <PanelLeftClose className="w-[18px] h-[18px] stroke-[1.5]" />
                    </button>
                </div>
            </div>

            {/* ─── NAV ─── */}
            <nav className={cn("flex-1 overflow-y-auto overflow-x-hidden pb-6 space-y-1 scrollbar-none mt-2", collapsed ? "px-2" : "px-3")}>
                <div className="space-y-0.5">{renderLabel('Workspace')}{menuItems.map(renderNavItem)}</div>
                <div className="space-y-0.5">{renderLabel('Research Tools')}{featureItems.map(renderNavItem)}</div>
            </nav>

            {/* ─── FOOTER & POPUP ─── */}
            <div className={cn("shrink-0 pb-6 pt-2 relative", collapsed ? "px-2" : "px-4")} ref={menuRef}>

                {/* POPUP MENU */}
                <div className={cn(
                    "absolute rounded-[20px] border p-2 transition-all duration-300 ease-out z-[9999] flex flex-col gap-1",
                    activeConfig.popup,
                    collapsed
                        ? "left-[calc(100%+12px)] bottom-6 w-[260px] origin-bottom-left"
                        : "bottom-[calc(100%+12px)] left-4 right-4 origin-bottom",
                    isMenuOpen
                        ? "opacity-100 scale-100 translate-y-0 visible"
                        : "opacity-0 scale-95 translate-y-3 invisible"
                )}>
                    {/* Header: Click to open Account Modal */}
                    <button
                        onClick={() => {
                            setIsMenuOpen(false);
                            setIsAccountModalOpen(true);
                        }}
                        className={cn(
                            "group flex items-center gap-3 px-3 py-3 mb-1 rounded-[14px] w-full text-left transition-all duration-200 border border-transparent",
                            theme === 'dark' ? "hover:bg-white/10 hover:border-white/10" : "hover:bg-black/5 hover:border-black/5"
                        )}
                    >
                        <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white/20 shrink-0 transition-transform group-hover:scale-105",
                            theme === 'happy' ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-gradient-to-br from-blue-400 to-indigo-500"
                        )}>
                            {initials}
                        </div>
                        <div className="overflow-hidden flex-1">
                            <p className={cn("text-sm font-bold truncate tracking-tight transition-colors group-hover:text-blue-500", activeConfig.textActive)}>
                                {displayName}
                            </p>
                            <p className={cn("text-[11px] truncate mt-0.5", activeConfig.textMain)}>
                                {email}
                            </p>
                        </div>
                        <User className={cn("w-4 h-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-50 group-hover:translate-x-0", activeConfig.textMain)} />
                    </button>

                    <div className={cn("h-px w-full my-0.5 opacity-50", activeConfig.divider)} />

                    {/* Menu Items with premium hover effect */}
                    <div className="flex flex-col gap-0.5">
                        <NavLink to="/pricing" onClick={() => setIsMenuOpen(false)} className={cn("group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200", activeConfig.bgHover, activeConfig.textMain)}>
                            <Crown className="w-[18px] h-[18px] opacity-70 group-hover:text-amber-500 group-hover:opacity-100 transition-colors" strokeWidth={1.5} />
                            <span className="flex-1 text-left transition-transform group-hover:translate-x-0.5">Tingkatkan Paket</span>
                        </NavLink>

                        <button onClick={() => { cycleTheme(); setIsMenuOpen(false); }} className={cn("group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200", activeConfig.bgHover, activeConfig.textMain)}>
                            <Palette className="w-[18px] h-[18px] opacity-70 group-hover:text-blue-500 group-hover:opacity-100 transition-colors" strokeWidth={1.5} />
                            <span className="flex-1 text-left transition-transform group-hover:translate-x-0.5">Ganti Tema</span>
                        </button>
                    </div>

                    <div className={cn("h-px w-full my-0.5 opacity-50", activeConfig.divider)} />

                    <div className="flex flex-col gap-0.5">
                        <NavLink to="/help" onClick={() => setIsMenuOpen(false)} className={cn("group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200", activeConfig.bgHover, activeConfig.textMain)}>
                            <LifeBuoy className="w-[18px] h-[18px] opacity-70 group-hover:text-emerald-500 group-hover:opacity-100 transition-colors" strokeWidth={1.5} />
                            <span className="flex-1 text-left transition-transform group-hover:translate-x-0.5">Pusat Bantuan</span>
                        </NavLink>

                        <button onClick={handleLogout} className={cn("group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200", activeConfig.bgHover, "hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 text-slate-500")}>
                            <LogOut className="w-[18px] h-[18px] opacity-70 group-hover:opacity-100" strokeWidth={1.5} />
                            <span className="text-left transition-transform group-hover:translate-x-0.5">Keluar</span>
                        </button>
                    </div>
                </div>

                {/* ACCOUNT MODAL */}
                <AccountModal
                    isOpen={isAccountModalOpen}
                    onClose={() => setIsAccountModalOpen(false)}
                    user={user}
                    theme={theme}
                    activeConfig={activeConfig}
                />

                {/* USER CARD TRIGGER (Polished) */}
                <div
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={cn(
                        "flex items-center gap-3 rounded-[16px] p-2 cursor-pointer transition-all duration-300 group select-none border",
                        activeConfig.userCard,
                        collapsed ? "justify-center p-0 h-11 w-11 border-transparent bg-transparent hover:bg-transparent shadow-none hover:shadow-none" : "justify-between pr-4 hover:-translate-y-0.5",
                        isMenuOpen && !collapsed && "ring-2 ring-blue-500/20 border-blue-500/30"
                    )}
                >
                    <div className={cn("flex items-center gap-3", collapsed ? "justify-center" : "flex-1 min-w-0")}>
                        <div className="relative shrink-0">
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ring-[2px] ring-white dark:ring-[#1E293B] overflow-hidden transition-transform duration-300 group-hover:scale-105",
                                theme === 'happy' ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-gradient-to-br from-blue-400 to-indigo-500"
                            )}>
                                {initials}
                            </div>
                            {/* Pro Badge */}
                            {isPro && (
                                <div className={cn(
                                    "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ring-[2px] ring-white dark:ring-[#1E293B] shadow-sm",
                                    theme === 'happy' ? "bg-amber-400 text-amber-900" : "bg-gradient-to-br from-amber-400 to-yellow-500 text-amber-900"
                                )}>
                                    <Zap className="w-[8px] h-[8px] fill-current" strokeWidth={3} />
                                </div>
                            )}
                        </div>

                        {!collapsed && (
                            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                                <p className={cn("text-[13px] font-bold truncate leading-none", activeConfig.textActive)}>
                                    {displayName}
                                </p>
                                <p className={cn("text-[11px] font-medium truncate leading-none flex items-center gap-1", activeConfig.textMain)}>
                                    {isPro ? (
                                        <span className={cn("bg-clip-text text-transparent bg-gradient-to-r", theme === 'happy' ? "from-amber-500 to-orange-500" : "from-amber-400 to-yellow-600 dark:from-amber-300 dark:to-yellow-500")}>
                                            Pro Member
                                        </span>
                                    ) : (
                                        <span className="opacity-70">Free Plan</span>
                                    )}
                                </p>
                            </div>
                        )}
                    </div>

                    {!collapsed && (
                        <div className={cn(
                            "transition-all duration-300",
                            isMenuOpen ? "rotate-180" : "rotate-0",
                            theme === 'happy' ? "text-orange-300 group-hover:text-orange-500" : "text-slate-400 group-hover:text-slate-600"
                        )}>
                            <Settings className="w-[18px] h-[18px] opacity-70 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}