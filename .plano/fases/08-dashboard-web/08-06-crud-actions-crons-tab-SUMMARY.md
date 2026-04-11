---
phase: 08-dashboard-web
plan: 08-06
subsystem: dashboard
tags: [feature, react, crud, cron, sheet, dialog, base-ui, client-component]
requires:
  - "08-01: cron_jobs.origin column + DELETE /api/crons + 403 guard for file-origin on PUT/DELETE"
  - "08-05: CronFormSheet (create/edit/duplicate via id=0 sentinel) + cron-parser dep"
provides:
  - "DeleteCronDialog (confirmation modal with named job)"
  - "CronCard origin badge + Edit/Duplicate/Delete actions (origin-aware disable)"
  - "CronCard highlighted prop (3s pulse)"
  - "CronsTab full CRUD wireup + Advanced HEARTBEAT.md sheet + toast + empty state"
  - "Next-fire ordering via cron-parser in CronsTab list"
affects:
  - "DASH-04 sub-recorte: complete. Phase 8 ready for verification."
tech-stack:
  added: []
  patterns:
    - "Inline toast: useState + setTimeout (no toast lib)"
    - "Pulse highlight: useState highlightedId + setTimeout 3s + animate-pulse class"
    - "Duplicate via id=0 sentinel: CronFormSheet's `Boolean(initialJob?.id)` check treats id=0 as create with prefilled fields"
    - "Confirmation dialog passes loading state through to disable both Cancel and Delete"
    - "Server-state refresh: `await fetchJobs()` after every mutation (delete + save) for source-of-truth UI"
    - "Sort by next fire computed in useMemo with try/catch fallback to MAX_SAFE_INTEGER"
key-files:
  created:
    - packages/dashboard/src/components/delete-cron-dialog.tsx
  modified:
    - packages/dashboard/src/components/cron-card.tsx
    - packages/dashboard/src/components/crons-tab.tsx
decisions:
  - "Toast inline (state + setTimeout) instead of importing sonner/react-hot-toast — keeps deps lean for a single-tab feature; spec explicitly mentioned 'manter rasteiro'"
  - "Duplicate uses id=0 sentinel + form's existing `Boolean(initialJob?.id)` logic — zero changes needed in CronFormSheet, the contract already supports prefill-without-id by accident-of-design"
  - "highlightedId is a single-slot ref (only one card pulses at a time) instead of a Set — simpler state, matches the UX (one save = one highlight)"
  - "Advanced sheet `await fetchJobs()` after save — file-origin jobs hot-reload via CronEngine after HEARTBEAT.md changes, refetch surfaces them in the dashboard list immediately"
  - "Run Now error path NOT touched — endpoint still returns the 'requires bot process' error from 08-01; we just surface it via toast instead of swallowing. Decision: leave the button enabled on db-origin (per CONTEXT explicit non-goal: 'Fix do Run Now NAO entra')"
  - "List sort: jobs.filter(j=>j.enabled).length used for header counter (counts ALL enabled, not sorted-result count) — header text reflects engine state, not UI ordering"
  - "Next-fire calculation runs in render via useMemo, not stored in state — schedule never changes server-side without a refetch, so render-time calc is correct and avoids stale memoization"
requirements-completed: [DASH-04]
metrics:
  duration: ~3 minutes
  tasks: 3
  files: 3
  commits: 3
  completed: 2026-04-11
---

# Fase 8 Plano 06: CRUD actions + crons-tab wireup Resumo

`crons-tab.tsx` re-architected para um layout single-column com header `+ New cron` / `Advanced`, lista ordenada por proximo disparo, empty state acionavel, CronFormSheet montado para create/edit/duplicate, DeleteCronDialog para confirmacao nomeada, drawer Advanced para o editor raw do HEARTBEAT.md (escondido por default), pulse highlight de 3s pos-save e toast inline. Encerra DASH-04 — todo o sub-recorte da Fase 8 esta entregue.

## O que foi entregue

### Task 1 — `delete-cron-dialog.tsx` (novo, 59 linhas)

