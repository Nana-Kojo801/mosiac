// Release gate for the demo video (spec 22.8). Fails on any of: duration over the limit, wrong format,
// loudness out of tolerance, a claim whose evidence is missing or no longer matches, stale evidence,
// caption error rate over the threshold, a credential or canary visible in sampled frames, or an
// asset without an ASSETS.md entry. Writes a QA report to demo/out/qa-report.md.
//   node render/validate.mjs [--no-asr]
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, openSync, readFileSync, readSync, readdirSync, rmSync, statSync, writeFileSync, closeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWorker } from 'tesseract.js';
import { resolve } from './claims.mjs';

const root = new URL('../..', import.meta.url).pathname, demo = join(root, 'demo');
const video = join(demo, 'out/mosaic-demo.mp4');
const MAX_SECONDS = 179, WER_MAX = 0.05;
const results = []; const ok = (name, pass, detail = '') => { results.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); };
if (!existsSync(video)) { console.error('No demo/out/mosaic-demo.mp4; run render first.'); process.exit(1); }

// Format
const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', video], { encoding: 'utf8' }));
const v = probe.streams.find((s) => s.codec_type === 'video'), a = probe.streams.find((s) => s.codec_type === 'audio');
const duration = Number(probe.format.duration);
ok('duration within limit', duration <= MAX_SECONDS, `${duration.toFixed(2)} s (limit ${MAX_SECONDS} s)`);
ok('H.264 1920×1080 yuv420p 30 fps', v.codec_name === 'h264' && v.width === 1920 && v.height === 1080 && v.pix_fmt === 'yuv420p' && v.r_frame_rate === '30/1', `${v.codec_name} ${v.width}×${v.height} ${v.pix_fmt} ${v.r_frame_rate}`);
ok('AAC 48 kHz stereo', a.codec_name === 'aac' && a.sample_rate === '48000' && a.channels === 2, `${a.codec_name} ${a.sample_rate} Hz ${a.channels} ch`);
{
  const fd = openSync(video, 'r'); const order = []; let pos = 0; const size = statSync(video).size; const b = Buffer.alloc(16);
  while (pos < size && order.length < 12) { readSync(fd, b, 0, 16, pos); let len = b.readUInt32BE(0); const type = b.toString('latin1', 4, 8); if (len === 1) len = Number(b.readBigUInt64BE(8)); if (len < 8) break; order.push(type); pos += len; }
  closeSync(fd);
  ok('faststart (moov before mdat)', order.indexOf('moov') > -1 && order.indexOf('moov') < order.indexOf('mdat'), order.join(' '));
}

// Loudness
const lo = execFileSync('sh', ['-c', `ffmpeg -hide_banner -nostats -i "${video}" -af ebur128=peak=true -f null - 2>&1`], { encoding: 'utf8' });
const I = Number(lo.match(/I:\s+(-?[\d.]+) LUFS/g).pop().match(/-?[\d.]+/)[0]);
const TP = Number(lo.match(/Peak:\s+(-?[\d.]+) dBFS/g).pop().match(/-?[\d.]+/)[0]);
ok('integrated loudness ≈ −14 LUFS', Math.abs(I + 14) <= 1, `${I} LUFS`);
ok('true peak ≤ −1 dBTP', TP <= -0.9, `${TP} dBTP`);

// Claims and evidence
const manifest = JSON.parse(readFileSync(join(demo, 'claims.manifest.json'), 'utf8'));
for (const c of manifest.claims) {
  const p = join(root, c.evidence);
  if (!existsSync(p)) { ok(`claim ${c.id}`, false, `missing evidence ${c.evidence}`); continue; }
  if (c.check.type === 'json') {
    const now = resolve(JSON.parse(readFileSync(p, 'utf8')), c.check.pointer);
    ok(`claim ${c.id}`, JSON.stringify(now) === JSON.stringify(c.check.value), `${c.evidence} ${c.check.pointer} = ${JSON.stringify(now)}`);
  } else ok(`claim ${c.id}`, readFileSync(p, 'utf8').includes(c.check.text), `${c.evidence} contains “${c.check.text}”`);
}
const { buildScenes, missingEvidence } = await import('../script/scenes.mjs');
const scenes = buildScenes();
const miss = missingEvidence(scenes);
ok('every scene’s evidence exists', miss.length === 0, miss.join(', '));
const tl = JSON.parse(readFileSync(join(demo, 'render/timeline.json'), 'utf8'));
ok('narration matches the evidence-built script', scenes.every((s) => tl.scenes.find((x) => x.id === s.id)?.text === s.text), 'timeline text equals buildScenes() text');
const dist = join(root, 'apps/web/dist/index.html');
if (existsSync(dist)) {
  const built = statSync(dist).mtimeMs;
  const track = JSON.parse(readFileSync(join(demo, 'footage/track.json'), 'utf8'));
  const audit = JSON.parse(readFileSync(join(demo, 'evidence/network-audit.json'), 'utf8'));
  ok('footage captured from the current build', Date.parse(track.capturedAt) >= built, `captured ${track.capturedAt}`);
  ok('network audit from the current build', Date.parse(audit.generatedAt) >= built, `generated ${audit.generatedAt}`);
}

