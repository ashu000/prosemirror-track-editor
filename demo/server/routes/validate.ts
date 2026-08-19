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
  const { html, changes, changesWithOffsets, originalText } = req.body as ValidateBody;

  if (!html) {
    res.status(400).json({ error: '`html` is required.' });
    return;
  }

  const errors: { code: string; message: string; offset?: { start: number; end: number } }[] = [];

  // Check for unfilled blanks in the accepted HTML
  const blankMatches = [...html.matchAll(/_{3,}/g)];
  blankMatches.forEach((m) => {
    errors.push({
      code: 'BLANK_UNFILLED',
      message: `Blank field at position ${m.index} is not filled.`,
      offset: { start: m.index ?? 0, end: (m.index ?? 0) + m[0].length },
    });
  });

  // Validate changesWithOffsets: each offset range must be non-negative and start <= end
  if (changesWithOffsets) {
    changesWithOffsets.forEach((change, i) => {
      if (
        change.deletedOffset &&
        (change.deletedOffset.start < 0 || change.deletedOffset.start > change.deletedOffset.end)
      ) {
        errors.push({
          code: 'INVALID_OFFSET',
          message: `Change ${i}: deletedOffset range is invalid (${change.deletedOffset.start}–${change.deletedOffset.end}).`,
          offset: change.deletedOffset,
        });
      }
      if (
        change.addedOffset &&
        (change.addedOffset.start < 0 || change.addedOffset.start > change.addedOffset.end)
      ) {
        errors.push({
          code: 'INVALID_OFFSET',
          message: `Change ${i}: addedOffset range is invalid (${change.addedOffset.start}–${change.addedOffset.end}).`,
          offset: change.addedOffset,
        });
      }
    });
  }

  // Derive counts from changesWithOffsets if available, otherwise fall back to changes[]
  const changeCount = changesWithOffsets
    ? changesWithOffsets.length
    : changes
    ? Math.max(changes.deletedText.length, changes.addedText.length)
    : 0;

  const deletionCount = changesWithOffsets
    ? changesWithOffsets.filter((c) => c.deletedText).length
    : changes?.deletedText.filter(Boolean).length ?? 0;

  const insertionCount = changesWithOffsets
    ? changesWithOffsets.filter((c) => c.addedText).length
    : changes?.addedText.filter(Boolean).length ?? 0;

  if (errors.length > 0) {
    res.status(422).json({
      valid: false,
      errors,
      blanksRemaining: blankMatches.length,
      changeCount,
    });
    return;
  }

  res.json({
    valid: true,
    errors: [],
    blanksRemaining: 0,
    changeCount,
    deletionCount,
    insertionCount,
    originalLength: originalText?.length ?? null,
    summary: `${changeCount} change${changeCount !== 1 ? 's' : ''} (${deletionCount} deletion${deletionCount !== 1 ? 's' : ''}, ${insertionCount} insertion${insertionCount !== 1 ? 's' : ''}) accepted. Document is valid.`,
  });
}
