---
phase: 28-comando-forgeclaw-refine
plan: 28-03
subsystem: cli/refine/tests
tags: [cli, refine, tests, bun-test, mock, mtime, preservation, tdd]
dependency-graph:
  requires:
    - 28-01  # refine command + 5 modes + backup system
    - 28-02  # dashboard delegation + core harness-backup refactor
  provides:
    - MockInterviewer fixture (real HarnessDiff shape, start/answer loop)
    - ScriptedIO fixture (confirm/select/text/log capture)
    - RefineIO interface + defaultIO() in refine.ts
    - forgeclawDir override in RefineOptions (threaded through all helpers)
    - 24 new refine tests in packages/cli/tests/refine-*
    - test:refine npm script for targeted runs
  affects:
    - packages/cli/src/commands/refine.ts (IO injection + forgeclawDir plumbing)
    - packages/cli/package.json (test:refine script)
tech-stack:
  added: []
  patterns:
    - "Injectable IO (RefineIO) replaces hard-coded @clack/prompts in refine() — production uses defaultIO(), tests use createScriptedIO()"
    - "forgeclawDir override on refine() + all downstream helpers — bypasses Bun's cached homedir() (same pattern as 28-01 for util helpers)"
    - "Module mock via bun:test mock.module with realCore import captured BEFORE install (prevents recursive mock lookup)"
    - "mtime comparison for preservation invariants — catches no-op writes that content-equality would miss"
    - "recompile() early-returns when forgeclawDir override is set (compileHarness uses its own homedir path resolution)"
    - "Set/clear mock interviewer script via globalThis sidechannel to keep class constructor signature drop-in compatible with real Interviewer"
key-files:
  created:
    - packages/cli/tests/fixtures/mock-interviewer.ts (175 lines)
    - packages/cli/tests/fixtures/test-io.ts (113 lines)
    - packages/cli/tests/refine-e2e.test.ts (260 lines — 6 tests)
    - packages/cli/tests/refine-section.test.ts (232 lines — 4 tests)
    - packages/cli/tests/refine-archetype-change.test.ts (338 lines — 4 tests)
    - packages/cli/tests/refine-rollback.test.ts (219 lines — 5 tests)
    - packages/cli/tests/refine-preserves-data.test.ts (282 lines — 5 tests)
  modified:
    - packages/cli/src/commands/refine.ts (IO injection + forgeclawDir option)
    - packages/cli/package.json (+ test:refine script)
decisions:
  - "MockInterviewer emits REAL HarnessDiff shape ({diffs: FileDiff[], summary}) — the plan's legacy {[file]: {oldContent, newContent, changed}} shape no longer exists in core after Fase 26-01"
  - "refine() takes RefineOptions.forgeclawDir so tests can redirect to tmp — the plan's suggested process.env.HOME approach is broken in Bun (homedir() cached at process start, documented in STATE.md [27-01] and [28-01] deviations)"
  - "mock.module factory uses `realCore` captured at file-import time (BEFORE the mock) instead of `require('@forgeclaw/core')` inside the factory — the latter causes recursive mock resolution and returns an incomplete module missing restoreBackup"
  - "Fixtures live in tests/fixtures/ following the install/ subdir convention (packages/cli/tests/install/), not at the tests/ root"
  - "recompile() short-circuits with an info log when forgeclawDir override is present — compileHarness() from core uses its own homedir path resolution, so calling it on a tmpdir-scoped test would either crash or pollute the real ~/.forgeclaw/harness/CLAUDE.md. Tests verify harness files directly."
  - "Section-mode invariant is proven via mtime comparison + content check — mtime alone could be fooled by a no-op write, content alone could miss a touch+restore, together they close the loophole"
  - "Archetype-change tests cover the 3-confirm flow (Continuar? / Aplicar etapa 1/2 / Rodar entrevista?) — tests opt out of the optional refinement interview with confirm=false to assert on a clean 'templates only' outcome"
  - "Rollback tests skip Interviewer mocking entirely because the rollback flow is interview-free — simpler setup, no risk of mock leaking into other tests"
  - "test:refine script uses prefix `tests/refine-` (not a glob) — bun test treats it as a filter, matching all 8 refine-*.test.ts files at once"
  - "Defensive preservation test file includes 9 protected paths across db/memory/agents/logs/sessions — broader coverage than just DB, catches regressions in future code that might write to sessions/ or logs/"
