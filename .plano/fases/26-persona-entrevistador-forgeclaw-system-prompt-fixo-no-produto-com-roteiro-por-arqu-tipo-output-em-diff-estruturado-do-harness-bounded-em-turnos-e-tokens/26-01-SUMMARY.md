---
phase: 26-persona-entrevistador-forgeclaw
plan: 26-01
subsystem: packages/core/onboarding
tags: [protocol, types, system-prompt, interviewer, harness-diff, validators]
dependency_graph:
  requires:
    - "Fase 24: packages/cli/src/templates/archetypes (ArchetypeSlug + ARCHETYPE_FILES compativeis)"
    - "packages/core/src/claude-runner.ts (infra de spawn — reuso em 26-02)"
    - "packages/core/src/harness-compiler.ts (ordem canonica HARNESS_FILES)"
  provides:
    - "packages/core/src/onboarding/types.ts: InterviewResponse, HarnessDiff, DiffOp, InterviewState, BudgetConfig"
    - "packages/core/src/onboarding/interviewer.md: system prompt fixo (versionado no repo)"
    - "packages/core/src/onboarding/prompts.ts: loadInterviewerPrompt, extractJsonBlock, validateInterviewResponse, validateHarnessDiff, validateDiffOp"
    - "packages/core/src/onboarding/index.ts: barrel publico"
    - "VALID_PLACEHOLDER_KEYS: whitelist de 6 chaves de placeholder"
  affects:
    - "packages/core/src/index.ts: adicionado `export * from './onboarding'`"
tech-stack:
  added: []  # zero deps novas
  patterns:
    - "Discriminated unions por `status`/`op` para protocolo tipado"
    - "Typed errors (InterviewResponseParseError/InterviewBudgetExceededError/InterviewDiffValidationError)"
    - "Cache module-level com _resetPromptCache() para testes"
    - "ESM + CJS fallback para __dirname via import.meta.url"
key-files:
  created:
    - "packages/core/src/onboarding/types.ts (239 linhas)"
    - "packages/core/src/onboarding/interviewer.md (128 linhas)"
    - "packages/core/src/onboarding/prompts.ts (221 linhas)"
    - "packages/core/src/onboarding/index.ts (43 linhas)"
    - "packages/core/src/onboarding/README.md (112 linhas)"
  modified:
    - "packages/core/src/index.ts (+1 linha — barrel export)"
decisions:
  - "System prompt versionado em arquivo .md separado (nao inline em string TS) — permite edicao/review sem recompilar types, e o grep-friendly"
  - "InterviewResponse discriminado por `status` (asking|done|aborted) em vez de 2-3 campos opcionais — forca narrowing no TS e elimina estados ambiguos"
  - "4 DiffOp cirurgicas (append, replace, replace_section, set_placeholder) em vez de overwrite de arquivo inteiro — garante que template base do arquetipo permanece funcional mesmo com diff vazio"
  - "Whitelist de 6 placeholder keys (userName/company/role/workingDir/vaultPath/timezone) validada em validateDiffOp — qualquer outro joga InterviewDiffValidationError. `today` e injecao automatica (nao emitivel pelo entrevistador)"
  - "replace_section.header exige prefixo `## ` (H2) — impede que entrevistador troque H1 (identidade do arquivo) ou H3 (sub-secoes que podem depender de contexto)"
  - "Zero deps externas — usa node:fs/node:path/node:url/Bun runtime. Compativel com o padrao restante do @forgeclaw/core"
  - "Cache do interviewer.md e dos scripts e module-level e imutavel em runtime (prompt nao muda apos boot). `_resetPromptCache()` exposto apenas para testes"
  - "extractJsonBlock tem fallback de parse direto (sem fence) — protege contra modelos que as vezes omitem a fence markdown"
  - "DEFAULT_BUDGET = 30 turnos / 80k input / 20k output / 15min. Derivado da analise de sessao tipica: maioria das entrevistas reais deve fechar em <10 trocas, mas o teto generoso evita abortar por ruido de tokenizacao"
metrics:
  duration: "~15 min (7 tarefas, execucao sequencial)"
  completed: "2026-04-21"
  commits: 6
  tasks_completed: 7
  lines_added: 744
  files_created: 5
  files_modified: 1
---

# Fase 26 Plano 01: Protocolo, Tipos e System Prompt do Entrevistador — Summary

Criado o arcabouco tipado completo do Entrevistador ForgeClaw em `packages/core/src/onboarding/`: contrato de protocolo (`types.ts`), system prompt fixo versionado (`interviewer.md`), loader + validators (`prompts.ts`), barrel (`index.ts`) e documentacao (`README.md`). Este plano estabelece os contratos que o motor (26-02) e os scripts por arquetipo (26-03) vao consumir sem string-passing fragil — todo fluxo de dados passa por `InterviewResponse` discriminado, `HarnessDiff` cirurgico e errors tipados.

## O que foi entregue

### 1. Protocolo tipado (`types.ts`, 239 linhas)

