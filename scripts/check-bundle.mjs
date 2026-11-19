// Fails if a production bundle contains anything that must never ship:
//  - test canary strings;
//  - an App Check debug token assigned in code (a UUID string set on
//    FIREBASE_APPCHECK_DEBUG_TOKEN). The SDK's own *reading* of that name is fine;
//  - the local debug token value itself, when .env.local or the env provides it.
//   node scripts/check-bundle.mjs [dir=apps/web/dist]
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] || 'apps/web/dist';
const files = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? files(p) : /\.(m?js|html|css|json|webmanifest)$/.test(f) ? [p] : []; });
let token = process.env.APPCHECK_DEBUG_TOKEN || '';
if (!token && existsSync('.env.local')) token = (readFileSync('.env.local', 'utf8').match(/^APPCHECK_DEBUG_TOKEN=(.+)$/m) || [])[1]?.trim() || '';
const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const assigned = new RegExp(`FIREBASE_APPCHECK_DEBUG_TOKEN\\s*=\\s*["'\`]${UUID}["'\`]`);
const problems = [];
for (const f of files(dir)) {
  const s = readFileSync(f, 'utf8');
  if (/CANARY-MOSAIC/.test(s)) problems.push(`${f}: contains a test canary`);
  if (assigned.test(s)) problems.push(`${f}: assigns an App Check debug token`);
  if (token && s.includes(token)) problems.push(`${f}: contains the local App Check debug token`);
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log(`Bundle check passed (${files(dir).length} files${token ? ', local debug token checked' : ''}).`);
