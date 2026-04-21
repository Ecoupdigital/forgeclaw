---
phase: 25-cli-installer-em-duas-fases
plan: 25-03
subsystem: cli-installer
tags: [feature, installer, dashboard, handoff, browser, healthcheck]
dependency_graph:
  requires:
    - "packages/cli/src/commands/install/types (from 25-01)"
    - "packages/cli/src/commands/install/state.clearState (from 25-01)"
    - "packages/cli/src/utils/service (startService, isServiceRunning)"
    - "@clack/prompts (outro, log, spinner)"
  provides:
    - "packages/cli/src/utils/open-url (openUrl, OpenUrlResult)"
    - "packages/cli/src/commands/install/dashboard-handoff (spawnDashboardIfNeeded, waitForDashboardUp, buildOnboardingUrl, DASHBOARD_HOST, DASHBOARD_PORT, SpawnResult)"
    - "packages/cli/src/commands/install/phase-c-handoff.runPhaseC (real impl)"
  affects:
    - "packages/cli/src/commands/install/phase-c-handoff.ts (stub -> real)"
tech-stack:
  added: []
  patterns:
    - "Portable browser-open via platform branch (xdg-open/open/start) — no npm 'open' dep"
    - "Exponential backoff polling with dual probes (/api/health then /) up to 15s"
    - "Optimistic timeout in openUrl: xdg-open/open sometimes return after browser opens, so timeout maps to ok:true"
    - "Background spawn fallback when systemd/launchd service not installed"
    - "clearState called AFTER outro in both --no-handoff and normal paths"
key-files:
  created:
    - "packages/cli/src/utils/open-url.ts"
    - "packages/cli/src/commands/install/dashboard-handoff.ts"
    - "packages/cli/tests/install/open-url.test.ts"
  modified:
    - "packages/cli/src/commands/install/phase-c-handoff.ts (stub replaced, 39 -> 92 lines)"
decisions:
  - "No npm 'open' dep. ForgeClaw keeps deps lean; platform branch via node:os.platform() is 30 lines and zero-dep."
  - "Timeout in openUrl returns ok:true (optimistic). xdg-open on Linux with DISPLAY often doesn't exit until user closes browser; treating timeout as failure would mask the happy path."
  - "waitForDashboardUp probes BOTH /api/health (Phase 27 future) and / in each iteration. That way this plan works today (dashboard has /, not /api/health yet) AND post-Phase-27 without code change."
  - "Background spawn uses NODE_ENV=production. If dashboard has a prod build, start works; if not, bun run start exits !=0 within 800ms and we report 'skipped' with manual instructions."
  - "clearState moved AFTER outro in both branches so a crash mid-outro still leaves the state file (user can --resume). Rationale: outro is side-effect-free print, so crash is unlikely, but policy is 'state survives until handoff completes fully'."
  - "Onboarding URL uses encodeURIComponent(token) so tokens with '+' or space (possible with base64url/b64) survive query-string parsing on the dashboard side."
  - "Dual spinners (Starting / Waiting) instead of a single multi-step spinner — @clack/prompts spinner() is stateful per-instance and restarting a single one loses the 'started dashboard' message before 'waiting' begins."
metrics:
  duration_minutes: ~3
  completed_date: 2026-04-21
  tasks_completed: 5
  commits: 4
---

# Fase 25 Plano 03: Handoff pro Dashboard — Spawn + Health-check + Open Browser Summary

Implementado o handoff real do installer para o dashboard, substituindo o stub que o 25-01 deixou em `phase-c-handoff.ts`. O installer agora (a) sobe o dashboard — via `startService` quando o systemd/launchd unit foi instalado em Fase B, ou via `bun run start` em background como fallback; (b) polla `/api/health` e `/` com backoff exponencial ate 15s para confirmar que subiu; (c) abre o browser do usuario em `http://localhost:4040/onboarding?token=<encoded>` via `xdg-open`/`open`/`start` sem depender do pacote npm `open`; (d) imprime o outro final com URL, token e status; (e) limpa o state file so depois do outro em ambos caminhos (incluindo `--no-handoff`).

## Mudancas Chave

