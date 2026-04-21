# Estado do Projeto

## Referencia do Projeto
**Projeto:** ForgeClaw
**Valor Central:** O Claude Code deve responder de forma confiavel via Telegram com isolamento perfeito entre topicos
**Foco Atual:** Fase 25 — CLI Installer em Duas Fases

## Posicao Atual
**Fase:** 25-cli-installer-em-duas-fases
**Plano Atual:** 25-01 de 04 — completo
**Status:** Ready to execute 25-02
**Progresso:** [██▌░░░░░░░] 25%

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
- [2026-04-21][24-02] Placeholders universais restritos a USER.md por arquetipo. Os outros 6 .md (SOUL, AGENTS, TOOLS, MEMORY, STYLE, HEARTBEAT) usam placeholders somente quando precisam de contexto real (workingDir em TOOLS/HEARTBEAT, vaultPath em TOOLS, today em MEMORY). Reduz acoplamento entre perfil e dados de usuario.
- [2026-04-21][24-02] Tom de voz validado por distinguibilidade: cada SOUL.md tem header unico com slug, conjunto proprio de principios numericos, e frase de comportamento especifica. Nenhum copy-paste — solo-builder fala em 'ship', content-creator em 'hook/CTA', agency em 'cliente/prazo', ecom em 'ROAS/margem', generic em 'neutro/seguro'.
- [2026-04-21][24-02] HEARTBEAT por arquetipo modela rotina real do perfil: solo-builder tem monitoring a cada 60min, content-creator tem pauta-ideacao-weekly-retro, agency-freela tem rotina mensal (dia 1) pra financeiro, ecom-manager tem 3 checkpoints diarios (8h/13h/19h) + weekly, generic tem minimo de 2 crons.
- [2026-04-21][24-02] Generic mantem 2 suggestedAgents e 2 crons propositalmente enxutos. E fallback — se usuario nao se encaixa, recebe minimo viavel sem ruido de sugestoes de outros perfis.
- [2026-04-21][24-03] Suite de testes em packages/cli/tests/archetypes/ usa bun:test nativo (zero deps). Padrao Bun — os testes legados em packages/core/tests/ usam vitest (pre-Bun) mas novo codigo em packages/cli/ segue bun:test direto. toMatchSnapshot do Bun 1.3.11 suporta nativamente, sem fallback manual.
- [2026-04-21][24-03] Snapshot deterministico usa map com valores sentinel (__USER__, __COMPANY__, etc.) em vez dos valores realistas do render.test.ts. Isola o snapshot do conteudo real dos templates — fica claro no diff qual mudanca aconteceu em cada arquetipo.
- [2026-04-21][24-03] Array FORBIDDEN no loader.test.ts (Jonathan, EcoUp, Don Vicente, Kovvy, LFpro, Clearify) adicionado ao `.audit-personal-allowlist.txt` com 8 entries. Mecanismo oficial de suppressao via match exato por file:line:category — edicao do array forca re-revisao. Alternativas consideradas (string dinamica com fromCharCode, fixture externa, ignorar tests/) descartadas por pior legibilidade ou abertura de brecha.
- [2026-04-21][24-03] packages/cli/tsconfig.json nao foi alterado. 'include' do tsconfig e 'src' apenas; testes fora do include nao sao typechecked pelo tsc, mas bun:test roda .ts diretamente com type-erasure proprio. Escopo minimo, nao quebra nada.
- [2026-04-21][25-01] install.ts monolitico (435 linhas) refatorado em 6 modulos sob packages/cli/src/commands/install/: types.ts (InstallContext + PhaseAResult + PhaseBResult + InstallState), state.ts (readState/writeState/clearState/createFreshState com 0o600), phase-a-technical.ts (stub real em 25-02), phase-b-archetype.ts (implementacao completa com loadArchetype/renderArchetype/compileHarness), phase-c-handoff.ts (stub real em 25-03), index.ts (orquestrador A->B->C com --resume). install.ts virou shim de 8 linhas.
- [2026-04-21][25-01] State file `~/.forgeclaw/.install-state.json` versionado (schema v1) com phase marker 'none'|'a-complete'|'b-complete'. JSON corrompido ou version mismatch retorna null (callers tratam). Permissao 0o600 porque PhaseAResult carrega botToken.
- [2026-04-21][25-01] Arquetipo escolhido e persistido no forgeclaw.config.json via novo campo `archetype: ArchetypeSlug`. Permite que Fase 28 (refine) saiba qual template re-renderizar.
- [2026-04-21][25-01] Marker `<!-- CUSTOM -->` no topo de harness files (update mode apenas) preserva edits manuais arquivo-por-arquivo em vez de modo all-or-nothing.
- [2026-04-21][25-01] Flags --resume, --archetype=<slug>, --no-handoff parseadas em packages/cli/src/index.ts com validacao contra VALID_SLUGS antes do switch. Slug invalido aborta com exit 1 sem atingir o installer.
- [2026-04-21][25-01] [Regra 3] Adicionado `@forgeclaw/core: workspace:*` em packages/cli/package.json para destravar import de compileHarness em phase-b-archetype.ts. Resolve TS2307 pre-existente registrado no deferred-items.md da Fase 24.

