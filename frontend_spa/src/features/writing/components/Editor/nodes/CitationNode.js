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
    const theme = config.theme;
    const themeClass = theme.citation || '';

    // Selalu sertakan 'lexical-citation' agar plugin tooltip bisa mendeteksinya
    dom.className = `${themeClass} lexical-citation`.trim();

    dom.title = 'Citation (Click to view details)';
    return dom;
  }

  updateDOM(prevNode, dom, config) {
    const isUpdated = super.updateDOM(prevNode, dom, config);
    const theme = config.theme;
    const themeClass = theme.citation || '';
    const fullClass = `${themeClass} lexical-citation`.trim();

    if (dom.className !== fullClass) {
      dom.className = fullClass;
    }

    return isUpdated;
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