---
phase: 25-cli-installer-em-duas-fases
plan: 25-02
subsystem: cli-installer
tags: [installer, diagnostics, validators, claude-auth, telegram, semver]
dependency_graph:
  requires:
    - "packages/cli/src/commands/install/ (Phase 25-01)"
    - "packages/cli/src/commands/install/state.ts (writeState with pauseReason)"
    - "Bun.spawn + AbortSignal.timeout + fetch (node/bun builtins)"
  provides:
    - "packages/cli/src/commands/install/diagnostics.ts (checkBun, checkClaudeInstalled, checkClaudeAuth, MIN_BUN_VERSION)"
    - "packages/cli/src/commands/install/validators.ts (compareSemver, validateBotToken, validateBotTokenShape, validateTelegramUserId, validateDirectoryExists)"
    - "phase-a-technical.ts real checkDependencies + verifyClaudeAuth"
    - "botToken prompt loop with Telegram getMe validation"
    - "workingDir prompt validation via validateDirectoryExists"
  affects:
    - "packages/cli/src/commands/install/phase-a-technical.ts (stubs replaced)"
tech-stack:
  added:
    - "No new runtime deps; uses Bun.spawn + global fetch + AbortSignal.timeout"
  patterns:
    - "ValidationResult<T> discriminated union (ok:true|reason:string)"
    - "runWithTimeout helper that races proc.exited vs setTimeout and kills on timeout"
    - "Cascade check returning first-failure with actionable reason"
    - "Prompt loop with re-prompt on validation failure (preserves rejected input as initialValue)"
key-files:
  created:
    - "packages/cli/src/commands/install/validators.ts"
    - "packages/cli/src/commands/install/diagnostics.ts"
    - "packages/cli/tests/install/validators.test.ts"
    - "packages/cli/tests/install/diagnostics.test.ts"
  modified:
    - "packages/cli/src/commands/install/phase-a-technical.ts"
decisions:
  - "MIN_BUN_VERSION = '1.1.0' lives in diagnostics.ts (consumer), not types.ts. Keeps policy co-located with the check that enforces it."
  - "checkClaudeAuth regex inclui 'no credentials' alem das 4 mensagens documentadas — cobre edge case de token removido manualmente. Stderr matching case-insensitive."
  - "Timeout de 8s no `claude --print ping` — Anthropic recomenda esperar ao menos 5s pra MCP startup; 8s e confortavel pra cold start em VPS lenta."
  - "Loop de re-prompt de botToken preserva o valor rejeitado como initialValue no re-ask. Usuario edita vs digitar tudo de novo — principio 6 (custo futuro, UX)."
  - "validateBotToken NAO guarda o token em lugar nenhum, apenas valida e retorna. Chamada em loop e idempotente. Persistencia fica na responsabilidade de phase-a."
  - "validateDirectoryExists NAO cria o diretorio (diferente do fluxo antigo monolitico que fazia mkdir implicito). Installer deve ser honesto sobre o state do FS; se precisar criar, caller decide explicitamente em outro ponto."
metrics:
  duration_minutes: ~4
  completed_date: 2026-04-21
  tasks_completed: 6
  commits: 5
  tests_added: 20
  tests_passing: 22/22
---

# Fase 25 Plano 02: Fase A Real — Deteccao de Bun, Claude Auth, Bot Token Summary

Substitui os stubs `checkDependencies()` e `verifyClaudeAuth()` de `phase-a-technical.ts` por detecao real de ambiente (Bun >= 1.1.0, Claude Code CLI no PATH, `claude --print ping` verde), validacao de bot token via Telegram Bot API `getMe`, e validacao de diretorio-de-projetos. Cada falha produz reason acionavel com instrucao exata (`claude login`, `bun upgrade`, `npm install -g @anthropic-ai/claude-code`) e sufixo `npx forgeclaw install --resume`. Prompt de botToken ganhou loop de re-pergunta com pre-preenchimento do valor rejeitado.

## Mudancas Chave

1. **validators.ts (novo)** — Modulo puro com `compareSemver`, `validateBotTokenShape`, `validateBotToken` (async, chama Telegram com `AbortSignal.timeout(5000)`), `validateTelegramUserId`, `validateDirectoryExists`. Todos retornam `ValidationResult<T>` discriminado (`{ok:true, data?}` | `{ok:false, reason}`). Sem side-effects alem do network call do `validateBotToken`.

2. **diagnostics.ts (novo)** — Modulo de check de ambiente com `checkBun`, `checkClaudeInstalled`, `checkClaudeAuth`, exportando `MIN_BUN_VERSION='1.1.0'`. `runWithTimeout` interno usa `Bun.spawn` com `stdin:'ignore'` e faz race entre `proc.exited` e `setTimeout`, chamando `proc.kill()` se estourar. `checkClaudeAuth` rodda `claude --print ping` com timeout de 8s e aplica regex `/login|unauthoriz|invalid api key|not authenticated|no credentials/` no stderr.

3. **phase-a-technical.ts (modificado)** — Stubs substituidos. `checkDependencies` agora e cascata: Bun instalado -> Bun >= 1.1 -> claude instalado -> claude autenticado, retornando na primeira falha com `reason` + link de acao + hint `--resume`. `verifyClaudeAuth` delega a `checkClaudeAuth`. Prompt de `botToken` foi envolto em `while(true)` que chama `validateBotToken(raw)` e so sai quando o getMe responde OK — em falha, loga `check.reason` e re-pergunta usando o valor rejeitado como `initialValue` (UX). Prompt de `workingDir` usa `validateDirectoryExists` no `validate` callback do clack.

