// FILE: src/components/Assistant/generators/Chapter5/index.jsx

import React, { useState, useEffect } from 'react';
import { 
    Award, BookOpen, Lightbulb, Sparkles, RefreshCw, 
    CheckCircle2, FileText, ChevronDown, ChevronRight,
    Gauge, Link2, Target, Zap, AlertCircle, Save, ArrowRight, Trash2
} from 'lucide-react';
import useStreamGenerator from '../../../../hooks/useStreamGenerator';
import { useTheme } from '../../../../context/ThemeContext'; 

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
    const { theme } = useTheme(); 
    
    // 1. SETUP ENGINE
    const [lengthMode, setLengthMode] = useState('standard'); 

    // 2. STATE
    const [sections, setSections] = useState(() => getSectionConfig());
    const [activeGenSection, setActiveGenSection] = useState(null);
    const [expandedSections, setExpandedSections] = useState({ conclusion: true });

    // Context Data
    const [problemStatement, setProblemStatement] = useState("");
    const [findingsSummary, setFindingsSummary] = useState("");
    
    const { generatedContent, isGenerating, generateStream, stopGeneration } = useStreamGenerator();

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
            } catch (e) {}
        }
        const ch4 = localStorage.getItem(`onthesis_draft_bab4_${context.id}`);
        if (ch4) {
            try {
                const parsed = JSON.parse(ch4);
                const hipotesis = parsed.hipotesis?.output || ""; 
                const pembahasan = parsed.pembahasan?.output || "";
                const summary = `KEPUTUSAN HIPOTESIS: ${hipotesis}\n\nINTISARI PEMBAHASAN: ${pembahasan}`;
                setFindingsSummary(summary.substring(0, 1500)); 
            } catch (e) {}
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
            } catch (e) {}
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
        if(window.confirm("Reset draft?")) setSections(prev => ({ ...prev, [key]: { ...prev[key], input: "", output: "" } }));
    };

    const handleGenerateSection = (key) => {
        setActiveGenSection(key);
        setExpandedSections(prev => ({ ...prev, [key]: true }));

        if (key === 'conclusion' && !problemStatement && !sections[key].input.trim()) {
            alert("Rumusan masalah tidak ditemukan. Isi manual.");
            return;
        }

        let taskType = '';
        if (key === 'conclusion') taskType = 'bab5_part_conclusion';
        else if (key === 'implication') taskType = 'bab5_part_implication';
        else if (key === 'suggestion') taskType = 'bab5_part_suggestion';

        generateStream({
            task: taskType,
            context_title: context.title,
            input_text: sections[key].input, 
            depth_level: lengthMode,
            word_count: getTargetWordCount(key, lengthMode),
            chapter1_problem: problemStatement, 
            chapter4_summary: findingsSummary
        });
    };

    const handleInsertPart = (key) => { if (sections[key].output && onInsert) onInsert(sections[key].output); };

    // System Status Logic
    const isReady = problemStatement && findingsSummary;

    return (
        // CONTAINER: Flush, Theme Aware (VS Code Style)
        <div className="flex flex-col h-full bg-white dark:bg-[#18181B] text-gray-800 dark:text-[#CCCCCC] font-sans text-[13px] border-l border-gray-200 dark:border-white/5 transition-colors duration-300 relative">
            
            {/* 1. HEADER (Flush & Integrated) */}
            <div className="border-b border-gray-200 dark:border-white/5 bg-white dark:bg-[#18181B] flex flex-col shrink-0 sticky top-0 z-20">
                
                {/* Top Row: Title */}
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                            <Award size={12} />
                        </div>
                        <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                            Kesimpulan & Saran
                        </span>
                    </div>

                    {/* Depth Mode Selector (Small Pill) */}
                    <div className="flex bg-gray-100 dark:bg-[#202023] rounded-sm p-0.5 border border-gray-200 dark:border-white/5">
                        {['standard', 'deep', 'killer'].map((level) => (
                            <button
                                key={level}
                                onClick={() => setLengthMode(level)}
                                className={`px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase transition-all ${
                                    lengthMode === level 
                                    ? 'bg-white dark:bg-[#2B2D31] text-amber-600 dark:text-amber-400 shadow-sm' 
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                }`}
                            >
                                {level === 'standard' ? 'STD' : level === 'deep' ? 'DEEP' : 'KILLER'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* System Status Bar */}
                <div className="px-4 py-1.5 bg-gray-50 dark:bg-[#202023] border-t border-gray-200 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[9px]">
                        <span className="text-gray-500 dark:text-gray-400 font-medium">Context Check:</span>
                        <div className="flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${problemStatement ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                            <span className={problemStatement ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"}>Rumusan</span>
                        </div>
                        <span className="text-gray-300 dark:text-gray-600">|</span>
                        <div className="flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${findingsSummary ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                            <span className={findingsSummary ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"}>Hipotesis</span>
                        </div>
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
                                    <div className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-amber-500' : ''}`}>
                                        <ChevronDown size={14} />
                                    </div>
                                </div>

                                {/* BODY */}
                                {isExpanded && (
                                    <div className="px-4 pb-5 pt-1 bg-gray-50 dark:bg-[#202023] animate-in slide-in-from-top-1">
                                        
                                        {/* INPUT AREA */}
                                        <div className="relative group/input mt-1 shadow-sm">
                                            {/* Smart Context Indicator */}
                                            {key === 'conclusion' && problemStatement && (
                                                <div className="absolute top-2 right-2 z-10 px-2 py-1 bg-white dark:bg-[#2B2D31] border border-gray-200 dark:border-white/10 rounded-sm text-[9px] text-gray-500 dark:text-gray-400 flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity cursor-help" title={problemStatement}>
                                                    <Target size={10} className="text-emerald-500"/>
                                                    <span className="truncate max-w-[100px]">Matching Problem</span>
                                                </div>
                                            )}

                                            <textarea
                                                className="w-full bg-white dark:bg-[#18181B] border border-gray-200 dark:border-white/10 rounded-md px-3 py-3 text-[12px] text-gray-700 dark:text-gray-300 placeholder:text-gray-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none resize-none min-h-[90px] pb-10 transition-all leading-relaxed custom-scrollbar font-normal"
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
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}

                                                {/* Generate Button (Amber Theme) */}
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
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-md text-[10px] font-bold transition-all shadow-sm active:scale-95 border border-amber-500"
                                                    >
                                                        <Sparkles size={11} fill="currentColor"/>
                                                        {section.output ? 'Verdict Again' : 'Verdict'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* OUTPUT PREVIEW */}
                                        {(hasOutput || isWriting) && (
                                            <div className="mt-4 border border-gray-200 dark:border-white/10 rounded-md overflow-hidden bg-white dark:bg-[#18181B] shadow-sm">
                                                <div className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-[#252526] border-b border-gray-200 dark:border-white/5">
                                                    <span className="text-[9px] font-bold text-gray-500 uppercase flex items-center gap-1.5 tracking-wider">
                                                        <FileText size={10}/> AI Verdict Draft
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
                                                        {isWriting && <span className="inline-block w-1.5 h-3 bg-amber-500 ml-1 animate-pulse align-middle rounded-sm"/>}
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

export default Chapter5Generator;