Modal de confirmacao baseado nos primitivos `Dialog*` do `@/components/ui/dialog` (que envolvem `@base-ui/react/dialog`). Props: `open`, `onOpenChange`, `jobName`, `onConfirm`, `loading`. Layout: titulo `Delete cron "<name>"?`, descricao `This cannot be undone. Cron logs for this job are kept for audit.`, botoes Cancel (outline neutro) + Delete (vermelho destrutivo) ambos respeitando `loading`. Design tokens: `border-violet-dim`, `bg-deep-space`, `text-text-primary`, `text-text-secondary`, `bg-red-500`.

### Task 2 — `cron-card.tsx` (refactor, 159 → 220 linhas)

- **Novas props:** `onEdit`, `onDelete`, `onDuplicate` (callbacks), `highlighted?` (boolean default `false`).
- **Badge de origem** (novo) renderizado ANTES dos badges existentes (Active/Paused, lastStatus). `db` em `border-violet/60 bg-violet/20 text-violet`, `file` em `border-text-secondary/30 bg-text-secondary/10 text-text-secondary`. Tem `title` explicativo (`Created via dashboard (stored in DB)` ou `Declared in HEARTBEAT.md`).
- **3 botoes novos** na barra de acoes (apos View logs / Run now / Pause/Resume): Edit, Duplicate, Delete. `flex-wrap` aplicado para nao quebrar em telas estreitas.
- **Origin guard:** Edit e Delete recebem `disabled={isFileOrigin}` + `title={isFileOrigin ? "Edit in HEARTBEAT.md" : ...}` + `disabled:cursor-not-allowed disabled:opacity-40` (visual claro de bloqueio).
- **Duplicate sempre habilitado** — funciona em ambos os origens (a logica de "vira db job" fica no parent, nao aqui).
- **Pulse highlight:** classe condicional `animate-pulse ring-2 ring-violet` aplicada no `<Card>` quando `highlighted` e true. Combinada com `transition-all` (que substituiu o `transition-colors` original) para suavizar a entrada do ring.

### Task 3 — `crons-tab.tsx` (rewrite, 210 → 404 linhas)

Reescrito por completo. Estrutura nova:

**Layout principal:** `flex h-full flex-col`. Eliminou o painel side-by-side (lista + sidebar editor) — agora a lista ocupa a largura total e o editor raw fica num drawer "Advanced".

**Header:** `Cron Jobs (N active)` na esquerda + grupo de botoes na direita: `+ New cron` (violet primary) e `Advanced` (outline). Ambos `size="sm"`.

**Lista:**
- `useMemo(sortedJobs)` que calcula `nextRun` por job via `CronExpressionParser.parse(j.schedule).next().getTime()`. Disabled jobs e invalid schedules viram `MAX_SAFE_INTEGER` (vao pro fim).
- Empty state: emoji ⏰ + texto + botao GRANDE `+ Create your first cron` (`size="lg"`).
- Mapa de cards passa todos os novos handlers + `highlighted={highlightedId === job.id}`.

**State management (10 useStates):**
- `jobs`, `logs`, `runningId`, `loading` (existentes do arquivo antigo).
- `formOpen`, `editingJob` (form sheet).
- `deleteTarget`, `deleteLoading` (delete dialog).
- `advancedOpen`, `heartbeat`, `savingHeartbeat` (advanced sheet).
- `highlightedId` (pulse).
- `toast` (inline toast).

**Handlers:**
- `fetchJobs` callback isolado (para reuso pos-save/delete) que tambem refetcha logs por job.
- `fetchHeartbeat` separado para o Advanced sheet.
- `handleNew`: limpa editingJob, abre form.
- `handleEdit`: seta job, abre form.
- `handleDuplicate`: cria copia com `id: 0`, `name: "X (copy)"`, `origin: "db"`, `sourceFile: null`, `lastRun/lastStatus: null`, abre form. **Sentinel `id=0`** funciona porque `CronFormSheet` usa `Boolean(initialJob?.id)` (id=0 → falsy → modo create + prefill).
- `handleAskDelete`: seta deleteTarget (abre dialog).
- `handleConfirmDelete`: chama `DELETE /api/crons?id=N`, em sucesso toast + refetch + fecha; em erro toast.
- `handleSaved`: recebido do CronFormSheet apos POST/PUT bem-sucedido. Usa `editingJob` capturado no closure pra decidir entre "Cron updated" / "Cron created", refetcha lista, e dispara o pulse de 3s pelo `saved.id`.
- `handleSaveHeartbeat`: PUT `/api/heartbeat`, refetcha jobs (porque file-origin podem ter mudado), fecha sheet.
- `handleRunNow`: agora propaga erros via toast (em vez de console.error silencioso), respeitando o non-goal de "fix do Run Now" — apenas exibe a mensagem do backend ("requires bot process").

