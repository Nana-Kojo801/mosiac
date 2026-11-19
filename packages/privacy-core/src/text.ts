/**
 * Text normalization with an offset map (spec 6.1). Anchors use UTF-16 offsets
 * into the normalized text (NFC, LF line endings). `toRaw` maps a normalized
 * offset back to the raw input.
 */
export type NormalizedText = { text: string; toRaw: (offset: number) => number };

export function normalizeText(raw: string): NormalizedText {
  const out: string[] = [];
  const map: number[] = []; // map[normalizedIndex] = rawIndex
  // Segment at code points that start a new base character, so combining marks
  // normalize together with their base.
  const re = /\r\n|\r|\P{M}\p{M}*|\p{M}+/gsu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const seg = m[0];
    const norm = seg === '\r\n' || seg === '\r' ? '\n' : seg.normalize('NFC');
    for (let i = 0; i < norm.length; i++) { out.push(norm[i]); map.push(m.index); }
  }
  map.push(raw.length);
  const text = out.join('');
  return { text, toRaw: (o) => map[Math.max(0, Math.min(o, map.length - 1))] };
}

/** Paragraph spans: blocks separated by one or more blank lines, trimmed. */
export function paragraphSpans(text: string): { start: number; end: number }[] {
  const spans: { start: number; end: number }[] = [];
  const re = /[^\n]+(?:\n(?!\s*\n)[^\n]*)*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    let s = m.index, e = m.index + m[0].length;
    while (s < e && /\s/.test(text[s])) s++;
    while (e > s && /\s/.test(text[e - 1])) e--;
    if (e > s) spans.push({ start: s, end: e });
  }
  return spans;
}

export function paragraphOf(spans: { start: number; end: number }[], offset: number): number {
  const i = spans.findIndex((p) => offset >= p.start && offset < p.end);
  return i >= 0 ? i : Math.max(0, spans.findIndex((p) => p.start > offset) - 1);
}

export const wordCount = (s: string) => (s.match(/\S+/g) || []).length;
