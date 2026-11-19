import { useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigationType, useOutlet } from 'react-router';
import { AnimatePresence, motion, useIsPresent, type Variants, type Transition } from 'motion/react';
import { Activity, ChartColumn, ChevronsUpDown, ClipboardCheck, FileOutput, FileText, FlaskConical, History, Layers, LayoutDashboard, ListChecks, PenLine, Settings, Waypoints } from 'lucide-react';
import { useApp, useReduceMotion } from './store';
import { useWorkspace, type WorkspaceData } from './useWorkspace';
import { Backdrop, Logo, isClosed } from '../ui/components';
import { useIsMobile } from './MobileShell';

/**
 * Persistent app layout. The sidebar (desktop) and tab bar (phone) live here,
 * so they never re-mount or disappear during navigation. Pages animate in and
 * out inside the outlet.
 */
// iOS-like curves: quick start, soft landing. Short durations keep motion light.
const IOS: Transition = { type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 };
const SNAP: Transition = { type: 'spring', stiffness: 700, damping: 48, mass: 0.6 };

export function AppLayout() {
  const loc = useLocation();
  const app = useApp();
  const mobile = useIsMobile();
  const routeWs = loc.pathname.match(/^\/w\/([^/]+)/)?.[1] ?? null;
  useEffect(() => { if (routeWs) app.setLastWorkspace(routeWs); }, [routeWs]); // eslint-disable-line react-hooks/exhaustive-deps
  const wsId = routeWs ?? app.lastWorkspace ?? undefined;
  const data = useWorkspace(wsId);
  const ws = data ?? null;
  const landing = loc.pathname === '/';
  useEffect(() => { if (data === null && !routeWs && app.lastWorkspace) app.setLastWorkspace(null); }, [data, routeWs]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="app-root">
      <Backdrop />
      <div className={`${mobile ? 'm-frame' : 'd-frame'} ${landing ? 'is-landing' : ''}`}>
        {!mobile && <AnimatePresence>{!landing && (
          <motion.div key="sidebar" className="d-side" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={IOS}><Sidebar data={ws} /></motion.div>
        )}</AnimatePresence>}
        <AnimatedOutlet mobile={mobile} />
        {mobile && <AnimatePresence>{!landing && (
          <motion.div key="tabbar" initial={{ y: 110 }} animate={{ y: 0 }} exit={{ y: 110 }} transition={IOS}><TabBar data={ws} /></motion.div>
        )}</AnimatePresence>}
      </div>
    </div>
  );
}

/* ---------- page transitions ---------- */
type Dir = { kind: 'push' | 'pop' | 'tab' | 'fade'; d: number };
const TAB_ORDER = (p: string) => (p === '/workspaces' ? 0 : /^\/w\/[^/]+\/findings$/.test(p) ? 1 : /^\/w\/[^/]+\/map$/.test(p) ? 2 : p === '/journal' ? 3 : p === '/settings' ? 4 : p === '/tests' ? 1.5 : -1);

function useDirection(): Dir {
  const loc = useLocation();
  const navType = useNavigationType();
  const prev = useRef(loc.pathname);
  const dir = useRef<Dir>({ kind: 'fade', d: 1 });
  if (prev.current !== loc.pathname) {
    const a = TAB_ORDER(prev.current), b = TAB_ORDER(loc.pathname);
    dir.current = a >= 0 && b >= 0 ? { kind: 'tab', d: Math.sign(b - a) || 1 } : navType === 'POP' ? { kind: 'pop', d: -1 } : { kind: 'push', d: 1 };
    prev.current = loc.pathname;
  }
  return dir.current;
}

