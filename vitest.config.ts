import { defineConfig } from 'vitest/config'

/**
 * Root vitest config.
 *
 * Uses `projects` so dashboard tests (jsdom + @ alias) run alongside
 * core tests (node env) when `bun run test` is invoked at the repo root.
 *
 * NOTE: packages/cli/tests/* and packages/cli/tests/archetypes/* use
 * `bun:test` syntax (decision from 24-03/25-04). They are NOT compatible
 * with vitest and must be excluded here. Invoke them with `bun test`
 * directly from packages/cli/ when needed.
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
            'packages/bot/tests/**/*.test.{ts,tsx}',
            'ops/gate/**/*.test.ts',
          ],
          environment: 'node',
        },
      },
      'packages/dashboard',
    ],
  },
})
