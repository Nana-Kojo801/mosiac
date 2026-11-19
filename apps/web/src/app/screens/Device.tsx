import { useState } from 'react';
import { AppWindow, CircleCheck, Download, HardDrive, Loader, MemoryStick, MonitorX, Wifi } from 'lucide-react';
import { Shell } from '../Shell';
import { useApp } from '../store';
import { getGateway, ensureModelPort } from '../services';
import { readinessText } from '../../ai/gateway';
import { requestPersistence } from '../../storage/db';

export function Device() {
  const app = useApp();
  const r = app.readiness;
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [persist, setPersist] = useState<string | null>(null);
  const state = r === null ? 'checking' : r.ok ? 'ready' : r.reason === 'MODEL_NOT_AVAILABLE' && (r.detail === 'downloadable' || r.detail === 'downloading') ? r.detail : 'unsupported';
  const label = { checking: 'Checking', ready: 'Ready', downloadable: 'Download needed', downloading: 'Downloading', unsupported: 'Unavailable here' }[state];
  const tone = state === 'ready' ? 'ok' : state === 'unsupported' ? 'warn' : '';
  const Icon = state === 'ready' ? CircleCheck : state === 'unsupported' ? MonitorX : state === 'checking' || state === 'downloading' ? Loader : Download;
  async function download() {
    setError(null); setProgress(0);
    try { const g = getGateway(); if (!g) throw new Error('Model services are not configured in this build'); await ensureModelPort(); await g.prepareDevice((f) => setProgress(f)); await app.refreshReadiness(); }
    catch (e) { setError((e as Error).message); } finally { setProgress(null); }
  }
  return (
    <Shell title="This device">
      <div className="page-h"><div><h1>This device</h1><p>Mosaic checks what this browser can do before you add anything private.</p></div></div>
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="panel" style={{ display: 'grid', gap: 14 }}>
          <div className={`model-state ${tone}`}><span className="ms-ic"><Icon size={26} className={state === 'checking' || state === 'downloading' ? 'spin' : ''} /></span><div><span className="small muted">Built-in model (Gemini Nano in Chrome)</span><h3>{label}</h3></div></div>
          <p style={{ color: 'var(--ink-2)' }}>{r === null ? 'Asking the browser whether the built-in model is available.' : r.ok ? 'Private analysis runs on this device.' : `${readinessText(r.reason, r.detail)}. Rules-based checks and manual review still work, and private text is never sent to the cloud instead.`}</p>
          {state === 'downloadable' && progress === null && <button type="button" className="btn btn-primary" onClick={download}><Download size={16} /> Download the model</button>}
          {progress !== null && <><div className="progress-line" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${progress * 100}%` }} /></div><p className="small muted">{progress > 0 ? `${Math.round(progress * 100)}% as reported by Chrome` : 'Waiting for Chrome to report progress'}</p></>}
          {error && <p className="small" style={{ color: 'var(--risk-crit-fg)' }}>{error}</p>}
          <button type="button" className="btn btn-quiet btn-sm" style={{ justifySelf: 'start' }} onClick={() => app.refreshReadiness()}>Check again</button>
        </div>
        <div className="panel">
          <b>What Chrome needs</b>
          <div className="req"><AppWindow size={16} /><div>Desktop Google Chrome 139 or later<span>Mobile Chrome, other browsers and Chromium builds don’t run the built-in model</span></div></div>
          <div className="req"><HardDrive size={16} /><div>About 22 GB free on the Chrome profile drive</div></div>
          <div className="req"><MemoryStick size={16} /><div>More than 4 GB of video memory, or 16 GB RAM and 4 CPU cores<span>Meeting these doesn’t guarantee support; Chrome decides</span></div></div>
          <div className="req"><Wifi size={16} /><div>An unmetered connection for the first download<span>After that, private review works offline</span></div></div>
        </div>
      </div>
      <div className="h2">Storage</div>
      <div className="panel"><p style={{ color: 'var(--ink-2)' }}>Workspaces are stored in this browser (IndexedDB). Browsers may clear stored data under storage pressure unless you allow persistent storage.</p>
        <div className="hstack" style={{ marginTop: 10 }}><button type="button" className="btn btn-quiet btn-sm" onClick={async () => setPersist(await requestPersistence())}>Ask to keep data</button>{persist && <span className="small muted">{persist === 'granted' ? 'The browser will keep Mosaic’s data.' : persist === 'denied' ? 'The browser declined. Export anything you need to keep.' : 'This browser doesn’t support the request.'}</span>}</div>
      </div>
    </Shell>
  );
}
