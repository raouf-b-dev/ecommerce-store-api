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
    setupFiles: ['./test/vitest.setup.ts'],
    include: ['test/e2e/**/*.e2e-spec.ts'],
    testTimeout: 180000,
    hookTimeout: 180000,
    fileParallelism: false,
  },
});
