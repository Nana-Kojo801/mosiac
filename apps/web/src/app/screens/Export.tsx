import { useState } from 'react';
import { useParams } from 'react-router';
import { AlertTriangle, Download } from 'lucide-react';
import { Shell, PageSkeleton } from '../Shell';
import { useWorkspace } from '../useWorkspace';
import { useApp } from '../store';
import { cleanParagraphs, cleanText, download, reportLines, reportMarkdown, safeFileName, toDocx, toPdf, type CleanFormat } from '../../features/export/export';
import { NotFound } from './NotFound';

export function Export() {
  const { id } = useParams();
  const data = useWorkspace(id);
  const app = useApp();
  const [kind, setKind] = useState<'clean' | 'report'>('clean');
  const [fmt, setFmt] = useState<CleanFormat>('Markdown');
  const [quotes, setQuotes] = useState(false);
  const [busy, setBusy] = useState(false);
  if (data === undefined) return <PageSkeleton />;
  if (data === null) return <NotFound />;
  const target = data.draft ?? data.releases.at(-1);
  const fmts: CleanFormat[] = kind === 'clean' ? ['TXT', 'Markdown', 'PDF', 'DOCX'] : ['Markdown', 'PDF'];
  const f = fmts.includes(fmt) ? fmt : fmts[0];
  if (!target) return <Shell title="Reports & export" data={data}><div className="empty-d"><h3>Nothing to export yet</h3><p>Add a document first.</p></div></Shell>;
  const rep = { ws: data.ws, docTitle: target.doc.title, version: target.version, releases: data.releases.filter((r) => r !== target).map((r) => `${r.doc.title} ${r.version.label}`), findings: data.stale ? [] : data.findings, coverage: data.stale ? undefined : data.run?.coverage, generatedAt: new Date().toISOString(), includeQuotes: quotes };
  const base = safeFileName(`${target.doc.title}-${target.version.label}${kind === 'report' ? '-review-report' : ''}`);
  async function run() {
    setBusy(true);
    try {
      if (kind === 'clean') {
        if (f === 'TXT' || f === 'Markdown') download(`${base}.${f === 'TXT' ? 'txt' : 'md'}`, cleanText(target!.version, f, target!.doc.title), f === 'TXT' ? 'text/plain;charset=utf-8' : 'text/markdown;charset=utf-8');
        else if (f === 'PDF') download(`${base}.pdf`, await toPdf([{ heading: target!.doc.title, text: '' }, ...cleanParagraphs(target!.version).map((t) => ({ text: t }))]));
        else download(`${base}.docx`, await toDocx(target!.doc.title, cleanParagraphs(target!.version)));
      } else if (f === 'PDF') download(`${base}.pdf`, await toPdf(reportLines(rep)));
      else download(`${base}.md`, reportMarkdown(rep), 'text/markdown;charset=utf-8');
      app.toast('Export saved to your downloads');
    } catch { app.toast('Export failed. Try another format.'); } finally { setBusy(false); }
  }
  return (
    <Shell title="Reports & export" data={data} inspectorTitle="Export" inspector={
      <>
        <div className="insp-card">
          <button type="button" className="radio-d" role="radio" aria-checked={kind === 'clean'} onClick={() => setKind('clean')}><span className="dot" /><div><b>Clean draft</b><span>The reviewed text only</span></div></button>
          <button type="button" className="radio-d" role="radio" aria-checked={kind === 'report'} onClick={() => setKind('report')}><span className="dot" /><div><b>Review report</b><span>Findings, decisions and coverage, kept separate from the draft</span></div></button>
        </div>
        <div className="insp-label">Format</div>
        <div className="seg" style={{ display: 'flex' }}>{fmts.map((x) => <button key={x} type="button" style={{ flex: 1 }} aria-pressed={x === f} onClick={() => setFmt(x)}>{x}</button>)}</div>
        {kind === 'report' && <label className="set-row" style={{ padding: '12px 4px' }}><span className="sr-main">Include quoted evidence<span>Off by default: quotes repeat private text</span></span><span className="switch sm"><input type="checkbox" checked={quotes} onChange={(e) => setQuotes(e.target.checked)} /><span /></span></label>}
        <div className="insp-label">Left out</div>
        <div className="insp-card small" style={{ color: 'var(--ink-2)' }}>Original files and passages, comments, revision history, tracked changes and source-file metadata. Files are generated fresh from plain text.</div>
        <div className="banner banner-warn" style={{ marginTop: 12 }}><AlertTriangle size={16} /><div className="banner-body">The export can still contain sensitive details. The review is advisory and doesn’t certify anonymity.</div></div>
        <div className="insp-actions"><button type="button" className="btn btn-primary" disabled={busy} onClick={run}><Download size={15} /> Export {f}</button></div>
      </>}>
      <div className="page-h"><div><h1>Reports & export</h1><p>{target.doc.title} · {target.version.label}{data.stale && kind === 'report' ? '. The last review is out of date, so the report shows no findings until you review again.' : ''}</p></div></div>
      <div className="panel line" style={{ padding: '28px 34px', fontSize: 14.5, lineHeight: 1.65, maxWidth: '68ch', whiteSpace: 'pre-wrap' }}>
        {kind === 'clean' ? <><h3 style={{ fontSize: 18, marginBottom: 12 }}>{target.doc.title}</h3>{cleanParagraphs(target.version).map((t, i) => <p key={i} style={{ marginBottom: 12 }}>{t}</p>)}</> : reportLines(rep).map((l, i) => <div key={i} style={{ marginBottom: 10 }}>{l.heading && <h3 style={{ fontSize: i === 0 ? 18 : 15, marginBottom: 4 }}>{l.heading}</h3>}{l.text && <p>{l.text}</p>}</div>)}
      </div>
    </Shell>
  );
}
