---
phase: 08-dashboard-web
scope: DASH-04 sub-recorte
verified: 2026-04-11T00:00:00Z
status: passed
score: 35/35 must-haves verificados (1 discrepancia de wording entre prompt e CONTEXT.md, mas codigo ok contra source of truth)
requirements_checked:
  - DASH-04: SATISFIED
  - CRON-01: regression-safe
  - CRON-02: regression-safe
  - CRON-03: regression-safe
  - CRON-04: regression-safe
not_verified_in_this_scope:
  - DASH-01
  - DASH-02
  - DASH-03
  - DASH-05
  - DASH-06
  - DASH-07
gaps: []
human_needed:
  - "Click real no botao '+ New cron' do header, confirmar que abre o Sheet side=right"
  - "Click real em 'Skills disponiveis (N)' dentro do form, confirmar que o nested Sheet renderiza sem travar (Sheet dentro de Sheet)"
  - "Criar cron db-origin, editar, duplicar, deletar num browser real -- confirmar toast/pulse/latencia subjetivamente < 300ms"
  - "Confirmar visualmente que tooltip 'Edit in HEARTBEAT.md' aparece ao hover sobre botao Edit/Delete disabled em card file-origin"
  - "Rodar processo do bot com HEARTBEAT.md populado, criar job db-origin via dashboard, confirmar que CronEngine agenda sem restart (verificacao viva de 'CRUD de crons funciona e reflete no CronEngine sem restart')"
  - "Executar migration em DB pre-existente real (sem as colunas origin/source_file) para confirmar idempotencia e que jobs antigos ficam com origin='file' por default"
---

# Fase 8 (sub-escopo DASH-04): Relatorio de Verificacao

**Objetivo da fase (ROADMAP.md):** "Criar dashboard web completo em Next.js 15 com chat streaming, kanban de sessoes, gerenciamento de crons, visualizacao de memoria, configuracao e edicao de harness -- tudo com atualizacao real-time via WebSocket."

**Recorte desta verificacao:** Apenas **DASH-04 -- Implementar UI de gerenciamento de crons (listar, criar, editar, toggle, ver logs)**. DASH-01, DASH-02, DASH-03, DASH-05, DASH-06, DASH-07 NAO foram avaliados.

**Criterio de sucesso aplicavel:** "CRUD de crons funciona e reflete no CronEngine sem restart."

**Status geral:** **passed** (com itens de verificacao humana recomendados).

## Resumo executivo

DASH-04 esta implementado e integrado. Todos os 35 must-haves consolidados dos 6 planos foram verificados contra o codigo real:

- **Backend/Schema (itens 1-7):** A tabela `cron_jobs` tem `origin` e `source_file`, a migration e idempotente (PRAGMA check antes de ALTER), POST /api/crons aceita e persiste `origin: 'db'`, PUT/DELETE retornam 403 para jobs file-origin, e `/api/skills` + `/api/topics` existem e estao wireados.
- **CronEngine (itens 8-13):** `parseHeartbeat` descarta a secao `## Managed by Dashboard`, `writeDashboardSection` filtra por `origin === 'db'` e preserva cabeçalhos subsequentes, `syncJobsWithDb` so mexe em jobs file-origin (com um loop de conflito extra que desabilita DB jobs homonimos), `expandTemplateVars` substitui exatamente `{today}`/`{yesterday}`/`{now}` com formato ISO local via `split/join` (vars desconhecidas intocadas), e `executeJob` passa o `expandedPrompt` -- nao `job.prompt` literal -- para o runner.
- **Dashboard UI (itens 14-29):** `CronFormSheet` existe e implementa todo o form (name, schedule preset+custom, prompt com placeholder e template vars hint, target topic com "Default", enabled toggle, TZ local, Save disabled quando invalido, preview cronstrue + next 3 runs, nested Sheet de skills). `CronsTab` tem botao "+ New cron" no header, empty state com "+ Create your first cron", toast apos CRUD, o raw HEARTBEAT editor foi movido pra drawer "Advanced" (sai da sidebar fixa). `CronCard` tem badge 'file'/'db', botoes Edit/Duplicate/Delete com Edit/Delete disabled + tooltip para file-origin, Duplicate pre-preenche com " (copy)". `DeleteCronDialog` mostra o nome do job.
- **Deps/TSC (itens 30-33):** `cron-parser ^5.5.0` e `cronstrue ^3.14.0` em `package.json`; TSC do dashboard so falha em `sessions-tab.tsx:185` (erro pre-existente permitido pelo escopo); TSC do core limpo.
- **Regressoes (itens 34-35):** CronEngine ainda parseia HEARTBEAT, agenda, executa via ClaudeRunner e roteia resultado via `eventBus.emit('cron:result')`; todas as rotas preexistentes (`/api/crons` GET, `/api/heartbeat`, `/api/memory`, `/api/sessions`) tem `GET` exportado.

