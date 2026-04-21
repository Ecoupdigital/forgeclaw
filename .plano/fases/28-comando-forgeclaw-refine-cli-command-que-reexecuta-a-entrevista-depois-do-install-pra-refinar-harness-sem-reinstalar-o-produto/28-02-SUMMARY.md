---
phase: 28-comando-forgeclaw-refine
plan: 28-02
subsystem: cli+dashboard/refine
tags: [cli, dashboard, refine, next-js, harness, auto-login, sentinel]
dependency-graph:
  requires:
    - 28-01   # forgeclaw refine CLI command + 5 modes
    - 27-01   # sentinel onboarded + /onboarding scaffold
    - 27-02   # /api/onboarding/* routes + session store patterns
    - 27-03   # InterviewerChat + HarnessPreview + OnboardingLayout + BudgetBar components
    - 25-02   # dashboardToken in forgeclaw.config.json
    - 13-XX   # auth middleware / proxy + /api/auth/login route
  provides:
    - refine-dashboard util (isDashboardRunning/openDashboardRefine/waitForCompletion/readDashboardToken)
    - CLI dashboard delegation with --terminal fallback flag
    - @forgeclaw/core harness-backup module (createBackup/listBackups/restoreBackup)
    - /api/refine/session (POST create, GET state, cancel subroute)
    - /api/refine/message (POST answer)
    - /api/refine/apply (backup + applyDiff + compileHarness + sentinel)
    - /api/refine/rollback (GET list, POST restore + sentinel)
    - /refine page with reused InterviewerChat/HarnessPreview/BudgetBar
    - /refine/bootstrap auto-login entry for CLI handoff
    - /refine/done and /refine/cancelled terminal pages
  affects:
    - packages/dashboard/src/proxy.ts (CLI handoff gate + /refine/bootstrap whitelist)
    - packages/cli/src/commands/refine.ts (dashboard detection + runViaDashboard)
    - packages/cli/src/utils/refine-backup.ts (reduced to re-export from core)
    - packages/cli/src/index.ts (--terminal flag + help)
tech-stack:
  added: []
  patterns:
    - "Sentinel-based CLI<->dashboard coordination (~/.forgeclaw/.refining-done JSON atomic tmp+rename)"
    - "dashboardToken query-param auto-login via /refine/bootstrap (client-side fetch to /api/auth/login so Set-Cookie persists)"
    - "Proxy bootstrap gate is path-scoped (/refine + /onboarding only) — ?token= never becomes a wide auth vector"
    - "DTO shape parity with onboarding lets us reuse InterviewerChat/HarnessPreview/BudgetBar via identity adapter (no forking)"
    - "Section-mode diff filter applied in store (filterDiffForSection) — same semantic as CLI refine-section, both on applyDiff and previewDiff paths"
    - "Refine session store indexed by random sessionId, 5 concurrent max + 30min idle prune"
    - "Sentinel written in ALL terminal outcomes (applied/cancelled/error) — CLI poller never hangs"
key-files:
  created:
    - packages/cli/src/utils/refine-dashboard.ts (224 lines)
    - packages/core/src/harness-backup.ts (234 lines — moved from cli)
    - packages/dashboard/src/lib/refine-types.ts (130 lines)
    - packages/dashboard/src/lib/refine-sentinel.ts (52 lines)
    - packages/dashboard/src/lib/refine-sessions.ts (355 lines)
    - packages/dashboard/src/app/api/refine/session/route.ts (160 lines)
    - packages/dashboard/src/app/api/refine/message/route.ts (110 lines)
    - packages/dashboard/src/app/api/refine/apply/route.ts (105 lines)
    - packages/dashboard/src/app/api/refine/rollback/route.ts (135 lines)
    - packages/dashboard/src/app/api/refine/session/cancel/route.ts (65 lines)
    - packages/dashboard/src/app/refine/page.tsx (70 lines)
    - packages/dashboard/src/app/refine/layout.tsx (20 lines)
    - packages/dashboard/src/app/refine/bootstrap/page.tsx (92 lines)
    - packages/dashboard/src/app/refine/done/page.tsx (60 lines)
    - packages/dashboard/src/app/refine/cancelled/page.tsx (40 lines)
    - packages/dashboard/src/components/refine/RefineApp.tsx (140 lines)
    - packages/dashboard/src/components/refine/RefineActionsBar.tsx (130 lines)
    - packages/dashboard/src/hooks/use-refine.ts (210 lines)
  modified:
    - packages/cli/src/commands/refine.ts (runViaDashboard + entrypoint dispatch)
    - packages/cli/src/index.ts (--terminal flag + help)
    - packages/cli/src/utils/refine-backup.ts (reduced to re-export)
    - packages/core/src/index.ts (barrel export of harness-backup)
    - packages/dashboard/src/proxy.ts (CLI handoff gate)