1. **`packages/cli/src/utils/open-url.ts` (novo)** — Util portavel `openUrl(url, timeoutMs?)`. Branch por `node:os.platform()`: Linux -> `xdg-open`, macOS -> `open`, Windows -> `cmd /c start "" <url>`. `Bun.spawn` com stdout/stdin ignorados e stderr em pipe. Usa `Promise.race` entre timeout e `proc.exited`. Se timeout, retorna `{ ok: true, command }` (xdg-open frequentemente so retorna quando o browser fecha). Se exit code != 0, retorna `{ ok: false, command, reason: stderr[:200] }`. Erros de spawn capturados em try/catch retornando `{ ok: false, reason }`. Zero deps externas.

2. **`packages/cli/src/commands/install/dashboard-handoff.ts` (novo)** — Encapsula tres responsabilidades:
   - `spawnDashboardIfNeeded(monorepoRoot, serviceInstalled)` — Se `serviceInstalled`, consulta `isServiceRunning()` e retorna `service-already-up`, ou chama `startService()` e retorna `service-started` ou fallback. Fallback: `Bun.spawn(['bun','run','start'])` em `packages/dashboard` com `NODE_ENV=production`, espera 800ms pra detectar falha imediata, retorna `background-spawn` (com pid) ou `skipped` (com mensagem acionavel).
   - `waitForDashboardUp(maxMs = 15000)` — Loop com delay exponencial (400ms -> 2500ms cap). Em cada iteracao, tenta `GET /api/health` e `GET /` com `AbortSignal.timeout(1500)`. Qualquer status < 500 em qualquer probe = up. Connection refused / timeout / network error ignorados silenciosamente. Retorna `false` no timeout geral.
   - `buildOnboardingUrl(token)` — `http://localhost:4040/onboarding?token=${encodeURIComponent(token)}`. Constantes `DASHBOARD_HOST` e `DASHBOARD_PORT` exportadas para consumo futuro (Fase 27).

3. **`packages/cli/src/commands/install/phase-c-handoff.ts` (reescrito)** — `runPhaseC(ctx, phaseA, phaseB)` real. Caminho `--no-handoff`: imprime `log.info` de skip, chama `outro(formatFinalOutro(..., handoffSkipped=true))`, `clearState`, retorna. Caminho normal: spinner "Starting dashboard..." -> `spawnDashboardIfNeeded(ctx.monorepoRoot, phaseB.serviceInstalled)` -> spinner "Waiting for dashboard..." -> `waitForDashboardUp(15000)` -> se `up` chama `openUrl(url)` reportando success/warn conforme resultado, se down imprime warn com URL manual -> `outro(formatFinalOutro(..., dashboardReady))` -> `clearState`. Helper `formatFinalOutro` monta mensagem com arquetipo, harness files count, URL de onboarding, dashboard token, comandos auxiliares (`forgeclaw status`, `forgeclaw logs`), paths de config e env, e flag handoff line condicional.

4. **`packages/cli/tests/install/open-url.test.ts` (novo)** — Dois testes `bun:test` que validam (a) shape do retorno `OpenUrlResult` com qualquer URL, e (b) timeout curto (50ms) nao quebra a funcao. Nao tenta abrir browser de verdade — shape-only, deterministico em CI.

## Tarefas Executadas

| # | Nome | Commit | Arquivos |
|---|------|--------|----------|
| 1 | open-url.ts util | 7699e0c | packages/cli/src/utils/open-url.ts |
| 2 | dashboard-handoff.ts | 002ab65 | packages/cli/src/commands/install/dashboard-handoff.ts |
| 3 | phase-c-handoff.ts (real) | f19e7dd | packages/cli/src/commands/install/phase-c-handoff.ts |
| 4 | open-url test | 117f824 | packages/cli/tests/install/open-url.test.ts |
| 5 | Smoke test (sem alteracao de arquivos) | — | — |

## Desvios do Plano

Nenhum. As 5 tarefas rodaram exatamente como escritas no PLAN.md. O unico ponto que o proprio plano ja previa: em task 5, o teste `waitForDashboardUp(2000) === false` retornou `true` porque ha uma instancia de `next-server` escutando em `:4040` nesta VPS (pid 2307614). O plano explicitamente diz: *"se houver, o teste retorna true — ainda aceitavel"*. Exercicios adicionais rodados para confirmar ambas as direcoes da funcao:
- Fast-path: com dashboard up, `waitForDashboardUp` retornou `true` em 71ms (< 1500ms timeout inicial).
- Timeout-path: replicando a mesma logica apontada pra porta 65530 (fechada), terminou em 3269ms com `up=false` — confirma backoff exponencial + timeout agregado funcionando.

