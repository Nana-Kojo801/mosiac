# Decision log

Entries are newest first. Each one records what was decided, why, and who decided it.

## 2026-11-19 · Core app build, second increment

**Built**
- **Disclosure map:** generated from the latest review. Documents, generic categories and findings, with no person nodes. Each line carries its reason and passages. Includes a keyboard-operable SVG, a list alternative, and the fictional group panel for the sample.
- **Stress tests:** bundled packs (Core 1.3.0, Editorial 1.0.0) seeded locally and switchable. Cloud generation from enums only, through an approval dialog that shows the exact body and digest. Generated packs are validated and cached. Enabled pack questions are applied **locally**, in the on-device extraction prompt (prompt `extract-2026.11.19-2`).
- **Release review:** first versus latest review, coverage, remaining findings, and a three-item checklist. Approval is blocked while the review is stale, any paragraph is not assessed, or the checklist is incomplete. Approval makes the draft part of release history.
- **Release history:** imported releases, approvals and revocations, with a word diff against the current draft. The approval marker can be revoked.
- **Reports & export:** a clean draft as TXT, Markdown, PDF or DOCX, generated fresh from plain text with blank document metadata. A review report as Markdown or PDF, with quotes excluded by default.
- **Import:** PDF (pdf.js, local worker, no network, 100-page cap, scanned-PDF detection) and DOCX (Mammoth raw text) alongside TXT, Markdown and paste.
- **Benchmark** (`packages/benchmark`):
  - seeded synthetic dataset `synthetic-v1`: 48 cases, 20 dev and 28 held-out, stratified by kind;
  - kinds: direct, context, cross-release, clean, conflicting, long, OCR noise and prompt injection;
  - scorer: same document, same category, overlapping span, with cross-release scored per document set;
  - rules-baseline runner, and a browser Benchmark lab that runs the two model configurations only where the on-device model is available.
- **Offline (PWA):** precached app shell, with no runtime caching of any request. Private data stays in IndexedDB.
- **Hosting and security:** `firebase.json` with an SPA rewrite and headers (CSP, nosniff, no-referrer, Permissions-Policy, COOP).
- **Fonts and licensing:** Inter and JetBrains Mono bundled locally, so there are no external font calls. Apache-2.0 `LICENSE` and `NOTICE` added.
- **CI:** a GitHub Actions workflow runs tests, typecheck, build, a bundle scan for secrets and canaries, end-to-end checks, and the baseline.

**Verified (2026-11-19, this container)**
- 70 unit and integration tests pass. TypeScript strict passes.
- End-to-end: 26/26 on two consecutive runs against the production build. New checks cover the map (keyboard), the enum-only approval dialog (cancel sends nothing), approval gating, the history entry, export contents (edited text present, removed passages absent), DOCX export, PDF and DOCX import, service-worker control and offline navigation. A private review still makes 0 external requests.
- **Benchmark (real measurement, rules configuration only):** dataset `synthetic-v1`, held-out split of 28 cases. Precision 1.000, recall 0.444, F1 0.615 (24 TP, 0 FP, 30 FN). Clean-document false-positive rate 0. Cross-release set recall 0. Rules catch direct identifiers and day-level dates and nothing contextual, which is expected. File: `packages/benchmark/results/results.json`, copied to `demo/evidence/benchmark-results.json`. The two model configurations are recorded as **not run**.

**Dataset fixes before results were recorded (not tuning):**
- The first split lined up with the case-type rotation, so most direct-identifier cases fell into dev. It is now stratified by kind.
- A fictional US number had too few digits to be a phone number.
- The OCR-noise generator could alter the reserved domain.

The rules were not changed in response to held-out results.

**Still not built**
- The separate iOS-style mobile layout (only a responsive fallback).
- Native Android and iOS apps.
- OCR for scanned files.
- The demo video pipeline.
- Deployment (blocked on the deploy credential; the owner asked to pause the checklist).

## 2026-11-19 · Core app build, first increment

**Built**
- `packages/schemas`: closed enums, strict Zod contracts (extraction output, enum-only pack request, generated pack), local entity types, and the frozen routing table.
- `packages/privacy-core`:
  - text normalization with an offset map, and paragraph spans;
  - transparent rules (email, phone, URL, handle, long ID number, day-level date);
  - evidence validation (exact, re-anchored or rejected; anchors are never invented);
  - rubric scoring and bands, chunking;
  - the outbound policy gate (private tasks pinned to ONLY_ON_DEVICE, taint propagation, enum-only request builder, approval bound to a payload digest with a 5-minute expiry);
  - generated-pack validation and the private-inference guard.