decisions:
  - "Task 5 (core refactor) executed BEFORE Tasks 3/4 so dashboard routes could import createBackup/listBackups/restoreBackup from @forgeclaw/core without pulling a CLI->dashboard dep"
  - "DTO parity: RefineSessionSnapshot mirrors OnboardingSessionSnapshot so RefineApp can reuse InterviewerChat/HarnessPreview/BudgetBar via an identity adapter rather than duplicating or forking components"
  - "Regra 3 — Proxy CLI handoff: unauthenticated ?token= requests on /refine and /onboarding redirect to /refine/bootstrap which exchanges the token for an fc-token cookie client-side. Required because `forgeclaw refine` cannot assume the user has logged in to the dashboard before; explicit path-scope prevents widening the auth surface"
  - "Section-mode filtering done at buildSnapshot + runRefineApply (both feed applyDiff/previewDiff with the pre-filtered diff). Guarantees UI preview + applied-to-disk state agree, mirroring the CLI refine-section semantic established in 28-01"
  - "Sentinel written on every terminal path (applied/cancelled/error) even when the session was already gone at cancel time. CLI is blocked on the sentinel and exits based on status — any code path that skips the sentinel would leave the CLI poller hanging 30min until timeout"
  - "Backup is created BEFORE applyDiff in runRefineApply. Matches CLI behavior (28-01) — user always has a rollback available even if the diff has zero ops"
  - "Multiple concurrent refine sessions allowed (MAX_ACTIVE=5) unlike single-session onboarding. Users may open two browser tabs by accident; we avoid surprising them with 409"
  - "Rollback endpoint writes 'applied' sentinel with the restored backup id — treat restore as a retroactive apply for the CLI contract"
  - "Routes validate body.sessionId explicitly (not from cookie) so multi-tab / multi-window / automation cases stay deterministic"
  - "CLI waitForCompletion treats malformed sentinel JSON as error + unlink (avoids spin loop on bad sentinel); treats timeout as error so callers exit 1 cleanly"
  - "--rollback stays terminal-only: single select over backup list is faster in TUI than an extra round-trip to the dashboard"
  - "Archetype resolution in POST /session: mode=archetype REQUIRES archetype in body; other modes reuse forgeclaw.config.json archetype or fallback to body archetype if provided. Returns 409 NO_ARCHETYPE if nothing resolves — avoids starting an interview with no template context"
metrics:
  duration_seconds: 858
  completed_date: "2026-04-21"
  tasks_completed: 6
  files_created: 18
  files_modified: 5
  tests_added: 0
  tests_passed: 91
---

# Fase 28 Plano 02: Integracao com Dashboard `/refine` (reusa Fase 27) Summary

Dashboard agora e a UX primaria do `forgeclaw refine`. Quando o dashboard esta rodando, o CLI detecta via probe em `/api/onboarding/health`, le `dashboardToken` do config, abre `http://localhost:4040/refine?mode=X&archetype=Y&section=Z&token=...` no browser, e fica bloqueado num spinner ate a rota de API escrever um sentinel em `~/.forgeclaw/.refining-done` com `{status, backupId, error}`. `--terminal` forca o fluxo antigo. `--rollback` sempre e terminal. A pagina `/refine` reutiliza `InterviewerChat` + `HarnessPreview` + `BudgetBar` + `OnboardingLayout` da Fase 27 atraves de um adapter de identidade — DTOs `RefineSessionSnapshot` e `OnboardingSessionSnapshot` foram projetados com shape identica pra permitir isso sem duplicacao de componentes.

## One-liner

