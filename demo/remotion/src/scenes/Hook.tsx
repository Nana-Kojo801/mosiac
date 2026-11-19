import React from 'react';
import { AbsoluteFill, Easing, interpolateColors } from 'remotion';
import { C, DISPLAY, FONT } from '../theme';
import { cue, groups, scene } from '../data';
import { Chip, beatPulse, hash, sp, tw, useLocal } from '../kit';

// Fictional sample (packages/fixtures): three documents, each anonymous alone.
const CARDS = [
  { role: 'Published', title: 'Interim report', pre: 'Participants were drawn from ward staff and from the ', key: 'overnight pharmacy team', post: '.' },
  { role: 'Published', title: 'Onboarding case study', pre: 'One participant joined with the ', key: 'winter onboarding cohort', post: ', after the January rota change.' },
  { role: 'Draft', title: 'Interview P-07', pre: 'I came over after my ', key: 'transfer from the coastal satellite clinic', post: '.' },
];
const GRID = 10, TILE = 46, GAP = 8, GX = 1310, GY = 520;
const span = GRID * TILE + (GRID - 1) * GAP;
const tilePos = (i: number) => ({ x: GX - span / 2 + (i % GRID) * (TILE + GAP), y: GY - span / 2 + Math.floor(i / GRID) * (TILE + GAP) });

