# Cleanup Checklist — Contexto Pessoal no Repo ForgeClaw

Derivado de `AUDIT-REPORT.md` em 2026-04-21 (1280 findings em 95 arquivos unicos: 428 critical, 762 high, 90 medium). Plano 23-02 executa esta lista.

## Legenda de acoes

- **sanitize**: reescrever trechos substituindo contexto pessoal por generico/placeholder
- **delete**: remover o arquivo inteiro do repo
- **replace**: gerar novo arquivo zerado com template generico
- **move**: mover pra fora do VCS (ou pra gitignore)
- **parametrize**: trocar valor hardcoded por variavel de ambiente / config / template var
- **decide**: acao humana — escolher entre opcoes (ex: skills endpoint, vault defaults)
- **no-op**: nao agir neste plano (historico ou whitelisted)

## Escopo

Este checklist ataca **produto distribuivel** (codigo, docs publicos, scripts de build). Conteudo historico em `.plano/` (planos antigos, SUMMARYs, CODE-REVIEW) esta listado em "Ações medium — historico `.plano/`" e so recebe tratamento pontual onde vaza tokens/handles. O plano 23-03 deve whitelist `.plano/` no CI guard, exceto categorias `bot_token_fragment`, `personal_userid`, `personal_handle`, que nunca devem ficar em lugar nenhum.

---

## Acoes criticas (faca primeiro)

### Tokens, handles e ids vazados (remover do historico inteiro)

- [ ] `.continue-aqui.md` — **delete**
  - Arquivo de handoff pessoal de sessao. Contem: URL de repo privado (L4), bot handle `@ForgeClawUP_bot` (L11, L59), bot token fragment `8662287719:` (L59), user id `450030767` (L60), group user id `1087968824` (L35), `/home/vault` (L62), `/home/projects/ForgeClaw` (L67). 9 findings criticos em um arquivo so.
  - **Nao existe razao para manter no repo.** Nenhum outro arquivo referencia.
  - Apos delete, considerar `git filter-repo` pra expurgar do historico (decisao do 23-03).

### Snapshots e screenshots com dados reais

- [ ] `.playwright-mcp/` (diretorio inteiro) — **move** (adicionar ao `.gitignore`) + **delete** dos 36 snapshots
  - Diretorio registrado como `playwright_snapshot` critical (diretorio contem 36 snapshots de sessoes do dashboard com dados reais).
  - Conteudo inclui prompt de sistema "Voce e o Jonathan Renan Outeiro — fundador da EcoUp Digital", nomes de projetos internos, conversas "Oi, Jonathan!".
  - Passos:
    1. Adicionar `.playwright-mcp/` ao `.gitignore` (pode ja estar; confirmar).
    2. `git rm -r --cached .playwright-mcp/` (se algum snapshot estiver tracked).
    3. `rm -rf .playwright-mcp/` no working tree.
    4. Historico: 23-03 decide se roda `git filter-repo`.

- [ ] `sessions-tab-initial.png` (raiz) — **delete**
  - Screenshot com dados reais do dashboard do Jonathan. Nao deve estar no repo nem no historico.

- [ ] `sessions-with-real-names.png` (raiz) — **delete**
  - 70KB de screenshot mostrando nomes reais de sessoes. O proprio nome do arquivo admite o problema.
  - Apos delete, adicionar `*.png` na raiz ao `.gitignore` e mover quaisquer imagens legitimas para `docs/images/` (sanitizadas).

### Prompts do sistema de memoria (core product)

- [ ] `packages/core/src/memory/prompts/janitor.md` — **sanitize** (7 findings: personal_name, hardcoded_path, personal_client, vault_structure)
  - L3: "Tu es o janitor do ForgeClaw…" tem referencia ao dono — reescrever em 2a pessoa generica sem "do Jonathan".
  - L9: `/home/vault/05-pessoal/daily-log/*.md` → `{dailyLogDir}/*.md` ou placeholder generico referenciando `$FORGECLAW_DAILY_LOG_DIR` (ver entrada parametrize de context-builder abaixo).
  - L41: exemplos "lfpro", "dra nathalia", "don vicente" → nomes ficticios ("project-a", "contact-x", "vendor-y").
  - Preservar semantica (destilar fatos permanentes, linkar entidades).

- [ ] `packages/core/src/memory/prompts/writer.md` — **sanitize** (12 findings: personal_name, hardcoded_path, personal_client, vault_structure)
  - Reescrever cabecalho (L3, L7) sem "do Jonathan".
  - Trocar path hardcoded `/home/vault/05-pessoal/daily-log/YYYY-MM-DD.md` por referencia generica.
  - Reescrever exemplos (L55, L61, L62, L67, L71, L75, L79, L81, L89) substituindo `gestor-lfpro` por `project-alpha`, `dra nathalia` por `customer-x`, `don vicente` por `vendor-y`, etc.
  - Este e o prompt que o produto injeta em toda sessao — zero PII aqui.

