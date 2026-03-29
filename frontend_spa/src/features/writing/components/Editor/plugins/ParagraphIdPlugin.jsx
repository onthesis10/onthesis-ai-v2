import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ParagraphNode } from 'lexical';
import { ThesisParagraphNode } from '../nodes/ThesisParagraphNode';

export function ParagraphIdPlugin() {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        return editor.registerNodeTransform(ParagraphNode, (node) => {
            // Jika node bukan ThesisParagraphNode tapi merupakan ParagraphNode biasa, 
            // replace dengan ThesisParagraphNode agar otomatis mendapatkan paraId.
            if (!(node instanceof ThesisParagraphNode)) {
                const thesisNode = new ThesisParagraphNode();
                node.replace(thesisNode, true); // true = transfer semua children text/inline dari node lama
            }
        });
    }, [editor]);

    return null;
}
