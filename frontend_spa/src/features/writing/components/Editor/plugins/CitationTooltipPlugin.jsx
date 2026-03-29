import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useProject } from '../../../context/ProjectContext';
import { BookOpen, X } from 'lucide-react';

export default function CitationTooltipPlugin() {
    const [editor] = useLexicalComposerContext();
    const [citationText, setCitationText] = useState(null);
    const [tooltipPosition, setTooltipPosition] = useState(null);
    const { project } = useProject();
    const tooltipRef = useRef(null);

    // Find matching reference based on citation text
    // Handles various citation formats like (Nunnally, 1978) or Nunnally (1978)
    const getMatchingRef = () => {
        if (!citationText || !project?.references) return null;

        // Remove parentheses for matching
        const cleanCitationText = citationText.replace(/[()]/g, '').toLowerCase();

        return project.references.find(ref => {
            if (!ref.author && !ref.authors) return false;

            const authorText = (ref.author || ref.authors || '').toLowerCase();
            const yearText = (ref.year || '').toString();

            // Check if both author (or part of it) and year are in the citation
            // Since citation text might be "Hair et al., 2019", we check if "Hair" is in it
            const firstAuthor = authorText.split(',')[0].split(' ')[0]; // E.g., 'Smith' from 'Smith, J.'

            return cleanCitationText.includes(firstAuthor) && cleanCitationText.includes(yearText);
        });
    };

    const matchingRef = getMatchingRef();

    useEffect(() => {
        const onClick = (e) => {
            const target = e.target;

            // If clicking inside the tooltip, do nothing
            if (tooltipRef.current && tooltipRef.current.contains(target)) {
                return;
            }

            if (target && target.classList && target.classList.contains('lexical-citation')) {
                setCitationText(target.innerText);
                const rect = target.getBoundingClientRect();

                // Position below the citation, with some simple bounds checking
                let top = rect.bottom + window.scrollY + 8;
                let left = rect.left + window.scrollX;

                // Basic edge protection so it doesn't go off screen
                if (left + 320 > window.innerWidth) {
                    left = window.innerWidth - 340;
                }

                setTooltipPosition({ top, left });
            } else {
                // Click outside closes the tooltip
                setTooltipPosition(null);
            }
        };

        // Use capture phase to ensure we catch it before editors might absorb the click
        document.addEventListener('click', onClick, true);
        return () => {
            document.removeEventListener('click', onClick, true);
        };
    }, []);

    // Handle pressing escape to close
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === 'Escape') setTooltipPosition(null);
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);


    if (!tooltipPosition || !citationText) return null;

    return createPortal(
        <div
            ref={tooltipRef}
            className="absolute z-[9999] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl p-4 w-80 text-sm animate-in fade-in zoom-in-95 duration-200"
            style={{
                top: tooltipPosition.top,
                left: tooltipPosition.left
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-blue-500" />
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">Citation Info</h4>
                </div>
                <button
                    onClick={() => setTooltipPosition(null)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                    <X size={14} />
                </button>
            </div>

            {matchingRef ? (
                <div className="flex flex-col gap-1.5">
                    <p className="font-medium text-slate-900 dark:text-white leading-snug">
                        {matchingRef.title}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 text-xs">
                        {matchingRef.author || matchingRef.authors} ({matchingRef.year})
                    </p>
                    {matchingRef.journal && (
                        <p className="text-slate-500 dark:text-slate-500 text-xs italic mt-1 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded border border-slate-100 dark:border-slate-700">
                            {matchingRef.journal}
                        </p>
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    <p className="text-slate-500 dark:text-slate-400 text-xs italic">
                        No exact match found in project references for:
                    </p>
                    <div className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded font-mono text-[10px]">
                        {citationText}
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
}
