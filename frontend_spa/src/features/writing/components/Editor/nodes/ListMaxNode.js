import { ListNode } from '@lexical/list';
import { $applyNodeReplacement } from 'lexical';

/**
 * ListMaxNode extends Lexical's native ListNode to support complex
 * ordered list styles like lower-alpha, lower-roman, etc.
 */
export class ListMaxNode extends ListNode {
    __listTypeStyle; // e.g. 'decimal', 'lower-alpha', 'upper-alpha', 'lower-roman', 'upper-roman'

    constructor(listType, start = 1, listTypeStyle = 'decimal', key) {
        super(listType, start, key);
        this.__listTypeStyle = listTypeStyle;
    }

    static getType() {
        return 'list-max';
    }

    static clone(node) {
        return new ListMaxNode(node.__listType, node.__start, node.__listTypeStyle, node.__key);
    }

    exportDOM(editor) {
        const { element } = super.exportDOM(editor);
        if (element && this.__listType === 'number' && this.__listTypeStyle) {
            element.style.listStyleType = this.__listTypeStyle;
        }
        return { element };
    }

    static importDOM() {
        return {
            ol: (node) => ({
                conversion: convertListMaxElement,
                priority: 1 // Higher priority than native ListNode
            }),
            ul: (node) => ({
                conversion: convertListMaxElement,
                priority: 1
            })
        };
    }

    createDOM(config, _editor) {
        const dom = super.createDOM(config, _editor);
        if (this.__listType === 'number' && this.__listTypeStyle) {
            dom.style.listStyleType = this.__listTypeStyle;
        }
        return dom;
    }

    updateDOM(prevNode, dom, config) {
        const superUpdated = super.updateDOM(prevNode, dom, config);

        if (prevNode.__listTypeStyle !== this.__listTypeStyle) {
            if (this.__listType === 'number' && this.__listTypeStyle) {
                dom.style.listStyleType = this.__listTypeStyle;
            } else {
                dom.style.listStyleType = '';
            }
            return true;
        }

        return superUpdated;
    }

    exportJSON() {
        return {
            ...super.exportJSON(),
            listTypeStyle: this.__listTypeStyle,
            type: 'list-max',
            version: 1,
        };
    }

    static importJSON(serializedNode) {
        const node = $createListMaxNode(serializedNode.listType, serializedNode.start, serializedNode.listTypeStyle);
        // node property restoration is handled by updateFromJSON natively in Lexical 0.12+ (since it calls super.updateFromJSON)
        node.setFormat(serializedNode.format);
        node.setIndent(serializedNode.indent);
        node.setDirection(serializedNode.direction);
        return node;
    }

    updateFromJSON(serializedNode) {
        return super.updateFromJSON(serializedNode).setListTypeStyle(serializedNode.listTypeStyle || 'decimal');
    }

    setListTypeStyle(style) {
        const writable = this.getWritable();
        writable.__listTypeStyle = style;
        return writable;
    }

    getListTypeStyle() {
        return this.getLatest().__listTypeStyle;
    }
}

export function $createListMaxNode(listType = 'number', start = 1, listTypeStyle = 'decimal') {
    return $applyNodeReplacement(new ListMaxNode(listType, start, listTypeStyle));
}

export function $isListMaxNode(node) {
    return node instanceof ListMaxNode;
}

function convertListMaxElement(domNode) {
    const nodeName = domNode.nodeName.toLowerCase();
    let node = null;
    if (nodeName === 'ol') {
        const start = domNode.getAttribute('start') ? parseInt(domNode.getAttribute('start'), 10) : 1;
        const listStyleType = domNode.style.listStyleType || 'decimal';
        node = $createListMaxNode('number', start, listStyleType);
    } else if (nodeName === 'ul') {
        node = $createListMaxNode('bullet');
        // Let checked lists be handled by the generic check mechanism if needed
    }
    return { node };
}
