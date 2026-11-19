// Everything the composition shows comes from these generated files.
import timeline from '../../render/timeline.json';
import track from '../../footage/track.json';
import groups from '../../evidence/group-steps.json';
import routing from '../../evidence/routing.json';
import probe from '../../evidence/sdk-probe-no-local-model-online.json';
import results from '../../../packages/benchmark/results/results.json';

export { track, groups, routing, probe, results };

export type Word = { text: string; start: number; end: number };
export type Scene = {
  id: string; kind: string; text: string; start: number; voiceAt: number; voiceDuration: number;
  audio: string; words: Word[]; shots?: string[]; label?: string; data?: Record<string, number | string>;
  from: number; dur: number; end: number;
};

export const FPS: number = timeline.fps;
export const BEAT = 60 / timeline.bpm;
export const TOTAL_FRAMES = Math.ceil(timeline.total * FPS);
export const SCENES: Scene[] = (timeline.scenes as Omit<Scene, 'from' | 'dur' | 'end'>[]).map((s, i, a) => {
  const end = i < a.length - 1 ? a[i + 1].start : timeline.total;
  const from = Math.round(s.start * FPS);
  return { ...s, from, dur: Math.round(end * FPS) - from, end };
});
export const scene = (id: string) => {
  const s = SCENES.find((x) => x.id === id);
  if (!s) throw new Error(`No scene ${id}`);
  return s;
};

const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, '');
/** Scene-local time (s) at which the nth occurrence of a narrated word starts. */
export function cue(id: string, word: string, nth = 0): number {
  const s = scene(id);
  let k = 0;
  for (const w of s.words) if (norm(w.text) === norm(word) && k++ === nth) return w.start - s.start;
  throw new Error(`cue ${id}/${word}#${nth} not found`);
}

export const SECTIONS = {
  drop: scene('title').start,
  breakA: scene('guard').start,
  breakB: scene('ocr').start,
  end: scene('close').start + 12 * BEAT,
};
