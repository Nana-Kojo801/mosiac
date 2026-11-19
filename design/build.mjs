// Builds the two self-contained design preview pages from src/.
//   node build.mjs  ->  mosaic-mobile.html, mosaic-desktop.html
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { themes, accents, glass, type, motion } from './src/tokens.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const src = (f) => readFileSync(join(root, 'src', f), 'utf8');

const decl = (obj) => Object.entries(obj).map(([k, v]) => `  --${k}: ${v};`).join('\n');

function tokenCss() {
  const light = { ...themes.light, ...accents.indigo.light };
  const dark = { ...themes.dark, ...accents.indigo.dark };
  return `/* generated from src/tokens.mjs */
:root, [data-appearance="light"] {
${decl({ ...light, ...glass, ...type, ...motion })}
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${decl(dark)}
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
${decl(dark)}
  color-scheme: dark;
}
[data-appearance="light"] {
${decl(light)}
  color-scheme: light;
}
[data-appearance="dark"] {
${decl(dark)}
  color-scheme: dark;
}
[data-appearance="light"][data-accent="teal"] {
${decl(accents.teal.light)}
}
[data-appearance="dark"][data-accent="teal"] {
${decl(accents.teal.dark)}
}
`;
}

function iconMap(sources) {
  const names = new Set();
  const dir = join(root, 'node_modules/lucide-static/icons');
  // Direct calls must name a real icon; other string literals are included
  // when they match an icon (names passed through data tables).
  const direct = /\bic\(\s*['"]([a-z0-9-]+)['"]/g;
  const literal = /['"]([a-z][a-z0-9-]+)['"]/g;
  for (const s of sources) {
    for (const m of s.matchAll(direct)) {
      if (!existsSync(join(dir, `${m[1]}.svg`))) throw new Error(`Unknown Lucide icon: ${m[1]}`);
      names.add(m[1]);
    }
    for (const m of s.matchAll(literal)) if (existsSync(join(dir, `${m[1]}.svg`))) names.add(m[1]);
  }
  const map = {};
  for (const n of [...names].sort()) {
    const p = join(dir, `${n}.svg`);
    const svg = readFileSync(p, 'utf8');
    const inner = svg.replace(/<!--[\s\S]*?-->/g, '').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    map[n] = inner.replace(/\s*\n\s*/g, '');
  }
  return map;
}

for (const name of ['mobile', 'desktop']) {
  const sharedJs = src('shared.js');
  const pageJs = src(`${name}.js`);
  const html = src(`${name}.html`);
  const icons = iconMap([sharedJs, pageJs, html]);
  const css = [tokenCss(), src('shared.css'), src(`${name}.css`)].join('\n');
  const js = [`const ICONS = ${JSON.stringify(icons)};`, sharedJs, pageJs].join('\n');
  const out = html.replace('/*@CSS*/', () => css).replace('/*@JS*/', () => js);
  writeFileSync(join(root, `mosaic-${name}.html`), out);
  console.log(`mosaic-${name}.html  ${(out.length / 1024).toFixed(1)} KB, ${Object.keys(icons).length} icons`);
}
