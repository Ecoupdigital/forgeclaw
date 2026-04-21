---
phase: 26-persona-entrevistador-forgeclaw
plan: 26-04
subsystem: packages/core/tests/onboarding
tags: [testing, vitest, mock, fixtures, interviewer, validators, integration]
dependency_graph:
  requires:
    - "Fase 26-01: prompts.ts (extractJsonBlock, validateInterviewResponse, validateHarnessDiff, validateDiffOp, loadInterviewerPrompt/Base/Script, VALID_PLACEHOLDER_KEYS, _resetPromptCache)"
    - "Fase 26-01: types.ts (InterviewResponse, HarnessDiff, DiffOp, typed errors)"
    - "Fase 26-02: interviewer.ts (class Interviewer com start/answer/abort/getState)"
    - "Fase 26-02: merger.ts (applyDiff)"
    - "Fase 26-02: budget.ts (createBudgetTracker)"
    - "Fase 26-03: scripts/<slug>.md (5 scripts com header 'Roteiro:')"
  provides:
    - "packages/core/tests/onboarding/prompts.test.ts: 35 testes unitarios cobrindo extractor + 3 validators + loader"
    - "packages/core/tests/onboarding/interviewer.test.ts: 6 testes de integracao com mock determinístico do ClaudeRunner"
    - "packages/core/tests/onboarding/fixtures/*.json: 4 fixtures de conversa cobrindo happy/budget/abort/malformed"
    - "Suite onboarding completa verde: 63/63 testes em <300ms"
  affects:
    - "CI: vitest run packages/core/tests/onboarding/ agora tem 63 testes (antes: 22)"
tech-stack:
  added: []  # zero deps novas
  patterns:
    - "vi.mock('../../src/claude-runner') com queue-driven mock class (stateless, injetavel)"
    - "Fixture-as-data: conversas em JSON consumidas pelo teste via readFileSync + shift()"
    - "it.each(slugs) para parametrizar testes por arquetipo (5 slugs x 2 testes = 10 execucoes)"
    - "AsyncGenerator mock: yield {type:'text', data:{text}} + yield {type:'done', data:{usage}}"
    - "Harness seed helper (seedHarness) gera 7 .md em tmpdir por beforeEach — isolado por teste"
key-files:
  created:
    - "packages/core/tests/onboarding/prompts.test.ts (218 linhas, 35 testes)"
    - "packages/core/tests/onboarding/interviewer.test.ts (247 linhas, 6 testes)"
    - "packages/core/tests/onboarding/fixtures/content-creator-happy.json (21 linhas)"
    - "packages/core/tests/onboarding/fixtures/solo-builder-budget-exceeded.json (23 linhas)"
    - "packages/core/tests/onboarding/fixtures/generic-abort.json (11 linhas)"
    - "packages/core/tests/onboarding/fixtures/malformed-response.json (10 linhas)"
  modified: []
decisions:
  - "Mock module-level com queue (mockResponseQueue) em vez de fn-per-test — teste fica declarativo: 'para esse fixture, empurra N respostas na queue', e o Interviewer consome naturalmente"
  - "__setNextResponse/__resetMock expostos como top-level (nao via window) — funcoes simples, acessiveis so dentro do arquivo de teste via closure sobre a queue"
  - "vi.mock ANTES de qualquer import do Interviewer — ordem critica, senao vitest nao substitui o modulo. Comentario explicito no codigo documenta a razao"
  - "Fixtures em JSON (nao TypeScript) — permite editar sem recompilar, legivel por tooling externo, alinha com plano 26-04 escrito"
  - "AsyncGenerator do mock retorna 2 eventos sempre (text + done) — matching minimo do StreamEvent real. Outros tipos (thinking/tool_use/tool_result) sao ignorados pelo extractTextFromEvent do Interviewer entao nao sao simulados"
  - "Teste de budget usa expect(['asking','aborted']).toContain(...) para tolerar 2 semanticas possiveis: cutoff no turno 2 OU turno 3. A implementacao atual incrementTurn() incrementa ENTAO checa `turnsUsed > maxTurns`, entao maxTurns=2 permite 2 turnos e aborta o 3o. O teste aceita ambos os comportamentos, validando apenas que termina em aborted"
  - "seedHarness cria 7 arquivos .md mesmo que o diff so toque USER.md — mantem harness realistico, simplifica teste futuro de diff multi-arquivo sem tocar no helper"
  - "applyDiff com ops set_placeholder realmente substitui {{userName}} e {{company}} no USER.md temporario — assert no conteudo final byte-a-byte ('nome: Ana', 'empresa: Acme') prova que a cadeia Interviewer -> Response -> applyDiff -> disk funciona end-to-end"
  - "Fixture malformed-response tem modelResponse='desculpe, esqueci o formato...' — texto que nao parseia como JSON. extractJsonBlock cai no fallback JSON.parse(raw.trim()) e retorna null; validateInterviewResponse entao joga InterviewResponseParseError porque recebe null (falha 'not an object'). Rejection flow validado"
  - "Teste de abort() valida idempotencia implicita via verificacao do errorMessage — o plano nao exigia teste de abort 2x, entao nao adicionado (evita overtesting)"
  - "getState() retorna objeto novo a cada chamada (expect(s1).not.toBe(s2)) — valida o spread/map defensive no Interviewer.getState(). Garante que consumidores externos (Fase 27 dashboard) nao podem mutar estado interno acidentalmente"
  - "Reporter 'basic' do vitest 4.1.3 nao existe mais — causa ERR_LOAD_URL. Uso de reporter default funciona. Plano tinha '--reporter=basic' mas e ignoravel — o que importa e exit code e count de Tests passed"
