import React from 'react';
import { motion } from 'framer-motion';
import { BookCheck, ShieldCheck, FileText, CheckCircle2, Fingerprint, HelpCircle } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';

interface AcademicMetricsPanelProps {
    metrics: {
        similarity: number;
        readabilityScore: number;
        tone: string;
        'citation integrity': string;
    };
    isVisible: boolean;
}

const InfoTooltip = ({ text, isHappy }: { text: string, isHappy: boolean }) => (
    <div className="relative group ml-auto z-50">
        <button className={`p-1 rounded-full transition-colors cursor-help ${isHappy ? 'text-stone-300 hover:text-orange-500 hover:bg-orange-50' : 'text-muted-foreground/40 hover:text-primary hover:bg-primary/10'}`}>
            <HelpCircle className="w-3 h-3" />
        </button>
        <div className={`absolute bottom-full right-0 mb-2 w-48 p-3 rounded-xl border backdrop-blur-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 pointer-events-none 
            ${isHappy ? 'bg-white/90 border-orange-100 text-stone-600' : 'bg-popover/90 border-white/10 text-foreground'}`}>
            <p className="text-[10px] leading-relaxed font-medium font-inter">{text}</p>
        </div>
    </div>
);

const AcademicMetricsPanel: React.FC<AcademicMetricsPanelProps> = ({ metrics, isVisible }) => {
    const { theme } = useThemeStore();
    if (!isVisible) return <div className="h-0" />;

    const isHappy = theme === 'happy';

    const getSimilarityColor = (score: number) => {
        if (score < 20) return 'text-emerald-500';
        if (score < 40) return 'text-amber-500';
        return 'text-red-500';
    };

    const cardClasses = isHappy
        ? "bg-white/60 border border-orange-100 hover:bg-white/80 hover:shadow-sm"
        : "bg-card/40 border border-white/5 hover:bg-card/60 hover:border-white/10";

    const labelColor = isHappy ? "text-stone-400" : "text-muted-foreground";

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex flex-col gap-2"
        >
            {/* Header Mini */}
            <div className="flex items-center gap-2 px-1 opacity-80">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span className={`text-[10px] font-bold font-outfit uppercase tracking-widest ${labelColor}`}>
                    Academic Safety Layer
                </span>
                <div className={`h-[1px] flex-1 ml-2 ${isHappy ? 'bg-orange-200/50' : 'bg-border/40'}`} />
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">

                {/* 1. Similarity */}
                <div className={`relative rounded-lg p-3 flex flex-col justify-between transition-colors group ${cardClasses}`}>
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                            <div className="p-1 rounded bg-emerald-500/10 text-emerald-500">
                                <Fingerprint className="w-3 h-3" />
                            </div>
                            <span className={`text-[10px] font-bold uppercase ${labelColor}`}>Similarity</span>
                        </div>
                        <InfoTooltip text="Target <20% untuk orisinalitas tinggi." isHappy={isHappy} />
                    </div>
                    <div className="mt-2 flex items-end justify-between">
                        <div className="flex items-baseline gap-1">
                            <span className={`text-lg font-outfit font-bold ${getSimilarityColor(metrics.similarity)}`}>
                                {metrics.similarity}%
                            </span>
                            <span className={`text-[9px] font-medium border px-1 rounded-sm ${isHappy ? 'border-orange-200 text-stone-400' : 'border-border/50 text-muted-foreground'}`}>
                                {metrics.similarity < 30 ? 'SAFE' : 'RISK'}
                            </span>
                        </div>
                        {/* Mini Bar */}
                        <div className={`w-12 h-1 rounded-full overflow-hidden mb-1.5 ${isHappy ? 'bg-orange-100' : 'bg-secondary/50'}`}>
                            <div className={`h-full ${metrics.similarity < 30 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(metrics.similarity, 100)}%` }} />
                        </div>
                    </div>
                </div>

                {/* 2. Readability */}
                <div className={`rounded-lg p-3 flex flex-col justify-between transition-colors ${cardClasses}`}>
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                            <div className={`p-1 rounded ${isHappy ? 'bg-orange-100 text-orange-500' : 'bg-primary/10 text-primary'}`}>
                                <BookCheck className="w-3 h-3" />
                            </div>
                            <span className={`text-[10px] font-bold uppercase ${labelColor}`}>Readability</span>
                        </div>
                        <InfoTooltip text="Skor Flesch-Kincaid (0-100)." isHappy={isHappy} />
                    </div>
                    <div className="mt-2">
                        <div className="flex items-baseline gap-1">
                            <span className={`text-lg font-outfit font-bold ${isHappy ? 'text-stone-700' : 'text-foreground'}`}>
                                {metrics.readabilityScore}
                            </span>
                            <span className={`text-[9px] ${labelColor}`}>/ 100</span>
                        </div>
                    </div>
                </div>

                {/* 3. Tone */}
                <div className={`rounded-lg p-3 flex flex-col justify-between transition-colors ${cardClasses}`}>
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                            <div className="p-1 rounded bg-indigo-500/10 text-indigo-500">
                                <FileText className="w-3 h-3" />
                            </div>
                            <span className={`text-[10px] font-bold uppercase ${labelColor}`}>Tone</span>
                        </div>
                        <InfoTooltip text="Gaya bahasa akademik formal." isHappy={isHappy} />
                    </div>
                    <div className="mt-2">
                        <span className="text-sm font-outfit font-bold text-indigo-400">
                            {metrics.tone}
                        </span>
                    </div>
                </div>

                {/* 4. Citations */}
                <div className={`rounded-lg p-3 flex flex-col justify-between transition-colors ${cardClasses}`}>
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                            <div className="p-1 rounded bg-sky-500/10 text-sky-500">
                                <CheckCircle2 className="w-3 h-3" />
                            </div>
                            <span className={`text-[10px] font-bold uppercase ${labelColor}`}>Citations</span>
                        </div>
                        <InfoTooltip text="Referensi kutipan terjaga." isHappy={isHappy} />
                    </div>
                    <div className="mt-2">
                        <span className="text-sm font-outfit font-bold text-sky-400">
                            Protected
                        </span>
                    </div>
                </div>

            </div>
        </motion.div>
    );
};

export default AcademicMetricsPanel;