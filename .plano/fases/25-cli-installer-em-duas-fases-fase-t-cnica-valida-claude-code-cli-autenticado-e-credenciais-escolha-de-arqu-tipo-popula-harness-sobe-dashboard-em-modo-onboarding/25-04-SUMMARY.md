---
phase: 25-cli-installer-em-duas-fases
plan: 25-04
subsystem: cli-installer-tests
tags: [test, installer, e2e, contract, ci-hatch]
dependency_graph:
  requires:
    - "packages/cli/src/commands/install/state.ts (25-01)"
    - "packages/cli/src/commands/install/phase-b-archetype.ts (25-01)"
    - "packages/cli/src/commands/install/types.ts (25-01)"
    - "packages/cli/src/templates/archetypes/* (Fase 24)"
  provides:
    - "packages/cli/tests/install/state.test.ts (9 cases)"
    - "packages/cli/tests/install/phase-b-integration.test.ts (2 cases x 2 archetypes)"
    - "packages/cli/tests/install/e2e-contract.test.ts (5 archetypes x 1 contract case)"
    - "FORGECLAW_SKIP_SERVICE=1 escape hatch em phase-b-archetype.ts"
  affects:
    - "packages/cli/src/commands/install/phase-b-archetype.ts (secao 9 — setup service)"
tech-stack:
  added:
    - "nenhum (zero novas dependencias)"
  patterns:
    - "bun:test com mkdtempSync + afterEach rmSync para isolamento total"
    - "env var escape hatch no codigo de producao (FORGECLAW_SKIP_SERVICE)"
    - "shape assertion in-line (nao importa validateConfig do core) para evitar build side-effects"
    - "test.each sobre lista de arquetipos para contrato em batelada"
key-files:
  created:
    - "packages/cli/tests/install/state.test.ts"
    - "packages/cli/tests/install/phase-b-integration.test.ts"
    - "packages/cli/tests/install/e2e-contract.test.ts"
  modified:
    - "packages/cli/src/commands/install/phase-b-archetype.ts (escape hatch FORGECLAW_SKIP_SERVICE)"
decisions:
  - "Escape hatch FORGECLAW_SKIP_SERVICE=1 em vez de mock de @clack/prompts — opcao A do plano (A vs B), menos fragil e reutilizavel em CI real"
  - "Contract test reimplementa validacao inline (assertValidForgeClawConfig) em vez de importar validateConfig do core — evita qualquer side-effect de build que exista em packages/core"
  - "test.each sobre ALL_SLUGS em vez de 5 testes duplicados — minimiza drift quando adicionar arquetipo novo"
  - "Tests usam monorepoRoot=process.cwd() para que `bun install` interno ao runPhaseB rode contra um workspace real (node_modules ja presente); evita criar workspace fake"
  - "Cleanup rmSync com { recursive: true, force: true } no afterEach garante 0 lixo em /tmp mesmo se teste falhar meio do caminho"
metrics:
  duration_minutes: ~2.5
  completed_date: 2026-04-21
  tasks_completed: 5
  commits: 4
  tests_added: 16
  total_install_tests: 38
---

# Fase 25 Plano 04: Testes E2E e Contratos do Installer Summary

Fechamos a Fase 25 com suite de testes completa do installer. 16 testes novos (9 state + 2 phase-b-integration + 5 e2e-contract) levam `packages/cli/tests/install/` de 22 para 38 testes verdes, rodando em ~8.7s. Adicionamos escape hatch `FORGECLAW_SKIP_SERVICE=1` em `phase-b-archetype.ts` para destravar CI sem mockar @clack/prompts.

## Mudancas Chave

1. **Escape hatch `FORGECLAW_SKIP_SERVICE=1`** — envolve o bloco "setup service" em branch env-var. Producao: mesmo comportamento (confirm + setupService). Testes: log "Skipping service setup" e `serviceInstalled=false`. Removeu a unica fonte de prompt bloqueante pra runPhaseB em CI.

2. **state.test.ts (9 cases)** — cobre:
   - `readState` absente -> null
   - `createFreshState` -> `{version:1, phase:'none', startedAt:ISO}`
   - round-trip completo com PhaseAResult rico (userId, groqApiKey, dashboardToken)
   - `writeState` aplica 0o600 em unix (skip em win32)
   - JSON corrompido -> null (sem throw)
   - `version: 999` -> null
   - `phase: 'bogus'` -> null (discriminated union check)
   - `clearState` remove arquivo
   - `clearState` em arquivo ausente -> no-op

3. **phase-b-integration.test.ts (2 cases)** — chama `runPhaseB` com ctx+phaseA sinteticos:
   - `generic`: verifica 7 harness files escritos, USER.md com placeholders substituidos ("Tester" e "Acme" presentes, nenhum `{{userName}}` leftover), config.json com `botToken/allowedUsers/voiceProvider/archetype/defaultRuntime/timezone`, state `phase='b-complete'`
   - `solo-builder`: mesmo 7 files, SOUL.md contem "solo builder" (distinguibilidade de arquetipo)
   - Ambos com timeout 120s pro bun install interno; FORGECLAW_SKIP_SERVICE=1 ativo

4. **e2e-contract.test.ts (5 cases via test.each)** — para cada um dos 5 slugs (solo-builder/content-creator/agency-freela/ecom-manager/generic), roda runPhaseB e valida forgeclaw.config.json contra shape esperado:
   - `botToken: string`
   - `allowedUsers: number[]` (nao-vazio)
   - `voiceProvider in ['groq','openai','none']`
   - `defaultRuntime in ['claude-code','codex']`
   - `archetype: string` (campo novo da Fase 25)
   - Shape assertion inline para evitar dependencia ao validateConfig do core

