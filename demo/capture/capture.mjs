// Captures the real Mosaic production build for the demo video (spec 22.4).
// Saves 2x stills (3840x2160 for desktop) plus element bounding boxes ("camera track")
// for each step into demo/footage/. Everything shown comes from the running app.
//   npm run capture            (builds the web app first if dist is missing)
import { createRequire } from 'node:module';
import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(execSync('npm root -g').toString().trim() + '/playwright')); }
const root = new URL('../..', import.meta.url).pathname;
const out = join(root, 'demo/footage');
mkdirSync(out, { recursive: true });
if (!existsSync(join(root, 'apps/web/dist/index.html'))) execSync('npm run build -w @mosaic/web', { cwd: root, stdio: 'inherit' });
const port = 4300 + Math.floor(Math.random() * 100);
const preview = spawn('npx', ['--no-install', 'vite', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { cwd: join(root, 'apps/web'), stdio: 'ignore' });
const B = `http://127.0.0.1:${port}`;
for (let i = 0; i < 60; i++) { try { await fetch(B); break; } catch { await new Promise((r) => setTimeout(r, 200)); } }

const track = {};
const browser = await chromium.launch();
const settle = (p) => p.waitForFunction(() => document.querySelectorAll('.page-slot').length === 1, null, { timeout: 5000 }).catch(() => {});

/** Save a still and the boxes (CSS px in a 1920x1080 frame) of the given selectors. */
async function snap(p, id, targets = {}) {
  await settle(p); await p.waitForTimeout(450);
  const boxes = {};
  for (const [name, sel] of Object.entries(targets)) {
    const b = await p.locator(sel).first().boundingBox().catch(() => null);
    if (b) boxes[name] = { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
  }
  await p.screenshot({ path: join(out, `${id}.png`) });
  const vp = p.viewportSize();
  track[id] = { file: `${id}.png`, viewport: vp, boxes };
  console.log(`captured ${id}`, Object.keys(boxes).join(', '));
}

try {
  // ---------- desktop ----------
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto(B + '/'); await p.waitForTimeout(6000);
  await snap(p, 'landing', { hero: '.l-hero h1', reveal: '.l-reveal', mosaic: '.l-reveal .mosaic', ctas: '.l-ctas' });
  await p.getByRole('button', { name: 'Try the sample workspace' }).click(); await p.waitForURL(/\/w\//);
  await snap(p, 'overview-start', { title: '.page-h h1', banner: '.banner', run: 'header .btn-primary', docs: '.tbl' });
  await p.getByRole('button', { name: 'Run review' }).click(); await p.locator('.count-d.high strong').waitFor({ timeout: 20000 }); await p.waitForTimeout(2800);
  await snap(p, 'overview-reviewed', { counts: '.counts-d', high: '.count-d.high', coverage: '.coverage-d', group: '.mosaic' });
  const ws = new URL(p.url()).pathname;
  await p.goto(B + ws + '/findings');
  await snap(p, 'findings', { table: '.tbl', first: '.tbl tbody tr', inspector: '.inspector', evidence: '.ev-list', score: '.score', source: '.inspector .src' });
  await p.goto(B + ws + '/document');
  await p.locator('mark.ev').first().click(); await p.waitForTimeout(400);
  await snap(p, 'document', { reader: '.reader-d', mark: 'mark.ev', inspector: '.inspector', evidence: '.ev-list' });
  await p.goto(B + ws + '/map');
  await snap(p, 'map', { graph: '.graph-wrap', hot: '.g-node.finding', group: '.inspector .mosaic', steps: '.inspector .steps' });
  await p.locator('.g-hit').first().focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  await snap(p, 'map-edge', { graph: '.graph-wrap', reason: '.inspector .insp-card', passages: '.inspector .ev-list' });
  await p.goto(B + ws + '/rewrite');
  await snap(p, 'rewrite-suggest', { edits: '.inspector', firstEdit: '.edit-d', diff: '.diffbox' });
  await p.locator('.edit-d', { hasText: 'Three details combine' }).getByRole('button', { name: 'Apply' }).click(); await p.waitForTimeout(600);
  await p.locator('.edit-d', { hasText: 'exact date' }).getByRole('button', { name: 'Apply' }).click(); await p.waitForTimeout(600);
  await snap(p, 'rewrite-applied', { cols: '.diff-cols', latest: '.inspector .insp-card' });
  await p.getByRole('button', { name: 'Review again' }).click(); await p.locator('.reassess').waitFor({ timeout: 20000 }); await p.waitForTimeout(2800);
  await snap(p, 'rewrite-reassessed', { reassess: '.reassess', latest: '.inspector .insp-card', cols: '.diff-cols' });
  await p.goto(B + ws + '/map'); await p.waitForLoadState('load');
  await p.locator('.inspector .steps').waitFor({ timeout: 10000 }); await settle(p); await p.waitForTimeout(1500);
  await snap(p, 'map-after', { graph: '.graph-wrap', group: '.inspector .mosaic', steps: '.inspector .steps' });
  await p.goto(B + ws + '/release'); await settle(p);
  await p.locator('[role="checkbox"]').first().waitFor();
  for (const c of await p.locator('[role="checkbox"]').all()) { await c.click(); await p.waitForTimeout(120); }
  await p.waitForFunction(() => { const b = [...document.querySelectorAll('button')].find((x) => /Approve release/.test(x.textContent || '')); return b && !b.disabled; }, null, { timeout: 10000 });
  await snap(p, 'release', { compare: '.compare-d', checklist: '.inspector .insp-card', approve: '.inspector .btn-primary' });
  await p.getByRole('button', { name: /Approve release/ }).click(); await p.waitForURL(/history/); await p.waitForTimeout(800);
  await snap(p, 'history', { timeline: '.timeline' });
  await p.goto(B + ws + '/export');
  await snap(p, 'export', { preview: '.panel.line', options: '.inspector' });
  await p.goto(B + '/tests');
  await snap(p, 'tests', { packs: '.pack-d', payload: '.inspector .payload' });
  await p.getByRole('button', { name: /Review and send/ }).click(); await p.waitForTimeout(700);
  await snap(p, 'consent', { dialog: '.modal', payload: '.modal .payload' });
  await p.getByRole('button', { name: 'Cancel' }).click();
  // OCR on a fictional scan
  const sheet = await browser.newPage({ viewport: { width: 1100, height: 520 } });
  await sheet.setContent('<body style="margin:0;background:#fbfaf6"><div style="padding:56px 64px;font:31px/1.55 Georgia,serif;color:#1b1b1b">Interview notes — fictional.<br>I was the only night porter at Fernhill depot<br>after the winter rota change in 2025.<br>Contact: r.lind@example.net</div></body>');
  const dir = mkdtempSync(join(tmpdir(), 'mosaic-demo-')); const scanPath = join(dir, 'interview-scan.png');
  await sheet.screenshot({ path: scanPath }); await sheet.close();
  await p.goto(B + ws + '/import');
  await p.locator('input[type=file]').setInputFiles(scanPath);
  await p.locator('.ocr-review').waitFor({ timeout: 120000 }); await p.waitForTimeout(400);
  await p.locator('.ocr-review').scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
  await snap(p, 'ocr', { panel: '.ocr-review', image: '.ocr-page img', text: '.ocr-review textarea', confidence: '.ocr-review .chip' });
  await p.goto(B + '/benchmark');
  await snap(p, 'benchmark', { table: '.bench-table', population: '.mosaic' });
  await ctx.close();

  // ---------- phone ----------
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const m = await phone.newPage();
  await m.goto(B + '/'); await m.getByRole('button', { name: 'Try the sample workspace' }).click(); await m.waitForURL(/\/w\//);
  await m.getByRole('button', { name: 'Run review' }).click(); await m.locator('.count-d.high strong').waitFor({ timeout: 20000 }); await m.waitForTimeout(2800);
  await snap(m, 'phone-overview', { tabbar: '.m-tabbar' });
  await m.locator('.m-tabbar').getByRole('link', { name: /^Findings/ }).click();
  await snap(m, 'phone-findings', { tabbar: '.m-tabbar' });
  await m.locator('table.tbl tbody tr').first().click(); await m.locator('.m-sheet').waitFor(); await m.waitForTimeout(700);
  await snap(m, 'phone-sheet', { sheet: '.m-sheet' });
  await m.getByRole('button', { name: 'Close' }).click(); await m.waitForTimeout(500);
  await m.locator('.m-tabbar').getByRole('link', { name: /^Map/ }).click();
  await snap(m, 'phone-map', { tabbar: '.m-tabbar' });
  await phone.close();

  writeFileSync(join(out, 'track.json'), JSON.stringify({ capturedAt: new Date().toISOString(), source: 'apps/web production build (vite preview with Firebase Hosting headers)', steps: track }, null, 2));
  console.log(`\n${Object.keys(track).length} steps captured into demo/footage`);
} finally { await browser.close(); preview.kill(); }
