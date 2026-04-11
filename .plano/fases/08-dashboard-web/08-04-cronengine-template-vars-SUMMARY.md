---
phase: 08-dashboard-web
plan: 08-04
subsystem: core/cron-engine
tags: [cron, template-vars, runtime, dashboard-enabler]
requires: []
provides:
  - "expandTemplateVars(prompt, now) helper exportado de @forgeclaw/core cron-engine"
  - "Substituicao runtime de {today}, {yesterday}, {now} em prompts de cron"
  - "Hint visual do form do dashboard (plano 08-05) pode referenciar vars suportadas"
affects:
  - "CronEngine.executeJob agora passa prompt expandido ao ClaudeRunner"
  - "Jobs agendados de qualquer origem (file ou db) recebem expansao automatica"
tech-stack:
  added: []
  patterns:
    - "Substituicao literal via String.split().join() — sem regex backtracking"
    - "Formato ISO local construido manualmente (getFullYear/getMonth/etc) — evita quirks do Intl"
    - "Calculo unico por execucao reutilizado pelo retry loop (consistencia temporal)"
key-files:
  created: []
  modified:
    - packages/core/src/cron-engine.ts
decisions:
  - "Formato: {today} e {yesterday} -> YYYY-MM-DD; {now} -> YYYY-MM-DDTHH:MM (sem segundos, sem offset)"
  - "TZ local da maquina (Date.getFullYear/getMonth/getDate/getHours/getMinutes)"
  - "Apenas 3 vars suportadas — vars desconhecidas (ex: {foo}) sao deixadas intactas"
  - "Substituicao literal com split/join em vez de regex — evita escape de chaves e backtracking"
  - "DB armazena prompt literal (com vars); expansao acontece em memoria no executeJob"
  - "Retry loop reutiliza o mesmo expandedPrompt — um retry 30s depois NAO recalcula {now}"
requirements-completed: [DASH-04]
duration: "~5 min"
completed: "2026-04-11"
---

# Fase 8 Plano 04: Template vars runtime no CronEngine Resumo

**One-liner:** Substituicao runtime de `{today}`/`{yesterday}`/`{now}` em prompts de cron antes de enviar ao ClaudeRunner, usando split/join literal com formato ISO local, calculado uma vez por execucao e reutilizado pelo retry loop.

## O que foi feito

Implementado o (1) lado do cross-cutting decidido no CONTEXT.md ("Template vars no prompt"): a logica de substituicao no CronEngine. O (2) — hint visual no form do dashboard — fica no plano 08-05.

### Tarefa 1: Helper `expandTemplateVars`
- Adicionados `pad2`, `formatDateIso`, `formatDateTimeIso` e `expandTemplateVars` no topo de `cron-engine.ts`, logo apos `naturalToCron`.
- `expandTemplateVars(prompt, now = new Date())` substitui literalmente:
  - `{today}` -> `YYYY-MM-DD` (data local de `now`)
  - `{yesterday}` -> `YYYY-MM-DD` (um dia antes, via `setDate(getDate() - 1)`)
  - `{now}` -> `YYYY-MM-DDTHH:MM` (data + hora local, sem segundos)
- Implementado com `String.split(token).join(value)` — evita regex e nao usa backtracking.
- Vars desconhecidas (ex: `{foo}`) ficam intactas — comportamento de "unknown preserved".
- Exportado de `cron-engine.ts` para reuso (o plano 08-05 podera usar para preview no form).
- **Commit:** `f6dbfd2`

### Tarefa 2: Usar `expandTemplateVars` em `executeJob`
- `executeJob` agora calcula `executedAt = new Date(startedAt)` e `expandedPrompt = expandTemplateVars(job.prompt, executedAt)` ANTES de criar o cron log e ANTES de chamar o runner.
- Log de debug quando a expansao efetivamente trocou algo: `[cron-engine] Expanded template vars in job "{name}"`.
- `runner.run(expandedPrompt, { cwd: config.workingDir })` substitui o antigo `runner.run(job.prompt, ...)` — essa e a unica call-site alterada.
- **DB inalterado:** `job.prompt` (literal, com `{today}` etc.) continua no SQLite. A expansao e puramente em memoria.
- **Retry loop consistente:** o mesmo `expandedPrompt` e reutilizado no retry de 30s — um retry nao recalcula `{now}` do zero, mantendo consistencia temporal dentro da mesma execucao.
- **Commit:** `8395d64`

## Verificacao Funcional