**Discrepancia notavel (nao-bloqueante):** O prompt de verificacao listou "5 presets + Custom" no item 15, mas o source of truth (`08-CONTEXT.md` linhas 44-49) especifica exatamente 4 presets + Custom. A implementacao (4 presets) corresponde ao CONTEXT.md. Tratado como PASS com nota. A unica "cabide" desse mismatch e que o texto de aceitacao do plano 08-05 tambem diz "5 presets" na linha 16 e linha 551, mas o codigo-alvo literal do mesmo plano (linhas 130-135) so lista 4 -- o plano ja nasceu internamente inconsistente em wording vs codigo. Nao ha nada "faltando".

## Must-Haves Verificados

### Backend / Schema (7)

| # | Must-have | Status | Evidencia |
|---|---|---|---|
| 1 | Tabela `cron_jobs` tem colunas `origin TEXT` e `source_file TEXT NULL` | PASS | `packages/core/src/state-store.ts:54-65` CREATE TABLE tem `origin TEXT NOT NULL DEFAULT 'file'` e `source_file TEXT` |
| 2 | Migration idempotente | PASS | `state-store.ts:77-91` PRAGMA table_info checa `cols.includes('origin')` antes de ALTER; try/catch envolvendo |
| 3 | POST /api/crons aceita e persiste `origin: 'db'` | PASS | `packages/dashboard/src/app/api/crons/route.ts:17-51` le `origin` do body, default `"db"`, passa para `core.createCronJob`; `packages/dashboard/src/lib/core.ts:254-279` insere na tabela |
| 4 | PUT /api/crons com job file-origin retorna 403 | PASS | `route.ts:153-163` le `existing.origin === 'file'` e retorna status 403 |
| 5 | DELETE /api/crons com job file-origin retorna 403 | PASS | `route.ts:109-117` mesmo padrao, status 403 |
| 6 | GET /api/skills le `~/.claude/skills/` e retorna `{name, description}[]` | PASS | `packages/dashboard/src/app/api/skills/route.ts:7,52-112` monta caminho via `homedir()`, parseia frontmatter, retorna `SkillInfo[]`, com cache 30s |
| 7 | GET /api/topics retorna topics do DB | PASS | `packages/dashboard/src/app/api/topics/route.ts:1-20` via `core.listTopics()`, projeta campos slim |

### CronEngine (6)

