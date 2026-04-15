---
reviewed_at: 2026-04-15T18:00:00Z
reviewer: up-execution-supervisor
scope: Fases 14-17 (H1-H10 gaps)
files_reviewed: 14
score: 8/10
violations_critical: 0
violations_important: 3
violations_minor: 3
---

# Code Review — Fases 14-17 (HIGH Gaps H1-H10)

**Score: 8/10**
**Decision: APPROVE with advisories**

Zero critical violations. All 10 gaps were addressed with real implementations. Code is production-quality with a few cleanup items.

---

## Per-Phase Assessment

### Fase 14 — Quick Fixes (H1+H5+H9): PASS

**H1 (mock data removal):** APIs correctly return `{ jobs: [], source: "empty" }` and `{ sessions: [], source: "empty" }` when DB is unavailable. Empty state is properly surfaced.

**H5 (Claude CLI path):** `claude-runner.ts:192` now uses `process.env.CLAUDE_CLI_PATH || 'claude'` instead of hardcoded `/root/.local/bin/claude`. Correct -- `claude` in PATH is portable.

**H9 (typing indicator):** `text.ts:165-178` sets up a 4s interval for `sendChatAction("typing")` with an immediate first call. `clearInterval` is in the correct `finally` block (line 326). Error handling inside the interval is correct (catch-and-ignore for harmless chat action failures).

### Fase 15 — Data Integrity (H2+H3+H4): PASS

**H2 (updateCronLog):** `state-store.ts:520-540` adds a proper `updateCronLog()` method with parameterized queries. `cron-engine.ts:406` uses it correctly to update the "running" log row instead of creating a second row. Output is truncated to 10K chars (line 409) -- sensible safeguard.

**H3 (session key):** `session-manager.ts:9` now returns `${chatId}:${topicId ?? 0}` consistently. DMs get `:0` suffix. This matches the key format used in `text.ts:49`.

**H4 (writeConfig protection):** `core.ts:948-958` strips any field containing `***hidden***` before writing to disk. If the field exists in the on-disk config, it preserves the original value; otherwise it deletes it. This prevents masked tokens from being persisted. Generic pattern (not just botToken) -- future-proof.

### Fase 16 — UX Improvements (H7+H8+H10): PASS

**H7 (collapsible cron output):** `cron-card.tsx:58-65,283-309` implements expand/collapse per log entry using a `Set<number>` of expanded IDs. Collapsed view shows 120-char truncated preview. The toggle button has proper `aria-label`.

**H8 (memory search + pagination):** `memory-tab.tsx:87-89` implements 300ms debounce for search. `fetchActive()` at line 96 passes offset/limit params. `loadMore` at line 170 appends results. `searchMemoryEntriesV2()` in `core.ts:550-596` uses FTS5 with proper query sanitization. The `sanitizeFtsQuery()` function strips all non-letter/non-digit chars, quotes each token, and ORs them -- this prevents FTS5 injection.

**H10 (timezone hook):** `use-timezone.ts` fetches timezone from `/api/config` once, caches in module-level variable. Uses `Intl.DateTimeFormat` with the configured IANA timezone. Fallback to `America/Sao_Paulo`. `cron-form-sheet.tsx:56-88` uses `SERVER_TZ = "Etc/UTC"` for schedule preview, then formats in `displayTz` -- correctly separates server execution time from display time.

### Fase 17 — Immediate Memory (H6): PASS

**H6 (immediate memory):** `immediate-memory.ts` has well-structured regex patterns for PT/EN triggers. `inferKind()` refines the default kind based on content keywords. `detectAndSaveImmediateMemory()` is called fire-and-forget from `text.ts:127-129` with `.catch()` -- never blocks response. Minimum content length checks (10 chars for message, 5 chars for extracted content) prevent noise.

---

## Violations

### Important (I-001): Dead mock imports in API routes

**Files:**
- `packages/dashboard/src/app/api/crons/route.ts:2`
- `packages/dashboard/src/app/api/sessions/route.ts:3-5`

**Principle:** Engineering Principle 1 (no unused imports), Principle 6 (future cost -- confusing for next developer)

**Problem:** H1 removed mock data fallbacks but left the imports:
```typescript
// crons/route.ts
import { mockCronJobs } from "@/lib/mock-data";  // UNUSED

// sessions/route.ts
import { mockSessions, mockMessages, mockTopics } from "@/lib/mock-data";  // ALL UNUSED
```

