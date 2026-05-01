import React, { useEffect, useRef, useState, forwardRef } from 'react';

// --- LEXICAL CORE ---
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { $getRoot, $insertNodes, CLEAR_HISTORY_COMMAND, $getSelection, $isRangeSelection } from 'lexical';
import { $isHeadingNode } from '@lexical/rich-text';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';

// --- NODES ---
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import { CodeNode, CodeHighlightNode } from '@lexical/code';
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { CitationNode } from './nodes/CitationNode'; // [NEW] Academic Node
import { ImageNode } from './nodes/ImageNode';
import { BibliographyNode } from './nodes/BibliographyNode';
import { GhostTextNode } from './nodes/GhostTextNode'; // [Phase 2] Ghost Text
import { ThesisParagraphNode } from './nodes/ThesisParagraphNode'; // [NEW]
import { DiffBlockNode } from './nodes/DiffBlockNode.jsx'; // [Sprint 7] Inline diff
import { ListMaxNode } from './nodes/ListMaxNode'; // [NEW] Custom List Styles
// import { ReviewNode } from './nodes/ReviewNode'; // Uncomment jika file ada

// --- UI & THEME ---
import { editorTheme } from './styles/editorTheme';
import Ribbon from './ribbon/Ribbon';

// --- PLUGINS (LOGIC LAYERS) ---
import ToolbarActionPlugin from './plugins/ToolbarActionPlugin'; // [NEW] Logic Ribbon
import CitationPlugin from './plugins/CitationPlugin'; // [NEW] Logic Sitasi
import CitationTooltipPlugin from './plugins/CitationTooltipPlugin'; // [NEW] Hover Tooltip Sitasi
import AISlashPlugin from './plugins/AISlashPlugin';
import ReviewPlugin from './plugins/ReviewPlugin';
import AutoSavePlugin from './plugins/AutoSavePlugin';
import FloatingToolbarPlugin from './plugins/FloatingToolbarPlugin';
import CollabSyncPlugin from './plugins/CollabSyncPlugin';
import ListMaxPlugin from './plugins/ListMaxPlugin'; // [NEW] Custom List Styles
import CitationMentionPlugin from './plugins/CitationMentionPlugin'; // [NEW] @ Mention

// --- PHASE 2 PLUGINS ---
import GhostTextPlugin from './plugins/GhostTextPlugin';
import CursorTrackPlugin from './plugins/CursorTrackPlugin';
import DiagnosticPlugin from './plugins/DiagnosticPlugin';
import { ParagraphIdPlugin } from './plugins/ParagraphIdPlugin'; // [NEW]
import ParagraphNumberPlugin from './plugins/ParagraphNumberPlugin'; // [NEW] Sequential P-001 labels
import WritingProgressPlugin from './plugins/WritingProgressPlugin';

const ReviewNode = null; // Fallback jika ReviewNode belum ada

// --- HELPER: AUTO LOAD CONTENT ---
function AutoLoadPlugin({ content }) {
    const [editor] = useLexicalComposerContext();
    const loadedRef = useRef(false);
    useEffect(() => {
        if (!content || loadedRef.current) return;
        editor.update(() => {
            const root = $getRoot();
            if (root.getTextContent().trim() !== '') return;
            const parser = new DOMParser();
            const dom = parser.parseFromString(content, 'text/html');
            const nodes = $generateNodesFromDOM(editor, dom);
            root.clear();
            $insertNodes(nodes);
            editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
        });
        loadedRef.current = true;
    }, [content, editor]);
    return null;
}

