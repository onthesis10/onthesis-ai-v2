import { $createBibliographyNode } from '../nodes/BibliographyNode';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom'; 
import { 
    Bold, Italic, Underline, AlignLeft, AlignCenter, 
    AlignRight, List, ListOrdered, Undo, Redo, 
    Type, Quote, Heading1, Heading2, AlignJustify,
    BookOpen, Quote as QuoteIcon, Library, Image as ImageIcon, Table,
    MessageSquarePlus, Search, Plus, X, ChevronDown, Check, PenTool,
    Loader2, CheckCircle2, AlertCircle 
} from 'lucide-react';
import { useEditorBridge } from '../hooks/useEditorBridge';
import { useProject } from '../../../context/ProjectContext';
import { mergeRegister } from '@lexical/utils';
import { 
    $getSelection, $isRangeSelection, 
    FORMAT_TEXT_COMMAND, FORMAT_ELEMENT_COMMAND, 
    UNDO_COMMAND, REDO_COMMAND, 
    SELECTION_CHANGE_COMMAND,
    CAN_UNDO_COMMAND, CAN_REDO_COMMAND,
    $createParagraphNode, $insertNodes, $createTextNode, $getRoot
} from 'lexical';

import { 
    APPLY_BLOCK_TYPE_COMMAND, 
    APPLY_LIST_TYPE_COMMAND,
    INSERT_CITATION_COMMAND,
    INSERT_IMAGE_COMMAND,
    INSERT_TABLE_COMMAND,
    ADD_REVIEW_COMMENT_COMMAND
} from '../commands/customCommands';

import ReferenceSearchModal from '../../ReferenceSearchModal'; 

// ==========================================
// 🧠 CITATION ENGINE
// ==========================================
const CITATION_STYLES = [
    { value: 'APA7', label: 'APA 7th Gen' },
    { value: 'MLA9', label: 'MLA 9th Gen' },
    { value: 'HARVARD', label: 'Harvard' },
    { value: 'IEEE', label: 'IEEE (Numeric)' },
    { value: 'CHICAGO', label: 'Chicago' }
];

const getAuthors = (authorString) => {
    if (!authorString) return ["Anonim"];
    const rawList = authorString.split(/;|,/).map(a => a.trim()).filter(a => a);
    return rawList.map(name => {
        const parts = name.split(' ');
        return parts.length > 1 ? parts[parts.length - 1] : name; 
    });
};

const CitationEngine = {
    formatBody: (ref, style) => {
        const authors = getAuthors(ref.author);
        const year = ref.year || "n.d.";
        switch (style) {
            case 'MLA9': return authors.length > 2 ? `(${authors[0]} et al.)` : `(${authors.join(' and ')})`;
            case 'HARVARD': return `(${authors[0]} et al. ${year})`;
            case 'IEEE': return `[1]`; 
            case 'APA7': 
            default: return authors.length > 2 ? `(${authors[0]} et al., ${year})` : `(${authors.join(' & ')}, ${year})`;
        }
    },
    formatBib: (ref, style) => {
        const author = ref.author || "Anonim";
        const year = ref.year || "n.d.";
        const title = ref.title || "Tanpa Judul";
        const source = ref.journal || ref.publisher || ref.website || "Source";
        // HTML String Logic (Simplifikasi)
        // Kita tidak bisa inject HTML langsung ke TextNode, jadi kita return plain text yang rapi
        // Style italic akan di-apply via command format nanti
        switch (style) {
            case 'MLA9': return `${author}. "${title}." ${source}, ${year}.`;
            case 'HARVARD': return `${author} (${year}) '${title}', ${source}.`;
            case 'IEEE': return `${author}, "${title}," ${source}, ${year}.`;
            default: return `${author}. (${year}). ${title}. ${source}.`; // APA 7
        }
    }
};

