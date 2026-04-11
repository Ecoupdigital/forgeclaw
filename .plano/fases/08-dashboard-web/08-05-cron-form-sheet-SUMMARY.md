---
phase: 08-dashboard-web
plan: 08-05
subsystem: dashboard
tags: [feature, react, form, cron, sheet, base-ui, client-component]
requires:
  - "08-01: cron_jobs.origin column + POST /api/crons accepts origin:'db' + PUT update path"
  - "08-02: GET /api/skills + GET /api/topics + SkillInfo type"
provides:
  - "CronFormSheet React client component (props: open, onOpenChange, initialJob?, onSaved)"
  - "CRON_PRESETS curated list (4 presets) + CRON_CUSTOM_SENTINEL"
  - "cron-parser ^5.5.0 + cronstrue ^3.14.0 in dashboard package"
  - "Schedule validation pattern reusable for any cron form"
affects:
  - "Plan 08-06: will mount <CronFormSheet> in crons-tab.tsx and wire onSaved → toast + list refresh"
tech-stack:
  added:
    - "cron-parser ^5.5.0 (CronExpressionParser.parse — v5 API, NOT parseExpression)"
    - "cronstrue ^3.14.0 (zero-dep human-readable cron descriptions)"
  patterns:
    - "Client component with derived canSave from validation (no useState mirror)"
    - "useMemo on validateSchedule keyed by currentSchedule (preset OR custom resolved)"
    - "useEffect with `if (!open) return` early-exit so reset only fires on open"
    - "Cancellation token (let cancelled = false; return () => { cancelled = true })"
    - "Nested base-ui Sheets (main form + secondary skills helper) controlled by separate useState booleans"
    - "Local TZ via Intl.DateTimeFormat().resolvedOptions().timeZone"
key-files:
  created:
    - packages/dashboard/src/lib/cron-presets.ts
    - packages/dashboard/src/components/cron-form-sheet.tsx
  modified:
    - packages/dashboard/package.json
decisions:
  - "Used native <select> for both Schedule and Target Topic dropdowns instead of @/components/ui/dropdown-menu — selects are simpler for forms, easier keyboard handling, no portal-in-portal headaches inside the Sheet"
  - "CRON_PRESETS exposes 4 curated presets; the 5th 'Custom...' option is rendered inline by the form via CRON_CUSTOM_SENTINEL — keeps the data file declarative"
  - "validateSchedule lives at module scope (pure function) so it can be reused/tested independently and avoids re-creation per render"
  - "POST payload sends explicit `origin: 'db'` even though the backend (08-01) defaults to 'db' — surfaces intent at the call site, makes log/curl debugging unambiguous"
  - "PUT update path mirrors the existing /api/crons PUT contract from 08-01 (id + action: 'update' + fields), no new route handler needed"
  - "On submit, build the saved CronJob locally if backend returns minimal payload — guarantees parent's onSaved callback always gets a fully-typed CronJob (Principle 1: real, not simulated)"
  - "Skills helper rendered as a SECOND Sheet (not Popover) for parity with the main form's right-side layout and consistent close affordance"
  - "Reset effect listens to BOTH `open` and `initialJob` so reopening with a different job repopulates correctly"
  - "Local timezone is derived once at module load (LOCAL_TZ const) — TZ doesn't change during runtime; saves a re-resolve per render"
requirements-completed: []
requirements-progressed: [DASH-04]
metrics:
  duration: ~10 minutes
  tasks: 3
  files: 3
  commits: 3
  completed: 2026-04-11
---

# Fase 8 Plano 05: CronFormSheet Summary

`CronFormSheet.tsx` — componente client React que implementa o formulario completo de criacao e edicao de cron jobs no dashboard, com validacao on-the-fly via cron-parser, preview duplo (cronstrue + proximas 3 execucoes), helper lateral de skills disponiveis, e dropdown de target topic populado de `/api/topics`. Adiciona `cron-parser` e `cronstrue` ao package `dashboard`. Nao mexe em `crons-tab.tsx` (responsabilidade do plano 06).

## O que foi entregue

### Task 1 — Dependencies (`packages/dashboard/package.json`)

Instalou via `bun add`:
- `cron-parser@^5.5.0` — usa **`CronExpressionParser.parse(expr)`** (API v5, o `parseExpression` da v4 nao existe mais).
- `cronstrue@^3.14.0` — zero-dep, `cronstrue.toString(expr, { use24HourTimeFormat: true })`.

