import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Nothing here may touch the network or the database. The suites that do
    // are verify:api and verify:ratelimit, which are separate on purpose so
    // this stays runnable offline and in CI.
    globals: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
