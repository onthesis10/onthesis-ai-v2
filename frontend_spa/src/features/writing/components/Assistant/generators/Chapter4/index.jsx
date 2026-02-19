// FILE: src/components/Assistant/generators/Chapter4/index.jsx

import React, { useState, useEffect, useRef } from 'react';
import { 
    BarChart2, Activity, FileText, GitMerge, 
    Sparkles, RefreshCw, CheckCircle2, Database, 
    ChevronDown, ChevronRight, TrendingUp, Microscope, 
    Link2, History, X, Gauge, Layers, FlaskConical, Binary, 
    Save, ArrowRight, Trash2, Library, Check
} from 'lucide-react';
import useStreamGenerator from '../../../../hooks/useStreamGenerator';
import { useTheme } from '../../../../context/ThemeContext'; 

// --- 1. HELPER FUNCTIONS ---

const resolveMode = (method) => {
    if (!method) return 'correlation';
    if (method === 'qualitative') return 'qualitative';
    if (method === 'ptk') return 'experiment';
    return 'correlation'; 
};

// Config Options untuk Dropdown
const ANALYSIS_OPTIONS = [
    { value: 'correlation', label: 'Korelasional', icon: Binary, color: 'text-blue-500' },
    { value: 'experiment', label: 'Eksperimen', icon: FlaskConical, color: 'text-pink-500' },
    { value: 'qualitative', label: 'Kualitatif', icon: FileText, color: 'text-amber-500' }
];

