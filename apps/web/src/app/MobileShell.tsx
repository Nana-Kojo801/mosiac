import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, useParams } from 'react-router';
import { AnimatePresence, motion, useDragControls } from 'motion/react';
import { ChevronLeft, PanelBottomOpen, ScanSearch, X } from 'lucide-react';
import { useApp, useReduceMotion } from './store';
import type { WorkspaceData } from './useWorkspace';

/** Screens call this when the user selects an item; on phones it opens the details sheet, on desktop nothing happens. */
const OPEN_EVENT = 'mosaic:open-details';
const detailsSheet = { open: () => window.dispatchEvent(new Event(OPEN_EVENT)) };
export const useDetailsSheet = () => detailsSheet;

type Props = { title: string; data?: WorkspaceData | null; inspector?: ReactNode; inspectorTitle?: string; children: ReactNode };
const ROOTS = new Set(['/workspaces', '/journal', '/settings', '/tests', '/benchmark']);

/** iOS-style phone page: its own scroll view, a large title that collapses into a glass bar, and a spring bottom sheet. */
export function MobilePage({ title, data, inspector, inspectorTitle = 'Details', children }: Props) {
  const { id } = useParams();
  const app = useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const reduce = useReduceMotion();
  const scroller = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [sheet, setSheet] = useState(false);
  const drag = useDragControls();
  const ws = data?.ws;
  const st = id ? app.review[id] : undefined;
  const hasInspector = Boolean(inspector);
  useEffect(() => { const on = () => { if (hasInspector) setSheet(true); }; window.addEventListener(OPEN_EVENT, on); return () => window.removeEventListener(OPEN_EVENT, on); }, [hasInspector]);
  const root = ROOTS.has(loc.pathname) || /^\/w\/[^/]+\/(findings|map)$/.test(loc.pathname);
  return (
    <div className={`m-page ${collapsed ? 'collapsed' : ''}`}>
      <header className="m-top">
        <div className="m-edge" />
        <div className="m-left">{!root && <motion.button whileTap={{ scale: 0.9 }} type="button" className="gbtn round glass" aria-label="Back" onClick={() => (window.history.length > 1 ? nav(-1) : nav('/workspaces'))}><ChevronLeft size={22} /></motion.button>}</div>
        <div className="m-title">{title}{ws && <span className="m-sub">{ws.title}</span>}</div>
        <div className="m-right">{ws && <motion.button whileTap={{ scale: 0.9 }} type="button" className="gbtn round glass" aria-label={st?.running ? 'Reviewing' : 'Run review'} disabled={st?.running || !data?.draft} onClick={() => app.startReview(ws.id)}><ScanSearch size={20} className={st?.running ? 'spin' : ''} /></motion.button>}</div>
      </header>
      <div className="m-scroll" ref={scroller} onScroll={(e) => setCollapsed((e.target as HTMLDivElement).scrollTop > 30)}>
        <main className="m-content">
          <AnimatePresence initial={false}>{ws && st?.running && st.progress && (
            <motion.div key="p" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}><div style={{ marginBottom: 12 }}><div className="small muted" style={{ marginBottom: 6 }}>Reviewing on this device ({st.progress.done}/{st.progress.total})</div><div className="progress-line"><i style={{ width: `${(st.progress.done / Math.max(1, st.progress.total)) * 100}%` }} /></div></div></motion.div>
          )}</AnimatePresence>
          {children}
        </main>
      </div>
      <AnimatePresence>{inspector && !sheet && (
        <motion.button key="details" type="button" className="m-details glass" onClick={() => setSheet(true)} initial={{ opacity: 0, scale: 0.8, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.85, y: 10 }} whileTap={{ scale: 0.94 }} transition={{ type: 'spring', stiffness: 700, damping: 40, mass: 0.6 }}><PanelBottomOpen size={17} /> {inspectorTitle}</motion.button>
      )}</AnimatePresence>
      {inspector && createPortal(
        <AnimatePresence>{sheet && (
          <div className="m-sheet-layer open" key="layer">
            <motion.div className="m-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSheet(false)} />
            <motion.div className="m-sheet glass glass-strong" role="dialog" aria-modal="true" aria-label={inspectorTitle}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={reduce ? { duration: 0.12 } : { type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.32 }}
              drag="y" dragControls={drag} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0.05, bottom: 0.9 }}
              onDragEnd={(_, info) => { if (info.offset.y > 120 || info.velocity.y > 700) setSheet(false); }}>
              <div className="m-grab" onPointerDown={(e) => drag.start(e)}><span /></div>
              <div className="m-sheet-head" onPointerDown={(e) => { if (!(e.target as HTMLElement).closest('button')) drag.start(e); }}><b>{inspectorTitle}</b><button type="button" className="gbtn round glass" aria-label="Close" onClick={() => setSheet(false)}><X size={18} /></button></div>
              <div className="m-sheet-body">{inspector}</div>
            </motion.div>
          </div>
        )}</AnimatePresence>, document.body)}
    </div>
  );
}

export function useIsMobile() {
  const q = '(max-width: 760px)';
  const [m, setM] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches);
  useEffect(() => { const mq = matchMedia(q); const on = () => setM(mq.matches); mq.addEventListener('change', on); return () => mq.removeEventListener('change', on); }, []);
  return m;
}
