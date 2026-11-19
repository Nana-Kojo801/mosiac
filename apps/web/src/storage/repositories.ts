import type { DocumentRecord, DocumentRole, DocumentVersion, Workspace } from '@mosaic/schemas';
import { normalizeText, paragraphSpans, sha256Hex } from '@mosaic/privacy-core';
import { BUNDLED_PACKS, SAMPLE_DOCS, SAMPLE_WORKSPACE } from '@mosaic/fixtures';
import { db } from './db';
import { newId, nowIso } from './ids';

export const workspaces = {
  list: () => db().workspaces.orderBy('updatedAt').reverse().toArray(),
  get: (id: string) => db().workspaces.get(id),
  async create(title: string, storageMode: Workspace['storageMode'] = 'persist'): Promise<Workspace> {
    const t = nowIso();
    const w: Workspace = { id: newId('ws'), title: title.trim() || 'Untitled workspace', kind: 'private', storageMode, createdAt: t, updatedAt: t, schemaVersion: 1 };
    await db().workspaces.add(w);
    return w;
  },
  async rename(id: string, title: string) { await db().workspaces.update(id, { title: title.trim() || 'Untitled workspace', updatedAt: nowIso() }); },
  touch: (id: string) => db().workspaces.update(id, { updatedAt: nowIso() }),
  /** Deletes the workspace and every row linked to it, atomically. */
  async remove(id: string) {
    const d = db();
    await d.transaction('rw', [d.workspaces, ...d.workspaceTables], async () => {
      for (const t of d.workspaceTables) await t.where('workspaceId').equals(id).delete();
      await d.workspaces.delete(id);
    });
  },
};

export async function makeVersion(documentId: string, workspaceId: string, raw: string, label: string, sourceKind: DocumentVersion['sourceKind'], parentVersionId?: string): Promise<DocumentVersion> {
  const { text } = normalizeText(raw);
  return { id: newId('ver'), documentId, workspaceId, label, normalizedText: text, paragraphs: paragraphSpans(text), digest: await sha256Hex(text), createdAt: nowIso(), parentVersionId, sourceKind };
}

export const documents = {
  list: (workspaceId: string) => db().documents.where('workspaceId').equals(workspaceId).toArray(),
  get: (id: string) => db().documents.get(id),
  async add(workspaceId: string, input: { title: string; role: DocumentRole; text: string; sourceKind: DocumentVersion['sourceKind']; approvedAt?: string; versionLabel?: string }) {
    const docId = newId('doc');
    const v = await makeVersion(docId, workspaceId, input.text, input.versionLabel ?? 'v1', input.sourceKind);
    const doc: DocumentRecord = { id: docId, workspaceId, title: input.title.trim() || 'Untitled document', role: input.role, classification: 'PRIVATE', currentVersionId: v.id, createdAt: nowIso(), approvedAt: input.approvedAt };
    const d = db();
    await d.transaction('rw', d.documents, d.versions, d.workspaces, async () => { await d.versions.add(v); await d.documents.add(doc); await d.workspaces.update(workspaceId, { updatedAt: nowIso() }); });
    return { doc, version: v };
  },
  /** Adds a new version; the previous one is kept for history and rollback. */
  async addVersion(documentId: string, text: string, sourceKind: DocumentVersion['sourceKind']) {
    const d = db();
    const doc = await d.documents.get(documentId);
    if (!doc) throw new Error('Document not found');
    const prev = await d.versions.get(doc.currentVersionId);
    const n = (await d.versions.where('documentId').equals(documentId).count()) + 1;
    const label = prev?.label.match(/^v(\d+)$/) ? `v${Number(prev.label.slice(1)) + 1}` : `v${n}`;
    const v = await makeVersion(documentId, doc.workspaceId, text, label, sourceKind, doc.currentVersionId);
    await d.transaction('rw', d.documents, d.versions, async () => { await d.versions.add(v); await d.documents.update(documentId, { currentVersionId: v.id }); });
    return v;
  },
  async setCurrentVersion(documentId: string, versionId: string) { await db().documents.update(documentId, { currentVersionId: versionId }); },
  versions: (documentId: string) => db().versions.where('documentId').equals(documentId).sortBy('createdAt'),
  version: (id: string) => db().versions.get(id),
  async remove(id: string) {
    const d = db();
    await d.transaction('rw', d.documents, d.versions, async () => { await d.versions.where('documentId').equals(id).delete(); await d.documents.delete(id); });
  },
};

/** Creates (or recreates) the fictional sample workspace from fixtures. */
export async function seedSampleWorkspace(): Promise<Workspace> {
  const existing = await db().workspaces.get(SAMPLE_WORKSPACE.id);
  if (existing) return existing;
  const t = nowIso();
  const w: Workspace = { id: SAMPLE_WORKSPACE.id, title: SAMPLE_WORKSPACE.title, description: SAMPLE_WORKSPACE.description, kind: 'sample', storageMode: 'persist', createdAt: t, updatedAt: t, schemaVersion: 1 };
  await db().workspaces.add(w);
  for (const s of SAMPLE_DOCS) await documents.add(w.id, { title: s.title, role: s.role, text: s.text, sourceKind: 'fixture', approvedAt: s.approvedAt, versionLabel: s.versionLabel });
  return w;
}

export async function resetSampleWorkspace() { await workspaces.remove(SAMPLE_WORKSPACE.id); return seedSampleWorkspace(); }

/** Deletes every Mosaic record in this browser (spec F22). */
export async function deleteAllLocalData() { const d = db(); await d.delete(); await d.open(); (await import('../app/live')).clearLiveCache(); }

/** Installs bundled packs (or newer versions of them). Keeps the user's on/off choice. */
export async function ensureBundledPacks() {
  for (const p of BUNDLED_PACKS) {
    const cur = await db().packs.get(p.id);
    if (!cur || cur.version !== p.version) await db().packs.put({ ...p, cachedAt: nowIso(), enabled: cur?.enabled ?? p.id === 'core' });
  }
}
