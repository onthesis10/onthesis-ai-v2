import React, { useState, useEffect } from 'react';
import {
    Zap, AlertTriangle, GitMerge, Lightbulb,
    Sparkles, RefreshCw, ArrowRight, HelpCircle, Target,
    Trash2, ChevronDown, Save, Wand2
} from 'lucide-react';
import useStreamGenerator from '../../../../hooks/useStreamGenerator';
import RuleViolationBanner from '../RuleViolationBanner';
import CitationValidatorBar from '../CitationValidatorBar';
import { useThemeStore } from '@/store/themeStore';
import { cn } from '@/lib/utils';
import { useToast } from '../../../UI/ToastProvider.jsx';

// --- STATIC CONFIG ---
const SECTION_CONFIG = {
    ideal: {
        title: "Kondisi Ideal",
        subtitle: "Das Sollen (Teori/Harapan)",
        icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20",
        placeholder: "Contoh: Menurut UU No. X, pelayanan publik harus transparan..."
    },
    factual: {
        title: "Kondisi Faktual",
        subtitle: "Das Sein (Fakta Lapangan)",
        icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20",
        placeholder: "Contoh: Namun data menunjukkan 40% laporan tidak ditindaklanjuti..."
    },
    gap: {
        title: "Research Gap",
        subtitle: "Novelty/Kebaruan",
        icon: GitMerge, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20",
        placeholder: "Contoh: Penelitian sebelumnya hanya fokus di Jawa, belum ada yang meneliti di..."
    },
    solution: {
        title: "Urgensi & Solusi",
        subtitle: "Justifikasi Judul",
        icon: Lightbulb, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20",
        placeholder: "Contoh: Oleh karena itu, penerapan AI diperlukan untuk..."
    },
    rumusan: {
        title: "Rumusan Masalah",
        subtitle: "Auto-Generate Questions",
        icon: HelpCircle, color: "text-sky-500", bg: "bg-sky-500/10", border: "border-sky-500/20",
        placeholder: "Opsional: Instruksi khusus (misal: buat 2 pertanyaan saja)..."
    },
    tujuan: {
        title: "Tujuan Penelitian",
        subtitle: "Auto-Generate Objectives",
        icon: Target, color: "text-pink-500", bg: "bg-pink-500/10", border: "border-pink-500/20",
        placeholder: "Opsional: Instruksi khusus..."
    }
};

