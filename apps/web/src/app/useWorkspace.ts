import type { AnalysisRun, DocumentRecord, DocumentVersion, Finding, RewriteRecord, Workspace } from '@mosaic/schemas';
import { db } from '../storage/db';
import { useLive } from './live';

export type DocWithVersion = { doc: DocumentRecord; version: DocumentVersion };
export type WorkspaceData = {
  ws: Workspace; docs: DocWithVersion[]; draft?: DocWithVersion; releases: DocWithVersion[];
  run?: AnalysisRun; findings: Finding[]; stale: boolean; rewrites: RewriteRecord[];
};

/** Live view of one workspace: documents with current versions, latest run and its findings. */
export function useWorkspace(id: string | undefined): WorkspaceData | null | undefined {
  return useLive(async () => {
    if (!id) return null;
    const ws = await db().workspaces.get(id);
    if (!ws) return null;
    const docsRaw = await db().documents.where('workspaceId').equals(id).toArray();
    const docs: DocWithVersion[] = [];
    for (const doc of docsRaw) { const version = await db().versions.get(doc.currentVersionId); if (version) docs.push({ doc, version }); }
    const draft = docs.filter((d) => d.doc.role === 'draft').sort((a, b) => b.version.createdAt.localeCompare(a.version.createdAt))[0];
    const releases = docs.filter((d) => d.doc.role === 'release').sort((a, b) => (a.doc.approvedAt ?? '').localeCompare(b.doc.approvedAt ?? ''));
    const run = (await db().runs.where('workspaceId').equals(id).sortBy('startedAt')).pop();
    const findings = run ? await db().findings.where('runId').equals(run.id).toArray() : [];
    const current = new Set(docs.map((d) => d.version.id));
    const stale = Boolean(run && (run.inputVersionIds.some((v) => !current.has(v)) || docs.some((d) => !run.inputVersionIds.includes(d.version.id))));
    const rewrites = (await db().rewrites.where('workspaceId').equals(id).toArray()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const order = { HIGH: 0, CRITICAL: 0, MODERATE: 1, LOW: 2 } as const;
    findings.sort((a, b) => (a.status === 'UNASSESSED' ? 1 : 0) - (b.status === 'UNASSESSED' ? 1 : 0) || order[a.band] - order[b.band] || b.score - a.score);
    return { ws, docs, draft, releases, run, findings, stale, rewrites };
  }, [id]);
}
