/* Spec 21.2 verification protocol, executed in the browser with the real
 * Firebase AI Logic SDK. It records only metadata and validity. The output of
 * the private (canary) task is never stored. */
import { initializeApp, SDK_VERSION } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode, AIError } from 'firebase/ai';
import { NetworkFence, runPrivateInference, checkDeviceReadiness, PrivateInferenceRefused, PrivateEgressBlocked } from '../../../packages/privacy-core/src/private-inference-guard';

declare const __APPCHECK_DEBUG_TOKEN__: string;
declare global {
  interface Window { __results?: unknown; __done?: boolean; __mark?: (label: string) => Promise<void>; FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean }
  // Chrome Prompt API (may be absent)
  // eslint-disable-next-line no-var
  var LanguageModel: { availability: (o?: unknown) => Promise<string> } | undefined;
}

const env = import.meta.env;
const CLOUD_MODEL = 'gemini-3.5-flash-lite';
// Fictional private text with a unique canary. Must never leave the device.
// Two canaries: one goes through Mosaic's guard (must never leave), one goes
// straight to the SDK to document the SDK's own ONLY_ON_DEVICE behaviour.
const GUARDED_CANARY = 'CANARY-7Q4Z-MOSAIC-GUARDED';
const RAW_CANARY = 'CANARY-7Q4Z-MOSAIC-RAWSDK';
const PRIVATE_CANARY = RAW_CANARY;
const privateText = (c: string) => `Fictional transcript excerpt (${c}): I came over after my transfer from the coastal satellite clinic.`;
const PRIVATE_TEXT = privateText(RAW_CANARY);
// Bundled synthetic fixture: the only content class eligible for PREFER_ON_DEVICE.
const FIXTURE_TEXT = 'Fictional sample sentence: "One participant joined with the winter onboarding cohort."';

const out = document.getElementById('out')!;
const mark = async (l: string) => { try { await window.__mark?.(l); } catch { /* runner not attached */ } };

type Step = { verdict?: string; stubEcho?: boolean; id: string; task: string; requestedPolicy: string; expect: string; inferenceSource: string; latencyMs: number | null; ok: boolean; outputChars: number | null; outputValid: boolean | null; outputExcerpt?: string; error?: { code: string; message: string } };

function chromeVersion() { const m = navigator.userAgent.match(/Chrome\/([\d.]+)/); return m ? m[1] : null; }

async function runStep(id: string, task: string, mode: string, expect: string, prompt: string, opts: { storeExcerpt: boolean; validate: (t: string) => boolean; json?: boolean }, model: ReturnType<typeof getGenerativeModel>): Promise<Step> {
  const s: Step = { id, task, requestedPolicy: mode.toUpperCase(), expect, inferenceSource: 'UNKNOWN', latencyMs: null, ok: false, outputChars: null, outputValid: null };
  await mark(`start:${id}`);
  const t0 = performance.now();
  try {
    const r = await model.generateContent(prompt);
    s.latencyMs = Math.round(performance.now() - t0);
    const src = r.response.inferenceSource;
    s.inferenceSource = src === 'on_device' ? 'ON_DEVICE' : src === 'in_cloud' ? 'IN_CLOUD' : 'UNKNOWN';
    const text = r.response.text();
    s.ok = true;
    s.outputChars = text.length;
    s.outputValid = opts.validate(text);
    // Chromium (not Google Chrome) ships a stub Prompt API that echoes the
    // prompt and still yields inferenceSource "on_device". Never count that as
    // on-device inference.
    s.stubEcho = isStubEcho(text, prompt);
    if (s.stubEcho) s.outputValid = false;
    if (opts.storeExcerpt) s.outputExcerpt = text.slice(0, 280);
  } catch (e) {
    s.latencyMs = Math.round(performance.now() - t0);
    const err = e as AIError & { code?: string; message?: string };
    s.error = { code: String(err.code || 'unknown'), message: String(err.message || e).replace(PRIVATE_CANARY, '[canary]').replace(GUARDED_CANARY, '[canary]').slice(0, 300) };
  }
  await mark(`end:${id}`);
  s.verdict = verdictOf(s);
  return s;
}

