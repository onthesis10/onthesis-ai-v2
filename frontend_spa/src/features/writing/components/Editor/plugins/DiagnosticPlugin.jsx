// ─── DiagnosticPlugin — Academic LSP (SAFE: No DOM mutation) ───
// Scans editor content every 5s, updates editorStore.diagnostics.
// Visual underlines are rendered via a SEPARATE overlay layer,
// NEVER by mutating Lexical's DOM tree (which causes data loss).

import { useEffect, useRef, useCallback } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot } from 'lexical';
import { useEditorStore } from '@/store/editorStore';
import { runDiagnostics } from '../../../core/diagnosticRules';

const SCAN_INTERVAL_MS = 5000;

// ── CSS Injection (once) — ONLY for overlays, NEVER touches editor DOM ──
let cssInjected = false;
function injectDiagnosticCSS() {
    if (cssInjected) return;
    cssInjected = true;
    const style = document.createElement('style');
    style.id = 'onthesis-diagnostic-styles';
    style.textContent = `
        /* Diagnostic overlay container */
        .onthesis-diag-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 1;
            overflow: hidden;
        }
        /* Individual underline mark */
        .onthesis-diag-mark {
            position: absolute;
            pointer-events: auto;
            cursor: help;
            border-bottom: 2px wavy;
            min-height: 2px;
        }
        .onthesis-diag-mark[data-severity="error"] {
            border-bottom-color: #ef4444;
        }
        .onthesis-diag-mark[data-severity="warning"] {
            border-bottom-color: #f59e0b;
        }
        .onthesis-diag-mark[data-severity="info"] {
            border-bottom-color: #60a5fa;
        }
        /* Tooltip on hover */
        .onthesis-diag-mark:hover::after {
            content: attr(data-msg);
            position: absolute;
            bottom: calc(100% + 6px);
            left: 0;
            max-width: 300px;
            padding: 6px 10px;
            border-radius: 6px;
            font-size: 11px;
            line-height: 1.4;
            white-space: normal;
            z-index: 1000;
            pointer-events: none;
            background: #1e1e2e;
            color: #e2e8f0;
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            animation: diagFadeIn 0.15s ease-out;
        }
        @keyframes diagFadeIn {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
        }
        /* Active paragraph highlight */
        .onthesis-active-paragraph {
            background: rgba(59, 130, 246, 0.04);
            border-left: 2px solid rgba(59, 130, 246, 0.3);
            margin-left: -2px;
            transition: background 0.2s ease, border-color 0.2s ease;
        }
        /* Ghost text fade-in */
        .ghost-text-node {
            animation: ghostFadeIn 0.3s ease-out;
        }
        @keyframes ghostFadeIn {
            from { opacity: 0; }
            to { opacity: 0.4; }
        }
    `;
    document.head.appendChild(style);
}

/**
 * Render diagnostic underlines as absolute-positioned overlay marks.
 * This does NOT modify Lexical's DOM tree — it uses a separate overlay div.
 */
function renderOverlayMarks(editorRootEl, diagnostics) {
    if (!editorRootEl) return;

    // Find or create overlay container
    const parent = editorRootEl.parentElement;
    if (!parent) return;

    // Ensure parent has relative positioning for overlay
    if (getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
    }

    let overlay = parent.querySelector('.onthesis-diag-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'onthesis-diag-overlay';
        parent.appendChild(overlay);
    }

    // Clear old marks
    overlay.innerHTML = '';

    if (!diagnostics.length) return;

    // Group by paragraph index
    const byParagraph = {};
    diagnostics.forEach((d) => {
        if (!byParagraph[d.paragraphIndex]) byParagraph[d.paragraphIndex] = [];
        byParagraph[d.paragraphIndex].push(d);
    });

    // Get paragraph DOM elements
    const paragraphs = editorRootEl.children;
    const rootRect = editorRootEl.getBoundingClientRect();

    Object.entries(byParagraph).forEach(([indexStr, diagList]) => {
        const index = parseInt(indexStr, 10);
        const paraEl = paragraphs[index];
        if (!paraEl) return;

        diagList.forEach((diag) => {
            if (!diag.excerpt) return;

            // Find the matching text in the paragraph using Range API (read-only)
            const searchText = diag.excerpt.replace(/\.{3}$/, '').trim();
            if (searchText.length < 5) return;

            const walker = document.createTreeWalker(paraEl, NodeFilter.SHOW_TEXT, null, false);
            let textNode;
            while ((textNode = walker.nextNode())) {
                const nodeText = textNode.textContent;
                const searchSlice = searchText.slice(0, Math.min(30, searchText.length));
                const matchIndex = nodeText.indexOf(searchSlice);
                if (matchIndex === -1) continue;

                try {
                    const matchLen = Math.min(searchSlice.length, nodeText.length - matchIndex);
                    const range = document.createRange();
                    range.setStart(textNode, matchIndex);
                    range.setEnd(textNode, matchIndex + matchLen);

                    const rect = range.getBoundingClientRect();

                    // Create overlay mark (absolute positioned, doesn't touch editor DOM)
                    const mark = document.createElement('div');
                    mark.className = 'onthesis-diag-mark';
                    mark.setAttribute('data-severity', diag.severity);
                    mark.setAttribute('data-msg', diag.message);
                    mark.style.top = (rect.bottom - rootRect.top - 2) + 'px';
                    mark.style.left = (rect.left - rootRect.left) + 'px';
                    mark.style.width = rect.width + 'px';
                    mark.style.height = '2px';

                    overlay.appendChild(mark);
                } catch {
                    // Range errors — skip
                }
                break;
            }
        });
    });
}

export default function DiagnosticPlugin() {
    const [editor] = useLexicalComposerContext();
    const setDiagnostics = useEditorStore((s) => s.setDiagnostics);
    const timerRef = useRef(null);

    useEffect(() => {
        injectDiagnosticCSS();
    }, []);

    const scan = useCallback(() => {
        let results = [];

        editor.getEditorState().read(() => {
            const root = $getRoot();
            const children = root.getChildren();

            const paragraphs = children.map((child, index) => ({
                index,
                text: child.getTextContent(),
            }));

            results = runDiagnostics(paragraphs);
        });

        setDiagnostics(results);

        // Render overlay marks (SAFE — separate div, no DOM mutation)
        requestAnimationFrame(() => {
            const rootEl = editor.getRootElement();
            if (rootEl) {
                renderOverlayMarks(rootEl, results);
            }
        });
    }, [editor, setDiagnostics]);

    useEffect(() => {
        const initialTimer = setTimeout(scan, 1500);
        timerRef.current = setInterval(scan, SCAN_INTERVAL_MS);

        return () => {
            clearTimeout(initialTimer);
            clearInterval(timerRef.current);
            // Cleanup overlay on unmount
            const rootEl = editor.getRootElement();
            if (rootEl?.parentElement) {
                const overlay = rootEl.parentElement.querySelector('.onthesis-diag-overlay');
                if (overlay) overlay.remove();
            }
        };
    }, [scan, editor]);

    return null;
}