const Chapter1Generator = ({ context, onInsert }) => {
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
            iconBg: "bg-sky-100 text-sky-600",
            statusBadge: "bg-white border-black/5 text-slate-500"
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
            iconBg: "bg-sky-500/10 text-sky-400",
            statusBadge: "bg-black/20 border-white/5 text-slate-400"
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
            statusBadge: "bg-white border-orange-100 text-stone-500"
        }
    }[theme || 'dark'];

    // 1. INIT STATE
    const [sections, setSections] = useState(() => {
        const initial = {};
        Object.keys(SECTION_CONFIG).forEach(key => {
            initial[key] = { ...SECTION_CONFIG[key], input: "", output: "" };
        });
        return initial;
    });

    const [activeGenSection, setActiveGenSection] = useState(null);
    const [expandedSections, setExpandedSections] = useState({
        ideal: true, factual: true, gap: true, solution: true, rumusan: false, tujuan: false
    });

    const { generatedContent, isGenerating, generateStream, stopGeneration, triggerSnapshot } = useStreamGenerator();

    // --- AUTO-LOAD ---
    useEffect(() => {
        if (!context?.id) return;
        const storageKey = `onthesis_draft_bab1_${context.id} `;
        const savedData = localStorage.getItem(storageKey);
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                setSections(prev => {
                    const newSections = { ...prev };
                    Object.keys(parsedData).forEach(key => {
                        if (newSections[key]) {
                            newSections[key] = {
                                ...newSections[key],
                                input: parsedData[key].input || "",
                                output: parsedData[key].output || ""
                            };
                        }
                    });
                    return newSections;
                });
            } catch (e) {
                console.error("Gagal load draft:", e);
            }
        }
    }, [context?.id]);

    // --- AUTO-SAVE ---
    useEffect(() => {
        if (!context?.id) return;
        const dataToSave = {};
        Object.keys(sections).forEach(key => {
            dataToSave[key] = {
                input: sections[key].input,
                output: sections[key].output
            };
        });
        const storageKey = `onthesis_draft_bab1_${context.id} `;
        localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    }, [sections, context?.id]);

    // --- LIVE TYPING ---
    useEffect(() => {
        if (activeGenSection && isGenerating) {
            setSections(prev => ({
                ...prev,
                [activeGenSection]: { ...prev[activeGenSection], output: generatedContent }
            }));
        }
        // Trigger snapshot when generation completes
        if (activeGenSection && !isGenerating && generatedContent) {
            triggerSnapshot(context?.id, 'bab1', sections);
        }
    }, [generatedContent, isGenerating, activeGenSection]);

    // --- HANDLERS ---
    const handleInputChange = (key, val) => {
        setSections(prev => ({ ...prev, [key]: { ...prev[key], input: val } }));
    };

    const toggleExpand = (key) => {
        setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleResetSection = (key) => {
        if (window.confirm("Hapus draft bagian ini?")) {
            setSections(prev => ({
                ...prev,
                [key]: { ...prev[key], input: "", output: "" }
            }));
        }
    };

    const handleGenerateSection = (key) => {
        setActiveGenSection(key);
        setExpandedSections(prev => ({ ...prev, [key]: true }));

        let taskType = '';
        if (key === 'ideal') taskType = 'bab1_part_ideal';
        else if (key === 'factual') taskType = 'bab1_part_factual';
        else if (key === 'gap') taskType = 'bab1_part_gap';
        else if (key === 'solution') taskType = 'bab1_part_solution';
        else if (key === 'rumusan') taskType = 'bab1_rumusan';
        else if (key === 'tujuan') taskType = 'bab1_tujuan';

        if (['ideal', 'factual', 'gap', 'solution'].includes(key) && !sections[key].input.trim()) {
            addToast(`Tulis poin singkat dulu untuk ${sections[key].title}.`, 'error');
            return;
        }

        generateStream({
            task: taskType,
            projectId: context.id,
            context_title: context.title,
            context_problem: context.problem_statement,
            input_text: sections[key].input,
            word_count: (key === 'rumusan' || key === 'tujuan') ? "150" : "500"
        });
    };

    const handleInsertPart = (key) => {
        if (sections[key].output && onInsert) onInsert(sections[key].output);
    };

    return (
        <div className={cn("flex flex-col h-full font-sans text-[13px] border-l transition-colors duration-300", activeConfig.containerBg)}>

            {/* HEADER */}
            <div className={cn("border-b px-4 py-3 flex items-center justify-between shrink-0 sticky top-0 z-10", activeConfig.headerBg)}>
                <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-lg", activeConfig.iconBg)}>
                        <Wand2 size={14} />
                    </div>
                    <span className={cn("text-xs font-bold uppercase tracking-widest", activeConfig.textMain)}>
                        Bab 1 Builder
                    </span>
                </div>
                <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold", activeConfig.statusBadge)}>
                    <Save size={12} className={theme === 'happy' ? "text-orange-500" : "text-emerald-500"} /> Auto-Saved
                </div>
            </div>

            {/* RULE VIOLATIONS */}
            <RuleViolationBanner projectId={context?.id} chapter="bab1" />

            {/* SCROLLABLE LIST */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className={cn("divide-y", theme === 'dark' ? "divide-white/5" : "divide-black/5")}>

                    {Object.entries(sections).map(([key, section]) => {
                        const isExpanded = expandedSections[key];
                        const hasOutput = !!section.output;
                        const isWriting = activeGenSection === key && isGenerating;

                        return (
                            <div key={key} className="group transition-all duration-300">

                                {/* SECTION HEADER */}
                                <div
                                    onClick={() => toggleExpand(key)}
                                    className={cn(
                                        "px-4 py-3.5 cursor-pointer flex items-center justify-between transition-colors",
                                        isExpanded ? activeConfig.cardExpandedBg : [activeConfig.cardBg, activeConfig.cardHover]
                                    )}
                                >
                                    <div className="flex items-center gap-3.5">
                                        {/* Colored Icon Box */}
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

                                {/* SECTION BODY (EXPANDABLE) */}
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

                                            {/* FLOATING ACTIONS */}
                                            <div className="absolute bottom-2.5 right-2.5 flex gap-2 opacity-90 hover:opacity-100 transition-opacity">
                                                {/* Clear Draft */}
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
                                                        {section.output ? 'Re-Write' : 'Generate'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* OUTPUT PREVIEW */}
                                        {(hasOutput || isWriting) && (
                                            <div className={cn("mt-4 rounded-xl overflow-hidden border", activeConfig.outputBg)}>
                                                {/* Output Header */}
                                                <div className={cn("flex items-center justify-between px-4 py-2.5 border-b", activeConfig.outputHeader)}>
                                                    <span className={cn("text-[10px] font-bold uppercase flex items-center gap-2 tracking-widest", activeConfig.textMuted)}>
                                                        <div className={`w - 2 h - 2 rounded - full ${isWriting ? (theme === 'happy' ? 'bg-orange-400 animate-pulse' : 'bg-cyan-400 animate-pulse') : (theme === 'happy' ? 'bg-orange-500' : 'bg-emerald-500')} `}></div>
                                                        AI Generated Draft
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

                                                {/* Text Content */}
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

                {/* Spacer Bottom */}
                <div className="h-20"></div>
            </div>
        </div>
    );
};

export default Chapter1Generator;
