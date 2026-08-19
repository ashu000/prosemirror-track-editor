# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.4] - 2026-08-19

### Changed
- Demo UI simplified: removed Validate and Get Changes buttons; kept only Process with AI and Reset.
- Added hint text and inline success/error feedback to the demo for first-time visitors.

## [0.1.3] - 2026-08-19

### Fixed
- `simulateDiff` in demo server no longer appends `_v2` to replaced words — substitutions now use a real synonym lookup table (e.g. `shall→must`, `furnish→provide`) so track-change marks show meaningful word replacements.

### Changed
- Demo server `getOriginalText()` is used as the Process with AI input (excludes pending deletions from the sent text).
- README: added live Vercel demo badge and URL.

## [0.1.2] - 2026-08-19

### Added
- `ariaLabel` and `ariaLabelledBy` props on `TrackEditorProps` — forwarded as `aria-label` / `aria-labelledby` on the editor host element.
- `role="textbox"` and `aria-multiline="true"` on the editor host element for screen-reader accessibility.
- `aria-disabled` set when `isDisabled` is true.
- Source maps enabled (`sourcemap: true` in Vite build config).
- `sideEffects: false` in `package.json` for tree-shaking support.
- `styled-components` moved to `peerDependencies` — consumers must install it directly.
- `engines: { node: ">=16" }` declared in `package.json`.
- `useTrackEditor` hook usage example in README.
- Full 14-variable theming table in README.
- Browser support table in README.

## [0.1.0] - 2026-08-19

### Added

- `src/TrackEditor.tsx` — main `<TrackEditor>` React component (forwardRef) with full track-changes support via `@handlewithcare/prosemirror-suggest-changes`. Supports `initialText`, `initialHtml` (with `<ins>`/`<del>` parsing), `isDisabled`, `disableTrackChanges`, `disablePhraseHighlight`, `isVisible`, `className`, `style`, `onTextChange`, `onContentChange`, `onScrollToEnd` props.
- `src/TrackEditor.types.ts` — `TrackEditorRef` and `TrackEditorProps` TypeScript interfaces exported as the public surface.
- `src/TrackEditor.styled.tsx` — `EditorWrapper` styled-component with full ProseMirror CSS including insertion (blue), deletion (red strikethrough), blank-highlight (amber), and phrase-highlight (green) styles. Exported from `index.ts` for consumer extension.
- `src/useTrackEditor.ts` — `useTrackEditor()` headless hook exposing the full `TrackEditorRef` surface as direct callable methods, for consumers who prefer not to manage a ref manually.
- `src/schema.ts` — `proseMirrorSchema` with `insertion`, `deletion`, and `blankHighlight` marks built on `prosemirror-schema-basic` via `addSuggestionMarks`.
- `src/plugins/phraseHighlight.ts` — `phraseHighlightPlugin` and `phraseHighlightPluginKey` for green clause-highlight decorations with smooth scroll-into-view.
- `src/plugins/suggestChanges.ts` — clean re-export of `suggestChanges`, `withSuggestChanges`, `enableSuggestChanges`, `applySuggestions`, `isSuggestChangesEnabled`, `addSuggestionMarks` from `@handlewithcare/prosemirror-suggest-changes`.
- `src/utils/docHelpers.ts` — 17 pure doc-manipulation helpers: `docToPlainText`, `getAcceptedPlainText`, `getOriginalPlainText`, `textToDoc`, `plainTextToDoc`, `getChangesFromDoc`, `getChangesWithOffsetsFromDoc`, `getAcceptedTextAndSegments`, `getOriginalTextAndSegments`, `selectionAtEnd`, `getTextOffsetBefore`, `normalizeForContentChangeBaseline`, `collapseConsecutiveEmptyPlainLines`, `compareChangeSegments`, `getPlainTextToDocSegments`, `plainTextRangeToDoc`, `mapAcceptedRangeToDoc`. Exports `ChangeWithOffset` and `Segment` types.
- `src/utils/htmlToDoc.ts` — `htmlToDoc` and `collectInlinesFromElement` for parsing HTML with `<ins>`/`<del>`/`<mark class="blank-highlight">` into a ProseMirror doc with proper suggestion marks.
- `src/utils/findPhrase.ts` — `findPhraseRange` with 4-stage fuzzy search (exact → case-insensitive → regex with flexible whitespace → substring fallback), plus `findInText`, `findRangeAtOffset`, `mapAcceptedRangeToDoc`.
- `src/index.ts` — public package surface: `TrackEditor`, `useTrackEditor`, `EditorWrapper`, `TrackEditorRef`, `TrackEditorProps`, `ChangeWithOffset`.
- `demo/src/App.tsx` — full demo UI with Undo/Redo toolbar, editor status line (has content / changed), and four action buttons: **Process with AI**, **Validate**, **Get Changes**, **Clear**. Result panel shows API responses as formatted JSON with loading and error states.
- `demo/server/index.ts` — Express server on port 3001 with CORS for the Vite dev origin.
- `demo/server/routes/process.ts` — `POST /process` endpoint: accepts `{ text, instruction? }`, runs a word-level diff simulation (marks every ~5th word as `<del>old</del><ins>old_v2</ins>`), returns `{ html, changeCount, processingMs }`.
- `demo/server/routes/validate.ts` — `POST /validate` endpoint: accepts `{ html, changes, changesWithOffsets, originalText }`, checks for unfilled blanks (`___`), validates offset ranges from `changesWithOffsets`, returns `{ valid, errors, changeCount, deletionCount, insertionCount, originalLength, summary }` or 422 with error details.

### Changed

- `demo/server/routes/process.ts` — replaced hardcoded word substitutions ("furnish" → "provide") with a general word-level diff that works on any input text.
- `demo/server/routes/validate.ts` — validate handler now destructures and uses `changesWithOffsets` for precise change counts and offset range validation, falling back to `changes[]` arrays when offsets are absent.
- `demo/src/App.tsx` — validate payload updated to include `changesWithOffsets` from `editorRef.current.getChangesWithOffsets()`, aligning the frontend payload with the full API contract.

### Fixed

- `demo/server/index.ts` — replaced `ts-node` with `tsx` and added `.js` extensions to relative ESM imports (`./routes/process.js`, `./routes/validate.js`) to resolve `ERR_MODULE_NOT_FOUND` when running under Node ESM mode (`"type": "module"`).
- `demo/tsconfig.json` — corrected `moduleResolution` from `"bundler"` (unsupported in this TypeScript version) to `"node"`; removed invalid `references` entry that required `composite: true` in the root config.
- `src/TrackEditor.tsx` — `DOMSerializer` correctly imported from `prosemirror-model` (not `prosemirror-view` as in the original source).

[0.1.0]: https://github.com/ashutosh-dubey3/prosemirror-track-editor/releases/tag/v0.1.0
