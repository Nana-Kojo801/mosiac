import type { AnalysisRun, Anchor, Coverage, DisclosureEdge, DocumentRecord, DocumentVersion, Finding, FindingCategory, ScoreComponents } from '@mosaic/schemas';
import { bandOf, chunkParagraphs, clampComponents, digestOf, paragraphOf, runRules, ruleById, scoreOf } from '@mosaic/privacy-core';
import { AUTHORED_CONTEXT_FINDINGS, SAMPLE_DOCS } from '@mosaic/fixtures';
import { db } from '../../storage/db';
import { newId, nowIso } from '../../storage/ids';
import type { AIGateway } from '../../ai/gateway';
import { PROMPT_VERSION } from '../../ai/prompts';

/**
 * Review engine (spec 8.1). Deterministic rules + guarded on-device extraction
 * + deterministic cross-release linking + rubric scoring. When no local model
 * is available, the sample workspace (and only the sample) shows authored
 * sample results labelled FIXTURE; private workspaces are left not assessed.
 */
export const ALGORITHM_VERSION = 'review-2026.11.19-1';

export type ReviewInput = { gateway: AIGateway | null; signal?: AbortSignal; onProgress?: (p: { done: number; total: number; label: string }) => void };
export type ReviewResult = { run: AnalysisRun; findings: Finding[]; diff: { resolved: number; unchanged: number; added: number; unassessed: number } };

type Loaded = { doc: DocumentRecord; version: DocumentVersion };

export async function loadWorkspaceDocs(workspaceId: string): Promise<{ draft?: Loaded; releases: Loaded[] }> {
  const docs = await db().documents.where('workspaceId').equals(workspaceId).toArray();
  const loaded: Loaded[] = [];
  for (const doc of docs) { const version = await db().versions.get(doc.currentVersionId); if (version) loaded.push({ doc, version }); }
  const drafts = loaded.filter((l) => l.doc.role === 'draft').sort((a, b) => b.version.createdAt.localeCompare(a.version.createdAt));
  return { draft: drafts[0], releases: loaded.filter((l) => l.doc.role === 'release').sort((a, b) => (a.doc.approvedAt ?? '').localeCompare(b.doc.approvedAt ?? '')) };
}

const STOP = new Set('about after again against also among another because before being below between could during every first found from have having into just like made many more most much must only other over said same should since some such than that their them then there these they this those through under until very were what when where which while with within without would your nights night shift people participant participants'.split(' '));
// Light stemming: the first five letters, plus "over"-prefixed forms ("overnight" ~ "night").
const stem = (w: string) => w.replace(/^over(?=[a-z]{4})/, '').slice(0, 5);
const salient = (s: string) => new Set((s.toLowerCase().match(/[a-z]{4,}/g) || []).filter((w) => !STOP.has(w)).map(stem));
/** Category families for category-level association (spec 8.1 step 4). */
const FAMILY: Partial<Record<FindingCategory, string>> = { RARE_ATTRIBUTE: 'role or skill', PRECISE_DATE: 'timing', DISTINCTIVE_EVENT: 'timing', NARROW_LOCATION: 'place', SENSITIVE_CONTEXT: 'sensitive context' };

const keyOf = (f: Pick<Finding, 'category' | 'anchors'>) => `${f.category}|${(f.anchors[0]?.quote ?? '').toLowerCase()}`;

function anchorFor(v: DocumentVersion, start: number, end: number, validation: Anchor['validation'] = 'EXACT'): Anchor {
  return { versionId: v.id, paragraph: paragraphOf(v.paragraphs, start), start, end, quote: v.normalizedText.slice(start, end), validation };
}

function makeFinding(base: Omit<Finding, 'score' | 'band' | 'components'> & { components: ScoreComponents }): Finding {
  const c = clampComponents(base.components);
  return { ...base, components: c, score: scoreOf(c), band: bandOf(c) };
}

