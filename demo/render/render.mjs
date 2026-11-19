// Renders the demo with Remotion, then normalises loudness with ffmpeg.
//   node render/render.mjs                 -> demo/out/mosaic-demo.mp4
//   node render/render.mjs --stills 5,40   -> demo/out/stills/still-5.0.png ...
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const demo = new URL('..', import.meta.url).pathname;
const out = join(demo, 'out');
const tl = JSON.parse(readFileSync(join(demo, 'render/timeline.json'), 'utf8'));
const args = process.argv.slice(2);
const stillsArg = args.includes('--stills') ? args[args.indexOf('--stills') + 1] : null;
const browserExecutable = process.env.REMOTION_CHROME ?? ['/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell'].find(existsSync);

// Stage only the files the composition reads.
const pub = join(demo, '.render-public');
rmSync(pub, { recursive: true, force: true });
mkdirSync(join(pub, 'narration/cache'), { recursive: true });
mkdirSync(join(pub, 'audio'), { recursive: true });
cpSync(join(demo, 'footage'), join(pub, 'footage'), { recursive: true });
cpSync(join(demo, 'audio/music.wav'), join(pub, 'audio/music.wav'));
for (const s of tl.scenes) cpSync(join(demo, s.audio), join(pub, s.audio));

const serveUrl = await bundle({ entryPoint: join(demo, 'remotion/src/index.ts'), publicDir: pub, onProgress: () => {} });
const composition = await selectComposition({ serveUrl, id: 'MosaicDemo', browserExecutable });
mkdirSync(out, { recursive: true });

if (stillsArg) {
  mkdirSync(join(out, 'stills'), { recursive: true });
  for (const s of stillsArg.split(',').map(Number)) {
    const output = join(out, 'stills', `still-${s.toFixed(1)}.png`);
    await renderStill({ serveUrl, composition, frame: Math.min(composition.durationInFrames - 1, Math.round(s * composition.fps)), output, browserExecutable, scale: 0.5 });
    console.log(output);
  }
  process.exit(0);
}

const raw = join(out, 'mosaic-demo.raw.mp4');
let last = -1;
await renderMedia({
  serveUrl, composition, codec: 'h264', outputLocation: raw, browserExecutable,
  crf: 18, pixelFormat: 'yuv420p', audioCodec: 'aac', audioBitrate: '320k', concurrency: Number(process.env.CONCURRENCY ?? 4),
  onProgress: ({ progress }) => { const p = Math.floor(progress * 20); if (p !== last) { last = p; console.log(`render ${p * 5}%`); } },
});

// Two-pass loudness normalisation to -14 LUFS integrated, -1 dBTP (spec 22.6).
const target = 'I=-14:TP=-1.0:LRA=11';
const probe = execFileSync('ffmpeg', ['-hide_banner', '-i', raw, '-af', `loudnorm=${target}:print_format=json`, '-f', 'null', '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).toString();
let m;
try { m = JSON.parse(probe.slice(probe.lastIndexOf('{'))); } catch { m = null; }
const stderr = m ? null : execFileSync('sh', ['-c', `ffmpeg -hide_banner -i "${raw}" -af loudnorm=${target}:print_format=json -f null - 2>&1`], { encoding: 'utf8' });
if (!m) m = JSON.parse(stderr.slice(stderr.lastIndexOf('{')));
const final = join(out, 'mosaic-demo.mp4');
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', raw, '-c:v', 'copy', '-af',
  `loudnorm=${target}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=48000`,
  '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', final]);
rmSync(raw);
console.log(`${final}  ${(statSync(final).size / 1e6).toFixed(1)} MB`);
