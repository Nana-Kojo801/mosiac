import { useState } from 'react';
import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { Shell } from '../Shell';
import { useApp, type Appearance, type MotionPref } from '../store';
import { Seg } from '../../ui/Seg';
import { deleteAllLocalData, resetSampleWorkspace } from '../../storage/repositories';

export function Settings() {
  const app = useApp();
  const [confirm, setConfirm] = useState(false);
  const r = app.readiness;
  return (
    <Shell title="Settings">
      <div className="page-h"><div><h1>Settings</h1></div></div>
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div>
          <div className="h2" style={{ marginTop: 0 }}>Appearance</div>
          <div className="set-group">
            <div className="set-row"><span className="sr-main">Theme</span><Seg id="theme" value={app.prefs.appearance} onChange={(a) => app.setPrefs({ appearance: a as Appearance })} options={[['light', 'Light'], ['dark', 'Dark'], ['system', 'System']]} /></div>
            <div className="set-row"><span className="sr-main">Animations<span>Follow system uses your device’s reduce-motion setting</span></span><Seg id="motion" value={app.prefs.motion ?? 'system'} onChange={(m) => app.setPrefs({ motion: m as MotionPref })} options={[['system', 'Follow system'], ['full', 'On'], ['reduced', 'Reduced']]} /></div>
            <label className="set-row"><span className="sr-main">Reduce transparency<span>Solid bars and panels, same layout</span></span><span className="switch sm"><input type="checkbox" checked={app.prefs.reducedTransparency} onChange={(e) => app.setPrefs({ reducedTransparency: e.target.checked })} /><span /></span></label>
          </div>
          <div className="h2">Model</div>
          <div className="set-group"><Link to="/device" className="set-row" style={{ color: 'inherit', textDecoration: 'none' }}><span className="sr-main">On-device model</span><span className="end">{r === null ? 'Checking' : r.ok ? 'Ready' : 'Unavailable here'} <ChevronRight size={15} /></span></Link></div>
        </div>
        <div>
          <div className="h2" style={{ marginTop: 0 }}>Privacy</div>
          <div className="set-group">
            <button type="button" className="set-row" onClick={async () => { await resetSampleWorkspace(); app.toast('Sample workspace reset'); }}><span className="sr-main">Reset the sample workspace<span>Restores the fictional documents and clears its reviews</span></span></button>
            {confirm ? <div className="set-row"><span className="sr-main">Delete every workspace, document, finding and journal entry Mosaic stored in this browser?</span><button type="button" className="btn btn-sm btn-quiet" onClick={() => setConfirm(false)}>Cancel</button><button type="button" className="btn btn-sm btn-danger" onClick={async () => { await deleteAllLocalData(); setConfirm(false); app.toast('All local data deleted'); }}>Delete</button></div>
              : <button type="button" className="set-row danger" onClick={() => setConfirm(true)}><span className="sr-main">Delete all local data</span></button>}
          </div>
          <p className="small muted" style={{ margin: '8px 4px 0' }}>Deleting removes Mosaic’s copies in this browser. It can’t reach files you exported, and it isn’t forensic erasure.</p>
          <div className="h2">About</div>
          <div className="set-group"><div className="set-row"><span className="sr-main">Licence</span><span className="end">Apache-2.0</span></div><div className="set-row"><span className="sr-main">Telemetry</span><span className="end">None</span></div></div>
        </div>
      </div>
    </Shell>
  );
}
