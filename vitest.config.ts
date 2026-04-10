import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'server/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/lib/yaml-utils.ts', 'server/routes/cluster.ts', 'server/routes/history.ts'],
      all: true,
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 35,
        statements: 75
      }
    }
  }
});
