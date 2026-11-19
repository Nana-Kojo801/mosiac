// Writes the approved tokens as CSS custom properties.
//   node build-css.mjs <out.css>
// Light is the default. Dark applies with [data-theme="dark"], or with the
// system preference when the app is set to follow the system (no data-theme).
import { writeFileSync } from 'node:fs';
import { themes, accent, glass, type, motion } from './tokens.mjs';

const decl = (o, pad = '  ') => Object.entries(o).map(([k, v]) => `${pad}--${k}: ${v};`).join('\n');
const light = { ...themes.light, ...accent.light };
const dark = { ...themes.dark, ...accent.dark };
const css = `/* Generated from packages/design-tokens/tokens.mjs. Do not edit. */
:root {
${decl({ ...light, ...glass, ...type, ...motion })}
  color-scheme: light;
}
:root[data-theme="dark"] {
${decl(dark)}
  color-scheme: dark;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
${decl(dark, '    ')}
    color-scheme: dark;
  }
}
`;
const out = process.argv[2];
if (!out) { process.stdout.write(css); } else { writeFileSync(out, css); }