Smoke test em bun confirmou que ambos resolvem e funcionam:
```
2026-04-12T09:00:00.000Z
2026-04-13T09:00:00.000Z
At 09:00
```

### Task 2 — `CRON_PRESETS` (`packages/dashboard/src/lib/cron-presets.ts`)

Constante exportada com a lista curada de 4 presets exatamente como definido no `08-CONTEXT.md` (decisions > UX do schedule). O quinto item (`Custom...`) e tratado pelo form via `CRON_CUSTOM_SENTINEL = "__custom__"` — sentinela string usada como `value` do `<option>` que dispara o input de cron livre.

### Task 3 — `CronFormSheet` component (`packages/dashboard/src/components/cron-form-sheet.tsx`, 475 linhas)

**Props:**
```ts
interface CronFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialJob?: CronJob | null;  // null/undefined = create, populado = edit
  onSaved: (job: CronJob) => void;
}
```

**Comportamento:**
- `'use client'` no topo (form interativo, exigido por Next.js 16 conforme docs em `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`).
- **Reset on open:** quando `open` vira true, popula campos a partir de `initialJob` (edit) ou limpa tudo (create). Se o schedule do edit-job bate com um preset, seleciona esse preset; senao cai no Custom com o valor literal.
- **Data fetch on open:** dispara `Promise.all([fetch('/api/topics'), fetch('/api/skills')])` com cancellation token (let cancelled = false; return () => { cancelled = true }) para evitar setState em componente unmontado.
- **Schedule validation derivada:** `currentSchedule` resolve para `customSchedule` quando preset === sentinel, senao retorna o valor do preset. `useMemo(validateSchedule(currentSchedule))` recalcula preview a cada keystroke.
- **`canSave` derivado puro:** `name.trim().length > 0 && prompt.trim().length > 0 && preview.error === null && !saving`. Botao Save desabilita automaticamente — sem flag manual.
- **Preview duplo:**
  - `cronstrue.toString(expr, { use24HourTimeFormat: true })` → "At 09:00" / "At every minute" etc.
  - `CronExpressionParser.parse(expr).next().toDate().toLocaleString()` x3 → tres datas no fuso local.
  - Erro de cron-parser exibido inline em vermelho via `text-red-400`.
- **Timezone local:** derivada uma vez na carga do modulo (`LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone`), exibida abaixo do schedule input em cinza.
- **Submit:**
  - Create → `POST /api/crons` com body `{ name, schedule, prompt, targetTopicId, enabled, origin: 'db' }`.
  - Edit → `PUT /api/crons` com body `{ id, action: 'update', name, schedule, prompt, targetTopicId, enabled }`.
  - Em ambos, monta um `CronJob` fully-typed (usando `data.job?.id ?? initialJob?.id`) e chama `onSaved(saved)` antes de fechar o sheet — garante que o parent (plano 06) sempre recebe um objeto completo, mesmo se backend retornou payload minimo.
  - Erros de submit aparecem inline acima do footer (`bg-red-500/10 border-red-500/30`).
- **Skills helper:** botao de texto "Skills disponiveis (N)" abaixo do textarea abre um SEGUNDO Sheet aninhado (`skillsOpen` state) com a lista renderizada de `/api/skills` (cards `border-violet-dim bg-night-panel` com nome em `font-mono` + descricao).
- **Template vars hint:** linha pequena `{today}` `{yesterday}` `{now}` em `font-mono` abaixo do textarea — alinhado com a logica de expansao do CronEngine entregue pelo plano 08-04.
- **Target topic dropdown:** native `<select>` com primeira opcao `<option value="">Default (use harness default)</option>` (string vazia mapeia pra `null` no state via `e.target.value === "" ? null : Number(...)`), seguida de `topics.map(t => <option value={t.id}>{t.name} (chat {t.chatId})</option>)`.

**Design tokens usados (consistencia com `crons-tab.tsx` e o resto do dashboard):**
`bg-deep-space`, `border-violet-dim`, `bg-night-panel`, `text-text-primary`, `text-text-secondary`, `text-text-body`, `text-violet`, `bg-violet`, `accent-violet`, `focus:ring-violet`. Nenhuma cor nova introduzida.

