import Dexie, { type Table } from 'dexie';
import type { AnalysisRun, ConsentRecord, DisclosureEdge, DocumentRecord, DocumentVersion, Finding, InferenceEvent, ReleaseRecord, RewriteRecord, TestPack, Workspace } from '@mosaic/schemas';

/**
 * Local IndexedDB store (spec 10). Everything here is private and stays in
 * this browser. Original text never goes into URLs, analytics or logs.
 */
export type CachedPack = TestPack & { cachedAt: string; enabled: boolean };
export type Setting = { key: string; value: unknown };

export class MosaicDB extends Dexie {
  workspaces!: Table<Workspace, string>;
  documents!: Table<DocumentRecord, string>;
  versions!: Table<DocumentVersion, string>;
  runs!: Table<AnalysisRun, string>;
  findings!: Table<Finding, string>;
  edges!: Table<DisclosureEdge, string>;
  rewrites!: Table<RewriteRecord, string>;
  releases!: Table<ReleaseRecord, string>;
  packs!: Table<CachedPack, string>;
  consents!: Table<ConsentRecord, string>;
  events!: Table<InferenceEvent, string>;
  settings!: Table<Setting, string>;

  constructor(name = 'mosaic') {
    super(name);
    this.version(1).stores({
      workspaces: 'id, updatedAt, kind',
      documents: 'id, workspaceId',
      versions: 'id, documentId, workspaceId',
      runs: 'id, workspaceId, startedAt',
      findings: 'id, workspaceId, runId, status',
      edges: 'id, workspaceId, runId',
      rewrites: 'id, workspaceId',
      releases: 'id, workspaceId, documentId',
      packs: 'id',
      consents: 'id',
      events: 'id, at',
      settings: 'key',
    });
  }

  /** Tables that hold workspace-linked (private) rows, for cascading deletes. */
  get workspaceTables() { return [this.documents, this.versions, this.runs, this.findings, this.edges, this.rewrites, this.releases] as const; }
}

let instance: MosaicDB | null = null;
export const db = () => (instance ??= new MosaicDB());
export const setDbForTests = (d: MosaicDB) => { instance = d; };

/** Ask the browser not to evict our data, where supported. The answer is shown to the user, never assumed. */
export async function requestPersistence(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (!navigator.storage?.persist) return 'unsupported';
  try { return (await navigator.storage.persist()) ? 'granted' : 'denied'; } catch { return 'denied'; }
}
