import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, ChevronUp, Cloud, Eye, HardDrive, Package, Send, Trash2, WifiOff } from 'lucide-react';
import type { ConsentRecord, Domain, GeneratorCategory } from '@mosaic/schemas';
import type { BuiltRequest } from '@mosaic/privacy-core';
import { Shell } from '../Shell';
import { useApp } from '../store';
import { useLive } from '../live';
import { db } from '../../storage/db';
import { ALL_CATEGORIES, CATEGORY_LABEL, approve, generate, prepareRequest } from '../../features/packs/packs';
import { getGateway, ensureModelPort } from '../services';
import { Banner, PolicyTag, SourceBadge, fmtDate } from '../../ui/components';
import { Seg } from '../../ui/Seg';

export function Tests() {
  const app = useApp();
  const packs = useLive(() => db().packs.toArray(), [], 'packs');
  const [open, setOpen] = useState<string | null>('core');
  const [domain, setDomain] = useState<Domain>('QUALITATIVE_RESEARCH');
  const [cats, setCats] = useState<GeneratorCategory[]>(['ROLE_RARITY', 'SHIFT_PATTERNS', 'TENURE_WINDOWS']);
  const [req, setReq] = useState<BuiltRequest | null>(null);
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const gateway = getGateway();
  useEffect(() => { let live = true; if (!cats.length) { setReq(null); return; } void prepareRequest(domain, cats).then((r) => { if (live) setReq(r); }); return () => { live = false; }; }, [domain, cats]);
  const json = req ? JSON.stringify(req.body, null, 2) : '';
  const unavailable = !app.online ? 'You’re offline. Cached and bundled packs still work.' : !gateway ? 'Cloud generation isn’t configured in this build.' : null;

  async function send() {
    if (!req || !gateway) return;
    setBusy(true); setResult(null);
    let consent: ConsentRecord | null = null;
    try {
      consent = await approve(req);
      await ensureModelPort();
      const r = await generate(gateway, req, consent);
      setResult(r.ok ? { ok: true, text: `Added a pack with ${r.pack.tests.length} tests. It ran in the ${r.source === 'CLOUD' ? 'cloud' : 'reported source: ' + r.source}.` } : { ok: false, text: r.reason });
      if (r.ok) setOpen(r.pack.id);
    } catch (e) { setResult({ ok: false, text: (e as Error).message }); }
    finally { setBusy(false); setModal(false); }
  }

  return (
    <Shell title="Stress tests" inspectorTitle="Outbound request" inspector={
      <>
        <div className="insp-card"><div className="hstack" style={{ justifyContent: 'space-between' }}><span className="pack-src pack-cloud"><Cloud size={12} /> Generic · enum only</span><PolicyTag policy="ONLY_IN_CLOUD" /></div><p className="small" style={{ marginTop: 10, color: 'var(--ink-2)' }}>This is the complete body that would leave the device. It updates as you change the choices.</p></div>
        <div className="insp-label">Exact payload</div>
        <div className="payload">{json || 'Choose at least one category.'}</div>
        <div className="insp-label">Never included</div>
        <div className="insp-card small" style={{ color: 'var(--ink-2)' }}>Document text, excerpts, file names, workspace names, findings and anything derived from them.</div>
        {unavailable && <div style={{ marginTop: 10 }}><Banner tone="neutral" icon={<WifiOff size={16} />} title="Generation unavailable">{unavailable}</Banner></div>}
        <div className="insp-actions"><button type="button" className="btn btn-primary" disabled={!req || !!unavailable || busy} onClick={() => setModal(true)}><Eye size={15} /> Review and send…</button></div>
        {result && <p className="small" style={{ margin: '10px 4px 0', color: result.ok ? 'var(--ok-fg)' : 'var(--risk-crit-fg)' }}>{result.text}</p>}
      </>}>
      <div className="page-h"><div><h1>Stress tests</h1><p>Reusable, declarative checks. Enabled packs are applied to your documents on this device during review. They are validated before use and never run as code.</p></div></div>
      <div style={{ display: 'grid', gap: 10 }}>
        {(packs ?? []).map((p) => (
          <div key={p.id} className="pack-d">
            <div className="ph">
              <button type="button" style={{ textAlign: 'left' }} aria-expanded={open === p.id} onClick={() => setOpen(open === p.id ? null : p.id)}>
                <h3>{p.name} {open === p.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</h3>
                <span className="hstack" style={{ marginTop: 6 }}>{p.source === 'cloud' ? <span className="pack-src pack-cloud"><Cloud size={12} /> Generated in cloud</span> : <span className="pack-src"><Package size={12} /> Bundled</span>}{p.source === 'cloud' && <span className="pack-src"><HardDrive size={12} /> Cached {fmtDate(p.cachedAt)}</span>}<span className="small muted">{p.version} · {p.tests.length} tests</span></span>
              </button>
              <span className="hstack">
                {p.source === 'cloud' && <button type="button" className="btn btn-sm btn-plain" aria-label={`Delete ${p.name}`} onClick={async () => { await db().packs.delete(p.id); app.toast('Pack deleted'); }}><Trash2 size={14} /></button>}
                <label className="switch sm"><input type="checkbox" checked={p.enabled} onChange={async (e) => db().packs.update(p.id, { enabled: e.target.checked })} aria-label={`Use ${p.name}`} /><span /></label>
              </span>
            </div>
            {open === p.id && <div className="pt">{p.tests.map((t) => <div key={t.id}><b>{t.title}</b><span>{t.question}<br /><span className="small muted">Fictional example: {t.fictionalExample}</span></span></div>)}</div>}
          </div>
        ))}
      </div>
      <div className="h2">Generate a pack</div>
      <div className="panel line" style={{ display: 'grid', gap: 14 }}>
        <div><span className="small muted">Domain</span><Seg id="domain" style={{ marginTop: 6, display: 'flex', width: 'max-content' }} value={domain} onChange={setDomain} options={[['QUALITATIVE_RESEARCH', 'Qualitative research'], ['EDITORIAL', 'Editorial']]} /></div>
        <div><span className="small muted">Categories (fixed list)</span><div className="filters-d" style={{ margin: '6px 0 0' }}>{ALL_CATEGORIES.map((c) => <button key={c} type="button" className="fchip" aria-pressed={cats.includes(c)} onClick={() => setCats((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]))}>{CATEGORY_LABEL[c]}</button>)}</div></div>
        <p className="small muted">There is no free-text field. The request is built only from these choices, and each request needs your approval.</p>
      </div>
      {createPortal(<AnimatePresence>{modal && req && (
        <div className="modal-layer" style={{ position: 'fixed', zIndex: 300 }} key="consent">
          <motion.div className="modal-scrim in" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !busy && setModal(false)} />
          <motion.div className="modal glass glass-strong in" role="dialog" aria-modal="true" aria-labelledby="consent-title" style={{ x: '-50%', y: '-50%' }} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ type: 'spring', stiffness: 460, damping: 34 }}>
            <div className="hstack" style={{ marginBottom: 10 }}><span className="pack-src pack-cloud"><Cloud size={12} /> Generic request</span><PolicyTag policy="ONLY_IN_CLOUD" /></div>
            <h2 id="consent-title">Send this request to the cloud?</h2>
            <p style={{ color: 'var(--ink-2)', fontSize: 14 }}>Gemini, through Firebase AI Logic, will write new generic test definitions with fictional examples. This is the complete request:</p>
            <div className="payload" style={{ marginTop: 12 }}>{json}</div>
            <div className="msurf small" style={{ color: 'var(--ink-2)' }}><b style={{ color: 'var(--ink)' }}>Not included:</b> document text, excerpts, file names, workspace names, findings and anything derived from them.</div>
            <div className="msurf"><dl className="kv"><dt>Payload digest</dt><dd className="mono">sha256:{req.digest.slice(0, 8)}…{req.digest.slice(-4)}</dd><dt>Approval valid for</dt><dd>5 minutes, this exact request</dd><dt>App Check</dt><dd>Required</dd></dl></div>
            <div className="m-actions"><button type="button" className="btn btn-quiet" disabled={busy} onClick={() => setModal(false)}>Cancel</button><button type="button" className="btn btn-primary" disabled={busy} onClick={send}><Send size={15} /> {busy ? 'Sending…' : 'Send this request'}</button></div>
          </motion.div>
        </div>
      )}</AnimatePresence>, document.body)}

      <p className="small muted" style={{ marginTop: 14 }}>Results show where they ran in the <a href="/journal">inference journal</a>. <SourceBadge source="CLOUD" /> appears only when the SDK reports it.</p>
    </Shell>
  );
}
