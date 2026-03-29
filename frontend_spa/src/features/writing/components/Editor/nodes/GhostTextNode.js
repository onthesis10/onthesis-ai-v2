// ─── GhostTextNode — Lexical DecoratorNode for AI Suggestions ───
// Renders inline ghost text (grey, italic, non-selectable).
// Tab to accept, Esc to dismiss, any keystroke to dismiss.

import { DecoratorNode, $getNodeByKey } from 'lexical';

export class GhostTextNode extends DecoratorNode {
    __text;

    static getType() {
        return 'ghost-text';
    }

    static clone(node) {
        return new GhostTextNode(node.__text, node.__key);
    }

    constructor(text, key) {
        super(key);
        this.__text = text;
    }

    // ── Serialization (ghost text is never persisted) ──
    static importJSON() {
        return new GhostTextNode('');
    }

    exportJSON() {
        return {
            type: 'ghost-text',
            text: this.__text,
            version: 1,
        };
    }

    // ── DOM ──
    createDOM() {
        const span = document.createElement('span');
        span.className = 'ghost-text-node';
        span.style.cssText = `
            opacity: 0.4;
            font-style: italic;
            pointer-events: none;
            user-select: none;
            color: inherit;
        `;
        span.setAttribute('data-ghost', 'true');
        return span;
    }

    updateDOM() {
        return false;
    }

    // ── Decorator (React render) ──
    decorate() {
        return this.__text;
    }

    // ── Helpers ──
    getText() {
        return this.__text;
    }

    isInline() {
        return true;
    }

    // Ghost text should not be selectable or participate in selection
    isKeyboardSelectable() {
        return false;
    }
}

// ── Node creation helper ──
export function $createGhostTextNode(text) {
    return new GhostTextNode(text);
}

export function $isGhostTextNode(node) {
    return node instanceof GhostTextNode;
}
