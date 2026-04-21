---
phase: 23-auditoria-de-despersonalizacao
plan: 23-01
subsystem: audit-tooling
tags: [audit, despersonalizacao, distribuicao, pre-release]
requires: []
provides:
  - scripts/audit-personal-context.ts
  - .plano/fases/23-.../AUDIT-REPORT.md
  - .plano/fases/23-.../CLEANUP-CHECKLIST.md
  - .plano/fases/23-.../COVERAGE-VALIDATION.md
  - npm script audit:personal
  - npm script audit:personal:json
affects:
  - plano 23-02 consome AUDIT-REPORT + CLEANUP-CHECKLIST como input de cleanup
  - plano 23-03 consome o mesmo scanner como base do CI guard
tech-stack:
  added: []
  patterns:
    - regex-based multi-category scanner
    - markdown + JSON dual-output CLI
    - self-output exclusion via IGNORE_FILE_NAMES
key-files:
  created:
    - scripts/audit-personal-context.ts
    - .plano/fases/23-auditoria-de-despersonaliza-o-mapear-e-expurgar-contexto-pessoal-do-repo-harness-heartbeat-mem-ria-skills-antes-de-distribuir/AUDIT-REPORT.md
    - .plano/fases/23-auditoria-de-despersonaliza-o-mapear-e-expurgar-contexto-pessoal-do-repo-harness-heartbeat-mem-ria-skills-antes-de-distribuir/CLEANUP-CHECKLIST.md
    - .plano/fases/23-auditoria-de-despersonaliza-o-mapear-e-expurgar-contexto-pessoal-do-repo-harness-heartbeat-mem-ria-skills-antes-de-distribuir/COVERAGE-VALIDATION.md
  modified:
    - package.json
decisions:
  - "IGNORE_FILE_NAMES adicionado ao scanner para evitar loop de auto-referencia apos primeiro run"
  - "Scanner NAO varre .playwright-mcp/ internamente — apenas registra presenca como finding critical (evita poluir findings com KB de HTML/yml)"
  - "bun.lock implicitamente excluido via limite de 5MB (arquivo tem 190KB mas nao tem extensao TEXT_EXTS relevante)"
  - "Severity default = high em caso de duvida (conservador: prefere false-positive a false-negative)"
  - ".plano/ sera whitelisted no CI guard do 23-03, exceto categorias token/handle/userid que nao podem existir nem em historico"
metrics:
  duration: "~1h"
  completed: "2026-04-21"
  tasks: 5
  commits: 6
  files_scanned: 333
  findings_total: 1280
  findings_critical: 428
  findings_high: 762
  findings_medium: 90
---

# Fase 23 Plano 23-01: Auditoria Automatizada de Contexto Pessoal — Summary

One-liner: Scanner TypeScript determinista (zero deps, 318 linhas) que varre o repo ForgeClaw inteiro com 27 regras regex agrupadas em 11 categorias de contexto pessoal, produz AUDIT-REPORT.md (1280 findings em 97 arquivos) e CLEANUP-CHECKLIST.md acionavel, base direta dos planos 23-02 e 23-03.

## O que foi entregue

1. **`scripts/audit-personal-context.ts`** — scanner standalone executavel via `bun run scripts/audit-personal-context.ts`. Ignora `node_modules`, `.git`, `dist`, `.next`, `coverage`, `.gitnexus`; registra `.playwright-mcp/` como 1 finding critical sem varrer dentro (evita poluir KB de HTML/yml); exclui os proprios outputs (`AUDIT-REPORT.md`, `CLEANUP-CHECKLIST.md`, `COVERAGE-VALIDATION.md`) via `IGNORE_FILE_NAMES`. Suporta `--json` e `--out=<path>`.
2. **`package.json`** — scripts `audit:personal` e `audit:personal:json` wiring o scanner para execucao na raiz do monorepo.
3. **`AUDIT-REPORT.md`** (285 KB, 2340 linhas) — relatorio markdown com sumario por severidade, sumario por categoria, e tabela de findings por arquivo. 97 arquivos com findings reais.
4. **`CLEANUP-CHECKLIST.md`** (191 linhas) — acoes tipadas (sanitize / delete / replace / move / parametrize / decide / no-op) agrupadas por severidade e subtema (tokens e handles vazados, snapshots, prompts do core, codigo runtime, URLs privadas, systemd, installer defaults, context builder). Cobre 19 arquivos de produto real com ~60 findings.
5. **`COVERAGE-VALIDATION.md`** — artefato auditavel provando que os 10 arquivos-alvo conhecidos (janitor.md, writer.md, memory-manager.ts, mock-data.ts, .continue-aqui.md, README.md, STATE.md, install.ts, ambos `.service`) aparecem no relatorio com as categorias esperadas. Zero MISS.

## Tarefas

| # | Titulo                                           | Commit    | Arquivos                                           |
|---|--------------------------------------------------|-----------|----------------------------------------------------|
| 1 | Criar scanner                                    | `9c40a67` | scripts/audit-personal-context.ts                 |
| 2 | Wire npm scripts                                 | `c5f5432` | package.json                                       |
| 3 | Gerar AUDIT-REPORT.md                            | `0dd4496` | .plano/fases/23-.../AUDIT-REPORT.md + 23-01-PLAN.md |
| 4 | Derivar CLEANUP-CHECKLIST.md                     | `e94177e` | .plano/fases/23-.../CLEANUP-CHECKLIST.md           |
| 5 | Validar coverage (10 arquivos-alvo, zero MISS)   | `5c1c1ac` | .plano/fases/23-.../COVERAGE-VALIDATION.md         |
| — | Fix: excluir outputs proprios                    | `ed2b445` | scripts/audit-personal-context.ts + AUDIT-REPORT   |

