import { describe, expect, it } from 'vitest';
import { generateDataset, scoreCases, rulesBaseline } from '../src';

describe('synthetic benchmark', () => {
  const data = generateDataset();
  it('is deterministic and split into dev and held-out test sets', () => {
    expect(generateDataset().map((c) => c.docs[0].text)).toEqual(data.map((c) => c.docs[0].text));
    expect(data.length).toBe(48);
    expect(data.filter((c) => c.split === 'dev').length).toBe(20);
    for (const k of new Set(data.map((c) => c.kind))) expect(data.some((c) => c.kind === k && c.split === 'test')).toBe(true);
  });
  it('labels quote text that exists in the labelled document', () => {
    for (const c of data) for (const l of c.labels) expect(c.docs[l.doc].text).toContain(l.quote);
  });
  it('uses only reserved example domains', () => {
    for (const c of data) for (const d of c.docs) for (const m of d.text.matchAll(/@([\w-]+(?:\.[a-z]+)+)/gi)) expect(m[1]).toMatch(/^examp[l1]e\.(org|com|net)$/);
  });
  it('scores a perfect predictor at 1.0 and an empty one at recall 0', () => {
    const perfect = data.map((c) => ({ id: c.id, assessed: true, predictions: c.labels.map((l) => { const s = c.docs[l.doc].text.indexOf(l.quote); return { doc: l.doc, category: l.category, start: s, end: s + l.quote.length }; }) }));
    const p = scoreCases(data, perfect);
    expect(p.findings.precision).toBe(1); expect(p.findings.recall).toBe(1); expect(p.crossReleaseSets.recall).toBe(1);
    const empty = scoreCases(data, data.map((c) => ({ id: c.id, assessed: true, predictions: [] })));
    expect(empty.findings.recall).toBe(0); expect(empty.findings.precision).toBeNull();
  });
  it('counts unassessed cases as incomplete, not as misses', () => {
    expect(scoreCases(data, []).incompleteRate).toBe(1);
  });
  it('rules baseline finds direct identifiers but no contextual findings', () => {
    const s = scoreCases(data, rulesBaseline(data));
    expect(s.perCategory.DIRECT_IDENTIFIER.tp).toBeGreaterThan(0);
    expect(s.perCategory.RARE_ATTRIBUTE?.tp ?? 0).toBe(0);
  });
});
