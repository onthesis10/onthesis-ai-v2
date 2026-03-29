// ─── DiffBlockNode — Lexical DecoratorNode for inline diff visualization ───
// Replaces the target paragraph in the editor with a React component that
// shows old/new content side-by-side with Accept/Reject buttons.
// Inspired by VS Code inline diff.

import { DecoratorNode } from 'lexical';
import React from 'react';
import DiffBlockComponent from './DiffBlockComponent.jsx';

export class DiffBlockNode extends DecoratorNode {
    __diffId;
    __diffType; // 'edit' | 'insert' | 'delete'
    __oldHtml;
    __newHtml;
    __paraId;
    __reason;

    static getType() {
        return 'diff-block';
    }

    constructor(diffId, diffType, oldHtml, newHtml, paraId, reason, key) {
        super(key);
        this.__diffId = diffId;
        this.__diffType = diffType;
        this.__oldHtml = oldHtml;
        this.__newHtml = newHtml;
        this.__paraId = paraId;
        this.__reason = reason || '';
    }

    static clone(node) {
        return new DiffBlockNode(
            node.__diffId,
            node.__diffType,
            node.__oldHtml,
            node.__newHtml,
            node.__paraId,
            node.__reason,
            node.__key,
        );
    }

    // ── Serialization ──
    exportJSON() {
        return {
            type: 'diff-block',
            version: 1,
            diffId: this.__diffId,
            diffType: this.__diffType,
            oldHtml: this.__oldHtml,
            newHtml: this.__newHtml,
            paraId: this.__paraId,
            reason: this.__reason,
        };
    }

    static importJSON(json) {
        return new DiffBlockNode(
            json.diffId,
            json.diffType,
            json.oldHtml,
            json.newHtml,
            json.paraId,
            json.reason,
        );
    }

    // ── HTML Serialization (Prevents Data Loss on Autosave) ──
    exportDOM(editor) {
        const element = document.createElement('p');
        // If it's an edit or delete, saving the Old HTML ensures the user 
        // doesn't lose their original work if they reload the page.
        // If it's an insert, saving empty is fine since it didn't exist yet.
        element.innerHTML = this.__diffType === 'insert' ? '' : this.__oldHtml;
        element.setAttribute('data-para-id', this.__paraId);
        element.classList.add('thesis-para-block');
        return { element };
    }

    // ── DOM: creates a container div ──
    createDOM(config) {
        const div = document.createElement('div');
        div.className = 'diff-block-wrapper';
        div.setAttribute('data-diff-id', this.__diffId);
        div.setAttribute('data-para-id', this.__paraId);
        div.style.userSelect = 'none';
        return div;
    }

    updateDOM() {
        return false;
    }

    // ── Not editable — user interacts via React component ──
    isInline() {
        return false;
    }

    // ── Render React component inside the editor ──
    decorate() {
        return (
            <DiffBlockComponent
                diffId={this.__diffId}
                diffType={this.__diffType}
                oldHtml={this.__oldHtml}
                newHtml={this.__newHtml}
                paraId={this.__paraId}
                reason={this.__reason}
            />
        );
    }

    // ── Getters ──
    getDiffId() { return this.__diffId; }
    getDiffType() { return this.__diffType; }
    getOldHtml() { return this.__oldHtml; }
    getNewHtml() { return this.__newHtml; }
    getParaId() { return this.__paraId; }
    getReason() { return this.__reason; }
}

export function $createDiffBlockNode(diffId, diffType, oldHtml, newHtml, paraId, reason) {
    return new DiffBlockNode(diffId, diffType, oldHtml, newHtml, paraId, reason);
}

export function $isDiffBlockNode(node) {
    return node instanceof DiffBlockNode;
}

// ── Helper: find DiffBlockNode by diffId ──
export function $findDiffBlockByDiffId(root, diffId) {
    const children = root.getChildren();
    for (const child of children) {
        if ($isDiffBlockNode(child) && child.getDiffId() === diffId) {
            return child;
        }
    }
    return null;
}
