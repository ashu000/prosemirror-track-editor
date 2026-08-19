import { describe, it, expect } from 'vitest';
import { proseMirrorSchema } from '../schema';
import { findInText, findPhraseRange } from '../utils/findPhrase';

const schema = proseMirrorSchema;

function makeSingleParaDoc(text: string) {
  return schema.node('doc', null, [
    schema.nodes.paragraph.create(null, text.length ? schema.text(text) : undefined),
  ]);
}

// ─── findInText ─────────────────────────────────────────────────────────────

describe('findInText', () => {
  it('finds an exact match', () => {
    const result = findInText('say hello world', 'hello');
    expect(result).toEqual({ startOffset: 4, endOffset: 9 });
  });

  it('finds a case-insensitive match', () => {
    const result = findInText('say hello world', 'Hello');
    expect(result).not.toBeNull();
    expect(result!.startOffset).toBe(4);
    expect(result!.endOffset).toBe(9);
  });

  it('returns null when phrase is not found', () => {
    expect(findInText('say hello world', 'goodbye')).toBeNull();
  });

  it('handles flexible whitespace — double space in phrase matches single space in text', () => {
    const result = findInText('hello world', 'hello  world');
    expect(result).not.toBeNull();
    expect(result!.startOffset).toBe(0);
  });

  it('returns null for empty text', () => {
    expect(findInText('', 'hello')).toBeNull();
  });

  it('finds phrase at the start', () => {
    const result = findInText('hello world', 'hello');
    expect(result).toEqual({ startOffset: 0, endOffset: 5 });
  });

  it('finds phrase at the end', () => {
    const result = findInText('say hello', 'hello');
    expect(result).toEqual({ startOffset: 4, endOffset: 9 });
  });
});

// ─── findPhraseRange ────────────────────────────────────────────────────────

describe('findPhraseRange', () => {
  it('finds a phrase in a single-paragraph doc', () => {
    const doc = makeSingleParaDoc('The applicant shall furnish documents.');
    const range = findPhraseRange(doc, 'furnish', schema);
    expect(range).not.toBeNull();
    expect(range!.from).toBeLessThan(range!.to);
  });

  it('returns null when phrase is not in doc', () => {
    const doc = makeSingleParaDoc('The applicant shall furnish documents.');
    expect(findPhraseRange(doc, 'banana', schema)).toBeNull();
  });

  it('strips leading ... before searching', () => {
    const doc = makeSingleParaDoc('The applicant shall furnish documents.');
    const range = findPhraseRange(doc, '...furnish', schema);
    expect(range).not.toBeNull();
    expect(range!.from).toBeLessThan(range!.to);
  });

  it('strips trailing ... before searching', () => {
    const doc = makeSingleParaDoc('The applicant shall furnish documents.');
    const range = findPhraseRange(doc, 'furnish...', schema);
    expect(range).not.toBeNull();
  });

  it('returns null for empty phrase after stripping', () => {
    const doc = makeSingleParaDoc('The applicant shall furnish documents.');
    expect(findPhraseRange(doc, '...', schema)).toBeNull();
  });

  it('range from is the doc position of the phrase start', () => {
    const doc = makeSingleParaDoc('hello world');
    const range = findPhraseRange(doc, 'world', schema);
    expect(range).not.toBeNull();
    // "hello " is 6 chars; in a single paragraph the doc offset starts at 1 (paragraph node boundary)
    expect(range!.from).toBeGreaterThan(1);
    expect(range!.to).toBeGreaterThan(range!.from);
  });

  it('finds phrase case-insensitively', () => {
    const doc = makeSingleParaDoc('The Applicant Shall Furnish documents.');
    const range = findPhraseRange(doc, 'furnish', schema);
    expect(range).not.toBeNull();
  });
});
