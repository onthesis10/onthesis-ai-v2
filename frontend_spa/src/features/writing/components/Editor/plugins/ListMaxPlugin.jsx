import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_LOW } from 'lexical';
import { $isListMaxNode, ListMaxNode } from '../nodes/ListMaxNode';
import { $isListNode, $isListItemNode } from '@lexical/list';
import { $getNearestNodeOfType } from '@lexical/utils';

import { createCommand } from 'lexical';

export const SET_LIST_TYPE_STYLE_COMMAND = createCommand('SET_LIST_TYPE_STYLE_COMMAND');

export default function ListMaxPlugin() {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        return editor.registerCommand(
            SET_LIST_TYPE_STYLE_COMMAND,
            (style) => {
                editor.update(() => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                        const nodes = selection.getNodes();

                        // Find the nearest list item
                        let listItem = null;
                        for (let node of nodes) {
                            if ($isListItemNode(node)) {
                                listItem = node;
                                break;
                            }
                            const parent = node.getParent();
                            if ($isListItemNode(parent)) {
                                listItem = parent;
                                break;
                            }
                        }

                        if (listItem) {
                            const listNode = listItem.getParent();
                            if ($isListNode(listNode)) {
                                // If it's already a ListMaxNode, just update the style
                                if ($isListMaxNode(listNode)) {
                                    listNode.setListTypeStyle(style);
                                }
                            }
                        }
                    }
                });
                return true;
            },
            COMMAND_PRIORITY_LOW
        );
    }, [editor]);

    return null;
}
