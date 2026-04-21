# Audit Report — Contexto Pessoal no Repo ForgeClaw

Gerado em: 2026-04-21T02:36:29.131Z
Arquivos varridos: 333
Findings totais: 1280

## Sumario por severidade

- critical: 428
- high: 762
- medium: 90
- low: 0

## Sumario por categoria

- hardcoded_path: 753
- personal_name: 170
- personal_client: 103
- vault_structure: 88
- personal_company: 85
- private_repo_url: 34
- private_skill_dep: 33
- personal_handle: 6
- personal_userid: 4
- bot_token_fragment: 3
- playwright_snapshot: 1

## Findings por arquivo

### `.continue-aqui.md` (9 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 4 | critical | personal_company | `\bEcoupdigital\b` | `**Repo:** https://github.com/Ecoupdigital/forgeclaw` |
| 4 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `**Repo:** https://github.com/Ecoupdigital/forgeclaw` |
| 11 | critical | personal_handle | `@ForgeClawUP_bot` | `- **Bot Telegram** rodando em produção (@ForgeClawUP_bot):` |
| 59 | critical | personal_handle | `@ForgeClawUP_bot` | `Bot: @ForgeClawUP_bot (token: 8662287719:...)` |
| 59 | critical | bot_token_fragment | `\b8662287719:` | `Bot: @ForgeClawUP_bot (token: 8662287719:...)` |
| 60 | critical | personal_userid | `\b450030767\b` | `User ID: 450030767` |
| 62 | critical | hardcoded_path | `\/home\/vault\b` | `Vault: /home/vault` |
| 35 | high | personal_userid | `\b1087968824\b` | `3. **Auth no grupo** — user 1087968824 (GroupAnonymousBot) é bloqueado pelo middleware de auth; considerar whitelist de grupo também` |
| 67 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw` |

### `.plano/BRIEFING-M.md` (5 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 10 | critical | hardcoded_path | `\/home\/vault\b` | `- **Problema:** Todos usam '/home/vault/05-pessoal/daily-log' como fallback. Clientes não têm esse path.` |
| 10 | high | vault_structure | `05-pessoal\/daily-log` | `- **Problema:** Todos usam '/home/vault/05-pessoal/daily-log' como fallback. Clientes não têm esse path.` |
| 11 | high | vault_structure | `05-pessoal\/daily-log` | `- **Fix:** Default para '~/.forgeclaw/memory/daily'. Se config tem 'vaultPath', usar '{vaultPath}/05-pessoal/daily-log'. Env var FORGECLAW_DAILY_LOG_DIR continua como override.` |
| 10 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `- **Problema:** Todos usam '/home/vault/05-pessoal/daily-log' como fallback. Clientes não têm esse path.` |
| 11 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `- **Fix:** Default para '~/.forgeclaw/memory/daily'. Se config tem 'vaultPath', usar '{vaultPath}/05-pessoal/daily-log'. Env var FORGECLAW_DAILY_LOG_DIR continua como override.` |

### `.plano/ROADMAP.md` (1 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 219 | critical | hardcoded_path | `\/home\/vault\b` | `1. Daily log default é ~/.forgeclaw/memory/daily (não /home/vault)` |

### `.plano/STATE.md` (3 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 22 | critical | personal_company | `\bEcoupdigital\b` | `- [2026-04-09] Repo: github.com/Ecoupdigital/forgeclaw` |
| 22 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `- [2026-04-09] Repo: github.com/Ecoupdigital/forgeclaw` |
| 37 | critical | personal_name | `\bJonathan\b` | `- [Phase 23]: ForgeClaw será distribuído como bônus da comunidade Dominando AutoIA (R7/mes), não vendido isoladamente. Modelo: repo privado + invite manual no GitHub ao assinar. Wizard entrevistador +` |

### `.plano/fases/08-dashboard-web/08-01-schema-origin-PLAN.md` (6 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 153 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw/packages/core && bunx tsc --noEmit src/state-store.ts src/types.ts</automated>` |
| 179 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw/packages/core && bunx tsc --noEmit src/types.ts</automated>` |
| 204 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw/packages/dashboard && bunx tsc --noEmit</automated>` |
| 289 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw/packages/dashboard && bunx tsc --noEmit</automated>` |
| 369 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw/packages/dashboard && bunx tsc --noEmit</automated>` |
| 407 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw/packages/core && bunx tsc --noEmit</automated>` |

### `.plano/fases/08-dashboard-web/08-02-skills-topics-endpoints-PLAN.md` (11 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 54 | high | private_skill_dep | `\basaas[-_]?(api\|mcp)\b` | `- '~/.claude/skills/' tem estrutura mista: subdirs com 'SKILL.md' dentro (ex: 'apify/', 'asaas-api/') E arquivos '.md' soltos (ex: 'buscar-x.md', 'Chat para LLMs.md'). O endpoint deve suportar ambos.` |
| 80 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw/packages/dashboard && bunx tsc --noEmit src/lib/types.ts</automated>` |
| 188 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw/packages/dashboard && bunx tsc --noEmit src/app/api/skills/route.ts</automated>` |
| 227 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw/packages/dashboard && bunx tsc --noEmit src/app/api/topics/route.ts</automated>` |
| 16 | medium | private_skill_dep | `~\/\.claude\/skills\b` | `- "GET /api/skills retorna lista de skills de ~/.claude/skills/ com name e description"` |
| 22 | medium | private_skill_dep | `~\/\.claude\/skills\b` | `provides: "Endpoint GET que le ~/.claude/skills/ via fs.readdir, parseia YAML frontmatter, retorna [{name, description}]"` |
| 38 | medium | private_skill_dep | `~\/\.claude\/skills\b` | `**Objetivo:** Criar os dois endpoints read-only que o form de criacao de crons (plano 05) consome: (1) '/api/skills' que le '~/.claude/skills/' e expoe a lista para o helper visual no textarea de prom` |
| 48 | medium | private_skill_dep | `~\/\.claude\/skills\b` | `- 'decisions > Skills no prompt': "Endpoint novo 'GET /api/skills' le '~/.claude/skills/' dinamicamente e retorna lista com 'name' e 'description'".` |
| 54 | medium | private_skill_dep | `~\/\.claude\/skills\b` | `- '~/.claude/skills/' tem estrutura mista: subdirs com 'SKILL.md' dentro (ex: 'apify/', 'asaas-api/') E arquivos '.md' soltos (ex: 'buscar-x.md', 'Chat para LLMs.md'). O endpoint deve suportar ambos.` |
| 190 | medium | private_skill_dep | `~\/\.claude\/skills\b` | `<done>Arquivo existe. Compila. 'curl http://localhost:4040/api/skills' (quando dev rodando) retorna '{skills: [...], source: "fs"}' com entradas para skills existentes em '~/.claude/skills/'.</done>` |
| 235 | medium | private_skill_dep | `~\/\.claude\/skills\b` | `- [ ] GET /api/skills retorna 200 com lista (ou vazia) mesmo sem ~/.claude/skills/ presente` |

### `.plano/fases/08-dashboard-web/08-02-skills-topics-endpoints-SUMMARY.md` (6 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 54 | high | private_skill_dep | `\basaas[-_]?(api\|mcp)\b` | `- Para cada subdir ('apify/', 'asaas-api/', etc.): procura 'SKILL.md' dentro, usa se existir` |
| 134 | high | private_skill_dep | `\basaas[-_]?(api\|mcp)\b` | `Subdirs com 'SKILL.md' detectados corretamente (ex: 'apify/SKILL.md', 'asaas-api/SKILL.md'). Arquivos '.md' soltos detectados (ex: 'buscar-x.md').` |
| 46 | medium | private_skill_dep | `~\/\.claude\/skills\b` | `Interface exportada apos 'PlanCard' com 'name', 'description', 'source' (path relativo dentro de '~/.claude/skills/'). Consumida pelo route handler '/api/skills' e disponivel para futuros consumidores` |
| 50 | medium | private_skill_dep | `~\/\.claude\/skills\b` | `Route handler que le '~/.claude/skills/' dinamicamente e retorna lista com frontmatter parseado.` |
| 53 | medium | private_skill_dep | `~\/\.claude\/skills\b` | `- Le todas as entradas de '~/.claude/skills/'` |
| 97 | medium | private_skill_dep | `~\/\.claude\/skills\b` | `O CONTEXT.md mencionava "parsing do YAML frontmatter" mas o package 'dashboard' nao tem 'gray-matter' nem 'yaml'. Optamos por regex simples ('^---\s*\n([\s\S]*?)\n---' + '^name\s*:\s*(.+?)$' + '^descr` |

### `.plano/fases/08-dashboard-web/08-03-heartbeat-parser-managed-section-PLAN.md` (3 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 92 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw/packages/core && bunx tsc --noEmit src/cron-engine.ts</automated>` |
| 136 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw/packages/core && bunx tsc --noEmit src/cron-engine.ts</automated>` |
| 205 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw/packages/core && bunx tsc --noEmit src/cron-engine.ts</automated>` |

### `.plano/fases/08-dashboard-web/08-03-heartbeat-parser-managed-section-SUMMARY.md` (2 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 124 | critical | personal_name | `\bJonathan\s+Renan\b` | `Durante a execucao do plano, um processo paralelo (git hook ou agente concorrente — autor "Jonathan Renan") capturou minhas mudancas do Task 3 junto com uma pequena refinacao no branch update do 'sync` |
| 124 | critical | personal_name | `\bJonathan\b` | `Durante a execucao do plano, um processo paralelo (git hook ou agente concorrente — autor "Jonathan Renan") capturou minhas mudancas do Task 3 junto com uma pequena refinacao no branch update do 'sync` |

### `.plano/fases/08-dashboard-web/08-04-cronengine-template-vars-PLAN.md` (2 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 103 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw/packages/core && bunx tsc --noEmit src/cron-engine.ts</automated>` |
| 141 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw/packages/core && bunx tsc --noEmit src/cron-engine.ts</automated>` |

### `.plano/fases/08-dashboard-web/08-05-cron-form-sheet-PLAN.md` (5 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 95 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw/packages/dashboard && bun add cron-parser cronstrue` |
| 108 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw/packages/dashboard && grep -q '"cron-parser"' package.json && grep -q '"cronstrue"' package.json && echo OK</automated>` |
| 141 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw/packages/dashboard && bunx tsc --noEmit src/lib/cron-presets.ts</automated>` |
| 541 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw/packages/dashboard && bunx tsc --noEmit</automated>` |
| 510 | medium | private_skill_dep | `~\/\.claude\/skills\b` | `<p className="text-xs text-text-secondary">No skills found in ~/.claude/skills/</p>` |

### `.plano/fases/08-dashboard-web/08-06-crud-actions-crons-tab-PLAN.md` (4 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 143 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw/packages/dashboard && bunx tsc --noEmit</automated>` |
| 227 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw/packages/dashboard && bunx tsc --noEmit src/components/cron-card.tsx</automated>` |
| 615 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw/packages/dashboard && bunx tsc --noEmit && bun run -C /home/projects/ForgeClaw/packages/dashboard lint</automated>` |
| 615 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw/packages/dashboard && bunx tsc --noEmit && bun run -C /home/projects/ForgeClaw/packages/dashboard lint</automated>` |

### `.plano/fases/08-dashboard-web/08-CONTEXT.md` (3 findings, pior: medium)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 20 | medium | private_skill_dep | `~\/\.claude\/skills\b` | `- Endpoint 'GET /api/skills' que le '~/.claude/skills/' e retorna lista` |
| 77 | medium | private_skill_dep | `~\/\.claude\/skills\b` | `- **Endpoint novo 'GET /api/skills'** le '~/.claude/skills/' dinamicamente e retorna lista com 'name' e 'description' para popular a sheet lateral do helper.` |
| 120 | medium | private_skill_dep | `~\/\.claude\/skills\b` | `- **'/api/skills' endpoint novo** -- planejar localizacao ('packages/dashboard/src/app/api/skills/route.ts'), leitura de '~/.claude/skills/' via 'fs.readdir', parsing do YAML frontmatter de cada skill` |

### `.plano/fases/08-dashboard-web/08-VERIFICATION.md` (1 findings, pior: medium)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 63 | medium | private_skill_dep | `~\/\.claude\/skills\b` | `\| 6 \| GET /api/skills le '~/.claude/skills/' e retorna '{name, description}[]' \| PASS \| 'packages/dashboard/src/app/api/skills/route.ts:7,52-112' monta caminho via 'homedir()', parseia frontmatter, re` |

### `.plano/fases/08-dashboard-web/dcrv/EXHAUSTIVE-REPORT.md` (2 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 250 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `**Evidence:** Reproduced on 2026-04-11 ~12:34 UTC. HEARTBEAT.md restored to 741 bytes from screenshot '/home/projects/ForgeClaw/.plano/fases/08-dashboard-web/dcrv/screenshots/08-advanced-sheet-desktop` |
| 169 | medium | private_skill_dep | `~\/\.claude\/skills\b` | `\| 71 \| Skills sheet empty state \| '"No skills found in ~/.claude/skills/"' \| Static text; unreachable if API returns 33. \| Static audit OK. \| PASS \| — \|` |

### `.plano/fases/08-dashboard-web/dcrv/VISUAL-ISSUES.json` (1 findings, pior: medium)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 121 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `"screenshots/06-skills-sheet-desktop.png",` |

### `.plano/fases/08-dashboard-web/dcrv/VISUAL-REPORT.md` (1 findings, pior: medium)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 111 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `- **Screenshot:** '06-skills-sheet-desktop.png' vs '06b-after-skills-closed-desktop.png' (form intacto apos fechar).` |

### `.plano/fases/11-service-env-infra/11-01-env-file-and-service-templates-PLAN.md` (7 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 67 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -c 'DASHBOARD_SERVICE_NAME\\|ENV_FILE_PATH\\|DASHBOARD_DIR' packages/cli/src/utils/service.ts \| grep -q '3' && echo PASS \|\| echo FAIL</automated></` |
| 101 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep 'EnvironmentFile=' packages/cli/src/utils/service.ts \| head -1 \| grep -q '\.forgeclaw/\.env' && echo PASS \|\| echo FAIL</automated></verify>` |
| 142 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -A 20 'getSystemdDashboardUnit' packages/cli/src/utils/service.ts \| grep -q 'ExecStartPre.*bun run build' && echo PASS \|\| echo FAIL</automated></` |
| 192 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -c 'getDashboardLaunchdPlist' packages/cli/src/utils/service.ts \| grep -q '[1-9]' && echo PASS \|\| echo FAIL</automated></verify>` |
| 252 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -c 'DASHBOARD_SERVICE_NAME\\|SYSTEMD_DASHBOARD_PATH' packages/cli/src/utils/service.ts \| grep -q '[4-9]' && echo PASS \|\| echo FAIL</automated></ve` |
| 383 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -c 'DASHBOARD' packages/cli/src/utils/service.ts \| xargs test 8 -le && echo PASS \|\| echo FAIL</automated></verify>` |
| 426 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -c 'writeEnvFile\\|ENV_FILE_PATH\\|chmodSync' packages/cli/src/utils/service.ts \| grep -q '[3-9]' && echo PASS \|\| echo FAIL</automated></verify>` |

### `.plano/fases/11-service-env-infra/11-02-installer-env-bun-install-PLAN.md` (7 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 69 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep 'writeEnvFile' packages/cli/src/commands/install.ts \| head -1 \| grep -q 'import' && echo PASS \|\| echo FAIL</automated></verify>` |
| 135 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -c "groq\\|Groq" packages/cli/src/commands/install.ts \| grep -q '[3-9]' && echo PASS \|\| echo FAIL</automated></verify>` |
| 173 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep 'writeEnvFile' packages/cli/src/commands/install.ts \| grep -v import \| grep -q 'openaiApiKey' && echo PASS \|\| echo FAIL</automated></verify>` |
| 224 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -c 'bun install\\|bun.*install' packages/cli/src/commands/install.ts \| grep -q '[2-9]' && echo PASS \|\| echo FAIL</automated></verify>` |
| 247 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep '\.env' packages/cli/src/commands/install.ts \| grep -q 'API keys' && echo PASS \|\| echo FAIL</automated></verify>` |
| 269 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/cli/tsconfig.json 2>&1 \| head -20` |
| 274 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -c 'openaiApiKey' packages/cli/src/commands/install.ts \| xargs -I{} bash -c 'if [ {} -le 3 ]; then echo PASS; else echo FAIL; fi'</automated></ve` |

### `.plano/fases/12-voice-harness-config/12-01-voice-provider-config-PLAN.md` (3 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 133 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bun build packages/core/src/voice-handler.ts --no-bundle 2>&1 \| head -20</automated>` |
| 173 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bun build packages/bot/src/handlers/voice.ts --no-bundle 2>&1 \| head -20</automated>` |
| 267 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bun test packages/core/src/voice-handler.test.ts 2>&1 \| tail -20</automated>` |

### `.plano/fases/12-voice-harness-config/12-02-harness-claude-md-compilation-PLAN.md` (5 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 169 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bun build packages/core/src/harness-compiler.ts --no-bundle 2>&1 \| head -20</automated>` |
| 193 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && grep 'harness-compiler' packages/core/src/index.ts</automated>` |
| 228 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bun build packages/cli/src/commands/install.ts --no-bundle 2>&1 \| head -20</automated>` |
| 268 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bun build packages/bot/src/index.ts --no-bundle 2>&1 \| head -20</automated>` |
| 379 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bun test packages/core/src/harness-compiler.test.ts 2>&1 \| tail -20</automated>` |

### `.plano/fases/13-dashboard-auth/13-01-auth-infrastructure-PLAN.md` (6 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 66 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/core/tsconfig.json 2>&1 \| head -20</automated></verify>` |
| 85 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/core/tsconfig.json 2>&1 \| head -20</automated></verify>` |
| 134 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/cli/tsconfig.json 2>&1 \| head -20</automated></verify>` |
| 151 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/dashboard/tsconfig.json 2>&1 \| head -20</automated></verify>` |
| 194 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/dashboard/tsconfig.json 2>&1 \| head -20</automated></verify>` |
| 296 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/dashboard/tsconfig.json 2>&1 \| head -20</automated></verify>` |

### `.plano/fases/13-dashboard-auth/13-02-login-page-proxy-PLAN.md` (5 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 118 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/dashboard/tsconfig.json 2>&1 \| head -20</automated></verify>` |
| 147 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/dashboard/tsconfig.json 2>&1 \| head -20</automated></verify>` |
| 265 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/dashboard/tsconfig.json 2>&1 \| head -20</automated></verify>` |
| 339 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/dashboard/tsconfig.json 2>&1 \| head -20</automated></verify>` |
| 362 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/dashboard/tsconfig.json 2>&1 \| head -20</automated></verify>` |

### `.plano/fases/13-dashboard-auth/13-03-api-ws-auth-PLAN.md` (5 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 141 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/dashboard/tsconfig.json 2>&1 \| head -20 && echo "---" && grep -rL "requireApiAuth" packages/dashboard/src/app/api/*/rout` |
| 231 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/core/tsconfig.json 2>&1 \| head -20</automated></verify>` |
| 277 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/dashboard/tsconfig.json 2>&1 \| head -20 && grep -n "4041\\|BOT_IPC" packages/dashboard/src/app/api/crons/route.ts</automa` |
| 391 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/dashboard/tsconfig.json 2>&1 \| head -20 && grep -rn "new WebSocket" packages/dashboard/src/ \| head -10</automated></veri` |
| 451 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/dashboard/tsconfig.json 2>&1 \| head -20</automated></verify>` |

### `.plano/fases/14-quick-fixes/14-01-h1-h5-h9-quick-fixes-PLAN.md` (6 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 86 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -n 'mockCronJobs' packages/dashboard/src/app/api/crons/route.ts \| grep -v import \| wc -l \| xargs test 0 -eq && echo "PASS: mockCronJobs not retur` |
| 127 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -n 'mockCronLogs' packages/dashboard/src/app/api/crons/\[id\]/logs/route.ts \| grep -v import \| wc -l \| xargs test 0 -eq && echo "PASS: mockCronLo` |
| 190 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -n 'mockSessions\\|mockMessages\\|mockTopics' packages/dashboard/src/app/api/sessions/route.ts \| grep -v import \| wc -l \| xargs test 0 -eq && echo ` |
| 213 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -c '/root/.local/bin/claude' packages/core/src/claude-runner.ts \| xargs test 0 -eq && echo "PASS: no hardcoded path" \|\| echo "FAIL: hardcoded pat` |
| 262 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -c 'sendChatAction' packages/bot/src/handlers/text.ts \| xargs test 2 -le && echo "PASS: typing indicator present" \|\| echo "FAIL: typing indicator` |
| 277 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -c "source.*empty" packages/dashboard/src/app/api/crons/route.ts packages/dashboard/src/app/api/crons/\[id\]/logs/route.ts packages/dashboard/src` |

### `.plano/fases/15-data-integrity/15-01-PLAN.md` (6 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 83 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -n "updateCronLog" packages/core/src/state-store.ts \| head -5</automated></verify>` |
| 123 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -n "createCronLog\\|updateCronLog" packages/core/src/cron-engine.ts</automated></verify>` |
| 151 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -A2 "buildKey" packages/core/src/session-manager.ts</automated></verify>` |
| 186 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -n "parseSessionKey" packages/core/src/ws-server.ts</automated></verify>` |
| 235 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -n "hidden\\|MASK\\|masked" packages/dashboard/src/lib/core.ts</automated></verify>` |
| 250 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep "stateStore\\|state-store" packages/core/src/index.ts packages/core/src/cron-engine.ts \| head -10</automated></verify>` |

### `.plano/fases/16-ux-improvements/16-01-cron-output-display-PLAN.md` (3 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 101 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 \| head -30</automated>` |
| 118 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 \| head -30</automated>` |
| 133 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 \| head -10</automated>` |

### `.plano/fases/16-ux-improvements/16-02-memory-search-pagination-PLAN.md` (4 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 150 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 \| head -30</automated>` |
| 215 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 \| head -30</automated>` |
| 357 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 \| head -30</automated>` |
| 373 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 \| head -10</automated>` |

### `.plano/fases/16-ux-improvements/16-03-config-driven-timezone-PLAN.md` (10 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 70 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/core/tsconfig.json 2>&1 \| head -20</automated>` |
| 89 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/core/tsconfig.json 2>&1 \| head -20</automated>` |
| 107 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 \| head -20</automated>` |
| 195 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 \| head -20</automated>` |
| 232 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 \| head -20 && grep -n "brtTime\\|BRT\\|3 \* 60" /home/projects/ForgeClaw/packages/dashboard/src` |
| 232 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 \| head -20 && grep -n "brtTime\\|BRT\\|3 \* 60" /home/projects/ForgeClaw/packages/dashboard/src` |
| 280 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 \| head -20 && grep -n 'DISPLAY_TZ\\|"America/Sao_Paulo"\\|hardcoded\\|BRT' /home/projects/ForgeC` |
| 280 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 \| head -20 && grep -n 'DISPLAY_TZ\\|"America/Sao_Paulo"\\|hardcoded\\|BRT' /home/projects/ForgeC` |
| 307 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 \| head -20</automated>` |
| 322 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 \| head -10</automated>` |

### `.plano/fases/17-immediate-memory/17-01-immediate-memory-save-PLAN.md` (3 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 193 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && npx tsc --noEmit packages/bot/src/handlers/immediate-memory.ts 2>&1 \| head -20</automated>` |
| 236 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && npx tsc --noEmit packages/bot/src/handlers/text.ts 2>&1 \| head -20</automated>` |
| 404 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bun test packages/bot/src/handlers/__tests__/immediate-memory.test.ts 2>&1 \| tail -20</automated>` |

### `.plano/fases/18-core-hardening/18-01-PLAN.md` (51 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 46 | critical | hardcoded_path | `\/home\/vault\b` | `**Objetivo:** Eliminar 3 gaps MEDIUM: (M1) remover hardcoded '/home/vault/05-pessoal/daily-log' de 5 arquivos, usando config.vaultPath com fallback seguro; (M3) tornar '--dangerously-skip-permissions'` |
| 197 | critical | hardcoded_path | `\/home\/vault\b` | `process.env.FORGECLAW_DAILY_LOG_DIR ?? '/home/vault/05-pessoal/daily-log';` |
| 224 | critical | hardcoded_path | `\/home\/vault\b` | `process.env.FORGECLAW_DAILY_LOG_DIR ?? '/home/vault/05-pessoal/daily-log';` |
| 260 | critical | hardcoded_path | `\/home\/vault\b` | `process.env.FORGECLAW_DAILY_LOG_DIR ?? '/home/vault/05-pessoal/daily-log';` |
| 297 | critical | hardcoded_path | `\/home\/vault\b` | `process.env.FORGECLAW_DAILY_LOG_DIR ?? "/home/vault/05-pessoal/daily-log";` |
| 345 | critical | hardcoded_path | `\/home\/vault\b` | `<done>Nenhum arquivo contem '/home/vault/05-pessoal/daily-log' hardcoded. Todos resolvem via env > config.vaultPath > ~/.forgeclaw/memory/daily.</done>` |
| 464 | critical | hardcoded_path | `\/home\/vault\b` | `Verificacao final: rodar grep em TODO o codebase para confirmar que nao restou nenhuma referencia hardcoded a '/home/vault/05-pessoal/daily-log'.` |
| 468 | critical | hardcoded_path | `\/home\/vault\b` | `grep -rn '/home/vault/05-pessoal/daily-log' packages/` |
| 483 | critical | hardcoded_path | `\/home\/vault\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -rn '/home/vault/05-pessoal/daily-log' packages/ \| grep -v node_modules \| grep -v '.plano/' ; echo "EXIT: $?"</automated></verify>` |
| 484 | critical | hardcoded_path | `\/home\/vault\b` | `<done>Zero ocorrencias de '/home/vault/05-pessoal/daily-log' no codebase. Build e testes passam.</done>` |
| 489 | critical | hardcoded_path | `\/home\/vault\b` | `- [ ] Nenhum arquivo contem '/home/vault/05-pessoal/daily-log' hardcoded` |
| 12 | high | vault_structure | `05-pessoal\/daily-log` | `- "Daily log dir resolves to {vaultPath}/05-pessoal/daily-log when vaultPath configured"` |
| 46 | high | vault_structure | `05-pessoal\/daily-log` | `**Objetivo:** Eliminar 3 gaps MEDIUM: (M1) remover hardcoded '/home/vault/05-pessoal/daily-log' de 5 arquivos, usando config.vaultPath com fallback seguro; (M3) tornar '--dangerously-skip-permissions'` |
| 83 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/core/tsconfig.json 2>&1 \| head -20</automated></verify>` |
| 100 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/core/tsconfig.json 2>&1 \| head -20</automated></verify>` |
| 144 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/core/tsconfig.json 2>&1 \| head -20</automated></verify>` |
| 197 | high | vault_structure | `05-pessoal\/daily-log` | `process.env.FORGECLAW_DAILY_LOG_DIR ?? '/home/vault/05-pessoal/daily-log';` |
| 224 | high | vault_structure | `05-pessoal\/daily-log` | `process.env.FORGECLAW_DAILY_LOG_DIR ?? '/home/vault/05-pessoal/daily-log';` |
| 260 | high | vault_structure | `05-pessoal\/daily-log` | `process.env.FORGECLAW_DAILY_LOG_DIR ?? '/home/vault/05-pessoal/daily-log';` |
| 297 | high | vault_structure | `05-pessoal\/daily-log` | `process.env.FORGECLAW_DAILY_LOG_DIR ?? "/home/vault/05-pessoal/daily-log";` |
| 344 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/core/tsconfig.json 2>&1 \| head -30 && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 \| head -30<` |
| 345 | high | vault_structure | `05-pessoal\/daily-log` | `<done>Nenhum arquivo contem '/home/vault/05-pessoal/daily-log' hardcoded. Todos resolvem via env > config.vaultPath > ~/.forgeclaw/memory/daily.</done>` |
| 394 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/bot/tsconfig.json 2>&1 \| head -20</automated></verify>` |
| 449 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/cli/tsconfig.json 2>&1 \| head -20</automated></verify>` |
| 464 | high | vault_structure | `05-pessoal\/daily-log` | `Verificacao final: rodar grep em TODO o codebase para confirmar que nao restou nenhuma referencia hardcoded a '/home/vault/05-pessoal/daily-log'.` |
| 468 | high | vault_structure | `05-pessoal\/daily-log` | `grep -rn '/home/vault/05-pessoal/daily-log' packages/` |
| 475 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw && bun run build 2>&1 \| tail -20` |
| 480 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw && bun test 2>&1 \| tail -30` |
| 483 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -rn '/home/vault/05-pessoal/daily-log' packages/ \| grep -v node_modules \| grep -v '.plano/' ; echo "EXIT: $?"</automated></verify>` |
| 483 | high | vault_structure | `05-pessoal\/daily-log` | `<verify><automated>cd /home/projects/ForgeClaw && grep -rn '/home/vault/05-pessoal/daily-log' packages/ \| grep -v node_modules \| grep -v '.plano/' ; echo "EXIT: $?"</automated></verify>` |
| 484 | high | vault_structure | `05-pessoal\/daily-log` | `<done>Zero ocorrencias de '/home/vault/05-pessoal/daily-log' no codebase. Build e testes passam.</done>` |
| 489 | high | vault_structure | `05-pessoal\/daily-log` | `- [ ] Nenhum arquivo contem '/home/vault/05-pessoal/daily-log' hardcoded` |
| 12 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `- "Daily log dir resolves to {vaultPath}/05-pessoal/daily-log when vaultPath configured"` |
| 46 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `**Objetivo:** Eliminar 3 gaps MEDIUM: (M1) remover hardcoded '/home/vault/05-pessoal/daily-log' de 5 arquivos, usando config.vaultPath com fallback seguro; (M3) tornar '--dangerously-skip-permissions'` |
| 161 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `2. Se config.vaultPath existe -> usa join(config.vaultPath, '05-pessoal', 'daily-log')` |
| 197 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `process.env.FORGECLAW_DAILY_LOG_DIR ?? '/home/vault/05-pessoal/daily-log';` |
| 202 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `? join(this.config.vaultPath, '05-pessoal', 'daily-log')` |
| 214 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `? path.join(this.config.vaultPath, '05-pessoal', 'daily-log')` |
| 224 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `process.env.FORGECLAW_DAILY_LOG_DIR ?? '/home/vault/05-pessoal/daily-log';` |
| 233 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `if (config.vaultPath) return join(config.vaultPath, '05-pessoal', 'daily-log');` |
| 260 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `process.env.FORGECLAW_DAILY_LOG_DIR ?? '/home/vault/05-pessoal/daily-log';` |
| 270 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `if (config.vaultPath) return join(config.vaultPath, '05-pessoal', 'daily-log');` |
| 297 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `process.env.FORGECLAW_DAILY_LOG_DIR ?? "/home/vault/05-pessoal/daily-log";` |
| 304 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `if (config && config.vaultPath) return join(config.vaultPath as string, "05-pessoal", "daily-log");` |
| 345 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `<done>Nenhum arquivo contem '/home/vault/05-pessoal/daily-log' hardcoded. Todos resolvem via env > config.vaultPath > ~/.forgeclaw/memory/daily.</done>` |
| 382 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `? join(config.vaultPath, '05-pessoal', 'daily-log')` |
| 464 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `Verificacao final: rodar grep em TODO o codebase para confirmar que nao restou nenhuma referencia hardcoded a '/home/vault/05-pessoal/daily-log'.` |
| 468 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `grep -rn '/home/vault/05-pessoal/daily-log' packages/` |
| 483 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -rn '/home/vault/05-pessoal/daily-log' packages/ \| grep -v node_modules \| grep -v '.plano/' ; echo "EXIT: $?"</automated></verify>` |
| 484 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `<done>Zero ocorrencias de '/home/vault/05-pessoal/daily-log' no codebase. Build e testes passam.</done>` |
| 489 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `- [ ] Nenhum arquivo contem '/home/vault/05-pessoal/daily-log' hardcoded` |

