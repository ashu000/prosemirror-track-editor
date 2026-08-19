// TODO Phase 2: headless hook wrapping TrackEditorRef for consumers who prefer
// not to use a ref directly.
import { useRef } from 'react';
import type { TrackEditorRef } from './TrackEditor.types';

export function useTrackEditor() {
  const ref = useRef<TrackEditorRef>(null);
  return { ref };
}
