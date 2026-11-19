import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { DeviceReadiness } from '@mosaic/privacy-core';
import { runReview, type ReviewResult } from '../features/review/engine';
import { getGateway, ensureModelPort } from './services';
import { db } from '../storage/db';
import { ensureBundledPacks } from '../storage/repositories';

export type Appearance = 'light' | 'dark' | 'system';
export type MotionPref = 'system' | 'full' | 'reduced';
type Prefs = { appearance: Appearance; reducedTransparency: boolean; motion?: MotionPref };
type ReviewState = { running: boolean; progress?: { done: number; total: number; label: string }; last?: ReviewResult; error?: string };

type Ctx = {
  prefs: Prefs; setPrefs: (p: Partial<Prefs>) => void;
  online: boolean; readiness: DeviceReadiness | null; refreshReadiness: () => Promise<void>;
  review: Record<string, ReviewState>; startReview: (workspaceId: string) => Promise<void>; cancelReview: (workspaceId: string) => void;
  toast: (msg: string) => void;
  lastWorkspace: string | null; setLastWorkspace: (id: string | null) => void;
};
const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => { const c = useContext(AppCtx); if (!c) throw new Error('AppProvider missing'); return c; };

export function AppProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<Prefs>(() => { try { const v = localStorage.getItem('mosaic:prefs'); if (v) return JSON.parse(v) as Prefs; } catch { /* ignore */ } return { appearance: 'light', reducedTransparency: false }; });
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [readiness, setReadiness] = useState<DeviceReadiness | null>(null);
  const [review, setReview] = useState<Record<string, ReviewState>>({});
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const controllers = useRef(new Map<string, AbortController>());
  const [lastWorkspace, setLastWorkspaceState] = useState<string | null>(() => { try { return localStorage.getItem('mosaic:last-ws'); } catch { return null; } });
  const setLastWorkspace = useCallback((id: string | null) => { setLastWorkspaceState(id); try { if (id) localStorage.setItem('mosaic:last-ws', id); else localStorage.removeItem('mosaic:last-ws'); } catch { /* storage unavailable */ } }, []);

  useEffect(() => { void ensureBundledPacks(); }, []);
  useEffect(() => { void db().settings.get('prefs').then((s) => { if (s) setPrefsState(s.value as Prefs); }); }, []);
  const setPrefs = useCallback((p: Partial<Prefs>) => setPrefsState((cur) => { const next = { ...cur, ...p }; void db().settings.put({ key: 'prefs', value: next }); try { localStorage.setItem('mosaic:prefs', JSON.stringify(next)); } catch { /* ignore */ } return next; }), []);
  useEffect(() => {
    const el = document.documentElement;
    if (prefs.appearance === 'system') el.removeAttribute('data-theme'); else el.setAttribute('data-theme', prefs.appearance);
    el.setAttribute('data-transparency', prefs.reducedTransparency ? 'reduced' : 'full');
    el.setAttribute('data-motion', prefs.motion ?? 'system');
  }, [prefs]);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const refreshReadiness = useCallback(async () => {
    const g = getGateway();
    if (!g) { setReadiness({ ok: false, reason: 'NO_PROMPT_API', detail: 'Model services are not configured in this build' }); return; }
    setReadiness(await g.readiness());
  }, []);
  useEffect(() => { void refreshReadiness(); }, [refreshReadiness]);

  const toast = useCallback((msg: string) => { const id = Date.now() + Math.random(); setToasts((t) => [...t.slice(-1), { id, msg }]); setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600); }, []);

  const startReview = useCallback(async (workspaceId: string) => {
    const ctrl = new AbortController();
    controllers.current.set(workspaceId, ctrl);
    setReview((r) => ({ ...r, [workspaceId]: { running: true } }));
    try {
      const g = getGateway();
      // Load Firebase only if private analysis can actually run here. Otherwise a
      // private review makes no external requests at all.
      if (g && (await g.readiness()).ok) await ensureModelPort();
      const result = await runReview(workspaceId, { gateway: g, signal: ctrl.signal, onProgress: (p) => setReview((r) => ({ ...r, [workspaceId]: { ...r[workspaceId], running: true, progress: p } })) });
      setReview((r) => ({ ...r, [workspaceId]: { running: false, last: result } }));
      toast(result.run.status === 'complete' ? 'Review finished' : result.run.status === 'cancelled' ? 'Review cancelled' : 'Review finished with paragraphs not assessed');
    } catch (e) {
      setReview((r) => ({ ...r, [workspaceId]: { running: false, error: (e as Error).message } }));
    } finally { controllers.current.delete(workspaceId); void refreshReadiness(); }
  }, [toast, refreshReadiness]);
  const cancelReview = useCallback((id: string) => controllers.current.get(id)?.abort(), []);

  const value = useMemo(() => ({ prefs, setPrefs, online, readiness, refreshReadiness, review, startReview, cancelReview, toast, lastWorkspace, setLastWorkspace }), [prefs, setPrefs, online, readiness, refreshReadiness, review, startReview, cancelReview, toast, lastWorkspace, setLastWorkspace]);
  return (
    <AppCtx.Provider value={value}>
      {children}
      <div id="toast-host" aria-live="polite"><AnimatePresence initial={false}>{toasts.map((t) => (
        <motion.div key={t.id} layout className="toast glass" role="status" initial={{ opacity: 0, y: 16, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }} transition={{ type: 'spring', stiffness: 700, damping: 42, mass: 0.6 }}><Check size={16} aria-hidden /><span>{t.msg}</span></motion.div>
      ))}</AnimatePresence></div>
    </AppCtx.Provider>
  );
}

/** True when animations should be reduced: the user's Mosaic setting wins, otherwise the system preference. */
export function useReduceMotion(): boolean {
  const { prefs } = useApp();
  const [sys, setSys] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => { const mq = matchMedia('(prefers-reduced-motion: reduce)'); const on = () => setSys(mq.matches); mq.addEventListener('change', on); return () => mq.removeEventListener('change', on); }, []);
  const m = prefs.motion ?? 'system';
  return m === 'reduced' || (m === 'system' && sys);
}
