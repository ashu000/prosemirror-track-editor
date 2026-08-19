# prosemirror-track-editor — Spec & Reference

**Package:** `@ashu000/prosemirror-track-editor`
**Latest version:** `0.1.4`
**NPM:** https://www.npmjs.com/package/@ashu000/prosemirror-track-editor
**Live demo:** https://prosemirror-track-editor.vercel.app
**Repo:** https://github.com/ashu000/prosemirror-track-editor

---

## What it is

A headless-first React editor built on ProseMirror that tracks every insertion and deletion as visible marks. Consumers load diffed HTML (from any backend or AI service) and users review changes inline — blue underlined text = inserted, red strikethrough = deleted.

Originally extracted from the HDFC TradeFlow BG Vetting flow (`ProseMirrorTextEditor.tsx`). The source reference is in `ProseMirrorTextEditor.md`.

---

## Package structure

```
src/
  TrackEditor.tsx          # Main React component (forwardRef)
  TrackEditor.types.ts     # TrackEditorRef + TrackEditorProps interfaces
  TrackEditor.styled.tsx   # EditorWrapper styled component + themeVars
  useTrackEditor.ts        # Hook-based API wrapper
  schema.ts                # ProseMirror schema with ins/del/blankHighlight marks
  plugins/
    suggestChanges.ts      # suggestChanges() plugin setup
    phraseHighlight.ts     # phraseHighlightPlugin decoration
  utils/
    docHelpers.ts          # Text extraction helpers + getChangesWithOffsets
    htmlToDoc.ts           # HTML → ProseMirror doc parser
    findPhrase.ts          # Multi-stage phrase search
  index.ts                 # Public exports
demo/
  src/App.tsx              # Vite demo app (no backend calls — pre-loads diffed HTML)
  server/
    index.ts               # Express dev server (port 3001)
    routes/process.ts      # POST /process — synonym-based simulateDiff
    routes/validate.ts     # POST /validate — offset validation
```

---

## Props (`TrackEditorProps`)

| Prop | Type | Default | Description |
|---|---|---|---|
| `initialText` | `string` | — | Seed with plain text |
| `initialHtml` | `string` | — | Seed with HTML containing `<ins>`/`<del>` marks |
| `isDisabled` | `boolean` | `false` | Read-only mode |
| `disableTrackChanges` | `boolean` | `false` | Plain editor (no insertion/deletion tracking) |
| `disablePhraseHighlight` | `boolean` | `false` | Disable green phrase navigation highlight |
| `isVisible` | `boolean` | `true` | Pass `false` when CSS-hidden to suppress scroll-to-end events |
| `onTextChange` | `(hasContent: boolean) => void` | — | Fires when editor content presence changes |
| `onContentChange` | `(hasContentChanged: boolean) => void` | — | Fires when content differs from baseline |
| `onScrollToEnd` | `() => void` | — | Fires when user scrolls to bottom |
| `className` | `string` | — | Class forwarded to the editor wrapper |
| `style` | `CSSProperties` | — | Inline styles on the editor wrapper |
| `ariaLabel` | `string` | — | `aria-label` on the editor host element |
| `ariaLabelledBy` | `string` | — | `aria-labelledby` on the editor host element |

---

## Ref API (`TrackEditorRef`)

Access via `useRef<TrackEditorRef>()` or via the `useTrackEditor()` hook.

| Method | Returns | Description |
|---|---|---|
| `getText()` | `string` | Accepted plain text — excludes deleted runs |
| `getOriginalText()` | `string` | Original text before edits — excludes insertions, keeps deletions |
| `getHtml()` | `string` | Full HTML with `<ins>`/`<del>` marks |
| `getChanges()` | `{ deletedText: string[]; addedText: string[] }` | Parallel arrays of changed segments in document order |
| `getChangesWithOffsets()` | `ChangeWithOffset[]` | Like `getChanges()` with character offsets into original/accepted text |
| `setText(html)` | `void` | Replace editor content; resets `onContentChange` baseline |
| `clearContent()` | `void` | Empty the editor and reset all baselines |
| `syncContentChangeBaseline()` | `void` | Reset baseline to current accepted text (call after save/validate) |
| `undo()` | `void` | ProseMirror history undo |
| `redo()` | `void` | ProseMirror history redo |
| `navigateToPhrase(phrase)` | `boolean` | Highlight + scroll to phrase; returns `false` if not found |
| `getCursorPosition()` | `number \| null` | Current cursor offset in the ProseMirror doc |
| `insertTextAtPosition(text, pos)` | `void` | Insert at given doc offset |
| `insertTextAtEnd(text, pos?)` | `void` | Insert at end (or at `pos`) |

### `ChangeWithOffset` shape

```ts
interface ChangeWithOffset {
  deletedText: string;
  addedText: string;
  deletedOffset: { start: number; end: number } | null;
  addedOffset:   { start: number; end: number } | null;
}
```

---

## `useTrackEditor` hook

