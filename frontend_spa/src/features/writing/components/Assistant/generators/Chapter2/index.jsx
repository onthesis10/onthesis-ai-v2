import React, { useState, useEffect } from 'react';
import {
    Layers, BookOpen, GitPullRequest, Sparkles, RefreshCw,
    Network, HelpCircle, ChevronDown, FileText, Database, Library,
    ArrowRight, Save, Trash2
} from 'lucide-react';
import useStreamGenerator from '../../../../hooks/useStreamGenerator';
import RuleViolationBanner from '../RuleViolationBanner';
import CitationValidatorBar from '../CitationValidatorBar';
import { useThemeStore } from '@/store/themeStore';
import { cn } from '@/lib/utils';
import { useToast } from '../../../UI/ToastProvider.jsx';

// --- HELPER CONFIG ---
const getSectionConfig = () => ({
    var_x: {
        title: "Variabel X (Independen)",
        subtitle: "Definisi & Karakteristik",
        icon: Layers, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20",
        placeholder: "Masukkan poin kunci: Definisi ahli, karakteristik, dan klasifikasi..."
    },
    var_y: {
        title: "Variabel Y (Dependen)",
        subtitle: "Teori & Indikator",
        icon: Layers, color: "text-sky-500", bg: "bg-sky-500/10", border: "border-sky-500/20",
        placeholder: "PENTING: Masukkan definisi & DIMENSI/INDIKATOR acuan instrumen..."
    },
    context: {
        title: "Konteks Mata Pelajaran",
        subtitle: "Hakikat & Tujuan",
        icon: BookOpen, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20",
        placeholder: "Jelaskan karakteristik mapel, tujuan, dan relevansinya..."
    },
    relation: {
        title: "Penelitian Terdahulu",
        subtitle: "State of the Art",
        icon: Network, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20",
        placeholder: "Review penelitian relevan. Jelaskan posisi (Novelty) dan hubungan..."
    },
    framework: {
        title: "Kerangka Pemikiran",
        subtitle: "Alur Logika",
        icon: GitPullRequest, color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500/20",
        placeholder: "Alur: Masalah (Awal) -> Solusi (Tindakan) -> Harapan (Akhir)..."
    },
    hypothesis: {
        title: "Hipotesis Penelitian",
        subtitle: "Jawaban Sementara",
        icon: HelpCircle, color: "text-teal-500", bg: "bg-teal-500/10", border: "border-teal-500/20",
        placeholder: "Rumuskan Hipotesis Alternatif (Ha) dan Hipotesis Nol (H0)..."
    }
});

