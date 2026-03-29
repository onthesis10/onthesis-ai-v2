import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../api/client.js';
import { useProject } from '../context/ProjectContext';

export default function FieldWithAI({
    label,
    name,
    value,
    onChange,
    placeholder,
    minHeight = '120px',
    aiFieldType // This must map to the backend's expected field types
}) {
    const { project } = useProject();
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGenerated, setIsGenerated] = useState(false);
    const [streamedValue, setStreamedValue] = useState("");

    // Tier 1 Check: Are title, research_type, and study_field filled?
    const isTier1Complete = Boolean(
        project?.title?.trim() &&
        project?.methodology &&
        project?.study_field?.trim()
    );

    const handleGenerate = async () => {
        if (!isTier1Complete) return;

        setIsGenerating(true);
        setStreamedValue("");

        try {
            const context = {
                title: project.title,
                research_type: project.methodology,
                study_field: project.study_field,
                problem_statement: project.problem_statement,
                research_objectives: project.research_objectives,
                variables: project.variables_indicators
            };

            const res = await api.post('/api/ai/generate-field', {
                field: aiFieldType,
                context: context
            });

            if (res.status === 'success' && res.result) {
                // Simulate streaming effect purely for UI aesthetics
                const text = res.result;
                let currentIndex = 0;

                const streamInterval = setInterval(() => {
                    if (currentIndex <= text.length) {
                        setStreamedValue(text.slice(0, currentIndex));
                        currentIndex += Math.max(1, Math.floor(text.length / 50)); // Speed of stream
                    } else {
                        clearInterval(streamInterval);
                        setIsGenerated(true);
                        setIsGenerating(false);
                        onChange({ target: { name, value: text } });
                        setStreamedValue(""); // clear stream, rely on main value
                    }
                }, 30);
            } else {
                setIsGenerating(false);
            }
        } catch (error) {
            console.error("AI Generate Error:", error);
            setIsGenerating(false);
        }
    };

    const displayValue = isGenerating ? streamedValue : value;

    return (
        <div className="relative group">
            <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                    <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide ml-1 block">
                        {label}
                    </label>
                    {isGenerated && !isGenerating && (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded animate-in fade-in">
                            <CheckCircle2 size={10} /> AI Generated
                        </span>
                    )}
                </div>

                {/* AI Generate Button */}
                <div className="relative group/btn cursor-pointer">
                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={!isTier1Complete || isGenerating}
                        className={`
                            flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-md transition-all
                            ${!isTier1Complete
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-white/5 dark:text-gray-500'
                                : isGenerating
                                    ? 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 cursor-wait'
                                    : 'bg-purple-50 text-purple-600 hover:bg-purple-100 hover:shadow-sm dark:bg-purple-500/10 dark:text-purple-400 dark:hover:bg-purple-500/20'
                            }
                        `}
                    >
                        {isGenerating ? (
                            <>
                                <RefreshCw size={12} className="animate-spin" />
                                Generating...
                            </>
                        ) : isGenerated ? (
                            <>
                                <RefreshCw size={12} />
                                Regenerate
                            </>
                        ) : (
                            <>
                                <Sparkles size={12} className={isTier1Complete ? "text-purple-500" : ""} />
                                Suggest
                            </>
                        )}
                    </button>

                    {/* Tooltip if Tier 1 incomplete */}
                    {!isTier1Complete && (
                        <div className="pointer-events-none absolute right-0 top-full mt-1 w-48 opacity-0 group-hover/btn:opacity-100 transition-opacity bg-black dark:bg-white text-white dark:text-black text-[10px] p-2 rounded shadow-xl z-10 flex items-start gap-1.5">
                            <AlertCircle size={12} className="shrink-0 mt-0.5 text-orange-400" />
                            <span>Isi Judul, Jenjang Studi, & Metodologi terlebih dahulu untuk mengaktifkan AI.</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="relative">
                <textarea
                    name={name}
                    value={displayValue || ''}
                    onChange={(e) => {
                        setIsGenerated(false); // remove badge if user manually edits
                        onChange(e);
                    }}
                    placeholder={placeholder}
                    className={`
                        w-full resize-none custom-scrollbar p-3 rounded-lg text-[13px] outline-none transition-all
                        ${isGenerating ? 'bg-purple-50/50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-500/20 text-gray-600 dark:text-gray-300 pointer-events-none' : 'bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-100 hover:border-gray-300 dark:hover:border-white/20 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'}
                        placeholder:text-gray-400
                    `}
                    style={{ minHeight }}
                />

                {/* Visual Feedback during generation */}
                {isGenerating && (
                    <div className="absolute inset-0 ring-1 ring-inset ring-purple-400/30 rounded-lg animate-pulse pointer-events-none" />
                )}
            </div>

            {isGenerated && !isGenerating && (
                <p className="text-[10px] text-gray-400 mt-1 italic pl-1">
                    Dihasilkan oleh AI. Harap tinjau kembali dan sesuaikan dengan penelitian Anda.
                </p>
            )}
        </div>
    );
}
