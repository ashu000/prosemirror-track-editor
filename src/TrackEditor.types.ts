import type { CSSProperties } from 'react';
import type { ChangeWithOffset } from './utils/docHelpers';

export interface TrackEditorRef {
  getText: () => string;
  getOriginalText: () => string;
  getChanges: () => { deletedText: string[]; addedText: string[] };
  getChangesWithOffsets: () => ChangeWithOffset[];
  getHtml: () => string;
  setText: (text: string) => void;
  clearContent: () => void;
  syncContentChangeBaseline: () => void;
  undo: () => void;
  redo: () => void;
  navigateToPhrase: (phrase: string) => boolean;
  getCursorPosition: () => number | null;
  insertTextAtPosition: (text: string, position: number) => void;
  insertTextAtEnd: (text: string, position?: number | null) => void;
}

export interface TrackEditorProps {
  initialText?: string;
  initialHtml?: string;
  isDisabled?: boolean;
  disableTrackChanges?: boolean;
  disablePhraseHighlight?: boolean;
  isVisible?: boolean;
  onTextChange?: (hasContent: boolean) => void;
  onContentChange?: (hasContentChanged: boolean) => void;
  onScrollToEnd?: () => void;
  className?: string;
  style?: CSSProperties;
  /** Accessible label forwarded as aria-label on the editor element. */
  ariaLabel?: string;
  /** ID of an external label element, forwarded as aria-labelledby. */
  ariaLabelledBy?: string;
}
