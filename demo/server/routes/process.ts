import type { Request, Response } from 'express';

function simulateDiff(text: string): string {
  // Use a seeded-ish approach: change words whose index % 5 === 2 (~20%)
  const paragraphs = text.split('\n');
  let wordCounter = 0;

  const processedParagraphs = paragraphs.map((line) => {
    if (!line.trim()) return '<p></p>';

    // Split preserving whitespace tokens
    const tokens = line.split(/(\s+)/);
    const result = tokens.map((token) => {
      // Pass through whitespace tokens unchanged
      if (/^\s+$/.test(token) || token === '') return token;

      wordCounter += 1;
      // Mark ~every 5th word as changed
      if (wordCounter % 5 === 2 && token.length > 2) {
        const newWord = token + '_v2';
        return `<del>${token}</del><ins>${newWord}</ins>`;
      }
      return token;
    });

    return `<p>${result.join('')}</p>`;
  });

  return processedParagraphs.join('');
}

export function processRoute(req: Request, res: Response): void {
  const { text } = req.body as { text?: string; instruction?: string };

  if (!text || !text.trim()) {
    res.status(400).json({ error: '`text` is required and must not be empty.' });
    return;
  }

  const start = Date.now();
  const html = simulateDiff(text);
  const changeCount = (html.match(/<ins>/g) ?? []).length;

  res.json({ html, changeCount, processingMs: Date.now() - start });
}
