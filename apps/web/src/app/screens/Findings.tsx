import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Shell, PageSkeleton } from '../Shell';
import { useWorkspace } from '../useWorkspace';
import { FindingInspector } from '../FindingInspector';
import { RiskChip, SourceBadge, StatusChip, isClosed } from '../../ui/components';
import { NotFound } from './NotFound';
import { useDetailsSheet } from '../MobileShell';
import type { Finding } from '@mosaic/schemas';

const FILTERS: [string, string, (f: Finding) => boolean][] = [
  ['all', 'All', () => true],
  ['high', 'High priority', (f) => f.status !== 'UNASSESSED' && (f.band === 'HIGH' || f.band === 'CRITICAL')],
  ['mod', 'Needs review', (f) => f.status !== 'UNASSESSED' && f.band === 'MODERATE'],
  ['low', 'Low', (f) => f.status !== 'UNASSESSED' && f.band === 'LOW'],
  ['un', 'Not assessed', (f) => f.status === 'UNASSESSED'],
  ['device', 'On device', (f) => f.source === 'DEVICE'],
  ['rules', 'Rules', (f) => f.source === 'RULES'],
  ['sample', 'Sample results', (f) => f.source === 'FIXTURE'],
  ['closed', 'Closed', (f) => isClosed(f.status)],
];

export function Findings() {
  const { id } = useParams();
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const data = useWorkspace(id);
  const [selected, setSelected] = useState<string | undefined>();
  const sheet = useDetailsSheet();
  if (data === undefined) return <PageSkeleton />;
  if (data === null) return <NotFound />;
  const filter = sp.get('filter') ?? 'all';
  const fn = FILTERS.find((f) => f[0] === filter)?.[2] ?? (() => true);
  const list = data.findings.filter((f) => (filter === 'closed' ? true : filter === 'all' ? true : !isClosed(f.status)) && fn(f));
  const finding = data.findings.find((f) => f.id === selected) ?? list[0];
  const docTitle = (vid: string) => data.docs.find((d) => d.version.id === vid)?.doc.title ?? 'Earlier version';
  return (
    <Shell title="Findings" data={data} wide inspectorTitle="Finding" inspectorKey={finding?.id} inspector={<FindingInspector f={finding} data={data} onJump={(versionId, paragraph, fid) => { const d = data.docs.find((x) => x.version.id === versionId); nav(`/w/${data.ws.id}/document?${d ? `doc=${d.doc.id}` : `version=${versionId}`}&para=${paragraph}&finding=${fid}`); }} />}>
      <div className="page-h"><div><h1>Findings</h1><p>{data.draft ? `${data.draft.doc.title} · draft ${data.draft.version.label}, checked against ${data.releases.length} published release${data.releases.length === 1 ? '' : 's'}.` : 'No draft yet.'}</p></div></div>
      {!data.run ? <div className="empty-d"><h3>Not reviewed yet</h3><p>Run a review to see findings for this draft.</p></div> : (
        <>
          {data.stale && <p className="stale" style={{ marginBottom: 10 }}>Documents changed since this review. These findings describe the earlier versions.</p>}
          <div className="filters-d" role="toolbar" aria-label="Filter findings">{FILTERS.map(([k, l, f]) => { const n = data.findings.filter((x) => (k === 'closed' || k === 'all' ? true : !isClosed(x.status)) && f(x)).length; return n || k === 'all' ? <button key={k} type="button" className="fchip" aria-pressed={k === filter} onClick={() => setSp(k === 'all' ? {} : { filter: k })}>{l} <span className="n">{n}</span></button> : null; })}</div>
          <table className="tbl"><thead><tr><th>Priority</th><th>Finding</th><th>Documents</th><th>Source</th><th>Status</th><th className="num">Score</th></tr></thead><tbody>
            {list.map((x) => (
              <tr key={x.id} className={`clickable ${x.id === finding?.id ? 'sel' : ''} ${isClosed(x.status) ? 'done' : ''}`} tabIndex={0} onClick={() => { setSelected(x.id); sheet.open(); }} onKeyDown={(e) => { if (e.key === 'Enter') { setSelected(x.id); sheet.open(); } }}>
                <td><RiskChip finding={x} small /></td><td><div className="t-title">{x.title}</div></td>
                <td className="small">{[...new Set(x.anchors.map((a) => docTitle(a.versionId)))].join(', ')}</td>
                <td><SourceBadge source={x.source} /></td><td><StatusChip status={x.status} /></td><td className="num mono">{x.status === 'UNASSESSED' ? '—' : `${x.score}/11`}</td>
              </tr>
            ))}
          </tbody></table>
          {!list.length && <div className="empty-d" style={{ marginTop: 12 }}><h3>Nothing in this filter</h3><p>That doesn’t mean the draft is anonymous. It means no finding matches.</p></div>}
          <p className="small muted" style={{ marginTop: 14 }}>Scores are review priority from four rubric dimensions, not a probability of identification. A low score is not clearance.</p>
        </>
      )}
    </Shell>
  );
}
