import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Shell, PageSkeleton } from '../Shell';
import { useWorkspace } from '../useWorkspace';
import { useApp } from '../store';
import { useLive } from '../live';
import { db } from '../../storage/db';
import { StatusChip, fmtDate } from '../../ui/components';
import { revokeRelease } from '../../features/release/release';
import { diffWords } from '../../ui/diff';
import { NotFound } from './NotFound';

export function History() {
  const { id } = useParams();
  const data = useWorkspace(id);
  const app = useApp();
  const nav = useNavigate();
  const records = useLive(async () => (id ? (await db().releases.where('workspaceId').equals(id).toArray()).sort((a, b) => b.approvedAt.localeCompare(a.approvedAt)) : []), [id]);
  const [sel, setSel] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);
  if (data === undefined) return <PageSkeleton />;
  if (data === null) return <NotFound />;
  type Item = { key: string; title: string; when: string; kind: 'draft' | 'approved' | 'imported' | 'revoked'; docId: string; versionId: string; recordId?: string };
  const items: Item[] = [];
  if (data.draft) items.push({ key: 'draft', title: `${data.draft.doc.title} · ${data.draft.version.label}`, when: 'Draft · not approved', kind: 'draft', docId: data.draft.doc.id, versionId: data.draft.version.id });
  for (const r of records ?? []) { const d = data.docs.find((x) => x.doc.id === r.documentId); items.push({ key: r.id, title: `${d?.doc.title ?? 'Document'}`, when: `${r.revokedAt ? 'Approval revoked' : 'Approved'} ${fmtDate(r.revokedAt ?? r.approvedAt)}`, kind: r.revokedAt ? 'revoked' : 'approved', docId: r.documentId, versionId: r.versionId, recordId: r.id }); }
  const recorded = new Set((records ?? []).filter((r) => !r.revokedAt).map((r) => r.documentId));
  for (const r of data.releases.slice().reverse()) if (!recorded.has(r.doc.id)) items.push({ key: r.doc.id, title: `${r.doc.title} · ${r.version.label}`, when: `Imported as published ${fmtDate(r.doc.approvedAt)}`, kind: 'imported', docId: r.doc.id, versionId: r.version.id });
  const cur = items.find((i) => i.key === sel) ?? items[0];
  const rec = records?.find((r) => r.id === cur?.recordId);
  const curText = data.docs.find((d) => d.version.id === cur?.versionId)?.version;
  const draftV = data.draft?.version;
  return (
    <Shell title="Release history" data={data} inspectorTitle="Snapshot" inspector={cur ? (
      <>
        <div className="insp-card"><b>{cur.title}</b><p className="small muted" style={{ marginTop: 4 }}>{cur.when}</p>
          {rec && <dl className="kv" style={{ marginTop: 12 }}><dt>Open or residual findings</dt><dd>{rec.reviewSummary.openFindings}</dd><dt>Context coverage</dt><dd>{rec.reviewSummary.coverage.contextAssessed}/{rec.reviewSummary.coverage.paragraphsTotal} ¶</dd></dl>}
          {cur.kind === 'imported' && <p className="small" style={{ marginTop: 10, color: 'var(--ink-2)' }}>Imported as already published. Mosaic uses it as context for later drafts but has no review record for it.</p>}</div>
        <div className="insp-actions">
          <button type="button" className="btn btn-tinted" onClick={() => nav(`/w/${data.ws.id}/document?doc=${cur.docId}`)}>View document</button>
          {draftV && cur.kind !== 'draft' && <button type="button" className="btn btn-quiet" onClick={() => setCompare((c) => !c)}>{compare ? 'Hide comparison' : 'Compare with the current draft'}</button>}
          {cur.kind === 'approved' && rec && <button type="button" className="btn btn-quiet" onClick={async () => { await revokeRelease(rec.id); app.toast('Approval revoked; the document is a draft again'); }}>Revoke approval marker</button>}
          {cur.kind === 'draft' && <button type="button" className="btn btn-tinted" onClick={() => nav(`/w/${data.ws.id}/release`)}>Open release review</button>}
        </div>
      </>) : undefined}>
      <div className="page-h"><div><h1>Release history</h1><p>Published and approved versions in this browser. Every new draft is compared against them.</p></div></div>
      <div className="timeline">{items.map((x) => <button key={x.key} type="button" className={`tl-item ${x.kind === 'draft' ? 'current' : x.kind === 'revoked' ? '' : 'approved'} ${cur?.key === x.key ? 'sel' : ''}`} onClick={() => { setSel(x.key); setCompare(false); }}><b>{x.title}</b>{x.kind === 'draft' ? <StatusChip status="UNDER_REVIEW" /> : <span className="small muted">{x.kind === 'imported' ? 'Imported release' : x.kind === 'revoked' ? 'Revoked' : 'Approved here'}</span>}<span className="small muted">{x.when}</span></button>)}</div>
      {compare && curText && draftV && (
        <><div className="h2">{cur.title} compared with the current draft</div>
          <div className="panel line" style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{diffWords(curText.normalizedText, draftV.normalizedText).map((d, k) => d.kind === 'same' ? d.text : d.kind === 'del' ? <del key={k} className="diff">{d.text}</del> : <ins key={k} className="diff">{d.text}</ins>)}</div></>
      )}
    </Shell>
  );
}