metrics:
  duration_seconds: 665
  completed_date: "2026-04-21"
  tasks_completed: 7
  files_created: 7
  files_modified: 2
  tests_added: 24
  tests_passed: 24
  tests_total_in_suite: 115
---

# Fase 28 Plano 03: Testes — backup/restore, section, troca de arquetipo, preservacao de dados Summary

Suite de 24 testes novos validando o comando `forgeclaw refine` em todos os 5 modos com isolamento perfeito via tmpdir + IO injetavel + mock do Interviewer. Foco na **invariante critica**: refine NUNCA toca sessoes, memoria, DB, agents ou logs — provada com comparacao byte-a-byte + mtime em 5 cenarios distintos cobrindo cada modo.

## One-liner

RefineIO + MockInterviewer + ScriptedIO + forgeclawDir override destravam testes deterministicos de `refine()` sem depender de Claude CLI real nem de `process.env.HOME` (que nao funciona em Bun por cache de homedir); 24 testes novos em 5 arquivos cobrem backup + apply/reject + section filter + archetype switch preservando dados + rollback com pre-restore + invariante de preservacao em todos os modos, rodando em ~4s no total.

## Arquivos Entregues

### Novos (7)

**Fixtures:**
- `packages/cli/tests/fixtures/mock-interviewer.ts` — Classe `MockInterviewer` drop-in compativel com a signature real do `Interviewer` de `@forgeclaw/core`. Emite `InterviewResponse` com status `asking`/`done`/`aborted` + `HarnessDiff` real (`{diffs: FileDiff[], summary}`). Script configuravel via `setMockInterviewerScript(script)` + sidechannel em `globalThis`. Helpers: `defaultScript(archetype)`, `doneDiffForFile(file, note)`, `doneDiffForFiles(ops, summary)`, `askingResponse(q)`, `abortedResponse(reason)`.

- `packages/cli/tests/fixtures/test-io.ts` — Factory `createScriptedIO({confirms, selects, texts})` retorna um `ScriptedIO extends RefineIO` que captura tudo: `outputs[]`, `logs[{level, msg}]`, `intros[]`, `outros[]`, `consumed.{confirms/selects/texts}`. Lanca erro explicito quando falta resposta pra um prompt (protege contra prompt adicionado em prod sem atualizar fixture). Helper `hasLog(io, level, matcher)` pra asserts.

**Testes (5 arquivos, 24 testes):**
- `packages/cli/tests/refine-e2e.test.ts` (6 testes) — default mode end-to-end: backup+apply quando user aprova, reject preserva backup, empty answer vira `(sem resposta)`, interviewer aborted loga warn, done com diff vazio nao aplica, archetype ausente no config -> exit 1.

- `packages/cli/tests/refine-section.test.ts` (4 testes) — section filter: interviewer propoe diff de 3 arquivos mas so USER.md e tocado (mtime identico nos outros 6), STYLE single-file diff funciona, USER com diff que nao touch USER.md resulta em filtered vazio + no-op, MEMORY passa pelo mesmo invariante.

- `packages/cli/tests/refine-archetype-change.test.ts` (4 testes) — troca de archetype: `generic` flipa config.archetype + reescreve harness + preserva db/memory/agents/logs + secrets (botToken/dashboardToken/groqApiKey) preservados; reject no primeiro confirm -> zero mutacao; mesmo slug -> flow completa sem crashar; slug invalido -> exit 1 sem mutacao.

- `packages/cli/tests/refine-rollback.test.ts` (5 testes) — sem backups -> warn + no-op, single backup -> restore + pre-restore capturando estado vivo, reject confirm -> sem restore, restored harness NUNCA contem metadata.json (prune em restoreBackup), multiplos backups -> user escolhe v1 mais antigo + restore bate v1 + pre-restore captura v3.

