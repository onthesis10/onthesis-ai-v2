// FILE: src/components/Assistant/generators/Chapter5/index.jsx

import React, { useState, useEffect } from 'react';
import {
    Award, BookOpen, Lightbulb, Sparkles, RefreshCw,
    CheckCircle2, FileText, ChevronDown, ChevronRight,
    Gauge, Link2, Target, Zap, AlertCircle, Save, ArrowRight, Trash2
} from 'lucide-react';
import useStreamGenerator from '../../../../hooks/useStreamGenerator';
import RuleViolationBanner from '../RuleViolationBanner';
import CitationValidatorBar from '../CitationValidatorBar';
import { useThemeStore } from '@/store/themeStore';
import { cn } from '@/lib/utils';
import { useToast } from '../../../UI/ToastProvider.jsx';

// --- CONFIGURATION ---
const getSectionConfig = () => {
    return {
        conclusion: {
            title: "Kesimpulan",
            subtitle: "The Verdict",
            icon: Award, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20",
            placeholder: "Sistem otomatis memetakan Rumusan Masalah vs Hipotesis...",
            input: "", output: ""
        },
        implication: {
            title: "Implikasi Penelitian",
            subtitle: "Dampak Teoretis & Praktis",
            icon: BookOpen, color: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/20",
            placeholder: "Jelaskan konsekuensi logis dari temuan ini...",
            input: "", output: ""
        },
        suggestion: {
            title: "Saran",
            subtitle: "Action Plan",
            icon: Lightbulb, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20",
            placeholder: "Rekomendasi untuk: Peneliti Selanjutnya, Guru/Praktisi, Kebijakan...",
            input: "", output: ""
        }
    };
};

