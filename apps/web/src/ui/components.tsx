import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CircleCheck, CircleCheckBig, CircleDashed, CircleDot, CircleHelp, CircleSlash, Cloud, Cpu, Eye, FlaskConical, Info, ListChecks, OctagonAlert } from 'lucide-react';
import type { ActualSource, Band, Finding, FindingStatus } from '@mosaic/schemas';

export const BAND_UI: Record<Band, { label: string; cls: string; Icon: typeof Info }> = {
  CRITICAL: { label: 'Critical', cls: 'crit', Icon: OctagonAlert },
  HIGH: { label: 'High priority', cls: 'high', Icon: AlertTriangle },
  MODERATE: { label: 'Needs review', cls: 'mod', Icon: AlertCircle },
  LOW: { label: 'Low', cls: 'low', Icon: Info },
};

export function RiskChip({ finding, band, small }: { finding?: Finding; band?: Band; small?: boolean }) {
  if (finding?.status === 'UNASSESSED') return <span className={`chip chip-unassessed${small ? ' chip-sm' : ''}`}><CircleDashed size={14} aria-hidden /><span>Not assessed</span></span>;
  const b = BAND_UI[band ?? finding!.band];
  return <span className={`chip chip-${b.cls}${small ? ' chip-sm' : ''}`}><b.Icon size={14} aria-hidden /><span>{b.label}</span></span>;
}

export const SOURCE_UI: Record<ActualSource, { label: string; cls: string; Icon: typeof Info; title: string }> = {
  DEVICE: { label: 'On device', cls: 'device', Icon: Cpu, title: 'Ran on this device (from SDK metadata)' },
  CLOUD: { label: 'Cloud', cls: 'cloud', Icon: Cloud, title: 'Ran in the cloud (from SDK metadata)' },
  RULES: { label: 'Rules only', cls: 'rules', Icon: ListChecks, title: 'Deterministic rule, no model' },
  UNAVAILABLE: { label: 'Unavailable', cls: 'unavail', Icon: CircleSlash, title: 'Did not run' },
  UNKNOWN: { label: 'Unknown', cls: 'unknown', Icon: CircleHelp, title: 'The SDK did not report a source' },
  FIXTURE: { label: 'Sample result', cls: 'fixture', Icon: FlaskConical, title: 'Authored sample result for the fictional sample. Not model output.' },
};

export function SourceBadge({ source }: { source: ActualSource }) {
  const s = SOURCE_UI[source];
  return <span className={`src src-${s.cls}`} title={s.title}><s.Icon size={13} aria-hidden /><span>{s.label}</span></span>;
}

const STATUS_UI: Record<FindingStatus, { label: string; Icon: typeof Info }> = {
  OPEN: { label: 'Open', Icon: CircleDot }, UNDER_REVIEW: { label: 'Under review', Icon: Eye }, ACCEPTED_RESIDUAL: { label: 'Accepted residual', Icon: CircleCheckBig },
  RESOLVED: { label: 'Resolved', Icon: CircleCheck }, DISMISSED: { label: 'Dismissed', Icon: CircleSlash }, UNASSESSED: { label: 'Not assessed', Icon: CircleDashed },
};
export function StatusChip({ status }: { status: FindingStatus }) {
  const s = STATUS_UI[status];
  return <span className={`status status-${status.toLowerCase()}`}><s.Icon size={13} aria-hidden /><span>{s.label}</span></span>;
}
export const isClosed = (s: FindingStatus) => s === 'RESOLVED' || s === 'DISMISSED' || s === 'ACCEPTED_RESIDUAL';

export const PolicyTag = ({ policy }: { policy: string }) => <code className="policy">{policy}</code>;

export function ScoreBars({ f }: { f: Finding }) {
  const rows: [string, number, number][] = [['Direct disclosure', f.components.direct, 3], ['Contextual specificity', f.components.specificity, 3], ['Cross-release evidence', f.components.cross, 3], ['Unnecessary sensitivity', f.components.sensitivity, 2]];
  return (
    <div className="score">
      {rows.map(([l, v, m]) => (
        <div className="score-row" key={l}><span className="score-label">{l}</span><span className="score-pips" aria-label={`${v} of ${m}`}>{Array.from({ length: m }, (_, i) => <i key={i} className={i < v ? 'on' : ''} />)}</span><span className="score-num">{v}/{m}</span></div>
      ))}
      <div className="score-total"><span>Review priority</span><strong>{f.score}<small>/11</small></strong></div>
    </div>
  );
}

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 25 25" aria-hidden>
      {[0, 1, 2].flatMap((y) => [0, 1, 2].map((x) => <rect key={`${x}${y}`} x={x * 8 + 1} y={y * 8 + 1} width="6.4" height="6.4" rx="1.8" className={x === 2 && y === 0 ? 'lg-a' : (x + y) % 2 ? 'lg-b' : 'lg-c'} />))}
    </svg>
  );
}

/** Fictional group-size illustration. `stage` indexes into the computed steps. */
export function MosaicGrid({ steps, stage }: { steps: { members: Set<number> }[]; stage: number }) {
  const last = steps[Math.min(stage, steps.length - 1)].members;
  const outAt = new Map<number, number>();
  steps.forEach((s, k) => { if (k === 0) return; for (const i of steps[k - 1].members) if (!s.members.has(i) && !outAt.has(i)) outAt.set(i, k); });
  return (
    <div className="mosaic" role="img" aria-label={`${last.size} of 100 fictional records remain`}>
      {Array.from({ length: 100 }, (_, i) => { const k = outAt.get(i); const out = !last.has(i) && k !== undefined && k <= stage; return <i key={i} className={`tile ${out ? `out out-${Math.min(k!, 3)}` : 'in'}`} />; })}
    </div>
  );
}

export function Banner({ tone, icon, title, children }: { tone: 'warn' | 'info' | 'neutral' | 'bad' | 'un' | 'ok'; icon: ReactNode; title: string; children?: ReactNode }) {
  return <div className={`banner banner-${tone === 'ok' ? 'neutral' : tone}`} style={tone === 'ok' ? { background: 'var(--ok-bg)', color: 'var(--ok-fg)' } : undefined} role={tone === 'bad' ? 'alert' : undefined}>{icon}<div className="banner-body"><strong>{title}</strong>{children}</div></div>;
}

export function Backdrop() {
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const rects: ReactNode[] = [];
  for (let y = 0; y < 1200; y += 120) for (let x = 0; x < 1800; x += 120) {
    if (rnd() < 0.45) continue;
    const s = 120 * (0.55 + rnd() * 0.4); const ox = x + rnd() * (120 - s); const oy = y + rnd() * (120 - s);
    rects.push(<rect key={`${x}-${y}`} x={ox} y={oy} width={s} height={s} rx={s * 0.18} className={`t${1 + Math.floor(rnd() * 3)}`} transform={`rotate(${((rnd() - 0.5) * 8).toFixed(1)} ${ox + s / 2} ${oy + s / 2})`} />);
  }
  return <svg className="backdrop-fixed" viewBox="0 0 1800 1200" preserveAspectRatio="xMidYMid slice" aria-hidden>{rects}</svg>;
}

export const fmtMs = (ms: number | null | undefined) => (ms == null ? '—' : ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`);
export const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');
export const fmtTime = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '');
