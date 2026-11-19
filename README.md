# Mosaic

Protect the information you never realized you were revealing.

Mosaic is a privacy-first publication review workspace, built for the Google #BuildHybridAI 2026 hackathon. It checks how a new draft and earlier releases combine to reveal context. Private material is analysed on-device, and generic test packs are generated in the cloud through Firebase AI Logic.

## Status

**In development.** The design is approved (`design/`). The core app is partly built; `docs/decision-log.md` lists exactly what exists, what has been verified, and what has not been built. Nothing here is a claim about features beyond that list.

Live: **https://mosaic-4a9d2.web.app** (in development).

## Run locally

```sh
npm install
cp .env.example .env.local   # public Firebase config plus a registered App Check debug token
npm run dev                  # http://127.0.0.1:5173
npm test                     # unit and integration tests
npm run e2e                  # end-to-end checks against the production build
```

## Repository layout

| Path | What it is |
|---|---|
| `apps/web` | The web app (React, Vite, TypeScript, Dexie) |
| `packages/schemas` | Shared enums, data contracts and the routing table |
| `packages/privacy-core` | Rules, evidence validation, scoring, the outbound policy gate and the private-inference guard |
| `packages/fixtures` | The fictional sample workspace, seeded population and test canaries |
| `packages/design-tokens` | The approved design tokens |
| `scripts/local-verify` | The on-device inference verification kit (spec 21) |
| `design` | The approved Phase 0 design previews |
| `docs` | Decision log, setup checklist and verification record |
