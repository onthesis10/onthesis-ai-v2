// FILE: src/components/Assistant/generators/Chapter2/index.jsx

import React, { useState, useEffect } from 'react';
import { 
    Layers, BookOpen, GitPullRequest, Sparkles, RefreshCw, 
    CheckCircle2, HelpCircle, Network, Gauge, 
    ChevronDown, ChevronRight, FileText, Database, Library,
    ArrowRight, Save, Trash2
} from 'lucide-react';
import useStreamGenerator from '../../../../hooks/useStreamGenerator';
import { useTheme } from '../../../../context/ThemeContext'; 

// --- HELPER CONFIG (OCEAN BLUE PALETTE) ---
const getSectionConfig = () => ({
    var_x: { 
        title: "Variabel X (Independen)", 
        subtitle: "Definisi & Karakteristik",
        // Ganti Blue standard
        icon: Layers, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20",
        placeholder: "Masukkan poin kunci: Definisi ahli, karakteristik, dan klasifikasi..."
    },
    var_y: { 
        title: "Variabel Y (Dependen)", 
        subtitle: "Teori & Indikator",
        // Ganti Indigo -> Sky (Ocean)
        icon: Layers, color: "text-sky-500", bg: "bg-sky-500/10", border: "border-sky-500/20",
        placeholder: "PENTING: Masukkan definisi & DIMENSI/INDIKATOR acuan instrumen..."
    },
    context: { 
        title: "Konteks Mata Pelajaran", 
        subtitle: "Hakikat & Tujuan",
        // Emerald (Sea Green)
        icon: BookOpen, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20",
        placeholder: "Jelaskan karakteristik mapel, tujuan, dan relevansinya..."
    },
    relation: { 
        title: "Penelitian Terdahulu", 
        subtitle: "State of the Art",
        // Amber (Sand/Contrast)
        icon: Network, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20",
        placeholder: "Review penelitian relevan. Jelaskan posisi (Novelty) dan hubungan..."
    },
    framework: { 
        title: "Kerangka Pemikiran", 
        subtitle: "Alur Logika",
        // Ganti Purple -> Cyan (Ocean)
        icon: GitPullRequest, color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500/20",
        placeholder: "Alur: Masalah (Awal) -> Solusi (Tindakan) -> Harapan (Akhir)..."
    },
    hypothesis: { 
        title: "Hipotesis Penelitian", 
        subtitle: "Jawaban Sementara",
        // Ganti Pink -> Teal (Ocean Deep)
        icon: HelpCircle, color: "text-teal-500", bg: "bg-teal-500/10", border: "border-teal-500/20",
        placeholder: "Rumuskan Hipotesis Alternatif (Ha) dan Hipotesis Nol (H0)..."
    }
});

const Chapter2Generator = ({ context, onInsert }) => {
    const { theme } = useTheme();
    const [lengthMode, setLengthMode] = useState('standard'); 
    const [sections, setSections] = useState(() => {
        const initial = getSectionConfig();
        Object.keys(initial).forEach(k => { initial[k].input = ""; initial[k].output = ""; });
        return initial;
    });
    const [activeGenSection, setActiveGenSection] = useState(null);
    const [expandedSections, setExpandedSections] = useState({ var_x: true, var_y: true });
    
    const hasReferences = context?.references && context.references.length > 0;
    const { generatedContent, isGenerating, generateStream, stopGeneration } = useStreamGenerator();

    // --- AUTO LOAD/SAVE ---
    useEffect(() => {
        if (!context?.id) return;
        const key = `onthesis_draft_bab2_${context.id}`;
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
        localStorage.setItem(`onthesis_draft_bab2_${context.id}`, JSON.stringify(toSave));
    }, [sections, context?.id]);

    // --- LIVE TYPING ---
    useEffect(() => {
        if (activeGenSection && isGenerating) {
            setSections(prev => ({
                ...prev, [activeGenSection]: { ...prev[activeGenSection], output: generatedContent }
            }));
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
        if(window.confirm("Reset bagian ini?")) {
            setSections(prev => ({ ...prev, [key]: { ...prev[key], input: "", output: "" } }));
        }
    };

    const handleGenerateSection = (key) => {
        setActiveGenSection(key);
        setExpandedSections(prev => ({ ...prev, [key]: true }));

        if (!sections[key].input.trim()) {
            alert("Isi poin dulu agar terarah.");
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
        // CONTAINER: Dark Mode Gray (#18181B) - Bukan Biru
        <div className="flex flex-col h-full bg-white dark:bg-[#18181B] text-gray-800 dark:text-[#CCCCCC] font-sans text-[13px] border-l border-gray-200 dark:border-white/5 transition-colors duration-300">
            
            {/* 1. HEADER (Flush & Integrated) */}
            <div className="border-b border-gray-200 dark:border-white/5 bg-white dark:bg-[#18181B] flex flex-col shrink-0 sticky top-0 z-20">
                {/* Title & Status */}
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* Icon Box: Blue Ocean */}
                        <div className="p-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                            <Database size={12} />
                        </div>
                        <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                            Literature Review
                        </span>
                    </div>
                    
                    {/* Depth Mode Selector (Small Pill) */}
                    <div className="flex bg-gray-100 dark:bg-[#202023] rounded-sm p-0.5 border border-gray-200 dark:border-white/5">
                        {['brief', 'standard', 'max'].map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setLengthMode(mode)}
                                className={`px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase transition-all ${
                                    lengthMode === mode 
                                    ? 'bg-white dark:bg-[#2B2D31] text-blue-600 dark:text-blue-400 shadow-sm' 
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                }`}
                            >
                                {mode === 'brief' ? 'STD' : mode === 'standard' ? 'DEEP' : 'KILLER'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Library Status Bar (Sub-header) */}
                <div className="px-4 py-1.5 bg-gray-50 dark:bg-[#202023] border-t border-gray-200 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
                        <Library size={10} className={hasReferences ? "text-emerald-500" : "text-amber-500"} />
                        <span className="font-medium">Library Link:</span>
                        {hasReferences 
                            ? <span className="text-emerald-600 dark:text-emerald-400 font-bold">{context.references.length} Refs Active</span> 
                            : <span className="text-amber-600 dark:text-amber-500 font-bold">No Data</span>
                        }
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-gray-400">
                        <Save size={10} className="text-emerald-500"/> Auto-Saved
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
                                        
                                        {/* INPUT AREA (Gray/Dark Gray) */}
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
                                                        {section.output ? 'Synthesis Again' : 'Synthesize'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* OUTPUT PREVIEW */}
                                        {(hasOutput || isWriting) && (
                                            <div className="mt-4 border border-gray-200 dark:border-white/10 rounded-md overflow-hidden bg-white dark:bg-[#18181B] shadow-sm">
                                                <div className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-[#252526] border-b border-gray-200 dark:border-white/5">
                                                    <span className="text-[9px] font-bold text-gray-500 uppercase flex items-center gap-1.5 tracking-wider">
                                                        <FileText size={10}/> AI Synthesis Draft
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

export default Chapter2Generator;