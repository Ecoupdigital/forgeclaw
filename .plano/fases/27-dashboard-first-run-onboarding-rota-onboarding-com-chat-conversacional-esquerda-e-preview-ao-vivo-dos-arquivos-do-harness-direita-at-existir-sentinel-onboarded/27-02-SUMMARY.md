---
phase: 27-dashboard-first-run-onboarding
plan: 27-02
subsystem: dashboard
tags: [onboarding, api-routes, singleton, interviewer, harness-diff]
requires:
  - "27-01 (sentinel helpers, proxy gates, @forgeclaw/core workspace dep)"
  - "26 (Interviewer + previewDiff + applyDiff + HarnessDiff types exportados)"
  - "25 (installer escreve forgeclaw.config.json com archetype)"
provides:
  - "lib/onboarding-types.ts (DTOs serializaveis — client-safe, zero core imports)"
  - "lib/onboarding-sessions.ts (store singleton HMR-safe, runStart, runAnswer, applyFinalDiff, toSnapshot)"
  - "POST /api/onboarding/start (cria sessao + kickoff Interviewer)"
  - "POST /api/onboarding/message (envia resposta, retorna snapshot atualizado)"
  - "GET /api/onboarding/state (snapshot atual para rehydration)"
  - "POST /api/onboarding/preview (placeholder para body-driven overrides futuros)"
  - "POST /api/onboarding/approve (applyDiff + markOnboarded source=interview)"
  - "POST /api/onboarding/skip (abort sessao + markOnboarded source=skipped)"
affects:
  - "Nenhum arquivo existente modificado"
tech-stack:
  added: []
  patterns:
    - "Singleton HMR-safe via Symbol.for('forgeclaw.onboarding.store') na globalThis"
    - "DTOs serializaveis separados dos tipos @forgeclaw/core (bundle hygiene client)"
    - "Discriminated error codes (NO_SESSION / ALREADY_DONE / NOT_DONE / INVALID_INPUT / INTERVIEWER_FAILED / HARNESS_APPLY_FAILED) em OnboardingApiError"
    - "createSession idempotente — chamar 2x retorna mesma sessao (reload seguro da UI)"
    - "Archetype resolve do forgeclaw.config.json com fallback 'generic' + log.warn"
    - "stripJsonBlock em mensagens do interviewer antes de serializar pra UI"
key-files:
  created:
    - "packages/dashboard/src/lib/onboarding-types.ts (99 linhas)"
    - "packages/dashboard/src/lib/onboarding-sessions.ts (292 linhas)"
    - "packages/dashboard/src/app/api/onboarding/start/route.ts (34 linhas)"
    - "packages/dashboard/src/app/api/onboarding/message/route.ts (81 linhas)"
    - "packages/dashboard/src/app/api/onboarding/state/route.ts (18 linhas)"
    - "packages/dashboard/src/app/api/onboarding/preview/route.ts (27 linhas)"
    - "packages/dashboard/src/app/api/onboarding/approve/route.ts (60 linhas)"
    - "packages/dashboard/src/app/api/onboarding/skip/route.ts (33 linhas)"
  modified: []
decisions:
  - "Sessao singleton em memoria (Symbol global) — first-run flow e 1 usuario, 1 sessao. Sem persistencia em disco: restart = recomeca entrevista (aceitavel porque e curta)"
  - "DTOs client-safe: onboarding-types.ts zero imports de @forgeclaw/core. Types do core ficam em onboarding-sessions.ts (server-only)"
  - "createSession idempotente retorna sessao existente em vez de erro/overwrite — permite reload da UI sem perder contexto"
  - "POST /preview espelha GET /state por ora — placeholder explicito para variantes body-driven futuras (overrides do usuario em 27-03/04)"
  - "Stripped JSON block em mensagens do interviewer: UI recebe 'pergunta limpa' sem fence markdown. currentQuestion cacheado no SessionEntry para status asking"
  - "Budget DTO hardcoded com DEFAULT_BUDGET (30/80k/20k/15min): Interviewer.getState() nao expoe config, e 26-01 congelou os limites. Se mudar, tocar aqui"
  - "Archetype fallback 'generic' quando config.json missing/invalido: garante onboarding nunca crashea por config quebrado (installer pode ter falhado parcialmente)"
  - "Approve rejeita com 409 NOT_DONE se status!=done — evita aplicar diff em sessao ainda em progresso"
  - "Skip sempre escreve sentinel (source=skipped) mesmo sem sessao ativa — usuario que recarrega a pagina antes de interagir ainda consegue pular"