metrics:
  duration: "~6 min (3 tarefas com commit, 2 de validacao)"
  completed: "2026-04-21"
  commits: 3
  tasks_completed: 5
  lines_added: 530
  files_created: 6
  files_modified: 0
---

# Fase 26 Plano 04: Testes do Entrevistador — Summary

Fechada a cobertura de testes da Fase 26. A suite `packages/core/tests/onboarding/` passa de 22 testes (budget + merger da 26-02) para **63 testes (4 arquivos)** rodando em **264ms** — totalmente deterministica, sem depender do claude CLI real. O motor `Interviewer` agora tem prova end-to-end via fixtures JSON que simulam conversas reais: happy path com diff aplicado em USER.md byte-a-byte, budget cutoff disparando `aborted`, modelo emitindo `aborted` sendo propagado, e resposta malformada rejeitada com `InterviewResponseParseError`.

## O que foi entregue

### 1. `prompts.test.ts` (218 linhas, 35 testes)

Testes unitarios puros do loader + validators do modulo `prompts.ts`:

- **`extractJsonBlock`** (5 testes): bloco fenced ```json, bloco invalido, fallback bare JSON, sem JSON, primeiro bloco quando ha multiplos
- **`validateInterviewResponse`** (8 testes): 3 status validos (asking/done/aborted) + 5 rejections tipadas (missing status, unknown status, asking sem nextQuestion, done sem summary, aborted sem reason)
- **`validateHarnessDiff`** (4 testes): empty diffs array ok, missing summary rejeita, file fora de HARNESS_FILES_ALL rejeita, non-array ops rejeita
- **`validateDiffOp`** (7 testes): 4 ops validas (append, replace, replace_section com H2, set_placeholder com cada uma das 6 keys validas) + 3 rejections (H3 em replace_section, key invalida em set_placeholder, op desconhecida)
- **`loadInterviewerPrompt/loadInterviewerBase/loadScript`** (11 testes via `it.each`): loadInterviewerBase nao crasha + contem 'ForgeClaw Interviewer'; loadInterviewerPrompt(slug) para os 5 arquetipos concatena base + script com separador '\n\n---\n\n' e contem 'Roteiro:'; loadScript(slug) retorna string >100 chars para cada slug

### 2. 4 Fixtures JSON (`tests/onboarding/fixtures/`)

Cada fixture define conversa completa com archetype + turns[]. Cada turn tem `userInput`, `modelResponse` (texto bruto com bloco ```json```) e `tokens`.

- **`content-creator-happy.json`**: 3 turns simulando entrevistador perguntando nome -> marca -> emitindo done com set_placeholder(userName=Ana, company=Acme) em USER.md
- **`solo-builder-budget-exceeded.json`**: budget `maxTurns=2`, fixture tem 3 turns mas so as 2 primeiras sao consumidas — a 3a seria aborted automatico por cutoff
- **`generic-abort.json`**: 1 turn, entrevistador emite status='aborted' direto no kickoff ('Usuario pediu para sair antes de iniciar')
- **`malformed-response.json`**: 1 turn, modelResponse e texto livre sem bloco JSON — forca `InterviewResponseParseError` no pipeline do Interviewer

### 3. `interviewer.test.ts` (247 linhas, 6 testes)

Teste de integracao da classe `Interviewer` com mock determinístico do `ClaudeRunner`:

**Estrategia de mock:**
- `vi.mock('../../src/claude-runner', () => ({ ClaudeRunner: ... }))` substitui a classe real globalmente
- `ClaudeRunner.run()` mock consome proxima entrada de `mockResponseQueue[]` e emite 2 eventos: `{type:'text', data:{text}}` e `{type:'done', data:{usage}}`
- Helper `__setNextResponse(r)` empurra na queue; `__resetMock()` limpa entre testes
- **Critico:** import do `Interviewer` vem APOS `vi.mock` para garantir substituicao

**Os 6 testes:**

1. **Happy path** — 3 turnos do fixture `content-creator-happy`. Valida: r1/r2 asking, r3 done, `applyDiff` aplica `{{userName}}->Ana` e `{{company}}->Acme` em USER.md (lido de disco apos merge), `state.status='done'`, turns >= 4, finalDiff not null
2. **Budget exceeded** — fixture `solo-builder-budget-exceeded` com `{maxTurns: 2}`. Valida: primeiro turn asking, segundo/terceiro dispara `aborted` com `cutoffReason='max_turns'`, `budget.withinLimits=false`. Aceita 2 semanticas de incrementacao via `expect(['asking','aborted']).toContain(r2.status)`
3. **Model-emitted aborted** — fixture `generic-abort`. Valida: modelo retorna `{status:'aborted', reason:'...sair...'}`, interview termina limpa sem crash, `state.status='aborted'`
4. **Malformed response** — fixture `malformed-response`. Valida: `itv.start()` rejeita com `InterviewResponseParseError`, `state.status='error'` pos-rejection
5. **abort() externo** — liga um asking normal, chama `itv.abort('user-initiated')`, verifica `state.status='aborted'` e `state.errorMessage` contem a razao
6. **Imutabilidade de snapshots** — 2 chamadas consecutivas a `getState()` retornam objetos diferentes (`.not.toBe()`) e `state.turns` sao deep-copied

## Verificacao Funcional

### Suite completa
```
bunx --bun vitest run packages/core/tests/onboarding/
```
Resultado: **Test Files  4 passed (4) | Tests  63 passed (63) | Duration  264ms**

Breakdown:
- `budget.test.ts`: 8 testes (26-02)
- `merger.test.ts`: 14 testes (26-02)
- `prompts.test.ts`: 35 testes (novo, 26-04)
- `interviewer.test.ts`: 6 testes (novo, 26-04)

### Smoke test manual das fixtures (pre-commit)
```
bun -e "extractJsonBlock/validateInterviewResponse em cada turn das 4 fixtures"
```
Todas as fixtures (exceto malformed por design) produzem `status` valido ao passar pelo parser real do `prompts.ts`. `malformed-response` retorna null (esperado).

### Typecheck
```
bunx tsc --noEmit -p packages/core/tsconfig.json
```
**Zero erros em `packages/core/src/onboarding/` e `packages/core/tests/onboarding/`**. Os 8 erros em `packages/core/src/runners/*` e `packages/core/src/index.ts` (conflito MemoryManager) seguem pre-existentes e out-of-scope (documentados desde 26-01).

### Audit Personal Context CI
```
bun run audit:personal:ci
```
Resultado: **AUDIT PASS — 0 critical findings in distributed code.**

Fixtures e testes usam apenas nomes genericos (Ana, Acme, Bob) — mesmo set ja aprovado nos exemplos de `interviewer.md`.

## Commits

| Tarefa | Commit  | Arquivos | Descricao |
|--------|---------|----------|-----------|
| 1 | 4607d80 | prompts.test.ts | Testes unitarios: extractor (5) + validators (8+4+7) + loader (11 via it.each em 5 slugs) |
| 2 | 6eb02cd | fixtures/*.json (4 arquivos) | Conversas sinteticas: happy/budget/abort/malformed |
| 3 | 151c5e3 | interviewer.test.ts | Integracao com vi.mock('../../src/claude-runner') — 6 testes cobrindo happy/budget/abort/parse-error/manual-abort/immutability |
| 4 | — (validacao) | — | Smoke test da suite completa: 63/63 verde em 264ms (sem arquivos modificados) |
| 5 | — (validacao) | — | Typecheck do core: 0 erros em onboarding/. Audit CI: PASS (sem arquivos modificados) |

## Desvios do Plano

### Issues Auto-corrigidos

**1. [Regra 3 - Ferramenta] Vitest reporter 'basic' obsoleto em v4.1.3**
- **Encontrado durante:** Tarefa 1 (primeiro `vitest run`)
- **Issue:** O plano usa `--reporter=basic` nos verify commands, mas vitest 4.1.3 (versao instalada no workspace) nao reconhece mais `basic` — retorna `ERR_LOAD_URL` com stacktrace do vite
- **Correcao:** Rodei sem `--reporter=basic` (usa default). Output mostra `Test Files X passed (Y)` + `Tests N passed (M)` — suficiente para interpretar sucesso.
- **Arquivos modificados:** Nenhum (apenas comando interno do executor)
- **Commit:** — (mudanca de procedimento, nao de codigo)

**2. [Regra 3 - Workdir] Vitest exige rodar da raiz do monorepo**
- **Encontrado durante:** Tarefa 1 (`cd packages/core && vitest run tests/onboarding/`)
- **Issue:** Rodando de `packages/core/`, vitest nao encontra arquivos — o `include` do config e `packages/*/tests/**/*.test.ts` resolvido da raiz. Retorna `No test files found, exiting with code 1`
- **Correcao:** Rodei todos os vitest runs da raiz do repo (`cd /home/projects/ForgeClaw && bunx --bun vitest run packages/core/tests/onboarding/...`). Mantem contrato com o monorepo.
- **Arquivos modificados:** Nenhum
- **Commit:** — (mudanca de procedimento)

Fora isso: plano executado exatamente como escrito. Nenhuma mudanca de codigo fora de escopo.

## Criterios de Sucesso

- [x] `prompts.test.ts` cobre extractJsonBlock (5 casos), validateInterviewResponse (8 casos), validateHarnessDiff (4 casos), validateDiffOp (todas as 4 ops + invalidos, 7 casos), loadInterviewerPrompt/loadScript (5 slugs x 2 = 10 casos + loadInterviewerBase)
- [x] `budget.test.ts` cobre cutoff por turnos, input tokens, output tokens, snapshot imutavel (ja existia de 26-02, mantido)
- [x] `merger.test.ts` cobre 4 ops + applyDiff/previewDiff com rollback (ja existia de 26-02, mantido)
- [x] `interviewer.test.ts` roda Interviewer end-to-end com mock do ClaudeRunner usando as 4 fixtures
- [x] `content-creator-happy.json` prova: conversa em 3 turnos, diff final aplica em USER.md de verdade (validado via readFileSync apos applyDiff)
- [x] `solo-builder-budget-exceeded.json` prova: maxTurns=2 vira `aborted` com cutoffReason `max_turns`
- [x] `generic-abort.json` prova: modelo emite aborted, estado propaga para `state.status='aborted'`
- [x] `malformed-response.json` prova: sem JSON no output -> `InterviewResponseParseError`
- [x] `vitest run packages/core/tests/onboarding/` roda verde (0 failures) — 63/63 em 264ms
- [x] `bun tsc --noEmit -p packages/core/tsconfig.json` sem erros em `onboarding/`
- [x] `bun run audit:personal:ci` PASS

## Issues Fora de Escopo (nao-acao)

- `packages/core/src/runners/codex-cli-runner.ts` (5 erros TS pre-existentes — Fase 25)
- `packages/core/src/runners/registry.ts` (3 erros TS pre-existentes — Fase 25)
- `packages/core/src/index.ts` (TS2308 conflito MemoryManager entre `./memory-manager` e `./memory` — pre-existente desde Fase 21)

Nenhum deles foi introduzido por este plano. Documentados desde 26-01. Acao pendente: plano proprio de cleanup de types dos runners.

## Proximas Acoes

**Fase 26 COMPLETA.** 4/4 planos fechados com SUMMARY. Persona Entrevistador ForgeClaw funcional end-to-end:
- 26-01: protocolo tipado + system prompt fixo + validators
- 26-02: motor + budget + merger (22 testes)
- 26-03: 5 scripts por arquetipo
- 26-04: 41 testes novos (35 prompts + 6 interviewer) + 4 fixtures = **63 testes total na suite onboarding**

**Proximo:** Fase 27 (dashboard first-run onboarding) — ja pode consumir:
- `Interviewer` instanciado no backend Next.js (mock do ClaudeRunner ja provou contrato)
- `response.nextQuestion` -> bolha de chat no UI
- `response.harnessDiff` -> `previewDiff` para UI "antes/depois" + `applyDiff` no confirm
- Fixtures deste plano podem virar seed de demo/preview pro dashboard sem precisar de claude real

**Fase 28 (refine):** `forgeclaw refine` reutiliza `Interviewer` com `harnessDir` apontando pra `~/.forgeclaw/harness/` existente. Mock pattern do 26-04 e aproveitavel para cobertura de regressao.

## Self-Check: PASSOU

- [x] `packages/core/tests/onboarding/prompts.test.ts` existe (218 linhas, 35 testes)
- [x] `packages/core/tests/onboarding/interviewer.test.ts` existe (247 linhas, 6 testes)
- [x] `packages/core/tests/onboarding/fixtures/content-creator-happy.json` existe (JSON valido)
- [x] `packages/core/tests/onboarding/fixtures/solo-builder-budget-exceeded.json` existe (JSON valido)
- [x] `packages/core/tests/onboarding/fixtures/generic-abort.json` existe (JSON valido)
- [x] `packages/core/tests/onboarding/fixtures/malformed-response.json` existe (JSON valido)
- [x] Commits 4607d80, 6eb02cd, 151c5e3 presentes no git log
- [x] Vitest: 63/63 passed em 264ms (4 Test Files)
- [x] Typecheck: zero erros em onboarding/
- [x] Audit CI: PASS (0 critical findings)