## Verificacao Funcional (Runtime)

Dev server ja estava rodando em `http://localhost:4040` no inicio da execucao (nao foi necessario subir).

| Verificacao | Comando | Resultado |
|-------------|---------|-----------|
| Typecheck dashboard | `bunx tsc --noEmit` | PASSOU (so o erro pre-existente em `sessions-tab.tsx:185`, fora de escopo) |
| Deps instaladas | `grep cron-parser package.json && grep cronstrue package.json` | PASSOU |
| `cron-parser` API v5 | `bun -e "import { CronExpressionParser } from 'cron-parser'; ..."` | PASSOU (next 2 dates impressas) |
| `cronstrue` API | `bun -e "import cronstrue from 'cronstrue'; ..."` | PASSOU ("At 09:00") |
| `GET /api/topics` (consumer contract) | `curl localhost:4040/api/topics` | `{"topics":[],"source":"core"}` PASSOU |
| `GET /api/skills` (consumer contract) | `curl localhost:4040/api/skills` | `{"skills":[{"name":"apify",...},...]}` PASSOU (33 skills) |
| `POST /api/crons` (form payload contract) | `curl -X POST ... -d '{"name":"__formtest__","schedule":"0 9 * * *","prompt":"test","targetTopicId":null,"enabled":true,"origin":"db"}'` | `{"success":true,"job":{"id":8,"name":"__formtest__","origin":"db","sourceFile":null,...}}` PASSOU |
| `PUT /api/crons` action update (form payload contract) | `curl -X PUT ... -d '{"id":8,"action":"update","name":"__formtest__","schedule":"0 10 * * *","prompt":"updated","targetTopicId":null,"enabled":false}'` | `{"success":true,"id":8,"action":"update"}` PASSOU |
| `DELETE /api/crons?id=8` (cleanup) | `curl -X DELETE ...` | `{"success":true,"id":8}` PASSOU |

**Wiring contract end-to-end confirmado:** Todos os contratos que o `CronFormSheet` consome respondem com a forma esperada. POST cria com `origin: 'db'`, PUT atualiza, GET endpoints retornam shapes que batem com `TopicSlim[]` e `SkillInfo[]`.

**Render funcional do componente:** NAO testado em browser nesta tarefa porque o componente ainda nao tem mountpoint (`crons-tab.tsx` so o consome no plano 08-06). O typecheck cobre a corretude estrutural; o smoke visual virara junto com o wireup do plano 06.

**Problemas de conexao frontend↔backend:** 0 — payload do form bate exatamente com o que `/api/crons` POST e PUT esperam (verificado por curl com o mesmo body literal que o form envia).

## Decisoes notaveis (alem das do frontmatter)

### Por que `<select>` nativo em vez de `dropdown-menu` shadcn

O `dropdown-menu.tsx` deste package usa base-ui Menu, que requer um trigger explicito e gerencia portal proprio. Dentro de um Sheet ja portalizado, isso vira portal-in-portal e torna o focus management/keyboard navigation inconsistente. Para um form simples (4 presets + custom), o `<select>` nativo:
- E acessivel out of the box (keyboard, screen reader)
- Nao precisa de portal
- Renderiza com os mesmos design tokens via className
- Funciona identicamente em mobile (sheet nativo do OS)

Trade-off: visual menos polido que o dropdown-menu shadcn. Aceitavel — o form ja tem outros native inputs (checkbox), nao quebra consistencia.

### Por que recompor o CronJob no submit em vez de confiar no response

O backend (POST `/api/crons` em 08-01) retorna `{ success, job: {...} }`, mas para defesa contra futuras mudancas no shape do response, recomponho o `CronJob` localmente usando os dados que ja tenho (form fields) + o id retornado. O parent (plano 06) sempre recebe um `CronJob` completamente tipado, independente do backend mexer no shape. **Principio 1 (implementacao real):** o parent nao tem que adivinhar campos ausentes nem fazer fetch adicional.

### Por que `LOCAL_TZ` no escopo do modulo

`Intl.DateTimeFormat().resolvedOptions().timeZone` e barato mas nao gratis, e nao muda durante a vida do processo. Constante de modulo evita a chamada per-render. O guard `typeof Intl !== 'undefined'` cobre o caso de SSR/edge runtime sem Intl (pouco provavel em Next 16, mas grattis).

