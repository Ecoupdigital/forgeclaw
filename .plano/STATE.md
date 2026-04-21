# Estado do Projeto

## Referencia do Projeto
**Projeto:** ForgeClaw
**Valor Central:** O Claude Code deve responder de forma confiavel via Telegram com isolamento perfeito entre topicos
**Foco Atual:** Fase 24 — Templates por Arquetipo

## Posicao Atual
**Fase:** 24-templates-por-arqu-tipo
**Plano Atual:** 24-01 de 03 — completo
**Status:** Ready to plan
**Progresso:** [███░░░░░░░] 33%

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
- [2026-04-21][23-03] Scanner ganhou modo `--ci`: le `.audit-personal-allowlist.txt`, filtra findings critical fora de .plano/node_modules/.git, exit 0/1. Contrato simples para CI: sem markdown/json, apenas stdout/stderr + exit code. Allowlist usa match EXATO por file:line:category — line shift quebra match e forca re-revisao (desejado sobre fuzzy).
- [2026-04-21][23-03] GitHub Actions workflow `.github/workflows/audit-personal-context.yml` roda em push e PR para main (oven-sh/setup-bun@v2). Em falha gera relatorio completo e sobe como artifact com retencao de 14d.
- [2026-04-21][23-03] Pre-commit hook `.githooks/pre-commit` e OPT-IN (nao forca core.hooksPath). Habilitado via `git config core.hooksPath .githooks`. Graceful fallback se bun nao instalado. Bypass via `git commit --no-verify` documentado.
- [2026-04-21][23-03] Path-based whitelisting escolhido sobre category-based: .plano/, node_modules/, .git/ ignorados por prefixo. Mais simples e garante que tokens nunca escapam mesmo em historico.
- [2026-04-21][23-03] Teste de regressao E2E validado: inject `/home/vault` em packages/core/ -> AUDIT FAIL exit 1; adicionar ao allowlist -> AUDIT PASS exit 0; remover arquivo + entry -> AUDIT PASS exit 0. Gate funciona end-to-end.
- [2026-04-21][24-01] Modulo `packages/cli/src/templates/archetypes/` criado com superficie publica enxuta: types.ts (ArchetypeSlug enum + ArchetypeMeta/SuggestedAgent/PlaceholderMap/ArchetypeTemplate), loader.ts (loadArchetype, listArchetypes, renderPlaceholders, renderArchetype com validateMeta estrito), index.ts (barrel), README.md (contrato), 5 archetype.json (solo-builder/content-creator/agency-freela/ecom-manager/generic) cada um com 2-4 suggestedAgents distintos e recommendedTools especificas do perfil.
- [2026-04-21][24-01] `ARCHETYPE_FILES` inclui HEARTBEAT.md alem dos 6 HARNESS_FILES do harness-compiler. Razao: harness-compiler concatena SOUL..STYLE em CLAUDE.md, mas HEARTBEAT e lido pelo cron-engine separadamente e faz parte do perfil do arquetipo — entao precisa ser copiado no install.
- [2026-04-21][24-01] Tokens `{{...}}` nao-reconhecidos sao preservados no output (em vez de virar string vazia ou jogar erro). Facilita debug de templates mal-escritos durante 24-02 e abaixo: se um .md tem `{{companny}}` (typo), o token permanece visivel no harness renderizado.
- [2026-04-21][24-01] `listArchetypes()` ignora silenciosamente arquetipos invalidos com console.warn em vez de jogar. Pensado pro caso futuro de arquetipos da comunidade: se alguem adicionar um perfil quebrado, o installer nao crasha — so nao mostra esse perfil na lista.
- [2026-04-21][24-01] `loadArchetype()` rejeita com erro claro (`missing template file: SOUL.md`) quando qualquer um dos 7 .md falta. Garante que Fase 24-02 nao deixe arquetipo incompleto e que installer nunca escreva harness pela metade.
- [2026-04-21][24-01] Cast de PlaceholderMap (interface) para Record<string,string> usa bridge via unknown (`as unknown as Record<string,string>`). TS strict nao aceita cast direto pois interfaces nao carregam index signature. Alternativa seria adicionar `[k:string]:string` na interface, mas isso abriria a API pra propriedades arbitrarias.

### Bloqueios
Nenhum

### Issues Pendentes (out-of-scope)
- `packages/dashboard/src/components/sessions-tab.tsx:185` — TopicInfo.createdAt missing (pre-existente, registrado em .plano/fases/08-dashboard-web/deferred-items.md)
- `packages/cli/src/commands/install.ts:22` — `Cannot find module '@forgeclaw/core'` (pre-existente, validado via git stash). Registrado em `.plano/fases/24-.../deferred-items.md`. Acao sugerida: adicionar `@forgeclaw/core: workspace:*` em packages/cli/package.json como primeira tarefa de 25-01.

## Continuidade de Sessao
Ultima parada: Completado 24-01-PLAN.md (Schema, Loader e Metadata dos Arquetipos) -- 6 tarefas executadas, 5 commits de codigo, auditoria de contexto pessoal continua verde. Modulo `packages/cli/src/templates/archetypes/` criado com API publica (loadArchetype, listArchetypes, renderPlaceholders, renderArchetype), 5 archetype.json distinguiveis entre si (3-4 agents cada, tools especificas). Commits: c843983 (types), f113d7a (loader), b2eef28 (index), c8dc869 (README), 06ec83c (5 archetype.json). Verificacoes funcionais passaram (listArchetypes retorna 5, renderPlaceholders preserva unknowns, loadArchetype rejeita missing .md corretamente).
Proximas acoes: Executar 24-02 — criar os 35 arquivos .md (5 arquetipos x 7 arquivos: SOUL, USER, AGENTS, TOOLS, MEMORY, STYLE, HEARTBEAT) seguindo o schema deste plano. Validacao final de 24-01 (loadArchetype carregando template completo) so sera possivel apos 24-02.

### Evolucao do Roadmap
- Fase 22 adicionada: Agentes Especializados + Memória por Topic (prompt base por topic, filtro de memória por tags, edição via dashboard)
- Fase 23 completa: Auditoria de Despersonalizacao — 23-01 (scanner + relatorios), 23-02 (sanitizacoes), 23-03 (CI guard + allowlist + hook + workflow). Repo pronto para distribuicao como bonus da comunidade.
- Fase 24 iniciada: 24-01 completo (schema + loader + 5 archetype.json). Faltam 24-02 (35 .md por arquetipo) e 24-03.
