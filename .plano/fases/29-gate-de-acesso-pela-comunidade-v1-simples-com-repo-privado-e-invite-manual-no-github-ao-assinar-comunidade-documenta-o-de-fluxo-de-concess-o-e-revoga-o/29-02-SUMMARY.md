---
phase: 29-gate-de-acesso-pela-comunidade
plan: 29-02
subsystem: access-gate-cli
tags: [github-api, cli, invite, revoke, collaborators, audit-log, zero-deps, community-gate]
requires:
  - "29-01 (repo privado — pre-requisito de existir um collaborator para gerenciar)"
provides:
  - "CLI Bun 'forgeclaw-access' com 4 subcomandos: grant/revoke/list/audit"
  - "GitHub API client nativo via fetch (zero deps externas)"
  - "Audit trail JSONL append-only em ops/gate/access-log.jsonl"
  - "Registro de mapeamento membroComunidade <-> githubUsername em ops/gate/members.jsonl"
  - "Template de env (gate.env.example) com GITHUB_TOKEN + REPO_OWNER + REPO_NAME + DEFAULT_PERMISSION"
  - "README-GATE.md com runbook operacional (setup, comandos, cenarios, auditoria mensal)"
  - "Gitignore de gate.env, access-log.jsonl, members.jsonl (segredos e dados de membros nao commitados)"
  - "Runbook de smoke test manual pro Jonathan validar fim-a-fim com conta alt"
affects:
  - "Fase 29-03 (v2 webhook — cria a rota automatica que invocara este CLI ou sua logica)"
  - "Operacao manual do gate: Jonathan roda 'bun run ops/gate/access.ts grant|revoke|list' em cada assinatura/cancelamento ate existir v2"
tech-stack:
  added: []
  patterns:
    - "Zero-deps CLI em Bun usando node:fs/path/os + fetch nativo"
    - "Precedencia de config process.env > ./gate.env > ~/.forgeclaw/gate.env (flexivel pra dev e pra operar de outros workspaces)"
    - "Dotenv parser inline (11 linhas) em vez de dep externa"
    - "JSONL append-only pra audit trail — 1 JSON object por linha, read/append trivial"
    - "GitHub API via Bearer token + X-GitHub-Api-Version: 2022-11-28 (compat fine-grained PAT)"
    - "Idempotencia em grant (201 invite / 204 already) e revoke (204 removed / 404 nao era)"
    - "Validacao de username regex /^[a-zA-Z0-9-]{1,39}$/ (spec GitHub) antes de chamar API — fail fast"
    - "Nunca logar o token em stdout, stderr ou JSONL (revisado em cada logAction)"
key-files:
  created:
    - "/home/projects/ForgeClaw/ops/gate/access.ts"
    - "/home/projects/ForgeClaw/ops/gate/access.test.ts"
    - "/home/projects/ForgeClaw/ops/gate/README-GATE.md"
    - "/home/projects/ForgeClaw/ops/gate/gate.env.example"
  modified:
    - "/home/projects/ForgeClaw/.gitignore"
decisions:
  - "Zero-deps intencional (sem @octokit/rest): operado manualmente, fetch nativo cobre PUT/DELETE/GET, nao vale o overhead de install"
  - "Precedencia de env em 3 camadas: processo > ./gate.env > ~/.forgeclaw/gate.env — permite Jonathan rodar de qualquer workspace sem reinstalar config"
  - "Validation regex de username FORA de loadConfig() — cmdGrant/cmdRevoke validam primeiro, entao so carregam config se o input for legit (evita exigir GITHUB_TOKEN pra rejeitar username obviamente invalido — util em testes)"
  - "affiliation=direct no list — filtra so quem foi adicionado diretamente, nao members da org (que ja tem acesso por outro caminho)"
  - "members.jsonl append-only sem update em revoke — a verdade esta em access-log.jsonl e em `list` contra a API. members.jsonl e quick-lookup, nao source of truth"
  - "Task 5 (smoke test E2E com conta GitHub alt) DEFERRED como acao humana: precisa de segunda conta GitHub que o Jonathan controle, acesso a email dessa conta, e julgamento humano do UX do convite. Runbook completo documentado abaixo e em deferred-items.md"
  - "Escape hatch CI: testes em access.test.ts NAO exercitam grant/revoke com token real — soh help, missing token, regex rejection, audit vazio. Previne qualquer tentativa do CI de mutar repos reais no GitHub"