export function Hook() {
  const { f, t } = useLocal();
  const S = scene('hook');
  const steps = groups.original as { label: string; count: number; members: number[] }[];
  const cThree = cue('hook', 'Three'), cAnon = cue('hook', 'anonymous'), cBut = cue('hook', 'But'), cPut = cue('hook', 'put');
  const stepT = [cBut + 0.1, cue('hook', 'side', 1), cue('hook', 'point'), cue('hook', 'one', 1)];
  const k = stepT.reduce((acc, s, i) => (t >= s ? i : acc), -1);
  const dur = S.dur / 30;
  const last = steps[steps.length - 1].members[0];
  const lp = tilePos(last);
  const zStart = dur - 1.25;
  const z = tw(t, zStart, dur, 0, 1, Easing.bezier(0.7, 0, 0.9, 0.4));
  const scale = Math.pow(70, z);
  const cx = lp.x + TILE / 2, cy = lp.y + TILE / 2;
  const mv = sp(f, cPut, { damping: 18, stiffness: 120 });
  const deadAt = (i: number) => { for (let s = 1; s < steps.length; s++) if (!steps[s].members.includes(i)) return stepT[s]; return Infinity; };
  const shown = k >= 0 ? steps[k] : null;
  const numP = k >= 0 ? sp(f, stepT[k], { damping: 12, stiffness: 220 }) : 0;

  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `${cx}px ${cy}px`, transform: `translate(${(960 - cx) * z}px, ${(540 - cy) * z}px) scale(${scale})` }}>
        {CARDS.map((c, i) => {
          const p = sp(f, cThree + i * 0.14, { damping: 14, stiffness: 150 });
          const ax = 960 + (i - 1) * 560, ay = 470;
          const bx = 420, by = 250 + i * 270;
          const x = ax + (bx - ax) * mv, y = ay + (by - ay) * mv, s = 1 - 0.36 * mv;
          const stamp = sp(f, cAnon + i * 0.09, { damping: 11, stiffness: 240 });
          const hiAt = stepT[i + 1];
          const hl = tw(t, hiAt, hiAt + 0.25);
          return (
            <div key={i} style={{ position: 'absolute', left: x - 240, top: y - 165, width: 480, height: 330, transform: `translateY(${(1 - p) * 700}px) rotate(${(1 - p) * (i - 1) * -28 + (1 - mv) * (i - 1) * 3}deg) scale(${s})`, opacity: Math.min(1, p * 2), background: C.surface, borderRadius: 26, border: `1px solid ${C.hairStrong}`, boxShadow: '0 30px 60px -20px rgba(0,0,0,0.7)', padding: 30, fontFamily: FONT }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ padding: '6px 14px', borderRadius: 999, fontSize: 18, fontWeight: 700, background: c.role === 'Draft' ? C.accentSoft : C.surface2, color: c.role === 'Draft' ? C.accentText : C.ink2 }}>{c.role}</span>
                <span style={{ fontSize: 26, fontWeight: 700, color: C.ink }}>{c.title}</span>
              </div>
              <div style={{ marginTop: 22, fontSize: 25, lineHeight: 1.5, color: C.ink2 }}>
                {c.pre}
                <span style={{ color: hl > 0 ? C.ink : undefined, background: `linear-gradient(${C.markBg}, ${C.markBg}) no-repeat 0 0 / ${hl * 100}% 100%`, boxShadow: hl > 0 ? `inset 0 -3px 0 ${C.mark}` : undefined, borderRadius: 4 }}>{c.key}</span>
                {c.post}
              </div>
              <div style={{ position: 'absolute', left: 30, bottom: 26, transform: `scale(${stamp})`, transformOrigin: 'left center', opacity: stamp }}>
                <Chip color={C.ok} bg={C.okBg} size={20}>✓ No names</Chip>
              </div>
            </div>
          );
        })}

        {/* connectors from each highlighted detail to the group */}
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
          {[0, 1, 2].map((i) => {
            const at = stepT[i + 1];
            const d = tw(t, at - 0.05, at + 0.3), o = 1 - tw(t, at + 0.7, at + 1.1) * 0.75;
            const x1 = 420 + 154, y1 = 250 + i * 270, x2 = GX - span / 2 - 24, y2 = GY;
            const len = Math.hypot(x2 - x1, y2 - y1);
            return d > 0 ? <path key={i} d={`M${x1} ${y1} C ${x1 + 200} ${y1}, ${x2 - 200} ${y2}, ${x2} ${y2}`} stroke={C.mark} strokeWidth={4} fill="none" strokeDasharray={len * 1.2} strokeDashoffset={len * 1.2 * (1 - d)} opacity={o} strokeLinecap="round" /> : null;
          })}
        </svg>

        {steps[0].members.map((i) => {
          const g = tilePos(i), h = hash(i + 7);
          const p = sp(f, cBut + ((i % GRID) + Math.floor(i / GRID)) * 0.018, { damping: 13, stiffness: 220 });
          const da = deadAt(i) + h * 0.16;
          const dead = Number.isFinite(da) ? tw(t, da, da + 0.22) : 0;
          const isLast = i === last;
          const fin = isLast ? tw(t, stepT[3], stepT[3] + 0.3) : 0;
          const pulse = isLast && t > stepT[3] + 0.3 && t < zStart ? beatPulse(S.start + t, 6) * 0.14 : 0;
          return <div key={i} style={{ position: 'absolute', left: g.x, top: g.y, width: TILE, height: TILE, borderRadius: 11, background: interpolateColors(fin, [0, 1], [C.accent, C.accentDeep]), opacity: Math.min(1, p * 2) * (1 - 0.86 * dead), transform: `scale(${p * (1 - 0.25 * dead) * (1 + 0.18 * fin + pulse)})`, boxShadow: fin > 0 ? `0 0 0 ${4 * fin}px rgba(142,155,255,0.35)` : undefined }} />;
        })}

        <div style={{ position: 'absolute', left: GX - span / 2, top: GY - span / 2 - 150, width: span, display: 'flex', alignItems: 'baseline', gap: 22, opacity: Math.min(1, sp(f, cBut) * 2), fontFamily: DISPLAY }}>
          <div style={{ fontSize: 112, fontWeight: 800, color: C.ink, letterSpacing: '-0.04em', transform: `translateY(${(1 - numP) * 30}px)`, opacity: 0.4 + 0.6 * numP, minWidth: 190 }}>{shown?.count ?? 100}</div>
          <div style={{ fontSize: 28, fontWeight: 600, color: C.ink2, lineHeight: 1.25 }}>
            {k <= 0 ? 'people could match' : shown?.label}
            <div style={{ fontSize: 22, color: C.ink3, fontWeight: 500 }}>{k === steps.length - 1 ? 'Only one person fits' : 'fictional population'}</div>
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 56, top: 44, opacity: 1 - z }}><Chip dot={C.mark}>Fictional illustration</Chip></div>
    </AbsoluteFill>
  );
}
