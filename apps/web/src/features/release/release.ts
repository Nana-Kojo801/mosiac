import type { ReleaseRecord } from '@mosaic/schemas';
import { db } from '../../storage/db';
import { newId, nowIso } from '../../storage/ids';
import { loadWorkspaceDocs } from '../review/engine';

export type ApprovalBlocker = 'NO_DRAFT' | 'NOT_REVIEWED' | 'STALE' | 'UNASSESSED' | 'CHECKLIST';

/** Why the current draft can't be approved yet, if anything (spec 5.2 step 8, F14). */
export async function approvalBlockers(workspaceId: string, checklist: boolean[]): Promise<ApprovalBlocker[]> {
  const { draft, releases } = await loadWorkspaceDocs(workspaceId);
  if (!draft) return ['NO_DRAFT'];
  const run = (await db().runs.where('workspaceId').equals(workspaceId).sortBy('startedAt')).pop();
  const out: ApprovalBlocker[] = [];
  if (!run) out.push('NOT_REVIEWED');
  else {
    const current = [draft.version.id, ...releases.map((r) => r.version.id)];
    if (current.some((v) => !run.inputVersionIds.includes(v))) out.push('STALE');
    const findings = await db().findings.where('runId').equals(run.id).toArray();
    if (findings.some((f) => f.status === 'UNASSESSED')) out.push('UNASSESSED');
  }
  if (!checklist.every(Boolean)) out.push('CHECKLIST');
  return out;
}

/** Records approval locally and makes the draft part of the release history. Not a legal or compliance sign-off. */
export async function approveRelease(workspaceId: string, checklist: boolean[]): Promise<ReleaseRecord> {
  const blockers = await approvalBlockers(workspaceId, checklist);
  if (blockers.length) throw new Error(`Cannot approve yet: ${blockers.join(', ')}`);
  const { draft } = await loadWorkspaceDocs(workspaceId);
  const run = (await db().runs.where('workspaceId').equals(workspaceId).sortBy('startedAt')).pop()!;
  const findings = await db().findings.where('runId').equals(run.id).toArray();
  const prior = (await db().releases.where('documentId').equals(draft!.doc.id).toArray()).filter((r) => !r.revokedAt).pop();
  const rec: ReleaseRecord = {
    id: newId('rel'), workspaceId, documentId: draft!.doc.id, versionId: draft!.version.id, approvedAt: nowIso(),
    reviewSummary: { openFindings: findings.filter((f) => f.status === 'OPEN' || f.status === 'UNDER_REVIEW' || f.status === 'ACCEPTED_RESIDUAL').length, resolved: findings.filter((f) => f.status === 'RESOLVED').length, coverage: run.coverage },
    supersedesId: prior?.id,
  };
  const d = db();
  await d.transaction('rw', d.releases, d.documents, async () => {
    await d.releases.add(rec);
    await d.documents.update(draft!.doc.id, { role: 'release', approvedAt: rec.approvedAt });
  });
  return rec;
}

/** Withdraws the approval marker; the document returns to draft. Copies already shared are unaffected. */
export async function revokeRelease(releaseId: string) {
  const d = db();
  const rec = await d.releases.get(releaseId);
  if (!rec || rec.revokedAt) return;
  await d.transaction('rw', d.releases, d.documents, async () => {
    await d.releases.update(releaseId, { revokedAt: nowIso() });
    await d.documents.update(rec.documentId, { role: 'draft', approvedAt: undefined, currentVersionId: rec.versionId });
  });
}
