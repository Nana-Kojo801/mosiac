import { GeneratedPackOutput, TestPack, type Domain, type GenericPackRequest } from '@mosaic/schemas';

/** Validates a cloud-generated pack locally before it is stored or used (spec 6.2, 11.1). */
export type PackParse = { ok: true; pack: TestPack } | { ok: false; reason: 'NOT_JSON' | 'SCHEMA' | 'OFF_REQUEST'; detail?: string };

export function parseGeneratedPack(raw: string, req: GenericPackRequest, meta: { id: string; createdAt: string; version: string }): PackParse {
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return { ok: false, reason: 'NOT_JSON' }; }
  const r = GeneratedPackOutput.safeParse(json);
  if (!r.success) return { ok: false, reason: 'SCHEMA', detail: r.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };
  const allowed = new Set<string>(req.categories);
  const tests = r.data.tests.filter((t) => allowed.has(t.category));
  if (!tests.length) return { ok: false, reason: 'OFF_REQUEST', detail: 'No test matched a requested category' };
  const ids = new Set<string>();
  const unique = tests.filter((t) => (ids.has(t.id) ? false : (ids.add(t.id), true)));
  const pack = TestPack.parse({ id: meta.id, name: packName(req.domain), version: meta.version, domain: req.domain, source: 'cloud', createdAt: meta.createdAt, schemaVersion: 1, tests: unique });
  return { ok: true, pack };
}

const packName = (d: Domain) => (d === 'EDITORIAL' ? 'Editorial expansion' : 'Qualitative research expansion');

/** Prompt for the cloud generator. Contains only the enum request; asks for abstract, prevention-oriented tests. */
export function packPrompt(req: GenericPackRequest): string {
  return [
    'You write reusable privacy-review checks for people preparing documents for publication.',
    'Return JSON only, matching: {"tests":[{"id":"UPPER_SNAKE_ID","category":<one requested category>,"title":"<=80 chars","question":"a yes/no question a reviewer asks about their own draft","evidenceRequirement":"what in the text would answer it","remediation":"GENERALIZE|REMOVE|AGGREGATE|DELAY_RELEASE|HUMAN_REVIEW","fictionalExample":"a short, wholly fictional example sentence"}]}.',
    'Write 2 to 4 tests per requested category. Tests must help prevent disclosure. Never describe how to identify, search for, locate or profile a real person, and include no links, names of real people, real organisations or code.',
    `Request: ${JSON.stringify(req)}`,
  ].join('\n');
}