## Tarefas Executadas

| # | Nome | Commit | Arquivos |
|---|------|--------|----------|
| 1 | FORGECLAW_SKIP_SERVICE escape hatch | 2281c4f | packages/cli/src/commands/install/phase-b-archetype.ts |
| 2 | state.test.ts | 3a8d88a | packages/cli/tests/install/state.test.ts |
| 3 | phase-b-integration.test.ts | 91847a0 | packages/cli/tests/install/phase-b-integration.test.ts |
| 4 | e2e-contract.test.ts | 87884f7 | packages/cli/tests/install/e2e-contract.test.ts |
| 5 | Rodar suite completa + typecheck + audit | — (verify-only) | — |

## Desvios do Plano

Nenhum — plano executado exatamente como escrito. Os testes passaram de primeira em todas as tarefas, nenhuma regra de desvio precisou ser aplicada.

## Verificacao Funcional

### Suite completa `packages/cli/tests/install/`

```
$ FORGECLAW_SKIP_SERVICE=1 bun test packages/cli/tests/install/ --timeout 300000
...
 38 pass
 0 fail
 124 expect() calls
Ran 38 tests across 6 files. [8.67s]
```

Quebra por arquivo:
- `validators.test.ts` (25-02): 17 unit tests — compareSemver, validateBotTokenShape, validateBotToken async (mocked fetch), validateTelegramUserId, validateDirectoryExists
- `diagnostics.test.ts` (25-02): 3 integration tests — checkBun, checkClaudeInstalled, checkClaudeAuth
- `open-url.test.ts` (25-03): 2 cases — platform branch + timeout tolerance
- `state.test.ts` (25-04): 9 cases
- `phase-b-integration.test.ts` (25-04): 2 cases
- `e2e-contract.test.ts` (25-04): 5 cases

### Typecheck (escopo do plano)

```
$ bunx tsc --noEmit -p packages/cli/tsconfig.json 2>&1 | grep -E "tests/install|commands/install|utils/open-url"
<sem linhas>
```

Zero erros em `tests/install/*`, `commands/install/*`, `utils/open-url.ts`. Os 8 erros pre-existentes em `packages/core/src/runners/*` e `packages/core/src/index.ts` continuam fora de escopo (documentados na STATE.md desde 25-03).

### Audit CI

```
$ bun run audit:personal:ci
AUDIT PASS — 0 critical findings in distributed code.
```

### Execucao individual de cada test novo

- `state.test.ts`: 9 pass / 16 expect calls / 64ms
- `phase-b-integration.test.ts`: 2 pass / 23 expect calls / 740ms
- `e2e-contract.test.ts`: 5 pass / 50 expect calls / 390ms

## Self-Check: PASSOU

Arquivos criados (3):
- ENCONTRADO: packages/cli/tests/install/state.test.ts
- ENCONTRADO: packages/cli/tests/install/phase-b-integration.test.ts
- ENCONTRADO: packages/cli/tests/install/e2e-contract.test.ts

Arquivos modificados (1):
- ENCONTRADO: packages/cli/src/commands/install/phase-b-archetype.ts (escape hatch linha 190-207)

Commits (4):
- ENCONTRADO: 2281c4f feat(25-04): add FORGECLAW_SKIP_SERVICE escape hatch for CI tests
- ENCONTRADO: 3a8d88a test(25-04): add state IO tests for installer (9 cases)
- ENCONTRADO: 91847a0 test(25-04): add runPhaseB integration test with synthetic ctx+phaseA
- ENCONTRADO: 87884f7 test(25-04): add e2e contract test for config.json vs ForgeClawConfig shape

## Criterios de Sucesso — Atendidos

- [x] `packages/cli/tests/install/state.test.ts` cobre readState (absente/corrompido/versao invalida/phase invalido), writeState (round-trip + perms 0600), clearState (remove + noop), createFreshState
- [x] `packages/cli/tests/install/phase-b-integration.test.ts` chama runPhaseB com ctx+phaseA sinteticos (archetype=generic e solo-builder), verifica 7 harness files escritos, USER.md sem placeholders leftover, config.json com campo `archetype`, state phase='b-complete'
- [x] `packages/cli/tests/install/e2e-contract.test.ts` roda runPhaseB pra os 5 arquetipos e valida config.json resultante contra assertValidForgeClawConfig
- [x] `FORGECLAW_SKIP_SERVICE=1` reconhecido em phase-b-archetype.ts — pula prompt de confirm e nao chama setupService
- [x] `bun test packages/cli/tests/install/` passa verde (0 fail) em 8.7s (<< 10min)
- [x] Typecheck limpo em `commands/install/*`, `utils/open-url.ts` e `tests/install/*`
- [x] Campo `archetype` gravado em forgeclaw.config.json e compativel com qualquer extensao futura do schema no core

## Fase 25 — Status Final

Com 25-04 completo, a Fase 25 inteira (4/4 planos) esta concluida:
- **25-01:** Refactor modular do install.ts (435 linhas -> 6 modulos + shim)
- **25-02:** Fase A real — diagnostics (Bun/Claude) + validators (bot token live)
- **25-03:** Fase C real — spawn dashboard + open browser (xdg-open/open/cmd /c start)
- **25-04 (este):** Suite de testes E2E (16 testes novos, 38 total) + escape hatch CI

Installer agora e:
- Totalmente testavel em CI sem prompts interativos (`FORGECLAW_SKIP_SERVICE=1 + --archetype + --no-handoff`)
- Resumivel (state file com phase marker + pauseReason)
- Honesto sobre shape do config (contract test guarda drift vs core)

Proximo na roadmap: **Fase 26** — Persona entrevistador ForgeClaw (system prompt fixo + roteiro por arquetipo).