export async function runReview(workspaceId: string, input: ReviewInput): Promise<ReviewResult> {
  const ws = await db().workspaces.get(workspaceId);
  if (!ws) throw new Error('Workspace not found');
  const { draft, releases } = await loadWorkspaceDocs(workspaceId);
  if (!draft) throw new Error('Add a draft to review first');
  const runId = newId('run');
  const startedAt = nowIso();
  const findings: Finding[] = [];
  const edges: DisclosureEdge[] = [];
  const dv = draft.version;
  const coverage: Coverage = { paragraphsTotal: dv.paragraphs.length, contextAssessed: 0, rulesAssessed: dv.paragraphs.length, unassessedChunks: [] };
  const enabledPacks = (await db().packs.toArray()).filter((p) => p.enabled);
  const packIds = enabledPacks.map((p) => `${p.id}@${p.version}`);
  // Generic pack tests are applied locally: they go into the on-device prompt, never anywhere else.
  const tests = enabledPacks.flatMap((p) => p.tests.map((t) => ({ question: t.question, category: t.category })));

  // 1. Deterministic rules on the draft.
  for (const m of runRules(dv.normalizedText)) {
    const rule = ruleById(m.ruleId)!;
    findings.push(makeFinding({
      id: newId('f'), runId, workspaceId, category: m.category, title: rule.title, anchors: [anchorFor(dv, m.start, m.end)], components: rule.components,
      confidence: 'HIGH', confidenceReason: `Matched the rule "${rule.description}".`, rationale: m.category === 'DIRECT_IDENTIFIER' ? 'Contact details and reference numbers identify a person directly. A detected direct identifier is raised to high priority.' : 'Day-level dates are often more precise than an analysis needs and can link a document to recorded events.',
      proposedAction: rule.action, suggestion: { from: m.quote, to: rule.id === 'R-DATE' ? m.quote.replace(/\b\d{1,2}(st|nd|rd|th)?\s+/, '').replace(/\s+\d{1,2}(st|nd|rd|th)?\b/, '') : rule.replacement, anchorIndex: 0 },
      source: 'RULES', status: 'OPEN', ruleId: rule.id,
    }));
  }

  // 2. Contextual extraction: on device, through the guard.
  const readiness = input.gateway ? await input.gateway.readiness() : { ok: false as const, reason: 'NO_PROMPT_API' as const };
  type Ctx = { loaded: Loaded; f: { category: FindingCategory; start: number; end: number; rationale: string; confidence: Finding['confidence']; proposedAction: Finding['proposedAction']; validation: Anchor['validation'] } };
  const ctx: Ctx[] = [];
  let usedFixture = false;
  if (readiness.ok && input.gateway) {
    const targets = [draft, ...releases];
    const plan = targets.flatMap((l) => chunkParagraphs(l.version.normalizedText, l.version.paragraphs).map((c) => ({ l, c })));
    let done = 0;
    for (const { l, c } of plan) {
      if (input.signal?.aborted) { if (l === draft) coverage.unassessedChunks.push({ paragraphs: c.paragraphs, reason: 'Cancelled' }); continue; }
      input.onProgress?.({ done, total: plan.length, label: `${l.doc.title} ¶${c.paragraphs[0] + 1}–${c.paragraphs[1] + 1}` });
      const passage = l.version.normalizedText.slice(c.start, c.end);
      const r = await input.gateway.extractPrivate(passage, l.doc.role, input.signal, tests);
      done++;
      if (r.ok) {
        if (l === draft) coverage.contextAssessed += c.paragraphs[1] - c.paragraphs[0] + 1;
        for (const f of r.findings) ctx.push({ loaded: l, f: { ...f, start: f.start + c.start, end: f.end + c.start } });
      } else if (l === draft) coverage.unassessedChunks.push({ paragraphs: c.paragraphs, reason: r.reason });
    }
    input.onProgress?.({ done: plan.length, total: plan.length, label: 'Linking releases' });
  } else if (ws.kind === 'sample') {
    usedFixture = true;
    coverage.contextAssessed = dv.paragraphs.length;
  } else {
    const reason = readiness.ok ? 'No model connection' : readinessReason(readiness);
    coverage.unassessedChunks.push({ paragraphs: [0, Math.max(0, dv.paragraphs.length - 1)], reason });
  }

  if (usedFixture) {
    // Authored sample results: included only while their quotes still exist, so edits resolve them on re-review.
    const byKey = new Map([draft, ...releases].map((l) => [SAMPLE_DOCS.find((s) => s.title === l.doc.title)?.key, l]));
    for (const a of AUTHORED_CONTEXT_FINDINGS) {
      const anchors: Anchor[] = [];
      let ok = true;
      for (const an of a.anchors) {
        const l = byKey.get(an.doc);
        const i = l ? l.version.normalizedText.indexOf(an.quote) : -1;
        if (!l || i < 0) { ok = false; break; }
        anchors.push(anchorFor(l.version, i, i + an.quote.length));
      }
      if (!ok) continue;
      const sug = a.suggestion && dv.normalizedText.includes(a.suggestion.from) ? { from: a.suggestion.from, to: a.suggestion.to, anchorIndex: 0 } : undefined;
      findings.push(makeFinding({ id: newId('f'), runId, workspaceId, category: a.category, title: a.title, anchors, components: a.components, confidence: a.confidence, confidenceReason: a.confidenceReason, rationale: a.rationale, proposedAction: a.proposedAction, suggestion: sug, source: 'FIXTURE', status: 'OPEN' }));
      for (const an of anchors.slice(1)) edges.push({ id: newId('e'), workspaceId, runId, fromVersionId: an.versionId, fromParagraph: an.paragraph, category: a.category, findingIds: [], reason: `Shares context with ${draft.doc.title} ¶${anchors[0].paragraph + 1}` });
    }
  } else if (ctx.length) {
    linkAndScore(ctx, draft, releases, findings, edges, runId, workspaceId);
  }

  // 3. Dedupe: a contextual finding supersedes an overlapping rule finding of the same category.
  const ctxFindings = findings.filter((f) => f.source !== 'RULES');
  const deduped = findings.filter((f) => f.source !== 'RULES' || !ctxFindings.some((c) => c.category === f.category && c.anchors.some((a) => a.versionId === f.anchors[0].versionId && a.start < f.anchors[0].end && f.anchors[0].start < a.end)));

  // 4. Unassessed chunks become explicit findings so they can't be overlooked.
  for (const u of coverage.unassessedChunks) {
    const p0 = dv.paragraphs[u.paragraphs[0]], p1 = dv.paragraphs[u.paragraphs[1]] ?? p0;
    deduped.push({ id: newId('f'), runId, workspaceId, category: 'EXCESSIVE_DETAIL', title: `¶${u.paragraphs[0] + 1}–${u.paragraphs[1] + 1} not assessed`, anchors: p0 ? [{ versionId: dv.id, paragraph: u.paragraphs[0], start: p0.start, end: p1.end, quote: '', validation: 'EXACT' }] : [], components: { direct: 0, specificity: 0, cross: 0, sensitivity: 0 }, score: 0, band: 'LOW', confidence: 'LOW', confidenceReason: 'Not assessed.', rationale: `${u.reason}. Contextual checks did not run for these paragraphs, and nothing was sent to the cloud instead. Rules-based checks still ran.`, proposedAction: 'REVIEW', source: 'UNAVAILABLE', status: 'UNASSESSED' });
  }

  // 5. Carry forward reviewer decisions; compute the reassessment diff (F13).
  const prevRun = (await db().runs.where('workspaceId').equals(workspaceId).sortBy('startedAt')).pop();
  const prev = prevRun ? await db().findings.where('runId').equals(prevRun.id).toArray() : [];
  const prevByKey = new Map(prev.map((f) => [keyOf(f), f]));
  for (const f of deduped) {
    const p = prevByKey.get(keyOf(f));
    if (p && (p.status === 'DISMISSED' || p.status === 'ACCEPTED_RESIDUAL')) { f.status = p.status; f.statusNote = p.statusNote; }
  }
  const newKeys = new Set(deduped.map(keyOf));
  const prevOpen = prev.filter((f) => f.status !== 'UNASSESSED' && f.status !== 'RESOLVED');
  const diff = {
    resolved: prevOpen.filter((f) => !newKeys.has(keyOf(f))).length,
    unchanged: deduped.filter((f) => f.status !== 'UNASSESSED' && prevByKey.has(keyOf(f))).length,
    added: prevRun ? deduped.filter((f) => f.status !== 'UNASSESSED' && !prevByKey.has(keyOf(f))).length : 0,
    unassessed: deduped.filter((f) => f.status === 'UNASSESSED').length,
  };

  const inputVersionIds = [dv.id, ...releases.map((r) => r.version.id)];
  const run: AnalysisRun = {
    id: runId, workspaceId, inputVersionIds, packVersions: packIds, promptVersion: PROMPT_VERSION, algorithmVersion: ALGORITHM_VERSION, startedAt, finishedAt: nowIso(),
    status: input.signal?.aborted ? 'cancelled' : coverage.unassessedChunks.length ? 'partial' : 'complete', coverage,
    cacheKey: await digestOf({ inputVersionIds, packIds, PROMPT_VERSION, ALGORITHM_VERSION, mode: usedFixture ? 'fixture' : readiness.ok ? 'device' : 'rules' }),
  };
  const d = db();
  await d.transaction('rw', d.runs, d.findings, d.edges, d.workspaces, async () => {
    await d.runs.add(run);
    await d.findings.bulkAdd(deduped);
    await d.edges.bulkAdd(edges);
    await d.workspaces.update(workspaceId, { updatedAt: nowIso() });
  });
  return { run, findings: deduped, diff };
}

