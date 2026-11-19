import { useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { FileText, FileUp, Lock, ScanText, X } from 'lucide-react';
import { motion } from 'motion/react';
import type { OcrMeta } from '@mosaic/schemas';
import { ocrFile, releaseOcrImages, type OcrResult } from '../../features/importers/ocr';
import { normalizeText, paragraphSpans, wordCount } from '@mosaic/privacy-core';
import { Shell, PageSkeleton } from '../Shell';
import { parseFile } from '../../features/importers/parse';
import { useWorkspace } from '../useWorkspace';
import { documents } from '../../storage/repositories';
import { useApp } from '../store';
import { NotFound } from './NotFound';
import { Seg } from '../../ui/Seg';

type Pending = { name: string; text?: string; error?: string; note?: string; kind: 'txt' | 'markdown' | 'pdf' | 'docx' | 'paste' | 'ocr'; status?: string; progress?: number; ocr?: OcrResult; ocrText?: string; ocrOpen?: boolean; ctrl?: AbortController };

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
      if (r.ok === 'needs-ocr') { await runOcr(idx, f, r.kind); continue; }
      setItems((cur) => cur.map((x, i) => (i === idx ? (r.ok ? { name: f.name, text: r.text, kind: r.kind, note: r.note } : { name: f.name, kind: 'txt', error: r.error }) : x)));
    }
  };
  const update = (idx: number, patch: Partial<Pending>) => setItems((cur) => cur.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  /** OCR on this device. The text isn't added until the reviewer accepts it. */
  async function runOcr(idx: number, f: File, kind: 'pdf' | 'image') {
    const ctrl = new AbortController();
    update(idx, { kind: 'ocr', status: 'Starting OCR on this device', progress: 0, ctrl });
    try {
      const r = await ocrFile(f, kind, (p) => update(idx, { status: p.label, progress: p.fraction }), ctrl.signal);
      if (!r.text.trim()) { releaseOcrImages(r); update(idx, { error: 'OCR found no readable text. Try a clearer scan or paste the text.', status: undefined, ctrl: undefined }); return; }
      update(idx, { ocr: r, ocrText: r.text, ocrOpen: true, status: undefined, progress: undefined, ctrl: undefined });
    } catch (e) {
      update(idx, { error: (e as Error).name === 'AbortError' ? 'OCR cancelled' : 'OCR failed on this device. Try a smaller or clearer file, or paste the text.', status: undefined, progress: undefined, ctrl: undefined });
    }
  }
  const acceptOcr = (idx: number) => setItems((cur) => cur.map((x, i) => (i === idx ? { ...x, text: x.ocrText, ocrOpen: false, note: `OCR on this device · mean confidence ${x.ocr!.meanConfidence}%${x.ocr!.note ? `. ${x.ocr!.note}` : ''}` } : x)));
  const ready = items.filter((i) => i.text && !i.ocrOpen);
  async function save() {
    setBusy(true);
    try {
      const all = [...ready.map((i) => ({ title: i.name.replace(/\.(txt|md|markdown|pdf|docx|png|jpe?g|webp|bmp|gif)$/i, ''), text: i.text!, kind: i.kind, ocr: i.ocr ? ocrMeta(i.ocr, i.text!) : undefined })), ...(paste.trim() ? [{ title: pasteTitle || (role === 'draft' ? 'Pasted draft' : 'Pasted release'), text: paste, kind: 'paste' as const, ocr: undefined }] : [])];
      for (const a of all) await documents.add(data!.ws.id, { title: a.title, role, text: a.text, sourceKind: a.kind, approvedAt: role === 'release' ? new Date().toISOString() : undefined, ocr: a.ocr });
      items.forEach((i) => i.ocr && releaseOcrImages(i.ocr));
      app.toast(`Added ${all.length} document${all.length === 1 ? '' : 's'}`);
      nav(`/w/${data!.ws.id}`);
    } finally { setBusy(false); }
  }
  const count = ready.length + (paste.trim() ? 1 : 0);
  return (
    <Shell title="Import" data={data}>
      <div className="page-h"><div><h1>Add documents</h1><p>Files are read in this browser. Nothing is uploaded, links stay inactive and no scripts or macros run.</p></div></div>
      <div className={`drop-d ${over ? 'over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); void onFiles(e.dataTransfer.files); }}>
        <span className="d-ic"><FileUp size={26} /></span><strong style={{ fontSize: 16 }}>Drop files here</strong><span className="small muted">TXT, Markdown, PDF, DOCX or images · up to 20 MB each. Scans and photos are read with OCR on this device.</span>
        <button type="button" className="btn btn-sm btn-primary" onClick={() => input.current?.click()}>Choose files</button>
        <input ref={input} type="file" multiple accept=".txt,.md,.markdown,.pdf,.docx,.png,.jpg,.jpeg,.webp,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp" hidden onChange={(e) => e.target.files && void onFiles(e.target.files)} />
      </div>
      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="panel"><span className="small muted">These documents are</span><Seg id="import-role" style={{ marginTop: 8 }} value={role} onChange={setRole} options={[['draft', 'The draft to review'], ['release', 'Already published']]} /><p className="small muted" style={{ marginTop: 8 }}>Published releases become the history each draft is checked against.</p></div>
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
          {items.map((i, k) => <tr key={k}><td className="t-title"><FileText size={15} /> {i.name}</td><td className={i.error ? '' : 'muted'} style={i.error ? { color: 'var(--risk-crit-fg)' } : undefined}>{i.error ?? (i.ocrOpen ? 'OCR finished. Check the text below, then accept it.' : i.text ? `${wordCount(i.text)} words · ${paragraphSpans(normalizeText(i.text).text).length} paragraphs${i.note ? `. ${i.note}` : ''}` : <>{i.status}{i.progress !== undefined && <div className="progress-line" style={{ marginTop: 6, maxWidth: 260 }}><i style={{ width: `${Math.round(i.progress * 100)}%` }} /></div>}</>)}</td><td style={{ textAlign: 'right' }}>{i.ctrl ? <button type="button" className="btn btn-sm btn-plain" onClick={() => i.ctrl!.abort()}><X size={14} /> Cancel</button> : <button type="button" className="btn btn-sm btn-plain" onClick={() => { if (i.ocr) releaseOcrImages(i.ocr); setItems((cur) => cur.filter((_, j) => j !== k)); }}>Remove</button>}</td></tr>)}
        </tbody></table></>)}
      {items.map((i, k) => i.ocr && i.ocrOpen ? <OcrReview key={`ocr-${k}`} name={i.name} result={i.ocr} text={i.ocrText ?? ''} onText={(t) => update(k, { ocrText: t })} onAccept={() => acceptOcr(k)} /> : null)}
      <div className="hstack" style={{ justifyContent: 'flex-end', marginTop: 16 }}><button type="button" className="btn btn-quiet" onClick={() => nav(`/w/${data.ws.id}`)}>Cancel</button><button type="button" className="btn btn-primary" disabled={!count || busy} onClick={save}>Add {count || ''} to workspace</button></div>
    </Shell>
  );
}

/** Words still uncertain after the reviewer's edits are kept with the version, so findings that rely on them can say so. */
function ocrMeta(r: OcrResult, finalText: string): OcrMeta {
  const t = finalText.toLowerCase();
  return { engine: 'tesseract', pages: r.pages.length, meanConfidence: r.meanConfidence, uncertain: r.uncertain.filter((u) => t.includes(u.text.toLowerCase())).map((u) => ({ word: u.text, confidence: u.confidence })) };
}

function OcrReview({ name, result, text, onText, onAccept }: { name: string; result: OcrResult; text: string; onText: (t: string) => void; onAccept: () => void }) {
  const area = useRef<HTMLTextAreaElement>(null);
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(false);
  const remaining = result.uncertain.filter((u) => text.includes(u.text));
  const jump = (w: string) => { const el = area.current; if (!el) return; const at = el.value.indexOf(w); if (at < 0) return; el.focus(); el.setSelectionRange(at, at + w.length); const line = el.value.slice(0, at).split('\n').length; el.scrollTop = Math.max(0, (line - 3) * 22); };
  return (
    <motion.div className="h2-block" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className="h2"><span><ScanText size={17} /> Check the OCR text · {name}</span></div>
      <div className={`panel line ocr-review${zoom ? ' zoomed' : ''}`}>
        <div className="ocr-page">
          <button type="button" className="ocr-zoom" onClick={() => setZoom((z) => !z)} aria-label={zoom ? 'Shrink the scan' : 'Enlarge the scan'} title={zoom ? 'Click to shrink' : 'Click to enlarge'}><motion.img layout transition={{ duration: 0.2 }} src={result.pages[page].imageUrl} alt={`Scanned page ${page + 1} of ${name}`} /></button>
          {result.pages.length > 1 && <div className="hstack" style={{ justifyContent: 'center', marginTop: 8 }}><button type="button" className="btn btn-sm btn-quiet" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button><span className="small muted">Page {page + 1} of {result.pages.length}</span><button type="button" className="btn btn-sm btn-quiet" disabled={page === result.pages.length - 1} onClick={() => setPage(page + 1)}>Next</button></div>}
        </div>
        <div style={{ display: 'grid', gap: 10, alignContent: 'start', minWidth: 0 }}>
          <div className="hstack small"><span className={`chip ${result.meanConfidence >= 85 ? 'chip-ok' : result.meanConfidence >= 70 ? 'chip-mod' : 'chip-high'} chip-sm`}>Mean confidence {result.meanConfidence}%</span><span className="muted">Recognised on this device. Nothing was uploaded.</span></div>
          <label className="sr-only" htmlFor={`ocr-${name}`}>Recognised text</label>
          <textarea id={`ocr-${name}`} ref={area} className="field" style={{ minHeight: 280 }} value={text} onChange={(e) => onText(e.target.value)} />
          <div>
            <span className="small muted">{remaining.length ? `Words OCR was unsure about (${remaining.length}). Click one to find it in the text:` : 'No uncertain words left.'}</span>
            <div className="filters-d" style={{ marginTop: 6 }}>{remaining.slice(0, 40).map((u, j) => <button key={j} type="button" className="fchip" onClick={() => { setPage(u.page); jump(u.text); }}>{u.text} <span className="n">{u.confidence}%</span></button>)}</div>
          </div>
          <div className="hstack" style={{ justifyContent: 'flex-end' }}><button type="button" className="btn btn-primary" onClick={onAccept}>Accept text</button></div>
        </div>
      </div>
    </motion.div>
  );
}
