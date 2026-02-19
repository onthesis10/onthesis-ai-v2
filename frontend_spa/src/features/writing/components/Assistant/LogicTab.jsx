// FILE: src/components/Assistant/LogicTab.jsx

import React, { useState } from 'react';
import { 
    ShieldCheck, AlertTriangle, CheckCircle2, 
    RefreshCw, Activity, Terminal 
} from 'lucide-react';

import { api } from '../../api/client.js'; 
import { useProject } from '../../context/ProjectContext.jsx'; 
import { useTheme } from '../../context/ThemeContext.jsx'; // Untuk Theme Aware

const LogicTab = () => {
    const { project } = useProject(); 
    const { theme } = useTheme(); // Light / Dark logic
    
    const [auditResult, setAuditResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- LOGIKA API (TETAP SAMA) ---
    const runLogicAudit = async () => {
        const title = project?.title || '';
        const problem = project?.problem_statement || '';
        const objectives = project?.research_objectives || '';

        if (!title || !problem) {
            setError("Judul dan Rumusan Masalah wajib diisi di Project Settings.");
            return;
        }

        setIsLoading(true);
        setError(null);
        
        try {
            const data = await api.post('/api/assistant/logic-check', {
                title: title,
                problem: problem,
                objectives: objectives
            });
            setAuditResult(data);
        } catch (err) {
            console.error("Logic check failed:", err);
            setError(err.message || "Gagal melakukan audit logika.");
        } finally {
            setIsLoading(false);
        }
    };

    // Helper Warna Status (Theme Aware)
    const getScoreColor = (score) => {
        if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
        if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    return (
        // CONTAINER: Flush, Full Width, Theme Aware
        <div className="h-full flex flex-col bg-white dark:bg-[#18181B] text-gray-800 dark:text-[#CCCCCC] font-sans text-[13px] border-l border-gray-200 dark:border-white/5 transition-colors duration-300">
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">

                {/* 1. HEADER SECTION (Minimalist) */}
                <div className="border-b border-gray-200 dark:border-white/5">
                    <div className="px-4 py-2 bg-gray-50 dark:bg-[#202023] flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <ShieldCheck size={12} /> Logic Guard
                        </span>
                        {/* Status Chip jika ada hasil */}
                        {auditResult && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                auditResult.consistency_score >= 80 
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
                                : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
                            }`}>
                                {auditResult.status}
                            </span>
                        )}
                    </div>

                    {/* SCORE & ACTIONS */}
                    <div className="p-4 bg-white dark:bg-[#18181B]">
                        {!auditResult && !isLoading && !error && (
                            <div className="text-center py-6 px-4 border border-dashed border-gray-300 dark:border-white/10 rounded-md bg-gray-50 dark:bg-[#202023]">
                                <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-50" />
                                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Siap Mengaudit?</h4>
                                <p className="text-[11px] text-gray-500 mb-4 leading-relaxed max-w-[200px] mx-auto">
                                    Cek sinkronisasi Judul, Rumusan Masalah, dan Tujuan.
                                </p>
                                <button 
                                    onClick={runLogicAudit}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-sm transition-all shadow-sm flex items-center gap-2 mx-auto"
                                >
                                    <ShieldCheck size={12} /> Start Audit
                                </button>
                            </div>
                        )}

                        {isLoading && (
                            <div className="text-center py-10">
                                <RefreshCw className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-3" />
                                <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Menganalisis Logika...</p>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/10 border-l-2 border-red-500 rounded-sm">
                                <div className="flex gap-2">
                                    <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[11px] font-bold text-red-700 dark:text-red-400">Gagal Audit</p>
                                        <p className="text-[10px] text-gray-600 dark:text-gray-400">{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* RESULT SCORE VIEW */}
                        {auditResult && !isLoading && (
                            <div className="flex items-center justify-between bg-gray-50 dark:bg-[#202023] p-4 rounded-md border border-gray-200 dark:border-white/5">
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Consistency Score</span>
                                    <div className={`text-3xl font-black mt-1 ${getScoreColor(auditResult.consistency_score)}`}>
                                        {auditResult.consistency_score}/100
                                    </div>
                                </div>
                                <button 
                                    onClick={runLogicAudit}
                                    className="p-2 bg-white dark:bg-[#2B2D31] border border-gray-200 dark:border-white/10 rounded-sm hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 hover:text-blue-500 transition-colors"
                                    title="Audit Ulang"
                                >
                                    <RefreshCw size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. ANALYSIS RESULTS */}
                {auditResult && !isLoading && (
                    <>
                        <div className="border-b border-gray-200 dark:border-white/5">
                            <div className="px-4 py-2 bg-gray-50 dark:bg-[#202023]">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Detailed Analysis</span>
                            </div>
                            <div className="divide-y divide-gray-100 dark:divide-white/5">
                                {auditResult.analysis && auditResult.analysis.map((item, idx) => (
                                    <div key={idx} className="p-4 hover:bg-gray-50 dark:hover:bg-[#202023] transition-colors">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <h5 className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{item.pair}</h5>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm border ${
                                                item.status === 'Valid' 
                                                ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' 
                                                : item.status === 'Warning' 
                                                ? 'bg-yellow-50 dark:bg-yellow-900/10 text-yellow-600 dark:text-yellow-400 border-yellow-100 dark:border-yellow-800' 
                                                : 'bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800'
                                            }`}>
                                                {item.status}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed pl-2 border-l-2 border-gray-300 dark:border-gray-600">
                                            {item.feedback}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 3. SUGGESTIONS */}
                        {auditResult.suggestions && auditResult.suggestions.length > 0 && (
                            <div className="border-b border-gray-200 dark:border-white/5">
                                <div className="px-4 py-2 bg-gray-50 dark:bg-[#202023]">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Recommendations</span>
                                </div>
                                <div className="p-4 bg-white dark:bg-[#18181B]">
                                    <ul className="space-y-2">
                                        {auditResult.suggestions.map((sug, idx) => (
                                            <li key={idx} className="text-[11px] text-gray-600 dark:text-gray-400 flex gap-2 items-start">
                                                <CheckCircle2 size={12} className="text-blue-500 mt-0.5 shrink-0"/>
                                                <span>{sug}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </>
                )}

            </div>
        </div>
    );
};

export default LogicTab;