- `packages/cli/tests/refine-preserves-data.test.ts` (5 testes) — invariante defensiva abrangendo 5 cenarios: default-apply/section-USER/reset/archetype=generic/default-reject. Cada cenario snapshot mtime de 9 arquivos protegidos (db/forgeclaw.db + memory/MEMORY.md + memory/DAILY + memory/projects + agents/*.json + logs/*.log + sessions/*.jsonl) antes, executa o flow, assert mtime identico + content byte-equal. Rollback excluido (opera em harness-backups/ por construcao).

### Modificados (2)

- `packages/cli/src/commands/refine.ts` — Refactor para injecao de dependencia. `refine(options, io?: RefineIO = defaultIO())` agora aceita IO; todas as chamadas `confirm/select/text/log.info/log.warn/...` dentro dos modes agora sao via `io.*`. `RefineOptions.forgeclawDir?` adicionado e threaded atraves de `createBackup`/`listBackups`/`restoreBackup`/`getCurrentArchetype`/`setArchetype`/`loadArchetypeTemplates`/`readCurrentHarness`. `recompile()` early-returns com info log quando `forgeclawDir` override esta setado. `defaultIO()` preserva comportamento exato de producao (clack prompts + console.log + intro/outro/spinner).

- `packages/cli/package.json` — adicionado `"test:refine": "bun test tests/refine-"` pra rodar os 8 arquivos refine em bloco (50 testes em ~4s).

## Tarefas Executadas

| # | Tarefa | Commit | Status |
|---|--------|--------|--------|
| 1 | refactor refine.ts + fixtures mock-interviewer/test-io | `1866c5e` | typecheck zero novos erros |
| 2 | refine-e2e.test.ts (6 testes) | `d9fc2a0` | 6/6 pass em 128ms |
| 3 | refine-section.test.ts (4 testes) | `d9bcf7c` | 4/4 pass em 223ms |
| 4 | refine-archetype-change.test.ts (4 testes) | `07dd70d` | 4/4 pass em 197ms |
| 5 | refine-rollback.test.ts (5 testes) | `dbd2499` | 5/5 pass em 2.34s |
| 6 | refine-preserves-data.test.ts (5 testes) | `e7ef853` | 5/5 pass em 406ms |
| 7 | package.json test:refine script | `708793a` | 50/50 em 3.98s via bun run |

## Criterios Atendidos

- [x] `bun test packages/cli/tests/refine-e2e.test.ts` passa (default apply + default reject + 4 edge cases)
- [x] `bun test packages/cli/tests/refine-section.test.ts` passa (so USER.md muda, filtragem de diff multi-file)
- [x] `bun test packages/cli/tests/refine-archetype-change.test.ts` passa (config+harness muda, protected files intactos)
- [x] `bun test packages/cli/tests/refine-rollback.test.ts` passa (rollback + pre-restore + no-backups warning + metadata prune)
- [x] `bun test packages/cli/tests/refine-preserves-data.test.ts` passa (5 modos testam invariante de preservacao)
- [x] `bun run --cwd packages/cli test:refine` executa todos os 8 arquivos refine (50/50 verdes em 3.98s)
- [x] `bunx tsc --noEmit -p packages/cli` passa (zero novos erros — apenas 8 pre-existentes em packages/core/runners/* + MemoryManager ambiguity)
- [x] Zero side effects entre testes (tmpdir per test, mock.restore + clearMockInterviewerScript em afterEach)
- [x] Todos os testes rodam em < 30 segundos total (24 novos em 3.98s, 115 totais da CLI em 13.06s)
- [x] `bun test packages/cli/tests/` 115/115 verdes (26 antigos + 24 novos + outros da CLI)
- [x] `bun run audit:personal:ci` PASS, 0 critical findings

## Verificacao Funcional Runtime

**Suite inteira da CLI:**
```
$ bun test packages/cli/tests/
115 pass, 0 fail, 760 expect() calls, 17 files, 13.06s
```

**Apenas testes de refine:**
```
$ bun run --cwd packages/cli test:refine
50 pass, 0 fail, 299 expect() calls, 8 files, 3.98s
```

**Apenas testes NOVOS do 28-03:**
```
$ bun test packages/cli/tests/refine-e2e.test.ts packages/cli/tests/refine-section.test.ts packages/cli/tests/refine-archetype-change.test.ts packages/cli/tests/refine-rollback.test.ts packages/cli/tests/refine-preserves-data.test.ts
24 pass, 0 fail, 230 expect() calls, 5 files
```

**Dashboard permanece saudavel durante os testes:**
```
$ curl -s -o /dev/null -w "%{http_code}" http://localhost:4040/api/onboarding/health
200
```

Testes passam `terminal: true` explicitamente pra bypassar probe do dashboard — mesmo com Next.js dev server rodando em 4040 durante a execucao, zero interferencia.

## Desvios do Plano

### Issues Auto-corrigidos

**1. [Regra 1 - Bug] `HarnessDiff` shape do plano nao existe no core atual**
- **Encontrado durante:** Tarefa 1
- **Issue:** O plano define `HarnessDiff` como `Record<string, {oldContent, newContent, changed}>` e `HarnessSection` como type. Esses shapes existiam em um protocol antigo, mas foram substituidos na Fase 26-01 por `{diffs: FileDiff[], summary: string}` com `FileDiff.ops: DiffOp[]` (append/replace/replace_section/set_placeholder). Nao existe mais `HarnessSection` em core (ha `HarnessFile` com `.md`). O plano tambem importa `HarnessSection` de `@forgeclaw/core`, o que causaria erro TS2305.
- **Correcao:** `MockInterviewer` emite o shape REAL (`{diffs, summary}`) usando `doneDiffForFile`/`doneDiffForFiles` helpers que constroem DiffOps. Ao inves de `HarnessSection`, uso `HarnessFile` (com `.md`) + o `RefineSection` local do refine.ts (sem `.md`).
- **Arquivos modificados:** `packages/cli/tests/fixtures/mock-interviewer.ts`
- **Commit:** `1866c5e`

**2. [Regra 1 - Bug] `process.env.HOME = tmpdir` nao isola testes em Bun**
- **Encontrado durante:** Tarefa 1, antes de escrever o primeiro teste
- **Issue:** O plano sugere `process.env.HOME = testHome` + `await import(...)` pra redirecionar `homedir()` pra um tmpdir. Validei empiricamente: Bun cacheia `homedir()` no inicio do processo via passwd entry, nao env. `HOME=/tmp bun -e 'homedir()'` retorna `/root` sempre. Esse mesmo bug foi documentado em STATE.md [27-01] e explicitamente corrigido em 28-01 com o padrao `forgeclawDir` override nos utils.
- **Correcao:** Refactor maior de `refine.ts` — adicionei `RefineOptions.forgeclawDir?: string` e threaded atraves de TODOS os helpers (`createBackup`/`listBackups`/`restoreBackup`/`getCurrentArchetype`/`setArchetype`/`loadArchetypeTemplates`/`readCurrentHarness`/`getHarnessDir`). Tests passam override explicito. Zero impacto pros callers reais de producao (omitem o parametro, cai no default `homedir()`). Mesmo padrao de `packages/cli/tests/install/phase-b-integration.test.ts`.
- **Arquivos modificados:** `packages/cli/src/commands/refine.ts`
- **Commit:** `1866c5e`

**3. [Regra 3 - Bloqueante] `Interviewer` nao tem API `mode: 'full'|'section'|'refinement'` + `run()`**
- **Encontrado durante:** Tarefa 1, design do MockInterviewer
- **Issue:** O plano constroi o mock assumindo `new Interviewer({archetype, mode, section, currentHarness})` + `await itv.run(): HarnessDiff`. O `Interviewer` REAL tem API conversacional: `new Interviewer({archetype, harnessDir})` + `await itv.start()` -> `InterviewResponse` + `await itv.answer(text)` -> `InterviewResponse` em loop ate `status=done`|`aborted`. Sem `mode`, sem `currentHarness`, sem `run()`. Mesmo blocker ja foi corrigido em 28-01 deviation #1.
- **Correcao:** `MockInterviewer` implementa a API real — constructor `(opts: InterviewerOptions)` + `start()` + `answer(text)` + `abort()` + `getState()`. Script de respostas pre-computado via `setMockInterviewerScript(InterviewResponse[])` consumido em ordem por cada call (1o call -> script[0], 2o call -> script[1], etc). Script past-the-end emite done com diff vazio pra evitar hang.
- **Arquivos modificados:** `packages/cli/tests/fixtures/mock-interviewer.ts`
- **Commit:** `1866c5e`

**4. [Regra 1 - Bug] `mock.module('@forgeclaw/core', () => { const actual = require(...) })` causa recursao**
- **Encontrado durante:** Tarefa 2, primeira run dos testes
- **Issue:** O plano sugere usar `require('@forgeclaw/core')` dentro do factory do `mock.module` pra pegar os exports reais. Mas `require()` dentro do factory bate no PROPRIO mock (que ainda nao foi totalmente instalado), devolvendo um modulo parcial. Resultado: primeira rodada falhou com `SyntaxError: export 'restoreBackup' not found in '@forgeclaw/core'` pros 6 testes do e2e.
- **Correcao:** Import o modulo real ANTES do mock.module via ESM static import (`import * as realCore from '@forgeclaw/core'` no topo do arquivo). O factory do mock usa `realCore` capturado (zero risk de recursao). Pattern replicado em todos os 4 arquivos que mockam o core.
- **Arquivos modificados:** `packages/cli/tests/refine-e2e.test.ts` (+ mesmo pattern preventivamente em section, archetype-change, preserves-data)
- **Commit:** `d9fc2a0` (fix aplicado antes do commit)

**5. [Regra 3 - Bloqueante] `compileHarness()` nao aceita forgeclawDir override**
- **Encontrado durante:** Tarefa 1, refactor de `recompile()`
- **Issue:** `compileHarness()` em `@forgeclaw/core/harness-compiler` resolve seu proprio `~/.forgeclaw/harness` via `homedir()`. Se eu chamasse em testes com tmpdir, ou: (a) crashava porque CLAUDE.md nao existia la, ou (b) poluia o harness REAL do Jonathan em `/root/.forgeclaw/harness/CLAUDE.md`. Adicionar override na API do compileHarness seria fora de escopo dessa fase.
- **Correcao:** `recompile()` agora checa `if (options.forgeclawDir) { io.log.info('CLAUDE.md recompile skipped (forgeclawDir override).'); return }`. Tests verificam arquivos de harness diretamente ao inves de dependerem do CLAUDE.md recompilado. Callers de producao (omitem forgeclawDir) pegam o comportamento normal.
- **Arquivos modificados:** `packages/cli/src/commands/refine.ts`
- **Commit:** `1866c5e`

**6. [Regra 3 - Bloqueante] Convencao de pasta de testes — plano usa `test/`, projeto usa `tests/`**
- **Encontrado durante:** Tarefa 1, criacao dos arquivos
- **Issue:** O plano especifica `packages/cli/test/` mas a convencao do projeto (confirmada por 28-01 deviation #5 + existencia de `packages/cli/tests/install/` e `packages/cli/tests/refine-*.test.ts` antigos) e `packages/cli/tests/`. Testes em `test/` seriam invisiveis pro `bun test packages/cli/tests/` que o CI e o `test:refine` script usam.
- **Correcao:** Todos os 5 arquivos de teste + fixtures criados em `packages/cli/tests/`. Script `test:refine` usa prefixo `tests/refine-`.
- **Arquivos modificados:** localizacao dos 5 arquivos de teste + 2 fixtures
- **Commit:** 1866c5e + d9fc2a0 + d9bcf7c + 07dd70d + dbd2499 + e7ef853

**7. [Regra 2 - Critico faltando] RefineIO/ScriptedIO precisam de `intro`/`outro`/`spinner`**
- **Encontrado durante:** Tarefa 1, primeira execucao
- **Issue:** Plano lista confirm/select/text/log/output mas refine.ts tambem chama `intro()`, `outro()` e `spinner()` do @clack/prompts diretamente. Sem esses no RefineIO, os testes falhariam em runtime com "intro is not a function" vazamento do clack.
- **Correcao:** RefineIO ganha `intro(title)`, `outro(message)` e `spinner?: () => {start/stop}` (opcional com fallback noop). `defaultIO()` delega pros originais. `createScriptedIO()` captura em `intros[]`/`outros[]` + spinner como noop. Cobre 100% da API de clack usada por refine().
- **Arquivos modificados:** `packages/cli/src/commands/refine.ts`, `packages/cli/tests/fixtures/test-io.ts`
- **Commit:** `1866c5e`

**8. [Regra 1 - Bug] `dev server rodando em 4040 durante tests faria refine() delegar pro dashboard**
- **Encontrado durante:** Inicio da Tarefa 2
- **Issue:** `refine()` sem `--terminal` probe `http://localhost:4040/api/onboarding/health` com timeout 1500ms. O Next dev server estava rodando em 4040 durante o desenvolvimento, entao testes que nao passassem `terminal: true` iam delegar pro dashboard e travar em `waitForCompletion` (30min timeout sentinel).
- **Correcao:** Todos os testes passam `terminal: true` explicitamente. Isso e a API de producao pra CI/remote shells; reuso aqui por simetria semantica.
- **Arquivos modificados:** Todos os arquivos de teste refine-*.test.ts do 28-03
- **Commit:** d9fc2a0 em diante

### Auth Gates

Nenhum — testes de CLI pura sem dependencia de credenciais externas.

### Issues Adiados (out-of-scope)

- 8 erros pre-existentes em `packages/core/src/runners/*` e `packages/core/src/index.ts` (ChildProcess typing, MemoryManager ambiguity) continuam fora de escopo desde as Fases 22-23, documentados em STATE.md.
- `compileHarness()` poderia ganhar parametro `forgeclawDir?` no futuro pra permitir que `recompile()` rode em tests. Nao urgent — tests verificam harness files diretamente e a invariante e provada.
- Test em Windows nao validado (apenas Linux). Os `0o600` chmod em refine-archetype teste ja foram feitos condicionais em 28-01, e nao adiciono novos invariantes plataforma-especificos.

## Self-Check: PASSOU

Verificacao dos claims do SUMMARY:

```
$ ls packages/cli/tests/fixtures/mock-interviewer.ts packages/cli/tests/fixtures/test-io.ts packages/cli/tests/refine-e2e.test.ts packages/cli/tests/refine-section.test.ts packages/cli/tests/refine-archetype-change.test.ts packages/cli/tests/refine-rollback.test.ts packages/cli/tests/refine-preserves-data.test.ts
ENCONTRADO: todos os 7 arquivos novos

$ git log --oneline | grep 28-03
ENCONTRADO: 1866c5e, d9fc2a0, d9bcf7c, 07dd70d, dbd2499, e7ef853, 708793a

$ bun test packages/cli/tests/refine-e2e.test.ts packages/cli/tests/refine-section.test.ts packages/cli/tests/refine-archetype-change.test.ts packages/cli/tests/refine-rollback.test.ts packages/cli/tests/refine-preserves-data.test.ts
ENCONTRADO: 24 pass, 0 fail

$ bun test packages/cli/tests/
ENCONTRADO: 115 pass, 0 fail, 760 expect() calls, 13.06s

$ bun run --cwd packages/cli test:refine
ENCONTRADO: 50 pass, 0 fail, 3.98s

$ bun run audit:personal:ci
ENCONTRADO: AUDIT PASS, 0 critical

$ bunx tsc --noEmit -p packages/cli (filtrando core)
ENCONTRADO: zero novos erros (apenas 8 pre-existentes em core/runners/* e MemoryManager)
```