function readinessReason(r: { ok: false; reason: string; detail?: string }): string {
  switch (r.reason) {
    case 'NO_PROMPT_API': return 'This browser has no built-in model';
    case 'NOT_GOOGLE_CHROME': return 'The built-in model needs desktop Google Chrome';
    case 'MODEL_NOT_AVAILABLE': return r.detail === 'downloadable' ? 'The built-in model is not downloaded yet' : 'The built-in model is not available';
    default: return 'The built-in model could not be checked';
  }
}

/** Deterministic cross-release linking (8.1 step 4) over validated model findings. Category-level only; never identity. */
function linkAndScore(ctx: { loaded: Loaded; f: { category: FindingCategory; start: number; end: number; rationale: string; confidence: Finding['confidence']; proposedAction: Finding['proposedAction']; validation: Anchor['validation'] } }[], draft: Loaded, releases: Loaded[], out: Finding[], edges: DisclosureEdge[], runId: string, workspaceId: string) {
  const draftCtx = ctx.filter((c) => c.loaded === draft);
  const relCtx = ctx.filter((c) => c.loaded !== draft);
  const linkedReleases = new Set<string>();
  const members: { anchor: Anchor; rel: Anchor[]; spec: number; sens: number }[] = [];
  for (const c of draftCtx) {
    const v = c.loaded.version;
    const para = v.paragraphs[paragraphOf(v.paragraphs, c.f.start)];
    const words = salient(v.normalizedText.slice(para.start, para.end));
    const rel: Anchor[] = [];
    const reasons: string[] = [];
    for (const r of relCtx) {
      const rq = r.loaded.version.normalizedText.slice(r.f.start, r.f.end);
      const shared = [...salient(rq)].filter((w) => words.has(w) || salient(c.loaded.version.normalizedText.slice(c.f.start, c.f.end)).has(w));
      const sameFamily = FAMILY[c.f.category] && FAMILY[c.f.category] === FAMILY[r.f.category];
      if (shared.length || sameFamily) {
        rel.push(anchorFor(r.loaded.version, r.f.start, r.f.end));
        linkedReleases.add(r.loaded.doc.id);
        reasons.push(sameFamily ? `${r.loaded.doc.title} describes the same kind of detail (${FAMILY[c.f.category]})` : `${r.loaded.doc.title} shares related wording`);
      }
    }
    const spec = c.f.category === 'RARE_ATTRIBUTE' || c.f.category === 'DISTINCTIVE_EVENT' ? 3 : c.f.category === 'SENSITIVE_CONTEXT' ? 1 : 2;
    const sens = c.f.category === 'SENSITIVE_CONTEXT' ? 2 : c.f.confidence === 'HIGH' ? 1 : 0;
    const anchor = anchorFor(v, c.f.start, c.f.end, c.f.validation);
    const relDocs = new Set(rel.map((a) => a.versionId)).size;
    out.push(makeFinding({ id: newId('f'), runId, workspaceId, category: c.f.category, title: titleFor(c.f.category, anchor.quote), anchors: [anchor, ...rel], components: { direct: c.f.category === 'DIRECT_IDENTIFIER' ? 3 : 0, specificity: spec, cross: Math.min(3, relDocs), sensitivity: sens }, confidence: c.f.confidence, confidenceReason: c.f.validation === 'RELOCATED' ? 'The model’s offsets were off; the quote was found and re-anchored.' : 'Reported by the on-device model and matched to the exact text.', rationale: c.f.rationale, proposedAction: c.f.proposedAction, source: 'DEVICE', status: 'OPEN' }));
    if (rel.length) members.push({ anchor, rel, spec, sens });
    rel.forEach((a, i) => edges.push({ id: newId('e'), workspaceId, runId, fromVersionId: a.versionId, fromParagraph: a.paragraph, category: c.f.category, findingIds: [], reason: `${reasons[i]}, linked to ${draft.doc.title} ¶${anchor.paragraph + 1}. A hypothesis for review, not an identity match.` }));
  }
  if (linkedReleases.size >= 2 && members.length >= 2) {
    const rel = members.flatMap((m) => m.rel).filter((a, i, all) => all.findIndex((b) => b.versionId === a.versionId && b.start === a.start) === i);
    out.push(makeFinding({ id: newId('f'), runId, workspaceId, category: 'CROSS_RELEASE', title: `Details here combine with ${linkedReleases.size} published releases`, anchors: [...members.map((m) => m.anchor), ...rel], components: { direct: 0, specificity: Math.max(...members.map((m) => m.spec)), cross: 3, sensitivity: Math.max(...members.map((m) => m.sens)) }, confidence: 'MEDIUM', confidenceReason: 'Linked by shared context across documents. Knowledge outside this workspace is not assessed.', rationale: `Each detail may look harmless alone. Together with ${releases.filter((r) => linkedReleases.has(r.doc.id)).map((r) => r.doc.title).join(' and ')}, they narrow the context considerably.`, proposedAction: 'GENERALIZE', source: 'DEVICE', status: 'OPEN' }));
  }
}

function titleFor(c: FindingCategory, quote: string): string {
  const q = quote.length > 48 ? `${quote.slice(0, 45)}…` : quote;
  return { DIRECT_IDENTIFIER: 'A direct identifier', PRECISE_DATE: 'An exact date', RARE_ATTRIBUTE: 'A rare role or skill', NARROW_LOCATION: 'A specific place', DISTINCTIVE_EVENT: 'A distinctive event', CROSS_RELEASE: 'Context repeated across releases', EXCESSIVE_DETAIL: 'More detail than needed', SENSITIVE_CONTEXT: 'Sensitive context' }[c] + `: “${q}”`;
}