```tsx
import { useTrackEditor, TrackEditor } from '@ashu000/prosemirror-track-editor';

function MyEditor() {
  const { ref, getText, getOriginalText, getChangesWithOffsets, setText } = useTrackEditor();

  const handleProcess = async () => {
    const res = await fetch('/your-backend/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: getOriginalText() }),
    });
    const { html } = await res.json();
    setText(html); // loads diffed HTML with <ins>/<del> marks
  };

  return <TrackEditor ref={ref} initialText="Original clause text..." />;
}
```

---

## Theming (CSS variables)

Override on any parent element:

```tsx
<div style={{ '--te-ins-color': '#4d9fff', '--te-del-color': '#ff6070' } as React.CSSProperties}>
  <TrackEditor ref={ref} />
</div>
```

Import `themeVars` for autocomplete: `themeVars.borderFocus === '--te-border-focus'`

| Variable | Default | Purpose |
|---|---|---|
| `--te-border` | `#e5e7eb` | Editor border |
| `--te-border-focus` | `#3b82f6` | Focused border |
| `--te-focus-ring` | `rgba(59,130,246,0.1)` | Focus ring shadow |
| `--te-bg` | `#ffffff` | Editor background |
| `--te-font-family` | `Calibri, sans-serif` | Font |
| `--te-font-size` | `0.975rem` | Font size |
| `--te-line-height` | `1.5` | Line height |
| `--te-ins-color` | `#2563eb` | Insertion text colour |
| `--te-del-color` | `#b91c1c` | Deletion text colour |
| `--te-blank-bg` | `#fbbf24` | Blank highlight background |
| `--te-blank-color` | `#92400e` | Blank highlight text |
| `--te-phrase-bg` | `rgba(74,222,128,0.4)` | Phrase highlight background |
| `--te-phrase-border` | `rgb(34,197,94)` | Phrase highlight border |
| `--te-phrase-shadow` | `rgba(34,197,94,0.2)` | Phrase highlight shadow |

---

## Backend API contract (demo server)

The demo server (`demo/server/`) shows the expected API shape. Consumers replace it with their own backend.

### `POST /process`

**Request:**
```json
{ "text": "Original plain text..." }
```

**Response:**
```json
{
  "html": "<p>...<del>shall</del><ins>must</ins>...</p>",
  "changeCount": 5,
  "processingMs": 12
}
```

Call `setText(html)` or pass `html` as `initialHtml` to load the diff into the editor.

### `POST /validate`

**Request:**
```json
{
  "html": "<p>...<ins>...</ins>...</p>",
  "originalText": "...",
  "changes": { "deletedText": ["shall"], "addedText": ["must"] },
  "changesWithOffsets": [
    {
      "deletedText": "shall",
      "addedText": "must",
      "deletedOffset": { "start": 12, "end": 17 },
      "addedOffset": { "start": 12, "end": 16 }
    }
  ]
}
```

**Response:**
```json
{
  "valid": true,
  "insertionCount": 3,
  "deletionCount": 3,
  "offsetCount": 3,
  "htmlLength": 512
}
```

---

## How track changes works internally

1. Schema extends `prosemirror-schema-basic` with `insertion`, `deletion`, and `blankHighlight` marks (via `@handlewithcare/prosemirror-suggest-changes`).
2. On mount, `suggestChanges()` plugin is added and `enableSuggestChanges()` is called.
3. Every keystroke goes through `withSuggestChanges(dispatch)` — typed text gets `insertion` mark, deleted text gets `deletion` mark.
4. `initialHtml` with `<ins>`/`<del>` tags is parsed by `htmlToDoc()` into ProseMirror marks directly.
5. Auto-apply on single-paragraph docs: if the doc has one paragraph and existing suggestion marks, `applySuggestions()` runs immediately so the loaded text becomes the new accepted baseline.

### Two baselines

- **`originalTextRef`** — updated on every dispatch; tracks the accepted state for `getOriginalText()`.
- **`contentChangeBaselineRef`** — only reset by `setText()` or `syncContentChangeBaseline()`; drives `onContentChange` to detect meaningful user edits since last save.

---

## Demo app

The Vite demo (`demo/src/App.tsx`) pre-loads a realistic diffed HTML example on first render — no backend call needed. Visitors see the editor with tracked substitutions immediately.

- Undo / Redo / Dark theme toolbar
- Legend showing insertion and deletion colours
- "Reset demo" button to restore the original pre-loaded diff
- Info box pointing consumers to the README for backend wiring

---

## Publishing checklist

See `PUBLISHING.md` for the full step-by-step. Summary:

```bash
npm version patch        # or minor / major
# update CHANGELOG.md
npm publish --access public
git push origin main --tags
```

`prepublishOnly` runs `npm run build` automatically.

---

## Version history

| Version | Date | Summary |
|---|---|---|
| `0.1.4` | 2026-08-19 | Demo simplified — pre-loaded diff, no backend button |
| `0.1.3` | 2026-08-19 | Fixed `_v2` suffix bug in simulateDiff; added Vercel demo link |
| `0.1.2` | 2026-08-19 | a11y props, source maps, sideEffects, peerDeps, README badges |
| `0.1.1` | 2026-08-19 | Initial extraction and modularisation |
| `0.1.0` | 2026-08-19 | Package scaffold |
