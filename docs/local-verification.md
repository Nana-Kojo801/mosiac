# Inference verification record (spec 21.3)

Machine-readable evidence is in `demo/evidence/`. It holds no credentials, tokens or private output, and nothing in this file is typed in from memory: every value comes from those files.

## Current status

| Capability | Label (23.2) | Evidence |
|---|---|---|
| Cloud inference via Firebase AI Logic (`ONLY_IN_CLOUD`, Gemini Developer API, `gemini-3.5-flash-lite`) | `VERIFIED_CLOUD` | Both runs below: SDK reported `in_cloud` and returned valid JSON |
| `PREFER_ON_DEVICE` falls back to the cloud when no local model is available (21.2 step 6) | `VERIFIED_CLOUD` | `sdk-probe-no-local-model-online.json`, step `fixture-prefer-on-device` |
| A private task with no usable local model is refused, with zero AI requests and no cloud retry (21.2 step 7) | `VERIFIED_CLOUD` (verified in this environment) | Both runs, step `private-guarded`: 0 canary requests, 0 fence violations |
| Genuine on-device inference (21.2 steps 1–5) | `IMPLEMENTED_UNVERIFIED` | Not run yet. Needs an eligible physical machine with Google Chrome (fallback ladder step A pending) |
| Offline on-device run (21.2 step 5) | Not run | Needs the same machine |

**Fallback ladder position:** step A has not been attempted yet, because the owner hasn't confirmed an eligible machine. Until it is attempted and documented, the submission may not drop to step B.

## Runs on 2026-11-19 (Claude Code cloud container)

Environment for both runs:
- Linux x64, Playwright Chromium 157.0.8103.78, headless. Brands: Not-A.Brand, HeadlessChrome, Chromium.
- `firebase@13.2.0`, App Check debug provider (development only).
- Network online.

### Run 1: browser as provided (`sdk-probe-as-is-online.json`)

| Step | Requested | SDK `inferenceSource` | Verdict | Latency |
|---|---|---|---|---|
| private-guarded | ONLY_ON_DEVICE via guard | none (refused: `NOT_GOOGLE_CHROME`) | UNASSESSED_NO_CLOUD_RETRY | 0 ms |
| sdk-raw-only-on-device | ONLY_ON_DEVICE | `on_device` | STUB_ECHO_NOT_INFERENCE | 1005 ms |
| fixture-prefer-on-device | PREFER_ON_DEVICE | `on_device` | STUB_ECHO_NOT_INFERENCE | 1003 ms |
| generic-only-in-cloud | ONLY_IN_CLOUD | `in_cloud` | IN_CLOUD_VALID | 2535 ms |

Chromium's Prompt API is a stub. It echoes the prompt, and the SDK labels the echo `on_device`. Those results are **not** inference and are not counted as such.

### Run 2: Prompt API removed before load, so no local model (`sdk-probe-no-local-model-online.json`)

| Step | Requested | SDK `inferenceSource` | Verdict | Latency |
|---|---|---|---|---|
| private-guarded | ONLY_ON_DEVICE via guard | none (refused: `NO_PROMPT_API`) | UNASSESSED_NO_CLOUD_RETRY | 0 ms |
| sdk-raw-only-on-device | ONLY_ON_DEVICE | `in_cloud` | IN_CLOUD_VALID | 4684 ms |
| fixture-prefer-on-device | PREFER_ON_DEVICE | `in_cloud` | IN_CLOUD_VALID | 5118 ms |
| generic-only-in-cloud | ONLY_IN_CLOUD | `in_cloud` | IN_CLOUD_VALID | 8709 ms |

Network audit for run 2:
- Guarded canary: 0 requests.
- Raw-SDK canary: **1** request, answered by the cloud.

So without the Prompt API, `firebase@13.2.0` runs an `ONLY_ON_DEVICE` request in the cloud and reports `in_cloud`. Mosaic's guard prevents this for every private task (see `docs/decision-log.md`).

The latencies are single runs in a cloud container. They are not benchmark measurements.

## How each run was done

`cd scripts/local-verify && npm run verify` (run 1) and `npm run verify -- --hide-prompt-api` (run 2). See `scripts/local-verify/README.md`.

## Still to run (eligible machine, step A)

```sh
npm run verify -- --headful --chrome --profile ~/.mosaic-verify
npm run verify -- --headful --chrome --profile ~/.mosaic-verify --offline
```

To pass, the `private-guarded` step must report `ON_DEVICE_GENUINE`, and the offline run must do the same.