- `packages/fixtures`: the fictional sample, authored sample results, the seeded population (100 → 24 → 8 → 1 computed; 7 and 21 after edits), and test canaries.
- `apps/web` (React 19, Vite 8, TypeScript strict, Dexie):
  - local storage with cascading deletes;
  - an AI gateway that is the only path to Firebase, with `ai/models.ts` the only importer of `firebase/ai`;
  - a metadata-only inference journal;
  - the review engine: rules, guarded on-device extraction, deterministic cross-release linking, carry-forward of reviewer decisions, and a reassessment diff;
  - versioned rewrites with undo, and manual edits.
- Screens: landing, device setup, workspaces, overview, import, document review, findings, rewrite studio, inference journal, settings.

**Verified (2026-11-19, this container)**
- 64 unit and integration tests pass. TypeScript strict passes.
- 13/13 end-to-end checks pass against the production build (`npm run e2e`): the sample workflow, plus a private workspace with canaries.
- Private review without a usable model makes **0 external requests**: Firebase and App Check load only when private analysis can actually run.
- The App Check debug token and the canaries are absent from the production bundle.

**Decisions**
- The app's component styles are ported directly from the approved design previews (`apps/web/src/ui/design.css`) on top of the generated token CSS, with Tailwind available for layout. This keeps the approved look exact.
- The sample workspace shows authored sample results (source `FIXTURE`, labelled "Sample result") only when no on-device model is available. Private workspaces are never given fixture results; their contextual checks are left not assessed.
- Each applied edit creates its own version (two edits give v4 then v5). The rewrite studio diffs the original against the current version, word by word.
- Cross-release links are category-level hypotheses: the same family of detail (role or skill, timing, place, sensitive context) or related wording with light stemming. Each link carries its reason, and none is an identity match.

**Not built yet (do not claim)**
- Disclosure map, stress-test pack screen and cloud generation UI (the gateway path exists and is tested), release review and history, reports and export, benchmark lab, PDF/DOCX import, OCR.
- The separate iOS-style mobile layout. There is only a responsive fallback so far.
- Offline/PWA, Hosting deploy, CI.

## 2026-11-19 · Owner decision: keep the reCAPTCHA v3 key

The owner chose not to rotate or replace the v3 key whose secret appeared in the chat. App Check stays on reCAPTCHA v3 with site key `6Ld6eicuAAAAANoeFdKgOSzKw45cyM9xZeOrmwab`. The reCAPTCHA Enterprise recommendation is withdrawn. The risk was explained and the owner accepted it. The `localhost` domain warning still applies to this key.

## 2026-11-19 · First real SDK results (debug token registered by owner)

- **Cloud path verified.** `ONLY_IN_CLOUD` through Firebase AI Logic with the Gemini Developer API (`gemini-3.5-flash-lite`) returned valid JSON with `inferenceSource: in_cloud`. App Check works with the debug provider.
- **21.2 step 6 passed:** with no local model, `PREFER_ON_DEVICE` on a bundled fixture ran in the cloud and the SDK reported `in_cloud`.
- **21.2 step 7 passed in this environment:** guarded private tasks were refused with 0 AI requests in both runs.
- **The SDK finding is now confirmed end to end:** with no Prompt API, a raw `ONLY_ON_DEVICE` call was answered by the cloud. Details are in `docs/local-verification.md`.
- Genuine on-device inference is still `IMPLEMENTED_UNVERIFIED` until step A runs on an eligible machine.

## 2026-11-19 · SDK finding: ONLY_ON_DEVICE requests go to the cloud when the Prompt API is absent

**What we observed** (container, headless Chromium 157, `firebase@13.2.0` / `@firebase/ai@3.0.0`, evidence `demo/evidence/sdk-probe-no-local-model-online.json`): with the browser's `LanguageModel` global absent, a `generateContent()` call on a model created with `InferenceMode.ONLY_ON_DEVICE` sent a `POST …/models/gemini-3.5-flash-lite:generateContent` request carrying the fictional private canary text. App Check rejected it only because the debug token was not yet registered; with a valid token it would have been answered by the cloud.

**Cause (source read):** `chromeAdapterFactory()` returns `undefined` when `window.LanguageModel` is missing, and `callCloudOrDevice()` routes every request to the cloud when there is no adapter, without checking the mode. The same code is in `@firebase/ai@3.1.0` (`firebase@13.4.0`, the latest release). This affects every browser without the Prompt API: Firefox, Safari, mobile Chrome, older Chrome.

