import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate, useParams } from 'react-router';
import { Activity, ChevronLeft, FlaskConical, Layers, ListChecks, PanelBottomOpen, ScanSearch, Settings, Waypoints, X } from 'lucide-react';
import { useApp } from './store';
import type { WorkspaceData } from './useWorkspace';
import { isClosed } from '../ui/components';

/** Screens call this when the user selects an item; on phones it opens the details sheet, on desktop nothing happens. */
const OPEN_EVENT = 'mosaic:open-details';
const detailsSheet = { open: () => window.dispatchEvent(new Event(OPEN_EVENT)) };
export const useDetailsSheet = () => detailsSheet;

type Props = { title: string; data?: WorkspaceData | null; inspector?: ReactNode; inspectorTitle?: string; children: ReactNode };

/** iOS-style mobile layout (approved mobile design): collapsing title, floating glass tab bar, bottom sheet for details. */
export function MobileShell({ title, data, inspector, inspectorTitle = 'Details', children }: Props) {
  const { id } = useParams();
  const app = useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [drag, setDrag] = useState(0);
  const start = useRef<number | null>(null);
  const ws = data?.ws;
  const st = id ? app.review[id] : undefined;
  const high = data ? data.findings.filter((f) => !isClosed(f.status) && f.status !== 'UNASSESSED' && (f.band === 'HIGH' || f.band === 'CRITICAL')).length : 0;
  useEffect(() => { const on = () => setCollapsed(window.scrollY > 30); on(); window.addEventListener('scroll', on, { passive: true }); return () => window.removeEventListener('scroll', on); }, []);
  useEffect(() => { setSheet(false); }, [loc.pathname]);
  const hasInspector = Boolean(inspector);
  useEffect(() => { const on = () => { if (hasInspector) setSheet(true); }; window.addEventListener(OPEN_EVENT, on); return () => window.removeEventListener(OPEN_EVENT, on); }, [hasInspector]);
  useEffect(() => { document.body.style.overflow = sheet ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [sheet]);
  const root = loc.pathname === '/workspaces' || loc.pathname === '/journal' || loc.pathname === '/settings' || loc.pathname === '/tests';
  return (
    <div className={`m-shell ${collapsed ? 'collapsed' : ''}`}>
      <header className="m-top">
        <div className="m-edge" />
        <div className="m-left">{!root && <button type="button" className="gbtn round glass" aria-label="Back" onClick={() => (window.history.length > 1 ? nav(-1) : nav('/workspaces'))}><ChevronLeft size={22} /></button>}</div>
        <div className="m-title">{title}{ws && <span className="m-sub">{ws.title}</span>}</div>
        <div className="m-right">{ws && <button type="button" className="gbtn round glass" aria-label={st?.running ? 'Reviewing' : 'Run review'} disabled={st?.running || !data?.draft} onClick={() => app.startReview(ws.id)}><ScanSearch size={20} className={st?.running ? 'spin' : ''} /></button>}</div>
      </header>
      <main className="m-content">
        {ws && st?.running && st.progress && <div style={{ marginBottom: 12 }}><div className="small muted" style={{ marginBottom: 6 }}>Reviewing on this device ({st.progress.done}/{st.progress.total})</div><div className="progress-line"><i style={{ width: `${(st.progress.done / Math.max(1, st.progress.total)) * 100}%` }} /></div></div>}
        {children}
      </main>
      {inspector && !sheet && <button type="button" className="m-details glass" onClick={() => setSheet(true)}><PanelBottomOpen size={17} /> {inspectorTitle}</button>}
      {inspector && (
        <div className={`m-sheet-layer ${sheet ? 'open' : ''}`} aria-hidden={!sheet}>
          <div className="m-scrim" onClick={() => setSheet(false)} />
          <div className="m-sheet glass glass-strong" role="dialog" aria-modal="true" aria-label={inspectorTitle} style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
            onPointerDown={(e) => { if ((e.target as HTMLElement).closest('.m-grab')) { start.current = e.clientY; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } }}
            onPointerMove={(e) => { if (start.current !== null) setDrag(Math.max(0, e.clientY - start.current)); }}
            onPointerUp={() => { if (start.current !== null) { if (drag > 110) setSheet(false); setDrag(0); start.current = null; } }}>
            <div className="m-grab"><span /></div>
            <div className="m-sheet-head"><b>{inspectorTitle}</b><button type="button" className="gbtn round glass" aria-label="Close" onClick={() => setSheet(false)}><X size={18} /></button></div>
            <div className="m-sheet-body">{inspector}</div>
          </div>
        </div>
      )}
      <nav className="m-tabbar glass" aria-label="Main">
        <NavLink to="/workspaces" className="m-tab"><Layers size={22} /><span>Workspaces</span></NavLink>
        {ws ? <NavLink to={`/w/${ws.id}/findings`} className="m-tab"><ListChecks size={22} /><span>Findings</span>{high > 0 && <span className="m-badge">{high}</span>}</NavLink> : <NavLink to="/tests" className="m-tab"><FlaskConical size={22} /><span>Tests</span></NavLink>}
        {ws ? <NavLink to={`/w/${ws.id}/map`} className="m-tab"><Waypoints size={22} /><span>Map</span></NavLink> : <span className="m-tab" aria-hidden />}
        <NavLink to="/journal" className="m-tab"><Activity size={22} /><span>Journal</span></NavLink>
        <NavLink to="/settings" className="m-tab"><Settings size={22} /><span>Settings</span></NavLink>
      </nav>
    </div>
  );
}

export function useIsMobile() {
  const q = '(max-width: 760px)';
  const [m, setM] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches);
  useEffect(() => { const mq = matchMedia(q); const on = () => setM(mq.matches); mq.addEventListener('change', on); return () => mq.removeEventListener('change', on); }, []);
  return m;
}
