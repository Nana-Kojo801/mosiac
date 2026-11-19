import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('.', import.meta.url).pathname;
const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f) ? [p] : []; });
const src = files(root).map((p) => ({ path: relative(root, p), code: readFileSync(p, 'utf8') }));

describe('architecture boundaries (spec 9.1, 13.3)', () => {
  it('only ai/models.ts imports firebase/ai', () => {
    expect(src.filter((f) => /from ['"]firebase\/ai['"]/.test(f.code)).map((f) => f.path)).toEqual(['ai/models.ts']);
  });
  it('only the ai module imports any firebase package', () => {
    expect(src.filter((f) => /from ['"]firebase\//.test(f.code) && !f.path.startsWith('ai/')).map((f) => f.path)).toEqual([]);
  });
  it('UI code never constructs model requests directly', () => {
    expect(src.filter((f) => !f.path.startsWith('ai/') && /\.generate\(|generateContent\(/.test(f.code)).map((f) => f.path)).toEqual([]);
  });
  it('the generic pack builder does not depend on workspace storage', () => {
    const gate = readFileSync(new URL('../../../packages/privacy-core/src/gate.ts', import.meta.url), 'utf8');
    expect(gate).not.toMatch(/storage|repositories|documents|findings/);
  });
  it('no analytics or session replay SDKs are imported', () => {
    expect(src.filter((f) => /firebase\/analytics|firebase\/performance|@sentry|logrocket|fullstory/.test(f.code)).map((f) => f.path)).toEqual([]);
  });
});
