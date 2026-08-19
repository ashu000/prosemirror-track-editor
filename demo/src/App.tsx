// TODO Phase 4: wire up full demo
// - <TrackEditor> with toolbar (Undo / Redo)
// - "Process with AI" button → POST /process → feed html into editor
// - "Validate" button → POST /validate → show result
import { useRef } from 'react';
import type { TrackEditorRef } from '@prosemirror-track-editor';
import { TrackEditor } from '@prosemirror-track-editor';

export function App() {
  const editorRef = useRef<TrackEditorRef>(null);

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h1>prosemirror-track-editor demo</h1>
      <p>Phase 1 in progress — editor will appear here once core is extracted.</p>
      <TrackEditor ref={editorRef} initialText="Hello world" />
    </div>
  );
}