CLI `forgeclaw refine` detecta dashboard via fetch timeout + delega a experiencia pra `/refine` pelo browser, bloqueando em spinner ate sentinel `~/.forgeclaw/.refining-done` ser escrito pelas rotas `/api/refine/apply|rollback|session/cancel`; pagina `/refine` reusa `InterviewerChat`/`HarnessPreview`/`BudgetBar` da Fase 27 via DTO-parity adapter; `/refine/bootstrap` auto-login troca `?token=` por cookie `fc-token`; refactor moveu `createBackup/listBackups/restoreBackup` pra `@forgeclaw/core/harness-backup.ts` eliminando duplicacao CLI<->dashboard.

## Arquivos Entregues

### Novos (18)

**CLI (1):**
- `packages/cli/src/utils/refine-dashboard.ts` — `isDashboardRunning()` probe `/api/onboarding/health` + fallback `GET /` com `AbortSignal.timeout(1500)`, `openDashboardRefine()` constroi URL com `URLSearchParams` + spawn `xdg-open`/`open`/`cmd /c start` (fire-and-forget), `waitForCompletion()` polla sentinel a cada 2s ate 30min com guard de JSON malformado (unlink + return error em vez de spin), `readDashboardToken()` le campo do config.

**Core (1):**
- `packages/core/src/harness-backup.ts` — implementacao compartilhada (copiada verbatim de `packages/cli/src/utils/refine-backup.ts` da 28-01). Exportado no barrel `packages/core/src/index.ts`.

**Dashboard lib (3):**
- `packages/dashboard/src/lib/refine-types.ts` — 7 DTOs: `RefineSessionSnapshot`, `RefineMessageDTO`, `RefineHarnessFileDTO`, `RefineDiffSummary`, `RefineBudgetDTO`, `RefineApiError` (8 codes), bodies/responses de cada endpoint. Shape proposital identico aos DTOs do onboarding.
- `packages/dashboard/src/lib/refine-sentinel.ts` — `writeRefineSentinel({status, backupId?, error?, timestamp?})` atomico (`tmp + renameSync`), exporta `REFINE_SENTINEL_PATH`.
- `packages/dashboard/src/lib/refine-sessions.ts` — `RefineSessionStore` singleton (HMR-safe via `Symbol.for`), max 5 sessoes concorrentes + prune automatico >30min, `buildSnapshot` roda `filterDiffForSection` antes de `previewDiff`, handlers: `runRefineStart` (cria Interviewer + dispara `start()`), `runRefineAnswer` (loop), `runRefineApply` (createBackup -> filter -> applyDiff -> compileHarness -> destroy), `runRefineCancel` (abort + destroy, sem tocar disco).

**Dashboard API routes (5):**
- `packages/dashboard/src/app/api/refine/session/route.ts` — POST cria sessao validando mode/archetype/section contra whitelists; `mode='archetype'` exige archetype no body, outros modes caem pra `forgeclaw.config.json` ou retornam 409 `NO_ARCHETYPE`. GET `?sessionId=` retorna snapshot ou 404.
- `packages/dashboard/src/app/api/refine/message/route.ts` — POST answer, text max 4000 chars, exige status=asking, rejeita status=done com 409 `NOT_DONE`.
- `packages/dashboard/src/app/api/refine/apply/route.ts` — POST aplica diff via `runRefineApply`, escreve sentinel em TODOS os paths (sucesso, erro de backup, erro de applyDiff).
- `packages/dashboard/src/app/api/refine/rollback/route.ts` — GET lista `RefineBackupDTO[]` ordenado desc. POST valida `backupId` existe (404 `NOT_FOUND`), chama `restoreBackup`, best-effort `compileHarness`, escreve sentinel `applied + restoredId`.
- `packages/dashboard/src/app/api/refine/session/cancel/route.ts` — POST idempotente: escreve sentinel `cancelled` mesmo quando sessao ja foi removida (CLI poller e o que importa).