**Second finding:** Chromium (not Google Chrome) exposes a stub Prompt API that answers "On-device model is not available in Chromium, this API is just echoing back the input". The SDK labels that result `inferenceSource: "on_device"`. SDK metadata alone is therefore not proof of on-device inference.

**Decisions**
- Private tasks never rely on the SDK mode flag alone. They go through `packages/privacy-core/src/private-inference-guard.ts`, which:
  1. refuses unless Google Chrome reports the model as `available`;
  2. fences the page's `fetch` so that requests to Gemini/Firebase AI endpoints are rejected while a private task runs;
  3. accepts a result only if it is labelled `on_device` and is not an echo.
  Failure means `UNASSESSED`, with no cloud retry. The guard is covered by 15 unit tests. The verification kit shows 0 guarded-canary requests next to 1 raw-SDK canary request.
- Evidence verdicts (spec 23.2) require Google Chrome, `on_device` metadata, and non-echo output before anything is labelled `VERIFIED_LOCAL`.
- Generic cloud requests are serialized behind private tasks so that the fence never blocks a legitimate request.
- Reporting this upstream to firebase/firebase-js-sdk is the owner's decision; nothing has been filed.

## 2026-11-19 · Tooling

- npm workspaces at the root (`packages/*`, `apps/*`, `scripts/local-verify`, `design`). `.npmrc` sets `legacy-peer-deps=true`: npm 10.9's arborist crashes ("reading 'edgesOut'") resolving vitest 5.1.0's optional `@vitest/browser-playwright` peer.
- Pinned: `typescript@5.9.3`, `vitest@5.1.0` (2 Nov 2026), `firebase@13.2.0`, `vite@8.3.5`.
- Playwright: the kit uses a project-local Playwright if one is installed, otherwise the global one (this container ships its own Chromium build).

## 2026-11-19 · Official rules and current Firebase docs checked (spec 23.4)

Sources read on 2026-11-19: the official rules (firebasehybridaihackathon.devpost.com/rules), the overview and resources pages, the Firebase AI Logic hybrid web guides (last updated 2026-11-18), the AI Logic App Check guide, and the App Check reCAPTCHA v3 and Enterprise provider pages.

**Rules: answers to 23.4**
- **Synthetic (text-to-speech) narration and programmatically composed video:** the rules don't prohibit either. Video requirements: no more than 3 minutes (only the first 3 are evaluated), public on YouTube, in English or with English subtitles, and showing footage of the project working on its platform(s). It must not show third-party advertising, logos or trademarks that suggest sponsorship or endorsement, so the video uses the product's own UI and diagrams and no vendor logos. Status: **allowed as far as the rules state**. Still to do: a short confirmation question in Discord `#hackathon-help`.
- **Automated capture and a verification kit instead of a person recording:** not addressed by the rules. The requirement is that the project "must function as depicted in the video", which the evidence-bound pipeline (22.9) supports.
- **Assets, music and ElevenLabs:** a submission must be the entrant's original work, solely owned, and must not violate third-party rights; third-party tools must be used under their terms. **Decision:** narration is used only under an ElevenLabs plan whose terms grant commercial use without a conflicting attribution or ownership condition. The owner confirms the plan before the final render. Music must be original or CC0, recorded in `demo/ASSETS.md`.
- **Categories:** pick at least one platform (Web/Chrome, Android, iOS); multi-platform is preferred; organisers may reassign. Web/Chrome is primary; Android and iOS only if verified on real devices (13.4).
- **Repository:** must be public, open source with a licence detectable on the repo page (Apache-2.0 preferred), contain everything needed to run, and show Firebase AI Logic imported and actually called at runtime.
- **Disclosure:** AI coding assistants are allowed. Any other pre-existing code must be disclosed, and the entry must include a summary of what was built during the period. Judging may use automated AI-driven analysis.
- **Deadline:** 30 Nov 2026, 2:00 PM PT (22:00 UTC / Ghana). This matches spec 1.1.
- **App Check:** the rules say "debug tokens are accepted in submissions". **Decision:** we keep the stricter spec rule (no debug token in any public build) and use a production attestation provider for the hosted app. Recorded as a deliberate difference.

**Firebase docs (current behaviour that differs from the spec or the checklist)**
- App Check has been **enforced automatically for AI Logic in all projects since 2 Nov 2026**. Local and container runs therefore need a registered debug token.
- Firebase warns **not to add `localhost` to reCAPTCHA allowed domains**. The first checklist told the owner to add it; corrected.
- Firebase recommends **reCAPTCHA Enterprise** for new integrations, and it works without billing. **Decision:** switch from v3 to Enterprise, which also removes the reCAPTCHA secret key from our setup entirely.
- The default cloud model for hybrid is `gemini-3.5-flash-lite` (JS SDK 13.0.0+), which matches spec 7.3. We set it explicitly in `inCloudParams`. Gemini 2.5 models are deprecated.
- Hybrid on web: Chrome desktop 139+, SDK 12.5.0+; single-turn only, with structured output supported on device. Every response carries `inferenceSource` (`on_device` / `in_cloud`). `initializeDeviceModel()` must run after a user gesture. The documented on-device token limit is 9,216.
- Pinned versions: `firebase@13.2.0` (released 2 Nov 2026) and `vite@8.3.5`.

