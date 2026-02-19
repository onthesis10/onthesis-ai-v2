// FILE: src/components/Assistant/generators/Chapter3/index.jsx

import React, { useState, useEffect } from 'react';
import { 
    Compass, MapPin, Users, Ruler, ClipboardList, 
    ShieldCheck, Activity, GitCommit, Sparkles, RefreshCw, 
    CheckCircle2, Database, FileText, ChevronDown, ChevronRight,
    Gauge, Binary, PenTool, Save, Library, Trash2, ArrowRight
} from 'lucide-react';
import useStreamGenerator from '../../../../hooks/useStreamGenerator';
import { useTheme } from '../../../../context/ThemeContext'; 

// --- HELPER FUNCTIONS (CONFIG) ---
// Config Kartu (Polymorphic: Kuanti vs Kuali)
const getSectionConfig = (mode) => {
    const isQ = mode === 'qualitative';
    
    // Ocean Palette: Blue, Sky, Cyan, Teal, Emerald
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
    const { theme } = useTheme(); 
    
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
    
    const { generatedContent, isGenerating, generateStream, stopGeneration } = useStreamGenerator();

    // --- EFFECTS ---
    // A. Update Cards when Method Changes
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

    // B. Load Context
    useEffect(() => {
        if (!context?.id) return;
        const ch2Key = `onthesis_draft_bab2_${context.id}`;
        const ch2Data = localStorage.getItem(ch2Key);
        if (ch2Data) {
            try {
                const parsed = JSON.parse(ch2Data);
                const summary = `VARIABEL X: ${parsed.var_x?.output || '-'} \n VARIABEL Y: ${parsed.var_y?.output || '-'}`;
                setCh2Draft(summary);
            } catch (e) {}
        }
    }, [context?.id]);

    // C. Auto Save/Load
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
            } catch (e) {}
        }
    }, [context?.id]);

    useEffect(() => {
        if (!context?.id) return;
        const toSave = {};
        Object.keys(sections).forEach(k => toSave[k] = { input: sections[k].input, output: sections[k].output });
        localStorage.setItem(`onthesis_draft_bab3_${context.id}`, JSON.stringify(toSave));
    }, [sections, context?.id]);

    // D. Live Typing
    useEffect(() => {
        if (activeGenSection && isGenerating) {
            setSections(prev => ({
                ...prev, [activeGenSection]: { ...prev[activeGenSection], output: generatedContent }
            }));
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
        if(window.confirm("Reset bagian ini?")) {
            setSections(prev => ({ ...prev, [key]: { ...prev[key], input: "", output: "" } }));
        }
    };

    const handleGenerateSection = (key) => {
        setActiveGenSection(key);
        setExpandedSections(prev => ({ ...prev, [key]: true }));

        if (!sections[key].input.trim()) {
            alert("Input poin-poin kunci terlebih dahulu.");
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
        // CONTAINER: Flush, Theme Aware (VS Code Style)
        <div className="flex flex-col h-full bg-white dark:bg-[#18181B] text-gray-800 dark:text-[#CCCCCC] font-sans text-[13px] border-l border-gray-200 dark:border-white/5 transition-colors duration-300">
            
            {/* 1. HEADER (Integrated & Flush) */}
            <div className="border-b border-gray-200 dark:border-white/5 bg-white dark:bg-[#18181B] flex flex-col shrink-0 sticky top-0 z-20">
                
                {/* Top Row: Title & Method Toggle */}
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                            <Database size={12} />
                        </div>
                        <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                            Metodologi
                        </span>
                    </div>

                    {/* Method Switcher */}
                    <div className="flex bg-gray-100 dark:bg-[#202023] rounded-sm p-0.5 border border-gray-200 dark:border-white/5">
                        <button 
                            onClick={() => setMethodMode('quantitative')}
                            className={`px-2 py-0.5 rounded-sm text-[9px] font-bold transition-all flex items-center gap-1 ${
                                !isQuali ? 'bg-white dark:bg-[#2B2D31] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}
                        >
                            <Binary size={10} /> Kuantitatif
                        </button>
                        <button 
                            onClick={() => setMethodMode('qualitative')}
                            className={`px-2 py-0.5 rounded-sm text-[9px] font-bold transition-all flex items-center gap-1 ${
                                isQuali ? 'bg-white dark:bg-[#2B2D31] text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}
                        >
                            <PenTool size={10} /> Kualitatif
                        </button>
                    </div>
                </div>

                {/* Sub Header: Depth & Context Link */}
                <div className="px-4 py-1.5 bg-gray-50 dark:bg-[#1C1E24] border-t border-gray-200 dark:border-white/5 flex items-center justify-between">
                    
                    {/* Depth Slider */}
                    <div className="flex items-center gap-1">
                        {['standard', 'deep', 'killer'].map((level) => (
                            <button
                                key={level}
                                onClick={() => setLengthMode(level)}
                                className={`px-1.5 py-0.5 rounded-sm text-[9px] font-bold uppercase transition-all ${
                                    lengthMode === level 
                                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10' 
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                }`}
                            >
                                {level === 'standard' ? 'STD' : level === 'deep' ? 'DEEP' : 'KILLER'}
                            </button>
                        ))}
                    </div>

                    {/* Context Status */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-[9px] text-gray-500 dark:text-gray-400">
                            <span className={`w-1.5 h-1.5 rounded-full ${ch2Draft ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                            <span>{ch2Draft ? "Context Linked" : "No Context"}</span>
                        </div>
                        <div className="h-3 w-px bg-gray-300 dark:bg-white/10 mx-1"></div>
                        <div className="flex items-center gap-1 text-[9px] text-gray-400">
                            <Save size={10} className="text-emerald-500"/> Auto-Saved
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. SCROLLABLE LIST */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="divide-y divide-gray-100 dark:divide-white/5">
                    
                    {Object.entries(sections).map(([key, section]) => {
                        const isExpanded = expandedSections[key];
                        const isWriting = activeGenSection === key && isGenerating;
                        const hasOutput = !!section.output;

                        return (
                            <div key={key} className="group transition-all">
                                
                                {/* HEADER */}
                                <div 
                                    onClick={() => toggleExpand(key)}
                                    className={`px-4 py-3.5 cursor-pointer flex items-center justify-between transition-colors hover:bg-gray-50 dark:hover:bg-[#202023] ${
                                        isExpanded ? 'bg-gray-50 dark:bg-[#202023]' : 'bg-white dark:bg-[#18181B]'
                                    }`}
                                >
                                    <div className="flex items-center gap-3.5">
                                        <div className={`p-1.5 rounded-md ${section.bg} ${section.color} border ${section.border}`}>
                                            <section.icon size={14} strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <div className="text-[12px] font-bold text-gray-800 dark:text-gray-200 leading-none mb-1">
                                                {section.title}
                                            </div>
                                            <div className="text-[10px] text-gray-500 dark:text-gray-400 font-medium opacity-80">
                                                {section.subtitle}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-blue-500' : ''}`}>
                                        <ChevronDown size={14} />
                                    </div>
                                </div>

                                {/* BODY */}
                                {isExpanded && (
                                    <div className="px-4 pb-5 pt-1 bg-gray-50 dark:bg-[#202023] animate-in slide-in-from-top-1">
                                        
                                        {/* INPUT AREA */}
                                        <div className="relative group/input mt-1 shadow-sm">
                                            <textarea
                                                className="w-full bg-white dark:bg-[#18181B] border border-gray-200 dark:border-white/10 rounded-md px-3 py-3 text-[12px] text-gray-700 dark:text-gray-300 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none resize-none min-h-[90px] pb-10 transition-all leading-relaxed custom-scrollbar font-normal"
                                                placeholder={section.placeholder}
                                                value={section.input}
                                                onChange={(e) => handleInputChange(key, e.target.value)}
                                            />
                                            
                                            {/* ACTIONS */}
                                            <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-90 hover:opacity-100 transition-opacity">
                                                {/* Clear */}
                                                {(section.input || section.output) && !isWriting && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleResetSection(key); }}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-md transition-all"
                                                        title="Hapus Draft"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}

                                                {/* Generate Button (Ocean Blue) */}
                                                {isWriting ? (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); stopGeneration(); }}
                                                        className="flex items-center gap-1.5 px-3 py-1 bg-red-50 dark:bg-red-900/10 text-red-500 border border-red-200 dark:border-red-900/30 rounded-md text-[10px] font-bold hover:bg-red-100 dark:hover:bg-red-900/20 transition-all"
                                                    >
                                                        <RefreshCw size={10} className="animate-spin"/> Stop
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleGenerateSection(key); }}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-[10px] font-bold transition-all shadow-sm active:scale-95 border border-blue-500"
                                                    >
                                                        <Sparkles size={11} fill="currentColor"/>
                                                        {section.output ? 'Regenerasi' : 'Generate'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* OUTPUT PREVIEW */}
                                        {(hasOutput || isWriting) && (
                                            <div className="mt-4 border border-gray-200 dark:border-white/10 rounded-md overflow-hidden bg-white dark:bg-[#18181B] shadow-sm">
                                                <div className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-[#252526] border-b border-gray-200 dark:border-white/5">
                                                    <span className="text-[9px] font-bold text-gray-500 uppercase flex items-center gap-1.5 tracking-wider">
                                                        <FileText size={10}/> AI Metodologi Draft
                                                    </span>
                                                    
                                                    {!isWriting && (
                                                        <button 
                                                            onClick={() => handleInsertPart(key)}
                                                            className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                                                        >
                                                            Insert <ArrowRight size={12}/>
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="p-4 max-h-[250px] overflow-y-auto custom-scrollbar">
                                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                                        <div 
                                                            className="text-[12px] leading-[1.7] text-gray-600 dark:text-gray-300 font-normal whitespace-pre-wrap font-sans"
                                                            dangerouslySetInnerHTML={{ __html: section.output }} 
                                                        />
                                                        {isWriting && <span className="inline-block w-1.5 h-3 bg-blue-500 ml-1 animate-pulse align-middle rounded-sm"/>}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="h-16"></div>
            </div>
        </div>
    );
};

export default Chapter3Generator;