function isStubEcho(text: string, prompt: string): boolean {
  const t = text.trim();
  return /on-device model is not available in chromium/i.test(t) || t.includes(prompt.slice(0, 60));
}
function isGoogleChrome(): boolean {
  const brands = (navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }).userAgentData?.brands ?? [];
  return brands.some((b) => b.brand === 'Google Chrome');
}
// One verdict per step, defined by evidence (spec 23.2).
function verdictOf(s: Step): string {
  if (!s.ok) return 'ERROR';
  if (s.inferenceSource === 'ON_DEVICE') return s.stubEcho ? 'STUB_ECHO_NOT_INFERENCE' : isGoogleChrome() ? 'ON_DEVICE_GENUINE' : 'ON_DEVICE_UNCONFIRMED_BROWSER';
  if (s.inferenceSource === 'IN_CLOUD') return s.outputValid ? 'IN_CLOUD_VALID' : 'IN_CLOUD_INVALID_OUTPUT';
  return 'UNKNOWN_SOURCE';
}

async function run() {
  const results: Record<string, unknown> = {
    schemaVersion: 1,
    startedAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
    chromeVersion: chromeVersion(),
    firebaseSdkVersion: SDK_VERSION,
    cloudModelRequested: CLOUD_MODEL,
    appCheck: { provider: env.VITE_APPCHECK_PROVIDER, debugProvider: Boolean(__APPCHECK_DEBUG_TOKEN__) },
    online: navigator.onLine,
    browserBrands: ((navigator as Navigator & { userAgentData?: { brands: { brand: string; version: string }[] } }).userAgentData?.brands ?? []).map((b) => `${b.brand} ${b.version}`),
    promptApiHiddenByRunner: Boolean((window as Window & { __promptApiHidden?: boolean }).__promptApiHidden),
  };
  out.textContent = 'Running…';

  // 1. Prompt API availability, as Chrome reports it.
  const lm: Record<string, unknown> = { present: typeof globalThis.LanguageModel !== 'undefined' };
  if (globalThis.LanguageModel) {
    try { lm.availability = await globalThis.LanguageModel.availability({ expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] }); }
    catch (e) { lm.availabilityError = String((e as Error).message || e).slice(0, 200); }
  }
  results.languageModel = lm;

  // 2. Firebase app, App Check, AI Logic.
  if (__APPCHECK_DEBUG_TOKEN__) self.FIREBASE_APPCHECK_DEBUG_TOKEN = __APPCHECK_DEBUG_TOKEN__;
  const app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN, projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET, messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: env.VITE_FIREBASE_APP_ID,
  });
  const key = env.VITE_APPCHECK_SITE_KEY as string;
  initializeAppCheck(app, { provider: env.VITE_APPCHECK_PROVIDER === 'recaptcha-enterprise' ? new ReCaptchaEnterpriseProvider(key) : new ReCaptchaV3Provider(key), isTokenAutoRefreshEnabled: true });
  const ai = getAI(app, { backend: new GoogleAIBackend() });

  const onDevice = getGenerativeModel(ai, { mode: InferenceMode.ONLY_ON_DEVICE });
  const prefer = getGenerativeModel(ai, { mode: InferenceMode.PREFER_ON_DEVICE, inCloudParams: { model: CLOUD_MODEL } });
  const cloud = getGenerativeModel(ai, { mode: InferenceMode.ONLY_IN_CLOUD, inCloudParams: { model: CLOUD_MODEL, generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 400 } } });

  // 3. Prepare the device model (user gesture already happened: this runs from a click).
  const dm: Record<string, unknown> = { attempted: false };
  if (lm.availability === 'available' || lm.availability === 'downloadable' || lm.availability === 'downloading') {
    dm.attempted = true;
    const t0 = performance.now();
    try { await onDevice.initializeDeviceModel(() => {}); dm.ok = true; }
    catch (e) { dm.ok = false; dm.error = String((e as Error).message || e).slice(0, 200); }
    dm.durationMs = Math.round(performance.now() - t0);
  } else { dm.skippedReason = `Prompt API availability: ${lm.availability ?? 'API not present'}`; }
  results.deviceModelInit = dm;

  const steps: Step[] = [];
  // 21.2 step 7: private task through Mosaic's guard. Off eligible hardware this
  // must be refused before any request, with zero AI-endpoint traffic.
  const fence = new NetworkFence();
  const readiness = await checkDeviceReadiness();
  results.guardReadiness = readiness;
  {
    const prompt = `List disclosure-risk categories in this text as one short line. Text: ${privateText(GUARDED_CANARY)}`;
    const s: Step = { id: 'private-guarded', task: 'Extract context through Mosaic privacy guard', requestedPolicy: 'ONLY_ON_DEVICE', expect: 'ON_DEVICE_GENUINE on eligible hardware; otherwise refused before any request (UNASSESSED)', inferenceSource: 'UNKNOWN', latencyMs: null, ok: false, outputChars: null, outputValid: null };
    await mark('start:private-guarded');
    const t0 = performance.now();
    try {
      const r = await runPrivateInference(prompt, async (p) => { const x = await onDevice.generateContent(p); return { text: x.response.text(), inferenceSource: x.response.inferenceSource }; }, { fence });
      s.ok = true; s.inferenceSource = 'ON_DEVICE'; s.outputChars = r.text.length; s.outputValid = r.text.trim().length > 0; s.verdict = 'ON_DEVICE_GENUINE';
    } catch (e) {
      const err = e as Error & { reason?: string; code?: string };
      s.error = { code: err instanceof PrivateInferenceRefused ? `REFUSED_${err.reason}` : err instanceof PrivateEgressBlocked ? 'EGRESS_BLOCKED' : String(err.code || err.name), message: String(err.message).replace(GUARDED_CANARY, '[canary]').slice(0, 200) };
      s.verdict = 'UNASSESSED_NO_CLOUD_RETRY';
    }
    s.latencyMs = Math.round(performance.now() - t0);
    await mark('end:private-guarded');
    results.fenceViolations = fence.violations.length;
    steps.push(s);
  }
  // 21.2 step 4 / 7: private task, local only. Pass on an eligible machine = ON_DEVICE.
  // Elsewhere the SDK must throw and no request may carry the canary.
  steps.push(await runStep('sdk-raw-only-on-device', 'Raw SDK ONLY_ON_DEVICE call, no Mosaic guard (documents SDK behaviour)', InferenceMode.ONLY_ON_DEVICE, 'Per docs: ON_DEVICE or an error. Observed in 13.2.0: cloud request when the Prompt API is absent',
    `List disclosure-risk categories in this text as one short line. Text: ${PRIVATE_TEXT}`, { storeExcerpt: false, validate: (t) => t.trim().length > 0 }, onDevice));
  // 21.2 step 6: safe fixture with PREFER_ON_DEVICE.
  steps.push(await runStep('fixture-prefer-on-device', 'Explain sample test (bundled fixture)', InferenceMode.PREFER_ON_DEVICE, 'ON_DEVICE if the model is ready; IN_CLOUD otherwise',
    `In one sentence, explain why this fictional sentence could narrow down who a person is: ${FIXTURE_TEXT}`, { storeExcerpt: true, validate: (t) => t.trim().length > 10 }, prefer));
  // Generic pack generation: enum-only input, cloud only.
  const packBody = { task: 'generatePack', domain: 'QUALITATIVE_RESEARCH', categories: ['ROLE_RARITY'], packSchemaVersion: 1 };
  steps.push(await runStep('generic-only-in-cloud', 'Generate generic test pack (enum-only input)', InferenceMode.ONLY_IN_CLOUD, 'IN_CLOUD',
    `Return JSON {"tests":[{"id":string,"question":string,"fictionalExample":string}]} with exactly one abstract, prevention-oriented privacy review test for this request. Use only wholly fictional examples. Request: ${JSON.stringify(packBody)}`,
    { storeExcerpt: true, json: true, validate: (t) => { try { const j = JSON.parse(t); return Array.isArray(j.tests) && j.tests.length >= 1; } catch { return false; } } }, cloud));

  results.steps = steps;
  results.finishedAt = new Date().toISOString();
  window.__results = results;
  window.__done = true;
  out.textContent = JSON.stringify(results, null, 2);
}

document.getElementById('run')!.addEventListener('click', () => { void run(); }, { once: true });
