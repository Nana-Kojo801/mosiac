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
const maxShift = (frames) => Math.max(0, ...frames.flatMap((f) => f.tf.map((t) => { const m = t.match(/matrix\(([^)]+)\)/); return m ? Math.abs(Number(m[1].split(',')[4])) : 0; })));
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

  // Phone: bottom-nav tab switches slide a real distance (pager), and finish quickly.
  {
    const p = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await p.goto(base + '/'); await p.getByRole('button', { name: 'Try the sample workspace' }).click(); await p.waitForURL(/\/w\//); await p.waitForTimeout(700);
    await p.locator('.m-tabbar').getByRole('link', { name: /^Workspaces/ }).click(); await p.waitForTimeout(600);
    await startRecorder(p); await p.locator('.m-tabbar').getByRole('link', { name: /^Journal/ }).click(); const f = await stopRecorder(p);
    const overlapFrames = f.filter((x) => x.n === 2).length;
    check('phone: tab switch slides across the screen', maxShift(f) > 150, `max shift ${Math.round(maxShift(f))}px`);
    check('phone: transitions are quick (≤ ~0.4 s)', overlapFrames > 3 && overlapFrames <= 26, `${overlapFrames} frames`);
    await p.close();
  }
  // Desktop: entrance on first load, visible glide on navigation, in-page tab slide, reduced-motion setting, no scrollbars, readable landing button.
  {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await p.addInitScript(() => { window.__frames = []; const tick = () => { const s = [...document.querySelectorAll('.page-slot, .d-side')]; window.__frames.push({ n: document.querySelectorAll('.page-slot').length, tf: s.map((e) => getComputedStyle(e).transform), maxText: 99, op: s.map((e) => getComputedStyle(e).opacity) }); if (window.__frames.length < 120) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
    await p.goto(base + '/workspaces'); await p.waitForTimeout(900);
    const loadFrames = await p.evaluate(() => window.__frames);
    check('desktop: page and sidebar animate in on first load', loadFrames.some((x) => x.op.some((o) => Number(o) < 0.95)) && loadFrames.some((x) => x.tf.some((t) => t !== 'none' && !/matrix\(1, 0, 0, 1, 0, 0\)/.test(t))));
    await p.goto(base + '/'); await p.getByRole('button', { name: 'Try the sample workspace' }).click(); await p.waitForURL(/\/w\//); await p.waitForTimeout(600);
    await startRecorder(p); await p.locator('.sidebar').getByRole('link', { name: /^Documents/ }).click(); const nf = await stopRecorder(p);
    check('desktop: navigation glides visibly', maxShift(nf) >= 5, `max shift ${Math.round(maxShift(nf))}px`);
    await p.evaluate(() => { window.__mv = []; const t = () => { const el = document.querySelector('.reader-d')?.parentElement; window.__mv.push(el ? getComputedStyle(el).transform : 'none'); if (window.__mv.length < 40) requestAnimationFrame(t); }; requestAnimationFrame(t); });
    await p.getByRole('tab', { name: /Interim findings report/ }).click(); await p.waitForTimeout(700);
    const mv = await p.evaluate(() => window.__mv);
    check('desktop: document tabs slide their content', mv.some((t) => t !== 'none' && !/matrix\(1, 0, 0, 1, 0, 0\)/.test(t)));
    check('desktop: tab underline is a sliding indicator', (await p.locator('.doc-tab-line').count()) === 1);
    const sb = await p.evaluate(() => getComputedStyle(document.querySelector('.main-scroll')).scrollbarWidth);
    check('scrollbars are hidden', sb === 'none', sb);
    await p.locator('.sidebar').getByRole('link', { name: /^Settings/ }).click(); await p.waitForTimeout(500);
    await p.getByRole('radio', { name: 'Reduced' }).click(); await p.waitForTimeout(200);
    await startRecorder(p); await p.locator('.sidebar').getByRole('link', { name: /^Inference journal/ }).click(); const rf = await stopRecorder(p);
    check('Animations: Reduced removes movement', maxShift(rf) === 0, `max shift ${Math.round(maxShift(rf))}px`);
    await p.goto(base + '/settings'); await p.getByRole('radio', { name: 'Follow system' }).click();
    await p.goto(base + '/'); await p.waitForTimeout(400);
    const c = await p.evaluate(() => { const a = [...document.querySelectorAll('.lnav a')].find((x) => /Open workspaces/.test(x.textContent)); const cs = getComputedStyle(a); return [cs.color, cs.backgroundColor]; });
    check('landing button text is white on the accent', c[0] === 'rgb(255, 255, 255)', c.join(' on '));
    await p.close();
  }
} catch (e) { check('motion check completed', false, e.message.split('\n')[0]); }
finally { await browser.close(); preview.kill(); const f = results.filter((r) => !r).length; console.log(`\n${results.length - f}/${results.length} checks passed`); process.exit(f ? 1 : 0); }
