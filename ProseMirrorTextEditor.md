# ProseMirrorTextEditor — Reference Guide

**File:** `src/tradeflow/src/non-ocr/components/Branch/BGVetting/ProseMirrorTextEditor.tsx`

---

## Overview

A ProseMirror-based rich text editor used in the BG Vetting flow. It has two modes:

| Mode | When | Behaviour |
|---|---|---|
| **Track-changes (AI mode)** | `disableTrackChanges={false}` (default) | Edits are tracked as blue insertions (`<ins>`) and red strikethrough deletions (`<del>`) using `@handlewithcare/prosemirror-suggest-changes`. |
| **Plain (non-AI mode)** | `disableTrackChanges={true}` | Standard editable textarea; no insertion/deletion marks. Tighter line spacing. |

---

## Props

```typescript
interface ProseMirrorTextEditorProps {
  initialText?: string;         // Seed plain text
  initialHtml?: string;         // Seed HTML (parsed for <ins>/<del> marks if present)
  isDisabled?: boolean;         // Locks the editor (read-only)
  onTextChange?: (hasContent: boolean) => void;
  onContentChange?: (hasContentChanged: boolean) => void;
  onScrollToEnd?: () => void;   // Fired once user has scrolled to the bottom
  disableTrackChanges?: boolean; // true = plain mode
  disablePhraseHighlight?: boolean; // true = no green clause highlight
  isVisible?: boolean;          // false suppresses scroll-to-end check while CSS-hidden
}
```

### Key prop notes

- **`initialHtml`** — if it contains `<ins …>` or `<del …>` tags, the editor parses them into ProseMirror suggestion marks so they render as blue/strikethrough immediately. Without those tags it falls back to plain text parsing.
- **`isDisabled`** — intentionally excluded from the main `useEffect` dependency array. Toggling `isDisabled` (e.g. View ↔ Edit mode) does **not** re-create the editor; it only updates the `editable` prop via a separate `useEffect`, preserving any content set via `setText()`.
- **`isVisible`** — prevents false "scrolled to end" signals when the editor is CSS-hidden inside an inactive tab.

---

## Ref API (`ProseMirrorTextEditorRef`)

Consumers access the editor via a forwarded ref.

| Method | Returns | Description |
|---|---|---|
| `getText()` | `string` | Accepted plain text (excludes deleted/strikethrough runs). Falls back to full `textContent` if no track-changes marks present. |
| `getOriginalText()` | `string` | Original text before any edits — excludes insertion marks, keeps deletion marks. Used in validate payloads. |
| `getChanges()` | `{ deletedText: string[]; addedText: string[] }` | Parallel arrays of changed segments in document order. A replacement is `deletedText[i]` paired with `addedText[i]`. Pure deletions have `addedText[i] = ''`; pure insertions have `deletedText[i] = ''`. |
| `getChangesWithOffsets()` | Array of `{ deletedText, addedText, deletedOffset, addedOffset }` | Same as `getChanges()` but each entry includes character offsets into the original/accepted text strings for precise diff mapping. |
| `getHtml()` | `string` | Serialises the ProseMirror doc to HTML. `<ins>` = added text, `<del>` = deleted text. Sent as the validate payload. |
| `setText(text)` | `void` | Replaces editor content with plain text. Re-enables suggestion mode. Resets the `onContentChange` baseline so the new text is the new "unchanged" baseline. |
| `clearContent()` | `void` | Empties the editor and resets all baselines. |
| `syncContentChangeBaseline()` | `void` | Resets the `onContentChange` baseline to the current accepted text. Called after a successful Validate so the editor no longer reports "changed". |
| `undo()` / `redo()` | `void` | ProseMirror history undo/redo. |
| `navigateToPhrase(phrase)` | `boolean` | Highlights and scrolls to a phrase in the editor. Returns `false` if not found. Used by the clause reference panel. |
| `getCursorPosition()` | `number \| null` | Current cursor position (ProseMirror doc offset). |
| `insertTextAtPosition(text, position)` | `void` | Inserts text at a given doc offset. Prepends `\n\n` separator if content exists before the insertion point. |
| `insertTextAtEnd(text, position?)` | `void` | Inserts text at the end (or at `position` if given). Same `\n\n` separator logic. |

---

## How Track Changes Works

### Marks

The schema extends `prosemirror-schema-basic` with three custom marks (via `addSuggestionMarks`):

| Mark | DOM tag | Colour | Meaning |
|---|---|---|---|
| `insertion` | `<ins>` | Blue `#2563eb` | Text added by the user |
| `deletion` | `<del>` | Red strikethrough `#b91c1c` | Text deleted by the user |
| `blankHighlight` | `<mark class="blank-highlight">` | Amber `#fbbf24` | Blank/unfilled clause field |

### Editor initialisation flow

1. If `disableTrackChanges` is `false`, `suggestChanges()` plugin is added to ProseMirror plugins.
2. After the `EditorView` is created, `enableSuggestChanges(view.state, view.dispatch)` is called — this sets the suggestion mode flag in plugin state.
3. From this point every keystroke goes through `withSuggestChanges(dispatchTransaction)`, which wraps the transaction to automatically mark typed text as `insertion` and deleted text as `deletion`.