metrics:
  duration_seconds: 720
  tasks_completed: 7
  tasks_total: 7
  commits: 6
  files_created: 8
  files_modified: 0
  tests_added: 0
  completed_at: "2026-04-21T13:00:00Z"
---

# Fase 27 Plano 02: API Routes da Entrevista — Summary

## One-liner

Seis rotas REST auth-gated (`/start`, `/message`, `/state`, `/preview`, `/approve`, `/skip`) orquestrando o motor `Interviewer` (Fase 26) via um store singleton HMR-safe em `packages/dashboard/src/lib/onboarding-sessions.ts`, com DTOs serializaveis dedicados (zero imports de `@forgeclaw/core` no bundle client) e discriminated error codes (`NO_SESSION`/`ALREADY_DONE`/`NOT_DONE`/`INVALID_INPUT`/`INTERVIEWER_FAILED`/`HARNESS_APPLY_FAILED`) — validado com typecheck zero-error nos 8 arquivos novos + 5 assertions de smoke test em `bun -e` cobrindo singleton, idempotencia de createSession, shape do snapshot (7 harnessFiles), e destroy.

## O que foi construido

### 1. `lib/onboarding-types.ts` (99 linhas)

DTOs serializaveis compartilhados entre server (route handlers) e client (componentes de 27-03). **Zero imports de `@forgeclaw/core`** — mantem o core fora do bundle client. Exports:

- `OnboardingStatus`: `'pending' | 'asking' | 'thinking' | 'done' | 'aborted' | 'error'`
- `OnboardingMessageDTO`: `{ index, role: 'interviewer'|'user', text, at }`
- `OnboardingHarnessFileDTO`: `{ name, currentContent, previewContent, changed }` — tudo que a UI precisa para renderizar um split view current vs. preview
- `OnboardingDiffSummary`: `{ summary, filesTouched[], opsCount }`
- `OnboardingBudgetDTO`: snapshot completo (turnsUsed/max, tokens in/out, elapsed, withinLimits, cutoffReason)
- `OnboardingSessionSnapshot`: contrato principal devolvido por `/start`, `/message`, `/state`, `/preview`
- `OnboardingApiError` com `code` discriminado pra switch no client (7 variantes)
- `OnboardingApproveResponse` / `OnboardingSkipResponse` (`{ ok: true, redirectTo: "/" }`)

### 2. `lib/onboarding-sessions.ts` (292 linhas)

Store singleton HMR-safe via `Symbol.for('forgeclaw.onboarding.store')` na `globalThis` — evita duplicar store em dev quando turbopack reimporta o modulo. API:

- `getStore()` — retorna mesma instancia sempre (confirmado via smoke test `a === b`)
- `createSession(archetype)` — idempotente (retorna sessao existente se active != null)
- `destroy()` — aborta Interviewer + limpa active
- `toSnapshot()` — serializa `InterviewState` atual pra `OnboardingSessionSnapshot`
- `applyFinalDiff()` — guarda `status === 'done'` antes de chamar `applyDiff(HARNESS_DIR, state.finalDiff)`

Helpers pro route handler:

- `runStart()` — resolve archetype do config, `createSession`, chama `itv.start()` se pending, cacheia `currentQuestion`/`currentRationale`, devolve snapshot
- `runAnswer(text)` — chama `itv.answer(text)`, atualiza cache de question, devolve snapshot atualizado
- `resolveArchetype()` — le `~/.forgeclaw/forgeclaw.config.json`, valida slug contra whitelist de 5, fallback `'generic'` + warn em qualquer falha

