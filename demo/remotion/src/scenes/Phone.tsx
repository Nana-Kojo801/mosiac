import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { C, FONT } from '../theme';
import { scene, track } from '../data';
import { Chip, sp, useLocal } from '../kit';

const STEPS = (track as { steps: Record<string, { file: string }> }).steps;
const PH = 760, PW = Math.round((PH * 1170) / 2532);

export function Phone() {
  const { f, t } = useLocal();
  const ids = scene('phone').shots ?? [];
  const drift = t * -26;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <div style={{ position: 'absolute', right: 56, top: 26, opacity: sp(f, 0.1) }}><Chip dot={C.device} size={20}>Real app footage · 390 × 844 phone viewport</Chip></div>
      {ids.map((id, i) => {
        const p = sp(f, 0.05 + i * 0.1, { damping: 14, stiffness: 140 });
        const x = 960 + (i - (ids.length - 1) / 2) * (PW + 70) + drift;
        const rot = (i - 1.5) * 4;
        return (
          <div key={id} style={{ position: 'absolute', left: x - PW / 2 - 12, top: 60 + Math.abs(i - 1.5) * 26, width: PW + 24, height: PH + 24, borderRadius: 62, background: '#1C1E26', border: `2px solid ${C.hairStrong}`, padding: 12, boxShadow: '0 50px 90px -30px rgba(0,0,0,0.9)', transform: `translateY(${(1 - p) * 900}px) rotate(${rot * p + (1 - p) * rot * 4}deg)`, opacity: Math.min(1, p * 2) }}>
            <Img src={staticFile(`footage/${STEPS[id].file}`)} style={{ width: PW, height: PH, borderRadius: 50, display: 'block' }} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
