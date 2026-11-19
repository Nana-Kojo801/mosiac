/**
 * Private-inference guard (spec 7.2, 9.1, 11.1, 23.3).
 *
 * Why this exists: in firebase@13.2.0–13.4.0 (@firebase/ai 3.0.0–3.1.0), when
 * the browser has no `LanguageModel` (Prompt API) global, the SDK creates no
 * on-device adapter and `generateContent()` goes to the cloud even when the
 * model was created with `InferenceMode.ONLY_ON_DEVICE`. Separately, Chromium
 * (not Google Chrome) ships a stub Prompt API that echoes the prompt while the
 * SDK reports `inferenceSource: "on_device"`.
 *
 * So the SDK's mode flag alone cannot keep private text on the device. This
 * module adds two independent layers that fail closed:
 *   1. Readiness: refuse a private call unless Google Chrome reports the
 *      built-in model as `available`.
 *   2. Network fence: while a private call is in flight, any fetch to a Gemini
 *      or Firebase AI endpoint is rejected before it leaves the page.
 * A private result is accepted only if the SDK reports `on_device` and the
 * output is not an echo of the prompt.
 */

export const AI_ENDPOINT_HOSTS = [
  'firebasevertexai.googleapis.com',
  'generativelanguage.googleapis.com',
  'aiplatform.googleapis.com',
];

export type ReadinessFailure = 'NO_PROMPT_API' | 'NOT_GOOGLE_CHROME' | 'MODEL_NOT_AVAILABLE' | 'AVAILABILITY_ERROR';
export type DeviceReadiness = { ok: true; availability: 'available' } | { ok: false; reason: ReadinessFailure; detail?: string };

type PromptApi = { availability: (o?: unknown) => Promise<string> };
type GlobalLike = {
  LanguageModel?: PromptApi;
  navigator?: { userAgentData?: { brands?: { brand: string }[] } };
  fetch?: typeof fetch;
};

export const TEXT_EN = { expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] };

export async function checkDeviceReadiness(g: GlobalLike = globalThis as unknown as GlobalLike): Promise<DeviceReadiness> {
  const lm = g.LanguageModel;
  if (!lm || typeof lm.availability !== 'function') return { ok: false, reason: 'NO_PROMPT_API' };
  const brands = g.navigator?.userAgentData?.brands ?? [];
  if (!brands.some((b) => b.brand === 'Google Chrome')) return { ok: false, reason: 'NOT_GOOGLE_CHROME', detail: brands.map((b) => b.brand).join(', ') || 'no brand data' };
  try {
    const a = await lm.availability(TEXT_EN);
    if (a !== 'available') return { ok: false, reason: 'MODEL_NOT_AVAILABLE', detail: a };
    return { ok: true, availability: 'available' };
  } catch (e) {
    return { ok: false, reason: 'AVAILABILITY_ERROR', detail: String((e as Error)?.message ?? e).slice(0, 160) };
  }
}

export class PrivateEgressBlocked extends Error {
  constructor(readonly host: string) { super(`Blocked a request to ${host} during a private, on-device-only task.`); this.name = 'PrivateEgressBlocked'; }
}
export class PrivateInferenceRefused extends Error {
  constructor(readonly reason: ReadinessFailure | 'SOURCE_NOT_ON_DEVICE' | 'STUB_ECHO', readonly detail?: string) { super(`Private task not run on device: ${reason}${detail ? ` (${detail})` : ''}`); this.name = 'PrivateInferenceRefused'; }
}

/** Wraps the page's fetch once. While at least one private task is active, requests to AI endpoints are rejected. */
export class NetworkFence {
  private depth = 0;
  readonly violations: { host: string; at: number }[] = [];
  private installed = false;
  constructor(private readonly g: GlobalLike = globalThis as unknown as GlobalLike, private readonly hosts = AI_ENDPOINT_HOSTS) {}

  install(): void {
    if (this.installed || typeof this.g.fetch !== 'function') return;
    const original = this.g.fetch.bind(this.g);
    const fence = this;
    this.g.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (fence.depth > 0) {
        const host = hostOf(input);
        if (host && fence.hosts.includes(host)) {
          fence.violations.push({ host, at: Date.now() });
          throw new PrivateEgressBlocked(host);
        }
      }
      return original(input as RequestInfo, init);
    }) as typeof fetch;
    this.installed = true;
  }
  get active(): boolean { return this.depth > 0; }
  async run<T>(fn: () => Promise<T>): Promise<T> {
    this.install();
    this.depth++;
    try { return await fn(); } finally { this.depth--; }
  }
}

function hostOf(input: RequestInfo | URL): string | null {
  try {
    const u = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
    return new URL(u).hostname;
  } catch { return null; }
}

export function isPromptEcho(output: string, prompt: string): boolean {
  const t = output.trim();
  return /on-device model is not available in chromium/i.test(t) || (prompt.length >= 40 && t.includes(prompt.slice(0, 60)));
}

export type PrivateResult = { text: string; inferenceSource: 'on_device' };

/**
 * Runs a private generation through all guards. `call` must use a model created
 * with InferenceMode.ONLY_ON_DEVICE. Throws PrivateInferenceRefused or
 * PrivateEgressBlocked; never retries in the cloud.
 */
export async function runPrivateInference(
  prompt: string,
  call: (prompt: string) => Promise<{ text: string; inferenceSource?: string }>,
  opts: { fence: NetworkFence; g?: GlobalLike },
): Promise<PrivateResult> {
  const ready = await checkDeviceReadiness(opts.g);
  if (!ready.ok) throw new PrivateInferenceRefused(ready.reason, ready.detail);
  const r = await opts.fence.run(() => call(prompt));
  if (r.inferenceSource !== 'on_device') throw new PrivateInferenceRefused('SOURCE_NOT_ON_DEVICE', String(r.inferenceSource ?? 'unknown'));
  if (isPromptEcho(r.text, prompt)) throw new PrivateInferenceRefused('STUB_ECHO');
  return { text: r.text, inferenceSource: 'on_device' };
}
