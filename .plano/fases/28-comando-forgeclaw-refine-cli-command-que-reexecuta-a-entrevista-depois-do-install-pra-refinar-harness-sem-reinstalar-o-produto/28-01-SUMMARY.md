---
phase: 28-comando-forgeclaw-refine
plan: 28-01
subsystem: cli/refine
tags: [cli, refine, harness, backup, rollback, archetype, interviewer]
dependency-graph:
  requires:
    - 25-01  # InstallContext + archetype field in config
    - 25-04  # installer writes config.archetype consistently
    - 26-01  # Interviewer, HarnessDiff, DiffOp, DEFAULT_BUDGET
    - 26-02  # Interviewer engine (start/answer loop)
    - 24-01  # templates/archetypes + loadArchetype + renderArchetype
    - 24-02  # 35 .md templates by archetype
  provides:
    - forgeclaw refine CLI subcommand with 5 modes
    - createBackup/listBackups/restoreBackup (~/.forgeclaw/harness-backups/)
    - renderDiffSummary/renderRawDiff (terminal-friendly ANSI diff renderer)
    - getCurrentArchetype/setArchetype/loadArchetypeTemplates
  affects:
    - packages/cli/src/index.ts (dispatcher)
tech-stack:
  added: []
  patterns:
    - "Optional forgeclawDir override on every homedir()-derived helper (Bun caches homedir, so env mutation is unreliable)"
    - "First-match wins dispatch ordering: rollback > reset > archetype > section > default"
    - "Conversational interviewer loop via @clack/prompts text() — NOT a single Interviewer.run() call"
    - "Archetype switch is two-stage: replace base templates, then optional refinement interview"
    - "Section-focused refine filters the final HarnessDiff to a single file (downstream guarantee preserved)"
    - "Pre-restore safety backup auto-created before every restoreBackup"
key-files:
  created:
    - packages/cli/src/utils/refine-backup.ts (234 lines)
    - packages/cli/src/utils/refine-diff.ts (220 lines)
    - packages/cli/src/utils/refine-archetype.ts (150 lines)
    - packages/cli/src/commands/refine.ts (471 lines)
    - packages/cli/tests/refine-backup.test.ts (101 lines)
    - packages/cli/tests/refine-diff.test.ts (86 lines)
    - packages/cli/tests/refine-archetype.test.ts (143 lines)
  modified:
    - packages/cli/src/index.ts (register refine dispatch + help)
decisions:
  - "Adapted to the actual @forgeclaw/core API (Interviewer.start/answer loop, DiffOp-based HarnessDiff, applyDiff merger) — the plan described a hypothetical single-call Interviewer.run() contract that does not exist in code"
  - "Harness section names = basename without extension (SOUL/USER/AGENTS/TOOLS/MEMORY/STYLE/HEARTBEAT). No HarnessSection type exists in core; RefineSection is a local union"
  - "Archetype slugs match the codebase: solo-builder | content-creator | agency-freela | ecom-manager | generic (plan's shorter names like 'creator'/'agency'/'ecommerce' do not exist)"
  - "Every path-deriving helper accepts an optional forgeclawDir override — Bun caches homedir() at process start, so process.env.HOME mutation does not propagate (same issue hit in 27-01, documented in STATE.md)"
  - "Tests pass explicit forgeclawDir (matching packages/cli/tests/install/ convention) instead of mocking the os module"
  - "Install-scoped parseFlags() scoped to command === 'install' | 'update' so refine owns its --archetype validation with correct error message"
  - "hasAnyChanges semantics: empty diffs[] or every FileDiff with empty ops[] = no-change (matches how interviewer signals 'done with nothing to do')"
metrics:
  duration_seconds: 780
  completed_date: "2026-04-21"
  tasks_completed: 6
  files_created: 7
  files_modified: 1
  tests_added: 26
  tests_passed: 26
---

# Fase 28 Plano 01: Comando `forgeclaw refine` + Modos + Backup/Rollback Summary

Comando `forgeclaw refine` entregue com cinco modos de operacao (default, --archetype, --section, --reset, --rollback), sistema de backup/restore em `~/.forgeclaw/harness-backups/` e preview colorido com confirmacao antes de qualquer mutacao. Reutiliza o motor `Interviewer` (Fase 26) e `applyDiff` sem duplicar logica de entrevista.

## One-liner

Subcomando `forgeclaw refine` com loop conversacional via @clack/prompts que orquestra o `Interviewer` de `@forgeclaw/core`, grava snapshots em `harness-backups/` antes de cada mutacao, mostra diff LCS colorido por linha e aplica via `applyDiff` + recompila `CLAUDE.md`.

## Arquivos Entregues

