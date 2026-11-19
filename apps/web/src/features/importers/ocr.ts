/**
 * Local OCR for scanned PDFs and images (spec F04). Tesseract runs in a worker
 * from our own origin: engine, worker and English data are bundled under /ocr.
 * Nothing is uploaded. Word confidences are kept so uncertain words can be
 * reviewed before the text is accepted.
 */
import type { Worker as TWorker } from 'tesseract.js';

export const OCR_MAX_PAGES = 50;
export const UNCERTAIN_BELOW = 70;

export type OcrWord = { text: string; confidence: number; page: number };
export type OcrPage = { text: string; confidence: number; imageUrl: string };
export type OcrResult = { text: string; pages: OcrPage[]; meanConfidence: number; uncertain: OcrWord[]; note?: string };
export type OcrProgress = { label: string; fraction: number };

/** Words worth a second look: low confidence and containing a letter or digit. Pure, unit-tested. */
export function pickUncertain(words: OcrWord[], threshold = UNCERTAIN_BELOW): OcrWord[] {
  const seen = new Set<string>();
  return words
    .filter((w) => w.confidence < threshold && /[\p{L}\p{N}]/u.test(w.text))
    .map((w) => ({ ...w, text: w.text.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''), confidence: Math.round(w.confidence) }))
    .filter((w) => w.text && !seen.has(`${w.page}:${w.text}`) && (seen.add(`${w.page}:${w.text}`), true));
}

/** Joins recognised pages into plain text with blank lines between paragraphs and pages. Pure, unit-tested. */
export function joinPages(pages: string[]): string {
  return pages.map((t) => t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()).filter(Boolean).join('\n\n');
}

const abortError = () => Object.assign(new Error('Cancelled'), { name: 'AbortError' });

async function renderPdfPages(file: File, onProgress: (p: OcrProgress) => void, signal?: AbortSignal): Promise<{ canvases: HTMLCanvasElement[]; total: number }> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), disableFontFace: true, useSystemFonts: false, enableXfa: false, useWorkerFetch: false, disableRange: true, disableStream: true, disableAutoFetch: true });
  try {
    const doc = await task.promise;
    const n = Math.min(doc.numPages, OCR_MAX_PAGES);
    const canvases: HTMLCanvasElement[] = [];
    for (let i = 1; i <= n; i++) {
      if (signal?.aborted) throw abortError();
      onProgress({ label: `Preparing page ${i} of ${n}`, fraction: (i - 1) / n * 0.1 });
      const page = await doc.getPage(i);
      const base = page.getViewport({ scale: 1 });
      // About 300 dpi for a typical page, capped to keep memory reasonable.
      const scale = Math.min(4.2, 2550 / Math.max(base.width, base.height));
      const vp = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height);
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
      canvases.push(canvas);
    }
    return { canvases, total: doc.numPages };
  } finally { await task.destroy(); }
}

const toUrl = (c: HTMLCanvasElement) => new Promise<string>((res) => c.toBlob((b) => res(b ? URL.createObjectURL(b) : ''), 'image/png'));

export async function ocrFile(file: File, kind: 'image' | 'pdf', onProgress: (p: OcrProgress) => void, signal?: AbortSignal): Promise<OcrResult> {
  const { createWorker } = await import('tesseract.js');
  let images: (HTMLCanvasElement | File)[] = [file];
  let note: string | undefined;
  if (kind === 'pdf') {
    const r = await renderPdfPages(file, onProgress, signal);
    images = r.canvases;
    if (r.total > OCR_MAX_PAGES) note = `Only the first ${OCR_MAX_PAGES} of ${r.total} pages were recognised.`;
  }
  let page = 0;
  const n = images.length;
  onProgress({ label: 'Loading the OCR engine', fraction: kind === 'pdf' ? 0.1 : 0 });
  const worker: TWorker = await createWorker('eng', 1, {
    workerPath: '/ocr/worker.min.js', corePath: '/ocr', langPath: '/ocr', workerBlobURL: false, gzip: true,
    logger: (m) => { if (m.status === 'recognizing text') onProgress({ label: `Recognising page ${page + 1} of ${n}`, fraction: (kind === 'pdf' ? 0.1 : 0) + ((page + m.progress) / n) * (kind === 'pdf' ? 0.9 : 1) }); },
  });
  const stop = () => { void worker.terminate(); };
  signal?.addEventListener('abort', stop, { once: true });
  try {
    const pages: OcrPage[] = [];
    const words: OcrWord[] = [];
    for (page = 0; page < n; page++) {
      if (signal?.aborted) throw abortError();
      const { data } = await worker.recognize(images[page], {}, { text: true, blocks: true });
      for (const b of data.blocks ?? []) for (const p of b.paragraphs) for (const l of p.lines) for (const w of l.words) words.push({ text: w.text, confidence: w.confidence, page });
      const img = images[page];
      pages.push({ text: data.text, confidence: Math.round(data.confidence), imageUrl: img instanceof File ? URL.createObjectURL(img) : await toUrl(img) });
    }
    const text = joinPages(pages.map((p) => p.text));
    const mean = pages.length ? Math.round(pages.reduce((a, p) => a + p.confidence, 0) / pages.length) : 0;
    return { text, pages, meanConfidence: mean, uncertain: pickUncertain(words), note };
  } finally {
    signal?.removeEventListener('abort', stop);
    await worker.terminate().catch(() => {});
  }
}

export const releaseOcrImages = (r: OcrResult) => r.pages.forEach((p) => p.imageUrl && URL.revokeObjectURL(p.imageUrl));
