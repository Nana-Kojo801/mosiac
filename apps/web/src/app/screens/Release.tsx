import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowRight, Check, CircleCheck, CircleDashed, ScanSearch, Stamp } from 'lucide-react';
import { disclosureOfDraft, groupSteps } from '@mosaic/fixtures';
import { Shell, PageSkeleton } from '../Shell';
import { useWorkspace } from '../useWorkspace';
import { useApp } from '../store';
import { useLive } from '../live';
import { db } from '../../storage/db';
import { Banner, RiskChip, StatusChip, isClosed } from '../../ui/components';
import { approveRelease, approvalBlockers } from '../../features/release/release';
import { NotFound } from './NotFound';

const ITEMS = ['I’ve read every remaining finding.', 'The remaining details are needed for the analysis.', 'I understand this review is advisory and doesn’t certify anonymity.'];

export function Release() {
  const { id } = useParams();
  const data = useWorkspace(id);
  const app = useApp();
  const nav = useNavigate();
  const [check, setCheck] = useState([false, false, false]);
  const blockers = useLive(() => (id ? approvalBlockers(id, check) : Promise.resolve([])), [id, check, data?.run?.id, data?.stale], `blockers:${id}:${check.join()}:${data?.run?.id}:${data?.stale}`);
  // The first review in this workspace for the current draft document is the "before".
  const firstRun = useLive(async () => (id ? (await db().runs.where('workspaceId').equals(id).sortBy('startedAt'))[0] : undefined), [id], `firstRun:${id}`);
  const firstFindings = useLive(async () => (firstRun ? db().findings.where('runId').equals(firstRun.id).toArray() : []), [firstRun?.id], `firstFindings:${firstRun?.id}`);
  const firstDraftVersion = useLive(async () => (firstRun ? db().versions.get(firstRun.inputVersionIds[0]) : undefined), [firstRun?.id], `firstVersion:${firstRun?.id}`);
  if (data === undefined) return <PageSkeleton />;
  if (data === null) return <NotFound />;
  const { draft, run, findings, stale, ws } = data;
  if (!draft) {
    const last = data.releases.at(-1);
    return <Shell title="Release review" data={data}><div className="page-h"><div><h1>Release review</h1></div></div><div className="empty-d"><h3>No draft to approve</h3><p>{last ? `${last.doc.title} was approved. Add a new draft to check it against the releases so far.` : 'Add a draft to review it for release.'}</p><div className="hstack" style={{ justifyContent: 'center' }}><Link to={`/w/${ws.id}/import`} className="btn btn-primary" style={{ textDecoration: 'none' }}>Add a draft</Link><Link to={`/w/${ws.id}/history`} className="btn btn-quiet" style={{ textDecoration: 'none' }}>Release history</Link></div></div></Shell>;
  }
  const high = (fs: typeof findings) => fs.filter((f) => !isClosed(f.status) && f.status !== 'UNASSESSED' && (f.band === 'HIGH' || f.band === 'CRITICAL')).length;
  const residual = findings.filter((f) => !isClosed(f.status) && f.status !== 'UNASSESSED');
  const unassessed = findings.filter((f) => f.status === 'UNASSESSED');
  const steps = ws.kind === 'sample' ? { before: firstDraftVersion ? groupSteps(disclosureOfDraft(firstDraftVersion.normalizedText)).at(-1)!.count : null, now: groupSteps(disclosureOfDraft(draft.version.normalizedText)).at(-1)!.count } : null;
  const ok = blockers && blockers.length === 0;
  const blockerText: Record<string, string> = { NOT_REVIEWED: 'Run a review first.', STALE: 'The documents changed since the last review. Review again before approving.', UNASSESSED: 'Some paragraphs were not assessed. Run the review again where the model is available, or review them by hand and edit the text.', CHECKLIST: 'Tick each item in the checklist.' };
  return (
    <Shell title="Release review" data={data} inspectorTitle="Approval" inspector={
      <>
        <div className="insp-card"><b style={{ fontSize: 14 }}>Before you approve</b>
          <div role="group" aria-label="Approval checklist" style={{ marginTop: 6 }}>{ITEMS.map((t, i) => <button key={i} type="button" className="check" role="checkbox" aria-checked={check[i]} onClick={() => setCheck((c) => c.map((v, j) => (j === i ? !v : v)))}><span className="box"><Check size={13} /></span><span>{t}</span></button>)}</div>
        </div>
        {blockers && blockers.filter((b) => b !== 'CHECKLIST').map((b) => <p key={b} className="small" style={{ margin: '10px 4px 0', color: 'var(--accent-text)' }}>{blockerText[b]}</p>)}
        <div className="insp-actions"><button type="button" className="btn btn-primary" disabled={!ok} onClick={async () => { await approveRelease(ws.id, check); app.toast('Approved in this browser'); nav(`/w/${ws.id}/history`); }}><Stamp size={15} /> Approve release in this browser</button></div>
        <p className="small muted" style={{ margin: '12px 4px 0' }}>Approval is a local record for your team. It isn’t a legal or compliance sign-off, and it never publishes anything. After approval, new drafts are checked against this version.</p>
      </>}>
      <div className="page-h"><div><h1>Release review</h1><p>{draft.doc.title} · draft {draft.version.label}{firstDraftVersion && firstDraftVersion.id !== draft.version.id ? `, compared with ${firstDraftVersion.label} when first reviewed` : ''}.</p></div></div>
      {stale && <div style={{ marginBottom: 16 }}><Banner tone="info" icon={<ScanSearch size={18} />} title="Review this version before approving">Edits invalidate the last review. Nothing is marked resolved until it runs again.<br /><button type="button" className="btn btn-sm btn-primary" onClick={() => app.startReview(ws.id)}>Review again</button></Banner></div>}
      {!run ? <div className="empty-d"><h3>Not reviewed yet</h3><p>Run a review before release.</p></div> : (
        <>
          <div className="compare-d">
            <div className="col"><h3>{firstDraftVersion ? `Draft ${firstDraftVersion.label} · first review` : 'First review'}</h3><div><div className="big" style={{ color: 'var(--risk-high-fg)' }}>{firstFindings ? high(firstFindings) : '—'}</div><div className="lbl">High-priority findings</div></div>{steps && <div><div className="big">{steps.before ?? '—'}</div><div className="lbl">Fictional group size (of 100)</div></div>}</div>
            <span className="arrow"><ArrowRight size={22} /></span>
            <div className="col"><h3>Draft {draft.version.label} · {stale ? 'not reviewed' : 'latest review'}</h3><div><div className="big" style={{ color: high(findings) && !stale ? 'var(--risk-high-fg)' : 'var(--ink)' }}>{stale ? '—' : high(findings)}</div><div className="lbl">High-priority findings</div></div>{steps && <div><div className="big">{stale ? '—' : steps.now}</div><div className="lbl">Fictional group size (of 100)</div></div>}</div>
          </div>
          <div className="h2">Coverage</div>
          <div className="panel"><div className="coverage-d">
            <div className="cov-row"><span>Context</span><span className="bar"><i style={{ width: `${(run.coverage.contextAssessed / Math.max(1, run.coverage.paragraphsTotal)) * 100}%` }} />{run.coverage.contextAssessed < run.coverage.paragraphsTotal && <i className="un" style={{ width: `${((run.coverage.paragraphsTotal - run.coverage.contextAssessed) / Math.max(1, run.coverage.paragraphsTotal)) * 100}%` }} />}</span><span className="tnum">{run.coverage.contextAssessed}/{run.coverage.paragraphsTotal} ¶{findings.some((f) => f.source === 'FIXTURE') ? ' sample' : ''}</span></div>
            <div className="cov-row"><span>Rules</span><span className="bar"><i className="rules" style={{ width: '100%' }} /></span><span className="tnum">{run.coverage.rulesAssessed}/{run.coverage.paragraphsTotal} ¶</span></div>
          </div>{unassessed.length > 0 && <p className="small" style={{ color: 'var(--unassessed-fg)', marginTop: 10 }}><CircleDashed size={13} /> {unassessed.map((u) => u.title).join('; ')}.</p>}</div>
          <div className="h2">Remaining findings ({residual.length})</div>
          {residual.length ? <table className="tbl"><tbody>{residual.map((f) => <tr key={f.id} className="clickable" onClick={() => nav(`/w/${ws.id}/findings`)}><td style={{ width: 150 }}><RiskChip finding={f} small /></td><td className="t-title">{f.title}</td><td><StatusChip status={f.status} /></td></tr>)}</tbody></table>
            : <div className="panel small" style={{ color: 'var(--ink-2)' }}><CircleCheck size={14} /> None open. Outside knowledge can still identify people, so keep human review in the loop.</div>}
        </>
      )}
    </Shell>
  );
}
