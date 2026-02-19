import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { useState, useEffect } from 'react';
import { useTheme } from '@/features/writing/context/ThemeContext';
import { cn } from '@/lib/utils';

interface UserInfo {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string | null;
    isPro: boolean;
}

/**
 * DashboardLayout — Sidebar + Animated Glow Background + Main Content.
 */
export function DashboardLayout() {
    const { theme } = useTheme();
    const location = useLocation();
    const [user, setUser] = useState<UserInfo | null>(null);

    useEffect(() => {
        fetch('/api/user/me')
            .then(r => r.ok ? r.json() : null)
            .then(json => {
                if (json?.user) setUser(json.user);
            })
            .catch(() => { });
    }, []);

    // --- ANIMATION STYLES INJECTION ---
    // Kita inject keyframes untuk gerakan blob yang smooth (drifting)
    const animationStyles = `
      @keyframes blob {
        0% { transform: translate(0px, 0px) scale(1); }
        33% { transform: translate(30px, -50px) scale(1.1); }
        66% { transform: translate(-20px, 20px) scale(0.9); }
        100% { transform: translate(0px, 0px) scale(1); }
      }
      .animate-blob {
        animation: blob 10s infinite;
      }
      .animation-delay-2000 {
        animation-delay: 2s;
      }
      .animation-delay-4000 {
        animation-delay: 4s;
      }
    `;

    // --- THEME CONFIGURATION ---
    // Mengatur warna background dasar & warna glow balls berdasarkan tema
    const themeConfig = {
        light: {
            bg: "bg-[#F8FAFC]", // Slate-50 (Clean White-ish)
            blob1: "bg-blue-300/40 mix-blend-multiply",
            blob2: "bg-purple-300/40 mix-blend-multiply",
            blob3: "bg-pink-300/40 mix-blend-multiply",
        },
        dark: {
            bg: "bg-[#020617]", // Slate-950 (Deep Space)
            // Di dark mode, kita hindari mix-blend-multiply, gunakan normal/screen biar 'menyala'
            blob1: "bg-indigo-600/20",
            blob2: "bg-blue-600/20",
            blob3: "bg-violet-600/20",
        },
        happy: {
            bg: "bg-[#FFFBF0]", // Warm / Creamy
            blob1: "bg-orange-300/50 mix-blend-multiply",
            blob2: "bg-yellow-300/50 mix-blend-multiply",
            blob3: "bg-rose-300/50 mix-blend-multiply",
        }
    }[theme as 'light' | 'dark' | 'happy' || 'light'];

    return (
        <div className="flex h-screen w-screen overflow-hidden font-sans selection:bg-primary/20">
            <style>{animationStyles}</style>

            {/* Sidebar tetap di kiri */}
            <AppSidebar user={user} />

            {/* Container Kanan (Background + Konten) */}
            <div className="relative flex-1 flex flex-col h-full overflow-hidden">

                {/* ─── 1. DYNAMIC AMBIENT BACKGROUND ─── */}
                {/* Layer ini absolute di belakang konten, tidak ikut scroll */}
                <div className={cn("absolute inset-0 z-0 transition-colors duration-700 ease-in-out pointer-events-none overflow-hidden", themeConfig.bg)}>

                    {/* Blob 1 (Top Left) */}
                    <div className={cn(
                        "absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full blur-[100px] animate-blob filter opacity-70",
                        themeConfig.blob1
                    )} />

                    {/* Blob 2 (Top Right) */}
                    <div className={cn(
                        "absolute top-[-10%] right-[-10%] w-96 h-96 rounded-full blur-[100px] animate-blob animation-delay-2000 filter opacity-70",
                        themeConfig.blob2
                    )} />

                    {/* Blob 3 (Bottom Center-ish) */}
                    <div className={cn(
                        "absolute bottom-[-20%] left-[20%] w-[500px] h-[500px] rounded-full blur-[120px] animate-blob animation-delay-4000 filter opacity-70",
                        themeConfig.blob3
                    )} />

                    {/* Noise Texture Overlay (Optional: Membuat lebih 'tactile' dan tidak flat) */}
                    <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150 mix-blend-overlay pointer-events-none"></div>
                </div>

                {/* ─── 2. MAIN SCROLLABLE CONTENT ─── */}
                <main className={cn(
                    "relative z-10 flex-1 overflow-y-auto overflow-x-hidden scroll-smooth scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700",
                    (location.pathname === '/chat' || location.pathname === '/citations' || location.pathname === '/paraphrase' || location.pathname.startsWith('/analysis')) && "overflow-hidden" // Disable main scroll for workspace features
                )}>
                    <div className={cn(
                        "w-full min-h-full",
                        (location.pathname === '/chat' || location.pathname === '/citations' || location.pathname === '/paraphrase' || location.pathname.startsWith('/analysis'))
                            ? "h-full p-0"
                            : "max-w-[1600px] mx-auto px-6 lg:px-10 py-8 lg:py-10"
                    )}>
                        <Outlet context={{ user }} />
                    </div>
                </main>

            </div>
        </div>
    );
}