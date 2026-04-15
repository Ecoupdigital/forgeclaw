# 13-02 Login Page + Proxy -- SUMMARY

**Status:** DONE
**Date:** 2026-04-15
**Commits:** 5 atomic commits (ec9bbe9..4a3bde2)

## Tasks Completed

### Task 1: POST /api/auth/login (ec9bbe9)
- Created `packages/dashboard/src/app/api/auth/login/route.ts`
- Validates token via `validateToken()` from lib/auth
- Sets httpOnly cookie `fc-token` with SameSite=Lax, 30-day expiry
- Returns 400 (missing token), 401 (invalid), 500 (not configured), or 200 (ok)

### Task 2: POST /api/auth/logout (d25a863)
- Created `packages/dashboard/src/app/api/auth/logout/route.ts`
- Clears cookie by setting Max-Age=0

### Task 3: Login Page (0896e6a)
- Created `packages/dashboard/src/app/login/page.tsx`
- Client component with password input, loading/error/disabled states
- Accessible: htmlFor+id, aria-describedby on error, role="alert", focus ring
- Design tokens from globals.css: bg-void, text-text-primary, text-text-body, text-text-secondary, text-text-disabled, bg-deep-space, bg-night-panel, bg-accent, text-destructive
- CSS class adaptations: plan used `text-text-heading` (not in theme) -> used `text-text-primary`; `text-text-muted` -> `text-text-secondary`; `bg-surface-1` -> `bg-deep-space`; `bg-surface-2` -> `bg-night-panel`

### Task 4: proxy.ts Auth Gate (9ee3322)
- Created `packages/dashboard/src/proxy.ts` (Next.js 16 convention)
- Exports `proxy` function (NOT `middleware` -- verified against node_modules/next/dist/docs)
- Redirects to /login when fc-token cookie is absent
- Allows: /login, /api/auth/*, /api/*, static assets (_next/static, _next/image, favicon, images/fonts)
- Cookie presence-only check (validity checked at API layer)

### Task 5: Login Layout (4a3bde2)
- Created `packages/dashboard/src/app/login/layout.tsx`
- Pass-through layout prevents DashboardShell from wrapping login page

## Verification

- [x] TypeScript compilation clean after each task (bunx tsc --noEmit)
- [x] All 5 files created as specified
- [x] proxy.ts uses `proxy` export (Next.js 16), not `middleware`
- [x] CSS classes adapted to existing theme tokens (no hardcoded values)
- [x] Form has all states: loading (disabled + "Authenticating..."), error (red text with role="alert"), disabled (when empty or submitting)
- [x] Accessibility: label htmlFor, aria-describedby, focus rings, keyboard nav

## Criteria Met

- [x] POST /api/auth/login valida token e seta cookie httpOnly
- [x] POST /api/auth/logout limpa cookie
- [x] Pagina /login renderiza form com input de token
- [x] Login bem-sucedido redireciona para /
- [x] Login falho mostra mensagem de erro
- [x] proxy.ts redireciona para /login quando cookie ausente
- [x] proxy.ts permite /login, /api/*, e static assets
- [x] Compilacao TypeScript limpa
