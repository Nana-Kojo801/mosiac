import { GenericPackRequest, ROUTING, PRIVATE_TASKS, type Classification, type Domain, type GeneratorCategory, type InferencePolicy, type TaskKind, type ConsentRecord } from '@mosaic/schemas';
import { digestOf } from './digest';

/**
 * Outbound policy gate (spec 7.2, 9.1, F16). Deny by default.
 * - Private tasks resolve only to ONLY_ON_DEVICE.
 * - Cloud bodies are built from enums by this module, never from user text.
 * - Approval binds to the exact payload digest, scope and a short expiry.
 * This is a client-side safeguard against accidental disclosure, not protection
 * against compromised app code or OS.
 */
export class PolicyViolation extends Error { constructor(msg: string) { super(msg); this.name = 'PolicyViolation'; } }

export function policyFor(task: TaskKind): InferencePolicy {
  const r = ROUTING[task];
  if (!r) throw new PolicyViolation(`Unknown task: ${String(task)}`);
  return r.policy;
}

export function assertPolicy(task: TaskKind, requested: InferencePolicy): void {
  const allowed = policyFor(task);
  if (requested !== allowed) throw new PolicyViolation(`${task} must use ${allowed}, not ${requested}`);
  if ((PRIVATE_TASKS as readonly string[]).includes(task) && requested !== 'ONLY_ON_DEVICE') throw new PolicyViolation('Private tasks are on-device only');
}

/** Derived data keeps the strictest classification of its inputs; unknown provenance is private. */
export function classifyDerived(inputs: (Classification | undefined)[]): Classification {
  if (!inputs.length || inputs.some((c) => c === undefined || c === 'PRIVATE')) return 'PRIVATE';
  if (inputs.some((c) => c === 'PUBLIC_APPROVED')) return 'PUBLIC_APPROVED';
  if (inputs.some((c) => c === 'SYNTHETIC')) return 'SYNTHETIC';
  return 'GENERIC';
}

export function canSendToCloud(c: Classification | undefined): boolean { return c === 'GENERIC' || c === 'SYNTHETIC'; }

export type BuiltRequest = { body: GenericPackRequest; digest: string };

export async function buildGenericPackRequest(domain: Domain, categories: GeneratorCategory[]): Promise<BuiltRequest> {
  const body = GenericPackRequest.parse({ task: 'generatePack', domain, categories: [...new Set(categories)].sort(), packSchemaVersion: 1 });
  return { body: Object.freeze(body) as GenericPackRequest, digest: await digestOf(body) };
}

export const CONSENT_TTL_MS = 5 * 60 * 1000;

export function createConsent(req: BuiltRequest, now: Date, id: string): ConsentRecord {
  return { id, payloadDigest: req.digest, scope: 'generatePack', mode: 'ONLY_IN_CLOUD', createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + CONSENT_TTL_MS).toISOString() };
}

export type ConsentCheck = { ok: true } | { ok: false; reason: 'MISSING' | 'DIGEST_MISMATCH' | 'EXPIRED' | 'REVOKED' | 'USED' | 'SCOPE' };

/** Checked again at the transport boundary, immediately before the SDK call. */
export async function checkConsent(consent: ConsentRecord | undefined, body: unknown, now: Date): Promise<ConsentCheck> {
  if (!consent) return { ok: false, reason: 'MISSING' };
  if (consent.scope !== 'generatePack' || consent.mode !== 'ONLY_IN_CLOUD') return { ok: false, reason: 'SCOPE' };
  if (consent.revokedAt) return { ok: false, reason: 'REVOKED' };
  if (consent.usedAt) return { ok: false, reason: 'USED' };
  if (now.getTime() > Date.parse(consent.expiresAt)) return { ok: false, reason: 'EXPIRED' };
  const parsed = GenericPackRequest.safeParse(body);
  if (!parsed.success) return { ok: false, reason: 'DIGEST_MISMATCH' };
  if ((await digestOf(parsed.data)) !== consent.payloadDigest) return { ok: false, reason: 'DIGEST_MISMATCH' };
  return { ok: true };
}
