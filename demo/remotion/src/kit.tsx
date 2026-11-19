import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame } from 'remotion';
import { C, DISPLAY, FONT } from './theme';
import { BEAT, FPS, SCENES, SECTIONS, scene } from './data';
import { chunk } from '../../render/chunks.mjs';

export const EASE = Easing.bezier(0.22, 1, 0.36, 1);
export const INOUT = Easing.bezier(0.65, 0, 0.35, 1);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const tw = (t: number, a: number, b: number, from = 0, to = 1, easing = EASE) =>
  interpolate(t, [a, b], [from, to], { ...clamp, easing });
export const sp = (f: number, atSec: number, cfg: Partial<{ damping: number; stiffness: number; mass: number }> = {}) => {
  const fr = f - Math.round(atSec * FPS);
  if (fr < 0) return 0;
  return spring({ frame: fr, fps: FPS, config: { damping: 15, stiffness: 170, mass: 0.8, ...cfg } });
};
export const useLocal = () => { const f = useCurrentFrame(); return { f, t: f / FPS }; };
export const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const beatPulse = (globalT: number, k = 7) => Math.exp(-(((globalT % BEAT) + BEAT) % BEAT) / BEAT * k);

/** Words spring in one after another. */
export function Words({ text, at, f, stagger = 0.05, size = 64, weight = 700, color = C.ink, hi = [], hiColor = C.accent, font = DISPLAY, style, lh = 1.12 }: {
  text: string; at: number; f: number; stagger?: number; size?: number; weight?: number; color?: string; hi?: string[]; hiColor?: string; font?: string; style?: React.CSSProperties; lh?: number;
}) {
  const ws = text.split(' ');
  return (
    <div style={{ fontFamily: font, fontSize: size, fontWeight: weight, color, lineHeight: lh, letterSpacing: '-0.025em', ...style }}>
      {ws.map((w, i) => {
        const p = sp(f, at + i * stagger, { damping: 14, stiffness: 210, mass: 0.7 });
        const key = w.toLowerCase().replace(/[^a-z0-9]/g, '');
        return (
          <span key={i} style={{
            display: 'inline-block', marginRight: '0.24em', opacity: Math.min(1, p * 1.5),
            transform: `translateY(${(1 - p) * 0.6}em) scale(${0.85 + 0.15 * p})`, filter: p < 0.98 ? `blur(${(1 - Math.min(1, p)) * 10}px)` : undefined,
            color: hi.includes(key) ? hiColor : undefined,
          }}>{w}</span>
        );
      })}
    </div>
  );
}

export function Chip({ children, color = C.ink2, bg = 'rgba(23, 25, 32, 0.88)', dot, style, size = 22 }: {
  children: React.ReactNode; color?: string; bg?: string; dot?: string; style?: React.CSSProperties; size?: number;
}) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: `${size * 0.45}px ${size * 0.8}px`, borderRadius: 999, background: bg, border: `1px solid ${C.hair}`, color, fontFamily: FONT, fontSize: size, fontWeight: 600, whiteSpace: 'nowrap', ...style }}>
      {dot && <span style={{ width: size * 0.45, height: size * 0.45, borderRadius: size * 0.14, background: dot }} />}
      {children}
    </div>
  );
}

/** Pops in with a spring and leaves with a quick fade. */
export function Pop({ f, at, out, children, style, from = 30 }: { f: number; at: number; out?: number; children: React.ReactNode; style?: React.CSSProperties; from?: number }) {
  const p = sp(f, at, { damping: 13, stiffness: 190, mass: 0.7 });
  const o = out === undefined ? 1 : 1 - tw(f / FPS, out, out + 0.18);
  return <div style={{ position: 'absolute', opacity: Math.min(1, p * 1.6) * o, transform: `translateY(${(1 - p) * from}px) scale(${0.8 + 0.2 * p})`, ...style }}>{children}</div>;
}

