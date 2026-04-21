import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

/**
 * Dashboard vitest config.
 *
 * Tests live under `tests/**` (mirroring packages/core/tests/ and
 * packages/cli/tests/). The root vitest config at the repo root scans
 * `packages/*\/tests/**` but defaults to .ts only — this config widens to
 * include .tsx for component tests, sets environment=jsdom, and configures
 * the path alias @/* -> src/* that the dashboard uses.
 */
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