// Phone: push/pop like a navigation stack, tabs like a pager. Only transform/opacity are animated (cheap).
const mobileVariants: Variants = {
  enter: (c: Dir) => c.kind === 'tab' ? { x: `${c.d * 100}%`, zIndex: 2 } : c.kind === 'push' ? { x: '100%', zIndex: 3 } : c.kind === 'pop' ? { x: '-25%', opacity: 0.85, zIndex: 1 } : { opacity: 0, y: 12, zIndex: 2 },
  center: { x: 0, y: 0, opacity: 1, transitionEnd: { zIndex: 2 } },
  exit: (c: Dir) => c.kind === 'tab' ? { x: `${-c.d * 100}%`, zIndex: 1 } : c.kind === 'push' ? { x: '-25%', opacity: 0.85, zIndex: 1 } : c.kind === 'pop' ? { x: '100%', zIndex: 3 } : { opacity: 0, zIndex: 1 },
};
// Desktop: the new page is readable almost at once. A quick fade with a small shift, and the old page leaves fast.
const desktopVariants: Variants = {
  enter: (c: Dir) => ({ opacity: 0.4, x: c.kind === 'pop' ? -10 : c.kind === 'tab' ? 10 * c.d : 10 }),
  center: { opacity: 1, x: 0, transition: { opacity: { duration: 0.09, ease: 'easeOut' }, x: { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] } } },
  exit: { opacity: 0, transition: { duration: 0.04, ease: 'linear' } },
};
const fadeVariants: Variants = { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } };

function AnimatedOutlet({ mobile }: { mobile: boolean }) {
  const loc = useLocation();
  const outlet = useOutlet();
  const dir = useDirection();
  const reduce = useReduceMotion();
  const variants = reduce ? fadeVariants : mobile ? mobileVariants : desktopVariants;
  const transition: Transition = reduce ? { duration: 0.1 } : mobile ? (dir.kind === 'tab' ? { ...IOS, duration: 0.26 } : IOS) : { duration: 0.2 };
  return (
    <div className={mobile ? 'm-pages' : 'd-pages'}>
      <AnimatePresence custom={dir} mode="popLayout">
        <Slot key={loc.pathname} path={loc.pathname} dir={dir} variants={variants} transition={transition}>{outlet}</Slot>
      </AnimatePresence>
    </div>
  );
}

/** One animated page. While it moves (entering or leaving), its glass stops re-blurring each frame. */
function Slot({ path, dir, variants, transition, children }: { path: string; dir: Dir; variants: Variants; transition: Transition; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <motion.div ref={ref} className="page-slot" custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={transition} data-moving=""
      onAnimationStart={() => ref.current?.setAttribute('data-moving', '')}
      onAnimationComplete={(def) => { if (def === 'center') ref.current?.removeAttribute('data-moving'); }}>
      <PresenceGuard path={path}>{children}</PresenceGuard>
    </motion.div>
  );
}

/** The leaving page stays visible during its exit animation but is hidden from assistive tech and can't be clicked. */
function PresenceGuard({ path, children }: { path: string; children: React.ReactNode }) {
  // `path` is frozen with the page; useLocation() is live. A mismatch means this page is leaving.
  const present = useIsPresent() && useLocation().pathname === path;
  return <div className="page-presence" aria-hidden={!present || undefined} {...(!present ? { inert: '' as unknown as boolean } : {})}>{children}</div>;
}

/* ---------- desktop sidebar ---------- */
function NavItem({ to, end, icon: Icon, label, n, hot }: { to: string; end?: boolean; icon: typeof Layers; label: string; n?: number; hot?: boolean }) {
  return (
    <NavLink to={to} end={end} className="nav-i">
      {({ isActive }) => (<>
        {isActive && <motion.span layoutId="nav-pill" className="nav-pill" transition={SNAP} />}
        <Icon size={16} /><span>{label}</span>{n ? <span className={`n${hot ? ' hot' : ''}`}>{n}</span> : null}
      </>)}
    </NavLink>
  );
}

