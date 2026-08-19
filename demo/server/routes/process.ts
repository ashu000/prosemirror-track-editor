import type { Request, Response } from 'express';

// Simulates an AI rewrite by wrapping changed words in <ins>/<del> tags.
// In Phase 3 this will do a real word-diff; for now it returns a hardcoded
// example so the frontend round-trip can be tested immediately.
export function processRoute(req: Request, res: Response): void {
  const { text } = req.body as { text?: string; instruction?: string };

  if (!text || !text.trim()) {
    res.status(400).json({ error: '`text` is required and must not be empty.' });
    return;
  }

  // Dummy diff: replace "furnish" → "provide" and "thirty (30)" → "21"
  const html = text
    .split('\n')
    .map((line) => {
      const diffed = line
        .replace(/furnish/gi, '<del>furnish</del><ins>provide</ins>')
        .replace(/thirty \(30\)/gi, '<del>thirty (30)</del><ins>21</ins>');
      return `<p>${diffed}</p>`;
    })
    .join('');

  const changeCount = (html.match(/<ins>/g) ?? []).length;

  res.json({ html, changeCount, processingMs: 42 });
}
