import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ChevronRight, FlaskConical, FolderLock, Plus } from 'lucide-react';
import { db } from '../../storage/db';
import { seedSampleWorkspace, workspaces } from '../../storage/repositories';
import { useLive } from '../live';
import { Shell } from '../Shell';
import { Logo, fmtDate } from '../../ui/components';
import { useApp } from '../store';

export function Workspaces() {
  const nav = useNavigate();
  const app = useApp();
  const list = useLive(() => db().workspaces.orderBy('updatedAt').reverse().toArray(), [], 'workspaces');
  const [q, setQ] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const priv = (list ?? []).filter((w) => w.kind === 'private' && w.title.toLowerCase().includes(q.toLowerCase()));
  const sample = (list ?? []).find((w) => w.kind === 'sample');
  return (
    <Shell title="Workspaces">
      <div className="page-h"><div><h1>Workspaces</h1><p>Each workspace holds a draft and the releases it is checked against. Everything stays in this browser.</p></div>
        <button type="button" className="btn btn-primary" onClick={async () => { const w = await workspaces.create('Untitled workspace'); nav(`/w/${w.id}/import`); }}><Plus size={16} /> New workspace</button></div>
      <label className="sr-only" htmlFor="ws-search">Search workspace titles</label>
      <input id="ws-search" className="field" placeholder="Search titles" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 6 }} />
      <div className="h2">Sample</div>
      <button type="button" className="tool-tile" style={{ width: '100%', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 14 }} onClick={async () => { const w = sample ?? (await seedSampleWorkspace()); nav(`/w/${w.id}`); }}>
        <Logo size={28} /><span><b style={{ display: 'block', fontSize: 15 }}>Night Shift Study</b><span>Larkspur Health Network (fictional) · 3 documents</span></span><span className="hstack"><span className="pack-src"><FlaskConical size={12} /> Fictional sample</span><ChevronRight size={16} /></span>
      </button>
      <div className="h2">Private</div>
      {priv.length === 0 ? (
        <div className="empty-d"><div className="mini-mosaic">{Array.from({ length: 12 }, (_, i) => <i key={i} />)}</div><h3>{q ? 'No matching workspaces' : 'No private workspaces yet'}</h3><p>Create one for a draft you plan to publish. It stays in this browser and is never synced.</p></div>
      ) : (
        <table className="tbl"><thead><tr><th>Title</th><th>Last edited</th><th /></tr></thead><tbody>
          {priv.map((w) => (
            <tr key={w.id}>
              <td className="t-title">{renaming === w.id ? <form onSubmit={async (e) => { e.preventDefault(); await workspaces.rename(w.id, name); setRenaming(null); }} className="hstack"><input className="field" aria-label="Workspace title" value={name} onChange={(e) => setName(e.target.value)} autoFocus style={{ maxWidth: 280 }} /><button className="btn btn-sm btn-primary">Save</button></form> : <Link to={`/w/${w.id}`} style={{ color: 'inherit' }}><FolderLock size={15} /> {w.title}</Link>}</td>
              <td className="muted">{fmtDate(w.updatedAt)}</td>
              <td style={{ textAlign: 'right' }}>
                {confirm === w.id ? <span className="hstack" style={{ justifyContent: 'flex-end' }}><span className="small">Delete this workspace and its documents from this browser?</span><button type="button" className="btn btn-sm btn-quiet" onClick={() => setConfirm(null)}>Cancel</button><button type="button" className="btn btn-sm btn-danger" onClick={async () => { await workspaces.remove(w.id); setConfirm(null); app.toast('Workspace deleted'); }}>Delete</button></span>
                  : <><button type="button" className="btn btn-sm btn-plain" onClick={() => { setRenaming(w.id); setName(w.title); }}>Rename</button><button type="button" className="btn btn-sm btn-plain" style={{ color: 'var(--risk-crit-fg)' }} onClick={() => setConfirm(w.id)}>Delete</button></>}
              </td>
            </tr>
          ))}
        </tbody></table>
      )}
      <p className="small muted" style={{ marginTop: 14 }}>Deleting removes Mosaic’s copies in this browser. It can’t reach files you exported, and it isn’t forensic erasure.</p>
    </Shell>
  );
}
