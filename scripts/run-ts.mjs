// Runs a TypeScript module from the workspace through Vite's module loader, so
// workspace packages with extensionless imports resolve as they do in the app.
//   node scripts/run-ts.mjs packages/benchmark/src/run-baseline.ts
import { createServer } from 'vite';
import { resolve } from 'node:path';

const file = process.argv[2];
if (!file) { console.error('Usage: node scripts/run-ts.mjs <file.ts>'); process.exit(2); }
const server = await createServer({ configFile: false, logLevel: 'error', server: { middlewareMode: true, hmr: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
try { await server.ssrLoadModule(resolve(file)); } finally { await server.close(); }
