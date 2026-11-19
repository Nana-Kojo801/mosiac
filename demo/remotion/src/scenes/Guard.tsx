import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, DISPLAY, FONT, MONO } from '../theme';
import { cue, probe, scene } from '../data';
import { Chip, Words, sp, tw, useLocal } from '../kit';

const net = (probe as { network: { rawSdkCanaryRequests: number; guardedPrivateCanaryRequests: number } }).network;
const BX = 170, CX = 1250, BOXW = 500, Y = 330, H = 300, PY = Y + H / 2;

function Packet({ t, at, x0, x1, bounceAt }: { t: number; at: number; x0: number; x1: number; bounceAt?: number }) {
  if (t < at) return null;
  let x: number; let o = 1;
  if (bounceAt === undefined) { x = x0 + (x1 - x0) * tw(t, at, at + 0.9); o = 1 - tw(t, at + 0.9, at + 1.1); }
  else { const go = tw(t, at, at + 0.55); const back = tw(t, at + 0.55, at + 1.0); x = x0 + (bounceAt - x0) * go - (bounceAt - x0) * 0.45 * back; o = 1 - tw(t, at + 0.75, at + 1.05); }
  return (
    <div style={{ position: 'absolute', left: x - 22, top: PY - 22, width: 44, height: 44, borderRadius: 12, background: C.mark, opacity: o, boxShadow: `0 0 30px 6px rgba(255,182,72,0.4)` }}>
      <div style={{ position: 'absolute', top: -34, left: -40, width: 124, textAlign: 'center', fontSize: 17, fontWeight: 700, color: C.mark }}>canary prompt</div>
    </div>
  );
}

function Stat({ x, label, value, color, bg, p, glow }: { x: number; label: string; value: number; color: string; bg: string; p: number; glow: number }) {
  return (
    <div style={{ position: 'absolute', left: x, top: 690, width: 460, height: 210, borderRadius: 28, background: bg, border: `2px solid ${color}`, padding: '22px 30px', opacity: Math.min(1, p * 2), transform: `translateY(${(1 - p) * 60}px) scale(${(0.9 + 0.1 * p) * (1 + glow * 0.06)})`, boxShadow: glow > 0 ? `0 0 ${60 * glow}px ${10 * glow}px ${color}55` : undefined }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: C.ink2 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 120, fontWeight: 800, color, lineHeight: 1.05, letterSpacing: '-0.04em' }}>{value}</div>
        <div style={{ fontSize: 22, color: C.ink2, lineHeight: 1.25 }}>private canary requests<br />reached the cloud</div>
      </div>
    </div>
  );
}

