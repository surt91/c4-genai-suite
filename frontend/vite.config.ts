import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';

const dirName = fileURLToPath(new URL('.', import.meta.url));

if (process.env.VITEST) {
  // Make date/number formatting in tests independent of the host (CI runs in UTC/en_US).
  // Set here so the forked test workers inherit it.
  process.env.TZ = 'UTC';
  process.env.LC_ALL = 'en_US.UTF-8';
  process.env.LANG = 'en_US.UTF-8';
}

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      src: path.resolve(dirName, './src'),
    },
  },
  test: {
    include: ['src/**/*.ui-unit.spec.*', 'src/**/*.integration.spec.*'],
    environment: 'jsdom',
    setupFiles: 'vitest.setup.ts',
    // Deterministic env for tests, independent of a local frontend/.env file.
    env: {
      VITE_SERVER_URL: 'http://localhost:5173/api-proxy',
    },
    maxConcurrency: 1,
    coverage: {
      provider: 'v8',
      exclude: [
        '**/generated/**',
        '**/dist/**',
        '**/languages/',
        '**/texts/',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '**/*.js',
        '**/*.cjs',
        '**/*.mjs',
        '**/*.config.ts',
        '**/*.d.ts',
      ],
      reporter: ['text', 'json', 'html', 'cobertura'],
    },
  },
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api-proxy': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api-proxy/, ''),
      },
    },
  },
});
