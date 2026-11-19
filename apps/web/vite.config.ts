import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, repoRoot, '');
  return {
    envDir: repoRoot,
    plugins: [react(), tailwind()],
    server: { port: 5173, host: '127.0.0.1', fs: { allow: [repoRoot] } },
    build: { sourcemap: false, target: 'es2022' },
    define: {
      // App Check debug token: local dev server only. Production builds get ''.
      __APPCHECK_DEBUG_TOKEN__: JSON.stringify(command === 'serve' ? env.APPCHECK_DEBUG_TOKEN || '' : ''),
    },
  };
});
