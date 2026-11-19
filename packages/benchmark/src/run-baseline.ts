// Runs configuration 1 (rules baseline) on the held-out split and writes results.
// The model configurations need an eligible on-device machine; they are recorded
// as not run rather than estimated.
import { writeFileSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import { generateDataset, DATASET_VERSION, DATASET_SEED } from './generator';
import { scoreCases } from './score';
import { rulesBaseline } from './baseline';

const all = generateDataset();
const test = all.filter((c) => c.split === 'test');
const t0 = performance.now();
const results = rulesBaseline(test);
const ms = performance.now() - t0;
const out = {
  kind: 'mosaic-benchmark-results',
  datasetVersion: DATASET_VERSION, seed: DATASET_SEED, split: 'test', cases: test.length, devCases: all.length - test.length,
  generatedAt: new Date().toISOString(),
  environment: { runtime: `Node ${process.version}`, os: `${os.type()} ${os.release()}`, where: 'Claude Code cloud container' },
  matching: 'Same document, same category, overlapping span. CROSS_RELEASE scored per document set.',
  configurations: {
    rules: { status: 'run', label: 'Rules baseline', metrics: scoreCases(test, results), totalMs: Math.round(ms) },
    rulesPlusLocal: { status: 'not_run', label: 'Rules + on-device single-document review', reason: 'Needs Google Chrome with the built-in model available. Run from the Benchmark lab on an eligible machine.' },
    fullMosaic: { status: 'not_run', label: 'Full Mosaic: cross-release review with packs', reason: 'Needs Google Chrome with the built-in model available. Run from the Benchmark lab on an eligible machine.' },
  },
};
const here = new URL('.', import.meta.url);
const dir = new URL('../results/', here);
mkdirSync(dir, { recursive: true });
writeFileSync(new URL('results.json', dir), JSON.stringify(out, null, 2) + '\n');
mkdirSync(new URL('../../../demo/evidence/', here), { recursive: true });
writeFileSync(new URL('../../../demo/evidence/benchmark-results.json', here), JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out.configurations.rules.metrics, (_k, v) => (typeof v === 'number' && !Number.isInteger(v) ? Number(v.toFixed(3)) : v), 2));
