---
phase: 26-persona-entrevistador-forgeclaw
plan: 26-02
subsystem: packages/core/onboarding
tags: [engine, interviewer, budget, merger, harness-diff, claude-runner-reuse]
dependency_graph:
  requires:
    - "Fase 26-01: types.ts (InterviewResponse, HarnessDiff, DiffOp, InterviewState, BudgetConfig, DEFAULT_BUDGET, typed errors)"
    - "Fase 26-01: prompts.ts (loadInterviewerPrompt, extractJsonBlock, validateInterviewResponse)"
    - "packages/core/src/claude-runner.ts (reuso — uma instancia por turno, stateless)"
    - "packages/core/src/types.ts (StreamEvent)"
  provides:
    - "packages/core/src/onboarding/budget.ts: createBudgetTracker + BudgetTracker interface"
    - "packages/core/src/onboarding/merger.ts: applyDiff, previewDiff, applyOpToContent, applyOpsToContent, filterValidDiffs, MergeResult"
    - "packages/core/src/onboarding/interviewer.ts: class Interviewer (start/answer/abort/getState)"
    - "packages/core/src/onboarding/index.ts: barrel atualizado com exports de engine + merger + budget"
  affects:
    - "packages/core/tests/onboarding/budget.test.ts: 8 testes vitest"
    - "packages/core/tests/onboarding/merger.test.ts: 14 testes vitest"
tech-stack:
  added: []  # zero deps novas
  patterns:
    - "Classe com estado privado + getState() imutavel (snapshot via .map + spread)"
    - "Runner stateless (sem --resume) — contexto reconstruido via buildTurnPrompt a cada turno"
    - "Budget cutoff -> status 'aborted' graceful (nao rethrow pra caller)"
    - "Ops cirurgicas puras (applyOpToContent) separadas do I/O (applyDiff)"
    - "Rollback per-file: se qualquer op falha, arquivo original preservado no disco"
    - "Pre-flight HARNESS_FILES_ALL whitelist antes de tocar disco"
key-files:
  created:
    - "packages/core/src/onboarding/budget.ts (78 linhas)"
    - "packages/core/src/onboarding/merger.ts (179 linhas)"
    - "packages/core/src/onboarding/interviewer.ts (296 linhas)"
    - "packages/core/tests/onboarding/budget.test.ts (67 linhas)"
    - "packages/core/tests/onboarding/merger.test.ts (193 linhas)"
  modified:
    - "packages/core/src/onboarding/index.ts (+13 linhas — exports Interviewer/applyDiff/previewDiff/createBudgetTracker/etc)"
decisions:
  - "Uma instancia ClaudeRunner por turno (sem compartilhamento). Sessao e gerenciada pelo sessionId que o CLI devolve, mas o runner e stateless do ponto de vista do entrevistador"
  - "Nao usar --resume do Claude CLI. Historico reconstruido via InterviewTurn[] e passado como prompt unico via buildTurnPrompt. Garante reprodutibilidade e evita dependencia de cache lateral do CLI"
  - "Tokens coletados do evento 'done' (usage.input_tokens/output_tokens/cache_creation_input_tokens/cache_read_input_tokens). Se CLI nao entregar, assume 0 e deixa budget de turnos cortar"
  - "Budget cutoff (InterviewBudgetExceededError) vira status='aborted' com errorMessage — nao propaga excecao pro caller. Decisao: fluxo normal de cutoff e esperado, nao e bug"
  - "Merger nao cria arquivo inexistente — apenas skippedFiles. Criar harness do zero e job do installer (Fase 25), nao do entrevistador"
  - "Rollback por arquivo (nao por transacao global). Se file A aplica ok e file B falha, A permanece escrito. Racional: merge e de leitura humana, caller pode re-rodar apos corrigir B. Atomicidade global exigiria lockfile ou two-phase write, excesso de complexidade"
  - "replaceSection usa split('\\n').findIndex em vez de regex — tolerante a trimEnd mas exige match exato no inicio da linha. Impede que '## Intro' em bloco de codigo disparasse replace acidental"
  - "set_placeholder usa content.split(token).join(value) em vez de replace/regex — escape-safe para valores com $1, \\test, a.b, etc. Substitui TODAS as ocorrencias"
  - "append adiciona separador \\n\\n (paragrafo) quando necessario. Se conteudo termina com \\n\\n, nao duplica. Se termina com \\n, adiciona mais um. Se nao tem newline, adiciona \\n\\n completo"
  - "Interviewer.abort() idempotente — chamar duas vezes nao quebra. Abort apos done/aborted e no-op. Integracao com AbortSignal via addEventListener({once: true})"
  - "extractTextFromEvent so considera ev.type === 'text'. thinking/tool_use/result sao ignorados na construcao da resposta (mas poderiam ser expostos em onTurn callback no futuro)"
  - "Testes em vitest (nao bun:test) pra alinhar com padrao do core. Snapshot de budget imutavel validado via captura antes de incrementTurn — garante que .snapshot() retorna valor por valor, nao referencia mutavel"
