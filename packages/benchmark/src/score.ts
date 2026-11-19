import type { FindingCategory } from '@mosaic/schemas';
import type { BenchCase, Label } from './generator';

/**
 * Scoring (spec 14.3). A prediction matches a label when it is in the same
 * document, has the same category, and its span overlaps the label's span.
 * CROSS_RELEASE is scored separately at document-set level: a set counts as
 * detected when any prediction for it has category CROSS_RELEASE.
 */
export type Prediction = { doc: number; category: FindingCategory; start: number; end: number };
export type Metrics = { tp: number; fp: number; fn: number; precision: number | null; recall: number | null; f1: number | null };
export type CaseResult = { id: string; predictions: Prediction[]; assessed: boolean };

const span = (c: BenchCase, l: Label) => { const s = c.docs[l.doc].text.indexOf(l.quote); return { start: s, end: s + l.quote.length }; };
const ratio = (a: number, b: number) => (b ? a / b : null);

export function scoreCases(cases: BenchCase[], results: CaseResult[]) {
  let tp = 0, fp = 0, fn = 0, cleanSets = 0, cleanWithFp = 0, xTp = 0, xFp = 0, xFn = 0, unassessed = 0;
  const perCategory: Record<string, { tp: number; fp: number; fn: number }> = {};
  const bump = (cat: string, k: 'tp' | 'fp' | 'fn') => { (perCategory[cat] ??= { tp: 0, fp: 0, fn: 0 })[k]++; };
  for (const c of cases) {
    const res = results.find((r) => r.id === c.id);
    if (!res || !res.assessed) { unassessed++; continue; }
    const labels = c.labels.filter((l) => l.category !== 'CROSS_RELEASE');
    const preds = res.predictions.filter((p) => p.category !== 'CROSS_RELEASE');
    const used = new Set<number>();
    for (const l of labels) {
      const s = span(c, l);
      const i = preds.findIndex((p, k) => !used.has(k) && p.doc === l.doc && p.category === l.category && p.start < s.end && s.start < p.end);
      if (i >= 0) { used.add(i); tp++; bump(l.category, 'tp'); } else { fn++; bump(l.category, 'fn'); }
    }
    const extra = preds.length - used.size;
    fp += extra; preds.forEach((p, k) => { if (!used.has(k)) bump(p.category, 'fp'); });
    if (c.kind === 'clean') { cleanSets++; if (preds.length) cleanWithFp++; }
    const predictedX = res.predictions.some((p) => p.category === 'CROSS_RELEASE');
    if (c.crossRelease && predictedX) xTp++; else if (c.crossRelease) xFn++; else if (predictedX) xFp++;
  }
  const m = (a: number, b: number, d: number): Metrics => { const precision = ratio(a, a + b), recall = ratio(a, a + d); return { tp: a, fp: b, fn: d, precision, recall, f1: precision !== null && recall !== null && precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : null }; };
  return {
    findings: m(tp, fp, fn),
    crossReleaseSets: m(xTp, xFp, xFn),
    cleanFalsePositiveRate: ratio(cleanWithFp, cleanSets),
    incompleteRate: ratio(unassessed, cases.length),
    perCategory: Object.fromEntries(Object.entries(perCategory).map(([k, v]) => [k, m(v.tp, v.fp, v.fn)])),
  };
}
