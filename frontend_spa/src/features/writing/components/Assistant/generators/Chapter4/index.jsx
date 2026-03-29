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
import RuleViolationBanner from '../RuleViolationBanner';
import CitationValidatorBar from '../CitationValidatorBar';
import { useThemeStore } from '@/store/themeStore';
import { cn } from '@/lib/utils';
import { useToast } from '../../../UI/ToastProvider.jsx';

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
            btnDiscussion: "bg-indigo-600 text-white shadow-md hover:opacity-90",
            btnDanger: "text-slate-400 hover:text-red-500 hover:bg-red-50",
            outputBg: "bg-white border-black/10 shadow-sm",
            outputHeader: "bg-slate-50 border-black/5",
            iconBg: "bg-sky-100 text-sky-600",
            statusBadge: "bg-white border-black/5 text-slate-500",
            pillActive: "bg-white text-blue-600 shadow-sm",
            pillInactive: "text-slate-400 hover:text-slate-600",
            dropdownBg: "bg-white border-black/10 shadow-xl",
            dropdownItem: "hover:bg-slate-50",
            dropdownActive: "bg-blue-50 text-blue-700",
            dropdownText: "text-slate-600",
            dropdownActiveText: "text-blue-700",
            pickDataBtn: "bg-white text-sky-600 border-sky-200 shadow-sm hover:bg-sky-50",
            linkedDot: "bg-emerald-500",
            unlinkedDot: "bg-red-500",
            linkedText: "text-emerald-600",
            divider: "bg-black/10",
            modalOverlay: "bg-white/90",
            modalBg: "bg-white border-black/10 shadow-xl",
            modalHeader: "bg-slate-50 border-black/5",
            modalItemBg: "bg-white border-black/5 hover:border-blue-500",
            modalItemTitle: "text-slate-700 group-hover:text-blue-600",
            modalItemSub: "text-slate-500",
            modalItemDate: "text-slate-300",
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
            btnDiscussion: "bg-indigo-500 text-white shadow-[0_0_15px_-3px_rgba(99,102,241,0.5)] hover:opacity-90",
            btnDanger: "text-slate-500 hover:text-red-400 hover:bg-red-500/10",
            outputBg: "bg-[#0B1120] border-white/10",
            outputHeader: "bg-[#1E293B] border-white/5",
            iconBg: "bg-sky-500/10 text-sky-400",
            statusBadge: "bg-black/20 border-white/5 text-slate-400",
            pillActive: "bg-[#2B2D31] text-cyan-400 shadow-sm",
            pillInactive: "text-slate-400 hover:text-slate-300",
            dropdownBg: "bg-[#1E293B] border-white/10 shadow-2xl",
            dropdownItem: "hover:bg-white/5",
            dropdownActive: "bg-cyan-500/10",
            dropdownText: "text-slate-400",
            dropdownActiveText: "text-cyan-300",
            pickDataBtn: "bg-[#1E293B] text-sky-400 border-sky-800 shadow-sm hover:bg-sky-900/20",
            linkedDot: "bg-emerald-400",
            unlinkedDot: "bg-red-500",
            linkedText: "text-emerald-400",
            divider: "bg-white/10",
            modalOverlay: "bg-[#0B1120]/90",
            modalBg: "bg-[#1E293B] border-white/10 shadow-2xl",
            modalHeader: "bg-black/20 border-white/5",
            modalItemBg: "bg-[#0B1120]/50 border-white/5 hover:border-cyan-500",
            modalItemTitle: "text-slate-200 group-hover:text-cyan-400",
            modalItemSub: "text-slate-400",
            modalItemDate: "text-slate-600",
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
            btnDiscussion: "bg-gradient-to-r from-indigo-400 to-purple-400 text-white shadow-lg shadow-indigo-500/20 hover:opacity-90",
            btnDanger: "text-stone-400 hover:text-red-500 hover:bg-red-50",
            outputBg: "bg-white border-orange-100 shadow-sm",
            outputHeader: "bg-orange-50/80 border-orange-100",
            iconBg: "bg-orange-100 text-orange-500",
            statusBadge: "bg-white border-orange-100 text-stone-500",
            pillActive: "bg-white text-orange-500 shadow-sm border border-orange-100",
            pillInactive: "text-stone-400 hover:text-stone-600",
            dropdownBg: "bg-white border-orange-100 shadow-xl",
            dropdownItem: "hover:bg-orange-50/50",
            dropdownActive: "bg-orange-50",
            dropdownText: "text-stone-500",
            dropdownActiveText: "text-orange-600",
            pickDataBtn: "bg-white text-orange-500 border-orange-200 shadow-sm hover:bg-orange-50",
            linkedDot: "bg-emerald-500",
            unlinkedDot: "bg-red-500",
            linkedText: "text-emerald-600",
            divider: "bg-orange-100",
            modalOverlay: "bg-white/90",
            modalBg: "bg-white border-orange-100 shadow-xl",
            modalHeader: "bg-orange-50/80 border-orange-100",
            modalItemBg: "bg-white border-orange-50 hover:border-orange-400",
            modalItemTitle: "text-stone-700 group-hover:text-orange-600",
            modalItemSub: "text-stone-500",
            modalItemDate: "text-stone-300",
        }
    }[theme || 'dark'];

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

    // Real Analysis Data
    const [analysisData, setAnalysisData] = useState([]);
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);

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

    const { generatedContent, isGenerating, generateStream, stopGeneration, triggerSnapshot } = useStreamGenerator();

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
        if (ch2) { try { const p = JSON.parse(ch2); setCh2Draft(`Teori: ${p.grand?.output || '-'} ${p.var_x?.output || '-'}`); } catch (e) { } }
        const ch3 = localStorage.getItem(`onthesis_draft_bab3_${context.id}`);
        if (ch3) { try { const p = JSON.parse(ch3); setCh3Draft(`Metode: ${p.approach?.output || '-'} ${p.analysis?.output || '-'}`); } catch (e) { } }
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
            } catch (e) { }
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
        if (activeGenSection && !isGenerating && generatedContent) {
            triggerSnapshot(context?.id, 'bab4', sections);
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
    const handleOpenPicker = async (key) => {
        setTargetSectionKey(key);
        setShowPicker(true);
        if (analysisData.length > 0) return; // already loaded
        setLoadingAnalysis(true);
        try {
            const items = [];

            // 1. Read from localStorage (where Analysis feature stores via zustand persist)
            try {
                const raw = localStorage.getItem('onthesis-analysis-storage');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    const history = parsed?.state?.analysisHistory || [];
                    history.forEach((entry, i) => {
                        const title = entry.title || `Analisis ${i + 1}`;
                        const type = entry.type || entry.analysisType || 'analysis';
                        // Build a readable data string from the entry
                        let dataStr = '';
                        if (entry.tables && entry.tables.length > 0) {
                            entry.tables.forEach(tbl => {
                                if (tbl.title) dataStr += `--- ${tbl.title} ---\n`;
                                if (tbl.headers && tbl.rows) {
                                    dataStr += tbl.headers.join('\t') + '\n';
                                    tbl.rows.forEach(row => { dataStr += row.join('\t') + '\n'; });
                                }
                                dataStr += '\n';
                            });
                        }
                        if (entry.interpretation) {
                            dataStr += `\nInterpretasi:\n${entry.interpretation}\n`;
                        }
                        if (entry.summary) {
                            dataStr += `\n${entry.summary}\n`;
                        }
                        // Fallback: stringify the whole entry if nothing structured found
                        if (!dataStr.trim()) {
                            const { id, userId, createdAt, timestamp, ...rest } = entry;
                            dataStr = JSON.stringify(rest, null, 2);
                        }
                        items.push({ id: entry.id || `hist-${i}`, title, data: dataStr.trim(), type });
                    });

                    // Also grab current analysisResult if exists
                    const current = parsed?.state?.analysisResult;
                    if (current) {
                        let curData = '';
                        if (current.tables && current.tables.length > 0) {
                            current.tables.forEach(tbl => {
                                if (tbl.title) curData += `--- ${tbl.title} ---\n`;
                                if (tbl.headers && tbl.rows) {
                                    curData += tbl.headers.join('\t') + '\n';
                                    tbl.rows.forEach(row => { curData += row.join('\t') + '\n'; });
                                }
                                curData += '\n';
                            });
                        }
                        if (current.interpretation) curData += `\nInterpretasi:\n${current.interpretation}\n`;
                        if (!curData.trim()) curData = JSON.stringify(current, null, 2);
                        items.unshift({ id: 'current', title: `📊 ${current.title || 'Hasil Analisis Aktif'}`, data: curData.trim(), type: current.type || 'active' });
                    }
                }
            } catch (parseErr) {
                console.warn('Failed to parse analysis localStorage:', parseErr);
            }

            // 2. Fallback: also try Research Graph API
            try {
                const projRes = await fetch(`/api/thesis-brain/graph/${context.id}`).then(r => r.json());
                if (projRes.status === 'success' && projRes.graph?.analysis_results) {
                    const ar = projRes.graph.analysis_results;
                    if (ar.descriptive && Object.keys(ar.descriptive).length > 0) {
                        items.push({ id: 'graph-desc', title: 'Graph: Statistik Deskriptif', data: JSON.stringify(ar.descriptive, null, 2), type: 'descriptive' });
                    }
                    if (ar.hypothesis_tests?.length > 0) {
                        ar.hypothesis_tests.forEach((ht, i) => {
                            items.push({ id: `graph-ht-${i}`, title: `Graph: Uji Hipotesis ${i + 1}`, data: JSON.stringify(ht, null, 2), type: 'hypothesis' });
                        });
                    }
                }
            } catch (apiErr) {
                console.warn('Graph API fallback failed:', apiErr);
            }

            setAnalysisData(items);
        } catch (err) {
            console.error('Failed to load analysis data:', err);
        } finally {
            setLoadingAnalysis(false);
        }
    };
    const handleSelectData = (data) => {
        if (targetSectionKey) setSections(prev => ({ ...prev, [targetSectionKey]: { ...prev[targetSectionKey], input: prev[targetSectionKey].input ? prev[targetSectionKey].input + '\n\n' + data : data } }));
        setShowPicker(false);
    };

    const handleResetSection = (key) => {
        if (window.confirm("Hapus draft?")) setSections(prev => ({ ...prev, [key]: { ...prev[key], input: "", output: "" } }));
    };

    const handleGenerateSection = (key) => {
        setActiveGenSection(key);
        setExpandedSections(prev => ({ ...prev, [key]: true }));

        if (!sections[key].input.trim()) {
            addToast("Input data kosong.", 'error');
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
            projectId: context.id,
            analysis_type: analysisMode,
            depth_level: lengthMode,
            input_text: sections[key].input,
            word_count: getTargetWordCount(key, lengthMode),
            chapter2_summary: ch2Draft,
            chapter3_summary: ch3Draft
        });
    };

    const handleInsertPart = (key) => { if (sections[key].output && onInsert) onInsert(sections[key].output); };

    const currentOption = ANALYSIS_OPTIONS.find(opt => opt.value === analysisMode) || ANALYSIS_OPTIONS[0];

    return (
        <div className={cn("flex flex-col h-full font-sans text-[13px] border-l transition-colors duration-300 relative", activeConfig.containerBg)}>

            {/* 1. HEADER */}
            <div className={cn("border-b flex flex-col shrink-0 sticky top-0 z-20", activeConfig.headerBg)}>

                {/* Top Row: Title & Custom Dropdown */}
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-lg", activeConfig.iconBg)}>
                            <Activity size={14} />
                        </div>
                        <span className={cn("text-xs font-bold uppercase tracking-widest", activeConfig.textMain)}>
                            Result & Discussion
                        </span>
                    </div>

                    {/* CUSTOM DROPDOWN */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className={cn(
                                "flex items-center gap-2 rounded-lg px-2.5 py-1.5 border transition-all cursor-pointer group",
                                activeConfig.subHeaderBg
                            )}
                        >
                            <currentOption.icon size={12} className={currentOption.color} />
                            <span className={cn("text-[10px] font-bold w-20 text-left", activeConfig.textMain)}>
                                {currentOption.label}
                            </span>
                            <ChevronDown size={10} className={cn("transition-transform duration-200", activeConfig.textMuted, isDropdownOpen ? 'rotate-180' : '')} />
                        </button>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <div className={cn("absolute top-full right-0 mt-1.5 w-40 rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 z-50 border", activeConfig.dropdownBg)}>
                                <div className="p-1">
                                    {ANALYSIS_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => { setAnalysisMode(opt.value); setIsDropdownOpen(false); }}
                                            className={cn(
                                                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors",
                                                analysisMode === opt.value ? activeConfig.dropdownActive : activeConfig.dropdownItem
                                            )}
                                        >
                                            <opt.icon size={12} className={opt.color} />
                                            <span className={cn("text-[10px] font-medium",
                                                analysisMode === opt.value ? activeConfig.dropdownActiveText : activeConfig.dropdownText
                                            )}>
                                                {opt.label}
                                            </span>
                                            {analysisMode === opt.value && <Check size={10} className="ml-auto text-current" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sub Header: Depth & Context Link */}
                <div className={cn("px-4 py-2 border-t flex items-center justify-between", activeConfig.subHeaderBg)}>
                    <div className="flex items-center gap-1">
                        {['standard', 'deep', 'killer'].map((level) => (
                            <button
                                key={level}
                                onClick={() => setLengthMode(level)}
                                className={cn(
                                    "px-2 py-0.5 rounded-md text-[9px] font-bold uppercase transition-all",
                                    lengthMode === level ? activeConfig.pillActive : activeConfig.pillInactive
                                )}
                            >
                                {level === 'standard' ? 'STD' : level.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <div className={cn("flex items-center gap-1.5 text-[10px]", activeConfig.textMuted)}>
                            <span className={cn("w-2 h-2 rounded-full", ch2Draft ? activeConfig.linkedDot : activeConfig.unlinkedDot)}></span>
                            <span>{ch2Draft ? "Linked" : "Unlinked"}</span>
                        </div>
                        <div className={cn("h-3 w-px mx-1", activeConfig.divider)}></div>
                        <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-medium", activeConfig.statusBadge)}>
                            <Save size={10} className={theme === 'happy' ? "text-orange-500" : "text-emerald-500"} /> Saved
                        </div>
                    </div>
                </div>
            </div>

            {/* RULE VIOLATIONS */}
            <RuleViolationBanner projectId={context?.id} chapter="bab4" />

            {/* 2. SCROLLABLE LIST */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className={cn("divide-y", theme === 'dark' ? "divide-white/5" : "divide-black/5")}>

                    {Object.entries(sections).map(([key, section]) => {
                        const isExpanded = expandedSections[key];
                        const isWriting = activeGenSection === key && isGenerating;
                        const hasOutput = !!section.output;
                        const isDiscussion = key === 'pembahasan';

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
                                            {section.needsData && (
                                                <div className="absolute top-2 right-2 z-10">
                                                    <button
                                                        onClick={() => handleOpenPicker(key)}
                                                        className={cn("flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-lg border transition-all", activeConfig.pickDataBtn)}
                                                    >
                                                        <History size={10} /> Pick Data
                                                    </button>
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
                                                {(section.input || section.output) && !isWriting && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleResetSection(key); }}
                                                        className={cn("p-1.5 rounded-lg transition-all", activeConfig.btnDanger)}
                                                        title="Hapus Draft"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}

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
                                                        className={cn("flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all border-transparent active:scale-95", isDiscussion ? activeConfig.btnDiscussion : activeConfig.btnPrimary)}
                                                    >
                                                        <Sparkles size={12} fill="currentColor" />
                                                        {section.output ? 'Regenerate' : 'Generate'}
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
                                                        AI Analysis Draft
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

            {/* 3. DATA PICKER MODAL */}
            {showPicker && (
                <div className={cn("absolute inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-4", activeConfig.modalOverlay)}>
                    <div className={cn("w-full max-w-[320px] rounded-2xl overflow-hidden animate-in zoom-in-95 border", activeConfig.modalBg)}>
                        <div className={cn("px-4 py-3 border-b flex justify-between items-center", activeConfig.modalHeader)}>
                            <h3 className={cn("text-[11px] font-bold flex gap-2 items-center", activeConfig.textMain)}>
                                <History size={12} /> Riwayat Analisis
                            </h3>
                            <button onClick={() => setShowPicker(false)} className={cn("hover:text-red-500 transition-colors", activeConfig.textMuted)}><X size={14} /></button>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                            {loadingAnalysis ? (
                                <div className={cn("text-center py-8 text-[10px]", activeConfig.textMuted)}>
                                    <RefreshCw size={16} className="animate-spin mx-auto mb-2 opacity-50" />
                                    Memuat data analisis...
                                </div>
                            ) : analysisData.length === 0 ? (
                                <div className={cn("text-center py-6 px-4", activeConfig.textMuted)}>
                                    <Database size={20} className="mx-auto mb-2 opacity-30" />
                                    <div className="text-[11px] font-bold mb-1">Belum Ada Data</div>
                                    <div className="text-[10px] leading-relaxed">Jalankan analisis di fitur Data Analysis lalu simpan ke project.</div>
                                </div>
                            ) : (
                                analysisData.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleSelectData(item.data)}
                                        className={cn("w-full text-left p-3 rounded-xl border group transition-all", activeConfig.modalItemBg)}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-bold uppercase",
                                                item.type === 'hypothesis' ? 'bg-indigo-100 text-indigo-600' :
                                                    item.type === 'narrative' ? 'bg-emerald-100 text-emerald-600' :
                                                        'bg-sky-100 text-sky-600'
                                            )}>{item.type}</span>
                                            <div className={cn("text-[11px] font-bold", activeConfig.modalItemTitle)}>{item.title}</div>
                                        </div>
                                        <div className={cn("text-[10px] line-clamp-2 mt-0.5 font-mono", activeConfig.modalItemSub)}>
                                            {item.data.slice(0, 120)}{item.data.length > 120 ? '...' : ''}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chapter4Generator;