metrics:
  duration: "~8 min de implementacao (5 commits) + ~2 min de finalizacao (SUMMARY + state) — executor anterior interrompido por rate limit antes do SUMMARY"
  completed: "2026-04-21"
  commits: 5
  tasks_completed: 6
  lines_added: 813
  files_created: 5
  files_modified: 1
---

# Fase 26 Plano 02: Motor, Budget e Merger do Entrevistador — Summary

Implementado o motor do Entrevistador ForgeClaw (`Interviewer`) mais os dois sub-modulos que ele orquestra: `BudgetTracker` (cutoff por turnos/tokens/tempo) e `merger` (aplicacao cirurgica do `HarnessDiff` nos arquivos fisicos do harness). Reutiliza 100% do `ClaudeRunner` existente da Fase 1. Zero deps novas. Suite vitest com 22 testes cobre budget (8) e merger (14) com 100% pass em 294ms.

## O que foi entregue

### 1. Budget Tracker (`budget.ts`, 78 linhas)

API publica:
- `createBudgetTracker(partial?: Partial<BudgetConfig>): BudgetTracker` — factory com override parcial sobre `DEFAULT_BUDGET`
- `BudgetTracker.incrementTurn()` — joga `InterviewBudgetExceededError({reason: 'max_turns'})` ao exceder
- `BudgetTracker.addTokens(input, output)` — acumula tokens, joga com reason `max_input_tokens` ou `max_output_tokens`
- `BudgetTracker.assertTime()` — check-on-demand de `timeoutMs`, reason `timeout`
- `BudgetTracker.snapshot()` — retorna `BudgetStatus` imutavel (novo objeto a cada chamada)
- `BudgetTracker.exceeded(): boolean` — true se qualquer limite ja estourou

Comportamento chave:
- Valores negativos em `addTokens` sao ignorados via `Math.max(0, x)` — defesa contra CLI que devolve underflow
- `cutoffReason` setado ANTES de throw — se o caller pega a excecao, proximas chamadas a snapshot() veem withinLimits=false
- Config preserva overrides parciais (ex: passar `{maxTurns: 4}` mantem os outros 3 limites default)

### 2. Merger (`merger.ts`, 179 linhas)

API publica:
- `applyDiff(harnessDir, diff): MergeResult` — escreve diff no disco, retorna relatorio
- `previewDiff(harnessDir, diff): MergeResult` — mesmo calculo, SEM `writeFileSync` (dry-run)
- `applyOpToContent(content, op): string` — aplicacao pura de UM op (sem I/O)
- `applyOpsToContent(content, ops[]): string` — aplicacao sequencial pura
- `filterValidDiffs(harnessDir, diff): HarnessDiff` — descarta diffs de arquivos ausentes
- Tipo `MergeResult` — `{ok, appliedFiles, skippedFiles: [{file, reason}], finalContents}`