const Chapter2Generator = ({ context, onInsert }) => {
    const { theme } = useThemeStore();
    const { addToast } = useToast();

    // --- Theme Config ---
    const activeConfig = {
        light: {
            containerBg: "bg-white/80 text-slate-800 border-black/5 backdrop-blur-xl",
            headerBg: "bg-white/50 border-black/5 backdrop-blur-xl",
            subHeaderBg: "bg-black/5 border-black/5",
            cardBg: "bg-white border-black/5 shadow-sm",
            cardHover: "hover:bg-slate-50",
            cardExpandedBg: "bg-slate-50",
            textMain: "text-slate-800",
            textMuted: "text-slate-500",
            inputBg: "bg-white border-black/10 focus:ring-blue-500/20 text-slate-800 placeholder:text-slate-400",
            btnPrimary: "bg-[#007AFF] text-white shadow-md hover:opacity-90",
            btnDanger: "text-slate-400 hover:text-red-500 hover:bg-red-50",
            outputBg: "bg-white border-black/10 shadow-sm",
            outputHeader: "bg-slate-50 border-black/5",
            iconBg: "bg-blue-100 text-blue-600",
            statusBadge: "bg-white border-black/5 text-slate-500",
            pillActive: "bg-white text-blue-600 shadow-sm",
            pillInactive: "text-slate-400 hover:text-slate-600"
        },
        dark: {
            containerBg: "bg-[#1E293B]/80 text-slate-200 border-white/5 backdrop-blur-xl",
            headerBg: "bg-[#1E293B]/50 border-white/10 backdrop-blur-xl",
            subHeaderBg: "bg-black/20 border-white/5",
            cardBg: "bg-[#0B1120]/50 border-transparent",
            cardHover: "hover:bg-white/5",
            cardExpandedBg: "bg-black/20",
            textMain: "text-slate-200",
            textMuted: "text-slate-400",
            inputBg: "bg-[#0B1120] border-white/10 focus:ring-blue-500/20 text-slate-200 placeholder:text-slate-500",
            btnPrimary: "bg-[#0EA5E9] text-white shadow-[0_0_15px_-3px_rgba(14,165,233,0.5)] hover:opacity-90",
            btnDanger: "text-slate-500 hover:text-red-400 hover:bg-red-500/10",
            outputBg: "bg-[#0B1120] border-white/10",
            outputHeader: "bg-[#1E293B] border-white/5",
            iconBg: "bg-blue-900/30 text-blue-400",
            statusBadge: "bg-black/20 border-white/5 text-slate-400",
            pillActive: "bg-[#2B2D31] text-blue-400 shadow-sm",
            pillInactive: "text-slate-400 hover:text-slate-300"
        },
        happy: {
            containerBg: "bg-white/80 text-stone-800 border-orange-100 backdrop-blur-xl",
            headerBg: "bg-white/90 border-orange-100 backdrop-blur-xl",
            subHeaderBg: "bg-orange-50/50 border-orange-100",
            cardBg: "bg-white border-orange-50 shadow-sm",
            cardHover: "hover:bg-orange-50/50",
            cardExpandedBg: "bg-orange-50/30",
            textMain: "text-stone-800",
            textMuted: "text-stone-500",
            inputBg: "bg-white border-orange-200 focus:ring-orange-500/20 text-stone-800 placeholder:text-stone-400",
            btnPrimary: "bg-gradient-to-r from-orange-400 to-rose-400 text-white shadow-lg shadow-orange-500/20 hover:opacity-90",
            btnDanger: "text-stone-400 hover:text-red-500 hover:bg-red-50",
            outputBg: "bg-white border-orange-100 shadow-sm",
            outputHeader: "bg-orange-50/80 border-orange-100",
            iconBg: "bg-orange-100 text-orange-500",
            statusBadge: "bg-white border-orange-100 text-stone-500",
            pillActive: "bg-white text-orange-500 shadow-sm border border-orange-100",
            pillInactive: "text-stone-400 hover:text-stone-600"
        }
    }[theme || 'dark'];

    const [lengthMode, setLengthMode] = useState('standard');
    const [sections, setSections] = useState(() => {
        const initial = getSectionConfig();
        Object.keys(initial).forEach(k => { initial[k].input = ""; initial[k].output = ""; });
        return initial;
    });
    const [activeGenSection, setActiveGenSection] = useState(null);
    const [expandedSections, setExpandedSections] = useState({ var_x: true, var_y: true });

    const hasReferences = context?.references && context.references.length > 0;
    const { generatedContent, isGenerating, generateStream, stopGeneration, triggerSnapshot } = useStreamGenerator();

    // --- AUTO LOAD/SAVE ---
    useEffect(() => {
        if (!context?.id) return;
        const key = `onthesis_draft_bab2_${context.id} `;
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setSections(prev => {
                    const next = { ...prev };
                    Object.keys(parsed).forEach(k => {
                        if (next[k]) { next[k].input = parsed[k].input; next[k].output = parsed[k].output; }
                    });
                    return next;
                });
            } catch (e) { }
        }
    }, [context?.id]);

    useEffect(() => {
        if (!context?.id) return;
        const toSave = {};
        Object.keys(sections).forEach(k => toSave[k] = { input: sections[k].input, output: sections[k].output });
        localStorage.setItem(`onthesis_draft_bab2_${context.id} `, JSON.stringify(toSave));
    }, [sections, context?.id]);

    // --- LIVE TYPING ---
    useEffect(() => {
        if (activeGenSection && isGenerating) {
            setSections(prev => ({
                ...prev, [activeGenSection]: { ...prev[activeGenSection], output: generatedContent }
            }));
        }
        if (activeGenSection && !isGenerating && generatedContent) {
            triggerSnapshot(context?.id, 'bab2', sections);
        }
    }, [generatedContent, isGenerating, activeGenSection]);

    // --- HANDLERS ---
    const getTargetWordCount = (key, mode) => {
        const base = 150;
        let paragraphs = 0;
        const multiplier = mode === 'brief' ? 1 : (mode === 'standard' ? 1.5 : 2.5);
        if (key === 'var_x' || key === 'var_y') paragraphs = 8;
        else if (key === 'context') paragraphs = 5;
        else if (key === 'relation') paragraphs = 8;
        else if (key === 'framework') paragraphs = 4;
        else if (key === 'hypothesis') paragraphs = 3;
        return Math.round(paragraphs * base * multiplier).toString();
    };

    const handleInputChange = (key, val) => setSections(prev => ({ ...prev, [key]: { ...prev[key], input: val } }));
    const toggleExpand = (key) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

    const handleResetSection = (key) => {
        if (window.confirm("Reset bagian ini?")) {
            setSections(prev => ({ ...prev, [key]: { ...prev[key], input: "", output: "" } }));
        }
    };

    const handleGenerateSection = (key) => {
        setActiveGenSection(key);
        setExpandedSections(prev => ({ ...prev, [key]: true }));

        if (!sections[key].input.trim()) {
            addToast("Isi poin dulu agar terarah.", 'error');
            return;
        }

        let taskType = '';
        let extraPayload = {};
        if (key === 'var_x') { taskType = 'bab2_part_x'; extraPayload = { variable_name: 'Variabel X' }; }
        else if (key === 'var_y') { taskType = 'bab2_part_y'; extraPayload = { variable_name: 'Variabel Y' }; }
        else if (key === 'context') taskType = 'bab2_part_context';
        else if (key === 'relation') taskType = 'bab2_part_relation';
        else if (key === 'framework') taskType = 'bab2_part_framework';
        else if (key === 'hypothesis') taskType = 'bab2_part_hypothesis';

        let backendLengthMode = 'standard';
        if (lengthMode === 'brief') backendLengthMode = 'brief';
        if (lengthMode === 'max') backendLengthMode = 'max';

        generateStream({
            task: taskType,
            projectId: context.id,
            context_title: context.title,
            context_problem: context.problem_statement,
            input_text: sections[key].input,
            word_count: getTargetWordCount(key, lengthMode),
            length_mode: lengthMode,
            references: context.references || [],
            ...extraPayload
        });
    };

    const handleInsertPart = (key) => { if (sections[key].output && onInsert) onInsert(sections[key].output); };

    return (
        <div className={cn("flex flex-col h-full font-sans text-[13px] border-l transition-colors duration-300", activeConfig.containerBg)}>

            {/* 1. HEADER */}
            <div className={cn("border-b flex flex-col shrink-0 sticky top-0 z-20", activeConfig.headerBg)}>
                {/* Title & Status */}
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-lg", activeConfig.iconBg)}>
                            <Database size={14} />
                        </div>
                        <span className={cn("text-xs font-bold uppercase tracking-widest", activeConfig.textMain)}>
                            Literature Review
                        </span>
                    </div>

                    {/* Depth Mode Selector */}
                    <div className={cn("flex rounded-lg p-0.5 border", activeConfig.subHeaderBg)}>
                        {['brief', 'standard', 'max'].map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setLengthMode(mode)}
                                className={cn(
                                    "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all",
                                    lengthMode === mode ? activeConfig.pillActive : activeConfig.pillInactive
                                )}
                            >
                                {mode === 'brief' ? 'STD' : mode === 'standard' ? 'DEEP' : 'KILLER'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Library Status Bar */}
                <div className={cn("px-4 py-2 border-t flex items-center justify-between", activeConfig.subHeaderBg)}>
                    <div className={cn("flex items-center gap-1.5 text-[11px]", activeConfig.textMuted)}>
                        <Library size={12} className={hasReferences ? (theme === 'happy' ? "text-orange-500" : "text-emerald-500") : "text-amber-500"} />
                        <span className="font-medium">Library:</span>
                        {hasReferences
                            ? <span className={cn("font-bold", theme === 'happy' ? "text-orange-600" : "text-emerald-600 dark:text-emerald-400")}>{context.references.length} Refs</span>
                            : <span className="text-amber-600 dark:text-amber-500 font-bold">No Data</span>
                        }
                    </div>
                    <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-medium", activeConfig.statusBadge)}>
                        <Save size={10} className={theme === 'happy' ? "text-orange-500" : "text-emerald-500"} /> Auto-Saved
                    </div>
                </div>
            </div>

            {/* 2. SCROLLABLE LIST */}
            <RuleViolationBanner projectId={context?.id} chapter="bab2" />

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className={cn("divide-y", theme === 'dark' ? "divide-white/5" : "divide-black/5")}>

                    {Object.entries(sections).map(([key, section]) => {
                        const isExpanded = expandedSections[key];
                        const isWriting = activeGenSection === key && isGenerating;
                        const hasOutput = !!section.output;

                        return (
                            <div key={key} className="group transition-all duration-300">

                                {/* HEADER */}
                                <div
                                    onClick={() => toggleExpand(key)}
                                    className={cn(
                                        "px-4 py-3.5 cursor-pointer flex items-center justify-between transition-colors",
                                        isExpanded ? activeConfig.cardExpandedBg : [activeConfig.cardBg, activeConfig.cardHover]
                                    )}
                                >
                                    <div className="flex items-center gap-3.5">
                                        <div className={`p - 1.5 rounded - lg ${section.bg} ${section.color} border ${section.border} shadow - sm`}>
                                            <section.icon size={16} strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <div className={cn("text-[13px] font-bold leading-none mb-1", activeConfig.textMain)}>
                                                {section.title}
                                            </div>
                                            <div className={cn("text-[11px] font-medium opacity-80", activeConfig.textMuted)}>
                                                {section.subtitle}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={cn("transition-transform duration-200", activeConfig.textMuted, isExpanded ? 'rotate-180 text-blue-500' : '')}>
                                        <ChevronDown size={16} />
                                    </div>
                                </div>

                                {/* BODY */}
                                {isExpanded && (
                                    <div className={cn("px-4 pb-5 pt-2 animate-in slide-in-from-top-1", activeConfig.cardExpandedBg)}>

                                        {/* INPUT AREA */}
                                        <div className="relative group/input mt-1 shadow-sm">
                                            <textarea
                                                className={cn(
                                                    "w-full rounded-xl px-4 py-3 text-[13px] outline-none resize-none min-h-[90px] pb-12 transition-all leading-relaxed custom-scrollbar font-medium border focus:ring-2",
                                                    activeConfig.inputBg
                                                )}
                                                placeholder={section.placeholder}
                                                value={section.input}
                                                onChange={(e) => handleInputChange(key, e.target.value)}
                                            />

                                            {/* ACTIONS */}
                                            <div className="absolute bottom-2.5 right-2.5 flex gap-2 opacity-90 hover:opacity-100 transition-opacity">
                                                {/* Clear */}
                                                {(section.input || section.output) && !isWriting && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleResetSection(key); }}
                                                        className={cn("p-1.5 rounded-lg transition-all", activeConfig.btnDanger)}
                                                        title="Hapus Draft"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}

                                                {/* Generate Button */}
                                                {isWriting ? (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); stopGeneration(); }}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-all cursor-pointer"
                                                    >
                                                        <RefreshCw size={12} className="animate-spin" /> Stop
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleGenerateSection(key); }}
                                                        className={cn("flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all border-transparent active:scale-95", activeConfig.btnPrimary)}
                                                    >
                                                        <Sparkles size={12} fill="currentColor" />
                                                        {section.output ? 'Synthesis Again' : 'Synthesize'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* OUTPUT PREVIEW */}
                                        {(hasOutput || isWriting) && (
                                            <div className={cn("mt-4 rounded-xl overflow-hidden border", activeConfig.outputBg)}>
                                                <div className={cn("flex items-center justify-between px-4 py-2.5 border-b", activeConfig.outputHeader)}>
                                                    <span className={cn("text-[10px] font-bold uppercase flex items-center gap-2 tracking-widest", activeConfig.textMuted)}>
                                                        <FileText size={12} /> AI Synthesis Draft
                                                    </span>

                                                    {!isWriting && (
                                                        <button
                                                            onClick={() => handleInsertPart(key)}
                                                            className={cn("flex items-center gap-1.5 text-[11px] font-bold transition-colors", theme === 'happy' ? 'text-orange-500 hover:text-orange-600' : 'text-emerald-500 hover:text-emerald-400')}
                                                        >
                                                            Insert <ArrowRight size={14} />
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="p-5 max-h-[300px] overflow-y-auto custom-scrollbar">
                                                    <div className={cn("prose prose-sm max-w-none", theme === 'dark' ? "prose-invert" : "prose-slate")}>
                                                        <div
                                                            className={cn("text-[13px] leading-relaxed font-medium whitespace-pre-wrap font-sans", activeConfig.textMain)}
                                                            dangerouslySetInnerHTML={{ __html: section.output }}
                                                        />
                                                        {isWriting && <span className={cn("inline-block w-2 h-4 ml-1 animate-pulse align-middle rounded-sm", theme === 'happy' ? 'bg-orange-400' : 'bg-cyan-500')} />}
                                                    </div>
                                                </div>

                                                {/* Citation Validator */}
                                                {hasOutput && !isWriting && (
                                                    <CitationValidatorBar projectId={context?.id} generatedText={section.output} />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="h-20"></div>
            </div>
        </div>
    );
};

export default Chapter2Generator;