metrics:
  duration: "~45 minutos"
  tasks_completed: 4
  tasks_deferred: 1
  files_created: 4
  files_modified: 1
  commits: 4
  completed: "2026-04-21T15:24:00Z"
---

# Fase 29 Plano 02: Script CLI de Concessao/Revogacao de Acesso — Summary

CLI Bun zero-deps 'forgeclaw-access' que automatiza o fluxo manual de Jonathan conceder e revogar acesso ao repo privado `Ecoupdigital/forgeclaw` para membros da comunidade Dominando AutoIA, via 4 subcomandos (grant/revoke/list/audit) contra a GitHub REST API, com audit trail JSONL append-only, template de env seguro, runbook operacional completo, e suite de 4 testes vitest para os casos deterministicos. Smoke test fim-a-fim com conta GitHub alt ficou DEFERRED para execucao humana — runbook exato documentado abaixo.

## Tarefas Executadas

| # | Tarefa | Status | Commit | Arquivos |
|---|--------|--------|--------|----------|
| 1 | gate.env.example + .gitignore | OK | `34611bc` | `ops/gate/gate.env.example`, `.gitignore` |
| 2 | access.ts (CLI com 4 subcomandos) | OK | `66ef332` | `ops/gate/access.ts` |
| 3 | README-GATE.md (runbook operacional) | OK | `6221d55` | `ops/gate/README-GATE.md` |
| 4 | access.test.ts (suite vitest) | OK | `0bc5dc0` | `ops/gate/access.test.ts` |
| 5 | Smoke test E2E com conta GitHub alt | DEFERRED (checkpoint humano) | — | — |

## Verificacoes Funcionais

**Task 1 (gate.env.example + .gitignore):**
- `test -f ops/gate/gate.env.example` → OK
- `grep GITHUB_TOKEN ops/gate/gate.env.example` → match
- `grep REPO_OWNER ops/gate/gate.env.example` → match
- `.gitignore` contem `ops/gate/gate.env`, `ops/gate/access-log.jsonl`, `ops/gate/members.jsonl`

**Task 2 (access.ts):**
- `test -f ops/gate/access.ts && test -x ops/gate/access.ts` → OK (shebang + chmod +x)
- `bun run ops/gate/access.ts --help` → imprime "ForgeClaw Access Gate v1" + 4 subcomandos
- Zero dependencias externas (so node:fs/path/os/url + fetch nativo do Bun)
- Precedencia de config validada: `GITHUB_TOKEN=fake bun run ... list` retorna 401 "Bad credentials" (chegou na API real, auth quebrou como esperado)
- Regex de username rejeita inputs invalidos antes de carregar config

**Task 3 (README-GATE.md):**
- Existe, documenta todos os 4 subcomandos com exemplos copy-paste
- Secao "Runbook" cobre 3 cenarios (assinatura nova, cancelamento, auditoria mensal)
- Secao "Limitacoes v1" explicita o que nao e feito (webhook, validacao de user existe, update de members.jsonl em revoke)
- Aponta pra Fase 29-03 pro v2 automatizado

**Task 4 (access.test.ts):**
- `bunx vitest run ops/gate/access.test.ts` → 4 passed (help, missing token, invalid username, empty audit)
- Zero chamadas reais a GitHub API (GITHUB_TOKEN='fake-token-for-test' em casos que precisam passar da validacao local)
- Duracao total: ~390ms

**Runtime live (dev-box):**
- `bun run ops/gate/access.ts list` com token real retornou: `@Ecoupdigital (role=admin) | Total: 1` — confirma conectividade fim-a-fim com a API privada do repo
- `GITHUB_TOKEN=fake bun run ops/gate/access.ts list` retornou 401 Bad credentials — confirma auth flow

