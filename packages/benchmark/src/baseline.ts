import { runRules } from '@mosaic/privacy-core';
import type { BenchCase } from './generator';
import type { CaseResult } from './score';

/** Configuration 1: deterministic rules on the draft only (no model). */
export function rulesBaseline(cases: BenchCase[]): CaseResult[] {
  return cases.map((c) => ({ id: c.id, assessed: true, predictions: runRules(c.docs[0].text).map((m) => ({ doc: 0, category: m.category, start: m.start, end: m.end })) }));
}
