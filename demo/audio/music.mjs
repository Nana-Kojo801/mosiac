// Original background music, synthesised from code (no samples, no third-party audio).
// Upbeat electronic, BPM from the timeline, sections and hits aligned to scene starts.
//   npm run music  ->  demo/audio/music.wav (48 kHz stereo)
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../..', import.meta.url).pathname;
const tl = JSON.parse(readFileSync(join(root, 'demo/render/timeline.json'), 'utf8'));
const SR = 48000, BPM = tl.bpm, beat = 60 / BPM, bar = beat * 4;
const total = tl.total + 1.5;
const N = Math.ceil(total * SR);
const L = new Float32Array(N), R = new Float32Array(N);
const sceneAt = (id) => tl.scenes.find((s) => s.id === id);
const dropT = sceneAt('title').start, breakA = sceneAt('guard').start, breakB = sceneAt('ocr').start, endT = sceneAt('close').start + 12 * beat;

// deterministic noise
let seed = 1234567; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; };
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const add = (i, l, r) => { if (i >= 0 && i < N) { L[i] += l; R[i] += r; } };

// sidechain envelope from kicks (ducks pads, bass and arp)
const duck = new Float32Array(N).fill(1);
function kick(t, gain = 1) {
  const s0 = Math.floor(t * SR), len = Math.floor(0.42 * SR); let ph = 0;
  for (let k = 0; k < len; k++) {
    const tt = k / SR, f = 45 + 110 * Math.exp(-tt * 32);
    ph += 2 * Math.PI * f / SR;
    const env = Math.exp(-tt * 7.5) * (tt < 0.003 ? tt / 0.003 : 1);
    const click = k < 120 ? rnd() * 0.25 * (1 - k / 120) : 0;
    const v = (Math.sin(ph) * env + click) * 0.9 * gain;
    add(s0 + k, v, v);
  }
  const dl = Math.floor(0.28 * SR);
  for (let k = 0; k < dl; k++) { const i = s0 + k; if (i < N) duck[i] = Math.min(duck[i], 0.25 + 0.75 * (k / dl) ** 1.6); }
}
function clap(t, gain = 1) {
  const s0 = Math.floor(t * SR), len = Math.floor(0.22 * SR); let lp = 0, hp = 0, prev = 0;
  for (let k = 0; k < len; k++) {
    const tt = k / SR; const bursts = [0, 0.011, 0.022].reduce((a, o) => a + (tt >= o ? Math.exp(-(tt - o) * 90) : 0), 0) * 0.5 + Math.exp(-tt * 18) * 0.5;
    const n = rnd(); lp += 0.35 * (n - lp); hp = lp - prev; prev = lp;
    const v = hp * bursts * 0.55 * gain; add(s0 + k, v * 0.9, v * 1.1);
  }
}
function hat(t, open = false, gain = 1) {
  const s0 = Math.floor(t * SR), len = Math.floor((open ? 0.24 : 0.05) * SR); let prev = 0;
  for (let k = 0; k < len; k++) { const n = rnd(); const h = n - prev; prev = n; const v = h * Math.exp(-(k / SR) * (open ? 12 : 70)) * 0.12 * gain; add(s0 + k, v * 0.8, v * 1.2); }
}
// detuned saw voice with one-pole lowpass
function saws(t, dur, midi, { gain = 0.08, cutoff = 2200, detune = 0.12, voices = 3, attack = 0.01, release = 0.12, pump = true, pan = 0 } = {}) {
  const s0 = Math.floor(t * SR), len = Math.floor((dur + release) * SR);
  const f = mtof(midi), phases = Array.from({ length: voices * 2 }, (_, i) => (i * 0.37) % 1);
  let yl = 0, yr = 0; const a = 1 - Math.exp(-2 * Math.PI * cutoff / SR);
  for (let k = 0; k < len; k++) {
    const tt = k / SR; const env = Math.min(1, tt / attack) * (tt > dur ? Math.exp(-(tt - dur) / release * 4) : 1);
    let l = 0, r = 0;
    for (let v = 0; v < voices; v++) {
      const d = (v - (voices - 1) / 2) * detune / 12;
      phases[v] = (phases[v] + f * 2 ** d / SR) % 1; phases[v + voices] = (phases[v + voices] + f * 2 ** (-d * 0.9) / SR) % 1;
      l += phases[v] * 2 - 1; r += phases[v + voices] * 2 - 1;
    }
    yl += a * (l / voices - yl); yr += a * (r / voices - yr);
    const i = s0 + k, g = env * gain * (pump && i < N ? duck[i] : 1);
    add(i, yl * g * (1 - pan * 0.5), yr * g * (1 + pan * 0.5));
  }
}
function bass(t, dur, midi, gain = 0.22) {
  const s0 = Math.floor(t * SR), len = Math.floor((dur + 0.05) * SR); let ph = 0, ps = 0, y = 0;
  for (let k = 0; k < len; k++) {
    const tt = k / SR, f = mtof(midi); ph = (ph + f / SR) % 1; ps += 2 * Math.PI * f / SR;
    const cut = 300 + 1400 * Math.exp(-tt * 9); const a = 1 - Math.exp(-2 * Math.PI * cut / SR);
    y += a * ((ph * 2 - 1) - y);
    const env = Math.min(1, tt / 0.004) * (tt > dur ? Math.exp(-(tt - dur) * 60) : 1);
    const i = s0 + k; const v = (y * 0.45 + Math.sin(ps) * 0.75) * env * gain * (i < N ? duck[i] : 1);
    add(i, v, v);
  }
}
function pluck(t, midi, gain = 0.06, pan = 0) {
  const s0 = Math.floor(t * SR), len = Math.floor(0.32 * SR); let ph = 0, y = 0;
  for (let k = 0; k < len; k++) {
    const tt = k / SR; ph = (ph + mtof(midi) / SR) % 1; const sq = ph < 0.5 ? 1 : -1;
    const cut = 900 + 4500 * Math.exp(-tt * 22); const a = 1 - Math.exp(-2 * Math.PI * cut / SR); y += a * (sq - y);
    const i = s0 + k; const v = y * Math.exp(-tt * 11) * gain * (i < N ? 0.55 + 0.45 * duck[i] : 1);
    add(i, v * (1 - pan), v * (1 + pan));
    // ping-pong delay (3/16)
    const d1 = i + Math.floor(beat * 0.75 * SR), d2 = i + Math.floor(beat * 1.5 * SR);
    add(d1, 0, v * 0.35); add(d2, v * 0.18, 0);
  }
}
function riser(tEnd, len = 2 * beat * 2, gain = 0.09) {
  const s0 = Math.floor((tEnd - len) * SR), n = Math.floor(len * SR); let y = 0, prev = 0;
  for (let k = 0; k < n; k++) {
    const x = k / n; const cut = 400 + 7000 * x * x; const a = 1 - Math.exp(-2 * Math.PI * cut / SR);
    const nz = rnd(); y += a * (nz - y); const hp = y - prev; prev = y;
    const v = hp * x * x * gain * 3; add(s0 + k, v * (1 - x * 0.3), v * (1 + x * 0.3));
  }
}
function impact(t, gain = 0.5) {
  const s0 = Math.floor(t * SR), n = Math.floor(1.6 * SR); let ph = 0;
  for (let k = 0; k < n; k++) { const tt = k / SR; ph += 2 * Math.PI * (38 + 40 * Math.exp(-tt * 6)) / SR; const v = Math.sin(ph) * Math.exp(-tt * 2.4) * gain + rnd() * Math.exp(-tt * 14) * 0.08; add(s0 + k, v, v); }
}

