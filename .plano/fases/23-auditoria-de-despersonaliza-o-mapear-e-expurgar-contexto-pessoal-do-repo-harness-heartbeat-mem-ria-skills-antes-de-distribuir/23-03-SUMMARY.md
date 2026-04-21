---
phase: 23-auditoria-de-despersonalizacao
plan: 23-03
subsystem: ci-guardrails
tags: [audit, ci, github-actions, pre-commit, regression-guard, despersonalizacao]
dependency_graph:
  requires: [23-01, 23-02]
  provides:
    - ci-gate-contra-regressao-de-contexto-pessoal
    - allowlist-auditavel-com-justificativa
    - pre-commit-hook-opt-in
    - audit:personal:ci-npm-script
  affects:
    - scripts/audit-personal-context.ts
    - .github/workflows/audit-personal-context.yml
    - .githooks/pre-commit
    - .audit-personal-allowlist.txt
    - package.json
    - README.md
tech_stack:
  added: []
  patterns:
    - "Scanner --ci flag: filter por isDistributed + allowlist exact-match -> exit 0/1"
    - "Allowlist exact-match (file:line:category): line shifts forcam re-revisao (desejado)"
    - "GitHub Actions com oven-sh/setup-bun@v2 + upload-artifact@v4 em caso de falha"
    - "Pre-commit hook opt-in via git config core.hooksPath .githooks (NAO forca)"
    - "Graceful fallback no hook quando bun nao esta instalado"
key_files:
  created:
    - .github/workflows/audit-personal-context.yml
    - .githooks/pre-commit
    - .audit-personal-allowlist.txt
    - .plano/fases/23-.../23-03-SUMMARY.md
  modified:
    - scripts/audit-personal-context.ts
    - package.json
    - README.md
decisions:
  - "Allowlist com match EXATO por file:line:category — se linha deslocar, match quebra e forca re-revisao. Preferido sobre fuzzy/context-match porque flag genuina rotativa-por-refactor e aceitavel (humano checa e re-emite entry)."
  - "Categoria whitelisting (ex: ignorar .plano/) feito por PATH prefix, nao por categoria. Mais simples e garante que tokens nunca escapam mesmo em historico."
  - "Pre-commit hook e OPT-IN, nao forcado. Alguns contribuidores podem usar apenas partes do repo (ex: dashboard via node+better-sqlite3) e forcar bun quebra fluxo."
  - "Workflow roda em push e PR para main — redundante mas desejado: pega regressao tanto de direct push quanto de merge."
  - "Generate report + upload artifact apenas em failure. Sem isso o dev precisa clonar localmente para debugar; artefato de 14 dias e suficiente para triagem."
  - "Scanner --ci nao escreve markdown nem json. Contrato simples: stdin/stderr log + exit code. CI consome so exit code."
metrics:
  duration_seconds: 138
  duration_human: "2m 18s"
  tasks_completed: 6
  files_modified: 3
  files_created: 4
  commits: 5
  completed_at: "2026-04-21T11:01:39Z"
---

# Fase 23 Plano 23-03: Guard Rails Anti-Regressao — Summary

Blindou o repo ForgeClaw contra reintroducao futura de contexto pessoal. O scanner do 23-01 virou gate de CI com allowlist auditavel, pre-commit hook opt-in e documentacao no README — todo commit e PR agora e verificado automaticamente antes de mergear em `main`.

## One-liner

CI guardrail completo em 5 pecas integradas: scanner ganhou modo `--ci` (85 linhas adicionadas), `.audit-personal-allowlist.txt` suporta suppressoes exact-match com justificativa, GitHub Actions workflow roda em push/PR e sobe artefato de relatorio em falha, `.githooks/pre-commit` opt-in bloqueia commits locais, README documenta o fluxo na secao Developer Tooling. Teste de regressao E2E prova o loop completo (inject -> gate block -> allowlist suppress -> cleanup).

## Tarefas