4 operacoes cirurgicas:
- `append` — adiciona conteudo ao final com separador `\n\n` se necessario
- `replace` — substitui primeira ocorrencia de `find` por `replace`; joga `InterviewDiffValidationError` se `find` nao existe
- `replace_section` — substitui bloco H2 de `header` ate proximo `## ` ou EOF; `createIfMissing` controla fallback. Joga se header nao comeca com `## ` (H2)
- `set_placeholder` — substitui `{{key}}` em todas as ocorrencias via split+join (escape-safe vs regex)

Pre-flight e rollback:
- Arquivos fora de `HARNESS_FILES_ALL` entram em `skippedFiles` (razao: `not in HARNESS_FILES_ALL`)
- Arquivo inexistente em `harnessDir` entra em `skippedFiles` (razao: `file not found at <path>`)
- Erro em qualquer op do mesmo `FileDiff` ativa rollback: arquivo NAO e escrito, entra em skipped com razao `ops failed: <msg>`
- Arquivos anteriores ja escritos permanecem escritos (rollback por arquivo, nao por transacao)

### 3. Interviewer (`interviewer.ts`, 296 linhas)

Classe com ciclo de vida explicito:
- `new Interviewer({archetype, harnessDir, budget?, cwd?, model?, onTurn?, abortSignal?})` — monta runtime, instancia BudgetTracker, registra listener de abort
- `async start(): Promise<InterviewResponse>` — kickoff (envia KICKOFF_MESSAGE), valida que status === 'pending'
- `async answer(userMessage): Promise<InterviewResponse>` — adiciona turno user, roda turno interviewer, valida status === 'asking'
- `abort(reason?): void` — idempotente; chama `runner.abort()` se ativo, seta status='aborted'
- `getState(): InterviewState` — snapshot imutavel (turns clonados com spread)

Orquestracao de turno (`runTurn` privado):
1. `budget.incrementTurn()` + `budget.assertTime()` — cutoff vira `status='aborted'` + retorna `{status: 'aborted', reason}`
2. Status='thinking' + callback `onTurn`
3. `buildTurnPrompt(turns, userMessage)` — compila transcript com role+text em `<transcript>` + mensagem corrente em `<current_user_message>`
4. `ClaudeRunner.run(prompt, {cwd, systemPrompt, model})` — sem sessionId (stateless)
5. Loop async: coleta texto de `ev.type === 'text'`, captura `usage` em `ev.type === 'done'`, checa `abortSignal.aborted` a cada evento
6. `pushTurn({role: 'interviewer', text, tokens})` com metricas reais
7. `budget.addTokens(input, output)` — cutoff tambem vira `status='aborted'`
8. `extractJsonBlock(text)` + `validateInterviewResponse(json, raw)`; parse error -> `status='error'` + rethrow `InterviewResponseParseError`
9. Status atualizado baseado em `response.status` (asking|done|aborted)

Integracoes chave:
- NAO chama `applyDiff` — responsabilidade do caller apos `response.status === 'done'`
- NAO compartilha `ClaudeRunner` entre turnos (`new ClaudeRunner()` por turno, com try/finally limpando `currentRunner`)
- `AbortSignal` propagado DUAS vezes: constructor registra listener que chama `abort()`, e o loop async verifica `abortSignal.aborted` a cada event (defense in depth)

### 4. Barrel atualizado (`index.ts`, +13 linhas)

Exports 26-02 ativados preservando os da 26-01:

```typescript
// Engine + merger + budget (26-02)
export { Interviewer } from './interviewer';
export {
  applyDiff, previewDiff, applyOpToContent, applyOpsToContent,
  filterValidDiffs, type MergeResult,
} from './merger';
export { createBudgetTracker, type BudgetTracker } from './budget';
```

### 5. Suite de testes vitest (`tests/onboarding/`, 260 linhas)

**budget.test.ts (8 testes):**
1. Usa DEFAULT_BUDGET quando nenhum override
2. Aplica overrides parciais preservando outros defaults
3. Incrementa turnos ate max safely (sem crash)
4. Joga `InterviewBudgetExceededError` com `cutoffReason='max_turns'` no overflow
5. Joga com reason `max_input_tokens` ao exceder
6. Joga com reason `max_output_tokens` ao exceder
7. Ignora valores negativos (trata como 0)
8. Snapshot imutavel entre chamadas (s1.turnsUsed nao muta apos incrementTurn)