Tipos centrais:
- `HarnessFile` + `HARNESS_FILES_ALL` — whitelist dos 7 arquivos de harness (SOUL/USER/AGENTS/TOOLS/MEMORY/STYLE/HEARTBEAT)
- `ArchetypeSlug` — mesmo set dos 5 arquetipos da Fase 24 (solo-builder/content-creator/agency-freela/ecom-manager/generic)
- `InterviewTurn` — turno unitario com tokens opcionais
- `DiffOp` — union discriminado por `op`: `append | replace | replace_section | set_placeholder`
- `FileDiff` + `HarnessDiff` — estrutura de mudancas cirurgicas com resumo humano
- `BudgetConfig` + `BudgetStatus` — tetos de turnos/tokens/tempo com reason codes de cutoff
- `InterviewState` + `InterviewStatus` — maquina de estados da sessao (pending/asking/thinking/done/aborted/error)
- `InterviewResponse` — discriminado por `status`: `asking | done | aborted`
- `InterviewerOptions` — config de runner com `onTurn` callback + `abortSignal`
- `DEFAULT_BUDGET` — 30 turnos / 80k input / 20k output / 15min
- Erros tipados: `InterviewResponseParseError`, `InterviewBudgetExceededError`, `InterviewDiffValidationError`

### 2. System prompt fixo (`interviewer.md`, 128 linhas)

Versionado no repo, nao customizavel pelo usuario. Define:
- Persona do Entrevistador ForgeClaw (escopo restrito a onboarding)
- 7 regras inegociaveis: uma pergunta por vez, max 12 perguntas, nunca inventar, diff cirurgico, respeitar template, output JSON obrigatorio
- 3 exemplos completos de output JSON (asking/done/aborted)
- Semantica das 4 operacoes de diff
- Whitelist explicita de 6 placeholder keys
- Lista exata dos 7 arquivos de harness permitidos
- Self-check checklist antes de emitir resposta

### 3. Loader + validators (`prompts.ts`, 221 linhas)

API publica:
- `loadInterviewerPrompt(slug)` — concatena `interviewer.md + "\n\n---\n\n" + scripts/<slug>.md` (script opcional via 26-03)
- `loadInterviewerBase()` — apenas o prompt base (com cache module-level)
- `loadScript(slug)` — apenas o script do arquetipo (null se nao existe)
- `extractJsonBlock(raw)` — extrai primeiro bloco fenced ` ```json ... ``` ` com fallback de parse direto
- `validateInterviewResponse(obj)` — valida shape, joga `InterviewResponseParseError` com `raw` preservado
- `validateHarnessDiff(obj)` — valida cada `FileDiff`, rejeita arquivos fora de `HARNESS_FILES_ALL`
- `validateDiffOp(obj)` — valida shape por tipo de operacao, rejeita `set_placeholder` fora de `VALID_PLACEHOLDER_KEYS`, rejeita `replace_section` sem prefixo H2
- `VALID_PLACEHOLDER_KEYS` — whitelist exportada (single source of truth)
- `_resetPromptCache()` — util de teste

### 4. Barrel (`index.ts`, 43 linhas)

Re-exporta 100% da superficie publica. Placeholders comentados para exports da 26-02 (Interviewer/applyDiff/createBudgetTracker).

### 5. README (`README.md`, 112 linhas)

Documenta: arquitetura do diretorio, protocolo de turnos, semantica de HarnessDiff, defaults de budget, regras imutaveis, auditoria via `InterviewState`, integracoes com Fase 27 (dashboard onboarding) e Fase 28 (`forgeclaw refine`), exemplo de uso preview do motor.

### 6. Integracao com core barrel

Adicionado `export * from './onboarding'` em `packages/core/src/index.ts` — consumidores downstream (packages/cli, packages/bot, packages/dashboard) ja podem importar do `@forgeclaw/core`.

## Verificacao Funcional

Runtime smoke test via `bun -e`: 15 checks passaram.

1. `loadInterviewerBase()` carrega os 5168 chars do prompt com marker correto
2. `loadInterviewerPrompt('generic')` retorna base + warn (sem script — 26-03 fornece)
3. `extractJsonBlock` funciona com fence
4. `extractJsonBlock` funciona com fallback bare-json
5. `extractJsonBlock` retorna null em texto sem JSON
6-8. `validateInterviewResponse` aceita os 3 status (asking/done/aborted)
9. Rejeita `asking` sem `nextQuestion` via `InterviewResponseParseError`
10. Rejeita `HarnessDiff` com arquivo fora da whitelist via `InterviewDiffValidationError`
11. Rejeita `set_placeholder` com key fora de `VALID_PLACEHOLDER_KEYS`
12. Rejeita `replace_section` com header nao-H2
13. Aceita todas as 6 keys validas de placeholder
14. `HARNESS_FILES_ALL.length === 7`
15. `DEFAULT_BUDGET` = `{ maxTurns: 30, maxInputTokens: 80_000, maxOutputTokens: 20_000, timeoutMs: 900_000 }`

## Verificacao de Typecheck

```
bunx tsc --noEmit -p packages/core/tsconfig.json
```

