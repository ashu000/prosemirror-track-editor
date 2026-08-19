import type { Node as PMNode } from 'prosemirror-model';
import { Selection, TextSelection } from 'prosemirror-state';

export type ChangeWithOffset = {
  deletedText: string;
  addedText: string;
  deletedOffset: { start: number; end: number } | null;
  addedOffset: { start: number; end: number } | null;
};

export type Segment = { start: number; end: number; from: number; to: number };

type ChangeSegment = {
  from: number;
  kind: 'del' | 'ins';
  text: string;
};

type ChangeWithOffsetSegment = {
  from: number;
  kind: 'del' | 'ins';
  text: string;
  deletedOffset: { start: number; end: number } | null;
  addedOffset: { start: number; end: number } | null;
};

export const PARAGRAPH_SEP = '\n';

export function normalizeForContentChangeBaseline(text?: string | null): string {
  return String(text ?? '')
    .replace(/\r\n/g, '\n')
    .trim();
}

export function docToPlainText(doc: PMNode): string {
  const parts: string[] = [];
  doc.forEach((node: PMNode) => {
    parts.push(node.textContent || '');
  });
  return parts.join(PARAGRAPH_SEP);
}

export function textToDoc(schema: any, text: string): PMNode {
  const trimmed = text.trim();
  if (!trimmed) return schema.topNodeType.createAndFill() as PMNode;
  const lines = trimmed.split(/\n+/).map((p) => p.trim());
  const nodes = lines.map((p) =>
    schema.nodes.paragraph.create(null, p.length ? schema.text(p) : undefined)
  );
  return schema.node(
    'doc',
    null,
    nodes.length ? nodes : [schema.nodes.paragraph.create()]
  );
}

export function collapseConsecutiveEmptyPlainLines(lines: string[]): string[] {
  const result: string[] = [];
  let prevWasEmpty = false;
  lines.forEach((line) => {
    const isEmpty = line.length === 0;
    if (isEmpty && prevWasEmpty) return;
    result.push(line);
    prevWasEmpty = isEmpty;
  });
  return result;
}

