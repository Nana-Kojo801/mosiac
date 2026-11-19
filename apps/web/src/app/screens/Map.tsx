import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Seg } from '../../ui/Seg';
import { useNavigate, useParams } from 'react-router';
import { FlaskConical } from 'lucide-react';
import { disclosureOfDraft, groupSteps } from '@mosaic/fixtures';
import { Shell, PageSkeleton } from '../Shell';
import { useWorkspace } from '../useWorkspace';
import { MosaicGrid, RiskChip, SourceBadge } from '../../ui/components';
import { buildGraph, type GEdge, type GNode } from '../../features/map/graph';
import { NotFound } from './NotFound';
import { useDetailsSheet } from '../MobileShell';

const COL_X = [20, 310, 580], COL_W = [200, 170, 220], NODE_H = 54, GAP = 18, TOP = 34;

export function MapScreen() {
  const { id } = useParams();
  const nav = useNavigate();
  const data = useWorkspace(id);
  const [mode, setMode] = useState<'map' | 'list'>('map');
  const sheet = useDetailsSheet();
  const [sel, setSel] = useState<{ kind: 'edge' | 'node'; id: string } | null>(null);
  const [stage, setStage] = useState<number | null>(null);
  const graph = useMemo(() => (data ? buildGraph(data.docs, data.findings) : { nodes: [], edges: [] }), [data]);
  if (data === undefined) return <PageSkeleton />;
  if (data === null) return <NotFound />;
  const cols = [0, 1, 2].map((c) => graph.nodes.filter((n) => n.col === c));
  const height = TOP + Math.max(1, ...cols.map((c) => c.length)) * (NODE_H + GAP) + 10;
  const pos = new Map<string, { x: number; y: number; w: number }>();
  cols.forEach((list, c) => { const total = list.length * (NODE_H + GAP) - GAP; const y0 = TOP + (height - TOP - 10 - total) / 2; list.forEach((n, i) => pos.set(n.id, { x: COL_X[c], y: y0 + i * (NODE_H + GAP), w: COL_W[c] })); });
  const path = (e: GEdge) => { const a = pos.get(e.from)!, b = pos.get(e.to)!; const x1 = a.x + a.w, y1 = a.y + NODE_H / 2, x2 = b.x, y2 = b.y + NODE_H / 2, mx = (x1 + x2) / 2; return `M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`; };
  const docTitle = (vid: string) => data.docs.find((d) => d.version.id === vid)?.doc.title ?? 'Earlier version';
  const steps = data.ws.kind === 'sample' && data.draft ? groupSteps(disclosureOfDraft(data.draft.version.normalizedText)) : null;
  const st = steps ? Math.min(stage ?? steps.length - 1, steps.length - 1) : 0;
  const selEdge = sel?.kind === 'edge' ? graph.edges.find((e) => e.id === sel.id) : undefined;
  const selNode = sel?.kind === 'node' ? graph.nodes.find((n) => n.id === sel.id) : undefined;
  const openRef = (r: { versionId: string; paragraph: number }) => { const d = data.docs.find((x) => x.version.id === r.versionId); nav(`/w/${data.ws.id}/document?${d ? `doc=${d.doc.id}` : `version=${r.versionId}`}&para=${r.paragraph}`); };
  const nodeClick = (n: GNode) => { setSel({ kind: 'node', id: n.id }); sheet.open(); };

  const inspector = (
    <>
      {selEdge ? (
        <><div className="insp-card"><span className="small muted">Connection</span><div className="insp-title" style={{ fontSize: 16, marginTop: 4 }}>{graph.nodes.find((n) => n.id === selEdge.from)?.label} → {graph.nodes.find((n) => n.id === selEdge.to)?.label}</div><p style={{ marginTop: 8, fontSize: 13.5, color: 'var(--ink-2)' }}>{selEdge.reason}</p></div>
          <div className="insp-label">Passages</div><div className="ev-list">{selEdge.refs.map((r, i) => <button key={i} type="button" className="ev-card" onClick={() => openRef(r)}><span className="ev-src">{docTitle(r.versionId)} · ¶{r.paragraph + 1}</span><span className="ev-q">“<mark className="ev">{r.quote}</mark>”</span></button>)}</div>
          <p className="small muted" style={{ margin: '10px 4px 0' }}>A connection is a hypothesis for review, not an identity match.</p></>
      ) : selNode?.finding ? (
        <div className="insp-card"><div className="hstack" style={{ justifyContent: 'space-between' }}><RiskChip finding={selNode.finding} small /><SourceBadge source={selNode.finding.source} /></div><div className="insp-title" style={{ fontSize: 16, marginTop: 8 }}>{selNode.finding.title}</div><p style={{ marginTop: 8, fontSize: 13.5, color: 'var(--ink-2)' }}>{selNode.finding.rationale}</p><div className="insp-actions"><button type="button" className="btn btn-tinted btn-sm" onClick={() => openRef(selNode.finding!.anchors[0])}>Show in document</button></div></div>
      ) : selNode ? (
        <div className="insp-card"><span className="small muted">{selNode.kind === 'doc' ? selNode.sub : 'Generic disclosure category'}</span><div className="insp-title" style={{ fontSize: 16, marginTop: 4 }}>{selNode.label}</div><p className="small muted" style={{ marginTop: 6 }}>{selNode.kind === 'cat' ? 'A category groups passages that disclose the same kind of context. It never stands for a person.' : 'Click a line to see the passages it connects.'}</p>{selNode.kind === 'doc' && <div className="insp-actions"><button type="button" className="btn btn-tinted btn-sm" onClick={() => nav(`/w/${data.ws.id}/document?doc=${selNode.ref}`)}>Open document</button></div>}</div>
      ) : <div className="insp-card"><p className="small muted">Click a line or a box for details.</p></div>}
      {steps && (
        <><div className="insp-label">Fictional group size</div>
          <div className="insp-card"><div style={{ maxWidth: 200, margin: '0 auto 12px' }}><MosaicGrid steps={steps} stage={st} /></div>
            <div className="steps">{steps.map((s, k) => <button key={k} type="button" className="step" aria-pressed={k === st} onClick={() => setStage(k)}><span><span className="st-l">{k === 0 ? 'Start' : `+ ${s.label}`}</span><span className="st-s">{s.source}</span></span><span className="st-n">{s.count}</span></button>)}</div>
            <p className="small muted" style={{ marginTop: 10 }}><span className="illustrative"><FlaskConical size={12} /> Educational illustration</span><br />Computed from 100 seeded fictional records in the sample. Not a measure of real-world anonymity.</p></div></>
      )}
    </>
  );
  return (
    <Shell title="Disclosure map" data={data} wide inspectorTitle="Details" inspectorKey={sel?.id} inspector={inspector}>
      <div className="page-h"><div><h1>Disclosure map</h1><p>How the draft connects to what’s already published. Click a line for its reason and the passages behind it.</p></div>
        <Seg id="map-mode" role="tab" value={mode} onChange={setMode} options={[['map', 'Map'], ['list', 'List']]} /></div>
      <AnimatePresence mode="wait" initial={false}>
      <motion.div key={mode} initial={{ opacity: 0, x: mode === 'list' ? 24 : -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: mode === 'list' ? -16 : 16 }} transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.2 }}>
      {!data.run ? <div className="empty-d"><h3>Not reviewed yet</h3><p>Run a review to see how the documents connect.</p></div> : !graph.edges.length ? <div className="empty-d"><h3>No open findings to map</h3><p>That doesn’t mean the draft is anonymous. Findings that are dismissed, resolved or not assessed are not shown.</p></div> : mode === 'map' ? (
        <>
          <div className="graph-wrap">
            <svg viewBox={`0 0 820 ${height}`} role="group" aria-label="Disclosure map">
              <text className="g-col" x={COL_X[0]} y={18}>DOCUMENTS</text><text className="g-col" x={COL_X[1]} y={18}>CATEGORIES</text><text className="g-col" x={COL_X[2]} y={18}>FINDINGS</text>
              {graph.edges.map((e) => <g key={e.id}><path className="g-hit" d={path(e)} tabIndex={0} role="button" aria-label={`Connection: ${e.reason}`} onClick={() => { setSel({ kind: 'edge', id: e.id }); sheet.open(); }} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setSel({ kind: 'edge', id: e.id }); sheet.open(); } }} /><path className={`g-edge${e.hot ? ' hot' : ''}${sel?.id === e.id ? ' sel' : ''}`} d={path(e)} /></g>)}
              {graph.nodes.map((n) => { const p = pos.get(n.id)!; const f = n.finding; const cls = n.kind === 'doc' ? (n.draft ? 'draft' : 'release') : n.kind === 'cat' ? 'cat' : `finding${f && f.band === 'MODERATE' ? ' mod' : ''}${f && f.band === 'LOW' ? ' mod' : ''}`; const label = n.label.length > 30 ? n.label.slice(0, 28) + '…' : n.label; return (
                <g key={n.id} className={`g-node ${cls}${sel?.id === n.id ? ' sel' : ''}`} tabIndex={0} role="button" aria-label={n.label} onClick={() => nodeClick(n)} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); nodeClick(n); } }}>
                  <rect x={p.x} y={p.y} width={p.w} height={NODE_H} rx={12} />
                  <text className="kind" x={p.x + 12} y={p.y + 16}>{n.kind === 'doc' ? (n.draft ? 'DRAFT' : 'RELEASE') : n.kind === 'cat' ? 'CATEGORY' : 'FINDING'}</text>
                  <text x={p.x + 12} y={p.y + 33}>{label}</text>
                  <text className="sub" x={p.x + 12} y={p.y + 47}>{f ? `${f.band === 'HIGH' || f.band === 'CRITICAL' ? 'High priority' : f.band === 'MODERATE' ? 'Needs review' : 'Low'} · ${f.score}/11` : n.sub}</text>
                </g>); })}
            </svg>
          </div>
          <div className="g-legend"><span><i style={{ background: 'var(--surface)' }} />Release / category</span><span><i style={{ background: 'var(--accent-soft)' }} />Draft</span><span><i style={{ background: 'var(--risk-high-bg)' }} />High-priority finding</span><span><i style={{ background: 'var(--risk-mod-bg)' }} />Other finding</span><span>No node represents a person</span></div>
          {data.stale && <p className="stale" style={{ marginTop: 10 }}>Documents changed since this review. Run it again to update the map.</p>}
        </>
      ) : (
        <table className="tbl"><thead><tr><th>From</th><th>To</th><th>Reason</th><th>Passages</th></tr></thead><tbody>
          {graph.edges.map((e) => <tr key={e.id} className={`clickable ${sel?.id === e.id ? 'sel' : ''}`} tabIndex={0} onClick={() => setSel({ kind: 'edge', id: e.id })} onKeyDown={(ev) => { if (ev.key === 'Enter') setSel({ kind: 'edge', id: e.id }); }}><td className="t-title">{graph.nodes.find((n) => n.id === e.from)?.label}</td><td className="t-title">{graph.nodes.find((n) => n.id === e.to)?.label}</td><td className="small">{e.reason}</td><td className="small mono">{e.refs.map((r) => `${docTitle(r.versionId)} ¶${r.paragraph + 1}`).join(', ')}</td></tr>)}
        </tbody></table>
      )}
      </motion.div>
      </AnimatePresence>
    </Shell>
  );
}
