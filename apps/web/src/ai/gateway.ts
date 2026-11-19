import { ExtractionOutput, type ActualSource, type ExtractionFinding, type GenericPackRequest, type ConsentRecord, type InferenceEvent, type TestPack } from '@mosaic/schemas';
import { assertPolicy, checkConsent, checkDeviceReadiness, NetworkFence, parseGeneratedPack, packPrompt, PrivateEgressBlocked, PrivateInferenceRefused, runPrivateInference, validateAnchor, type DeviceReadiness } from '@mosaic/privacy-core';
import type { ModelPort } from './models';
import { EXTRACTION_SCHEMA, extractionPrompt, explainPrompt, SAMPLE_FIXTURES, type PromptTest } from './prompts';
import { logEvent } from './journal';

/**
 * AI gateway (spec 9.1). The single entry point for model work.
 * - Private tasks: ONLY_ON_DEVICE, through the private-inference guard. Any
 *   failure leaves the chunk not assessed. Never retried in the cloud.
 * - Generic packs: ONLY_IN_CLOUD, enum-only body, approval re-checked here at
 *   the transport boundary.
 * - Samples: PREFER_ON_DEVICE on bundled fixtures by ID.
 * Calls run one at a time, so the network fence never overlaps a cloud request.
 */
export type Outcome = InferenceEvent['outcome'];
export type PrivateExtraction =
  | { ok: true; findings: (ExtractionFinding & { start: number; end: number; validation: 'EXACT' | 'RELOCATED' })[]; rejected: number; source: 'DEVICE'; durationMs: number }
  | { ok: false; outcome: Outcome; reason: string };

