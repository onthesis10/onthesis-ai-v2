// FILE: src/components/Editor/nodes/BibliographyNode.jsx
import { ElementNode } from 'lexical';

export class BibliographyNode extends ElementNode {
  static getType() {
    return 'bibliography';
  }

  static clone(node) {
    return new BibliographyNode(node.__key);
  }

  createDOM(config) {
    const dom = document.createElement('p');
    // Ambil class dari theme 'bibliography' -> 'hanging-indent'
    const className = config.theme.bibliography; 
    if (className) {
      dom.className = className;
    }
    return dom;
  }

  updateDOM() {
    return false;
  }

  exportJSON() {
    return {
      type: 'bibliography',
      version: 1,
      children: [],
      format: '',
      indent: 0,
      direction: null,
    };
  }

  static importJSON() {
    return $createBibliographyNode();
  }
}

export function $createBibliographyNode() {
  return new BibliographyNode();
}

export function $isBibliographyNode(node) {
  return node instanceof BibliographyNode;
}