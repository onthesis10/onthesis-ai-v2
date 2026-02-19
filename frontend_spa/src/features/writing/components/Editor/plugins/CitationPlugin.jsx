import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { COMMAND_PRIORITY_EDITOR, $insertNodes } from 'lexical';
import { INSERT_CITATION_COMMAND } from '../commands/customCommands';
import { $createCitationNode } from '../nodes/CitationNode';

export default function CitationPlugin() {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        return editor.registerCommand(
            INSERT_CITATION_COMMAND,
            (payload) => {
                // [UPDATE] Terima 'text' langsung jika ada (untuk format custom seperti MLA/Harvard)
                // Fallback ke format default (Author, Year) jika text tidak disediakan
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
    }, [editor]);

    return null;
}