**merger.test.ts (14 testes):**
- append: 4 cenarios de separador (sem newline, com `\n`, com `\n\n`, string vazia)
- replace: sucesso na primeira ocorrencia + throw quando find ausente
- set_placeholder: todas as ocorrencias + safety com valor contendo regex chars (`$1`, `\\test`, etc)
- replace_section: substitui H2 existente ate proximo H2, preserva H2 posteriores
- replace_section: createIfMissing=true appenda quando nao encontra
- replace_section: throw quando createIfMissing=false
- replace_section: throw em header sem `## `
- applyOpsToContent: aplica ops em ordem (append + replace encadeados)
- applyDiff: escreve no disco via tmpdir + seed com 3 arquivos
- applyDiff: skip de arquivo inexistente (HEARTBEAT.md) + apply simultaneo de file existente
- applyDiff: rollback quando uma op de file falha (arquivo original preservado byte-a-byte)
- previewDiff: retorna finalContents mas disco permanece intacto

## Verificacao Funcional

### Testes vitest
```
bunx --bun vitest run packages/core/tests/onboarding/
```
Resultado: **22/22 passed (2 files) em 294ms**

### Typecheck
```
cd packages/core && bun run typecheck
```
Resultado: **zero erros em `packages/core/src/onboarding/**`**. Os 8 erros pre-existentes em `packages/core/src/runners/codex-cli-runner.ts`, `packages/core/src/runners/registry.ts` e o conflito de re-export de `MemoryManager` em `packages/core/src/index.ts` seguem out-of-scope (documentados no STATE.md e no deferred-items.md da Fase 24).

### Audit Personal Context
```
bun run audit:personal:ci
```
Resultado: **AUDIT PASS — 0 critical findings in distributed code.**

## Commits

| Tarefa | Commit  | Arquivos | Descricao |
|--------|---------|----------|-----------|
| 1 | 7240980 | budget.ts | BudgetTracker com cutoff por turnos/tokens/tempo, typed error com reason |
| 2 | 80712e4 | merger.ts | HarnessDiff merger com 4 ops cirurgicas, rollback per-file, skip seguro |
| 3 | ed81f44 | interviewer.ts | Classe Interviewer com budget-bounded turn loop + ClaudeRunner reuse |
| 4 | f8ee696 | index.ts | Barrel atualizado com exports 26-02 preservando 26-01 |
| 5 | 35ce6df | tests/onboarding/{budget,merger}.test.ts | Suite vitest 22/22 cobrindo cutoffs, 4 ops, skip, rollback, dry-run |
| 6 | — (validacao) | — | Typecheck + audit CI (sem arquivos modificados) |

## Desvios do Plano

**[Observacao - Execucao]** O executor anterior implementou todas as 6 tarefas e criou os 5 commits acima, mas bateu rate limit antes de escrever o SUMMARY.md e atualizar STATE.md/ROADMAP.md. Esta finalizacao apenas (1) re-validou arquivos e testes, (2) rodou typecheck e audit CI, (3) produziu este SUMMARY e atualizou STATE.md/ROADMAP.md. Nenhuma mudanca de codigo feita nesta etapa — os 5 commits de codigo + testes estao intactos desde o executor anterior.

Fora isso: **nenhum desvio** — plano executado exatamente como escrito.

Observacoes de implementacao:
- Tarefa 6 (typecheck) e validacao pura, nao gera commit proprio
- Commits do 26-02 ficaram intercalados com commits do 26-03 no git log (executou em paralelo), mas cada commit e atomico e escopo-clean

## Criterios de Sucesso

