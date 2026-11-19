import { Link, useParams } from 'react-router';
import { ClipboardCheck, Waypoints, AlertCircle, AlertTriangle, CircleDashed, ClipboardPaste, FileCheck, FilePen, FileUp, FlaskConical, Info, Lock, MonitorX, PenLine, RotateCw, ScanSearch, WifiOff } from 'lucide-react';
import { disclosureOfDraft, groupSteps } from '@mosaic/fixtures';
import { Shell, PageSkeleton } from '../Shell';
import { useWorkspace } from '../useWorkspace';
import { useApp } from '../store';
import { Banner, MosaicGrid, RiskChip, fmtDate, fmtTime, isClosed } from '../../ui/components';
import { readinessText } from '../../ai/gateway';
import { NotFound } from './NotFound';

export function Overview() {
  const { id } = useParams();
  const data = useWorkspace(id);
  const app = useApp();
  if (data === undefined) return <PageSkeleton />;
  if (data === null) return <NotFound />;
  const { ws, draft, releases, run, findings, stale } = data;
  const open = findings.filter((f) => !isClosed(f.status));
  const c = { high: open.filter((f) => f.status !== 'UNASSESSED' && (f.band === 'HIGH' || f.band === 'CRITICAL')).length, mod: open.filter((f) => f.status !== 'UNASSESSED' && f.band === 'MODERATE').length, low: open.filter((f) => f.status !== 'UNASSESSED' && f.band === 'LOW').length, un: open.filter((f) => f.status === 'UNASSESSED').length };
  const cov = run?.coverage;
  const r = app.readiness;
  const usesFixture = findings.some((f) => f.source === 'FIXTURE');
  const steps = ws.kind === 'sample' && draft ? groupSteps(disclosureOfDraft(draft.version.normalizedText)) : null;
  if (!draft && !releases.length) {
    return (
      <Shell title="Overview" data={data}>
        <div className="page-h"><div><h1>{ws.title}</h1><p>Private · in this browser</p></div></div>
        <div className="empty-d"><div className="mini-mosaic">{Array.from({ length: 12 }, (_, i) => <i key={i} />)}</div><h3>Add your documents</h3><p>Add the draft you plan to publish, and any releases that are already out. Everything is classed private.</p>
          <div className="hstack" style={{ justifyContent: 'center' }}><Link to={`/w/${ws.id}/import`} className="btn btn-primary" style={{ textDecoration: 'none' }}><FileUp size={16} /> Import files</Link><Link to={`/w/${ws.id}/import?paste=1`} className="btn btn-tinted" style={{ textDecoration: 'none' }}><ClipboardPaste size={16} /> Paste text</Link></div></div>
      </Shell>
    );
  }
  return (
    <Shell title="Overview" data={data}>
      <div className="page-h"><div><h1>{ws.title}</h1><p>{ws.description ?? 'Private · in this browser'}</p></div></div>
      <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
        {!app.online && <Banner tone="neutral" icon={<WifiOff size={18} />} title="Offline">Private review keeps working on this device. Cloud test packs resume when you reconnect.</Banner>}
        {r && !r.ok && <Banner tone="warn" icon={<MonitorX size={18} />} title="No on-device model in this browser">{readinessText(r.reason, r.detail)}. {ws.kind === 'sample' ? 'The sample shows authored sample results instead, labelled as such.' : 'Contextual checks are left not assessed; rules-based checks still run.'} Nothing is sent to the cloud instead. <Link to="/device" style={{ color: 'inherit', fontWeight: 600 }}>Details</Link></Banner>}
        {cov && cov.unassessedChunks.length > 0 && <Banner tone="un" icon={<CircleDashed size={18} />} title="Partial review">{cov.unassessedChunks.map((u) => `¶${u.paragraphs[0] + 1}–${u.paragraphs[1] + 1}: ${u.reason}`).join('; ')}.<br /><button type="button" className="btn btn-sm btn-tinted" onClick={() => app.startReview(ws.id)}><RotateCw size={14} /> Run again</button></Banner>}
      </div>
      {draft ? (
        <div className="status-d">
          <div className="panel">
            <div className="hstack" style={{ justifyContent: 'space-between' }}><div><span className="small muted">Next release</span><div style={{ fontSize: 17, fontWeight: 650 }}>{draft.doc.title} · draft {draft.version.label}</div></div>{run && !stale ? <RiskChip band={c.high ? 'HIGH' : c.mod ? 'MODERATE' : 'LOW'} /> : null}</div>
            {run ? (
              <div className="counts-d">
                <Link to={`/w/${ws.id}/findings?filter=high`} className="count-d high" style={{ textDecoration: 'none', color: 'inherit' }}><strong>{c.high}</strong><span><AlertTriangle size={12} /> High priority</span></Link>
                <Link to={`/w/${ws.id}/findings?filter=mod`} className="count-d mod" style={{ textDecoration: 'none', color: 'inherit' }}><strong>{c.mod}</strong><span><AlertCircle size={12} /> Needs review</span></Link>
                <Link to={`/w/${ws.id}/findings?filter=low`} className="count-d" style={{ textDecoration: 'none', color: 'inherit' }}><strong>{c.low}</strong><span><Info size={12} /> Low</span></Link>
                <Link to={`/w/${ws.id}/findings?filter=un`} className="count-d un" style={{ textDecoration: 'none', color: 'inherit' }}><strong>{c.un}</strong><span><CircleDashed size={12} /> Not assessed</span></Link>
              </div>
            ) : <p className="small muted" style={{ marginTop: 12 }}>Not reviewed yet. Run a review to check this draft against {releases.length} published release{releases.length === 1 ? '' : 's'}.</p>}
            {stale && <p className="stale" style={{ marginTop: 12 }}><ScanSearch size={14} /> Documents changed since the last review. Run it again; nothing is marked resolved until you do.</p>}
          </div>
          <div className="panel" style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
            <span className="small muted">Coverage{run ? ` · ${fmtTime(run.finishedAt)}` : ''}</span>
            {cov ? (
              <div className="coverage-d">
                <div className="cov-row"><span>Context</span><span className="bar"><i style={{ width: `${(cov.contextAssessed / Math.max(1, cov.paragraphsTotal)) * 100}%` }} />{cov.contextAssessed < cov.paragraphsTotal && <i className="un" style={{ width: `${((cov.paragraphsTotal - cov.contextAssessed) / Math.max(1, cov.paragraphsTotal)) * 100}%` }} />}</span><span className="tnum">{cov.contextAssessed}/{cov.paragraphsTotal} ¶{usesFixture ? ' sample' : ''}</span></div>
                <div className="cov-row"><span>Rules</span><span className="bar"><i className="rules" style={{ width: '100%' }} /></span><span className="tnum">{cov.rulesAssessed}/{cov.paragraphsTotal} ¶</span></div>
              </div>
            ) : <p className="small muted">No review yet.</p>}
            <div className="hstack" style={{ marginTop: 4 }}><Link to={`/w/${ws.id}/document`} className="btn btn-quiet btn-sm" style={{ textDecoration: 'none' }}><FilePen size={14} /> Open draft</Link><Link to={`/w/${ws.id}/rewrite`} className="btn btn-tinted btn-sm" style={{ textDecoration: 'none' }}><PenLine size={14} /> Rewrite</Link></div>
          </div>
        </div>
      ) : <Banner tone="info" icon={<FileUp size={18} />} title="Add a draft">Releases are here; add the draft you plan to publish so Mosaic can check it against them.</Banner>}
      <div className="h2">Documents <Link to={`/w/${ws.id}/import`} className="btn btn-plain">Add</Link></div>
      <table className="tbl"><thead><tr><th /><th>Title</th><th>Role</th><th>Version</th><th>Classification</th></tr></thead><tbody>
        {[...(draft ? [draft] : []), ...releases.slice().reverse()].map(({ doc, version }) => (
          <tr key={doc.id}><td style={{ width: 40 }}><span className={`doc-ic ${doc.role === 'draft' ? 'draft' : ''}`}>{doc.role === 'draft' ? <FilePen size={15} /> : <FileCheck size={15} />}</span></td><td className="t-title"><Link to={`/w/${ws.id}/document?doc=${doc.id}`} style={{ color: 'inherit' }}>{doc.title}</Link></td><td>{doc.role === 'draft' ? 'Draft to review' : `Published ${fmtDate(doc.approvedAt)}`}</td><td className="mono">{version.label}</td><td><span className="pack-src"><Lock size={11} /> Private</span></td></tr>
        ))}
      </tbody></table>
      <div className="h2">Tools</div>
      <div className="grid-3">
        <Link to={`/w/${ws.id}/map`} className="tool-tile" style={{ textDecoration: 'none', color: 'inherit' }}><Waypoints size={20} /><b>Disclosure map</b><span>How the documents connect</span></Link>
        <Link to="/tests" className="tool-tile" style={{ textDecoration: 'none', color: 'inherit' }}><FlaskConical size={20} /><b>Stress tests</b><span>Packs applied during review</span></Link>
        <Link to={`/w/${ws.id}/release`} className="tool-tile" style={{ textDecoration: 'none', color: 'inherit' }}><ClipboardCheck size={20} /><b>Release review</b><span>Checklist and approval</span></Link>
      </div>
      {steps && (
        <>
          <div className="h2">Fictional group size</div>
          <div className="panel grid-2" style={{ gridTemplateColumns: '180px 1fr', alignItems: 'center' }}>
            <MosaicGrid steps={steps} stage={steps.length - 1} />
            <div><div style={{ fontSize: 34, fontWeight: 750 }}>{steps.at(-1)!.count} <span className="small muted">of 100</span></div><p className="small" style={{ color: 'var(--ink-2)' }}>{steps.slice(1).map((s) => s.label).join(' + ')}</p><p className="small muted" style={{ marginTop: 8 }}><span className="illustrative"><FlaskConical size={12} /> Educational illustration</span><br />Computed from 100 seeded fictional records in the sample. Not a measure of real-world anonymity.</p></div>
          </div>
        </>
      )}
    </Shell>
  );
}
