# Local inference verification kit (spec 21)

Runs the spec 21.2 protocol against the real Firebase AI Logic SDK and writes a machine-readable evidence record to `demo/evidence/`. It uses fictional fixture text only and records no credentials, tokens or private output.

## Steps the page runs

1. Reads the Prompt API availability that Chrome reports.
2. Calls `initializeDeviceModel()` from a click, when the model is available or downloadable.
3. **private-guarded**: a fictional private text with a canary, sent through Mosaic's privacy guard (`packages/privacy-core`). On eligible hardware this must run `ON_DEVICE`. Anywhere else it must be refused before any request is made.
4. **sdk-raw-only-on-device**: the same kind of text sent straight to the SDK in `ONLY_ON_DEVICE` mode, with no guard. This documents the SDK's own behaviour (see `docs/decision-log.md`, 19 Nov).
5. **fixture-prefer-on-device**: a bundled synthetic fixture in `PREFER_ON_DEVICE` mode, which reports the source the SDK actually used.
6. **generic-only-in-cloud**: an enum-only test-pack request in `ONLY_IN_CLOUD` mode.

Every step gets a verdict defined by evidence:
- `ON_DEVICE_GENUINE` requires Google Chrome, the SDK reporting `on_device`, and output that is not an echo of the prompt.
- Chromium's stub Prompt API is reported as `STUB_ECHO_NOT_INFERENCE`.

## Run it

```sh
npm install                      # at the repository root
cp .env.example .env.local       # fill in the public Firebase values and a registered App Check debug token
cd scripts/local-verify
npm run verify                                   # headless Chromium (cloud and fallback evidence only)
npm run verify -- --hide-prompt-api              # local model unavailable: fallback and guard evidence
npm run verify -- --headful --chrome --profile ~/.mosaic-verify          # eligible machine with Google Chrome
npm run verify -- --headful --chrome --profile ~/.mosaic-verify --offline
```

On an eligible machine, the first run may start the model download (several GB). Chrome needs about 22 GB free on the profile drive. Send back the JSON files from `demo/evidence/`. They contain no secrets.
