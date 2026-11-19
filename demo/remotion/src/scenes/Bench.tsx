import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, DISPLAY, FONT } from '../theme';
import { cue, results } from '../data';
import { Chip, Words, sp, tw, useLocal } from '../kit';

type R = { cases: number; datasetVersion: string; configurations: { rules: { metrics: { findings: { precision: number; recall: number; f1: number } } } } };
const B = results as unknown as R;
const M = B.configurations.rules.metrics.findings;
const ROWS = [
  { label: 'Precision', v: M.precision, cueWord: 'precision' },
  { label: 'Recall', v: M.recall, cueWord: 'recall' },
  { label: 'F1', v: M.f1, cueWord: 'recall', delay: 0.6 },
];
const X0 = 560, BW = 900;

export function Bench() {
  const { f, t } = useLocal();
  const cMeas = cue('bench', 'measured'), cNext = cue('bench', 'ondevice');
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Words text="It’s measured." at={cMeas - 0.3} f={f} size={96} weight={800} hi={['measured']} style={{ position: 'absolute', top: 90, width: '100%', textAlign: 'center' }} />
      <div style={{ position: 'absolute', top: 240, width: '100%', display: 'flex', justifyContent: 'center', gap: 14, opacity: tw(t, cMeas, cMeas + 0.4) }}>
        <Chip size={22} dot={C.accent}>Open synthetic benchmark</Chip>
        <Chip size={22}>{B.datasetVersion}</Chip>
        <Chip size={22}>{B.cases} test cases</Chip>
        <Chip size={22} color={C.ink} bg={C.surface2}>Rules baseline only</Chip>
      </div>
      {ROWS.map((r, i) => {
        const at = cue('bench', r.cueWord) - 0.2 + (r.delay ?? 0);
        const p = sp(f, at - 0.2);
        const fill = tw(t, at, at + 0.9);
        const y = 360 + i * 130;
        return (
          <div key={r.label} style={{ position: 'absolute', left: 0, top: y, width: 1920, height: 100, opacity: Math.min(1, p * 2), transform: `translateX(${(1 - p) * -80}px)` }}>
            <div style={{ position: 'absolute', left: X0 - 300, width: 270, textAlign: 'right', top: 22, fontFamily: DISPLAY, fontSize: 44, fontWeight: 700, color: C.ink2 }}>{r.label}</div>
            <div style={{ position: 'absolute', left: X0, top: 20, width: BW, height: 64, borderRadius: 18, background: C.surface2, overflow: 'hidden' }}>
              <div style={{ width: `${r.v * fill * 100}%`, height: '100%', borderRadius: 18, background: i === 0 ? C.accent : i === 1 ? C.device : C.cloud }} />
            </div>
            <div style={{ position: 'absolute', left: X0 + BW + 30, top: 4, fontFamily: DISPLAY, fontSize: 80, fontWeight: 800, color: C.ink, letterSpacing: '-0.04em' }}>{Math.round(r.v * fill * 100)}%</div>
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: 0, top: 750, width: 1920, height: 100, opacity: tw(t, cNext - 0.2, cNext + 0.2), transform: `translateY(${(1 - sp(f, cNext - 0.2)) * 40}px)` }}>
        <div style={{ position: 'absolute', left: X0 - 300, width: 270, textAlign: 'right', top: 18, fontFamily: DISPLAY, fontSize: 32, fontWeight: 700, color: C.ink3, lineHeight: 1.1 }}>On-device model</div>
        <div style={{ position: 'absolute', left: X0, top: 20, width: BW, height: 64, borderRadius: 18, border: `3px dashed ${C.hairStrong}`, display: 'flex', alignItems: 'center', paddingLeft: 26, fontSize: 26, fontWeight: 600, color: C.ink3 }}>Not measured yet · next</div>
      </div>
    </AbsoluteFill>
  );
}
