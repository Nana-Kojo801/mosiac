// Upload package (spec 22.8): thumbnail, screenshots, YouTube and Devpost text. Facts come from evidence files.
//   node render/package.mjs   (after render.mjs, which stages .render-public)
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../..', import.meta.url).pathname, demo = join(root, 'demo'), out = join(demo, 'out');
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const tl = read('demo/render/timeline.json'), track = read('demo/footage/track.json');
const bench = read('packages/benchmark/results/results.json'), m = bench.configurations.rules.metrics.findings;
const probe = read('demo/evidence/sdk-probe-no-local-model-online.json').network, audit = read('demo/evidence/network-audit.json');
const groups = read('demo/evidence/group-steps.json');
const pct = (x) => `${Math.round(x * 100)}%`;
const browserExecutable = ['/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell'].find(existsSync);

mkdirSync(join(out, 'screenshots'), { recursive: true });
const pub = join(demo, '.render-public');
if (!existsSync(pub)) throw new Error('Run render/render.mjs first (it stages .render-public).');
const serveUrl = await bundle({ entryPoint: join(demo, 'remotion/src/index.ts'), publicDir: pub });
const composition = await selectComposition({ serveUrl, id: 'Thumbnail', browserExecutable });
await renderStill({ serveUrl, composition, frame: 0, output: join(out, 'thumbnail.png'), browserExecutable });
console.log(`thumbnail.png ${(statSync(join(out, 'thumbnail.png')).size / 1e6).toFixed(2)} MB`);

for (const [id, s] of Object.entries(track.steps)) {
  const scale = s.viewport.width >= 1000 ? 'scale=1920:-2' : 'scale=780:-2';
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', join(demo, 'footage', s.file), '-vf', scale, join(out, 'screenshots', `${id}.png`)]);
}

const ch = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const CHAPTER = { hook: 'The problem in three documents', title: 'Mosaic', problem: 'Beyond redaction', hybrid: 'Hybrid AI: what runs where', review: 'Review a workspace', map: 'Disclosure map', rewrite: 'Rewrite and reassess', consent: 'Consent before any cloud call', guard: 'The private-inference guard', ocr: 'OCR for scans and photos', release: 'Approve and export', phone: 'On your phone', bench: 'Benchmark', close: 'Try it' };
const chapters = tl.scenes.filter((s) => !['title', 'phone'].includes(s.id)).map((s, i) => `${i === 0 ? '0:00' : ch(s.start)} ${CHAPTER[s.id]}`).join('\n');

writeFileSync(join(out, 'youtube.md'), `# YouTube upload

**Title:** Mosaic: catch what you never realized you were revealing (hybrid AI with Firebase AI Logic)

**Captions file:** \`demo/captions/mosaic-demo.en.vtt\` (English)

**Description:**

Mosaic checks how your next draft combines with everything you've already published. Three documents can each look anonymous and still point to one person together. Mosaic finds those combinations before you publish.

Private documents stay in your browser. Review runs on the device. The cloud (Firebase AI Logic) is used only to write generic test packs from a fixed list of categories, and only after you approve the exact request.

Try it: https://mosaic-4a9d2.web.app
Code (Apache-2.0): https://github.com/Nana-Kojo801/mosiac

Chapters
${chapters}

What's verified and what isn't
- On-device model runs (Gemini Nano in Chrome) are implemented but have not run on eligible hardware yet. Without a built-in model the app shows clearly labelled sample results, as in this video.
- Cloud test-pack generation runs through Firebase AI Logic.
- Private review made ${audit.externalRequests} external requests in our automated network audit. OCR made ${audit.ocr?.externalRequests ?? 'n/a'}.
- Found while building: with no built-in model, the SDK's on-device-only mode sent ${probe.rawSdkCanaryRequests} canary request(s) to the cloud. Mosaic's guard let ${probe.guardedPrivateCanaryRequests} through.
- Benchmark (open synthetic dataset ${bench.datasetVersion}, ${bench.cases} test cases), rules baseline only: precision ${pct(m.precision)}, recall ${pct(m.recall)}, F1 ${pct(m.f1)}.
- All app footage was captured automatically from the production build. All people and documents are fictional.

Credits
- Voice: ElevenLabs (elevenlabs.io), premade voice "Jessica"
- Music: original, generated in code for this video
- Made with Remotion

#BuildHybridAI
`);

writeFileSync(join(out, 'devpost.md'), `# Devpost listing (draft, verified facts only)

## Tagline
Catch what you never realized you were revealing.

## Inspiration
Redaction tools look for names and emails. But people are usually identified by combinations: a team, a start date and a previous workplace, each harmless alone, spread across documents published months apart. Researchers, journalists and HR teams publish in series, and nobody checks the series as a whole.

## What it does
- Imports drafts and earlier releases (text, Word, PDF, and scans or photos via on-device OCR).
- Reviews a draft against everything already published. It highlights the passages involved, with evidence from every release side by side, a risk score and the source of each result.
- Shows a disclosure map of how the draft connects to earlier releases, and how a fictional group narrows (sample: ${groups.original.map((g) => g.count).join(' → ')}).
- Suggests safer wording. After the edits in the sample the group grows to ${groups.afterEdits[groups.afterEdits.length - 1].count}.
- Generates generic stress-test packs in the cloud from enum-only requests that you approve first. It approves releases on the device and exports clean copies.

## How we built it
- React, Vite and TypeScript, as an installable PWA with local storage (IndexedDB via Dexie).
- **Firebase AI Logic** hybrid inference. A frozen routing table decides what runs where: extraction, review and rewriting are \`ONLY_ON_DEVICE\`; test-pack generation is \`ONLY_IN_CLOUD\`. The video's diagram is generated from that same table.
- Firebase App Check (reCAPTCHA v3) and Firebase Hosting.
- Deterministic privacy rules, Zod-validated contracts, and Tesseract.js OCR that runs in the browser.

## Challenges we ran into
With no built-in model, we found the SDK's \`ONLY_ON_DEVICE\` mode sent requests to the cloud (${probe.rawSdkCanaryRequests} canary request in our probe). We added a private-inference guard: a readiness check, a network fence and an echo check. In the same test ${probe.guardedPrivateCanaryRequests} private canary requests got through.

## Accomplishments
- An automated network audit: ${audit.externalRequests} external requests during a full private review, ${audit.canaryLeaks} canary leaks.
- An open synthetic benchmark (${bench.datasetVersion}, ${bench.cases} test cases). The rules baseline scores precision ${pct(m.precision)}, recall ${pct(m.recall)} and F1 ${pct(m.f1)}.
- A reproducible demo video: every on-screen number is checked against an evidence file before release.

## What's next
- Run on-device review on eligible Chrome hardware, and publish those benchmark numbers (status today: implemented, not yet verified on device).
- More test-pack domains.

## Built with
Firebase AI Logic, Gemini (cloud), Gemini Nano (Chrome built-in AI, implemented and not yet verified), Firebase App Check, Firebase Hosting, React, TypeScript, Vite, Dexie, Zod, Tesseract.js, Remotion, ElevenLabs (narration voice; elevenlabs.io).

## Links
- Live: https://mosaic-4a9d2.web.app
- Code: https://github.com/Nana-Kojo801/mosiac
- Video: (YouTube link after upload)
`);
console.log('youtube.md, devpost.md, screenshots/');
