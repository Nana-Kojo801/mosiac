import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { C, DISPLAY, FONT } from './theme';
import { Logo } from './kit';

// 1280×720 YouTube thumbnail: real app imagery plus the tagline.
export function Thumbnail() {
  const tiles: React.ReactNode[] = [];
  for (let r = 0; r < 12; r++) for (let c = 0; c < 22; c++) tiles.push(<rect key={`${r}-${c}`} x={c * 60 + 6} y={r * 60 + 6} width={48} height={48} rx={10} fill={(r * 7 + c * 3) % 11 === 0 ? C.mark : C.accent} opacity={0.035 + (((r * 13 + c * 5) % 7) / 7) * 0.06} />);
  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: FONT }}>
      <svg width={1280} height={720} style={{ position: 'absolute' }}>{tiles}</svg>
      <div style={{ position: 'absolute', right: -120, top: 120, width: 820, height: 461, borderRadius: 18, overflow: 'hidden', border: `1px solid ${C.hairStrong}`, transform: 'perspective(1600px) rotateY(-14deg) rotateZ(2deg)', boxShadow: '0 40px 80px -20px rgba(0,0,0,0.9)' }}>
        <Img src={staticFile('footage/findings.png')} style={{ width: 820, height: 461 }} />
      </div>
      <div style={{ position: 'absolute', left: 64, top: 70 }}><Logo size={120} f={999} at={0} /></div>
      <div style={{ position: 'absolute', left: 60, top: 210, fontFamily: DISPLAY, fontSize: 132, fontWeight: 800, color: C.ink, letterSpacing: '-0.05em' }}>Mosaic</div>
      <div style={{ position: 'absolute', left: 64, top: 380, width: 560, fontFamily: DISPLAY, fontSize: 52, fontWeight: 800, lineHeight: 1.08, color: C.ink, letterSpacing: '-0.03em' }}>
        Catch what you <span style={{ color: C.accent }}>never realized</span> you were revealing.
      </div>
      <div style={{ position: 'absolute', left: 64, top: 610, display: 'flex', gap: 12 }}>
        <span style={{ padding: '10px 18px', borderRadius: 999, background: C.deviceBg, color: C.device, fontSize: 24, fontWeight: 700 }}>Private docs stay on device</span>
      </div>
    </AbsoluteFill>
  );
}
