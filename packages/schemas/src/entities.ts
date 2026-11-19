import type { ActualSource, Band, Classification, Confidence, FindingCategory, FindingStatus, InferencePolicy, ProposedAction } from './enums';
import type { TaskKind } from './routing';

/** Local data model (spec 10.1). Every workspace-linked entity is PRIVATE. */

export type Workspace = { id: string; title: string; description?: string; kind: 'sample' | 'private'; storageMode: 'persist' | 'session'; createdAt: string; updatedAt: string; schemaVersion: 1 };

export type DocumentRole = 'draft' | 'release';
export type DocumentRecord = { id: string; workspaceId: string; title: string; role: DocumentRole; classification: Classification; currentVersionId: string; createdAt: string; approvedAt?: string };

/** normalizedText offsets are UTF-16 code units of the NFC-normalized, LF-only text. */
export type DocumentVersion = { id: string; documentId: string; workspaceId: string; label: string; normalizedText: string; paragraphs: { start: number; end: number }[]; digest: string; createdAt: string; parentVersionId?: string; sourceKind: 'paste' | 'txt' | 'markdown' | 'pdf' | 'docx' | 'fixture' | 'rewrite' | 'ocr'; ocr?: OcrMeta };

/** OCR provenance: words still uncertain after the reviewer's corrections. */
export type OcrMeta = { engine: 'tesseract'; pages: number; meanConfidence: number; uncertain: { word: string; confidence: number }[] };

export type Anchor = { versionId: string; paragraph: number; start: number; end: number; quote: string; validation: 'EXACT' | 'RELOCATED' };

export type ScoreComponents = { direct: number; specificity: number; cross: number; sensitivity: number };

export type Finding = {
  id: string; runId: string; workspaceId: string; category: FindingCategory; title: string; anchors: Anchor[];
  components: ScoreComponents; score: number; band: Band; confidence: Confidence; confidenceReason: string;
  rationale: string; proposedAction: ProposedAction; suggestion?: { from: string; to: string; anchorIndex: number };
  source: ActualSource; status: FindingStatus; statusNote?: string; ruleId?: string;
};

export type Coverage = { paragraphsTotal: number; contextAssessed: number; rulesAssessed: number; unassessedChunks: { paragraphs: [number, number]; reason: string }[] };

export type AnalysisRun = { id: string; workspaceId: string; inputVersionIds: string[]; packVersions: string[]; promptVersion: string; algorithmVersion: string; startedAt: string; finishedAt?: string; status: 'running' | 'complete' | 'partial' | 'cancelled' | 'failed'; coverage: Coverage; cacheKey: string };

export type DisclosureEdge = { id: string; workspaceId: string; runId: string; fromVersionId: string; fromParagraph: number; category: FindingCategory; findingIds: string[]; reason: string };

export type RewriteRecord = { id: string; workspaceId: string; baseVersionId: string; resultingVersionId: string; findingIds: string[]; operations: { anchor: Anchor; replacement: string }[]; createdAt: string; undone?: boolean };

export type ReleaseRecord = { id: string; workspaceId: string; documentId: string; versionId: string; approvedAt: string; reviewSummary: { openFindings: number; resolved: number; coverage: Coverage }; supersedesId?: string; revokedAt?: string };

export type ConsentRecord = { id: string; payloadDigest: string; scope: 'generatePack'; mode: InferencePolicy; createdAt: string; expiresAt: string; usedAt?: string; revokedAt?: string };

/** Never holds prompts, outputs, file names, excerpts or attributes (spec 9.4). */
export type InferenceEvent = { id: string; at: string; task: TaskKind; requestedPolicy: InferencePolicy; actualSource: ActualSource; durationMs: number | null; outcome: 'ok' | 'refused' | 'unavailable' | 'timeout' | 'malformed' | 'offline' | 'quota' | 'app-check' | 'cancelled' | 'error'; detail?: string; payloadDigest?: string };