Snapshot builder faz o trabalho chato:

- `readHarnessFiles(diff)` — itera `HARNESS_FILES_ALL` (7 arquivos), le cada do disco, aplica `previewDiff` pra obter `previewContent`, marca `changed = previewContent !== currentContent`
- `stripJsonBlock(text)` — remove o bloco ```json ... ``` das mensagens interviewer antes de enviar pra UI (JSON cru e ruido visual)
- `buildDiffSummary(diff)` — conta ops e lista files touched

### 3. Rotas REST (6 arquivos, 253 linhas totais)

Todas auth-gated via `requireApiAuth` (cookie `fc-token` ou Bearer). Contratos:

| Route | Method | Body | 200 | Errors |
|-------|--------|------|-----|--------|
| `/api/onboarding/start` | POST | `{}` | `OnboardingSessionSnapshot` | 401, 409 ALREADY_DONE, 500 INTERVIEWER_FAILED |
| `/api/onboarding/message` | POST | `{ text: string }` | `OnboardingSessionSnapshot` | 400 INVALID_INPUT, 401, 404 NO_SESSION, 409 ALREADY_DONE, 409 INVALID_INPUT (status!=asking), 500 INTERVIEWER_FAILED |
| `/api/onboarding/state` | GET | — | `OnboardingSessionSnapshot` | 401, 404 NO_SESSION |
| `/api/onboarding/preview` | POST | `{}` | `OnboardingSessionSnapshot` | 401, 404 NO_SESSION |
| `/api/onboarding/approve` | POST | `{}` | `OnboardingApproveResponse` | 401, 404 NO_SESSION, 409 NOT_DONE, 500 HARNESS_APPLY_FAILED |
| `/api/onboarding/skip` | POST | `{}` | `OnboardingSkipResponse` | 401 |

Detalhes relevantes:

- **`/message`** valida body: `text` string, nao vazio apos `.trim()`, `<= 4000 chars`, JSON parse valido — quatro 400 INVALID_INPUT distintas
- **`/message`** rejeita com 409 INVALID_INPUT quando `status` nao e `'asking'` (ex: `thinking`, `aborted`, `error`) — mensagem inclui o status atual
- **`/approve`** so aplica diff se `status === 'done'`. Se merger falhar, retorna 500 HARNESS_APPLY_FAILED com `details: MergeResult` pra UI mostrar quais files especificos falharam
- **`/approve`** chama `markOnboarded({ source: 'interview', archetype, summary })` + `store.destroy()` — sessao morre, proxima `/start` sera bloqueada por `isOnboarded()`
- **`/skip`** aborta sessao se houver, `markOnboarded({ source: 'skipped', ... })` apenas se `!isOnboarded()` (idempotente), retorna `redirectTo: "/"`

## Runtime Verification

### Typecheck (`bun tsc --noEmit` em `packages/dashboard`)

Zero erros novos nos 8 arquivos do plano:

```
onboarding-types.ts       — 0 errors
onboarding-sessions.ts    — 0 errors
onboarding/start/route.ts — 0 errors
onboarding/message/...    — 0 errors
onboarding/state/...      — 0 errors
onboarding/preview/...    — 0 errors
onboarding/approve/...    — 0 errors
onboarding/skip/...       — 0 errors
```

4 erros pre-existentes (todos documentados em 27-01 e deferred-items de Fases 22/23):

- `core/src/index.ts`: `MemoryManager` ambiguous re-export (Fase 22)
- `lib/core.ts` x3: `vaultDailyLogPath` missing em `ForgeClawConfig` (Fase 23-02 precisa atualizar type)

### Smoke test (bun -e) — 5 assertions

