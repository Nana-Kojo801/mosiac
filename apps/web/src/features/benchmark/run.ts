import { generateDataset, rulesBaseline, scoreCases, DATASET_VERSION, DATASET_SEED, type BenchCase, type CaseResult } from '@mosaic/benchmark';
import { db } from '../../storage/db';
import { documents, workspaces } from '../../storage/repositories';
import { runReview } from '../review/engine';
import type { AIGateway } from '../../ai/gateway';

/**
 * Benchmark runner (spec 14). Configuration 1 runs anywhere. Configurations 2
 * and 3 use the real on-device model through the same guarded review engine as
 * the product, in temporary workspaces that are deleted afterwards. If the
 * model is unavailable they are reported as not run, never estimated.
 */
export const heldOut = () => generateDataset().filter((c) => c.split === 'test');

export function runRulesConfig() { const cases = heldOut(); return scoreCases(cases, rulesBaseline(cases)); }

async function runModelCase(c: BenchCase, gateway: AIGateway, withReleases: boolean, signal?: AbortSignal): Promise<CaseResult> {
  const ws = await workspaces.create(`Benchmark ${c.id} (temporary)`, 'session');
  try {
    const ids: string[] = [];
    for (const [i, d] of c.docs.entries()) { if (i > 0 && !withReleases) break; const { version } = await documents.add(ws.id, { title: d.title, role: d.role, text: d.text, sourceKind: 'paste', approvedAt: d.role === 'release' ? '2026-01-01T00:00:00Z' : undefined }); ids.push(version.id); }
    const r = await runReview(ws.id, { gateway, signal });
    const assessed = r.run.coverage.unassessedChunks.length === 0;
    const predictions = r.findings.filter((f) => f.status !== 'UNASSESSED').flatMap((f) => f.category === 'CROSS_RELEASE' ? [{ doc: 0, category: f.category, start: 0, end: 1 }] : f.anchors.slice(0, 1).map((a) => ({ doc: ids.indexOf(a.versionId), category: f.category, start: a.start, end: a.end }))).filter((p) => p.doc >= 0);
    return { id: c.id, predictions, assessed };
  } finally { await workspaces.remove(ws.id); await db().runs.where('workspaceId').equals(ws.id).delete(); }
}

export type ModelRun = { config: 'rulesPlusLocal' | 'fullMosaic'; done: number; total: number };

export async function runModelConfigs(gateway: AIGateway, onProgress: (p: ModelRun) => void, signal?: AbortSignal) {
  const cases = heldOut();
  const out: Record<string, unknown> = {};
  for (const config of ['rulesPlusLocal', 'fullMosaic'] as const) {
    const results: CaseResult[] = [];
    const t0 = performance.now();
    for (const [i, c] of cases.entries()) { if (signal?.aborted) break; onProgress({ config, done: i, total: cases.length }); results.push(await runModelCase(c, gateway, config === 'fullMosaic', signal)); }
    out[config] = { status: signal?.aborted ? 'cancelled' : 'run', metrics: scoreCases(cases, results), totalMs: Math.round(performance.now() - t0), medianCaseMs: null };
  }
  const record = { kind: 'mosaic-benchmark-results', datasetVersion: DATASET_VERSION, seed: DATASET_SEED, split: 'test', cases: cases.length, generatedAt: new Date().toISOString(), environment: { userAgent: navigator.userAgent }, configurations: { rules: { status: 'run', metrics: runRulesConfig() }, ...out } };
  await db().settings.put({ key: 'benchmark-last', value: record });
  return record;
}