### Codigo runtime (core)

- [ ] `packages/core/src/memory-manager.ts` — **sanitize**
  - L34: comentario `// Jonathan is in BRT (UTC-3)` → `// Server runs UTC. Dates are formatted in the user's configured timezone (default America/Sao_Paulo, override via config.timezone)`.
  - Ajustar L35-37 se houver mais "his wall clock" / "Jonathan's" → linguagem neutra ("the user's").

- [ ] `packages/core/src/state-store.ts` — **sanitize**
  - L1126: comentario de schema usa `don-vicente` como exemplo de query. Trocar para `project-alpha` ou `vendor-example`.

- [ ] `packages/dashboard/src/lib/mock-data.ts` — **decide → sanitize ou delete** (8 findings: todos hardcoded_path)
  - L304 `vaultPath: "/home/vault"`.
  - L23, L32, L41, L50, L61, L70 `projectDir: "/home/projects/ForgeClaw/..."` (7 variantes).
  - **Opcao A (sanitize):** `/home/vault` → `"/home/example/vault"`; `projectDir` → `"/home/example/projects/demo-app/..."`; `mockMemoryContent` tambem precisa ser reescrito pra nao referenciar o proprio ForgeClaw (conteudo generico de "demo app").
  - **Opcao B (delete):** Fase 14 migrou dashboard para usar `@forgeclaw/core` real — confirmar se `mock-data.ts` ainda tem consumer. Se nao tem, `rm` + `grep -rn mock-data packages/dashboard/src` vazio → delete.
  - Recomendacao: **delete** se nenhum import ativo; **sanitize** se storybook/dev-only ainda usa.

### URLs de repo privado em docs publicos

- [ ] `README.md` — **sanitize** (5 findings: personal_company, private_repo_url, private_skill_dep)
  - L48 e L102: `git clone https://github.com/Ecoupdigital/forgeclaw.git` → placeholder `https://github.com/<your-org>/forgeclaw.git` ate existir url publico oficial.
  - Review da secao de skills para remover acoplamento implicito a Claude Code skills privadas do Jonathan (`~/.claude/skills/` mencao).

### Systemd units com paths hardcoded

- [ ] `ops/forgeclaw.service` — **parametrize**
  - L8 `WorkingDirectory=/home/projects/ForgeClaw` + `/root/.bun/bin/bun`.
  - Transformar em template: `packages/cli/src/utils/service.ts` ja gera unit dinamico no install — remover este static unit do repo OU converte-lo em `.service.template` com `@@WORKINGDIR@@` e `@@BUN_BIN@@` substituidos pelo installer.
  - Decidir: se `utils/service.ts` ja cobre 100% do caso, **delete** o static.

- [ ] `ops/forgeclaw-dashboard.service` — **parametrize** (mesmo tratamento do forgeclaw.service, L8 `/home/projects/ForgeClaw/packages/dashboard`).

### Installer defaults problematicos

- [ ] `packages/cli/src/commands/install.ts` — **sanitize** (2 findings medium, mas afeta UX de todo novo user)
  - L178 default `/root/projects` → `join(homedir(), 'projects')` (portavel; respeita o user real).
  - L199 default `/root/obsidian` → remover default. Vault path e opcional; so perguntar se user confirmou antes que usa Obsidian. Alternativa: `join(homedir(), 'obsidian')` se quiser manter UX "Enter para aceitar".

---

## Acoes high (faca em seguida)

### Context builder — estrutura de vault hardcoded

- [ ] `packages/core/src/context-builder.ts` — **parametrize** (1 finding, L89 vault_structure `05-pessoal/daily-log`)
  - Path atual: `path.join(this.config.vaultPath, '05-pessoal', 'daily-log')`. Presume estrutura do vault do Jonathan.
  - **decide** qual estrategia:
    a) Adicionar `config.vaultDailyLogRelPath` (default vazio → usa `~/.forgeclaw/memory/daily`; se populado, usa `{vaultPath}/{relPath}`).
    b) Sempre usar `~/.forgeclaw/memory/daily` e documentar que `vaultPath` e so pointer de contexto (nao fonte de daily log).
  - `BRIEFING-M.md` ja apontou isto como gap M1.
  - Aplicar a mesma logica em:
    - `packages/core/src/memory/janitor.ts` (L33)
    - `packages/core/src/memory/writer.ts` (L27)
    - `packages/dashboard/src/lib/core.ts` (L42)
    - `packages/bot/src/index.ts` (L41)
  - Todos usam o mesmo join `(vaultPath, '05-pessoal', 'daily-log')` — centralizar numa helper `getDailyLogDir(config)`.

