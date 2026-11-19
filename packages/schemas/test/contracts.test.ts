import { describe, expect, it } from 'vitest';
import { ExtractionOutput, GenericPackRequest, GeneratedPackOutput, ROUTING, PRIVATE_TASKS } from '../src';

describe('routing table', () => {
  it('pins every private task to ONLY_ON_DEVICE', () => {
    for (const t of PRIVATE_TASKS) expect(ROUTING[t].policy).toBe('ONLY_ON_DEVICE');
  });
  it('uses the cloud only for generic or synthetic data', () => {
    for (const r of Object.values(ROUTING)) if (r.policy === 'ONLY_IN_CLOUD' || r.policy === 'PREFER_ON_DEVICE') expect(['GENERIC', 'SYNTHETIC']).toContain(r.data);
  });
  it('is frozen', () => { expect(Object.isFrozen(ROUTING)).toBe(true); });
});

describe('contracts', () => {
  it('rejects extra fields in extraction output', () => {
    const r = ExtractionOutput.safeParse({ schemaVersion: 1, findings: [{ category: 'PRECISE_DATE', start: 0, end: 3, quote: 'abc', rationale: 'r', confidence: 'LOW', proposedAction: 'REMOVE', person: 'x' }] });
    expect(r.success).toBe(false);
  });
  it('rejects free text in a pack request', () => {
    expect(GenericPackRequest.safeParse({ task: 'generatePack', domain: 'QUALITATIVE_RESEARCH', categories: ['ROLE_RARITY'], packSchemaVersion: 1, note: 'my draft says…' }).success).toBe(false);
    expect(GenericPackRequest.safeParse({ task: 'generatePack', domain: 'QUALITATIVE_RESEARCH', categories: ['the overnight pharmacy team'], packSchemaVersion: 1 }).success).toBe(false);
  });
  it('rejects links and code in generated packs', () => {
    const t = { id: 'T1', category: 'ROLE_RARITY', title: 'Role rarity', question: 'Search https://example.com for the person', evidenceRequirement: 'x', remediation: 'GENERALIZE', fictionalExample: 'y' };
    expect(GeneratedPackOutput.safeParse({ tests: [t] }).success).toBe(false);
    expect(GeneratedPackOutput.safeParse({ tests: [{ ...t, question: 'Is the role rare in a small team?' }] }).success).toBe(true);
  });
});
