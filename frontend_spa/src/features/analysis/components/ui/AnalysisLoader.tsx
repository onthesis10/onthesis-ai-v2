import { useState, useEffect } from 'react';
import { OnThesisLogo } from './OnThesisLogo';
import { motion } from 'framer-motion';

interface AnalysisLoaderProps {
    messages?: string[];
}

export const AnalysisLoader = ({ messages }: AnalysisLoaderProps) => {
    const [statusText, setStatusText] = useState("Initializing...");

    useEffect(() => {
        const defaultSteps = [
            "Reading Dataset...",
            "Analyzing Variables...",
            "Running Statistical Tests...",
            "Generating Insights...",
            "Finalizing Report..."
        ];

        const steps = messages || defaultSteps;
        let i = 0;
        setStatusText(steps[0]);

        const interval = setInterval(() => {
            i = (i + 1) % steps.length;
            setStatusText(steps[i]);
        }, 1500);

        return () => clearInterval(interval);
    }, [messages]);

    return (
        <div className="flex flex-col items-center justify-center gap-8 p-12 rounded-3xl bg-white dark:bg-slate-950/60 backdrop-blur-xl border border-slate-200 dark:border-white/5 shadow-2xl animate-in zoom-in-95 duration-500 relative overflow-hidden">

            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none animate-pulse" />

            {/* LOGO with Skeleton/Pulse feel */}
            <div className="relative z-10">
                <OnThesisLogo
                    variant="animated-icon"
                    className="h-32 w-auto drop-shadow-2xl"
                />
            </div>

            {/* SKELETON TEXT CARD EFFECT */}
            <div className="flex flex-col items-center gap-3 z-10 w-64">
                <motion.div
                    key={statusText}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-lg font-bold tracking-wide text-indigo-900 dark:text-indigo-100 font-sans text-center"
                >
                    {statusText}
                </motion.div>

                {/* Skeleton Lines */}
                <div className="w-full space-y-2 opacity-50">
                    <div className="h-1.5 w-3/4 mx-auto bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-1/2 animate-[shimmer_1.5s_infinite]" />
                    </div>
                    <div className="h-1.5 w-1/2 mx-auto bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-1/2 animate-[shimmer_1.5s_infinite_0.5s]" />
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-150%); }
                    100% { transform: translateX(250%); }
                }
            `}</style>
        </div>
    );
};
