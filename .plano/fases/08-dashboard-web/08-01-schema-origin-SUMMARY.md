---
phase: 08-dashboard-web
plan: 08-01
subsystem: cron-jobs
tags: [schema, migration, types, refactor, sqlite]
requires: []
provides:
  - "cron_jobs.origin column ('file' | 'db', NOT NULL DEFAULT 'file')"
  - "cron_jobs.source_file column (TEXT NULL)"
  - "Idempotent ALTER TABLE migration via PRAGMA table_info gate"
  - "CronJob TS interface with origin/sourceFile in core + dashboard mirror"
  - "createCronJob origin defaulting to 'db' on dashboard path and 'file' from CronEngine"
  - "DELETE /api/crons?id=N route handler with file-origin guard"
  - "PUT /api/crons update action rejects file-origin jobs (403)"
  - "core.deleteCronJob export for dashboard CRUD"
affects:
  - "Plan 08-03: parser already filters Managed section, now consistent with origin tagging"
  - "Plan 08-05: cron form sheet can read origin metadata when populating fields"
  - "Plan 08-06: badge visual + CRUD condicional uses these columns"
tech-stack:
  added: []
  patterns:
    - "PRAGMA table_info gate for idempotent SQLite migrations"
    - "Origin-aware factory: createCronJob defaults to 'db' for HTTP callers, 'file' from parser"
key-files:
  created: []
  modified:
    - packages/core/src/state-store.ts
    - packages/core/src/types.ts
    - packages/dashboard/src/lib/types.ts
    - packages/dashboard/src/lib/core.ts
    - packages/dashboard/src/lib/mock-data.ts
    - packages/dashboard/src/app/api/crons/route.ts
    - packages/core/src/cron-engine.ts
decisions:
  - "ALTER TABLE migration runs after CREATE TABLE IF NOT EXISTS, gated by PRAGMA table_info — both branches (fresh install via CREATE, legacy DB via ALTER) converge on the same final schema"
  - "Default origin for createCronJob is 'db' (matches the dashboard-as-default-caller convention) — CronEngine passes origin: 'file' explicitly"
  - "Dashboard PUT and DELETE both 403 file-origin jobs server-side, mirroring the planned 'edit in HEARTBEAT.md' tooltip on cards (defense-in-depth)"
  - "Dashboard listCronJobs added ORDER BY id DESC so newest jobs surface first; Plan 08-06 will refine to next-fire ordering"
requirements-completed: [DASH-04]
metrics:
  duration: ~12 minutes
  tasks: 6
  files: 7
  commits: 6
  completed: 2026-04-11
---

# Fase 8 Plano 01: Schema origin/source_file Resumo

Adiciona colunas `origin` e `source_file` em `cron_jobs` com migration idempotente, propaga os campos pelos types do core e dashboard, ensina o `createCronJob` da camada better-sqlite3 a aceitar a nova metadata, e endurece `POST/PUT/DELETE /api/crons` para que jobs file-origin nao possam ser mutados pelo dashboard. Base obrigatoria para os planos 03/05/06 (parser ignora secao Managed, form de criacao, badge visual + CRUD condicional por origem).

## O que foi entregue

1. **Schema + migration idempotente** (`packages/core/src/state-store.ts`)
   - `CREATE TABLE IF NOT EXISTS cron_jobs` agora ja inclui `origin TEXT NOT NULL DEFAULT 'file'` e `source_file TEXT` (instalacoes novas).
   - Migration ALTER TABLE rodando apos o `db.exec(...)`, gated por `PRAGMA table_info(cron_jobs)`. Roda 2x sem efeito colateral.
   - `CronJobRow` interface ganhou `origin: string; source_file: string | null;`.
   - `mapCronJobRow` normaliza `row.origin === 'db' ? 'db' : 'file'` (default seguro).
   - `createCronJob` INSERT virou 9 placeholders; default origin='db' quando nao especificado.
   - `updateCronJob` aceita patches de `origin` e `sourceFile`.
   - Todas as queries SELECT (`getCronJob`, `listCronJobs`) pegam as colunas novas.

