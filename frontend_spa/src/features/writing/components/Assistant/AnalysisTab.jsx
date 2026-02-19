// FILE: src/components/Assistant/AnalysisTab.jsx

import React, { useState, useEffect } from 'react';
import { 
    BarChart2, ChevronRight, RefreshCw, Calendar, 
    FileText, Search, Database, ArrowRight
} from 'lucide-react';
import { api } from '../../api/client';
import { toast } from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext.jsx'; // Theme Aware

export default function AnalysisTab({ projectId, onInsert }) {
    const { theme } = useTheme(); 
    
    // STATE
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // 1. FETCH DATA
    const fetchHistory = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/api/my-analyses');
            if (res && res.history) {
                setHistory(res.history);
            }
        } catch (err) {
            console.error("Gagal ambil history:", err);
            toast.error("Gagal memuat riwayat analisis.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    // 2. HELPER: FORMAT TANGGAL
    const formatDate = (isoString) => {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });
    };

    // 3. FILTER PENCARIAN
    const filteredHistory = history.filter(item => 
        item.analysis_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.filename?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- RENDER ---
    return (
        // CONTAINER: Flush, Full Width, Theme Aware
        <div className="h-full flex flex-col bg-white dark:bg-[#18181B] text-gray-800 dark:text-[#CCCCCC] font-sans text-[13px] border-l border-gray-200 dark:border-white/5 transition-colors duration-300">
            
            {/* A. HEADER (Minimalist) */}
            <div className="border-b border-gray-200 dark:border-white/5">
                <div className="px-4 py-2 bg-gray-50 dark:bg-[#202023] flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <BarChart2 size={12} /> Data Studio Link
                    </span>
                    <button 
                        onClick={fetchHistory} 
                        className={`p-1 text-gray-400 hover:text-blue-500 transition-colors ${isLoading ? 'animate-spin' : ''}`}
                        title="Refresh Data"
                    >
                        <RefreshCw size={12} />
                    </button>
                </div>

                {/* SEARCH BAR (Flush) */}
                <div className="p-2 bg-white dark:bg-[#18181B]">
                    <div className="relative group">
                        <input 
                            type="text" 
                            placeholder="Cari analisis (misal: Regresi)..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-[#252526] border border-gray-200 dark:border-white/10 rounded-sm py-1.5 pl-8 pr-3 text-[12px] text-gray-700 dark:text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder-gray-400"
                        />
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500"/>
                    </div>
                </div>
            </div>

            {/* B. LIST CONTENT */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {isLoading ? (
                    // LOADING SKELETON
                    <div className="p-4 space-y-3">
                        {[1,2,3].map(i => (
                            <div key={i} className="h-12 bg-gray-100 dark:bg-[#202023] rounded-sm animate-pulse"></div>
                        ))}
                    </div>
                ) : filteredHistory.length === 0 ? (
                    // EMPTY STATE
                    <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2 opacity-60">
                        <Database size={24} strokeWidth={1.5} />
                        <p className="text-[11px]">Belum ada data analisis.</p>
                        <a href="/data-analysis" className="text-[10px] text-blue-500 hover:underline font-medium">
                            Buka Data Studio
                        </a>
                    </div>
                ) : (
                    // DATA LIST (Flush List Style)
                    <div className="divide-y divide-gray-100 dark:divide-white/5">
                        {filteredHistory.map((item) => {
                            const isSelected = selectedItem?.id === item.id;
                            return (
                                <div key={item.id} className="group">
                                    {/* LIST ITEM HEADER */}
                                    <div 
                                        onClick={() => setSelectedItem(isSelected ? null : item)}
                                        className={`px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#202023] transition-colors flex items-center justify-between ${isSelected ? 'bg-gray-50 dark:bg-[#202023]' : ''}`}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className={`p-1.5 rounded-sm shrink-0 ${isSelected ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-white/5 text-gray-400'}`}>
                                                <FileText size={14} />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className={`text-[12px] font-bold truncate ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                                    {item.analysis_type || "Untitled Analysis"}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                        {formatDate(item.timestamp)}
                                                    </span>
                                                    {item.result?.n && (
                                                        <span className="text-[9px] px-1 rounded-sm bg-gray-100 dark:bg-white/5 text-gray-500 border border-gray-200 dark:border-white/5">
                                                            N={item.result.n}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight size={14} className={`text-gray-400 transition-transform duration-200 ${isSelected ? 'rotate-90 text-blue-500' : ''}`}/>
                                    </div>

                                    {/* EXPANDED DETAIL */}
                                    {isSelected && (
                                        <div className="bg-gray-50 dark:bg-[#1C1E24] border-y border-gray-100 dark:border-white/5 px-4 py-3 animate-in slide-in-from-top-1">
                                            
                                            {/* 1. Narrative Summary */}
                                            {item.result?.ai_narrative_summary && (
                                                <div className="mb-3">
                                                    <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Summary</p>
                                                    <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed italic border-l-2 border-blue-400 pl-2">
                                                        "{item.result.ai_narrative_summary}"
                                                    </p>
                                                </div>
                                            )}

                                            {/* 2. Key Stats Grid */}
                                            {item.result?.details && (
                                                <div className="grid grid-cols-2 gap-2 mb-3">
                                                    {Object.entries(item.result.details[0] || {}).slice(0, 4).map(([key, val]) => (
                                                        <div key={key} className="bg-white dark:bg-black/20 p-1.5 rounded-sm border border-gray-100 dark:border-white/5">
                                                            <div className="text-[9px] text-gray-400 capitalize truncate">{key.replace(/_/g, ' ')}</div>
                                                            <div className="text-[10px] font-mono font-bold text-gray-700 dark:text-gray-200 truncate">
                                                                {typeof val === 'number' ? val.toFixed(3) : String(val)}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* 3. Action Button */}
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const content = item.result?.ai_narrative || item.result?.ai_narrative_summary;
                                                    if (content) onInsert(content);
                                                    else toast.error("Tidak ada narasi teks.");
                                                }}
                                                className="w-full py-2 bg-white dark:bg-[#2B2D31] hover:bg-gray-100 dark:hover:bg-[#323642] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-sm text-[11px] font-bold transition-all flex items-center justify-center gap-2 group/btn"
                                            >
                                                Insert to Editor <ArrowRight size={12} className="text-blue-500 group-hover/btn:translate-x-0.5 transition-transform"/>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}