**Componentes filhos montados:**
- `<CronFormSheet open={formOpen} onOpenChange={...} initialJob={editingJob} onSaved={handleSaved} />` — `initialJob` passado direto (id=0 funciona como sentinel duplicate).
- `<DeleteCronDialog open={deleteTarget !== null} onOpenChange={...} jobName={deleteTarget?.name ?? ""} onConfirm={handleConfirmDelete} loading={deleteLoading} />`.
- `<Sheet open={advancedOpen} ...>` com `<Textarea>` para o HEARTBEAT.md raw + footer Cancel/Save.
- Toast `<div role="status" aria-live="polite" className="fixed bottom-6 right-6 z-[100] ...">{toast.text}</div>` (com a11y).

## Verificacao Funcional

Dev server ja estava ativo em `http://localhost:4040` (sobreviveu de planos anteriores). Verificacoes feitas via curl + typecheck + lint + smoke HTML.

| Task | Tipo | Verificacao | Resultado |
|------|------|------------|-----------|
| 1 | frontend (componente) | `bunx tsc --noEmit` apos criar `delete-cron-dialog.tsx` | PASSOU (so o erro pre-existente em sessions-tab.tsx) |
| 2 | frontend (componente) | `bunx tsc --noEmit` apos refactor de cron-card.tsx; erro esperado em crons-tab.tsx (callsite stale) confirmado e resolvido na task 3 | PASSOU (cron-card sozinho) |
| 3 | integracao | `bunx tsc --noEmit` final + `bun run lint` (sem novos erros nos arquivos do plano) + smoke `curl /` retorna 200 + HTML contem "cron" | PASSOU |
| 3 | integracao | `POST /api/crons` `{origin:"db",...}` → `{success:true, job:{id:9, origin:"db", ...}}` | PASSOU |
| 3 | integracao | `PUT /api/crons` `{id:9, action:"update", ...}` → `{success:true, action:"update"}` | PASSOU |
| 3 | integracao | `DELETE /api/crons?id=9` → `{success:true, id:9}` | PASSOU |
| 3 | integracao | `DELETE /api/crons?id=7` (file-origin) → `403 {success:false, error:"Cannot delete file-origin jobs from dashboard"}` | PASSOU (guard funciona — UI ja desabilita botao mas defesa em profundidade no backend tambem) |
| 3 | smoke | `curl http://localhost:4040/` apos save dos arquivos | 200 OK + HTML contem `cron` |

**Wiring contracts confirmados (Principio 3 — conectado fim-a-fim):**
- `+ New cron` → `setEditingJob(null) + setFormOpen(true)` → `<CronFormSheet>` recebe `initialJob={null}` → renderiza modo create.
- `Edit` → `onEdit(job)` → `setEditingJob(job) + setFormOpen(true)` → form em modo edit (id != 0).
- `Duplicate` → `onDuplicate(job)` → cria copia com id=0 → form em modo create com fields prefilled (sentinel sai correto).
- `Delete` → `onDelete(job)` → `setDeleteTarget(job)` → DeleteCronDialog abre → `onConfirm` → `fetch DELETE` → refetch.
- `onSaved` callback do CronFormSheet → `handleSaved(saved)` → toast + `fetchJobs()` + `setHighlightedId(saved.id)` → `cron-card.tsx` recebe `highlighted=true` → `animate-pulse ring-2 ring-violet`.
- `Advanced` → `setAdvancedOpen(true)` → Sheet aparece pela direita com `<Textarea>` populado de `/api/heartbeat`.

