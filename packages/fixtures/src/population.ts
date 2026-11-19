/**
 * Seeded fictional population for the educational group-size illustration
 * (spec 8.3). 100 toy records; IDs are not names. Every count shown in the
 * product is computed from these sets, never typed in.
 */
function mulberry32(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export const POPULATION_SEED = 20261119;

export type Population = { ids: string[]; sets: Record<'team' | 'cohort' | 'transfer' | 'movedSite', Set<number>> };

export function buildPopulation(seed = POPULATION_SEED): Population {
  const rnd = mulberry32(seed);
  const order = Array.from({ length: 100 }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const team = order.slice(0, 24);
  const outside = order.slice(24);
  const teamCohort = team.slice(0, 8);
  return {
    ids: Array.from({ length: 100 }, (_, i) => `T-${String(i + 1).padStart(3, '0')}`),
    sets: {
      team: new Set(team), // overnight pharmacy team (Interim report)
      cohort: new Set([...teamCohort, ...outside.slice(0, 7)]), // winter onboarding cohort (Case study)
      transfer: new Set([teamCohort[0], outside[10], outside[20]]), // transfer from the coastal satellite clinic
      movedSite: new Set([...teamCohort.slice(0, 7), ...team.slice(8, 22), ...outside.slice(30, 69)]), // moved from another site in the network
    },
  };
}

/** Which fictional attributes the current draft discloses, decided from its text. */
export type DraftDisclosure = { linksCohort: boolean; transfer: 'specific' | 'general' | 'none' };

export function disclosureOfDraft(draftText: string): DraftDisclosure {
  const t = draftText.toLowerCase();
  return {
    linksCohort: /14 january/.test(t),
    transfer: t.includes('transfer from the coastal satellite clinic') ? 'specific' : /another site/.test(t) ? 'general' : 'none',
  };
}

export type GroupStep = { label: string; source: string; members: Set<number>; count: number };

export function groupSteps(d: DraftDisclosure, pop: Population = buildPopulation()): GroupStep[] {
  const steps: GroupStep[] = [];
  const push = (label: string, source: string, s?: Set<number>) => {
    const prev = steps.length ? steps[steps.length - 1].members : new Set(pop.ids.map((_, i) => i));
    const members = s ? new Set([...prev].filter((i) => s.has(i))) : prev;
    steps.push({ label, source, members, count: members.size });
  };
  push('Fictional population', 'Seeded toy records');
  push('Overnight pharmacy team', 'Interim report ¶2', pop.sets.team);
  if (d.linksCohort) push('Winter onboarding cohort', 'Case study ¶2, linked by the date in P-07 ¶5', pop.sets.cohort);
  if (d.transfer === 'specific') push('Transfer from the coastal satellite clinic', 'P-07 ¶2', pop.sets.transfer);
  if (d.transfer === 'general') push('Moved from another site', 'P-07 ¶2 (revised)', pop.sets.movedSite);
  return steps;
}
