import React, { useState, useMemo } from 'react';
import { Copy, Check, Wand2, ArrowRightLeft, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { diffWords } from 'diff';
import { useThemeStore } from '@/store/themeStore';

interface ParaphraseOutputProps {
    originalText: string;
    rewrittenText: string;
    isProcessing: boolean;
}

const ParaphraseOutput: React.FC<ParaphraseOutputProps> = ({ originalText, rewrittenText, isProcessing }) => {
    const { theme } = useThemeStore();
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'clean' | 'diff'>('clean');

    const differences = useMemo(() => {
        if (!originalText || !rewrittenText) return [];
        return diffWords(originalText, rewrittenText);
    }, [originalText, rewrittenText]);

    const handleCopy = () => {
        navigator.clipboard.writeText(rewrittenText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Style Config
    const isHappy = theme === 'happy';

    const containerClasses = isHappy
        ? "bg-white/60 border-orange-100 shadow-xl shadow-orange-500/5"
        : "bg-gradient-to-br from-card/30 to-card/10 border-white/10 shadow-2xl shadow-black/5";

    const headerBorder = isHappy ? "border-orange-100" : "border-white/5";
    const tabContainer = isHappy ? "bg-orange-50 border-orange-100" : "bg-black/20 border-white/5";
    const tabActiveBg = isHappy ? "bg-white shadow-sm border-orange-100 text-orange-600" : "bg-white/10 border-white/5 text-white";
    const tabInactiveText = isHappy ? "text-stone-400 hover:text-stone-600" : "text-muted-foreground hover:text-white/70";
    const copyButton = isHappy ? "text-stone-400 hover:text-orange-500 hover:bg-orange-50" : "text-muted-foreground hover:text-primary hover:bg-primary/5";

    return (
        <div className={`flex flex-col h-full w-full rounded-2xl overflow-hidden backdrop-blur-xl border relative transition-all duration-500 ${containerClasses}`}>

            {/* Toolbar */}
            <div className={`shrink-0 flex items-center justify-between px-5 py-3 border-b ${headerBorder}`}>

                {/* Tabs */}
                <div className={`flex p-1 rounded-lg border ${tabContainer}`}>
                    <button
                        onClick={() => setActiveTab('clean')}
                        className={`relative px-3 py-1.5 rounded-md text-[10px] font-bold font-outfit uppercase tracking-wider transition-all duration-300 ${activeTab === 'clean' ? '' : tabInactiveText}`}
                    >
                        {activeTab === 'clean' && (
                            <motion.div layoutId="tab-bg" className={`absolute inset-0 rounded-md border ${tabActiveBg}`} transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                        )}
                        <span className={`relative z-10 flex items-center gap-1.5 ${activeTab === 'clean' && isHappy ? 'text-orange-600' : ''}`}>
                            <FileText className="w-3 h-3" />
                            Result
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab('diff')}
                        disabled={!rewrittenText}
                        className={`relative px-3 py-1.5 rounded-md text-[10px] font-bold font-outfit uppercase tracking-wider transition-all duration-300 ${activeTab === 'diff' ? '' : tabInactiveText} ${!rewrittenText ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {activeTab === 'diff' && (
                            <motion.div layoutId="tab-bg" className={`absolute inset-0 rounded-md border ${tabActiveBg}`} transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                        )}
                        <span className={`relative z-10 flex items-center gap-1.5 ${activeTab === 'diff' && isHappy ? 'text-orange-600' : ''}`}>
                            <ArrowRightLeft className="w-3 h-3" />
                            Changes
                        </span>
                    </button>
                </div>

                {/* Copy Button */}
                <button
                    onClick={handleCopy}
                    disabled={!rewrittenText}
                    className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium border border-transparent transition-all disabled:opacity-30 ${copyButton}`}
                >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className={copied ? 'text-emerald-400' : ''}>{copied ? 'Copied' : 'Copy'}</span>
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 relative p-6 overflow-y-auto custom-scrollbar scroll-smooth">
                <AnimatePresence mode="wait">

                    {/* Empty State */}
                    {!rewrittenText && !isProcessing && (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                        >
                            <div className="relative">
                                <div className={`absolute inset-0 blur-xl rounded-full ${isHappy ? 'bg-orange-400/20' : 'bg-primary/20'}`} />
                                <Wand2 className={`relative w-8 h-8 mb-4 ${isHappy ? 'text-orange-400' : 'text-primary/40'}`} />
                            </div>
                            <p className={`text-xs font-medium font-outfit tracking-wide uppercase opacity-70 ${isHappy ? 'text-stone-400' : 'text-muted-foreground/50'}`}>
                                AI Ready to Paraphrase
                            </p>
                        </motion.div>
                    )}

                    {/* Processing State */}
                    {isProcessing && (
                        <motion.div
                            key="processing"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-4 pt-2"
                        >
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className={`h-3 rounded-full overflow-hidden relative ${isHappy ? 'bg-orange-100' : 'bg-white/5'}`}>
                                    <div className={`absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-transparent to-transparent ${isHappy ? 'via-orange-300/30' : 'via-primary/20'}`} />
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {/* Result View */}
                    {rewrittenText && !isProcessing && activeTab === 'clean' && (
                        <motion.div
                            key="clean"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`prose prose-sm max-w-none prose-p:font-inter prose-p:leading-8 prose-p:font-light ${isHappy ? 'text-stone-600 prose-strong:text-stone-800' : 'dark:prose-invert prose-p:text-foreground/90'}`}
                        >
                            <ReactMarkdown>{rewrittenText}</ReactMarkdown>
                        </motion.div>
                    )}

                    {/* Diff View */}
                    {rewrittenText && !isProcessing && activeTab === 'diff' && (
                        <motion.div
                            key="diff"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`font-inter text-sm leading-8 ${isHappy ? 'text-stone-600' : 'text-foreground/80'}`}
                        >
                            {differences.map((part, index) => {
                                if (part.added) {
                                    return (
                                        <span key={index} className={`${isHappy ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'} border-b px-0.5 mx-0.5 rounded-t-sm`}>
                                            {part.value}
                                        </span>
                                    );
                                }
                                if (part.removed) {
                                    return (
                                        <span key={index} className={`${isHappy ? 'bg-rose-100 text-rose-500/50 decoration-rose-500/30' : 'bg-rose-500/5 text-rose-500/50 decoration-rose-500/30'} line-through px-0.5 mx-0.5 text-[0.9em]`}>
                                            {part.value}
                                        </span>
                                    );
                                }
                                return <span key={index} className="opacity-60 hover:opacity-100 transition-opacity duration-300">{part.value}</span>;
                            })}
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
};

export default ParaphraseOutput;