import React, { useState, useEffect } from 'react';
import { OnThesisLogo } from '@/components/ui/OnThesisLogo';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '@/store/themeStore';

export function CitationLoader() {
    const { theme } = useThemeStore();
    const [statusIndex, setStatusIndex] = useState(0);

    const steps = [
        "Connecting to Knowledge Graph...",
        "Handshaking with Crossref & DOAJ...",
        "Analyzing Metadata...",
        "Filtering Relevance...",
        "Formatting Citations..."
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setStatusIndex((prev) => (prev + 1) % steps.length);
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    // --- THEME CONFIGURATION ---
    // Konfigurasi warna spesifik untuk tiap mode biar "mahal"
    const loaderStyles = {
        light: {
            glow: "bg-blue-500/20",
            container: "bg-white/60 border-white/40 shadow-blue-500/10 ring-white/50",
            text: "text-slate-600",
            shimmerBase: "bg-slate-200",
            shimmerGradient: "from-transparent via-blue-500 to-transparent"
        },
        dark: {
            glow: "bg-cyan-500/20",
            container: "bg-[#0B1221]/60 border-white/10 shadow-cyan-500/10 ring-white/5",
            text: "text-slate-300",
            shimmerBase: "bg-[#1E3A5F]",
            shimmerGradient: "from-transparent via-cyan-400 to-transparent"
        },
        happy: {
            glow: "bg-orange-400/20",
            container: "bg-[#FFFCF5]/60 border-orange-200/50 shadow-orange-500/10 ring-white/60",
            text: "text-stone-600",
            shimmerBase: "bg-orange-100",
            shimmerGradient: "from-transparent via-orange-500 to-transparent"
        }
    }[theme as 'light' | 'dark' | 'happy' || 'light'];

    return (
        <div className="flex flex-col items-center justify-center h-full w-full min-h-[400px] relative overflow-hidden">

            {/* 1. Ambient Background Spot (Dynamic Glow) */}
            <div className={`absolute w-80 h-80 rounded-full blur-[120px] animate-pulse-slow pointer-events-none transition-colors duration-1000 ${loaderStyles.glow}`} />

            <div className="relative z-10 flex flex-col items-center">

                {/* 2. THE LOGO - Main Focus with Glass Container */}
                <div className="mb-10 relative group">
                    {/* Outer Glow Ring (Breathing Effect) */}
                    <div className={`absolute inset-0 blur-2xl rounded-full opacity-40 animate-pulse transition-colors duration-1000 ${loaderStyles.glow}`} />

                    {/* Glass Container */}
                    <div className={`relative backdrop-blur-3xl border p-8 rounded-[2rem] shadow-2xl ring-1 transition-all duration-500 ${loaderStyles.container}`}>
                        <OnThesisLogo
                            variant="animated-icon"
                            className="w-20 h-20 drop-shadow-xl filter saturate-110"
                        />
                    </div>
                </div>

                {/* 3. TEXT ANIMATION - Precision Typography */}
                <div className="h-8 flex items-center justify-center relative w-96 overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={steps[statusIndex]}
                            initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, y: -15, filter: 'blur(8px)' }}
                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} // Custom ease for futuristic feel
                            className="absolute text-center w-full"
                        >
                            <span className={`text-[11px] font-bold uppercase tracking-[0.25em] transition-colors duration-500 ${loaderStyles.text}`}>
                                {steps[statusIndex]}
                            </span>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* 4. SHIMMER LINE - The "Processing" Indicator */}
                <div className={`mt-8 w-48 h-[2px] rounded-full overflow-hidden relative transition-colors duration-500 ${loaderStyles.shimmerBase}`}>
                    <motion.div
                        className={`absolute inset-0 bg-gradient-to-r w-1/2 opacity-80 ${loaderStyles.shimmerGradient}`}
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{
                            repeat: Infinity,
                            duration: 1.2,
                            ease: "easeInOut"
                        }}
                    />
                </div>

            </div>
        </div>
    );
}