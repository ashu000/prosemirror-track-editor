import { describe, it, expect } from 'vitest';
import { proseMirrorSchema } from '../schema';
import {
  docToPlainText,
  textToDoc,
  plainTextToDoc,
  normalizeForContentChangeBaseline,
  getChangesFromDoc,
  getAcceptedPlainText,
} from '../utils/docHelpers';

// ─── helpers ───────────────────────────────────────────────────────────────

const schema = proseMirrorSchema;

function makeDoc(paragraphs: string[]) {
  const nodes = paragraphs.map((p) =>
    schema.nodes.paragraph.create(null, p.length ? schema.text(p) : undefined)
  );
  return schema.node('doc', null, nodes);
}

function makeDocWithMarks() {
  const ins = schema.marks.insertion.create();
  const del = schema.marks.deletion.create();
  return {
    replacement: schema.node('doc', null, [
      schema.nodes.paragraph.create(null, [
        schema.text('hello ', []),
        schema.text('old', [del]),
        schema.text('new', [ins]),
        schema.text(' world', []),
      ]),
    ]),
    pureDeletion: schema.node('doc', null, [
      schema.nodes.paragraph.create(null, [
        schema.text('hello ', []),
        schema.text('old', [del]),
        schema.text(' world', []),
      ]),
    ]),
    pureInsertion: schema.node('doc', null, [
      schema.nodes.paragraph.create(null, [
        schema.text('hello ', []),
        schema.text('new', [ins]),
        schema.text(' world', []),
      ]),
    ]),
    withDeletion: schema.node('doc', null, [
      schema.nodes.paragraph.create(null, [
        schema.text('keep ', []),
        schema.text('gone', [del]),
        schema.text(' keep', []),
      ]),
    ]),
    withInsertion: schema.node('doc', null, [
      schema.nodes.paragraph.create(null, [
        schema.text('keep ', []),
        schema.text('added', [ins]),
        schema.text(' keep', []),
      ]),
    ]),
  };
}

// ─── docToPlainText ─────────────────────────────────────────────────────────

describe('docToPlainText', () => {
  it('returns empty string for empty doc', () => {
    const doc = schema.topNodeType.createAndFill()!;
    expect(docToPlainText(doc)).toBe('');
  });

  it('returns text for single paragraph', () => {
    const doc = makeDoc(['hello']);
    expect(docToPlainText(doc)).toBe('hello');
  });

  it('joins multiple paragraphs with newline', () => {
    const doc = makeDoc(['hello', 'world']);
    expect(docToPlainText(doc)).toBe('hello\nworld');
  });

  it('includes both deleted and inserted text', () => {
    const { replacement } = makeDocWithMarks();
    const text = docToPlainText(replacement);
    expect(text).toContain('old');
    expect(text).toContain('new');
  });
});

// ─── textToDoc ──────────────────────────────────────────────────────────────

describe('textToDoc', () => {
  it('empty string → doc with one empty paragraph', () => {
    const doc = textToDoc(schema, '');
    expect(doc.childCount).toBe(1);
    expect(doc.firstChild!.textContent).toBe('');
  });

  it('single line → one paragraph with correct text', () => {
    const doc = textToDoc(schema, 'hello');
    expect(doc.childCount).toBe(1);
    expect(doc.firstChild!.textContent).toBe('hello');
  });

  it('two newline-separated lines → two paragraphs', () => {
    const doc = textToDoc(schema, 'line1\nline2');
    expect(doc.childCount).toBe(2);
    expect(doc.child(0).textContent).toBe('line1');
    expect(doc.child(1).textContent).toBe('line2');
  });
});

// ─── plainTextToDoc ─────────────────────────────────────────────────────────

describe('plainTextToDoc', () => {
  it('empty string → one empty paragraph', () => {
    const doc = plainTextToDoc(schema, '');
    expect(doc.childCount).toBe(1);
    expect(doc.firstChild!.textContent).toBe('');
  });

  it('preserves a single blank line between paragraphs', () => {
    const doc = plainTextToDoc(schema, 'a\n\nb');
    expect(doc.childCount).toBe(3);
    expect(doc.child(0).textContent).toBe('a');
    expect(doc.child(1).textContent).toBe('');
    expect(doc.child(2).textContent).toBe('b');
  });

  it('collapses consecutive blank lines to one', () => {
    const doc = plainTextToDoc(schema, 'a\n\n\nb');
    expect(doc.childCount).toBe(3);
    expect(doc.child(0).textContent).toBe('a');
    expect(doc.child(1).textContent).toBe('');
    expect(doc.child(2).textContent).toBe('b');
  });

  it('normalises \\r\\n line endings', () => {
    const doc = plainTextToDoc(schema, 'a\r\nb');
    expect(doc.childCount).toBe(2);
    expect(doc.child(0).textContent).toBe('a');
    expect(doc.child(1).textContent).toBe('b');
  });
});

// ─── normalizeForContentChangeBaseline ──────────────────────────────────────

describe('normalizeForContentChangeBaseline', () => {
  it('trims leading and trailing whitespace', () => {
    expect(normalizeForContentChangeBaseline('  hello  ')).toBe('hello');
  });

  it('normalises \\r\\n to \\n', () => {
    expect(normalizeForContentChangeBaseline('a\r\nb')).toBe('a\nb');
  });

  it('returns empty string for null', () => {
    expect(normalizeForContentChangeBaseline(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(normalizeForContentChangeBaseline(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(normalizeForContentChangeBaseline('')).toBe('');
  });
});

// ─── getChangesFromDoc ──────────────────────────────────────────────────────

describe('getChangesFromDoc', () => {
  it('replacement: pairs deletion with insertion', () => {
    const { replacement } = makeDocWithMarks();
    const { deletedText, addedText } = getChangesFromDoc(replacement, schema);
    expect(deletedText).toEqual(['old']);
    expect(addedText).toEqual(['new']);
  });

  it('pure deletion: addedText entry is empty string', () => {
    const { pureDeletion } = makeDocWithMarks();
    const { deletedText, addedText } = getChangesFromDoc(pureDeletion, schema);
    expect(deletedText).toEqual(['old']);
    expect(addedText).toEqual(['']);
  });

  it('pure insertion: deletedText entry is empty string', () => {
    const { pureInsertion } = makeDocWithMarks();
    const { deletedText, addedText } = getChangesFromDoc(pureInsertion, schema);
    expect(deletedText).toEqual(['']);
    expect(addedText).toEqual(['new']);
  });

  it('no marks → empty arrays', () => {
    const doc = makeDoc(['plain text']);
    const { deletedText, addedText } = getChangesFromDoc(doc, schema);
    expect(deletedText).toEqual([]);
    expect(addedText).toEqual([]);
  });
});

// ─── getAcceptedPlainText ───────────────────────────────────────────────────

describe('getAcceptedPlainText', () => {
  it('excludes text with deletion mark', () => {
    const { withDeletion } = makeDocWithMarks();
    const accepted = getAcceptedPlainText(withDeletion, schema);
    expect(accepted).not.toContain('gone');
    expect(accepted).toContain('keep');
  });

  it('includes text with insertion mark', () => {
    const { withInsertion } = makeDocWithMarks();
    const accepted = getAcceptedPlainText(withInsertion, schema);
    expect(accepted).toContain('added');
    expect(accepted).toContain('keep');
  });

  it('plain text doc (no marks) returns full text', () => {
    const doc = makeDoc(['hello world']);
    expect(getAcceptedPlainText(doc, schema)).toBe('hello world');
  });
});
