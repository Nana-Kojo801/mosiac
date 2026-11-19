// The demo's single source of truth: scene order, narration and the evidence
// each scene relies on (spec 22.5, 22.9). Numbers in narration are read from
// evidence files, never typed in.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../..', import.meta.url).pathname;
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const words = (n) => {
  const ones = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
  const tens = ['', '', 'twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
  if (n === 100) return 'one hundred'; if (n < 20) return ones[n]; return tens[Math.floor(n / 10)] + (n % 10 ? '-' + ones[n % 10] : '');
};

export const EVIDENCE = {
  benchmark: 'packages/benchmark/results/results.json',
  sdkProbe: 'demo/evidence/sdk-probe-no-local-model-online.json',
  footage: 'demo/footage/track.json',
  routing: 'packages/schemas/src/routing.ts',
  fixtures: 'packages/fixtures/src/population.ts',
};

export function buildScenes() {
  const bench = read(EVIDENCE.benchmark).configurations.rules.metrics.findings;
  const probe = read(EVIDENCE.sdkProbe).network;
  const precision = Math.round(bench.precision * 100), recall = Math.round(bench.recall * 100);
  return [
    { id: 'hook', kind: 'hook', text: 'Three documents. Each one looks anonymous. But put them side by side, and they point to just one person.', evidence: [EVIDENCE.fixtures], label: 'Fictional illustration' },
    { id: 'title', kind: 'title', text: 'This is Mosaic. It catches what you never realized you were revealing.', evidence: [] },
    { id: 'problem', kind: 'problem', text: 'Redaction tools hunt for names and emails. Mosaic checks how your next draft combines with everything you’ve already published.', evidence: [] },
    { id: 'hybrid', kind: 'hybrid', text: 'Your private documents never leave your browser. The cloud only writes generic test packs, from a fixed list of categories, and only after you approve the exact request.', evidence: [EVIDENCE.routing, 'demo/evidence/network-audit.json'] },
    { id: 'review', kind: 'shots', shots: ['overview-start', 'overview-reviewed', 'findings', 'document'], text: 'Open a workspace, hit review, and Mosaic lights up the passages that matter, with evidence from every release side by side. Every result says where it ran. With no built-in model on this machine, the sample shows clearly labelled sample results.', evidence: [EVIDENCE.footage] },
    { id: 'map', kind: 'shots', shots: ['map', 'map-edge'], text: 'The disclosure map shows exactly how the draft connects to earlier releases. In this fictional sample, three small details narrow a hundred people down to one.', evidence: [EVIDENCE.footage, EVIDENCE.fixtures] },
    { id: 'rewrite', kind: 'shots', shots: ['rewrite-suggest', 'rewrite-applied', 'rewrite-reassessed', 'map-after'], text: 'Mosaic suggests safer wording that keeps your point. Apply it, review again, and that group grows from one to twenty-one.', evidence: [EVIDENCE.footage, EVIDENCE.fixtures] },
    { id: 'consent', kind: 'shots', shots: ['tests', 'consent'], text: 'Need new tests? You see the exact request before anything leaves your device. Just categories. No text. No names.', evidence: [EVIDENCE.footage] },
    { id: 'guard', kind: 'guard', text: `While building Mosaic, we found a real gap. In browsers without the built-in model, the SDK’s on-device-only mode quietly sends requests to the cloud. Mosaic’s guard blocks that. ${probe.guardedPrivateCanaryRequests === 0 ? 'Zero private requests got through.' : ''}`, evidence: [EVIDENCE.sdkProbe], data: { raw: probe.rawSdkCanaryRequests, guarded: probe.guardedPrivateCanaryRequests } },
    { id: 'ocr', kind: 'shots', shots: ['ocr'], text: 'Got a scan or a photo? Mosaic reads it with OCR, right on your device, and flags any words it isn’t sure about.', evidence: [EVIDENCE.footage] },
    { id: 'release', kind: 'shots', shots: ['release', 'history', 'export'], text: 'Approve the release on your device, export a clean copy, and you’re done.', evidence: [EVIDENCE.footage] },
    { id: 'phone', kind: 'phone', shots: ['phone-overview', 'phone-findings', 'phone-sheet', 'phone-map'], text: 'And it feels right at home on your phone.', evidence: [EVIDENCE.footage] },
    { id: 'bench', kind: 'bench', text: `It’s measured, too. On our open synthetic benchmark, the rules baseline alone scores ${words(precision)} percent precision and ${words(recall)} percent recall. On-device model runs are next.`, evidence: [EVIDENCE.benchmark], data: { precision, recall, cases: read(EVIDENCE.benchmark).cases, dataset: read(EVIDENCE.benchmark).datasetVersion } },
    { id: 'close', kind: 'close', text: 'Mosaic. Protect the information you never realized you were revealing. Try it free today.', evidence: [] },
  ];
}

export const missingEvidence = (scenes) => scenes.flatMap((s) => s.evidence.filter((e) => !existsSync(join(root, e))).map((e) => `${s.id}: ${e}`));
