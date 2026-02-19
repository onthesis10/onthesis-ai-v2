import React from 'react';
import { Sparkles, Loader2, Eraser, PenLine } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';

interface ParaphraseEditorProps {
    value: string;
    onChange: (val: string) => void;
    onParaphrase: () => void;
    isProcessing: boolean;
}

const ParaphraseEditor: React.FC<ParaphraseEditorProps> = ({ value, onChange, onParaphrase, isProcessing }) => {
    const { theme } = useThemeStore();
    const wordCount = value.trim().split(/\s+/).filter(Boolean).length;

    // Config Styles
    const isHappy = theme === 'happy';

    const containerClasses = isHappy
        ? "bg-white/60 border-orange-100 shadow-xl shadow-orange-500/5 focus-within:border-orange-300 focus-within:shadow-[0_0_40px_-10px_rgba(251,146,60,0.3)]"
        : "bg-gradient-to-br from-card/30 to-card/10 border-white/10 shadow-2xl shadow-black/5 focus-within:border-primary/30 focus-within:shadow-[0_0_40px_-10px_rgba(var(--primary),0.2)]";

    const headerBorder = isHappy ? "border-orange-100" : "border-white/5";
    const iconBg = isHappy ? "bg-orange-100 text-orange-600" : "bg-primary/10 text-primary";
    const labelText = isHappy ? "text-stone-400" : "text-muted-foreground/80";
    const badgeStyle = isHappy ? "bg-orange-50 text-stone-500" : "bg-white/5 text-muted-foreground/60";

    const buttonGradient = isHappy
        ? "bg-gradient-to-r from-orange-400 to-rose-400 shadow-[0_0_20px_-5px_rgba(244,63,94,0.4)]"
        : "bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_20px_-5px_rgba(var(--primary),0.4)]";

    return (
        <div
            className={`
                relative flex flex-col h-full w-full rounded-2xl overflow-hidden transition-all duration-500 ease-out group border backdrop-blur-xl
                ${containerClasses}
            `}
        >
            {/* Toolbar */}
            <div className={`shrink-0 flex items-center justify-between px-5 py-3 border-b ${headerBorder}`}>
                <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${iconBg}`}>
                        <PenLine className="w-3.5 h-3.5" />
                    </div>
                    <span className={`font-outfit text-[11px] font-bold tracking-widest uppercase ${labelText}`}>
                        Original Text
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-mono font-medium px-2 py-1 rounded-md ${badgeStyle}`}>
                        {wordCount} words
                    </span>
                    {value && (
                        <button
                            onClick={() => onChange('')}
                            className={`p-1.5 rounded-md transition-all duration-300 ${isHappy ? 'text-stone-400 hover:text-rose-500 hover:bg-rose-50' : 'text-muted-foreground hover:text-red-400 hover:bg-red-400/10'}`}
                            title="Clear Text"
                        >
                            <Eraser className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 relative min-h-0 transition-colors duration-500">
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Paste your academic text here..."
                    className={`w-full h-full p-6 bg-transparent border-none resize-none outline-none focus:ring-0 font-inter text-sm leading-8 custom-scrollbar selection:bg-orange-200/50 
                        ${isHappy ? 'text-stone-600 placeholder:text-stone-300' : 'text-foreground placeholder:text-muted-foreground/20'}`}
                    spellCheck={false}
                />

                {/* Floating Button */}
                <div className="absolute bottom-5 right-5 z-20">
                    <button
                        onClick={onParaphrase}
                        disabled={!value.trim() || isProcessing}
                        className={`
                            relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-semibold text-xs transition-all duration-500 overflow-hidden
                            ${!value.trim() || isProcessing
                                ? 'bg-muted/20 text-muted-foreground border border-white/5 cursor-not-allowed'
                                : `text-white hover:scale-105 active:scale-95 border border-white/10 ${buttonGradient}`
                            }
                        `}
                    >
                        <div className="relative z-10 flex items-center gap-2">
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span className="tracking-wide">Analyzing...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span className="tracking-wide">Paraphrase</span>
                                </>
                            )}
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ParaphraseEditor;