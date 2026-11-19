import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { C, FONT } from '../theme';
import { cue, scene, track } from '../data';
import { Chip, INOUT, sp, tw, useLocal } from '../kit';

type Box = { x: number; y: number; w: number; h: number };
const STEPS = (track as { steps: Record<string, { file: string; boxes: Record<string, Box> }> }).steps;
type Plan = { id: string; at: number; focus: { box: string; at: number }[]; click?: { box: string; at: number }; callout: string };

// Which real screenshot is on screen when, and what the camera looks at, timed to the narration.
export function plan(sceneId: string): Plan[] {
  const c = (w: string, n = 0) => cue(sceneId, w, n);
  switch (sceneId) {
    case 'review': return [
      { id: 'overview-start', at: 0, focus: [{ box: 'docs', at: 0.3 }, { box: 'run', at: c('hit') - 0.2 }], click: { box: 'run', at: c('review') + 0.15 }, callout: 'Run a review' },
      { id: 'overview-reviewed', at: c('Mosaic') - 0.1, focus: [{ box: 'counts', at: 0.3 }], callout: 'Findings by risk' },
      { id: 'document', at: c('passages') - 0.15, focus: [{ box: 'mark', at: 0.3 }], callout: 'Passages light up' },
      { id: 'findings', at: c('evidence') - 0.15, focus: [{ box: 'inspector', at: 0.3 }, { box: 'source', at: c('every', 1) - c('evidence') }], callout: 'Evidence from every release' },
    ];
    case 'map': return [
      { id: 'map-edge', at: 0, focus: [{ box: 'graph', at: 0.3 }, { box: 'reason', at: c('connects') }], callout: 'How the draft connects' },
      { id: 'map', at: c('fictional') - 0.15, focus: [{ box: 'graph', at: 0.2 }, { box: 'steps', at: c('three') - c('fictional') + 0.1 }], callout: '100 → 1 · fictional sample' },
    ];
    case 'rewrite': return [
      { id: 'rewrite-suggest', at: 0, focus: [{ box: 'firstEdit', at: 0.25 }], callout: 'Safer wording' },
      { id: 'rewrite-applied', at: c('Apply') - 0.1, focus: [{ box: 'latest', at: 0.2 }], callout: 'Applied' },
      { id: 'rewrite-reassessed', at: c('review') - 0.1, focus: [{ box: 'reassess', at: 0.2 }], callout: 'Reviewed again' },
      { id: 'map-after', at: c('group') - 0.1, focus: [{ box: 'steps', at: 0.2 }], callout: 'Group grows: 1 → 21' },
    ];
    case 'consent': return [
      { id: 'tests', at: 0, focus: [{ box: 'packs', at: 0.3 }], callout: 'Test packs' },
      { id: 'consent', at: c('exact') - 0.2, focus: [{ box: 'payload', at: 0.25 }], callout: 'Categories only' },
    ];
    case 'ocr': return [
      { id: 'ocr', at: 0, focus: [{ box: 'image', at: 0.3 }, { box: 'text', at: c('reads') }, { box: 'confidence', at: c('flags') }], callout: 'OCR on your device' },
    ];
    case 'release': return [
      { id: 'release', at: 0, focus: [{ box: 'approve', at: 0.2 }], click: { box: 'approve', at: c('release') }, callout: 'Approve on device' },
      { id: 'export', at: c('export') - 0.1, focus: [{ box: 'preview', at: 0.15 }], callout: 'Clean export' },
      { id: 'history', at: c('done') - 0.1, focus: [{ box: 'timeline', at: 0.15 }], callout: 'Every release on record' },
    ];
  }
  throw new Error(`No shot plan for ${sceneId}`);
}

