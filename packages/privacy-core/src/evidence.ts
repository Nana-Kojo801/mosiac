/**
 * Evidence validation (spec 8.1 step 3, 9.2). Model-reported spans are
 * accepted only if the quote matches the supplied text. A quote found exactly
 * once elsewhere is relocated and flagged; anything else is rejected. Anchors
 * are never invented.
 */
export type AnchorCheck =
  | { ok: true; start: number; end: number; quote: string; validation: 'EXACT' | 'RELOCATED' }
  | { ok: false; reason: 'EMPTY_QUOTE' | 'NOT_FOUND' | 'AMBIGUOUS' | 'OUT_OF_BOUNDS' };

export function validateAnchor(text: string, start: number, end: number, quote: string): AnchorCheck {
  const q = quote.trim();
  if (!q) return { ok: false, reason: 'EMPTY_QUOTE' };
  if (Number.isInteger(start) && Number.isInteger(end) && start >= 0 && end <= text.length && start < end && text.slice(start, end) === q) {
    return { ok: true, start, end, quote: q, validation: 'EXACT' };
  }
  const first = text.indexOf(q);
  if (first < 0) return { ok: false, reason: start < 0 || end > text.length ? 'OUT_OF_BOUNDS' : 'NOT_FOUND' };
  if (text.indexOf(q, first + 1) >= 0) {
    // Prefer the occurrence nearest the reported start, but only if the model's offsets were close.
    let best = -1, bestDist = Infinity;
    for (let i = first; i >= 0; i = text.indexOf(q, i + 1)) { const d = Math.abs(i - start); if (d < bestDist) { best = i; bestDist = d; } }
    if (bestDist > 40) return { ok: false, reason: 'AMBIGUOUS' };
    return { ok: true, start: best, end: best + q.length, quote: q, validation: 'RELOCATED' };
  }
  return { ok: true, start: first, end: first + q.length, quote: q, validation: 'RELOCATED' };
}

/** Offsets relative to a chunk are shifted into document space. */
export const shiftSpan = (s: { start: number; end: number }, by: number) => ({ start: s.start + by, end: s.end + by });
