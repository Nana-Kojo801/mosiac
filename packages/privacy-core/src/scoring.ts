import type { Band, ScoreComponents } from '@mosaic/schemas';

/**
 * Review-priority index (spec 8.2): direct 0–3, contextual specificity 0–3,
 * cross-release evidence 0–3, unnecessary sensitivity 0–2. Bands: 0–2 low,
 * 3–5 moderate, 6–8 high, 9–11 critical. A detected direct identifier raises
 * the band to at least high. This is review priority, never a probability of
 * identification, and a low score is not clearance.
 */
export const LIMITS: Readonly<ScoreComponents> = { direct: 3, specificity: 3, cross: 3, sensitivity: 2 };

export function clampComponents(c: ScoreComponents): ScoreComponents {
  const k = (v: number, max: number) => Math.max(0, Math.min(max, Math.round(v)));
  return { direct: k(c.direct, LIMITS.direct), specificity: k(c.specificity, LIMITS.specificity), cross: k(c.cross, LIMITS.cross), sensitivity: k(c.sensitivity, LIMITS.sensitivity) };
}

export function scoreOf(c: ScoreComponents): number { const x = clampComponents(c); return x.direct + x.specificity + x.cross + x.sensitivity; }

export function bandOf(c: ScoreComponents): Band {
  const s = scoreOf(c);
  let b: Band = s >= 9 ? 'CRITICAL' : s >= 6 ? 'HIGH' : s >= 3 ? 'MODERATE' : 'LOW';
  if (clampComponents(c).direct >= 3 && (b === 'LOW' || b === 'MODERATE')) b = 'HIGH';
  return b;
}

export const BAND_LABEL: Readonly<Record<Band, string>> = { LOW: 'Low', MODERATE: 'Needs review', HIGH: 'High priority', CRITICAL: 'Critical' };
