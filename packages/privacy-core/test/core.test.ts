import { describe, expect, it } from 'vitest';
import { normalizeText, paragraphSpans, paragraphOf, runRules, validateAnchor, scoreOf, bandOf, assertPolicy, policyFor, classifyDerived, canSendToCloud, buildGenericPackRequest, createConsent, checkConsent, parseGeneratedPack, packPrompt, chunkParagraphs, canonicalJson, PolicyViolation } from '../src';

describe('text', () => {
  it('normalizes CRLF and NFC with a raw offset map', () => {
    const raw = 'Café one\r\n\r\nSecond';
    const n = normalizeText(raw);
    expect(n.text).toBe('Café one\n\nSecond');
    expect(raw.slice(n.toRaw(n.text.indexOf('Second')))).toBe('Second');
  });
  it('splits paragraphs on blank lines', () => {
    const t = 'One\nstill one\n\n  Two  \n\n\nThree';
    const spans = paragraphSpans(t);
    expect(spans.map((s) => t.slice(s.start, s.end))).toEqual(['One\nstill one', 'Two', 'Three']);
    expect(paragraphOf(spans, t.indexOf('Two'))).toBe(1);
  });
});

describe('rules', () => {
  const hits = (t: string) => runRules(t).map((m) => [m.ruleId, m.quote]);
  it('finds emails without also flagging their parts', () => {
    expect(hits('Contact: p07.followup@example.org today')).toEqual([['R-EMAIL', 'p07.followup@example.org']]);
  });
  it('finds phone numbers but not short numbers or years', () => {
    expect(hits('Call +44 20 7946 0958 or 2025, room 12.')).toEqual([['R-PHONE', '+44 20 7946 0958']]);
  });
  it('finds exact dates in common formats', () => {
    expect(hits('on 14 January, then January 3rd, 2025 and 2025-01-14').map((h) => h[1])).toEqual(['14 January', 'January 3rd, 2025', '2025-01-14']);
  });
  it('does not flag month-only or season references', () => {
    expect(hits('after the January rota change, in winter 2025')).toEqual([]);
  });
  it('finds URLs, handles and long reference numbers', () => {
    expect(hits('see www.example.com/p7, ping @night_nurse, ID 123456789').map((h) => h[0])).toEqual(['R-URL', 'R-HANDLE', 'R-IDNUM']);
  });
});

describe('evidence', () => {
  const text = 'I came over after my transfer from the coastal satellite clinic, so I knew it.';
  it('accepts exact spans', () => {
    const s = text.indexOf('after my transfer');
    expect(validateAnchor(text, s, s + 'after my transfer'.length, 'after my transfer')).toMatchObject({ ok: true, validation: 'EXACT' });
  });
  it('relocates a unique quote with wrong offsets', () => {
    expect(validateAnchor(text, 0, 5, 'coastal satellite clinic')).toMatchObject({ ok: true, validation: 'RELOCATED', start: text.indexOf('coastal') });
  });
  it('rejects invented quotes', () => {
    expect(validateAnchor(text, 0, 10, 'transferred from Harbour Ward')).toEqual({ ok: false, reason: 'NOT_FOUND' });
  });
  it('rejects ambiguous quotes far from the reported offset', () => {
    const t = 'night shift. ' + 'x'.repeat(200) + ' night shift.';
    expect(validateAnchor(t, 100, 111, 'night shift')).toEqual({ ok: false, reason: 'AMBIGUOUS' });
  });
});

describe('scoring', () => {
  it('maps to bands and raises direct identifiers', () => {
    expect(bandOf({ direct: 0, specificity: 3, cross: 3, sensitivity: 2 })).toBe('HIGH');
    expect(scoreOf({ direct: 0, specificity: 3, cross: 3, sensitivity: 2 })).toBe(8);
    expect(bandOf({ direct: 0, specificity: 2, cross: 0, sensitivity: 0 })).toBe('LOW');
    expect(bandOf({ direct: 3, specificity: 0, cross: 0, sensitivity: 0 })).toBe('HIGH');
    expect(bandOf({ direct: 3, specificity: 3, cross: 3, sensitivity: 2 })).toBe('CRITICAL');
  });
  it('clamps out-of-range components', () => { expect(scoreOf({ direct: 9, specificity: -1, cross: 3, sensitivity: 5 })).toBe(8); });
});