export class AIGateway {
  private queue: Promise<unknown> = Promise.resolve();
  readonly fence = new NetworkFence();
  constructor(private readonly port: () => ModelPort, private readonly opts: { privateTimeoutMs?: number; cloudTimeoutMs?: number } = {}) {}

  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => undefined);
    return run;
  }

  readiness(): Promise<DeviceReadiness> { return checkDeviceReadiness(); }

  /** Must be called from a user gesture. May start the model download. */
  async prepareDevice(onProgress?: (f: number) => void): Promise<void> {
    const r = await this.readiness();
    if (!r.ok && r.reason !== 'MODEL_NOT_AVAILABLE') throw new PrivateInferenceRefused(r.reason, r.detail);
    await this.port().initializeDevice(onProgress);
  }

  extractPrivate(passage: string, role: 'draft' | 'release', signal?: AbortSignal, tests: PromptTest[] = []): Promise<PrivateExtraction> {
    return this.serial(async () => {
      assertPolicy('extract', 'ONLY_ON_DEVICE');
      const t0 = performance.now();
      const prompt = extractionPrompt(passage, role, tests);
      for (let attempt = 0; attempt < 2; attempt++) {
        if (signal?.aborted) return this.failPrivate('cancelled', 'Cancelled', t0);
        let text: string;
        try {
          const r = await runPrivateInference(prompt, (p) => this.port().generate('ONLY_ON_DEVICE', { prompt: p, json: { schema: EXTRACTION_SCHEMA }, signal, timeoutMs: this.opts.privateTimeoutMs ?? 60_000 }), { fence: this.fence });
          text = r.text;
        } catch (e) {
          return this.failPrivate(...classifyPrivateError(e), t0);
        }
        const parsed = parseJsonLoose(text, ExtractionOutput);
        if (!parsed) { if (attempt === 0) continue; return this.failPrivate('malformed', 'Reply did not match the findings schema after one local retry', t0); }
        const findings: Extract<PrivateExtraction, { ok: true }>['findings'] = [];
        let rejected = 0;
        for (const f of parsed.findings) {
          const a = validateAnchor(passage, f.start, f.end, f.quote);
          if (a.ok) findings.push({ ...f, start: a.start, end: a.end, quote: a.quote, validation: a.validation }); else rejected++;
        }
        const durationMs = Math.round(performance.now() - t0);
        await logEvent({ task: 'extract', requestedPolicy: 'ONLY_ON_DEVICE', actualSource: 'DEVICE', durationMs, outcome: 'ok', detail: rejected ? `${rejected} finding(s) rejected: quote not found in the passage` : undefined });
        return { ok: true, findings, rejected, source: 'DEVICE', durationMs };
      }
      return this.failPrivate('error', 'Unreachable', t0);
    });
  }

  private async failPrivate(outcome: Outcome, reason: string, t0: number): Promise<PrivateExtraction> {
    const actual: ActualSource = outcome === 'unavailable' || outcome === 'refused' ? 'UNAVAILABLE' : outcome === 'malformed' ? 'DEVICE' : 'UNKNOWN';
    await logEvent({ task: 'extract', requestedPolicy: 'ONLY_ON_DEVICE', actualSource: actual, durationMs: Math.round(performance.now() - t0), outcome, detail: `${reason}. No cloud retry.` });
    return { ok: false, outcome, reason };
  }

  generatePack(body: GenericPackRequest, consent: ConsentRecord | undefined, meta: { id: string; version: string }): Promise<{ ok: true; pack: TestPack; source: ActualSource } | { ok: false; outcome: Outcome; reason: string }> {
    return this.serial(async () => {
      assertPolicy('generatePack', 'ONLY_IN_CLOUD');
      const t0 = performance.now();
      const fail = async (outcome: Outcome, reason: string, src: ActualSource = 'UNKNOWN') => {
        await logEvent({ task: 'generatePack', requestedPolicy: 'ONLY_IN_CLOUD', actualSource: src, durationMs: Math.round(performance.now() - t0), outcome, detail: reason, payloadDigest: consent?.payloadDigest });
        return { ok: false as const, outcome, reason };
      };
      const c = await checkConsent(consent, body, new Date());
      if (!c.ok) return fail('refused', `Approval check failed: ${c.reason}`);
      if (this.fence.active) return fail('refused', 'A private task is running');
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return fail('offline', 'Offline. Not sent.');
      try {
        const r = await this.port().generate('ONLY_IN_CLOUD', { prompt: packPrompt(body), json: { schema: PACK_JSON_SCHEMA }, timeoutMs: this.opts.cloudTimeoutMs ?? 45_000 });
        const src = sourceOf(r.inferenceSource);
        const p = parseGeneratedPack(r.text, body, { id: meta.id, version: meta.version, createdAt: new Date().toISOString() });
        if (!p.ok) return fail('malformed', `Pack rejected: ${p.reason}${p.detail ? ` (${p.detail})` : ''}`, src);
        await logEvent({ task: 'generatePack', requestedPolicy: 'ONLY_IN_CLOUD', actualSource: src, durationMs: Math.round(performance.now() - t0), outcome: 'ok', payloadDigest: consent!.payloadDigest });
        return { ok: true, pack: p.pack, source: src };
      } catch (e) {
        return fail(...classifyCloudError(e));
      }
    });
  }

  explainSample(fixtureId: string): Promise<{ ok: true; text: string; source: ActualSource } | { ok: false; outcome: Outcome; reason: string }> {
    return this.serial(async () => {
      assertPolicy('explainSample', 'PREFER_ON_DEVICE');
      const fixture = Object.prototype.hasOwnProperty.call(SAMPLE_FIXTURES, fixtureId) ? SAMPLE_FIXTURES[fixtureId] : undefined;
      if (!fixture) return { ok: false as const, outcome: 'refused' as const, reason: 'Unknown fixture' };
      const t0 = performance.now();
      try {
        const r = await this.port().generate('PREFER_ON_DEVICE', { prompt: explainPrompt(fixture), timeoutMs: this.opts.cloudTimeoutMs ?? 45_000 });
        let src = sourceOf(r.inferenceSource);
        // An echo labelled on_device (Chromium's stub) is not inference.
        if (src === 'DEVICE' && r.text.includes(fixture.slice(0, 40)) && /not available in chromium/i.test(r.text)) src = 'UNKNOWN';
        await logEvent({ task: 'explainSample', requestedPolicy: 'PREFER_ON_DEVICE', actualSource: src, durationMs: Math.round(performance.now() - t0), outcome: src === 'UNKNOWN' ? 'error' : 'ok', detail: src === 'UNKNOWN' ? 'Stub reply, not inference' : undefined });
        return src === 'UNKNOWN' ? { ok: false as const, outcome: 'error' as const, reason: 'The browser returned a stub reply' } : { ok: true as const, text: r.text, source: src };
      } catch (e) {
        const [outcome, reason] = classifyCloudError(e);
        await logEvent({ task: 'explainSample', requestedPolicy: 'PREFER_ON_DEVICE', actualSource: 'UNKNOWN', durationMs: Math.round(performance.now() - t0), outcome, detail: reason });
        return { ok: false as const, outcome, reason };
      }
    });
  }
}