export function Guard() {
  const { f, t } = useLocal();
  const S = scene('guard');
  const cFound = cue('guard', 'found'), cBrowsers = cue('guard', 'browsers'), cQuiet = cue('guard', 'quietly'), cGuard = cue('guard', 'guard'), cBlocks = cue('guard', 'blocks'), cZero = cue('guard', 'Zero');
  const box = sp(f, cBrowsers - 0.2, { damping: 15, stiffness: 150 });
  const leak = tw(t, cQuiet, cQuiet + 0.9);
  const wall = (i: number) => sp(f, cGuard - 0.15 + i * 0.05, { damping: 11, stiffness: 230 });
  const hit = tw(t, cBlocks + 0.55, cBlocks + 0.6) - tw(t, cBlocks + 0.6, cBlocks + 0.9);
  const rawP = sp(f, cQuiet + 0.85);
  const gP = sp(f, cBlocks + 0.7);
  const glow = tw(t, cZero - 0.1, cZero + 0.3);
  const end = S.dur / 30;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Words text="We found a real gap." at={cFound - 0.3} f={f} size={86} weight={800} hi={['gap']} hiColor={C.crit} style={{ position: 'absolute', top: 70, width: '100%', textAlign: 'center' }} />
      <div style={{ position: 'absolute', top: 186, width: '100%', textAlign: 'center', opacity: tw(t, cBrowsers, cBrowsers + 0.4) }}>
        <Chip size={20}>Measured in Chromium with no built-in model · SDK probe in the repo</Chip>
      </div>

      <div style={{ position: 'absolute', left: BX, top: Y, width: BOXW, height: H, borderRadius: 28, background: C.surface, border: `2px solid ${C.hairStrong}`, padding: 28, transform: `translateX(${(1 - box) * -300}px)`, opacity: Math.min(1, box * 2) }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.ink3, letterSpacing: '0.06em' }}>BROWSER</div>
        <div style={{ fontFamily: DISPLAY, fontSize: 36, fontWeight: 800, color: C.ink, marginTop: 6, lineHeight: 1.15 }}>No built-in model available</div>
        <div style={{ marginTop: 26, fontFamily: MONO, fontSize: 22, color: C.device, background: C.deviceBg, padding: '10px 14px', borderRadius: 12, display: 'inline-block' }}>mode: ONLY_ON_DEVICE</div>
      </div>
      <div style={{ position: 'absolute', left: CX, top: Y, width: BOXW, height: H, borderRadius: 28, background: leak >= 1 ? C.critBg : C.surface, border: `2px solid ${leak >= 1 ? C.crit : C.hairStrong}`, padding: 28, transform: `translateX(${(1 - box) * 300}px) scale(${1 + 0.04 * (tw(t, cQuiet + 0.9, cQuiet + 1.0) - tw(t, cQuiet + 1.0, cQuiet + 1.3))})`, opacity: Math.min(1, box * 2) }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.ink3, letterSpacing: '0.06em' }}>CLOUD</div>
        <div style={{ fontFamily: DISPLAY, fontSize: 36, fontWeight: 800, color: C.ink, marginTop: 6, lineHeight: 1.15 }}>Cloud model endpoint</div>
        <div style={{ marginTop: 26, fontSize: 24, color: C.crit, fontWeight: 700, opacity: tw(t, cQuiet + 0.9, cQuiet + 1.1) }}>Private prompt arrived ✕</div>
      </div>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <line x1={BX + BOXW} y1={PY} x2={CX} y2={PY} stroke={leak > 0 ? C.crit : C.hairStrong} strokeWidth={4} strokeDasharray="14 12" strokeDashoffset={-t * 60} opacity={box} />
      </svg>
      <Packet t={t} at={cQuiet} x0={BX + BOXW} x1={CX} />
      <Packet t={t} at={cBlocks} x0={BX + BOXW} x1={CX} bounceAt={960 - 52} />

      {/* the guard: a wall of tiles */}
      {[0, 1, 2, 3, 4].map((i) => {
        const p = wall(i);
        return <div key={i} style={{ position: 'absolute', left: 960 - 30, top: Y - 10 + i * 66, width: 60, height: 58, borderRadius: 14, background: C.device, opacity: Math.min(1, p * 2), transform: `translate(${hit * 8}px, ${(1 - p) * -260}px) rotate(${(1 - p) * 40}deg)` }} />;
      })}
      <div style={{ position: 'absolute', left: 960 - 130, top: Y - 66, width: 260, textAlign: 'center', opacity: wall(0) }}><Chip color={C.device} bg={C.deviceBg} size={22}>Mosaic’s guard</Chip></div>

      <Stat x={420} label="SDK alone" value={rawP > 0.5 ? net.rawSdkCanaryRequests : 0} color={C.crit} bg="rgba(72,16,24,0.85)" p={rawP} glow={0} />
      <Stat x={1040} label="With Mosaic’s guard" value={net.guardedPrivateCanaryRequests} color={C.ok} bg="rgba(18,50,31,0.9)" p={gP} glow={glow * (1 - tw(t, end - 0.5, end))} />
    </AbsoluteFill>
  );
}
