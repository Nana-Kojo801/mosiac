import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronRight, FileUp, ScanSearch, X } from 'lucide-react';
import { useApp } from './store';
import { readinessText } from '../ai/gateway';
import type { WorkspaceData } from './useWorkspace';
import { MobilePage, useIsMobile } from './MobileShell';

type Props = { title: string; data?: WorkspaceData | null; inspector?: ReactNode; inspectorTitle?: string; inspectorKey?: string; wide?: boolean; children: ReactNode; actions?: ReactNode };

/** One page: desktop gets the glass top bar, content and inspector; phones get the iOS-style page. The sidebar and tab bar live in the layout. */
export function Shell(props: Props) {
  const mobile = useIsMobile();
  return mobile ? <MobilePage title={props.title} data={props.data} inspector={props.inspector} inspectorTitle={props.inspectorTitle}>{props.children}</MobilePage> : <DesktopPage {...props} />;
}

function DesktopPage({ title, data, inspector, inspectorTitle = 'Inspector', inspectorKey, wide, children, actions }: Props) {
  const { id } = useParams();
  const app = useApp();
  const r = app.readiness;
  const st = id ? app.review[id] : undefined;
  const dot = !app.online ? '' : r?.ok ? 'ok' : 'warn';
  const statusLabel = !app.online ? 'Offline · local work continues' : r === null ? 'Checking model' : r.ok ? 'On-device ready' : 'Rules only · no on-device model';
  const ws = data?.ws;
  return (
    <div className={`d-page ${inspector ? 'with-inspector' : ''}`}>
      <section className="main" aria-label={title}>
        <header className="topbar-d glass">
          <div className="crumbs">{ws && <><Link to={`/w/${ws.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{ws.title}</Link><ChevronRight size={14} /></>}<b>{title}</b></div>
          <span className="spacer" />
          <Link to="/device" className="pill-status" title={r && !r.ok ? readinessText(r.reason, r.detail) : statusLabel} style={{ color: 'inherit', textDecoration: 'none', whiteSpace: 'nowrap' }}><span className={`dot ${dot}`} />{statusLabel}</Link>
          {ws && st?.running && <button type="button" className="btn btn-quiet tb-btn" onClick={() => app.cancelReview(ws.id)}><X size={15} /> Cancel</button>}
          {ws && <Link to={`/w/${ws.id}/import`} className="btn btn-quiet tb-btn" style={{ textDecoration: 'none' }}><FileUp size={15} /> Import</Link>}
          {ws && <button type="button" className="btn btn-primary tb-btn" disabled={st?.running || !data?.draft} onClick={() => app.startReview(ws.id)}><ScanSearch size={15} className={st?.running ? 'spin' : ''} /> {st?.running ? 'Reviewing…' : 'Run review'}</button>}
          {actions}
        </header>
        <div className="main-scroll"><div className={`main-inner ${wide ? 'wide' : ''}`}>
          <AnimatePresence initial={false}>{ws && st?.running && st.progress && (
            <motion.div key="progress" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}><div style={{ marginBottom: 14 }}><div className="small muted" style={{ marginBottom: 6 }}>Reviewing on this device: {st.progress.label} ({st.progress.done}/{st.progress.total})</div><div className="progress-line"><i style={{ width: `${(st.progress.done / Math.max(1, st.progress.total)) * 100}%` }} /></div></div></motion.div>
          )}</AnimatePresence>
          {ws && st?.error && <div className="banner banner-bad" role="alert" style={{ marginBottom: 14 }}><div className="banner-body"><strong>Review couldn’t run</strong>{st.error}</div></div>}
          {children}
        </div></div>
      </section>
      {inspector && (
        <aside className="inspector glass" aria-label={inspectorTitle}>
          <div className="insp-head"><h2>{inspectorTitle}</h2></div>
          <div className="insp-body">
            <motion.div key={inspectorKey ?? 'static'} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ opacity: { duration: 0.12 }, x: { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] } }}>{inspector}</motion.div>
          </div>
        </aside>
      )}
    </div>
  );
}

/** Shown while a screen's local data loads for the first time. Appears only if loading takes longer than a moment. */
export function PageSkeleton({ title = '' }: { title?: string }) {
  return (
    <Shell title={title}>
      <div className="skeleton" aria-busy="true" aria-label="Loading">
        <i style={{ width: '40%', height: 34 }} /><i style={{ width: '70%' }} /><i style={{ width: '100%', height: 120 }} /><i style={{ width: '100%', height: 220 }} />
      </div>
    </Shell>
  );
}
