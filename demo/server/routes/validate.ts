import type { Request, Response } from 'express';

interface ValidateBody {
  html?: string;
  changes?: { deletedText: string[]; addedText: string[] };
  changesWithOffsets?: {
    deletedText: string;
    addedText: string;
    deletedOffset: { start: number; end: number } | null;
    addedOffset: { start: number; end: number } | null;
  }[];
  originalText?: string;
}

export function validateRoute(req: Request, res: Response): void {
  const { html, changes } = req.body as ValidateBody;

  if (!html) {
    res.status(400).json({ error: '`html` is required.' });
    return;
  }

  const errors: { code: string; message: string; offset?: { start: number; end: number } }[] = [];

  // Check for unfilled blanks (e.g. "___" sequences still in the accepted text)
  const blankMatches = [...html.matchAll(/_{3,}/g)];
  blankMatches.forEach((m) => {
    errors.push({
      code: 'BLANK_UNFILLED',
      message: `Blank field at position ${m.index} is not filled.`,
      offset: { start: m.index ?? 0, end: (m.index ?? 0) + m[0].length },
    });
  });

  const changeCount = changes
    ? Math.max(changes.deletedText.length, changes.addedText.length)
    : 0;

  if (errors.length > 0) {
    res.status(422).json({
      valid: false,
      errors,
      blanksRemaining: blankMatches.length,
    });
    return;
  }

  res.json({
    valid: true,
    errors: [],
    blanksRemaining: 0,
    summary: `${changeCount} change${changeCount !== 1 ? 's' : ''} accepted. Document is valid.`,
  });
}