### Novos

- `packages/cli/src/utils/refine-backup.ts` — `createBackup(reason, forgeclawDir?)`, `listBackups(forgeclawDir?)`, `restoreBackup(id, forgeclawDir?)`, tipo `BackupInfo`. Grava `metadata.json` com `{id, createdAt, reason, sourcePath}`. Colisoes de ID no mesmo segundo recebem sufixo `-1`, `-2`, etc. Restauracao sempre cria pre-restore backup do estado atual e prune do `metadata.json` no harness restaurado.

- `packages/cli/src/utils/refine-diff.ts` — `renderFileDiff(fileName, old, new)` com LCS walk-back O(m*n) + 3 linhas de contexto + separador `...`, `renderDiffSummary(diff, harnessDir)` que usa `previewDiff` do core pra computar before/after sem tocar disco, `renderRawDiff(RawFileDiff[])` pro fluxo de troca de arquetipo (before/after explicito), `hasAnyChanges` / `hasAnyRawChanges`. Zero deps externas — ANSI codes inline.

- `packages/cli/src/utils/refine-archetype.ts` — `getCurrentArchetype`, `setArchetype` (preserva campos existentes + `chmod 0o600`), `loadArchetypeTemplates` (reusa `loadArchetype` + `renderArchetype` do modulo `templates/archetypes/`), `readCurrentHarness` (shape estavel — string vazia pra arquivos ausentes), `ARCHETYPES` / `ARCHETYPE_LABELS` pra UI.

- `packages/cli/src/commands/refine.ts` — Entrypoint com dispatch por primeira flag presente (rollback > reset > archetype > section > default). Cada modo cria backup antes de mutar, mostra preview, pede confirmacao, aplica, recompila `CLAUDE.md`. Fluxo de troca de arquetipo e de duas etapas (templates base → entrevista de refinamento). Fluxo de section filtra a `HarnessDiff` pra manter so o arquivo-alvo. Reset exige digitacao do slug pra confirmar. Rollback oferece ate 20 backups mais recentes via `select`.

- 3 arquivos de teste (26 testes, 69 asserts, 1.2s): `refine-backup.test.ts` (7 testes), `refine-diff.test.ts` (8 testes), `refine-archetype.test.ts` (11 testes).

### Modificados

- `packages/cli/src/index.ts` — Registra `case 'refine'`, adiciona `parseRefineFlags` + `isArchetypeSlug` + `isRefineSection`, atualiza `showHelp()` com comando + 4 flags + 4 exemplos, escopa o `parseFlags` (install-only) apenas para `command === 'install' | 'update'`.

## Tarefas Executadas

| # | Tarefa | Commit | Status |
|---|--------|--------|--------|
| 1 | refine-backup.ts | `59a89e2` | passa typecheck |
| 2 | refine-diff.ts | `806bf7f` | passa typecheck |
| 3 | refine-archetype.ts | `e70f70c` | passa typecheck |
| 4 | refine.ts (5 modos) | `9c0b79f` | passa typecheck |
| 5 | index.ts dispatch + help | `6201595` | runtime verificado (3 paths) |
| 6 | 26 testes + forgeclawDir override | `5e2cdac` | 26/26 passa |

## Criterios Atendidos

- [x] `forgeclaw refine` sem flags: roteamento pro modo default, backup criado, loop do `Interviewer`, diff preview, confirm, apply, recompila `CLAUDE.md`
- [x] `forgeclaw refine --archetype=<slug>` troca arquetipo com dupla confirmacao (templates base + entrevista), preserva `db/`, `memory/` e sessoes (nada fora de `harness/` e tocado)
- [x] `forgeclaw refine --section=<NAME>` roda o interviewer e filtra a `HarnessDiff` pra so o arquivo alvo antes de aplicar
- [x] `forgeclaw refine --reset` exige `text()` com validate = `v === current` pra confirmar + pergunta se roda entrevista
- [x] `forgeclaw refine --rollback` lista backups ordenados desc, restaura via `select`, cria `pre-restore-<id>` automaticamente
- [x] Backup em `~/.forgeclaw/harness-backups/<timestamp>/` antes de QUALQUER modificacao em todos os modos (inclui `reset`, inclui os dois stages do archetype change)
- [x] Diff colorido (verde `+`, vermelho `-`, cinza contexto) mostrado antes de aplicar
- [x] Responder `n` na confirmacao aborta sem mudancas (apenas o backup permanece)
- [x] `compileHarness()` chamado apos cada aplicacao bem-sucedida (incluindo rollback)
- [x] `forgeclaw` sem args mostra `refine` no help com todas as flags
- [x] Flag invalida (`--bogus=x`) e silenciosamente ignorada
- [x] Valor invalido (`--archetype=foo`, `--section=XYZ`) aborta com exit 1 + lista de valores validos
- [x] `bunx tsc --noEmit -p packages/cli` — zero erros novos (8 pre-existentes em `packages/core/src/runners/*` e conflito de `MemoryManager` seguem out-of-scope, documentados em STATE.md)
- [x] `bun test packages/cli/tests/refine-*.test.ts` — 26/26 green em 1.2s
- [x] `bun run audit:personal:ci` — PASS, 0 critical findings
- [x] Sessoes/memoria/DB em `~/.forgeclaw/db/` e `~/.forgeclaw/memory/` nunca sao tocados por refine (todos os writes vao pra `~/.forgeclaw/harness/` e `~/.forgeclaw/harness-backups/`)