## Verificacao Funcional

### Typecheck (escopo deste plano)

```
./packages/cli/node_modules/.bin/tsc --noEmit -p packages/cli/tsconfig.json
```

Resultado: **0 erros em `install/phase-c-handoff.ts`, `install/dashboard-handoff.ts`, `utils/open-url.ts`**. Os 8 erros pre-existentes em `packages/core/src/runners/*` e `packages/core/src/index.ts` permanecem intocados (out-of-scope; ja registrados no SUMMARY de 25-01).

### Testes unit

```
$ bun test packages/cli/tests/install/open-url.test.ts
 2 pass
 0 fail
 4 expect() calls
Ran 2 tests across 1 file. [109.00ms]
```

### Smoke 1 — URL encoding

```
$ bun -e "import {buildOnboardingUrl} from '.../dashboard-handoff'; console.log(buildOnboardingUrl('abc 123+xyz'))"
http://localhost:4040/onboarding?token=abc%20123%2Bxyz
```

Espaco -> `%20`, `+` -> `%2B`. Correto.

### Smoke 2 — waitForDashboardUp fast-path

```
$ bun -e "import {waitForDashboardUp} from '.../dashboard-handoff'; const t0 = Date.now(); const r = await waitForDashboardUp(2000); console.log('result=', r, 'elapsed=', Date.now()-t0, 'ms')"
result= true elapsed= 71 ms
```

Fast-path: dashboard alcancavel -> retorna `true` em ~70ms (muito abaixo do primeiro delay de 400ms do backoff).

### Smoke 3 — Polling timeout path (replica inline)

Replicando a logica de `waitForDashboardUp` apontada pra `:65530` (porta fechada) com `maxMs=2000`:

```
TIMEOUT_PATH_OK elapsed= 3269 ms
```

Polling termina apos o timeout geral (elapsed inclui o ultimo `AbortSignal.timeout(1500)` em voo). Confirma que o loop faz backoff e respeita o budget.

### Module import check

```
$ bun -e "import * as mod from '.../phase-c-handoff'; console.log(typeof mod.runPhaseC)"
function
```

phase-c-handoff.ts parse + resolucao de todos os imports (clack/prompts, types, state, dashboard-handoff, open-url) valida.

### Audit CI

```
$ bun run audit:personal:ci
$ bun run scripts/audit-personal-context.ts --ci
AUDIT PASS — 0 critical findings in distributed code.
```

## Self-Check: PASSOU

Arquivos criados (3):
- ENCONTRADO: packages/cli/src/utils/open-url.ts
- ENCONTRADO: packages/cli/src/commands/install/dashboard-handoff.ts
- ENCONTRADO: packages/cli/tests/install/open-url.test.ts

Arquivos modificados (1):
- ENCONTRADO: packages/cli/src/commands/install/phase-c-handoff.ts (stub 39 linhas -> real 92 linhas)

Commits (4):
- ENCONTRADO: 7699e0c (feat: portable openUrl util)
- ENCONTRADO: 002ab65 (feat: dashboard handoff module)
- ENCONTRADO: f19e7dd (feat: runPhaseC real handoff)
- ENCONTRADO: 117f824 (test: open-url shape and timeout)

## Proximos Passos (para 25-04 e Fase 27)

- **25-04** — Plano seguinte da Fase 25 (provavelmente end-to-end install flow / update mode hardening). Consumir `buildOnboardingUrl` se precisar reexportar URL de onboarding no comando `forgeclaw token`.
- **Fase 27** — Criar rota `/onboarding` e `/api/health` no `packages/dashboard/src/app/`. A partir dai, `waitForDashboardUp` vai pegar o probe `/api/health` (mais rapido e sem 307 redirect), e `runPhaseC` vai abrir o browser numa pagina funcional em vez de 404.
- **--no-handoff em CI** — O E2E test do installer (se existir depois) deve sempre passar `noHandoff: true` pra evitar spawn de browser e esperar 15s por `/api/health` inexistente durante testes.