// Progression: Am F C G (one bar each)
const prog = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 52, 55, 60], [55, 59, 62, 67]];
const roots = [45, 41, 48, 43];
const bars = Math.ceil(total / bar);
for (let b = 0; b < bars; b++) {
  const t0 = b * bar; if (t0 > endT) break;
  const ch = prog[b % 4], root = roots[b % 4];
  const inBreak = t0 >= breakA - 1e-3 && t0 < breakB - 1e-3;
  const intro = t0 < dropT - 1e-3;
  const full = !intro && !inBreak && t0 < endT - bar;
  const introCut = intro ? 500 + 2500 * (t0 / Math.max(dropT, 1)) : inBreak ? 900 : 2400;
  // pads
  for (const m of ch) saws(t0, bar * 0.98, m, { gain: intro || inBreak ? 0.05 : 0.045, cutoff: introCut, pump: full, attack: intro || inBreak ? 0.25 : 0.01, release: 0.3, pan: (m % 3 - 1) * 0.4 });
  for (let q = 0; q < 4; q++) {
    const tb = t0 + q * beat;
    if (full) { kick(tb); hat(tb + beat / 2, true, 0.8); if (q % 2 === 1) clap(tb); }
    if (full || (inBreak && t0 >= breakB - 2 * bar)) { hat(tb, false, 0.7); hat(tb + beat / 4, false, 0.45); hat(tb + beat * 0.75, false, 0.5); }
    if (intro && t0 >= dropT - 2 * bar) hat(tb, false, 0.6);
    if (inBreak && t0 >= breakB - bar) kick(tb, 0.8 * (q + 1) / 4);
    // bass: 8ths with octave bounce
    if (full) { bass(tb, beat * 0.42, root); bass(tb + beat / 2, beat * 0.42, root + (q === 3 ? 12 : 0)); }
    // arp: 16ths over chord tones
    if (full || inBreak) for (let s = 0; s < 4; s++) { const n = ch[(q * 4 + s) % 4] + 12 + (s === 3 ? 12 : 0); pluck(tb + s * beat / 4, n, inBreak ? 0.04 : 0.05, (s % 2 ? 0.35 : -0.35)); }
  }
}
// hits on scene changes, riser into the drop and out of the breakdown
riser(dropT, 4 * beat, 0.12); impact(dropT, 0.55);
riser(breakB, 4 * beat, 0.1); impact(breakB, 0.45);
for (const s of tl.scenes) if (!['hook', 'title', 'ocr'].includes(s.id) && s.start < endT) { riser(s.start, 2 * beat, 0.035); }
riser(endT, 4 * beat, 0.1); impact(endT, 0.42);
// final chord ring-out
for (const m of prog[0]) saws(endT, 3.0, m, { gain: 0.05, cutoff: 1800, pump: false, attack: 0.02, release: 1.4 });