| # | Must-have | Status | Evidencia |
|---|---|---|---|
| 8 | `parseHeartbeat` descarta secao `## Managed by Dashboard` | PASS | `packages/core/src/cron-engine.ts:154-172` detecta marker, corta ate proximo `^## ` ou fim de arquivo antes do parse |
| 9 | `writeDashboardSection` escreve apenas db-origin, preserva file-origin e headers subsequentes | PASS | `cron-engine.ts:486-554`, filtro explicito em linha 500 (`jobs.filter((j) => j.origin === 'db')`), usa `###` nos job headers para evitar collision com parser, preserva trecho pos-marker via `rest.match(/^## /m)` |
| 10 | `syncJobsWithDb` so afeta file-origin | PASS | `cron-engine.ts:250-323` -- `existingJobs = allJobs.filter(j => j.origin === 'file')` (254); loop de update/create so insere com `origin: 'file'` (290, 308); loop de disable-removed so itera `existingJobs` file-origin (317) |
| 11 | `expandTemplateVars` substitui `{today}/{yesterday}/{now}` com ISO local | PASS | `cron-engine.ts:133-141` -- split/join literal, `formatDateIso` (YYYY-MM-DD local), `formatDateTimeIso` (YYYY-MM-DDTHH:MM local) |
| 12 | `executeJob` passa `expandedPrompt` ao runner | PASS | `cron-engine.ts:344` calcula `expandedPrompt`; linha 373 `runner.run(expandedPrompt, ...)` -- nao `job.prompt` literal |
| 13 | Apenas 3 vars suportadas, `{unknown}` preservado | PASS | `cron-engine.ts:137-141` split/join so toca as 3 strings literais; comentario na linha 131 explicita "Vars desconhecidas sao deixadas intactas" |

### Dashboard UI (17)

| # | Must-have | Status | Evidencia |
|---|---|---|---|
| 14 | `CronFormSheet` existe em `packages/dashboard/src/components/cron-form-sheet.tsx` | PASS | Arquivo presente; export `CronFormSheet` em linha 78 |
| 15 | Form tem name (required), schedule (preset+Custom), prompt c/ placeholder, target topic (+Default), enabled | PASS | `cron-form-sheet.tsx:261-404` -- todos os campos presentes. Nota: spec do prompt disse "5 presets" mas source of truth (08-CONTEXT.md:44-49) especifica 4 presets + Custom, e o codigo segue o CONTEXT.md (`cron-presets.ts:12-17`) |
| 16 | Validacao client com `CronExpressionParser.parse` (cron-parser v5) | PASS | `cron-form-sheet.tsx:5` import; linha 57 `CronExpressionParser.parse(trimmed)` dentro de `validateSchedule` |
| 17 | Preview human-readable (cronstrue) + proximas 3 execucoes | PASS | `cron-form-sheet.tsx:62-67` `cronstrue.toString`; linhas 58-61 loop de 3 iteracoes `iter.next().toDate()`; render em 313-325 |
| 18 | Save disabled quando schedule invalido OR name vazio OR prompt vazio | PASS | `cron-form-sheet.tsx:164-168` `canSave = name.trim().length > 0 && prompt.trim().length > 0 && preview.error === null && !saving`; linha 425 `disabled={!canSave}` |
| 19 | TZ local exibido perto do input | PASS | `cron-form-sheet.tsx:42-45` `LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone`; render em linha 307-309 |
| 20 | Link "Skills disponiveis" abre UI com lista de /api/skills | PASS | `cron-form-sheet.tsx:344-350` botao, `skillsOpen` state, nested Sheet em 435-472 renderiza skills loaded do `/api/skills` (fetch em 140) |
| 21 | `crons-tab.tsx` tem botao "+ New cron" no header | PASS | `crons-tab.tsx:260-266` dentro do div header |
| 22 | CronCard exibe badge 'file'/'db' conforme `job.origin` | PASS | `cron-card.tsx:58-72` Badge com `{job.origin}` e estilo condicional |
| 23 | CronCard tem Edit, Duplicate, Delete | PASS | `cron-card.tsx:150-178` tres botoes, alem de Run now e Pause/Resume |
| 24 | Edit/Delete disabled em cards file-origin com tooltip "Edit in HEARTBEAT.md" | PASS | `cron-card.tsx:154-157` Edit `disabled={isFileOrigin}` + `title={fileTooltip}`; 173-176 Delete com mesma logica; `fileTooltip = "Edit in HEARTBEAT.md"` em linha 46 |
| 25 | Duplicate funciona em ambos, pre-preenche com " (copy)" | PASS | `crons-tab.tsx:148-162` -- cria copia com `id: 0`, `name: "${job.name} (copy)"`, forca `origin: "db"`; CronFormSheet abre em CREATE mode pois `Boolean(initialJob?.id)` e false para id=0, mas preenche campos pois `initialJob` esta definido |
| 26 | `DeleteCronDialog` mostra nome do job | PASS | `delete-cron-dialog.tsx:33` `Delete cron "{jobName}"?` no DialogTitle |
| 27 | Empty state tem botao grande "+ Create your first cron" | PASS | `crons-tab.tsx:282-299` renderizado quando `sortedJobs.length === 0`, Button size="lg" |
| 28 | Editor raw HEARTBEAT.md removido da sidebar fixa, movido pra drawer "Advanced" | PASS | `session-sidebar.tsx:14-50` nao contem textarea de HEARTBEAT; `crons-tab.tsx:267-274` botao Advanced; 341-386 Sheet com Textarea de HEARTBEAT.md |
| 29 | Toast apos create/edit/delete | PASS | `crons-tab.tsx:51-54` helper showToast; chamadas em handleConfirmDelete (177, 181), handleSaved (194), handleSaveHeartbeat (215); render em 389-401 |
| 30 | `cron-parser` e `cronstrue` nas deps | PASS | `packages/dashboard/package.json:16-17` -- `cron-parser: ^5.5.0`, `cronstrue: ^3.14.0` |