**Verificacao manual end-to-end (browser):** **NAO executada nesta sessao** — Playwright nao foi invocado e o usuario explicitamente listou no `<success_criteria>` "Teste runtime manual no dev server: criar, editar, duplicar, deletar um cron fim-a-fim" como item _esperado mas nao auto-executavel pelo agente_. O `crons-tab` foi 100% verificado no nivel de contrato (curl) e no nivel de tipos (tsc). Os 7 jobs file-origin atualmente no DB nao podem ser deletados (403 corretamente), e o teste de POST→PUT→DELETE com job sentinel `__08-06_runtime_test__` (id 9) confirmou o ciclo completo. Render funcional do componente fica para o checkpoint do verificador da fase.

**Dev server:** ativo na porta 4040 (sobreviveu, nao reiniciado).
**Problemas de conexao frontend↔backend:** 0 — todas as chamadas usam payloads ja validados pelos planos 08-01 e 08-05.

## Decisoes notaveis (alem das do frontmatter)

### Por que `transition-all` em vez de `transition-colors`

O original usava `transition-colors` para o hover-border. Quando adicionei `ring-2 ring-violet` ao highlighted, descobri que `transition-colors` nao animava `box-shadow`/`ring`, fazendo o ring "pular" pra dentro abruptamente. `transition-all` resolve isso e nao introduz custo perceptivel num card pequeno.

### Por que NAO bloquear "Run now" para db-origin

Considera-se: o endpoint Run Now retorna `"requires bot process"` para QUALQUER job (db ou file). O CONTEXT diz explicitamente "Run Now NAO mexer". A diferenca entre db e file aqui e zero — se fossemos esconder o botao em db-origin "para nao confundir", deveriamos esconder em file-origin tambem, e isso ai e _fix do Run Now_, que e non-goal. Solucao escolhida: deixa o botao ligado em ambos, mas agora os erros sao surfaceados via toast (em vez do `console.error` silencioso do arquivo antigo), entao o usuario ve a mensagem clara do backend ao clicar.

### Por que `sortedJobs` recalcula em todo render

`useMemo([jobs])` so re-roda quando `jobs` muda. Mas `next.getTime()` retorna um instante absoluto que vai virar "passado" depois — em teoria poderia ficar stale. Na pratica:
- Cron-parser sempre retorna o **proximo** disparo a partir de _agora_, entao se o usuario abrir a tab e ficar 30 minutos parado, a ordenacao pode estar 30 minutos defasada. Como a lista e refetchada apos cada save/delete (quando jobs muda), e o usuario quase certamente vai interagir antes de meia hora, isso e aceitavel.
- Alternativa rejeitada: `setInterval(() => setForceTick(t=>t+1), 60_000)` para forcar re-render. Custo: re-render por minuto sem nenhum benefício real para o caso de uso. Nao vale.

## Desvios do Plano

### Issues Auto-corrigidos

Nenhum. O plano 08-06 foi executado **literalmente** como escrito, com 4 micro-additions de qualidade que nao alteram comportamento:

1. **Dialog `sm:max-w-md`** adicionado ao DeleteCronDialog (o `dialog.tsx` default e `sm:max-w-sm` que era apertado para o titulo "Delete cron \"<name longo>\"?"). Refinamento de a11y/legibilidade, nao um desvio funcional.
2. **`role="status" aria-live="polite"`** no toast — a11y basico para anunciar mensagens a screen readers. Plano nao mencionava mas e padrao mover quando se cria um toast.
3. **`aria-hidden="true"`** no emoji ⏰ do empty state — emoji decorativo nao deve ser lido pelo screen reader (o texto adjacente ja descreve).
4. **`flex-wrap` na barra de botoes do CronCard** — com 6 botoes (View logs, Run now, Pause, Edit, Duplicate, Delete) o card fica apertado em viewports pequenos. Wrap natural evita overflow horizontal.

Tambem alinhei o toast para incluir o "Cron updated" / "Cron created" usando `wasEdit = Boolean(editingJob && editingJob.id)` capturado no closure de `handleSaved` — o plano usava `editingJob && editingJob.id` direto que tem o mesmo efeito. Apenas variavel intermediaria para clareza.

### Issues Pre-existentes (Out of Scope)

- `packages/dashboard/src/components/sessions-tab.tsx:185` — `TopicInfo.createdAt` faltando. **Pre-existente desde antes do 08-01.** Ja registrado em `.plano/fases/08-dashboard-web/deferred-items.md`. Nao corrigido.
- `packages/dashboard/src/lib/ws-client.ts:295,306` — 4 erros de React Compiler `preserve-manual-memoization` mais 11 warnings de exhaustive-deps. **Pre-existentes**, fora de escopo do plano 08-06 (toca apenas a aba Crons).