**Dashboard UI (6):**
- `packages/dashboard/src/app/refine/page.tsx` — client component, parse + valida query params (mode/archetype/section), wrap `RefineApp` em `<Suspense>` (pra `useSearchParams`).
- `packages/dashboard/src/app/refine/layout.tsx` — full-viewport shell (sem `DashboardShell`).
- `packages/dashboard/src/app/refine/bootstrap/page.tsx` — auto-login: le `?token=` + `?next=`, POST `/api/auth/login`, redirect pra `next`. Client-side pra Set-Cookie persistir antes da navigation.
- `packages/dashboard/src/app/refine/done/page.tsx` — tela de sucesso com `backupId` opcional.
- `packages/dashboard/src/app/refine/cancelled/page.tsx` — tela de cancelamento.
- `packages/dashboard/src/components/refine/RefineApp.tsx` — usa `useRefine` hook + `adaptSnapshot()` (identity cast, os DTOs tem mesma shape) + `OnboardingLayout`/`InterviewerChat`/`HarnessPreview`/`BudgetBar` da Fase 27 + header com pilula de mode + `RefineActionsBar`.
- `packages/dashboard/src/components/refine/RefineActionsBar.tsx` — 2 botoes (cancelar/aprovar) com `Dialog` shadcn pra confirmar, references a `~/.forgeclaw/harness/` e `forgeclaw refine --rollback`.

**Dashboard hook (1):**
- `packages/dashboard/src/hooks/use-refine.ts` — `sessionIdRef` local (multi-session), optimistic append em `sendMessage` (marca status=thinking), `approve()` redirect pra `/refine/done?backupId=`, `cancel()` hits `/session/cancel` + redirect `/refine/cancelled`, poll `/session` cada 8s enquanto status=thinking.

### Modificados (5)

- `packages/cli/src/commands/refine.ts` — `RefineOptions.terminal?`, `refine()` entrypoint probe dashboard ANTES do switch de modes, nova fn `runViaDashboard(options, token)` monta mode string + `openDashboardRefine` + spinner + `waitForCompletion` + switch em status={applied,cancelled,error}. Rollback e terminal-only (early return antes do probe).
- `packages/cli/src/index.ts` — `parseRefineFlags` aceita `--terminal`, help atualizado com nota "Opens dashboard /refine when available, falls back to terminal." + exemplo `forgeclaw refine --terminal`.
- `packages/cli/src/utils/refine-backup.ts` — reduzido de 231 linhas a 16 linhas de re-export `@forgeclaw/core`.
- `packages/core/src/index.ts` — `export * from './harness-backup'` adicionado ao barrel.
- `packages/dashboard/src/proxy.ts` — 2 mudancas: (a) Gate 1 whitelist `/refine/bootstrap` como publico; (b) Gate 3 sem cookie: se `?token=` presente E path comeca com `/refine` ou `/onboarding`, redireciona pra `/refine/bootstrap?token=X&next=ORIGINAL_PATH_MINUS_TOKEN`.

## Tarefas Executadas

| # | Tarefa | Commit | Status |
|---|--------|--------|--------|
| 1 | `refine-dashboard.ts` util | `274b793` | typecheck limpo |
| 5 | Refactor core/harness-backup.ts (antecipada) | `86da0af` | 7/7 testes backup pass |
| 2 | `refine.ts` CLI delega + `--terminal` flag | `08ede94` | 91/91 testes, help ok |
| 3 | `/api/refine/session` + store + `/message` | `f69262c` | typecheck limpo |
| 4 | `/api/refine/apply` + `/rollback` + `/cancel` | `d23649e` | typecheck limpo |
| 6 | `/refine` page + `bootstrap` + `done` + `cancelled` + proxy gate | `f8ddf5b` | typecheck limpo, runtime probe ok |

**Ordem de execucao:** 1 -> 5 -> 2 -> 3 -> 4 -> 6. Task 5 antecipada porque tasks 3/4 importam `createBackup/listBackups/restoreBackup` de `@forgeclaw/core` — fazer na ordem do plano teria forcado rework ou dependencia circular cli-dashboard.

## Criterios Atendidos

