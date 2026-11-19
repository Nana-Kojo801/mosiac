import type { Finding, FindingCategory } from '@mosaic/schemas';
import type { DocWithVersion } from '../../app/useWorkspace';

/**
 * Disclosure map model (spec F09, 12.3). Node types: document version, generic
 * disclosure category, finding. No node represents a person. Every edge carries
 * a reason and the passage behind it.
 */
export type GNode = { id: string; kind: 'doc' | 'cat' | 'finding'; label: string; sub: string; col: 0 | 1 | 2; ref?: string; finding?: Finding; draft?: boolean };
export type GEdge = { id: string; from: string; to: string; reason: string; refs: { versionId: string; paragraph: number; quote: string }[]; hot: boolean };

export const CAT_LABEL: Record<FindingCategory, string> = { DIRECT_IDENTIFIER: 'Direct identifier', PRECISE_DATE: 'Precise date', RARE_ATTRIBUTE: 'Rare role or skill', NARROW_LOCATION: 'Narrow location', DISTINCTIVE_EVENT: 'Distinctive event', CROSS_RELEASE: 'Cross-release context', EXCESSIVE_DETAIL: 'Excessive detail', SENSITIVE_CONTEXT: 'Sensitive context' };

export function buildGraph(docs: DocWithVersion[], findings: Finding[]): { nodes: GNode[]; edges: GEdge[] } {
  const live = findings.filter((f) => f.status !== 'UNASSESSED' && f.status !== 'DISMISSED' && f.status !== 'RESOLVED' && f.anchors.some((a) => a.quote));
  const byVersion = new Map(docs.map((d) => [d.version.id, d]));
  const nodes = new Map<string, GNode>();
  const edges = new Map<string, GEdge>();
  for (const f of live) {
    const catId = `cat:${f.category}`;
    if (!nodes.has(catId)) nodes.set(catId, { id: catId, kind: 'cat', label: CAT_LABEL[f.category], sub: 'category', col: 1 });
    nodes.set(f.id, { id: f.id, kind: 'finding', label: f.title, sub: '', col: 2, finding: f });
    const hot = f.band === 'HIGH' || f.band === 'CRITICAL';
    for (const a of f.anchors) {
      const d = byVersion.get(a.versionId);
      if (!d || !a.quote) continue;
      const docId = `doc:${d.doc.id}`;
      if (!nodes.has(docId)) nodes.set(docId, { id: docId, kind: 'doc', label: d.doc.title, sub: d.doc.role === 'draft' ? `Draft ${d.version.label}` : 'Published release', col: 0, ref: d.doc.id, draft: d.doc.role === 'draft' });
      const e1 = `${docId}>${catId}`;
      const ex = edges.get(e1);
      const ref = { versionId: a.versionId, paragraph: a.paragraph, quote: a.quote };
      if (ex) { if (!ex.refs.some((r) => r.versionId === ref.versionId && r.quote === ref.quote)) ex.refs.push(ref); ex.hot ||= hot; }
      else edges.set(e1, { id: e1, from: docId, to: catId, reason: `${d.doc.title} contains ${CAT_LABEL[f.category].toLowerCase()} details.`, refs: [ref], hot });
    }
    const e2 = `${catId}>${f.id}`;
    edges.set(e2, { id: e2, from: catId, to: f.id, reason: f.rationale, refs: f.anchors.filter((a) => a.quote).map((a) => ({ versionId: a.versionId, paragraph: a.paragraph, quote: a.quote })), hot });
  }
  const order = (n: GNode) => (n.kind === 'doc' ? (n.draft ? 1 : 0) : 0);
  return { nodes: [...nodes.values()].sort((a, b) => a.col - b.col || order(a) - order(b)), edges: [...edges.values()] };
}
