// ─── CursorTrackPlugin — Paragraph Context + Active Highlight ───
// Tracks cursor position, updates editorStore, and visually highlights
// the active paragraph in the editor with a subtle left border.

import { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
    $getSelection,
    $isRangeSelection,
    $getRoot,
    SELECTION_CHANGE_COMMAND,
    COMMAND_PRIORITY_LOW,
} from 'lexical';
import { $isHeadingNode } from '@lexical/rich-text';
import { useEditorStore } from '@/store/editorStore';

const DEBOUNCE_MS = 300;
const ACTIVE_CLASS = 'onthesis-active-paragraph';

export default function CursorTrackPlugin() {
    const [editor] = useLexicalComposerContext();
    const timerRef = useRef(null);
    const lastKeyRef = useRef(null);

    const setActiveParagraphKey = useEditorStore((s) => s.setActiveParagraphKey);
    const setActiveParagraphText = useEditorStore((s) => s.setActiveParagraphText);
    const setActiveHeadingContext = useEditorStore((s) => s.setActiveHeadingContext);
    const setWordCount = useEditorStore((s) => s.setWordCount);

    useEffect(() => {
        return editor.registerCommand(
            SELECTION_CHANGE_COMMAND,
            () => {
                clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => {
                    editor.getEditorState().read(() => {
                        const selection = $getSelection();
                        if (!$isRangeSelection(selection)) return;

                        const anchorNode = selection.anchor.getNode();

                        // Walk up to top-level block
                        let blockNode = anchorNode;
                        while (blockNode && blockNode.getParent() && blockNode.getParent() !== $getRoot()) {
                            blockNode = blockNode.getParent();
                        }
                        if (!blockNode) return;

                        const key = blockNode.getKey();

                        // ── Visual Highlight: update DOM directly ──
                        const rootEl = editor.getRootElement();
                        if (rootEl) {
                            // Remove old
                            rootEl.querySelectorAll(`.${ACTIVE_CLASS}`).forEach((el) => {
                                el.classList.remove(ACTIVE_CLASS);
                            });
                            // Add to current block
                            const blockEl = editor.getElementByKey(key);
                            if (blockEl) {
                                blockEl.classList.add(ACTIVE_CLASS);
                            }
                        }

                        // Skip store update if same paragraph
                        if (key === lastKeyRef.current) return;
                        lastKeyRef.current = key;

                        // Update paragraph info
                        const paragraphText = blockNode.getTextContent();
                        setActiveParagraphKey(key);
                        if (setActiveParagraphText) setActiveParagraphText(paragraphText);

                        // Build heading context
                        const root = $getRoot();
                        const children = root.getChildren();
                        const blockIndex = children.indexOf(blockNode);
                        const headings = [];
                        for (let i = 0; i <= blockIndex; i++) {
                            const child = children[i];
                            if ($isHeadingNode(child)) {
                                headings.push({
                                    tag: child.getTag(),
                                    text: child.getTextContent(),
                                });
                            }
                        }
                        if (setActiveHeadingContext) setActiveHeadingContext(headings);

                        // Word count
                        const fullText = root.getTextContent();
                        const wc = fullText.trim() ? fullText.trim().split(/\s+/).length : 0;
                        setWordCount(wc);
                    });
                }, DEBOUNCE_MS);

                return false;
            },
            COMMAND_PRIORITY_LOW
        );
    }, [editor, setActiveParagraphKey, setActiveParagraphText, setActiveHeadingContext, setWordCount]);

    // Cleanup
    useEffect(() => {
        return () => clearTimeout(timerRef.current);
    }, []);

    return null;
}