- [x] `forgeclaw refine` (sem --terminal, dashboard up) abre `http://localhost:4040/refine` no navegador e CLI fica em spinner aguardando sentinel
- [x] `forgeclaw refine --terminal` usa fluxo terminal mesmo com dashboard rodando (early gate antes do probe)
- [x] `forgeclaw refine` com dashboard DOWN cai em fallback terminal silenciosamente (try/catch em `isDashboardRunning`)
- [x] `forgeclaw refine` dashboard up MAS sem dashboardToken emite warning e usa terminal
- [x] Rota `/refine` renderiza `InterviewerChat` (Fase 27) + `HarnessPreview` (Fase 27) + `BudgetBar` (Fase 27) side-by-side via `OnboardingLayout` (Fase 27)
- [x] Query params (`?mode`, `?archetype`, `?section`) respeitados na bootstrap da sessao, validados contra whitelists, fallback pra `'default'` em mode invalido
- [x] POST `/api/refine/apply` cria backup ANTES, aplica diff, recompila `CLAUDE.md`, escreve sentinel `status=applied + backupId`
- [x] POST `/api/refine/session/cancel` escreve sentinel `status=cancelled` (mesmo se sessao ja foi removida — idempotente)
- [x] CLI detecta sentinel via poll 2s, printa resultado (`applied`: log.success + backup id; `cancelled`: log.warn; `error`: log.error + exit 1), remove sentinel
- [x] GET `/api/refine/rollback` lista backups `{id, createdAtIso, sizeBytes, fileCount}` ordenados mais-recentes-primeiro
- [x] POST `/api/refine/rollback` valida `backupId` existe (404 `NOT_FOUND`), chama `restoreBackup` (que cria `pre-restore-<id>` interno), recompila, escreve sentinel
- [x] Sem auth cookie fc-token (e sem `?token=` no /refine|/onboarding), todas rotas `/api/*` retornam 401 via `requireApiAuth`
- [x] `createBackup/listBackups/restoreBackup` consolidados em `@forgeclaw/core` com CLI e dashboard importando do mesmo modulo
- [x] Sessoes/memoria/DB nao sao tocados quando refine aplica mudancas (mesma garantia da 28-01 — `runRefineApply` so escreve em `~/.forgeclaw/harness/` + `~/.forgeclaw/harness-backups/`)
- [x] `bunx tsc --noEmit -p packages/cli` — zero novos erros (8 pre-existentes continuam)
- [x] `bunx tsc --noEmit -p packages/dashboard` — zero novos erros (4 pre-existentes continuam)
- [x] `bun test packages/cli/tests/` — 91/91 verdes em 10.3s
- [x] `bun run audit:personal:ci` — PASS, 0 critical findings

## Verificacao Funcional Runtime

Dashboard dev server em `http://localhost:4040`:

- `GET /refine` sem cookie, sem token: HTTP 307 com `location: /login` (comportamento correto — proxy Gate 3 redireciona)
- `GET /refine?token=X` sem cookie: HTTP 307 com `location: /refine/bootstrap?token=X&next=/refine` (bootstrap gate funcionando)
- `GET /refine/bootstrap?token=X&next=/refine`: HTTP 200 (page publica, client-side render)
- `forgeclaw --help` mostra `refine` com `--terminal` + novo exemplo `forgeclaw refine --terminal`
- `bun test packages/cli/tests/` 91/91 ok

**Limitacao conhecida:** teste end-to-end completo (`curl POST /api/refine/session` com cookie valido + verificar runtime do Interviewer) nao foi possivel no dev server porque `bun:sqlite` nao resolve no Turbopack dev (bug preexistente documentado em STATE.md linhas 117, 147 — `next build` webpack funciona, dev server turbopack nao). `next build` compila com sucesso (`Compiled successfully in 3.4s`).

## Desvios do Plano

### Issues Auto-corrigidos

**1. [Regra 3 - Bloqueante] Proxy precisava de gate de auto-login via `?token=`**
- **Encontrado durante:** Tarefa 6, apos criar `/refine/page.tsx`
- **Issue:** O plano assume que `/refine?token=X` seta o cookie automaticamente, mas o proxy existente (da Fase 13) redireciona qualquer request sem cookie `fc-token` pra `/login` ANTES da pagina carregar. Resultado: CLI abre browser, user vai pra `/login`, tem que copiar dashboardToken do config manualmente — quebra a UX de "abre browser e continua".
- **Correcao:**
  - Adicionei gate no `proxy.ts` que, quando request chega sem cookie MAS com `?token=` no query string E path comeca com `/refine` ou `/onboarding`, redireciona pra `/refine/bootstrap?token=X&next=ORIGINAL_PATH`.
  - `/refine/bootstrap/page.tsx` e client-side: faz POST `/api/auth/login {token}` (que seta cookie via `Set-Cookie` header), depois `window.location.replace(next)` pra carregar a pagina original sem `?token=` na URL.
  - Gate 1 whitelista `/refine/bootstrap` como publico (senao entra em loop).
  - Escopo limitado a `/refine` e `/onboarding` pra evitar que `?token=` vire um auth vector amplo no dashboard.
