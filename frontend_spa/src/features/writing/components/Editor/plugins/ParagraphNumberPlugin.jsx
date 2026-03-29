import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot } from 'lexical';
import { ThesisParagraphNode } from '../nodes/ThesisParagraphNode';

/**
 * ParagraphNumberPlugin — Sequential Visual Numbering (P-001, P-002, ...)
 * 
 * Uses `data-para-num` attribute + CSS `::before` pseudo-element.
 * NO child DOM elements — avoids Lexical treating labels as content.
 * 
 * Rules:
 *  - Only "real" paragraphs get numbered (≥ MIN_CHARS characters ≈ 2 full lines)
 *  - Headings, empty paragraphs, and short lines are skipped
 *  - Numbering updates dynamically on every editor change
 */

const MIN_CHARS = 80; // ~2 full lines at 12pt Times New Roman

export default function ParagraphNumberPlugin() {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        const removeListener = editor.registerUpdateListener(({ editorState }) => {
            // Read the state, then manipulate DOM outside of Lexical's update cycle
            let paraData = [];
            editorState.read(() => {
                const root = $getRoot();
                const children = root.getChildren();
                children.forEach((node) => {
                    if (!(node instanceof ThesisParagraphNode)) return;
                    paraData.push({
                        key: node.getKey(),
                        textLength: node.getTextContent().trim().length,
                    });
                });
            });

            // DOM manipulation (outside of editorState.read)
            let paraNumber = 0;
            paraData.forEach(({ key, textLength }) => {
                const domElement = editor.getElementByKey(key);
                if (!domElement) return;

                if (textLength >= MIN_CHARS) {
                    paraNumber++;
                    const numStr = String(paraNumber).padStart(3, '0');
                    domElement.setAttribute('data-para-num', `P-${numStr}`);
                } else {
                    domElement.removeAttribute('data-para-num');
                }
            });
        });

        return removeListener;
    }, [editor]);

    return null;
}
