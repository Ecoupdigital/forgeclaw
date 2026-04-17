# Estado do Projeto

## Referencia do Projeto
**Projeto:** ForgeClaw
**Valor Central:** O Claude Code deve responder de forma confiavel via Telegram com isolamento perfeito entre topicos
**Foco Atual:** Fase 22 — Agentes Especializados + Memoria por Topic

## Posicao Atual
**Fase:** 22-agentes-especializados-mem-ria-por-topic
**Plano Atual:** 22-04 de 04 — completo
**Status:** Fase 22 completa
**Progresso:** [██████████] 100%

## Contexto Acumulado

### Decisoes
- [2026-04-09] Stack: Bun + TypeScript + grammy + Next.js 15 + SQLite (bun:sqlite) + shadcn/ui
- [2026-04-09] Monorepo com bun workspaces: core, bot, dashboard, cli
- [2026-04-09] Patterns: EventBus (CCT), SessionKey (Ductor), NDJSON streaming (GSD), JSONL monitoring (CCBot)
- [2026-04-09] Harness system: 7 arquivos em ~/.forgeclaw/harness/, dados extraidos do Obsidian vault
- [2026-04-09] Dashboard usa mock data — precisa integrar com @forgeclaw/core
- [2026-04-09] Repo: github.com/Ecoupdigital/forgeclaw
- [Phase 10]: Bot usa Bun.spawn com cwd ao inves de --cwd flag
- [2026-04-11][08-04] Template vars de cron ({today}, {yesterday}, {now}) expandidas em runtime via `expandTemplateVars` em cron-engine.ts; formato ISO local; DB mantem prompt literal; calculo unico por execucao (reutilizado no retry)
- [Phase 8]: Regex frontmatter parser in /api/skills (no new deps) — gray-matter/yaml not in package
- [2026-04-11][08-01] Cron jobs: schema ganhou origin ('file'|'db') + source_file. DB e source-of-truth para jobs db-origin; HEARTBEAT.md continua source-of-truth para file-origin. Migration idempotente via PRAGMA table_info gate.
- [2026-04-11][08-01] Dashboard nao pode mutar jobs file-origin: PUT update e DELETE em /api/crons retornam 403 quando job.origin === 'file'.
- [Phase 8]: Managed section marker is '## Managed by Dashboard' spanning to next '^## ' or EOF; parser strips it pre-parse; writer replaces only that block preserving rest of file
- [2026-04-11][08-05] CronFormSheet (client component) usa cron-parser v5 (`CronExpressionParser.parse`, NAO `parseExpression`) + cronstrue (zero-dep). Validacao on-the-fly, preview duplo (human + next 3 runs), TZ local, helper sheet aninhado para skills, dropdown topic com null=default. POST envia origin:'db' explicito.
- [2026-04-11][08-05] Native `<select>` preferido a `dropdown-menu` shadcn dentro de Sheet (evita portal-in-portal, melhor a11y/keyboard, mobile-friendly).
- [2026-04-11][08-06] Toast inline (state + setTimeout) escolhido sobre sonner/react-hot-toast — manter deps lean num feature de uma tab so. Plano explicitamente pediu "rasteiro".
- [2026-04-11][08-06] Duplicate via id=0 sentinel reaproveita `Boolean(initialJob?.id)` do CronFormSheet — zero mudancas no form, prefill funciona como side-effect do contrato existente.
- [2026-04-11][08-06] CronCard origin badge: `db` violet/violeta forte, `file` cinza-violeta neutro. Edit/Delete disabled em file-origin com tooltip "Edit in HEARTBEAT.md" + defesa em profundidade no backend (PUT/DELETE retornam 403).
- [2026-04-11][08-06] Sub-recorte DASH-04 fechado — 08-01..08-06 todos com SUMMARY. Fase 08 pronta para verificacao manual fim-a-fim no browser.
- [Phase 13]: global fetch interceptor for 401 redirect (vs per-hook handling)
- [2026-04-16][21-02] Token recorder escuta stream:done, persiste input/output/cache tokens. Activity recorder escuta session/message/cron events e emite activity:created. Ambos inicializados no boot antes do webhook dispatcher.

### Bloqueios
Nenhum

### Issues Pendentes (out-of-scope)
- `packages/dashboard/src/components/sessions-tab.tsx:185` — TopicInfo.createdAt missing (pre-existente, registrado em .plano/fases/08-dashboard-web/deferred-items.md)

## Continuidade de Sessao
Ultima parada: Completado 22-04-PLAN.md (Dashboard UI -- Aba Agentes + Agent Dropdown em Topics) -- AgentsTab com CRUD completo (cards, formulario inline, tag chips, badges), dropdown de agente nos topic cards do session sidebar, pipeline agentId da API ate o frontend.
Proximas acoes: Fase 22 completa. Verificacao manual fim-a-fim no browser recomendada.

### Evolucao do Roadmap
- Fase 22 adicionada: Agentes Especializados + Memória por Topic (prompt base por topic, filtro de memória por tags, edição via dashboard)
