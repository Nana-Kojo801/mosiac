// Runs the verification page in a real browser and writes an evidence record.
//   npm run verify                      # this environment (headless Chromium)
//   npm run verify -- --headful --chrome --profile ~/.mosaic-verify   # eligible machine with Chrome
//   add --offline to disable the network at the browser-protocol level before the run
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

// Use the project's Playwright if installed, else a globally installed one.
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(execSync('npm root -g').toString().trim() + '/playwright')); }

const args = new Set(process.argv.slice(2));
const argVal = (k) => { const a = process.argv.slice(2); const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
const headful = args.has('--headful');
const offline = args.has('--offline');
const useChrome = args.has('--chrome');
const profile = argVal('--profile');
// --hide-prompt-api removes the Prompt API from the page before any script runs,
// so the local model is genuinely unavailable (used for the 21.2 step 6
// fallback test in browsers whose Prompt API is only a stub).
const hidePromptApi = args.has('--hide-prompt-api');
const outName = argVal('--out') || `sdk-probe-${hidePromptApi ? 'no-local-model' : 'as-is'}-${offline ? 'offline' : 'online'}.json`;
const GUARDED = 'CANARY-7Q4Z-MOSAIC-GUARDED';
const RAW = 'CANARY-7Q4Z-MOSAIC-RAWSDK';
const root = fileURLToPath(new URL('.', import.meta.url));
const evidenceDir = fileURLToPath(new URL('../../demo/evidence/', import.meta.url));

const server = await createServer({ configFile: root + 'vite.config.mjs', root, logLevel: 'error' });
await server.listen();
const url = 'http://127.0.0.1:5199/';

const launchOpts = { headless: !headful, ...(useChrome ? { channel: 'chrome' } : {}) };
const context = profile ? await chromium.launchPersistentContext(profile, launchOpts) : await (await chromium.launch(launchOpts)).newContext();
const browserVersion = context.browser()?.version() ?? 'persistent-context';
const page = await context.newPage();

if (hidePromptApi) await page.addInitScript(() => { delete globalThis.LanguageModel; globalThis.__promptApiHidden = true; });
const marks = [];
const requests = [];
await page.exposeFunction('__mark', (label) => { marks.push({ label, t: Date.now() }); });
page.on('request', (r) => {
  const u = new URL(r.url());
  if (u.hostname === '127.0.0.1' || u.hostname === 'localhost') return;
  const body = r.postData() || '';
  requests.push({ t: Date.now(), host: u.hostname, path: u.pathname.replace(/key=[^&]+/, 'key=…'), method: r.method(), guarded: body.includes(GUARDED) || r.url().includes(GUARDED), raw: body.includes(RAW) || r.url().includes(RAW) });
});
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e.message).slice(0, 200)));

await page.goto(url);
await page.waitForLoadState('load');
if (offline) await context.setOffline(true);
await page.click('#run');
await page.waitForFunction(() => window.__done === true, null, { timeout: 15 * 60 * 1000 });
const results = await page.evaluate(() => window.__results);

const windowOf = (id) => { const s = marks.find((m) => m.label === `start:${id}`); const e = marks.find((m) => m.label === `end:${id}`); return s && e ? [s.t, e.t + 250] : null; };
const inWindow = (w) => (w ? requests.filter((r) => r.t >= w[0] && r.t <= w[1] && /googleapis\.com$/.test(r.host)) : []);
const privW = windowOf('private-guarded');
const rawW = windowOf('sdk-raw-only-on-device');
const evidence = {
  kind: 'mosaic-inference-verification',
  protocol: 'spec 21.2',
  timestamp: new Date().toISOString(),
  environment: {
    description: profile || useChrome ? 'Owner-run verification kit' : 'Claude Code cloud container (no eligible on-device hardware)',
    os: `${os.type()} ${os.release()} ${os.arch()}`,
    cpu: os.cpus()[0]?.model ?? 'unknown', cpuCount: os.cpus().length,
    ramGiB: Math.round(os.totalmem() / 2 ** 30),
    browser: useChrome ? 'Google Chrome' : 'Chromium (Playwright)', browserVersion, headless: !headful,
    promptApi: hidePromptApi ? 'Removed from the page by the runner before load (model unavailable)' : 'As provided by the browser',
    network: offline ? 'Disabled with Playwright context.setOffline(true) (DevTools protocol) before the run' : 'Online',
  },
  results,
  network: {
    googleApiRequestsTotal: requests.filter((r) => /googleapis\.com$/.test(r.host)).length,
    hostsContacted: [...new Set(requests.map((r) => r.host))].sort(),
    guardedPrivateCanaryRequests: requests.filter((r) => r.guarded).length,
    googleApiRequestsDuringGuardedPrivateStep: inWindow(privW).map((r) => `${r.method} ${r.host}${r.path}`),
    rawSdkCanaryRequests: requests.filter((r) => r.raw).length,
    googleApiRequestsDuringRawSdkStep: inWindow(rawW).map((r) => `${r.method} ${r.host}${r.path}`),
  },
  pageErrors,
  notes: 'No credentials, tokens or private text are recorded. The private step output is never stored.',
};
mkdirSync(evidenceDir, { recursive: true });
writeFileSync(evidenceDir + outName, JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ steps: results.steps.map((s) => ({ id: s.id, src: s.inferenceSource, verdict: s.verdict, ok: s.ok, valid: s.outputValid, ms: s.latencyMs, err: s.error?.message })), languageModel: results.languageModel, network: evidence.network, pageErrors }, null, 2));
// Browser and dev-server shutdown can stall; don't let that block the result.
await Promise.race([Promise.allSettled([context.close(), server.close()]), new Promise((r) => setTimeout(r, 3000))]);
process.exit(0);