const KICKER: Record<string, string> = { review: 'Review', map: 'Disclosure map', rewrite: 'Rewrite', consent: 'Test packs', ocr: 'Scans & photos', release: 'Release' };
const W = 1408, H = 792, BAR = 44, L = (1920 - W) / 2, T = 84, K = W / 1920;
const clampN = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function target(b: Box) {
  const s = clampN(Math.min((0.6 * 1920) / b.w, (0.6 * 1080) / b.h), 1.12, 2.0);
  return { s, cx: b.x + b.w / 2, cy: b.y + b.h / 2 };
}
function camera(p: Plan, u: number) {
  const boxes = STEPS[p.id].boxes;
  let cam = { s: 1, cx: 960, cy: 540 };
  for (const fc of p.focus) {
    const b = boxes[fc.box];
    if (!b) throw new Error(`No box ${p.id}.${fc.box}`);
    const tg = target(b), q = tw(u, fc.at, fc.at + 0.75, 0, 1, INOUT);
    cam = { s: cam.s + (tg.s - cam.s) * q, cx: cam.cx + (tg.cx - cam.cx) * q, cy: cam.cy + (tg.cy - cam.cy) * q };
  }
  const s = cam.s * (1 + 0.012 * u);
  return { s, ox: clampN(cam.cx - 960 / s, 0, 1920 - 1920 / s), oy: clampN(cam.cy - 540 / s, 0, 1080 - 1080 / s) };
}

function Shot({ p, u }: { p: Plan; u: number }) {
  const cam = camera(p, u);
  const boxes = STEPS[p.id].boxes;
  const cur = [...p.focus].reverse().find((fc) => u >= fc.at + 0.45);
  const ring = cur ? tw(u, cur.at + 0.5, cur.at + 0.8) : 0;
  const b = cur ? boxes[cur.box] : null;
  const z = K * cam.s;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: `scale(${z}) translate(${-cam.ox}px, ${-cam.oy}px)` }}>
      <Img src={staticFile(`footage/${STEPS[p.id].file}`)} style={{ width: 1920, height: 1080, display: 'block' }} />
      {b && ring > 0 && (
        <div style={{ position: 'absolute', left: b.x - 8, top: b.y - 8, width: b.w + 16, height: b.h + 16, borderRadius: 14, border: `${3.5 / z}px solid ${C.mark}`, boxShadow: `0 0 0 4000px rgba(5,6,10,${0.38 * ring}), 0 0 ${24 / z}px ${C.mark}`, opacity: ring, transform: `scale(${1.06 - 0.06 * ring})` }} />
      )}
    </div>
  );
}

function Cursor({ p, u }: { p: Plan; u: number }) {
  if (!p.click) return null;
  const b = STEPS[p.id].boxes[p.click.box];
  const cam = camera(p, u);
  const z = K * cam.s;
  const tx = (b.x + b.w / 2 - cam.ox) * z, ty = (b.y + b.h / 2 - cam.oy) * z;
  const m = tw(u, p.click.at - 0.75, p.click.at - 0.05, 0, 1, INOUT);
  const x = W * 0.72 + (tx - W * 0.72) * m, y = H * 0.95 + (ty - H * 0.95) * m;
  const press = tw(u, p.click.at - 0.05, p.click.at + 0.05) - tw(u, p.click.at + 0.05, p.click.at + 0.2);
  const rip = tw(u, p.click.at, p.click.at + 0.45);
  return (
    <>
      {rip > 0 && rip < 1 && <div style={{ position: 'absolute', left: tx - 60 * rip, top: ty - 60 * rip, width: 120 * rip, height: 120 * rip, borderRadius: '50%', border: `4px solid ${C.accent}`, opacity: 1 - rip }} />}
      <svg width={40} height={40} viewBox="0 0 24 24" style={{ position: 'absolute', left: x - 6, top: y - 4, transform: `scale(${1 - press * 0.18})`, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))', opacity: tw(u, p.click.at - 0.9, p.click.at - 0.7) }}>
        <path d="M4 2 L4 19 L8.5 15 L11.5 22 L14.5 20.7 L11.6 14 L18 14 Z" fill="#fff" stroke="#12141B" strokeWidth={1.4} strokeLinejoin="round" />
      </svg>
    </>
  );
}

