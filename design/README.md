# Mosaic design previews (Phase 0)

Two clickable design previews for Gate 1 (spec 16.0). They are **design previews, not the working product**. They use fictional sample data only and call no model or Firebase service.

| File | Layout | Published artifact |
|---|---|---|
| `mosaic-mobile.html` | iOS-style mobile app, Liquid Glass, light by default | https://claude.ai/artifact/FJMEwR2CK7Aodv9SDBXqsX |
| `mosaic-desktop.html` | Desktop split-pane workspace with glass chrome | https://claude.ai/artifact/7JrMvVo3dC5nYhtbgRUuaB |

Each preview has a control panel to jump between screens (all of 12.2), switch states (normal, unsupported device, offline, partial scan, empty, errors), switch light/dark, compare the two accent candidates, and turn reduced transparency and refraction on or off.

## Build

```sh
cd design
npm install
npm run build   # writes mosaic-mobile.html and mosaic-desktop.html
```

## Source

- `src/tokens.mjs`: colour, glass, type and motion tokens. After approval these move to `packages/design-tokens`.
- `src/shared.js`, `src/shared.css`: fixtures, state, chips, glass layer, refraction engine, preview controls.
- `src/mobile.*`, `src/desktop.*`: the two layouts.

Icons are Lucide (`lucide-static` 1.66.0, ISC licence), inlined at build time. The type stack is the system font first, then Inter, with JetBrains Mono for evidence and metadata. Both fallbacks are open-licensed.

The fictional group counts (100 → 24 → 8 → 1, and the recovery after edits) are computed from a seeded population of 100 toy records in `src/shared.js`. They are not typed in.
