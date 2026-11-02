import path from 'path';
import { defineConfig } from 'vitest/config';

/**
 * Kept separate from vite.config.ts so the app's build config stays free of
 * test concerns, and so `vite build` never has to parse any of this.
 *
 * `tests/` is excluded: those are Playwright specs, driven by a real browser
 * against a running server, and Vitest would try to run them as unit tests.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/lib': path.resolve(__dirname, 'src/lib'),
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['tests/**', 'node_modules/**'],
    restoreMocks: true,
    clearMocks: true,
  },
});
