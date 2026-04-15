# 18-02 SUMMARY: Deprecate v1 Memory Cron + Friendly Error Messages

**Status:** DONE
**Date:** 2026-04-15

## Changes

### Task 1: Remove v1 compile cron from bot startup/shutdown
- Removed `memoryManager.startCompileCron()` from startup (was line 216)
- Removed `memoryManager.stopCompileCron()` from shutdown handler
- Added deprecation comment explaining v2 handles daily log processing
- `memoryManager` singleton stays imported and active for `addEntry()`/`getDailyLog()`

### Task 2: Mark v1 methods as @deprecated
- `startCompileCron()` -- @deprecated
- `stopCompileCron()` -- @deprecated
- `compileDaily()` -- @deprecated
- All 3 methods kept for backward compatibility, not removed

### Task 3: Friendly error messages for Telegram
- Added `classifyClaudeError()` function in `packages/bot/src/handlers/text.ts`
- Detects 7 error categories:
  - Auth (not authenticated, unauthorized, 401, invalid api key)
  - Rate limit (rate limit, 429, too many requests, overloaded)
  - CLI not found (ENOENT, command not found)
  - Context window (context window, context_length, too long)
  - Session expired (no conversation found, session not found)
  - Network (ECONNREFUSED, ETIMEDOUT, fetch failed)
  - Generic CLI failure (exited with code N)
- Unknown errors truncated to 200 chars
- All messages in Portuguese

### Task 4: Catch block audit (no changes)
- Confirmed handleInterrupt does not expose raw errors
- Confirmed clearInterval is properly scoped in finally
- Confirmed safeEditText handles HTML parse failures with plain text fallback

### Task 5: Integration verification
- memoryManager.addEntry() still active on lines 298, 320 (event listeners)
- memoryManagerV2.startCrons() still called on line 243
- No startCompileCron/stopCompileCron calls in bot/index.ts
- Pipeline: addEntry() -> daily log -> v2 writer (hourly) -> v2 janitor (02:55 UTC)

## Verification
- `grep 'startCompileCron\|stopCompileCron' packages/bot/src/index.ts` returns 0 results
- 3 @deprecated annotations confirmed in memory-manager.ts
