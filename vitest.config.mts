import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

const emptyModule = fileURLToPath(new URL('./tests/unit/support/empty-module.ts', import.meta.url));

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    // The RSC/client bundling guards have no build step under the jsdom unit
    // runtime, so alias them to an empty module to let server modules be imported.
    alias: {
      'client-only': emptyModule,
      'server-only': emptyModule,
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
  },
});