### Auto-apply on first load

When `initialHtml` contains `<ins>`/`<del>` (e.g. from an AI `/process` response):

- The first dispatch after loading detects existing suggestion marks.
- If the doc is a **single paragraph**, `applySuggestions()` is called immediately — it accepts all suggestions and sets the result as the new baseline (`originalTextRef`).
- If the doc is **multi-paragraph**, suggestions are left visible (not auto-applied) so the user can review them.
- This logic runs at most once per editor mount (`autoAppliedFirstSuggestionsRef`).

### Blank highlight cleanup

When a user edits text that has an amber `blankHighlight` mark (e.g. types into a `___` blank), the dispatch handler strips the `blankHighlight` mark from the edited node so the text transitions to normal suggestion colours.

---

## Text Extraction Helpers

These pure functions operate on a ProseMirror `Node` (doc) and the schema:

| Function | Purpose |
|---|---|
| `docToPlainText(doc)` | All paragraph text joined by `\n`. Includes both inserted and deleted text. |
| `getAcceptedPlainText(doc, schema)` | Paragraphs joined by `\n`, **skipping** nodes with `deletion` mark. This is what `getText()` returns. |
| `getOriginalPlainText(doc, schema)` | Paragraphs joined by `\n`, **skipping** nodes with `insertion` mark. This is what `getOriginalText()` returns. |
| `textToDoc(schema, text)` | Converts plain text → ProseMirror doc. Splits on `\n+`. |
| `plainTextToDoc(schema, text)` | Like `textToDoc` but preserves single blank lines (for non-AI paste). Collapses consecutive blank lines. |
| `htmlToDoc(schema, html)` | Parses HTML → ProseMirror doc. Handles `<ins>`/`<del>`/`<mark>` inside `<p>` elements. Fallback for `\n`-separated or flat HTML. |

---

## Phrase Navigation

`navigateToPhrase(phrase)` uses a multi-stage search strategy to find the phrase range in the doc:

1. **Raw `textContent`** — direct `indexOf` (exact, then case-insensitive, then regex with flexible whitespace).
2. **Plain text** (`docToPlainText`) — if different from `textContent` (e.g. paragraphs collapsed).
3. **Original text** (pre-edit) — searches across segments mapped back to doc positions.
4. **Accepted text** (post-edit) — searches the accepted-only text segments.

On match, it sets a ProseMirror decoration (`phraseHighlightPlugin`) with class `sentence-highlight` (green border + background) and scrolls it into view.

---

## Scroll-to-End

`onScrollToEnd` is fired when `scrollHeight - scrollTop - clientHeight <= 4px`. It is checked:
- On every `scroll` event on the editor DOM node.
- After every dispatch (via `requestAnimationFrame`) — catches short text that never overflows.
- When `isVisible` flips from `false` → `true` (tab becomes active again).

The callback is idempotent — the editor calls it every time the condition is met, not just once.

---

## Consumer Map

| Consumer | Ref methods used |
|---|---|
| `BGDetails.tsx` | `undo()`, `redo()` (toolbar buttons) |
| `ClauseStatusPanel.tsx` | `getCursorPosition()`, `insertTextAtPosition()`, `insertTextAtEnd()` |
| `MatchingTemplateModal.tsx` | `getText()`, `setText()` |
| `MatchingTemplateGrid.tsx` | `getText()` |
| `ExtractSaveTemplate.tsx` | `getText()` (on up to 3 refs) |
| `BGClauseValidator.tsx` | `navigateToPhrase()`, `getHtml()`, `getChanges()`, `getChangesWithOffsets()`, `getOriginalText()`, `syncContentChangeBaseline()` |

---

## `utils/common.ts` — `extractTextFromHtml`

Used when seeding a plain-mode editor from `initialHtml`:

- Removes `del.text-removed` nodes entirely.
- Unwraps `ins.text-added`, `mark`, and `span.extracted-field` nodes (keeps their text).
- Returns `element.textContent` of the result.

Other utils: `formatAmount`, `unescapeHtmlEntities` (decodes double-escaped HTML entities), `normalizeTextForDiff` (normalises `\r\n`, NBSP ` `, em-space ` `).

---

## Important Implementation Notes

- **`isDisabled` is excluded from the main `useEffect` deps** deliberately — re-mounting on every View↔Edit toggle would wipe `setText()`-loaded template content.
- **No `console.log`** — this is a banking app; log statements could leak clause/contract text.
- **`withSuggestChanges` error recovery** — if the suggest-changes wrapper throws (e.g. `AddNodeMarkStep` on paragraph merge), the dispatch replays only safe steps, skipping `AddNodeMarkStep`, so the editor stays usable.
- **`contentChangeBaselineRef` vs `originalTextRef`** — two separate baselines:
  - `originalTextRef` — updated on every dispatch and by `applySuggestions` auto-apply. Tracks the "current accepted state" for `getOriginalText()`.
  - `contentChangeBaselineRef` — only reset by `setText()` or `syncContentChangeBaseline()`. Drives `onContentChange` so it reflects whether the user has meaningfully changed content since the last save/validate.
