import { defineConfig } from 'vitest/config'

/**
 * Root vitest config.
 *
 * Uses `projects` so dashboard tests (jsdom + @ alias) run alongside
 * core/cli tests (node env) when `bun run test` is invoked at the repo root.
 * Each project inherits its own config file.
 */
export default defineConfig({
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          include: [
            'packages/core/tests/**/*.test.{ts,tsx}',
            'packages/cli/tests/**/*.test.{ts,tsx}',
            'packages/bot/tests/**/*.test.{ts,tsx}',
          ],
          environment: 'node',
        },
      },
      'packages/dashboard',
    ],
  },
})
