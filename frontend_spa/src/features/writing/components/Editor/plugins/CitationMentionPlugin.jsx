import React, { useState, useCallback, useMemo } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useBasicTypeaheadTriggerMatch } from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { LexicalTypeaheadMenuPlugin, MenuOption } from '@lexical/react/LexicalTypeaheadMenuPlugin';
import * as ReactDOM from 'react-dom';
import { BookOpen } from 'lucide-react';
import { INSERT_CITATION_COMMAND } from '../commands/customCommands';

class CitationOption extends MenuOption {
  constructor(title, reference) {
    super(title);
    this.title = title;
    this.reference = reference;
  }
}

export default function CitationMentionPlugin({ references = [] }) {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState(null);

  const checkForMentionTrigger = useBasicTypeaheadTriggerMatch('@', { minLength: 0 });

  const options = useMemo(() => {
    return references
      .map((ref) => {
        const title = `${ref.author || ref.authors || 'Anonim'} (${ref.year || 'n.d.'}) — ${ref.title || ''}`;
        return new CitationOption(title, ref);
      })
      .filter((option) => {
        if (!queryString) return true;
        return new RegExp(queryString, 'i').test(option.title);
      })
      .slice(0, 10);
  }, [references, queryString]);

  const onSelectOption = useCallback(
    (selectedOption, nodeToRemove, closeMenu) => {
      editor.update(() => {
        nodeToRemove?.remove();
      });
      
      const ref = selectedOption.reference;
      const author = ref.author || ref.authors || 'Anonim';
      const year = ref.year || 'n.d.';
      
      editor.dispatchCommand(INSERT_CITATION_COMMAND, {
        author,
        year,
        text: `(${author}, ${year})`
      });
      
      closeMenu();
    },
    [editor]
  );

  return (
    <LexicalTypeaheadMenuPlugin
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={checkForMentionTrigger}
      options={options}
      menuRenderFn={(
        anchorElementRef,
        { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }
      ) => {
        if (!anchorElementRef.current || options.length === 0) return null;

        return ReactDOM.createPortal(
          <div className="absolute z-[9999] bg-[#1C1E24] border border-[#2C303B] rounded-xl shadow-2xl p-2 w-80 animate-in fade-in zoom-in-95 duration-100">
            <div className="text-[10px] uppercase font-bold text-slate-500 px-2 py-1 mb-1 tracking-wider flex items-center gap-2">
                <BookOpen size={10} /> INSERT CITATION
            </div>
            <ul className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
              {options.map((option, i) => (
                <li
                  key={option.title}
                  tabIndex={-1}
                  className={`flex items-start gap-3 px-3 py-2 text-xs rounded-lg cursor-pointer transition-colors ${
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
                  <div className="flex-1 overflow-hidden">
                    <div className="font-medium truncate">{option.title}</div>
                  </div>
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