| # | Tarefa | Commit | Arquivos chave |
|---|--------|--------|----------------|
| 1 | Estender scanner com modo `--ci` | `5c047a4` | scripts/audit-personal-context.ts (+89 -3) |
| 2 | Criar `.audit-personal-allowlist.txt` | `9bfb2b8` | .audit-personal-allowlist.txt (novo, 32 linhas) |
| 3 | Adicionar script `audit:personal:ci` | `8d9a633` | package.json (+1 -0) |
| 4 | Criar workflow GitHub Actions | `ded25ff` | .github/workflows/audit-personal-context.yml (novo, 39 linhas) |
| 5 | Pre-commit hook + documentar no README | `54b4fec` | .githooks/pre-commit (novo, executavel), README.md (+28) |
| 6 | Teste de regressao E2E | (sem commit — validacao) | (usa arquivos temporarios) |

## O que foi entregue

1. **`scripts/audit-personal-context.ts`** — novo modo `--ci` (89 linhas adicionadas ao arquivo existente do 23-01). Le `.audit-personal-allowlist.txt`, filtra findings `critical` para codigo distribuido (fora de `.plano/`, `node_modules/`, `.git/`), exit 0 se zero findings restantes ("AUDIT PASS"), exit 1 com listing detalhado caso contrario. Nao emite markdown/json (contrato de CI gate).

2. **`.audit-personal-allowlist.txt`** — arquivo de suppressoes com formato documentado (`<file>:<line>:<category>  # <justificativa>`). Match EXATO por linha — se arquivo for editado e linha deslocar, match quebra e forca re-revisao da suppression. Cabecalho documenta regras de uso, categorias validas e escopo do gate. Zero entries ativos (repo limpo pos 23-02).

3. **`.github/workflows/audit-personal-context.yml`** — GitHub Actions roda em push e PR para `main`. Usa `actions/checkout@v4` + `oven-sh/setup-bun@v2`. Invoca `bun run audit:personal:ci`. Em falha, gera `audit-report.md` completo e sobe como artifact com retencao de 14 dias. Timeout generoso de 5 minutos (scanner completa em < 30s).

4. **`.githooks/pre-commit`** — hook opt-in (usuario habilita com `git config core.hooksPath .githooks`). Roda `bun run audit:personal:ci` antes de commit, bloqueia em exit 1 com mensagem clara apontando para allowlist. Fallback gracil se bun nao instalado. Bypass via `git commit --no-verify` documentado. Permissao `0755` aplicada.

5. **`package.json`** — novo script `audit:personal:ci` invocando o scanner com flag `--ci`.

6. **`README.md`** — nova secao `## Developer Tooling` antes de `## License` documentando os 3 comandos audit (`audit:personal`, `audit:personal:json`, `audit:personal:ci`), o workflow, o allowlist e como habilitar o hook.

## Verificacao Funcional

Todas as verificacoes automated dos tasks passaram:

**Task 1 — scanner --ci mode:**
```bash
$ bun run scripts/audit-personal-context.ts --ci
AUDIT PASS — 0 critical findings in distributed code.
$ echo $?
0
```

**Task 2 — allowlist exists com documentacao:**
```bash
$ test -f .audit-personal-allowlist.txt && grep -q 'Formato:' .audit-personal-allowlist.txt && echo OK
OK
```

**Task 3 — npm script:**
```bash
$ bun run audit:personal:ci
$ bun run scripts/audit-personal-context.ts --ci
AUDIT PASS — 0 critical findings in distributed code.
$ echo $?
0
```

**Task 4 — workflow file:**
```bash
$ test -f .github/workflows/audit-personal-context.yml && grep -q 'audit:personal:ci' ... && grep -q 'oven-sh/setup-bun' ...
VERIFY OK
```

**Task 5 — hook executavel + README:**
```bash
$ test -x .githooks/pre-commit && .githooks/pre-commit && grep -q 'audit:personal:ci' README.md
[pre-commit] Running personal context audit...
AUDIT PASS — 0 critical findings in distributed code.
VERIFY OK
```

**Task 6 — teste de regressao end-to-end:**

Loop completo validado em 6 passos:

