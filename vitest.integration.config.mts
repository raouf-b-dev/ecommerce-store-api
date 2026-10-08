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
    globalSetup: ['./test/integration/harness/vitest-integration.global-setup.ts'],
    setupFiles: [
      './test/vitest.setup.ts',
      './test/integration/harness/testcontainers.setup.ts',
    ],
    include: [
      'test/integration/**/*.integration.spec.ts',
      'src/**/*.integration.spec.ts',
    ],
    exclude: ['**/*.chaos.integration.spec.ts', 'node_modules', 'dist'],
    testTimeout: 60000,
    hookTimeout: 60000,
    fileParallelism: false,
  },
});