// Caption accuracy (ASR of the final mix vs. captions)
const NUM = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const TENS = ['', '', 'twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
const say = (n) => n === 100 ? 'one hundred' : n < 20 ? NUM[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + NUM[n % 10] : '');
const norm = (s) => s.toLowerCase().replace(/(\d+)\s*%/g, '$1 percent').replace(/\b(\d{1,3})\b/g, (m) => (Number(m) <= 100 ? say(Number(m)) : m)).replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
function wer(ref, hyp) {
  const d = Array.from({ length: ref.length + 1 }, (_, i) => [i, ...Array(hyp.length).fill(0)]);
  for (let j = 1; j <= hyp.length; j++) d[0][j] = j;
  for (let i = 1; i <= ref.length; i++) for (let j = 1; j <= hyp.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1));
  return d[ref.length][hyp.length] / ref.length;
}
const srt = readFileSync(join(demo, 'captions/mosaic-demo.en.srt'), 'utf8').split('\n').filter((l) => l && !/^\d+$/.test(l) && !l.includes('-->')).join(' ');
if (process.argv.includes('--no-asr')) ok('caption accuracy (ASR)', false, 'skipped with --no-asr');
else {
  const py = process.env.MOSAIC_ASR_PYTHON ?? 'python3';
  try {
    const asr = JSON.parse(execFileSync(py, [join(demo, 'render/asr.py'), video], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 24 }));
    const e = wer(norm(srt), norm(asr.text));
    writeFileSync(join(demo, 'out/asr-transcript.txt'), asr.text + '\n');
    ok('caption word error rate', e <= WER_MAX, `${(e * 100).toFixed(1)}% vs ${asr.model} (threshold ${WER_MAX * 100}%)`);
  } catch (err) { ok('caption accuracy (ASR)', false, `ASR unavailable (${py}): install faster-whisper or set MOSAIC_ASR_PYTHON`); }
}

// Frame scan: OCR sampled frames for canaries and credential-like strings.
const env = existsSync(join(root, '.env.local')) ? Object.fromEntries(readFileSync(join(root, '.env.local'), 'utf8').split('\n').filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()])) : {};
const secrets = ['APPCHECK_DEBUG_TOKEN', 'VITE_APPCHECK_DEBUG_TOKEN', 'ELEVENLABS_API_KEY'].map((k) => env[k]).filter((s) => s && s.length >= 12);
const { CANARIES } = await import('../../packages/fixtures/src/canaries.ts').catch(() => ({ CANARIES: ['CANARY-MOSAIC-0F3A-PRIVATE', 'CANARY-MOSAIC-91C7-RELEASE', 'CANARY-MOSAIC-5D2E-FILENAME'] }));
const PATTERNS = [/AIza[0-9A-Za-z_-]{20,}/, /sk_[0-9a-f]{20,}/i, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /CANARY-MOSAIC/i, /private_key/i];
const frames = mkdtempSync(join(tmpdir(), 'mosaic-frames-'));
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', video, '-vf', 'fps=1/3', join(frames, 'f%03d.png')]);
const worker = await createWorker('eng', 1, { langPath: join(root, 'node_modules/@tesseract.js-data/eng/4.0.0_best_int'), cacheMethod: 'none', gzip: true });
const sampled = [], hits = [];
for (const f of readdirSync(frames).sort()) {
  const { data } = await worker.recognize(join(frames, f));
  const text = data.text.replace(/\s+/g, ' ');
  const t = (Number(f.slice(1, 4)) - 1) * 3;
  const bad = PATTERNS.filter((p) => p.test(text)).map(String).concat(CANARIES.filter((c) => text.includes(c))).concat(secrets.some((s) => text.replace(/\s/g, '').includes(s)) ? ['a value from .env.local'] : []);
  sampled.push({ t, chars: text.length, bad });
  if (bad.length) hits.push(`${t}s: ${bad.join(', ')}`);
}
await worker.terminate(); rmSync(frames, { recursive: true, force: true });
ok('no credential or canary in sampled frames', hits.length === 0, `${sampled.length} frames OCR-scanned${hits.length ? '; ' + hits.join('; ') : ''}`);

// Assets
const assets = readFileSync(join(demo, 'ASSETS.md'), 'utf8');
const needed = ['audio/music.wav', tl.voice.id, 'Inter', 'JetBrains Mono', 'Noto Color Emoji', 'footage/', 'Remotion'];
const missing = needed.filter((n) => !assets.includes(n));
ok('every asset has an ASSETS.md entry', missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : needed.join(', '));

const failed = results.filter((r) => !r.pass);
writeFileSync(join(demo, 'out/qa-report.md'), `# Demo QA report

Generated ${new Date().toISOString()} by \`demo/render/validate.mjs\` for \`demo/out/mosaic-demo.mp4\`.

**${failed.length ? `${failed.length} check(s) failed` : `All ${results.length} checks passed`}.**

| Check | Result | Detail |
|---|---|---|
${results.map((r) => `| ${r.name} | ${r.pass ? 'PASS' : '**FAIL**'} | ${String(r.detail).replace(/\|/g, '\\|')} |`).join('\n')}

## Sampled frames (every 3 s, OCR)

| Time | OCR characters | Findings |
|---|---|---|
${sampled.map((s) => `| ${s.t}s | ${s.chars} | ${s.bad.length ? s.bad.join(', ') : 'none'} |`).join('\n')}
`);
console.log(`\n${failed.length ? `${failed.length} FAILED` : `${results.length}/${results.length} passed`} — demo/out/qa-report.md`);
process.exit(failed.length ? 1 : 0);
