// ─── GhostTextPlugin — Smart Copilot-style Inline AI Completion ───
// TRIGGER CONDITIONS (all must be true):
// 1. Cursor is COLLAPSED (no selection) — prevents replacing selected text
// 2. Cursor is at END of a paragraph (not middle of text)
// 3. User was actively TYPING (not just clicking/navigating)
// 4. Minimum 5 characters typed since last trigger
// 5. Content has at least 30 characters total
// 6. Cursor is NOT inside a heading
// 7. Debounce 2 seconds of inactivity (longer for safety)
//
// ACCEPT: Tab = full accept, Ctrl+→ = word-by-word, Esc = dismiss
// DISMISS: Any keystroke, click, or selection change

import { useEffect, useRef, useCallback } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
    $getRoot,
    $getSelection,
    $isRangeSelection,
    $createTextNode,
    COMMAND_PRIORITY_HIGH,
    KEY_TAB_COMMAND,
    KEY_ESCAPE_COMMAND,
    KEY_ARROW_RIGHT_COMMAND,
} from 'lexical';
import { $isHeadingNode } from '@lexical/rich-text';
import { $createGhostTextNode, $isGhostTextNode } from '../nodes/GhostTextNode';

const DEBOUNCE_MS = 2000; // 2 seconds — more conservative
const MIN_CHARS_TYPED = 5; // Must type at least 5 chars before triggering
const MIN_CONTENT_LENGTH = 30; // Document must have at least 30 chars
const MAX_CONTEXT_WORDS = 300;
const GHOST_API = '/api/ghost-complete';

// ─── Helper: Remove all ghost nodes safely ───
function removeAllGhostNodes(editor) {
    editor.update(() => {
        const root = $getRoot();
        function walkAndRemove(node) {
            if ($isGhostTextNode(node)) {
                node.remove();
                return;
            }
            if (node.getChildren) {
                try {
                    node.getChildren().forEach(walkAndRemove);
                } catch { /* ignore */ }
            }
        }
        walkAndRemove(root);
    }, { tag: 'ghost-cleanup' });
}

// ─── Helper: Get last N words ───
function getLastNWords(editorState, n = MAX_CONTEXT_WORDS) {
    let text = '';
    editorState.read(() => {
        text = $getRoot().getTextContent();
    });
    const words = text.trim().split(/\s+/);
    return words.slice(-n).join(' ');
}

// ─── Helper: Get current heading ───
function getCurrentHeading(editorState) {
    let heading = '';
    editorState.read(() => {
        const root = $getRoot();
        const children = root.getChildren();
        for (let i = children.length - 1; i >= 0; i--) {
            const child = children[i];
            if (child.getType && child.getType() === 'heading') {
                heading = child.getTextContent();
                break;
            }
        }
    });
    return heading;
}

// ─── Helper: Fetch ghost completion ───
async function fetchGhostCompletion(context, heading, signal) {
    try {
        const res = await fetch(GHOST_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ context, heading }),
            signal,
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.completion || null;
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.warn('[GhostText] Fetch error:', err.message);
        }
        return null;
    }
}

// ─── Helper: Check if cursor is at end of block ───
function isCursorAtEndOfBlock(selection) {
    if (!$isRangeSelection(selection)) return false;
    if (!selection.isCollapsed()) return false;

    const anchorNode = selection.anchor.getNode();
    const anchorOffset = selection.anchor.offset;

    // If anchor is a text node, check if we're at its end
    if (anchorNode.getType() === 'text') {
        const textLength = anchorNode.getTextContentSize();
        if (anchorOffset < textLength) return false;

        // Also check there's no next sibling (we're at the end of paragraph)
        let nextSibling = anchorNode.getNextSibling();
        while (nextSibling) {
            // Skip ghost nodes
            if ($isGhostTextNode(nextSibling)) {
                nextSibling = nextSibling.getNextSibling();
                continue;
            }
            // If there's a non-ghost sibling after us, we're not at end
            return false;
        }
        return true;
    }

    return false;
}