const getCardsByMode = (mode) => {
    const commonCards = {
        implication: { 
            title: "Implikasi & Keterbatasan", 
            subtitle: "Value Added", 
            icon: Layers, color: "text-slate-500", bg: "bg-slate-500/10", border: "border-slate-500/20",
            needsData: false, 
            placeholder: "Jelaskan keterbatasan penelitian (waktu/sampel) dan implikasi praktis bagi sekolah/masyarakat..." 
        }
    };

    if (mode === 'correlation') {
        return {
            objek: { title: "Gambaran Objek", subtitle: "Context Layer", icon: Database, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", needsData: false, placeholder: "Profil sekolah/instansi, Sejarah singkat, Karakteristik demografi responden..." },
            statistik: { title: "Deskripsi Data", subtitle: "Data Layer", icon: BarChart2, color: "text-sky-500", bg: "bg-sky-500/10", border: "border-sky-500/20", needsData: true, placeholder: "Output Statistik Deskriptif (Mean, Min, Max, SD) dan Distribusi Frekuensi..." },
            prasyarat: { title: "Uji Prasyarat", subtitle: "Validation Layer", icon: Activity, color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500/20", needsData: true, placeholder: "Output Uji Normalitas & Linieritas. Berapa nilai Sig-nya?" },
            hipotesis: { title: "Uji Hipotesis", subtitle: "Verdict Layer", icon: TrendingUp, color: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/20", needsData: true, placeholder: "Output Uji Korelasi/Regresi. Berapa nilai r / R Square dan Sig?" },
            pembahasan: { title: "Pembahasan", subtitle: "Theory Matcher", icon: GitMerge, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", needsData: false, placeholder: "Ringkasan temuan utama dikaitkan dengan Teori Bab 2..." },
            ...commonCards
        };
    }
    else if (mode === 'experiment') {
        return {
            subjek: { title: "Gambaran Subjek", subtitle: "Context Layer", icon: Database, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", needsData: false, placeholder: "Kondisi awal kelompok Kontrol dan Eksperimen..." },
            pretest: { title: "Data Pretest", subtitle: "Baseline Layer", icon: BarChart2, color: "text-sky-500", bg: "bg-sky-500/10", border: "border-sky-500/20", needsData: true, placeholder: "Data statistik Pretest..." },
            posttest: { title: "Data Posttest", subtitle: "Outcome Layer", icon: TrendingUp, color: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/20", needsData: true, placeholder: "Data statistik Posttest..." },
            prasyarat: { title: "Uji Prasyarat", subtitle: "Validation Layer", icon: Activity, color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500/20", needsData: true, placeholder: "Uji Normalitas & Homogenitas..." },
            hipotesis: { title: "Uji Perbedaan", subtitle: "Verdict Layer", icon: Microscope, color: "text-pink-500", bg: "bg-pink-500/10", border: "border-pink-500/20", needsData: true, placeholder: "Output Independent T-test / Paired / ANOVA..." },
            pembahasan: { title: "Pembahasan", subtitle: "Theory Matcher", icon: GitMerge, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", needsData: false, placeholder: "Analisis efektivitas..." },
            ...commonCards
        };
    }
    else { // Qualitative
        return {
            lokasi: { title: "Gambaran Lokasi", subtitle: "Context Layer", icon: Database, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", needsData: false, placeholder: "Deskripsi mendalam lokasi & informan..." },
            tema1: { title: "Temuan: Tema 1", subtitle: "Thick Description", icon: FileText, color: "text-sky-500", bg: "bg-sky-500/10", border: "border-sky-500/20", needsData: false, placeholder: "Transkrip/catatan lapangan Tema 1..." },
            tema2: { title: "Temuan: Tema 2", subtitle: "Thick Description", icon: FileText, color: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/20", needsData: false, placeholder: "Transkrip/catatan lapangan Tema 2..." },
            tema3: { title: "Temuan: Tema 3", subtitle: "Thick Description", icon: FileText, color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500/20", needsData: false, placeholder: "Transkrip/catatan lapangan Tema 3..." },
            pembahasan: { title: "Pembahasan", subtitle: "Theory Matcher", icon: GitMerge, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", needsData: false, placeholder: "Sintesis semua tema..." },
            ...commonCards
        };
    }
};

// --- MAIN COMPONENT ---
const Chapter4Generator = ({ context, onInsert }) => {
    const { theme } = useTheme(); 
    
    // 1. STATE CONFIG
    const projectMethod = context?.method || 'quantitative'; 
    const [analysisMode, setAnalysisMode] = useState(() => resolveMode(projectMethod));
    const [lengthMode, setLengthMode] = useState('deep'); 
    
    // UI State for Dropdown
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close Dropdown Click Outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Mock History
    const mockAnalysisHistory = context.analysis_history || [];

    // 2. CARD STATE
    const [sections, setSections] = useState(() => {
        const config = getCardsByMode(resolveMode(projectMethod));
        const initial = {};
        Object.keys(config).forEach(key => { initial[key] = { ...config[key], input: "", output: "" }; });
        return initial;
    });

    const [activeGenSection, setActiveGenSection] = useState(null);
    const [expandedSections, setExpandedSections] = useState({});
    const [showPicker, setShowPicker] = useState(false);
    const [targetSectionKey, setTargetSectionKey] = useState(null);
    
    const [ch2Draft, setCh2Draft] = useState("");
    const [ch3Draft, setCh3Draft] = useState("");

    const { generatedContent, isGenerating, generateStream, stopGeneration } = useStreamGenerator();

    // --- EFFECTS ---
    useEffect(() => {
        const config = getCardsByMode(analysisMode);
        setSections(prev => {
            const next = {};
            Object.keys(config).forEach(k => {
                next[k] = { ...config[k], input: prev[k]?.input || "", output: prev[k]?.output || "" };
            });
            return next;
        });
    }, [analysisMode]);

    useEffect(() => {
        if (!context?.id) return;
        const ch2 = localStorage.getItem(`onthesis_draft_bab2_${context.id}`);
        if (ch2) { try { const p = JSON.parse(ch2); setCh2Draft(`Teori: ${p.grand?.output || '-'} ${p.var_x?.output || '-'}`); } catch(e) {} }
        const ch3 = localStorage.getItem(`onthesis_draft_bab3_${context.id}`);
        if (ch3) { try { const p = JSON.parse(ch3); setCh3Draft(`Metode: ${p.approach?.output || '-'} ${p.analysis?.output || '-'}`); } catch(e) {} }
        const ch4 = localStorage.getItem(`onthesis_draft_bab4_${context.id}`);
        if (ch4) {
            try {
                const parsed = JSON.parse(ch4);
                setSections(prev => {
                    const next = { ...prev };
                    Object.keys(parsed).forEach(k => {
                        if (next[k]) { next[k].input = parsed[k].input; next[k].output = parsed[k].output; }
                    });
                    return next;
                });
            } catch(e) {}
        }
    }, [context?.id]);

    useEffect(() => {
        if (!context?.id) return;
        const toSave = {};
        Object.keys(sections).forEach(k => toSave[k] = { input: sections[k].input, output: sections[k].output });
        localStorage.setItem(`onthesis_draft_bab4_${context.id}`, JSON.stringify(toSave));
    }, [sections, context?.id]);

    useEffect(() => {
        if (activeGenSection && isGenerating) {
            setSections(prev => ({ ...prev, [activeGenSection]: { ...prev[activeGenSection], output: generatedContent } }));
        }
    }, [generatedContent, isGenerating, activeGenSection]);

    // --- HANDLERS ---
    const getTargetWordCount = (key, level) => {
        const base = 450; 
        const multiplier = level === 'deep' ? 1.5 : (level === 'killer' ? 2.2 : 1.0);
        if (key === 'pembahasan') return Math.round(900 * multiplier).toString();
        if (key === 'implication') return Math.round(500 * multiplier).toString();
        return Math.round(base * multiplier).toString();
    };

    const handleInputChange = (key, val) => setSections(prev => ({ ...prev, [key]: { ...prev[key], input: val } }));
    const toggleExpand = (key) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    const handleOpenPicker = (key) => { setTargetSectionKey(key); setShowPicker(true); };
    const handleSelectData = (data) => {
        if (targetSectionKey) setSections(prev => ({ ...prev, [targetSectionKey]: { ...prev[targetSectionKey], input: data } }));
        setShowPicker(false);
    };

    const handleResetSection = (key) => {
        if(window.confirm("Hapus draft?")) setSections(prev => ({ ...prev, [key]: { ...prev[key], input: "", output: "" } }));
    };

    const handleGenerateSection = (key) => {
        setActiveGenSection(key);
        setExpandedSections(prev => ({ ...prev, [key]: true }));

        if (!sections[key].input.trim()) {
            alert("Input data kosong.");
            return;
        }

        let taskType = 'bab4_part_descriptive'; 
        if (key === 'pembahasan') taskType = 'bab4_part_discussion';
        else if (key === 'implication') taskType = 'bab4_part_implication';
        else if (analysisMode === 'qualitative') {
            if (key === 'lokasi') taskType = 'bab4_part_object';
            else if (key.includes('tema')) taskType = 'bab4_part_qualitative';
        } 
        else { 
            if (key === 'objek' || key === 'subjek') taskType = 'bab4_part_object';
            else if (key === 'prasyarat') taskType = 'bab4_part_prerequisite';
            else if (key === 'hipotesis') taskType = 'bab4_part_hypothesis';
            else taskType = 'bab4_part_descriptive';
        }

        generateStream({
            task: taskType,
            analysis_type: analysisMode, 
            depth_level: lengthMode,
            input_text: sections[key].input,
            word_count: getTargetWordCount(key, lengthMode),
            chapter2_summary: ch2Draft,
            chapter3_summary: ch3Draft
        });
    };

    const handleInsertPart = (key) => { if (sections[key].output && onInsert) onInsert(sections[key].output); };
    
    // Helper Styles
    const getDepthColor = () => lengthMode === 'killer' ? 'text-red-500' : lengthMode === 'deep' ? 'text-blue-400' : 'text-emerald-400';
    const currentOption = ANALYSIS_OPTIONS.find(opt => opt.value === analysisMode) || ANALYSIS_OPTIONS[0];

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#18181B] text-gray-800 dark:text-[#CCCCCC] font-sans text-[13px] border-l border-gray-200 dark:border-white/5 transition-colors duration-300 relative">
            
            {/* 1. HEADER (Flush & Integrated) */}
            <div className="border-b border-gray-200 dark:border-white/5 bg-white dark:bg-[#18181B] flex flex-col shrink-0 sticky top-0 z-20">
                
                {/* Top Row: Title & Custom Dropdown */}
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400">
                            <Activity size={12} />
                        </div>
                        <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                            Result & Discussion
                        </span>
                    </div>

                    {/* CUSTOM DROPDOWN (PRO STYLE) */}
                    <div className="relative" ref={dropdownRef}>
                        <button 
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-2 bg-gray-50 dark:bg-[#202023] border border-gray-200 dark:border-white/10 rounded-sm px-2.5 py-1.5 hover:border-sky-500 dark:hover:border-sky-500 transition-all cursor-pointer group"
                        >
                            <currentOption.icon size={12} className={currentOption.color}/>
                            <span className="text-[10px] font-bold text-gray-700 dark:text-gray-200 w-20 text-left">
                                {currentOption.label}
                            </span>
                            <ChevronDown size={10} className={`text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}/>
                        </button>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <div className="absolute top-full right-0 mt-1.5 w-40 bg-white dark:bg-[#1C1E24] border border-gray-200 dark:border-white/10 rounded-md shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                <div className="p-1">
                                    {ANALYSIS_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => { setAnalysisMode(opt.value); setIsDropdownOpen(false); }}
                                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-sm text-left transition-colors ${
                                                analysisMode === opt.value 
                                                ? 'bg-sky-50 dark:bg-sky-900/20' 
                                                : 'hover:bg-gray-50 dark:hover:bg-[#252526]'
                                            }`}
                                        >
                                            <opt.icon size={12} className={opt.color} />
                                            <span className={`text-[10px] font-medium ${
                                                analysisMode === opt.value 
                                                ? 'text-sky-700 dark:text-sky-300' 
                                                : 'text-gray-600 dark:text-gray-400'
                                            }`}>
                                                {opt.label}
                                            </span>
                                            {analysisMode === opt.value && <Check size={10} className="ml-auto text-sky-500"/>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sub Header: Depth & Context Link */}
                <div className="px-4 py-1.5 bg-gray-50 dark:bg-[#1C1E24] border-t border-gray-200 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        {['standard', 'deep', 'killer'].map((level) => (
                            <button
                                key={level}
                                onClick={() => setLengthMode(level)}
                                className={`px-1.5 py-0.5 rounded-sm text-[9px] font-bold uppercase transition-all ${
                                    lengthMode === level 
                                    ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/10' 
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                }`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-[9px] text-gray-500 dark:text-gray-400">
                            <span className={`w-1.5 h-1.5 rounded-full ${ch2Draft ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                            <span>{ch2Draft ? "Linked" : "Unlinked"}</span>
                        </div>
                        <div className="h-3 w-px bg-gray-300 dark:bg-white/10 mx-1"></div>
                        <div className="flex items-center gap-1 text-[9px] text-gray-400">
                            <Save size={10} className="text-emerald-500"/> Saved
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
                        const isDiscussion = key === 'pembahasan';

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
                                    <div className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-sky-500' : ''}`}>
                                        <ChevronDown size={14} />
                                    </div>
                                </div>

                                {/* BODY */}
                                {isExpanded && (
                                    <div className="px-4 pb-5 pt-1 bg-gray-50 dark:bg-[#202023] animate-in slide-in-from-top-1">
                                        
                                        {/* INPUT AREA */}
                                        <div className="relative group/input mt-1 shadow-sm">
                                            {section.needsData && (
                                                <div className="absolute top-2 right-2 z-10">
                                                    <button 
                                                        onClick={() => handleOpenPicker(key)} 
                                                        className="flex items-center gap-1 text-[9px] font-bold text-sky-500 hover:text-sky-600 bg-white dark:bg-[#2B2D31] px-2 py-1 rounded-sm border border-sky-200 dark:border-sky-800 shadow-sm transition-all"
                                                    >
                                                        <History size={10} /> Pick Data
                                                    </button>
                                                </div>
                                            )}
                                            
                                            <textarea
                                                className="w-full bg-white dark:bg-[#18181B] border border-gray-200 dark:border-white/10 rounded-md px-3 py-3 text-[12px] text-gray-700 dark:text-gray-300 placeholder:text-gray-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 outline-none resize-none min-h-[90px] pb-10 transition-all leading-relaxed custom-scrollbar font-normal"
                                                placeholder={section.placeholder}
                                                value={section.input}
                                                onChange={(e) => handleInputChange(key, e.target.value)}
                                            />
                                            
                                            {/* ACTIONS */}
                                            <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-90 hover:opacity-100 transition-opacity">
                                                {(section.input || section.output) && !isWriting && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleResetSection(key); }}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-md transition-all"
                                                        title="Hapus Draft"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}

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
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-white rounded-md text-[10px] font-bold transition-all shadow-sm active:scale-95 border ${isDiscussion ? 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500' : 'bg-sky-600 hover:bg-sky-500 border-sky-500'}`}
                                                    >
                                                        <Sparkles size={11} fill="currentColor"/>
                                                        {section.output ? 'Regenerate' : 'Generate'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* OUTPUT PREVIEW */}
                                        {(hasOutput || isWriting) && (
                                            <div className="mt-4 border border-gray-200 dark:border-white/10 rounded-md overflow-hidden bg-white dark:bg-[#18181B] shadow-sm">
                                                <div className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-[#252526] border-b border-gray-200 dark:border-white/5">
                                                    <span className="text-[9px] font-bold text-gray-500 uppercase flex items-center gap-1.5 tracking-wider">
                                                        <FileText size={10}/> AI Analysis Draft
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
                <div className="h-16"></div>
            </div>

            {/* 3. DATA PICKER MODAL (Modern) */}
            {showPicker && (
                <div className="absolute inset-0 z-50 bg-white/90 dark:bg-[#0F1115]/90 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-[320px] bg-white dark:bg-[#18181B] border border-gray-200 dark:border-white/10 rounded-lg shadow-xl overflow-hidden animate-in zoom-in-95">
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50 dark:bg-[#202023]">
                            <h3 className="text-[11px] font-bold text-gray-700 dark:text-white flex gap-2 items-center">
                                <History size={12}/> Riwayat Analisis
                            </h3>
                            <button onClick={() => setShowPicker(false)} className="text-gray-400 hover:text-red-500"><X size={14}/></button>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                             {mockAnalysisHistory.length === 0 ? <div className="text-center py-6 text-[10px] text-gray-400">No Data Available</div> : 
                                mockAnalysisHistory.map(item => (
                                    <button 
                                        key={item.id} 
                                        onClick={() => handleSelectData(item.data)} 
                                        className="w-full text-left p-3 rounded-md bg-white dark:bg-[#1C1E24] border border-gray-100 dark:border-white/5 hover:border-sky-500 dark:hover:border-sky-500 group transition-all"
                                    >
                                        <div className="text-[11px] font-bold text-gray-700 dark:text-gray-200 group-hover:text-sky-600 dark:group-hover:text-sky-400">{item.title}</div>
                                        <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{item.data}</div>
                                        <div className="text-[9px] text-gray-300 dark:text-gray-600 mt-1">{item.date}</div>
                                    </button>
                                ))
                             }
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chapter4Generator;