## 2026-11-19 · reCAPTCHA v3 secret key exposed in chat

The owner pasted the v3 **secret** key into the conversation. It was not written to any file or commit. **Action:** delete that v3 key in the reCAPTCHA admin console and switch to reCAPTCHA Enterprise (entry above), which has no secret key. The v3 site key in `.env.local` is temporary.

## 2026-11-19 · Gate 1 approved: indigo accent

- **Decision:** the owner approved both design previews and chose the **indigo** accent (teal rejected).
- **Approved versions:** mobile https://claude.ai/artifact/FJMEwR2CK7Aodv9SDBXqsX version 1 (`1795050877-5f70`); desktop https://claude.ai/artifact/7JrMvVo3dC5nYhtbgRUuaB version 1 (`1795050878-21a2`). Source at commit `7d6a43a`.
- **Follow-up:** tokens extracted to `packages/design-tokens` with the indigo accent only. The approved previews are now the visual source of truth; later deviations get logged here.
- **Next:** Gate 2 setup checklist sent (`docs/setup-checklist.md`). The build starts once the owner supplies the inputs.

### Defaults chosen for Gate 2 (owner may override)

- Cloud provider: Gemini Developer API through Firebase AI Logic, on the no-cost Spark plan. No billing.
- App Check web provider: reCAPTCHA v3 at first; **superseded the same day by reCAPTCHA Enterprise** (see the rules and docs entry above).
- Deploy: GitHub Actions to Firebase Hosting, with the service-account key held only as a GitHub secret.
- ElevenLabs key: held by the session's network proxy, never written to files or chat.

## 2026-11-19 · Phase 0 design previews published (Gate 1 pending)

- **Status:** approved (see the entry above).
- **Artifacts:**
  - Mobile: https://claude.ai/artifact/FJMEwR2CK7Aodv9SDBXqsX (version 1, `1795050877-5f70`)
  - Desktop: https://claude.ai/artifact/7JrMvVo3dC5nYhtbgRUuaB (version 1, `1795050878-21a2`)
  - Source: `design/` in this repository.

### Proposed defaults in the previews (for the owner to confirm or change)

| Topic | Proposal | Notes |
|---|---|---|
| Accent | Indigo `#3346D3` (light) / `#8E9BFF` (dark) | Teal `#0E7667` / `#5FD3BE` is the alternative and can be compared live in both previews. |
| Neutrals | Cool grey ground `#EEF0F5`, white reading surfaces | Dark mode is a separate palette, not an inversion. |
| Risk colours | Amber for "Needs review", orange-red for "High priority", red for critical | Always paired with an icon and text. No "Safe" label anywhere. |
| Source colours | Teal-green "On device", blue "Cloud", grey "Rules only", violet "Not assessed" | Kept separate from the accent. |
| Type | System font stack, then Inter, then platform sans; JetBrains Mono for evidence and metadata | No SF fonts bundled. The product will bundle the open fallbacks instead of calling Google Fonts. |
| Icons | Lucide 1.66.0 | ISC licence. |
| Brand mark | 3 × 3 tesserae, one accent tile | Original. The same tile motif is used in the fictional group-size illustration. |
| Glass | CSS blur + saturation + tint + inner rim + specular edge; optional SVG edge refraction on small chrome (tab bar, toolbar, round buttons) in Chromium only | Reduced transparency, `prefers-reduced-transparency` and `prefers-contrast: more` all fall back to opaque surfaces with the same layout. |
| Sample workspace | "Night Shift Study", Larkspur Health Network (fictional): two approved releases and one draft transcript | Fictional throughout; contact details use `example.org`. |
| Mobile platform copy | Refers to Apple's on-device model (iOS) and Gemini Nano (Android) through Firebase AI Logic | Native platforms are claimed only after real-device verification (13.4, 21.5). |

### Open items before the build (not resolved by Phase 0)

- Read the current official rules and record the answers required by spec 23.4: synthetic narration, programmatic video, automated capture, asset licensing, category selection.
- Gate 2 setup checklist (16.0) follows design approval.
