# Decision log

Entries are newest first. Each one records what was decided, why, and who decided it.

## 2026-11-19 · Phase 0 design previews published (Gate 1 pending)

- **Status:** waiting for the owner's approval (spec 16.0, Gate 1). No application code has been written.
- **Artifacts:**
  - Mobile: https://claude.ai/artifact/FJMEwR2CK7Aodv9SDBXqsX (version 1, `1795050877-5f70`)
  - Desktop: https://claude.ai/artifact/7JrMvVo3dC5nYhtbgRUuaB (version 1, `1795050878-21a2`)
  - Source: `design/` in this repository.
- **Approval:** _not yet given_. Record the date, the approved artifact versions and any requested changes here.

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
