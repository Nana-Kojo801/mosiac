import type { DocumentVersion, Finding } from '@mosaic/schemas';

/** Renders a version's paragraphs with evidence marks. Text is rendered as text, never as HTML. */
export function MarkedText({ version, findings, active, onSelect }: { version: DocumentVersion; findings: Finding[]; active?: string; onSelect: (id: string) => void }) {
  const marks = findings.flatMap((f) => f.anchors.filter((a) => a.versionId === version.id && a.quote).map((a) => ({ f, a }))).sort((x, y) => x.a.start - y.a.start || y.a.end - x.a.end);
  return (
    <article className="reader-d" aria-label="Document text">
      {version.paragraphs.map((p, i) => {
        const inP = marks.filter((m) => m.a.start >= p.start && m.a.end <= p.end);
        const parts: (string | { f: Finding; text: string })[] = [];
        let cur = p.start;
        for (const m of inP) { if (m.a.start < cur) continue; parts.push(version.normalizedText.slice(cur, m.a.start)); parts.push({ f: m.f, text: version.normalizedText.slice(m.a.start, m.a.end) }); cur = m.a.end; }
        parts.push(version.normalizedText.slice(cur, p.end));
        return (
          <div className="para" id={`p-${version.id}-${i}`} key={i}>
            <span className="para-anchor">¶{i + 1}</span>
            <p style={{ whiteSpace: 'pre-wrap' }}>{parts.map((x, k) => typeof x === 'string' ? x : (
              <mark key={k} className={`ev ev-${x.f.band === 'LOW' ? 'low' : x.f.band === 'MODERATE' ? 'mod' : 'high'}${active === x.f.id ? ' active' : ''}`} data-f={x.f.id} tabIndex={0} role="button" aria-label={x.f.title}
                onClick={() => onSelect(x.f.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(x.f.id); } }}>{x.text}</mark>
            ))}</p>
          </div>
        );
      })}
    </article>
  );
}
