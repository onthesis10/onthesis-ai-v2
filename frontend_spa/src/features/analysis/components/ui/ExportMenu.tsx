import { useState, useEffect } from 'react';
import { Download, FileText, FileType, Lock, Loader } from 'lucide-react';
import { useAnalysisStore } from '../../store/useAnalysisStore';
import { motion } from 'framer-motion';

interface ExportMenuProps {
    onExport: (format: 'pdf' | 'docx') => Promise<void>;
    isExporting: boolean;
}

export function ExportMenu({ onExport, isExporting }: ExportMenuProps) {
    const { userTier } = useAnalysisStore();
    const [isOpen, setIsOpen] = useState(false);
    const [exportStep, setExportStep] = useState("Preparing...");

    // Cycle text for Export Loader
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isExporting) {
            const steps = ["Preparing Doc...", "Formatting Data...", "Rendering Charts...", "Finalizing..."];
            let i = 0;
            setExportStep(steps[0]);
            interval = setInterval(() => {
                i = (i + 1) % steps.length;
                setExportStep(steps[i]);
            }, 800);
        }
        return () => clearInterval(interval);
    }, [isExporting]);

    const handleExportClick = async (format: 'pdf' | 'docx') => {
        if (userTier === 'free') {
            alert("Exporting to PDF/Word is a PRO feature. Please upgrade your account to unlock this feature.");
            return;
        }

        setIsOpen(false);
        await onExport(format);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isExporting}
                className={`relative overflow-hidden flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl font-medium transition-all shadow-xl shadow-slate-500/20 disabled:cursor-not-allowed
                ${isExporting
                        ? 'bg-slate-800 text-slate-300 w-[140px] justify-center'
                        : 'bg-slate-900 dark:bg-white text-white dark:text-black hover:opacity-90 transform hover:-translate-y-0.5'
                    }`}
            >
                {isExporting && (
                    <motion.div
                        className="absolute bottom-0 left-0 h-1 bg-cyan-500"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 3, ease: "easeInOut" }}
                    />
                )}

                {isExporting ? (
                    <>
                        <Loader className="w-4 h-4 animate-spin text-cyan-500" />
                        <span key={exportStep} className="animate-in fade-in slide-in-from-bottom-1 duration-200 text-xs">
                            {exportStep}
                        </span>
                    </>
                ) : (
                    <>
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Export</span>
                    </>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 px-2 uppercase tracking-wider">
                                Export As
                            </p>
                        </div>
                        <div className="p-1 space-y-0.5">
                            <button
                                onClick={() => handleExportClick('pdf')}
                                className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg group transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-red-500" />
                                    <span>PDF Document</span>
                                </div>
                                {userTier === 'free' && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                            </button>

                            <button
                                onClick={() => handleExportClick('docx')}
                                className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg group transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <FileType className="w-4 h-4 text-blue-500" />
                                    <span>Word (DOCX)</span>
                                </div>
                                {userTier === 'free' && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                            </button>
                        </div>

                        {userTier === 'free' && (
                            <div className="p-2 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-t border-indigo-100 dark:border-indigo-900/30">
                                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 text-center font-medium">
                                    High-Quality APA Style Export is a PRO feature.
                                </p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