4. **Testes** — 17 unit tests em `validators.test.ts` (cobre semver equality/less/greater/pre-release/missing-patch; token shape 4 cenarios; user id 4 cenarios; directory com tmpdir real 4 cenarios). 3 integration tests em `diagnostics.test.ts` shape-only (ambiente-aware; `checkClaudeAuth` com timeout de 20s pro spawn interno). Total 22 tests, 0 falhas.

## Tarefas Executadas

| # | Nome | Commit | Arquivos |
|---|------|--------|----------|
| 1 | validators.ts | 4ba5646 | install/validators.ts |
| 2 | diagnostics.ts | 25dc77f | install/diagnostics.ts |
| 3 | phase-a-technical.ts wiring | 21099c5 | install/phase-a-technical.ts |
| 4 | validators.test.ts (17 tests) | a88d1c6 | tests/install/validators.test.ts |
| 5 | diagnostics.test.ts (3 tests) | 04e30d4 | tests/install/diagnostics.test.ts |
| 6 | Smoke typecheck + suite | — (sem alteracao) | — |

## Desvios do Plano

Nenhum. Todas as 6 tarefas executaram exatamente como escritas. Sem aplicacao das Regras 1-5.

## Verificacao Funcional

### Testes unitarios + integracao

```
$ bun test packages/cli/tests/install/
 22 pass
 0 fail
 35 expect() calls
Ran 22 tests across 3 files. [8.16s]
```

O tempo de 8s vem do `checkClaudeAuth` que roda `claude --print ping` ate o hard-timeout de 8s no host de CI onde o claude trava (sem TTY).

### Typecheck escopo

```
$ ./packages/cli/node_modules/.bin/tsc --noEmit -p packages/cli/tsconfig.json 2>&1 | \
    grep -E "install/(diagnostics|validators|phase-a-technical)\.ts"
(no output — 0 erros nos 3 arquivos novos/editados)
```

Erros pre-existentes em `packages/core/src/runners/*` e `packages/core/src/index.ts` nao relacionados com esta fase (registrados como out-of-scope em 25-01).

### Cascata de dependencias — teste live

Via script ad-hoc rodando `checkDependencies` no host real:

```
{
  ok: false,
  bunVersion: "1.3.11",       // Bun detectado, >= 1.1.0
  hasClaude: true,            // which claude achou o binario
  claudeAuthenticated: false, // claude --print ping nao retornou em 8s
  reason: "claude --print hung for 8s (likely not authenticated). Run: claude login"
}
```

Cada nivel da cascata respondeu corretamente — `hint` contem `claude login` e o caller (`runPhaseA`) escreveria state com `pauseReason` e imprimiria `--resume` instruction.

### Semver edge cases

- `compareSemver('1.0.9', '1.1.0') = -1` (rejeita)
- `compareSemver('1.1.0', '1.1.0') = 0` (aceita)
- `compareSemver('1.2.0', '1.1.9') = 1` (aceita)
- `compareSemver('1.1.0-rc.1', '1.1.0') = 0` (strip pre-release)
- `compareSemver('1.1', '1.1.0') = 0` (missing patch tolerado como .0)

### Bot token shape rejection

```
"" -> REJECT: Token is required
"abc:def" -> REJECT: Token must be `<digits>:<alphanumeric/_/->` (from @BotFather)
"123456NO_COLON" -> REJECT: Token must be ...
"123:!!@#" -> REJECT: Token must be ...
```

### Bot token getMe rejection (chamada real ao Telegram)

```
validateBotToken('123456:FAKE_TOKEN_THAT_WILL_FAIL_401-test')
-> { ok: false, reason: "Invalid bot token (Telegram returned 401 Unauthorized)." }
```

Round-trip real com `api.telegram.org` — rede funcional, HTTP 401 mapeado corretamente.

### Audit CI

```
$ bun run audit:personal:ci
AUDIT PASS — 0 critical findings in distributed code.
```

## Self-Check: PASSOU

Arquivos criados (4):
- ENCONTRADO: packages/cli/src/commands/install/validators.ts
- ENCONTRADO: packages/cli/src/commands/install/diagnostics.ts
- ENCONTRADO: packages/cli/tests/install/validators.test.ts
- ENCONTRADO: packages/cli/tests/install/diagnostics.test.ts

Arquivos modificados (1):
- ENCONTRADO: packages/cli/src/commands/install/phase-a-technical.ts (imports + checkDependencies real + verifyClaudeAuth delegate + botToken loop + workingDir validate)

Commits (5):
- ENCONTRADO: 4ba5646 (validators.ts)
- ENCONTRADO: 25dc77f (diagnostics.ts)
- ENCONTRADO: 21099c5 (phase-a-technical.ts wiring)
- ENCONTRADO: a88d1c6 (validators.test.ts)
- ENCONTRADO: 04e30d4 (diagnostics.test.ts)

## Proximos Passos

- **25-03** (rodando em paralelo, commits 7699e0c + 002ab65 + f19e7dd + 117f824 ja estao no branch) — implementa `runPhaseC` real. Esta fase (25-02) NAO tocou `phase-c-handoff.ts`, `open-url.ts` ou `dashboard-handoff.ts` — isolamento respeitado.
- **25-04** — testes E2E (opcional) cobrindo fluxo completo de install com Bun/Claude/token mockados.
- **26** — Persona entrevistador (system prompt fixo no produto).
