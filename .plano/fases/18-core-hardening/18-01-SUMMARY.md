# 18-01 SUMMARY: Config-Aware Daily Dir + skipPermissions + Bun Version Check

**Status:** DONE
**Date:** 2026-04-15

## Changes

### Task 1: skipPermissions field on ForgeClawConfig
- Added `skipPermissions?: boolean` to `ForgeClawConfig` in `packages/core/src/types.ts`
- JSDoc documents SECURITY implications

### Task 2: Parse skipPermissions in validateConfig
- `packages/core/src/config.ts` now parses `skipPermissions` with default `true`

### Task 3: Configurable --dangerously-skip-permissions
- `packages/core/src/claude-runner.ts` reads config at runtime
- `buildArgs()` is now async, only adds the flag when `config.skipPermissions !== false`
- Fallback to true when config unavailable (tests, early startup)

### Task 4: Config-aware daily dir resolution in 5 files
- `packages/core/src/memory-manager.ts` — constructor defaults to env > ~/.forgeclaw/memory/daily; added `setDailyDir()` method
- `packages/core/src/context-builder.ts` — uses `this.config.vaultPath` with path.join + homedir fallback
- `packages/core/src/memory/janitor.ts` — async `resolveDailyDir()` replaces `DEFAULT_DAILY_DIR` const
- `packages/core/src/memory/writer.ts` — async `resolveDailyDir()` replaces `DEFAULT_DAILY_DIR` const
- `packages/dashboard/src/lib/core.ts` — async `resolveDailyDir()` replaces `DAILY_DIR` const; updated `readDailyLog` and `listDailyLogs`

### Task 5: Bot startup configures memoryManager dailyDir
- `packages/bot/src/index.ts` — after `getConfig()`, resolves dailyDir and calls `memoryManager.setDailyDir()`

### Task 6: Bun version check in installer
- `packages/cli/src/commands/install.ts` — checks `bun --version` >= 1.1.0, warns if below minimum
- Added `compareSemver()` helper function

### Task 7: Final verification
- Zero occurrences of `/home/vault/05-pessoal/daily-log` in source files
- Pre-existing TS errors in codex-cli-runner.ts and registry.ts (unrelated) confirmed unchanged

## Verification
- `grep -rn '/home/vault/05-pessoal/daily-log' packages/ --include='*.ts'` returns 0 results (source only)
- All changes are backward compatible (defaults match previous behavior)
