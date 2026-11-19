// Plans the video timeline: each scene = lead-in + narration + tail, with scene
// starts snapped to the music's beat grid. Writes demo/render/timeline.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildScenes } from '../script/scenes.mjs';

const root = new URL('../..', import.meta.url).pathname;
export const BPM = 122, FPS = 30;
const beat = 60 / BPM;
const nar = JSON.parse(readFileSync(join(root, 'demo/narration/narration.json'), 'utf8'));
const scenes = buildScenes();
const extra = { hook: 2.6, title: 1.6, guard: 0.8, bench: 0.8, close: 3.2, phone: 0.6 };
let t = 0; const out = [];
for (const s of scenes) {
  const n = nar.scenes.find((x) => x.id === s.id);
  const lead = s.id === 'hook' ? 1.4 : 0.3;
  const dur = lead + n.duration + 0.45 + (extra[s.id] ?? 0);
  const start = Math.ceil(t / beat - 1e-6) * beat; // snap to beat
  out.push({ ...s, start, voiceAt: start + lead, voiceDuration: n.duration, audio: n.audio, words: n.words.map((w) => ({ ...w, start: w.start + start + lead, end: w.end + start + lead })) });
  t = start + dur;
}
for (let i = 0; i < out.length; i++) out[i].end = i + 1 < out.length ? out[i + 1].start : Math.ceil(t / beat) * beat;
const total = out.at(-1).end;
writeFileSync(join(root, 'demo/render/timeline.json'), JSON.stringify({ bpm: BPM, fps: FPS, total, voice: nar.voice, scenes: out }, null, 2));
console.log(`timeline: ${out.length} scenes, ${total.toFixed(1)} s (${Math.round(total * FPS)} frames)`);
for (const s of out) console.log(`  ${s.id.padEnd(8)} ${s.start.toFixed(2).padStart(7)} → ${s.end.toFixed(2).padStart(7)}`);
