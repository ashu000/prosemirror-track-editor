import type { Node as PMNode } from 'prosemirror-model';
import { textToDoc } from './docHelpers';

export function collectInlinesFromElement(container: Element, schema: any): PMNode[] {
  const insertion = schema.marks.insertion;
  const deletion = schema.marks.deletion;
  const blankHighlight = schema.marks.blankHighlight;
  const inlines: PMNode[] = [];
  function walk(node: globalThis.Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node as Text).textContent || '';
      if (!text) return;
      let marks: { type: unknown }[] = [];
      let el: Element | null = (node as Text).parentElement;
      while (el && el !== container) {
        const tag = el.tagName?.toUpperCase();
        if (tag === 'INS' && insertion) {
          marks = [insertion.create() as { type: unknown }];
          break;
        }
        if (tag === 'DEL' && deletion) {
          marks = [deletion.create() as { type: unknown }];
          break;
        }
        if (
          tag === 'MARK' &&
          el.classList.contains('blank-highlight') &&
          blankHighlight
        ) {
          marks = [blankHighlight.create() as { type: unknown }];
          break;
        }
        el = el.parentElement;
      }
      inlines.push(schema.text(text, marks));
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      if (el.tagName?.toUpperCase() === 'BR') {
        inlines.push(schema.text('\n'));
        return;
      }
      for (let i = 0; i < node.childNodes.length; i += 1)
        walk(node.childNodes[i]);
    }
  }
  walk(container);
  return inlines;
}

export function htmlToDoc(schema: any, html: string): PMNode {
  if (typeof DOMParser === 'undefined')
    return textToDoc(schema, html.replace(/<[^>]*>/g, '').trim());
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const body = doc.body;
  const paragraphs: PMNode[] = [];
  const pElements = body.querySelectorAll('p');
  if (pElements.length > 0) {
    for (let i = 0; i < pElements.length; i += 1) {
      const inlines = collectInlinesFromElement(pElements[i], schema);
      paragraphs.push(
        schema.nodes.paragraph.create(
          null,
          inlines.length ? inlines : undefined
        )
      );
    }
  } else {
    if (/\n/.test(html)) {
      const lines = html.split(/\n/);
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const line = lines[lineIndex];
        const lineHtml = line.trim();
        if (!lineHtml) {
          paragraphs.push(schema.nodes.paragraph.create());
        } else {
          const lineDoc = new DOMParser().parseFromString(
            lineHtml,
            'text/html'
          );
          const inlines = collectInlinesFromElement(lineDoc.body, schema);
          paragraphs.push(
            schema.nodes.paragraph.create(
              null,
              inlines.length ? inlines : undefined
            )
          );
        }
      }
    } else {
      const inlines = collectInlinesFromElement(body, schema);
      paragraphs.push(
        schema.nodes.paragraph.create(
          null,
          inlines.length ? inlines : undefined
        )
      );
    }
  }
  if (paragraphs.length === 0)
    return schema.topNodeType.createAndFill() as PMNode;
  return schema.node('doc', null, paragraphs);
}