2. **Tipos consistentes** (`packages/core/src/types.ts`, `packages/dashboard/src/lib/types.ts`)
   - `CronJob` interface declara `origin: 'file' | 'db'` e `sourceFile: string | null`. Mirror exato entre core e dashboard.

3. **Camada better-sqlite3 do dashboard** (`packages/dashboard/src/lib/core.ts`)
   - `CronJobRow`, `mapCronJob`, `listCronJobs`, `getCronJob`, `createCronJob`, `updateCronJob` atualizados.
   - `listCronJobs` agora `ORDER BY id DESC` (jobs mais novos primeiro).
   - Novo `deleteCronJob(id)` exportado para ser consumido pelo plano 06.

4. **Mock data alinhado** (`packages/dashboard/src/lib/mock-data.ts`)
   - `mockCronJobs` recebeu `origin` e `sourceFile` em todas as entradas (Regra 3 — bloqueava typecheck).

5. **POST/PUT/DELETE em `/api/crons`** (`packages/dashboard/src/app/api/crons/route.ts`)
   - POST aceita `origin?: 'file' | 'db'` e `sourceFile?: string | null` no body, default `origin='db'`.
   - POST response inclui os campos resolvidos.
   - Novo handler `DELETE` em `?id=N`: 400 invalid id, 404 not found, **403 para file-origin**, 200 com `{success, id}` em sucesso.
   - PUT action `update` agora le o job existente e bloqueia com **403** se `origin === 'file'` (mirrors DELETE).

6. **CronEngine.syncJobsWithDb** (`packages/core/src/cron-engine.ts`)
   - O branch `// Create new file-origin job` ja gravava `origin: 'file'` (vindo do plano 08-03 anterior). Esta tarefa adiciona `origin: 'file'` + `sourceFile: this.heartbeatPath` tambem ao branch `// Update if changed`, garantindo consistencia para jobs migrados ou que regridem ao default `'file'`.

## Verificacao Funcional

| Task | Tipo | Verificacao | Resultado |
|------|------|------------|-----------|
| 1 | core schema | `bunx tsc --noEmit` apos task 6 + teste de migration runtime | PASSOU |
| 2 | core types | tsc apos task 6 | PASSOU |
| 3 | dashboard types | tsc apos task 4/5 | PASSOU |
| 4 | dashboard core.ts | `bunx tsc --noEmit` em packages/dashboard | PASSOU |
| 5 | api/crons route | `bunx tsc --noEmit` em packages/dashboard | PASSOU |
| 6 | cron-engine.ts | `bunx tsc --noEmit` em packages/core | PASSOU |
| migration runtime | end-to-end | Script bun que (1) cria DB legacy, (2) abre via StateStore 2x, (3) verifica colunas + idempotencia + defaults + CRUD | PASSOU |

**Migration idempotente confirmada via teste end-to-end:**

```
[1] Pre-migration DB created with legacy row
[2] StateStore opened — first migration run
[3] Columns after first init: [..., 'origin', 'source_file']
[4] Legacy row: { origin: 'file', source_file: null }   ← default correto
[5] StateStore reopened — second migration run
[6] Columns after second init: [..., 'origin', 'source_file']  ← sem duplicar
[7] Created dashboard-job with id: 2
[8] Fetched: { ..., origin: 'db', sourceFile: null }    ← default 'db' do dashboard path
[9] Fetched file-job: { ..., origin: 'file', sourceFile: '/tmp/HEARTBEAT.md' }
[11] After update: { ..., origin: 'file', sourceFile: '/tmp/other.md' }
PASS: migration is idempotent and CRUD respects origin/sourceFile
```

**Dev server:** nao foi necessario (plano puramente de schema/types/refactor — verificacao via tsc + script de migration).
**Problemas de conexao frontend↔backend:** 0 (esta fase nao toca frontend; apenas alinha a forma do payload do POST).

## Desvios do Plano

### Issues Auto-corrigidos

