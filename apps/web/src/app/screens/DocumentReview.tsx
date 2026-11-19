import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { FileCheck, FilePen, Lock } from 'lucide-react';
import { Shell } from '../Shell';
import { useWorkspace } from '../useWorkspace';
import { FindingInspector } from '../FindingInspector';
import { MarkedText } from '../../ui/MarkedText';
import { isClosed } from '../../ui/components';
import { NotFound } from './NotFound';
import { useDetailsSheet } from '../MobileShell';
import { db } from '../../storage/db';
import { useLive } from '../live';

export function DocumentReview() {
  const { id } = useParams();
  const [sp, setSp] = useSearchParams();
  const data = useWorkspace(id);
  const [selected, setSelected] = useState<string | undefined>(sp.get('finding') ?? undefined);
  const sheet = useDetailsSheet();
  const docId = sp.get('doc') ?? data?.draft?.doc.id ?? data?.docs[0]?.doc.id;
  const versionParam = sp.get('version');
  const current = data?.docs.find((d) => d.doc.id === docId);
  const shown = useLive(async () => (versionParam ? db().versions.get(versionParam) : current?.version), [versionParam, current?.version.id]);
  const visible = useMemo(() => (data && shown ? data.findings.filter((f) => !isClosed(f.status) && f.anchors.some((a) => a.versionId === shown.id && a.quote)) : []), [data, shown]);

  useEffect(() => {
    const p = sp.get('para');
    if (!shown || p == null) return;
    const el = document.getElementById(`p-${shown.id}-${p}`);
    if (el) { el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1300); }
  }, [shown, sp]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches('input, textarea, select') || !visible.length) return;
      if (e.key !== 'j' && e.key !== 'k') return;
      let i = visible.findIndex((f) => f.id === selected);
      i = (i + (e.key === 'j' ? 1 : visible.length - 1)) % visible.length;
      setSelected(visible[i].id);
      document.querySelector(`mark[data-f="${visible[i].id}"]`)?.scrollIntoView({ block: 'center' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, selected]);

  if (data === undefined) return null;
  if (data === null) return <NotFound />;
  const finding = data.findings.find((f) => f.id === selected) ?? visible[0];
  const jump = (versionId: string, paragraph: number, findingId: string) => {
    const d = data.docs.find((x) => x.version.id === versionId);
    setSelected(findingId);
    setSp(d ? { doc: d.doc.id, para: String(paragraph), finding: findingId } : { version: versionId, para: String(paragraph), finding: findingId });
  };
  const order = [...(data.draft ? [data.draft] : []), ...data.releases];
  return (
    <Shell title="Documents" data={data} inspectorTitle="Finding" inspector={<FindingInspector f={finding} data={data} onJump={jump} />}>
      <div className="doc-tabs" role="tablist">{order.map((d) => <button key={d.doc.id} type="button" className="doc-tab" role="tab" aria-selected={d.doc.id === docId && !versionParam} onClick={() => setSp({ doc: d.doc.id })}>{d.doc.role === 'draft' ? <FilePen size={14} /> : <FileCheck size={14} />} {d.doc.title}</button>)}</div>
      {!shown ? <div className="empty-d"><h3>No documents yet</h3></div> : (
        <>
          <div className="doc-meta"><b style={{ color: 'var(--ink)', fontSize: 15 }}>{data.docs.find((d) => d.doc.id === shown.documentId)?.doc.title ?? 'Earlier version'}</b><span>{shown.label}{versionParam && shown.id !== current?.version.id ? ' · earlier version' : ''}</span><span className="pack-src"><Lock size={11} /> Private</span><span style={{ flex: 1 }} /><span className="hstack small"><span className="kbd">J</span><span className="kbd">K</span> next / previous finding</span></div>
          <MarkedText version={shown} findings={visible} active={finding?.id} onSelect={(fid) => { setSelected(fid); sheet.open(); }} />
          <p className="small muted" style={{ marginTop: 8 }}>Text extracted in this browser. Original formatting, embedded objects and file metadata are not reviewed here.</p>
        </>
      )}
    </Shell>
  );
}
