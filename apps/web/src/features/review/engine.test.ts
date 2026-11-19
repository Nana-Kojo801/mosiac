import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MosaicDB, setDbForTests, db } from '../../storage/db';
import { seedSampleWorkspace, workspaces, documents } from '../../storage/repositories';
import { runReview, loadWorkspaceDocs } from './engine';
import { applySuggestions, undoRewrite } from './rewrite';
import { AIGateway } from '../../ai/gateway';
import type { ModelPort, ModelRequest } from '../../ai/models';
import { groupSteps, disclosureOfDraft } from '@mosaic/fixtures';
import { CANARY_DRAFT, CANARY_RELEASE, CANARIES } from '@mosaic/fixtures/canaries';
import { buildGenericPackRequest, createConsent } from '@mosaic/privacy-core';

let n = 0;
beforeEach(async () => { setDbForTests(new MosaicDB(`test-${++n}`)); vi.unstubAllGlobals(); });

/** Test-only fake. Never used outside tests (spec 13.3). */
class FakePort implements ModelPort {
  calls: { policy: string; req: ModelRequest }[] = [];
  constructor(private reply: (policy: string, req: ModelRequest) => { text: string; inferenceSource?: string }) {}
  async generate(policy: Parameters<ModelPort['generate']>[0], req: ModelRequest) { this.calls.push({ policy, req }); return this.reply(policy, req); }
  async initializeDevice() {}
}

function stubChrome(available = true) {
  vi.stubGlobal('LanguageModel', { availability: async () => (available ? 'available' : 'downloadable') });
  vi.stubGlobal('navigator', { ...globalThis.navigator, onLine: true, userAgentData: { brands: [{ brand: 'Google Chrome' }] } });
}

describe('sample workspace without a local model', () => {
  it('shows labelled sample results plus rules findings, and full coverage', async () => {
    const ws = await seedSampleWorkspace();
    const { findings, run } = await runReview(ws.id, { gateway: null });
    const fixture = findings.filter((f) => f.source === 'FIXTURE');
    expect(fixture.map((f) => f.title)).toContain('Three details combine to describe one person');
    expect(fixture.find((f) => f.category === 'CROSS_RELEASE')!.band).toBe('HIGH');
    const rules = findings.filter((f) => f.source === 'RULES');
    expect(rules.map((f) => f.ruleId)).toEqual(['R-EMAIL']); // the date rule is superseded by the overlapping sample finding
    expect(rules[0].band).toBe('HIGH');
    expect(run.status).toBe('complete');
    expect(findings.some((f) => f.source === 'DEVICE' || f.source === 'CLOUD')).toBe(false);
  });

  it('re-review after applying edits resolves those findings and widens the fictional group', async () => {
    const ws = await seedSampleWorkspace();
    const first = await runReview(ws.id, { gateway: null });
    const pick = first.findings.filter((f) => f.category === 'CROSS_RELEASE' || f.category === 'PRECISE_DATE').map((f) => f.id);
    const { record } = await applySuggestions(ws.id, pick);
    const { draft } = await loadWorkspaceDocs(ws.id);
    expect(draft!.version.label).toBe('v4');
    expect(groupSteps(disclosureOfDraft(draft!.version.normalizedText)).at(-1)!.count).toBe(21);
    const second = await runReview(ws.id, { gateway: null });
    expect(second.diff.resolved).toBe(2);
    expect(second.findings.some((f) => f.category === 'CROSS_RELEASE')).toBe(false);
    await undoRewrite(record.id);
    expect((await loadWorkspaceDocs(ws.id)).draft!.version.label).toBe('v3');
  });

  it('keeps a dismissal across re-reviews', async () => {
    const ws = await seedSampleWorkspace();
    const first = await runReview(ws.id, { gateway: null });
    const room = first.findings.find((f) => f.category === 'NARROW_LOCATION')!;
    await db().findings.update(room.id, { status: 'DISMISSED', statusNote: 'Generic room' });
    const second = await runReview(ws.id, { gateway: null });
    expect(second.findings.find((f) => f.category === 'NARROW_LOCATION')!.status).toBe('DISMISSED');
  });
});