// ==========================================
// 🔔 UTILS: CUSTOM TOAST (Portal)
// ==========================================
const ToastNotification = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return createPortal(
        <div className="fixed bottom-6 right-6 z-[10000] animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${
                type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 
                type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 
                'bg-white border-gray-200 text-gray-800'
            }`}>
                {type === 'success' ? <CheckCircle2 size={18} className="text-emerald-500"/> : 
                 type === 'error' ? <AlertCircle size={18} className="text-red-500"/> : 
                 <Loader2 size={18} className="animate-spin text-blue-500"/>}
                <span className="text-sm font-medium">{message}</span>
            </div>
        </div>,
        document.body
    );
};

// ==========================================
// 🛠️ UTILS: FLOATING MENU
// ==========================================
const FloatingMenu = ({ isOpen, onClose, triggerRef, children, width = "w-48" }) => {
    const [coords, setCoords] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({ top: rect.bottom + window.scrollY + 5, left: rect.left + window.scrollX });
        }
    }, [isOpen, triggerRef]);

    if (!isOpen) return null;

    return createPortal(
        <>
            <div className="fixed inset-0 z-[9998]" onClick={onClose} />
            <div 
                className={`fixed z-[9999] bg-white dark:bg-[#1C1E24] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-100 overflow-hidden ${width}`}
                style={{ top: coords.top, left: coords.left }}
            >
                {children}
            </div>
        </>,
        document.body
    );
};

