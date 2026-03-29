// ─── EditorDiffBridge — Sprint 3 → Sprint 7: Inline Diff System ───
// Redesigned to use DiffBlockNode (Lexical DecoratorNode) for VS Code-like
// inline diff visualization. When a diff arrives, the target paragraph is
// REPLACED with a DiffBlockNode showing old/new content. Accept restores
// with new content; Reject restores with original content.
//
// Diff object shape:
// {
//   diffId:   string,
//   type:     'edit' | 'insert' | 'delete',
//   paraId:   string,          // target paragraph ID
//   anchorId: string?,         // for insert — insert after this paraId
//   position: 'after'|'before',
//   before:   string?,         // original content (edit/delete)
//   after:    string?,         // new content (edit/insert)
//   reason:   string?,         // agent's reasoning
// }

import { $getRoot, $createTextNode } from 'lexical';
import { $generateNodesFromDOM, $generateHtmlFromNodes } from '@lexical/html';
import { ThesisParagraphNode, $createThesisParagraphNode } from '../nodes/ThesisParagraphNode';
import { $createDiffBlockNode, $isDiffBlockNode, $findDiffBlockByDiffId } from '../nodes/DiffBlockNode.jsx';

// ─────────────────────────────────────────────
// 1. Apply Diff Highlight → INSERT DiffBlockNode
//    Replaces the target paragraph with an inline diff view
// ─────────────────────────────────────────────
export function applyDiffHighlight(editor, diff) {
    if (!editor) return;

    editor.update(() => {
        if (diff.type === 'edit') {
            const node = $findNodeByParaId(diff.paraId);
            if (!node) {
                console.warn('[DiffBridge] Node not found for paraId:', diff.paraId);
                return;
            }

            // Capture original HTML from the node preserving formats
            const oldHtml = diff.before || _getNodeHtmlContent(editor, node);

            // Create DiffBlockNode that shows old vs new
            const diffNode = $createDiffBlockNode(
                diff.diffId,
                'edit',
                oldHtml,
                diff.after || '',
                diff.paraId,
                diff.reason || '',
            );

            // Replace the original paragraph with the diff block
            node.replace(diffNode);

        } else if (diff.type === 'insert') {
            const anchor = $findNodeByParaId(diff.anchorId || diff.paraId);
            if (!anchor) {
                console.warn('[DiffBridge] Anchor not found for insert:', diff.anchorId || diff.paraId);
                return;
            }

            // Create DiffBlockNode showing the proposed new content
            const diffNode = $createDiffBlockNode(
                diff.diffId,
                'insert',
                '', // no old content for insert
                diff.after || '',
                diff.paraId,
                diff.reason || '',
            );

            // Insert diff block after/before the anchor
            if (diff.position === 'before') {
                anchor.insertBefore(diffNode);
            } else {
                anchor.insertAfter(diffNode);
            }

        } else if (diff.type === 'delete') {
            const node = $findNodeByParaId(diff.paraId);
            if (!node) return;

            const oldHtml = diff.before || _getNodeHtmlContent(editor, node);

            // Create DiffBlockNode showing what will be deleted
            const diffNode = $createDiffBlockNode(
                diff.diffId,
                'delete',
                oldHtml,
                '',
                diff.paraId,
                diff.reason || '',
            );

            // Replace paragraph with diff block
            node.replace(diffNode);
        }
    });
}

// ─────────────────────────────────────────────
// 2. Commit Diff (Accept — apply the new content)
//    Replaces DiffBlockNode with a paragraph containing new content
// ─────────────────────────────────────────────
export function commitDiff(editor, diff) {
    if (!editor) return;

    editor.update(() => {
        const root = $getRoot();
        const diffNode = $findDiffBlockByDiffId(root, diff.diffId);

        if (diffNode) {
            // ── DiffBlockNode exists — replace it with final content ──
            if (diff.type === 'edit' || diff.type === 'insert') {
                const newPara = $createThesisParagraphNode(diff.paraId);
                _injectContentIntoNode(editor, newPara, diff.after);
                diffNode.replace(newPara);

            } else if (diff.type === 'delete') {
                // Accept delete = remove the diff block entirely
                diffNode.remove();
            }
        } else {
            // ── Fallback: DiffBlockNode not found, apply directly ──
            console.warn('[DiffBridge] DiffBlockNode not found for commit, using fallback for:', diff.diffId);
            if (diff.type === 'edit') {
                const node = $findNodeByParaId(diff.paraId);
                if (!node) return;
                _replaceNodeContent(editor, node, diff.after);

            } else if (diff.type === 'insert') {
                const anchor = $findNodeByParaId(diff.anchorId || diff.paraId);
                if (!anchor) return;
                const newNode = $createThesisParagraphNode(diff.paraId);
                _injectContentIntoNode(editor, newNode, diff.after);
                if (diff.position === 'before') {
                    anchor.insertBefore(newNode);
                } else {
                    anchor.insertAfter(newNode);
                }

            } else if (diff.type === 'delete') {
                const node = $findNodeByParaId(diff.paraId);
                if (node) node.remove();
            }
        }
    });
}

