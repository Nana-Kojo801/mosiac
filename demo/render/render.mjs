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
const final = join(out, 'mosaic-demo.mp4');
if (!args.includes('--finish-only')) {
  let last = -1;
  await renderMedia({
    serveUrl, composition, codec: 'h264', outputLocation: raw, browserExecutable,
    crf: 16, pixelFormat: 'yuv420p', audioCodec: 'aac', audioBitrate: '320k', concurrency: Number(process.env.CONCURRENCY ?? 4),
    onProgress: ({ progress }) => { const p = Math.floor(progress * 20); if (p !== last) { last = p; console.log(`render ${p * 5}%`); } },
  });
}

// Mastering pass (spec 22.6–22.8):
//  video: Chrome's frames arrive full-range BT.601; convert to limited-range BT.709 and tag it, so players show the colours as rendered.
//  audio: two-pass loudness normalisation to -14 LUFS, then a true-peak-safe limiter for -1 dBTP.
const target = 'I=-14:TP=-1.5:LRA=11';
const measure = execFileSync('sh', ['-c', `ffmpeg -hide_banner -nostats -i "${raw}" -vn -af loudnorm=${target}:print_format=json -f null - 2>&1`], { encoding: 'utf8' });
const m = JSON.parse(measure.slice(measure.lastIndexOf('{')));
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', raw,
  '-vf', 'scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-profile:v', 'high', '-tune', 'animation', '-r', '30',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
  '-af', `loudnorm=${target}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=192000,alimiter=limit=0.83:level=false:attack=2:release=60,aresample=48000`,
  '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-movflags', '+faststart', final]);
if (!args.includes('--keep-raw')) rmSync(raw);
console.log(`${final}  ${(statSync(final).size / 1e6).toFixed(1)} MB`);
