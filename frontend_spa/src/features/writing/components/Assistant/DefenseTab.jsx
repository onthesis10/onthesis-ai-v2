// FILE: src/components/Assistant/DefenseTab.jsx

import React, { useState, useRef, useEffect } from 'react';
import { 
    MessageSquare, Play, RefreshCw, User, 
    ShieldAlert, Award, StopCircle, Lock, Zap, BookOpen, 
    Send, Sparkles
} from 'lucide-react';

import { useProject } from '../../context/ProjectContext.jsx';
import { api } from '../../api/client.js';
import { useTheme } from '../../context/ThemeContext.jsx'; // Theme Aware

const DefenseTab = () => {
    const { project, isPro, setShowUpgradeModal } = useProject();
    const { theme } = useTheme();
    
    // --- STATE ---
    const [messages, setMessages] = useState([]);
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [feedbackReport, setFeedbackReport] = useState(null);
    
    // Config
    const [examinerType, setExaminerType] = useState('critical'); 
    const [difficulty, setDifficulty] = useState('hard'); 
    
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Auto Scroll
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    useEffect(() => scrollToBottom(), [messages]);

    // Focus Input
    useEffect(() => {
        if(isSessionActive) setTimeout(() => inputRef.current?.focus(), 100);
    }, [isSessionActive]);

    // --- LOGIC: START ---
    const startSession = async () => {
        if (!isPro && (difficulty === 'extreme' || examinerType === 'critical')) {
            setShowUpgradeModal && setShowUpgradeModal(true);
            return;
        }

        setIsSessionActive(true);
        setFeedbackReport(null);
        setMessages([
            { 
                role: 'system', 
                content: `SIDANG DIBUKA. PENGUJI: ${getExaminerName(examinerType).toUpperCase()}.`,
                type: 'info'
            }
        ]);
        
        setIsLoading(true);
        try {
            const res = await api.post('/api/defense/start', {
                examiner_type: examinerType,
                difficulty: difficulty,
                project_context: {
                    title: project?.title,
                    problem: project?.problem_statement,
                    method: project?.methodology
                }
            });
            const msg = res?.response?.message || res?.message || "Silakan perkenalkan diri Anda.";
            setMessages(prev => [...prev, { role: 'assistant', content: msg }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'system', content: "Gagal terhubung ke Dosen AI.", type: 'error' }]);
            setIsSessionActive(false);
        } finally {
            setIsLoading(false);
        }
    };

    // --- LOGIC: CHAT ---
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        try {
            const res = await api.post('/api/defense/answer', {
                answer: userMsg,
                history: messages.filter(m => m.role !== 'system'),
                examiner_type: examinerType
            });
            const rawMsg = res?.response?.message || res?.message;
            const dosenResponse = rawMsg || "Maaf, bisa ulangi?"; 
            setMessages(prev => [...prev, { role: 'assistant', content: dosenResponse }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'system', content: "Koneksi terputus.", type: 'error' }]);
        } finally {
            setIsLoading(false);
        }
    };

    // --- LOGIC: END ---
    const endSession = async () => {
        if (messages.length < 3) {
            setIsSessionActive(false);
            return;
        }
        setIsLoading(true);
        try {
            const res = await api.post('/api/defense/evaluate', {
                history: messages.filter(m => m.role !== 'system')
            });
            const reportData = res?.response || res?.report || res;
            if (reportData && (reportData.score || reportData.verdict)) {
                setFeedbackReport(reportData);
            } else {
                setFeedbackReport({ score: 0, verdict: "Error", advice: "Gagal evaluasi." });
            }
            setIsSessionActive(false);
        } catch (error) {
            setIsSessionActive(false);
        } finally {
            setIsLoading(false);
        }
    };

    const getExaminerName = (type) => {
        switch(type) {
            case 'critical': return "Prof. Killer";
            case 'methodologist': return "Dr. Metodologi";
            default: return "Dosen Pembimbing";
        }
    };

    return (
        // CONTAINER: Full Flush, Theme Aware
        <div className="h-full flex flex-col bg-white dark:bg-[#18181B] text-gray-800 dark:text-[#CCCCCC] font-sans text-[13px] border-l border-gray-200 dark:border-white/5 relative overflow-hidden transition-colors duration-300">
            
            {/* 1. HEADER (Minimalist) */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#18181B] flex justify-between items-center shrink-0">
                <div>
                    <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <ShieldAlert size={12} className="text-red-500" />
                        Defense Simulator
                    </h3>
                </div>
                {isSessionActive && (
                    <button 
                        onClick={endSession}
                        className="px-2 py-1 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-sm border border-red-200 dark:border-red-900/30 transition-all flex items-center gap-1.5"
                    >
                        <StopCircle size={12}/> Stop & Grade
                    </button>
                )}
            </div>

            {/* 2. CONTENT AREA */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                
                {/* A. CONFIGURATION MENU (PRE-SESSION) */}
                {!isSessionActive && !feedbackReport && (
                    <div className="p-6 max-w-sm mx-auto">
                        <div className="text-center mb-6">
                            <h2 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wide">Pilih Penguji</h2>
                            <p className="text-[11px] text-gray-500 mt-1">Simulasi sidang skripsi AI.</p>
                        </div>

                        {/* Examiner List */}
                        <div className="space-y-2 mb-6">
                            {[
                                { id: 'critical', label: 'PROF. KILLER', desc: 'Tajam & Kritis', icon: Zap, color: 'text-red-500' },
                                { id: 'methodologist', label: 'DR. METODOLOGI', desc: 'Validitas Data', icon: BookOpen, color: 'text-blue-500' },
                                { id: 'supportive', label: 'DOSEN PEMBIMBING', desc: 'Latihan Santai', icon: User, color: 'text-emerald-500' }
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setExaminerType(item.id)}
                                    className={`w-full relative flex items-center gap-3 p-3 rounded-md border transition-all text-left group ${
                                        examinerType === item.id 
                                        ? 'bg-gray-50 dark:bg-[#202023] border-gray-300 dark:border-white/20 ring-1 ring-gray-200 dark:ring-white/10' 
                                        : 'bg-white dark:bg-[#18181B] border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5'
                                    }`}
                                >
                                    <div className={`p-2 rounded-sm bg-gray-100 dark:bg-black/20 ${item.color}`}>
                                        <item.icon size={16} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-[11px] font-bold text-gray-700 dark:text-gray-200">{item.label}</div>
                                        <div className="text-[10px] text-gray-400 leading-tight">{item.desc}</div>
                                    </div>
                                    
                                    {/* Pro Lock */}
                                    {!isPro && item.id === 'critical' && (
                                        <Lock size={12} className="text-amber-500 absolute top-2 right-2" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Difficulty Selector */}
                        <div className="grid grid-cols-3 gap-1 bg-gray-100 dark:bg-[#202023] p-1 rounded-md mb-6">
                            {['normal', 'hard', 'extreme'].map((level) => (
                                <button
                                    key={level}
                                    onClick={() => setDifficulty(level)}
                                    className={`py-1.5 rounded-sm text-[10px] font-bold uppercase transition-all ${
                                        difficulty === level 
                                        ? 'bg-white dark:bg-[#2B2D31] text-gray-800 dark:text-white shadow-sm' 
                                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                    }`}
                                >
                                    {level} {level === 'extreme' && !isPro && '🔒'}
                                </button>
                            ))}
                        </div>

                        <button 
                            onClick={startSession}
                            className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-[11px] font-bold uppercase tracking-wide transition-all shadow-sm flex items-center justify-center gap-2"
                        >
                            <Play size={12} fill="currentColor"/> Masuk Ruang Sidang
                        </button>
                    </div>
                )}

                {/* B. CHAT SESSION (RUNNING) */}
                {isSessionActive && (
                    <div className="p-4 space-y-5 pb-20">
                        {messages.map((msg, idx) => {
                            const isUser = msg.role === 'user';
                            const isSystem = msg.role === 'system';
                            
                            if (isSystem) {
                                return (
                                    <div key={idx} className="flex justify-center">
                                        <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest bg-gray-50 dark:bg-[#202023] px-2 py-0.5 rounded border border-gray-100 dark:border-white/5">
                                            {msg.content}
                                        </span>
                                    </div>
                                );
                            }

                            return (
                                <div key={idx} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group animate-in slide-in-from-bottom-2`}>
                                    {/* Label Nama */}
                                    <div className={`text-[9px] font-bold mb-1 px-1 uppercase tracking-wide opacity-50 ${isUser ? 'text-gray-500' : 'text-red-500'}`}>
                                        {isUser ? 'Anda' : getExaminerName(examinerType)}
                                    </div>
                                    
                                    {/* Message Bubble (Kotak Flush) */}
                                    <div className={`max-w-[90%] px-4 py-3 rounded-md text-[12px] leading-relaxed shadow-sm border ${
                                        isUser 
                                        ? 'bg-white dark:bg-[#2B2D31] text-gray-800 dark:text-gray-200 border-gray-200 dark:border-white/5' 
                                        : 'bg-red-50 dark:bg-[#252020] text-gray-800 dark:text-gray-300 border-red-100 dark:border-red-900/20'
                                    }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            );
                        })}
                        
                        {isLoading && (
                            <div className="flex gap-2 items-center text-[10px] text-gray-400 ml-2 animate-pulse">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                <span className="italic">Dosen sedang menilai...</span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}

                {/* C. REPORT CARD (RESULT) */}
                {feedbackReport && !isSessionActive && (
                    <div className="p-6 max-w-sm mx-auto animate-in zoom-in-95">
                        <div className="bg-white dark:bg-[#202023] border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden shadow-sm">
                            {/* Score Header */}
                            <div className="p-6 text-center bg-gray-50 dark:bg-[#25282C] border-b border-gray-200 dark:border-white/5">
                                <h2 className={`text-2xl font-black uppercase tracking-tight mb-2 ${
                                    feedbackReport.verdict === 'LULUS' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                }`}>
                                    {feedbackReport.verdict || "SELESAI"}
                                </h2>
                                <div className="text-4xl font-black text-gray-800 dark:text-white">{feedbackReport.score}</div>
                                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Final Score</div>
                            </div>

                            {/* Details */}
                            <div className="p-5 space-y-4">
                                <div>
                                    <h4 className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase mb-1 flex items-center gap-1">
                                        <Award size={10}/> Kekuatan
                                    </h4>
                                    <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed border-l-2 border-green-500 pl-2">{feedbackReport.strengths || "-"}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase mb-1 flex items-center gap-1">
                                        <ShieldAlert size={10}/> Kelemahan
                                    </h4>
                                    <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed border-l-2 border-red-500 pl-2">{feedbackReport.weaknesses || "-"}</p>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-sm border border-blue-100 dark:border-blue-900/30">
                                    <h4 className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase mb-1">Saran</h4>
                                    <p className="text-[11px] text-blue-800 dark:text-blue-200 italic">"{feedbackReport.advice || "-"}"</p>
                                </div>
                            </div>

                            <button 
                                onClick={() => { setFeedbackReport(null); setMessages([]); }}
                                className="w-full py-3 bg-gray-100 dark:bg-[#2B2D31] hover:bg-gray-200 dark:hover:bg-[#323642] text-gray-700 dark:text-gray-300 text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-2 border-t border-gray-200 dark:border-white/5"
                            >
                                <RefreshCw size={12}/> Try Again
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* 3. INPUT AREA (VS Code Style) */}
            {isSessionActive && (
                <div className="p-4 bg-white dark:bg-[#18181B] border-t border-gray-200 dark:border-white/5 z-20">
                    <form onSubmit={handleSendMessage} className="relative">
                        <div className={`
                            relative flex items-center gap-2 p-1.5 rounded-md border transition-all
                            bg-gray-50 dark:bg-[#252526]
                            ${isLoading ? 'opacity-50 border-gray-200 dark:border-white/5' : 'border-gray-300 dark:border-[#3C3C3C] focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500/20'}
                        `}>
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Jawab argumen dosen..."
                                className="flex-1 bg-transparent text-gray-800 dark:text-gray-200 text-[13px] px-2 py-1.5 focus:outline-none placeholder-gray-400"
                                disabled={isLoading}
                                autoFocus
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className={`p-1.5 rounded-sm transition-colors ${
                                    isLoading || !input.trim() 
                                    ? 'text-gray-300 dark:text-gray-600' 
                                    : 'text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                                }`}
                            >
                                <Send size={14} />
                            </button>
                        </div>
                    </form>
                    <div className="text-center mt-2">
                        <p className="text-[10px] text-gray-400">
                            Mode Sidang Aktif. Jawab dengan tegas.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DefenseTab;