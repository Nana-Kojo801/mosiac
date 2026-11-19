import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import type { DeviceReadiness } from '@mosaic/privacy-core';
import { runReview, type ReviewResult } from '../features/review/engine';
import { getGateway, ensureModelPort } from './services';
import { db } from '../storage/db';
import { ensureBundledPacks } from '../storage/repositories';

export type Appearance = 'light' | 'dark' | 'system';
type Prefs = { appearance: Appearance; reducedTransparency: boolean };
type ReviewState = { running: boolean; progress?: { done: number; total: number; label: string }; last?: ReviewResult; error?: string };

type Ctx = {
  prefs: Prefs; setPrefs: (p: Partial<Prefs>) => void;
  online: boolean; readiness: DeviceReadiness | null; refreshReadiness: () => Promise<void>;
  review: Record<string, ReviewState>; startReview: (workspaceId: string) => Promise<void>; cancelReview: (workspaceId: string) => void;
  toast: (msg: string) => void;
};
const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => { const c = useContext(AppCtx); if (!c) throw new Error('AppProvider missing'); return c; };

export function AppProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<Prefs>({ appearance: 'light', reducedTransparency: false });
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [readiness, setReadiness] = useState<DeviceReadiness | null>(null);
  const [review, setReview] = useState<Record<string, ReviewState>>({});
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const controllers = useRef(new Map<string, AbortController>());

  useEffect(() => { void ensureBundledPacks(); }, []);
  useEffect(() => { void db().settings.get('prefs').then((s) => { if (s) setPrefsState(s.value as Prefs); }); }, []);
  const setPrefs = useCallback((p: Partial<Prefs>) => setPrefsState((cur) => { const next = { ...cur, ...p }; void db().settings.put({ key: 'prefs', value: next }); return next; }), []);
  useEffect(() => {
    const el = document.documentElement;
    if (prefs.appearance === 'system') el.removeAttribute('data-theme'); else el.setAttribute('data-theme', prefs.appearance);
    el.setAttribute('data-transparency', prefs.reducedTransparency ? 'reduced' : 'full');
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

  const value = useMemo(() => ({ prefs, setPrefs, online, readiness, refreshReadiness, review, startReview, cancelReview, toast }), [prefs, setPrefs, online, readiness, refreshReadiness, review, startReview, cancelReview, toast]);
  return (
    <AppCtx.Provider value={value}>
      {children}
      <div id="toast-host" aria-live="polite">{toasts.map((t) => <div key={t.id} className="toast glass" role="status"><Check size={16} aria-hidden /><span>{t.msg}</span></div>)}</div>
    </AppCtx.Provider>
  );
}