**Impact:** TypeScript compilation succeeds (imports are type-only side-effect-free), but this is dead code that contradicts the intent of H1. A future developer seeing these imports might assume mock data is still in use.

**Fix:** Remove the unused import lines.

### Important (I-002): Missing `runtime` and `model` in useCallback deps

**File:** `packages/dashboard/src/components/cron-form-sheet.tsx:253`

**Principle:** Engineering Principle 2 (correct implementation)

**Problem:** `handleSubmit` uses `runtime` (line 210/223) and `model` (line 211/224) in the request body but they are missing from the dependency array:
```typescript
}, [
  canSave, isEdit, initialJob, name, currentSchedule,
  prompt, targetTopicId, enabled, onSaved, onOpenChange,
  // runtime and model are MISSING
]);
```

**Impact:** If user changes runtime or model after the callback was first memoized (and no other dep changed), the stale values would be sent in the API request. In practice, changing `runtime` or `model` often coincides with changing another field, so this is hard to trigger -- but it is technically a bug.

**Fix:** Add `runtime` and `model` to the dependency array.

### Important (I-003): FTS search returns `null` on empty query but API returns `{ entries: [] }`

**File:** `packages/dashboard/src/app/api/memory/entries/route.ts:27-29` vs `packages/dashboard/src/lib/core.ts:562`

**Principle:** Consistency

**Problem:** `searchMemoryEntriesV2()` returns `null` when `sanitizeFtsQuery()` yields empty string (e.g., query is all punctuation like "---"). The API route treats `null` as "no results" and returns `{ entries: [], source: "empty" }`. This is functionally correct but inconsistent with other `null` returns that mean "DB unavailable". A search for "---" returns `source: "empty"` which could confuse debugging.

**Impact:** Low -- UI behavior is correct (shows "no results" message). Only affects observability.

**Fix:** In `searchMemoryEntriesV2`, return `[]` instead of `null` when query sanitizes to empty. Reserve `null` for actual DB unavailability.

### Minor (M-001): `mockData` imports still in mock-data.ts

The mock data module itself (`packages/dashboard/src/lib/mock-data.ts`) still exists and exports mock arrays. Since H1 removed all consumers in API routes, the module may still be used by test/dev tooling. Not blocking, but worth auditing whether any consumer remains.

### Minor (M-002): `confirm()` used in memory-tab.tsx

**File:** `packages/dashboard/src/components/memory-tab.tsx:217`

`confirm()` is used for reject-all confirmation. This is a browser native dialog that doesn't match the dark theme. Not a functional issue, but a polish item. A confirmation modal component would be more consistent.

### Minor (M-003): Module-level cache in use-timezone.ts

**File:** `packages/dashboard/src/hooks/use-timezone.ts:35`

`let cachedTz: string | null = null` is module-level state. In Next.js with server components and multiple renders, module-level state can behave unexpectedly between hot reloads. However, since this hook is `"use client"` only and the cache is a simple string, the risk is negligible.

---

## Security Assessment

| Check | Status |
|-------|--------|
| SQL injection in FTS5 search | SAFE -- `sanitizeFtsQuery()` strips all non-alphanumeric chars and quotes each token |
| XSS in cron output display | SAFE -- React auto-escapes, and output is in `<pre>` tag |
| Config secrets protection | SAFE -- `writeConfig()` strips any field containing `***hidden***` |
| Auth on all API routes | SAFE -- all routes call `requireApiAuth()` as first operation |
| Parameterized queries | SAFE -- all SQL uses `?` placeholders, zero string concatenation |

---

## Performance Assessment

| Check | Status |
|-------|--------|
| Search debounce | OK -- 300ms debounce via useEffect/setTimeout |
| Typing interval cleanup | OK -- clearInterval in finally block |
| Memory pagination | OK -- 50/page with "load more" |
| Cron output truncation | OK -- 10K chars max in DB, 120 chars in collapsed preview |
| FTS5 query efficiency | OK -- uses bm25 ranking with LIMIT |

---

## Summary

All 10 HIGH gaps are properly addressed. The code follows existing codebase patterns, uses parameterized queries throughout, has proper error handling, and is connected end-to-end. The three Important violations are cleanup items (dead imports, missing deps, consistency) that don't affect correctness at runtime in normal flows. The Minor violations are polish items.

**Recommendation:** Ship as-is, then address I-001 (dead imports) and I-002 (missing deps) in the next cleanup pass. I-003 is optional.
