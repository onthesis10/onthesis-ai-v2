// FILE: src/components/Assistant/generators/Chapter1/index.jsx

import React, { useState, useEffect } from 'react';
import { 
    Zap, AlertTriangle, GitMerge, Lightbulb, 
    Sparkles, RefreshCw, ArrowRight, HelpCircle, Target,
    Trash2, ChevronDown, ChevronRight, Save, Wand2
} from 'lucide-react';
import useStreamGenerator from '../../../../hooks/useStreamGenerator';
import { useTheme } from '../../../../context/ThemeContext'; 

// --- STATIC CONFIG (Tetap Sama) ---
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
    const { theme } = useTheme(); 
    
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

    const { generatedContent, isGenerating, generateStream, stopGeneration } = useStreamGenerator();

    // --- AUTO-LOAD ---
    useEffect(() => {
        if (!context?.id) return;
        const storageKey = `onthesis_draft_bab1_${context.id}`;
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
        const storageKey = `onthesis_draft_bab1_${context.id}`;
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
    }, [generatedContent, isGenerating, activeGenSection]);

    // --- HANDLERS ---
    const handleInputChange = (key, val) => {
        setSections(prev => ({ ...prev, [key]: { ...prev[key], input: val } }));
    };

    const toggleExpand = (key) => {
        setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleResetSection = (key) => {
        if(window.confirm("Hapus draft bagian ini?")) {
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
            alert(`Tulis poin singkat dulu untuk ${sections[key].title}.`);
            return;
        }

        generateStream({
            task: taskType,
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
        // CONTAINER: Gray Theme (VS Code Style)
        <div className="flex flex-col h-full bg-white dark:bg-[#18181B] text-gray-800 dark:text-[#CCCCCC] font-sans text-[13px] border-l border-gray-200 dark:border-white/5 transition-colors duration-300">
            
            {/* HEADER: Clean & Flush */}
            <div className="border-b border-gray-200 dark:border-white/5 px-4 py-3 bg-white dark:bg-[#18181B] flex items-center justify-between shrink-0 sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400">
                        <Wand2 size={12} />
                    </div>
                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                        Bab 1 Builder
                    </span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-50 dark:bg-[#202023] border border-gray-200 dark:border-white/5 text-[9px] font-medium text-gray-400">
                    <Save size={10} className="text-emerald-500"/> Auto-Saved
                </div>
            </div>

            {/* SCROLLABLE LIST */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="divide-y divide-gray-100 dark:divide-white/5">
                    
                    {Object.entries(sections).map(([key, section]) => {
                        const isExpanded = expandedSections[key];
                        const hasOutput = !!section.output;
                        const isWriting = activeGenSection === key && isGenerating;

                        return (
                            <div key={key} className="group transition-all duration-300">
                                
                                {/* SECTION HEADER */}
                                <div 
                                    onClick={() => toggleExpand(key)}
                                    className={`px-4 py-3.5 cursor-pointer flex items-center justify-between transition-colors hover:bg-gray-50 dark:hover:bg-[#202023] ${
                                        isExpanded ? 'bg-gray-50 dark:bg-[#202023]' : 'bg-white dark:bg-[#18181B]'
                                    }`}
                                >
                                    <div className="flex items-center gap-3.5">
                                        {/* Colored Icon Box */}
                                        <div className={`p-1.5 rounded-md ${section.bg} ${section.color} border ${section.border} shadow-sm`}>
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
                                    <div className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-sky-500' : ''}`}>
                                        <ChevronDown size={14} />
                                    </div>
                                </div>

                                {/* SECTION BODY (EXPANDABLE) */}
                                {isExpanded && (
                                    <div className="px-4 pb-5 pt-1 bg-gray-50 dark:bg-[#202023] animate-in slide-in-from-top-1">
                                        
                                        {/* INPUT AREA (Gray/VSCode Style) */}
                                        <div className="relative group/input mt-1 shadow-sm">
                                            <textarea
                                                className="w-full bg-white dark:bg-[#18181B] border border-gray-200 dark:border-white/10 rounded-md px-3 py-3 text-[12px] text-gray-700 dark:text-gray-300 placeholder:text-gray-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 outline-none resize-none min-h-[90px] pb-10 transition-all leading-relaxed custom-scrollbar font-normal"
                                                placeholder={section.placeholder}
                                                value={section.input}
                                                onChange={(e) => handleInputChange(key, e.target.value)}
                                            />
                                            
                                            {/* FLOATING ACTIONS */}
                                            <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-90 hover:opacity-100 transition-opacity">
                                                {/* Clear Draft */}
                                                {(section.input || section.output) && !isWriting && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleResetSection(key); }}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-md transition-all"
                                                        title="Hapus Draft"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}

                                                {/* Generate Button (Ocean Blue Accent) */}
                                                {isWriting ? (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); stopGeneration(); }}
                                                        className="flex items-center gap-1.5 px-3 py-1 bg-red-50 dark:bg-red-900/10 text-red-500 border border-red-200 dark:border-red-900/30 rounded-md text-[10px] font-bold hover:bg-red-100 dark:hover:bg-red-900/20 transition-all cursor-pointer"
                                                    >
                                                        <RefreshCw size={10} className="animate-spin"/> Stop
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleGenerateSection(key); }}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-md text-[10px] font-bold transition-all shadow-sm active:scale-95 border border-sky-500"
                                                    >
                                                        <Sparkles size={11} fill="currentColor"/>
                                                        {section.output ? 'Re-Write' : 'Generate'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* OUTPUT PREVIEW */}
                                        {(hasOutput || isWriting) && (
                                            <div className="mt-4 border border-gray-200 dark:border-white/10 rounded-md overflow-hidden bg-white dark:bg-[#18181B] shadow-sm">
                                                {/* Output Header */}
                                                <div className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-[#252526] border-b border-gray-200 dark:border-white/5">
                                                    <span className="text-[9px] font-bold text-gray-500 uppercase flex items-center gap-1.5 tracking-wider">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${isWriting ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></div>
                                                        AI Generated Draft
                                                    </span>
                                                    
                                                    {!isWriting && (
                                                        <button 
                                                            onClick={() => handleInsertPart(key)}
                                                            className="flex items-center gap-1 text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                                                        >
                                                            Insert <ArrowRight size={12}/>
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Text Content */}
                                                <div className="p-4 max-h-[250px] overflow-y-auto custom-scrollbar">
                                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                                        <div 
                                                            className="text-[12px] leading-[1.7] text-gray-600 dark:text-gray-300 font-normal whitespace-pre-wrap font-sans"
                                                            dangerouslySetInnerHTML={{ __html: section.output }} 
                                                        />
                                                        {isWriting && <span className="inline-block w-1.5 h-3 bg-sky-500 ml-1 animate-pulse align-middle rounded-sm"/>}
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
                
                {/* Spacer Bottom */}
                <div className="h-16"></div>
            </div>
        </div>
    );
};

export default Chapter1Generator;