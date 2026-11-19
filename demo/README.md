# Mosaic demo video

A reproducible, evidence-bound pipeline for the Mosaic demonstration video (spec section 22). One command rebuilds the same cut from the same inputs. Every number on screen is read from a generated evidence file, never typed in.

## Output

- `out/mosaic-demo.mp4`: H.264, yuv420p, 1920 × 1080, 30 fps, AAC 48 kHz stereo, faststart, normalised to −14 LUFS / −1 dBTP
- `captions/mosaic-demo.en.srt` and `.vtt`, with word timings from the narration audio. The video also has karaoke captions burned in
- `claims.manifest.json`: every factual claim mapped to the file and field it comes from
- `out/qa-report.md`: the validation results
- `out/thumbnail.png`, `out/screenshots/`, `out/youtube.md`, `out/devpost.md`: the upload package

Large binaries (`out/`, `footage/`, `audio/music.wav`, `narration/cache/`) are not committed. Rebuild them with the steps below.

## Rebuild

From the repository root:

```sh
npm ci
npm run build -w apps/web                                    # production build that gets captured
(cd apps/web && node --experimental-strip-types e2e/flows.mjs) # writes demo/evidence/network-audit.json
node scripts/run-ts.mjs packages/benchmark/src/run-baseline.ts # benchmark results
node demo/capture/capture.mjs        # real app screenshots + element boxes -> demo/footage
node demo/narration/tts.mjs          # ElevenLabs narration (needs ELEVENLABS_API_KEY in .env.local; cached by script hash)
node scripts/run-ts.mjs demo/render/data.ts   # fixture and routing evidence
node demo/render/timeline.mjs        # beat-snapped scene timeline
node demo/audio/music.mjs            # original music, synthesised to the timeline
node demo/render/captions.mjs        # SRT, VTT and narration/script.md
node demo/render/claims.mjs          # claims.manifest.json
node demo/render/render.mjs          # Remotion render + loudness normalisation -> demo/out/mosaic-demo.mp4
node demo/render/package.mjs         # thumbnail, screenshots, youtube.md, devpost.md
MOSAIC_ASR_PYTHON=/path/to/venv/bin/python node demo/render/validate.mjs
```

`node demo/render/render.mjs --stills 5,40,90` renders single frames to `out/stills/` for a quick look.

The narration is cached in `narration/cache/`, keyed by a hash of each line, so a re-render spends no ElevenLabs credits unless a line changes. Without a key or cache, `tts.mjs` stops with a message. It never substitutes another voice.

## Pieces

| Path | Role |
|---|---|
| `script/scenes.mjs` | Scene order, narration and the evidence each scene needs. Numbers are read from evidence |
| `capture/capture.mjs` | Drives the production build with Playwright and records element boxes for camera moves |
| `narration/tts.mjs` | ElevenLabs text-to-speech with word timestamps |
| `render/timeline.mjs` | Lays scenes on a 122 BPM grid so cuts land on the beat |
| `audio/music.mjs` | Original music, with a drop at the title, a breakdown under the guard scene and hits on scene changes |
| `remotion/src` | The composition: animated tile background, tile-wipe transitions, kinetic type, diagrams from the routing table, app footage in a browser frame with zooms, cursor and highlights, karaoke captions, ducked music |
| `render/validate.mjs` | Release gate: duration, format, loudness, claims vs evidence, caption WER (faster-whisper), OCR scan of frames for credentials and canaries, asset licences |

## Labels on screen

- **Real app footage · production build**: screenshots captured from the app
- **Fictional illustration** or **Illustration**: conceptual animation, with fixture data where shown
- The benchmark scene says **Rules baseline only** and shows on-device runs as **Not measured yet**, because they need an eligible machine (status `IMPLEMENTED_UNVERIFIED`)

On-device inference is not shown as working anywhere in the video. It has not run on eligible hardware yet.