// Logo: the app icon's 3×3 tiles, one indigo.
const OPA = [0.34, 0.82, 1, 0.82, 0.34, 0.82, 0.34, 0.82, 0.34];
const ORDER = [4, 1, 0, 3, 5, 7, 2, 6, 8];
export const logoTile = (i: number, size: number) => ({ x: ((1 + 8 * (i % 3)) / 24) * size, y: ((1 + 8 * Math.floor(i / 3)) / 24) * size, s: (6.4 / 24) * size, r: (1.8 / 24) * size });
export function Logo({ size, f, at, skip = -1, pulse = 0 }: { size: number; f: number; at: number; skip?: number; pulse?: number }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, transform: `scale(${1 + pulse})` }}>
      {OPA.map((o, i) => {
        if (i === skip) return null;
        const g = logoTile(i, size);
        const p = sp(f, at + ORDER[i] * 0.04, { damping: 12, stiffness: 150, mass: 0.8 });
        const dx = (hash(i) - 0.5) * 1100 * (1 - p), dy = (hash(i + 9) - 0.5) * 800 * (1 - p), rot = (hash(i + 3) - 0.5) * 260 * (1 - p);
        return <div key={i} style={{ position: 'absolute', left: g.x, top: g.y, width: g.s, height: g.s, borderRadius: g.r, background: i === 2 ? C.accent : C.ink, opacity: (i === 2 ? 1 : o) * Math.min(1, p * 2), transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(${p})` }} />;
      })}
    </div>
  );
}

// Moving tesserae behind everything, pulsing with the music.
export function Background() {
  const f = useCurrentFrame();
  const t = f / FPS;
  const S = 72, COLS = Math.ceil(1920 / S) + 2, ROWS = Math.ceil(1080 / S) + 2;
  const inten = t < SECTIONS.drop ? 0.2 + 0.4 * (t / SECTIONS.drop) : t >= SECTIONS.breakA && t < SECTIONS.breakB ? 0.28 : t > SECTIONS.end ? Math.max(0, 1 - (t - SECTIONS.end) / 2.5) : 1;
  const ph = ((t % BEAT) + BEAT) % BEAT / BEAT, bi = Math.floor(t / BEAT);
  const dx = (t * 16) % S, dy = (t * 9) % S;
  const rects: React.ReactNode[] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const i = r * COLS + c, h = hash(i);
    const twk = 0.5 + 0.5 * Math.sin(t * (0.5 + h * 1.3) + h * 20);
    const d = (c + r * 1.3) / (COLS + ROWS * 1.3);
    const dir = bi % 2 ? d : 1 - d;
    const wave = Math.max(0, 1 - Math.abs(ph * 1.3 - dir) * 7);
    const v = 0.2 * twk * twk + inten * (0.75 * wave + 0.25 * Math.exp(-ph * 6) * h);
    const col = h < 0.74 ? C.accent : h < 0.89 ? C.device : C.mark;
    rects.push(<rect key={i} x={c * S - dx - S + 7} y={r * S - dy - S + 7} width={S - 14} height={S - 14} rx={13} fill={col} opacity={0.018 + v * 0.17} />);
  }
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080}>{rects}</svg>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 75% 70% at 50% 46%, rgba(8,9,13,0) 35%, rgba(5,6,9,0.9) 100%)' }} />
    </AbsoluteFill>
  );
}

// Tile wipe across scene changes (skipped where a scene does its own match cut).
const WIPES = SCENES.slice(1).filter((s) => s.id !== 'title').map((s) => s.from);
const WIPE_COLORS = [C.accentDeep, '#2B3BC0', '#3F52E0', '#26349F'];
export function TileWipe() {
  const f = useCurrentFrame();
  const b = WIPES.find((x) => f >= x - 11 && f < x + 13);
  if (b === undefined) return null;
  const S = 120, COLS = 16, ROWS = 9, tiles: React.ReactNode[] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const i = r * COLS + c, delay = ((c / COLS) * 0.75 + (r / ROWS) * 0.25) * 6 + hash(i) * 1.5;
    const s = Math.min(tw(f, b - 11 + delay, b - 6 + delay, 0, 1, INOUT), 1 - tw(f, b + 1 + delay, b + 6 + delay, 0, 1, INOUT));
    if (s <= 0.001) continue;
    tiles.push(<div key={i} style={{ position: 'absolute', left: c * S, top: r * S, width: S, height: S, background: WIPE_COLORS[Math.floor(hash(i + 50) * 4)], transform: `scale(${s * 1.03}) rotate(${(1 - s) * 60}deg)`, borderRadius: (1 - s) * 34 }} />);
  }
  return <AbsoluteFill>{tiles}</AbsoluteFill>;
}

// Karaoke captions from the narration's word timings.
const CHUNKS = SCENES.flatMap((s) => chunk(s.words));
export function Captions() {
  const t = useCurrentFrame() / FPS;
  const i = CHUNKS.findIndex((c, k) => t >= c.start - 0.08 && t < (CHUNKS[k + 1] ? Math.min(CHUNKS[k + 1].start - 0.08, c.end + 0.7) : c.end + 0.7));
  if (i < 0) return null;
  const c = CHUNKS[i];
  const p = tw(t, c.start - 0.08, c.start + 0.12);
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 34 }}>
      <div style={{ maxWidth: 1500, padding: '12px 30px 14px', borderRadius: 20, background: 'rgba(10, 11, 16, 0.82)', border: `1px solid ${C.hair}`, fontFamily: FONT, fontSize: 40, fontWeight: 600, letterSpacing: '-0.01em', textAlign: 'center', opacity: p, transform: `translateY(${(1 - p) * 14}px) scale(${0.97 + 0.03 * p})` }}>
        {c.words.map((w, k) => {
          const active = t >= w.start - 0.02 && t < w.end + 0.06;
          const said = t >= w.end + 0.06;
          return (
            <span key={k} style={{ display: 'inline-block', marginRight: k < c.words.length - 1 ? '0.25em' : 0, color: active ? '#FFFFFF' : said ? C.ink : 'rgba(236, 238, 245, 0.42)', transform: `scale(${active ? 1.06 : 1})`, boxShadow: active ? `inset 0 -5px 0 ${C.accent}` : undefined }}>{w.text}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

const VOICE = SCENES.map((s) => [s.voiceAt, s.voiceAt + s.voiceDuration]);
export function musicVolume(t: number) {
  let d = 0;
  for (const [a, b] of VOICE) d = Math.max(d, Math.min(tw(t, a - 0.35, a - 0.05, 0, 1, Easing.linear), tw(t, b + 0.1, b + 0.6, 1, 0, Easing.linear)));
  return 0.85 - 0.56 * d;
}

export function FadeOut() {
  const f = useCurrentFrame();
  const end = scene('close').end;
  const o = tw(f / FPS, end - 1.4, end - 0.1, 0, 1, Easing.linear);
  return o > 0 ? <AbsoluteFill style={{ background: '#000', opacity: o }} /> : null;
}

export function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.ink3, ...style }}>{children}</div>;
}
