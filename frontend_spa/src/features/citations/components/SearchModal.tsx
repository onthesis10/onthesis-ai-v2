import React, { useState, useRef, useEffect } from 'react';
import { citationService } from '../services/citationService';
import { Search, Plus, Check, X, FileText, Calendar, Filter, ArrowRight, Link2, ChevronDown, Loader2, Trash2, Globe } from 'lucide-react';
import { CitationLoader } from './CitationLoader';
import { useThemeStore } from '@/store/themeStore'; // Pastikan import ini ada

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    activeProjectId: string | null;
    onAdd: (citation: any) => Promise<void>;
}

const SOURCES = [
    { id: 'crossref', label: 'Crossref' },
    { id: 'doaj', label: 'DOAJ' },
    { id: 'openalex', label: 'OpenAlex' },
    { id: 'pubmed', label: 'PubMed' },
];

const STORAGE_KEY = 'onthesis_citation_search_cache';

export function SearchModal({ isOpen, onClose, activeProjectId, onAdd }: SearchModalProps) {
    // --- THEME STORE ---
    const { theme } = useThemeStore();
    const isHappy = theme === 'happy';

    // --- STATE MANAGEMENT ---
    const [query, setQuery] = useState('');
    const [year, setYear] = useState<string>('');
    const [selectedSources, setSelectedSources] = useState<string[]>(['crossref', 'doaj', 'openalex']);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

    // State untuk Custom Dropdown Tahun
    const [isYearOpen, setIsYearOpen] = useState(false);
    const yearDropdownRef = useRef<HTMLDivElement>(null);

    // --- HELPER STYLES FOR HAPPY MODE ---
    const happyStyles = {
        borderGradient: "from-orange-400/50 via-white/20 to-rose-400/50",
        shadowColor: "rgba(249, 115, 22, 0.2)", // Orange shadow
        iconBg: "bg-gradient-to-br from-orange-400/20 to-rose-400/10 text-orange-600",
        primaryBtn: "bg-gradient-to-r from-orange-400 to-rose-400 hover:from-orange-500 hover:to-rose-500 text-white shadow-orange-500/20",
        pillActive: "bg-orange-100 text-orange-600 border-orange-200 shadow-orange-100",
        pillInactive: "text-stone-500 hover:text-stone-700 hover:bg-orange-50",
        textMuted: "text-stone-400",
        textHighlight: "text-orange-600",
        linkHover: "text-rose-500 decoration-rose-200",
        background: "bg-[#FFFCF5]/90" // Warm white tint
    };

    const defaultStyles = {
        borderGradient: "from-primary/50 via-background/20 to-primary/20",
        shadowColor: "rgba(var(--primary), 0.3)",
        iconBg: "bg-primary/10 text-primary",
        primaryBtn: "btn-primary",
        pillActive: "bg-primary/10 text-primary border-primary/20",
        pillInactive: "text-muted-foreground hover:text-foreground hover:bg-secondary/40",
        textMuted: "text-muted-foreground",
        textHighlight: "text-primary",
        linkHover: "text-primary decoration-primary/30",
        background: "bg-background/80"
    };

    const style = isHappy ? happyStyles : defaultStyles;

    // --- PERSISTENCE LOGIC (SAVE & LOAD) ---
    useEffect(() => {
        if (isOpen) {
            try {
                const cachedData = localStorage.getItem(STORAGE_KEY);
                if (cachedData) {
                    const parsed = JSON.parse(cachedData);
                    if (parsed.query) setQuery(parsed.query);
                    if (parsed.year !== undefined) setYear(parsed.year);
                    if (parsed.selectedSources) setSelectedSources(parsed.selectedSources);
                    if (parsed.results) setResults(parsed.results);
                }
            } catch (e) {
                console.error("Failed to load search cache", e);
            }
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            const dataToCache = { query, year, selectedSources, results };
            const timeoutId = setTimeout(() => {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToCache));
            }, 500);
            return () => clearTimeout(timeoutId);
        }
    }, [query, year, selectedSources, results, isOpen]);

    // --- OTHER EFFECTS ---
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target as Node)) {
                setIsYearOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!isOpen) return null;

    // --- HANDLERS ---
    const handleSearch = async () => {
        if (!query.trim()) return;
        setLoading(true);
        setError(null);
        setResults([]);
        try {
            const data = await citationService.searchReferences(query, selectedSources, year);
            if (data.results) setResults(data.results);
        } catch (err: any) {
            setError(err.message || 'Search failed');
        } finally {
            setLoading(false);
        }
    };

    const handleClearCache = () => {
        setQuery('');
        setResults([]);
        setYear('');
        localStorage.removeItem(STORAGE_KEY);
    };

    const handleAdd = async (result: any) => {
        if (!activeProjectId) return;
        try {
            await onAdd({
                title: result.title || 'Untitled Reference',
                author: result.author || 'Unknown Author',
                year: result.year ? String(result.year) : '',
                journal: result.journal || '',
                notes: result.abstract || '',
                doi: result.doi || null,
                url: result.url || null,
                pdfUrl: result.pdfUrl || null
            });
            setAddedIds(prev => new Set(prev).add(result.doi || result.title));
        } catch (err) {
            console.error("Error adding citation:", err);
        }
    };

    const toggleSource = (id: string) => {
        setSelectedSources(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    };

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 30 }, (_, i) => currentYear - i);

    // --- RENDER ---
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/60 backdrop-blur-md animate-in fade-in duration-300">

            {/* GRADIENT BORDER CONTAINER */}
            <div
                className={`relative w-full max-w-6xl h-[85vh] animate-in zoom-in-95 duration-300 rounded-3xl p-[1px] bg-gradient-to-br ${style.borderGradient}`}
                style={{ boxShadow: `0 0 80px -20px ${style.shadowColor}` }}
            >

                {/* GLASS CONTENT CONTAINER */}
                <div className={`w-full h-full flex flex-col overflow-hidden rounded-[calc(1.5rem-1px)] backdrop-blur-3xl border-0 ${style.background}`}>

                    {/* === COMPACT HEADER (COMMAND PALETTE STYLE) === */}
                    <div className={`px-5 py-5 space-y-4 shrink-0 z-20 border-b shadow-sm backdrop-blur-xl ${isHappy ? 'bg-white/40 border-orange-100/50' : 'bg-background/40 border-white/10'}`}>

                        {/* Row 1: Search Bar & Actions */}
                        <div className="flex gap-3 items-center">
                            <div className="relative flex-1 group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Search className={`w-5 h-5 transition-colors ${isHappy ? 'text-stone-400 group-focus-within:text-orange-500' : 'text-muted-foreground/70 group-focus-within:text-primary'}`} />
                                </div>
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    placeholder="Search references by title, DOI, or keywords..."
                                    className={`w-full border rounded-xl pl-12 pr-10 h-12 text-base font-medium outline-none transition-all shadow-sm focus:shadow-xl placeholder:text-muted-foreground/50 text-foreground
                                        ${isHappy
                                            ? 'bg-white/60 hover:bg-white/80 focus:bg-white border-orange-100 focus:border-orange-300 focus:shadow-orange-500/5'
                                            : 'bg-secondary/40 hover:bg-secondary/60 focus:bg-background border-white/5 focus:border-primary/30 focus:shadow-primary/5'
                                        }`}
                                    autoFocus
                                />
                                {query && (
                                    <button
                                        onClick={() => setQuery('')}
                                        className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={handleSearch}
                                disabled={loading || !query.trim()}
                                className={`h-12 px-6 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg disabled:opacity-50 disabled:shadow-none transition-all hover:-translate-y-0.5 flex items-center justify-center min-w-[100px] ${style.primaryBtn}`}
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                            </button>

                            {/* Separator */}
                            <div className={`h-8 w-px mx-1 ${isHappy ? 'bg-stone-200' : 'bg-white/10'}`} />

                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className={`h-12 w-12 flex items-center justify-center rounded-xl transition-all border border-transparent ${isHappy ? 'text-stone-400 hover:text-rose-500 hover:bg-rose-50' : 'text-muted-foreground hover:text-red-500 hover:bg-red-500/10'}`}
                                title="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Row 2: Compact Filters */}
                        <div className="flex flex-wrap items-center justify-between gap-3 relative z-50">

                            {/* Left: Filters */}
                            <div className="flex items-center gap-3">
                                {/* Source Pills */}
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                                    <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mr-2 opacity-70 ${style.textMuted}`}>
                                        <Filter className="w-3 h-3" /> Sources:
                                    </span>
                                    {SOURCES.map(source => {
                                        const isSelected = selectedSources.includes(source.id);
                                        return (
                                            <button
                                                key={source.id}
                                                onClick={() => toggleSource(source.id)}
                                                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all border ${isSelected ? style.pillActive : `bg-transparent border-transparent ${style.pillInactive}`}`}
                                            >
                                                {source.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Custom Year Dropdown */}
                                <div className="relative" ref={yearDropdownRef}>
                                    <button
                                        onClick={() => setIsYearOpen(!isYearOpen)}
                                        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 border border-transparent transition-all text-xs ${isHappy ? 'bg-orange-50 hover:bg-orange-100 text-stone-600' : 'bg-secondary/30 hover:bg-secondary/50 hover:border-white/10'}`}
                                    >
                                        <Calendar className={`w-3.5 h-3.5 ${style.textMuted}`} />
                                        <span className="font-bold text-foreground uppercase tracking-wider min-w-[60px] text-left">
                                            {year || 'Any Year'}
                                        </span>
                                        <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isYearOpen ? 'rotate-180' : ''} ${style.textMuted}`} />
                                    </button>

                                    {isYearOpen && (
                                        <div className={`absolute top-full left-0 mt-2 w-32 max-h-56 overflow-y-auto custom-scroll p-1 rounded-xl shadow-xl animate-in fade-in zoom-in-95 flex flex-col gap-0.5 backdrop-blur-xl z-[110] border ${isHappy ? 'bg-white/95 border-orange-100' : 'bg-background/95 border-white/10'}`}>
                                            <button
                                                onClick={() => { setYear(''); setIsYearOpen(false); }}
                                                className={`px-3 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors ${year === '' ? (isHappy ? 'bg-orange-50 text-orange-600' : 'bg-primary/10 text-primary') : style.pillInactive}`}
                                            >
                                                Any Year
                                            </button>
                                            <div className={`h-px my-0.5 mx-2 ${isHappy ? 'bg-stone-100' : 'bg-border/20'}`} />
                                            {years.map(y => (
                                                <button
                                                    key={y}
                                                    onClick={() => { setYear(y.toString()); setIsYearOpen(false); }}
                                                    className={`px-3 py-1.5 text-left text-[11px] font-medium rounded-lg transition-colors ${year === y.toString() ? (isHappy ? 'bg-orange-50 text-orange-600 font-bold' : 'bg-primary/10 text-primary font-bold') : style.pillInactive}`}
                                                >
                                                    {y}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right: Clear Cache */}
                            {results.length > 0 && (
                                <button
                                    onClick={handleClearCache}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors ${isHappy ? 'text-stone-400 hover:text-rose-500 hover:bg-rose-50' : 'text-muted-foreground hover:text-red-500 hover:bg-red-500/10'}`}
                                    title="Clear search history & results"
                                >
                                    <Trash2 className="w-3 h-3" /> Clear Results
                                </button>
                            )}
                        </div>
                    </div>

                    {/* === RESULTS AREA === */}
                    <div className={`flex-1 overflow-y-auto custom-scroll p-6 space-y-3 relative z-10 bg-gradient-to-b ${isHappy ? 'from-white/0 to-orange-50/50' : 'from-transparent to-background/30'}`}>
                        {loading ? (
                            <div className="h-full flex items-center justify-center animate-in fade-in duration-500">
                                <CitationLoader />
                            </div>
                        ) : error ? (
                            <div className="text-center py-20">
                                <div className={`inline-flex p-4 rounded-full mb-4 border ${isHappy ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                    <X className="w-8 h-8" />
                                </div>
                                <p className="text-sm font-medium text-foreground">{error}</p>
                            </div>
                        ) : results.length === 0 ? (
                            <div className={`flex flex-col items-center justify-center h-full min-h-[300px] gap-4 opacity-70 ${style.textMuted}`}>
                                <Search className="w-12 h-12 stroke-[1]" />
                                <p className="text-sm font-medium">Type keywords to explore millions of papers.</p>
                                <p className="text-xs opacity-50 max-w-[200px] text-center">Your last search will be saved automatically.</p>
                            </div>
                        ) : (
                            results.map((r, i) => {
                                const isAdded = addedIds.has(r.doi || r.title);
                                return (
                                    <div
                                        key={i}
                                        className={`group relative p-5 rounded-xl border transition-all flex gap-5 items-start animate-in slide-in-from-bottom-2 duration-500 fill-mode-backwards
                                            ${isHappy
                                                ? 'bg-white/40 border-orange-100/50 hover:border-orange-200 hover:bg-white/80 hover:shadow-sm'
                                                : 'bg-secondary/5 border-white/5 hover:border-primary/20 hover:bg-secondary/20'
                                            }`}
                                        style={{ animationDelay: `${i * 30}ms` }}
                                    >
                                        {/* Icon Box */}
                                        <div className="shrink-0 mt-0.5">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all shadow-sm ${style.iconBg}`}>
                                                <FileText className="w-5 h-5" />
                                            </div>
                                        </div>

                                        {/* Content Area */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="space-y-1">
                                                    <a href={r.doi ? `https://doi.org/${r.doi}` : '#'} target="_blank" rel="noreferrer" className={`text-base font-bold text-foreground leading-snug transition-colors line-clamp-2 hover:underline ${isHappy ? 'hover:text-orange-600' : 'hover:text-primary'}`}>
                                                        {r.title}
                                                    </a>
                                                    <div className={`flex items-center gap-2 text-[11px] font-medium ${style.textMuted}`}>
                                                        <span className="text-foreground/80">{r.author}</span>
                                                        <span className="w-0.5 h-0.5 rounded-full bg-current opacity-50" />
                                                        <span className={`px-1.5 py-px rounded border font-mono ${isHappy ? 'bg-orange-50 border-orange-100' : 'bg-white/5 border-white/10'}`}>
                                                            {r.year}
                                                        </span>
                                                        <span className="w-0.5 h-0.5 rounded-full bg-current opacity-50" />
                                                        <span className={`italic ${style.textHighlight}`}>{r.journal || 'Journal Article'}</span>
                                                    </div>
                                                </div>

                                                {/* Add Button */}
                                                <button
                                                    onClick={() => handleAdd(r)}
                                                    disabled={isAdded}
                                                    className={`
                                                        shrink-0 h-8 px-4 rounded-lg text-[10px] font-bold uppercase tracking-wide flex items-center gap-2 transition-all shadow-sm
                                                        ${isAdded
                                                            ? 'bg-green-500/10 text-green-600 border border-green-500/20 cursor-default'
                                                            : style.primaryBtn}
                                                    `}
                                                >
                                                    {isAdded ? (
                                                        <><Check className="w-3 h-3" /> Added</>
                                                    ) : (
                                                        <><Plus className="w-3 h-3" /> Add</>
                                                    )}
                                                </button>
                                            </div>

                                            <p className={`mt-3 text-[13px] leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all duration-300 ${style.textMuted}`}>
                                                {r.abstract || 'No abstract available for this reference.'}
                                            </p>

                                            <div className="mt-3 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                {r.pdfUrl && (
                                                    <a href={r.pdfUrl} target="_blank" rel="noreferrer" className={`text-[10px] font-bold flex items-center gap-1 hover:underline ${isHappy ? 'text-rose-500' : 'text-red-500'}`}>
                                                        PDF Available <ArrowRight className="w-3 h-3" />
                                                    </a>
                                                )}
                                                {r.doi && (
                                                    <a href={`https://doi.org/${r.doi}`} target="_blank" rel="noreferrer" className={`text-[10px] font-mono hover:underline flex items-center gap-1 transition-colors ${isHappy ? 'text-stone-400 hover:text-orange-600' : 'text-muted-foreground hover:text-foreground'}`}>
                                                        <Link2 className="w-3 h-3" /> {r.doi}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}