Zero erros em `packages/core/src/onboarding/**`. Os 8 erros pre-existentes em `packages/core/src/runners/codex-cli-runner.ts`, `packages/core/src/runners/registry.ts` e o conflito de re-export de `MemoryManager` em `packages/core/src/index.ts` estao out-of-scope (registrados em STATE.md desde planos anteriores).

## Verificacao de Audit Personal Context

`bun run audit:personal:ci` passa: `AUDIT PASS — 0 critical findings in distributed code.`

## Commits

| Tarefa | Commit | Arquivos | Descricao |
|--------|--------|----------|-----------|
| 1 | 83c7985 | types.ts | Protocolo tipado completo (InterviewResponse, HarnessDiff, DiffOp, InterviewState, BudgetConfig, DEFAULT_BUDGET, typed errors) |
| 2 | dcd2c8c | interviewer.md | System prompt fixo (7 regras, 3 exemplos JSON, whitelist placeholders, 7 harness files) |
| 3 | f4baf05 | prompts.ts | Loader + validators (extractJsonBlock, validateInterviewResponse, validateHarnessDiff, validateDiffOp, VALID_PLACEHOLDER_KEYS) |
| 4 | ee5c0ae | index.ts | Barrel export do modulo onboarding |
| 5 | 11932c8 | README.md | Documentacao de arquitetura, protocolo, diff, budget, regras imutaveis, integracoes futuras |
| 6 | 04620a7 | index.ts (core) | Re-export em packages/core/src/index.ts |
| 7 | — (validacao) | — | Typecheck + runtime smoke test + audit CI (sem arquivos modificados) |

## Desvios do Plano

Nenhum — plano executado exatamente como escrito.

Obs: Tarefa 7 e validacao pura (typecheck + ausencia de erros em arquivos do escopo), entao nao gera commit proprio. Todos os 6 arquivos do escopo foram validados.

## Criterios de Sucesso

- [x] `packages/core/src/onboarding/` existe com `types.ts`, `interviewer.md`, `prompts.ts`, `index.ts`, `README.md`
- [x] `InterviewResponse` e discriminado por `status: 'asking' | 'done' | 'aborted'`
- [x] `HarnessDiff` usa 4 operacoes explicitas (append, replace, replace_section, set_placeholder) — sem overwrite implicito
- [x] `VALID_PLACEHOLDER_KEYS` e whitelist unica (userName, company, role, workingDir, vaultPath, timezone)
- [x] `validateInterviewResponse` joga `InterviewResponseParseError` com mensagem clara em entrada invalida
- [x] `validateHarnessDiff` joga `InterviewDiffValidationError` pra diffs malformados
- [x] `loadInterviewerPrompt(slug)` concatena interviewer.md + scripts/<slug>.md (quando existir)
- [x] `extractJsonBlock` extrai primeiro bloco fenced do texto bruto (com fallback bare-json)
- [x] `DEFAULT_BUDGET` define limites (30 turnos, 80k input, 20k output, 15min)
- [x] `interviewer.md` contem: regras inegociaveis, formato JSON, lista de placeholders, lista dos 7 arquivos de harness, exemplos de cada status
- [x] `packages/core/src/index.ts` exporta o novo barrel sem remover nada
- [x] `bun tsc --noEmit -p packages/core/tsconfig.json` nao reporta erros nos novos arquivos

## Issues Fora de Escopo (nao-acao)

- `packages/core/src/runners/codex-cli-runner.ts` (5 erros TS pre-existentes)
- `packages/core/src/runners/registry.ts` (3 erros TS pre-existentes)
- `packages/core/src/index.ts` (TS2308 conflito MemoryManager entre `./memory-manager` e `./memory` — pre-existente)

Nenhum deles foi introduzido por este plano. Registrar/corrigir em plano proprio.

## Proximas Acoes

Fase 26-02 (motor + merger + budget) pode consumir:
- `InterviewResponse` + `extractJsonBlock` + `validateInterviewResponse` para parser de output
- `HarnessDiff` + `validateHarnessDiff` para validacao pre-merge
- `InterviewState` + `BudgetStatus` para tracking de sessao
- `InterviewerOptions` + `DEFAULT_BUDGET` para config do runner
- `loadInterviewerPrompt(archetype)` para buildar o system prompt passado ao ClaudeRunner

Fase 26-03 (scripts por arquetipo) escreve 5 arquivos em `packages/core/src/onboarding/scripts/<slug>.md` — `loadScript` ja esta pronto para carrega-los via `loadInterviewerPrompt`.

## Self-Check: PASSOU

- [x] `packages/core/src/onboarding/types.ts` existe
- [x] `packages/core/src/onboarding/interviewer.md` existe
- [x] `packages/core/src/onboarding/prompts.ts` existe
- [x] `packages/core/src/onboarding/index.ts` existe
- [x] `packages/core/src/onboarding/README.md` existe
- [x] `packages/core/src/index.ts` inclui `export * from './onboarding'`
- [x] Commits 83c7985, dcd2c8c, f4baf05, ee5c0ae, 11932c8, 04620a7 no git log
- [x] Typecheck: zero erros em `onboarding/`
- [x] Runtime smoke test: 15/15 checks
- [x] Audit CI: PASS
