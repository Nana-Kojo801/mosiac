import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, DISPLAY, FONT, MONO } from '../theme';
import { cue, routing } from '../data';
import { Chip, sp, tw, useLocal } from '../kit';

type Route = { task: string; label: string; data: string; policy: string };
const ROUTES = (routing as { routes: Route[] }).routes;
const PRIVATE = ROUTES.filter((r) => r.data === 'PRIVATE');
const CLOUD = ROUTES.filter((r) => r.policy === 'ONLY_IN_CLOUD');
// Shape of the only request that reaches the cloud (GenericPackRequest in packages/schemas).
const PAYLOAD = `{
  "task": "generatePack",
  "domain": "QUALITATIVE_RESEARCH",
  "categories": ["ROLE_RARITY", "SHIFT_PATTERNS"],
  "packSchemaVersion": 1
}`;

function Panel({ x, color, bg, title, sub, p, children }: { x: number; color: string; bg: string; title: string; sub: string; p: number; children: React.ReactNode }) {
  return (
    <div style={{ position: 'absolute', left: x, top: 150, width: 690, height: 640, borderRadius: 34, background: 'rgba(23,25,32,0.92)', border: `2px solid ${color}`, padding: 34, transform: `translateX(${(1 - p) * (x < 900 ? -500 : 500)}px) scale(${0.9 + 0.1 * p})`, opacity: Math.min(1, p * 2), boxShadow: '0 40px 80px -30px rgba(0,0,0,0.8)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ width: 58, height: 58, borderRadius: 16, background: bg, border: `2px solid ${color}`, display: 'grid', placeItems: 'center' }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: color }} />
        </div>
        <div>
          <div style={{ fontFamily: DISPLAY, fontSize: 40, fontWeight: 800, color: C.ink, letterSpacing: '-0.02em' }}>{title}</div>
          <div style={{ fontSize: 22, color: C.ink3, fontWeight: 500 }}>{sub}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function RouteRow({ r, color, bg, p }: { r: Route; color: string; bg: string; p: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 16, background: C.surface2, marginTop: 12, opacity: Math.min(1, p * 2), transform: `translateX(${(1 - p) * 40}px)` }}>
      <span style={{ fontSize: 24, color: C.ink, fontWeight: 600 }}>{r.label}</span>
      <span style={{ fontFamily: MONO, fontSize: 17, fontWeight: 700, color, background: bg, padding: '5px 10px', borderRadius: 8 }}>{r.policy}</span>
    </div>
  );
}

export function Hybrid() {
  const { f, t } = useLocal();
  const cPriv = cue('hybrid', 'private'), cNever = cue('hybrid', 'never'), cBrowser = cue('hybrid', 'browser');
  const cCloud = cue('hybrid', 'cloud'), cGen = cue('hybrid', 'generic'), cFixed = cue('hybrid', 'fixed'), cApprove = cue('hybrid', 'approve'), cExact = cue('hybrid', 'exact');
  const dev = sp(f, cPriv - 0.35, { damping: 16, stiffness: 140 });
  const cloud = sp(f, cCloud - 0.2, { damping: 16, stiffness: 140 });
  const typed = Math.max(0, Math.floor((t - cFixed + 0.2) * 70));
  const card = sp(f, cFixed - 0.3, { damping: 14, stiffness: 170 });
  const gateOk = tw(t, cApprove, cApprove + 0.25);
  const fly = tw(t, cExact + 0.35, cExact + 1.05);
  const back = sp(f, cExact + 1.15, { damping: 13, stiffness: 170 });
  const bounce = tw(t, cBrowser - 0.1, cBrowser + 0.25) - tw(t, cBrowser + 0.25, cBrowser + 0.6);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Panel x={110} color={C.device} bg={C.deviceBg} title="Your device" sub="Browser · built-in model · rules" p={dev}>
        <div style={{ display: 'flex', gap: 14, marginTop: 30 }}>
          {['Interim report', 'Case study', 'P-07 transcript'].map((d, i) => {
            const q = sp(f, cPriv + i * 0.09, { damping: 12, stiffness: 220 });
            return (
              <div key={d} style={{ flex: 1, height: 116, borderRadius: 18, background: C.surface2, border: `1px solid ${C.hair}`, padding: 16, transform: `scale(${q}) translateX(${i === 2 ? bounce * 60 : 0}px)`, opacity: q, position: 'relative' }}>
                {[0.9, 0.7, 0.8].map((w, j) => <div key={j} style={{ height: 9, width: `${w * 100}%`, borderRadius: 5, background: C.hairStrong, marginTop: j ? 10 : 2 }} />)}
                <div style={{ position: 'absolute', bottom: 12, left: 16, fontSize: 18, fontWeight: 700, color: C.ink2 }}>{d}</div>
                <div style={{ position: 'absolute', top: -12, right: -10, width: 34, height: 34, borderRadius: 11, background: C.deviceBg, border: `2px solid ${C.device}`, display: 'grid', placeItems: 'center', fontSize: 16 }}>🔒</div>
              </div>
            );
          })}
        </div>
        {PRIVATE.map((r, i) => <RouteRow key={r.task} r={r} color={C.device} bg={C.deviceBg} p={sp(f, cNever + i * 0.12)} />)}
        <div style={{ marginTop: 22, opacity: tw(t, cBrowser, cBrowser + 0.3) }}><Chip color={C.device} bg={C.deviceBg} size={22}>Private text never leaves</Chip></div>
      </Panel>

      <Panel x={1120} color={C.cloud} bg={C.cloudBg} title="Cloud" sub="Firebase AI Logic" p={cloud}>
        {CLOUD.map((r) => <RouteRow key={r.task} r={r} color={C.cloud} bg={C.cloudBg} p={sp(f, cGen - 0.1)} />)}
        <div style={{ marginTop: 24, fontSize: 22, color: C.ink3, opacity: tw(t, cGen, cGen + 0.3) }}>Sees only categories from a fixed list.</div>
        <div style={{ position: 'absolute', left: 34, right: 34, bottom: 34, padding: 20, borderRadius: 18, background: C.cloudBg, border: `1px solid ${C.cloud}`, opacity: Math.min(1, back * 2), transform: `translateX(${(1 - back) * -60}px)` }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.ink }}>Generic test pack ✓</div>
          <div style={{ fontSize: 19, color: C.ink2 }}>Validated against the schema on your device</div>
        </div>
      </Panel>

      {/* consent gate */}
      <div style={{ position: 'absolute', left: 958, top: 170, width: 4, height: 600, background: `repeating-linear-gradient(${gateOk > 0.5 ? C.ok : C.hairStrong} 0 14px, transparent 14px 26px)`, opacity: Math.min(dev, cloud) }} />
      <div style={{ position: 'absolute', left: 960 - 92, top: 200, width: 184, textAlign: 'center', opacity: Math.min(dev, cloud) }}>
        <div style={{ margin: '0 auto', width: 64, height: 64, borderRadius: 20, background: gateOk > 0.5 ? C.okBg : C.surface, border: `2px solid ${gateOk > 0.5 ? C.ok : C.hairStrong}`, display: 'grid', placeItems: 'center', fontSize: 28, transform: `scale(${1 + 0.25 * (gateOk - tw(t, cApprove + 0.25, cApprove + 0.5))})`, color: C.ok }}>{gateOk > 0.5 ? '✓' : '🔒'}</div>
        <div style={{ marginTop: 10, fontSize: 18, fontWeight: 700, color: gateOk > 0.5 ? C.ok : C.ink3, background: C.bg, padding: '2px 0' }}>{gateOk > 0.5 ? 'You approved' : 'Your approval'}</div>
      </div>

      {/* the exact request */}
      <div style={{ position: 'absolute', left: 700 - 330 + fly * 765, top: 540 - fly * 60, width: 660, padding: '18px 24px', borderRadius: 20, background: '#0D0F15', border: `2px solid ${fly > 0 ? C.cloud : C.accent}`, boxShadow: '0 30px 60px -20px rgba(0,0,0,0.85)', opacity: Math.min(1, card * 2) * (1 - tw(t, cExact + 0.95, cExact + 1.15)), transform: `scale(${(0.7 + 0.3 * card) * (1 - fly * 0.45)})` }}>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '0.08em', color: C.accentText, marginBottom: 8 }}>EXACT REQUEST · NO DOCUMENT TEXT</div>
        <pre style={{ margin: 0, fontFamily: MONO, fontSize: 21, lineHeight: 1.45, color: C.ink }}>{PAYLOAD.slice(0, typed)}<span style={{ opacity: typed < PAYLOAD.length ? 1 : 0, color: C.accent }}>▍</span></pre>
      </div>
    </AbsoluteFill>
  );
}
