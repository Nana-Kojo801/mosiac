// Writes evidence the video reads, computed from the real fixtures and routing table.
//   node scripts/run-ts.mjs demo/render/data.ts
import { writeFileSync } from 'node:fs';
import { SAMPLE_DOCS, disclosureOfDraft, groupSteps } from '../../packages/fixtures/src/index';
import { ROUTING } from '../../packages/schemas/src/routing';

const draft = SAMPLE_DOCS.find((d) => d.key === 'D3')!.text;
const after = draft.replace('after my transfer from the coastal satellite clinic', 'after moving from another site in the network').replace('The week the new rota started, on 14 January, two of us', 'When the new rota started, two of us');
const ser = (steps: ReturnType<typeof groupSteps>) => steps.map((s) => ({ label: s.label, source: s.source, count: s.count, members: [...s.members] }));
writeFileSync(new URL('../evidence/group-steps.json', import.meta.url), JSON.stringify({ kind: 'mosaic-fictional-group-steps', note: 'Computed from packages/fixtures (seeded fictional population of 100). Educational illustration only.', original: ser(groupSteps(disclosureOfDraft(draft))), afterEdits: ser(groupSteps(disclosureOfDraft(after))) }, null, 2) + '\n');
writeFileSync(new URL('../evidence/routing.json', import.meta.url), JSON.stringify({ kind: 'mosaic-routing-table', source: 'packages/schemas/src/routing.ts', routes: Object.values(ROUTING) }, null, 2) + '\n');
console.log('wrote demo/evidence/group-steps.json and routing.json');
