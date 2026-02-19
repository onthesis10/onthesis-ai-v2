import { Project } from '../types';
import {
    FileText, MoreHorizontal, Clock, Check, FolderOpen,
    AlertCircle, Database, Activity
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { useThemeStore } from '@/store/themeStore';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
    project: Project;
    onEdit: (project: Project) => void;
    onDelete: (id: string) => void;
    onClick: (id: string) => void;
}

export function ProjectCard({ project, onEdit, onDelete, onClick }: ProjectCardProps) {
    const { theme } = useThemeStore();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // --- HAPPY MODE PALETTE: MERAH, KUNING, HIJAU, BIRU ---
    const happyGradient = useMemo(() => {
        const gradients = [
            // 1. Merah (Energetic Red)
            "from-red-500 to-rose-600 shadow-red-500/20",
            // 2. Kuning (Warm Amber/Orange - biar teks putih tetap kebaca)
            "from-amber-400 to-orange-500 shadow-amber-500/20",
            // 3. Hijau (Fresh Emerald)
            "from-emerald-400 to-green-600 shadow-emerald-500/20",
            // 4. Biru (Deep Blue)
            "from-blue-500 to-indigo-600 shadow-blue-500/20",
        ];
        const index = project.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % gradients.length;
        return gradients[index];
    }, [project.id]);

    // Theme Configuration
    const themeStyles = {
        light: {
            card: "bg-white/95 backdrop-blur-sm border-slate-200 shadow-lg hover:shadow-2xl hover:border-blue-400/50",
            title: "text-slate-900",
            desc: "text-slate-500",
            iconBg: "bg-slate-50 text-slate-500 border border-slate-100 shadow-inner",
            meta: "text-slate-400 border-slate-100",
            progressTrack: "bg-slate-100",
            progressBar: "bg-blue-600",
            menuBtn: "text-slate-400 hover:bg-slate-100 hover:text-slate-700",
            menuDropdown: "bg-white border-slate-200 text-slate-700 shadow-xl"
        },
        dark: {
            // Clean Dark Tech
            card: "bg-[#0B1221]/90 backdrop-blur-xl border-[#1E3A5F]/60 shadow-2xl shadow-black/50 hover:border-[#00C2FF]/60 hover:shadow-[#00C2FF]/10",
            title: "text-slate-100",
            desc: "text-slate-400",
            iconBg: "bg-[#1E3A5F]/40 text-[#00C2FF] border border-[#00C2FF]/30 shadow-[0_0_15px_rgba(0,194,255,0.1)]",
            meta: "text-slate-500 border-[#1E3A5F]/30",
            progressTrack: "bg-[#1E3A5F]/50",
            progressBar: "bg-[#00C2FF] shadow-[0_0_8px_#00C2FF]",
            menuBtn: "text-slate-500 hover:bg-[#1E3A5F] hover:text-[#00C2FF]",
            menuDropdown: "bg-[#0B1221] border-[#1E3A5F] text-slate-300 shadow-2xl"
        },
        happy: {
            // Vibrant RYGB (Red, Yellow, Green, Blue)
            card: `bg-gradient-to-br ${happyGradient} border-white/20 text-white shadow-xl`,
            title: "text-white font-bold tracking-wide drop-shadow-md",
            desc: "text-white/90 font-medium",
            iconBg: "bg-white/20 text-white border border-white/40 backdrop-blur-md shadow-[inset_0_0_10px_rgba(255,255,255,0.2)]",
            meta: "text-white/80 border-white/20",
            progressTrack: "bg-black/20",
            progressBar: "bg-white shadow-[0_0_8px_white]",
            menuBtn: "text-white/80 hover:bg-white/20 hover:text-white",
            menuDropdown: "bg-white/95 backdrop-blur-xl border-slate-200 text-slate-700 shadow-xl"
        }
    }[theme as 'light' | 'dark' | 'happy' || 'light'];

    const getStatusStyle = (status: string) => {
        if (theme === 'happy') return 'bg-white/20 text-white border border-white/30 backdrop-blur-md shadow-lg';

        if (theme === 'dark') {
            switch (status) {
                case 'SELESAI': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]';
                case 'REVISI': return 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]';
                default: return 'bg-blue-500/10 text-blue-400 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]';
            }
        }
        switch (status) {
            case 'SELESAI': return 'bg-emerald-50 text-emerald-600 border border-emerald-200';
            case 'REVISI': return 'bg-orange-50 text-orange-600 border border-orange-200';
            default: return 'bg-blue-50 text-blue-600 border border-blue-200';
        }
    };

    const getIcon = (status: string) => {
        switch (status) {
            case 'SELESAI': return <Check className="w-5 h-5" />;
            case 'REVISI': return <AlertCircle className="w-5 h-5" />;
            default: return <Database className="w-5 h-5" />;
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'Baru saja';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(date);
    };

    return (
        // 1. OUTER WRAPPER: Perspective Container
        <div
            className="group perspective-[1000px] h-full"
            onClick={() => onClick(project.id)}
        >
            {/* 2. CARD: The 3D Object */}
            <div className={cn(
                "relative flex flex-col p-6 rounded-2xl border transition-all duration-500 cursor-pointer h-full overflow-hidden",
                // 3D Transform Properties (Subtle Tilt)
                "transform-style-3d",
                "hover:[transform:rotateX(2deg)_rotateY(2deg)_translateY(-5px)]",
                "hover:shadow-2xl",
                themeStyles.card
            )}>

                {/* --- BACKGROUND LAYERS --- */}

                {/* Shimmer Effect (Clean Scan) */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none z-0" />

                {/* HUD Corners (Clean Focus Markers) */}
                <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0">
                    <div className={cn("absolute top-0 left-0 w-4 h-4 border-l-[3px] border-t-[3px] rounded-tl-lg transition-all duration-300 group-hover:top-3 group-hover:left-3", theme === 'light' ? "border-blue-500" : "border-white/50")} />
                    <div className={cn("absolute top-0 right-0 w-4 h-4 border-r-[3px] border-t-[3px] rounded-tr-lg transition-all duration-300 group-hover:top-3 group-hover:right-3", theme === 'light' ? "border-blue-500" : "border-white/50")} />
                    <div className={cn("absolute bottom-0 left-0 w-4 h-4 border-l-[3px] border-b-[3px] rounded-bl-lg transition-all duration-300 group-hover:bottom-3 group-hover:left-3", theme === 'light' ? "border-blue-500" : "border-white/50")} />
                    <div className={cn("absolute bottom-0 right-0 w-4 h-4 border-r-[3px] border-b-[3px] rounded-br-lg transition-all duration-300 group-hover:bottom-3 group-hover:right-3", theme === 'light' ? "border-blue-500" : "border-white/50")} />
                </div>

                {/* --- CONTENT LAYERS (Floating) --- */}

                {/* Main Content Wrapper (Floating Effect) */}
                <div className="relative z-10 flex flex-col h-full [transform:translateZ(20px)] transform-style-3d">

                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                        <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 shadow-lg",
                            themeStyles.iconBg
                        )}>
                            {getIcon(project.status)}
                        </div>

                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                                className={cn("p-1.5 rounded-lg transition-colors duration-200 hover:scale-110", themeStyles.menuBtn)}
                            >
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                            {isMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-20" onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); }} />
                                    <div className={cn(
                                        "absolute right-0 top-full mt-2 w-48 rounded-xl border z-30 overflow-hidden text-sm animate-in fade-in zoom-in-95 duration-150 p-1 shadow-2xl",
                                        themeStyles.menuDropdown
                                    )}>
                                        <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onEdit(project); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2">
                                            <FolderOpen className="w-4 h-4 opacity-70" /> Edit Detail
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onDelete(project.id); }} className="w-full text-left px-3 py-2 rounded-lg text-red-500 hover:bg-red-500/10 flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 opacity-70" /> Hapus
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Text Content */}
                    <div className="flex-1 mb-5">
                        <h3 className={cn("text-xl font-bold mb-2 leading-tight line-clamp-2 tracking-tight drop-shadow-sm", themeStyles.title)}>
                            {project.title}
                        </h3>
                        <p className={cn("text-xs leading-relaxed line-clamp-2 font-medium opacity-80", themeStyles.desc)}>
                            {project.description || '> No description provided.'}
                        </p>
                    </div>

                    {/* Footer Metadata */}
                    <div className={cn("mt-auto flex items-center justify-between pt-4 border-t", themeStyles.meta)}>
                        <span className={cn(
                            "px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest backdrop-blur-md transition-transform group-hover:scale-105",
                            getStatusStyle(project.status)
                        )}>
                            {project.status || 'DRAFT'}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono opacity-70">
                            <Activity className="w-3.5 h-3.5" />
                            <span>{formatDate(project.lastUpdated)}</span>
                        </div>
                    </div>
                </div>

                {/* --- PROGRESS BAR (PRECISE & CLEAN) --- */}
                {/* Container for the bar at the absolute bottom */}
                <div className={cn("absolute bottom-0 left-0 right-0 h-[3px]", themeStyles.progressTrack)}>
                    <div
                        className={cn("h-full transition-all duration-1000 relative", themeStyles.progressBar)}
                        style={{ width: `${project.progress || 0}%` }}
                    />
                </div>
            </div>
        </div>
    );
}