### Deps, TSC (4)

| # | Must-have | Status | Evidencia |
|---|---|---|---|
| 31 | package.json do dashboard tem cron-parser e cronstrue | PASS | duplicado com 30 |
| 32 | TSC no packages/dashboard limpo (exceto `sessions-tab.tsx:185` pre-existente) | PASS | `bunx tsc --noEmit` reporta exatamente 1 erro: `sessions-tab.tsx(185,9): error TS2322: ... Property 'createdAt' is missing ...` -- o mesmo e unico erro permitido pelo escopo |
| 33 | TSC no packages/core limpo | PASS | `bunx tsc --noEmit` sem output |

### Regressoes Fase 7 (2)

| # | Must-have | Status | Evidencia |
|---|---|---|---|
| 34 | cron-engine.ts ainda executa jobs file-origin (CRON-01/02/03/04) | PASS | Caminho de execucao nao discrimina origem: `start()` (218) parseia HEARTBEAT, chama `syncJobsWithDb` e depois `scheduleJob` para todos os `dbJobs` enabled (239-242). `watchHeartbeat` (447) ainda observa o arquivo com debounce 2s -> `stop()/start()` (462-463). `eventBus.emit('cron:result', ...)` (412) preservado. Parser (154-216) preservado exceto pelo skip da secao managed. |
| 35 | Endpoints pre-existentes (/api/crons GET, /api/heartbeat, /api/memory, /api/sessions) ainda respondem | PASS | `route.ts` de todos os 4 tem `export async function GET` (grep confirmou); /api/crons GET usa `core.listCronJobs()` como antes com fallback para mockCronJobs |

## Requisitos -- Rastreabilidade

| Requisito | Fonte | Status | Evidencia |
|---|---|---|---|
| DASH-04 | REQUIREMENTS.md:114 (marcado `[x]`) | SATISFIED | Todos os 35 must-haves acima passaram; CRUD end-to-end presente em codigo (form, route, state-store, core lib); preview validation-client, empty state, delete dialog, tooltips file-origin, toast, skill helper, raw editor em drawer |
| CRON-01 | Fase 7 | REGRESSION-SAFE | Parser cron + tick via `new Cron(job.schedule, ...)` em linha 327; execucao via ClaudeRunner em 369-384 |
| CRON-02 | Fase 7 | REGRESSION-SAFE | `parseHeartbeat` preserva logica original (174-215); unica mudanca e skip da secao managed -- deliberate |
| CRON-03 | Fase 7 | REGRESSION-SAFE | `watchHeartbeat` (447-475) + debounce 2s + stop/start loop preservado |
| CRON-04 | Fase 7 | REGRESSION-SAFE | `eventBus.emit('cron:result', { jobId, jobName, topicId, topicName: '', output, status })` na linha 412-419 preservado |