// ─── Helper: Check if cursor is inside a heading ───
function isCursorInHeading(selection) {
    if (!$isRangeSelection(selection)) return false;
    let node = selection.anchor.getNode();
    while (node) {
        if ($isHeadingNode(node)) return true;
        node = node.getParent();
    }
    return false;
}

export default function GhostTextPlugin({ isStreaming = false }) {
    const [editor] = useLexicalComposerContext();
    const timerRef = useRef(null);
    const abortRef = useRef(null);
    const hasGhostRef = useRef(false);
    const charsTypedRef = useRef(0); // Track chars typed since last trigger/dismiss
    const lastInputTimeRef = useRef(0); // Track last text input timestamp
    const isTypingRef = useRef(false); // Track if user is actively typing (vs navigating)

    // ── Clean up ghost nodes safely ──
    const cleanupGhost = useCallback(() => {
        if (hasGhostRef.current) {
            removeAllGhostNodes(editor);
            hasGhostRef.current = false;
        }
    }, [editor]);

    // ── Tab handler: accept ALL ghost text ──
    useEffect(() => {
        return editor.registerCommand(
            KEY_TAB_COMMAND,
            (event) => {
                if (!hasGhostRef.current) return false;

                event.preventDefault();

                editor.update(() => {
                    const root = $getRoot();
                    function walkAndAccept(node) {
                        if ($isGhostTextNode(node)) {
                            const text = node.getText();
                            const textNode = $createTextNode(text);
                            node.replace(textNode);
                            textNode.selectEnd();
                            return true;
                        }
                        if (node.getChildren) {
                            try {
                                for (const child of node.getChildren()) {
                                    if (walkAndAccept(child)) return true;
                                }
                            } catch { /* ignore */ }
                        }
                        return false;
                    }
                    walkAndAccept(root);
                });

                hasGhostRef.current = false;
                charsTypedRef.current = 0;
                return true;
            },
            COMMAND_PRIORITY_HIGH
        );
    }, [editor]);

    // ── Esc handler: dismiss ghost text ──
    useEffect(() => {
        return editor.registerCommand(
            KEY_ESCAPE_COMMAND,
            () => {
                if (!hasGhostRef.current) return false;
                cleanupGhost();
                charsTypedRef.current = 0;
                return true;
            },
            COMMAND_PRIORITY_HIGH
        );
    }, [editor, cleanupGhost]);

    // ── Ctrl+→ handler: accept next word from ghost ──
    useEffect(() => {
        return editor.registerCommand(
            KEY_ARROW_RIGHT_COMMAND,
            (event) => {
                if (!hasGhostRef.current) return false;
                if (!event.ctrlKey && !event.metaKey) return false;

                event.preventDefault();

                editor.update(() => {
                    const root = $getRoot();
                    function walkAndAcceptWord(node) {
                        if ($isGhostTextNode(node)) {
                            const text = node.getText();
                            const match = text.match(/^(\S+\s?)(.*)/);
                            if (!match) return false;

                            const acceptedWord = match[1];
                            const remaining = match[2];

                            const textNode = $createTextNode(acceptedWord);
                            node.insertBefore(textNode);

                            if (remaining.trim().length > 0) {
                                const newGhost = $createGhostTextNode(remaining);
                                node.replace(newGhost);
                                textNode.selectEnd();
                            } else {
                                node.remove();
                                textNode.selectEnd();
                                hasGhostRef.current = false;
                            }
                            return true;
                        }
                        if (node.getChildren) {
                            try {
                                for (const child of node.getChildren()) {
                                    if (walkAndAcceptWord(child)) return true;
                                }
                            } catch { /* ignore */ }
                        }
                        return false;
                    }
                    walkAndAcceptWord(root);
                }, { tag: 'ghost-insert' });

                return true;
            },
            COMMAND_PRIORITY_HIGH
        );
    }, [editor]);

    // ── Main: Smart trigger logic ──
    useEffect(() => {
        if (isStreaming) return;

        const unregister = editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves, tags }) => {
            // Skip our own updates
            if (tags.has('ghost-cleanup') || tags.has('ghost-insert')) return;

            const hasChanges = dirtyLeaves.size > 0 || dirtyElements.size > 0;

            if (hasChanges) {
                // User is making edits — dismiss any ghost and track typing
                cleanupGhost();
                charsTypedRef.current += 1; // Approximate: each update ~= 1 char
                lastInputTimeRef.current = Date.now();
                isTypingRef.current = true;
            }

            // Cancel pending trigger
            clearTimeout(timerRef.current);
            if (abortRef.current) {
                abortRef.current.abort();
                abortRef.current = null;
            }

            // Start new debounce timer — only if user was typing
            timerRef.current = setTimeout(async () => {
                // ── SMART TRIGGER CHECKS ──
                let shouldTrigger = false;

                // Check 1: Were we actually typing? (not just navigating)
                if (!isTypingRef.current) return;

                // Check 2: Typed enough characters since last trigger
                if (charsTypedRef.current < MIN_CHARS_TYPED) return;

                // Check 3: Last input was recent (within debounce window)
                if (Date.now() - lastInputTimeRef.current > DEBOUNCE_MS + 500) return;

                editorState.read(() => {
                    const selection = $getSelection();
                    if (!$isRangeSelection(selection)) return;

                    // Check 4: Selection must be COLLAPSED (no text selected)
                    if (!selection.isCollapsed()) return;

                    // Check 5: Cursor must be at END of block
                    if (!isCursorAtEndOfBlock(selection)) return;

                    // Check 6: NOT inside a heading
                    if (isCursorInHeading(selection)) return;

                    // Check 7: Document has enough content
                    const text = $getRoot().getTextContent().trim();
                    if (text.length < MIN_CONTENT_LENGTH) return;

                    // Check 8: Current paragraph has actual text (not empty)
                    const anchorNode = selection.anchor.getNode();
                    let blockNode = anchorNode;
                    while (blockNode && blockNode.getParent() && blockNode.getParent() !== $getRoot()) {
                        blockNode = blockNode.getParent();
                    }
                    if (blockNode) {
                        const paraText = blockNode.getTextContent().trim();
                        if (paraText.length < 10) return; // Skip near-empty paragraphs
                    }

                    shouldTrigger = true;
                });

                if (!shouldTrigger) return;

                // ── All checks passed — fetch ghost ──
                const context = getLastNWords(editorState);
                const heading = getCurrentHeading(editorState);

                abortRef.current = new AbortController();
                const completion = await fetchGhostCompletion(context, heading, abortRef.current.signal);

                if (!completion || completion.trim().length < 3) return;

                // Reset typing trackers
                charsTypedRef.current = 0;
                isTypingRef.current = false;

                // Insert ghost node — ONLY if selection is still collapsed
                editor.update(() => {
                    const selection = $getSelection();
                    if (!$isRangeSelection(selection)) return;

                    // CRITICAL SAFETY: Never insert if text is selected
                    if (!selection.isCollapsed()) return;

                    // Extra safety: cursor must still be at end of block
                    if (!isCursorAtEndOfBlock(selection)) return;

                    const ghostNode = $createGhostTextNode(completion);
                    selection.insertNodes([ghostNode]);

                    // Move cursor back before ghost
                    const prevSibling = ghostNode.getPreviousSibling();
                    if (prevSibling) {
                        prevSibling.selectEnd();
                    }

                    hasGhostRef.current = true;
                }, { tag: 'ghost-insert' });

            }, DEBOUNCE_MS);
        });

        return () => {
            unregister();
            clearTimeout(timerRef.current);
            if (abortRef.current) abortRef.current.abort();
        };
    }, [editor, isStreaming, cleanupGhost]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearTimeout(timerRef.current);
            if (abortRef.current) abortRef.current.abort();
            cleanupGhost();
        };
    }, [cleanupGhost]);

    return null;
}
