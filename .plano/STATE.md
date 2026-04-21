# Estado do Projeto

## Referencia do Projeto
**Projeto:** ForgeClaw
**Valor Central:** O Claude Code deve responder de forma confiavel via Telegram com isolamento perfeito entre topicos
**Foco Atual:** Fase 23 — Auditoria de Despersonalizacao (pre-distribuicao)

## Posicao Atual
**Fase:** 23-auditoria-de-despersonalizacao
**Plano Atual:** 23-02 de 03 — completo
**Status:** Fase 23 em andamento (2/3 planos)
**Progresso:** [██████░░░░] 67%

## Contexto Acumulado

### Decisoes
- [2026-04-09] Stack: Bun + TypeScript + grammy + Next.js 15 + SQLite (bun:sqlite) + shadcn/ui
- [2026-04-09] Monorepo com bun workspaces: core, bot, dashboard, cli
- [2026-04-09] Patterns: EventBus (CCT), SessionKey (Ductor), NDJSON streaming (GSD), JSONL monitoring (CCBot)
- [2026-04-09] Harness system: 7 arquivos em ~/.forgeclaw/harness/, dados extraidos do Obsidian vault
- [2026-04-09] Dashboard usa mock data — precisa integrar com @forgeclaw/core
- [2026-04-09] Repo: github.com/<org>/forgeclaw
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
- [Phase 23]: ForgeClaw será distribuído como bônus da comunidade Dominando AutoIA (R7/mes), não vendido isoladamente. Modelo: repo privado + invite manual no GitHub ao assinar. Wizard entrevistador + templates por arquétipo geram harness personalizado sem contexto pessoal do Jonathan
- [2026-04-21][23-01] Scanner de contexto pessoal determinista em scripts/audit-personal-context.ts: 27 regras regex em 11 categorias (personal_name, personal_company, personal_client, personal_handle, personal_userid, hardcoded_path, private_repo_url, private_skill_dep, vault_structure, playwright_snapshot, bot_token_fragment). Zero deps novas. IGNORE_FILE_NAMES exclui os proprios outputs pra evitar auto-referencia em runs repetidos.
- [2026-04-21][23-01] Ground truth: 1280 findings reais em 97 arquivos (428 critical / 762 high / 90 medium). 19 arquivos de produto real precisam acao (janitor.md, writer.md, memory-manager.ts, mock-data.ts, .continue-aqui.md, .playwright-mcp/, README.md, ops/*.service, install.ts + context-builder cluster de 5 files com `05-pessoal/daily-log`).
- [2026-04-21][23-01] CI guard do 23-03 fara whitelist de `.plano/` e `scripts/audit-personal-context.ts`, exceto categorias bot_token_fragment, personal_userid, personal_handle que nunca podem existir em lugar nenhum.
- [2026-04-21][23-02] Novo campo em ForgeClawConfig: `vaultDailyLogPath?: string` (opt-in, absoluto). Substitui fallback hardcoded `vaultPath/05-pessoal/daily-log` em 5 arquivos (context-builder, memory/janitor, memory/writer, bot/index, dashboard/core). Alinhado com M1 do BRIEFING-M.md.
- [2026-04-21][23-02] Systemd units (`ops/*.service`) deixam de ser source-of-truth — installer ja gera via packages/cli/src/utils/service.ts. Repo mantem apenas `*.service.example` com placeholders {{USER}}, {{HOME}}, {{REPO_DIR}}, {{BUN_BIN}}.
- [2026-04-21][23-02] Scanner self-exclude: `scripts/audit-personal-context.ts` adicionado ao IGNORE_FILE_NAMES do proprio scanner (self-match dos regex literais).
- [2026-04-21][23-02] Resultado pos-sanitizacao: 0 findings critical em codigo distribuivel, 1 finding medium aceitavel (cron-form-sheet.tsx sobre ~/.claude/skills/ — acoplamento de design legitimo com runtime padrao Claude Code). Reducao 1280 -> 1208.

### Bloqueios
Nenhum

### Issues Pendentes (out-of-scope)
- `packages/dashboard/src/components/sessions-tab.tsx:185` — TopicInfo.createdAt missing (pre-existente, registrado em .plano/fases/08-dashboard-web/deferred-items.md)

## Continuidade de Sessao
Ultima parada: Completado 23-02-PLAN.md (Remocoes e Sanitizacoes Efetivas) -- 10 tarefas atomicas, 10 commits, 0 findings critical em codigo distribuivel pos-scanner. Arquivos sanitizados: janitor.md, writer.md, memory-manager.ts, context-builder.ts (+ novo campo vaultDailyLogPath em types.ts), mock-data.ts, install.ts, README.md, STATE.md. Arquivos expurgados: .playwright-mcp/, 2 screenshots, .continue-aqui.md. Systemd units convertidos para templates `.example`. Cluster de 4 fallbacks `05-pessoal/daily-log` corrigidos via desvio (Regra 2). Commits: 167b1af, c835d1b, 42dbfc3, 5fd1899, e9ab788, 399397b, 4afe67f, f67b43a, 980b66f, 8b7fff3.
Proximas acoes: Executar 23-03-PLAN.md (CI guard — adicionar Github Action que roda o scanner a cada PR, com whitelist para .plano/ e scripts/audit-personal-context.ts).

### Evolucao do Roadmap
- Fase 22 adicionada: Agentes Especializados + Memória por Topic (prompt base por topic, filtro de memória por tags, edição via dashboard)
- Fase 23 iniciada: Auditoria de Despersonalizacao — 23-01 completo (scanner + relatorios), 23-02 completo (sanitizacoes), 23-03 pendente (CI guard).
