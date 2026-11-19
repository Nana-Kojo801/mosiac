import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, repoRoot, '');
  return {
    envDir: repoRoot,
    plugins: [react(), tailwind(), VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Mosaic', short_name: 'Mosaic', description: 'Check how drafts and past releases combine to reveal context, with private analysis on your device.',
        theme_color: '#EEF0F5', background_color: '#EEF0F5', display: 'standalone', start_url: '/', scope: '/',
        icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }, { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
      workbox: {
        // App shell only. No runtime caching: private data lives in IndexedDB, and
        // model or App Check requests are never cached or queued (spec 5.3, 11.2).
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: '/index.html',
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
      },
    })],
    server: { port: 5173, host: '127.0.0.1', fs: { allow: [repoRoot] } },
    // Fonts always ship as files: the CSP allows fonts from 'self' only, not data: URIs.
    build: { sourcemap: false, target: 'es2022', assetsInlineLimit: (file: string) => (/\.(woff2?|ttf|otf)$/.test(file) ? false : undefined) },
    define: {
      // App Check debug token: local dev server only. Production builds get ''.
      __APPCHECK_DEBUG_TOKEN__: JSON.stringify(command === 'serve' ? env.APPCHECK_DEBUG_TOKEN || '' : ''),
    },
  };
});
