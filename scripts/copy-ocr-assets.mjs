// Copies the OCR engine, worker and English language data into apps/web/public/ocr
// so OCR runs entirely from our own origin (no CDN; spec 6.1).
import { copyFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'apps/web/package.json'));
const out = join(root, 'apps/web/public/ocr');
mkdirSync(out, { recursive: true });
const tjs = dirname(require.resolve('tesseract.js/package.json'));
const core = dirname(require.resolve('tesseract.js-core/package.json', { paths: [tjs] }));
const eng = dirname(require.resolve('@tesseract.js-data/eng/package.json'));
const files = [
  [join(tjs, 'dist/worker.min.js'), 'worker.min.js'],
  ...['tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js'].map((f) => [join(core, f), f]),
  [join(eng, '4.0.0_best_int/eng.traineddata.gz'), 'eng.traineddata.gz'],
];
for (const [from, name] of files) {
  const to = join(out, name);
  if (!existsSync(to) || statSync(to).size !== statSync(from).size) copyFileSync(from, to);
}
console.log(`OCR assets ready in apps/web/public/ocr (${files.length} files)`);
