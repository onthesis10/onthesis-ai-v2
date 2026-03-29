// FILE: src/components/Assistant/ToolsTab.jsx

import React, { useState } from 'react';
import { 
    ScanLine, CheckCircle2, XCircle, AlertTriangle, 
    RefreshCw, ArrowRight, Terminal, Sparkles
} from 'lucide-react';

import { useTheme } from '../../context/ThemeContext.jsx'; 
import CitationGraph from './CitationGraph'; 

export default function ToolsTab({ projectId, onInsert, onUpdateStyle, projectData, getEditorContent, onRunAI, status, streamData, error }) {
    const { theme } = useTheme(); 
    const [auditResult, setAuditResult] = useState(null);
    const [isAuditing, setIsAuditing] = useState(false);
    
    const references = projectData?.references || [];

    // ==========================================
    // LOGIKA AUDIT SITASI (TETAP SAMA)
    // ==========================================
    const runCitationAudit = () => {
        setIsAuditing(true);
        setTimeout(() => { 
            const htmlContent = getEditorContent ? getEditorContent() : '';
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = htmlContent;
            const text = tempDiv.textContent || tempDiv.innerText || "";
            const citationRegex = /([A-Z][a-zA-Z\s\.\-]+?)(?:et al\.?)?[\s,]*\(?(\d{4})\)?/g;
            const foundInText = new Set();
            let match;
            while ((match = citationRegex.exec(text)) !== null) {
                const rawName = match[1].trim().replace(/[\(\),]/g, '');
                const year = match[2];
                const lastName = rawName.split(' ').pop().toLowerCase().replace(/[^a-z]/g, '');
                if (lastName.length >= 3) foundInText.add(`${lastName}-${year}`);
            }
            const missingInBib = [];
            const matchedDbIndices = new Set(); 
            foundInText.forEach(citeKey => {
                const [textName, textYear] = citeKey.split('-');
                const foundIndex = references.findIndex((ref) => {
                    if (!ref.author || !ref.year) return false;
                    const dbYear = String(ref.year).trim();
                    const dbAuthor = ref.author.toLowerCase();
                    return dbYear === textYear && dbAuthor.includes(textName);
                });
                if (foundIndex !== -1) matchedDbIndices.add(foundIndex); 
                else {
                    const displayName = textName.charAt(0).toUpperCase() + textName.slice(1);
                    missingInBib.push(`${displayName} (${textYear})`);
                }
            });
            const unusedInText = references.filter((_, idx) => !matchedDbIndices.has(idx));
            setAuditResult({
                score: Math.max(0, 100 - (missingInBib.length * 20) - (unusedInText.length * 10)),
                missingInBib,
                unusedInText,
                totalCitations: foundInText.size,
                totalRefs: references.length
            });
            setIsAuditing(false);
        }, 800);
    };

    const runAgentCitationAudit = () => {
        if (!onRunAI) return;
        const htmlContent = getEditorContent ? getEditorContent() : '';
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = htmlContent;
        const text = tempDiv.textContent || tempDiv.innerText || "";
        onRunAI('validate_citations', { input_text: text });
    };

    return (
        // CONTAINER: Full Width, No Padding di Root, Border Left Tipis
        <div className="h-full flex flex-col bg-white dark:bg-[#18181B] text-gray-800 dark:text-[#CCCCCC] font-sans text-[13px] border-l border-gray-200 dark:border-white/5 transition-colors duration-300">
            
            {/* Scrollable Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">

                {/* SECTION 1: CITATION MAP */}
                <div className="border-b border-gray-200 dark:border-white/5">
                    {/* Section Header */}
                    <div className="px-4 py-2 bg-gray-50 dark:bg-[#202023] flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Citation Map</span>
                        <span className="text-[9px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-medium">
                            {references.length}
                        </span>
                    </div>
                    {/* Graph Container (Flush) */}
                    <div className="h-[250px] w-full relative bg-white dark:bg-[#18181B]">
                         <CitationGraph references={references} theme={theme} />
                    </div>
                </div>

                {/* SECTION 2: REFERENCE AUDIT */}
                <div className="border-b border-gray-200 dark:border-white/5">
                    <div className="px-4 py-2 bg-gray-50 dark:bg-[#202023] flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Reference Audit (Local Heuristic)</span>
                        {auditResult && (
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-sm ${
                                auditResult.score === 100 
                                ? 'text-green-600' 
                                : 'text-red-500'
                            }`}>
                                Score: {auditResult.score}
                            </span>
                        )}
                    </div>
                    
                    <div className="p-4">
                        <div className="mb-3 rounded-sm border border-blue-200/70 dark:border-blue-500/20 bg-blue-50/70 dark:bg-blue-500/10 p-2.5">
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                                <Sparkles size={11} />
                                Agent Citation Check
                            </div>
                            <p className="mt-1 text-[11px] leading-relaxed text-blue-700/80 dark:text-blue-200/80">
                                Jalankan pemeriksaan sitasi berbasis agent untuk mendapat analisis yang lebih kontekstual. Audit lokal di bawah tetap tersedia sebagai cek cepat di browser.
                            </p>
                            <button
                                onClick={runAgentCitationAudit}
                                disabled={status === 'streaming'}
                                className="mt-3 w-full py-2 bg-slate-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-medium rounded-sm transition-all flex items-center justify-center gap-2"
                            >
                                <Sparkles size={12} />
                                {status === 'streaming' ? 'Agent sedang memeriksa...' : 'Run Agent Citation Check'}
                            </button>
                            {error && (
                                <div className="mt-2 text-[10px] text-red-600 dark:text-red-300">
                                    {error}
                                </div>
                            )}
                            {streamData && status !== 'streaming' && (
                                <div className="mt-2 max-h-[160px] overflow-y-auto custom-scrollbar rounded-sm border border-black/5 dark:border-white/10 bg-white/80 dark:bg-black/20 p-2 text-[11px] leading-relaxed text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
                                    {streamData}
                                </div>
                            )}
                        </div>

                        {!auditResult ? (
                            <div className="text-center py-2">
                                <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">
                                    Cek cepat konsistensi sitasi dalam teks vs daftar pustaka langsung di browser.
                                </p>
                                <button 
                                    onClick={runCitationAudit}
                                    disabled={isAuditing}
                                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-sm transition-all flex items-center justify-center gap-2"
                                >
                                    {isAuditing ? <RefreshCw size={12} className="animate-spin"/> : <Terminal size={12}/>}
                                    {isAuditing ? 'Scanning...' : 'Run Audit'}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3 animate-in fade-in">
                                {/* Result: Missing */}
                                {auditResult.missingInBib.length > 0 ? (
                                    <div className="bg-red-50 dark:bg-red-900/10 border-l-2 border-red-500 p-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <XCircle size={12} className="text-red-500"/>
                                            <span className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase">Missing in Bib</span>
                                        </div>
                                        <ul className="pl-4 text-[10px] text-gray-600 dark:text-gray-400 font-mono">
                                            {auditResult.missingInBib.map((name, i) => <li key={i}>{name}</li>)}
                                        </ul>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-green-600 dark:text-green-500 text-[11px]">
                                        <CheckCircle2 size={14}/>
                                        <span className="font-medium">All citations valid.</span>
                                    </div>
                                )}

                                {/* Result: Unused */}
                                {auditResult.unusedInText.length > 0 && (
                                    <div className="bg-yellow-50 dark:bg-yellow-900/10 border-l-2 border-yellow-500 p-2">
                                        <div className="flex items-center gap-2 mb-2">
                                            <AlertTriangle size={12} className="text-yellow-600 dark:text-yellow-500"/>
                                            <span className="text-[10px] font-bold text-yellow-700 dark:text-yellow-500 uppercase">Unused References</span>
                                        </div>
                                        <div className="space-y-1 max-h-[120px] overflow-y-auto custom-scrollbar">
                                            {auditResult.unusedInText.map((ref, i) => (
                                                <button 
                                                    key={i} 
                                                    onClick={() => onInsert(`(${ref.author ? ref.author.split(',')[0].split(' ').pop() : 'Anon'}, ${ref.year})`)}
                                                    className="w-full flex justify-between items-center text-[10px] text-left hover:bg-gray-100 dark:hover:bg-white/5 p-1 rounded group"
                                                >
                                                    <span className="truncate w-32 text-gray-500">{ref.title}</span>
                                                    <span className="text-blue-500 opacity-0 group-hover:opacity-100 flex items-center gap-0.5">Insert <ArrowRight size={8}/></span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button onClick={runCitationAudit} className="w-full py-1.5 border border-gray-200 dark:border-white/10 text-[10px] text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-sm hover:bg-gray-50 dark:hover:bg-white/5 flex items-center justify-center gap-2 mt-2">
                                    <RefreshCw size={10}/> Re-Scan
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