function Sidebar({ data }: { data: WorkspaceData | null }) {
  const app = useApp();
  const r = app.readiness;
  const ws = data?.ws;
  const open = data ? data.findings.filter((f) => !isClosed(f.status)).length : 0;
  const high = data ? data.findings.filter((f) => !isClosed(f.status) && f.status !== 'UNASSESSED' && (f.band === 'HIGH' || f.band === 'CRITICAL')).length : 0;
  return (
    <aside className="sidebar glass" aria-label="Navigation">
      <Link to="/" className="sb-brand" style={{ color: 'inherit', textDecoration: 'none' }}><Logo /><span>Mosaic</span></Link>
      {ws ? <Link to="/workspaces" className="ws-switch" style={{ color: 'inherit', textDecoration: 'none' }}><Logo size={18} /><span><span className="ws-t">{ws.title}</span><span className="ws-s">{ws.kind === 'sample' ? 'Sample · fictional' : 'Private · this browser'}</span></span><ChevronsUpDown size={15} /></Link>
        : <Link to="/workspaces" className="ws-switch" style={{ color: 'inherit', textDecoration: 'none' }}><Layers size={18} /><span><span className="ws-t">Choose a workspace</span><span className="ws-s">Sample or private</span></span><ChevronsUpDown size={15} /></Link>}
      <nav className="nav">
        {ws && <>
          <div className="nav-h">Review</div>
          <NavItem to={`/w/${ws.id}`} end icon={LayoutDashboard} label="Overview" />
          <NavItem to={`/w/${ws.id}/document`} icon={FileText} label="Documents" n={data!.docs.length} />
          <NavItem to={`/w/${ws.id}/findings`} icon={ListChecks} label="Findings" n={open} hot={high > 0} />
          <NavItem to={`/w/${ws.id}/map`} icon={Waypoints} label="Disclosure map" />
          <NavItem to={`/w/${ws.id}/rewrite`} icon={PenLine} label="Rewrite studio" n={data!.findings.filter((f) => f.suggestion && !isClosed(f.status)).length} />
          <div className="nav-h">Release</div>
          <NavItem to={`/w/${ws.id}/release`} icon={ClipboardCheck} label="Release review" />
          <NavItem to={`/w/${ws.id}/history`} icon={History} label="Release history" />
          <NavItem to={`/w/${ws.id}/export`} icon={FileOutput} label="Reports & export" />
        </>}
        <div className="nav-h">Tools</div>
        <NavItem to="/workspaces" end icon={Layers} label="Workspaces" />
        <NavItem to="/tests" icon={FlaskConical} label="Stress tests" />
        <NavItem to="/journal" icon={Activity} label="Inference journal" />
        <NavItem to="/benchmark" icon={ChartColumn} label="Benchmark lab" />
      </nav>
      <div className="sb-foot">
        <NavLink to="/device" className="dev-chip" style={{ color: 'inherit', textDecoration: 'none' }}><span className={`dot ${r?.ok ? 'ok' : 'warn'}`} /><span><b>On-device model</b><span>{r === null ? 'Checking' : r.ok ? 'Ready' : r.reason === 'MODEL_NOT_AVAILABLE' && r.detail === 'downloadable' ? 'Download needed' : 'Unavailable here'}{app.online ? '' : ' · offline'}</span></span></NavLink>
        <NavItem to="/settings" icon={Settings} label="Settings" />
      </div>
    </aside>
  );
}

/* ---------- phone tab bar ---------- */
function Tab({ to, end, icon: Icon, label, badge }: { to: string; end?: boolean; icon: typeof Layers; label: string; badge?: number }) {
  return (
    <NavLink to={to} end={end} className="m-tab">
      {({ isActive }) => (<>
        {isActive && <motion.span layoutId="tab-pill" className="m-tab-pill" transition={SNAP} />}
        <motion.span className="m-tab-ic" animate={{ scale: isActive ? 1.06 : 1 }} transition={SNAP}><Icon size={22} /></motion.span>
        <span className="m-tab-l">{label}</span>{badge ? <span className="m-badge">{badge}</span> : null}
      </>)}
    </NavLink>
  );
}

function TabBar({ data }: { data: WorkspaceData | null }) {
  const ws = data?.ws;
  const high = data ? data.findings.filter((f) => !isClosed(f.status) && f.status !== 'UNASSESSED' && (f.band === 'HIGH' || f.band === 'CRITICAL')).length : 0;
  return (
    <nav className="m-tabbar glass" aria-label="Main">
      <Tab to="/workspaces" end icon={Layers} label="Workspaces" />
      {ws ? <Tab to={`/w/${ws.id}/findings`} icon={ListChecks} label="Findings" badge={high} /> : <Tab to="/tests" icon={FlaskConical} label="Tests" />}
      {ws ? <Tab to={`/w/${ws.id}/map`} icon={Waypoints} label="Map" /> : <Tab to="/benchmark" icon={ChartColumn} label="Lab" />}
      <Tab to="/journal" icon={Activity} label="Journal" />
      <Tab to="/settings" icon={Settings} label="Settings" />
    </nav>
  );
}
