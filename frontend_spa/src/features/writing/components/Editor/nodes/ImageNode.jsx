// FILE: src/components/Editor/nodes/ImageNode.jsx

import { DecoratorNode } from 'lexical';
import * as React from 'react';

// --- REACT COMPONENT UNTUK GAMBAR ---
function ImageComponent({ src, altText, width, maxWidth }) {
  return (
    <div className="image-node-container py-4 flex justify-center">
      <img
        src={src}
        alt={altText}
        style={{ width: width || '100%', maxWidth: maxWidth || '100%', height: 'auto' }}
        className="rounded-lg shadow-sm border border-gray-200 dark:border-white/10 select-none hover:shadow-md transition-shadow"
        draggable="false"
      />
    </div>
  );
}

// --- NODE DEFINITION ---
export class ImageNode extends DecoratorNode {
  
  constructor(src, altText, maxWidth, key) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__maxWidth = maxWidth;
  }

  static getType() {
    return 'image';
  }

  static clone(node) {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__maxWidth,
      node.__key,
    );
  }

  static importJSON(serializedNode) {
    const { src, altText, maxWidth } = serializedNode;
    return $createImageNode({ src, altText, maxWidth });
  }

  exportJSON() {
    return {
      src: this.__src,
      altText: this.__altText,
      maxWidth: this.__maxWidth,
      type: 'image',
      version: 1,
    };
  }

  createDOM(config) {
    const span = document.createElement('span');
    const theme = config.theme;
    const className = theme.image;
    if (className !== undefined) {
      span.className = className;
    }
    return span;
  }

  updateDOM() {
    return false;
  }

  decorate() {
    return (
      <ImageComponent
        src={this.__src}
        altText={this.__altText}
        width="100%"
        maxWidth={this.__maxWidth}
      />
    );
  }
}

//Helper Function
export function $createImageNode({ src, altText, maxWidth }) {
  return new ImageNode(src, altText, maxWidth);
}

export function $isImageNode(node) {
  return node instanceof ImageNode;
}