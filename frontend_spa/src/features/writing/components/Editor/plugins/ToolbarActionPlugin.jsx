// FILE: src/components/Editor/plugins/ToolbarActionPlugin.jsx

import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { 
    $getSelection, 
    $isRangeSelection, 
    COMMAND_PRIORITY_LOW, 
    $createParagraphNode, 
    $insertNodes 
} from 'lexical';
import { $setBlocksType } from '@lexical/selection';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { 
    INSERT_ORDERED_LIST_COMMAND, 
    INSERT_UNORDERED_LIST_COMMAND, 
    REMOVE_LIST_COMMAND 
} from '@lexical/list';

// Import Custom Commands yang sudah kita definisikan
import { 
    APPLY_BLOCK_TYPE_COMMAND, 
    APPLY_LIST_TYPE_COMMAND,
    INSERT_IMAGE_COMMAND,
    INSERT_TABLE_COMMAND
} from '../commands/customCommands';

// Import Helper dari ImageNode (Pastikan file ImageNode.jsx sudah dibuat)
import { $createImageNode } from '../nodes/ImageNode';

// Import Native Table Command (jika menggunakan @lexical/table)
// Jika belum install, bagian table ini bisa disesuaikan/dikomentari
import { INSERT_TABLE_COMMAND as LEXICAL_INSERT_TABLE_COMMAND } from '@lexical/table';

export default function ToolbarActionPlugin() {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        // ==========================================
        // 1. HANDLE BLOCK TYPES (H1, H2, Quote, Paragraph)
        // ==========================================
        const removeBlockListener = editor.registerCommand(
            APPLY_BLOCK_TYPE_COMMAND,
            (type) => {
                editor.update(() => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                        $setBlocksType(selection, () => {
                            switch (type) {
                                case 'h1': return $createHeadingNode('h1');
                                case 'h2': return $createHeadingNode('h2');
                                case 'h3': return $createHeadingNode('h3');
                                case 'quote': return $createQuoteNode();
                                case 'paragraph': 
                                default: return $createParagraphNode();
                            }
                        });
                    }
                });
                return true;
            },
            COMMAND_PRIORITY_LOW
        );

        // ==========================================
        // 2. HANDLE LIST TYPES (Bullet, Number)
        // ==========================================
        const removeListListener = editor.registerCommand(
            APPLY_LIST_TYPE_COMMAND,
            (type) => {
                if (type === 'bullet') {
                    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
                } else if (type === 'number') {
                    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
                } else {
                    editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
                }
                return true;
            },
            COMMAND_PRIORITY_LOW
        );

        // ==========================================
        // 3. HANDLE INSERT IMAGE
        // ==========================================
        const removeImageListener = editor.registerCommand(
            INSERT_IMAGE_COMMAND,
            (payload) => {
                // Payload: { src: string, altText: string }
                editor.update(() => {
                    const imageNode = $createImageNode({
                        src: payload.src,
                        altText: payload.altText || "Uploaded Image",
                        maxWidth: 600 // Default max width agar tidak pecah layout
                    });
                    $insertNodes([imageNode]);
                });
                return true;
            },
            COMMAND_PRIORITY_LOW
        );

        // ==========================================
        // 4. HANDLE INSERT TABLE
        // ==========================================
        const removeTableListener = editor.registerCommand(
            INSERT_TABLE_COMMAND,
            () => {
                // Kita meneruskan perintah ke Native Lexical Table Plugin
                // Default membuat tabel 3 kolom x 3 baris
                // Pastikan TablePlugin sudah dipasang di LexicalEditor.jsx agar ini jalan
                return editor.dispatchCommand(LEXICAL_INSERT_TABLE_COMMAND, { 
                    columns: '3', 
                    rows: '3', 
                    includeHeaders: true 
                });
            },
            COMMAND_PRIORITY_LOW
        );

        // Cleanup function (Unregister listeners saat unmount)
        return () => {
            removeBlockListener();
            removeListListener();
            removeImageListener();
            removeTableListener();
        };
    }, [editor]);

    return null; // Plugin Logic tidak merender UI apa pun
}