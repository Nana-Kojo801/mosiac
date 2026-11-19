// Every factual claim the video makes, mapped to the evidence it is read from (spec 22.9).
// Writes demo/claims.manifest.json; render/validate.mjs re-reads each source and checks the value still holds.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../..', import.meta.url).pathname;
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
export const resolve = (obj, pointer) => pointer.split('.').reduce((acc, k) => {
  if (acc === undefined) return undefined;
  if (k === '*') return acc;
  return Array.isArray(acc) && /^\d+$/.test(k) ? acc[Number(k)] : Array.isArray(acc) ? acc.map((x) => x?.[k]) : acc[k];
}, obj);

const GROUPS = 'demo/evidence/group-steps.json', ROUTING = 'demo/evidence/routing.json', AUDIT = 'demo/evidence/network-audit.json';
const PROBE = 'demo/evidence/sdk-probe-no-local-model-online.json', BENCH = 'packages/benchmark/results/results.json', TRACK = 'demo/footage/track.json';

const json = (id, scene, claim, evidence, pointer) => ({ id, scene, claim, evidence, check: { type: 'json', pointer, value: resolve(read(evidence), pointer) } });
const contains = (id, scene, claim, evidence, text) => ({ id, scene, claim, evidence, check: { type: 'contains', text } });

export function buildClaims() {
  return [
    json('hook-group-steps', 'hook', 'Fictional illustration: three details narrow 100 people to 24, 8, then 1', GROUPS, 'original.*.count'),
    json('map-group-steps', 'map', 'In the fictional sample, three details narrow a hundred people down to one', GROUPS, 'original.*.count'),
    json('rewrite-group-after', 'rewrite', 'After the rewrite, the group grows from one to twenty-one', GROUPS, 'afterEdits.*.count'),
    json('hybrid-routing', 'hybrid', 'Extract, review and rewrite run ONLY_ON_DEVICE; generic test packs run ONLY_IN_CLOUD (diagram generated from the routing table)', ROUTING, 'routes.*.policy'),
    json('hybrid-no-egress', 'hybrid', 'Private documents never leave the browser: 0 external requests during a full private review', AUDIT, 'externalRequests'),
    json('hybrid-no-canary', 'hybrid', 'No request carried a private canary string', AUDIT, 'canaryLeaks'),
    json('hybrid-no-gemini', 'hybrid', 'No Gemini request during a private review', AUDIT, 'geminiRequests'),
    contains('hybrid-payload', 'hybrid', 'The only cloud request is a generatePack request with a domain and enum categories', 'packages/schemas/src/contracts.ts', "task: z.literal('generatePack')"),
    contains('consent-exact', 'consent', 'The exact request is shown and must be approved before sending', 'apps/web/src/app/screens/Tests.tsx', 'Send this request to the cloud?'),
    json('guard-raw', 'guard', 'SDK alone, ONLY_ON_DEVICE with no built-in model: private canary requests that reached the cloud', PROBE, 'network.rawSdkCanaryRequests'),
    json('guard-guarded', 'guard', "With Mosaic's guard: private canary requests that reached the cloud", PROBE, 'network.guardedPrivateCanaryRequests'),
    json('guard-env', 'guard', 'Measured in Chromium with no built-in model', PROBE, 'environment.browser'),
    json('ocr-local', 'ocr', 'OCR runs on the device: 0 external requests while reading an image and a scanned PDF', AUDIT, 'ocr.externalRequests'),
    contains('review-sample-label', 'review', 'Without a built-in model, the sample shows results labelled "Sample result"', 'apps/web/src/ui/components.tsx', "label: 'Sample result'"),
    json('footage-source', 'review,map,rewrite,consent,ocr,release,phone', 'Real app footage from the production build', TRACK, 'source'),
    json('bench-dataset', 'bench', 'Open synthetic benchmark, dataset version', BENCH, 'datasetVersion'),
    json('bench-cases', 'bench', 'Number of test cases', BENCH, 'cases'),
    json('bench-precision', 'bench', 'Rules baseline precision (shown as a percentage)', BENCH, 'configurations.rules.metrics.findings.precision'),
    json('bench-recall', 'bench', 'Rules baseline recall (shown as a percentage)', BENCH, 'configurations.rules.metrics.findings.recall'),
    json('bench-f1', 'bench', 'Rules baseline F1 (shown as a percentage)', BENCH, 'configurations.rules.metrics.findings.f1'),
    json('bench-next', 'bench', 'On-device model runs are not measured yet', BENCH, 'configurations.rulesPlusLocal.status'),
    contains('close-url', 'close', 'Hosted at mosaic-4a9d2.web.app', 'docs/deploy.md', 'https://mosaic-4a9d2.web.app'),
    contains('close-license', 'close', 'Open source under Apache-2.0', 'LICENSE', 'Apache License'),
  ];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const claims = buildClaims();
  writeFileSync(join(root, 'demo/claims.manifest.json'), JSON.stringify({ kind: 'mosaic-claims-manifest', generatedAt: new Date().toISOString(), claims }, null, 2) + '\n');
  console.log(`${claims.length} claims -> demo/claims.manifest.json`);
}
