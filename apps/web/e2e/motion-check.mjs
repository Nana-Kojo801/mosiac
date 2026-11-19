// Verifies navigation UX: animated transitions, no blank frames, persistent chrome.
//   node e2e/motion-check.mjs [--shots dir]
import { createRequire } from 'node:module';
import { execSync, spawn } from 'node:child_process';
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(execSync('npm root -g').toString().trim() + '/playwright')); }
const shotsIdx = process.argv.indexOf('--shots'); const shots = shotsIdx > 0 ? process.argv[shotsIdx + 1] : null;
const preview = spawn('npx', ['--no-install', 'vite', 'preview', '--port', '4175', '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' });
const base = 'http://127.0.0.1:4175';
for (let i = 0; i < 50; i++) { try { await fetch(base); break; } catch { await new Promise((r) => setTimeout(r, 200)); } }
const results = []; const check = (n, ok, d = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ` — ${d}` : ''}`); };
const browser = await chromium.launch();

// Records, every animation frame, how many page slots exist, the incoming slot's transform, and whether any visible content is present.
const startRecorder = (p) => p.evaluate(() => { window.__frames = []; const tick = () => { const slots = [...document.querySelectorAll('.page-slot')]; const txt = slots.map((s) => (s.innerText || '').trim().length); window.__frames.push({ n: slots.length, tf: slots.map((s) => getComputedStyle(s).transform), maxText: Math.max(0, ...txt), op: slots.map((s) => getComputedStyle(s).opacity) }); if (window.__rec) requestAnimationFrame(tick); }; window.__rec = true; requestAnimationFrame(tick); });
const stopRecorder = async (p) => { await p.waitForTimeout(700); return p.evaluate(() => { window.__rec = false; return window.__frames; }); };
const moved = (frames) => frames.some((f) => f.n === 2 && f.tf.some((t) => t !== 'none' && !/matrix\(1, 0, 0, 1, 0, 0\)/.test(t)));
const blank = (frames) => frames.filter((f) => f.n === 0 || f.maxText < 20).length;

try {
  for (const kind of ['phone', 'desktop']) {
    const p = await browser.newPage(kind === 'phone' ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
    await p.goto(base + '/');
    await p.getByRole('button', { name: 'Try the sample workspace' }).click();
    await p.waitForURL(/\/w\//); await p.waitForTimeout(600);
    await p.getByRole('button', { name: 'Run review' }).click(); await p.locator('.count-d.high strong').waitFor({ timeout: 20000 }); await p.waitForTimeout(500);
    const ws = new URL(p.url()).pathname;
    // Tag the persistent chrome so we can tell if it is ever re-created.
    const chromeSel = kind === 'phone' ? '.m-tabbar' : '.sidebar';
    await p.evaluate((sel) => { document.querySelector(sel).dataset.probe = 'original'; }, chromeSel);
    const route = kind === 'phone'
      ? [['tab', 'link', /^Findings/], ['tab', 'link', /^Map/], ['tab', 'link', /^Journal/], ['tab', 'link', /^Settings/], ['tab', 'link', /^Workspaces/]]
      : [['nav', 'link', /^Findings/], ['nav', 'link', /^Disclosure map/], ['nav', 'link', /^Stress tests/], ['nav', 'link', /^Inference journal/], ['nav', 'link', /^Settings/], ['nav', 'link', /^Release review/]];
    let allMoved = true, blanks = 0, chromeOk = true, wsItemsOk = true;
    for (const [i, [, role, name]] of route.entries()) {
      await startRecorder(p);
      await p.locator(kind === 'phone' ? '.m-tabbar' : '.sidebar').getByRole(role, { name }).click();
      if (shots && i === 0) { for (const t of [60, 140, 220]) { await p.waitForTimeout(t === 60 ? 60 : 80); await p.screenshot({ path: `${shots}/${kind}-transition-${t}ms.png` }); } }
      const frames = await stopRecorder(p);
      if (!moved(frames)) allMoved = false;
      blanks += blank(frames);
      if (!(await p.evaluate((sel) => document.querySelector(sel)?.dataset.probe === 'original', chromeSel))) chromeOk = false;
      if (kind === 'desktop' && (await p.locator('.sidebar .nav-i', { hasText: 'Overview' }).count()) !== 1) wsItemsOk = false;
      if (kind === 'phone' && (await p.locator('.m-tabbar .m-tab', { hasText: 'Findings' }).count()) !== 1) wsItemsOk = false;
    }
    // Push / pop on phone: open the draft from the overview, then go back.
    let pushMoved = true;
    if (kind === 'phone') {
      await p.goto(base + ws); await p.waitForTimeout(500);
      await startRecorder(p); await p.getByRole('link', { name: /Open draft/ }).click(); pushMoved = moved(await stopRecorder(p));
      await startRecorder(p); await p.getByRole('button', { name: 'Back' }).click(); pushMoved = pushMoved && moved(await stopRecorder(p));
    }
    check(`${kind}: every navigation animates`, allMoved && pushMoved);
    check(`${kind}: no blank frames during navigation`, blanks === 0, `${blanks} blank frames`);
    check(`${kind}: ${kind === 'phone' ? 'tab bar' : 'sidebar'} is never re-created`, chromeOk);
    check(`${kind}: workspace items stay on global pages`, wsItemsOk);
    await p.close();
  }
} catch (e) { check('motion check completed', false, e.message.split('\n')[0]); }
finally { await browser.close(); preview.kill(); const f = results.filter((r) => !r).length; console.log(`\n${results.length - f}/${results.length} checks passed`); process.exit(f ? 1 : 0); }
