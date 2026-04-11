---
phase: 08-dashboard-web
plan: 08-03
subsystem: core/cron-engine
tags: [cron, parser, heartbeat, dashboard, mirror, hot-reload]
dependency_graph:
  requires:
    - "08-01 (origin/sourceFile fields on CronJob)"
  provides:
    - "parseHeartbeat ignores '## Managed by Dashboard' section"
    - "syncJobsWithDb only touches file-origin jobs"
    - "CronEngine.writeDashboardSection(jobs) public API"
  affects:
    - "Hot reload of HEARTBEAT.md (now file-origin-only)"
    - "Future plan 08-06 (/api/crons POST/PUT/DELETE will call writeDashboardSection)"
tech_stack:
  added:
    - "writeFile import from node:fs/promises"
  patterns:
    - "Defense-in-depth: managed section uses ### headers so parser never even sees them as candidates"
    - "Conflict resolution: HEARTBEAT wins — db-origin jobs with name collision are disabled"
    - "Soft-delete semantics: removed jobs are disabled, never deleted, to preserve cron_logs for audit"
key_files:
  created: []
  modified:
    - "packages/core/src/cron-engine.ts"
decisions:
  - "Managed section spans from '^## Managed by Dashboard\\s*$' to next '^## ' header OR EOF"
  - "Writer uses '### ' (h3) for per-job headers so the parser's '^## (.+) → tópico: (.+)$' regex never even needs to run on them — belt and suspenders with the section-stripping"
  - "writeDashboardSection auto-filters to origin='db' so callers can safely pass listCronJobs() output"
  - "Empty managed section still writes the marker + a placeholder line, so the section is always discoverable in git diffs"
  - "Append behavior when marker doesn't exist: writer appends to trimmed content with '\\n\\n' separator"
requirements_completed:
  - "DASH-04 (partial — the parser/writer substrate for dashboard cron CRUD; UI in plans 08-05/08-06)"
metrics:
  duration_seconds: 257
  duration_human: "4m17s"
  tasks_completed: 3
  files_changed: 1
  tests_added: 0
  verification: "functional smoke test (5 scenarios)"
completed_at: "2026-04-11T11:48:01Z"
---

# Fase 8 Plano 03: Heartbeat Parser Managed Section Resumo

One-liner: Parser de `HEARTBEAT.md` descarta a secao `## Managed by Dashboard` antes do parse, `syncJobsWithDb` so toca jobs com `origin='file'` (db-origin intocados em hot reload, exceto em conflito de nome onde o arquivo vence), e novo metodo publico `CronEngine.writeDashboardSection(jobs)` que (re)escreve so o bloco managed preservando todo o resto do arquivo.

## Contexto

Plano 08-01 ja tinha adicionado as colunas `origin` e `source_file` no schema SQLite e os campos correspondentes na interface `CronJob`. Plano 08-03 fecha o loop no CronEngine: o parser precisa ignorar a secao espelho que o dashboard escreve para o git, e o sync de hot reload precisa filtrar por origem para nao desabilitar jobs db-origin quando o HEARTBEAT.md muda. Alem disso, adiciona um writer helper que o plano 08-06 vai chamar apos cada `POST/PUT/DELETE /api/crons` para manter o mirror em dia.

## Tarefas Executadas

### Task 1 — parseHeartbeat descarta secao Managed

**Arquivo:** `packages/core/src/cron-engine.ts` (linhas ~154-197)

Adicionado um pre-processo no topo de `parseHeartbeat(content: string)` que:

1. Procura o marcador `^## Managed by Dashboard\s*$` (multiline).
2. Se encontrado, procura o proximo header `^## ` apos ele.
3. Remove apenas o trecho entre marcador e proximo header (preservando qualquer secao `^## ...` posterior).
4. Se nao ha proximo header, remove ate o fim do arquivo.

O resto do metodo permanece identico — apenas o `content` agora chega sem a secao managed.

**Commit:** `ec49ea2` feat(08-03): parseHeartbeat discards Managed by Dashboard section

### Task 2 — syncJobsWithDb so mexe em file-origin

**Arquivo:** `packages/core/src/cron-engine.ts` (linhas ~231-302)

Refatoracao completa do sync loop:

