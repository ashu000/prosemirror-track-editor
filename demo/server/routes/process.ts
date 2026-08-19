import type { Request, Response } from 'express';

// A small synonym map for common words; falls back to a paraphrase suffix.
const SYNONYMS: Record<string, string> = {
  furnish: 'provide',
  provide: 'furnish',
  shall: 'must',
  must: 'shall',
  required: 'mandatory',
  mandatory: 'required',
  submit: 'deliver',
  deliver: 'submit',
  request: 'require',
  require: 'request',
  additional: 'further',
  further: 'additional',
  within: 'no later than',
  obtain: 'secure',
  secure: 'obtain',
  ensure: 'confirm',
  confirm: 'ensure',
  valid: 'effective',
  effective: 'valid',
  period: 'term',
  term: 'period',
  issuing: 'originating',
  reserves: 'retains',
  retains: 'reserves',
  comply: 'adhere',
  adhere: 'comply',
  stated: 'specified',
  specified: 'stated',
  governing: 'applicable',
  applicable: 'governing',
};

function synonymFor(word: string): string {
  const lower = word.toLowerCase();
  const syn = SYNONYMS[lower];
  if (!syn) return word; // no synonym — leave unchanged
  // Preserve original capitalisation
  if (word[0] === word[0].toUpperCase()) {
    return syn.charAt(0).toUpperCase() + syn.slice(1);
  }
  return syn;
}

function simulateDiff(text: string): string {
  const paragraphs = text.split('\n');
  let wordCounter = 0;

  const processedParagraphs = paragraphs.map((line) => {
    if (!line.trim()) return '<p></p>';

    const tokens = line.split(/(\s+)/);
    const result = tokens.map((token) => {
      if (/^\s+$/.test(token) || token === '') return token;

      wordCounter += 1;
      // Only change words that have a known synonym (~every 5th word slot)
      if (wordCounter % 5 === 2 && token.length > 2) {
        const replacement = synonymFor(token);
        // If no synonym found, skip this word (don't mark it changed)
        if (replacement === token) return token;
        return `<del>${token}</del><ins>${replacement}</ins>`;
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