## Verificacao Funcional Runtime

- `forgeclaw refine --rollback` (sem backups): imprime "Nenhum backup disponivel." e sai sem erro
- `forgeclaw refine --archetype=bogus`: exit 1 + `Valid: solo-builder, content-creator, agency-freela, ecom-manager, generic`
- `forgeclaw refine --section=BOGUS`: exit 1 + `Valid: SOUL, USER, AGENTS, TOOLS, MEMORY, STYLE, HEARTBEAT`
- `forgeclaw` (sem args): help mostra linha `refine` + 4 sub-flags + 4 exemplos
- Config real em `~/.forgeclaw/forgeclaw.config.json` nao foi alterada durante os testes

## Desvios do Plano

### Issues Auto-corrigidos

**1. [Regra 3 - Bloqueante] Contrato do `Interviewer` no plano nao existe**
- **Encontrado durante:** Tarefa 4
- **Issue:** O plano assume `new Interviewer({ archetype, mode: 'full'|'section'|'refinement', section?, currentHarness })` com `await itv.run(): Promise<HarnessDiff>` retornando diff no formato `{[file]: {oldContent, newContent, changed}}`. O codigo real da Fase 26 expoe um loop conversacional (`start()` + `answer()` em ciclo ate status `done`/`aborted`) e uma `HarnessDiff` com shape `{diffs: FileDiff[], summary: string}` onde cada `FileDiff` tem `ops: DiffOp[]` (append/replace/replace_section/set_placeholder). Nao existe `mode`, nao existe `currentHarness`, nao existe `HarnessSection` type, nao existe `mergeHarnessDiff`.
- **Correcao:**
  - `refine.ts` implementa `runInterviewLoop(archetype, sectionHint)` que dirige o ciclo `start()`/`answer()` via `@clack/prompts text()` ate o interviewer emitir `done` (retorna diff) ou `aborted` (retorna null)
  - Uso `applyDiff(harnessDir, diff)` em vez do inexistente `mergeHarnessDiff`
  - Defini `type RefineSection = 'SOUL'|'USER'|...|'HEARTBEAT'` localmente em `refine.ts` como union literal, convertido pra `HarnessFile` (com `.md`) via `sectionToFile()`
  - Section mode filtra o diff final pra conter so o `FileDiff` com `file === targetFile` antes do `applyDiff` — mantem a garantia de "so mexer em uma secao" mesmo se o interviewer propor mudancas fora
  - `refine-diff.ts` foi redesenhado pra consumir a `HarnessDiff` real: `renderDiffSummary(diff, harnessDir)` usa `previewDiff` do core pra calcular before/after por arquivo sem tocar disco; adicionei `renderRawDiff(RawFileDiff[])` pro fluxo de troca de arquetipo que precisa de before/after explicito (sem DiffOps)
- **Arquivos modificados:** `packages/cli/src/commands/refine.ts`, `packages/cli/src/utils/refine-diff.ts`
- **Commit:** `9c0b79f` + `806bf7f`

**2. [Regra 3 - Bloqueante] Slugs de arquetipo no plano nao existem**
- **Encontrado durante:** Tarefa 3
- **Issue:** O plano define `type Archetype = 'solo-builder' | 'creator' | 'agency' | 'ecommerce' | 'generic'`. Os slugs reais do projeto sao `'solo-builder' | 'content-creator' | 'agency-freela' | 'ecom-manager' | 'generic'` (ver `packages/cli/src/templates/archetypes/types.ts` e `ARCHETYPE_SLUGS`).
- **Correcao:** `refine-archetype.ts` reexporta `ArchetypeSlug` de `templates/archetypes` como `Archetype`. `ARCHETYPE_LABELS` usa os slugs reais.
- **Arquivos modificados:** `packages/cli/src/utils/refine-archetype.ts`
- **Commit:** `e70f70c`

