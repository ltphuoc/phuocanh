import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// Integration tests run against the LOCAL Supabase stack via supabase-js. They are
// separate from the unit suite (jsdom) and from the Playwright e2e suite. Tests
// share one database and rely on the single-couple invariant, so file parallelism
// is disabled to keep them serial and deterministic.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