### Bloqueios
Nenhum

### Issues Pendentes (out-of-scope)
- `packages/dashboard/src/components/sessions-tab.tsx:185` — TopicInfo.createdAt missing (pre-existente, registrado em .plano/fases/08-dashboard-web/deferred-items.md)
- `packages/cli/src/commands/install.ts:22` — `Cannot find module '@forgeclaw/core'` (pre-existente, validado via git stash). Registrado em `.plano/fases/24-.../deferred-items.md`. Acao sugerida: adicionar `@forgeclaw/core: workspace:*` em packages/cli/package.json como primeira tarefa de 25-01.

## Continuidade de Sessao
Ultima parada: Completado 25-01-PLAN.md (Refatorar install.ts em Fases A/B/C + --resume) — 9 tarefas executadas + 1 fix Regra 3, 10 commits. Monolito de 435 linhas transformado em 6 modulos sob packages/cli/src/commands/install/: types (InstallContext/PhaseAResult/PhaseBResult/InstallState), state (persistencia 0o600 com schema v1), phase-a-technical (stub 25-02), phase-b-archetype (REAL — chama loadArchetype/renderArchetype, escreve 7 .md + config com campo archetype, compileHarness, writeEnvFile, bun install, setupService), phase-c-handoff (stub 25-03), index (orquestrador A->B->C respeitando --resume). install.ts virou shim de 8 linhas. packages/cli/src/index.ts ganhou parseFlags() com VALID_SLUGS e help atualizado. Typecheck: 0 erros no escopo novo (erros pre-existentes em packages/core/runners/* sao out-of-scope). Help flow valida as 3 flags. `forgeclaw install --archetype=xyz` aborta com exit 1. `bun run audit:personal:ci` PASS. Resolvido o deferred item da Fase 24 adicionando `@forgeclaw/core: workspace:*` em packages/cli/package.json (commit e93cd5d). Commits: 6bf9ce4 (types), 03cb638 (state), bc56290 (phase-a), e93cd5d (Regra 3 dep), e5368d9 (phase-b), ddb2466 (phase-c), 467b805 (orquestrador), c469a23 (install.ts shim), 56ca0d5 (CLI flags).
Proximas acoes: Executar 25-02 (Fase A real) — substituir corpo dos stubs `checkDependencies()` e `verifyClaudeAuth()` em phase-a-technical.ts por: versao minima de Bun via `bun --version`, `which claude`, `claude --print "ping"` detectando strings de "not authenticated"/"Please run claude login". Assinaturas ja estaveis — apenas body changes. Apos 25-02, rodar 25-03 (handoff real pro dashboard: spawn + health-check + open()).

### Evolucao do Roadmap
- Fase 22 adicionada: Agentes Especializados + Memória por Topic (prompt base por topic, filtro de memória por tags, edição via dashboard)
- Fase 23 completa: Auditoria de Despersonalizacao — 23-01 (scanner + relatorios), 23-02 (sanitizacoes), 23-03 (CI guard + allowlist + hook + workflow). Repo pronto para distribuicao como bonus da comunidade.
- Fase 24 completa: 24-01 (schema + loader + 5 archetype.json), 24-02 (35 .md por arquetipo), 24-03 (suite bun:test com 27 testes cobrindo loader/render/snapshot). Templates de arquetipo prontos para consumo pelo installer da Fase 25.
- Fase 25 em andamento (1/4): 25-01 completo — refactor modular do installer (6 modulos + state persistido + --resume/--archetype/--no-handoff flags + Fase B real usando Phase 24 archetypes). 25-02/25-03/25-04 pendentes.