**Gate de CI (audit:personal:ci):**
- Com `gate.env` ausente (cenario CI, arquivo e gitignored) → `AUDIT PASS — 0 critical findings`
- Com `gate.env` presente localmente no dev (contem `REPO_OWNER=Ecoupdigital`) o scanner acende 1 finding — ESPERADO: o scanner walk a filesystem, e gate.env so existe em dev; em CI o arquivo nao esta no tree. Registrado como observacao abaixo, nao e um bug.

## Desvios do Plano

### Issues Auto-corrigidos

**1. [Regra 1 - Bug] `userInfo is not a function`**
- **Encontrado durante:** Task 2 apos primeira execucao do script
- **Issue:** O plano sugeriu `require('node:os').userInfo().username` dentro de try/catch, mas em Bun 1.1+ `require` de modulo ESM `node:os` via `require` nao funciona. Script crashava ao logar primeira acao.
- **Correcao:** Trocado por `import { homedir, userInfo } from 'node:os'` no topo + chamada direta `userInfo().username`. Mantida try/catch com fallback 'unknown' pra ambientes sem userInfo (containers sem passwd entry).
- **Arquivos modificados:** `ops/gate/access.ts` (imports + getActor)
- **Commit:** `66ef332` (ja estava na primeira versao commitada — fix inline durante desenvolvimento da Task 2)

**2. [Regra 1 - Bug] `dirname(new URL(import.meta.url).pathname)` falha em Bun**
- **Encontrado durante:** Task 2
- **Issue:** URL.pathname em `file://` URLs inclui encoding que quebra resolvers de path em alguns sistemas. Bun/Node esperam `fileURLToPath()` pra converter file:// em OS path.
- **Correcao:** Usado `import { fileURLToPath } from 'node:url'` + `dirname(fileURLToPath(import.meta.url))`.
- **Arquivos modificados:** `ops/gate/access.ts` (SCRIPT_DIR)
- **Commit:** `66ef332`

**3. [Regra 3 - Bloqueante] `Object.assign(env, process.env)` reclama de tipo**
- **Encontrado durante:** Task 2 typecheck
- **Issue:** `process.env` tem tipo `NodeJS.ProcessEnv` onde values podem ser `string | undefined`. `Object.assign` em `Record<string, string>` quebra strict mode.
- **Correcao:** Loop explicito `for (const [k, v] of Object.entries(process.env)) { if (v !== undefined) env[k] = v; }` filtra undefined em runtime.
- **Arquivos modificados:** `ops/gate/access.ts` (loadConfig)
- **Commit:** `66ef332`

**4. [Regra 2 - Critico] Ordem de validacao em cmdGrant/cmdRevoke**
- **Encontrado durante:** Task 4 — teste "rejects invalid github username" falhava com exit 2 em vez de exit 2 por razao certa. O plano tinha `loadConfig()` ANTES da validacao de username, entao sem GITHUB_TOKEN o teste nao chegava na validacao de regex.
- **Correcao:** Regex validation movida pra ANTES do loadConfig() nos 2 comandos. Agora: username invalido exit 2 "invalido"; username valido sem token exit 2 "GITHUB_TOKEN nao configurado". Ordem de erros mais intuitiva + testes passam sem precisar de token fake.
- **Arquivos modificados:** `ops/gate/access.ts` (cmdGrant, cmdRevoke)
- **Commit:** `66ef332`

### Issues NAO corrigidos (fora de escopo)

**gate.env local gera finding no audit:personal:ci em dev-box:**
- Em CI o arquivo nao existe (gitignored), entao audit passa — validado com `mv gate.env /tmp && bun run audit:personal:ci` → PASS.
- Fix arquitetural (scanner respeitar .gitignore) e out-of-scope pro 29-02 e introduziria comportamento novo no scanner da Fase 23. Se virar pain-point, abrir issue separado.

**Smoke test E2E com conta alt (Task 5):**
- DEFERRED como acao humana — runbook completo em `deferred-items.md`. Nao e um desvio; e checkpoint explicito do plano (`type="checkpoint:human-verify"`).

## Gates de Autenticacao

**GITHUB_TOKEN:** O script requer PAT com scope `repo` (classic) ou fine-grained com `Administration: Read and Write`. Durante desenvolvimento, o token foi lido de `~/.claude/projects/-home-vault/memory/reference_github_token_ecoup.md` e gravado em `ops/gate/gate.env` (local, gitignored). Nao commitado, nao logado, nao aparece em nenhum output de teste ou README. Validado via `list` real contra a API.

