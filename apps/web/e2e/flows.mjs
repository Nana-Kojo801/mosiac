// End-to-end checks against the production build (vite preview).
//   node e2e/flows.mjs [--shots <dir>]
// Verifies the sample workflow and the private-data network boundary (spec 11.2).
import { createRequire } from 'node:module';
import { execSync, spawn } from 'node:child_process';
import { CANARY_DRAFT, CANARY_RELEASE, CANARIES } from '../../../packages/fixtures/src/canaries.ts';

const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(execSync('npm root -g').toString().trim() + '/playwright')); }
const shotsIdx = process.argv.indexOf('--shots'); const shots = shotsIdx > 0 ? process.argv[shotsIdx + 1] : null;
const preview = spawn('npx', ['--no-install', 'vite', 'preview', '--port', '4173', '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' });
const base = 'http://127.0.0.1:4173';
for (let i = 0; i < 50; i++) { try { await fetch(base); break; } catch { await new Promise((r) => setTimeout(r, 200)); } }

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`); };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/favicon|recaptcha|Failed to load resource/i.test(m.text())) errors.push(m.text()); });
const requests = []; page.on('request', (r) => { const u = new URL(r.url()); if (u.hostname !== '127.0.0.1') requests.push({ host: u.hostname, url: r.url(), body: r.postData() || '' }); });
const shot = async (n) => { if (shots) await page.screenshot({ path: `${shots}/${n}.png` }); };

try {
  await page.goto(base + '/');
  await page.getByRole('button', { name: 'Try the sample workspace' }).click();
  await page.waitForURL(/\/w\//);
  check('landing opens the sample workspace', true);
  await page.getByRole('button', { name: 'Run review' }).click();
  await page.getByText('Review finished').waitFor({ timeout: 20000 });
  await page.waitForTimeout(300);
  await shot('overview');
  const high = await page.locator('.count-d.high strong').innerText();
  check('sample review shows high-priority findings', Number(high) >= 2, `high=${high}`);
  check('sample results are labelled, not presented as model output', await page.getByText('authored sample results instead').count() > 0 || await page.getByText('No on-device model').count() > 0);

  await page.getByRole('link', { name: /^Findings/ }).first().click();
  await page.getByRole('heading', { name: 'Findings' }).waitFor();
  check('findings list labels sample results', await page.locator('.src-fixture').count() > 0);
  check('email is caught by rules', await page.getByText('An email address').count() > 0);
  await shot('findings');

  await page.getByRole('link', { name: /^Documents/ }).first().click();
  await page.locator('mark.ev').first().click();
  check('document marks open evidence in the inspector', await page.locator('.ev-card').count() > 0);
  await shot('document');

  await page.getByRole('link', { name: /^Rewrite studio/ }).first().click();
  await page.getByRole('heading', { name: 'Rewrite studio' }).waitFor();
  const cards = page.locator('.edit-d');
  const n0 = await cards.count();
  await page.locator('.edit-d', { hasText: 'Three details combine' }).getByRole('button', { name: 'Apply' }).click();
  await page.waitForTimeout(400);
  await page.locator('.edit-d', { hasText: 'exact date' }).getByRole('button', { name: 'Apply' }).click();
  await page.waitForTimeout(400);
  check('applying suggestions creates v5 after two edits', await page.getByText(/Draft v5 · now/).count() > 0, `cards before=${n0}`);
  check('fictional group widens to 21', (await page.locator('.insp-card', { hasText: 'Fictional group' }).innerText()).includes('21'));
  await page.getByRole('button', { name: 'Review again' }).click();
  await page.getByText(/Review finished/).last().waitFor({ timeout: 20000 });
  await page.waitForTimeout(400);
  const reassess = await page.locator('.reassess').innerText().catch(() => '');
  check('reassessment reports resolved findings', /\b2\b[\s\S]*Resolved/.test(reassess), reassess.replace(/\s+/g, ' '));
  await shot('rewrite');

  // Private workspace with canaries: nothing derived from it may leave the page.
  await page.goto(base + '/workspaces');
  await page.getByRole('button', { name: 'New workspace' }).click();
  await page.waitForURL(/\/import/);
  await page.locator('#paste-title').fill('Canary draft');
  await page.locator('#paste-box').fill(CANARY_DRAFT);
  await page.getByRole('button', { name: /Add 1 to workspace/ }).click();
  await page.waitForURL(/\/w\/[^/]+$/);
  await page.getByRole('link', { name: 'Import' }).click();
  await page.getByRole('button', { name: 'Already published' }).click();
  await page.locator('#paste-box').fill(CANARY_RELEASE);
  await page.getByRole('button', { name: /Add 1 to workspace/ }).click();
  await page.waitForURL(/\/w\/[^/]+$/);
  await page.getByRole('button', { name: 'Run review' }).click();
  await page.getByText(/Review finished/).first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(500);
  check('private review without a usable model is partial, not faked', await page.getByText('Partial review').count() > 0);
  await shot('private-partial');
  await page.goto(base + '/journal');
  await page.waitForTimeout(500);
  await shot('journal');
  const leaks = requests.filter((r) => CANARIES.some((c) => r.url.includes(c) || r.body.includes(c)));
  check('no request carries a private canary', leaks.length === 0, `${requests.length} external requests to ${[...new Set(requests.map((r) => r.host))].join(', ') || 'none'}`);
  check('no request to Gemini endpoints during private review', !requests.some((r) => /firebasevertexai|generativelanguage/.test(r.host)));
} catch (e) {
  check('flow completed', false, e.message.split('\n')[0]);
  await shot('failure');
} finally {
  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close();
  preview.kill();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
}
