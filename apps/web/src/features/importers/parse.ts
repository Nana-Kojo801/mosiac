/**
 * Local document parsers (spec 6.1). Everything runs in the browser with
 * bundled code: no remote fetches, no macros, no scripts, no HTML rendering.
 * Limits: 20 MB per file, 100 pages per PDF.
 */
export const MAX_BYTES = 20 * 1024 * 1024;
export const MAX_PAGES = 100;

export type Parsed = { ok: true; text: string; kind: 'txt' | 'markdown' | 'pdf' | 'docx'; pages?: number; note?: string } | { ok: false; error: string } | { ok: 'needs-ocr'; kind: 'pdf' | 'image'; reason: string };

export async function parseFile(f: File, onProgress?: (msg: string) => void, signal?: AbortSignal): Promise<Parsed> {
  const name = f.name.toLowerCase();
  if (f.size > MAX_BYTES) return { ok: false, error: 'Larger than 20 MB. Split the file or paste the part you need.' };
  try {
    if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.markdown') || f.type === 'text/plain' || f.type === 'text/markdown') {
      const text = await f.text();
      if (text.includes('\u0000')) return { ok: false, error: 'This doesn’t look like a text file.' };
      return { ok: true, text, kind: name.endsWith('.txt') ? 'txt' : 'markdown' };
    }
    if (name.endsWith('.pdf') || f.type === 'application/pdf') return await parsePdf(await f.arrayBuffer(), onProgress, signal);
    if (name.endsWith('.docx')) return await parseDocx(await f.arrayBuffer());
    if (/\.(png|jpe?g|webp|bmp|gif)$/.test(name) || /^image\/(png|jpeg|webp|bmp|gif)$/.test(f.type)) return { ok: 'needs-ocr', kind: 'image', reason: 'Image' };
    if (name.endsWith('.doc') || name.endsWith('.docm')) return { ok: false, error: 'Old or macro-enabled Word files aren’t supported. Save as .docx (without macros) and try again.' };
    return { ok: false, error: 'Not supported. Use TXT, Markdown, PDF, DOCX or an image (PNG, JPEG), or paste the text.' };
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return { ok: false, error: 'Cancelled' };
    return { ok: false, error: 'The file couldn’t be read. It may be damaged or password-protected.' };
  }
}

async function parsePdf(buf: ArrayBuffer, onProgress?: (msg: string) => void, signal?: AbortSignal): Promise<Parsed> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  // No network: worker fetches, range and stream loading are off; fonts are not loaded; XFA forms are ignored.
  const task = pdfjs.getDocument({ data: new Uint8Array(buf), disableFontFace: true, useSystemFonts: false, enableXfa: false, stopAtErrors: false, useWorkerFetch: false, disableRange: true, disableStream: true, disableAutoFetch: true });
  const doc = await task.promise;
  try {
    const pages = Math.min(doc.numPages, MAX_PAGES);
    const out: string[] = [];
    let empty = 0;
    for (let i = 1; i <= pages; i++) {
      if (signal?.aborted) throw Object.assign(new Error('Cancelled'), { name: 'AbortError' });
      onProgress?.(`Reading page ${i} of ${pages}`);
      const page = await doc.getPage(i);
      const tc = await page.getTextContent();
      let line = '', lastY: number | null = null;
      const lines: string[] = [];
      for (const it of tc.items as { str: string; transform: number[]; hasEOL?: boolean }[]) {
        const y = it.transform[5];
        if (lastY !== null && Math.abs(y - lastY) > 2) { lines.push(line); line = ''; }
        line += it.str; if (it.hasEOL) { lines.push(line); line = ''; }
        lastY = y;
      }
      if (line) lines.push(line);
      const pageText = lines.map((l) => l.trim()).join('\n').replace(/\n{2,}/g, '\n\n').trim();
      if (!pageText) empty++;
      out.push(pageText);
    }
    const text = out.filter(Boolean).join('\n\n');
    if (!text.trim()) return { ok: 'needs-ocr', kind: 'pdf', reason: 'No text layer: this looks like a scanned PDF' };
    const notes = [doc.numPages > MAX_PAGES ? `Only the first ${MAX_PAGES} of ${doc.numPages} pages were read.` : '', empty ? `${empty} page${empty > 1 ? 's' : ''} had no text layer and ${empty > 1 ? 'were' : 'was'} skipped.` : ''].filter(Boolean).join(' ');
    return { ok: true, text, kind: 'pdf', pages: doc.numPages, note: notes || undefined };
  } finally { await task.destroy(); }
}

async function parseDocx(buf: ArrayBuffer): Promise<Parsed> {
  // Raw text only: no images, no embedded objects, no external resources.
  type Mammoth = { extractRawText?: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>; default?: Mammoth };
  const mod = (await import('mammoth/mammoth.browser.js')) as Mammoth;
  const extract = mod.extractRawText ?? mod.default?.extractRawText;
  if (!extract) return { ok: false, error: 'The DOCX reader failed to load.' };
  const { value } = await extract({ arrayBuffer: buf });
  const text = value.replace(/\n{3,}/g, '\n\n').trim();
  if (!text) return { ok: false, error: 'The document has no text.' };
  return { ok: true, text, kind: 'docx', note: 'Text only. Comments, tracked changes, images and metadata were not imported.' };
}
