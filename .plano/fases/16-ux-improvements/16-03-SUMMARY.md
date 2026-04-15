# 16-03 Config-Driven Timezone - SUMMARY

**Status:** COMPLETED
**Requirement:** HIG-H10
**Date:** 2026-04-15

## What was done

All 7 auto tasks executed. Checkpoint task 8 skipped per instructions.

### Task 1 - ForgeClawConfig.timezone field (core/types.ts)
Added `timezone?: string` field with JSDoc to `ForgeClawConfig` interface.
Commit: `feat(core): add timezone field to ForgeClawConfig`

### Task 2 - validateConfig timezone default (core/config.ts)
Added timezone validation with default `'America/Sao_Paulo'` for backward compatibility.
Commit: `feat(core): validate timezone in config with default America/Sao_Paulo`

### Task 3 - Dashboard type mirror (dashboard/lib/types.ts)
Added `timezone?: string` to dashboard's `ForgeClawConfig` interface.
Commit: `feat(dashboard): add timezone field to ForgeClawConfig mirror type`

### Task 4 - useTimezone hook (dashboard/hooks/use-timezone.ts)
Created new hook that fetches timezone from `/api/config`, caches in module-level variable.
Exposes `formatTime(ms)` using `Intl.DateTimeFormat` for DST-correct display.
Exported `formatInTz(ms, tz)` utility for direct use.
Commit: `feat(dashboard): add useTimezone hook with DST-correct formatting`

### Task 5 - memory-tab.tsx migration
Removed buggy `brtTime()` function (manual UTC-3 subtraction, broken during DST).
Added `useTimezone` hook, replaced all 3 `brtTime()` calls with `formatTime()`.
Commit: `fix(dashboard): replace buggy brtTime with config-driven timezone`

### Task 6 - cron-form-sheet.tsx migration
Removed `DISPLAY_TZ`, `BROWSER_TZ`, `displayFormatter` constants and `formatInDisplayTz` function.
Added `useTimezone` hook, updated `validateSchedule` to accept timezone parameter.
Updated JSX to show configured timezone with optional browser TZ comparison.
Commit: `refactor(dashboard): replace hardcoded DISPLAY_TZ with config-driven timezone`

### Task 7 - cron-card.tsx migration
Removed standalone `formatTimestamp` function (no explicit timezone, locale-dependent).
Added `useTimezone` hook, replaced both timestamp displays with `formatTime()`.
Commit: `refactor(dashboard): use config timezone in cron-card timestamps`

## Verification

- TypeScript: dashboard compiles with zero errors (`tsc --noEmit`)
- No hardcoded `America/Sao_Paulo` or `BRT` references remain in dashboard components
- No `brtTime`, `DISPLAY_TZ`, `BROWSER_TZ`, `displayFormatter`, or `formatTimestamp` remnants
- Backward compatible: configs without `timezone` field default to `America/Sao_Paulo`

## Files changed

- `packages/core/src/types.ts` - Added timezone field
- `packages/core/src/config.ts` - Added timezone validation with default
- `packages/dashboard/src/lib/types.ts` - Added timezone field to mirror type
- `packages/dashboard/src/hooks/use-timezone.ts` - NEW: useTimezone hook
- `packages/dashboard/src/components/memory-tab.tsx` - Removed brtTime, uses hook
- `packages/dashboard/src/components/cron-form-sheet.tsx` - Removed hardcoded TZ, uses hook
- `packages/dashboard/src/components/cron-card.tsx` - Removed formatTimestamp, uses hook