describe('policy gate', () => {
  it('rejects any cloud-capable mode for private tasks', () => {
    for (const t of ['extract', 'review', 'rewrite'] as const) {
      expect(policyFor(t)).toBe('ONLY_ON_DEVICE');
      for (const m of ['PREFER_ON_DEVICE', 'ONLY_IN_CLOUD', 'NO_MODEL'] as const) expect(() => assertPolicy(t, m)).toThrow(PolicyViolation);
    }
  });
  it('taints mixed and unknown provenance as private', () => {
    expect(classifyDerived(['SYNTHETIC', 'PRIVATE'])).toBe('PRIVATE');
    expect(classifyDerived([undefined])).toBe('PRIVATE');
    expect(classifyDerived([])).toBe('PRIVATE');
    expect(classifyDerived(['SYNTHETIC', 'GENERIC'])).toBe('SYNTHETIC');
    expect(canSendToCloud('PRIVATE')).toBe(false);
    expect(canSendToCloud('PUBLIC_APPROVED')).toBe(false);
  });
  it('builds enum-only bodies with a stable digest', async () => {
    const a = await buildGenericPackRequest('QUALITATIVE_RESEARCH', ['SHIFT_PATTERNS', 'ROLE_RARITY']);
    const b = await buildGenericPackRequest('QUALITATIVE_RESEARCH', ['ROLE_RARITY', 'SHIFT_PATTERNS', 'ROLE_RARITY']);
    expect(a.digest).toBe(b.digest);
    expect(canonicalJson(a.body)).toBe('{"categories":["ROLE_RARITY","SHIFT_PATTERNS"],"domain":"QUALITATIVE_RESEARCH","packSchemaVersion":1,"task":"generatePack"}');
    await expect(buildGenericPackRequest('QUALITATIVE_RESEARCH', ['the overnight pharmacy team' as never])).rejects.toThrow();
  });
  it('binds approval to the exact payload and expiry', async () => {
    const now = new Date('2026-11-19T10:00:00Z');
    const req = await buildGenericPackRequest('QUALITATIVE_RESEARCH', ['ROLE_RARITY']);
    const c = createConsent(req, now, 'c1');
    expect(await checkConsent(c, req.body, now)).toEqual({ ok: true });
    expect(await checkConsent(c, { ...req.body, categories: ['ROLE_RARITY', 'SMALL_SITES'] }, now)).toEqual({ ok: false, reason: 'DIGEST_MISMATCH' });
    expect(await checkConsent(c, { ...req.body, extra: 'draft text' }, now)).toEqual({ ok: false, reason: 'DIGEST_MISMATCH' });
    expect(await checkConsent(c, req.body, new Date(now.getTime() + 5 * 60 * 1000 + 1))).toEqual({ ok: false, reason: 'EXPIRED' });
    expect(await checkConsent({ ...c, revokedAt: now.toISOString() }, req.body, now)).toEqual({ ok: false, reason: 'REVOKED' });
    expect(await checkConsent({ ...c, usedAt: now.toISOString() }, req.body, now)).toEqual({ ok: false, reason: 'USED' });
    expect(await checkConsent(undefined, req.body, now)).toEqual({ ok: false, reason: 'MISSING' });
  });
});

describe('generated packs', () => {
  const req = { task: 'generatePack', domain: 'QUALITATIVE_RESEARCH', categories: ['ROLE_RARITY'], packSchemaVersion: 1 } as const;
  const meta = { id: 'qr-1', createdAt: '2026-11-19T10:00:00Z', version: '2026.11.19-a' };
  const test = { id: 'ROLE_SMALL_TEAM', category: 'ROLE_RARITY', title: 'Rare role in a small team', question: 'Does a role description fit only a few people?', evidenceRequirement: 'A role or skill held by very few people', remediation: 'GENERALIZE', fictionalExample: 'The only night pharmacist at Fernhill Clinic said…' };
  it('accepts a valid pack and keeps only requested categories', () => {
    const r = parseGeneratedPack(JSON.stringify({ tests: [test, { ...test, id: 'OTHER', category: 'SMALL_SITES' }] }), req, meta);
    expect(r.ok && r.pack.tests.map((t) => t.id)).toEqual(['ROLE_SMALL_TEAM']);
  });
  it('rejects malformed, unsafe or off-request output', () => {
    expect(parseGeneratedPack('not json', req, meta)).toMatchObject({ ok: false, reason: 'NOT_JSON' });
    expect(parseGeneratedPack(JSON.stringify({ tests: [{ ...test, run: 'code' }] }), req, meta)).toMatchObject({ ok: false, reason: 'SCHEMA' });
    expect(parseGeneratedPack(JSON.stringify({ tests: [{ ...test, question: 'Look them up at https://example.com' }] }), req, meta)).toMatchObject({ ok: false, reason: 'SCHEMA' });
    expect(parseGeneratedPack(JSON.stringify({ tests: [{ ...test, category: 'SMALL_SITES' }] }), req, meta)).toMatchObject({ ok: false, reason: 'OFF_REQUEST' });
  });
  it('builds a prompt that contains nothing but the enum request', () => {
    const p = packPrompt(req);
    expect(p).toContain(JSON.stringify(req));
    expect(p).not.toMatch(/pharmacy|P-07|transcript/i);
  });
});

describe('chunking', () => {
  it('keeps paragraphs whole and respects the budget', () => {
    const paras = ['a '.repeat(200), 'b '.repeat(200), 'c '.repeat(50)].map((s) => s.trim());
    const text = paras.join('\n\n');
    const chunks = chunkParagraphs(text, paragraphSpans(text), 320);
    expect(chunks.map((c) => c.paragraphs)).toEqual([[0, 0], [1, 2]]);
  });
});
