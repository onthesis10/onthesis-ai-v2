// frontend/src/components/Editor/plugins/AISlashPlugin.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useBasicTypeaheadTriggerMatch } from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { LexicalTypeaheadMenuPlugin, MenuOption } from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { $createParagraphNode, $createTextNode, $getSelection, $isRangeSelection, TextNode } from 'lexical';
import { Sparkles, ArrowRight, PenTool, BookOpen, AlignLeft } from 'lucide-react';
import * as ReactDOM from 'react-dom';
import { buildAIContext } from '../../../context/ContextBuilder';
import { nanoid } from 'nanoid';
import { useToast } from '../../UI/ToastProvider.jsx';

// 1. Definisikan Opsi Menu
class AICommandOption extends MenuOption {
  constructor(title, options) {
    super(title);
    this.title = title;
    this.keywords = options.keywords || [];
    this.icon = options.icon;
    this.task = options.task; // Task untuk dikirim ke Backend API
    this.prompt = options.prompt; // Prompt tambahan (opsional)
  }
}

// Daftar Perintah AI
const COMMANDS = [
  new AICommandOption('Lanjutkan Tulisan', { 
    icon: <Sparkles size={14} />, 
    keywords: ['continue', 'lanjut', 'next'],
    task: 'continue',
    prompt: 'Lanjutkan tulisan di atas dengan alur yang logis dan akademis.'
  }),
  new AICommandOption('Buat Paragraf Penjelas', { 
    icon: <AlignLeft size={14} />, 
    keywords: ['paragraph', 'paragraf', 'explain'],
    task: 'custom',
    prompt: 'Buatkan paragraf penjelasan mendalam tentang kalimat terakhir.'
  }),
  new AICommandOption('Kritisi Argumen', { 
    icon: <PenTool size={14} />, 
    keywords: ['ciritic', 'kritik', 'saran'],
    task: 'custom',
    prompt: 'Berikan kritik akademis terhadap argumen di atas dan sarankan perbaikan.'
  }),
  new AICommandOption('Tambahkan Referensi', { 
    icon: <BookOpen size={14} />, 
    keywords: ['ref', 'cite', 'sumber'],
    task: 'custom',
    prompt: 'Sarankan referensi atau teori yang relevan untuk mendukung pernyataan di atas.'
  }),
];

export default function AISlashPlugin({ projectId, userStyle }) {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState(null);
  const { addToast } = useToast();

  // Trigger: Deteksi karakter "/"
  const checkForSlashTrigger = useBasicTypeaheadTriggerMatch('/', { minLength: 0 });

  // Filter Opsi berdasarkan ketikan user setelah "/"
  const options = React.useMemo(() => {
    return COMMANDS.filter((option) => {
      if (!queryString) return true;
      return new RegExp(queryString, 'i').test(option.title);
    });
  }, [queryString]);

  // --- FUNGSI UTAMA: PANGGIL AI ---
  const runAICommand = useCallback(async (selectedOption) => {
    if (!projectId) {
      addToast("Pilih proyek dulu!", 'error');
      return;
    }

    editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
             // Penghapusan slash command ditangani oleh TypeaheadPlugin saat select.
        }
    });

    try {
        // 2. Ambil konteks teks sebelumnya (Previous Content)
        let previousText = '';
        editor.getEditorState().read(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                previousText = selection.getTextContent();
            }
        });

        const contextPayload = buildAIContext({
            project: { id: projectId },
            chapterHtml: '',
            references: [],
            selectionHtml: previousText,
        });

        // 3. Panggil API via Agent System (SSE)
        const response = await fetch('/api/agent/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                task: selectedOption.prompt || selectedOption.task,
                context: contextPayload,
                projectId,
                chapterId: '',
            })
        });

        if (!response.ok) throw new Error('Gagal memanggil AI');

        // 4. STREAMING RESPONSE LANGSUNG KE EDITOR
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        // Kita insert node baru dulu
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                const p = $createParagraphNode();
                selection.insertNodes([p]);
                p.select(); // Pindahkan kursor ke paragraf baru
            }
        });

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });

            // Insert Chunk ke Editor (Realtime)
            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    selection.insertText(chunk);
                }
            });
        }

    } catch (e) {
        console.error("AI Error:", e);
        addToast("Gagal menjalankan perintah AI.", 'error');
    }
  }, [addToast, editor, projectId, userStyle]);

  // --- RENDER MENU ---
  const onSelectOption = useCallback(
    (selectedOption, nodeToRemove, closeMenu) => {
      editor.update(() => {
        nodeToRemove?.remove(); // Hapus teks "/"
      });
      closeMenu();
      runAICommand(selectedOption); // Jalankan AI
    },
    [editor, runAICommand]
  );

  return (
    <LexicalTypeaheadMenuPlugin
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={checkForSlashTrigger}
      options={options}
      menuRenderFn={(
        anchorElementRef,
        { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }
      ) => {
        if (anchorElementRef.current && options.length === 0) return null;
        return anchorElementRef.current && ReactDOM.createPortal(
          <div className="absolute z-[9999] bg-[#1C1E24] border border-[#2C303B] rounded-xl shadow-2xl p-2 w-64 animate-in fade-in zoom-in-95 duration-100">
            <div className="text-[10px] uppercase font-bold text-slate-500 px-2 py-1 mb-1 tracking-wider">
                AI COMMANDS
            </div>
            <ul className="space-y-1">
              {options.map((option, i) => (
                <li
                  key={option.title}
                  tabIndex={-1}
                  className={`flex items-center gap-3 px-3 py-2 text-xs rounded-lg cursor-pointer transition-colors ${
                    selectedIndex === i
                      ? 'bg-[#6C5DD3] text-white'
                      : 'text-slate-300 hover:bg-[#252830]'
                  }`}
                  onClick={() => {
                    setHighlightedIndex(i);
                    selectOptionAndCleanUp(option);
                  }}
                  onMouseEnter={() => setHighlightedIndex(i)}
                >
                  <span className={`${selectedIndex === i ? 'text-white' : 'text-[#6C5DD3]'}`}>
                    {option.icon}
                  </span>
                  <span className="font-medium">{option.title}</span>
                </li>
              ))}
            </ul>
          </div>,
          anchorElementRef.current
        );
      }}
    />
  );
}