// --- HELPER: EXPOSE REF ---
const EditorRefPlugin = ({ editorRef }) => {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        if (editorRef) {
            editorRef.current = {
                // Sprint 5: Expose raw Lexical editor for EditorDiffBridge
                _lexicalEditor: editor,
                insertContent: (html) => {
                    editor.update(() => {
                        const parser = new DOMParser();
                        const dom = parser.parseFromString(html, 'text/html');
                        const nodes = $generateNodesFromDOM(editor, dom);
                        $insertNodes(nodes);
                    });
                },
                getHtml: () => {
                    let html = '';
                    editor.getEditorState().read(() => { html = $generateHtmlFromNodes(editor, null); });
                    return html;
                },
                getSelectionHtml: () => {
                    let selectionText = '';
                    editor.getEditorState().read(() => {
                        const selection = editor.getEditorState()._selection;
                        if (selection && selection.getTextContent) {
                            selectionText = selection.getTextContent();
                        }
                    });
                    return selectionText;
                },
                focus: () => {
                    editor.focus();
                },

                getParagraphsWithIds: () => {
                    const result = [];
                    editor.getEditorState().read(() => {
                        $getRoot().getChildren().forEach(node => {
                            if (node instanceof ThesisParagraphNode) {
                                result.push({
                                    paraId: node.getParagraphId(),
                                    nodeKey: node.getKey ? node.getKey() : node.__key,
                                    target_key: node.getKey ? node.getKey() : node.__key,
                                    content: node.getTextContent(),
                                });
                            }
                        });
                    });
                    return result;
                },

                // ── NEW: Active Node Context for "Context is King" ──
                getActiveNodeContext: () => {
                    let context = null;
                    editor.getEditorState().read(() => {
                        const selection = $getSelection();
                        if (!$isRangeSelection(selection)) return;

                        const anchorNode = selection.anchor.getNode();
                        // Walk up to find the top-level paragraph/block
                        let blockNode = anchorNode;
                        while (blockNode && blockNode.getParent() && blockNode.getParent() !== $getRoot()) {
                            blockNode = blockNode.getParent();
                        }
                        if (!blockNode) return;

                        const root = $getRoot();
                        const children = root.getChildren();
                        const blockIndex = children.indexOf(blockNode);

                        // Current paragraph text
                        const paragraphText = blockNode.getTextContent();

                        // Previous paragraph
                        const prevNode = blockIndex > 0 ? children[blockIndex - 1] : null;
                        const prevParagraph = prevNode ? prevNode.getTextContent() : '';

                        // Next paragraph
                        const nextNode = blockIndex < children.length - 1 ? children[blockIndex + 1] : null;
                        const nextParagraph = nextNode ? nextNode.getTextContent() : '';

                        // Heading hierarchy: collect headings from start to current position
                        const headingHierarchy = [];
                        for (let i = 0; i <= blockIndex; i++) {
                            const child = children[i];
                            if ($isHeadingNode(child)) {
                                headingHierarchy.push({
                                    tag: child.getTag(),
                                    text: child.getTextContent(),
                                });
                            }
                        }

                        // Word count of entire document
                        const fullText = root.getTextContent();
                        const wordCount = fullText.trim() ? fullText.trim().split(/\s+/).length : 0;

                        context = {
                            paraId: blockNode instanceof ThesisParagraphNode ? blockNode.getParagraphId() : null,
                            nodeKey: blockNode.getKey ? blockNode.getKey() : blockNode.__key,
                            target_key: blockNode.getKey ? blockNode.getKey() : blockNode.__key,
                            paragraphText,
                            prevParagraph,
                            nextParagraph,
                            headingHierarchy,
                            wordCount,
                            blockIndex,
                            totalBlocks: children.length,
                        };
                    });
                    return context;
                },
            };
        }
    }, [editor, editorRef]);
    return null;
};