## Desvios do Plano

### Issues Auto-corrigidos

Nenhum. Plano 08-05 executado **literalmente** como escrito — as 3 tarefas seguiram o codigo especificado, com 4 micro-additions de qualidade que nao sao desvios mas refinamentos:

1. **Adicionados `htmlFor` + `id` em todos os labels/inputs.** O plano nao tinha `htmlFor`, mas associar label a input e padrao de acessibilidade basico (labels clicaveis, screen readers). Zero custo, melhora a11y.
2. **Formatacao prettier-style (multilinha) dos imports e props longas.** O plano vinha em uma linha so; reformatei pra legibilidade. Sem mudanca semantica.
3. **JSDoc `/** ... */` em `initialJob?` prop** explicitando "null/undefined = create mode, preenchido = edit mode". O plano tinha como comentario inline, movi para JSDoc.
4. **Cleanup do test cron job criado durante verificacao funcional** (`DELETE /api/crons?id=8`) — boa pratica de teste, nao deixar lixo.

### Issues Pre-existentes (Out of Scope)

- `packages/dashboard/src/components/sessions-tab.tsx:185` — `TopicInfo.createdAt` faltando em mock data inline. **Pre-existente desde antes do 08-01.** Ja registrado em `.plano/fases/08-dashboard-web/deferred-items.md`. Nao corrigido — fora do escopo.

## Self-Check

```
git log --oneline -5:
56274b4 feat(08-05): add CronFormSheet component for create/edit cron jobs
dad9a03 feat(08-05): add CRON_PRESETS for cron form schedule dropdown
4285456 chore(08-05): add cron-parser and cronstrue to dashboard
2a81393 feat(08-01): syncJobsWithDb propagates origin='file' on updates
c3a5cde feat(08-01): origin-aware POST/PUT/DELETE on /api/crons
```

**Files verified existing:**
- ENCONTRADO: packages/dashboard/package.json
- ENCONTRADO: packages/dashboard/src/lib/cron-presets.ts
- ENCONTRADO: packages/dashboard/src/components/cron-form-sheet.tsx

**Commits verified in git log:**
- ENCONTRADO: 4285456 (task 1 — chore deps)
- ENCONTRADO: dad9a03 (task 2 — presets)
- ENCONTRADO: 56274b4 (task 3 — component)

**Runtime contracts verified via curl:**
- ENCONTRADO: GET /api/topics → 200 + `{topics:[], source:"core"}`
- ENCONTRADO: GET /api/skills → 200 + 33 skills
- ENCONTRADO: POST /api/crons → 200 + `{success:true, job:{origin:"db",...}}`
- ENCONTRADO: PUT /api/crons action update → 200 + `{success:true}`
- ENCONTRADO: DELETE /api/crons?id=8 → 200 + `{success:true}`

## Self-Check: PASSOU

## Criterios de Sucesso (do plano)

- [x] `packages/dashboard` compila sem erros novos (so o pre-existente em sessions-tab.tsx)
- [x] `packages/dashboard/package.json` tem cron-parser e cronstrue
- [x] CronFormSheet exportado e recebe `{open, onOpenChange, initialJob?, onSaved}`
- [x] Presets dropdown tem 4 opcoes + Custom
- [x] Validacao cron-parser ativa em onChange do schedule (via useMemo + validateSchedule)
- [x] Preview cronstrue + proximas 3 execucoes exibido
- [x] TZ local exibida perto do schedule input
- [x] Save button desabilita enquanto invalido (canSave derivado)
- [x] Submit diferencia POST (create) e PUT (update) pelo prop initialJob
- [x] Link "Skills disponiveis" abre sheet secundario com lista de /api/skills
- [x] Dropdown target topic popula de /api/topics, default "Default (use harness default)"
- [x] Template vars listadas abaixo do textarea

## Proximo passo

Plano **08-06** (CRUD actions + crons-tab wireup) ira:
1. Importar `CronFormSheet` em `crons-tab.tsx`
2. Adicionar botao "+ New cron" no header da aba
3. Conectar botoes Edit/Delete/Duplicate de cada `CronCard` (com guard de origin)
4. Wirear `onSaved` callback → toast + atualizacao da lista + pulse no card recem-criado/editado
5. Empty state acionavel com botao "+ Create your first cron"
