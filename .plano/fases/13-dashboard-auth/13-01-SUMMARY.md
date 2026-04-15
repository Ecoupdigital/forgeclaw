# 13-01 Auth Infrastructure — SUMMARY

**Status:** DONE
**Commits:** 6 atomic commits (cfd0ce2..451505a)

## Tasks Completed

| # | Description | File | Commit |
|---|-------------|------|--------|
| 1 | Add `dashboardToken?: string` to core ForgeClawConfig | `packages/core/src/types.ts` | cfd0ce2 |
| 2 | Preserve dashboardToken in validateConfig() | `packages/core/src/config.ts` | 1a259b1 |
| 3 | Generate 32-byte hex token during install, display to user | `packages/cli/src/commands/install.ts` | 582a5cd |
| 4 | Add `dashboardToken?: string` to dashboard-side ForgeClawConfig | `packages/dashboard/src/lib/types.ts` | c193a42 |
| 5 | Add getDashboardToken() + mask token in getConfig() | `packages/dashboard/src/lib/core.ts` | 5d8bbc3 |
| 6 | Create auth.ts with validateToken() and requireApiAuth() | `packages/dashboard/src/lib/auth.ts` | 451505a |

## Verification

- All three packages compile without new TypeScript errors (`core`, `cli`, `dashboard`)
- Pre-existing errors in core (codex-cli-runner, registry) and cli (module resolution) are unrelated

## Key Decisions

- **Backward compatibility:** dashboardToken is optional everywhere. When not configured, auth is disabled (all requests pass).
- **Timing-safe comparison:** Inline XOR-based implementation instead of `crypto.timingSafeEqual` for broader Next.js runtime compatibility.
- **Token preservation on update:** Installer preserves existing token when running in update mode.
- **Dual auth sources:** requireApiAuth checks `Authorization: Bearer <token>` header first, then `fc-token` cookie.
- **Cookie max age:** 30 days.

## Artifacts Created

- `packages/dashboard/src/lib/auth.ts` (new file)
  - `validateToken()` — timing-safe token comparison
  - `requireApiAuth()` — API route auth guard (header + cookie)
  - `AUTH_COOKIE_NAME` = "fc-token"
  - `AUTH_COOKIE_MAX_AGE` = 30 days in seconds

## Artifacts Modified

- `packages/core/src/types.ts` — dashboardToken field
- `packages/core/src/config.ts` — dashboardToken preserved in validateConfig
- `packages/cli/src/commands/install.ts` — token generation + display
- `packages/dashboard/src/lib/types.ts` — dashboardToken field
- `packages/dashboard/src/lib/core.ts` — getDashboardToken() + masking
