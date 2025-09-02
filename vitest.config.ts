import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'test/', '*.config.ts', '*.config.js', 'src/cli/index.ts'],
    },
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts', 'test/**/*.test.ts', 'test/**/*.spec.ts'],
  },
});
