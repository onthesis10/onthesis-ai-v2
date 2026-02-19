
import { useState, useRef, useEffect } from 'react';
import {
    X, Share2, Download, Flame, TrendingUp,
    MapPin, Timer, Zap, Trophy, ChevronRight, Check, Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import { OnThesisLogo } from '@/components/ui/OnThesisLogo';

// --- TYPES ---
interface ProductivityStoryProps {
    isOpen: boolean;
    onClose: () => void;
    stats: {
        total_seconds: number;
        words?: number;
        citations?: number;
        references?: number;
        level: {
            current_level: string;
            icon: string;
        };
        streak: {
            current_streak: number;
        };
    };
}

// --- UTILS ---
const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return { h, m };
};

// --- COMPONENT: STORY CARD CONTENT (STRAVA STYLE) ---
const StoryContent = ({ stats, isExport = false }: { stats: ProductivityStoryProps['stats'], isExport?: boolean }) => {
    const { h, m } = formatDuration(stats.total_seconds);
    const streak = stats.streak.current_streak;
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const timeString = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    // Mock "Elevation Data" for the graph
    const graphHeight = isExport ? 400 : 150;

    return (
        <div className={cn(
            "relative flex flex-col font-sans overflow-hidden select-none bg-black text-white",
            isExport ? "w-[1080px] h-[1920px]" : "w-full h-full"
        )}>

            {/* --- TOP SECTION: "THE ACTIVITY VISUAL" --- */}
            <div className="relative w-full h-[60%] bg-[#121212] overflow-hidden flex items-center justify-center">

                {/* 1. Abstract Map / Terrain Background */}
                <div className="absolute inset-0 opacity-20"
                    style={{
                        backgroundImage: `radial - gradient(#333 1px, transparent 1px), radial - gradient(#222 1px, transparent 1px)`,
                        backgroundSize: '20px 20px',
                        backgroundPosition: '0 0, 10px 10px'
                    }}
                />

                {/* 2. The "Route" (Thesis Progress Graph) */}
                <svg className="absolute bottom-0 left-0 right-0 w-full h-[80%] opacity-80" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <defs>
                        <linearGradient id="routeGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#fc4c02" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#fc4c02" stopOpacity="0.0" />
                        </linearGradient>
                    </defs>
                    {/* A jagged "mountain" path roughly simulating work */}
                    <path d="M0,100 L0,80 L10,75 L20,85 L30,60 L40,65 L50,40 L60,45 L70,20 L80,30 L90,10 L100,5 L100,100 Z" fill="url(#routeGradient)" />
                    <path d="M0,80 L10,75 L20,85 L30,60 L40,65 L50,40 L60,45 L70,20 L80,30 L90,10 L100,5" fill="none" stroke="#fc4c02" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
                </svg>

                {/* 3. Overlay Logo (Watermark style) */}
                <div className="absolute top-8 right-8 z-20 opacity-80 scale-90">
                    <OnThesisLogo variant="icon-only" showText={false} className="h-12 w-12" />
                </div>
            </div>

            {/* --- BOTTOM SECTION: STATS GRID --- */}
            <div className={cn(
                "relative z-20 flex-1 bg-black flex flex-col justify-between",
                isExport ? "p-16" : "p-6"
            )}>
                {/* Header Info */}
                <div className="flex flex-col gap-1 border-b border-white/10 pb-6 mb-2">
                    <div className={cn("text-[#fc4c02] font-bold uppercase tracking-wider flex items-center gap-2", isExport ? "text-2xl" : "text-[10px]")}>
                        <Activity className={cn(isExport ? "w-6 h-6" : "w-3 h-3")} />
                        Thesis Activity
                    </div>
                    <h1 className={cn("font-bold text-white", isExport ? "text-6xl" : "text-2xl")}>
                        {timeString} Research Session
                    </h1>
                    <p className={cn("text-slate-400 font-medium", isExport ? "text-2xl" : "text-xs")}>{today}</p>
                </div>

                {/* Main Stats Grid */}
                <div className="grid grid-cols-2 gap-y-10 gap-x-4 flex-1 mt-4">

                    {/* Time */}
                    <div className="flex flex-col">
                        <span className={cn("text-slate-500 uppercase font-bold tracking-wider mb-1", isExport ? "text-xl" : "text-[9px]")}>Time</span>
                        <div className="flex items-baseline gap-1">
                            <span className={cn("text-white font-medium leading-none tabular-nums", isExport ? "text-8xl" : "text-4xl")}>
                                {h}<span className={cn("text-slate-500", isExport ? "text-4xl" : "text-lg")}>h</span> {m}<span className={cn("text-slate-500", isExport ? "text-4xl" : "text-lg")}>m</span>
                            </span>
                        </div>
                    </div>

                    {/* Streak (The 'Distance') */}
                    <div className="flex flex-col">
                        <span className={cn("text-slate-500 uppercase font-bold tracking-wider mb-1", isExport ? "text-xl" : "text-[9px]")}>Streak</span>
                        <div className="flex items-baseline gap-1">
                            <span className={cn("text-white font-medium leading-none tabular-nums", isExport ? "text-8xl" : "text-4xl")}>
                                {streak}
                            </span>
                            <span className={cn("text-slate-500 font-medium uppercase", isExport ? "text-4xl" : "text-lg")}>days</span>
                        </div>
                    </div>

                    {/* Level (Elevation Gain) */}
                    <div className="flex flex-col">
                        <span className={cn("text-slate-500 uppercase font-bold tracking-wider mb-1", isExport ? "text-xl" : "text-[9px]")}>Level</span>
                        <div className="flex items-center gap-2">
                            <div className={cn("bg-white/10 rounded px-3 py-1 text-white font-bold", isExport ? "text-4xl" : "text-base")}>
                                {stats.level.current_level}
                            </div>
                            {/* Badge Icon */}
                            <div className={cn("grayscale opacity-60", isExport ? "text-5xl" : "text-2xl")}>
                                {stats.level.icon}
                            </div>
                        </div>
                    </div>

                    {/*  Words (Calories) */}
                    <div className="flex flex-col">
                        <span className={cn("text-slate-500 uppercase font-bold tracking-wider mb-1", isExport ? "text-xl" : "text-[9px]")}>Est. Words</span>
                        <div className="flex items-baseline gap-1">
                            <span className={cn("text-white font-medium leading-none tabular-nums", isExport ? "text-8xl" : "text-4xl")}>
                                {stats.words ? (stats.words / 1000).toFixed(1) : "0.0"}
                            </span>
                            <span className={cn("text-slate-500 font-medium uppercase", isExport ? "text-4xl" : "text-lg")}>k</span>
                        </div>
                    </div>

                </div>

                {/* Footer Logo */}
                <div className={cn("border-t border-white/10 pt-6 flex items-center justify-between", isExport ? "mt-10" : "mt-4")}>
                    <div className={cn("text-white font-bold tracking-tight flex items-center gap-2", isExport ? "text-3xl" : "text-sm")}>
                        <div className="bg-[#fc4c02] p-1 rounded-sm">
                            <Activity className={cn("text-white", isExport ? "w-6 h-6" : "w-3 h-3")} />
                        </div>
                        OnThesis
                    </div>
                    <div className={cn("text-slate-600 font-medium", isExport ? "text-xl" : "text-[9px]")}>
                        Build your legendary thesis.
                    </div>
                </div>

            </div>
        </div>
    );
};

