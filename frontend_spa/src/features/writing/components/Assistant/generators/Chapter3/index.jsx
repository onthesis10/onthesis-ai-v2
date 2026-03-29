import React, { useState, useEffect } from 'react';
import {
    Compass, MapPin, Users, Ruler, ClipboardList,
    ShieldCheck, Activity, GitCommit, Sparkles, RefreshCw,
    Database, FileText, ChevronDown, Binary, PenTool, Save, Library, Trash2, ArrowRight
} from 'lucide-react';
import useStreamGenerator from '../../../../hooks/useStreamGenerator';
import RuleViolationBanner from '../RuleViolationBanner';
import CitationValidatorBar from '../CitationValidatorBar';
import { useThemeStore } from '@/store/themeStore';
import { cn } from '@/lib/utils';
import { useToast } from '../../../UI/ToastProvider.jsx';

// --- HELPER FUNCTIONS (CONFIG) ---
const getSectionConfig = (mode) => {
    const isQ = mode === 'qualitative';

    return {
        approach: {
            title: "Jenis & Pendekatan",
            subtitle: isQ ? "Rasionalisasi Kualitatif" : "Desain Penelitian",
            icon: Compass, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20",
            placeholder: isQ
                ? "Jelaskan alasan memilih pendekatan Kualitatif dan jenis studi kasus/fenomenologi yang digunakan..."
                : "Jelaskan desain penelitian (misal: Quasi Experiment/Korelasional) dan alasan memilih pendekatan Kuantitatif...",
        },
        location: {
            title: "Lokasi & Waktu",
            subtitle: "Setting Penelitian",
            icon: MapPin, color: "text-sky-500", bg: "bg-sky-500/10", border: "border-sky-500/20",
            placeholder: "Deskripsikan lokasi penelitian (institusi/wilayah) dan rentang waktu pelaksanaan...",
        },
        population: {
            title: isQ ? "Fokus & Subjek" : "Populasi & Sampel",
            subtitle: isQ ? "Informan Kunci" : "Teknik Sampling",
            icon: Users, color: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/20",
            placeholder: isQ
                ? "Siapa informan kuncinya? Bagaimana teknik purposive sampling-nya?"
                : "Definisikan populasi, teknik sampling (Random/Stratified), dan rumus ukuran sampel (Slovin/Isaac)...",
        },
        operational: {
            title: isQ ? "Fokus Penelitian" : "Definisi Operasional",
            subtitle: isQ ? "Batasan Masalah" : "Variabel & Indikator",
            icon: Ruler, color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500/20",
            placeholder: isQ
                ? "Apa fokus masalah yang akan diteliti secara mendalam?"
                : "Sistem akan mengintegrasikan indikator dari Bab 2. Tambahkan detail cara ukur dan skala...",
        },
        instrument: {
            title: "Instrumen & Data",
            subtitle: isQ ? "Wawancara & Observasi" : "Angket, Tes & Kisi-kisi",
            icon: ClipboardList, color: "text-teal-500", bg: "bg-teal-500/10", border: "border-teal-500/20",
            placeholder: isQ
                ? "Jelaskan pedoman wawancara, catatan lapangan, dan dokumentasi..."
                : "Jelaskan spesifikasi instrumen (Angket/Tes) dan kisi-kisinya...",
        },
        validity: {
            title: isQ ? "Keabsahan Data" : "Validitas & Reliabilitas",
            subtitle: isQ ? "Triangulasi" : "Uji Statistik",
            icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20",
            placeholder: isQ
                ? "Jelaskan teknik triangulasi (sumber/metode) dan member check..."
                : "Uraikan prosedur uji validitas (Pearson) dan reliabilitas (Cronbach Alpha)...",
        },
        analysis: {
            title: "Teknik Analisis Data",
            subtitle: isQ ? "Model Miles & Huberman" : "Statistik Inferensial",
            icon: Activity, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20",
            placeholder: isQ
                ? "Jelaskan alur: Reduksi Data -> Display Data -> Verifikasi..."
                : "Uraikan uji prasyarat (Normalitas) dan uji hipotesis (T-test/Anova/Regresi)...",
        },
        procedure: {
            title: "Prosedur Penelitian",
            subtitle: "Tahapan Pelaksanaan",
            icon: GitCommit, color: "text-slate-500", bg: "bg-slate-500/10", border: "border-slate-500/20",
            placeholder: "Rincikan tahapan penelitian dari persiapan, pelaksanaan, hingga pelaporan...",
        }
    };
};

