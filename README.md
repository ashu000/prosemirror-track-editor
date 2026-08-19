# prosemirror-track-editor

[![npm](https://img.shields.io/npm/v/@ashu000/prosemirror-track-editor)](https://www.npmjs.com/package/@ashu000/prosemirror-track-editor)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/@ashu000/prosemirror-track-editor)](https://bundlephobia.com/package/@ashu000/prosemirror-track-editor)
[![license](https://img.shields.io/npm/l/@ashu000/prosemirror-track-editor)](./LICENSE)

A headless-first React editor with track-changes (insertion/deletion marks), phrase navigation, and a clean ref API.

## Install

```bash
npm i @ashu000/prosemirror-track-editor
# peer deps
npm i react react-dom prosemirror-state prosemirror-view prosemirror-model \
      prosemirror-schema-basic prosemirror-history prosemirror-keymap prosemirror-commands
```

## Quick start

```tsx
import { useRef } from 'react';
import { TrackEditor, TrackEditorRef } from '@ashu000/prosemirror-track-editor';

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

## `useTrackEditor` hook

If you prefer a hook-driven API over a ref:

```tsx
import { useTrackEditor, TrackEditor } from '@ashu000/prosemirror-track-editor';

export function MyEditor() {
  const { ref, getText, getChangesWithOffsets, setText } = useTrackEditor();

  const handleProcess = async () => {
    const res = await fetch('/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: getText() }),
    });
    const { html } = await res.json();
    setText(html);
  };

  return <TrackEditor ref={ref} initialText="Original clause text..." />;
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

## Theming

Override editor colors via CSS variables on any parent element:

```tsx
<div style={{
  '--te-border-focus': '#00c9a7',
  '--te-ins-color': '#4d9fff',
  '--te-del-color': '#ff6070',
} as React.CSSProperties}>
  <TrackEditor ref={ref} />
</div>
```

Import `themeVars` for autocomplete on all variable names:

```ts
import { themeVars } from '@ashu000/prosemirror-track-editor';
// themeVars.borderFocus === '--te-border-focus'
```

| Variable | Default | Purpose |
|---|---|---|
| `--te-border` | `#e5e7eb` | Editor border |
| `--te-border-focus` | `#3b82f6` | Focused border |
| `--te-focus-ring` | `rgba(59,130,246,0.1)` | Focus ring shadow |
| `--te-bg` | `#ffffff` | Editor background |
| `--te-font-family` | `Calibri, sans-serif` | Editor font |
| `--te-font-size` | `0.975rem` | Editor font size |
| `--te-line-height` | `1.5` | Editor line height |
| `--te-ins-color` | `#2563eb` | Insertion text color |
| `--te-del-color` | `#b91c1c` | Deletion text (strikethrough) |
| `--te-blank-bg` | `#fbbf24` | Blank highlight background |
| `--te-blank-color` | `#92400e` | Blank highlight text |
| `--te-phrase-bg` | `rgba(74,222,128,0.4)` | Phrase highlight background |
| `--te-phrase-border` | `rgb(34,197,94)` | Phrase highlight border |
| `--te-phrase-shadow` | `rgba(34,197,94,0.2)` | Phrase highlight box-shadow |

## Browser support

| Browser | Minimum version |
|---|---|
| Chrome / Edge | 88+ |
| Firefox | 85+ |
| Safari | 14+ |

Requires a runtime that supports `ResizeObserver` and `MutationObserver` (all modern browsers).

## Full API

See [`prosemirror-track-editor-plan.md`](./.claude/specs/prosemirror-track-editor-plan.md) for the complete props, ref API, and backend contract documentation.
