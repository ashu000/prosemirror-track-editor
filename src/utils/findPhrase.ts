import type { Node as PMNode } from 'prosemirror-model';
import {
  docToPlainText,
  getAcceptedTextAndSegments,
  getOriginalTextAndSegments,
  getPlainTextToDocSegments,
  PARAGRAPH_SEP,
  type Segment,
} from './docHelpers';

export function mapAcceptedRangeToDoc(
  segments: Segment[],
  startOffset: number,
  endOffset: number
): { from: number; to: number } | null {
  let docFrom: number | null = null;
  let docTo: number | null = null;
  for (let segIndex = 0; segIndex < segments.length; segIndex += 1) {
    const seg = segments[segIndex];
    if (
      docFrom === null &&
      startOffset >= seg.start &&
      startOffset <= seg.end
    ) {
      docFrom =
        seg.from === seg.to ? seg.from : seg.from + (startOffset - seg.start);
    }
    if (docTo === null && endOffset >= seg.start && endOffset <= seg.end) {
      docTo =
        seg.from === seg.to ? seg.from : seg.from + (endOffset - seg.start);
    }
    if (docFrom !== null && docTo !== null) break;
  }
  return docFrom != null && docTo != null && docFrom <= docTo
    ? { from: docFrom, to: docTo }
    : null;
}

function plainTextRangeToDoc(
  doc: PMNode,
  startOffset: number,
  endOffset: number
): { from: number; to: number } | null {
  const segments = getPlainTextToDocSegments(doc);
  return mapAcceptedRangeToDoc(segments, startOffset, endOffset);
}

export function findRangeAtOffset(
  doc: PMNode,
  startOffset: number,
  endOffset: number
): { from: number; to: number } | null {
  let currentOffset = 0;
  let from: number | null = null;
  let to: number | null = null;
  doc.descendants((node: PMNode, pos: number) => {
    if (node.isText && node.text != null) {
      const nodeStart = currentOffset;
      const nodeEnd = currentOffset + node.text.length;
      if (from === null && startOffset >= nodeStart && startOffset <= nodeEnd) {
        from = pos + (startOffset - nodeStart);
      }
      if (to === null && endOffset >= nodeStart && endOffset <= nodeEnd) {
        to = pos + (endOffset - nodeStart);
      }
      currentOffset = nodeEnd;
    }
    return true;
  });
  return from != null && to != null && from <= to ? { from, to } : null;
}

export function findInText(
  text: string,
  cleanPhrase: string
): { startOffset: number; endOffset: number } | null {
  const isWs = (ch: string) => /\s/.test(ch) || ch === ' ';
  const lowerChar = (ch: string) => (ch === ' ' ? ' ' : ch).toLowerCase();
  const matchWithFlexibleWhitespace = (
    source: string,
    phrase: string,
    startIdx: number
  ): number | null => {
    let iText = startIdx;
    let iPhrase = 0;
    while (iPhrase < phrase.length && iText < source.length) {
      const t = source[iText];
      const p = phrase[iPhrase];
      if (isWs(t) && isWs(p)) {
        while (iText < source.length && isWs(source[iText])) iText += 1;
        while (iPhrase < phrase.length && isWs(phrase[iPhrase])) iPhrase += 1;
      } else if (lowerChar(t) === lowerChar(p)) {
        iText += 1;
        iPhrase += 1;
      } else {
        return null;
      }
    }
    while (iPhrase < phrase.length && isWs(phrase[iPhrase])) iPhrase += 1;
    return iPhrase === phrase.length ? iText : null;
  };

  const exactIdx = text.indexOf(cleanPhrase);
  if (exactIdx !== -1)
    return { startOffset: exactIdx, endOffset: exactIdx + cleanPhrase.length };
  const lower = text.toLowerCase();
  const phraseLower = cleanPhrase.toLowerCase();
  const caseIdx = lower.indexOf(phraseLower);
  if (caseIdx !== -1)
    return { startOffset: caseIdx, endOffset: caseIdx + cleanPhrase.length };
  try {
    const escaped = cleanPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = escaped.replace(/\s+/g, '\\s+');
    const regex = new RegExp(pattern, 'i');
    const match = text.match(regex);
    if (match && match.index !== undefined) {
      return {
        startOffset: match.index,
        endOffset: match.index + match[0].length,
      };
    }
  } catch {
    // ignore
  }
  const substring = cleanPhrase
    .substring(0, Math.min(80, cleanPhrase.length))
    .trim();
  if (substring.length >= 10) {
    let subIdx = text.indexOf(substring);
    if (subIdx === -1) subIdx = lower.indexOf(substring.toLowerCase());
    if (subIdx !== -1) {
      const flexEnd = matchWithFlexibleWhitespace(text, cleanPhrase, subIdx);
      if (flexEnd != null) {
        return { startOffset: subIdx, endOffset: flexEnd };
      }
      const end = subIdx + cleanPhrase.length;
      if (
        end <= text.length &&
        text.slice(subIdx, end).toLowerCase() === phraseLower
      ) {
        return { startOffset: subIdx, endOffset: end };
      }
      return { startOffset: subIdx, endOffset: subIdx + substring.length };
    }
  }
  return null;
}

export function findPhraseRange(
  doc: PMNode,
  phrase: string,
  schema: any
): { from: number; to: number } | null {
  const cleanPhrase = phrase
    .replace(/^\.\.\./, '')
    .replace(/\.\.\.$/, '')
    .trim();
  if (!cleanPhrase) return null;

  const normalizeForHighlight = (s: string) =>
    s
      .replace(/ /g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

  const isFullMatch = (
    sourceText: string,
    match: { startOffset: number; endOffset: number }
  ) =>
    normalizeForHighlight(
      sourceText.slice(match.startOffset, match.endOffset)
    ) === normalizeForHighlight(cleanPhrase);

  const rawText = doc.textContent || '';
  let match = findInText(rawText, cleanPhrase);
  if (match) {
    if (match && !isFullMatch(rawText, match)) match = null;
    if (match) {
      const range = findRangeAtOffset(doc, match.startOffset, match.endOffset);
      if (range) return range;
    }
  }

  const plainText = docToPlainText(doc);
  if (plainText !== rawText) {
    match = findInText(plainText, cleanPhrase);
    if (match && isFullMatch(plainText, match)) {
      const range = plainTextRangeToDoc(
        doc,
        match.startOffset,
        match.endOffset
      );
      if (range) return range;
    }
  }

  const { originalText, segments: origSegments } = getOriginalTextAndSegments(
    doc,
    schema
  );
  if (originalText && origSegments.length > 0) {
    const origMatch = findInText(originalText, cleanPhrase);
    if (origMatch && isFullMatch(originalText, origMatch)) {
      return mapAcceptedRangeToDoc(
        origSegments,
        origMatch.startOffset,
        origMatch.endOffset
      );
    }
  }

  const { acceptedText, segments } = getAcceptedTextAndSegments(doc, schema);
  if (acceptedText && segments.length > 0) {
    const acceptedMatch = findInText(acceptedText, cleanPhrase);
    if (acceptedMatch && isFullMatch(acceptedText, acceptedMatch)) {
      return mapAcceptedRangeToDoc(
        segments,
        acceptedMatch.startOffset,
        acceptedMatch.endOffset
      );
    }
  }

  return null;
}

// Re-export PARAGRAPH_SEP for any consumer that needs it via this module
export { PARAGRAPH_SEP };
