import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { CircleCheck, FilePen, FileText, Pencil, ScanSearch, Undo2 } from 'lucide-react';
import { disclosureOfDraft, groupSteps } from '@mosaic/fixtures';
import { Shell } from '../Shell';
import { useWorkspace } from '../useWorkspace';
import { useApp } from '../store';
import { RiskChip, SourceBadge, isClosed } from '../../ui/components';
import { applySuggestions, saveManualEdit, undoRewrite } from '../../features/review/rewrite';
import { NotFound } from './NotFound';
import { db } from '../../storage/db';
import { diffWords } from '../../ui/diff';
import { useLive } from '../live';

export function Rewrite() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const data = useWorkspace(id);
  const app = useApp();
  const [manual, setManual] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const latest = data?.rewrites.find((r) => !r.undone);
  // Compare against the original version this chain of edits started from.
  const base = useLive(async () => {
    if (!data?.draft || data.draft.version.sourceKind !== 'rewrite') return undefined;
    let v = data.draft.version;
    while (v.parentVersionId) { const p = await db().versions.get(v.parentVersionId); if (!p) break; v = p; if (p.sourceKind !== 'rewrite') break; }
    return v.id === data.draft.version.id ? undefined : v;
  }, [data?.draft?.version.id]);
  const focus = sp.get('focus');
  const cands = useMemo(() => {
    const list = (data?.findings ?? []).filter((f) => f.suggestion && !isClosed(f.status) && f.status !== 'UNASSESSED');
    return focus ? [...list].sort((a, b) => (a.id === focus ? -1 : b.id === focus ? 1 : 0)) : list;
  }, [data, focus]);
  if (data === undefined) return null;
  if (data === null) return <NotFound />;
  const draft = data.draft;
  if (!draft) return <Shell title="Rewrite studio" data={data}><div className="empty-d"><h3>No draft yet</h3><p>Add a draft to rewrite.</p></div></Shell>;
  const text = draft.version.normalizedText;
  const pending = cands.filter((f) => text.includes(f.suggestion!.from));
  const applied = cands.filter((f) => f.status === 'UNDER_REVIEW' && !text.includes(f.suggestion!.from));
  const steps = data.ws.kind === 'sample' ? { before: groupSteps(disclosureOfDraft(base?.normalizedText ?? text)).at(-1)!.count, now: groupSteps(disclosureOfDraft(text)).at(-1)!.count } : null;
  const sideBySide = base ? pairParagraphs(base.normalizedText, base.paragraphs, text, draft.version.paragraphs) : null;

  async function apply(ids: string[]) {
    setBusy(true);
    try { const r = await applySuggestions(data!.ws.id, ids); app.toast(`Draft ${(await db().versions.get(r.record.resultingVersionId))?.label} created${r.skipped.length ? ` · ${r.skipped.length} no longer matched` : ''}`); }
    catch (e) { app.toast((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <Shell title="Rewrite studio" data={data} wide inspectorTitle="Suggested edits" inspector={
      <>
        {latest && (
          <div className="insp-card" style={{ marginBottom: 10 }}>
            <b style={{ fontSize: 13.5 }}>Latest edit</b>
            <p className="small muted" style={{ marginTop: 4 }}>{base?.label ?? 'Original'} → {draft.version.label}. {data.stale ? 'Not reviewed yet: findings still describe the earlier version.' : 'Reviewed.'}</p>
            {steps && <p className="small" style={{ marginTop: 6 }}>Fictional group: <b>{steps.before}</b> → <b>{steps.now}</b> of 100</p>}
            <div className="insp-actions"><div className="two"><button type="button" className="btn btn-quiet btn-sm" onClick={async () => { await undoRewrite(latest.id); app.toast('Edit undone'); }}><Undo2 size={14} /> Undo</button><button type="button" className="btn btn-primary btn-sm" disabled={!data.stale || app.review[data.ws.id]?.running} onClick={() => app.startReview(data.ws.id)}><ScanSearch size={14} /> Review again</button></div></div>
          </div>
        )}
        {app.review[data.ws.id]?.last && !data.stale && latest && (() => { const d = app.review[data.ws.id]!.last!.diff; return <div className="insp-card" style={{ marginBottom: 10 }}><div className="hstack" style={{ justifyContent: 'space-between', marginBottom: 8 }}><b style={{ fontSize: 13.5 }}>Reassessment</b></div><div className="reassess"><div><strong>{d.resolved}</strong><span>Resolved</span></div><div><strong>{d.unchanged}</strong><span>Unchanged</span></div><div><strong>{d.added}</strong><span>New</span></div><div><strong>{d.unassessed}</strong><span>Not assessed</span></div></div></div>; })()}
        {pending.map((f) => (
          <div key={f.id} className="edit-d">
            <div className="top"><RiskChip finding={f} small /><SourceBadge source={f.source} /></div>
            <b style={{ fontSize: 13.5 }}>{f.title}</b>
            <div className="diffbox"><del className="diff">{f.suggestion!.from}</del>{f.suggestion!.to ? <> <ins className="diff">{f.suggestion!.to}</ins></> : null}</div>
            <div className="insp-actions" style={{ marginTop: 2 }}><div className="two"><button type="button" className="btn btn-quiet btn-sm" onClick={() => setManual(text)}><Pencil size={14} /> Edit myself</button><button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => apply([f.id])}>Apply</button></div></div>
          </div>
        ))}
        {pending.length > 1 && <div className="insp-actions"><button type="button" className="btn btn-tinted" disabled={busy} onClick={() => apply(pending.map((f) => f.id))}>Apply all {pending.length}</button></div>}
        {!pending.length && <div className="insp-card"><p className="small muted">{applied.length ? 'All suggestions are applied. Review again to reassess.' : data.run ? 'No open suggestions. You can still edit the text yourself.' : 'Run a review to get suggestions.'}</p></div>}
        <div className="insp-actions"><button type="button" className="btn btn-quiet" onClick={() => setManual(text)}><Pencil size={15} /> Edit the draft myself</button></div>
      </>}>
      <div className="page-h"><div><h1>Rewrite studio</h1><p>Suggestions keep the analytical point and drop unneeded detail. Applying one creates a new version; the original is kept and you can undo.</p></div></div>
      {manual !== null ? (
        <div className="panel" style={{ display: 'grid', gap: 10 }}>
          <label htmlFor="manual" className="small muted">Editing {draft.doc.title} · saves as a new version</label>
          <textarea id="manual" className="field" style={{ minHeight: 360 }} value={manual} onChange={(e) => setManual(e.target.value)} />
          <div className="hstack" style={{ justifyContent: 'flex-end' }}><button type="button" className="btn btn-quiet" onClick={() => setManual(null)}>Cancel</button><button type="button" className="btn btn-primary" disabled={manual === text} onClick={async () => { const v = await saveManualEdit(data.ws.id, manual); setManual(null); app.toast(`Saved as ${v.label}`); }}>Save as new version</button></div>
        </div>
      ) : (
        <div className="diff-cols">
          <div><h3><FileText size={14} /> {base ? `Draft ${base.label} · original` : `Draft ${draft.version.label} · current`}</h3>{sideBySide ? sideBySide.map(([a, b], i) => <p key={i}><span className="para-anchor">¶{i + 1}</span><span style={{ whiteSpace: 'pre-wrap' }}>{diffWords(a, b).map((d, k) => d.kind === 'ins' ? null : d.kind === 'del' ? <del key={k} className="diff">{d.text}</del> : d.text)}</span></p>) : draft.version.paragraphs.map((p, i) => <p key={i}><span className="para-anchor">¶{i + 1}</span><span style={{ whiteSpace: 'pre-wrap' }}>{text.slice(p.start, p.end)}</span></p>)}</div>
          <div><h3><FilePen size={14} /> {base ? `Draft ${draft.version.label} · now` : 'After'}</h3>{sideBySide ? sideBySide.map(([a, b], i) => <p key={i}><span className="para-anchor">¶{i + 1}</span><span style={{ whiteSpace: 'pre-wrap' }}>{diffWords(a, b).map((d, k) => d.kind === 'del' ? null : d.kind === 'ins' ? <ins key={k} className="diff">{d.text}</ins> : d.text)}</span></p>) : <p className="muted" style={{ display: 'block' }}>Apply a suggestion from the panel to start a new version.</p>}</div>
        </div>
      )}
      {data.stale && latest && <p className="stale" style={{ marginTop: 14 }}><CircleCheck size={14} /> Edits are saved. Review again to see what changed; nothing is marked resolved until then. <Link to={`/w/${data.ws.id}/findings`}>Findings</Link></p>}
    </Shell>
  );
}

function pairParagraphs(a: string, ap: { start: number; end: number }[], b: string, bp: { start: number; end: number }[]): [string, string][] {
  if (ap.length !== bp.length) return [[a, b]];
  return ap.map((p, i) => [a.slice(p.start, p.end), b.slice(bp[i].start, bp[i].end)]);
}

