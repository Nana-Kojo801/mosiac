import type { InferencePolicy, Classification } from './enums';

/**
 * Routing table (spec 7.2). The privacy gate enforces it and the landing and
 * video diagrams are drawn from it, so the two cannot drift apart.
 */
export const TASK_KINDS = ['extract', 'review', 'rewrite', 'generatePack', 'explainSample', 'rules'] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

export type Route = {
  task: TaskKind;
  label: string;
  data: Classification | 'LOCAL_DATA';
  policy: InferencePolicy;
  onFailure: string;
};

export const ROUTING: Readonly<Record<TaskKind, Route>> = Object.freeze({
  extract: { task: 'extract', label: 'Extract context from private documents', data: 'PRIVATE', policy: 'ONLY_ON_DEVICE', onFailure: 'Marked not assessed; rules and manual review stay available' },
  review: { task: 'review', label: 'Review connections across releases', data: 'PRIVATE', policy: 'ONLY_ON_DEVICE', onFailure: 'Partial results kept; no cloud retry' },
  rewrite: { task: 'rewrite', label: 'Rewrite a private passage', data: 'PRIVATE', policy: 'ONLY_ON_DEVICE', onFailure: 'Manual editing' },
  generatePack: { task: 'generatePack', label: 'Generate generic test packs', data: 'GENERIC', policy: 'ONLY_IN_CLOUD', onFailure: 'Bundled or cached pack' },
  explainSample: { task: 'explainSample', label: 'Explain a sample test', data: 'SYNTHETIC', policy: 'PREFER_ON_DEVICE', onFailure: 'SDK may use the cloud; actual source shown' },
  rules: { task: 'rules', label: 'Direct-identifier checks, scoring, export', data: 'LOCAL_DATA', policy: 'NO_MODEL', onFailure: 'Works offline' },
});

export const PRIVATE_TASKS = ['extract', 'review', 'rewrite'] as const satisfies readonly TaskKind[];
export type PrivateTaskKind = (typeof PRIVATE_TASKS)[number];