- [x] `packages/core/src/onboarding/budget.ts` exporta `createBudgetTracker` com cutoff por turnos/tokens/tempo
- [x] `packages/core/src/onboarding/merger.ts` implementa 4 operacoes de diff (append, replace, replace_section, set_placeholder)
- [x] `applyDiff` preserva arquivo original quando qualquer op falha (rollback por arquivo)
- [x] `previewDiff` retorna resultado SEM escrever em disco
- [x] `packages/core/src/onboarding/interviewer.ts` exporta classe `Interviewer` com `start`, `answer`, `abort`, `getState`
- [x] `Interviewer` usa ClaudeRunner existente (sem spawn paralelo proprio)
- [x] Orcamento de tokens coletado do evento `done` e acumulado no BudgetTracker
- [x] Cutoff de budget vira `status: 'aborted'` sem crashar
- [x] `InterviewState` preserva todos os turnos (role, text, tokens) para replay/audit
- [x] Barrel `packages/core/src/onboarding/index.ts` exporta Interviewer, applyDiff, previewDiff, createBudgetTracker, tipos
- [x] Typecheck do core verde nos arquivos do onboarding
- [x] Testes de budget e merger rodam verdes em vitest (22/22)

## Issues Fora de Escopo (nao-acao)

- `packages/core/src/runners/codex-cli-runner.ts` (5 erros TS pre-existentes — ChildProcess type)
- `packages/core/src/runners/registry.ts` (3 erros TS pre-existentes — ChildProcessByStdio type)
- `packages/core/src/index.ts` (TS2308 conflito MemoryManager entre `./memory-manager` e `./memory` — pre-existente)

Nenhum deles foi introduzido ou tocado por este plano.

## Proximas Acoes

Fase 26-04 (testes do motor) ja tem tudo que precisa:
- `Interviewer` com `getState()` expoe `turns` + `budget` para asserts de orcamento
- `onTurn` callback permite capturar snapshots em fixtures de conversa
- `previewDiff` permite assertar `finalContents` sem tocar disco
- `validateHarnessDiff` da 26-01 + `applyDiff` da 26-02 fecham o loop de validacao E2E
- Scripts por arquetipo da 26-03 ja existem em `packages/core/src/onboarding/scripts/` — fixtures de conversa por perfil podem usar `loadInterviewerPrompt(slug)` e esperar diff coerente com os topicos do script

Fase 27 (dashboard first-run onboarding) consome direto:
- `Interviewer` instanciado no backend Next.js api route
- `response.nextQuestion` -> bolha de chat
- `response.harnessDiff` (quando `status='done'`) -> `previewDiff` + UI "antes/depois" + `applyDiff` no confirm

Fase 28 (`forgeclaw refine`):
- Reutiliza `Interviewer` com `harnessDir` apontando pra `~/.forgeclaw/harness/` existente
- `applyDiff` re-escreve arquivos preservando customizacoes via `replace_section`/`set_placeholder` cirurgico

## Self-Check: PASSOU

- [x] `packages/core/src/onboarding/budget.ts` existe (78 linhas, `createBudgetTracker` exportado)
- [x] `packages/core/src/onboarding/merger.ts` existe (179 linhas, `applyDiff`/`previewDiff`/`applyOpToContent`/`applyOpsToContent`/`filterValidDiffs` exportados)
- [x] `packages/core/src/onboarding/interviewer.ts` existe (296 linhas, `class Interviewer` com `start`/`answer`/`abort`/`getState`)
- [x] `packages/core/src/onboarding/index.ts` re-exporta `Interviewer`, `applyDiff`, `previewDiff`, `createBudgetTracker`, `MergeResult`, `BudgetTracker`
- [x] `packages/core/tests/onboarding/budget.test.ts` existe (67 linhas, 8 testes)
- [x] `packages/core/tests/onboarding/merger.test.ts` existe (193 linhas, 14 testes)
- [x] Commits 7240980, 80712e4, ed81f44, f8ee696, 35ce6df presentes no git log
- [x] Typecheck: zero erros em `onboarding/`
- [x] Vitest: 22/22 passed em 294ms
- [x] Audit CI: PASS (0 critical findings)