**NAO avaliados nesta sessao (por ordem explicita do recorte):** DASH-01, DASH-02, DASH-03, DASH-05, DASH-06, DASH-07. REQUIREMENTS.md mostra todos os outros DASH-* como "Pendente" -- **nao marcar**.

## Anti-padroes escaneados

Nenhum bloco `TODO/FIXME/PLACEHOLDER/coming soon/return null` em codigo critico do recorte. As ocorrencias de `return null` em `packages/dashboard/src/lib/core.ts` sao fallback legitimo quando `getDb()` falha (sinal para rota usar mock), nao stub. `return null` em `cron-form-sheet.tsx` e `SchedulePreview.humanReadable` quando cronstrue falha -- estado valido.

## Gaps

Nenhum gap bloqueante encontrado. A "discrepancia" de 4 vs 5 presets e textual entre prompt de verificacao e CONTEXT.md (source of truth); codigo esta correto vs source of truth.

## Verificacao Humana Recomendada

1. **Click fisico no + New cron no header** -- confirmar que o Sheet abre (componentes base-ui/react headless, formacao visual so renderiza em browser).
2. **Click em "Skills disponiveis (N)"** dentro do form -- confirmar que o nested Sheet (Sheet dentro de Sheet) nao trava o primeiro nem quebra a-11y / foco.
3. **Fluxo completo CRUD num browser:** criar db-origin, editar, duplicar, deletar -- confirmar toast visivel por ~3s, pulse highlight 3s no card recem-salvo, latencia subjetiva < 300ms de submit a UI refletir.
4. **Tooltip hover em Edit/Delete** de um card `origin='file'` -- confirmar texto "Edit in HEARTBEAT.md" aparece.
5. **CRUD sem restart vs CronEngine vivo:** rodar o bot com HEARTBEAT.md populado, criar job db-origin via dashboard, aguardar (ou disparar com schedule de 1 min) -- confirmar que o job e agendado e executado sem reiniciar o processo. Este e o UNICO criterio de sucesso explicito do ROADMAP que nao da pra verificar so lendo codigo, porque depende do processo bot + cronEngine.start() estar ativo e de como o dashboard API notifica o engine (observacao: o dashboard atual grava direto no SQLite via `core.createCronJob` -- o CronEngine **so** pega o job novo no proximo `start()`, que so e chamado de `watchHeartbeat` quando o arquivo muda. Isso significa que, sem chamar `writeDashboardSection` ou sem um mecanismo IPC de reload, jobs db-origin criados pelo dashboard NAO sao agendados ate o proximo restart do bot ou a proxima modificacao em HEARTBEAT.md. **Isso merece investigacao humana/funcional** -- o codigo esta presente mas o wiring "refletir sem restart" depende de decisao externa ao DASH-04 e pode ser mais um debito de design/integracao do que defeito do recorte desta sessao.)
6. **Migration idempotente em DB real:** rodar o bot duas vezes contra um SQLite que existia antes da migration -- confirmar que colunas sao adicionadas na 1a vez, nao quebram na 2a, e jobs antigos aparecem com `origin='file'` (default) no dashboard.

O item 5 acima e o mais importante: **o criterio de sucesso do ROADMAP "CRUD de crons funciona e reflete no CronEngine sem restart" so pode ser validado rodando o bot vivo.** Olhando so o codigo do CronEngine, nao ha entry point chamado pelo dashboard quando um job db-origin e criado -- o dashboard escreve no DB, mas o CronEngine so re-le o DB dentro de `start()`, que so roda no boot ou no file watcher de HEARTBEAT.md. Esta e uma **observacao arquitetural** para o orquestrador considerar, nao um gap de DASH-04 especificamente (os 6 planos consolidados nao pediram um canal de reload IPC -- eles pediram a CRUD UI e a migration, que estao completas).