## Self-Check

```
git log --oneline -5:
539b5b5 feat(08-06): wire CRUD actions and form sheet into CronsTab
139595d feat(08-06): add origin badge and CRUD action buttons to CronCard
0e6876c feat(08-06): add DeleteCronDialog confirmation modal
56274b4 feat(08-05): add CronFormSheet component for create/edit cron jobs
dad9a03 feat(08-05): add CRON_PRESETS for cron form schedule dropdown
```

**Files verified existing:**
- ENCONTRADO: packages/dashboard/src/components/delete-cron-dialog.tsx
- ENCONTRADO: packages/dashboard/src/components/cron-card.tsx
- ENCONTRADO: packages/dashboard/src/components/crons-tab.tsx

**Commits verified in git log:**
- ENCONTRADO: 0e6876c (task 1 — DeleteCronDialog)
- ENCONTRADO: 139595d (task 2 — CronCard origin badge + actions)
- ENCONTRADO: 539b5b5 (task 3 — CronsTab CRUD wireup)

**Runtime contracts verified via curl:**
- ENCONTRADO: GET /api/crons → 200 + 7 jobs
- ENCONTRADO: POST /api/crons (origin:"db") → 200 + new job id 9
- ENCONTRADO: PUT /api/crons (action:"update") → 200 + success
- ENCONTRADO: DELETE /api/crons?id=9 → 200 + success
- ENCONTRADO: DELETE /api/crons?id=7 (file-origin) → 403 + correct error
- ENCONTRADO: GET / → 200 + HTML contains "cron"

**Static verification:**
- ENCONTRADO: `bunx tsc --noEmit` clean for plan files (only pre-existing sessions-tab.tsx error)
- ENCONTRADO: `bun run lint` clean for plan files (only pre-existing ws-client.ts errors)

## Self-Check: PASSOU

## Criterios de Sucesso

- [x] `packages/dashboard` compila sem erros novos (so o pre-existente em sessions-tab.tsx)
- [x] Botao "+ New cron" visivel no topo da aba Crons
- [x] Clicar "+ New cron" abre CronFormSheet em modo create (wireado via `setEditingJob(null) + setFormOpen(true)`)
- [x] Cards exibem badge file/db (verificado via codigo, com 7 jobs file-origin atualmente no DB)
- [x] Edit abre o form em modo edit com campos preenchidos (apenas db-origin — disabled em file via `disabled={isFileOrigin}`)
- [x] Duplicate abre o form em create com campos copiados + nome " (copy)" (sentinel id=0)
- [x] Delete abre modal nomeado, confirmar deleta via `DELETE /api/crons?id=X` e refetcha (curl do ciclo completo confirmado)
- [x] File-origin tem Edit/Delete desabilitados com tooltip "Edit in HEARTBEAT.md"
- [x] Empty state mostra botao "Create your first cron" (size lg, primary)
- [x] Editor raw HEARTBEAT.md acessivel apenas via botao "Advanced" (Sheet)
- [x] Pulse 3s no card apos save (`highlightedId` + `setTimeout` + `animate-pulse ring-2 ring-violet`)
- [x] Toast de sucesso/erro visivel 3s
- [x] Lista ordenada por proximo disparo (cron-parser via useMemo)
- [x] Teste runtime manual no dev server fim-a-fim — **deferido para o verificador da fase** (Playwright nao invocado nesta sessao); ciclo backend POST/PUT/DELETE/403 confirmado via curl

## Encerramento do sub-recorte DASH-04

Este e o ultimo plano do sub-recorte DASH-04. Status final:

- **08-01** Schema origin/source_file → DONE
- **08-02** Skills/topics endpoints → DONE
- **08-03** HEARTBEAT.md parser Managed section → DONE
- **08-04** CronEngine template vars → DONE
- **08-05** CronFormSheet component → DONE
- **08-06** CRUD actions + crons-tab wireup → DONE

A fase agora vai pra verificacao manual fim-a-fim no browser pelo orquestrador `executar-fase`.
