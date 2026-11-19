import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';

/** Last value per cache key, so revisiting a screen paints immediately instead of flashing empty. */
const cache = new Map<string, unknown>();

/** Subscribes to a Dexie query and re-renders when the underlying tables change. */
export function useLive<T>(query: () => Promise<T>, deps: unknown[], cacheKey?: string): T | undefined {
  const [value, setValue] = useState<T | undefined>(() => (cacheKey ? (cache.get(cacheKey) as T | undefined) : undefined));
  useEffect(() => {
    if (cacheKey && cache.has(cacheKey)) setValue(cache.get(cacheKey) as T);
    const sub = liveQuery(query).subscribe({
      next: (v) => { if (cacheKey) cache.set(cacheKey, v); setValue(v); },
      error: (e) => console.error('Local storage query failed', e instanceof Error ? e.name : 'error'),
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}

export const clearLiveCache = () => cache.clear();
