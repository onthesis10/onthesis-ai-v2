import { ParagraphNode } from 'lexical';
import { nanoid } from 'nanoid';

export class ThesisParagraphNode extends ParagraphNode {
    static getType() { return 'thesis-paragraph'; }

    constructor(paraId, key) {
        super(key);
        this.__paraId = paraId || 'P-' + nanoid(6);
    }

    exportJSON() {
        return { ...super.exportJSON(), paraId: this.__paraId, type: 'thesis-paragraph' };
    }

    static importJSON(json) {
        return new ThesisParagraphNode(json.paraId);
    }

    exportDOM(editor) {
        const { element } = super.exportDOM(editor);
        if (element && element instanceof HTMLElement) {
            element.setAttribute('data-para-id', this.__paraId);
            element.classList.add('thesis-para-block');
        }
        return { element };
    }

    static importDOM() {
        return {
            p: (node) => ({
                conversion: (element) => {
                    const paraId = element.getAttribute('data-para-id');
                    if (paraId) {
                        const new_node = $createThesisParagraphNode(paraId);
                        if (element.style.textAlign) {
                            new_node.setFormat(element.style.textAlign);
                        }
                        return { node: new_node };
                    }
                    return null; // Let ParagraphNode handle it if no data-para-id
                },
                priority: 1, // Higher priority than basic ParagraphNode
            }),
        };
    }

    createDOM(config) {
        const dom = super.createDOM(config);
        dom.setAttribute('data-para-id', this.__paraId);
        dom.classList.add('thesis-para-block');
        return dom;
    }

    updateDOM(prevNode, dom, config) {
        const needsUpdate = super.updateDOM(prevNode, dom, config);
        if (prevNode.__paraId !== this.__paraId) {
            dom.setAttribute('data-para-id', this.__paraId);
        }
        return needsUpdate;
    }

    static clone(node) {
        return new ThesisParagraphNode(node.__paraId, node.__key);
    }

    getParagraphId() { return this.__paraId; }
}

export function $createThesisParagraphNode(paraId) {
    return new ThesisParagraphNode(paraId);
}
export function $isThesisParagraphNode(node) {
    return node instanceof ThesisParagraphNode;
}