/** Source comes only from SDK metadata; anything else is UNKNOWN (spec 7.3). */
export const sourceOf = (s?: string): ActualSource => (s === 'on_device' ? 'DEVICE' : s === 'in_cloud' ? 'CLOUD' : 'UNKNOWN');

function parseJsonLoose<T>(text: string, schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false } }): T | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { const r = schema.safeParse(JSON.parse(m[0])); return r.success ? r.data : null; } catch { return null; }
}

function classifyPrivateError(e: unknown): [Outcome, string] {
  if (e instanceof PrivateInferenceRefused) return [e.reason === 'MODEL_NOT_AVAILABLE' || e.reason === 'NO_PROMPT_API' || e.reason === 'NOT_GOOGLE_CHROME' ? 'unavailable' : 'refused', readinessText(e.reason, e.detail)];
  if (e instanceof PrivateEgressBlocked) return ['refused', 'Blocked an attempt to reach the cloud during a private task'];
  const err = e as { name?: string; message?: string };
  if (err?.name === 'AbortError') return ['cancelled', 'Cancelled'];
  if (/timeout|timed out/i.test(err?.message ?? '')) return ['timeout', 'The local model did not finish in time'];
  return ['error', 'The local model returned an error'];
}

function classifyCloudError(e: unknown): [Outcome, string] {
  const msg = String((e as Error)?.message ?? e);
  if ((e as { name?: string })?.name === 'AbortError') return ['cancelled', 'Cancelled'];
  if (/App Check/i.test(msg) || /\b401\b/.test(msg)) return ['app-check', 'Blocked by App Check, Firebase’s protection against misuse. If this keeps happening, this site’s App Check registration (Firebase console → App Check) may be missing.'];
  if (/\b429\b|quota|RESOURCE_EXHAUSTED/i.test(msg)) return ['quota', 'Cloud quota reached. Try again later.'];
  if (/Failed to fetch|NetworkError|offline/i.test(msg)) return ['offline', 'No connection'];
  if (/timeout/i.test(msg)) return ['timeout', 'The request timed out'];
  return ['error', 'The cloud model returned an error'];
}

export function readinessText(reason: string, detail?: string): string {
  switch (reason) {
    case 'NO_PROMPT_API': return 'This browser has no built-in model';
    case 'NOT_GOOGLE_CHROME': return 'The built-in model needs desktop Google Chrome';
    case 'MODEL_NOT_AVAILABLE': return detail === 'downloadable' ? 'The built-in model needs to be downloaded' : detail === 'downloading' ? 'The built-in model is still downloading' : 'The built-in model is not available on this device';
    case 'SOURCE_NOT_ON_DEVICE': return 'The reply did not come from this device, so it was discarded';
    case 'STUB_ECHO': return 'The browser returned a placeholder reply, not model output';
    default: return 'The built-in model could not be checked';
  }
}

const PACK_JSON_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['tests'],
  properties: { tests: { type: 'array', minItems: 1, maxItems: 24, items: { type: 'object', additionalProperties: false, required: ['id', 'category', 'title', 'question', 'evidenceRequirement', 'remediation', 'fictionalExample'], properties: { id: { type: 'string' }, category: { type: 'string' }, title: { type: 'string' }, question: { type: 'string' }, evidenceRequirement: { type: 'string' }, remediation: { type: 'string', enum: ['GENERALIZE', 'REMOVE', 'AGGREGATE', 'DELAY_RELEASE', 'HUMAN_REVIEW'] }, fictionalExample: { type: 'string' } } } } },
} as const;
