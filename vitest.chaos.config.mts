import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    environment: 'node',
    globalSetup: ['./test/integration/redis/vitest-chaos.global-setup.ts'],
    setupFiles: ['./test/vitest.setup.ts'],
    include: ['test/integration/redis/**/*.chaos.integration.spec.ts'],
    testTimeout: 120000,
    hookTimeout: 120000,
    fileParallelism: false,
  },
});
