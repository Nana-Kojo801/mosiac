import { useState } from 'react';
import { Link } from 'react-router';
import { PenLine, RotateCw, Undo2 } from 'lucide-react';
import type { Finding } from '@mosaic/schemas';
import { PolicyTag, RiskChip, ScoreBars, SourceBadge, StatusChip, isClosed } from '../ui/components';
import { setFindingStatus } from '../features/review/rewrite';
import { useApp } from './store';
import type { WorkspaceData } from './useWorkspace';

const CATEGORY_LABEL: Record<string, string> = { DIRECT_IDENTIFIER: 'Direct identifier', PRECISE_DATE: 'Precise date', RARE_ATTRIBUTE: 'Rare attribute', NARROW_LOCATION: 'Narrow location', DISTINCTIVE_EVENT: 'Distinctive event', CROSS_RELEASE: 'Cross-release context', EXCESSIVE_DETAIL: 'Excessive detail', SENSITIVE_CONTEXT: 'Sensitive context' };
const CONF = { HIGH: 'High confidence', MEDIUM: 'Medium confidence', LOW: 'Low confidence' } as const;

export function FindingInspector({ f, data, onJump }: { f?: Finding; data: WorkspaceData; onJump: (versionId: string, paragraph: number, findingId: string) => void }) {
  const app = useApp();
  const [dismissing, setDismissing] = useState(false);
  const [note, setNote] = useState('');
  if (!f) return <div className="insp-card"><p className="muted">Select a finding to see its evidence.</p></div>;
  const titleOf = (versionId: string) => data.docs.find((d) => d.version.id === versionId)?.doc.title ?? 'An earlier version';
  const closed = isClosed(f.status);
  const sourceNote = f.source === 'FIXTURE' ? 'Authored sample result for the fictional sample, shown because no on-device model is available here. It is not model output.' : null;
  return (
    <>
      <div className="insp-card">
        <div className="hstack" style={{ justifyContent: 'space-between', marginBottom: 8 }}><RiskChip finding={f} /><span className="small muted mono">{f.ruleId ?? f.id.slice(-6)}</span></div>
        <div className="insp-title">{f.title}</div>
        <div className="hstack" style={{ marginTop: 10 }}><SourceBadge source={f.source} />{f.source === 'DEVICE' && <PolicyTag policy="ONLY_ON_DEVICE" />}<StatusChip status={f.status} /></div>
        {f.status !== 'UNASSESSED' && <p className="small muted" style={{ marginTop: 8 }}>{CATEGORY_LABEL[f.category]}</p>}
        <p style={{ marginTop: 10, fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink-2)' }}>{f.rationale}</p>
        {sourceNote && <p className="small muted" style={{ marginTop: 8 }}>{sourceNote}</p>}
        {f.statusNote && <p className="small" style={{ marginTop: 8 }}><b>Your note:</b> {f.statusNote}</p>}
      </div>
      {f.status === 'UNASSESSED' ? (
        <div className="insp-actions"><button type="button" className="btn btn-primary" onClick={() => app.startReview(data.ws.id)}><RotateCw size={15} /> Run the review again</button>{f.anchors[0] && <button type="button" className="btn btn-quiet" onClick={() => onJump(f.anchors[0].versionId, f.anchors[0].paragraph, f.id)}>Review these paragraphs by hand</button>}</div>
      ) : (
        <>
          <div className="insp-label">Evidence · {f.anchors.length} passage{f.anchors.length > 1 ? 's' : ''}</div>
          <div className="ev-list">{f.anchors.map((a, i) => <button key={i} type="button" className="ev-card" onClick={() => onJump(a.versionId, a.paragraph, f.id)}><span className="ev-src">{titleOf(a.versionId)} · ¶{a.paragraph + 1}{a.validation === 'RELOCATED' ? ' · re-anchored' : ''}</span><span className="ev-q">“<mark className={`ev ev-${f.band === 'LOW' ? 'low' : f.band === 'MODERATE' ? 'mod' : 'high'}`}>{a.quote}</mark>”</span></button>)}</div>
          <div className="insp-label">Review priority</div>
          <div className="insp-card"><ScoreBars f={f} /><p className="small muted" style={{ marginTop: 8 }}>A review priority, not a probability of identification.</p></div>
          <div className="insp-label">Confidence</div>
          <div className="insp-card"><b style={{ fontSize: 13.5 }}>{CONF[f.confidence]}</b><p className="small" style={{ color: 'var(--ink-2)', marginTop: 4 }}>{f.confidenceReason}</p></div>
          {f.suggestion && <><div className="insp-label">Suggested change</div><div className="insp-card"><div className="diffbox"><del className="diff">{f.suggestion.from}</del>{f.suggestion.to ? <> <ins className="diff">{f.suggestion.to}</ins></> : null}</div></div></>}
          {dismissing ? (
            <>
              <label className="insp-label" htmlFor="dismiss-note" style={{ display: 'block' }}>Why dismiss? (optional, stays on this device)</label>
              <textarea id="dismiss-note" className="note-field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: already public in the funder’s report" />
              <div className="insp-actions"><div className="two"><button type="button" className="btn btn-quiet" onClick={() => setDismissing(false)}>Cancel</button><button type="button" className="btn btn-danger" onClick={async () => { await setFindingStatus(f.id, 'DISMISSED', note); setDismissing(false); setNote(''); app.toast('Finding dismissed'); }}>Dismiss</button></div></div>
            </>
          ) : closed ? (
            <div className="insp-actions"><button type="button" className="btn btn-quiet" onClick={async () => { await setFindingStatus(f.id, 'OPEN'); app.toast('Finding reopened'); }}><Undo2 size={15} /> Reopen</button></div>
          ) : (
            <div className="insp-actions">
              {f.suggestion && <Link to={`/w/${data.ws.id}/rewrite?focus=${f.id}`} className="btn btn-primary" style={{ textDecoration: 'none' }}><PenLine size={15} /> Preview rewrite</Link>}
              <div className="two"><button type="button" className="btn btn-quiet" onClick={async () => { await setFindingStatus(f.id, 'ACCEPTED_RESIDUAL'); app.toast('Accepted as residual'); }}>Accept residual</button><button type="button" className="btn btn-quiet" onClick={() => setDismissing(true)}>Dismiss…</button></div>
            </div>
          )}
          <p className="small muted" style={{ margin: '14px 4px 0' }}>Advisory. Mosaic suggests; you decide what to publish.</p>
        </>
      )}
    </>
  );
}
