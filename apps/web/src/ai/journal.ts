import type { InferenceEvent } from '@mosaic/schemas';
import { db } from '../storage/db';
import { newId, nowIso } from '../storage/ids';

/** Inference journal (spec F15, 9.4). Metadata only: no prompts, outputs, file names or excerpts. */
export async function logEvent(e: Omit<InferenceEvent, 'id' | 'at'>): Promise<InferenceEvent> {
  const ev: InferenceEvent = { id: newId('op'), at: nowIso(), ...e, detail: e.detail?.slice(0, 200) };
  try { await db().events.add(ev); } catch { /* storage unavailable: never block inference on logging */ }
  return ev;
}

export const listEvents = (limit = 200) => db().events.orderBy('at').reverse().limit(limit).toArray();
