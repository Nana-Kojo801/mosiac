// Measures desktop navigation speed: ms from click until the new page's content is readable.
//   node e2e/nav-speed.cjs [cpuSlowdown=1]   (run after a production build)
// Time from click until the new page's content is readable (slot and its first content block at ≥95% opacity, no leaving page).
const { chromium } = require('playwright');
const { spawn } = require('child_process');
(async () => {
  const port = 4179 + Math.floor(Math.random() * 50);
  const preview = spawn('npx', ['--no-install', 'vite', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { cwd: '/home/user/mosiac/apps/web', stdio: 'ignore' });
  const B = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 50; i++) { try { await fetch(B); break; } catch { await new Promise((r) => setTimeout(r, 200)); } }
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(B + '/'); await p.getByRole('button', { name: 'Try the sample workspace' }).click(); await p.waitForURL(/\/w\//); await p.waitForTimeout(500);
  await p.getByRole('button', { name: 'Run review' }).click(); await p.locator('.count-d.high strong').waitFor({ timeout: 20000 }); await p.waitForTimeout(600);
  const cdp = await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.argv[2] || 1) });
  const out = [];
  for (const name of [/^Documents/, /^Findings/, /^Disclosure map/, /^Rewrite studio/, /^Overview/, /^Inference journal/, /^Settings/]) {
    await p.evaluate(() => document.querySelectorAll('.page-slot').forEach((x) => { x.dataset.seen = '1'; }));
    await p.evaluate(() => { window.__r = null; window.__t0 = performance.now(); const tick = () => { const slots = [...document.querySelectorAll('.page-slot')]; const now = performance.now() - window.__t0; const s = slots.find((x) => x.querySelector(':scope > .page-presence:not([aria-hidden])') && x.dataset.seen !== '1'); const first = s?.querySelector('.main-inner > *, .m-content > *'); const op = (el) => { let o = 1; for (let e = el; e && e !== document.body; e = e.parentElement) o *= Number(getComputedStyle(e).opacity); return o; }; if (now > 30 && slots.length >= 1 && s && first && op(first) >= 0.95 && !window.__r) window.__r = now; if (!window.__r && now < 3000) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
    await p.locator('.sidebar').getByRole('link', { name }).click();
    await p.waitForFunction(() => window.__r || performance.now() - window.__t0 > 3000); await p.waitForTimeout(400);
    out.push(Math.round(await p.evaluate(() => window.__r)));
  }
  console.log(`CPU x${process.argv[2] || 1}: readable after [${out.join(', ')}] ms (median ${out.sort((a, b) => a - b)[3]})`);
  await b.close(); preview.kill();
})();