// ─────────────────────────────────────────────
// 3. Revert Diff (Reject — restore original content)
//    Replaces DiffBlockNode with the original paragraph content
// ─────────────────────────────────────────────
export function revertDiff(editor, diff) {
    if (!editor) return;

    editor.update(() => {
        const root = $getRoot();
        const diffNode = $findDiffBlockByDiffId(root, diff.diffId);

        if (diffNode) {
            if (diff.type === 'edit') {
                // Restore original paragraph with original content
                const restoredPara = $createThesisParagraphNode(diff.paraId);
                const oldHtml = diffNode.getOldHtml() || diff.before;
                _injectContentIntoNode(editor, restoredPara, oldHtml);
                diffNode.replace(restoredPara);

            } else if (diff.type === 'insert') {
                // Reject insert = just remove the diff block
                diffNode.remove();

            } else if (diff.type === 'delete') {
                // Reject delete = restore the original paragraph
                const restoredPara = $createThesisParagraphNode(diff.paraId);
                const oldHtml = diffNode.getOldHtml() || diff.before;
                _injectContentIntoNode(editor, restoredPara, oldHtml);
                diffNode.replace(restoredPara);
            }
        } else {
            // Fallback: just clean CSS if no DiffBlockNode found
            _cleanDiffHighlight(editor, diff);
        }
    });
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Find a ThesisParagraphNode by its paraId.
 * Must be called inside editor.read() or editor.update() context.
 */
function $findNodeByParaId(paraId) {
    const root = $getRoot();
    const children = root.getChildren();
    for (const child of children) {
        if (child instanceof ThesisParagraphNode && child.getParagraphId() === paraId) {
            return child;
        }
    }
    return null;
}

/**
 * Get HTML content from a node preserving formatting (used to capture "before" state).
 */
function _getNodeHtmlContent(editor, node) {
    if (!node) return '';
    // Use exportDOM to get the raw HTML element, then extract its innerHTML
    const { element } = node.exportDOM(editor);
    if (element) {
        return element.innerHTML;
    }
    // Fallback if exportDOM fails
    return node.getTextContent() || '';
}

/**
 * Replace all content inside a node with new HTML content.
 * Must be called inside editor.update() context.
 */
function _replaceNodeContent(editor, node, htmlContent) {
    node.clear();
    if (!htmlContent) return;
    _injectContentIntoNode(editor, node, htmlContent);
}

/**
 * Inject HTML content into a node as children.
 * Must be called inside editor.update() context.
 */
function _injectContentIntoNode(editor, node, htmlContent) {
    if (!htmlContent) return;

    // Plain text (no HTML tags) — insert as text node
    if (!/\<[^>]+>/.test(htmlContent)) {
        const textNode = $createTextNode(htmlContent);
        node.append(textNode);
        return;
    }

    try {
        const parser = new DOMParser();
        const dom = parser.parseFromString(htmlContent, 'text/html');
        const nodes = $generateNodesFromDOM(editor, dom);

        for (const n of nodes) {
            // Unwrap paragraph-level nodes — append their children directly
            if (n.getType && (n.getType() === 'paragraph' || n.getType() === 'thesis-paragraph')) {
                const innerChildren = n.getChildren();
                for (const child of innerChildren) {
                    node.append(child);
                }
            } else {
                node.append(n);
            }
        }
    } catch (err) {
        // Fallback: insert as plain text
        const textNode = $createTextNode(htmlContent);
        node.append(textNode);
    }
}

/**
 * Clean diff highlight classes from DOM (legacy fallback).
 */
function _cleanDiffHighlight(editor, diff) {
    const rootEl = editor.getRootElement();
    if (!rootEl) return;

    const elements = rootEl.querySelectorAll(`[data-diff-id="${diff.diffId}"]`);
    elements.forEach(el => {
        el.classList.remove('diff-edit', 'diff-add', 'diff-del');
        delete el.dataset.diffId;
    });

    const paraId = diff.type === 'insert' ? diff.anchorId : diff.paraId;
    if (paraId) {
        const dom = rootEl.querySelector(`[data-para-id="${paraId}"]`);
        if (dom) {
            dom.classList.remove('diff-edit', 'diff-add', 'diff-del');
            delete dom.dataset.diffId;
        }
    }
}

// Export helper for useAgentLoop
export { $findNodeByParaId };
