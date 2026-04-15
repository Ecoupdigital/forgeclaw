# 13-03 SUMMARY: API Routes Auth + WebSocket Auth

**Status:** DONE
**Commits:** 5 atomic commits

## Tasks Completed

### Task 1: Auth guard on all 19 API routes
- Added `requireApiAuth(request)` as first action in every handler (GET, POST, PUT, DELETE, PATCH)
- 19 route files updated across config, sessions, topics, crons, harness, heartbeat, memory/*, runtimes, skills, models
- GET handlers that lacked `request` parameter were updated to `GET(request: Request)`
- `/api/auth/login` and `/api/auth/logout` remain unguarded (they ARE the auth endpoints)
- TypeScript compiles clean

### Task 2: WebSocket server token validation
- Added `validateWsToken()` helper in `packages/core/src/ws-server.ts`
- WS upgrade now requires valid token (query param `?token=` or `Authorization: Bearer` header)
- IPC endpoints `/cron/reload` and `/cron/run-now` also validate token
- `/health` remains public (no auth needed for health checks)
- When no `dashboardToken` configured, auth is skipped (backward compat)

### Task 3: IPC auth headers
- Added `getIpcAuthHeaders()` helper in `packages/dashboard/src/app/api/crons/route.ts`
- `notifyCronReload()` and `notifyCronRunNow()` now include `Authorization: Bearer` header
- Uses dynamic import of `getDashboardToken` from `@/lib/core`

### Task 4: WS token endpoint + client WebSocket auth
- Created `/api/auth/ws-token/route.ts` -- validates httpOnly cookie server-side, returns raw token
- Updated `ws-client.ts` to fetch token via `/api/auth/ws-token` before connecting
- Token passed as `?token=` query parameter in WebSocket URL
- Fallback: if token fetch fails, connects without token (will be rejected if auth enabled)

### Task 5: Logout button + 401 redirect
- Added logout button with `LogOut` icon in dashboard header (top-right)
- Calls `POST /api/auth/logout` then redirects to `/login`
- Global fetch interceptor detects 401 responses and redirects to `/login`
- Auth endpoints (`/api/auth/*`) excluded from redirect to prevent loops

## Verification

- TypeScript compiles clean for `packages/dashboard` (0 errors)
- TypeScript compiles clean for `packages/core/src/ws-server.ts` (0 new errors; pre-existing errors in other core files unrelated to this change)
- All 19 API routes import and call `requireApiAuth` (verified via grep)
- No auth routes (/api/auth/*) have the guard

## Files Modified

### packages/dashboard/src/app/api/ (19 routes)
- config/route.ts
- sessions/route.ts
- topics/route.ts
- topics/[id]/runtime/route.ts
- crons/route.ts
- crons/[id]/logs/route.ts
- harness/route.ts
- heartbeat/route.ts
- memory/route.ts
- memory/entries/route.ts
- memory/entries/[id]/route.ts
- memory/entries/[id]/restore/route.ts
- memory/daily/route.ts
- memory/retrievals/route.ts
- memory/audit/route.ts
- memory/config/route.ts
- runtimes/route.ts
- skills/route.ts
- models/route.ts

### packages/core/src/
- ws-server.ts (validateWsToken + auth on upgrade + auth on IPC)

### packages/dashboard/src/ (new/updated)
- app/api/auth/ws-token/route.ts (NEW)
- lib/ws-client.ts (WS token in URL)
- components/dashboard-shell.tsx (logout button + 401 interceptor)
