import { GENERATOR_CATEGORIES, type Domain, type GeneratorCategory, type ConsentRecord } from '@mosaic/schemas';
import { buildGenericPackRequest, createConsent, type BuiltRequest } from '@mosaic/privacy-core';
import { db } from '../../storage/db';
import { newId, nowIso } from '../../storage/ids';
import type { AIGateway } from '../../ai/gateway';

export const CATEGORY_LABEL: Record<GeneratorCategory, string> = { ROLE_RARITY: 'Role rarity in small teams', TENURE_WINDOWS: 'Start-date windows', SHIFT_PATTERNS: 'Shift patterns', RARE_EVENTS: 'Rare events', SMALL_SITES: 'Small sites' };
export const ALL_CATEGORIES = GENERATOR_CATEGORIES;

export const prepareRequest = (domain: Domain, cats: GeneratorCategory[]) => buildGenericPackRequest(domain, cats);

/** Records the reviewer's approval of this exact request. */
export async function approve(req: BuiltRequest): Promise<ConsentRecord> {
  const c = createConsent(req, new Date(), newId('consent'));
  await db().consents.add(c);
  return c;
}

export async function revokeAllConsents() {
  const now = nowIso();
  const open = (await db().consents.toArray()).filter((c) => !c.revokedAt && !c.usedAt);
  await db().consents.bulkUpdate(open.map((c) => ({ key: c.id, changes: { revokedAt: now } })));
}

export async function generate(gateway: AIGateway, req: BuiltRequest, consent: ConsentRecord) {
  const d = new Date();
  const version = `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')}-${d.getUTCHours()}${String(d.getUTCMinutes()).padStart(2, '0')}`;
  const r = await gateway.generatePack(req.body, consent, { id: `gen-${req.body.domain.toLowerCase()}-${req.digest.slice(0, 8)}`, version });
  await db().consents.update(consent.id, { usedAt: nowIso() });
  if (r.ok) await db().packs.put({ ...r.pack, cachedAt: nowIso(), enabled: true });
  return r;
}
