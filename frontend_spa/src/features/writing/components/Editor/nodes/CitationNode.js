// FILE: src/components/Editor/nodes/CitationNode.js

import { TextNode } from 'lexical';

export class CitationNode extends TextNode {
  constructor(text, key) {
    super(text, key);
    this.__mode = 1; // Immutable mode (supaya tidak bisa diedit per huruf, harus hapus satu blok)
  }

  static getType() {
    return 'citation';
  }

  static clone(node) {
    return new CitationNode(node.__text, node.__key);
  }

  createDOM(config) {
    const dom = super.createDOM(config);
    // Styling khusus sitasi (misal: background abu-abu tipis saat hover)
    dom.style.backgroundColor = 'rgba(0, 0, 255, 0.05)';
    dom.style.borderRadius = '4px';
    dom.style.padding = '2px 4px';
    dom.style.cursor = 'pointer';
    dom.title = 'Citation (Click to edit)';
    return dom;
  }

  static importJSON(serializedNode) {
    return $createCitationNode(serializedNode.text);
  }

  exportJSON() {
    return {
      ...super.exportJSON(),
      type: 'citation',
    };
  }
}

// Helper untuk membuat node
export function $createCitationNode(text) {
  return new CitationNode(text);
}

// Helper untuk mengecek apakah node ini CitationNode
export function $isCitationNode(node) {
  return node instanceof CitationNode;
}