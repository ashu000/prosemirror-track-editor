# prosemirror-track-editor — Implementation Plan v1.0

**Published:** [`@ashu000/prosemirror-track-editor@0.1.0`](https://www.npmjs.com/package/@ashu000/prosemirror-track-editor)
**Repo:** `~/prosemirror-track-editor`

A headless-first React editor that exposes insertion, deletion, and phrase-navigation as a clean ref API — ready to drop into any codebase or publish on NPM.

---

## Architecture

```
Your App  →  <TrackEditor />  →  useTrackEditor hook
                   ↓
     ProseMirror Core  +  suggest-changes plugin  +  phraseHighlight plugin
                   ↓
     POST /process (AI diff)    POST /validate (getHtml + getChanges)
```

Three layers:
- **Consumer layer** — your app uses `<TrackEditor ref={editorRef} />` and calls ref methods
- **ProseMirror layer** — state/view/model + `@handlewithcare/prosemirror-suggest-changes` + custom `phraseHighlightPlugin`
- **Backend layer** — two optional endpoints the demo app integrates with

---

## Component Props

```tsx
import { TrackEditor, TrackEditorRef } from '@ashu000/prosemirror-track-editor';

const editorRef = useRef<TrackEditorRef>(null);

<TrackEditor
  ref={editorRef}
  initialText="The applicant shall furnish..."
  onTextChange={hasContent => setHasContent(hasContent)}
  onContentChange={changed => setDirty(changed)}
  onScrollToEnd={() => markAsRead()}
/>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `initialText` | `string` | `''` | Seed plain text. Creates one paragraph per line. |
| `initialHtml` | `string` | `undefined` | Seed HTML. If it contains `<ins>`/`<del>` tags, they render as blue/strikethrough suggestion marks. |
| `isDisabled` | `boolean` | `false` | Makes the editor read-only. Does **not** remount — preserves content set via `setText()`. |
| `disableTrackChanges` | `boolean` | `false` | Plain mode — no insertion/deletion marks. Tighter line spacing. Useful for non-AI edit flows. |
| `disablePhraseHighlight` | `boolean` | `false` | Suppresses the green clause-highlight decoration. Disable when no clause panel is present. |
| `isVisible` | `boolean` | `true` | Set to `false` when the editor is CSS-hidden (e.g. inactive tab). Prevents false scroll-to-end signals. |
| `onTextChange` | `(hasContent: boolean) => void` | — | Fired on every dispatch. `hasContent` is based on accepted text only (excludes deleted runs). |
| `onContentChange` | `(changed: boolean) => void` | — | Fires when content differs from the baseline set at mount or after `syncContentChangeBaseline()`. |
| `onScrollToEnd` | `() => void` | — | Fired when the user scrolls to the bottom. Idempotent — fires every time condition is met. |
| `className` | `string` | — | Forwarded to the outer wrapper for consumer-side styling overrides. |
| `style` | `React.CSSProperties` | — | Inline styles forwarded to the outer wrapper. |

---

## Ref API (`TrackEditorRef`)

Accessed via `ref.current.*`. All methods no-op safely if the view isn't mounted yet.

| Method | Returns | Description |
|---|---|---|
| `getText()` | `string` | Accepted plain text — excludes deleted (strikethrough) runs. Falls back to full textContent in plain mode. |
| `getOriginalText()` | `string` | Pre-edit text — excludes insertion marks, keeps deletion marks. Use for validate payloads. |
| `getHtml()` | `string` | Full HTML with `<ins>`/`<del>` tags. Send to `POST /validate`. |
| `getChanges()` | `{ deletedText: string[]; addedText: string[] }` | Parallel arrays. Index *i* is one logical change. A replacement pairs `del[i]` with `add[i]`. |
| `getChangesWithOffsets()` | `ChangeWithOffset[]` | Like `getChanges()` but each entry includes char offsets into original/accepted text for precise diff mapping. |
| `setText(text: string)` | `void` | Replace content. Resets the `onContentChange` baseline — new text is the new "unchanged" state. |
| `clearContent()` | `void` | Empty the editor and reset all baselines. |
| `syncContentChangeBaseline()` | `void` | Reset the `onContentChange` baseline to current accepted text. Call after a successful save/validate. |
| `undo()` / `redo()` | `void` | ProseMirror history undo/redo. Wire to toolbar buttons in your app. |
| `navigateToPhrase(phrase)` | `boolean` | Highlight and scroll to a phrase (green border). Returns `false` if not found. Uses 4-stage fuzzy search. |
| `getCursorPosition()` | `number \| null` | Current cursor offset in ProseMirror doc coordinates. |
| `insertTextAtPosition(text, pos)` | `void` | Insert at a doc offset. Prepends `\n\n` separator if content exists before the insertion point. |
| `insertTextAtEnd(text, pos?)` | `void` | Insert at end (or at `pos` if given). Same separator logic as `insertTextAtPosition`. |

### `ChangeWithOffset` type

```ts
type ChangeWithOffset = {
  deletedText: string;
  addedText: string;
  deletedOffset: { start: number; end: number } | null;
  addedOffset: { start: number; end: number } | null;
};
```

---

## Backend API Contracts (Node.js / Express)

### `POST /process`

Accepts plain text, returns HTML with `<ins>`/`<del>` tags (simulates AI rewrite). Feed the response `html` directly into `initialHtml`.

**Request**
```json
{
  "text": "The applicant shall furnish a document within thirty days.",
  "instruction": "Make language more concise and professional"
}
```

**Response 200**
```json
{
  "html": "<p>The applicant shall <del>furnish</del><ins>provide</ins> a document within <del>thirty (30)</del><ins>21</ins> days.</p>",
  "changeCount": 2,
  "processingMs": 312
}
```

**Errors**
- `400` — missing or empty `text` field
- `500` — AI processing failed → `{ "error": "..." }`

---

### `POST /validate`

Validates editor content and tracked changes. Call after the user finishes editing.

**Request**
```json
{
  "html": "<p>...content with <ins>...</ins> and <del>...</del>...</p>",
  "changes": {
    "deletedText": ["furnish", "thirty (30)"],
    "addedText":   ["provide", "21"]
  },
  "changesWithOffsets": [
    {
      "deletedText": "furnish",
      "addedText":   "provide",
      "deletedOffset": { "start": 22, "end": 29 },
      "addedOffset":   { "start": 22, "end": 29 }
    }
  ],
  "originalText": "The applicant shall furnish..."
}
```

**Response 200 (valid)**
```json
{
  "valid": true,
  "errors": [],
  "blanksRemaining": 0,
  "summary": "2 changes accepted. Document is valid."
}
```

**Response 422 (validation failed)**
```json
{
  "valid": false,
  "errors": [
    {
      "code": "BLANK_UNFILLED",
      "message": "1 blank field remains unfilled",
      "offset": { "start": 54, "end": 72 }
    }
  ],
  "blanksRemaining": 1
}
```

---

## Package Structure

```
prosemirror-track-editor/
├── src/
│   ├── TrackEditor.tsx           # main React component (forwardRef)
│   ├── useTrackEditor.ts         # optional hook for headless usage
│   ├── TrackEditor.styled.tsx    # styled-components styles
│   ├── schema.ts                 # proseMirrorSchema with ins/del/blankHighlight marks
│   ├── plugins/
│   │   ├── phraseHighlight.ts    # PluginKey + decoration
│   │   └── suggestChanges.ts     # re-export + config wrapper
│   ├── utils/
│   │   ├── docHelpers.ts         # getText, getOriginalText, getChanges …
│   │   ├── htmlToDoc.ts          # HTML → ProseMirror doc
│   │   └── findPhrase.ts         # 4-stage fuzzy phrase search
│   └── index.ts                  # public exports
├── demo/                         # Vite dev app (not published)
│   ├── App.tsx
│   └── server/                   # dummy Express backend
│       ├── index.ts
│       ├── routes/process.ts
│       └── routes/validate.ts
└── package.json
```

### Public surface (`index.ts`)

```ts
export { TrackEditor }           // main component
export { useTrackEditor }        // headless hook
export type { TrackEditorRef }   // ref type for consumers
export type { TrackEditorProps } // props type
export type { ChangeWithOffset } // return type of getChangesWithOffsets()
```

---

## Dependencies

| Package | Role | Peer? |
|---|---|---|
| `react` | Component framework | peer ≥17 |
| `prosemirror-state` | Editor state machine | peer |
| `prosemirror-view` | DOM rendering | peer |
| `prosemirror-model` | Schema / node model | peer |
| `prosemirror-schema-basic` | Base node/mark definitions | peer |
| `prosemirror-history` | Undo/redo | peer |
| `prosemirror-keymap` | Keyboard bindings | peer |
| `prosemirror-commands` | Base keyboard commands | peer |
| `@handlewithcare/prosemirror-suggest-changes` | Track-changes plugin | bundled |
| `styled-components` | Editor styles | bundled or peer TBD |

---

## Build Phases

### Phase 1 — Extract & isolate core logic

**Tag:** `FE`

Copy `ProseMirrorTextEditor.tsx` into the new package repo. Strip all BGVetting-specific imports (`extractTextFromHtml`, BGVetting paths). Break into modular files: `schema.ts`, `plugins/`, `utils/`. Confirm the editor mounts and tracks changes in a blank Vite app.

---

### Phase 2 — Rename & generalise the component API

**Tag:** `FE`

Rename to `TrackEditor`. Add `className` / `style` props. Write TypeScript types for the full ref API. Export everything cleanly from `index.ts`. Write a `useTrackEditor` hook for consumers who prefer not to use a ref.

---

### Phase 3 — Build dummy Express backend

**Tag:** `BE`

Scaffold `demo/server/` with Express + TypeScript. Implement `POST /process` — accepts `text`, returns hardcoded/simulated HTML with `<ins>`/`<del>` tags. Implement `POST /validate` — parses the `changes` payload, returns `valid: true/false` with errors. Add CORS for the Vite dev server.

---

### Phase 4 — Wire demo app end-to-end

**Tags:** `FE` `BE`

Build the demo UI: editor + toolbar (Undo/Redo) + "Process with AI" button (calls `/process`, feeds result into `initialHtml`) + "Validate" button (calls `/validate` with `getHtml()` + `getChanges()`). Show validation result inline. Confirm the full round-trip works.

---

### Phase 5 — Package, test & publish ✅

**Tag:** `NPM`

Configure Vite library mode (`lib.entry`, `rollupOptions.external` for React + ProseMirror peer deps). Add `package.json` exports map (`"."` → ESM, `types`). Write unit tests for at minimum: `getAcceptedPlainText`, `getChangesFromDoc`, `findPhraseRange`. Publish as `prosemirror-track-editor` on NPM (or a scoped name).

**Result:** 37/37 tests passing. Published as [`@ashu000/prosemirror-track-editor@0.1.0`](https://www.npmjs.com/package/@ashu000/prosemirror-track-editor). Bundle: 148KB ESM / 101KB CJS.
