import { useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { FileText, FileUp, Lock } from 'lucide-react';
import { normalizeText, paragraphSpans, wordCount } from '@mosaic/privacy-core';
import { Shell, PageSkeleton } from '../Shell';
import { parseFile } from '../../features/importers/parse';
import { useWorkspace } from '../useWorkspace';
import { documents } from '../../storage/repositories';
import { useApp } from '../store';
import { NotFound } from './NotFound';

type Pending = { name: string; text?: string; error?: string; note?: string; kind: 'txt' | 'markdown' | 'pdf' | 'docx' | 'paste'; status?: string };

export function Import() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const data = useWorkspace(id);
  const app = useApp();
  const nav = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Pending[]>([]);
  const [paste, setPaste] = useState('');
  const [pasteTitle, setPasteTitle] = useState('');
  const [role, setRole] = useState<'draft' | 'release'>('draft');
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  if (data === undefined) return <PageSkeleton />;
  if (data === null) return <NotFound />;
  const onFiles = async (files: FileList | File[]) => {
    for (const f of [...files]) {
      const idx = await new Promise<number>((res) => setItems((cur) => { res(cur.length); return [...cur, { name: f.name, kind: 'txt', status: 'Reading…' }]; }));
      const r = await parseFile(f, (msg) => setItems((cur) => cur.map((x, i) => (i === idx ? { ...x, status: msg } : x))));
      setItems((cur) => cur.map((x, i) => (i === idx ? (r.ok ? { name: f.name, text: r.text, kind: r.kind, note: r.note } : { name: f.name, kind: 'txt', error: r.error }) : x)));
    }
  };
  const ready = items.filter((i) => i.text);
  async function save() {
    setBusy(true);
    try {
      const all = [...ready.map((i) => ({ title: i.name.replace(/\.(txt|md|markdown|pdf|docx)$/i, ''), text: i.text!, kind: i.kind })), ...(paste.trim() ? [{ title: pasteTitle || (role === 'draft' ? 'Pasted draft' : 'Pasted release'), text: paste, kind: 'paste' as const }] : [])];
      for (const a of all) await documents.add(data!.ws.id, { title: a.title, role, text: a.text, sourceKind: a.kind, approvedAt: role === 'release' ? new Date().toISOString() : undefined });
      app.toast(`Added ${all.length} document${all.length === 1 ? '' : 's'}`);
      nav(`/w/${data!.ws.id}`);
    } finally { setBusy(false); }
  }
  const count = ready.length + (paste.trim() ? 1 : 0);
  return (
    <Shell title="Import" data={data}>
      <div className="page-h"><div><h1>Add documents</h1><p>Files are read in this browser. Nothing is uploaded, links stay inactive and no scripts or macros run.</p></div></div>
      <div className={`drop-d ${over ? 'over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); void onFiles(e.dataTransfer.files); }}>
        <span className="d-ic"><FileUp size={26} /></span><strong style={{ fontSize: 16 }}>Drop files here</strong><span className="small muted">TXT, Markdown, text-based PDF or DOCX · up to 20 MB and 100 pages each</span>
        <button type="button" className="btn btn-sm btn-primary" onClick={() => input.current?.click()}>Choose files</button>
        <input ref={input} type="file" multiple accept=".txt,.md,.markdown,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden onChange={(e) => e.target.files && void onFiles(e.target.files)} />
      </div>
      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="panel"><span className="small muted">These documents are</span><div className="seg" style={{ marginTop: 8 }}><button type="button" aria-pressed={role === 'draft'} onClick={() => setRole('draft')}>The draft to review</button><button type="button" aria-pressed={role === 'release'} onClick={() => setRole('release')}>Already published</button></div><p className="small muted" style={{ marginTop: 8 }}>Published releases become the history each draft is checked against.</p></div>
        <div className="panel"><span className="small muted">Classification</span><div className="hstack" style={{ marginTop: 6, justifyContent: 'space-between' }}><b>Private</b><Lock size={17} /></div><p className="small muted" style={{ marginTop: 6 }}>Everything you add is private and is analysed only on this device. This can’t be changed for imported content.</p></div>
      </div>
      <div className="h2">Paste text</div>
      <div className="panel" style={{ display: 'grid', gap: 10 }}>
        <label className="sr-only" htmlFor="paste-title">Title</label><input id="paste-title" className="field" placeholder="Title (optional)" value={pasteTitle} onChange={(e) => setPasteTitle(e.target.value)} />
        <label className="sr-only" htmlFor="paste-box">Text</label><textarea id="paste-box" className="field" placeholder="Paste a draft or a published release" value={paste} onChange={(e) => setPaste(e.target.value)} autoFocus={sp.get('paste') === '1'} />
        {paste.trim() && <span className="small muted">{wordCount(paste)} words · {paragraphSpans(normalizeText(paste).text).length} paragraphs</span>}
      </div>
      {items.length > 0 && (<><div className="h2">Files</div>
        <table className="tbl"><thead><tr><th>File</th><th>Details</th><th /></tr></thead><tbody>
          {items.map((i, k) => <tr key={k}><td className="t-title"><FileText size={15} /> {i.name}</td><td className={i.error ? '' : 'muted'} style={i.error ? { color: 'var(--risk-crit-fg)' } : undefined}>{i.error ?? (i.text ? `${wordCount(i.text)} words · ${paragraphSpans(normalizeText(i.text).text).length} paragraphs${i.note ? `. ${i.note}` : ''}` : i.status)}</td><td style={{ textAlign: 'right' }}><button type="button" className="btn btn-sm btn-plain" onClick={() => setItems((cur) => cur.filter((_, j) => j !== k))}>Remove</button></td></tr>)}
        </tbody></table></>)}
      <div className="hstack" style={{ justifyContent: 'flex-end', marginTop: 16 }}><button type="button" className="btn btn-quiet" onClick={() => nav(`/w/${data.ws.id}`)}>Cancel</button><button type="button" className="btn btn-primary" disabled={!count || busy} onClick={save}>Add {count || ''} to workspace</button></div>
    </Shell>
  );
}