- `const existingJobs = allJobs.filter((j) => j.origin === 'file')` — apenas file-origin sao considerados "existing" do ponto de vista do parser.
- Loop novo de conflito: itera TODOS os jobs e desabilita os db-origin que tenham o mesmo `name` de um parsed job (HEARTBEAT vence, decisao de CONTEXT.md).
- Branch create passa `origin: 'file'` + `sourceFile: this.heartbeatPath` explicitamente (resolve typecheck error pre-existente do 08-01).
- Branch update agora tambem tem um clause `else if (!existing.enabled)` que re-habilita jobs file-origin que voltaram ao HEARTBEAT.md apos terem sido removidos.
- Loop final de "disable removed" agora itera `existingJobs` (ja filtrado) — jobs db-origin jamais sao tocados por esse loop.

**Commit:** `7f32692` feat(08-03): syncJobsWithDb only touches file-origin jobs

### Task 3 — writeDashboardSection method

**Arquivo:** `packages/core/src/cron-engine.ts` (linhas ~477-560)

Novo metodo publico async:

```typescript
async writeDashboardSection(jobs: CronJob[]): Promise<void>
```

- Importa `writeFile` de `node:fs/promises` (adicionado no import da linha 2).
- Filtra `jobs` para apenas `origin === 'db'` — callers podem passar `listCronJobs()` sem filtrar.
- Le o arquivo atual (ou string vazia se nao existir) e procura o marcador `## Managed by Dashboard`.
- Se encontrado: substitui o trecho entre marcador e proximo `^## ` (preservando secoes posteriores). Se nao ha proximo `^## `, substitui ate o fim.
- Se nao encontrado: append ao fim do arquivo com `\n\n` de separacao.
- Cada job db e escrito como `### {name}` + linhas `- schedule:` e `- prompt:` (prompt preview truncado em 500 chars, whitespace normalizado).
- Jobs desabilitados recebem o sufixo `_(disabled)_` no header para visibilidade no git.
- Caso especial: lista vazia ainda escreve o marcador + um placeholder `_No dashboard-managed jobs yet._`, para que o bloco seja sempre discoverable em diffs.

**Commit:** `2a81393` (commit message: `feat(08-01): syncJobsWithDb propagates origin='file' on updates` — vide "Nota sobre o commit de Task 3" abaixo)

## Verificacao Funcional

Dev server nao aplicavel (mudanca puramente no core, sem route handlers ou UI). Executei um smoke test inline (`bun run`) com um `HEARTBEAT.md` temporario cobrindo 5 cenarios:

| # | Cenario | Resultado |
|---|---------|-----------|
| 1 | Parser ignora `## Managed by Dashboard` com conteudo dentro | PASSOU (2 file-origin jobs parseados, 0 mirror leaks) |
| 2 | `writeDashboardSection` preserva secoes file-origin + `## Notes` trailing | PASSOU (conteudo antes e depois do bloco intacto) |
| 3 | `writeDashboardSection` substitui mirror antigo sem acumular lixo | PASSOU ("Old dashboard mirror" removido, novos jobs presentes) |
| 4 | Re-parse apos write ainda ignora secao managed | PASSOU (2 jobs parseados, managed jobs nao vazam) |
| 5 | Append case (marcador nao existe): writer adiciona no fim sem clobrar | PASSOU (conteudo original preservado + marcador + jobs) |
| 6 | Lista vazia de jobs (`[]`): escreve marcador + placeholder, parser ainda ok | PASSOU (1 job file-origin preservado apos write vazio) |

**Typecheck:** `cd packages/core && bunx tsc --noEmit` — limpo (apenas ruido pre-existente em `@types/node` da resolucao bunx vs. o tsconfig do workspace, que e ruido do node_modules, nao codigo do projeto).

**Status final:** Parser corretamente descarta secao managed. Writer preserva conteudo externo e substitui so a secao managed. Hot reload agora e file-origin-only. Conflitos de nome sao resolvidos com HEARTBEAT vencendo (db-origin desabilitado, nao deletado).

## Nota sobre o commit de Task 3

Durante a execucao do plano, um processo paralelo (git hook ou agente concorrente — autor "Jonathan Renan") capturou minhas mudancas do Task 3 junto com uma pequena refinacao no branch update do `syncJobsWithDb` (adicionando `origin: 'file'` + `sourceFile` ao `updateCronJob` do branch "Update if changed"). O commit foi criado com mensagem `feat(08-01): syncJobsWithDb propagates origin='file' on updates` e hash `2a81393`. O conteudo do `writeDashboardSection` no commit bate 1:1 com o que foi escrito via Edit tool — nao ha divergencia funcional, apenas o commit message ficou mal-rotulado. Registrando aqui no SUMMARY para rastreabilidade.

