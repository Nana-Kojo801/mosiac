# Demo video assets: licence and provenance

Every asset in `demo/out/mosaic-demo.mp4` is listed here (spec 22.3, 22.7). `render/validate.mjs` fails the build if an asset is missing from this file.

| Asset | What it is | Source | Licence / terms | Attribution |
|---|---|---|---|---|
| `audio/music.wav` | Background music, 122 BPM electronic bed (kick, clap, hats, bass, chords, arpeggio, risers) | Original. Synthesised sample by sample by `audio/music.mjs`. No samples, loops or third-party audio | Part of this repository, Apache-2.0 | None needed |
| Narration | 14 voice lines, one per scene | ElevenLabs text-to-speech, premade library voice **Jessica**, voice ID `cgSgspJ2msm6clMCkdW9` (chosen by the owner from auditions of Sarah, Jessica and Matilda), model `eleven_multilingual_v2`, generated 2026-11-19 by `narration/tts.mjs` | Owner's ElevenLabs plan: **Free** (read from the API on 2026-11-19). The Free plan is non-commercial and requires attribution. A paid plan (Starter or above) is needed for commercial use | Required on the Free plan: "Voice: ElevenLabs (elevenlabs.io)" in the YouTube description and Devpost text (included in `out/youtube.md` and `out/devpost.md`) |
| `footage/` | 22 screenshots of the real app (desktop 1920 × 1080 at 2×, phone 390 × 844 at 3×) with element boxes in `footage/track.json` | Captured by `capture/capture.mjs` (Playwright) from the production build of `apps/web`, using the fictional sample workspace | Part of this repository, Apache-2.0 | None needed |
| Fonts: Inter, Inter Display, JetBrains Mono | Typography in the composition | System fonts in the render container | SIL Open Font License 1.1 | None needed |
| Noto Color Emoji | Lock glyph in the hybrid diagram and the browser frame | System font in the render container | SIL Open Font License 1.1 | None needed |
| Diagrams, tiles, logo, captions | All motion graphics | Drawn in code in `remotion/src` from the app's design tokens and icon | Part of this repository, Apache-2.0 | None needed |
| Remotion 4.0.540 | Video framework used to render the composition | npm `remotion`, `@remotion/*` | Remotion licence: free for individuals and companies of up to 3 people; larger companies need a company licence | None needed |

No stock footage, stock music or third-party images are used. All documents, people and organisations shown are fictional (`packages/fixtures`).
