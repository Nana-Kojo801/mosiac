import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, DISPLAY, FONT } from '../theme';
import { cue, scene } from '../data';
import { Chip, Logo, Words, beatPulse, sp, useLocal } from '../kit';

export function Close() {
  const { f, t } = useLocal();
  const S = scene('close');
  const cProt = cue('close', 'Protect'), cTry = cue('close', 'Try');
  const pulse = t > 0.8 ? beatPulse(S.start + t, 7) * 0.03 : 0;
  const cta = sp(f, cTry - 0.15, { damping: 11, stiffness: 190 });
  const gh = sp(f, cTry + 0.35);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <div style={{ position: 'absolute', top: 40, width: '100%', textAlign: 'center', opacity: sp(f, 0.6) }}><Chip size={22} dot={C.accent}>Built for #BuildHybridAI with Firebase AI Logic</Chip></div>
      <div style={{ position: 'absolute', left: 960 - 110, top: 140 }}><Logo size={220} f={f} at={0} pulse={pulse} /></div>
      <div style={{ position: 'absolute', top: 380, width: '100%', textAlign: 'center', fontFamily: DISPLAY, fontSize: 132, fontWeight: 800, color: C.ink, letterSpacing: '-0.05em' }}>
        {'Mosaic'.split('').map((ch, i) => {
          const q = sp(f, 0.2 + i * 0.04, { damping: 11, stiffness: 180 });
          return <span key={i} style={{ display: 'inline-block', opacity: Math.min(1, q * 2), transform: `translateY(${(1 - q) * 100}px)` }}>{ch}</span>;
        })}
      </div>
      <Words text="Protect the information you never realized you were revealing." at={cProt - 0.2} f={f} size={46} weight={600} color={C.ink2} hi={['never', 'realized']} style={{ position: 'absolute', top: 560, width: '100%', textAlign: 'center' }} />
      <div style={{ position: 'absolute', top: 680, width: '100%', display: 'flex', justifyContent: 'center' }}>
        <div style={{ padding: '20px 44px', borderRadius: 999, background: C.accent, color: C.accentInk, fontSize: 40, fontWeight: 800, transform: `scale(${cta * (1 + pulse)})`, opacity: Math.min(1, cta * 2) }}>Try it free · mosaic-4a9d2.web.app</div>
      </div>
      <div style={{ position: 'absolute', top: 810, width: '100%', textAlign: 'center', fontSize: 28, fontWeight: 600, color: C.ink3, opacity: Math.min(1, gh * 2), transform: `translateY(${(1 - gh) * 20}px)` }}>github.com/Nana-Kojo801/mosiac · open source (Apache-2.0)</div>
    </AbsoluteFill>
  );
}
