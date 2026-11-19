import { describe, expect, it } from 'vitest';
import { SAMPLE_DOCS, AUTHORED_CONTEXT_FINDINGS, buildPopulation, groupSteps, disclosureOfDraft } from '../src';

const draft = SAMPLE_DOCS.find((d) => d.key === 'D3')!.text;

describe('sample fixture', () => {
  it('anchors every authored finding to an exact quote in its document', () => {
    for (const f of AUTHORED_CONTEXT_FINDINGS) for (const a of f.anchors) expect(SAMPLE_DOCS.find((d) => d.key === a.doc)!.text).toContain(a.quote);
  });
  it('suggestions replace text that exists in the draft', () => {
    for (const f of AUTHORED_CONTEXT_FINDINGS) if (f.suggestion) expect(draft).toContain(f.suggestion.from);
  });
  it('uses only reserved example domains', () => {
    for (const d of SAMPLE_DOCS) for (const m of d.text.matchAll(/@([\w.-]+)/g)) expect(m[1]).toMatch(/^example\.(org|com|net)$/);
  });
});

describe('fictional population', () => {
  it('narrows 100 → 24 → 8 → 1 for the original draft (computed, not typed)', () => {
    expect(groupSteps(disclosureOfDraft(draft)).map((s) => s.count)).toEqual([100, 24, 8, 1]);
  });
  it('widens after generalizing the transfer, and further after removing the date', () => {
    const t1 = draft.replace('after my transfer from the coastal satellite clinic', 'after moving from another site in the network');
    expect(groupSteps(disclosureOfDraft(t1)).map((s) => s.count)).toEqual([100, 24, 8, 7]);
    const t2 = t1.replace('The week the new rota started, on 14 January, two of us', 'When the new rota started, two of us');
    expect(groupSteps(disclosureOfDraft(t2)).map((s) => s.count)).toEqual([100, 24, 21]);
  });
  it('is deterministic for a seed', () => {
    expect([...buildPopulation().sets.team]).toEqual([...buildPopulation().sets.team]);
  });
});
