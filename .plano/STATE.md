# Estado do Projeto

## Referencia do Projeto
**Projeto:** ForgeClaw
**Valor Central:** O Claude Code deve responder de forma confiavel via Telegram com isolamento perfeito entre topicos
**Foco Atual:** Fase 08 — UI de gerenciamento de cron jobs (DASH-04)

## Posicao Atual
**Fase:** 08 de 10 (re-aberta para sub-recorte DASH-04)
**Plano Atual:** 08-06 de 06 (08-01..08-05 concluidos)
**Status:** CronFormSheet pronto; falta wireup CRUD em crons-tab (08-06)
**Progresso:** [█████████░] 95%

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

### Bloqueios
Nenhum

### Issues Pendentes (out-of-scope)
- `packages/dashboard/src/components/sessions-tab.tsx:185` — TopicInfo.createdAt missing (pre-existente, registrado em .plano/fases/08-dashboard-web/deferred-items.md)

## Continuidade de Sessao
Ultima parada: Completado 08-05-cron-form-sheet-PLAN.md (CronFormSheet client component + cron-parser/cronstrue deps + CRON_PRESETS).
Proximas acoes: 08-06 (CRUD wireup) — montar CronFormSheet em crons-tab.tsx, botao "+ New cron", Edit/Delete/Duplicate por card com guard de origin, toast + pulse pos-save, empty state acionavel.