export function plainTextToDoc(schema: any, text: string): PMNode {
  const normalized = String(text ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  if (!normalized.trim()) return schema.topNodeType.createAndFill() as PMNode;
  const lines = collapseConsecutiveEmptyPlainLines(normalized.split('\n'));
  const nodes = lines.map((line) =>
    schema.nodes.paragraph.create(
      null,
      line.length > 0 ? schema.text(line) : undefined
    )
  );
  return schema.node(
    'doc',
    null,
    nodes.length > 0 ? nodes : [schema.nodes.paragraph.create()]
  );
}

export function selectionAtEnd(doc: PMNode): any {
  const pos = doc.content.size;
  const sel = Selection.findFrom(doc.resolve(pos), -1);
  return (sel as any) ?? TextSelection.create(doc, Math.max(1, pos - 1));
}

export function getTextOffsetBefore(doc: PMNode, pos: number): number {
  let off = 0;
  doc.descendants((node: PMNode, p: number) => {
    if (p >= pos) return false;
    if (node.isText && node.text != null) {
      const end = p + node.nodeSize;
      if (pos <= end) off += pos - p;
      else off += node.text.length;
      return false;
    }
    return true;
  });
  return off;
}

export function getPlainTextToDocSegments(doc: PMNode): Segment[] {
  const segments: Segment[] = [];
  let plainOff = 0;
  doc.forEach((node: PMNode, offset: number, index: number) => {
    const len = node.textContent.length;
    segments.push({
      start: plainOff,
      end: plainOff + len,
      from: offset,
      to: offset + node.nodeSize,
    });
    plainOff += len + (index < doc.childCount - 1 ? PARAGRAPH_SEP.length : 0);
  });
  return segments;
}

export function getAcceptedTextAndSegments(
  doc: PMNode,
  schema: any
): { acceptedText: string; segments: Segment[] } {
  const segments: Segment[] = [];
  let acceptedText = '';
  const deletion = schema.marks.deletion;
  if (!deletion) return { acceptedText: doc.textContent || '', segments };
  doc.forEach((block: PMNode, blockOffset: number, blockIndex: number) => {
    block.descendants((node: PMNode, relPos: number) => {
      if (!node.isText || node.text == null) return true;
      const hasDeletion = node.marks.some(
        (m: { type: unknown }) => m.type === deletion
      );
      if (hasDeletion) return true;
      const len = node.text.length;
      segments.push({
        start: acceptedText.length,
        end: acceptedText.length + len,
        from: blockOffset + relPos,
        to: blockOffset + relPos + node.nodeSize,
      });
      acceptedText += node.text;
      return true;
    });

    if (blockIndex < doc.childCount - 1) {
      const sepStart = acceptedText.length;
      acceptedText += PARAGRAPH_SEP;
      const boundaryPos = blockOffset + block.nodeSize;
      segments.push({
        start: sepStart,
        end: sepStart + PARAGRAPH_SEP.length,
        from: boundaryPos,
        to: boundaryPos,
      });
    }
  });
  return { acceptedText, segments };
}

export function getAcceptedPlainText(doc: PMNode, schema: any): string {
  const deletion = schema.marks.deletion;
  if (!deletion) return docToPlainText(doc);
  const parts: string[] = [];
  doc.forEach((block: PMNode, _offset: number, index: number) => {
    let blockText = '';
    block.descendants((node: PMNode) => {
      if (!node.isText || node.text == null) return true;
      const hasDeletion = node.marks.some(
        (m: { type: unknown }) => m.type === deletion
      );
      if (!hasDeletion) blockText += node.text;
      return true;
    });
    parts.push(blockText);
    if (index < doc.childCount - 1) parts.push(PARAGRAPH_SEP);
  });
  return parts.join('');
}

export function getOriginalTextAndSegments(
  doc: PMNode,
  schema: any
): { originalText: string; segments: Segment[] } {
  const segments: Segment[] = [];
  let originalText = '';
  const deletion = schema.marks.deletion;
  const insertion = schema.marks.insertion;
  if (!deletion || !insertion)
    return { originalText: doc.textContent || '', segments };
  doc.forEach((block: PMNode, blockOffset: number, blockIndex: number) => {
    block.descendants((node: PMNode, relPos: number) => {
      if (!node.isText || node.text == null) return true;
      const hasInsertion = node.marks.some(
        (m: { type: unknown }) => m.type === insertion
      );
      if (hasInsertion) return true;
      const len = node.text.length;
      segments.push({
        start: originalText.length,
        end: originalText.length + len,
        from: blockOffset + relPos,
        to: blockOffset + relPos + node.nodeSize,
      });
      originalText += node.text;
      return true;
    });

    if (blockIndex < doc.childCount - 1) {
      const sepStart = originalText.length;
      originalText += PARAGRAPH_SEP;
      const boundaryPos = blockOffset + block.nodeSize;
      segments.push({
        start: sepStart,
        end: sepStart + PARAGRAPH_SEP.length,
        from: boundaryPos,
        to: boundaryPos,
      });
    }
  });
  return { originalText, segments };
}

export function getOriginalPlainText(doc: PMNode, schema: any): string {
  const deletion = schema.marks.deletion;
  const insertion = schema.marks.insertion;
  if (!deletion || !insertion) return docToPlainText(doc);
  return getOriginalTextAndSegments(doc, schema).originalText;
}

export function compareChangeSegments(
  a: { from: number; kind: 'del' | 'ins' },
  b: { from: number; kind: 'del' | 'ins' }
): number {
  if (a.from !== b.from) return a.from - b.from;
  if (a.kind === b.kind) return 0;
  return a.kind === 'del' ? -1 : 1;
}

export function getChangesFromDoc(
  doc: PMNode,
  schema: any
): { deletedText: string[]; addedText: string[] } {
  const deletedText: string[] = [];
  const addedText: string[] = [];
  const deletion = schema.marks.deletion;
  const insertion = schema.marks.insertion;
  if (!deletion || !insertion) return { deletedText, addedText };

  const segments: ChangeSegment[] = [];
  doc.descendants((node: PMNode, pos: number) => {
    if (!node.isText || !node.text) return true;
    const hasDeletion = node.marks.some((m: any) => m.type === deletion);
    const hasInsertion = node.marks.some((m: any) => m.type === insertion);
    if (hasDeletion) {
      segments.push({ from: pos, kind: 'del', text: node.text });
    }
    if (hasInsertion) {
      segments.push({ from: pos, kind: 'ins', text: node.text });
    }
    return true;
  });

  segments.sort(compareChangeSegments);

  let i = 0;
  while (i < segments.length) {
    const cur = segments[i];
    if (cur.kind === 'del') {
      const next = segments[i + 1];
      if (next && next.kind === 'ins') {
        deletedText.push(cur.text);
        addedText.push(next.text);
        i += 2;
      } else {
        deletedText.push(cur.text);
        addedText.push('');
        i += 1;
      }
    } else {
      deletedText.push('');
      addedText.push(cur.text);
      i += 1;
    }
  }

  return { deletedText, addedText };
}

export function getChangesWithOffsetsFromDoc(
  doc: PMNode,
  schema: any
): ChangeWithOffset[] {
  const deletion = schema.marks.deletion;
  const insertion = schema.marks.insertion;
  if (!deletion || !insertion) return [];

  let originalCursor = 0;
  let acceptedCursor = 0;
  const segments: ChangeWithOffsetSegment[] = [];

  doc.forEach((block: PMNode, _blockOffset: number, blockIndex: number) => {
    block.descendants((node: PMNode) => {
      if (!node.isText || !node.text) return true;
      const len = node.text.length;
      const hasDeletion = node.marks.some((m: any) => m.type === deletion);
      const hasInsertion = node.marks.some((m: any) => m.type === insertion);

      if (hasDeletion) {
        segments.push({
          from: originalCursor + acceptedCursor,
          kind: 'del',
          text: node.text,
          deletedOffset: { start: originalCursor, end: originalCursor + len },
          addedOffset: null,
        });
        originalCursor += len;
        return true;
      }

      if (hasInsertion) {
        segments.push({
          from: originalCursor + acceptedCursor,
          kind: 'ins',
          text: node.text,
          deletedOffset: null,
          addedOffset: { start: acceptedCursor, end: acceptedCursor + len },
        });
        acceptedCursor += len;
        return true;
      }

      originalCursor += len;
      acceptedCursor += len;
      return true;
    });

    if (blockIndex < doc.childCount - 1) {
      originalCursor += PARAGRAPH_SEP.length;
      acceptedCursor += PARAGRAPH_SEP.length;
    }
  });

  segments.sort(compareChangeSegments);

  const changes: ChangeWithOffset[] = [];

  let i = 0;
  while (i < segments.length) {
    const cur = segments[i];
    if (cur.kind === 'del') {
      const next = segments[i + 1];
      if (next && next.kind === 'ins') {
        changes.push({
          deletedText: cur.text,
          addedText: next.text,
          deletedOffset: cur.deletedOffset,
          addedOffset: next.addedOffset,
        });
        i += 2;
      } else {
        changes.push({
          deletedText: cur.text,
          addedText: '',
          deletedOffset: cur.deletedOffset,
          addedOffset: null,
        });
        i += 1;
      }
    } else {
      changes.push({
        deletedText: '',
        addedText: cur.text,
        deletedOffset: null,
        addedOffset: cur.addedOffset,
      });
      i += 1;
    }
  }

  return changes;
}
