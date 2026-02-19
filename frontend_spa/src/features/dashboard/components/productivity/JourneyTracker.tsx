import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Timer as TimerIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProductivity } from './useProductivity';
import { useThemeStore } from "@/store/themeStore";

interface JourneyTrackerProps {
    referencesCount?: number;
    projectCount?: number;
}

export function JourneyTracker({ referencesCount = 0, projectCount = 0 }: JourneyTrackerProps) {
    const { stats, syncSession } = useProductivity();
    const [isActive, setIsActive] = useState(false);
    const [sessionSeconds, setSessionSeconds] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const { theme } = useThemeStore();

    // Load persisted session state
    useEffect(() => {
        const savedActive = localStorage.getItem('thesis_timer_active') === 'true';
        const savedSeconds = localStorage.getItem('thesis_timer_accumulated');

        if (savedSeconds) {
            setSessionSeconds(parseInt(savedSeconds, 10));
        }

        if (savedActive) {
            setIsActive(true);
        }
    }, []);

    // Timer Interval
    useEffect(() => {
        if (isActive) {
            localStorage.setItem('thesis_timer_active', 'true');
            intervalRef.current = setInterval(() => {
                setSessionSeconds(prev => {
                    const next = prev + 1;
                    localStorage.setItem('thesis_timer_accumulated', next.toString());
                    return next;
                });
            }, 1000);
        } else {
            localStorage.setItem('thesis_timer_active', 'false');
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isActive]);

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isActive) {
            const secondsToSync = sessionSeconds;
            syncSession(secondsToSync);
            setSessionSeconds(0);
            localStorage.removeItem('thesis_timer_accumulated');
            setIsActive(false);
        } else {
            setIsActive(true);
        }
    };

    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h}h ${m}m ${s}s`;
    };

    const totalTime = (stats?.total_seconds || 0) + sessionSeconds;

    // Theme Logic matching StatsGrid
    const getStyles = () => {
        if (theme === 'happy') {
            return {
                card: "bg-gradient-to-br from-orange-400 to-pink-500 shadow-lg text-white border-none",
                text: "text-white/90",
                value: "text-white",
                iconBg: "bg-white/20"
            };
        }
        if (theme === 'dark') {
            return {
                card: "bg-[#111F2E]/80 backdrop-blur-xl border border-[#1E3A5F]/50 shadow-none hover:bg-[#162A3F]",
                text: "text-slate-400",
                value: "text-white",
                iconBg: "bg-blue-500/10 text-blue-500"
            };
        }
        return {
            card: "bg-white border border-slate-200 shadow-sm",
            text: "text-slate-500",
            value: "text-slate-900",
            iconBg: "bg-blue-500/10 text-blue-600"
        };
    };

    const styles = getStyles();

    return (
        <div className={cn(
            "relative p-6 rounded-2xl flex flex-col justify-between h-[140px] group overflow-hidden transition-all duration-300",
            styles.card
        )}>
            {/* Glass Shine Effect for Happy Mode */}
            {theme === 'happy' && (
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/20 pointer-events-none" />
            )}

            {/* Header Row */}
            <div className="flex justify-between items-start relative z-10">
                <div className={cn("p-3 rounded-xl", styles.iconBg)}>
                    {isActive ? <TimerIcon className="w-6 h-6 animate-pulse" /> : <TimerIcon className="w-6 h-6" />}
                </div>

                <div className="flex items-center gap-2">
                    {isActive && (
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                    )}
                    <button
                        onClick={handleToggle}
                        className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95",
                            isActive ? "bg-red-500 text-white" : "bg-blue-500 text-white"
                        )}
                    >
                        {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                </div>
            </div>

            {/* Value Row */}
            <div className="relative z-10 mt-auto">
                <h4 className={cn("text-3xl font-extrabold tracking-tight tabular-nums", styles.value)}>
                    {formatTime(sessionSeconds)}
                </h4>
                <p className={cn("text-xs font-medium mt-1 uppercase tracking-wide opacity-90", styles.text)}>
                    Total: {formatTime(totalTime)}
                </p>
            </div>
        </div>
    );
}
