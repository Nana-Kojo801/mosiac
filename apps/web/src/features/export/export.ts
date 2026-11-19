import type { DocumentVersion, Finding, Workspace } from '@mosaic/schemas';
import type { Coverage } from '@mosaic/schemas';

/**
 * Exports (spec 6.4, F17). Every file is newly generated from the reviewed
 * plain text: no original file, hidden passages, comments, revision history or
 * source metadata is carried over.
 */
export type CleanFormat = 'TXT' | 'Markdown' | 'PDF' | 'DOCX';
export type ReportFormat = 'Markdown' | 'PDF';

export const cleanParagraphs = (v: DocumentVersion) => v.paragraphs.map((p) => v.normalizedText.slice(p.start, p.end));

const mdEscape = (s: string) => s.replace(/([\\`*_{}[\]<>#|])/g, '\\$1');

export function cleanText(v: DocumentVersion, fmt: 'TXT' | 'Markdown', title: string): string {
  const paras = cleanParagraphs(v);
  return fmt === 'TXT' ? paras.join('\n\n') + '\n' : `# ${mdEscape(title)}\n\n${paras.map(mdEscape).join('\n\n')}\n`;
}

const CATEGORY: Record<string, string> = { DIRECT_IDENTIFIER: 'Direct identifier', PRECISE_DATE: 'Precise date', RARE_ATTRIBUTE: 'Rare attribute', NARROW_LOCATION: 'Narrow location', DISTINCTIVE_EVENT: 'Distinctive event', CROSS_RELEASE: 'Cross-release context', EXCESSIVE_DETAIL: 'Excessive detail', SENSITIVE_CONTEXT: 'Sensitive context' };
const STATUS: Record<string, string> = { OPEN: 'Open', UNDER_REVIEW: 'Under review', ACCEPTED_RESIDUAL: 'Accepted residual', RESOLVED: 'Resolved', DISMISSED: 'Dismissed', UNASSESSED: 'Not assessed' };
const SOURCE: Record<string, string> = { DEVICE: 'On device', CLOUD: 'Cloud', RULES: 'Rules only', UNAVAILABLE: 'Unavailable', UNKNOWN: 'Unknown', FIXTURE: 'Sample result (authored, not model output)' };

export type ReportInput = { ws: Workspace; docTitle: string; version: DocumentVersion; releases: string[]; findings: Finding[]; coverage?: Coverage; generatedAt: string; includeQuotes: boolean };

export function reportLines(r: ReportInput): { heading?: string; text: string }[] {
  const out: { heading?: string; text: string }[] = [];
  out.push({ heading: `Review report: ${r.docTitle} ${r.version.label}`, text: `${r.ws.title}. Generated in this browser on ${new Date(r.generatedAt).toLocaleString()}.` });
  out.push({ text: 'This review is advisory. It does not certify that the document is anonymous, and it cannot account for knowledge outside this workspace.' });
  out.push({ heading: 'Compared with', text: r.releases.length ? r.releases.join('; ') : 'No published releases' });
  if (r.coverage) out.push({ heading: 'Coverage', text: `Contextual checks: ${r.coverage.contextAssessed} of ${r.coverage.paragraphsTotal} paragraphs. Rules: ${r.coverage.rulesAssessed} of ${r.coverage.paragraphsTotal}.${r.coverage.unassessedChunks.length ? ` Not assessed: ${r.coverage.unassessedChunks.map((u) => `¶${u.paragraphs[0] + 1}–${u.paragraphs[1] + 1} (${u.reason})`).join('; ')}.` : ''}` });
  out.push({ heading: `Findings (${r.findings.length})`, text: '' });
  for (const f of r.findings) {
    const where = [...new Set(f.anchors.map((a) => `¶${a.paragraph + 1}`))].join(', ');
    out.push({ text: `• ${f.title}. ${CATEGORY[f.category] ?? f.category}; priority ${f.status === 'UNASSESSED' ? 'not assessed' : `${f.score}/11`}; status ${STATUS[f.status]}; source ${SOURCE[f.source]}; at ${where || 'n/a'}.${f.statusNote ? ` Note: ${f.statusNote}` : ''}${r.includeQuotes && f.anchors[0]?.quote ? ` Evidence: “${f.anchors[0].quote}”` : ''}` });
  }
  return out;
}

export function reportMarkdown(r: ReportInput): string {
  return reportLines(r).map((l) => (l.heading ? `## ${mdEscape(l.heading)}\n\n${mdEscape(l.text)}` : mdEscape(l.text))).join('\n\n').replace(/^## /, '# ') + '\n';
}

export async function toPdf(blocks: { heading?: string; text: string }[]): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', putOnlyUsedFonts: true });
  pdf.setProperties({ title: '', subject: '', author: '', keywords: '', creator: '' });
  const margin = 56, width = pdf.internal.pageSize.getWidth() - margin * 2, bottom = pdf.internal.pageSize.getHeight() - margin;
  let y = margin;
  const write = (text: string, size: number, bold = false) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(size);
    for (const line of pdf.splitTextToSize(text, width) as string[]) { if (y + size > bottom) { pdf.addPage(); y = margin; } pdf.text(line, margin, y); y += size * 1.4; }
  };
  for (const b of blocks) { if (b.heading) { y += 6; write(b.heading, 14, true); } if (b.text) write(b.text, 11); y += 6; }
  return pdf.output('blob');
}

export async function toDocx(title: string, paragraphs: string[]): Promise<Blob> {
  const { Document, Packer, Paragraph, HeadingLevel, TextRun } = await import('docx');
  const doc = new Document({ creator: 'Mosaic', title: '', description: '', sections: [{ children: [new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(title)] }), ...paragraphs.map((p) => new Paragraph({ children: [new TextRun(p)] }))] }] });
  return Packer.toBlob(doc);
}

/** Triggers a local download. The object URL is revoked immediately after. */
export function download(name: string, data: Blob | string, type = 'text/plain;charset=utf-8') {
  const blob = typeof data === 'string' ? new Blob([data], { type }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export const safeFileName = (s: string) => (s.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'document');