const Chapter5Generator = ({ context, onInsert }) => {
    const { theme } = useThemeStore();
    const { addToast } = useToast();

    // --- Theme Config (Matching AppSidebar.tsx) ---
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
            iconBg: "bg-amber-100 text-amber-600",
            statusBadge: "bg-white border-black/5 text-slate-500",
            pillActive: "bg-white text-blue-600 shadow-sm",
            pillInactive: "text-slate-400 hover:text-slate-600",
            contextDone: "text-emerald-600",
            contextMissing: "text-slate-400",
            contextDot: "bg-emerald-500",
            contextDotMissing: "bg-red-500",
            contextBadge: "bg-white border-black/5 text-slate-500",
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
            inputBg: "bg-[#0B1120] border-white/10 focus:ring-cyan-500/20 text-slate-200 placeholder:text-slate-500",
            btnPrimary: "bg-[#0EA5E9] text-white shadow-[0_0_15px_-3px_rgba(14,165,233,0.5)] hover:opacity-90",
            btnDanger: "text-slate-500 hover:text-red-400 hover:bg-red-500/10",
            outputBg: "bg-[#0B1120] border-white/10",
            outputHeader: "bg-[#1E293B] border-white/5",
            iconBg: "bg-amber-500/10 text-amber-400",
            statusBadge: "bg-black/20 border-white/5 text-slate-400",
            pillActive: "bg-[#2B2D31] text-cyan-400 shadow-sm",
            pillInactive: "text-slate-400 hover:text-slate-300",
            contextDone: "text-emerald-400",
            contextMissing: "text-slate-500",
            contextDot: "bg-emerald-400",
            contextDotMissing: "bg-red-500",
            contextBadge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
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
            pillInactive: "text-stone-400 hover:text-stone-600",
            contextDone: "text-emerald-600",
            contextMissing: "text-stone-400",
            contextDot: "bg-emerald-500",
            contextDotMissing: "bg-red-500",
            contextBadge: "bg-white border-orange-100 text-stone-500",
        }
    }[theme || 'dark'];

    // 1. SETUP ENGINE
    const [lengthMode, setLengthMode] = useState('standard');

    // 2. STATE
    const [sections, setSections] = useState(() => getSectionConfig());
    const [activeGenSection, setActiveGenSection] = useState(null);
    const [expandedSections, setExpandedSections] = useState({ conclusion: true });

    // Context Data
    const [problemStatement, setProblemStatement] = useState("");
    const [findingsSummary, setFindingsSummary] = useState("");

    const { generatedContent, isGenerating, generateStream, stopGeneration, triggerSnapshot } = useStreamGenerator();

    // --- EFFECTS ---
    // A. Auto-Fetch Context
    useEffect(() => {
        if (!context?.id) return;
        const ch1 = localStorage.getItem(`onthesis_draft_bab1_${context.id}`);
        if (ch1) {
            try {
                const parsed = JSON.parse(ch1);
                const rumusan = parsed.rumusan?.output || parsed.rumusan?.input || "";
                setProblemStatement(rumusan.substring(0, 1000));
            } catch (e) { }
        }
        const ch4 = localStorage.getItem(`onthesis_draft_bab4_${context.id}`);
        if (ch4) {
            try {
                const parsed = JSON.parse(ch4);
                const hipotesis = parsed.hipotesis?.output || "";
                const pembahasan = parsed.pembahasan?.output || "";
                const summary = `KEPUTUSAN HIPOTESIS: ${hipotesis}\n\nINTISARI PEMBAHASAN: ${pembahasan}`;
                setFindingsSummary(summary.substring(0, 1500));
            } catch (e) { }
        }
    }, [context?.id]);

    // B. Auto Save/Load
    useEffect(() => {
        if (!context?.id) return;
        const key = `onthesis_draft_bab5_${context.id}`;
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
        localStorage.setItem(`onthesis_draft_bab5_${context.id}`, JSON.stringify(toSave));
    }, [sections, context?.id]);

    // C. Live Typing
    useEffect(() => {
        if (activeGenSection && isGenerating) {
            setSections(prev => ({
                ...prev, [activeGenSection]: { ...prev[activeGenSection], output: generatedContent }
            }));
        }
        if (activeGenSection && !isGenerating && generatedContent) {
            triggerSnapshot(context?.id, 'bab5', sections);
        }
    }, [generatedContent, isGenerating, activeGenSection]);

    // --- HANDLERS ---
    const getTargetWordCount = (key, level) => {
        const base = 250;
        const multiplier = level === 'deep' ? 1.5 : (level === 'killer' ? 2.0 : 1.0);
        return Math.round(base * multiplier).toString();
    };

    const handleInputChange = (key, val) => setSections(prev => ({ ...prev, [key]: { ...prev[key], input: val } }));
    const toggleExpand = (key) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

    const handleResetSection = (key) => {
        if (window.confirm("Reset draft?")) setSections(prev => ({ ...prev, [key]: { ...prev[key], input: "", output: "" } }));
    };

    const handleGenerateSection = (key) => {
        setActiveGenSection(key);
        setExpandedSections(prev => ({ ...prev, [key]: true }));

        if (key === 'conclusion' && !problemStatement && !sections[key].input.trim()) {
            addToast("Rumusan masalah tidak ditemukan. Isi manual.", 'error');
            return;
        }

        let taskType = '';
        if (key === 'conclusion') taskType = 'bab5_part_conclusion';
        else if (key === 'implication') taskType = 'bab5_part_implication';
        else if (key === 'suggestion') taskType = 'bab5_part_suggestion';

        generateStream({
            task: taskType,
            projectId: context.id,
            context_title: context.title,
            input_text: sections[key].input,
            depth_level: lengthMode,
            word_count: getTargetWordCount(key, lengthMode),
            chapter1_problem: problemStatement,
            chapter4_summary: findingsSummary
        });
    };

    const handleInsertPart = (key) => { if (sections[key].output && onInsert) onInsert(sections[key].output); };

    return (
        <div className={cn("flex flex-col h-full font-sans text-[13px] border-l transition-colors duration-300 relative", activeConfig.containerBg)}>

            {/* 1. HEADER */}
            <div className={cn("border-b flex flex-col shrink-0 sticky top-0 z-20", activeConfig.headerBg)}>

                {/* Top Row: Title */}
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-lg", activeConfig.iconBg)}>
                            <Award size={14} />
                        </div>
                        <span className={cn("text-xs font-bold uppercase tracking-widest", activeConfig.textMain)}>
                            Kesimpulan & Saran
                        </span>
                    </div>

                    {/* Depth Mode Selector */}
                    <div className={cn("flex rounded-lg p-0.5 border", activeConfig.subHeaderBg)}>
                        {['standard', 'deep', 'killer'].map((level) => (
                            <button
                                key={level}
                                onClick={() => setLengthMode(level)}
                                className={cn(
                                    "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all",
                                    lengthMode === level ? activeConfig.pillActive : activeConfig.pillInactive
                                )}
                            >
                                {level === 'standard' ? 'STD' : level === 'deep' ? 'DEEP' : 'KILLER'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* System Status Bar */}
                <div className={cn("px-4 py-2 border-t flex items-center justify-between", activeConfig.subHeaderBg)}>
                    <div className={cn("flex items-center gap-2 text-[10px]", activeConfig.textMuted)}>
                        <span className="font-medium">Context:</span>
                        <div className="flex items-center gap-1">
                            <div className={cn("w-2 h-2 rounded-full", problemStatement ? activeConfig.contextDot : activeConfig.contextDotMissing)}></div>
                            <span className={problemStatement ? activeConfig.contextDone : activeConfig.contextMissing}>Rumusan</span>
                        </div>
                        <span className={activeConfig.textMuted}>|</span>
                        <div className="flex items-center gap-1">
                            <div className={cn("w-2 h-2 rounded-full", findingsSummary ? activeConfig.contextDot : activeConfig.contextDotMissing)}></div>
                            <span className={findingsSummary ? activeConfig.contextDone : activeConfig.contextMissing}>Hipotesis</span>
                        </div>
                    </div>
                    <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-medium", activeConfig.statusBadge)}>
                        <Save size={10} className={theme === 'happy' ? "text-orange-500" : "text-emerald-500"} /> Auto-Saved
                    </div>
                </div>
            </div>

            {/* RULE VIOLATIONS */}
            <RuleViolationBanner projectId={context?.id} chapter="bab5" />

            {/* 2. SCROLLABLE LIST */}
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
                                        <div className={`p-1.5 rounded-lg ${section.bg} ${section.color} border ${section.border} shadow-sm`}>
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
                                            {/* Smart Context Indicator */}
                                            {key === 'conclusion' && problemStatement && (
                                                <div className={cn("absolute top-2 right-2 z-10 px-2 py-1 rounded-lg text-[9px] flex items-center gap-1 border opacity-70 hover:opacity-100 transition-opacity cursor-help", activeConfig.contextBadge)} title={problemStatement}>
                                                    <Target size={10} className={theme === 'happy' ? "text-orange-500" : "text-emerald-500"} />
                                                    <span className="truncate max-w-[100px]">Matching Problem</span>
                                                </div>
                                            )}

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
                                                        {section.output ? 'Verdict Again' : 'Verdict'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* OUTPUT PREVIEW */}
                                        {(hasOutput || isWriting) && (
                                            <div className={cn("mt-4 rounded-xl overflow-hidden border", activeConfig.outputBg)}>
                                                <div className={cn("flex items-center justify-between px-4 py-2.5 border-b", activeConfig.outputHeader)}>
                                                    <span className={cn("text-[10px] font-bold uppercase flex items-center gap-2 tracking-widest", activeConfig.textMuted)}>
                                                        <div className={`w-2 h-2 rounded-full ${isWriting ? (theme === 'happy' ? 'bg-orange-400 animate-pulse' : 'bg-cyan-400 animate-pulse') : (theme === 'happy' ? 'bg-orange-500' : 'bg-emerald-500')}`}></div>
                                                        AI Verdict Draft
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

export default Chapter5Generator;
