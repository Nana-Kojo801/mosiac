import type { Finding, RewriteRecord } from '@mosaic/schemas';
import { db } from '../../storage/db';
import { documents } from '../../storage/repositories';
import { newId, nowIso } from '../../storage/ids';
import { loadWorkspaceDocs } from './engine';

/**
 * Applies accepted suggestions as a new draft version (spec 6.4, F12). The
 * original version is kept; undo restores it. No silent replacement: only
 * suggestions the reviewer applied are used, and each must still match the text.
 */
export async function applySuggestions(workspaceId: string, findingIds: string[]): Promise<{ record: RewriteRecord; skipped: string[] }> {
  const { draft } = await loadWorkspaceDocs(workspaceId);
  if (!draft) throw new Error('No draft');
  const fs = (await db().findings.bulkGet(findingIds)).filter((f): f is Finding => Boolean(f?.suggestion));
  let text = draft.version.normalizedText;
  const applied: Finding[] = [];
  const skipped: string[] = [];
  for (const f of fs) {
    const s = f.suggestion!;
    const i = text.indexOf(s.from);
    if (i < 0) { skipped.push(f.id); continue; }
    text = text.slice(0, i) + s.to + text.slice(i + s.from.length);
    applied.push(f);
  }
  if (!applied.length) throw new Error('None of the suggestions still match the current text');
  const v = await documents.addVersion(draft.doc.id, text, 'rewrite');
  const record: RewriteRecord = { id: newId('rw'), workspaceId, baseVersionId: draft.version.id, resultingVersionId: v.id, findingIds: applied.map((f) => f.id), operations: applied.map((f) => ({ anchor: f.anchors[f.suggestion!.anchorIndex], replacement: f.suggestion!.to })), createdAt: nowIso() };
  await db().rewrites.add(record);
  await db().findings.bulkUpdate(applied.map((f) => ({ key: f.id, changes: { status: 'UNDER_REVIEW' as const } })));
  return { record, skipped };
}

/** Manual edit of the whole draft text, kept as a new version. */
export async function saveManualEdit(workspaceId: string, newText: string) {
  const { draft } = await loadWorkspaceDocs(workspaceId);
  if (!draft) throw new Error('No draft');
  return documents.addVersion(draft.doc.id, newText, 'rewrite');
}

export async function undoRewrite(rewriteId: string) {
  const r = await db().rewrites.get(rewriteId);
  if (!r || r.undone) return;
  const v = await db().versions.get(r.resultingVersionId);
  if (!v) return;
  await documents.setCurrentVersion(v.documentId, r.baseVersionId);
  await db().rewrites.update(rewriteId, { undone: true });
  await db().findings.bulkUpdate(r.findingIds.map((id) => ({ key: id, changes: { status: 'OPEN' as const } })));
}

export async function setFindingStatus(id: string, status: Finding['status'], note?: string) {
  await db().findings.update(id, { status, statusNote: note?.slice(0, 500) });
}
