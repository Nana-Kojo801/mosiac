import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, DISPLAY, FONT } from '../theme';
import { cue } from '../data';
import { Chip, Words, hash, sp, tw, useLocal } from '../kit';

function Redacted({ text, at, t, tag }: { text: string; at: number; t: number; tag: string }) {
  const p = tw(t, at, at + 0.22);
  const tg = tw(t, at + 0.1, at + 0.3);
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span style={{ opacity: 1 - p * 0.9 }}>{text}</span>
      <span style={{ position: 'absolute', left: -4, top: 4, bottom: 4, width: `calc(${p * 100}% + 8px)`, background: '#000', borderRadius: 6 }} />
      <span style={{ position: 'absolute', left: 0, top: -22, fontSize: 15, fontWeight: 800, letterSpacing: '0.08em', color: C.crit, background: C.critBg, padding: '3px 9px', borderRadius: 6, opacity: tg, transform: `translateY(${(1 - tg) * 8}px)` }}>{tag}</span>
    </span>
  );
}

const NODES = [
  { x: 1150, y: 300, label: 'Interim report' },
  { x: 1690, y: 300, label: 'Case study' },
  { x: 1690, y: 720, label: 'Blog post' },
  { x: 1150, y: 720, label: 'Conference talk' },
];

export function Problem() {
  const { f, t } = useLocal();
  const cRed = cue('problem', 'Redaction'), cNames = cue('problem', 'names'), cEmails = cue('problem', 'emails');
  const cMosaic = cue('problem', 'Mosaic'), cComb = cue('problem', 'combines'), cPub = cue('problem', 'published');
  const card = sp(f, cRed, { damping: 15, stiffness: 160 });
  const scan = tw(t, cRed + 0.4, cEmails + 0.35, 0, 1);
  const right = sp(f, cMosaic - 0.1, { damping: 15, stiffness: 150 });
  const dim = tw(t, cMosaic - 0.1, cMosaic + 0.3);
  const ind = tw(t, cComb - 0.2, cComb + 0.1);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <div style={{ position: 'absolute', left: 56, top: 44 }}><Chip dot={C.mark}>Illustration</Chip></div>
      {/* left: what redaction looks for */}
      <div style={{ position: 'absolute', left: 140, top: 200, width: 700, opacity: 1 - dim * 0.35, transform: `scale(${1 - dim * 0.06})`, transformOrigin: 'left center' }}>
        <Words text="Redaction tools" at={cRed - 0.15} f={f} size={60} weight={800} color={C.ink2} />
        <div style={{ marginTop: 30, padding: '36px 40px', borderRadius: 26, background: C.surface, border: `1px solid ${C.hairStrong}`, fontSize: 30, lineHeight: 2.5, color: C.ink2, position: 'relative', overflow: 'hidden', transform: `translateY(${(1 - card) * 80}px)`, opacity: Math.min(1, card * 2) }}>
          <div>Spoke with <Redacted text="Alex Rivera" at={cNames} t={t} tag="NAME" /> about nights.</div>
          <div>Contact: <Redacted text="a.rivera@example.org" at={cEmails} t={t} tag="EMAIL" /></div>
          <div><span style={{ borderRadius: 6, boxShadow: ind > 0 ? `0 0 0 ${3 * ind}px ${C.mark}` : undefined, background: ind > 0 ? C.markBg : undefined, color: ind > 0 ? C.ink : undefined }}>Moved here from the coastal clinic.</span></div>
          {scan > 0 && scan < 1 && <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${scan * 100}%`, width: 4, background: C.crit, boxShadow: `0 0 24px 6px rgba(255,138,147,0.45)` }} />}
          <div style={{ position: 'absolute', right: 26, top: 22, opacity: ind, transform: `scale(${0.8 + 0.2 * ind})` }}><Chip color={C.mark} bg="rgba(58,42,14,0.95)" size={18}>Still revealing</Chip></div>
        </div>
      </div>
      {/* right: what Mosaic checks */}
      <div style={{ position: 'absolute', inset: 0, opacity: Math.min(1, right * 2) }}>
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
          {NODES.map((n, i) => {
            const d = tw(t, cComb - 0.1 + i * 0.12, cComb + 0.35 + i * 0.12);
            const x1 = 1420, y1 = 510;
            const len = Math.hypot(n.x - x1, n.y - y1);
            const dot = ((t * 0.9 + hash(i)) % 1);
            return (
              <g key={i}>
                <line x1={x1} y1={y1} x2={n.x} y2={n.y} stroke={C.mark} strokeWidth={4} strokeDasharray={len} strokeDashoffset={len * (1 - d)} strokeLinecap="round" opacity={0.85} />
                {d >= 1 && <circle cx={x1 + (n.x - x1) * dot} cy={y1 + (n.y - y1) * dot} r={8} fill={C.mark} />}
              </g>
            );
          })}
        </svg>
        {NODES.map((n, i) => {
          const p = sp(f, cMosaic + 0.25 + i * 0.08, { damping: 13, stiffness: 200 });
          const pulse = tw(t, cPub, cPub + 0.15) - tw(t, cPub + 0.15, cPub + 0.45);
          return (
            <div key={i} style={{ position: 'absolute', left: n.x - 130, top: n.y - 50, width: 260, height: 100, borderRadius: 22, background: C.surface, border: `1px solid ${C.hairStrong}`, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: 24, transform: `scale(${p * (1 + pulse * 0.08)})`, opacity: Math.min(1, p * 2) }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.ink3, letterSpacing: '0.08em' }}>PUBLISHED</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: C.ink }}>{n.label}</div>
            </div>
          );
        })}
        <div style={{ position: 'absolute', left: 1420 - 160, top: 510 - 70, width: 320, height: 140, borderRadius: 28, background: C.accentSoft, border: `2px solid ${C.accent}`, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', transform: `scale(${right})`, boxShadow: '0 30px 60px -20px rgba(0,0,0,0.7)' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.accentText, letterSpacing: '0.08em' }}>MOSAIC CHECKS</div>
          <div style={{ fontFamily: DISPLAY, fontSize: 38, fontWeight: 800, color: C.ink }}>Your next draft</div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
