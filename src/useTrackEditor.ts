import { useRef } from 'react';
import type { TrackEditorRef } from './TrackEditor.types';

export function useTrackEditor() {
  const ref = useRef<TrackEditorRef>(null);

  return {
    ref,
    getText: () => ref.current?.getText() ?? '',
    getOriginalText: () => ref.current?.getOriginalText() ?? '',
    getChanges: () => ref.current?.getChanges() ?? { deletedText: [], addedText: [] },
    getChangesWithOffsets: () => ref.current?.getChangesWithOffsets() ?? [],
    getHtml: () => ref.current?.getHtml() ?? '',
    setText: (text: string) => ref.current?.setText(text),
    clearContent: () => ref.current?.clearContent(),
    syncContentChangeBaseline: () => ref.current?.syncContentChangeBaseline(),
    undo: () => ref.current?.undo(),
    redo: () => ref.current?.redo(),
    navigateToPhrase: (phrase: string) => ref.current?.navigateToPhrase(phrase) ?? false,
    getCursorPosition: () => ref.current?.getCursorPosition() ?? null,
    insertTextAtPosition: (text: string, position: number) => ref.current?.insertTextAtPosition(text, position),
    insertTextAtEnd: (text: string, position?: number | null) => ref.current?.insertTextAtEnd(text, position),
  };
}