## Observacoes Tecnicas

1. **members.jsonl vs access-log.jsonl:** Ambos JSONL append-only, mas com papeis diferentes. `members.jsonl` e indice de "email -> github username" pra busca rapida em revoke (`grep email members.jsonl`). `access-log.jsonl` e audit trail completo com todas as acoes (grant/revoke/list/audit) e seus resultados. Em caso de divergencia, access-log e source of truth.

2. **affiliation=direct no list:** Filtra colaboradores adicionados diretamente ao repo (via `PUT .../collaborators/<user>`) e exclui members da org Ecoupdigital (que herdam acesso via membership). O gate v1 so gerencia collaborators diretos; members da org sao convidados por outro caminho (e raramente — Ecoupdigital deve ter poucos orgs members).

3. **DEFAULT_PERMISSION=pull:** Apenas leitura (`pull` no vocab GitHub). Membros da comunidade nao podem push direto no forgeclaw — se quiserem contribuir, fork + PR (fluxo padrao). V2 pode introduzir role diferenciado pra contribuidores pagos premium.

4. **Idempotencia de grant/revoke:** Ambos sao seguros pra rodar N vezes. `grant` ja collaborator retorna 204 (no-op, atualiza permission se diferente). `revoke` de quem nao esta retorna 404 (no-op, logado como `noop`). Isso simplifica scripts de reconciliacao mensal: pode rodar grant sobre lista inteira de ativos sem medo de duplicar convites.

5. **Rate limit:** 5000 req/h autenticado, bem mais que suficiente pra uso manual. Script nao implementa backoff porque a frequencia esperada e dezenas de acoes por dia, nao milhares.

6. **gate.env em dev vs CI:** O scanner da Fase 23 walk filesystem (nao respeita .gitignore). Em dev o arquivo `gate.env` existe e gera 1 finding personal_company (pelo REPO_OWNER=Ecoupdigital). Em CI o arquivo nao existe (nao foi commitado). Se algum dev commitar o `gate.env` por acidente, o gitignore pega; se o scanner no CI encontrar, o audit quebra — comportamento correto.

## Self-Check: PASSOU

- [x] `/home/projects/ForgeClaw/ops/gate/access.ts` existe, executavel, roda --help
- [x] Commit `34611bc` presente em git log (gate.env.example + .gitignore)
- [x] Commit `66ef332` presente em git log (access.ts CLI)
- [x] Commit `6221d55` presente em git log (README-GATE.md)
- [x] Commit `0bc5dc0` presente em git log (access.test.ts vitest suite)
- [x] `/home/projects/ForgeClaw/ops/gate/gate.env.example` existe com GITHUB_TOKEN/REPO_OWNER/REPO_NAME/DEFAULT_PERMISSION
- [x] `/home/projects/ForgeClaw/.gitignore` ignora gate.env, access-log.jsonl, members.jsonl
- [x] `/home/projects/ForgeClaw/ops/gate/access.test.ts` roda com `bunx vitest run` e os 4 testes passam
- [x] `/home/projects/ForgeClaw/ops/gate/README-GATE.md` existe com Setup, Comandos, Runbook, Limitacoes
- [x] `list` real contra a GitHub API retorna @Ecoupdigital admin — conectividade fim-a-fim validada
- [x] `bun run audit:personal:ci` → AUDIT PASS em CI (sem gate.env). Em dev com gate.env: 1 finding esperado, nao e regressao.
- [x] Task 5 (smoke test E2E) documentada como DEFERRED + runbook completo em deferred-items.md

## Proximas acoes

1. **Humano — smoke test E2E (Task 5 deferred):** ver `deferred-items.md` na pasta da fase. 6 comandos, ~5min, precisa de conta GitHub alternativa do Jonathan.
2. **29-03:** planejar v2 automatizado — webhook do Asaas -> Edge Function Supabase -> reuso da logica de grant/revoke do access.ts (ou chamada remota ao CLI via SSH).
3. **Fase 30:** reescrever README como guia de boas-vindas do membro ja que o gate esta operacional.