```
[1/4] OK singleton                                (getStore() === getStore())
[2/4] OK: no active session at bootstrap          (hasActive()=false)
[3/4] OK: createSession idempotent                (s1.sessionId === s2.sessionId)
[4/4] OK: snapshot shape valid                    (sessionId + archetype + 7 harnessFiles + budget)
      OK destroy clears active                    (post-destroy hasActive()=false)
```

O snapshot validado tem forma inteira: `sessionId` (uuid), `archetype: 'solo-builder'` (do config escrito em tmp), `harnessFiles.length === 7` (todos `HARNESS_FILES_ALL`), `budget` com 10 campos.

### Audit CI

```
AUDIT PASS — 0 critical findings in distributed code.
```

Zero findings de contexto pessoal nos 8 arquivos novos.

## Commits

| Hash | Tarefa | Mensagem |
|------|--------|----------|
| `0bdcead` | 1 | feat(27-02): add onboarding API DTOs (serializable types) |
| `c201c8b` | 2 | feat(27-02): add onboarding session store singleton (HMR-safe) |
| `23526c3` | 3 | feat(27-02): add POST /api/onboarding/start route |
| `8ab5e75` | 4 | feat(27-02): add POST /api/onboarding/message route |
| `ad30cdb` | 5 | feat(27-02): add GET /state and POST /preview onboarding routes |
| `ed497ad` | 6 | feat(27-02): add POST /approve and POST /skip terminal routes |

Task 7 e validation-only (typecheck + smoke), sem mudancas de arquivo — sem commit dedicado.

## Desvios do Plano

### Issues Auto-corrigidos

**1. [Regra 1 - Bug] `maxTurns` bug no snapshot builder (codigo do plano tinha bug explicito)**

- **Encontrado durante:** Tarefa 2 (copy literal do plano incluia o bug + comentario de fix separado)
- **Issue:** O plano original tinha `maxTurns: entry.itv.getState().budget.turnsUsed` como "placeholder" seguido de `budget.maxTurns = 30;` duas linhas abaixo pra corrigir. Dois writes consecutivos ao mesmo campo com o primeiro sendo bugfodido — rastro do autor do plano iterando. Se eu copiasse literal, seria codigo funcional mas visualmente errado + lint-unfriendly.
- **Correcao:** Simplifiquei pra um unico `maxTurns: 30` na inicializacao do objeto, removendo o placeholder bugado e o comentario que explicava o bug. Resultado identico em runtime, mas sem ghost-code.
- **Arquivos modificados:** `packages/dashboard/src/lib/onboarding-sessions.ts` (linhas ~154-170)
- **Commit:** `c201c8b` (bundled na entrega inicial do task 2)

### Auth Gates

Nenhum.

### Out-of-scope (Deferred)

Nenhum acao nova — apenas registro:

- 4 erros de typecheck pre-existentes (MemoryManager ambiguity, vaultDailyLogPath x3) ja estao documentados no STATE.md e nos deferred-items de Fases 22 e 23. Sem regressao introduzida por este plano.
- Nao testamos dev server runtime (Next.js turbopack) porque 27-01 ja registrou que `bun:sqlite` do `@forgeclaw/core` nao resolve em turbopack — acontece aqui tambem em `Interviewer` → `ClaudeRunner` → cadeia. Producao (`next build` com webpack) deve resolver. Teste integrado real virá em 27-04.

## Criterios de Sucesso

