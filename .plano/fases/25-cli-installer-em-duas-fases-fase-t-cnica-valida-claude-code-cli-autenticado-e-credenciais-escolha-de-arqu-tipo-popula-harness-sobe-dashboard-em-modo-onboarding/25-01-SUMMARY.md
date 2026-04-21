---
phase: 25-cli-installer-em-duas-fases
plan: 25-01
subsystem: cli-installer
tags: [refactor, installer, modular, resume, archetype]
dependency_graph:
  requires:
    - "@forgeclaw/core (compileHarness)"
    - "packages/cli/src/templates/archetypes (Phase 24)"
    - "packages/cli/src/utils/service (setupService, writeEnvFile)"
  provides:
    - "packages/cli/src/commands/install/ (modular installer)"
    - "InstallContext, PhaseAResult, PhaseBResult, InstallState types"
    - "readState/writeState/clearState over ~/.forgeclaw/.install-state.json"
    - "CLI flags --resume, --archetype=<slug>, --no-handoff"
  affects:
    - "packages/cli/src/commands/install.ts (now a 8-line shim)"
    - "packages/cli/src/index.ts (flag parsing + forwarding)"
    - "packages/cli/package.json (@forgeclaw/core workspace dep)"
tech-stack:
  added:
    - "@forgeclaw/core workspace:* in packages/cli dependencies"
  patterns:
    - "3-phase orchestrator with immutable InstallContext"
    - "Persistent state file with --resume semantics"
    - "0o600 permissions on state file (contains bot token)"
    - "<!-- CUSTOM --> marker to protect hand-edited harness files in update mode"
key-files:
  created:
    - "packages/cli/src/commands/install/types.ts"
    - "packages/cli/src/commands/install/state.ts"
    - "packages/cli/src/commands/install/phase-a-technical.ts"
    - "packages/cli/src/commands/install/phase-b-archetype.ts"
    - "packages/cli/src/commands/install/phase-c-handoff.ts"
    - "packages/cli/src/commands/install/index.ts"
  modified:
    - "packages/cli/src/commands/install.ts (435 -> 8 lines shim)"
    - "packages/cli/src/index.ts (flag parsing + VALID_SLUGS)"
    - "packages/cli/package.json (@forgeclaw/core dep)"
decisions:
  - "Shim strategy: keep install.ts as re-export instead of rewriting all callers. Minimal blast radius; can be deleted in a later sweep."
  - "Phase A/C stubs have identical call signatures to final impl in 25-02/25-03. Contract-first so the orchestrator, state persistence, and resume logic are testable NOW."
  - "<!-- CUSTOM --> marker in harness files (update mode only) lets users opt-out of rewrites per-file instead of all-or-nothing."
  - "Archetype slug baked into forgeclaw.config.json (new field 'archetype') so 28-refine can re-run the interview preserving previous choice."
  - "Flag validation with VALID_SLUGS at CLI boundary — installer never sees invalid slug."
metrics:
  duration_minutes: ~18
  completed_date: 2026-04-21
  tasks_completed: 9
  commits: 10
---

# Fase 25 Plano 01: Refatorar install.ts em Fases A/B/C + Flag --resume Summary

Refatoramos `packages/cli/src/commands/install.ts` (um monolito de 435 linhas) em um diretorio `install/` com 6 modulos especializados, persistencia de estado em `~/.forgeclaw/.install-state.json`, e suporte a `--resume`, `--archetype=<slug>` e `--no-handoff`.

A Fase B (escolha + render de arquetipo + escrita do harness + config + service) e real e usa as APIs `loadArchetype/renderArchetype` da Fase 24. As Fases A (deps + credenciais) e C (handoff do dashboard) ficam com stubs de assinatura estavel, a serem preenchidos em 25-02 e 25-03 respectivamente. O orquestrador ja chama as 3 fases em sequencia com `InstallContext` imutavel.

## Mudancas Chave

1. **Shim fino** — `packages/cli/src/commands/install.ts` agora tem 8 linhas e apenas re-exporta `install` e `InstallOptions` de `./install/`. Nenhum caller precisou mudar.
2. **State file** — `readState/writeState/clearState/createFreshState` em `state.ts`. Schema versionado (`version: 1`). Permissao `0o600` porque carrega `PhaseAResult.botToken`. JSON corrompido ou de versao diferente retorna null, sem throw.
3. **Orquestrador** — `install/index.ts` monta `InstallContext` com `forgeclawDir`, `configPath`, `stateFilePath`, `monorepoRoot`, `existingConfig`, `existingState`. Em `--resume` pula Fase A e/ou B conforme `state.phase` (`a-complete` / `b-complete`).
4. **Fase B completa** — escolhe arquetipo via `--archetype` ou `@clack/select`, chama `loadArchetype(slug)`, renderiza os 7 `.md` via `renderArchetype(template, placeholders)`, cria os diretorios `~/.forgeclaw/{harness,memory,DAILY,db,logs,crons,agents}`, escreve `forgeclaw.config.json` com novo campo `archetype`, dispara `compileHarness`, `writeEnvFile`, `bun install` (best-effort) e `setupService` opcional.
5. **Marker `<!-- CUSTOM -->`** — em modo `--update`, se um harness file existente comeca com essa linha, o installer preserva. Permite customizacao granular sem criar um modo "no-overwrite" global.
6. **CLI flags** — `packages/cli/src/index.ts` ganhou `parseFlags()` com validacao de slug contra `VALID_SLUGS` e help atualizado. `install` e `update` repassam `{resume, archetype, noHandoff}`.

## Tarefas Executadas

