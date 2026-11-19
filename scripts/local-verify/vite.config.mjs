import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, repoRoot, '');
  return {
    envDir: repoRoot,
    server: { port: 5199, strictPort: true, host: '127.0.0.1', fs: { allow: [repoRoot] } },
    define: {
      // The App Check debug token exists only in the local dev server. It is
      // never defined for production builds.
      __APPCHECK_DEBUG_TOKEN__: JSON.stringify(command === 'serve' ? env.APPCHECK_DEBUG_TOKEN || '' : ''),
    },
  };
});
