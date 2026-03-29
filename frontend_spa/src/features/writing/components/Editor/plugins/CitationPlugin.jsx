import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
    COMMAND_PRIORITY_EDITOR,
    $insertNodes,
    $createTextNode,
    TextNode,
    $isTextNode
} from 'lexical';
import { INSERT_CITATION_COMMAND } from '../commands/customCommands';
import { $createCitationNode, $isCitationNode } from '../nodes/CitationNode';

// Regex untuk mendeteksi (Penulis, Tahun) atau (Penulis et al., Tahun)
const CITATION_REGEX = /\(([^),]+(?: et al\.)?),\s*(\d{4})\)/g;

export default function CitationPlugin() {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        // 1. Register Command: Manual insertion via Ribbon/Shortcut
        const unregisterCommand = editor.registerCommand(
            INSERT_CITATION_COMMAND,
            (payload) => {
                const author = payload?.author || 'Anonim';
                const year = payload?.year || 'n.d.';
                const displayText = payload?.text || `(${author}, ${year})`;

                editor.update(() => {
                    const citationNode = $createCitationNode(displayText);
                    $insertNodes([citationNode]);
                });
                return true;
            },
            COMMAND_PRIORITY_EDITOR
        );

        // 2. Register Transform: Auto-convert text patterns like (Bengio, 2009)
        // Ini memastikan teks dari AI otomatis berubah jadi node bergaya
        const unregisterTransform = editor.registerNodeTransform(TextNode, (node) => {
            if ($isCitationNode(node) || !node.isSimpleText()) return;

            const text = node.getTextContent();
            const match = CITATION_REGEX.exec(text);

            if (match !== null) {
                const start = match.index;
                const end = start + match[0].length;

                // Jika match bukan di seluruh teks, split node
                if (start > 0 || end < text.length) {
                    let targetNode = node;
                    if (start > 0) {
                        [, targetNode] = node.splitText(start);
                    }
                    if (end < text.length) {
                        [targetNode] = targetNode.splitText(end - start);
                    }

                    const citationNode = $createCitationNode(match[0]);
                    targetNode.replace(citationNode);
                } else {
                    const citationNode = $createCitationNode(text);
                    node.replace(citationNode);
                }
            }
        });

        return () => {
            unregisterCommand();
            unregisterTransform();
        };
    }, [editor]);

    return null;
}