### `.plano/fases/18-core-hardening/18-01-SUMMARY.md` (6 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 35 | critical | hardcoded_path | `\/home\/vault\b` | `- Zero occurrences of '/home/vault/05-pessoal/daily-log' in source files` |
| 39 | critical | hardcoded_path | `\/home\/vault\b` | `- 'grep -rn '/home/vault/05-pessoal/daily-log' packages/ --include='*.ts'' returns 0 results (source only)` |
| 35 | high | vault_structure | `05-pessoal\/daily-log` | `- Zero occurrences of '/home/vault/05-pessoal/daily-log' in source files` |
| 39 | high | vault_structure | `05-pessoal\/daily-log` | `- 'grep -rn '/home/vault/05-pessoal/daily-log' packages/ --include='*.ts'' returns 0 results (source only)` |
| 35 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `- Zero occurrences of '/home/vault/05-pessoal/daily-log' in source files` |
| 39 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `- 'grep -rn '/home/vault/05-pessoal/daily-log' packages/ --include='*.ts'' returns 0 results (source only)` |

### `.plano/fases/18-core-hardening/18-02-PLAN.md` (6 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 77 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -n 'startCompileCron\\|stopCompileCron' packages/bot/src/index.ts; echo "GREP_EXIT: $?"</automated></verify>` |
| 109 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -c '@deprecated' packages/core/src/memory-manager.ts</automated></verify>` |
| 244 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/bot/tsconfig.json 2>&1 \| head -20</automated></verify>` |
| 266 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/bot/tsconfig.json 2>&1 \| head -20</automated></verify>` |
| 296 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/core/tsconfig.json && npx tsc --noEmit --project packages/bot/tsconfig.json && echo "BUILD OK"` |
| 299 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/core/tsconfig.json 2>&1 \| tail -5 && npx tsc --noEmit --project packages/bot/tsconfig.json 2>&1 \| tail -5</automat` |

### `.plano/fases/19-dashboard-safety/19-01-config-validation-cron-prefix-editable-users-PLAN.md` (5 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 102 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && npx tsx -e "` |
| 143 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && grep -n 'statusIcon\\|statusLabel\\|\\\\u2705\\|\\\\u274C\\|FALHOU' packages/bot/src/index.ts \| head -10</automated>` |
| 288 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && grep -c 'EditableIdList' packages/dashboard/src/components/config-tab.tsx</automated>` |
| 355 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && grep -c 'minItems' packages/dashboard/src/components/config-tab.tsx</automated>` |
| 389 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 \| head -20</automated>` |

### `.plano/fases/20-data-export-photo/20-01-cli-export-command-PLAN.md` (4 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 151 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bun run packages/cli/src/commands/export.ts --help 2>&1 \|\| echo "File created, checking syntax..." && bun build --target=bun packages/cli/src/commands/export.` |
| 182 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bun build --target=bun packages/cli/src/index.ts --outdir /tmp/forgeclaw-check-cli 2>&1 && echo "BUILD OK"</automated>` |
| 194 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /tmp && bun run /home/projects/ForgeClaw/packages/cli/src/index.ts export` |
| 216 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /tmp && bun run /home/projects/ForgeClaw/packages/cli/src/index.ts export 2>&1 && tar tzf /tmp/forgeclaw-backup-*.tar.gz 2>&1 && rm -f /tmp/forgeclaw-backup-*.tar.gz && echo "E2E OK"</au` |

### `.plano/fases/20-data-export-photo/20-02-photo-workingdir-fix-PLAN.md` (5 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 110 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bun build --target=bun packages/bot/src/handlers/photo.ts --outdir /tmp/forgeclaw-check-photo 2>&1 && echo "BUILD OK"</automated>` |
| 170 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bun build --target=bun packages/bot/src/handlers/document.ts --outdir /tmp/forgeclaw-check-doc 2>&1 && echo "BUILD OK"</automated>` |
| 182 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw && bun run --filter @forgeclaw/bot typecheck 2>&1 \|\| true` |
| 187 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw && bun build --target=bun packages/bot/src/index.ts --outdir /tmp/forgeclaw-bot-check 2>&1` |
| 198 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bun build --target=bun packages/bot/src/index.ts --outdir /tmp/forgeclaw-bot-check 2>&1 && echo "BOT BUILD OK"</automated>` |

### `.plano/fases/21-mission-control/21-01-PLAN.md` (5 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 116 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit --project packages/core/tsconfig.json 2>&1 \| head -20</automated>` |
| 156 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit --project packages/core/tsconfig.json 2>&1 \| head -20</automated>` |
| 526 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit --project packages/core/tsconfig.json 2>&1 \| head -30</automated>` |
| 600 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 \| head -20</automated>` |
| 1021 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 \| head -30</automated>` |

### `.plano/fases/21-mission-control/21-02-PLAN.md` (6 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 123 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit --project packages/core/tsconfig.json 2>&1 \| head -20</automated>` |
| 196 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit --project packages/core/tsconfig.json 2>&1 \| head -20 && cd /home/projects/ForgeClaw && bunx tsc --noEmit --project packages/bot/tsconfig.js` |
| 196 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit --project packages/core/tsconfig.json 2>&1 \| head -20 && cd /home/projects/ForgeClaw && bunx tsc --noEmit --project packages/bot/tsconfig.js` |
| 351 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit --project packages/core/tsconfig.json 2>&1 \| head -20</automated>` |
| 369 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit --project packages/core/tsconfig.json 2>&1 \| head -10</automated>` |
| 396 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && grep -n 'startTokenRecorder\\|startActivityRecorder' packages/bot/src/index.ts</automated>` |

### `.plano/fases/21-mission-control/21-03-PLAN.md` (3 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 247 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit --project packages/core/tsconfig.json 2>&1 \| head -20</automated>` |
| 262 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && grep 'webhook-dispatcher' packages/core/src/index.ts</automated>` |
| 286 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && grep -n 'startWebhookDispatcher' packages/bot/src/index.ts</automated>` |

### `.plano/fases/21-mission-control/21-04-PLAN.md` (6 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 93 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>test -f /home/projects/ForgeClaw/packages/dashboard/src/app/api/tokens/route.ts && echo "exists"</automated>` |
| 158 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>test -f /home/projects/ForgeClaw/packages/dashboard/src/app/api/tokens/stats/route.ts && echo "exists"</automated>` |
| 213 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>test -f /home/projects/ForgeClaw/packages/dashboard/src/app/api/activities/route.ts && echo "exists"</automated>` |
| 324 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>test -f /home/projects/ForgeClaw/packages/dashboard/src/app/api/webhooks/route.ts && echo "exists"</automated>` |
| 435 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>test -f /home/projects/ForgeClaw/packages/dashboard/src/app/api/webhooks/\[id\]/route.ts && echo "exists"</automated>` |
| 487 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>test -f /home/projects/ForgeClaw/packages/dashboard/src/app/api/webhooks/\[id\]/logs/route.ts && echo "exists"</automated>` |

### `.plano/fases/21-mission-control/21-05-PLAN.md` (4 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 254 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 \| head -30</automated>` |
| 432 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 \| head -30</automated>` |
| 514 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 \| head -30</automated>` |
| 550 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 \| head -20</automated>` |

### `.plano/fases/21-mission-control/21-06-PLAN.md` (2 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 416 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 \| head -30</automated>` |
| 459 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 \| head -20</automated>` |

### `.plano/fases/22-agentes-especializados-mem-ria-por-topic/22-01-PLAN.md` (5 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 78 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -c 'AgentConfig' packages/core/src/types.ts && grep -c 'agentId' packages/core/src/types.ts && grep -c 'MemoryMode' packages/core/src/types.ts</a` |
| 218 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -c 'createAgent' packages/core/src/state-store.ts && grep -c 'agent_id' packages/core/src/state-store.ts && grep -c 'deleteAgent' packages/core/s` |
| 249 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -c 'AgentConfig' packages/dashboard/src/lib/types.ts && grep -c 'agentId' packages/dashboard/src/lib/types.ts</automated></verify>` |
| 428 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -c 'listAgents' packages/dashboard/src/lib/core.ts && grep -c 'createAgent' packages/dashboard/src/lib/core.ts && grep -c 'agent_id' packages/das` |
| 451 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -c 'agentId' packages/dashboard/src/app/api/topics/route.ts</automated></verify>` |

### `.plano/fases/22-agentes-especializados-mem-ria-por-topic/22-02-PLAN.md` (3 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 125 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/dashboard/src/app/api/agents/route.ts && grep -c 'requireApiAuth' packages/dashboard/src/app/api/agents/route.ts</automated></verify>` |
| 261 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/dashboard/src/app/api/agents/\[id\]/route.ts && grep -c 'DELETE' packages/dashboard/src/app/api/agents/\[id\]/route.ts</automated></v` |
| 325 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/dashboard/src/app/api/topics/\[id\]/agent/route.ts && grep -c 'updateTopicAgent' packages/dashboard/src/app/api/topics/\[id\]/agent/r` |

