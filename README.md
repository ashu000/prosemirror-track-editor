# prosemirror-track-editor

A headless-first React editor with track-changes (insertion/deletion marks), phrase navigation, and a clean ref API.

> **Status:** Phase 1 in progress — core extraction from source editor underway.

## Install

```bash
npm i @ashutosh-dubey3/prosemirror-track-editor
# peer deps
npm i react react-dom prosemirror-state prosemirror-view prosemirror-model \
      prosemirror-schema-basic prosemirror-history prosemirror-keymap prosemirror-commands
```

## Quick start

```tsx
import { useRef } from 'react';
import { TrackEditor, TrackEditorRef } from '@ashutosh-dubey3/prosemirror-track-editor';

export function MyEditor() {
  const editorRef = useRef<TrackEditorRef>(null);

  return (
    <TrackEditor
      ref={editorRef}
      initialText="The applicant shall furnish a document..."
      onContentChange={(changed) => console.log('dirty:', changed)}
    />
  );
}
```

## Development

```bash
# install deps
npm install

# run demo app + backend together
npm run dev

# build the package
npm run build

# run tests
npm test
```

- Demo app: http://localhost:5173
- Backend API: http://localhost:3001

## Full API

See [`.claude/specs/prosemirror-track-editor-plan.md`](../tradeflow-frontend/.claude/specs/prosemirror-track-editor-plan.md) for the complete props, ref API, and backend contract documentation.
