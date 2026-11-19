import { useState } from 'react';
import { listEvents } from '../../ai/journal';
import { useLive } from '../live';
import { Shell } from '../Shell';
import { PolicyTag, SourceBadge, SOURCE_UI, fmtMs, fmtTime } from '../../ui/components';
import { db } from '../../storage/db';
import { useApp } from '../store';

const TASK: Record<string, string> = { extract: 'Extract context', review: 'Review connections', rewrite: 'Rewrite passage', generatePack: 'Generate test pack', explainSample: 'Explain sample test', rules: 'Rules' };

export function Journal() {
  const events = useLive(() => listEvents(), [], 'journal');
  const [sel, setSel] = useState(0);
  const app = useApp();
  const list = events ?? [];
  const e = list[Math.min(sel, list.length - 1)];
  const n = (s: string) => list.filter((x) => x.actualSource === s).length;
  return (
    <Shell title="Inference journal" wide inspectorTitle="Event" inspectorKey={e?.id} inspector={e ? (
      <>
        <div className="insp-card"><div className="hstack" style={{ justifyContent: 'space-between' }}><b style={{ fontSize: 15 }}>{TASK[e.task]}</b><SourceBadge source={e.actualSource} /></div>
          <dl className="kv" style={{ marginTop: 12 }}><dt>Requested policy</dt><dd><code>{e.requestedPolicy}</code></dd><dt>Actual source</dt><dd>{SOURCE_UI[e.actualSource].label}{e.actualSource === 'DEVICE' || e.actualSource === 'CLOUD' ? ' (SDK metadata)' : ''}</dd><dt>Outcome</dt><dd>{e.outcome}</dd><dt>Duration</dt><dd className="tnum">{fmtMs(e.durationMs)}</dd><dt>Time</dt><dd className="mono">{fmtTime(e.at)}</dd><dt>Operation</dt><dd className="mono">{e.id}</dd>{e.payloadDigest && <><dt>Payload digest</dt><dd className="mono">sha256:{e.payloadDigest.slice(0, 8)}…{e.payloadDigest.slice(-4)}</dd></>}</dl></div>
        {e.detail && <div className="banner banner-neutral" style={{ marginTop: 10 }}><div className="banner-body">{e.detail}</div></div>}
        <p className="small muted" style={{ margin: '12px 4px 0' }}>Prompts, replies, file names and excerpts are never stored here.</p>
      </>) : <div className="insp-card"><p className="muted small">No events yet.</p></div>}>
      <div className="page-h"><div><h1>Inference journal</h1><p>Where each model task actually ran, from the SDK’s own metadata, next to the policy that was requested. Stored only in this browser.</p></div>{list.length > 0 && <button type="button" className="btn btn-quiet btn-sm" onClick={async () => { await db().events.clear(); app.toast('Journal cleared'); }}>Clear journal</button>}</div>
      <div className="hstack" style={{ marginBottom: 14 }}>{(['DEVICE', 'CLOUD', 'UNAVAILABLE', 'UNKNOWN'] as const).filter((s) => n(s) || s === 'DEVICE' || s === 'CLOUD').map((s) => <span key={s} className="hstack"><SourceBadge source={s} /><span className="small muted tnum">{n(s)}</span></span>)}</div>
      {!list.length ? <div className="empty-d"><h3>No model tasks yet</h3><p>Rules-based checks don’t use a model, so they don’t appear here. Run a review or generate a test pack to see entries.</p></div> : (
        <table className="tbl"><thead><tr><th>Time</th><th>Task</th><th>Requested</th><th>Actual source</th><th className="num">Duration</th><th>Outcome</th></tr></thead><tbody>
          {list.map((x, i) => <tr key={x.id} className={`clickable ${i === sel ? 'sel' : ''}`} tabIndex={0} onClick={() => setSel(i)} onKeyDown={(ev) => { if (ev.key === 'Enter') setSel(i); }}><td className="mono">{fmtTime(x.at)}</td><td className="t-title">{TASK[x.task]}</td><td><PolicyTag policy={x.requestedPolicy} /></td><td><SourceBadge source={x.actualSource} /></td><td className="num mono">{fmtMs(x.durationMs)}</td><td className="small">{x.outcome === 'ok' ? 'Completed' : <span style={{ color: 'var(--unassessed-fg)' }}>{x.outcome}</span>}</td></tr>)}
        </tbody></table>
      )}
    </Shell>
  );
}