**3. [Regra 1 - Bug] `process.env.HOME` nao isola testes em Bun**
- **Encontrado durante:** Tarefa 6 (primeiro run dos testes)
- **Issue:** O plano sugere `process.env.HOME = tmpdir` + `await import(...)` pra isolar testes por-teste. Bun (e Node) cacheia `os.homedir()` no inicio do processo — lendo do passwd entry, nao do env. `HOME=/tmp bun -e 'homedir()'` retorna `/root`, nao `/tmp`. Resultado: o teste `readCurrentHarness reads files that exist` leu o harness REAL de `/root/.forgeclaw/harness/USER.md` (que contem o `USER.md` real com dados do Jonathan) em vez do tmp. Este mesmo bug ja tinha sido documentado em STATE.md (linha `[27-01] [Regra 1] process.env.HOME NAO isola testes`).
- **Correcao:** Refatorei `refine-backup.ts` e `refine-archetype.ts` pra aceitar um parametro opcional `forgeclawDir?: string` em cada funcao exportada (`createBackup(reason, forgeclawDir?)`, `getCurrentArchetype(forgeclawDir?)`, etc.). Default continua `~/.forgeclaw`. Testes passam o override explicito — mesmo padrao de `packages/cli/tests/install/phase-b-integration.test.ts`. Zero impacto pros callers reais (`refine.ts` chama sem arg e pega o default).
- **Arquivos modificados:** `packages/cli/src/utils/refine-backup.ts`, `packages/cli/src/utils/refine-archetype.ts`, os 3 arquivos de teste
- **Commit:** `5e2cdac` (inclui o refactor + testes corrigidos)

**4. [Regra 1 - Bug] `parseFlags` global invalidava `--archetype` de refine com mensagem errada**
- **Encontrado durante:** Tarefa 5 (smoke test)
- **Issue:** `index.ts` chama `parseFlags(extraArgs)` no top-level (antes do switch) que valida `--archetype=<slug>` e faz `process.exit(1)` em valor invalido. Isso rodava MESMO quando o comando era `refine`, dando o erro antes do `parseRefineFlags` rodar. Como os slugs validos sao os mesmos, valores validos passavam, mas invalidos eram rejeitados com mensagem ambigua (sem indicar se era contexto install ou refine).
- **Correcao:** `parseFlags` agora so roda quando `command === 'install' || command === 'update'`. Refine usa exclusivamente `parseRefineFlags` e sua propria mensagem de erro.
- **Arquivos modificados:** `packages/cli/src/index.ts`
- **Commit:** `6201595`

**5. [Regra 3 - Bloqueante] Convencao de pasta de testes diverge entre plano e projeto**
- **Encontrado durante:** Tarefa 6 (criacao dos arquivos)
- **Issue:** Plano especifica `packages/cli/test/` mas a convencao do projeto e `packages/cli/tests/` (ver `packages/cli/tests/install/`). Tests no caminho errado nao seriam descobertos pelos scripts futuros de CI.
- **Correcao:** Testes criados em `packages/cli/tests/refine-*.test.ts` (convencao do projeto).
- **Arquivos modificados:** localizacao dos 3 arquivos de teste
- **Commit:** `5e2cdac`

### Auth Gates

Nenhum — tarefa de CLI sem dependencia de credenciais externas.

### Issues Adiados (out-of-scope)

- 8 erros pre-existentes em `packages/core/src/runners/codex-cli-runner.ts` (ChildProcess typing), `packages/core/src/runners/registry.ts` (ChildProcessByStdio typing) e `packages/core/src/index.ts` (MemoryManager ambiguity). Todos ja documentados em STATE.md como out-of-scope desde as Fases 22-23. Zero relacao com esta task.

## Self-Check: PASSOU

Verificacao dos claims do SUMMARY:

```
$ ls packages/cli/src/utils/refine-backup.ts packages/cli/src/utils/refine-diff.ts packages/cli/src/utils/refine-archetype.ts packages/cli/src/commands/refine.ts packages/cli/tests/refine-backup.test.ts packages/cli/tests/refine-diff.test.ts packages/cli/tests/refine-archetype.test.ts
ENCONTRADO: todos os 7 arquivos

$ git log --oneline | grep 28-01
ENCONTRADO: 59a89e2, 806bf7f, e70f70c, 9c0b79f, 6201595, 5e2cdac

$ bun test packages/cli/tests/refine-*.test.ts
ENCONTRADO: 26 pass, 0 fail

$ bun run audit:personal:ci
ENCONTRADO: AUDIT PASS

$ bunx tsc --noEmit -p packages/cli (filtrando core)
ENCONTRADO: zero novos erros (apenas 8 pre-existentes em core/runners/* e index.ts)
```