- **Arquivos modificados:** `packages/dashboard/src/proxy.ts`, novo `packages/dashboard/src/app/refine/bootstrap/page.tsx`
- **Commit:** `f8ddf5b`

**2. [Regra 3 - Ordem de execucao] Task 5 (refactor) antecipada pra antes de Tasks 3/4**
- **Encontrado durante:** Tarefa 3, ao criar `refine-sessions.ts`
- **Issue:** Tasks 3 e 4 precisam de `createBackup/listBackups/restoreBackup` importados. Se eu seguisse a ordem do plano (1->2->3->4->5->6), as rotas importariam de `packages/cli/src/utils/refine-backup.ts` — o que cria dependencia dashboard -> cli (monorepo tipicamente so tem package-to-package entre packages declaradas, `@forgeclaw/dashboard` nao depende de `forgeclaw` CLI) ou duplicacao de codigo que seria removida na tarefa 5.
- **Correcao:** Executei Task 5 (refactor moveu codigo pra `packages/core/src/harness-backup.ts` + reexportou via `packages/core/src/index.ts`) logo depois da Task 1. Tasks 3/4 entao importam limpo `from "@forgeclaw/core"`. Zero rework, zero dep circular.
- **Arquivos modificados:** `packages/core/src/harness-backup.ts` (novo), `packages/core/src/index.ts`, `packages/cli/src/utils/refine-backup.ts` (reduzido a re-export)
- **Commit:** `86da0af`

**3. [Regra 3 - Bloqueante] `InterviewerChat` da Fase 27 tem props diferentes das descritas no plano**
- **Encontrado durante:** Tarefa 6, analise dos componentes existentes
- **Issue:** O plano assume `InterviewerChat` com props `{ sessionId, mode: 'onboarding' | 'refine', archetype, section?, onDraftChange, onComplete, onCancel }` — mas o componente real da Fase 27 tem props `{ messages, status, currentQuestion, currentRationale, inFlight, onSend, error?, onRetry? }`. O componente e um render-only puro — NAO faz fetch, NAO gerencia sessao, NAO tem conceito de `mode`. Toda a orquestracao (bootstrap, send, draft, complete, cancel) vive no hook `useOnboarding` em cima dele.
- **Correcao:** Em vez de adicionar prop `mode='refine'` (que exigiria forkar o componente ou adicionar coupling desnecessario), criei um hook paralelo `useRefine` que implementa a orquestracao espelho (sessionId local, start/answer/approve/cancel, polling) e um `RefineApp` que faz `adaptSnapshot()` (identity cast porque DTOs tem mesma shape) + passa os mesmos props pro `InterviewerChat`/`HarnessPreview`/`BudgetBar`. Zero mudanca na Fase 27. Tambem criei `RefineActionsBar.tsx` em vez de reusar `ActionsBar` do onboarding — ActionsBar tem 3 botoes (pausar/pular/aprovar) que nao fazem sentido no refine (pause + skip sao onboarding-only), e o copy dos confirm dialogs e diferente.
- **Arquivos modificados:** `packages/dashboard/src/hooks/use-refine.ts` (novo), `packages/dashboard/src/components/refine/RefineApp.tsx` (novo), `packages/dashboard/src/components/refine/RefineActionsBar.tsx` (novo)
- **Commit:** `f8ddf5b`

**4. [Regra 3 - Bloqueante] Rota adicional `/api/refine/message` necessaria**
- **Encontrado durante:** Tarefa 3
- **Issue:** O plano nao lista `/api/refine/message` explicitamente (so menciona `POST /api/refine/session`). Mas a Interviewer loop precisa de 2 rotas: uma pra start (criar sessao, gerar primeira pergunta) e uma pra answer (enviar resposta do user, gerar proxima pergunta). A rota do onboarding e `POST /api/onboarding/message` — espelhei pra refine.
- **Correcao:** Criei `packages/dashboard/src/app/api/refine/message/route.ts` com contrato `{sessionId, text}`, valida sessao ativa + status=asking + text<=4000 chars.
- **Commit:** `f69262c`