describe('private workspace', () => {
  async function canaryWorkspace() {
    const ws = await workspaces.create('Canary workspace');
    await documents.add(ws.id, { title: 'Draft', role: 'draft', text: CANARY_DRAFT, sourceKind: 'paste' });
    await documents.add(ws.id, { title: 'Earlier release', role: 'release', text: CANARY_RELEASE, sourceKind: 'paste', approvedAt: '2026-01-01T00:00:00Z' });
    return ws;
  }

  it('without a usable local model: rules only, marked not assessed, model never called', async () => {
    const ws = await canaryWorkspace();
    const port = new FakePort(() => ({ text: '{}', inferenceSource: 'in_cloud' }));
    const { findings, run } = await runReview(ws.id, { gateway: new AIGateway(() => port) });
    expect(port.calls).toHaveLength(0);
    expect(run.status).toBe('partial');
    expect(findings.find((f) => f.status === 'UNASSESSED')!.rationale).toMatch(/nothing was sent to the cloud/);
    expect(findings.filter((f) => f.source === 'RULES').map((f) => f.ruleId)).toEqual(['R-EMAIL']);
    expect(findings.some((f) => f.source === 'FIXTURE')).toBe(false);
  });

  it('a downloadable (not yet available) model also leaves context not assessed', async () => {
    stubChrome(false);
    const ws = await canaryWorkspace();
    const port = new FakePort(() => ({ text: '{}', inferenceSource: 'on_device' }));
    await runReview(ws.id, { gateway: new AIGateway(() => port) });
    expect(port.calls).toHaveLength(0);
  });

  it('with an available model: on-device only, anchors validated, invented quotes rejected, releases linked', async () => {
    stubChrome(true);
    const ws = await canaryWorkspace();
    const port = new FakePort((_policy, req) => {
      const passage = req.prompt.split('<passage>\n')[1].split('\n</passage>')[0];
      const findings = [] as unknown[];
      const q1 = 'the only person on nights who could run the analyser';
      if (passage.includes(q1)) findings.push({ category: 'RARE_ATTRIBUTE', start: 0, end: 5, quote: q1, rationale: 'Unique skill.', confidence: 'HIGH', proposedAction: 'GENERALIZE' });
      if (passage.includes('overnight laboratory team')) findings.push({ category: 'RARE_ATTRIBUTE', start: passage.indexOf('overnight laboratory team'), end: passage.indexOf('overnight laboratory team') + 25, quote: 'overnight laboratory team', rationale: 'Narrow team.', confidence: 'MEDIUM', proposedAction: 'GENERALIZE' });
      findings.push({ category: 'NARROW_LOCATION', start: 0, end: 10, quote: 'Ward 7B at Fernhill', rationale: 'Invented.', confidence: 'LOW', proposedAction: 'REMOVE' });
      return { text: JSON.stringify({ schemaVersion: 1, findings }), inferenceSource: 'on_device' };
    });
    const { findings, run } = await runReview(ws.id, { gateway: new AIGateway(() => port) });
    expect(port.calls.every((c) => c.policy === 'ONLY_ON_DEVICE')).toBe(true);
    expect(run.status).toBe('complete');
    const skill = findings.find((f) => f.category === 'RARE_ATTRIBUTE' && f.anchors[0].quote.includes('analyser'))!;
    expect(skill.anchors[0].validation).toBe('RELOCATED');
    expect(skill.components.cross).toBe(1);
    expect(skill.source).toBe('DEVICE');
    expect(findings.some((f) => f.anchors.some((a) => a.quote.includes('Fernhill')))).toBe(false);
    const events = await db().events.toArray();
    expect(events.every((e) => e.requestedPolicy === 'ONLY_ON_DEVICE')).toBe(true);
    for (const c of CANARIES) expect(JSON.stringify(events)).not.toContain(c);
  });

  it('a reply labelled in_cloud is discarded and the chunk left not assessed', async () => {
    stubChrome(true);
    const ws = await canaryWorkspace();
    const port = new FakePort(() => ({ text: JSON.stringify({ schemaVersion: 1, findings: [] }), inferenceSource: 'in_cloud' }));
    const { findings } = await runReview(ws.id, { gateway: new AIGateway(() => port) });
    expect(findings.find((f) => f.status === 'UNASSESSED')!.rationale).toMatch(/did not come from this device/);
  });

  it('malformed output is retried once locally, then left not assessed', async () => {
    stubChrome(true);
    const ws = await canaryWorkspace();
    const port = new FakePort(() => ({ text: 'Sure! Here are some thoughts…', inferenceSource: 'on_device' }));
    const { findings } = await runReview(ws.id, { gateway: new AIGateway(() => port) });
    expect(port.calls.filter((c) => c.req.prompt.includes('P-99'))).toHaveLength(2);
    expect(findings.find((f) => f.status === 'UNASSESSED')!.rationale).toMatch(/schema/);
  });

  it('deleting a workspace removes every linked row', async () => {
    const ws = await canaryWorkspace();
    await runReview(ws.id, { gateway: null });
    await workspaces.remove(ws.id);
    for (const t of db().workspaceTables) expect(await t.where('workspaceId').equals(ws.id).count()).toBe(0);
  });
});

describe('generic pack generation', () => {
  const valid = JSON.stringify({ tests: [{ id: 'ROLE_SMALL_TEAM', category: 'ROLE_RARITY', title: 'Rare role', question: 'Does a role fit only a few people?', evidenceRequirement: 'A narrow role', remediation: 'GENERALIZE', fictionalExample: 'The only night pharmacist at Fernhill Clinic.' }] });

  it('refuses without approval, or when the body differs from what was approved', async () => {
    const port = new FakePort(() => ({ text: valid, inferenceSource: 'in_cloud' }));
    const gw = new AIGateway(() => port);
    const req = await buildGenericPackRequest('QUALITATIVE_RESEARCH', ['ROLE_RARITY']);
    expect(await gw.generatePack(req.body, undefined, { id: 'p', version: '1' })).toMatchObject({ ok: false, outcome: 'refused' });
    const consent = createConsent(req, new Date(), 'c1');
    const other = (await buildGenericPackRequest('QUALITATIVE_RESEARCH', ['ROLE_RARITY', 'SMALL_SITES'])).body;
    expect(await gw.generatePack(other, consent, { id: 'p', version: '1' })).toMatchObject({ ok: false, outcome: 'refused' });
    expect(port.calls).toHaveLength(0);
  });

  it('sends only the enum request, in the cloud, and validates the pack', async () => {
    const ws = await seedSampleWorkspace();
    void ws;
    const port = new FakePort(() => ({ text: valid, inferenceSource: 'in_cloud' }));
    const gw = new AIGateway(() => port);
    const req = await buildGenericPackRequest('QUALITATIVE_RESEARCH', ['ROLE_RARITY']);
    const r = await gw.generatePack(req.body, createConsent(req, new Date(), 'c1'), { id: 'p', version: '1' });
    expect(r).toMatchObject({ ok: true, source: 'CLOUD' });
    expect(port.calls[0].policy).toBe('ONLY_IN_CLOUD');
    expect(port.calls[0].req.prompt).not.toMatch(/pharmacy|P-07|transcript|coastal/i);
    const ev = (await db().events.toArray()).find((e) => e.task === 'generatePack')!;
    expect(ev.payloadDigest).toBe(req.digest);
  });
});
