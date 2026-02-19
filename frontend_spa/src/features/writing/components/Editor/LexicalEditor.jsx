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
import { $getRoot, $insertNodes, CLEAR_HISTORY_COMMAND } from 'lexical';
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
// import { ReviewNode } from './nodes/ReviewNode'; // Uncomment jika file ada

// --- UI & THEME ---
import { editorTheme } from './styles/editorTheme';
import Ribbon from './ribbon/Ribbon';

// --- PLUGINS (LOGIC LAYERS) ---
import ToolbarActionPlugin from './plugins/ToolbarActionPlugin'; // [NEW] Logic Ribbon
import CitationPlugin from './plugins/CitationPlugin'; // [NEW] Logic Sitasi
import AISlashPlugin from './plugins/AISlashPlugin'; 
import ReviewPlugin from './plugins/ReviewPlugin'; 
import AutoSavePlugin from './plugins/AutoSavePlugin'; 
import FloatingToolbarPlugin from './plugins/FloatingToolbarPlugin'; 

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
                }
            };
        }
    }, [editor, editorRef]);
    return null;
};

// ==========================================
// MAIN COMPONENT
// ==========================================
const LexicalEditor = forwardRef(({ 
    initialContent, onChange, onSave, isStreaming, projectId, activeChapterId, projectContext 
}, ref) => {
  
  const [isGhostWriting, setIsGhostWriting] = useState(false);

  // 1. REGISTER NODES
  const nodes = [ 
    HeadingNode, QuoteNode, ListItemNode, ListNode, 
    HorizontalRuleNode, CodeNode, CodeHighlightNode, 
    TableNode, TableCellNode, TableRowNode, AutoLinkNode, LinkNode,
    CitationNode, ImageNode, BibliographyNode, // Node khusus sitasi, gambar, dan daftar pustaka
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
        <div className="shrink-0 z-20 shadow-sm relative border-b border-gray-200 dark:border-white/5">
            <Ribbon /> 
        </div>
        
        {/* --- B. EDITOR CANVAS --- */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-white dark:bg-[#1E1E1E]">
            <div className="min-h-full pb-32"> 
                <RichTextPlugin
                    contentEditable={
                        <ContentEditable 
                            className="outline-none px-12 py-10 max-w-none w-full prose prose-lg prose-slate dark:prose-invert focus:outline-none" 
                            style={{ fontFamily: 'Times New Roman', fontSize: '12pt', lineHeight: '2.0' }} // Standard Skripsi
                        />
                    }
                    placeholder={
                        <div className="absolute top-10 left-12 text-gray-300 dark:text-gray-600 pointer-events-none text-lg font-serif select-none">
                            Mulai menulis bab ini...
                        </div>
                    }
                    ErrorBoundary={LexicalErrorBoundary}
                />
            </div>

            {/* --- C. CORE PLUGINS --- */}
            <HistoryPlugin />
            <AutoFocusPlugin />
            <ListPlugin />
            <HorizontalRulePlugin />
            <OnChangePlugin onChange={(editorState, editor) => {
                editorState.read(() => {
                    if (onChange) onChange($generateHtmlFromNodes(editor, null));
                });
            }} ignoreSelectionChange />
            
            {/* --- D. CUSTOM LOGIC PLUGINS --- */}
            <ToolbarActionPlugin /> {/* Menghubungkan Ribbon ke Editor */}
            <CitationPlugin />      {/* Menghandle logic insert sitasi */}
            
            <AutoSavePlugin projectId={projectId} onServerSave={onSave} isStreaming={isStreaming || isGhostWriting} />
            <AutoLoadPlugin content={initialContent} />
            <EditorRefPlugin editorRef={ref} />
            
            {/* --- E. FEATURE PLUGINS --- */}
            <AISlashPlugin projectId={projectId} />
            <ReviewPlugin projectId={projectId} projectContext={projectContext} />
            <FloatingToolbarPlugin onStateChange={setIsGhostWriting} />
            
        </div>
      </LexicalComposer>
    </div>
  );
});

export default LexicalEditor;