// ==========================================
// MAIN COMPONENT
// ==========================================
const LexicalEditor = forwardRef(({
    initialContent, onChange, onSave, isStreaming, projectId, activeChapterId, projectContext,
    references = [], // [NEW] Untuk @ Mention
    hideRibbon = false,
    onUpdateSummary = null, // Sprint 2: chapter summary trigger
}, ref) => {

    const [isGhostWriting, setIsGhostWriting] = useState(false);

    const handleContextMenu = (e) => {
        const selection = window.getSelection();
        const selectedText = selection?.toString()?.trim();

        if (selectedText) {
            e.preventDefault();
            let targetKey = '';
            if (ref && ref.current && ref.current.getActiveNodeContext) {
                const ctx = ref.current.getActiveNodeContext();
                if (ctx && ctx.target_key) {
                    targetKey = ctx.target_key;
                }
            }

            window.dispatchEvent(new CustomEvent('onthesis-editor-context-menu', {
                detail: {
                    x: e.clientX,
                    y: e.clientY,
                    selectedText,
                    targetKey
                }
            }));
        }
    };

    // 1. REGISTER NODES
    const nodes = [
        ThesisParagraphNode,
        HeadingNode, QuoteNode, ListItemNode,
        ListMaxNode,
        {
            replace: ListNode,
            with: (node) => {
                return new ListMaxNode(node.getListType(), node.getStart());
            }
        },
        HorizontalRuleNode, CodeNode, CodeHighlightNode,
        TableNode, TableCellNode, TableRowNode, AutoLinkNode, LinkNode,
        CitationNode, ImageNode, BibliographyNode, // Node khusus sitasi, gambar, dan daftar pustaka
        GhostTextNode, // [Phase 2] Ghost Text inline completion
        DiffBlockNode, // [Sprint 7] Inline diff visualization
    ];
    if (ReviewNode) nodes.push(ReviewNode);

    // 2. CONFIG
    const initialConfig = {
        namespace: 'OnThesisEditor',
        theme: editorTheme,
        nodes: nodes,
        onError: (error) => console.error('[Lexical Error]:', error),
    };

    return (
        <div className="relative w-full h-full flex flex-col bg-white dark:bg-[#1E1E1E] transition-colors duration-300 overflow-hidden">

            <LexicalComposer initialConfig={initialConfig}>

                {/* --- A. RIBBON (UI ONLY) --- */}
                {!hideRibbon && (
                    <div className="shrink-0 z-20 shadow-sm relative border-b border-gray-200 dark:border-white/5">
                        <Ribbon />
                    </div>
                )}

                {/* --- B. EDITOR CANVAS (CONTINUOUS VIEW) --- */}
                <div 
                    className="flex-1 overflow-y-auto custom-scrollbar relative px-12 py-10 bg-white dark:bg-[#1E1E1E]"
                    onContextMenu={handleContextMenu}
                >
                    <div className="min-h-full pb-32 max-w-4xl mx-auto">
                        <RichTextPlugin
                            contentEditable={
                                <ContentEditable
                                    className="outline-none w-full prose prose-lg prose-slate dark:prose-invert focus:outline-none"
                                    style={{ fontFamily: 'serif', fontSize: '12pt', lineHeight: '2.0' }} // Standard Skripsi
                                />
                            }
                            placeholder={
                                <div className="absolute top-10 left-12 text-gray-300 dark:text-gray-600 pointer-events-none text-lg font-serif select-none mt-10">
                                    Mulai menulis bab ini...
                                </div>
                            }
                            ErrorBoundary={LexicalErrorBoundary}
                        />
                    </div>
                </div>

                {/* --- C. CORE PLUGINS --- */}
                <HistoryPlugin />
                <AutoFocusPlugin />
                <ListPlugin />
                <ListMaxPlugin />
                <HorizontalRulePlugin />
                <OnChangePlugin onChange={(editorState, editor) => {
                    editorState.read(() => {
                        if (onChange) onChange($generateHtmlFromNodes(editor, null));
                    });
                }} ignoreSelectionChange />

                {/* --- D. CUSTOM LOGIC PLUGINS --- */}
                <ToolbarActionPlugin /> {/* Menghubungkan Ribbon ke Editor */}
                <CitationPlugin />      {/* Menghandle logic insert sitasi */}
                <CitationTooltipPlugin /> {/* Menampilkan popover saat sitasi diklik */}
                <WritingProgressPlugin />

                <AutoSavePlugin projectId={projectId} onServerSave={onSave} isStreaming={isStreaming || isGhostWriting} onUpdateSummary={onUpdateSummary} activeChapterId={activeChapterId} />
                <AutoLoadPlugin content={initialContent} />
                <EditorRefPlugin editorRef={ref} />

                {/* --- E. FEATURE PLUGINS --- */}
                <ParagraphIdPlugin />
                <ParagraphNumberPlugin />
                <AISlashPlugin projectId={projectId} />
                <CitationMentionPlugin references={references} />
                <ReviewPlugin projectId={projectId} projectContext={projectContext} />
                <FloatingToolbarPlugin onStateChange={setIsGhostWriting} />
                <CollabSyncPlugin documentId={activeChapterId || projectId || 'general_room'} />

                {/* --- F. PHASE 2: INTELLIGENCE PLUGINS --- */}
                <GhostTextPlugin isStreaming={isStreaming || isGhostWriting} />
                <CursorTrackPlugin />
                <DiagnosticPlugin />
            </LexicalComposer >
        </div >
    );
});

export default LexicalEditor;
