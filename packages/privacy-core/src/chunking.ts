import { wordCount } from './text';

/** Paragraph-aligned chunks within a word budget (spec 8.4). Never splits a paragraph unless it alone exceeds the budget. */
export type Chunk = { index: number; start: number; end: number; paragraphs: [number, number]; words: number };

export function chunkParagraphs(text: string, paras: { start: number; end: number }[], budgetWords = 320): Chunk[] {
  const chunks: Chunk[] = [];
  let cur: { s: number; e: number; p0: number; p1: number; w: number } | null = null;
  paras.forEach((p, i) => {
    const w = wordCount(text.slice(p.start, p.end));
    if (cur && cur.w + w > budgetWords) { chunks.push({ index: chunks.length, start: cur.s, end: cur.e, paragraphs: [cur.p0, cur.p1], words: cur.w }); cur = null; }
    if (!cur) cur = { s: p.start, e: p.end, p0: i, p1: i, w };
    else { cur.e = p.end; cur.p1 = i; cur.w += w; }
  });
  if (cur) { const c = cur as { s: number; e: number; p0: number; p1: number; w: number }; chunks.push({ index: chunks.length, start: c.s, end: c.e, paragraphs: [c.p0, c.p1], words: c.w }); }
  return chunks;
}
