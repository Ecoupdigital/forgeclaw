---
reviewed_at: 2026-04-15
chief: up-chief-engineer
phases: 18, 19, 20
scope: M1-M10 MEDIUM gaps
decision: REQUEST_CHANGES
---

# Coherence Review -- Fases 18-20 (MEDIUM Gaps M1-M10)

## Score: 82/100

Execution was solid overall: patterns are consistent across 4 packages, v1/v2
memory boundary is clean, and the async buildArgs migration is safe. Two issues
require action before this batch can be considered fully coherent.

---

## Cross-Fase Analysis

### 1. Daily Dir Resolution (M1) -- MOSTLY CONSISTENT, 1 BUG

Six locations resolve daily dir with the same logic:
`env var > config.vaultPath + '05-pessoal/daily-log' > ~/.forgeclaw/memory/daily`

| Location | Pattern | Status |
|----------|---------|--------|
| bot/index.ts (startup) | inline, sync after config | OK |
| core/memory-manager.ts | constructor + setDailyDir() | OK |
| dashboard/lib/core.ts | async resolveDailyDir() | OK |
| core/memory/writer.ts | async resolveDailyDir() | OK |
| core/memory/janitor.ts | async resolveDailyDir() | OK |
| core/context-builder.ts | inline in buildStatLine() | BUG |

**BUG (context-builder.ts:78):** Variable shadowing causes runtime TDZ error.

```typescript
// line 73-78 of context-builder.ts
const dailyDir = process.env.FORGECLAW_DAILY_LOG_DIR
  ?? (this.config.vaultPath
    ? path.join(...)    // <-- references `path` (import)
    : path.join(...));  // <-- references `path` (import)
const today = this.isoDate(new Date());
const path = `${dailyDir}/${today}.md`;  // <-- shadows import path
```

`const path` on line 78 shadows `import path from 'node:path'` on line 2.
JavaScript `const` is block-scoped and hoisted -- `path.join()` on lines 75-76
hits a TDZ ReferenceError because `path` is already bound to the later `const`
but not yet initialized.

The function is inside try/catch so it fails silently, returning a degraded stat
line (no daily log count). This means the agent never sees memory stats in its
context window.

**Fix:** Rename the local variable to `dailyPath` or `filePath`.

**Consistency note:** writer.ts, janitor.ts, and dashboard/core.ts all extract
`resolveDailyDir()` as a standalone async function. context-builder.ts does it
inline. Consider extracting to a shared util to prevent future drift.

### 2. Memory v1/v2 Boundary (M2) -- CLEAN

| Check | Status |
|-------|--------|
| v1 startCompileCron() NOT called in bot/index.ts | OK |
| v1 stopCompileCron() NOT called in shutdown | OK |
| v1 methods marked @deprecated (3 of 3) | OK |
| v2 startCrons() called after initializeAll() | OK |
| v1 addEntry() still used for event logging | OK (documented) |
| v2 shutdownAll() in graceful shutdown | OK |

No overlap. v1 singleton remains as a thin append-only logger. v2 owns all
scheduled processing. Clean separation.

### 3. skipPermissions (M3) -- SAFE, WHITELIST GAP

| Check | Status |
|-------|--------|
| Field in ForgeClawConfig type | OK |
| Parsed in validateConfig() with default true | OK |
| buildArgs() reads config async, respects field | OK |
| buildArgs() is private, only called internally | OK |
| Callers of ClaudeRunner unaffected by async change | OK |

**Whitelist gap:** `skipPermissions` is NOT in the dashboard
`VALID_CONFIG_FIELDS` Set (route.ts line 29-47). Currently non-blocking because
the dashboard UI does not expose a toggle for this field. But if one is added
later, PUT will reject it with 400.

### 4. Config Whitelist (M4) -- 1 FIELD MISSING

`VALID_CONFIG_FIELDS` has 17 entries. `ForgeClawConfig` type has 18 fields.

| Field | In Type | In Whitelist | In validateConfig |
|-------|---------|-------------|-------------------|
| botToken | Y | Y | Y |
| allowedUsers | Y | Y | Y |
| allowedGroups | Y | Y | Y |
| workingDir | Y | Y | Y |
| vaultPath | Y | Y | Y |
| voiceProvider | Y | Y | Y |
| claudeModel | Y | Y | Y |
| maxConcurrentSessions | Y | Y | Y |
| defaultRuntime | Y | Y | Y |
| runtimes | Y | Y | Y |
| writerRuntime | Y | Y | Y |
| writerModel | Y | Y | Y |
| showRuntimeBadge | Y | Y | Y |
| memoryReviewMode | Y | Y | Y |
| memoryAutoApproveThreshold | Y | Y | Y |
| dashboardToken | Y | Y | Y |
| timezone | Y | Y | Y |
| **skipPermissions** | **Y** | **N** | **Y** |

**Fix:** Add `'skipPermissions'` to the `VALID_CONFIG_FIELDS` Set.

### 5. Editable Users (M9) -- FUNCTIONAL

The save path works: config-tab.tsx calls `updateField('allowedUsers', ids)` ->
PUT /api/config -> whitelist check passes (allowedUsers IS whitelisted) ->
writeConfig merges with existing -> disk write. Anti-lockout protection
prevents removing the last user.

### 6. Photo Handler (M7) -- CLEAN

Moved from /tmp/ to projectDir/.forgeclaw-uploads/. Cleanup in finally block.
Relative paths in prompt. No cross-phase issues.

### 7. CLI Export (M5) -- CLEAN

Self-contained command. Uses @clack/prompts consistent with install.ts. No
cross-package dependencies beyond the file system paths.

### 8. Error Classification (M10) -- CLEAN

classifyClaudeError() in text.ts handles 7 error categories. Messages in
Portuguese. No changes to ClaudeRunner error flow -- classification is at the
bot layer only.

---

## Issues Requiring Action

### Issue 1: context-builder.ts Variable Shadowing (BLOCKING)
**Type:** bug (regression from M1 refactor)
**Severity:** HIGH -- agent loses memory stats in every session
**File:** `packages/core/src/context-builder.ts:78`
**Fix:** Rename `const path` to `const filePath`
**Effort:** 1 line change

### Issue 2: skipPermissions Missing from Dashboard Whitelist (NON-BLOCKING)
**Type:** inconsistency
**Severity:** LOW -- no UI toggle exists yet, but whitelist will reject the
field if one is added
**File:** `packages/dashboard/src/app/api/config/route.ts:29-47`
**Fix:** Add `'skipPermissions'` to `VALID_CONFIG_FIELDS`
**Effort:** 1 line change

---

## Technical Debt

- Debt new (this batch): 1 item (duplicated resolveDailyDir pattern -- 4
  copies of the same function across writer, janitor, dashboard, plus 2 inline
  versions in context-builder and bot/index.ts)
- Debt total: not tracked in previous reviews for this scope
- Rework cycles: 0

## Naming Consistency

- camelCase throughout: OK
- Config field names match between type, validator, and whitelist (minus the
  1 gap above): OK
- Import aliases consistent: OK

## Verdict

**REQUEST_CHANGES** -- 2 fixes needed before APPROVE:

1. **MUST:** Fix variable shadowing in context-builder.ts (runtime bug)
2. **SHOULD:** Add skipPermissions to dashboard whitelist (coherence)

After these 2 changes, this batch is APPROVE-ready with no further review cycle
needed.
