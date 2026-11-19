import type { ReactNode } from 'react';
import { NavLink, Link, useParams } from 'react-router';
import { Activity, ChevronRight, ChevronsUpDown, ClipboardCheck, FileOutput, FileText, FileUp, FlaskConical, History, LayoutDashboard, Layers, ListChecks, PenLine, ScanSearch, Settings, Waypoints, X, ChartColumn } from 'lucide-react';
import { useApp } from './store';
import { Logo } from '../ui/components';
import { readinessText } from '../ai/gateway';
import type { WorkspaceData } from './useWorkspace';
import { isClosed } from '../ui/components';

type Props = { title: string; data?: WorkspaceData | null; inspector?: ReactNode; inspectorTitle?: string; wide?: boolean; children: ReactNode; actions?: ReactNode };

export function Shell({ title, data, inspector, inspectorTitle = 'Inspector', wide, children, actions }: Props) {
  const { id } = useParams();
  const app = useApp();
  const r = app.readiness;
  const st = id ? app.review[id] : undefined;
  const dot = !app.online ? '' : r?.ok ? 'ok' : r && r.reason === 'MODEL_NOT_AVAILABLE' ? 'warn' : 'warn';
  const statusLabel = !app.online ? 'Offline · local work continues' : r === null ? 'Checking model' : r.ok ? 'On-device ready' : 'Rules only · no on-device model';
  const open = data ? data.findings.filter((f) => !isClosed(f.status)).length : 0;
  const ws = data?.ws;
  const nav = ws ? [
    [`/w/${ws.id}`, 'Overview', LayoutDashboard, undefined],
    [`/w/${ws.id}/document`, 'Documents', FileText, data!.docs.length],
    [`/w/${ws.id}/findings`, 'Findings', ListChecks, open],
    [`/w/${ws.id}/map`, 'Disclosure map', Waypoints, undefined],
    [`/w/${ws.id}/rewrite`, 'Rewrite studio', PenLine, data!.findings.filter((f) => f.suggestion && !isClosed(f.status)).length],
  ] as const : [];
  const relNav = ws ? [
    [`/w/${ws.id}/release`, 'Release review', ClipboardCheck],
    [`/w/${ws.id}/history`, 'Release history', History],
    [`/w/${ws.id}/export`, 'Reports & export', FileOutput],
  ] as const : [];
  return (
    <div className="shell" style={inspector ? undefined : { gridTemplateColumns: '264px minmax(0, 1fr)' }}>
      <aside className="sidebar glass" aria-label="Navigation">
        <Link to="/" className="sb-brand" style={{ color: 'inherit', textDecoration: 'none' }}><Logo /><span>Mosaic</span></Link>
        {ws && <Link to="/workspaces" className="ws-switch" style={{ color: 'inherit', textDecoration: 'none' }}><Logo size={18} /><span><span className="ws-t">{ws.title}</span><span className="ws-s">{ws.kind === 'sample' ? 'Sample · fictional' : 'Private · this browser'}</span></span><ChevronsUpDown size={15} /></Link>}
        <nav className="nav">
          {ws && <><div className="nav-h">Review</div>{nav.map(([to, label, Icon, n]) => <NavLink key={to} to={to} end className="nav-i"><Icon size={16} /><span>{label}</span>{n ? <span className="n">{n}</span> : null}</NavLink>)}</>}
          {ws && <><div className="nav-h">Release</div>{relNav.map(([to, label, Icon]) => <NavLink key={to} to={to} className="nav-i"><Icon size={16} /><span>{label}</span></NavLink>)}</>}
          <div className="nav-h">Tools</div>
          <NavLink to="/workspaces" end className="nav-i"><Layers size={16} /><span>Workspaces</span></NavLink>
          <NavLink to="/tests" className="nav-i"><FlaskConical size={16} /><span>Stress tests</span></NavLink>
          <NavLink to="/journal" className="nav-i"><Activity size={16} /><span>Inference journal</span></NavLink>
          <NavLink to="/benchmark" className="nav-i"><ChartColumn size={16} /><span>Benchmark lab</span></NavLink>
        </nav>
        <div className="sb-foot">
          <NavLink to="/device" className="dev-chip" style={{ color: 'inherit', textDecoration: 'none' }}><span className={`dot ${r?.ok ? 'ok' : 'warn'}`} /><span><b>On-device model</b><span>{r === null ? 'Checking' : r.ok ? 'Ready' : r.reason === 'MODEL_NOT_AVAILABLE' && r.detail === 'downloadable' ? 'Download needed' : 'Unavailable here'}{app.online ? '' : ' · offline'}</span></span></NavLink>
          <NavLink to="/settings" className="nav-i"><Settings size={16} /><span>Settings</span></NavLink>
        </div>
      </aside>
      <section className="main" aria-label={title}>
        <header className="topbar-d glass">
          <div className="crumbs">{ws && <><Link to={`/w/${ws.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{ws.title}</Link><ChevronRight size={14} /></>}<b>{title}</b></div>
          <span className="spacer" />
          <Link to="/device" className="pill-status" title={r && !r.ok ? readinessText(r.reason, r.detail) : statusLabel} style={{ color: 'inherit', textDecoration: 'none', whiteSpace: 'nowrap' }}><span className={`dot ${dot}`} />{statusLabel}</Link>
          {ws && st?.running && <button type="button" className="btn btn-quiet tb-btn" onClick={() => app.cancelReview(ws.id)}><X size={15} /> Cancel</button>}
          {ws && <Link to={`/w/${ws.id}/import`} className="btn btn-quiet tb-btn" style={{ textDecoration: 'none' }}><FileUp size={15} /> Import</Link>}
          {ws && <button type="button" className="btn btn-primary tb-btn" disabled={st?.running || !data?.draft} onClick={() => app.startReview(ws.id)}><ScanSearch size={15} /> {st?.running ? 'Reviewing…' : 'Run review'}</button>}
          {actions}
        </header>
        <div className="main-scroll"><div className={`main-inner ${wide ? 'wide' : ''}`}>
          {ws && st?.running && st.progress && <div style={{ marginBottom: 14 }}><div className="small muted" style={{ marginBottom: 6 }}>Reviewing on this device: {st.progress.label} ({st.progress.done}/{st.progress.total})</div><div className="progress-line"><i style={{ width: `${(st.progress.done / Math.max(1, st.progress.total)) * 100}%` }} /></div></div>}
          {ws && st?.error && <div className="banner banner-bad" role="alert" style={{ marginBottom: 14 }}><div className="banner-body"><strong>Review couldn’t run</strong>{st.error}</div></div>}
          {children}
        </div></div>
      </section>
      {inspector && <aside className="inspector glass" aria-label={inspectorTitle}><div className="insp-head"><h2>{inspectorTitle}</h2></div><div className="insp-body">{inspector}</div></aside>}
      <nav className="mobile-nav glass" aria-label="Main">
        <NavLink to="/workspaces"><Layers size={20} /><span>Workspaces</span></NavLink>
        {ws ? <NavLink to={`/w/${ws.id}/findings`}><ListChecks size={20} /><span>Findings</span></NavLink> : <span />}
        {ws ? <NavLink to={`/w/${ws.id}/document`}><FileText size={20} /><span>Draft</span></NavLink> : <span />}
        <NavLink to="/journal"><Activity size={20} /><span>Journal</span></NavLink>
        <NavLink to="/settings"><Settings size={20} /><span>Settings</span></NavLink>
      </nav>
    </div>
  );
}
