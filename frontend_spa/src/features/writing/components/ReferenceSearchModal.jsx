// FILE: src/components/ReferenceSearchModal.jsx

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, Search, Globe, Plus, Check, Loader2, 
    Filter, BookOpen, PenTool, Upload, Database, 
    ChevronDown, ExternalLink, Calendar, User, Quote, ChevronRight
} from 'lucide-react';

// --- CUSTOM YEAR DROPDOWN (FIXED: Z-INDEX & CLIPPING) ---
const CustomYearSelect = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const years = Array.from({length: 20}, (_, i) => new Date().getFullYear() - i);
    
    return (
        <div className="relative" ref={containerRef}>
            <button 
                type="button" // PENTING: Biar gak submit form
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all min-w-[110px] justify-between ${
                    isOpen 
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white dark:bg-white/10 text-blue-600 dark:text-blue-400' 
                    : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20'
                }`}
            >
                <span>{value || "Semua Tahun"}</span>
                <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}/>
            </button>

            {/* DROPDOWN MENU */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-full max-h-[200px] overflow-y-auto custom-scrollbar bg-white dark:bg-[#252525] border border-gray-100 dark:border-white/10 rounded-lg shadow-xl z-[9999] animate-in fade-in zoom-in-95 duration-100 origin-top">
                    <button 
                        type="button"
                        onClick={() => { onChange(""); setIsOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-[10px] font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${value === "" ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20" : "text-gray-700 dark:text-gray-300"}`}
                    >
                        Semua Tahun
                    </button>
                    {years.map(year => (
                        <button 
                            key={year}
                            type="button"
                            onClick={() => { onChange(year); setIsOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-[10px] font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${value === String(year) ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20" : "text-gray-700 dark:text-gray-300"}`}
                        >
                            {year}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- MAIN COMPONENT ---
export default function ReferenceSearchModal({ isOpen, onClose, onReferenceAdded }) {
    const [activeTab, setActiveTab] = useState('search'); 
    
    // STATE LOGIC
    const [query, setQuery] = useState('');
    const [yearFilter, setYearFilter] = useState('');
    const [selectedSources, setSelectedSources] = useState(['crossref', 'doaj', 'openalex', 'semanticscholar', 'pubmed']);
    const [searchResults, setSearchResults] = useState([]);
    
    // UI State
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // Manual & Upload State
    const [manualForm, setManualForm] = useState({ title: '', author: '', year: '', journal: '', doi: '' });
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);
    const searchInputRef = useRef(null);

    // FILTER OPTIONS
    const SOURCES = [
        { id: 'crossref', label: 'Crossref', color: 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20' },
        { id: 'doaj', label: 'DOAJ', color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' },
        { id: 'openalex', label: 'OpenAlex', color: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' },
        { id: 'semanticscholar', label: 'Semantic', color: 'text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20' },
        { id: 'pubmed', label: 'PubMed', color: 'text-cyan-600 bg-cyan-50 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20' }
    ];

    useEffect(() => {
        if (isOpen && activeTab === 'search') {
            setTimeout(() => searchInputRef.current?.focus(), 100);
        }
    }, [isOpen, activeTab]);

    if (!isOpen) return null;

    // --- LOGIC HANDLERS ---
    const handleSearch = async () => {
        if (!query.trim()) return;
        setIsSearching(true);
        setHasSearched(true);
        setSearchResults([]); 

        const payload = { 
            query: query.trim(), 
            sources: selectedSources.length > 0 ? selectedSources : ['crossref', 'doaj', 'openalex'], 
            year: yearFilter ? String(yearFilter) : "" 
        };

        try {
            const res = await fetch('/api/unified-search-references', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            if (data.results && Array.isArray(data.results)) {
                setSearchResults(data.results);
            } else {
                setSearchResults([]);
            }
        } catch (err) {
            console.error("Fetch Error:", err);
        } finally {
            setIsSearching(false);
        }
    };

    const toggleSource = (id) => {
        setSelectedSources(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    };

    const getSourceBadge = (sourceName) => {
        if (!sourceName) return (
             <span className="text-[9px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider text-gray-400 border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5">UNKNOWN</span>
        );
        const lowerName = sourceName.toString().toLowerCase(); 
        const src = SOURCES.find(s => s.id === lowerName) || SOURCES.find(s => s.label.toLowerCase() === lowerName);
        const styleClass = src ? src.color : 'text-gray-500 bg-gray-100 border-gray-200 dark:text-gray-400 dark:bg-white/5 dark:border-white/10';
        return <span className={`text-[9px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${styleClass}`}>{sourceName}</span>;
    };

    const handleManualSubmit = () => {
        if (!manualForm.title) return alert("Judul wajib diisi.");
        onReferenceAdded({ ...manualForm, source: 'Manual' });
        setManualForm({ title: '', author: '', year: '', journal: '', doi: '' });
        alert("Disimpan ke Library!");
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploading(true);
        const formData = new FormData();
        formData.append('document', file); 

        try {
            const res = await fetch('/api/extract-pdf-simple', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.status === 'success') {
                const newRef = {
                    title: file.name.replace('.pdf', ''),
                    author: 'Extracted PDF',
                    year: new Date().getFullYear().toString(),
                    source: 'PDF Upload',
                    abstract: (data.data.content || "").substring(0, 200) + "..."
                };
                onReferenceAdded(newRef);
                alert("Berhasil Upload PDF!");
                setActiveTab('search'); 
            } else {
                alert("Gagal proses PDF.");
            }
        } catch (err) { alert("Error upload."); } finally { setIsUploading(false); }
    };

    // --- STYLES ---
    const inputClass = "w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-100 text-[13px] p-3 rounded-lg outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-gray-400";
    const labelClass = "text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide ml-1 mb-1.5 block";

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-6 animate-in fade-in duration-200 font-sans">
            
            <div className="w-full max-w-5xl h-[85vh] bg-[#F5F5F7] dark:bg-[#1E1E1E] border border-gray-200/50 dark:border-white/10 rounded-2xl shadow-2xl flex overflow-hidden animate-in zoom-in-95 ring-1 ring-black/5">
                
                {/* A. SIDEBAR TABS */}
                <div className="w-60 bg-[#F5F5F7] dark:bg-[#252525] border-r border-gray-200 dark:border-white/5 flex flex-col shrink-0">
                    <div className="h-16 px-5 flex items-center border-b border-gray-200/50 dark:border-white/5 shrink-0">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                            <BookOpen size={16} className="text-blue-500" />
                            Referensi
                        </span>
                    </div>

                    <div className="p-3 space-y-1">
                        {[
                            { id: 'search', label: 'Cari Online', icon: Globe },
                            { id: 'manual', label: 'Input Manual', icon: PenTool },
                            { id: 'upload', label: 'Upload PDF', icon: Upload }
                        ].map(tab => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 ${
                                        isActive 
                                        ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' 
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5'
                                    }`}
                                >
                                    <tab.icon size={16} className={isActive ? 'text-white' : 'opacity-70'} />
                                    <span className="text-xs font-medium flex-1">{tab.label}</span>
                                    {isActive && <ChevronRight size={14} className="opacity-50" />}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* B. CONTENT AREA */}
                <div className="flex-1 flex flex-col bg-white dark:bg-[#1C1C1E] min-w-0 relative">
                    
                    {/* Header */}
                    <div className="h-16 px-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between shrink-0 bg-white/50 dark:bg-white/5 backdrop-blur-xl">
                        <div>
                            <h2 className="text-base font-bold text-gray-800 dark:text-white">
                                {activeTab === 'search' && 'Pencarian Database Global'}
                                {activeTab === 'manual' && 'Input Metadata Manual'}
                                {activeTab === 'upload' && 'Ekstraksi Dokumen PDF'}
                            </h2>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">Tambahkan referensi ke project anda</p>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-red-500 transition-all">
                            <X size={20} />
                        </button>
                    </div>

                    {/* === VIEW: SEARCH === */}
                    {activeTab === 'search' && (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Filter Bar */}
                            <div className="p-6 border-b border-gray-100 dark:border-white/5 space-y-4 bg-gray-50/50 dark:bg-black/20">
                                <div className="flex gap-3">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-4 top-3.5 text-gray-400" size={18}/>
                                        <input 
                                            ref={searchInputRef}
                                            type="text" 
                                            className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-gray-800 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                                            placeholder="Cari judul, penulis, DOI..."
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        />
                                    </div>
                                    <button 
                                        onClick={handleSearch}
                                        disabled={isSearching}
                                        className="px-8 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center gap-2"
                                    >
                                        {isSearching ? <Loader2 className="animate-spin" size={16}/> : 'CARI'}
                                    </button>
                                </div>

                                {/* FIX: PAKE FLEX-WRAP BIAR DROPDOWN GAK KEPOTONG */}
                                <div className="flex flex-wrap items-center gap-3">
                                    {/* CUSTOM YEAR SELECT (DROP DOWN AMAN) */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase shrink-0 flex items-center gap-1">
                                            <Filter size={10}/> Tahun:
                                        </span>
                                        <CustomYearSelect value={yearFilter} onChange={setYearFilter} />
                                    </div>
                                    
                                    <span className="w-px h-4 bg-gray-200 dark:bg-white/10 shrink-0 hidden sm:block"></span>

                                    {/* Source Filters */}
                                    {SOURCES.map(src => (
                                        <button
                                            key={src.id}
                                            onClick={() => toggleSource(src.id)}
                                            className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold border transition-all shrink-0 ${
                                                selectedSources.includes(src.id)
                                                ? src.color
                                                : 'bg-white dark:bg-white/5 text-gray-500 border-gray-200 dark:border-white/10 hover:border-gray-300'
                                            }`}
                                        >
                                            {src.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Results */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-white dark:bg-[#1C1C1E]">
                                {isSearching ? (
                                    <div className="h-full flex flex-col items-center justify-center gap-4 opacity-60">
                                        <Loader2 size={40} className="text-blue-500 animate-spin" />
                                        <p className="text-xs font-bold text-blue-500 tracking-widest">SEARCHING DATABASE...</p>
                                    </div>
                                ) : searchResults.length > 0 ? (
                                    <div className="space-y-3">
                                        {searchResults.map((item, idx) => (
                                            <div 
                                                key={idx} 
                                                className="group p-4 rounded-xl border border-gray-100 dark:border-white/5 hover:border-blue-500/30 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-all flex gap-4 animate-in fade-in slide-in-from-bottom-2"
                                                style={{animationDelay: `${idx * 50}ms`}}
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center shrink-0 text-gray-500">
                                                    <Quote size={18} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                            {item.title || "Dokumen Tanpa Judul"}
                                                        </h4>
                                                        {getSourceBadge(item.source)}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                        <span className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1"><User size={10}/> {item.author || "Unknown"}</span>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1"><Calendar size={10}/> {item.year || "N/A"}</span>
                                                        {item.journal && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="italic truncate max-w-[150px]">{item.journal}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    
                                                    {item.abstract && (
                                                        <p className="mt-2 text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                                                            {item.abstract}
                                                        </p>
                                                    )}
                                                    
                                                    <div className="flex items-center gap-3 mt-3">
                                                        {item.doi && (
                                                            <a href={`https://doi.org/${item.doi}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-blue-500 transition-colors">
                                                                <ExternalLink size={10}/> {item.doi}
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => onReferenceAdded(item)}
                                                    className="h-9 px-4 bg-gray-100 dark:bg-white/10 hover:bg-blue-600 hover:text-white text-gray-600 dark:text-gray-300 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-sm shrink-0"
                                                >
                                                    <Plus size={14}/> Add
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center gap-4 text-gray-400 opacity-50">
                                        <Database size={48} strokeWidth={1} />
                                        <div className="text-center">
                                            <p className="text-sm font-medium">
                                                {hasSearched ? 'Tidak ditemukan hasil untuk pencarian ini.' : 'Mulai pencarian referensi global.'}
                                            </p>
                                            <p className="text-xs mt-1">Coba kata kunci lain atau matikan filter sumber.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* === VIEW: MANUAL === */}
                    {activeTab === 'manual' && (
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-10 flex justify-center">
                            <div className="w-full max-w-xl space-y-6">
                                <div>
                                    <label className={labelClass}>Judul Dokumen <span className="text-red-500">*</span></label>
                                    <input className={inputClass} placeholder="Contoh: Analisis Dampak AI..." value={manualForm.title} onChange={e => setManualForm({...manualForm, title: e.target.value})}/>
                                </div>
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className={labelClass}>Penulis Utama</label>
                                        <input className={inputClass} placeholder="Nama Penulis..." value={manualForm.author} onChange={e => setManualForm({...manualForm, author: e.target.value})}/>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Tahun Terbit</label>
                                        <input type="number" className={inputClass} placeholder="2024" value={manualForm.year} onChange={e => setManualForm({...manualForm, year: e.target.value})}/>
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Nama Jurnal / Penerbit</label>
                                    <input className={inputClass} placeholder="Contoh: IEEE Access..." value={manualForm.journal} onChange={e => setManualForm({...manualForm, journal: e.target.value})}/>
                                </div>
                                <div className="pt-4">
                                    <button onClick={handleManualSubmit} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold uppercase tracking-wide text-xs transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                                        Simpan ke Library
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* === VIEW: UPLOAD === */}
                    {activeTab === 'upload' && (
                        <div className="flex-1 p-10 flex flex-col items-center justify-center">
                            <div 
                                onClick={() => !isUploading && fileInputRef.current.click()}
                                className={`w-full max-w-lg h-80 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden ${
                                    isUploading 
                                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10' 
                                    : 'border-gray-300 dark:border-white/10 hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-white/5'
                                }`}
                            >
                                <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf" onChange={handleFileUpload} disabled={isUploading}/>
                                
                                <div className="z-10 flex flex-col items-center gap-4">
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="w-12 h-12 text-blue-500 animate-spin"/>
                                            <div className="text-center">
                                                <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400">Menganalisis PDF...</h3>
                                                <p className="text-xs text-gray-500 mt-1">Ekstraksi metadata otomatis</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Upload className="w-8 h-8 text-blue-500" />
                                            </div>
                                            <div className="text-center">
                                                <h3 className="text-base font-bold text-gray-700 dark:text-white">Upload Jurnal PDF</h3>
                                                <p className="text-xs text-gray-500 mt-1">Klik atau drag file ke sini</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}