### `.plano/fases/22-agentes-especializados-mem-ria-por-topic/22-03-PLAN.md` (6 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 94 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -c 'entityFilter' packages/core/src/memory/types.ts</automated></verify>` |
| 144 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -c 'entityFilter' packages/core/src/memory/builtin-provider.ts</automated></verify>` |
| 177 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep 'entityFilter' packages/core/src/memory/manager.ts \| wc -l</automated></verify>` |
| 229 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -c 'AgentConfig' packages/core/src/context-builder.ts && grep -c 'entityFilter' packages/core/src/context-builder.ts && grep -c 'systemPrompt' pa` |
| 285 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -c 'agentConfig' packages/bot/src/handlers/text.ts && grep -c 'getAgent' packages/bot/src/handlers/text.ts</automated></verify>` |
| 342 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -c 'agentConfig' packages/core/src/ws-server.ts && grep -c 'getAgent' packages/core/src/ws-server.ts</automated></verify>` |

### `.plano/fases/22-agentes-especializados-mem-ria-por-topic/22-04-PLAN.md` (5 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 104 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -c 'agents' packages/dashboard/src/components/dashboard-shell.tsx && grep -c 'Bot' packages/dashboard/src/components/dashboard-shell.tsx</automat` |
| 622 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/dashboard/src/components/agents-tab.tsx && grep -c 'AgentsTab' packages/dashboard/src/components/agents-tab.tsx && grep -c 'pt-BR\\|Ag` |
| 671 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -c 'AgentsTab' packages/dashboard/src/app/page.tsx && grep -c 'agentsTab' packages/dashboard/src/app/page.tsx</automated></verify>` |
| 735 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -c 'agentId\\|agent' packages/dashboard/src/components/session-sidebar.tsx</automated></verify>` |
| 768 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -c 'agentId' packages/dashboard/src/components/sessions-tab.tsx</automated></verify>` |

### `.plano/fases/23-auditoria-de-despersonaliza-o-mapear-e-expurgar-contexto-pessoal-do-repo-harness-heartbeat-mem-ria-skills-antes-de-distribuir/23-01-PLAN.md` (140 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 19 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `- "Zero falso-negativo para as 10 categorias conhecidas (nome, empresa, paths, bot handle, user id, URLs de repo, emails, clientes LFpro/Kovvy/DonVicente, skills privadas, screenshots)"` |
| 19 | critical | personal_client | `\b(kovvy\|Kovvy\|clearify\|Clearify)\b` | `- "Zero falso-negativo para as 10 categorias conhecidas (nome, empresa, paths, bot handle, user id, URLs de repo, emails, clientes LFpro/Kovvy/DonVicente, skills privadas, screenshots)"` |
| 19 | critical | personal_client | `\b(don[\s-]?vicente)\b` | `- "Zero falso-negativo para as 10 categorias conhecidas (nome, empresa, paths, bot handle, user id, URLs de repo, emails, clientes LFpro/Kovvy/DonVicente, skills privadas, screenshots)"` |
| 41 | critical | personal_name | `\bJonathan\b` | `**Objetivo:** Construir um scanner determinístico que varre o repo ForgeClaw inteiro em busca de contexto pessoal do Jonathan (nomes próprios, empresas, clientes, paths hardcoded, handles, tokens, URL` |
| 47 | critical | personal_name | `\bJonathan\b` | `Fases 1-22 do ForgeClaw rodaram com o repo sob uso pessoal do Jonathan. Vazou contexto em múltiplos lugares:` |
| 49 | critical | personal_name | `\bJonathan\b` | `@/home/projects/ForgeClaw/packages/core/src/memory/prompts/janitor.md — path '/home/vault/05-pessoal/daily-log', nome "Jonathan", entidades "lfpro/dra nathalia/don vicente"` |
| 49 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `@/home/projects/ForgeClaw/packages/core/src/memory/prompts/janitor.md — path '/home/vault/05-pessoal/daily-log', nome "Jonathan", entidades "lfpro/dra nathalia/don vicente"` |
| 49 | critical | personal_client | `\b(don[\s-]?vicente)\b` | `@/home/projects/ForgeClaw/packages/core/src/memory/prompts/janitor.md — path '/home/vault/05-pessoal/daily-log', nome "Jonathan", entidades "lfpro/dra nathalia/don vicente"` |
| 49 | critical | hardcoded_path | `\/home\/vault\b` | `@/home/projects/ForgeClaw/packages/core/src/memory/prompts/janitor.md — path '/home/vault/05-pessoal/daily-log', nome "Jonathan", entidades "lfpro/dra nathalia/don vicente"` |
| 50 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `@/home/projects/ForgeClaw/packages/core/src/memory/prompts/writer.md — idem, exemplos com "gestor-lfpro"` |
| 51 | critical | personal_name | `\bJonathan\b` | `@/home/projects/ForgeClaw/packages/core/src/memory-manager.ts — comentário '// Jonathan is in BRT (UTC-3)'` |
| 52 | critical | hardcoded_path | `\/home\/vault\b` | `@/home/projects/ForgeClaw/packages/dashboard/src/lib/mock-data.ts — 'vaultPath: "/home/vault"', mock content em pt-BR referenciando o projeto atual` |
| 53 | critical | personal_company | `\bEcoupdigital\b` | `@/home/projects/ForgeClaw/.continue-aqui.md — bot handle '@ForgeClawUP_bot', user id '450030767', token mascarado '8662287719:...', vault '/home/vault', URL 'github.com/Ecoupdigital/forgeclaw'` |
| 53 | critical | personal_handle | `@ForgeClawUP_bot` | `@/home/projects/ForgeClaw/.continue-aqui.md — bot handle '@ForgeClawUP_bot', user id '450030767', token mascarado '8662287719:...', vault '/home/vault', URL 'github.com/Ecoupdigital/forgeclaw'` |
| 53 | critical | personal_userid | `\b450030767\b` | `@/home/projects/ForgeClaw/.continue-aqui.md — bot handle '@ForgeClawUP_bot', user id '450030767', token mascarado '8662287719:...', vault '/home/vault', URL 'github.com/Ecoupdigital/forgeclaw'` |
| 53 | critical | hardcoded_path | `\/home\/vault\b` | `@/home/projects/ForgeClaw/.continue-aqui.md — bot handle '@ForgeClawUP_bot', user id '450030767', token mascarado '8662287719:...', vault '/home/vault', URL 'github.com/Ecoupdigital/forgeclaw'` |
| 53 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `@/home/projects/ForgeClaw/.continue-aqui.md — bot handle '@ForgeClawUP_bot', user id '450030767', token mascarado '8662287719:...', vault '/home/vault', URL 'github.com/Ecoupdigital/forgeclaw'` |
| 53 | critical | bot_token_fragment | `\b8662287719:` | `@/home/projects/ForgeClaw/.continue-aqui.md — bot handle '@ForgeClawUP_bot', user id '450030767', token mascarado '8662287719:...', vault '/home/vault', URL 'github.com/Ecoupdigital/forgeclaw'` |
| 54 | critical | personal_name | `\bJonathan\s+Renan\b` | `@/home/projects/ForgeClaw/.playwright-mcp/ — ~10 yml + logs de sessões reais do dashboard com mensagens tipo "Oi, Jonathan!", "Você é o **Jonathan Renan Outeiro** — fundador da EcoUp Digital, de Novo ` |
| 54 | critical | personal_name | `\bJonathan\b` | `@/home/projects/ForgeClaw/.playwright-mcp/ — ~10 yml + logs de sessões reais do dashboard com mensagens tipo "Oi, Jonathan!", "Você é o **Jonathan Renan Outeiro** — fundador da EcoUp Digital, de Novo ` |
| 54 | critical | personal_name | `\bJonathan\b` | `@/home/projects/ForgeClaw/.playwright-mcp/ — ~10 yml + logs de sessões reais do dashboard com mensagens tipo "Oi, Jonathan!", "Você é o **Jonathan Renan Outeiro** — fundador da EcoUp Digital, de Novo ` |
| 54 | critical | personal_company | `\bEcoUp\b` | `@/home/projects/ForgeClaw/.playwright-mcp/ — ~10 yml + logs de sessões reais do dashboard com mensagens tipo "Oi, Jonathan!", "Você é o **Jonathan Renan Outeiro** — fundador da EcoUp Digital, de Novo ` |
| 54 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `@/home/projects/ForgeClaw/.playwright-mcp/ — ~10 yml + logs de sessões reais do dashboard com mensagens tipo "Oi, Jonathan!", "Você é o **Jonathan Renan Outeiro** — fundador da EcoUp Digital, de Novo ` |
| 54 | critical | personal_client | `\b(bv-otica\|bv_otica\|BV\s?[O\u00D3]tica)\b` | `@/home/projects/ForgeClaw/.playwright-mcp/ — ~10 yml + logs de sessões reais do dashboard com mensagens tipo "Oi, Jonathan!", "Você é o **Jonathan Renan Outeiro** — fundador da EcoUp Digital, de Novo ` |
| 58 | critical | personal_name | `\bJonathan\b` | `@/home/projects/ForgeClaw/packages/core/src/context-builder.ts — path '{vaultPath}/05-pessoal/daily-log' (estrutura Obsidian específica do Jonathan)` |
| 59 | critical | personal_company | `\bEcoupdigital\b` | `@/home/projects/ForgeClaw/README.md — 'git clone https://github.com/Ecoupdigital/forgeclaw.git' (x2), '/home/usuario/obsidian' (placeholder, OK)` |
| 59 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `@/home/projects/ForgeClaw/README.md — 'git clone https://github.com/Ecoupdigital/forgeclaw.git' (x2), '/home/usuario/obsidian' (placeholder, OK)` |
| 60 | critical | personal_company | `\bEcoupdigital\b` | `@/home/projects/ForgeClaw/.plano/STATE.md — 'Repo: github.com/Ecoupdigital/forgeclaw'` |
| 60 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `@/home/projects/ForgeClaw/.plano/STATE.md — 'Repo: github.com/Ecoupdigital/forgeclaw'` |
| 138 | critical | personal_name | `\bJonathan\b` | `// personal_client — nomes de clientes/projetos do Jonathan` |
| 139 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `{ category: 'personal_client', severity: 'critical', pattern: /\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b/g },` |
| 139 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `{ category: 'personal_client', severity: 'critical', pattern: /\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b/g },` |
| 139 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `{ category: 'personal_client', severity: 'critical', pattern: /\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b/g },` |
| 140 | critical | personal_client | `\b(kovvy\|Kovvy\|clearify\|Clearify)\b` | `{ category: 'personal_client', severity: 'critical', pattern: /\b(kovvy\|Kovvy\|clearify\|Clearify)\b/g },` |
| 140 | critical | personal_client | `\b(kovvy\|Kovvy\|clearify\|Clearify)\b` | `{ category: 'personal_client', severity: 'critical', pattern: /\b(kovvy\|Kovvy\|clearify\|Clearify)\b/g },` |
| 140 | critical | personal_client | `\b(kovvy\|Kovvy\|clearify\|Clearify)\b` | `{ category: 'personal_client', severity: 'critical', pattern: /\b(kovvy\|Kovvy\|clearify\|Clearify)\b/g },` |
| 140 | critical | personal_client | `\b(kovvy\|Kovvy\|clearify\|Clearify)\b` | `{ category: 'personal_client', severity: 'critical', pattern: /\b(kovvy\|Kovvy\|clearify\|Clearify)\b/g },` |
| 142 | critical | personal_client | `\b(bv-otica\|bv_otica\|BV\s?[O\u00D3]tica)\b` | `{ category: 'personal_client', severity: 'critical', pattern: /\b(bv-otica\|bv_otica\|BV\s?[OÓ]tica)\b/gi },` |
| 142 | critical | personal_client | `\b(bv-otica\|bv_otica\|BV\s?[O\u00D3]tica)\b` | `{ category: 'personal_client', severity: 'critical', pattern: /\b(bv-otica\|bv_otica\|BV\s?[OÓ]tica)\b/gi },` |
| 143 | critical | personal_client | `\b(foco-real\|focoreal)\b` | `{ category: 'personal_client', severity: 'critical', pattern: /\b(foco-real\|focoreal)\b/gi },` |
| 143 | critical | personal_client | `\b(foco-real\|focoreal)\b` | `{ category: 'personal_client', severity: 'critical', pattern: /\b(foco-real\|focoreal)\b/gi },` |
| 144 | critical | personal_client | `\b(velhos-parceiros\|velhos_parceiros)\b` | `{ category: 'personal_client', severity: 'critical', pattern: /\b(velhos-parceiros\|velhos_parceiros)\b/gi },` |
| 144 | critical | personal_client | `\b(velhos-parceiros\|velhos_parceiros)\b` | `{ category: 'personal_client', severity: 'critical', pattern: /\b(velhos-parceiros\|velhos_parceiros)\b/gi },` |
| 148 | critical | personal_handle | `@ForgeClawUP_bot` | `{ category: 'personal_handle', severity: 'critical', pattern: /@ForgeClawUP_bot/g },` |
| 151 | critical | personal_name | `\bJonathan\b` | `// personal_userid — id do Jonathan` |
| 155 | critical | personal_name | `\bJonathan\b` | `// hardcoded_path — paths que só existem na máquina do Jonathan` |
| 163 | critical | personal_company | `\bEcoupdigital\b` | `{ category: 'private_repo_url', severity: 'critical', pattern: /github\.com\/Ecoupdigital\/forgeclaw/gi },` |
| 171 | critical | personal_name | `\bJonathan\b` | `// vault_structure — estrutura específica do vault do Jonathan` |
| 431 | critical | personal_name | `\bJonathan\b` | `- remover "do Jonathan" (L3)` |
| 432 | critical | hardcoded_path | `\/home\/vault\b` | `- trocar path '/home/vault/05-pessoal/daily-log/*.md' (L10) → '{{daily_log_dir}}/*.md' ou referência genérica a '$FORGECLAW_DAILY_LOG_DIR'` |
| 433 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `- remover exemplos "lfpro, dra nathalia, don vicente" (L41) → exemplos genéricos ("project-a, contact-x, vendor-y")` |
| 433 | critical | personal_client | `\b(don[\s-]?vicente)\b` | `- remover exemplos "lfpro, dra nathalia, don vicente" (L41) → exemplos genéricos ("project-a, contact-x, vendor-y")` |
| 436 | critical | personal_name | `\bJonathan\b` | `- remover "do Jonathan" (L3, L7)` |
| 437 | critical | hardcoded_path | `\/home\/vault\b` | `- trocar path '/home/vault/05-pessoal/daily-log/YYYY-MM-DD.md' → referência genérica` |
| 440 | critical | personal_name | `\bJonathan\b` | `- L34: comentário '// Jonathan is in BRT (UTC-3)' → '// Server runs UTC; dates formatted in the user's configured timezone (default America/Sao_Paulo)'` |
| 443 | critical | hardcoded_path | `\/home\/vault\b` | `- Decidir: manter como fixtures de storybook/dev? Se sim, trocar 'vaultPath: "/home/vault"' (L304) → '"/home/example/vault"'; trocar nomes de projeto em 'projectDir' (L24, L33, L41, L50, L61, L70) de ` |
| 450 | critical | personal_name | `\bJonathan\s+Renan\b` | `- Conteúdo vaza: prompt de sistema ("Você é o **Jonathan Renan Outeiro** — fundador da EcoUp Digital, de Novo Hamburgo/RS"), nomes de projetos internos (gestor-lfpro, bv-otica-crm, inbox-deal-flow), c` |
| 450 | critical | personal_name | `\bJonathan\b` | `- Conteúdo vaza: prompt de sistema ("Você é o **Jonathan Renan Outeiro** — fundador da EcoUp Digital, de Novo Hamburgo/RS"), nomes de projetos internos (gestor-lfpro, bv-otica-crm, inbox-deal-flow), c` |
| 450 | critical | personal_name | `\bJonathan\b` | `- Conteúdo vaza: prompt de sistema ("Você é o **Jonathan Renan Outeiro** — fundador da EcoUp Digital, de Novo Hamburgo/RS"), nomes de projetos internos (gestor-lfpro, bv-otica-crm, inbox-deal-flow), c` |
| 450 | critical | personal_company | `\bEcoUp\b` | `- Conteúdo vaza: prompt de sistema ("Você é o **Jonathan Renan Outeiro** — fundador da EcoUp Digital, de Novo Hamburgo/RS"), nomes de projetos internos (gestor-lfpro, bv-otica-crm, inbox-deal-flow), c` |
| 450 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `- Conteúdo vaza: prompt de sistema ("Você é o **Jonathan Renan Outeiro** — fundador da EcoUp Digital, de Novo Hamburgo/RS"), nomes de projetos internos (gestor-lfpro, bv-otica-crm, inbox-deal-flow), c` |
| 450 | critical | personal_client | `\b(bv-otica\|bv_otica\|BV\s?[O\u00D3]tica)\b` | `- Conteúdo vaza: prompt de sistema ("Você é o **Jonathan Renan Outeiro** — fundador da EcoUp Digital, de Novo Hamburgo/RS"), nomes de projetos internos (gestor-lfpro, bv-otica-crm, inbox-deal-flow), c` |
| 454 | critical | personal_company | `\bEcoupdigital\b` | `- Trocar 'github.com/Ecoupdigital/forgeclaw' → 'github.com/<org>/forgeclaw' (placeholder) ou apenas '<repo-url>'` |
| 454 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `- Trocar 'github.com/Ecoupdigital/forgeclaw' → 'github.com/<org>/forgeclaw' (placeholder) ou apenas '<repo-url>'` |
| 456 | critical | personal_company | `\bEcoupdigital\b` | `- Trocar 'git clone https://github.com/Ecoupdigital/forgeclaw.git' → 'git clone https://github.com/<your-org>/forgeclaw.git' OU o URL público oficial quando existir` |
| 456 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `- Trocar 'git clone https://github.com/Ecoupdigital/forgeclaw.git' → 'git clone https://github.com/<your-org>/forgeclaw.git' OU o URL público oficial quando existir` |
| 467 | critical | personal_name | `\bJonathan\b` | `- path '{vaultPath}/05-pessoal/daily-log' assume estrutura do vault do Jonathan. Alternativas:` |
| 480 | critical | hardcoded_path | `\/home\/vault\b` | `- É histórico (já resolvido pelas Fases 18+). Manter ou mover pra '.plano/archive/'. Não é regressão de produto, mas vaza '/home/vault' nos arquivos citados.` |
| 482 | critical | hardcoded_path | `\/home\/vault\b` | `- Menciona '/home/vault' em contexto histórico. Não distribui. Plano 23-03 deve whitelist '.plano/' na guard de CI.` |
| 505 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `- 'packages/core/src/memory/prompts/janitor.md' → personal_name (L3), hardcoded_path (L10 /home/vault), personal_client (L41 lfpro)` |
| 505 | critical | hardcoded_path | `\/home\/vault\b` | `- 'packages/core/src/memory/prompts/janitor.md' → personal_name (L3), hardcoded_path (L10 /home/vault), personal_client (L41 lfpro)` |
| 506 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `- 'packages/core/src/memory/prompts/writer.md' → personal_name (L3), hardcoded_path (L7), personal_client (L55, 61, 62 gestor-lfpro)` |
| 507 | critical | personal_name | `\bJonathan\b` | `- 'packages/core/src/memory-manager.ts' → personal_name (L34 Jonathan)` |
| 508 | critical | hardcoded_path | `\/home\/vault\b` | `- 'packages/dashboard/src/lib/mock-data.ts' → hardcoded_path (/home/vault L304)` |
| 509 | critical | personal_company | `\bEcoupdigital\b` | `- '.continue-aqui.md' → private_repo_url (L4 Ecoupdigital), personal_handle (ForgeClawUP_bot), personal_userid (450030767), hardcoded_path (/home/vault, /home/projects), bot_token_fragment (8662287719` |
| 509 | critical | personal_userid | `\b450030767\b` | `- '.continue-aqui.md' → private_repo_url (L4 Ecoupdigital), personal_handle (ForgeClawUP_bot), personal_userid (450030767), hardcoded_path (/home/vault, /home/projects), bot_token_fragment (8662287719` |
| 509 | critical | hardcoded_path | `\/home\/vault\b` | `- '.continue-aqui.md' → private_repo_url (L4 Ecoupdigital), personal_handle (ForgeClawUP_bot), personal_userid (450030767), hardcoded_path (/home/vault, /home/projects), bot_token_fragment (8662287719` |
| 509 | critical | bot_token_fragment | `\b8662287719:` | `- '.continue-aqui.md' → private_repo_url (L4 Ecoupdigital), personal_handle (ForgeClawUP_bot), personal_userid (450030767), hardcoded_path (/home/vault, /home/projects), bot_token_fragment (8662287719` |
| 49 | high | personal_name | `\bdra\s+nathalia\b` | `@/home/projects/ForgeClaw/packages/core/src/memory/prompts/janitor.md — path '/home/vault/05-pessoal/daily-log', nome "Jonathan", entidades "lfpro/dra nathalia/don vicente"` |
| 49 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/packages/core/src/memory/prompts/janitor.md — path '/home/vault/05-pessoal/daily-log', nome "Jonathan", entidades "lfpro/dra nathalia/don vicente"` |
| 49 | high | vault_structure | `05-pessoal\/daily-log` | `@/home/projects/ForgeClaw/packages/core/src/memory/prompts/janitor.md — path '/home/vault/05-pessoal/daily-log', nome "Jonathan", entidades "lfpro/dra nathalia/don vicente"` |
| 50 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/packages/core/src/memory/prompts/writer.md — idem, exemplos com "gestor-lfpro"` |
| 51 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/packages/core/src/memory-manager.ts — comentário '// Jonathan is in BRT (UTC-3)'` |
| 52 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/packages/dashboard/src/lib/mock-data.ts — 'vaultPath: "/home/vault"', mock content em pt-BR referenciando o projeto atual` |
| 53 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/.continue-aqui.md — bot handle '@ForgeClawUP_bot', user id '450030767', token mascarado '8662287719:...', vault '/home/vault', URL 'github.com/Ecoupdigital/forgeclaw'` |
| 54 | high | hardcoded_path | `\/home\/projects\/(?!ForgeClaw\b)[A-Za-z0-9_-]+` | `@/home/projects/ForgeClaw/.playwright-mcp/ — ~10 yml + logs de sessões reais do dashboard com mensagens tipo "Oi, Jonathan!", "Você é o **Jonathan Renan Outeiro** — fundador da EcoUp Digital, de Novo ` |
| 54 | high | hardcoded_path | `\/home\/projects\/(?!ForgeClaw\b)[A-Za-z0-9_-]+` | `@/home/projects/ForgeClaw/.playwright-mcp/ — ~10 yml + logs de sessões reais do dashboard com mensagens tipo "Oi, Jonathan!", "Você é o **Jonathan Renan Outeiro** — fundador da EcoUp Digital, de Novo ` |
| 54 | high | hardcoded_path | `\/home\/projects\/(?!ForgeClaw\b)[A-Za-z0-9_-]+` | `@/home/projects/ForgeClaw/.playwright-mcp/ — ~10 yml + logs de sessões reais do dashboard com mensagens tipo "Oi, Jonathan!", "Você é o **Jonathan Renan Outeiro** — fundador da EcoUp Digital, de Novo ` |
| 54 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/.playwright-mcp/ — ~10 yml + logs de sessões reais do dashboard com mensagens tipo "Oi, Jonathan!", "Você é o **Jonathan Renan Outeiro** — fundador da EcoUp Digital, de Novo ` |
| 55 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/ops/forgeclaw.service — 'WorkingDirectory=/home/projects/ForgeClaw', '/root/.bun/bin/bun'` |
| 55 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/ops/forgeclaw.service — 'WorkingDirectory=/home/projects/ForgeClaw', '/root/.bun/bin/bun'` |
| 56 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/ops/forgeclaw-dashboard.service — mesmo pattern` |
| 57 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/packages/cli/src/commands/install.ts — defaults '/root/projects' (L178), '/root/obsidian' (L199)` |
| 58 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/packages/core/src/context-builder.ts — path '{vaultPath}/05-pessoal/daily-log' (estrutura Obsidian específica do Jonathan)` |
| 58 | high | vault_structure | `05-pessoal\/daily-log` | `@/home/projects/ForgeClaw/packages/core/src/context-builder.ts — path '{vaultPath}/05-pessoal/daily-log' (estrutura Obsidian específica do Jonathan)` |
| 59 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/README.md — 'git clone https://github.com/Ecoupdigital/forgeclaw.git' (x2), '/home/usuario/obsidian' (placeholder, OK)` |
| 60 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/.plano/STATE.md — 'Repo: github.com/Ecoupdigital/forgeclaw'` |
| 61 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/.plano/BRIEFING-M.md — já documentou M1 (daily log dir hardcoded pra vault pessoal)` |
| 62 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/packages/dashboard/src/app/api/skills/route.ts — aponta pra '~/.claude/skills/' (acopla produto a skills privadas do user, não do ForgeClaw)` |
| 145 | high | personal_client | `\b(passini\|mybrows\|transplant\|enove)\b` | `{ category: 'personal_client', severity: 'high',     pattern: /\b(passini\|mybrows\|transplant\|enove)\b/gi },` |
| 145 | high | personal_client | `\b(passini\|mybrows\|transplant\|enove)\b` | `{ category: 'personal_client', severity: 'high',     pattern: /\b(passini\|mybrows\|transplant\|enove)\b/gi },` |
| 145 | high | personal_client | `\b(passini\|mybrows\|transplant\|enove)\b` | `{ category: 'personal_client', severity: 'high',     pattern: /\b(passini\|mybrows\|transplant\|enove)\b/gi },` |
| 145 | high | personal_client | `\b(passini\|mybrows\|transplant\|enove)\b` | `{ category: 'personal_client', severity: 'high',     pattern: /\b(passini\|mybrows\|transplant\|enove)\b/gi },` |
| 157 | high | hardcoded_path | `\/home\/projects\/(?!ForgeClaw\b)[A-Za-z0-9_-]+` | `{ category: 'hardcoded_path', severity: 'high',     pattern: /\/home\/projects\/(?!ForgeClaw\b)[A-Za-z0-9_-]+/g }, // /home/projects/X onde X != ForgeClaw` |
| 353 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bun run scripts/audit-personal-context.ts --out=/tmp/audit-dry.md && test -s /tmp/audit-dry.md && grep -q 'Audit Report' /tmp/audit-dry.md && grep -q 'persona` |
| 378 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bun run audit:personal --out=/tmp/audit-via-script.md && test -s /tmp/audit-via-script.md</automated>` |
| 386 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `Rodar 'bun run audit:personal --out=.plano/fases/23-auditoria-de-despersonaliza-o-mapear-e-expurgar-contexto-pessoal-do-repo-harness-heartbeat-mem-ria-skills-antes-de-distribuir/AUDIT-REPORT.md' a par` |
| 399 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>test -s /home/projects/ForgeClaw/.plano/fases/23-auditoria-de-despersonaliza-o-mapear-e-expurgar-contexto-pessoal-do-repo-harness-heartbeat-mem-ria-skills-antes-de-distribuir/AUDIT-REPORT.m` |
| 399 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>test -s /home/projects/ForgeClaw/.plano/fases/23-auditoria-de-despersonaliza-o-mapear-e-expurgar-contexto-pessoal-do-repo-harness-heartbeat-mem-ria-skills-antes-de-distribuir/AUDIT-REPORT.m` |
| 399 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>test -s /home/projects/ForgeClaw/.plano/fases/23-auditoria-de-despersonaliza-o-mapear-e-expurgar-contexto-pessoal-do-repo-harness-heartbeat-mem-ria-skills-antes-de-distribuir/AUDIT-REPORT.m` |
| 399 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>test -s /home/projects/ForgeClaw/.plano/fases/23-auditoria-de-despersonaliza-o-mapear-e-expurgar-contexto-pessoal-do-repo-harness-heartbeat-mem-ria-skills-antes-de-distribuir/AUDIT-REPORT.m` |
| 432 | high | vault_structure | `05-pessoal\/daily-log` | `- trocar path '/home/vault/05-pessoal/daily-log/*.md' (L10) → '{{daily_log_dir}}/*.md' ou referência genérica a '$FORGECLAW_DAILY_LOG_DIR'` |
| 433 | high | personal_name | `\bdra\s+nathalia\b` | `- remover exemplos "lfpro, dra nathalia, don vicente" (L41) → exemplos genéricos ("project-a, contact-x, vendor-y")` |
| 437 | high | vault_structure | `05-pessoal\/daily-log` | `- trocar path '/home/vault/05-pessoal/daily-log/YYYY-MM-DD.md' → referência genérica` |
| 443 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- Decidir: manter como fixtures de storybook/dev? Se sim, trocar 'vaultPath: "/home/vault"' (L304) → '"/home/example/vault"'; trocar nomes de projeto em 'projectDir' (L24, L33, L41, L50, L61, L70) de ` |
| 458 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- 'WorkingDirectory=/home/projects/ForgeClaw' → documentar como placeholder no template do installer ou gerar dinamicamente em 'packages/cli/src/utils/service.ts' (já gera? verificar). Remover serviço` |
| 467 | high | vault_structure | `05-pessoal\/daily-log` | `- path '{vaultPath}/05-pessoal/daily-log' assume estrutura do vault do Jonathan. Alternativas:` |
| 494 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>test -s /home/projects/ForgeClaw/.plano/fases/23-auditoria-de-despersonaliza-o-mapear-e-expurgar-contexto-pessoal-do-repo-harness-heartbeat-mem-ria-skills-antes-de-distribuir/CLEANUP-CHECKL` |
| 494 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>test -s /home/projects/ForgeClaw/.plano/fases/23-auditoria-de-despersonaliza-o-mapear-e-expurgar-contexto-pessoal-do-repo-harness-heartbeat-mem-ria-skills-antes-de-distribuir/CLEANUP-CHECKL` |
| 494 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>test -s /home/projects/ForgeClaw/.plano/fases/23-auditoria-de-despersonaliza-o-mapear-e-expurgar-contexto-pessoal-do-repo-harness-heartbeat-mem-ria-skills-antes-de-distribuir/CLEANUP-CHECKL` |
| 494 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>test -s /home/projects/ForgeClaw/.plano/fases/23-auditoria-de-despersonaliza-o-mapear-e-expurgar-contexto-pessoal-do-repo-harness-heartbeat-mem-ria-skills-antes-de-distribuir/CLEANUP-CHECKL` |
| 494 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>test -s /home/projects/ForgeClaw/.plano/fases/23-auditoria-de-despersonaliza-o-mapear-e-expurgar-contexto-pessoal-do-repo-harness-heartbeat-mem-ria-skills-antes-de-distribuir/CLEANUP-CHECKL` |
| 512 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- 'ops/forgeclaw.service', 'ops/forgeclaw-dashboard.service' → hardcoded_path (L8 /home/projects/ForgeClaw)` |
| 516 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `Se algum esperado **não aparecer**, adicionar regra ao script em task#1 e regerar. Se achados falsos críticos (ex: um string legítima tipo '/home/projects/ForgeClaw' em código de build que DEVE ficar)` |
| 521 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw` |
| 534 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bun run audit:personal:json --out=/tmp/audit.json && jq -r '.[] \| "\(.file):\(.line):\(.category)"' /tmp/audit.json \| sort -u > /tmp/covered.txt && for f in p` |
| 49 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `@/home/projects/ForgeClaw/packages/core/src/memory/prompts/janitor.md — path '/home/vault/05-pessoal/daily-log', nome "Jonathan", entidades "lfpro/dra nathalia/don vicente"` |
| 57 | medium | hardcoded_path | `\/root\/projects\b` | `@/home/projects/ForgeClaw/packages/cli/src/commands/install.ts — defaults '/root/projects' (L178), '/root/obsidian' (L199)` |
| 57 | medium | hardcoded_path | `\/root\/obsidian\b` | `@/home/projects/ForgeClaw/packages/cli/src/commands/install.ts — defaults '/root/projects' (L178), '/root/obsidian' (L199)` |
| 58 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `@/home/projects/ForgeClaw/packages/core/src/context-builder.ts — path '{vaultPath}/05-pessoal/daily-log' (estrutura Obsidian específica do Jonathan)` |
| 62 | medium | private_skill_dep | `~\/\.claude\/skills\b` | `@/home/projects/ForgeClaw/packages/dashboard/src/app/api/skills/route.ts — aponta pra '~/.claude/skills/' (acopla produto a skills privadas do user, não do ForgeClaw)` |
| 172 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `{ category: 'vault_structure', severity: 'high', pattern: /05-pessoal\/daily-log/g },` |
| 432 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `- trocar path '/home/vault/05-pessoal/daily-log/*.md' (L10) → '{{daily_log_dir}}/*.md' ou referência genérica a '$FORGECLAW_DAILY_LOG_DIR'` |
| 437 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `- trocar path '/home/vault/05-pessoal/daily-log/YYYY-MM-DD.md' → referência genérica` |
| 461 | medium | hardcoded_path | `\/root\/projects\b` | `- L178 default '/root/projects' → 'join(homedir(), 'projects')' (portable)` |
| 462 | medium | hardcoded_path | `\/root\/obsidian\b` | `- L199 default '/root/obsidian' → remover default (vault path é opcional; só pede se user confirmou que usa Obsidian)` |
| 467 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `- path '{vaultPath}/05-pessoal/daily-log' assume estrutura do vault do Jonathan. Alternativas:` |
| 472 | medium | private_skill_dep | `~\/\.claude\/skills\b` | `- Aponta pra '~/.claude/skills/' — que é do runtime do Claude Code, não do ForgeClaw. Decidir:` |
| 513 | medium | hardcoded_path | `\/root\/projects\b` | `- 'packages/cli/src/commands/install.ts' → hardcoded_path (/root/projects L178, /root/obsidian L199)` |
| 513 | medium | hardcoded_path | `\/root\/obsidian\b` | `- 'packages/cli/src/commands/install.ts' → hardcoded_path (/root/projects L178, /root/obsidian L199)` |

### `.plano/fases/23-auditoria-de-despersonaliza-o-mapear-e-expurgar-contexto-pessoal-do-repo-harness-heartbeat-mem-ria-skills-antes-de-distribuir/23-02-PLAN.md` (91 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 28 | critical | personal_name | `\bJonathan\b` | `- "Nenhuma referência a 'Jonathan' fora de: README contribuidores (se existir), .plano/ histórico, node_modules"` |
| 29 | critical | hardcoded_path | `\/home\/vault\b` | `- "Nenhum path hardcoded /home/vault fora de .plano/ histórico"` |
| 30 | critical | personal_company | `\bEcoupdigital\b` | `- "Nenhuma URL github.com/Ecoupdigital em arquivos distribuídos (packages/, README, CHANGELOG, ops)"` |
| 40 | critical | personal_name | `\bJonathan\b` | `provides: "Resolução de daily log dir sem assumir estrutura Obsidian do Jonathan"` |
| 78 | critical | personal_name | `\bJonathan\b` | `1. **L3**: '"Tu és o **janitor do ForgeClaw** — o responsável por manter a memória de longo prazo do Jonathan em estado navegável, relevante e honesto. Tu rodas uma vez por dia às 23:55 BRT."'` |
| 81 | critical | hardcoded_path | `\/home\/vault\b` | `2. **L10**: '"- Daily log (\'/home/vault/05-pessoal/daily-log/*.md\') = o que aconteceu. Append-only. Cresce livre."'` |
| 86 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `4. **L41**: '"- linkar entidades relevantes por nome: \"lfpro\", \"dra nathalia\", \"don vicente\""'` |
| 86 | critical | personal_client | `\b(don[\s-]?vicente)\b` | `4. **L41**: '"- linkar entidades relevantes por nome: \"lfpro\", \"dra nathalia\", \"don vicente\""'` |
| 91 | critical | personal_name | `\bJonathan\b` | `6. Qualquer outra ocorrência de "Jonathan" (grep final) substituir por "usuário" ou "user".` |
| 93 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `Ao terminar, rodar 'grep -n -i 'jonathan\\|/home/vault\\|lfpro\\|nathalia\\|don vicente' packages/core/src/memory/prompts/janitor.md' → deve retornar **vazio**.` |
| 93 | critical | personal_client | `\b(don[\s-]?vicente)\b` | `Ao terminar, rodar 'grep -n -i 'jonathan\\|/home/vault\\|lfpro\\|nathalia\\|don vicente' packages/core/src/memory/prompts/janitor.md' → deve retornar **vazio**.` |
| 93 | critical | hardcoded_path | `\/home\/vault\b` | `Ao terminar, rodar 'grep -n -i 'jonathan\\|/home/vault\\|lfpro\\|nathalia\\|don vicente' packages/core/src/memory/prompts/janitor.md' → deve retornar **vazio**.` |
| 96 | critical | personal_client | `\b(don[\s-]?vicente)\b` | `<automated>cd /home/projects/ForgeClaw && ! grep -n -E -i 'jonathan\|/home/vault\|\blfpro\b\|nathalia\|don vicente' packages/core/src/memory/prompts/janitor.md</automated>` |
| 96 | critical | hardcoded_path | `\/home\/vault\b` | `<automated>cd /home/projects/ForgeClaw && ! grep -n -E -i 'jonathan\|/home/vault\|\blfpro\b\|nathalia\|don vicente' packages/core/src/memory/prompts/janitor.md</automated>` |
| 98 | critical | personal_name | `\bJonathan\b` | `<done>Arquivo janitor.md não contém mais nome, vault path hardcoded, nem exemplos de clientes do Jonathan.</done>` |
| 108 | critical | personal_name | `\bJonathan\b` | `1. **L3**: '"Tu és o **writer do ForgeClaw** — um extrator mecânico que transforma transcrições de sessão em bullets curtos pro daily log do Jonathan."'` |
| 111 | critical | hardcoded_path | `\/home\/vault\b` | `2. **L7**: '"Receber mensagens de uma sessão do dia e produzir 5-15 bullets compactos, marcados por tipo, pra serem anexados no daily log (\'/home/vault/05-pessoal/daily-log/YYYY-MM-DD.md\')."'` |
| 114 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `3. **L55-62** (exemplo deploy gestor-lfpro):` |
| 116 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `user: vou fazer o deploy do gestor-lfpro amanhã as 8h` |
| 126 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `E na saída esperada L61, L62: trocar 'gestor-lfpro' → 'project-alpha' (mantém 'topic:' como 'project-alpha').` |
| 146 | critical | personal_client | `\b(foco-real\|focoreal)\b` | `E bullets L79, L81: trocar 'dra nathalia' → 'contact-a', 'foco-real' → 'newsletter-project'.` |
| 148 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `6. **L89**: '"session": { "key": "abc123", "topic": "gestor-lfpro", "startedAt": 1760000000 }'` |
| 151 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `Verificação final: 'grep -n -i 'jonathan\\|/home/vault\\|lfpro\\|nathalia\\|asaas\\|foco-real' packages/core/src/memory/prompts/writer.md' → vazio.` |
| 151 | critical | personal_client | `\b(foco-real\|focoreal)\b` | `Verificação final: 'grep -n -i 'jonathan\\|/home/vault\\|lfpro\\|nathalia\\|asaas\\|foco-real' packages/core/src/memory/prompts/writer.md' → vazio.` |
| 151 | critical | hardcoded_path | `\/home\/vault\b` | `Verificação final: 'grep -n -i 'jonathan\\|/home/vault\\|lfpro\\|nathalia\\|asaas\\|foco-real' packages/core/src/memory/prompts/writer.md' → vazio.` |
| 154 | critical | personal_client | `\b(foco-real\|focoreal)\b` | `<automated>cd /home/projects/ForgeClaw && ! grep -n -E -i 'jonathan\|/home/vault\|\blfpro\b\|nathalia\|\basaas\b\|foco-real' packages/core/src/memory/prompts/writer.md</automated>` |
| 154 | critical | hardcoded_path | `\/home\/vault\b` | `<automated>cd /home/projects/ForgeClaw && ! grep -n -E -i 'jonathan\|/home/vault\|\blfpro\b\|nathalia\|\basaas\b\|foco-real' packages/core/src/memory/prompts/writer.md</automated>` |
| 156 | critical | personal_name | `\bJonathan\b` | `<done>writer.md sem nome, vault path, clientes do Jonathan ou serviços específicos (asaas).</done>` |
| 162 | critical | personal_name | `\bJonathan\b` | `Sanitizar o comentário na linha 34-40 que menciona "Jonathan". Edit tool preserva indentação.` |
| 166 | critical | personal_name | `\bJonathan\b` | `// Jonathan is in BRT (UTC-3). The server runs UTC. We format dates/times` |
| 190 | critical | personal_name | `\bJonathan\b` | `<automated>cd /home/projects/ForgeClaw && ! grep -n 'Jonathan' packages/core/src/memory-manager.ts && bun run --filter=@forgeclaw/core typecheck 2>&1 \| tail -20 \|\| true</automated>` |
| 192 | critical | personal_name | `\bJonathan\b` | `<done>Sem "Jonathan" no arquivo; typecheck do package core continua passando (ou não introduzimos regressão).</done>` |
| 207 | critical | personal_name | `\bJonathan\b` | `O fallback '05-pessoal/daily-log' assume estrutura específica do vault do Jonathan. Alinhado com M1, trocar por:` |
| 263 | critical | hardcoded_path | `\/home\/vault\b` | `- L304: 'vaultPath: "/home/vault"' → '"/home/example/vault"'.` |
| 278 | critical | hardcoded_path | `\/home\/vault\b` | `<automated>cd /home/projects/ForgeClaw && { ! test -f packages/dashboard/src/lib/mock-data.ts \|\| ! grep -n -E '/home/vault\|ForgeClaw Core' packages/dashboard/src/lib/mock-data.ts; }</automated>` |
| 280 | critical | hardcoded_path | `\/home\/vault\b` | `<done>mock-data.ts ou foi deletado OU foi sanitizado (sem /home/vault, sem "ForgeClaw Core" — usa "Demo Project" etc.); build do dashboard não regrediu.</done>` |
| 377 | critical | personal_company | `\bEcoupdigital\b` | `- 'git clone https://github.com/Ecoupdigital/forgeclaw.git'` |
| 377 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `- 'git clone https://github.com/Ecoupdigital/forgeclaw.git'` |
| 383 | critical | personal_company | `\bEcoupdigital\b` | `- '- [2026-04-09] Repo: github.com/Ecoupdigital/forgeclaw'` |
| 383 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `- '- [2026-04-09] Repo: github.com/Ecoupdigital/forgeclaw'` |
| 389 | critical | personal_company | `\bEcoupdigital\b` | `<automated>cd /home/projects/ForgeClaw && ! grep -n 'Ecoupdigital/forgeclaw' README.md && ! grep -n 'Ecoupdigital/forgeclaw' .plano/STATE.md</automated>` |
| 389 | critical | personal_company | `\bEcoupdigital\b` | `<automated>cd /home/projects/ForgeClaw && ! grep -n 'Ecoupdigital/forgeclaw' README.md && ! grep -n 'Ecoupdigital/forgeclaw' .plano/STATE.md</automated>` |
| 471 | critical | personal_name | `\bJonathan\b` | `Esses findings têm que ser fechados antes do plano 23-02 ser considerado completo. Se houver finding legítimo que o regex não consegue distinguir (ex: "Jonathan" em attribution histórico ok), document` |
| 481 | critical | personal_name | `\bJonathan\b` | `- [ ] 'janitor.md' e 'writer.md' sem nome do Jonathan, sem '/home/vault', sem clientes reais.` |
| 481 | critical | hardcoded_path | `\/home\/vault\b` | `- [ ] 'janitor.md' e 'writer.md' sem nome do Jonathan, sem '/home/vault', sem clientes reais.` |
| 482 | critical | personal_name | `\bJonathan\b` | `- [ ] 'memory-manager.ts' comentário neutro (sem "Jonathan is in BRT").` |
| 487 | critical | personal_company | `\bEcoupdigital\b` | `- [ ] 'README.md' e '.plano/STATE.md' sem URL 'Ecoupdigital/forgeclaw'.` |
| 60 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/.plano/fases/23-auditoria-de-despersonaliza-o-mapear-e-expurgar-contexto-pessoal-do-repo-harness-heartbeat-mem-ria-skills-antes-de-distribuir/AUDIT-REPORT.md — fonte de verda` |
| 61 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/.plano/fases/23-auditoria-de-despersonaliza-o-mapear-e-expurgar-contexto-pessoal-do-repo-harness-heartbeat-mem-ria-skills-antes-de-distribuir/CLEANUP-CHECKLIST.md — ordem de ` |
| 62 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/packages/core/src/memory-manager.ts — lógica de resolução de 'dailyDir' (usar como referência canônica)` |
| 63 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/.plano/BRIEFING-M.md — M1 já previu a parametrização de daily log dir` |
| 81 | high | vault_structure | `05-pessoal\/daily-log` | `2. **L10**: '"- Daily log (\'/home/vault/05-pessoal/daily-log/*.md\') = o que aconteceu. Append-only. Cresce livre."'` |
| 86 | high | personal_name | `\bdra\s+nathalia\b` | `4. **L41**: '"- linkar entidades relevantes por nome: \"lfpro\", \"dra nathalia\", \"don vicente\""'` |
| 96 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && ! grep -n -E -i 'jonathan\|/home/vault\|\blfpro\b\|nathalia\|don vicente' packages/core/src/memory/prompts/janitor.md</automated>` |
| 111 | high | vault_structure | `05-pessoal\/daily-log` | `2. **L7**: '"Receber mensagens de uma sessão do dia e produzir 5-15 bullets compactos, marcados por tipo, pra serem anexados no daily log (\'/home/vault/05-pessoal/daily-log/YYYY-MM-DD.md\')."'` |
| 146 | high | personal_name | `\bdra\s+nathalia\b` | `E bullets L79, L81: trocar 'dra nathalia' → 'contact-a', 'foco-real' → 'newsletter-project'.` |
| 154 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && ! grep -n -E -i 'jonathan\|/home/vault\|\blfpro\b\|nathalia\|\basaas\b\|foco-real' packages/core/src/memory/prompts/writer.md</automated>` |
| 190 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && ! grep -n 'Jonathan' packages/core/src/memory-manager.ts && bun run --filter=@forgeclaw/core typecheck 2>&1 \| tail -20 \|\| true</automated>` |
| 207 | high | vault_structure | `05-pessoal\/daily-log` | `O fallback '05-pessoal/daily-log' assume estrutura específica do vault do Jonathan. Alinhado com M1, trocar por:` |
| 244 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && ! grep -n "05-pessoal" packages/core/src/context-builder.ts && bun run --filter=@forgeclaw/core typecheck 2>&1 \| tail -20 \|\| true</automated>` |
| 246 | high | vault_structure | `05-pessoal\/daily-log` | `<done>context-builder.ts não referencia '05-pessoal/daily-log'; novo campo 'vaultDailyLogPath' tipado em ForgeClawConfig; typecheck passa.</done>` |
| 262 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- L17-54: trocar 'projectDir: "/home/projects/ForgeClaw..."' → '"/home/example/projects/demo-app..."' e 'name: "ForgeClaw Core"'/'"Dashboard Build"'/'"Memory System"' → '"Demo Project"', '"Demo Dashbo` |
| 278 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && { ! test -f packages/dashboard/src/lib/mock-data.ts \|\| ! grep -n -E '/home/vault\|ForgeClaw Core' packages/dashboard/src/lib/mock-data.ts; }</automated>` |
| 303 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && ! grep -n -E "'/root/projects'\|'/root/obsidian'" packages/cli/src/commands/install.ts && bun run --filter=forgeclaw typecheck 2>&1 \| tail -20 \|\| true</automat` |
| 355 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `Depois: **remover** os arquivos originais 'ops/forgeclaw.service' e 'ops/forgeclaw-dashboard.service' (que têm paths hardcoded '/root/...' e '/home/projects/ForgeClaw').` |
| 366 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && test -f ops/forgeclaw.service.example && test -f ops/forgeclaw-dashboard.service.example && { ! test -f ops/forgeclaw.service \|\| ! grep -q '/home/projects/For` |
| 366 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && test -f ops/forgeclaw.service.example && test -f ops/forgeclaw-dashboard.service.example && { ! test -f ops/forgeclaw.service \|\| ! grep -q '/home/projects/For` |
| 366 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && test -f ops/forgeclaw.service.example && test -f ops/forgeclaw-dashboard.service.example && { ! test -f ops/forgeclaw.service \|\| ! grep -q '/home/projects/For` |
| 368 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<done>Arquivos em ops/ ou foram convertidos em .example com placeholders, ou removidos; nenhum .service commitado contém '/home/projects/ForgeClaw' ou '/root/'.</done>` |
| 389 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && ! grep -n 'Ecoupdigital/forgeclaw' README.md && ! grep -n 'Ecoupdigital/forgeclaw' .plano/STATE.md</automated>` |
| 413 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw` |
| 434 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && ! test -d .playwright-mcp && ! test -f sessions-tab-initial.png && ! test -f sessions-with-real-names.png && ! test -f .continue-aqui.md && grep -q '\.playwri` |
| 445 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw` |
| 474 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bun run audit:personal:json --out=/tmp/audit.json && test "$(jq '[.[] \| select(.severity=="critical") \| select(.file \| startswith(".plano/") \| not) \| select(.` |
| 483 | high | vault_structure | `05-pessoal\/daily-log` | `- [ ] 'context-builder.ts' resolve daily log via env > config > default, sem '05-pessoal/daily-log'.` |
| 486 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- [ ] 'ops/*.service' não contém '/home/projects/ForgeClaw' hardcoded (ou viraram '.example').` |
| 81 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `2. **L10**: '"- Daily log (\'/home/vault/05-pessoal/daily-log/*.md\') = o que aconteceu. Append-only. Cresce livre."'` |
| 111 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `2. **L7**: '"Receber mensagens de uma sessão do dia e produzir 5-15 bullets compactos, marcados por tipo, pra serem anexados no daily log (\'/home/vault/05-pessoal/daily-log/YYYY-MM-DD.md\')."'` |
| 203 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `? path.join(this.config.vaultPath, '05-pessoal', 'daily-log')` |
| 207 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `O fallback '05-pessoal/daily-log' assume estrutura específica do vault do Jonathan. Alinhado com M1, trocar por:` |
| 244 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `<automated>cd /home/projects/ForgeClaw && ! grep -n "05-pessoal" packages/core/src/context-builder.ts && bun run --filter=@forgeclaw/core typecheck 2>&1 \| tail -20 \|\| true</automated>` |
| 246 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `<done>context-builder.ts não referencia '05-pessoal/daily-log'; novo campo 'vaultDailyLogPath' tipado em ForgeClawConfig; typecheck passa.</done>` |
| 288 | medium | hardcoded_path | `\/root\/projects\b` | `**L178**: 'initialValue: (existingConfig.workingDir as string) ?? '/root/projects','` |
| 291 | medium | hardcoded_path | `\/root\/obsidian\b` | `**L199**: 'initialValue: (existingConfig.vaultPath as string) ?? '/root/obsidian','` |
| 303 | medium | hardcoded_path | `\/root\/projects\b` | `<automated>cd /home/projects/ForgeClaw && ! grep -n -E "'/root/projects'\|'/root/obsidian'" packages/cli/src/commands/install.ts && bun run --filter=forgeclaw typecheck 2>&1 \| tail -20 \|\| true</automat` |
| 303 | medium | hardcoded_path | `\/root\/obsidian\b` | `<automated>cd /home/projects/ForgeClaw && ! grep -n -E "'/root/projects'\|'/root/obsidian'" packages/cli/src/commands/install.ts && bun run --filter=forgeclaw typecheck 2>&1 \| tail -20 \|\| true</automat` |
| 305 | medium | hardcoded_path | `\/root\/projects\b` | `<done>Defaults '/root/projects' e '/root/obsidian' removidos; substituídos por 'homedir()' + ''projects'' e por string vazia.</done>` |
| 305 | medium | hardcoded_path | `\/root\/obsidian\b` | `<done>Defaults '/root/projects' e '/root/obsidian' removidos; substituídos por 'homedir()' + ''projects'' e por string vazia.</done>` |
| 483 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `- [ ] 'context-builder.ts' resolve daily log via env > config > default, sem '05-pessoal/daily-log'.` |
| 485 | medium | hardcoded_path | `\/root\/projects\b` | `- [ ] 'install.ts' sem defaults '/root/projects' e '/root/obsidian'.` |
| 485 | medium | hardcoded_path | `\/root\/obsidian\b` | `- [ ] 'install.ts' sem defaults '/root/projects' e '/root/obsidian'.` |

### `.plano/fases/23-auditoria-de-despersonaliza-o-mapear-e-expurgar-contexto-pessoal-do-repo-harness-heartbeat-mem-ria-skills-antes-de-distribuir/23-03-PLAN.md` (23 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 39 | critical | personal_name | `\bJonathan\b` | `**Objetivo:** Garantir que nenhum commit futuro reintroduza contexto pessoal do Jonathan no repo. O scanner do 23-01 vira gate de CI e hook local opcional. Toda exceção é explícita via allowlist audit` |
| 128 | critical | hardcoded_path | `\/home\/vault\b` | `<done>Scanner suporta '--ci'; com repo limpo (pós 23-02), retorna exit 0 e mensagem "AUDIT PASS". Se injetar um '/home/vault' em algum arquivo de packages/ e rodar novamente, retorna exit 1.</done>` |
| 335 | critical | hardcoded_path | `\/home\/vault\b` | `echo 'const x = "/home/vault/05-pessoal/daily-log";' > packages/core/src/__regression_test.ts` |
| 363 | critical | hardcoded_path | `\/home\/vault\b` | `<automated>cd /home/projects/ForgeClaw && echo 'const x = "/home/vault/05-pessoal/daily-log";' > packages/core/src/__regression_test.ts && ! bun run audit:personal:ci 2>/dev/null; RET=$?; rm -f packag` |
| 375 | critical | hardcoded_path | `\/home\/vault\b` | `- [ ] Teste de regressão: injetar '/home/vault' em 'packages/' faz CI falhar; remover faz passar.` |
| 43 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/scripts/audit-personal-context.ts — scanner base criado em 23-01` |
| 44 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/.plano/fases/23-auditoria-de-despersonaliza-o-mapear-e-expurgar-contexto-pessoal-do-repo-harness-heartbeat-mem-ria-skills-antes-de-distribuir/AUDIT-REPORT.md — baseline limpo` |
| 45 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/.plano/fases/23-auditoria-de-despersonaliza-o-mapear-e-expurgar-contexto-pessoal-do-repo-harness-heartbeat-mem-ria-skills-antes-de-distribuir/CLEANUP-CHECKLIST.md — guia das ` |
| 126 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bun run scripts/audit-personal-context.ts --ci && echo "CI mode executed successfully"</automated>` |
| 160 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>test -f /home/projects/ForgeClaw/.audit-personal-allowlist.txt && grep -q 'Formato:' /home/projects/ForgeClaw/.audit-personal-allowlist.txt</automated>` |
| 160 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>test -f /home/projects/ForgeClaw/.audit-personal-allowlist.txt && grep -q 'Formato:' /home/projects/ForgeClaw/.audit-personal-allowlist.txt</automated>` |
| 180 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bun run audit:personal:ci</automated>` |
| 241 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>test -f /home/projects/ForgeClaw/.github/workflows/audit-personal-context.yml && grep -q 'audit:personal:ci' /home/projects/ForgeClaw/.github/workflows/audit-personal-context.yml && grep -q` |
| 241 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>test -f /home/projects/ForgeClaw/.github/workflows/audit-personal-context.yml && grep -q 'audit:personal:ci' /home/projects/ForgeClaw/.github/workflows/audit-personal-context.yml && grep -q` |
| 241 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>test -f /home/projects/ForgeClaw/.github/workflows/audit-personal-context.yml && grep -q 'audit:personal:ci' /home/projects/ForgeClaw/.github/workflows/audit-personal-context.yml && grep -q` |
| 323 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>test -x /home/projects/ForgeClaw/.githooks/pre-commit && /home/projects/ForgeClaw/.githooks/pre-commit && grep -q 'audit:personal:ci' /home/projects/ForgeClaw/README.md</automated>` |
| 323 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>test -x /home/projects/ForgeClaw/.githooks/pre-commit && /home/projects/ForgeClaw/.githooks/pre-commit && grep -q 'audit:personal:ci' /home/projects/ForgeClaw/README.md</automated>` |
| 323 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>test -x /home/projects/ForgeClaw/.githooks/pre-commit && /home/projects/ForgeClaw/.githooks/pre-commit && grep -q 'audit:personal:ci' /home/projects/ForgeClaw/README.md</automated>` |
| 335 | high | vault_structure | `05-pessoal\/daily-log` | `echo 'const x = "/home/vault/05-pessoal/daily-log";' > packages/core/src/__regression_test.ts` |
| 363 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && echo 'const x = "/home/vault/05-pessoal/daily-log";' > packages/core/src/__regression_test.ts && ! bun run audit:personal:ci 2>/dev/null; RET=$?; rm -f packag` |
| 363 | high | vault_structure | `05-pessoal\/daily-log` | `<automated>cd /home/projects/ForgeClaw && echo 'const x = "/home/vault/05-pessoal/daily-log";' > packages/core/src/__regression_test.ts && ! bun run audit:personal:ci 2>/dev/null; RET=$?; rm -f packag` |
| 335 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `echo 'const x = "/home/vault/05-pessoal/daily-log";' > packages/core/src/__regression_test.ts` |
| 363 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `<automated>cd /home/projects/ForgeClaw && echo 'const x = "/home/vault/05-pessoal/daily-log";' > packages/core/src/__regression_test.ts && ! bun run audit:personal:ci 2>/dev/null; RET=$?; rm -f packag` |

### `.plano/fases/24-templates-por-arqu-tipo-cinco-perfis-solo-builder-criador-de-conte-do-ag-ncia-freela-gestor-e-commerce-gen-rico-com-harness-completo-gen-rico-por-arqu-tipo/24-01-PLAN.md` (9 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 177 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/cli/src/templates/archetypes/types.ts && grep -c 'ArchetypeSlug' packages/cli/src/templates/archetypes/types.ts && grep -c 'solo-buil` |
| 371 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/cli/src/templates/archetypes/loader.ts && grep -c 'export function loadArchetype' packages/cli/src/templates/archetypes/loader.ts && ` |
| 402 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/cli/src/templates/archetypes/index.ts && grep -c 'loadArchetype' packages/cli/src/templates/archetypes/index.ts && grep -c 'Archetype` |
| 515 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/cli/src/templates/archetypes/README.md && grep -c 'Placeholders universais' packages/cli/src/templates/archetypes/README.md && grep -` |
| 644 | high | private_skill_dep | `\buazapi[-_]?(mcp)?\b` | `"WhatsApp via UazAPI (comunicacao)"` |
| 687 | high | private_skill_dep | `\buazapi[-_]?(mcp)?\b` | `"UazAPI (WhatsApp SAC)",` |
| 727 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && for s in solo-builder content-creator agency-freela ecom-manager generic; do test -f "packages/cli/src/templates/archetypes/$s/archetype.json" && node` |
| 739 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw && bun run -b packages/cli typecheck 2>&1 \|\| bun tsc --noEmit -p packages/cli/tsconfig.json 2>&1` |
| 746 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && (bun tsc --noEmit -p packages/cli/tsconfig.json 2>&1 \| grep -E "archetypes/(types\|loader\|index)\.ts" \| grep -v "Found 0 errors") ; EXIT=$?; if [ $EXIT` |

### `.plano/fases/24-templates-por-arqu-tipo-cinco-perfis-solo-builder-criador-de-conte-do-ag-ncia-freela-gestor-e-commerce-gen-rico-com-harness-completo-gen-rico-por-arqu-tipo/24-02-PLAN.md` (48 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 27 | critical | personal_name | `\bJonathan\b` | `- "Nenhum arquivo tem dados pessoais do Jonathan ou clientes reais"` |
| 50 | critical | personal_name | `\bJonathan\b` | `**Objetivo:** Preencher os 7 arquivos markdown (SOUL, USER, AGENTS, TOOLS, MEMORY, STYLE, HEARTBEAT) para cada um dos 5 arquetipos criados em 24-01. Cada arquivo precisa ter conteudo real, distinguive` |
| 62 | critical | personal_name | `\bJonathan\b` | `2. **Zero dado pessoal.** Nao citar "Jonathan", "EcoUp", "Don Vicente", "Kovvy", "LFpro", "Clearify" ou qualquer coisa vinda do vault original.` |
| 62 | critical | personal_company | `\bEcoUp\b` | `2. **Zero dado pessoal.** Nao citar "Jonathan", "EcoUp", "Don Vicente", "Kovvy", "LFpro", "Clearify" ou qualquer coisa vinda do vault original.` |
| 62 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `2. **Zero dado pessoal.** Nao citar "Jonathan", "EcoUp", "Don Vicente", "Kovvy", "LFpro", "Clearify" ou qualquer coisa vinda do vault original.` |
| 62 | critical | personal_client | `\b(kovvy\|Kovvy\|clearify\|Clearify)\b` | `2. **Zero dado pessoal.** Nao citar "Jonathan", "EcoUp", "Don Vicente", "Kovvy", "LFpro", "Clearify" ou qualquer coisa vinda do vault original.` |
| 62 | critical | personal_client | `\b(kovvy\|Kovvy\|clearify\|Clearify)\b` | `2. **Zero dado pessoal.** Nao citar "Jonathan", "EcoUp", "Don Vicente", "Kovvy", "LFpro", "Clearify" ou qualquer coisa vinda do vault original.` |
| 62 | critical | personal_client | `\b(don[\s-]?vicente)\b` | `2. **Zero dado pessoal.** Nao citar "Jonathan", "EcoUp", "Don Vicente", "Kovvy", "LFpro", "Clearify" ou qualquer coisa vinda do vault original.` |
| 1373 | critical | personal_name | `\bJonathan\b` | `FORBIDDEN="Jonathan\|EcoUp\|Don Vicente\|Donvicente\|Kovvy\|LFpro\|LF[ -]Pro\|Clearify\|Passini\|Mybrows"` |
| 1373 | critical | personal_company | `\bEcoUp\b` | `FORBIDDEN="Jonathan\|EcoUp\|Don Vicente\|Donvicente\|Kovvy\|LFpro\|LF[ -]Pro\|Clearify\|Passini\|Mybrows"` |
| 1373 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `FORBIDDEN="Jonathan\|EcoUp\|Don Vicente\|Donvicente\|Kovvy\|LFpro\|LF[ -]Pro\|Clearify\|Passini\|Mybrows"` |
| 1373 | critical | personal_client | `\b(kovvy\|Kovvy\|clearify\|Clearify)\b` | `FORBIDDEN="Jonathan\|EcoUp\|Don Vicente\|Donvicente\|Kovvy\|LFpro\|LF[ -]Pro\|Clearify\|Passini\|Mybrows"` |
| 1373 | critical | personal_client | `\b(kovvy\|Kovvy\|clearify\|Clearify)\b` | `FORBIDDEN="Jonathan\|EcoUp\|Don Vicente\|Donvicente\|Kovvy\|LFpro\|LF[ -]Pro\|Clearify\|Passini\|Mybrows"` |
| 1373 | critical | personal_client | `\b(don[\s-]?vicente)\b` | `FORBIDDEN="Jonathan\|EcoUp\|Don Vicente\|Donvicente\|Kovvy\|LFpro\|LF[ -]Pro\|Clearify\|Passini\|Mybrows"` |
| 1373 | critical | personal_client | `\b(don[\s-]?vicente)\b` | `FORBIDDEN="Jonathan\|EcoUp\|Don Vicente\|Donvicente\|Kovvy\|LFpro\|LF[ -]Pro\|Clearify\|Passini\|Mybrows"` |
| 1417 | critical | personal_name | `\bJonathan\b` | `<verify><automated>cd /home/projects/ForgeClaw && (for slug in solo-builder content-creator agency-freela ecom-manager generic; do for f in SOUL USER AGENTS TOOLS MEMORY STYLE HEARTBEAT; do test -s "p` |
| 1417 | critical | personal_company | `\bEcoUp\b` | `<verify><automated>cd /home/projects/ForgeClaw && (for slug in solo-builder content-creator agency-freela ecom-manager generic; do for f in SOUL USER AGENTS TOOLS MEMORY STYLE HEARTBEAT; do test -s "p` |
| 1417 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `<verify><automated>cd /home/projects/ForgeClaw && (for slug in solo-builder content-creator agency-freela ecom-manager generic; do for f in SOUL USER AGENTS TOOLS MEMORY STYLE HEARTBEAT; do test -s "p` |
| 1417 | critical | personal_client | `\b(kovvy\|Kovvy\|clearify\|Clearify)\b` | `<verify><automated>cd /home/projects/ForgeClaw && (for slug in solo-builder content-creator agency-freela ecom-manager generic; do for f in SOUL USER AGENTS TOOLS MEMORY STYLE HEARTBEAT; do test -s "p` |
| 1417 | critical | personal_client | `\b(kovvy\|Kovvy\|clearify\|Clearify)\b` | `<verify><automated>cd /home/projects/ForgeClaw && (for slug in solo-builder content-creator agency-freela ecom-manager generic; do for f in SOUL USER AGENTS TOOLS MEMORY STYLE HEARTBEAT; do test -s "p` |
| 1417 | critical | personal_client | `\b(don[\s-]?vicente)\b` | `<verify><automated>cd /home/projects/ForgeClaw && (for slug in solo-builder content-creator agency-freela ecom-manager generic; do for f in SOUL USER AGENTS TOOLS MEMORY STYLE HEARTBEAT; do test -s "p` |
| 1417 | critical | personal_client | `\b(don[\s-]?vicente)\b` | `<verify><automated>cd /home/projects/ForgeClaw && (for slug in solo-builder content-creator agency-freela ecom-manager generic; do for f in SOUL USER AGENTS TOOLS MEMORY STYLE HEARTBEAT; do test -s "p` |
| 1429 | critical | personal_name | `\bJonathan\b` | `- [ ] Nenhuma ocorrencia de dados pessoais (Jonathan, EcoUp, Don Vicente, Kovvy, LFpro, Clearify, Passini, Mybrows)` |
| 1429 | critical | personal_company | `\bEcoUp\b` | `- [ ] Nenhuma ocorrencia de dados pessoais (Jonathan, EcoUp, Don Vicente, Kovvy, LFpro, Clearify, Passini, Mybrows)` |
| 1429 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `- [ ] Nenhuma ocorrencia de dados pessoais (Jonathan, EcoUp, Don Vicente, Kovvy, LFpro, Clearify, Passini, Mybrows)` |
| 1429 | critical | personal_client | `\b(kovvy\|Kovvy\|clearify\|Clearify)\b` | `- [ ] Nenhuma ocorrencia de dados pessoais (Jonathan, EcoUp, Don Vicente, Kovvy, LFpro, Clearify, Passini, Mybrows)` |
| 1429 | critical | personal_client | `\b(kovvy\|Kovvy\|clearify\|Clearify)\b` | `- [ ] Nenhuma ocorrencia de dados pessoais (Jonathan, EcoUp, Don Vicente, Kovvy, LFpro, Clearify, Passini, Mybrows)` |
| 1429 | critical | personal_client | `\b(don[\s-]?vicente)\b` | `- [ ] Nenhuma ocorrencia de dados pessoais (Jonathan, EcoUp, Don Vicente, Kovvy, LFpro, Clearify, Passini, Mybrows)` |
| 338 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && for f in SOUL USER AGENTS TOOLS MEMORY STYLE HEARTBEAT; do test -s "packages/cli/src/templates/archetypes/solo-builder/$f.md" \|\| { echo "missing $f"; ` |
| 601 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && for f in SOUL USER AGENTS TOOLS MEMORY STYLE HEARTBEAT; do test -s "packages/cli/src/templates/archetypes/content-creator/$f.md" \|\| { echo "missing $f` |
| 739 | high | private_skill_dep | `\buazapi[-_]?(mcp)?\b` | `- **UazAPI / WhatsApp Business** — comunicacao com cliente.` |
| 867 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && for f in SOUL USER AGENTS TOOLS MEMORY STYLE HEARTBEAT; do test -s "packages/cli/src/templates/archetypes/agency-freela/$f.md" \|\| { echo "missing $f";` |
| 933 | high | private_skill_dep | `\buazapi[-_]?(mcp)?\b` | `- Atendimento: _WhatsApp (UazAPI/Evolution) / Instagram DM / chat_` |
| 1008 | high | private_skill_dep | `\buazapi[-_]?(mcp)?\b` | `- **UazAPI / Evolution API** — WhatsApp SAC.` |
| 1135 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && for f in SOUL USER AGENTS TOOLS MEMORY STYLE HEARTBEAT; do test -s "packages/cli/src/templates/archetypes/ecom-manager/$f.md" \|\| { echo "missing $f"; ` |
| 1349 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && for f in SOUL USER AGENTS TOOLS MEMORY STYLE HEARTBEAT; do test -s "packages/cli/src/templates/archetypes/generic/$f.md" \|\| { echo "missing $f"; exit ` |
| 1362 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw` |
| 1372 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw` |
| 1373 | high | personal_client | `\b(passini\|mybrows\|transplant\|enove)\b` | `FORBIDDEN="Jonathan\|EcoUp\|Don Vicente\|Donvicente\|Kovvy\|LFpro\|LF[ -]Pro\|Clearify\|Passini\|Mybrows"` |
| 1373 | high | personal_client | `\b(passini\|mybrows\|transplant\|enove)\b` | `FORBIDDEN="Jonathan\|EcoUp\|Don Vicente\|Donvicente\|Kovvy\|LFpro\|LF[ -]Pro\|Clearify\|Passini\|Mybrows"` |
| 1380 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw` |
| 1390 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw` |
| 1409 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw` |
| 1417 | high | personal_client | `\b(passini\|mybrows\|transplant\|enove)\b` | `<verify><automated>cd /home/projects/ForgeClaw && (for slug in solo-builder content-creator agency-freela ecom-manager generic; do for f in SOUL USER AGENTS TOOLS MEMORY STYLE HEARTBEAT; do test -s "p` |
| 1417 | high | personal_client | `\b(passini\|mybrows\|transplant\|enove)\b` | `<verify><automated>cd /home/projects/ForgeClaw && (for slug in solo-builder content-creator agency-freela ecom-manager generic; do for f in SOUL USER AGENTS TOOLS MEMORY STYLE HEARTBEAT; do test -s "p` |
| 1417 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && (for slug in solo-builder content-creator agency-freela ecom-manager generic; do for f in SOUL USER AGENTS TOOLS MEMORY STYLE HEARTBEAT; do test -s "p` |
| 1429 | high | personal_client | `\b(passini\|mybrows\|transplant\|enove)\b` | `- [ ] Nenhuma ocorrencia de dados pessoais (Jonathan, EcoUp, Don Vicente, Kovvy, LFpro, Clearify, Passini, Mybrows)` |
| 1429 | high | personal_client | `\b(passini\|mybrows\|transplant\|enove)\b` | `- [ ] Nenhuma ocorrencia de dados pessoais (Jonathan, EcoUp, Don Vicente, Kovvy, LFpro, Clearify, Passini, Mybrows)` |

### `.plano/fases/24-templates-por-arqu-tipo-cinco-perfis-solo-builder-criador-de-conte-do-ag-ncia-freela-gestor-e-commerce-gen-rico-com-harness-completo-gen-rico-por-arqu-tipo/24-03-PLAN.md` (17 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 172 | critical | personal_name | `\bJonathan\b` | `'Jonathan',` |
| 173 | critical | personal_company | `\bEcoUp\b` | `'EcoUp',` |
| 174 | critical | personal_client | `\b(don[\s-]?vicente)\b` | `'Don Vicente',` |
| 175 | critical | personal_client | `\b(don[\s-]?vicente)\b` | `'Donvicente',` |
| 176 | critical | personal_client | `\b(kovvy\|Kovvy\|clearify\|Clearify)\b` | `'Kovvy',` |
| 177 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `'LFpro',` |
| 178 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `'LF Pro',` |
| 180 | critical | personal_client | `\b(kovvy\|Kovvy\|clearify\|Clearify)\b` | `'Clearify',` |
| 70 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && node -e "const p=require('./packages/cli/package.json'); if(!p.scripts\|\|!p.scripts.test) process.exit(1); if(!/bun\s+test/.test(p.scripts.test)) proce` |
| 181 | high | personal_client | `\b(passini\|mybrows\|transplant\|enove)\b` | `'Passini',` |
| 182 | high | personal_client | `\b(passini\|mybrows\|transplant\|enove)\b` | `'Mybrows',` |
| 203 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/cli/tests/archetypes/loader.test.ts && bun test packages/cli/tests/archetypes/loader.test.ts 2>&1 \| tail -20 \| grep -E "\b(pass\|fail\|` |
| 307 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/cli/tests/archetypes/render.test.ts && bun test packages/cli/tests/archetypes/render.test.ts 2>&1 \| tail -10</automated></verify>` |
| 379 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw && bun test packages/cli/tests/archetypes/snapshot.test.ts` |
| 414 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/cli/tests/archetypes/snapshot.test.ts && test -d packages/cli/tests/archetypes/__snapshots__ && (bun test packages/cli/tests/archetyp` |
| 426 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw && bun test packages/cli/tests/archetypes/ 2>&1 \| tee /tmp/arch-tests.log` |
| 436 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && bun test packages/cli/tests/archetypes/ 2>&1 \| tee /tmp/arch-tests.log \| tail -20 && ! grep -iE "^[^0]+\s+fail\|\bfail\b[^:]*:\s+[1-9]" /tmp/arch-tests` |

### `.plano/fases/25-cli-installer-em-duas-fases-fase-t-cnica-valida-claude-code-cli-autenticado-e-credenciais-escolha-de-arqu-tipo-popula-harness-sobe-dashboard-em-modo-onboarding/25-01-PLAN.md` (12 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 161 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/cli/src/commands/install/types.ts && grep -q 'export interface InstallOptions' packages/cli/src/commands/install/types.ts && grep -q ` |
| 243 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/cli/src/commands/install/state.ts && grep -q 'export function readState' packages/cli/src/commands/install/state.ts && grep -q 'expor` |
| 495 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/cli/src/commands/install/phase-a-technical.ts && grep -q 'export async function runPhaseA' packages/cli/src/commands/install/phase-a-` |
| 733 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/cli/src/commands/install/phase-b-archetype.ts && grep -q 'export async function runPhaseB' packages/cli/src/commands/install/phase-b-` |
| 785 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/cli/src/commands/install/phase-c-handoff.ts && grep -q 'export async function runPhaseC' packages/cli/src/commands/install/phase-c-ha` |
| 880 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/cli/src/commands/install/index.ts && grep -q 'export async function install' packages/cli/src/commands/install/index.ts && grep -q 'r` |
| 904 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/cli/src/commands/install.ts && [ "$(wc -l < packages/cli/src/commands/install.ts)" -lt 20 ] && grep -q "export { install } from './in` |
| 1032 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -q "function parseFlags" packages/cli/src/index.ts && grep -q "'--resume'" packages/cli/src/index.ts && grep -q "'--archetype='" packages/cli/src` |
| 1043 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw && bun tsc --noEmit -p packages/cli/tsconfig.json 2>&1` |
| 1050 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw && bun run packages/cli/src/index.ts 2>&1 \| head -30` |
| 1056 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw && bun run packages/cli/src/index.ts install --archetype=xyz 2>&1 \| head -5` |
| 1062 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && (bun tsc --noEmit -p packages/cli/tsconfig.json 2>&1 \| grep -E "commands/install(\.ts\|/)" \| grep -v "Found 0 errors") ; EXIT_TYPE=$?; HELP_OUT=$(bun r` |

### `.plano/fases/25-cli-installer-em-duas-fases-fase-t-cnica-valida-claude-code-cli-autenticado-e-credenciais-escolha-de-arqu-tipo-popula-harness-sobe-dashboard-em-modo-onboarding/25-02-PLAN.md` (8 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 58 | critical | personal_name | `\bJonathan\b` | `1. **Como Claude Code CLI sinaliza nao-autenticado?** Quando o token OAuth expirou ou nunca foi feito login, 'claude --print "ping"' termina com stderr contendo '"You need to login"' ou '"Invalid API ` |
| 177 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/cli/src/commands/install/validators.ts && grep -q 'export function compareSemver' packages/cli/src/commands/install/validators.ts && ` |
| 319 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/cli/src/commands/install/diagnostics.ts && grep -q 'export const MIN_BUN_VERSION' packages/cli/src/commands/install/diagnostics.ts &&` |
| 452 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -q "import { checkBun, checkClaudeInstalled, checkClaudeAuth, MIN_BUN_VERSION } from './diagnostics'" packages/cli/src/commands/install/phase-a-t` |
| 565 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/cli/tests/install/validators.test.ts && bun test packages/cli/tests/install/validators.test.ts 2>&1 \| tee /tmp/val-test.log \| tail -1` |
| 629 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/cli/tests/install/diagnostics.test.ts && bun test packages/cli/tests/install/diagnostics.test.ts 2>&1 \| tee /tmp/diag-test.log \| tail` |
| 641 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw` |
| 662 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && (bun tsc --noEmit -p packages/cli/tsconfig.json 2>&1 \| grep -E "install/(diagnostics\|validators\|phase-a-technical)\.ts" \| grep -v "Found 0 errors"); E` |

### `.plano/fases/25-cli-installer-em-duas-fases-fase-t-cnica-valida-claude-code-cli-autenticado-e-credenciais-escolha-de-arqu-tipo-popula-harness-sobe-dashboard-em-modo-onboarding/25-03-PLAN.md` (8 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 120 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/cli/src/utils/open-url.ts && grep -q 'export async function openUrl' packages/cli/src/utils/open-url.ts && grep -q "xdg-open" package` |
| 237 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/cli/src/commands/install/dashboard-handoff.ts && grep -q 'export async function spawnDashboardIfNeeded' packages/cli/src/commands/ins` |
| 342 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -q "export async function runPhaseC" packages/cli/src/commands/install/phase-c-handoff.ts && grep -q "spawnDashboardIfNeeded" packages/cli/src/co` |
| 376 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/cli/tests/install/open-url.test.ts && bun test packages/cli/tests/install/open-url.test.ts 2>&1 \| tail -10 \| tee /tmp/openurl.log && ` |
| 387 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw && bun tsc --noEmit -p packages/cli/tsconfig.json 2>&1 \| grep -E "install/(phase-c-handoff\|dashboard-handoff)\.ts\|utils/open-url\.ts" \| grep -v "Found 0 errors"` |
| 395 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw && bun -e "import {buildOnboardingUrl} from './packages/cli/src/commands/install/dashboard-handoff'; const u = buildOnboardingUrl('abc 123+xyz'); if (!u.includes('/onboardi` |
| 400 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw && bun -e "import {waitForDashboardUp} from './packages/cli/src/commands/install/dashboard-handoff'; const r = await waitForDashboardUp(2000); if (r !== false) { console.er` |
| 406 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && (bun tsc --noEmit -p packages/cli/tsconfig.json 2>&1 \| grep -E "install/(phase-c-handoff\|dashboard-handoff)\.ts\|utils/open-url\.ts" \| grep -v "Found 0` |

### `.plano/fases/25-cli-installer-em-duas-fases-fase-t-cnica-valida-claude-code-cli-autenticado-e-credenciais-escolha-de-arqu-tipo-popula-harness-sobe-dashboard-em-modo-onboarding/25-04-PLAN.md` (7 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 93 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -q "FORGECLAW_SKIP_SERVICE === '1'" packages/cli/src/commands/install/phase-b-archetype.ts && grep -q "Skipping service setup" packages/cli/src/c` |
| 211 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/cli/tests/install/state.test.ts && bun test packages/cli/tests/install/state.test.ts 2>&1 \| tee /tmp/st.log \| tail -15 && ! grep -iE ` |
| 326 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/cli/tests/install/phase-b-integration.test.ts && FORGECLAW_SKIP_SERVICE=1 bun test packages/cli/tests/install/phase-b-integration.tes` |
| 431 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/cli/tests/install/e2e-contract.test.ts && FORGECLAW_SKIP_SERVICE=1 bun test packages/cli/tests/install/e2e-contract.test.ts --timeout` |
| 443 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw && FORGECLAW_SKIP_SERVICE=1 bun test packages/cli/tests/install/ 2>&1 \| tee /tmp/install-suite.log \| tail -40` |
| 455 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw && bun tsc --noEmit -p packages/cli/tsconfig.json 2>&1 \| grep -E "tests/install\|commands/install\|utils/open-url" \| grep -v "Found 0 errors"` |
| 460 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && FORGECLAW_SKIP_SERVICE=1 bun test packages/cli/tests/install/ --timeout 300000 2>&1 \| tee /tmp/install-suite.log \| tail -20 && ! grep -iE "\bfail\b[^:` |

### `.plano/fases/26-persona-entrevistador-forgeclaw-system-prompt-fixo-no-produto-com-roteiro-por-arqu-tipo-output-em-diff-estruturado-do-harness-bounded-em-turnos-e-tokens/26-01-PLAN.md` (8 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 312 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/core/src/onboarding/types.ts && grep -c 'export type HarnessFile' packages/core/src/onboarding/types.ts && grep -c 'InterviewResponse` |
| 460 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/core/src/onboarding/interviewer.md && grep -q 'ForgeClaw Interviewer' packages/core/src/onboarding/interviewer.md && grep -q 'Max 12 ` |
| 695 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/core/src/onboarding/prompts.ts && grep -c 'export function loadInterviewerPrompt' packages/core/src/onboarding/prompts.ts && grep -c ` |
| 752 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/core/src/onboarding/index.ts && grep -c 'loadInterviewerPrompt' packages/core/src/onboarding/index.ts && grep -c 'validateInterviewRe` |
| 878 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/core/src/onboarding/README.md && grep -q 'HarnessDiff' packages/core/src/onboarding/README.md && grep -q 'Budget' packages/core/src/o` |
| 897 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/core/src/index.ts && grep -c "export \* from './onboarding'" packages/core/src/index.ts && grep -c "export \* from './claude-runner'"` |
| 909 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw && bun tsc --noEmit -p packages/core/tsconfig.json 2>&1 \| tee /tmp/tc-core.log \| tail -30` |
| 918 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && bun tsc --noEmit -p packages/core/tsconfig.json 2>&1 \| tee /tmp/tc-core.log > /dev/null; ! grep -E "onboarding/(types\|prompts\|index)\.ts" /tmp/tc-core` |

### `.plano/fases/26-persona-entrevistador-forgeclaw-system-prompt-fixo-no-produto-com-roteiro-por-arqu-tipo-output-em-diff-estruturado-do-harness-bounded-em-turnos-e-tokens/26-02-PLAN.md` (7 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 157 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/core/src/onboarding/budget.ts && grep -c 'export function createBudgetTracker' packages/core/src/onboarding/budget.ts && grep -c 'inc` |
| 350 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/core/src/onboarding/merger.ts && grep -c 'export function applyDiff' packages/core/src/onboarding/merger.ts && grep -c 'export functi` |
| 660 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/core/src/onboarding/interviewer.ts && grep -c 'export class Interviewer' packages/core/src/onboarding/interviewer.ts && grep -c 'asyn` |
| 690 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -c "export { Interviewer } from './interviewer'" packages/core/src/onboarding/index.ts && grep -c "applyDiff" packages/core/src/onboarding/index.` |
| 702 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw && bun tsc --noEmit -p packages/core/tsconfig.json 2>&1 \| tee /tmp/tc-core-26-02.log \| tail -40` |
| 713 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && bun tsc --noEmit -p packages/core/tsconfig.json 2>&1 \| tee /tmp/tc-core-26-02.log > /dev/null; ! grep -E "onboarding/(interviewer\|merger\|budget\|index)` |
| 995 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/core/tests/onboarding/budget.test.ts && test -f packages/core/tests/onboarding/merger.test.ts && cd packages/core && (bun x vitest ru` |

### `.plano/fases/26-persona-entrevistador-forgeclaw-system-prompt-fixo-no-produto-com-roteiro-por-arqu-tipo-output-em-diff-estruturado-do-harness-bounded-em-turnos-e-tokens/26-03-PLAN.md` (8 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 122 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/core/src/onboarding/scripts/solo-builder.md && grep -q 'Roteiro: Solo Builder' packages/core/src/onboarding/scripts/solo-builder.md &` |
| 192 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/core/src/onboarding/scripts/content-creator.md && grep -q 'Roteiro: Criador de Conteudo' packages/core/src/onboarding/scripts/content` |
| 262 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/core/src/onboarding/scripts/agency-freela.md && grep -q 'Roteiro: Agencia' packages/core/src/onboarding/scripts/agency-freela.md && g` |
| 331 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/core/src/onboarding/scripts/ecom-manager.md && grep -q 'Roteiro: Gestor E-commerce' packages/core/src/onboarding/scripts/ecom-manager` |
| 379 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/core/src/onboarding/scripts/generic.md && grep -q 'Roteiro: Generico' packages/core/src/onboarding/scripts/generic.md && grep -q 'set` |
| 449 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/core/src/onboarding/scripts/README.md && grep -q 'ArchetypeSlug' packages/core/src/onboarding/scripts/README.md && grep -q 'VALID_PLA` |
| 461 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw` |
| 502 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && for slug in solo-builder content-creator agency-freela ecom-manager generic; do test -s "packages/core/src/onboarding/scripts/$slug.md" \|\| { echo "MIS` |

### `.plano/fases/26-persona-entrevistador-forgeclaw-system-prompt-fixo-no-produto-com-roteiro-por-arqu-tipo-output-em-diff-estruturado-do-harness-bounded-em-turnos-e-tokens/26-04-PLAN.md` (8 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 293 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/core/tests/onboarding/prompts.test.ts && cd packages/core && (bun x vitest run tests/onboarding/prompts.test.ts --reporter=basic 2>&1` |
| 415 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && for f in content-creator-happy solo-builder-budget-exceeded generic-abort malformed-response; do test -f "packages/core/tests/onboarding/fixtures/$f.j` |
| 680 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/core/tests/onboarding/interviewer.test.ts && cd packages/core && (bun x vitest run tests/onboarding/interviewer.test.ts --reporter=ba` |
| 692 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw/packages/core && (bun x vitest run tests/onboarding/ --reporter=default 2>&1 \|\| npx vitest run tests/onboarding/ --reporter=default 2>&1) \| tee /tmp/vitest-26-04-all.log` |
| 698 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- Erro de 'Cannot find module 'vitest'': a devDep ja deveria estar no package core (ver 'packages/core/tests/event-bus.test.ts'). Se nao estiver: 'cd /home/projects/ForgeClaw && bun add -D -F @forgecl` |
| 704 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw/packages/core && (bun x vitest run tests/onboarding/ --reporter=basic 2>&1 \|\| npx vitest run tests/onboarding/ --reporter=basic 2>&1) \| tee /tmp/vitest-2` |
| 714 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw && bun tsc --noEmit -p packages/core/tsconfig.json 2>&1 \| tee /tmp/tc-final.log \| tail -50` |
| 726 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && bun tsc --noEmit -p packages/core/tsconfig.json 2>&1 \| tee /tmp/tc-final.log > /dev/null; ONB_ERR=$(grep -E "onboarding/" /tmp/tc-final.log \| grep -cE` |

### `.plano/fases/27-dashboard-first-run-onboarding-rota-onboarding-com-chat-conversacional-esquerda-e-preview-ao-vivo-dos-arquivos-do-harness-direita-at-existir-sentinel-onboarded/27-01-PLAN.md` (10 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 206 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/dashboard/src/lib/onboarding-state.ts && grep -c 'export function isOnboarded' packages/dashboard/src/lib/onboarding-state.ts && grep` |
| 291 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/dashboard/src/proxy.ts && grep -q "import { isOnboarded } from \"@/lib/onboarding-state\"" packages/dashboard/src/proxy.ts && grep -q` |
| 339 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/dashboard/src/app/onboarding/layout.tsx && grep -q "from \"@/lib/onboarding-state\"" packages/dashboard/src/app/onboarding/layout.tsx` |
| 397 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/dashboard/src/app/onboarding/page.tsx && grep -q "readOnboardedMeta" packages/dashboard/src/app/onboarding/page.tsx && grep -q "expor` |
| 468 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/dashboard/src/app/api/onboarding/health/route.ts && grep -q "export async function GET" packages/dashboard/src/app/api/onboarding/hea` |
| 479 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw/packages/dashboard && bun tsc --noEmit 2>&1 \| tee /tmp/tc-dash-27-01.log \| tail -30` |
| 563 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw/packages/dashboard && bunx --bun vitest run src/lib/__tests__/onboarding-state.test.ts --reporter=basic 2>&1 \| tee /tmp/vitest-27-01.log \| tail -20` |
| 568 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `**Se vitest nao estiver instalado no workspace do dashboard:** usar 'cd /home/projects/ForgeClaw && bunx --bun vitest run packages/dashboard/src/lib/__tests__/onboarding-state.test.ts' (root tem vites` |
| 574 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw/packages/dashboard && bun tsc --noEmit 2>&1 \| tee /tmp/tc-dash-27-01.log > /dev/null; ! grep -E "(onboarding-state\|onboarding/layout\|onboarding/page\|onbo` |
| 574 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw/packages/dashboard && bun tsc --noEmit 2>&1 \| tee /tmp/tc-dash-27-01.log > /dev/null; ! grep -E "(onboarding-state\|onboarding/layout\|onboarding/page\|onbo` |

### `.plano/fases/27-dashboard-first-run-onboarding-rota-onboarding-com-chat-conversacional-esquerda-e-preview-ao-vivo-dos-arquivos-do-harness-direita-at-existir-sentinel-onboarded/27-02-PLAN.md` (10 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 195 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/dashboard/src/lib/onboarding-types.ts && grep -c "OnboardingSessionSnapshot" packages/dashboard/src/lib/onboarding-types.ts && grep -` |
| 505 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/dashboard/src/lib/onboarding-sessions.ts && grep -c "getStore" packages/dashboard/src/lib/onboarding-sessions.ts && grep -c "runStart` |
| 564 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/dashboard/src/app/api/onboarding/start/route.ts && grep -q "requireApiAuth" packages/dashboard/src/app/api/onboarding/start/route.ts ` |
| 670 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/dashboard/src/app/api/onboarding/message/route.ts && grep -q "runAnswer" packages/dashboard/src/app/api/onboarding/message/route.ts &` |
| 734 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/dashboard/src/app/api/onboarding/state/route.ts && test -f packages/dashboard/src/app/api/onboarding/preview/route.ts && grep -q "exp` |
| 846 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/dashboard/src/app/api/onboarding/approve/route.ts && test -f packages/dashboard/src/app/api/onboarding/skip/route.ts && grep -q "appl` |
| 857 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw/packages/dashboard && bun tsc --noEmit 2>&1 \| tee /tmp/tc-dash-27-02.log > /dev/null` |
| 864 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw && bun -e "` |
| 881 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw/packages/dashboard && bun tsc --noEmit 2>&1 \| tee /tmp/tc-dash-27-02.log > /dev/null; ! grep -E "(onboarding-(types\|sessions))\.ts\|onboarding/(start\|mess` |
| 881 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw/packages/dashboard && bun tsc --noEmit 2>&1 \| tee /tmp/tc-dash-27-02.log > /dev/null; ! grep -E "(onboarding-(types\|sessions))\.ts\|onboarding/(start\|mess` |

### `.plano/fases/27-dashboard-first-run-onboarding-rota-onboarding-com-chat-conversacional-esquerda-e-preview-ao-vivo-dos-arquivos-do-harness-direita-at-existir-sentinel-onboarded/27-03-PLAN.md` (10 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 314 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/dashboard/src/hooks/use-onboarding.ts && grep -q "export function useOnboarding" packages/dashboard/src/hooks/use-onboarding.ts && gr` |
| 444 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/dashboard/src/components/onboarding/DiffHighlight.tsx && grep -q "computeDiff" packages/dashboard/src/components/onboarding/DiffHighl` |
| 559 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/dashboard/src/components/onboarding/HarnessPreview.tsx && grep -q "export function HarnessPreview" packages/dashboard/src/components/` |
| 791 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/dashboard/src/components/onboarding/InterviewerChat.tsx && grep -q "export function InterviewerChat" packages/dashboard/src/component` |
| 936 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/dashboard/src/components/onboarding/ActionsBar.tsx && grep -q "export function ActionsBar" packages/dashboard/src/components/onboardi` |
| 1008 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/dashboard/src/components/onboarding/OnboardingLayout.tsx && grep -q "matchMedia" packages/dashboard/src/components/onboarding/Onboard` |
| 1142 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/dashboard/src/components/onboarding/OnboardingApp.tsx && grep -q "useOnboarding" packages/dashboard/src/components/onboarding/Onboard` |
| 1152 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw/packages/dashboard && bun tsc --noEmit 2>&1 \| tee /tmp/tc-dash-27-03.log > /dev/null` |
| 1161 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw/packages/dashboard && bun run build 2>&1 \| tee /tmp/build-27-03.log \| tail -40` |
| 1166 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw/packages/dashboard && bun tsc --noEmit 2>&1 \| tee /tmp/tc-dash-27-03.log > /dev/null; ! grep -E "(use-onboarding\|components/onboarding/\|app/onboarding/pa` |

### `.plano/fases/27-dashboard-first-run-onboarding-rota-onboarding-com-chat-conversacional-esquerda-e-preview-ao-vivo-dos-arquivos-do-harness-direita-at-existir-sentinel-onboarded/27-04-PLAN.md` (11 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 155 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/dashboard/src/lib/onboarding-persistence.ts && grep -q "export function saveSnapshot" packages/dashboard/src/lib/onboarding-persisten` |
| 232 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -q 'saveSnapshot' packages/dashboard/src/lib/onboarding-sessions.ts && grep -q 'loadSnapshot' packages/dashboard/src/lib/onboarding-sessions.ts &` |
| 348 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/dashboard/src/app/api/onboarding/pause/route.ts && test -f packages/dashboard/src/app/api/onboarding/resume/route.ts && grep -q "save` |
| 447 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/dashboard/src/components/onboarding/BudgetBar.tsx && grep -q "export function BudgetBar" packages/dashboard/src/components/onboarding` |
| 524 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -q "const pause = useCallback" packages/dashboard/src/hooks/use-onboarding.ts && grep -q "const resume = useCallback" packages/dashboard/src/hook` |
| 580 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -q 'import { BudgetBar }' packages/dashboard/src/components/onboarding/OnboardingApp.tsx && grep -q 'await pause()' packages/dashboard/src/compon` |
| 591 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw/packages/dashboard && bun tsc --noEmit 2>&1 \| tee /tmp/tc-dash-27-04.log > /dev/null` |
| 688 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw && bunx --bun vitest run packages/dashboard/src/lib/__tests__/onboarding-persistence.test.ts --reporter=basic 2>&1 \| tee /tmp/vitest-27-04.log \| tail -20` |
| 695 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw/packages/dashboard && bun run build 2>&1 \| tee /tmp/build-27-04.log \| tail -40` |
| 702 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw/packages/dashboard && bun tsc --noEmit 2>&1 \| tee /tmp/tc-dash-27-04.log > /dev/null; ! grep "error TS" /tmp/tc-dash-27-04.log \| grep -E "(onboarding-per` |
| 702 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw/packages/dashboard && bun tsc --noEmit 2>&1 \| tee /tmp/tc-dash-27-04.log > /dev/null; ! grep "error TS" /tmp/tc-dash-27-04.log \| grep -E "(onboarding-per` |

### `.plano/fases/27-dashboard-first-run-onboarding-rota-onboarding-com-chat-conversacional-esquerda-e-preview-ao-vivo-dos-arquivos-do-harness-direita-at-existir-sentinel-onboarded/27-05-PLAN.md` (11 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 468 | critical | personal_name | `\bJonathan\b` | `body: JSON.stringify({ text: "Jonathan" }),` |
| 482 | critical | personal_name | `\bJonathan\b` | `body: JSON.stringify({ text: "Jonathan" }),` |
| 89 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `Rodar 'cd /home/projects/ForgeClaw/packages/dashboard && bun install' para baixar as deps. Bun workspaces vai linkar com root se disponivel.` |
| 130 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/dashboard/vitest.config.ts && test -f packages/dashboard/src/test-setup.ts && grep -q '"test":' packages/dashboard/package.json && gr` |
| 188 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/dashboard/src/components/onboarding/__tests__/DiffHighlight.test.tsx && grep -q "renders all lines as unchanged" packages/dashboard/s` |
| 260 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/dashboard/src/components/onboarding/__tests__/HarnessPreview.test.tsx && cd packages/dashboard && bunx --bun vitest run src/component` |
| 333 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/dashboard/src/components/onboarding/__tests__/ActionsBar.test.tsx && cd packages/dashboard && bunx --bun vitest run src/components/on` |
| 528 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f packages/dashboard/src/lib/__tests__/onboarding-api.test.ts && cd packages/dashboard && bunx --bun vitest run src/lib/__tests__/onboarding-api` |
| 538 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw/packages/dashboard && bun run test 2>&1 \| tee /tmp/vitest-27-05-all.log \| tail -40` |
| 564 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `grep -A 2 '"exclude"' /home/projects/ForgeClaw/packages/dashboard/tsconfig.json` |
| 571 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw/packages/dashboard && bun run test 2>&1 \| tee /tmp/vitest-27-05-all.log \| tail -40 && ! grep -iE "(failed\|fail).*[1-9]" /tmp/vitest-27-05-all.log</automa` |

### `.plano/fases/28-comando-forgeclaw-refine-cli-command-que-reexecuta-a-entrevista-depois-do-install-pra-refinar-harness-sem-reinstalar-o-produto/28-01-PLAN.md` (6 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 138 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bun test packages/cli/test/refine-backup.test.ts -t "createBackup\|listBackups\|restoreBackup"</automated>` |
| 187 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bun test packages/cli/test/refine-diff.test.ts</automated>` |
| 247 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/cli && bun test packages/cli/test/refine-archetype.test.ts</automated>` |
| 371 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/cli</automated>` |
| 458 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/cli && bun packages/cli/src/index.ts refine --rollback 2>&1 \| grep -q "ForgeClaw Refine"</automated>` |
| 625 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bun test packages/cli/test/refine-backup.test.ts packages/cli/test/refine-diff.test.ts packages/cli/test/refine-archetype.test.ts</automated>` |

### `.plano/fases/28-comando-forgeclaw-refine-cli-command-que-reexecuta-a-entrevista-depois-do-install-pra-refinar-harness-sem-reinstalar-o-produto/28-02-PLAN.md` (6 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 141 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/cli</automated>` |
| 230 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/cli</automated>` |
| 306 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/dashboard</automated>` |
| 377 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/dashboard</automated>` |
| 417 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/core && bunx tsc --noEmit -p packages/cli && bunx tsc --noEmit -p packages/dashboard && bun test packages/cli/test/refine-backup` |
| 566 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/dashboard && curl -s -o /dev/null -w "%{http_code}" http://localhost:4040/refine?mode=default 2>/dev/null \|\| echo "dashboard not` |

### `.plano/fases/28-comando-forgeclaw-refine-cli-command-que-reexecuta-a-entrevista-depois-do-install-pra-refinar-harness-sem-reinstalar-o-produto/28-03-PLAN.md` (7 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 221 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/cli</automated>` |
| 324 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bun test packages/cli/test/refine-e2e.test.ts</automated>` |
| 395 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bun test packages/cli/test/refine-section.test.ts</automated>` |
| 506 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bun test packages/cli/test/refine-archetype-change.test.ts</automated>` |
| 596 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bun test packages/cli/test/refine-rollback.test.ts</automated>` |
| 718 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bun test packages/cli/test/refine-preserves-data.test.ts</automated>` |
| 744 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<automated>cd /home/projects/ForgeClaw && bun run --cwd packages/cli test:refine 2>&1 \| tail -5</automated>` |

### `.plano/fases/29-gate-de-acesso-pela-comunidade-v1-simples-com-repo-privado-e-invite-manual-no-github-ao-assinar-comunidade-documenta-o-de-fluxo-de-concess-o-e-revoga-o/29-01-PLAN.md` (60 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 11 | critical | personal_company | `\bEcoupdigital\b` | `- "Repositorio github.com/Ecoupdigital/forgeclaw esta com visibility PRIVATE"` |
| 11 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `- "Repositorio github.com/Ecoupdigital/forgeclaw esta com visibility PRIVATE"` |
| 39 | critical | personal_company | `\bEcoupdigital\b` | `**Objetivo:** Estabelecer a base legal e estrutural do gate: tornar o repositorio 'github.com/Ecoupdigital/forgeclaw' privado, adicionar uma licenca source-available com restricao de redistribuicao e ` |
| 39 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `**Objetivo:** Estabelecer a base legal e estrutural do gate: tornar o repositorio 'github.com/Ecoupdigital/forgeclaw' privado, adicionar uma licenca source-available com restricao de redistribuicao e ` |
| 43 | critical | personal_company | `\bEcoupdigital\b` | `- Repo HOJE e PUBLICO: 'curl https://api.github.com/repos/Ecoupdigital/forgeclaw' retorna '"private": false', '"visibility": "public"', '"license": null'.` |
| 48 | critical | personal_company | `\bEcoupdigital\b` | `- GitHub PAT disponivel em '~/.claude/projects/-home-vault/memory/reference_github_token_ecoup.md' (org Ecoupdigital).` |
| 67 | critical | personal_name | `\bJonathan\s+Renan\b` | `- Manter direitos autorais com EcoUp Digital (CNPJ 37.283.718/0001-42) / Jonathan Renan Outeiro` |
| 67 | critical | personal_name | `\bJonathan\b` | `- Manter direitos autorais com EcoUp Digital (CNPJ 37.283.718/0001-42) / Jonathan Renan Outeiro` |
| 67 | critical | personal_company | `\bEcoUp\b` | `- Manter direitos autorais com EcoUp Digital (CNPJ 37.283.718/0001-42) / Jonathan Renan Outeiro` |
| 74 | critical | personal_company | `\bEcoUp\b` | `Copyright (c) 2026 EcoUp Digital (CNPJ 37.283.718/0001-42)` |
| 75 | critical | personal_name | `\bJonathan\s+Renan\b` | `Jonathan Renan Outeiro <jonathan.outeiro@gmail.com>` |
| 75 | critical | personal_name | `\bJonathan\b` | `Jonathan Renan Outeiro <jonathan.outeiro@gmail.com>` |
| 101 | critical | personal_company | `\bEcoUp\b` | `5. Use the name "ForgeClaw", "EcoUp Digital", or "Dominando AutoIA" to` |
| 130 | critical | personal_company | `\bEcoUp\b` | `<verify><automated>test -f /home/projects/ForgeClaw/LICENSE && grep -q "ForgeClaw Community Source License v1.0" /home/projects/ForgeClaw/LICENSE && grep -q "Dominando AutoIA" /home/projects/ForgeClaw` |
| 131 | critical | personal_company | `\bEcoUp\b` | `<done>Arquivo /home/projects/ForgeClaw/LICENSE existe com cabecalho correto, nao e MIT, contem restricoes de redistribuicao e revenda, contempla EcoUp Digital como detentor.</done>` |
| 185 | critical | personal_company | `\bEcoupdigital\b` | `git clone https://github.com/Ecoupdigital/forgeclaw.git` |
| 185 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `git clone https://github.com/Ecoupdigital/forgeclaw.git` |
| 207 | critical | personal_company | `\bEcoUp\b` | `Copyright (c) 2026 EcoUp Digital. Todos os direitos reservados.` |
| 232 | critical | personal_company | `\bEcoupdigital\b` | `3. Em ate 48h, voce sera adicionado como collaborator (read-only) ao repositorio privado [Ecoupdigital/forgeclaw](https://github.com/Ecoupdigital/forgeclaw).` |
| 232 | critical | personal_company | `\bEcoupdigital\b` | `3. Em ate 48h, voce sera adicionado como collaborator (read-only) ao repositorio privado [Ecoupdigital/forgeclaw](https://github.com/Ecoupdigital/forgeclaw).` |
| 232 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `3. Em ate 48h, voce sera adicionado como collaborator (read-only) ao repositorio privado [Ecoupdigital/forgeclaw](https://github.com/Ecoupdigital/forgeclaw).` |
| 260 | critical | personal_name | `\bJonathan\b` | `- Duvidas sobre acesso: abra um tiquete na comunidade ou fale com Jonathan.` |
| 272 | critical | personal_company | `\bEcoupdigital\b` | `<files>github.com/Ecoupdigital/forgeclaw (repo settings)</files>` |
| 272 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `<files>github.com/Ecoupdigital/forgeclaw (repo settings)</files>` |
| 284 | critical | personal_company | `\bEcoupdigital\b` | `- [ ] Executar 'curl -s https://api.github.com/repos/Ecoupdigital/forgeclaw \| grep -E '"private"\|"visibility"'' e confirmar '"private": true, "visibility": "private"'.` |
| 285 | critical | personal_company | `\bEcoupdigital\b` | `- [ ] Acessar 'https://github.com/Ecoupdigital/forgeclaw' sem login (browser anonimo ou curl sem token) e confirmar que retorna 404.` |
| 285 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `- [ ] Acessar 'https://github.com/Ecoupdigital/forgeclaw' sem login (browser anonimo ou curl sem token) e confirmar que retorna 404.` |
| 293 | critical | personal_company | `\bEcoupdigital\b` | `https://api.github.com/repos/Ecoupdigital/forgeclaw \` |
| 301 | critical | personal_company | `\bEcoupdigital\b` | `<verify><automated>curl -s https://api.github.com/repos/Ecoupdigital/forgeclaw \| node -e "let s=''; process.stdin.on('data',d=>s+=d).on('end',()=>{const r=JSON.parse(s); if(r.private!==true \|\| r.visib` |
| 302 | critical | personal_company | `\bEcoupdigital\b` | `<done>Repo github.com/Ecoupdigital/forgeclaw retorna 'private: true' na API e acesso anonimo retorna 404.</done>` |
| 302 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `<done>Repo github.com/Ecoupdigital/forgeclaw retorna 'private: true' na API e acesso anonimo retorna 404.</done>` |
| 313 | critical | personal_company | `\bEcoupdigital\b` | `- [ ] 'curl https://api.github.com/repos/Ecoupdigital/forgeclaw' retorna '"private": true, "visibility": "private"'` |
| 17 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- path: "/home/projects/ForgeClaw/LICENSE"` |
| 19 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- path: "/home/projects/ForgeClaw/package.json"` |
| 21 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- path: "/home/projects/ForgeClaw/README.md"` |
| 23 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- path: "/home/projects/ForgeClaw/ACCESS.md"` |
| 44 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- Nao existe arquivo 'LICENSE' em '/home/projects/ForgeClaw/'.` |
| 52 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/README.md — README atual (299 linhas), secao License na linha 296-298, Quick Start linhas 41-51` |
| 53 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/package.json — package.json raiz, tem '"private": true' mas falta campo 'license'` |
| 54 | high | hardcoded_path | `\/home\/projects\/(?!ForgeClaw\b)[A-Za-z0-9_-]+` | `@/home/projects/comunidade-dominandoautoia/supabase/functions/asaas-webhook/index.ts — referencia de como a comunidade hoje processa enrollment (contexto pra decidir tom do ACCESS.md)` |
| 59 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/LICENSE</files>` |
| 130 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/LICENSE && grep -q "ForgeClaw Community Source License v1.0" /home/projects/ForgeClaw/LICENSE && grep -q "Dominando AutoIA" /home/projects/ForgeClaw` |
| 130 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/LICENSE && grep -q "ForgeClaw Community Source License v1.0" /home/projects/ForgeClaw/LICENSE && grep -q "Dominando AutoIA" /home/projects/ForgeClaw` |
| 130 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/LICENSE && grep -q "ForgeClaw Community Source License v1.0" /home/projects/ForgeClaw/LICENSE && grep -q "Dominando AutoIA" /home/projects/ForgeClaw` |
| 130 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/LICENSE && grep -q "ForgeClaw Community Source License v1.0" /home/projects/ForgeClaw/LICENSE && grep -q "Dominando AutoIA" /home/projects/ForgeClaw` |
| 130 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/LICENSE && grep -q "ForgeClaw Community Source License v1.0" /home/projects/ForgeClaw/LICENSE && grep -q "Dominando AutoIA" /home/projects/ForgeClaw` |
| 131 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<done>Arquivo /home/projects/ForgeClaw/LICENSE existe com cabecalho correto, nao e MIT, contem restricoes de redistribuicao e revenda, contempla EcoUp Digital como detentor.</done>` |
| 135 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/package.json</files>` |
| 159 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `Tambem replicar o mesmo campo '"license": "SEE LICENSE IN LICENSE"' em '/home/projects/ForgeClaw/packages/cli/package.json' (hoje tem '"name": "forgeclaw", "version": "0.1.0"' sem license). Adicionar ` |
| 163 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && node -e "const p = require('./package.json'); if (p.license !== 'SEE LICENSE IN LICENSE') { console.error('root license missing:', p.license); process` |
| 168 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/README.md</files>` |
| 212 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && ! grep -q "^MIT$" README.md && grep -q "ForgeClaw Community Source License" README.md && grep -q "ACCESS.md" README.md && grep -q "Dominando AutoIA" R` |
| 217 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/ACCESS.md</files>` |
| 267 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/ACCESS.md && grep -q "ForgeClaw" /home/projects/ForgeClaw/ACCESS.md && grep -q "Dominando AutoIA" /home/projects/ForgeClaw/ACCESS.md && grep -q "col` |
| 267 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/ACCESS.md && grep -q "ForgeClaw" /home/projects/ForgeClaw/ACCESS.md && grep -q "Dominando AutoIA" /home/projects/ForgeClaw/ACCESS.md && grep -q "col` |
| 267 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/ACCESS.md && grep -q "ForgeClaw" /home/projects/ForgeClaw/ACCESS.md && grep -q "Dominando AutoIA" /home/projects/ForgeClaw/ACCESS.md && grep -q "col` |
| 267 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/ACCESS.md && grep -q "ForgeClaw" /home/projects/ForgeClaw/ACCESS.md && grep -q "Dominando AutoIA" /home/projects/ForgeClaw/ACCESS.md && grep -q "col` |
| 267 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/ACCESS.md && grep -q "ForgeClaw" /home/projects/ForgeClaw/ACCESS.md && grep -q "Dominando AutoIA" /home/projects/ForgeClaw/ACCESS.md && grep -q "col` |
| 280 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- [ ] Confirmar que nao ha secrets commitados no historico (rodar 'gitleaks detect --source /home/projects/ForgeClaw --no-git' se quiser, opcional).` |
| 307 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- [ ] '/home/projects/ForgeClaw/LICENSE' existe com texto "ForgeClaw Community Source License v1.0"` |

### `.plano/fases/29-gate-de-acesso-pela-comunidade-v1-simples-com-repo-privado-e-invite-manual-no-github-ao-assinar-comunidade-documenta-o-de-fluxo-de-concess-o-e-revoga-o/29-02-PLAN.md` (51 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 12 | critical | personal_company | `\bEcoupdigital\b` | `- "Subcomando grant adiciona collaborator ao repo Ecoupdigital/forgeclaw com permission=pull"` |
| 44 | critical | personal_name | `\bJonathan\b` | `**Objetivo:** Criar um script CLI em Bun/TypeScript que automatiza o fluxo manual de Jonathan conceder e revogar acesso ao repo privado 'Ecoupdigital/forgeclaw' para membros da comunidade Dominando Au` |
| 44 | critical | personal_name | `\bJonathan\b` | `**Objetivo:** Criar um script CLI em Bun/TypeScript que automatiza o fluxo manual de Jonathan conceder e revogar acesso ao repo privado 'Ecoupdigital/forgeclaw' para membros da comunidade Dominando Au` |
| 44 | critical | personal_company | `\bEcoupdigital\b` | `**Objetivo:** Criar um script CLI em Bun/TypeScript que automatiza o fluxo manual de Jonathan conceder e revogar acesso ao repo privado 'Ecoupdigital/forgeclaw' para membros da comunidade Dominando Au` |
| 72 | critical | personal_company | `\bEcoupdigital\b` | `# GitHub PAT com escopo 'repo' (ou fine-grained scopado a Ecoupdigital/forgeclaw com` |
| 76 | critical | personal_company | `\bEcoupdigital\b` | `# Owner/repo do ForgeClaw. Default: Ecoupdigital/forgeclaw.` |
| 77 | critical | personal_company | `\bEcoupdigital\b` | `REPO_OWNER=Ecoupdigital` |
| 113 | critical | personal_company | `\bEcoupdigital\b` | `* CLI para conceder/revogar acesso ao repo privado Ecoupdigital/forgeclaw` |
| 176 | critical | personal_company | `\bEcoupdigital\b` | `const owner = env.REPO_OWNER \|\| 'Ecoupdigital';` |
| 391 | critical | personal_company | `\bEcoupdigital\b` | `REPO_OWNER       default: Ecoupdigital` |
| 457 | critical | personal_company | `\bEcoupdigital\b` | `Script CLI que gerencia acesso ao repositorio privado 'Ecoupdigital/forgeclaw' para membros da comunidade Dominando AutoIA.` |
| 459 | critical | personal_name | `\bJonathan\b` | `**Fluxo atual (v1 manual):** Jonathan roda este script quando alguem assina ou cancela a comunidade. V2 sera automatizado via webhook da plataforma.` |
| 463 | critical | personal_company | `\bEcoupdigital\b` | `1. Criar um GitHub PAT com escopo 'repo' (classic) ou fine-grained PAT scopado a 'Ecoupdigital/forgeclaw' com permissoes:` |
| 495 | critical | personal_company | `\bEcoupdigital\b` | `- Chama 'PUT /repos/Ecoupdigital/forgeclaw/collaborators/<username>' com 'permission=pull'.` |
| 509 | critical | personal_company | `\bEcoupdigital\b` | `- Chama 'DELETE /repos/Ecoupdigital/forgeclaw/collaborators/<username>'.` |
| 570 | critical | personal_name | `\bJonathan\b` | `- Nao e automatico — depende de Jonathan rodar manualmente.` |
| 670 | critical | personal_name | `\bJonathan\b` | `Smoke test manual com credencial real. Jonathan executa uma vez pra validar que o fluxo fim-a-fim funciona.` |
| 682 | critical | personal_name | `\bJonathan\b` | `Esperado: imprime ao menos o proprio Jonathan como owner/admin (ou pode imprimir lista vazia se ele e member via org).` |
| 684 | critical | personal_name | `\bJonathan\b` | `2. Conceder acesso a uma conta de teste (idealmente uma conta secundaria do Jonathan, ex: 'jonathanrenan-test' — se nao existir, usar qualquer conta GitHub que ele controle):` |
| 20 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- path: "/home/projects/ForgeClaw/ops/gate/access.ts"` |
| 22 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- path: "/home/projects/ForgeClaw/ops/gate/access-log.jsonl"` |
| 24 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- path: "/home/projects/ForgeClaw/ops/gate/README-GATE.md"` |
| 26 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- path: "/home/projects/ForgeClaw/ops/gate/gate.env.example"` |
| 28 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- path: "/home/projects/ForgeClaw/ops/gate/members.jsonl"` |
| 48 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/ops/ — pasta existente com 'forgeclaw.service', 'forgeclaw-dashboard.service'. Nova subpasta 'ops/gate/' sera criada aqui.` |
| 49 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/package.json — monorepo Bun. Usar 'bun' como runtime (ja no engines: bun >=1.1.0).` |
| 50 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/packages/cli/src/commands/install.ts — referencia de estilo: '@clack/prompts' para UX (mas para este script e simpler, sem prompts interativos por default — aceita args posic` |
| 62 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/ops/gate/gate.env.example</files>` |
| 85 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `Tambem criar/atualizar '/home/projects/ForgeClaw/.gitignore' adicionando as linhas (se ainda nao existem):` |
| 97 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/ops/gate/gate.env.example && grep -q GITHUB_TOKEN /home/projects/ForgeClaw/ops/gate/gate.env.example && grep -q REPO_OWNER /home/projects/ForgeClaw/` |
| 97 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/ops/gate/gate.env.example && grep -q GITHUB_TOKEN /home/projects/ForgeClaw/ops/gate/gate.env.example && grep -q REPO_OWNER /home/projects/ForgeClaw/` |
| 97 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/ops/gate/gate.env.example && grep -q GITHUB_TOKEN /home/projects/ForgeClaw/ops/gate/gate.env.example && grep -q REPO_OWNER /home/projects/ForgeClaw/` |
| 97 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/ops/gate/gate.env.example && grep -q GITHUB_TOKEN /home/projects/ForgeClaw/ops/gate/gate.env.example && grep -q REPO_OWNER /home/projects/ForgeClaw/` |
| 97 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/ops/gate/gate.env.example && grep -q GITHUB_TOKEN /home/projects/ForgeClaw/ops/gate/gate.env.example && grep -q REPO_OWNER /home/projects/ForgeClaw/` |
| 102 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/ops/gate/access.ts</files>` |
| 435 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `chmod +x /home/projects/ForgeClaw/ops/gate/access.ts` |
| 445 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/ops/gate/access.ts && test -x /home/projects/ForgeClaw/ops/gate/access.ts && cd /home/projects/ForgeClaw && bun run ops/gate/access.ts --help 2>&1 \|` |
| 445 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/ops/gate/access.ts && test -x /home/projects/ForgeClaw/ops/gate/access.ts && cd /home/projects/ForgeClaw && bun run ops/gate/access.ts --help 2>&1 \|` |
| 445 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/ops/gate/access.ts && test -x /home/projects/ForgeClaw/ops/gate/access.ts && cd /home/projects/ForgeClaw && bun run ops/gate/access.ts --help 2>&1 \|` |
| 450 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/ops/gate/README-GATE.md</files>` |
| 582 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/ops/gate/README-GATE.md && grep -q "ForgeClaw Access Gate v1" /home/projects/ForgeClaw/ops/gate/README-GATE.md && grep -q "grant" /home/projects/For` |
| 582 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/ops/gate/README-GATE.md && grep -q "ForgeClaw Access Gate v1" /home/projects/ForgeClaw/ops/gate/README-GATE.md && grep -q "grant" /home/projects/For` |
| 582 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/ops/gate/README-GATE.md && grep -q "ForgeClaw Access Gate v1" /home/projects/ForgeClaw/ops/gate/README-GATE.md && grep -q "grant" /home/projects/For` |
| 582 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/ops/gate/README-GATE.md && grep -q "ForgeClaw Access Gate v1" /home/projects/ForgeClaw/ops/gate/README-GATE.md && grep -q "grant" /home/projects/For` |
| 582 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/ops/gate/README-GATE.md && grep -q "ForgeClaw Access Gate v1" /home/projects/ForgeClaw/ops/gate/README-GATE.md && grep -q "grant" /home/projects/For` |
| 587 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/ops/gate/access.test.ts</files>` |
| 654 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `Atualizar '/home/projects/ForgeClaw/vitest.config.ts' se necessario para incluir 'ops/gate/**/*.test.ts'. Se o config atual ja globa todos os '*.test.ts', nao tocar.` |
| 658 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw && bunx vitest run ops/gate/access.test.ts` |
| 663 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && bunx vitest run ops/gate/access.test.ts 2>&1 \| tee /tmp/gatetest.log \| grep -E "(4 passed\|Tests  4 passed)" \|\| (cat /tmp/gatetest.log && exit 1)</auto` |
| 680 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw && bun run ops/gate/access.ts list` |
| 724 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f ops/gate/access-log.jsonl && wc -l ops/gate/access-log.jsonl \| awk '{if ($1 < 3) { print "audit log muito curto, smoke test nao rodado"; exit ` |

### `.plano/fases/29-gate-de-acesso-pela-comunidade-v1-simples-com-repo-privado-e-invite-manual-no-github-ao-assinar-comunidade-documenta-o-de-fluxo-de-concess-o-e-revoga-o/29-03-PLAN.md` (32 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 64 | critical | personal_name | `\bJonathan\b` | `V1 exige Jonathan rodar 'bun run ops/gate/access.ts grant' manualmente toda vez que alguem assina, e 'revoke' toda vez que alguem cancela. Funciona ate ~10-20 membros. Acima disso, vai haver:` |
| 77 | critical | personal_name | `\bJonathan\b` | `4. Gate API notifica Jonathan via Telegram bot em caso de erro (ForgeClaw proprio ja tem bot, reusar).` |
| 98 | critical | personal_name | `\bJonathan\b` | `- Env: 'GITHUB_TOKEN', 'HMAC_SECRET', 'TELEGRAM_BOT_TOKEN' (pra notificar Jonathan), 'SQLITE_PATH'.` |
| 191 | critical | personal_name | `\bJonathan\b` | `Funcao 'fireGateHook' faz fetch POST com HMAC. Em caso de erro, NAO bloquear o webhook principal — emitir um alert pra Jonathan via Telegram.` |
| 212 | critical | personal_name | `\bJonathan\b` | `- [ ] Jonathan passa mais de 30min/mes rodando o script manual` |
| 249 | critical | personal_company | `\bEcoupdigital\b` | `- [ ] GATE-01: Repositorio 'Ecoupdigital/forgeclaw' com visibility=private no GitHub` |
| 306 | critical | personal_company | `\bEcoupdigital\b` | `1. Repo github.com/Ecoupdigital/forgeclaw com visibility=private confirmado via API` |
| 306 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `1. Repo github.com/Ecoupdigital/forgeclaw com visibility=private confirmado via API` |
| 335 | critical | personal_name | `\bJonathan\b` | `- 'V2-ROADMAP.md' intencionalmente assume plataforma propria da comunidade (React+Vite+Supabase). Se Jonathan migrar pra Kiwify/Eduzz/Hotmart, esse doc precisa ser revisado — mas isso e decisao futura` |
| 18 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- path: "/home/projects/ForgeClaw/ops/gate/V2-ROADMAP.md"` |
| 20 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- path: "/home/projects/ForgeClaw/.plano/REQUIREMENTS.md"` |
| 22 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- path: "/home/projects/ForgeClaw/.plano/ROADMAP.md"` |
| 44 | high | hardcoded_path | `\/home\/projects\/(?!ForgeClaw\b)[A-Za-z0-9_-]+` | `@/home/projects/comunidade-dominandoautoia/supabase/functions/asaas-webhook/index.ts — webhook que a plataforma ja recebe do Asaas. Trata 'PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', etc.` |
| 45 | high | hardcoded_path | `\/home\/projects\/(?!ForgeClaw\b)[A-Za-z0-9_-]+` | `@/home/projects/comunidade-dominandoautoia/supabase/functions/webhook-enrollment/ — webhook interno de enrollment (ja existe).` |
| 46 | high | hardcoded_path | `\/home\/projects\/(?!ForgeClaw\b)[A-Za-z0-9_-]+` | `@/home/projects/comunidade-dominandoautoia/supabase/functions/api-manage-enrollment/ — edge function de gestao de matricula.` |
| 47 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/.plano/REQUIREMENTS.md — requisitos rastreaveis da fase 29 ainda nao existem.` |
| 48 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/.plano/ROADMAP.md — linhas 309-314 (Fase 29) estao com "A ser planejado".` |
| 53 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/ops/gate/V2-ROADMAP.md</files>` |
| 83 | high | personal_company | `\becoup\.digital\b` | `- Domain: 'forgeclaw-gate.ecoup.digital'.` |
| 97 | high | personal_company | `\becoup\.digital\b` | `- Subdomain: 'forgeclaw-gate.ecoup.digital'.` |
| 202 | high | hardcoded_path | `\/home\/projects\/(?!ForgeClaw\b)[A-Za-z0-9_-]+` | `- **Qual plataforma da comunidade?** Hoje e projeto proprio (React+Vite+Supabase em '/home/projects/comunidade-dominandoautoia'). Se migrar pra Kiwify/Eduzz/Hotmart no futuro, o webhook muda — redesen` |
| 205 | high | personal_company | `\becoup\.digital\b` | `- **License key no CLI (bonus v2.5)?** 'forgeclaw update' no CLI chama 'https://forgeclaw-gate.ecoup.digital/validate?key=xxx' e aborta update se invalida. Protege mirror npm publico caso seja criado.` |
| 236 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/ops/gate/V2-ROADMAP.md && grep -q "Arquitetura proposta" /home/projects/ForgeClaw/ops/gate/V2-ROADMAP.md && grep -q "Contratos de API" /home/project` |
| 236 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/ops/gate/V2-ROADMAP.md && grep -q "Arquitetura proposta" /home/projects/ForgeClaw/ops/gate/V2-ROADMAP.md && grep -q "Contratos de API" /home/project` |
| 236 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/ops/gate/V2-ROADMAP.md && grep -q "Arquitetura proposta" /home/projects/ForgeClaw/ops/gate/V2-ROADMAP.md && grep -q "Contratos de API" /home/project` |
| 236 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/ops/gate/V2-ROADMAP.md && grep -q "Arquitetura proposta" /home/projects/ForgeClaw/ops/gate/V2-ROADMAP.md && grep -q "Contratos de API" /home/project` |
| 236 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/ops/gate/V2-ROADMAP.md && grep -q "Arquitetura proposta" /home/projects/ForgeClaw/ops/gate/V2-ROADMAP.md && grep -q "Contratos de API" /home/project` |
| 236 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/ops/gate/V2-ROADMAP.md && grep -q "Arquitetura proposta" /home/projects/ForgeClaw/ops/gate/V2-ROADMAP.md && grep -q "Contratos de API" /home/project` |
| 241 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/.plano/REQUIREMENTS.md</files>` |
| 276 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -q "## Gate de Acesso (GATE)" .plano/REQUIREMENTS.md && test $(grep -c "^- \[ \] GATE-" .plano/REQUIREMENTS.md) -eq 9 && test $(grep -c "\| GATE-0` |
| 281 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/.plano/ROADMAP.md</files>` |
| 318 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && grep -A 3 "### Fase 29:" .plano/ROADMAP.md \| grep -q "GATE-01" && grep -A 15 "### Fase 29:" .plano/ROADMAP.md \| grep -q "3 planos" && ! awk '/### Fase` |

### `.plano/fases/30-docs-e-distribui-o-reescrever-readme-como-guia-de-boas-vindas-ao-membro-quick-reference-das-nove-abas-do-dashboard-roteiro-de-v-deo-walkthrough-de-install-em-cinco-minutos/30-01-PLAN.md` (37 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 96 | critical | personal_company | `\bEcoupdigital\b` | `git clone https://github.com/Ecoupdigital/forgeclaw.git` |
| 96 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `git clone https://github.com/Ecoupdigital/forgeclaw.git` |
| 180 | critical | personal_name | `\bJonathan\s+Renan\b` | `_ForgeClaw e um produto exclusivo da [comunidade Dominando AutoIA](https://comunidadeautomiaia.com.br). Construido por [Jonathan Renan](https://instagram.com/jonathanrenan.ia) / EcoUp Digital._` |
| 180 | critical | personal_name | `\bJonathan\b` | `_ForgeClaw e um produto exclusivo da [comunidade Dominando AutoIA](https://comunidadeautomiaia.com.br). Construido por [Jonathan Renan](https://instagram.com/jonathanrenan.ia) / EcoUp Digital._` |
| 180 | critical | personal_company | `\bEcoUp\b` | `_ForgeClaw e um produto exclusivo da [comunidade Dominando AutoIA](https://comunidadeautomiaia.com.br). Construido por [Jonathan Renan](https://instagram.com/jonathanrenan.ia) / EcoUp Digital._` |
| 185 | critical | personal_name | `\bJonathan\b` | `- NAO usar emoji (salvo se o Jonathan ja tem em README existente — nao tem, entao zero)` |
| 189 | critical | personal_company | `\bEcoUp\b` | `- NAO inventar URLs: usar 'https://comunidadeautomiaia.com.br' como placeholder oficial da comunidade (alinhado com outros produtos EcoUp)` |
| 207 | critical | personal_name | `\bJonathan\b` | `Mudanca grande: ForgeClaw deixa de ser uso pessoal do Jonathan e vira produto distribuido pra comunidade Dominando AutoIA.` |
| 243 | critical | personal_company | `\bEcoupdigital\b` | `- Visibilidade do repo 'github.com/Ecoupdigital/forgeclaw': de public para private` |
| 243 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `- Visibilidade do repo 'github.com/Ecoupdigital/forgeclaw': de public para private` |
| 248 | critical | personal_name | `\bJonathan\b` | `- Contexto pessoal do Jonathan que vazava em: harness prompts, mock-data do dashboard, daily-log paths hardcoded, sessoes do .playwright-mcp, unit files do ops/ — todos substituidos por placeholders g` |
| 366 | critical | personal_name | `\bJonathan\s+Renan\b` | `Jonathan Renan Outeiro, fundador da [EcoUp Digital](https://ecoup.digital). Builder solitario, ensina IA aplicada em [@jonathanrenan.ia](https://instagram.com/jonathanrenan.ia).` |
| 366 | critical | personal_name | `\bJonathan\b` | `Jonathan Renan Outeiro, fundador da [EcoUp Digital](https://ecoup.digital). Builder solitario, ensina IA aplicada em [@jonathanrenan.ia](https://instagram.com/jonathanrenan.ia).` |
| 366 | critical | personal_company | `\bEcoUp\b` | `Jonathan Renan Outeiro, fundador da [EcoUp Digital](https://ecoup.digital). Builder solitario, ensina IA aplicada em [@jonathanrenan.ia](https://instagram.com/jonathanrenan.ia).` |
| 10 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- /home/projects/ForgeClaw/README.md` |
| 11 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- /home/projects/ForgeClaw/CHANGELOG.md` |
| 12 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- /home/projects/ForgeClaw/docs/landing.md` |
| 24 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- path: "/home/projects/ForgeClaw/README.md"` |
| 26 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- path: "/home/projects/ForgeClaw/CHANGELOG.md"` |
| 28 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- path: "/home/projects/ForgeClaw/docs/landing.md"` |
| 54 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/README.md — README atual (ver linhas 1-299). Reescreve-se por cima. Conservar secao License (Fase 29 ja atualizou).` |
| 55 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/CHANGELOG.md — tem apenas entrada [0.1.0] - 2026-04-09. Adiciona-se [0.2.0] - 2026-04-21 acima.` |
| 56 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/ACCESS.md — criado pela Fase 29 (fluxo de acesso via comunidade).` |
| 57 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/LICENSE — ForgeClaw Community Source License v1.0 (Fase 29).` |
| 58 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/.plano/fases/24-templates-por-arqu-tipo-*/24-01-PLAN.md — cinco arquetipos (Solo Builder, Criador de Conteudo, Agencia/Freela, Gestor E-commerce, Generico)` |
| 59 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/.plano/fases/25-cli-installer-em-duas-fases-*/25-01-PLAN.md — install A/B/C + --resume + --archetype + onboarding URL` |
| 60 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/.plano/fases/26-persona-entrevistador-*/ — persona entrevistador` |
| 61 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/.plano/fases/27-dashboard-first-run-onboarding-*/ — rota /onboarding` |
| 70 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/README.md</files>` |
| 72 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `Reescrever TOTALMENTE '/home/projects/ForgeClaw/README.md'. Apaga o conteudo atual e substitui pelo seguinte (exato, ajustando so os placeholders marcados com {{...}}):` |
| 191 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f README.md && head -1 README.md \| grep -q '^# ForgeClaw$' && grep -c 'comunidade Dominando AutoIA' README.md \| awk '$1>=2{exit 0}{exit 1}' && g` |
| 196 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/CHANGELOG.md</files>` |
| 303 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f CHANGELOG.md && grep -c '## \[0.2.0\]' CHANGELOG.md \| awk '$1>=1{exit 0}{exit 1}' && grep -c '## \[0.1.0\]' CHANGELOG.md \| awk '$1>=1{exit 0}{` |
| 308 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/docs/landing.md</files>` |
| 366 | high | personal_company | `\becoup\.digital\b` | `Jonathan Renan Outeiro, fundador da [EcoUp Digital](https://ecoup.digital). Builder solitario, ensina IA aplicada em [@jonathanrenan.ia](https://instagram.com/jonathanrenan.ia).` |
| 366 | high | personal_handle | `@jonathanrenan\.ia` | `Jonathan Renan Outeiro, fundador da [EcoUp Digital](https://ecoup.digital). Builder solitario, ensina IA aplicada em [@jonathanrenan.ia](https://instagram.com/jonathanrenan.ia).` |
| 375 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f docs/landing.md && grep -c 'Para quem e' docs/landing.md \| awk '$1>=1{exit 0}{exit 1}' && grep -c 'Para quem nao e' docs/landing.md \| awk '$1>` |

### `.plano/fases/30-docs-e-distribui-o-reescrever-readme-como-guia-de-boas-vindas-ao-membro-quick-reference-das-nove-abas-do-dashboard-roteiro-de-v-deo-walkthrough-de-install-em-cinco-minutos/30-02-PLAN.md` (42 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 171 | critical | personal_company | `\bEcoupdigital\b` | `git clone https://github.com/Ecoupdigital/forgeclaw.git` |
| 171 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `git clone https://github.com/Ecoupdigital/forgeclaw.git` |
| 10 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- /home/projects/ForgeClaw/docs/getting-started.md` |
| 11 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- /home/projects/ForgeClaw/docs/archetypes.md` |
| 12 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- /home/projects/ForgeClaw/docs/dashboard-tour.md` |
| 13 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- /home/projects/ForgeClaw/docs/harness-guide.md` |
| 14 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- /home/projects/ForgeClaw/docs/agents.md` |
| 15 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- /home/projects/ForgeClaw/docs/crons.md` |
| 16 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- /home/projects/ForgeClaw/docs/troubleshooting.md` |
| 17 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- /home/projects/ForgeClaw/docs/faq.md` |
| 18 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- /home/projects/ForgeClaw/docs/README.md` |
| 73 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/README.md (ja reescrito em 30-01) — linka para todos os docs abaixo` |
| 74 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/docs/landing.md (criado em 30-01) — landing estatica` |
| 75 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/.plano/fases/24-templates-por-arqu-tipo-*/24-01-PLAN.md — estrutura dos 5 arquetipos` |
| 76 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/.plano/fases/25-cli-installer-em-duas-fases-*/25-01-PLAN.md — installer Fase A/B/C` |
| 77 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/.plano/fases/26-persona-entrevistador-*/ — persona conversacional` |
| 78 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/.plano/fases/27-dashboard-first-run-onboarding-*/ — rota /onboarding` |
| 79 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/packages/cli/src/templates/archetypes/ — dados reais dos arquetipos (se existirem apos Fase 24 executar)` |
| 80 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/packages/core/src/memory/ — sistema de memoria (v2, FTS5, daily logs)` |
| 81 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/packages/dashboard/src/app/ — rotas do dashboard (9 tabs implementadas)` |
| 90 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/docs/README.md</files>` |
| 133 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f docs/README.md && grep -c 'getting-started.md' docs/README.md \| awk '$1>=2{exit 0}{exit 1}' && grep -c 'archetypes.md' docs/README.md \| awk '$` |
| 138 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/docs/getting-started.md</files>` |
| 310 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f docs/getting-started.md && grep -c '^## [0-9]\.' docs/getting-started.md \| awk '$1>=8{exit 0}{exit 1}' && grep -c 'screenshots/' docs/getting-` |
| 315 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/docs/archetypes.md</files>` |
| 392 | high | private_skill_dep | `\buazapi[-_]?(mcp)?\b` | `**Ferramentas recomendadas:** Asaas MCP, GitHub CLI por cliente, Obsidian (pasta por cliente), Notion/ClickUp, Google Drive, WhatsApp via UazAPI.` |
| 411 | high | private_skill_dep | `\buazapi[-_]?(mcp)?\b` | `**Ferramentas recomendadas:** Shopify Admin API, Meta Ads API, Google Ads API, TinyERP/Bling, UazAPI (WhatsApp SAC), Google Sheets.` |
| 446 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f docs/archetypes.md && grep -c '^## Solo Builder' docs/archetypes.md \| awk '$1>=1{exit 0}{exit 1}' && grep -c '^## Criador de Conteudo' docs/ar` |
| 451 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/docs/dashboard-tour.md</files>` |
| 571 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f docs/dashboard-tour.md && grep -c '^## Sessoes' docs/dashboard-tour.md \| awk '$1>=1{exit 0}{exit 1}' && grep -c '^## Automacoes' docs/dashboar` |
| 576 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/docs/harness-guide.md</files>` |
| 654 | high | private_skill_dep | `\bconta[-_]?azul\b` | `- Financeiro roda em Asaas, nao ContaAzul` |
| 765 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f docs/harness-guide.md && grep -c '^## SOUL.md' docs/harness-guide.md \| awk '$1>=1{exit 0}{exit 1}' && grep -c '^## USER.md' docs/harness-guide` |
| 770 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/docs/agents.md</files>` |
| 863 | high | private_skill_dep | `\basaas[-_]?(api\|mcp)\b` | `a skill asaas-api esta ativa. Se um cliente aparecer, tras historico dele` |
| 902 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f docs/agents.md && grep -c 'Memory mode' docs/agents.md \| awk '$1>=3{exit 0}{exit 1}' && grep -c 'Editor de Copy' docs/agents.md \| awk '$1>=1{e` |
| 907 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/docs/crons.md</files>` |
| 1051 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f docs/crons.md && grep -c 'HEARTBEAT.md' docs/crons.md \| awk '$1>=3{exit 0}{exit 1}' && grep -c 'Schedule' docs/crons.md \| awk '$1>=1{exit 0}{e` |
| 1056 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/docs/troubleshooting.md</files>` |
| 1289 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f docs/troubleshooting.md && grep -c '^## ' docs/troubleshooting.md \| awk '$1>=12{exit 0}{exit 1}' && grep -c 'Sintoma' docs/troubleshooting.md ` |
| 1294 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/docs/faq.md</files>` |
| 1374 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f docs/faq.md && grep -c '^## [0-9]' docs/faq.md \| awk '$1>=12{exit 0}{exit 1}' && grep -c 'Dominando AutoIA' docs/faq.md \| awk '$1>=1{exit 0}{e` |

### `.plano/fases/30-docs-e-distribui-o-reescrever-readme-como-guia-de-boas-vindas-ao-membro-quick-reference-das-nove-abas-do-dashboard-roteiro-de-v-deo-walkthrough-de-install-em-cinco-minutos/30-03-PLAN.md` (27 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 48 | critical | personal_name | `\bJonathan\b` | `Este plano e 'autonomous: false' porque **captura visual de screenshots exige interacao humana** (Jonathan precisa abrir dashboard povoado com dados reais anonimizados, aprovar as telas capturadas). O` |
| 67 | critical | personal_name | `\bJonathan\b` | `Decisao: o script usa Playwright **se disponivel**; caso contrario, imprime guia passo-a-passo de captura manual. Jonathan prefere leveza (nao add dep). Quem quiser automatizar, 'bunx playwright insta` |
| 111 | critical | hardcoded_path | `\/home\/vault\b` | `- [ ] Caminhos '/home/vault/...' ou similares que exponham estrutura pessoal` |
| 151 | critical | personal_company | `\bEcoupdigital\b` | `git clone https://github.com/Ecoupdigital/forgeclaw.git` |
| 151 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `git clone https://github.com/Ecoupdigital/forgeclaw.git` |
| 536 | critical | personal_name | `\bJonathan\b` | `Jonathan precisa:` |
| 550 | critical | personal_name | `\bJonathan\b` | `Verificacao aqui e **manual**: Jonathan aprova que as 27+ imagens estao no diretorio e passaram na checagem de privacidade.` |
| 553 | critical | personal_name | `\bJonathan\b` | `<done>Jonathan confirmou que os screenshots foram capturados, passaram no checklist de privacidade e estao commitados em docs/screenshots/. Se ainda nao houver, o plano segue com os placeholders refer` |
| 10 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- /home/projects/ForgeClaw/docs/video-script.md` |
| 11 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- /home/projects/ForgeClaw/docs/screenshots/README.md` |
| 12 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- /home/projects/ForgeClaw/docs/screenshots/.gitkeep` |
| 13 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- /home/projects/ForgeClaw/scripts/capture-screenshots.ts` |
| 52 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/docs/README.md — indice (criado em 30-02)` |
| 53 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/docs/getting-started.md — referencia de estrutura do walkthrough` |
| 54 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/docs/dashboard-tour.md — 9 abas que precisam de screenshot` |
| 55 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/docs/archetypes.md — 5 screenshots de picker de arquetipo` |
| 56 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/docs/agents.md, docs/crons.md, docs/harness-guide.md — screenshots de features` |
| 57 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/package.json — 'playwright' nao esta instalado hoje; ha '@playwright/mcp' em '.playwright-mcp/' mas e outro contexto. Este plano **nao adiciona Playwright como dep do projeto` |
| 72 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/docs/video-script.md</files>` |
| 233 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f docs/video-script.md && grep -c 'Bloco 1' docs/video-script.md \| awk '$1>=1{exit 0}{exit 1}' && grep -c 'Bloco 5' docs/video-script.md \| awk '` |
| 238 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/docs/screenshots/README.md,/home/projects/ForgeClaw/docs/screenshots/.gitkeep</files>` |
| 238 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/docs/screenshots/README.md,/home/projects/ForgeClaw/docs/screenshots/.gitkeep</files>` |
| 341 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -d docs/screenshots && test -f docs/screenshots/.gitkeep && test -f docs/screenshots/README.md && grep -c 'Manifesto' docs/screenshots/README.md ` |
| 346 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/scripts/capture-screenshots.ts</files>` |
| 527 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f scripts/capture-screenshots.ts && grep -c 'playwright' scripts/capture-screenshots.ts \| awk '$1>=2{exit 0}{exit 1}' && grep -c 'printManualFal` |
| 532 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/docs/screenshots/</files>` |
| 552 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -d docs/screenshots && ls docs/screenshots/*.png 2>/dev/null \| wc -l \| awk '{if($1==0) {print "NENHUM PNG AINDA — checkpoint humano pendente (OK ` |

### `.plano/fases/30-docs-e-distribui-o-reescrever-readme-como-guia-de-boas-vindas-ao-membro-quick-reference-das-nove-abas-do-dashboard-roteiro-de-v-deo-walkthrough-de-install-em-cinco-minutos/30-04-PLAN.md` (37 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 23 | critical | personal_name | `\bJonathan\b` | `- "docs/support-channel.md documenta estrutura dos canais da comunidade pra Jonathan e staff"` |
| 181 | critical | personal_name | `\bJonathan\b` | `- [ ] Nao, pedindo pra que Jonathan/staff implemente` |
| 205 | critical | personal_company | `\bEcoupdigital\b` | `url: https://github.com/Ecoupdigital/forgeclaw/tree/main/docs` |
| 205 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `url: https://github.com/Ecoupdigital/forgeclaw/tree/main/docs` |
| 208 | critical | personal_company | `\bEcoupdigital\b` | `url: https://github.com/Ecoupdigital/forgeclaw/blob/main/ACCESS.md` |
| 208 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `url: https://github.com/Ecoupdigital/forgeclaw/blob/main/ACCESS.md` |
| 276 | critical | personal_name | `\bJonathan\b` | `ForgeClaw e um produto da [comunidade Dominando AutoIA](https://comunidadeautomiaia.com.br). O canal primario de suporte e o Discord/Telegram da comunidade — la voce tem resposta mais rapida e convers` |
| 303 | critical | personal_name | `\bJonathan\b` | `- **GitHub Issue:** Jonathan revisa 1-2x por semana. Priorize o canal se for urgente.` |
| 322 | critical | personal_name | `\bJonathan\b` | `Documentar estrutura interna dos canais da comunidade e politica de moderacao. Este arquivo e mais pro Jonathan e staff da comunidade — serve de guia pra manter consistencia.` |
| 329 | critical | personal_name | `\bJonathan\b` | `Este documento e o guia operacional de como os canais da comunidade Dominando AutoIA devem ser organizados pro suporte do ForgeClaw. Serve pra Jonathan e staff (Luan e outros moderadores).` |
| 339 | critical | personal_name | `\bJonathan\b` | `**Staff:** Jonathan e 1-2 membros experientes. Regra: nenhuma pergunta fica mais que 24h sem resposta.` |
| 341 | critical | personal_company | `\bEcoupdigital\b` | `**Tom:** direto, tecnico mas acessivel. Linkar pra docs quando fizer sentido ("ver [getting-started.md](https://github.com/Ecoupdigital/forgeclaw/blob/main/docs/getting-started.md)").` |
| 341 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `**Tom:** direto, tecnico mas acessivel. Linkar pra docs quando fizer sentido ("ver [getting-started.md](https://github.com/Ecoupdigital/forgeclaw/blob/main/docs/getting-started.md)").` |
| 351 | critical | personal_name | `\bJonathan\b` | `**Staff:** Jonathan.` |
| 391 | critical | personal_name | `\bJonathan\b` | `- **Semanal (Jonathan):** triagem de issues GitHub, responder PRs pendentes, consolidar insights de '#forgeclaw-dev'` |
| 10 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- /home/projects/ForgeClaw/.github/ISSUE_TEMPLATE/bug.md` |
| 11 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- /home/projects/ForgeClaw/.github/ISSUE_TEMPLATE/feature.md` |
| 12 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- /home/projects/ForgeClaw/.github/ISSUE_TEMPLATE/config.yml` |
| 13 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- /home/projects/ForgeClaw/.github/pull_request_template.md` |
| 14 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- /home/projects/ForgeClaw/.github/SUPPORT.md` |
| 15 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- /home/projects/ForgeClaw/docs/support-channel.md` |
| 56 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/README.md (reescrito em 30-01) — secao Suporte direciona pra comunidade, este plano preenche a hierarquia reconhecida pelo GitHub` |
| 57 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/ACCESS.md (Fase 29) — fluxo de acesso ao repo privado` |
| 58 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/docs/faq.md (30-02) — destino de "RTFM" antes de issue` |
| 59 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/docs/troubleshooting.md (30-02) — destino de debug antes de issue` |
| 77 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/.github/ISSUE_TEMPLATE/bug.md</files>` |
| 138 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f .github/ISSUE_TEMPLATE/bug.md && head -1 .github/ISSUE_TEMPLATE/bug.md \| grep -q '^---$' && grep -c 'Passos para reproduzir' .github/ISSUE_TEM` |
| 143 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/.github/ISSUE_TEMPLATE/feature.md</files>` |
| 189 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f .github/ISSUE_TEMPLATE/feature.md && grep -c 'Qual problema' .github/ISSUE_TEMPLATE/feature.md \| awk '$1>=1{exit 0}{exit 1}' && grep -c 'Alter` |
| 194 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/.github/ISSUE_TEMPLATE/config.yml</files>` |
| 212 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f .github/ISSUE_TEMPLATE/config.yml && grep -q 'blank_issues_enabled: false' .github/ISSUE_TEMPLATE/config.yml && grep -c 'contact_links' .githu` |
| 217 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/.github/pull_request_template.md</files>` |
| 264 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f .github/pull_request_template.md && grep -c 'Tipo de mudanca' .github/pull_request_template.md \| awk '$1>=1{exit 0}{exit 1}' && grep -c 'Area ` |
| 269 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/.github/SUPPORT.md</files>` |
| 315 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f .github/SUPPORT.md && grep -c 'Ordem sugerida' .github/SUPPORT.md \| awk '$1>=1{exit 0}{exit 1}' && grep -c 'forgeclaw-suporte' .github/SUPPORT` |
| 320 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<files>/home/projects/ForgeClaw/docs/support-channel.md</files>` |
| 409 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f docs/support-channel.md && grep -c 'forgeclaw-suporte' docs/support-channel.md \| awk '$1>=1{exit 0}{exit 1}' && grep -c 'forgeclaw-dev' docs/s` |

### `.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-o-antes-do-release-geral/31-01-PLAN.md` (94 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 18 | critical | personal_name | `\bJonathan\b` | `- "ALPHA-PLAYBOOK.md descreve passo a passo tudo que Jonathan executa antes e durante o alpha, da selecao ao dia D+7"` |
| 21 | critical | personal_name | `\bJonathan\b` | `- "ALPHA-OBSERVATION-SHEET.md e o template por alpha que Jonathan preenche por pessoa durante os 7 dias"` |
| 24 | critical | personal_name | `\bJonathan\b` | `- "Todos os documentos sao copy-paste ready — Jonathan nao precisa reescrever nada"` |
| 33 | critical | personal_name | `\bJonathan\b` | `provides: "Template por alpha para notas diarias do Jonathan"` |
| 44 | critical | personal_name | `\bJonathan\b` | `via: "secao Convite instrui Jonathan a colar o texto de la"` |
| 61 | critical | personal_name | `\bJonathan\b` | `**Objetivo:** Preparar todos os artefatos necessarios para rodar o alpha antes de qualquer pessoa ser contatada. Este plano nao executa o alpha — ele cria os 6 documentos copy-paste que o Jonathan vai` |
| 70 | critical | personal_name | `\bJonathan\b` | `@/home/vault/04-empresa/ecoup/Equipe.md — time EcoUp (Jonathan + 5). Ninguem do time pode ser alpha (viciam os resultados), mas Luan e suporte tecnico backup para travamentos de infra nao relacionados` |
| 70 | critical | personal_company | `\bEcoUp\b` | `@/home/vault/04-empresa/ecoup/Equipe.md — time EcoUp (Jonathan + 5). Ninguem do time pode ser alpha (viciam os resultados), mas Luan e suporte tecnico backup para travamentos de infra nao relacionados` |
| 70 | critical | hardcoded_path | `\/home\/vault\b` | `@/home/vault/04-empresa/ecoup/Equipe.md — time EcoUp (Jonathan + 5). Ninguem do time pode ser alpha (viciam os resultados), mas Luan e suporte tecnico backup para travamentos de infra nao relacionados` |
| 74 | critical | personal_name | `\bJonathan\b` | `Nivel 0 — pulado. Este plano e operacional puro (escrever docs). Formulario usa Tally ou Google Forms — ambos suportam os campos necessarios (short text, long text, dropdown, rating 1-10, file upload)` |
| 81 | critical | personal_name | `\bJonathan\b` | `Criar o arquivo 'ALPHA-CANDIDATES.md' que e a matriz de selecao objetiva dos 5 alphas. Este documento serve para Jonathan listar todos os candidatos e aplicar os criterios em planilha mental ou colar ` |
| 88 | critical | personal_name | `\bJonathan\b` | `Este documento serve para Jonathan listar >= 10 candidatos da comunidade Dominando AutoIA e aplicar criterios objetivos para selecionar os 5 alphas do ForgeClaw.` |
| 151 | critical | personal_name | `\bJonathan\b` | `**Selecionado por:** Jonathan` |
| 154 | critical | personal_name | `\bJonathan\b` | `NAO adicionar nenhum candidato real neste arquivo — e template. Jonathan preenche em runtime.` |
| 163 | critical | personal_name | `\bJonathan\b` | `Criar o arquivo 'ALPHA-INVITE-MESSAGE.md' com as mensagens copy-paste prontas que Jonathan vai usar.` |
| 246 | critical | personal_company | `\bEcoUp\b` | `Voces sao os 5 primeiros humanos fora do nucleo da EcoUp a instalar esse produto. O que rolar aqui define se o release geral acontece semana que vem ou daqui 3 semanas.` |
| 266 | critical | personal_name | `\bJonathan\b` | `- Se algo quebrar completamente (nao consegue nem abrir o dashboard), pinga aqui com @Jonathan + screencast.` |
| 274 | critical | personal_name | `\bJonathan\b` | `NAO alterar o tom. Jonathan fala informal, voice-to-text, sem emoji excessivo (so um ou dois em toda conversa). Mantem minusculas em coisas como "e ai", "fechado", "galera". Isso e intencional.` |
| 277 | critical | personal_name | `\bJonathan\b` | `<done>ALPHA-INVITE-MESSAGE.md criado com 3 mensagens prontas (convite, confirmacao, boas-vindas) no tom informal do Jonathan, com placeholders claros, requisitos de Claude Max + compromisso, e regra "` |
| 283 | critical | personal_name | `\bJonathan\b` | `Criar o roteiro da onboarding call de 30 minutos. Este arquivo e o que Jonathan vai ter aberto em outro monitor durante a call.` |
| 290 | critical | personal_name | `\bJonathan\b` | `**Formato:** Google Meet ou Zoom, grupo de 6 (Jonathan + 5 alphas). Gravar a call.` |
| 293 | critical | personal_name | `\bJonathan\b` | `## Pre-call checklist (Jonathan, 15 min antes)` |
| 311 | critical | personal_company | `\bEcoUp\b` | `> A ideia do alpha e simples: voces sao os primeiros 5 humanos fora da EcoUp a mexer nesse produto. O que voces sentirem, reclamarem, amarem, odiarem — tudo vira priorizacao P0/P1/P2 pro release geral` |
| 402 | critical | personal_company | `\bEcoupdigital\b` | `> 2. Clonar o repo: 'git clone https://github.com/Ecoupdigital/forgeclaw.git ~/forgeclaw'` |
| 402 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `> 2. Clonar o repo: 'git clone https://github.com/Ecoupdigital/forgeclaw.git ~/forgeclaw'` |
| 422 | critical | personal_name | `\bJonathan\b` | `## Pos-call checklist (Jonathan, imediatamente)` |
| 438 | critical | personal_name | `\bJonathan\b` | `Criar o template do formulario de feedback estruturado. Este arquivo e a fonte-de-verdade das perguntas — Jonathan copia pra Tally ou Google Forms no dia de criar o form.` |
| 491 | critical | personal_name | `\bJonathan\b` | `5. **Voce conseguiu instalar sozinho, sem precisar pingar o Jonathan?**` |
| 659 | critical | personal_name | `\bJonathan\b` | `Criar o template de observacao interno que Jonathan preenche POR ALPHA durante os 7 dias. Este arquivo fica dentro do repo do ForgeClaw em modo privado (nao e entregue aos alphas).` |
| 666 | critical | personal_name | `\bJonathan\b` | `Jonathan preenche UM arquivo deste formato por alpha em:` |
| 669 | critical | personal_name | `\bJonathan\b` | `Este arquivo NUNCA e compartilhado com os alphas. E o jornal interno do PM (Jonathan) — anotacoes brutas, hipoteses, palpites. Serve de input pro relatorio final (PLAN 31-03) cruzar com o formulario d` |
| 700 | critical | personal_name | `\bJonathan\b` | `**T2FM observado pelo Jonathan:** ___ min` |
| 737 | critical | personal_name | `\bJonathan\b` | `- Acao tomada pelo Jonathan: [ ] fix em 24h [ ] fix em 3 dias [ ] backlog friction point` |
| 814 | critical | personal_name | `\bJonathan\b` | `## Veredicto final (Jonathan)` |
| 824 | critical | personal_name | `\bJonathan\b` | `Jonathan executa apos a selecao final (PLAN 31-02):` |
| 844 | critical | personal_name | `\bJonathan\b` | `<done>ALPHA-OBSERVATION-SHEET.md criado com template por alpha cobrindo D0 ate D+7, checkpoint em D3, T2FM observado pelo Jonathan, timeline consolidada de bugs e frictions, veredicto final, instrucoe` |
| 850 | critical | personal_name | `\bJonathan\b` | `Criar o playbook master que amarra todos os outros 5 documentos deste plano. Este e o documento que Jonathan abre no dia e executa passo a passo.` |
| 857 | critical | personal_name | `\bJonathan\b` | `Passo a passo operacional que Jonathan segue para executar o alpha controlado do ForgeClaw com 5 membros da comunidade Dominando AutoIA.` |
| 860 | critical | personal_name | `\bJonathan\b` | `**Esforco do Jonathan:** ~8-12h totais distribuidos ao longo dos 14 dias.` |
| 882 | critical | personal_name | `\bJonathan\b` | `- [ ] 'git clone https://github.com/Ecoupdigital/forgeclaw.git && cd forgeclaw && bun install && bun run packages/cli/src/index.ts install' roda ponta-a-ponta numa VM Ubuntu 22.04 limpa. Jonathan prec` |
| 882 | critical | personal_company | `\bEcoupdigital\b` | `- [ ] 'git clone https://github.com/Ecoupdigital/forgeclaw.git && cd forgeclaw && bun install && bun run packages/cli/src/index.ts install' roda ponta-a-ponta numa VM Ubuntu 22.04 limpa. Jonathan prec` |
| 882 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `- [ ] 'git clone https://github.com/Ecoupdigital/forgeclaw.git && cd forgeclaw && bun install && bun run packages/cli/src/index.ts install' roda ponta-a-ponta numa VM Ubuntu 22.04 limpa. Jonathan prec` |
| 883 | critical | personal_name | `\bJonathan\b` | `- [ ] Mesmo teste em macOS (pode ser no Mac do proprio Jonathan com conta secundaria).` |
| 974 | critical | personal_name | `\bJonathan\b` | `Todo fim de dia, Jonathan:` |
| 983 | critical | personal_company | `\bEcoupdigital\b` | `3. Para bugs criticos, vai pro terminal, reproduz, pusha fix para 'main', abre issue em 'github.com/Ecoupdigital/forgeclaw/issues', comunica no grupo:` |
| 983 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `3. Para bugs criticos, vai pro terminal, reproduz, pusha fix para 'main', abre issue em 'github.com/Ecoupdigital/forgeclaw/issues', comunica no grupo:` |
| 1039 | critical | personal_name | `\bJonathan\b` | `## Ferramentas mentais para o Jonathan` |
| 1054 | critical | personal_name | `\bJonathan\b` | `Checkpoint humano: Jonathan revisa os 6 artefatos e aprova antes de seguir.` |
| 1065 | critical | personal_name | `\bJonathan\b` | `**Acao do Jonathan se APROVADO:** seguir para PLAN 31-02.` |
| 1070 | critical | personal_name | `\bJonathan\b` | `<done>Jonathan revisou todos os 6 artefatos (ALPHA-CANDIDATES, ALPHA-INVITE-MESSAGE, ALPHA-ONBOARDING-CALL-SCRIPT, ALPHA-FEEDBACK-TEMPLATE, ALPHA-OBSERVATION-SHEET, ALPHA-PLAYBOOK) e aprovou para exec` |
| 156 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 156 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 156 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 156 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 156 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 276 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 276 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 276 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 276 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 276 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 276 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 297 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- [ ] Abrir terminal com 'cd /home/projects/ForgeClaw && bun run ops/gate/access.ts list' rodado (ver quem ja ta dentro)` |
| 373 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw` |
| 431 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 431 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 431 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 431 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 431 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 431 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 652 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 652 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 652 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 652 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 652 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 652 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 827 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `mkdir -p /home/projects/ForgeClaw/.plano/fases/31-*/observations` |
| 829 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cp /home/projects/ForgeClaw/.plano/fases/31-*/ALPHA-OBSERVATION-SHEET.md \` |
| 830 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `/home/projects/ForgeClaw/.plano/fases/31-*/observations/$user.md` |
| 843 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 843 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 843 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 843 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 843 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 949 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `mkdir -p /home/projects/ForgeClaw/.plano/fases/31-*/observations` |
| 950 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw/.plano/fases/31-*` |
| 1047 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 1047 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 1047 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 1047 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 1047 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 1047 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 1047 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 1069 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>ls /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-o-ant` |
| 70 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `@/home/vault/04-empresa/ecoup/Equipe.md — time EcoUp (Jonathan + 5). Ninguem do time pode ser alpha (viciam os resultados), mas Luan e suporte tecnico backup para travamentos de infra nao relacionados` |

### `.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-o-antes-do-release-geral/31-02-PLAN.md` (41 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 24 | critical | personal_name | `\bJonathan\b` | `- "Durante os primeiros 24h de cada alpha, Jonathan NAO forneceu ajuda tecnica individualizada — evidencia no BUG-TRIAGE ou DAILY-STANDUP"` |
| 41 | critical | personal_company | `\bEcoupdigital\b` | `to: "github.com/Ecoupdigital/forgeclaw/issues"` |
| 41 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `to: "github.com/Ecoupdigital/forgeclaw/issues"` |
| 51 | critical | personal_name | `\bJonathan\b` | `via: "Jonathan segue o roteiro criado em 31-01"` |
| 59 | critical | personal_name | `\bJonathan\b` | `**Objetivo:** Rodar efetivamente o alpha com os 5 membros selecionados: dar acesso ao repo, fazer kickoff call, observar durante 7 dias sem ajudar nas primeiras 24h, fixar bugs criticos em <=24h, acum` |
| 127 | critical | personal_name | `\bJonathan\b` | `<verify><automated>echo "Checkpoint humano — Jonathan confirma: grupo criado, 5 alphas dentro, mensagem 3 postada. Registrar confirmacao em DAILY-STANDUP.md D-1."; test -f /home/projects/ForgeClaw/.pl` |
| 128 | critical | personal_name | `\bJonathan\b` | `<done>Grupo privado Telegram criado com os 5 alphas dentro. Mensagem de boas-vindas postada. Jonathan confirma via registro em DAILY-STANDUP.md (tarefa 3) linha T-1.</done>` |
| 141 | critical | personal_name | `\bJonathan\b` | `Log agregado, uma entrada por dia. Jonathan preenche no fim de cada dia.` |
| 234 | critical | personal_name | `\bJonathan\b` | `2. Jonathan abre issue em 'github.com/Ecoupdigital/forgeclaw/issues' com label 'alpha-critical' / 'alpha-medium' / 'alpha-minor'.` |
| 234 | critical | personal_company | `\bEcoupdigital\b` | `2. Jonathan abre issue em 'github.com/Ecoupdigital/forgeclaw/issues' com label 'alpha-critical' / 'alpha-medium' / 'alpha-minor'.` |
| 234 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `2. Jonathan abre issue em 'github.com/Ecoupdigital/forgeclaw/issues' com label 'alpha-critical' / 'alpha-medium' / 'alpha-minor'.` |
| 262 | critical | personal_name | `\bJonathan\b` | `Lista de friction points — coisas que NAO sao bug mas que irritam o usuario, confundem ou atrapalham o fluxo. Diferente de bug, **friction NAO tem SLA de fix durante o alpha**. Acumula aqui e Jonathan` |
| 373 | critical | personal_name | `\bJonathan\b` | `Ritual diario de Jonathan:` |
| 429 | critical | personal_name | `\bJonathan\b` | `Quando um alpha manda no grupo "to travado em X", a resposta de Jonathan e:` |
| 458 | critical | personal_name | `\bJonathan\b` | `<done>Durante 7 dias, Jonathan preencheu diariamente: 5 observation sheets (D0 ate D+7 em cada), DAILY-STANDUP.md com 9+ entradas diarias, BUG-TRIAGE.md com todos os bugs triados e links de issues, FR` |
| 539 | critical | personal_name | `\bJonathan\b` | `- [ ] Nenhuma evidencia de Jonathan ter fornecido ajuda individualizada nas primeiras 24h de cada alpha (exceto para bugs criticos) — verificavel em DAILY-STANDUP e observation sheets` |
| 540 | critical | personal_company | `\bEcoupdigital\b` | `- [ ] Todos os bugs criticos tem issue linkada em github.com/Ecoupdigital/forgeclaw/issues` |
| 540 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `- [ ] Todos os bugs criticos tem issue linkada em github.com/Ecoupdigital/forgeclaw/issues` |
| 69 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/ops/gate/access.ts — script CLI de grant/revoke/list (Fase 29-02)` |
| 70 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/packages/cli/src/commands/install/ — fluxo de install em 3 fases (Fase 25)` |
| 71 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/README.md — docs que os alphas vao ler (Fase 30)` |
| 103 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>grep -E "^\\| [0-9]+ \\|" /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-fricti` |
| 127 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>echo "Checkpoint humano — Jonathan confirma: grupo criado, 5 alphas dentro, mensagem 3 postada. Registrar confirmacao em DAILY-STANDUP.md D-1."; test -f /home/projects/ForgeClaw/.pl` |
| 205 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 205 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 205 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 205 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 310 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 310 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 310 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 310 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 310 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 326 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw` |
| 339 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `mkdir -p /home/projects/ForgeClaw/.plano/fases/31-*/recordings/` |
| 341 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `mv ~/Downloads/meet-recording.mp4 /home/projects/ForgeClaw/.plano/fases/31-*/recordings/kickoff-$(date +%Y-%m-%d).mp4` |
| 351 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw/.plano/fases/31-*/` |
| 364 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f ops/gate/access-log.jsonl && test $(grep -c "\"action\":\"grant\"" ops/gate/access-log.jsonl) -ge 5 && test -d .plano/fases/31-alpha-com-cinco` |
| 394 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw` |
| 457 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && D=$(ls .plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-i` |
| 499 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `mv ~/Downloads/*.csv /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-o-ante` |
| 525 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-o-ant` |

### `.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-o-antes-do-release-geral/31-03-PLAN.md` (54 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 17 | critical | personal_name | `\bJonathan\b` | `- "POST-ALPHA-REPORT-TEMPLATE.md define a estrutura exata do relatorio — nao depende de memoria do Jonathan"` |
| 73 | critical | personal_name | `\bJonathan\b` | `Nivel 1 — verificar formato de CSV do Tally. Tally exporta com header em portugues ou no id da pergunta? Jonathan confirma na hora. O script 'analyze-feedback.ts' tem que ser defensivo: aceita os dois` |
| 87 | critical | personal_name | `\bJonathan\b` | `**Preenchido por:** Jonathan` |
| 97 | critical | personal_name | `\bJonathan\b` | `{Colocar 3 a 5 linhas que um futuro Jonathan, lendo daqui 6 meses, entenda se o alpha foi Go ou No-Go e por que. Exemplo: "Alpha de 5 membros completado em 7 dias. NPS 42, T2FM mediano 18 min, 4 de 5 ` |
| 188 | critical | personal_name | `\bJonathan\b` | `## 8. Observacoes qualitativas do Jonathan` |
| 196 | critical | personal_name | `\bJonathan\b` | `- Jonathan quebrou a regra "nao ajudar" alguma vez? Quando? Por que?` |
| 240 | critical | personal_name | `\bJonathan\b` | `## 12. Aprendizados para o Jonathan (retrospectiva)` |
| 257 | critical | personal_name | `\bJonathan\b` | `Criar 'RELEASE-DECISION.md' — este arquivo tem que existir ANTES da analise dos dados. Ele congela os criterios Go/No-Go antes do vies de confirmacao entrar. Jonathan preenche secao "Decisao Final" DE` |
| 276 | critical | personal_name | `\bJonathan\b` | `4. **Taxa de auto-sucesso >= 80%** (>= 4 dos 5 instalaram sem precisar de ajuda direta do Jonathan nas primeiras 24h)` |
| 291 | critical | personal_name | `\bJonathan\b` | `- **4/5 auto-sucesso:** valida que a documentacao e suficiente. Se Jonathan teve que ajudar mais que 1, o release geral sem ele de baba sera problema.` |
| 311 | critical | personal_name | `\bJonathan\b` | `**Assinatura (Jonathan escreve nome aqui):** _______________` |
| 646 | critical | personal_name | `\bJonathan\b` | `**IMPORTANTE:** Este script e DEFENSIVO. Se o CSV vier com colunas em formato inesperado (Tally gera hashes as vezes), o 'getCol()' com substring match vai falhar e retornar ''. O resultado sera "0" o` |
| 686 | critical | personal_name | `\bJonathan\b` | `- Melhoria que aumentaria NPS segundo observacao qualitativa do Jonathan` |
| 745 | critical | personal_name | `\bJonathan\b` | `## Notas pos-alpha (Jonathan)` |
| 750 | critical | personal_name | `\bJonathan\b` | `- (sensacao do Jonathan que nao tem evidencia numerica mas importa)` |
| 818 | critical | personal_name | `\bJonathan\b` | `- Secao 12: Retrospectiva do Jonathan` |
| 901 | critical | personal_name | `\bJonathan\b` | `bun run ops/gate/access.ts list \| wc -l  # deve ter tantos quanto a lista + 5 alphas + Jonathan` |
| 918 | critical | personal_company | `\bEcoupdigital\b` | `1. Voce vai receber no email cadastrado no Asaas um convite pra colaborar no repo Ecoupdigital/forgeclaw.` |
| 920 | critical | personal_company | `\bEcoupdigital\b` | `3. git clone https://github.com/Ecoupdigital/forgeclaw.git` |
| 920 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `3. git clone https://github.com/Ecoupdigital/forgeclaw.git` |
| 941 | critical | personal_company | `\bEcoupdigital\b` | `- Checar issues novas no github.com/Ecoupdigital/forgeclaw/issues a cada 6h.` |
| 941 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `- Checar issues novas no github.com/Ecoupdigital/forgeclaw/issues a cada 6h.` |
| 69 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `@/home/projects/ForgeClaw/ops/gate/access.ts — script de grant, usado em loop no caso de Go` |
| 120 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw` |
| 250 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 250 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 250 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 250 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 250 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 250 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 250 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 348 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 348 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 348 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 348 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 348 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 348 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 348 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 371 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `*   cd /home/projects/ForgeClaw` |
| 643 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `chmod +x /home/projects/ForgeClaw/.plano/fases/31-*/analyze-feedback.ts` |
| 650 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 650 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 650 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 650 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 753 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 753 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 753 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 753 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 753 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>test -f /home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-` |
| 765 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw` |
| 846 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && test -f .plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-` |
| 878 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `- Salvar em '/home/projects/ForgeClaw/ops/gate/mass-grant-list.txt' no formato:` |
| 889 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `cd /home/projects/ForgeClaw` |
| 992 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `<verify><automated>cd /home/projects/ForgeClaw && GONOGO=$(grep -oE "\[(x\|X)\] (GO\|NO-GO)" .plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-` |

### `.plano/fases/CODE-REVIEW-M.md` (10 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 125 | critical | hardcoded_path | `\/home\/vault\b` | `daily log ('/home/vault/05-pessoal/daily-log/YYYY-MM-DD.md')` |
| 128 | critical | hardcoded_path | `\/home\/vault\b` | `Daily log ('/home/vault/05-pessoal/daily-log/*.md')` |
| 131 | critical | hardcoded_path | `\/home\/vault\b` | `**Problema:** O gap M1 tinha como objetivo eliminar TODOS os hardcoded paths para '/home/vault/05-pessoal/daily-log'. O plano e verificacao (task 7 do 18-01) fizeram 'grep' apenas em 'packages/**/*.ts` |
| 125 | high | vault_structure | `05-pessoal\/daily-log` | `daily log ('/home/vault/05-pessoal/daily-log/YYYY-MM-DD.md')` |
| 128 | high | vault_structure | `05-pessoal\/daily-log` | `Daily log ('/home/vault/05-pessoal/daily-log/*.md')` |
| 131 | high | vault_structure | `05-pessoal\/daily-log` | `**Problema:** O gap M1 tinha como objetivo eliminar TODOS os hardcoded paths para '/home/vault/05-pessoal/daily-log'. O plano e verificacao (task 7 do 18-01) fizeram 'grep' apenas em 'packages/**/*.ts` |
| 48 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `? path.join(this.config.vaultPath, '05-pessoal', 'daily-log')   // line 75: uses 'path'` |
| 125 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `daily log ('/home/vault/05-pessoal/daily-log/YYYY-MM-DD.md')` |
| 128 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `Daily log ('/home/vault/05-pessoal/daily-log/*.md')` |
| 131 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `**Problema:** O gap M1 tinha como objetivo eliminar TODOS os hardcoded paths para '/home/vault/05-pessoal/daily-log'. O plano e verificacao (task 7 do 18-01) fizeram 'grep' apenas em 'packages/**/*.ts` |

### `.plano/fases/COHERENCE-REVIEW-M.md` (2 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 24 | high | vault_structure | `05-pessoal\/daily-log` | `'env var > config.vaultPath + '05-pessoal/daily-log' > ~/.forgeclaw/memory/daily'` |
| 24 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `'env var > config.vaultPath + '05-pessoal/daily-log' > ~/.forgeclaw/memory/daily'` |

### `.playwright-mcp/` (1 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 0 | critical | playwright_snapshot | `directory_presence` | `diretorio contem 36 snapshots de sessoes do dashboard (dados reais)` |

### `README.md` (5 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 48 | critical | personal_company | `\bEcoupdigital\b` | `git clone https://github.com/Ecoupdigital/forgeclaw.git` |
| 48 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `git clone https://github.com/Ecoupdigital/forgeclaw.git` |
| 102 | critical | personal_company | `\bEcoupdigital\b` | `git clone https://github.com/Ecoupdigital/forgeclaw.git` |
| 102 | critical | private_repo_url | `github\.com\/Ecoupdigital\/forgeclaw` | `git clone https://github.com/Ecoupdigital/forgeclaw.git` |
| 169 | high | private_skill_dep | `\basaas[-_]?(api\|mcp)\b` | `Prompt: "Voce e especialista financeiro. Use a skill asaas-api..."` |

### `ops/forgeclaw-dashboard.service` (1 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 8 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `WorkingDirectory=/home/projects/ForgeClaw/packages/dashboard` |

### `ops/forgeclaw.service` (1 findings, pior: high)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 8 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `WorkingDirectory=/home/projects/ForgeClaw` |

### `packages/bot/src/index.ts` (1 findings, pior: medium)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 41 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `? join(config.vaultPath, '05-pessoal', 'daily-log')` |

### `packages/cli/src/commands/install.ts` (2 findings, pior: medium)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 178 | medium | hardcoded_path | `\/root\/projects\b` | `initialValue: (existingConfig.workingDir as string) ?? '/root/projects',` |
| 199 | medium | hardcoded_path | `\/root\/obsidian\b` | `initialValue: (existingConfig.vaultPath as string) ?? '/root/obsidian',` |

### `packages/core/src/context-builder.ts` (1 findings, pior: medium)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 89 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `? path.join(this.config.vaultPath, '05-pessoal', 'daily-log')` |

### `packages/core/src/memory-manager.ts` (1 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 34 | critical | personal_name | `\bJonathan\b` | `// Jonathan is in BRT (UTC-3). The server runs UTC. We format dates/times` |

### `packages/core/src/memory/janitor.ts` (1 findings, pior: medium)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 33 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `if (config.vaultPath) return join(config.vaultPath, '05-pessoal', 'daily-log');` |

### `packages/core/src/memory/prompts/janitor.md` (7 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 3 | critical | personal_name | `\bJonathan\b` | `Tu és o **janitor do ForgeClaw** — o responsável por manter a memória de longo prazo do Jonathan em estado navegável, relevante e honesto. Tu rodas uma vez por dia às 23:55 BRT.` |
| 9 | critical | hardcoded_path | `\/home\/vault\b` | `- Daily log ('/home/vault/05-pessoal/daily-log/*.md') = o que aconteceu. Append-only. Cresce livre.` |
| 41 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `- linkar entidades relevantes por nome: "lfpro", "dra nathalia", "don vicente"` |
| 41 | critical | personal_client | `\b(don[\s-]?vicente)\b` | `- linkar entidades relevantes por nome: "lfpro", "dra nathalia", "don vicente"` |
| 9 | high | vault_structure | `05-pessoal\/daily-log` | `- Daily log ('/home/vault/05-pessoal/daily-log/*.md') = o que aconteceu. Append-only. Cresce livre.` |
| 41 | high | personal_name | `\bdra\s+nathalia\b` | `- linkar entidades relevantes por nome: "lfpro", "dra nathalia", "don vicente"` |
| 9 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `- Daily log ('/home/vault/05-pessoal/daily-log/*.md') = o que aconteceu. Append-only. Cresce livre.` |

### `packages/core/src/memory/prompts/writer.md` (12 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 3 | critical | personal_name | `\bJonathan\b` | `Tu és o **writer do ForgeClaw** — um extrator mecânico que transforma transcrições de sessão em bullets curtos pro daily log do Jonathan. Tu **não interpreta, não infere, não alucina**. Tu só pega o q` |
| 7 | critical | hardcoded_path | `\/home\/vault\b` | `Receber mensagens de uma sessão do dia e produzir 5-15 bullets compactos, marcados por tipo, pra serem anexados no daily log ('/home/vault/05-pessoal/daily-log/YYYY-MM-DD.md').` |
| 55 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `user: vou fazer o deploy do gestor-lfpro amanhã as 8h` |
| 61 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `- [14:32] 【tarefa】 deploy gestor-lfpro agendado pra amanhã 8h (topic: gestor-lfpro)` |
| 61 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `- [14:32] 【tarefa】 deploy gestor-lfpro agendado pra amanhã 8h (topic: gestor-lfpro)` |
| 62 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `- [14:33] 【decisão】 criar cron pra lembrar do deploy (topic: gestor-lfpro)` |
| 80 | critical | personal_client | `\b(foco-real\|focoreal)\b` | `- [11:02] 【pessoa】 dra nathalia prefere template b pra newsletter (topic: foco-real)` |
| 81 | critical | personal_client | `\b(foco-real\|focoreal)\b` | `- [11:02] 【preferência】 newsletter da foco real usa template b (topic: foco-real)` |
| 89 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `"session": { "key": "abc123", "topic": "gestor-lfpro", "startedAt": 1760000000 },` |
| 7 | high | vault_structure | `05-pessoal\/daily-log` | `Receber mensagens de uma sessão do dia e produzir 5-15 bullets compactos, marcados por tipo, pra serem anexados no daily log ('/home/vault/05-pessoal/daily-log/YYYY-MM-DD.md').` |
| 80 | high | personal_name | `\bdra\s+nathalia\b` | `- [11:02] 【pessoa】 dra nathalia prefere template b pra newsletter (topic: foco-real)` |
| 7 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `Receber mensagens de uma sessão do dia e produzir 5-15 bullets compactos, marcados por tipo, pra serem anexados no daily log ('/home/vault/05-pessoal/daily-log/YYYY-MM-DD.md').` |

### `packages/core/src/memory/writer.ts` (1 findings, pior: medium)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 27 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `if (config.vaultPath) return join(config.vaultPath, '05-pessoal', 'daily-log');` |

### `packages/core/src/state-store.ts` (1 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 1126 | critical | personal_client | `\b(don[\s-]?vicente)\b` | `* so user-supplied queries like ''don-vicente'' or ''claude code''` |

### `packages/dashboard/src/components/cron-form-sheet.tsx` (1 findings, pior: medium)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 398 | medium | private_skill_dep | `~\/\.claude\/skills\b` | `Nenhuma skill encontrada em ~/.claude/skills/` |

### `packages/dashboard/src/lib/core.ts` (1 findings, pior: medium)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 42 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `return join(config.vaultPath, "05-pessoal", "daily-log");` |

### `packages/dashboard/src/lib/mock-data.ts` (8 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 304 | critical | hardcoded_path | `\/home\/vault\b` | `vaultPath: "/home/vault",` |
| 23 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `projectDir: "/home/projects/ForgeClaw",` |
| 32 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `projectDir: "/home/projects/ForgeClaw/packages/dashboard",` |
| 41 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `projectDir: "/home/projects/ForgeClaw",` |
| 50 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `projectDir: "/home/projects/ForgeClaw",` |
| 61 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `projectDir: "/home/projects/ForgeClaw",` |
| 70 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `projectDir: "/home/projects/ForgeClaw/packages/dashboard",` |
| 303 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `workingDir: "/home/projects/ForgeClaw",` |

### `scripts/audit-personal-context.ts` (26 findings, pior: critical)

| Linha | Sev | Categoria | Pattern | Snippet |
|-------|-----|-----------|---------|---------|
| 85 | critical | personal_name | `\bJonathan\b` | `// personal_client — nomes de clientes/projetos do Jonathan` |
| 86 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `{ category: 'personal_client', severity: 'critical', pattern: /\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b/g },` |
| 86 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `{ category: 'personal_client', severity: 'critical', pattern: /\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b/g },` |
| 86 | critical | personal_client | `\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b` | `{ category: 'personal_client', severity: 'critical', pattern: /\b(lfpro\|LFpro\|LF\s?Pro\|gestor-lfpro)\b/g },` |
| 87 | critical | personal_client | `\b(kovvy\|Kovvy\|clearify\|Clearify)\b` | `{ category: 'personal_client', severity: 'critical', pattern: /\b(kovvy\|Kovvy\|clearify\|Clearify)\b/g },` |
| 87 | critical | personal_client | `\b(kovvy\|Kovvy\|clearify\|Clearify)\b` | `{ category: 'personal_client', severity: 'critical', pattern: /\b(kovvy\|Kovvy\|clearify\|Clearify)\b/g },` |
| 87 | critical | personal_client | `\b(kovvy\|Kovvy\|clearify\|Clearify)\b` | `{ category: 'personal_client', severity: 'critical', pattern: /\b(kovvy\|Kovvy\|clearify\|Clearify)\b/g },` |
| 87 | critical | personal_client | `\b(kovvy\|Kovvy\|clearify\|Clearify)\b` | `{ category: 'personal_client', severity: 'critical', pattern: /\b(kovvy\|Kovvy\|clearify\|Clearify)\b/g },` |
| 89 | critical | personal_client | `\b(bv-otica\|bv_otica\|BV\s?[O\u00D3]tica)\b` | `{ category: 'personal_client', severity: 'critical', pattern: /\b(bv-otica\|bv_otica\|BV\s?[OÓ]tica)\b/gi },` |
| 89 | critical | personal_client | `\b(bv-otica\|bv_otica\|BV\s?[O\u00D3]tica)\b` | `{ category: 'personal_client', severity: 'critical', pattern: /\b(bv-otica\|bv_otica\|BV\s?[OÓ]tica)\b/gi },` |
| 90 | critical | personal_client | `\b(foco-real\|focoreal)\b` | `{ category: 'personal_client', severity: 'critical', pattern: /\b(foco-real\|focoreal)\b/gi },` |
| 90 | critical | personal_client | `\b(foco-real\|focoreal)\b` | `{ category: 'personal_client', severity: 'critical', pattern: /\b(foco-real\|focoreal)\b/gi },` |
| 91 | critical | personal_client | `\b(velhos-parceiros\|velhos_parceiros)\b` | `{ category: 'personal_client', severity: 'critical', pattern: /\b(velhos-parceiros\|velhos_parceiros)\b/gi },` |
| 91 | critical | personal_client | `\b(velhos-parceiros\|velhos_parceiros)\b` | `{ category: 'personal_client', severity: 'critical', pattern: /\b(velhos-parceiros\|velhos_parceiros)\b/gi },` |
| 95 | critical | personal_handle | `@ForgeClawUP_bot` | `{ category: 'personal_handle', severity: 'critical', pattern: /@ForgeClawUP_bot/g },` |
| 98 | critical | personal_name | `\bJonathan\b` | `// personal_userid — id do Jonathan e do grupo anonymous bot` |
| 102 | critical | personal_name | `\bJonathan\b` | `// hardcoded_path — paths que so existem na maquina do Jonathan` |
| 112 | critical | personal_company | `\bEcoupdigital\b` | `{ category: 'private_repo_url', severity: 'critical', pattern: /github\.com\/Ecoupdigital\/forgeclaw/gi },` |
| 120 | critical | personal_name | `\bJonathan\b` | `// vault_structure — estrutura especifica do vault do Jonathan` |
| 92 | high | personal_client | `\b(passini\|mybrows\|transplant\|enove)\b` | `{ category: 'personal_client', severity: 'high',     pattern: /\b(passini\|mybrows\|transplant\|enove)\b/gi },` |
| 92 | high | personal_client | `\b(passini\|mybrows\|transplant\|enove)\b` | `{ category: 'personal_client', severity: 'high',     pattern: /\b(passini\|mybrows\|transplant\|enove)\b/gi },` |
| 92 | high | personal_client | `\b(passini\|mybrows\|transplant\|enove)\b` | `{ category: 'personal_client', severity: 'high',     pattern: /\b(passini\|mybrows\|transplant\|enove)\b/gi },` |
| 92 | high | personal_client | `\b(passini\|mybrows\|transplant\|enove)\b` | `{ category: 'personal_client', severity: 'high',     pattern: /\b(passini\|mybrows\|transplant\|enove)\b/gi },` |
| 104 | high | hardcoded_path | `\/home\/projects\/(?!ForgeClaw\b)[A-Za-z0-9_-]+` | `// /home/projects/X (outros projetos privados)` |
| 106 | high | hardcoded_path | `\/home\/projects\/ForgeClaw\b` | `// /home/projects/ForgeClaw presente em systemd — precisa ser parametrizado` |
| 121 | medium | vault_structure | `\b0\d-(inbox\|projetos\|clientes\|skills\|empresa\|pessoal\|conte[u\u00FA]do\|conhecimentos)\b` | `{ category: 'vault_structure', severity: 'high',   pattern: /05-pessoal\/daily-log/g },` |