## Descobertas do relatorio (ground truth para 23-02)

**Nucleos criticos (produto real, 19 arquivos):**
- `.continue-aqui.md` — **delete** (9 findings criticos: bot token, user id, handle, URL privada, vault path).
- `.playwright-mcp/` (36 snapshots) — **move** para `.gitignore` + delete.
- `sessions-tab-initial.png`, `sessions-with-real-names.png` — **delete** (screenshots com dados reais).
- `packages/core/src/memory/prompts/janitor.md` + `writer.md` — **sanitize** (prompts do sistema injetam "Jonathan" e clientes reais em toda sessao).
- `packages/core/src/memory-manager.ts` L34 — **sanitize** (comentario "Jonathan is in BRT").
- `packages/core/src/state-store.ts` L1126 — **sanitize** (exemplo de query usa "don-vicente").
- `packages/dashboard/src/lib/mock-data.ts` — **decide/sanitize/delete** (8 paths hardcoded).
- `README.md` L48, L102 — **sanitize** (URL de repo privado Ecoupdigital/forgeclaw).
- `ops/forgeclaw.service`, `ops/forgeclaw-dashboard.service` — **parametrize** (WorkingDirectory hardcoded).
- `packages/cli/src/commands/install.ts` L178, L199 — **sanitize** (defaults `/root/projects`, `/root/obsidian`).

**High priority (parametrizacao):**
- `packages/core/src/context-builder.ts` + memory/janitor.ts + memory/writer.ts + dashboard/lib/core.ts + bot/src/index.ts — centralizar `getDailyLogDir(config)` ao inves de 5 `join(vaultPath, '05-pessoal', 'daily-log')`.

**Medium (historico):**
- `.plano/` inteiro sera whitelisted pelo CI guard do 23-03, exceto tokens/handles/userids que nunca devem existir mesmo em historico.

## Desvios do Plano

### Issues Auto-corrigidos

**1. [Regra 2 — Funcionalidade critica faltando] Scanner precisava excluir seus proprios outputs**

- **Encontrado durante:** task 5 (validacao), ao comparar coverage antes/depois de gerar o report.
- **Issue:** Primeira passada gerou 1280 findings. Segunda passada (com `AUDIT-REPORT.md` ja no disco) gerou 3874 findings — 2594 extras vindos do proprio report scaneando a si mesmo (markdown cita literalmente cada snippet, que volta a bater em cada regex). Para o produto este auditor e meant to be re-run after each cleanup pass no plano 23-02; sem o filtro os numeros drift a cada run.
- **Correcao:** Adicionado `IGNORE_FILE_NAMES` com `AUDIT-REPORT.md`, `CLEANUP-CHECKLIST.md`, `COVERAGE-VALIDATION.md`. Walker pula estes arquivos por nome.
- **Arquivos modificados:** `scripts/audit-personal-context.ts` (+10 linhas), regenerado `AUDIT-REPORT.md`, tuning no header do `CLEANUP-CHECKLIST.md`.
- **Commit:** `ed2b445`
- **Impacto:** Ground truth agora estavel entre runs. Coverage validada pos-fix: 10/10 arquivos-alvo ainda detectados, zero MISS.

Nao houve desvios fora desta correcao.

## Criterios de sucesso

- [x] `bun run audit:personal` executavel da raiz do monorepo sem erro.
- [x] `AUDIT-REPORT.md` gerado com sumario por severidade + categoria + tabela por arquivo (2340 linhas).
- [x] Todos os 10 arquivos-alvo conhecidos aparecem no relatorio (validado por COVERAGE-VALIDATION.md).
- [x] `CLEANUP-CHECKLIST.md` existe com acoes acionaveis por arquivo (sanitize/delete/replace/parametrize/decide).
- [x] `.playwright-mcp/` registrado como `playwright_snapshot` critical (36 snapshots internos).
- [x] Scanner nao tem dependencias externas novas (so `node:fs/promises`, `node:path`).
- [x] Zero findings em `node_modules/`, `bun.lock`, `.git/`.

## Handoff para plano 23-02

O plano 23-02 deve:

1. Abrir `CLEANUP-CHECKLIST.md` e executar acoes **criticas** em ordem (tokens/handles → snapshots → prompts do core → runtime code → URLs → systemd → installer).
2. Apos cada pasta de arquivos saneada, re-rodar `bun run audit:personal --out=.plano/fases/23-.../AUDIT-REPORT.md` e comparar delta.
3. Marcar como done no checklist quando a categoria corresponding chegar a 0 findings no arquivo.
4. Ao final, `bun run audit:personal` deve ter **0 findings criticos em produto** (excluindo `.plano/` historico e `scripts/audit-personal-context.ts` que cita os patterns literais).

## Self-Check: PASSOU

- Arquivos criados: todos presentes.
- Commits: 6/6 presentes no historico.
- Categoria coverage: 10/10 arquivos-alvo detectados (zero MISS).
- Scanner idempotente entre runs (fix ed2b445 garantiu).
