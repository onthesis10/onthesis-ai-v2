import React from 'react';
import { Citation } from '../services/citationService';
import { Quote, Trash2, Copy, Book, Globe, FileText, GraduationCap, Calendar, ExternalLink, Sparkles } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore'; // Pastikan import ini

interface ReferenceListProps {
    citations: Citation[];
    activeProjectId: string | null;
    citationStyle: string;
    onDelete: (id: string) => void;
    onCopy: (citation: Citation) => void;
    onExport?: () => void;
}

export function ReferenceList({
    citations,
    activeProjectId,
    citationStyle,
    onDelete,
    onCopy,
    onExport
}: ReferenceListProps) {
    const { theme } = useThemeStore();
    const isHappy = theme === 'happy';

    // --- HELPER STYLES ---
    const getIcon = (type?: string) => {
        switch (type?.toLowerCase()) {
            case 'book': return <Book className="w-4 h-4" />;
            case 'website': return <Globe className="w-4 h-4" />;
            case 'thesis': return <GraduationCap className="w-4 h-4" />;
            default: return <FileText className="w-4 h-4" />;
        }
    };

    const getTypeStyle = (type?: string) => {
        if (isHappy) {
            // Happy Mode: Warm Spectrum (Orange, Rose, Amber, Stone)
            switch (type?.toLowerCase()) {
                case 'book': return 'bg-amber-100/50 text-amber-700 border-amber-200';
                case 'website': return 'bg-rose-100/50 text-rose-600 border-rose-200';
                case 'thesis': return 'bg-stone-100/50 text-stone-600 border-stone-200';
                default: return 'bg-orange-100/50 text-orange-600 border-orange-200';
            }
        } else {
            // Default/Dark: Tech Spectrum (Blue, Cyan, Purple)
            switch (type?.toLowerCase()) {
                case 'book': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
                case 'website': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
                case 'thesis': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
                default: return 'bg-primary/10 text-primary border-primary/20';
            }
        }
    };

    // --- EMPTY STATES ---
    if (!activeProjectId) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center h-full animate-in fade-in duration-500 p-8">
                <div className="relative mb-6 group">
                    <div className={`absolute inset-0 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 ${isHappy ? 'bg-orange-400/20' : 'bg-primary/20'}`} />
                    <div className={`w-20 h-20 rounded-2xl border flex items-center justify-center backdrop-blur-md relative z-10 shadow-lg ${isHappy ? 'bg-white/60 border-orange-100' : 'bg-gradient-to-br from-muted/50 to-muted/10 border-white/10'}`}>
                        <Book className={`w-8 h-8 ${isHappy ? 'text-orange-300' : 'text-muted-foreground/50'}`} />
                    </div>
                </div>
                <h3 className={`text-lg font-bold mb-2 ${isHappy ? 'text-stone-700' : 'text-foreground/80'}`}>No Project Selected</h3>
                <p className={`text-sm text-center max-w-[250px] leading-relaxed ${isHappy ? 'text-stone-500' : 'text-muted-foreground'}`}>
                    Select a project from the header menu to manage your research references.
                </p>
            </div>
        );
    }

    if (citations.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center h-full animate-in zoom-in-95 duration-500 p-8">
                <div className="relative mb-6">
                    <div className={`w-24 h-24 rounded-3xl border flex items-center justify-center backdrop-blur-md shadow-xl ${isHappy ? 'bg-gradient-to-br from-orange-50 to-rose-50 border-white/40' : 'bg-gradient-to-br from-primary/10 to-transparent border-primary/20'}`}>
                        <Quote className={`w-10 h-10 ${isHappy ? 'text-rose-400' : 'text-primary/60'}`} />
                    </div>
                    {isHappy && (
                        <div className="absolute -bottom-3 -right-3 w-10 h-10 rounded-full bg-white border border-orange-100 flex items-center justify-center shadow-md animate-bounce delay-700">
                            <Sparkles className="w-4 h-4 text-orange-400" />
                        </div>
                    )}
                </div>
                <h3 className={`text-xl font-bold mb-3 ${isHappy ? 'text-stone-800' : 'text-foreground'}`}>Start Your Bibliography</h3>
                <p className={`text-sm text-center max-w-[320px] leading-relaxed mb-6 ${isHappy ? 'text-stone-500' : 'text-muted-foreground'}`}>
                    Your collection is empty. Add references manually, search online sources, or upload PDFs to extract citations.
                </p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 custom-scroll pb-32">
            <div className="grid grid-cols-1 gap-3 max-w-5xl mx-auto">
                {citations.map((ref, i) => (
                    <div
                        key={ref.id}
                        className={`
                            group relative backdrop-blur-sm border rounded-2xl p-5 transition-all duration-300 flex gap-5 items-start animate-in slide-in-from-bottom-2
                            ${isHappy
                                ? 'bg-white/60 hover:bg-white/90 border-orange-100/50 hover:border-orange-200 hover:shadow-[0_8px_30px_rgba(251,146,60,0.1)]'
                                : 'bg-card/40 hover:bg-card/90 border-border/40 hover:border-primary/30 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)]'}
                        `}
                        style={{ animationDelay: `${i * 50}ms` }}
                    >
                        {/* Icon Box */}
                        <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm transition-colors ${getTypeStyle(ref.type)}`}>
                            {getIcon(ref.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex justify-between items-start gap-4">
                                <h4 className={`font-bold text-base leading-snug line-clamp-2 transition-colors ${isHappy ? 'text-stone-800 group-hover:text-orange-600' : 'text-foreground group-hover:text-primary'}`}>
                                    {ref.title}
                                </h4>

                                {/* Actions */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                    <button
                                        onClick={() => onCopy(ref)}
                                        className={`p-2 rounded-lg transition-colors ${isHappy ? 'hover:bg-orange-100 text-stone-400 hover:text-orange-600' : 'hover:bg-primary/10 text-muted-foreground hover:text-primary'}`}
                                        title="Copy Citation"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onDelete(ref.id)}
                                        className={`p-2 rounded-lg transition-colors ${isHappy ? 'hover:bg-rose-100 text-stone-400 hover:text-rose-500' : 'hover:bg-red-500/10 text-muted-foreground hover:text-red-500'}`}
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <p className={`text-xs font-medium mt-1.5 truncate ${isHappy ? 'text-stone-500' : 'text-foreground/70'}`}>
                                {ref.author}
                            </p>

                            <div className="flex items-center gap-3 mt-3">
                                {ref.year && (
                                    <div className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-lg border ${isHappy ? 'bg-white border-orange-100 text-orange-600/80' : 'bg-muted/40 border-border/30 text-muted-foreground font-mono'}`}>
                                        <Calendar className="w-3 h-3 opacity-70" />
                                        {ref.year}
                                    </div>
                                )}

                                <div className={`text-[11px] font-medium truncate max-w-[200px] border-l pl-3 ${isHappy ? 'text-stone-400 border-stone-200' : 'text-muted-foreground border-border/50'}`}>
                                    {ref.journal || ref.publisher || <span className="opacity-50 italic">No publisher</span>}
                                </div>

                                {(ref.url || ref.doi) && (
                                    <a
                                        href={ref.url || `https://doi.org/${ref.doi}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={`ml-auto text-[10px] font-bold flex items-center gap-1 hover:underline transition-opacity ${isHappy ? 'text-rose-500 decoration-rose-200' : 'text-primary opacity-80 hover:opacity-100'}`}
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                        <span className="hidden sm:inline">Source</span>
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 mb-4 text-center">
                <div className={`inline-flex items-center px-4 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${isHappy ? 'bg-orange-50/50 border-orange-100 text-orange-400' : 'bg-muted/30 border-border/40 text-muted-foreground'}`}>
                    {citations.length} References Stored
                </div>
            </div>
        </div>
    );
}