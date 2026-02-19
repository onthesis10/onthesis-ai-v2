// FILE: src/components/Editor/hooks/useEditorBridge.js

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useCallback } from 'react';

// Hook ini hanya boleh dipanggil di dalam component yang berada di bawah <LexicalComposer>
export function useEditorBridge() {
  const [editor] = useLexicalComposerContext();

  const dispatch = useCallback((command, payload) => {
    return editor.dispatchCommand(command, payload);
  }, [editor]);

  // Kita bisa expose fungsi update juga
  const update = useCallback((callback) => {
    editor.update(callback);
  }, [editor]);

  return { editor, dispatch, update };
}