// simple stereo reverb (Schroeder) on the bus, then soft clip and fade
function reverb(x, mix = 0.16) {
  const combs = [1557, 1617, 1491, 1422].map((d) => ({ d: Math.round(d * SR / 44100), buf: new Float32Array(Math.round(d * SR / 44100)), i: 0 }));
  const aps = [225, 556].map((d) => ({ d: Math.round(d * SR / 44100), buf: new Float32Array(Math.round(d * SR / 44100)), i: 0 }));
  const y = new Float32Array(x.length);
  for (let n = 0; n < x.length; n++) {
    let s = 0; for (const c of combs) { const o = c.buf[c.i]; c.buf[c.i] = x[n] + o * 0.78; c.i = (c.i + 1) % c.d; s += o; }
    s /= 4; for (const a of aps) { const o = a.buf[a.i]; const v = -s * 0.5 + o; a.buf[a.i] = s + o * 0.5; a.i = (a.i + 1) % a.d; s = v; }
    y[n] = x[n] * (1 - mix) + s * mix;
  }
  return y;
}
const RL = reverb(L), RR = reverb(R, 0.17);
let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(RL[i]), Math.abs(RR[i]));
const norm = 0.89 / peak, fadeIn = 0.08 * SR, fadeOut = Math.floor(2.0 * SR), endS = Math.min(N, Math.floor((endT + 3.2) * SR));
const buf = Buffer.alloc(44 + endS * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + endS * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(endS * 4, 40);
for (let i = 0; i < endS; i++) {
  let g = norm; if (i < fadeIn) g *= i / fadeIn; if (i > endS - fadeOut) g *= (endS - i) / fadeOut;
  const sl = Math.tanh(RL[i] * g * 1.1), sr = Math.tanh(RR[i] * g * 1.1);
  buf.writeInt16LE(Math.round(sl * 32000), 44 + i * 4); buf.writeInt16LE(Math.round(sr * 32000), 46 + i * 4);
}
writeFileSync(join(root, 'demo/audio/music.wav'), buf);
console.log(`music.wav ${(endS / SR).toFixed(1)} s, ${BPM} BPM, drop at ${dropT.toFixed(2)} s, breakdown ${breakA.toFixed(1)}–${breakB.toFixed(1)} s`);