**5. [Regra 1 - Bug] `waitForCompletion` poderia spin-loop em sentinel JSON malformado**
- **Encontrado durante:** Tarefa 1, revisao defensiva
- **Issue:** Se alguma coisa escrevesse sentinel com JSON malformado (bug, race condition, user editando arquivo), o loop original (`JSON.parse` -> throw -> proxima iteracao -> re-le -> re-throw) spin-loopa ate timeout.
- **Correcao:** `try/catch` em volta do `JSON.parse`, em caso de falha unlink o sentinel + retorna `{status:'error', error:'Failed to parse sentinel: <msg>'}`. CLI entao reporta erro e sai 1 — melhor que hanging 30min.
- **Commit:** `274b793`

### Auth Gates

Nenhum — tarefa de CLI+Dashboard sem dependencia de credenciais externas. O `dashboardToken` usado e o mesmo ja criado na Fase 25-02 install flow.

### Issues Adiados (out-of-scope)

- **`bun:sqlite` turbopack dev server:** rotas `/api/refine/*` nao podem ser testadas end-to-end em runtime no dev server por causa do bug preexistente de `bun:sqlite` nao resolver no Turbopack (documentado em STATE.md linhas 117, 147, 305). Production `next build` webpack compila OK. Typecheck + audit + unit tests do CLI sao verdes. Mesma limitacao que afetou 27-01, 27-02, 27-04, 27-05.
- **8 erros pre-existentes em `packages/core/src/runners/*` e conflito `MemoryManager`:** continuam out-of-scope desde Fase 22-23.
- **3 erros pre-existentes em `packages/dashboard/src/lib/core.ts` (`vaultDailyLogPath`):** continuam out-of-scope desde Fase 23-02.

## Self-Check: PASSOU

Verificacao dos claims do SUMMARY:

```
$ ls packages/cli/src/utils/refine-dashboard.ts packages/core/src/harness-backup.ts packages/dashboard/src/lib/refine-types.ts packages/dashboard/src/lib/refine-sentinel.ts packages/dashboard/src/lib/refine-sessions.ts packages/dashboard/src/app/api/refine/session/route.ts packages/dashboard/src/app/api/refine/message/route.ts packages/dashboard/src/app/api/refine/apply/route.ts packages/dashboard/src/app/api/refine/rollback/route.ts packages/dashboard/src/app/api/refine/session/cancel/route.ts packages/dashboard/src/app/refine/page.tsx packages/dashboard/src/app/refine/layout.tsx packages/dashboard/src/app/refine/bootstrap/page.tsx packages/dashboard/src/app/refine/done/page.tsx packages/dashboard/src/app/refine/cancelled/page.tsx packages/dashboard/src/components/refine/RefineApp.tsx packages/dashboard/src/components/refine/RefineActionsBar.tsx packages/dashboard/src/hooks/use-refine.ts
ENCONTRADO: todos os 18 arquivos novos

$ git log --oneline | grep 28-02
ENCONTRADO: 274b793 (task 1), 86da0af (task 5), 08ede94 (task 2), f69262c (task 3), d23649e (task 4), f8ddf5b (task 6)

$ bun test packages/cli/tests/
ENCONTRADO: 91 pass, 0 fail, 530 expect calls

$ bun run audit:personal:ci
ENCONTRADO: AUDIT PASS, 0 critical

$ bunx tsc --noEmit -p packages/cli
ENCONTRADO: zero novos erros (8 pre-existentes em core/runners/* + MemoryManager continuam)

$ bunx tsc --noEmit -p packages/dashboard
ENCONTRADO: zero novos erros (4 pre-existentes em core/index.ts + core.ts vaultDailyLogPath continuam)

$ curl -sI "http://localhost:4040/refine?token=test" | head -2
ENCONTRADO: HTTP/1.1 307 + location: /refine/bootstrap?token=test&next=%2Frefine

$ curl -s -o /dev/null -w "%{http_code}" "http://localhost:4040/refine/bootstrap?token=test"
ENCONTRADO: 200
```