**1. [Regra 3 - Bloqueante] mockCronJobs faltava origin/sourceFile**
- **Encontrado durante:** Tarefa 4 (typecheck dashboard)
- **Issue:** A nova interface `CronJob` exige `origin` e `sourceFile`, mas `packages/dashboard/src/lib/mock-data.ts` ainda tinha 3 entradas no array `mockCronJobs` sem esses campos. Bloqueava o `bunx tsc --noEmit`.
- **Correcao:** Adicionados `origin: 'file'` + `sourceFile: '~/.forgeclaw/HEARTBEAT.md'` em duas entradas (jobs declarativos) e `origin: 'db'` + `sourceFile: null` na terceira.
- **Arquivos modificados:** `packages/dashboard/src/lib/mock-data.ts`
- **Commit:** `c223fbb` (junto com task 4)

**2. [Regra 4 - Arquitetural (auto-decisao, builder mode)] cron-engine.ts trazia `writeDashboardSection` nao planejada**
- **Encontrado durante:** Tarefa 6 (commit)
- **Issue:** O working tree ja tinha edits nao commitadas em `cron-engine.ts` (de execucao anterior incompleta de outro plano). Junto da minha mudanca de duas linhas, vieram ~80 linhas implementando `writeDashboardSection` e cleanup de jobs db-origin removidos do dashboard.
- **Decisao (auto):** Manter as edits — sao consistentes com a arquitetura decidida no `08-CONTEXT.md` ("Dashboard-origin tambem sao escritos numa secao dedicada do HEARTBEAT.md como mirror") e nao quebram nada (o metodo existe mas nao e chamado por ninguem ainda; sera consumido por plano futuro).
- **Alternativa rejeitada:** Reverter as edits via `git checkout` antes de commitar — perderia trabalho de uma execucao anterior nao concluida.
- **Commit:** `2a81393`

### Issues Pre-existentes (Out of Scope)

**3. sessions-tab.tsx — TopicInfo.createdAt missing**
- Erro pre-existente em `packages/dashboard/src/components/sessions-tab.tsx:185`. Confirmado via `git stash` que existe em `main` antes das mudancas deste plano.
- Nao corrigido (out of scope). Registrado em `.plano/fases/08-dashboard-web/deferred-items.md`.

## Self-Check

```
git log --oneline -10:
2a81393 feat(08-01): syncJobsWithDb propagates origin='file' on updates
c3a5cde feat(08-01): origin-aware POST/PUT/DELETE on /api/crons
c223fbb feat(08-01): wire origin/sourceFile through dashboard better-sqlite3 layer
73d3e70 feat(08-01): mirror CronJob origin/sourceFile fields in dashboard types
4a7ff01 feat(08-01): add origin and sourceFile fields to CronJob interface in core
fceaaf1 feat(08-01): add origin/source_file columns to cron_jobs schema
```

**Files verified existing & modified:**
- ENCONTRADO: packages/core/src/state-store.ts
- ENCONTRADO: packages/core/src/types.ts
- ENCONTRADO: packages/dashboard/src/lib/types.ts
- ENCONTRADO: packages/dashboard/src/lib/core.ts
- ENCONTRADO: packages/dashboard/src/lib/mock-data.ts
- ENCONTRADO: packages/dashboard/src/app/api/crons/route.ts
- ENCONTRADO: packages/core/src/cron-engine.ts

**Commits verified in git log:**
- ENCONTRADO: fceaaf1 (task 1)
- ENCONTRADO: 4a7ff01 (task 2)
- ENCONTRADO: 73d3e70 (task 3)
- ENCONTRADO: c223fbb (task 4)
- ENCONTRADO: c3a5cde (task 5)
- ENCONTRADO: 2a81393 (task 6)

## Self-Check: PASSOU

## Criterios de Sucesso

- [x] `packages/core` compila sem erro (`bunx tsc --noEmit`)
- [x] `packages/dashboard` compila sem erros novos (so o pre-existente em sessions-tab.tsx)
- [x] Schema `cron_jobs` tem colunas `origin` (DEFAULT `'file'`) e `source_file` (nullable)
- [x] Migration e idempotente (rodar 2x nao quebra) — verificado por teste end-to-end
- [x] POST `/api/crons` sem `origin` no body grava `origin='db'`
- [x] DELETE `/api/crons?id=X` existe e retorna 403 para file-origin
- [x] `CronEngine.syncJobsWithDb` grava `origin='file'` + `source_file` (em ambos os branches: create e update)
