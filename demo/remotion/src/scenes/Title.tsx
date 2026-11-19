import React from 'react';
import { AbsoluteFill, interpolate, interpolateColors } from 'remotion';
import { C, DISPLAY } from '../theme';
import { cue, scene } from '../data';
import { INOUT, Logo, Words, beatPulse, logoTile, sp, tw, useLocal } from '../kit';

const SIZE = 300, LX = 960 - SIZE / 2, LY = 360 - SIZE / 2;

export function Title() {
  const { f, t } = useLocal();
  const S = scene('title');
  const g = logoTile(2, SIZE);
  const p = tw(t, 0, 0.6, 0, 1, INOUT);
  const pulse = t > 0.9 ? beatPulse(S.start + t, 7) * 0.035 : 0;
  const lerp = (a: number, b: number) => interpolate(p, [0, 1], [a, b]);
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: LX, top: LY, width: SIZE, height: SIZE, transform: `scale(${1 + pulse})`, transformOrigin: 'center' }}>
        <Logo size={SIZE} f={f} at={0.3} skip={2} />
        <div style={{ position: 'absolute', left: lerp(-LX, g.x), top: lerp(-LY, g.y), width: lerp(1920, g.s), height: lerp(1080, g.s), borderRadius: lerp(0, g.r), background: interpolateColors(p, [0, 1], [C.accentDeep, C.accent]) }} />
      </div>
      <div style={{ position: 'absolute', top: 560, width: '100%', textAlign: 'center', fontFamily: DISPLAY, fontSize: 168, fontWeight: 800, color: C.ink, letterSpacing: '-0.05em' }}>
        {'Mosaic'.split('').map((ch, i) => {
          const q = sp(f, 0.5 + i * 0.045, { damping: 11, stiffness: 180 });
          return <span key={i} style={{ display: 'inline-block', opacity: Math.min(1, q * 2), transform: `translateY(${(1 - q) * 120}px) rotate(${(1 - q) * 18}deg)` }}>{ch}</span>;
        })}
      </div>
      <Words text="It catches what you never realized you were revealing." at={cue('title', 'catches') - 0.25} f={f} size={50} weight={600} color={C.ink2} hi={['never', 'realized']} style={{ position: 'absolute', top: 790, width: '100%', textAlign: 'center' }} />
    </AbsoluteFill>
  );
}