// --- MAIN COMPONENT ---
const Chapter3Generator = ({ context, onInsert }) => {
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
            iconBg: "bg-teal-100 text-teal-600",
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
            iconBg: "bg-teal-900/30 text-teal-400",
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

    // 1. SETUP ENGINE
    const projectMethod = context?.method || 'quantitative';
    const [methodMode, setMethodMode] = useState(projectMethod);
    const isQuali = methodMode === 'qualitative';

    // Depth Level
    const [lengthMode, setLengthMode] = useState('deep');

    // 2. STATE INITIALIZATION
    const [sections, setSections] = useState(() => {
        const config = getSectionConfig(projectMethod);
        const initial = {};
        Object.keys(config).forEach(key => {
            initial[key] = { ...config[key], input: "", output: "" };
        });
        return initial;
    });

    const [activeGenSection, setActiveGenSection] = useState(null);
    const [expandedSections, setExpandedSections] = useState({ approach: true });

    // Context Link
    const [ch2Draft, setCh2Draft] = useState("");

    const { generatedContent, isGenerating, generateStream, stopGeneration, triggerSnapshot } = useStreamGenerator();

    // --- EFFECTS ---
    useEffect(() => {
        const config = getSectionConfig(methodMode);
        setSections(prev => {
            const next = {};
            Object.keys(config).forEach(key => {
                next[key] = {
                    ...config[key],
                    input: prev[key]?.input || "",
                    output: prev[key]?.output || ""
                };
            });
            return next;
        });
    }, [methodMode]);

    useEffect(() => {
        if (!context?.id) return;
        const ch2Key = `onthesis_draft_bab2_${context.id}`;
        const ch2Data = localStorage.getItem(ch2Key);
        if (ch2Data) {
            try {
                const parsed = JSON.parse(ch2Data);
                const summary = `VARIABEL X: ${parsed.var_x?.output || '-'} \n VARIABEL Y: ${parsed.var_y?.output || '-'}`;
                setCh2Draft(summary);
            } catch (e) { }
        }
    }, [context?.id]);

    useEffect(() => {
        if (!context?.id) return;
        const key = `onthesis_draft_bab3_${context.id}`;
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
        localStorage.setItem(`onthesis_draft_bab3_${context.id}`, JSON.stringify(toSave));
    }, [sections, context?.id]);

    useEffect(() => {
        if (activeGenSection && isGenerating) {
            setSections(prev => ({
                ...prev, [activeGenSection]: { ...prev[activeGenSection], output: generatedContent }
            }));
        }
        if (activeGenSection && !isGenerating && generatedContent) {
            triggerSnapshot(context?.id, 'bab3', sections);
        }
    }, [generatedContent, isGenerating, activeGenSection]);

    // --- HANDLERS ---
    const getTargetWordCount = (key, level) => {
        const base = 180;
        const multiplier = level === 'deep' ? 1.5 : (level === 'killer' ? 2.5 : 1.0);
        if (key === 'operational' || key === 'instrument') return Math.round(base * 1.5 * multiplier).toString();
        return Math.round(base * multiplier).toString();
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
            addToast("Input poin-poin kunci terlebih dahulu.", 'error');
            return;
        }

        let taskType = '';
        if (key === 'approach') taskType = 'bab3_part_approach';
        else if (key === 'location') taskType = 'bab3_part_loc';
        else if (key === 'population') taskType = 'bab3_part_pop';
        else if (key === 'operational') taskType = 'bab3_part_var';
        else if (key === 'instrument') taskType = 'bab3_part_inst';
        else if (key === 'validity') taskType = 'bab3_part_val';
        else if (key === 'analysis') taskType = 'bab3_part_ana';
        else if (key === 'procedure') taskType = 'bab3_part_proc';

        generateStream({
            task: taskType,
            projectId: context.id,
            context_title: context.title,
            context_problem: context.problem_statement,
            input_text: sections[key].input,
            method_mode: methodMode,
            length_mode: lengthMode,
            word_count: getTargetWordCount(key, lengthMode),
            chapter2_summary: ch2Draft,
        });
    };

    const handleInsertPart = (key) => { if (sections[key].output && onInsert) onInsert(sections[key].output); };

    return (
        <div className={cn("flex flex-col h-full font-sans text-[13px] border-l transition-colors duration-300", activeConfig.containerBg)}>

            {/* 1. HEADER */}
            <div className={cn("border-b flex flex-col shrink-0 sticky top-0 z-20", activeConfig.headerBg)}>

                {/* Top Row: Title & Method Toggle */}
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-lg", activeConfig.iconBg)}>
                            <Database size={14} />
                        </div>
                        <span className={cn("text-xs font-bold uppercase tracking-widest", activeConfig.textMain)}>
                            Metodologi
                        </span>
                    </div>

                    {/* Method Switcher */}
                    <div className={cn("flex rounded-lg p-0.5 border", activeConfig.subHeaderBg)}>
                        <button
                            onClick={() => setMethodMode('quantitative')}
                            className={cn(
                                "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1.5",
                                !isQuali ? activeConfig.pillActive : activeConfig.pillInactive
                            )}
                        >
                            <Binary size={12} /> Kuantitatif
                        </button>
                        <button
                            onClick={() => setMethodMode('qualitative')}
                            className={cn(
                                "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1.5",
                                isQuali ? activeConfig.pillActive : activeConfig.pillInactive
                            )}
                        >
                            <PenTool size={12} /> Kualitatif
                        </button>
                    </div>
                </div>

                {/* Sub Header: Depth & Context Link */}
                <div className={cn("px-4 py-2 border-t flex items-center justify-between", activeConfig.subHeaderBg)}>

                    {/* Depth Slider */}
                    <div className="flex items-center gap-1">
                        {['standard', 'deep', 'killer'].map((level) => (
                            <button
                                key={level}
                                onClick={() => setLengthMode(level)}
                                className={cn(
                                    "px-2 py-0.5 rounded-md text-[9px] font-bold uppercase transition-all",
                                    lengthMode === level
                                        ? activeConfig.pillActive
                                        : activeConfig.pillInactive
                                )}
                            >
                                {level === 'standard' ? 'STD' : level === 'deep' ? 'DEEP' : 'KILLER'}
                            </button>
                        ))}
                    </div>

                    {/* Context Status */}
                    <div className="flex items-center gap-2">
                        <div className={cn("flex items-center gap-1.5 text-[10px]", activeConfig.textMuted)}>
                            <span className={cn("w-2 h-2 rounded-full shadow-sm", ch2Draft ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-red-500 shadow-red-500/50')}></span>
                            <span>{ch2Draft ? "Context Linked" : "No Context"}</span>
                        </div>
                        <div className={cn("h-3 w-px mx-1", theme === 'dark' ? "bg-white/10" : "bg-black/10")}></div>
                        <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-medium", activeConfig.statusBadge)}>
                            <Save size={10} className={theme === 'happy' ? "text-orange-500" : "text-emerald-500"} /> Auto-Saved
                        </div>
                    </div>
                </div>
            </div>

            {/* RULE VIOLATIONS */}
            <RuleViolationBanner projectId={context?.id} chapter="bab3" />

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
                                                        {section.output ? 'Regenerasi' : 'Generate'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* OUTPUT PREVIEW */}
                                        {(hasOutput || isWriting) && (
                                            <div className={cn("mt-4 rounded-xl overflow-hidden border", activeConfig.outputBg)}>
                                                <div className={cn("flex items-center justify-between px-4 py-2.5 border-b", activeConfig.outputHeader)}>
                                                    <span className={cn("text-[10px] font-bold uppercase flex items-center gap-2 tracking-widest", activeConfig.textMuted)}>
                                                        <FileText size={12} /> AI Metodologi Draft
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

export default Chapter3Generator;