### Skills endpoint — acoplamento ao Claude Code CLI

- [ ] `packages/dashboard/src/app/api/skills/route.ts` + `packages/dashboard/src/components/cron-form-sheet.tsx` — **decide**
  - Aponta pra `~/.claude/skills/` (runtime do Claude Code, nao do ForgeClaw). Mensagem L398 do cron-form-sheet.tsx: "Nenhuma skill encontrada em ~/.claude/skills/".
  - **Opcao A (manter):** Assume user tem Claude Code com skills configuradas — provavel pra publico da comunidade.
  - **Opcao B (fallback):** Checar tambem `~/.forgeclaw/skills/`, UI prefere local, fallback pra `~/.claude/skills/`.
  - Se manter, adicionar comment no codigo explicando o acoplamento de design.

### STATE.md com repo privado

- [ ] `.plano/STATE.md` — **sanitize**
  - L22 `Repo: github.com/Ecoupdigital/forgeclaw` → `Repo: <configured in project>` ou simplesmente remover a linha (repo URL nao e contexto necessario para o STATE).
  - Outros findings L28 (personal_name) e L45 (personal_company em comentario) podem ser mantidos como `.plano/` historico.

---

## Acoes medium

### Historico `.plano/` (tratar em bulk, whitelist no CI)

- [ ] `.plano/BRIEFING-M.md` — **move** para `.plano/archive/`
  - Ja resolvido pelas Fases 18+. Cita `/home/vault/05-pessoal/daily-log` em contexto de bug report. Nao distribui runtime.

- [ ] `.plano/ROADMAP.md` (L219) — **sanitize**
  - Trocar `/home/vault` em L219 por `~/.forgeclaw/memory/daily` (a propria linha ja descreve o fix correto).

- [ ] `.plano/CODE-REVIEW-M.md`, `.plano/fases/18-core-hardening/18-01-*`, demais planos antigos — **no-op**
  - Historico auditavel. O plano 23-03 (CI guard) deve whitelist `.plano/fases/` com excecao para categorias `bot_token_fragment`, `personal_userid`, `personal_handle`, `personal_company` e `private_repo_url`, que nao podem existir nem em historico.

- [ ] Planos 23-01, 23-02, 23-03, 24-*, 25-*, 26-*, 27-*, 29-*, 30-*, 31-* (todos os planos das fases 23-31) — **no-op**
  - Citam contexto pessoal porque sao planos para remover esse contexto. Legitimo. Whitelist no CI.

- [ ] `.plano/fases/23-...*/23-01-PLAN.md`, `23-02-PLAN.md`, `23-03-PLAN.md`, `AUDIT-REPORT.md` — **no-op (meta)**
  - AUDIT-REPORT.md e output determinista do scanner: nao editar manualmente.

### Script do proprio auditor

- [ ] `scripts/audit-personal-context.ts` — **no-op**
  - Os findings em `scripts/audit-personal-context.ts` sao os proprios regex literais (pattern strings com "Jonathan", "lfpro", etc.). Esperado. O CI guard do 23-03 deve whitelist este arquivo na categoria self-reference.

---

## Acoes informativas (verificar, nao necessariamente agir)

- [ ] Confirmar se `packages/core/src/state-store.ts` tem outras PII alem do exemplo em comentario L1126. Varredura nao achou outras.
- [ ] Confirmar se existe cópia commitada de `~/.forgeclaw/HEARTBEAT.md` no repo como exemplo. Varredura do scanner não achou, mas verificar manualmente via `grep -rn HEARTBEAT packages/` se algum template hardcoded ficou.
- [ ] Rodar `git log --all --oneline | wc -l` e avaliar custo de `git filter-repo` vs manter historico sujo mas protegido por `.gitignore` e whitelist.

---

## Resumo numerico (do AUDIT-REPORT.md)

| Severidade | Quantidade |
|-----------:|-----------:|
| critical   | 428        |
| high       | 762        |
| medium     | 90         |
| **total**  | **1280**   |

| Categoria              | Findings |
|------------------------|---------:|
| hardcoded_path         | 753      |
| personal_name          | 170      |
| personal_client        | 103      |
| vault_structure        | 88       |
| personal_company       | 85       |
| private_repo_url       | 34       |
| private_skill_dep      | 33       |
| personal_handle        | 6        |
| personal_userid        | 4        |
| bot_token_fragment     | 3        |
| playwright_snapshot    | 1        |

**Foco cirurgico (nao-`.plano/`, nao-`scripts/`):** 19 arquivos com ~60 findings de produto real. Lista em "Acoes criticas" e "Acoes high" cobre todos eles.
