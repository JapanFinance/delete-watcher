import { defineConfig } from 'vitest/config';

// Standalone config so tests run as plain TypeScript, without the devvit build
// plugin from vite.config.ts (the pure logic under test needs no platform runtime).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
