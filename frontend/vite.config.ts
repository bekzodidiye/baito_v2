import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

// The repo's declared version; frontend/package.json is still a 0.0.0 stub, so
// the root file is the source of truth.
//
// This used to be `import pkg from '../package.json'`, which resolves fine from
// a repo checkout and cannot resolve at all inside the frontend image — the
// Docker build context is `./frontend`, so there is no parent package.json.
// That broke a production deploy at the build step. Read it instead of
// importing it: take an injected APP_VERSION first (what the deploy passes),
// fall back to the root file when it is reachable, and never throw.
const appVersion = (() => {
  if (process.env.APP_VERSION) return process.env.APP_VERSION;
  for (const candidate of ['../package.json', './package.json']) {
    try {
      const {version} = JSON.parse(fs.readFileSync(path.resolve(__dirname, candidate), 'utf8'));
      if (version && version !== '0.0.0') return version;
    } catch {
      // Not reachable from this build context; try the next one.
    }
  }
  return '0.0.0';
})();

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(process.env.GOOGLE_MAPS_PLATFORM_KEY || ''),
      // The settings screen said v1.0.2 and the drawer said v1.1.0, both
      // hardcoded, neither matching package.json. One source now.
      __APP_VERSION__: JSON.stringify(appVersion)
    },
    resolve: {
      alias: {
        '@/components': path.resolve(__dirname, 'src/components'),
        '@/lib': path.resolve(__dirname, 'src/lib'),
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          autoRewrite: true,
          ws: true,
        },
      },
    },
    // `vite preview` serves the built bundle, and it does not inherit
    // server.proxy — so an end-to-end run against the real bundle had no way to
    // reach the API. The E2E suite runs against preview precisely so it
    // exercises what ships; without this it would exercise a 404.
    //
    // The port is overridable because 8000 is the port a developer's own API
    // takes, and the CI runner is that same laptop. When both were up, the
    // job's uvicorn could not bind, its health check answered from the
    // developer's process instead, and the suite logged in against a database
    // that had never heard of the seeded account:
    //
    //   POST /api/v1/auth/login -> 400 {"detail":"Telefon raqam yoki parol xato"}
    //
    // server.proxy above keeps 8000 unconditionally - that is the developer's
    // own flow and should not move.
    preview: {
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${process.env.E2E_API_PORT || 8000}`,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            query: ['@tanstack/react-query'],
            map: ['leaflet', 'react-leaflet', 'leaflet.markercluster'],
            motion: ['motion/react'],
            ui: ['lucide-react'],
            state: ['zustand']
          },
        },
      },
      chunkSizeWarningLimit: 800,
    },
  };
});