| # | Acao | Resultado esperado | Resultado observado |
|---|------|--------------------|---------------------|
| 1 | Criar `packages/core/src/__regression_test.ts` com `/home/vault/05-pessoal/daily-log` | Arquivo existe com string proibida | OK |
| 2 | Rodar `bun run audit:personal:ci` | exit 1, finding listado | `AUDIT FAIL — 1 critical findings ... packages/core/src/__regression_test.ts:1 [hardcoded_path]` — exit 1 |
| 3 | Adicionar `packages/core/src/__regression_test.ts:1:hardcoded_path  # regression test fixture` ao allowlist | Entry presente | OK |
| 4 | Rodar `bun run audit:personal:ci` novamente | exit 0 (finding suppressado) | `AUDIT PASS — 0 critical findings in distributed code.` — exit 0 |
| 5 | Remover arquivo + remover entry do allowlist | Working tree limpo (fora mudancas nao relacionadas) | OK |
| 6 | Rodar `bun run audit:personal:ci` final | exit 0 | `AUDIT PASS` — exit 0 |

Gate funciona: bloqueia regressao real (step 2), allowlist suppressa quando justificado (step 4), repo permanece limpo apos cleanup (step 6).

## Desvios do Plano

Nenhum. Plano executado exatamente como escrito.

**Observacao sobre arquivos nao-relacionados no working tree:** os arquivos `packages/bot/src/handlers/text.ts` e `packages/core/src/ws-server.ts` estao com mudancas nao commitadas relacionadas a outro trabalho em paralelo (agent system prompt via `--append-system-prompt-file`). Nao foram tocados neste plano; permanecem pendentes para outro recorte. Escolha deliberada de stage seletivo por arquivo em todos os commits do 23-03 para nao contaminar o escopo.

## Criterios de sucesso

- [x] `bun run audit:personal:ci` existe e retorna 0 em repo limpo, 1 com regressao.
- [x] `.audit-personal-allowlist.txt` suporta suppressions por `file:line:category` com justificativa.
- [x] `.github/workflows/audit-personal-context.yml` roda em push + PR na main.
- [x] Workflow sobe relatorio completo como artifact em caso de falha.
- [x] `.githooks/pre-commit` e executavel, documentado como opt-in no README.
- [x] Teste de regressao: injetar `/home/vault` em `packages/` faz CI falhar; remover faz passar.
- [x] README documenta o tooling (secao Developer Tooling).

## Handoff para proxima fase

**Fase 23 completa.** Os proximos recortes no roadmap (Fases 24+: templates por arquetipo, CLI installer, persona entrevistador, dashboard onboarding, docs, alpha) podem assumir que:

1. O repo distribuido esta limpo de PII (23-02).
2. CI bloqueia regressao automaticamente (23-03).
3. Qualquer contexto pessoal introduzido por desenvolvedores futuros quebra o PR antes de merge — o gate e parte do contrato do repo agora.

## Self-Check: PASSOU

**Arquivos criados confirmados:**
```bash
$ test -f .github/workflows/audit-personal-context.yml && echo ENCONTRADO
ENCONTRADO
$ test -x .githooks/pre-commit && echo ENCONTRADO
ENCONTRADO
$ test -f .audit-personal-allowlist.txt && echo ENCONTRADO
ENCONTRADO
```

**Arquivos modificados confirmados:**
- `scripts/audit-personal-context.ts` — ENCONTRADO (commit `5c047a4`)
- `package.json` — ENCONTRADO (commit `8d9a633`)
- `README.md` — ENCONTRADO (commit `54b4fec`)

**Commits confirmados:**
- `5c047a4` feat(23-03): add --ci mode to audit-personal-context scanner — ENCONTRADO
- `9bfb2b8` chore(23-03): add .audit-personal-allowlist.txt with no active entries — ENCONTRADO
- `8d9a633` chore(23-03): add audit:personal:ci npm script — ENCONTRADO
- `ded25ff` feat(23-03): add GitHub Actions workflow for personal context audit — ENCONTRADO
- `54b4fec` feat(23-03): add optional pre-commit hook + document audit tooling — ENCONTRADO

**Gate funcional:** AUDIT PASS em repo limpo, AUDIT FAIL na injecao de regressao — validado end-to-end.