export function Shots({ id }: { id: string }) {
  const { f, t } = useLocal();
  const S = scene(id);
  const shots = plan(id);
  const i = shots.reduce((acc, s, k) => (t >= s.at ? k : acc), 0);
  const p = shots[i], prev = shots[i - 1];
  const q = i === 0 ? 1 : tw(t - p.at, 0, 0.4, 0, 1, INOUT);
  const win = sp(f, 0, { damping: 17, stiffness: 120 });
  const kick = sp(f, 0.15);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <div style={{ position: 'absolute', left: 56, top: 26, opacity: kick, transform: `translateX(${(1 - kick) * -40}px)` }}><Chip color={C.ink} dot={C.accent} size={24}>{KICKER[id]}</Chip></div>
      <div style={{ position: 'absolute', right: 56, top: 26, opacity: kick }}><Chip dot={C.device} size={20}>Real app footage · production build</Chip></div>
      <div style={{ position: 'absolute', left: L, top: T, width: W, height: H + BAR, borderRadius: 22, overflow: 'hidden', background: '#1A1C24', border: `1px solid ${C.hairStrong}`, boxShadow: '0 50px 100px -30px rgba(0,0,0,0.9)', transform: `perspective(2400px) rotateX(${(1 - win) * 18}deg) rotateY(${Math.sin(t * 0.7) * 1.2}deg) translateY(${(1 - win) * 160}px) scale(${0.88 + 0.12 * win})`, opacity: Math.min(1, win * 2) }}>
        <div style={{ height: BAR, display: 'flex', alignItems: 'center', padding: '0 18px', gap: 9, borderBottom: `1px solid ${C.hair}` }}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => <span key={c} style={{ width: 13, height: 13, borderRadius: '50%', background: c }} />)}
          <div style={{ margin: '0 auto', padding: '5px 60px', borderRadius: 9, background: C.sunk, color: C.ink2, fontSize: 17, fontWeight: 500 }}>🔒 mosaic-4a9d2.web.app</div>
          <span style={{ width: 57 }} />
        </div>
        <div style={{ position: 'relative', width: W, height: H, overflow: 'hidden' }}>
          {prev && q < 1 && (
            <div style={{ position: 'absolute', inset: 0, transform: `translateX(${-q * W * 0.3}px)` }}>
              <Shot p={prev} u={t - prev.at} />
              <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: q * 0.45 }} />
            </div>
          )}
          <div style={{ position: 'absolute', inset: 0, transform: `translateX(${(1 - q) * W}px)`, boxShadow: q < 1 ? '-20px 0 40px rgba(0,0,0,0.45)' : undefined }}>
            <Shot p={p} u={t - p.at} />
            <Cursor p={p} u={t - p.at} />
          </div>
        </div>
      </div>
      {shots.map((s, k) => {
        const end = shots[k + 1]?.at ?? S.dur / 30 + 1;
        if (t < s.at || t > end + 0.3) return null;
        const pp = sp(f, s.at + 0.3, { damping: 12, stiffness: 200 });
        const out = tw(t, end - 0.12, end + 0.08);
        return (
          <div key={s.id} style={{ position: 'absolute', left: L - 40, top: T + BAR + H - 62, transformOrigin: 'left center', transform: `translateX(${(1 - pp) * -60}px) rotate(${-2 + (1 - pp) * -8}deg) scale(${(0.7 + 0.3 * pp) * (1 - out * 0.2)})`, opacity: Math.min(1, pp * 2) * (1 - out) }}>
            <div style={{ padding: '14px 28px', borderRadius: 18, background: C.accent, color: C.accentInk, fontSize: 34, fontWeight: 800, letterSpacing: '-0.01em', boxShadow: '0 20px 40px -12px rgba(0,0,0,0.7)' }}>{s.callout}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