- [x] `packages/dashboard/src/lib/onboarding-types.ts` define DTOs serializaveis sem depender de @forgeclaw/core no bundle client
- [x] `packages/dashboard/src/lib/onboarding-sessions.ts` e singleton HMR-safe (Symbol global) com createSession idempotente, toSnapshot, applyFinalDiff, runStart, runAnswer
- [x] `runStart()` instancia Interviewer com archetype lido do forgeclaw.config.json (fallback generic + warn)
- [x] Snapshots incluem mensagens (com JSON block stripped para UI), harnessFiles (current+preview+changed), diffSummary, budget completo
- [x] Todas as rotas sob `/api/onboarding/` (exceto /health) usam `requireApiAuth`
- [x] `POST /api/onboarding/start` retorna 409 ALREADY_DONE quando sentinel existe, cria sessao + kickoff quando nao
- [x] `POST /api/onboarding/message` valida text (nao vazio, <=4000 chars), exige status=asking, retorna snapshot atualizado
- [x] `GET /api/onboarding/state` retorna snapshot ou 404 NO_SESSION
- [x] `POST /api/onboarding/preview` espelha /state (placeholder pra overrides futuros)
- [x] `POST /api/onboarding/approve` rejeita com NOT_DONE se status != done, aplica diff, cria sentinel source=interview, destroi sessao, retorna redirectTo=/
- [x] `POST /api/onboarding/skip` aborta sessao (se houver), cria sentinel source=skipped, retorna redirectTo=/
- [x] Typecheck sem novos erros, singleton smoke-test passa

## Self-Check: PASSOU

- `packages/dashboard/src/lib/onboarding-types.ts` — ENCONTRADO (99 linhas, 9 exports verificados)
- `packages/dashboard/src/lib/onboarding-sessions.ts` — ENCONTRADO (292 linhas, getStore + runStart + runAnswer + previewDiff + resolveArchetype presentes)
- `packages/dashboard/src/app/api/onboarding/start/route.ts` — ENCONTRADO (requireApiAuth + isOnboarded + runStart + ALREADY_DONE)
- `packages/dashboard/src/app/api/onboarding/message/route.ts` — ENCONTRADO (runAnswer + NO_SESSION + ALREADY_DONE + INVALID_INPUT + .trim())
- `packages/dashboard/src/app/api/onboarding/state/route.ts` — ENCONTRADO (GET + NO_SESSION)
- `packages/dashboard/src/app/api/onboarding/preview/route.ts` — ENCONTRADO (POST + NO_SESSION)
- `packages/dashboard/src/app/api/onboarding/approve/route.ts` — ENCONTRADO (applyFinalDiff + markOnboarded + source=interview + NOT_DONE)
- `packages/dashboard/src/app/api/onboarding/skip/route.ts` — ENCONTRADO (markOnboarded + source=skipped)
- Commits `0bdcead`, `c201c8b`, `23526c3`, `8ab5e75`, `ad30cdb`, `ed497ad` — todos presentes em `git log`

## Entrega pra Proximos Planos

**27-03 (UI split-pane chat+preview)** pode consumir:

- `POST /api/onboarding/start` via `fetch` (ou SWR mutate) no mount do `/onboarding/page.tsx` quando user entra
- `POST /api/onboarding/message` com `{ text }` do textarea; renderizar `snapshot.messages` no chat e `snapshot.harnessFiles` no preview (side-by-side current vs preview, `changed` dita destaque visual)
- `GET /api/onboarding/state` no mount se houver sessao ativa (rehydration apos reload — URL tem `sessionId` mas estado vem do server)
- `snapshot.currentQuestion` quando `status === 'asking'` — input habilitado
- `snapshot.diffSummary` quando `status === 'done'` — mostrar review card com files e opsCount antes do Approve
- `POST /api/onboarding/approve` + `POST /api/onboarding/skip` — ambas retornam `redirectTo: "/"` → `router.push(redirectTo)`

**27-04 (wire completo + seguro)** pode:

- Adicionar teste e2e que spawna dashboard real, POSTa `/start`, `/message` (mockando Claude via env var ou Interviewer dep injection), `/approve`, verifica sentinel escrito em `~/.forgeclaw/.onboarded` com `source: 'interview'`
- Validar race: chamar `/approve` enquanto `/message` ainda processando — atualmente status != done → 409 NOT_DONE (comportamento correto)
- Health endpoint da 27-01 ja retorna `interviewerReady: true` quando modulo carrega (fix em producao via webpack)

**28 (refine)** pode chamar `clearOnboarded()` (helper da 27-01) antes de `POST /start` pra re-abrir entrevista. Store singleton aceita `createSession` novamente apos `destroy()`.