// --- UI COMPONENTS ---
const RibbonTab = ({ label, isActive, onClick }) => (
    <button onClick={onClick} className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-all border-b-2 outline-none ${isActive ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
        {label}
    </button>
);

const RibbonGroup = ({ children }) => (
    <div className="flex items-center gap-1 px-2 border-r border-gray-200 dark:border-white/10 last:border-0 h-full relative">{children}</div>
);

const RibbonButton = React.forwardRef(({ icon: Icon, onClick, isActive, label, disabled, hasDropdown, isLoading }, ref) => (
    <button
        ref={ref} onClick={onClick} disabled={disabled || isLoading} title={label}
        className={`p-1.5 rounded-md transition-all flex items-center justify-center gap-0.5 min-w-[28px] outline-none ${isActive ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm ring-1 ring-blue-500/20' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'} ${(disabled || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
        {isLoading ? <Loader2 size={16} className="animate-spin text-blue-500"/> : <Icon size={16} strokeWidth={2} />}
        {hasDropdown && <ChevronDown size={10} className="opacity-50 ml-0.5" />}
    </button>
));

// --- MAIN RIBBON ---
export default function Ribbon() {
    const { editor, dispatch } = useEditorBridge();
    const { project, addReference } = useProject(); 
    const [activeTab, setActiveTab] = useState('Home');

    // UI States
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [blockType, setBlockType] = useState('paragraph');
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    // Feature States
    const [currentStyle, setCurrentStyle] = useState('APA7'); 
    const [showStyleMenu, setShowStyleMenu] = useState(false);
    const styleBtnRef = useRef(null);

    const [showRefSearch, setShowRefSearch] = useState(false); 
    const [showCitationPicker, setShowCitationPicker] = useState(false);
    const citationBtnRef = useRef(null);
    const [citationSearch, setCitationSearch] = useState('');
    
    // Notification & Loading
    const [toast, setToast] = useState(null); // { message, type }
    const [isGeneratingBib, setIsGeneratingBib] = useState(false);

    // Listeners
    const updateToolbar = useCallback(() => {
        editor.getEditorState().read(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                setIsBold(selection.hasFormat('bold'));
                setIsItalic(selection.hasFormat('italic'));
                setIsUnderline(selection.hasFormat('underline'));
                
                const anchorNode = selection.anchor.getNode();
                const element = anchorNode.getKey() === 'root' ? anchorNode : anchorNode.getTopLevelElementOrThrow();
                const elementDOM = editor.getElementByKey(element.getKey());
                if (elementDOM !== null) {
                    const type = element.getType();
                    if (type === 'listitem') {
                        const parent = element.getParent();
                        if (parent) setBlockType(parent.getTag());
                    } else {
                        setBlockType(type);
                    }
                }
            }
        });
    }, [editor]);

    useEffect(() => {
        return mergeRegister(
            editor.registerUpdateListener(({ editorState }) => { editorState.read(() => updateToolbar()); }),
            editor.registerCommand(SELECTION_CHANGE_COMMAND, () => { updateToolbar(); return false; }, 1),
            editor.registerCommand(CAN_UNDO_COMMAND, (payload) => { setCanUndo(payload); return false; }, 1),
            editor.registerCommand(CAN_REDO_COMMAND, (payload) => { setCanRedo(payload); return false; }, 1)
        );
    }, [editor, updateToolbar]);

    // --- LOGIC: INSERT CITATION ---
    const handleInsertCitation = (ref) => {
        const formattedText = CitationEngine.formatBody(ref, currentStyle);
        dispatch(INSERT_CITATION_COMMAND, { text: formattedText, author: ref.author, year: ref.year });
        setShowCitationPicker(false);
        setToast({ message: "Sitasi berhasil disisipkan", type: "success" });
    };


    // --- LOGIC: GENERATE BIBLIOGRAPHY (FIXED & RAPI) ---
    const handleInsertBibliography = () => {
        if (!project?.references || project.references.length === 0) {
            setToast({ message: "Library kosong. Tambahkan referensi dulu.", type: "error" });
            return;
        }

        setIsGeneratingBib(true);

        setTimeout(() => {
            editor.update(() => {
                const selection = $getSelection();
                
                if ($isRangeSelection(selection)) {
                    // ARRAY NODE UNTUK BATCH INSERT (Mencegah Merging)
                    const nodesToInsert = [];

                    // 1. Spasi Pembuka (Normal Paragraph)
                    const pSpace = $createParagraphNode();
                    nodesToInsert.push(pSpace);

                    // 2. Judul (Center & Bold)
                    const pHeader = $createParagraphNode();
                    pHeader.setFormat('center');
                    const textHeader = $createTextNode("DAFTAR PUSTAKA");
                    textHeader.setFormat('bold');
                    pHeader.append(textHeader);
                    nodesToInsert.push(pHeader);

                    // 3. Item Referensi (BibliographyNode)
                    const sortedRefs = [...project.references].sort((a, b) => 
                        (a.author || "").localeCompare(b.author || "")
                    );

                    sortedRefs.forEach(ref => {
                        // Gunakan CUSTOM NODE agar formatnya terkunci (Hanging Indent)
                        const pBib = $createBibliographyNode();
                        
                        // Parse Text
                        const fullText = CitationEngine.formatBib(ref, currentStyle);
                        const titleStr = ref.title;
                        const parts = fullText.split(titleStr);

                        if (parts.length >= 2 && titleStr) {
                             pBib.append($createTextNode(parts[0]));
                             const titleNode = $createTextNode(titleStr);
                             titleNode.setFormat('italic'); 
                             pBib.append(titleNode);
                             pBib.append($createTextNode(parts.slice(1).join(titleStr)));
                        } else {
                             pBib.append($createTextNode(fullText));
                        }
                        
                        nodesToInsert.push(pBib);
                    });
                    
                    // 4. Spasi Penutup
                    const pFooter = $createParagraphNode();
                    nodesToInsert.push(pFooter);

                    // INSERT SEMUA SEKALIGUS
                    $insertNodes(nodesToInsert);
                }
            });

            setIsGeneratingBib(false);
            setToast({ message: `Daftar Pustaka (${project.references.length} items) berhasil disusun!`, type: "success" });

        }, 800);
    };
    
    const filteredRefs = useMemo(() => {
        if (!project?.references) return [];
        if (!citationSearch) return project.references;
        return project.references.filter(r => r.title.toLowerCase().includes(citationSearch.toLowerCase()) || r.author.toLowerCase().includes(citationSearch.toLowerCase()));
    }, [project?.references, citationSearch]);

    const activeStyleLabel = CITATION_STYLES.find(s => s.value === currentStyle)?.label;

    return (
        <div className="flex flex-col w-full bg-white dark:bg-[#18181B] transition-colors duration-300 relative">
            
            {/* TABS */}
            <div className="flex px-2 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/20">
                <RibbonTab label="Home" isActive={activeTab === 'Home'} onClick={() => setActiveTab('Home')} />
                <RibbonTab label="Insert" isActive={activeTab === 'Insert'} onClick={() => setActiveTab('Insert')} />
                <RibbonTab label="References" isActive={activeTab === 'References'} onClick={() => setActiveTab('References')} />
                <RibbonTab label="Review" isActive={activeTab === 'Review'} onClick={() => setActiveTab('Review')} />
            </div>

            {/* TOOLBAR */}
            <div className="h-14 flex items-center px-2 py-1 overflow-x-auto custom-scrollbar">
                
                {activeTab === 'Home' && (
                    <>
                        <RibbonGroup>
                            <RibbonButton icon={Undo} label="Undo" disabled={!canUndo} onClick={() => dispatch(UNDO_COMMAND)} />
                            <RibbonButton icon={Redo} label="Redo" disabled={!canRedo} onClick={() => dispatch(REDO_COMMAND)} />
                        </RibbonGroup>
                        <RibbonGroup>
                            <RibbonButton icon={Type} label="Normal" isActive={blockType === 'paragraph'} onClick={() => dispatch(APPLY_BLOCK_TYPE_COMMAND, 'paragraph')} />
                            <RibbonButton icon={Heading1} label="H1" isActive={blockType === 'h1'} onClick={() => dispatch(APPLY_BLOCK_TYPE_COMMAND, 'h1')} />
                            <RibbonButton icon={Heading2} label="H2" isActive={blockType === 'h2'} onClick={() => dispatch(APPLY_BLOCK_TYPE_COMMAND, 'h2')} />
                            <RibbonButton icon={Quote} label="Quote" isActive={blockType === 'quote'} onClick={() => dispatch(APPLY_BLOCK_TYPE_COMMAND, 'quote')} />
                        </RibbonGroup>
                        <RibbonGroup>
                            <RibbonButton icon={Bold} label="Bold" isActive={isBold} onClick={() => dispatch(FORMAT_TEXT_COMMAND, 'bold')} />
                            <RibbonButton icon={Italic} label="Italic" isActive={isItalic} onClick={() => dispatch(FORMAT_TEXT_COMMAND, 'italic')} />
                            <RibbonButton icon={Underline} label="Underline" isActive={isUnderline} onClick={() => dispatch(FORMAT_TEXT_COMMAND, 'underline')} />
                        </RibbonGroup>
                        <RibbonGroup>
                            <RibbonButton icon={AlignLeft} label="Left" onClick={() => dispatch(FORMAT_ELEMENT_COMMAND, 'left')} />
                            <RibbonButton icon={AlignCenter} label="Center" onClick={() => dispatch(FORMAT_ELEMENT_COMMAND, 'center')} />
                            <RibbonButton icon={AlignRight} label="Right" onClick={() => dispatch(FORMAT_ELEMENT_COMMAND, 'right')} />
                            <RibbonButton icon={AlignJustify} label="Justify" onClick={() => dispatch(FORMAT_ELEMENT_COMMAND, 'justify')} />
                            <RibbonButton icon={List} label="Bullet" isActive={blockType === 'ul'} onClick={() => dispatch(APPLY_LIST_TYPE_COMMAND, 'bullet')} />
                            <RibbonButton icon={ListOrdered} label="Number" isActive={blockType === 'ol'} onClick={() => dispatch(APPLY_LIST_TYPE_COMMAND, 'number')} />
                        </RibbonGroup>
                    </>
                )}

                {activeTab === 'References' && (
                    <>
                        <RibbonGroup>
                            <div className="relative">
                                <button 
                                    ref={styleBtnRef}
                                    onClick={() => setShowStyleMenu(!showStyleMenu)}
                                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[10px] font-bold text-gray-700 dark:text-gray-300 hover:border-blue-500 transition-all mr-2"
                                >
                                    <PenTool size={12} className="text-blue-500"/>
                                    {activeStyleLabel}
                                    <ChevronDown size={10} className="opacity-50"/>
                                </button>
                            </div>
                            <RibbonButton ref={citationBtnRef} icon={QuoteIcon} label="Insert Citation" isActive={showCitationPicker} hasDropdown onClick={() => setShowCitationPicker(!showCitationPicker)} />
                            <RibbonButton icon={Library} label="Manage Sources" onClick={() => setShowRefSearch(true)} />
                        </RibbonGroup>
                        <RibbonGroup>
                            <RibbonButton 
                                icon={BookOpen} 
                                label="Generate Bibliography" 
                                isLoading={isGeneratingBib}
                                onClick={handleInsertBibliography} 
                            />
                        </RibbonGroup>
                    </>
                )}

                {activeTab === 'Insert' && (
                    <RibbonGroup>
                        <RibbonButton icon={ImageIcon} label="Insert Image" onClick={() => document.getElementById('img-upload-hidden').click()} />
                        <RibbonButton icon={Table} label="Insert Table" onClick={() => dispatch(INSERT_TABLE_COMMAND)} />
                        <input id="img-upload-hidden" type="file" className="hidden" accept="image/*" onChange={(e) => {
                             const file = e.target.files[0];
                             if(file) {
                                 const reader = new FileReader();
                                 reader.onload = (ev) => dispatch(INSERT_IMAGE_COMMAND, { src: ev.target.result, altText: file.name });
                                 reader.readAsDataURL(file);
                             }
                        }}/>
                    </RibbonGroup>
                )}
                {activeTab === 'Review' && (
                    <RibbonGroup>
                        <RibbonButton icon={MessageSquarePlus} label="New Comment" onClick={() => dispatch(ADD_REVIEW_COMMENT_COMMAND)} />
                    </RibbonGroup>
                )}
            </div>

            {/* --- POPUPS --- */}
            
            {/* Style Selector */}
            <FloatingMenu isOpen={showStyleMenu} onClose={() => setShowStyleMenu(false)} triggerRef={styleBtnRef} width="w-40">
                <div className="p-1">
                    {CITATION_STYLES.map(style => (
                        <button key={style.value} onClick={() => { setCurrentStyle(style.value); setShowStyleMenu(false); }} className={`w-full text-left px-3 py-2 text-[10px] font-medium rounded-md flex items-center justify-between transition-colors ${currentStyle === style.value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                            {style.label}
                            {currentStyle === style.value && <Check size={12}/>}
                        </button>
                    ))}
                </div>
            </FloatingMenu>

            {/* Citation Picker */}
            <FloatingMenu isOpen={showCitationPicker} onClose={() => setShowCitationPicker(false)} triggerRef={citationBtnRef} width="w-80">
                <div className="p-2 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#252525]">
                    <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-2 text-gray-400"/>
                        <input autoFocus type="text" placeholder="Cari referensi..." className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-md pl-8 pr-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none text-gray-700 dark:text-gray-200" value={citationSearch} onChange={(e) => setCitationSearch(e.target.value)} />
                    </div>
                </div>
                <div className="max-h-56 overflow-y-auto custom-scrollbar p-1">
                    {filteredRefs.length > 0 ? filteredRefs.map((ref, idx) => (
                        <button key={idx} onClick={() => handleInsertCitation(ref)} className="w-full text-left p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md group transition-colors">
                            <div className="text-xs font-bold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">{ref.title}</div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1"><span className="font-medium text-gray-700 dark:text-gray-300">{getAuthors(ref.author).join(', ')}</span><span>• {ref.year}</span></div>
                        </button>
                    )) : (
                        <div className="p-4 text-center">
                            <p className="text-[10px] text-gray-400">Tidak ada referensi.</p>
                            <button onClick={() => { setShowCitationPicker(false); setShowRefSearch(true); }} className="mt-2 text-[10px] text-blue-500 hover:underline flex items-center justify-center gap-1 w-full"><Plus size={10}/> Tambah Baru</button>
                        </div>
                    )}
                </div>
            </FloatingMenu>

            <ReferenceSearchModal isOpen={showRefSearch} onClose={() => setShowRefSearch(false)} projectId={project?.id} onReferenceAdded={(newRef) => addReference(newRef)} />
            
            {/* NOTIFICATION TOAST */}
            {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}