// --- MAIN WRAPPER ---
export function ProductivityStory({ isOpen, onClose, stats }: ProductivityStoryProps) {
    const exportRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [blob, setBlob] = useState<Blob | null>(null);
    const [showShareSheet, setShowShareSheet] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setBlob(null);
            setShowShareSheet(false);
        }
    }, [isOpen]);

    if (!isOpen || !stats) return null;

    const handleGenerate = async () => {
        if (!exportRef.current) return;
        setIsExporting(true);

        try {
            await new Promise(r => setTimeout(r, 800)); // Wait for fonts & layout
            const canvas = await html2canvas(exportRef.current, {
                scale: 1, // 1:1 because default size is already huge (1080x1920) for export
                width: 1080,
                height: 1920,
                backgroundColor: '#000000',
                useCORS: true,
                logging: false,
            });

            canvas.toBlob((b) => {
                if (!b) return;
                setBlob(b);
                setShowShareSheet(true);
                setIsExporting(false);
            }, 'image/png');
        } catch (e) {
            console.error(e);
            setIsExporting(false);
        }
    };

    const handleShareAction = async (action: 'share' | 'download') => {
        if (!blob) return;
        const file = new File([blob], `onthesis - activity - ${Date.now()}.png`, { type: 'image/png' });

        if (action === 'share') {
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'Thesis Activity',
                        text: `Logged a session on OnThesis.Level: ${stats.level.current_level} 🎓`,
                        files: [file]
                    });
                } catch (e) { console.log('Share dismissed'); }
            } else {
                alert("Sharing is not supported on this browser context. Please download instead.");
            }
        } else {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `onthesis - activity - ${Date.now()}.png`;
            link.click();
        }
    };

    // Phone Frame (Generic Black Slab)
    const PhoneFrame = ({ children, className }: { children: React.ReactNode, className?: string }) => (
        <div className={cn(
            "relative bg-black rounded-[2.5rem] shadow-[0_0_0_8px_#111,0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden select-none border border-[#333]",
            className
        )}>
            {/* Notch/Island Placeholder */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-b-xl z-50 pointer-events-none" />

            {children}
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300">

            {/* Close Overlay */}
            <div className="absolute inset-0" onClick={onClose} />

            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-6 right-6 z-50 p-3 bg-[#222] text-white rounded-full hover:bg-[#333] transition-all border border-[#333] group"
            >
                <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
            </button>

            {/* --- VISIBLE CARD --- */}
            <div className="relative scale-[0.9] md:scale-100 transition-transform duration-500 z-10 pointer-events-auto">
                <PhoneFrame className="w-[360px] h-[720px]">
                    <StoryContent stats={stats} isExport={false} />

                    {/* Action Button */}
                    <div className="absolute bottom-6 left-6 right-6 z-50">
                        <button
                            onClick={handleGenerate}
                            disabled={isExporting}
                            className={cn(
                                "w-full bg-[#fc4c02] text-white h-14 rounded font-bold uppercase tracking-wider text-sm shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-[#e34200]",
                                isExporting && "opacity-80"
                            )}
                        >
                            {isExporting ? (
                                <span className="animate-pulse">Processing Activity...</span>
                            ) : (
                                <>
                                    <Share2 className="w-4 h-4" />
                                    <span>Share Activity</span>
                                </>
                            )}
                        </button>
                    </div>
                </PhoneFrame>
            </div>

            {/* --- SHARE SHEET MODAL --- */}
            {showShareSheet && blob && (
                <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setShowShareSheet(false)}>
                    <div className="w-full max-w-sm bg-[#121212] border border-[#333] rounded-xl p-6 shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>

                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 bg-[#fc4c02] rounded-lg flex items-center justify-center shadow-lg">
                                <Activity className="w-10 h-10 text-white" />
                            </div>
                            <div>
                                <h3 className="text-white text-lg font-bold uppercase tracking-wide">Activity Ready</h3>
                                <p className="text-slate-400 text-sm">Your session is wrapped.</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button onClick={() => handleShareAction('share')} className="w-full bg-[#fc4c02] hover:bg-[#e34200] text-white h-12 rounded font-bold uppercase tracking-wider flex items-center justify-center gap-3 transition-colors">
                                <Share2 className="w-5 h-5" />
                                Share Activity
                            </button>

                            <button onClick={() => handleShareAction('download')} className="w-full bg-[#333] hover:bg-[#444] text-white border border-[#444] h-12 rounded font-bold uppercase tracking-wider flex items-center justify-center gap-3 transition-colors">
                                <Download className="w-5 h-5" />
                                Save Image
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- HIDDEN HD RENDER TARGET --- */}
            <div className="fixed left-[-9999px] top-[-9999px]">
                <div ref={exportRef}>
                    <StoryContent stats={stats} isExport={true} />
                </div>
            </div>

        </div>
    );
}