| Task | Tipo | Verificacao | Resultado |
|------|------|-------------|-----------|
| 1 | unit (core) | `expandTemplateVars('hoje e {today} e ontem foi {yesterday}', new Date(2026,3,11,10,58))` -> `"hoje e 2026-04-11 e ontem foi 2026-04-10"` | PASSOU |
| 1 | unit (core) | `expandTemplateVars('agora: {now}', new Date(2026,3,11,10,58))` -> `"agora: 2026-04-11T10:58"` | PASSOU |
| 1 | unit (core) | `expandTemplateVars('{today} {yesterday} {now} {unknown}', ...)` preserva `{unknown}` | PASSOU |
| 1 | static | `bunx tsc --noEmit src/cron-engine.ts` — sem novos erros em `cron-engine.ts` | PASSOU |
| 1 | static | `expandTemplateVars` exportado de `cron-engine.ts` (linha 455) | PASSOU |
| 2 | static | `runner.run(expandedPrompt, ...)` substituiu `runner.run(job.prompt, ...)` — linha 332 | PASSOU |
| 2 | simulacao | prompt original preservado no objeto `job`, `expandedPrompt` contem valores expandidos, retry loop reutiliza | PASSOU |
| 2 | static | `bunx tsc --noEmit src/cron-engine.ts` — sem novos erros em `cron-engine.ts` | PASSOU |

**Dev server:** N/A — mudanca puramente no package `core`, sem frontend a verificar. Verificacao feita via `bun -e` executando o modulo diretamente.

**Problemas de conexao frontend↔backend:** 0 (esta tarefa nao toca frontend).

## Criterios de Sucesso

- [x] `packages/core` compila sem novos erros em `cron-engine.ts`
- [x] Funcao `expandTemplateVars` exportada de `cron-engine.ts`
- [x] `executeJob` usa prompt expandido na chamada ao runner
- [x] DB continua com prompt literal (nao expandido) — `stateStore.createCronLog` segue recebendo `job.prompt` original atraves do `job` passado ao metodo; nao ha gravacao do expanded
- [x] Formato `YYYY-MM-DD` para `{today}` e `{yesterday}`
- [x] Formato `YYYY-MM-DDTHH:MM` para `{now}`
- [x] Apenas essas 3 vars sao substituidas (sem expansao generica) — outras vars passam intactas

## Desvios do Plano

Nenhum. O plano foi executado exatamente como escrito. Seguiu-se literalmente o codigo sugerido nas secoes `<action>` das tarefas 1 e 2.

## Issues Pre-existentes (Fora de Escopo)

Durante `tsc --noEmit`, detectados erros pre-existentes (nao causados por esta tarefa, nao corrigidos por estarem fora de escopo):

1. **`cron-engine.ts:262` — TS2345 em `stateStore.createCronJob`** — o `Omit<CronJob, "id">` nao inclui os novos campos `origin` e `sourceFile` (adicionados no plano 08-01). Este erro ja existia no `main` antes deste plano comecar. Sera resolvido no plano 08-01 ou num ajuste de tipagem do `state-store.createCronJob` numa wave posterior. Rastrear como deferred-item se nao for coberto.
2. **Erros em `@types/node` e `event-bus.ts`** — conflitos de duplicate identifier em `@types/node@25.5.2` (path, process, stream, test, web-globals) e um downlevelIteration em `event-bus.ts:39`. Sao erros de configuracao de tipagem do monorepo, nao de logica, e pre-existem a este plano.

Nenhum desses bloqueia a execucao real (Bun roda normalmente; sao apenas warnings do `tsc --noEmit` estrito). Documentados para visibilidade.

## Integracao com Outros Planos

- **Plano 08-05 (cron form sheet):** Pode importar `expandTemplateVars` de `@forgeclaw/core` para preview do prompt com os valores substituidos em tempo real no form. A exportacao do helper foi feita explicitamente pensando nesse uso.
- **Plano 08-01 (schema origin):** Independente. `expandTemplateVars` nao depende de `origin` / `sourceFile`.
- **Plano 08-03 (heartbeat parser managed):** Independente. O parser nao lida com expansao — apenas o runtime do `executeJob` faz.

## Self-Check: PASSOU

- Arquivo `packages/core/src/cron-engine.ts` modificado e existe: ENCONTRADO
- Commit `f6dbfd2` (Tarefa 1) existe no git log: ENCONTRADO
- Commit `8395d64` (Tarefa 2) existe no git log: ENCONTRADO
- Funcao `expandTemplateVars` presente e exportada: ENCONTRADO (linha 455 do arquivo atual)
- `executeJob` usa `expandedPrompt` em `runner.run`: ENCONTRADO (linha 332)