A refinacao adicional (passar origin/sourceFile tambem no update branch) e uma Regra 2 legitima e foi incorporada na mesma mudanca, entao nao criei commit separado.

## Desvios do Plano

### Issues Auto-corrigidos

**1. [Regra 2 - Critico Faltante] Re-enable de jobs file-origin que voltam ao HEARTBEAT.md**
- **Encontrado durante:** Task 2
- **Issue:** O branch "update if changed" so atualizava se algum campo mudasse. Jobs file-origin previamente disabled (por terem sido removidos do arquivo) e que agora voltam nao eram re-habilitados — ficavam para sempre disabled mesmo reaparecendo no HEARTBEAT.md.
- **Correcao:** Adicionado `else if (!existing.enabled)` que chama `updateCronJob(id, { enabled: true })` com log `Re-enabled job: ...`.
- **Arquivos:** `packages/core/src/cron-engine.ts`
- **Commit:** Incluido em `7f32692`

**2. [Regra 2 - Critico Faltante] Branch update do sync passa origin/sourceFile tambem**
- **Encontrado durante:** Task 2 follow-up (pelo processo paralelo)
- **Issue:** O branch update do `syncJobsWithDb` escrevia patches parciais sem `origin`/`sourceFile`, deixando jobs migrados com metadata inconsistente. O branch create ja passava essas fields, mas o update nao.
- **Correcao:** Added `origin: 'file'` + `sourceFile: this.heartbeatPath` no updateCronJob call dentro do branch "Update if changed".
- **Arquivos:** `packages/core/src/cron-engine.ts`
- **Commit:** Incluido em `2a81393` (ver nota acima)

**3. [Regra 1 - Bug] Lista vazia de jobs no writer**
- **Encontrado durante:** Task 3 (smoke test)
- **Issue:** Spec inicial do plano nao cobria o caso de `jobs` sem db-origin. Um append literal do corpo vazio deixaria o marcador orfao seguido de apenas o blockquote, o que e esteticamente ok mas git-diff-unfriendly para reviewers que procuram "o que mudou na secao managed".
- **Correcao:** Se `dbJobs.length === 0`, adicionar linha `_No dashboard-managed jobs yet._` explicita. Parser continua ignorando (e uma linha de texto normal, nao um header).
- **Arquivos:** `packages/core/src/cron-engine.ts`
- **Commit:** Incluido em `2a81393`

### Issues Adiados

Nenhum issue especifico deste plano foi adiado. O arquivo `.plano/fases/08-dashboard-web/deferred-items.md` pre-existente documenta um erro TypeScript pre-existente em `sessions-tab.tsx` fora do escopo deste plano (cron-engine.ts).

## Self-Check: PASSOU

### Arquivos modificados
- `packages/core/src/cron-engine.ts` — ENCONTRADO (writeDashboardSection na linha 486, parseHeartbeat com managed-section stripping, syncJobsWithDb com filter origin='file')

### Commits
- `ec49ea2` — ENCONTRADO (Task 1: parseHeartbeat discards Managed by Dashboard section)
- `7f32692` — ENCONTRADO (Task 2: syncJobsWithDb only touches file-origin jobs)
- `2a81393` — ENCONTRADO (Task 3: writeDashboardSection + update-branch origin refinement; commit msg mal-rotulado como `feat(08-01)` mas conteudo correto — detalhado acima)

### Criterios de Sucesso
- [x] `packages/core` compila sem erro (typecheck limpo no codigo do projeto)
- [x] parseHeartbeat descarta conteudo da secao `## Managed by Dashboard`
- [x] syncJobsWithDb NAO desabilita jobs DB-origin (exceto em conflito de nome)
- [x] syncJobsWithDb desabilita apenas file-origin removidos do arquivo
- [x] CronEngine.writeDashboardSection existe como metodo publico
- [x] writeDashboardSection preserva conteudo do arquivo fora da secao managed

### must_haves (frontmatter)
- [x] parseHeartbeat ignora conteudo dentro da secao '## Managed by Dashboard'
- [x] syncJobsWithDb NAO desabilita jobs com origin='db' ao reloadar HEARTBEAT.md
- [x] Nova funcao writeDashboardSection(jobs) existe e (re)escreve apenas a secao '## Managed by Dashboard' do HEARTBEAT.md
- [x] Hot reload do HEARTBEAT.md afeta APENAS jobs com origin='file'