| # | Nome | Commit | Arquivos |
|---|------|--------|----------|
| 1 | types.ts | 6bf9ce4 | install/types.ts |
| Regra 3 | @forgeclaw/core dep | e93cd5d | packages/cli/package.json |
| 2 | state.ts | 03cb638 | install/state.ts |
| 3 | phase-a-technical.ts (stub) | bc56290 | install/phase-a-technical.ts |
| 4 | phase-b-archetype.ts (real) | e5368d9 | install/phase-b-archetype.ts |
| 5 | phase-c-handoff.ts (stub) | ddb2466 | install/phase-c-handoff.ts |
| 6 | install/index.ts (orquestrador) | 467b805 | install/index.ts |
| 7 | install.ts -> shim | c469a23 | install.ts (-434 linhas) |
| 8 | CLI flag parsing | 56ca0d5 | src/index.ts |
| 9 | Smoke test (sem alteracao) | — | — |

## Desvios do Plano

### Issues Auto-corrigidos

**1. [Regra 3 - Bloqueante] Adicionada dependencia `@forgeclaw/core` ao CLI**
- **Encontrado durante:** Preparacao da tarefa 4 (phase-b-archetype.ts importa `compileHarness`)
- **Issue:** `packages/cli/src/commands/install.ts:22 error TS2307: Cannot find module '@forgeclaw/core'`. Registrado como deferred item em `.plano/fases/24-.../deferred-items.md` com acao sugerida "adicionar em 25-01".
- **Correcao:** Inserido `"@forgeclaw/core": "workspace:*"` em `packages/cli/package.json` e rodado `bun install`. Sem esse fix a tarefa 4 nao passaria typecheck.
- **Arquivos modificados:** `packages/cli/package.json`
- **Commit:** e93cd5d

Nenhum outro desvio. As 9 tarefas rodaram exatamente como escritas.

## Verificacao Funcional

### Typecheck (escopo deste plano)

```
./packages/cli/node_modules/.bin/tsc --noEmit -p packages/cli/tsconfig.json
```
- **Resultado:** 0 erros em `packages/cli/src/commands/install/*`, `install.ts`, `index.ts`
- **Erros pre-existentes fora do escopo (nao introduzidos por este plano):** 8 erros em `packages/core/src/runners/*` e `packages/core/src/index.ts`. Nao tocados — ver deferred-items de 25.

### Help flow

```
$ bun run packages/cli/src/index.ts
```
Mostra todas as 3 flags novas:
- `--resume` — Resume from last incomplete phase...
- `--archetype=<slug>` — Skip the archetype prompt. Valid: solo-builder | content-creator | agency-freela | ecom-manager | generic
- `--no-handoff` — Do not spawn dashboard nor open browser (useful in CI)

### Invalid archetype value

```
$ bun run packages/cli/src/index.ts install --archetype=xyz
Invalid --archetype value: xyz. Valid: solo-builder, content-creator, agency-freela, ecom-manager, generic
EXIT=1
```
Rejeicao imediata antes de qualquer prompt.

### State module (teste funcional live)

Script ad-hoc validou em `tmpdir`:
- `createFreshState()` retorna `{version:1, phase:'none'}`
- `writeState()` aplica `mode 600`
- `readState()` devolve objeto intacto
- JSON corrompido -> `null`
- `version: 999` -> `null`
- `clearState()` deleta arquivo (readState pos-clear = `null`)

### Audit CI

```
$ bun run audit:personal:ci
AUDIT PASS — 0 critical findings in distributed code.
```

## Self-Check: PASSOU

Arquivos criados (7):
- ENCONTRADO: packages/cli/src/commands/install/types.ts
- ENCONTRADO: packages/cli/src/commands/install/state.ts
- ENCONTRADO: packages/cli/src/commands/install/phase-a-technical.ts
- ENCONTRADO: packages/cli/src/commands/install/phase-b-archetype.ts
- ENCONTRADO: packages/cli/src/commands/install/phase-c-handoff.ts
- ENCONTRADO: packages/cli/src/commands/install/index.ts
- ENCONTRADO: .plano/fases/25-.../25-01-SUMMARY.md

Arquivos modificados (3):
- ENCONTRADO: packages/cli/src/commands/install.ts (agora shim, 8 linhas)
- ENCONTRADO: packages/cli/src/index.ts (com parseFlags/VALID_SLUGS)
- ENCONTRADO: packages/cli/package.json (@forgeclaw/core adicionado)

Commits (10):
- ENCONTRADO: 6bf9ce4 (types.ts)
- ENCONTRADO: 03cb638 (state.ts)
- ENCONTRADO: bc56290 (phase-a-technical.ts)
- ENCONTRADO: e93cd5d (chore: @forgeclaw/core dep - Regra 3)
- ENCONTRADO: e5368d9 (phase-b-archetype.ts)
- ENCONTRADO: ddb2466 (phase-c-handoff.ts)
- ENCONTRADO: 467b805 (install/index.ts orquestrador)
- ENCONTRADO: c469a23 (install.ts -> shim)
- ENCONTRADO: 56ca0d5 (CLI flags)

## Proximos Passos (para 25-02 e 25-03)

- **25-02** — Implementar `checkDependencies()` real: `bun --version >= 1.1`, `which claude`, `claude --print "ping"` detectando mensagens de nao autenticado. Quando detectar auth ausente, escrever state com `pauseReason='claude-not-authenticated'` e mostrar `claude login` + `--resume`. Trocar corpo dos stubs em `phase-a-technical.ts` sem mudar assinatura.
- **25-03** — Implementar `runPhaseC` real: spawn do dashboard em porta livre, health-check em `/api/status`, `open()` do browser em `/onboarding`. Respeitar `ctx.options.noHandoff`.
