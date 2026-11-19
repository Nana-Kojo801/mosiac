// End-to-end checks against the production build (vite preview).
//   node e2e/flows.mjs [--shots <dir>]
// Verifies the sample workflow and the private-data network boundary (spec 11.2).
import { createRequire } from 'node:module';
import { execSync, spawn } from 'node:child_process';
import { CANARY_DRAFT, CANARY_RELEASE, CANARIES } from '../../../packages/fixtures/src/canaries.ts';
import { writeFileSync, readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph } from 'docx';

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
let ocrAudit = null;
const requests = []; page.on('request', (r) => { const u = new URL(r.url()); if (u.protocol !== 'blob:' && u.protocol !== 'data:' && u.hostname !== '127.0.0.1') requests.push({ host: u.hostname, url: r.url(), body: r.postData() || '' }); });
const settle = async (pg = page) => { await pg.waitForFunction(() => document.querySelectorAll('.page-slot').length === 1, null, { timeout: 5000 }).catch(() => {}); };
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
  await settle();
  const high = await page.locator('.count-d.high strong').innerText();
  check('sample review shows high-priority findings', Number(high) >= 2, `high=${high}`);
  check('sample results are labelled, not presented as model output', await page.getByText('authored sample results instead').count() > 0 || await page.getByText('No on-device model').count() > 0);

  await page.getByRole('link', { name: /^Findings/ }).first().click();
  await page.getByRole('heading', { name: 'Findings' }).waitFor();
  check('findings list labels sample results', await page.locator('.src-fixture').count() > 0);
  check('email is caught by rules', await page.getByText('An email address').count() > 0);
  await shot('findings');

  await page.getByRole('link', { name: /^Documents/ }).first().click();
  await settle();
  await page.locator('mark.ev').first().click();
  await page.locator('.ev-card').first().waitFor({ timeout: 3000 }).catch(() => {});
  check('document marks open evidence in the inspector', await page.locator('.ev-card').count() > 0);
  await shot('document');

  await page.getByRole('link', { name: /^Rewrite studio/ }).first().click();
  await page.getByRole('heading', { name: 'Rewrite studio' }).waitFor();
  const cards = page.locator('.edit-d');
  const n0 = await cards.count();
  await settle();
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

  // Disclosure map
  await page.getByRole('link', { name: /^Disclosure map/ }).first().click();
  await page.getByRole('heading', { name: 'Disclosure map' }).waitFor();
  await settle();
  await page.locator('.g-hit').first().focus(); await page.keyboard.press('Enter');
  await page.locator('.ev-card').first().waitFor({ timeout: 3000 }).catch(() => {});
  check('map lines open their reason and passages (keyboard)', await page.locator('.ev-card').count() > 0);
  await page.getByRole('tab', { name: 'List' }).click();
  await page.locator('table.tbl tbody tr').first().waitFor({ timeout: 3000 }).catch(() => {});
  check('map has an accessible list view', await page.locator('table.tbl tbody tr').count() > 0);
  await shot('map');

  // Stress tests: the approval dialog shows the exact enum-only body. Nothing is sent here.
  await page.getByRole('link', { name: /^Stress tests/ }).click();
  await page.getByRole('heading', { name: 'Stress tests' }).waitFor();
  check('bundled packs are listed', await page.getByText('Core disclosure checks').first().waitFor({ timeout: 5000 }).then(() => true, () => false));
  await page.getByRole('button', { name: /Review and send/ }).click();
  const body = await page.locator('.modal .payload').innerText();
  const parsed = JSON.parse(body);
  check('approval dialog shows an enum-only request', parsed.task === 'generatePack' && Object.keys(parsed).sort().join() === 'categories,domain,packSchemaVersion,task', body.replace(/\s+/g, ' '));
  await shot('consent');
  await page.getByRole('button', { name: 'Cancel' }).click();
  check('cancelling sends nothing to Gemini', !requests.some((r) => /firebasevertexai|generativelanguage/.test(r.host)));

  // Release review and history (sample workspace, already re-reviewed)
  await page.goBack(); await page.goBack();
  const wsUrl = page.url().replace(/\/(map|findings|rewrite|document).*$/, '');
  await page.goto(wsUrl.replace(/\/w\/([^/]+).*/, '/w/$1/release'));
  await page.getByRole('heading', { name: 'Release review' }).waitFor();
  const approveBtn = page.getByRole('button', { name: /Approve release/ });
  check('approval is blocked until the checklist is done', await approveBtn.isDisabled());
  await settle();
  for (const c of await page.locator('[role="checkbox"]').all()) await c.click();
  const enabled = await page.waitForFunction(() => { const b = [...document.querySelectorAll('button')].find((x) => /Approve release/.test(x.textContent || '')); return b && !b.disabled; }, null, { timeout: 5000 }).then(() => true, () => false);
  check('approval enabled after checklist on a current, fully assessed review', enabled);
  await shot('release');
  await approveBtn.click();
  await page.waitForURL(/\/history/);
  const approved = await page.getByText('Approved here').first().waitFor({ timeout: 5000 }).then(() => true, () => false);
  check('approved release appears in history', approved);
  await shot('history');

  // Export: clean text contains the reviewed text and nothing else
  await page.goto(page.url().replace('/history', '/export'));
  await page.getByRole('heading', { name: 'Reports & export' }).waitFor();
  await page.getByRole('radio', { name: 'TXT' }).click();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export TXT' }).click()]);
  const txt = readFileSync(await dl.path(), 'utf8');
  check('clean export contains the edited text and not the removed passages', txt.includes('moving from another site') && !txt.includes('coastal satellite clinic') && !txt.includes('14 January'));
  await page.getByRole('radio', { name: 'DOCX' }).click();
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export DOCX' }).click()]);
  check('DOCX export is generated', (await dl2.suggestedFilename()).endsWith('.docx'));

  // PDF and DOCX import, parsed locally
  const dir = mkdtempSync(join(tmpdir(), 'mosaic-e2e-'));
  const pdf = new jsPDF(); pdf.text('Fictional PDF line: I was the only night porter at the depot.', 10, 20); writeFileSync(join(dir, 'fictional.pdf'), Buffer.from(pdf.output('arraybuffer')));
  writeFileSync(join(dir, 'fictional.docx'), await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph('Fictional DOCX line: contact r.lind@example.net.')] }] })));
  await page.goto(page.url().replace('/export', '/import'));
  await settle();
  await page.locator('input[type=file]').setInputFiles([join(dir, 'fictional.pdf'), join(dir, 'fictional.docx')]);
  await page.getByText(/words ·/).nth(1).waitFor({ timeout: 15000 });
  check('PDF and DOCX import extracts text locally', (await page.locator('table.tbl').innerText()).match(/words ·/g)?.length === 2);
  await page.getByRole('button', { name: 'Cancel' }).click();

  // OCR: an image and a scanned (image-only) PDF are read locally with Tesseract, reviewed, accepted and reviewed for risks.
  {
    const sheet = await browser.newPage({ viewport: { width: 1200, height: 500 } });
    await sheet.setContent('<body style="margin:0;background:#fff"><div style="padding:48px 56px;font:34px/1.5 Georgia,serif;color:#111;width:1050px">Fictional scan for testing.<br>I was the only night porter at Fernhill depot.<br>Contact: r.lind@example.net</div></body>');
    const png = await sheet.screenshot({ type: 'png' }); await sheet.close();
    const ocrDir = mkdtempSync(join(tmpdir(), 'mosaic-ocr-'));
    writeFileSync(join(ocrDir, 'fictional-scan.png'), png);
    const scan = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1200, 500] }); scan.addImage('data:image/png;base64,' + png.toString('base64'), 'PNG', 0, 0, 1200, 500);
    writeFileSync(join(ocrDir, 'fictional-scanned.pdf'), Buffer.from(scan.output('arraybuffer')));
    await page.goto(base + '/workspaces');
    await page.getByRole('button', { name: 'New workspace' }).click();
    await page.waitForURL(/\/import/); await settle();
    const before = requests.length;
    await page.locator('input[type=file]').setInputFiles([join(ocrDir, 'fictional-scan.png'), join(ocrDir, 'fictional-scanned.pdf')]);
    await page.getByText(/Check the OCR text/).nth(1).waitFor({ timeout: 90000 });
    const texts = await page.locator('.ocr-review textarea').evaluateAll((els) => els.map((e) => e.value));
    check('OCR reads an image and a scanned PDF on this device', texts.length === 2 && texts.every((t) => /night porter/i.test(t) && /Fernhill/i.test(t)), texts.map((t) => t.replace(/\s+/g, ' ').slice(0, 140)).join(' | '));
    check('OCR shows the page image and a confidence score', (await page.locator('.ocr-page img').count()) === 2 && (await page.getByText(/Mean confidence \d+%/).count()) === 2);
    await shot('ocr-review');
    ocrAudit = { files: texts.length, externalRequests: requests.slice(before).length };
    check('OCR makes no requests outside this site', requests.slice(before).length === 0, requests.slice(before).map((r) => r.url.slice(0, 90)).join(' , '));
    for (let n = 0; n < 2; n++) await page.getByRole('button', { name: 'Accept text' }).first().click();
    await page.getByRole('button', { name: /Add 2 to workspace/ }).click();
    await page.waitForURL(/\/w\/[^/]+$/); await settle();
    await page.getByRole('button', { name: 'Run review' }).click();
    await page.locator('.count-d').first().waitFor({ timeout: 30000 });
    await page.getByRole('link', { name: /^Findings/ }).first().click(); await settle();
    const found = await page.getByText('An email address').first().waitFor({ timeout: 5000 }).then(() => true, () => false);
    check('reviews run on OCR text (email found by rules)', found, found ? '' : (await page.locator('table.tbl').innerText().catch(() => 'no table')).replace(/\s+/g, ' ').slice(0, 200));
  }

  // Offline: the app keeps working for local tasks
  const swReady = await page.evaluate(async () => { const r = await Promise.race([navigator.serviceWorker.ready.then(() => true), new Promise((res) => setTimeout(() => res(false), 8000))]); return r && !!navigator.serviceWorker.controller; });
  check('service worker controls the page', swReady);
  await page.context().setOffline(true);
  await page.goto(wsUrl.replace(/\/w\/([^/]+).*/, '/w/$1/findings')).catch((e) => console.log('offline goto:', e.message.split('\n')[0]));
  await page.getByRole('link', { name: /^Documents/ }).first().click().catch(() => {});
  await page.locator('.reader-d').first().waitFor({ timeout: 5000 }).catch(() => {});
  await shot('offline');
  check('navigation works offline (service worker / SPA)', await page.locator('.reader-d').count() > 0);
  await page.context().setOffline(false);

  // Private workspace with canaries: nothing derived from it may leave the page.
  await page.goto(base + '/workspaces');
  await page.getByRole('button', { name: 'New workspace' }).click();
  await page.waitForURL(/\/import/);
  await page.locator('#paste-title').fill('Canary draft');
  await page.locator('#paste-box').fill(CANARY_DRAFT);
  await page.getByRole('button', { name: /Add 1 to workspace/ }).click();
  await page.waitForURL(/\/w\/[^/]+$/);
  await page.getByRole('link', { name: 'Import', exact: true }).click();
  await page.getByRole('radio', { name: 'Already published' }).click();
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
  writeFileSync(new URL('../../../demo/evidence/network-audit.json', import.meta.url), JSON.stringify({ kind: 'mosaic-network-audit', generatedAt: new Date().toISOString(), method: 'Playwright request log during a full review of a private workspace seeded with canary strings (production build, production CSP).', externalRequests: requests.length, hosts: [...new Set(requests.map((r) => r.host))], canaryLeaks: leaks.length, geminiRequests: requests.filter((r) => /firebasevertexai|generativelanguage/.test(r.host)).length, ocr: ocrAudit }, null, 2) + '\n');
  check('no request carries a private canary', leaks.length === 0, `${requests.length} external requests to ${[...new Set(requests.map((r) => r.host))].join(', ') || 'none'}`);
  check('no request to Gemini endpoints during private review', !requests.some((r) => /firebasevertexai|generativelanguage/.test(r.host)));

  // Phone layout (approved iOS-style mobile design)
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  phone.on('pageerror', (e) => errors.push(e.message));
  await phone.goto(base + '/');
  await phone.getByRole('button', { name: 'Try the sample workspace' }).click();
  await phone.waitForURL(/\/w\//);
  const wsPath = new URL(phone.url()).pathname.replace(/^(\/w\/[^/]+).*/, '$1');
  await phone.getByRole('button', { name: 'Run review' }).click();
  await phone.locator('.count-d.high strong').waitFor({ timeout: 20000 });
  const overflow = [];
  for (const path of ['/', '/workspaces', wsPath, `${wsPath}/document`, `${wsPath}/findings`, `${wsPath}/map`, `${wsPath}/rewrite`, `${wsPath}/release`, `${wsPath}/history`, `${wsPath}/export`, '/tests', '/journal', '/benchmark', '/settings', '/device']) {
    await phone.goto(base + path); await settle(phone); await phone.waitForTimeout(150);
    const w = await phone.evaluate(() => document.documentElement.scrollWidth);
    if (w > 391) overflow.push(`${path}:${w}`);
  }
  check('no horizontal page scroll on any screen at phone width', overflow.length === 0, overflow.join(', '));
  await phone.goto(base + `${wsPath}/findings`);
  check('floating glass tab bar on phone', await phone.locator('.m-tabbar').waitFor({ timeout: 5000 }).then(() => true, () => false));
  await settle(phone);
  await phone.locator('table.tbl tbody tr').first().click();
  await phone.locator('.m-sheet-layer.open').waitFor({ timeout: 3000 });
  check('tapping a finding opens its details in a bottom sheet', await phone.locator('.m-sheet .insp-title').count() > 0);
  if (shots) await phone.screenshot({ path: `${shots}/phone-sheet.png` });
  await phone.getByRole('button', { name: 'Close' }).click();
  await phone.goto(base + `${wsPath}`);
  if (shots) await phone.screenshot({ path: `${shots}/phone-overview.png` });
  await phone.close();
} catch (e) {
  check('flow completed', false, e.message.split('\n').slice(0, 4).join(' | '));
  await shot('failure');
} finally {
  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close();
  preview.kill();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
}
