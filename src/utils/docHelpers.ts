// TODO Phase 1: extract pure doc-manipulation helpers from ProseMirrorTextEditor.tsx
// Functions to extract:
//   docToPlainText, getAcceptedPlainText, getOriginalPlainText,
//   textToDoc, plainTextToDoc, htmlToDoc,
//   getChangesFromDoc, getChangesWithOffsetsFromDoc,
//   getAcceptedTextAndSegments, getOriginalTextAndSegments

import type { Node as PMNode } from 'prosemirror-model';

export type ChangeWithOffset = {
  deletedText: string;
  addedText: string;
  deletedOffset: { start: number; end: number } | null;
  addedOffset: { start: number; end: number } | null;
};

// Placeholder — replaced in Phase 1
export function docToPlainText(_doc: PMNode): string { return ''; }
export function getAcceptedPlainText(_doc: PMNode, _schema: unknown): string { return ''; }
