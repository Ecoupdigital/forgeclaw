---
phase: 31-alpha-com-cinco-membros-da-comunidade
plan: 31-02
subsystem: alpha-ops
tags: [alpha, ops, templates, runbook, observation, bug-triage, friction-log, deferred]
dependency_graph:
  requires:
    - "31-01 (6 artefatos copy-paste: CANDIDATES, INVITE, CALL-SCRIPT, FEEDBACK, OBSERVATION, PLAYBOOK)"
    - "29-02 (ops/gate/access.ts — invocado durante kickoff call D0)"
    - "30 (README + docs + video-script — materiais que alphas consomem sem ajuda)"
    - "24 (5 arquetipos referenciados no observation sheet e feedback form)"
  provides:
    - "DAILY-STANDUP.md — log agregado dia-a-dia com 10 entradas placeholder (T-1 ate D+8)"
    - "BUG-TRIAGE.md — matriz de gravidade critico <=24h / medio <=3d / menor pos-alpha + fluxo + tabela + estatisticas"
    - "FRICTION-LOG.md — 7 categorias + diferenciacao friction vs bug + slot para top 5 pos-cutoff"
    - "ALPHA-EXECUTION-RUNBOOK.md — runbook ponta-a-ponta para as 5 tarefas humanas do PLAN 31-02"
  affects:
    - "31-03 (consumira BUG-TRIAGE + FRICTION-LOG + observations/ + feedback-responses.csv para relatorio final e decisao de release)"
tech_stack:
  added: []
  patterns:
    - "Templates criados antes da execucao (placeholders explicitos + estrutura pronta) — alinha com padrao do PLAN 31-01"
    - "Tarefas humanas (checkpoint:human-action) consolidadas em runbook unico, evitando Jonathan precisar cruzar 5 docs diferentes em campo"
    - "Cada secao do runbook replica o <verify><automated> do plano para Jonathan auto-verificar saida antes de avancar"
key_files:
  created:
    - ".plano/fases/31-*/DAILY-STANDUP.md"
    - ".plano/fases/31-*/BUG-TRIAGE.md"
    - ".plano/fases/31-*/FRICTION-LOG.md"
    - ".plano/fases/31-*/ALPHA-EXECUTION-RUNBOOK.md"
  modified: []
decisions:
  - "Tarefas 1, 2, 5, 6, 7 do plano sao checkpoint:human-action e NAO podem ser executadas pelo agente — marcadas como DEFERRED e consolidadas no ALPHA-EXECUTION-RUNBOOK.md"
  - "Criado um runbook unico (ALPHA-EXECUTION-RUNBOOK.md) em vez de 5 runbooks separados — Jonathan segue fluxo cronologico sem pular entre arquivos. Scope limita-se a TAREFAS do PLAN 31-02; contexto conceitual continua em ALPHA-PLAYBOOK.md (criado em 31-01)."
  - "Conteudo dos templates reproduzido EXATAMENTE como especificado no <action> do plano (bloco EXATO). Zero desvio criativo, consistencia sobre originalidade (principio 4)."
  - "DAILY-STANDUP.md tem 10 entradas placeholder (T-1, D0, D1..D7, D+8), nao 9, para cobrir todo o ciclo (plano exige >=9 no verify)."
metrics:
  duration_seconds: 224
  duration_minutes: 4
  completed_date: "2026-04-21T17:29:58Z"
  tasks_completed_auto: 2
  tasks_deferred_human: 5
  files_created: 4
  commits: 3
---

# Fase 31 Plano 02: Execucao + Observacao + Iteracao Summary

Criados 4 artefatos de suporte para a execucao do alpha (DAILY-STANDUP.md, BUG-TRIAGE.md, FRICTION-LOG.md, ALPHA-EXECUTION-RUNBOOK.md) em `.plano/fases/31-*/`. O PLAN 31-02 tinha 7 tarefas, das quais 2 eram criaveis pelo agente (templates auto) e 5 eram acoes humanas inevitaveis de Jonathan em campo (convites, kickoff call, 7 dias de observacao, coleta de CSV). As 5 acoes humanas foram deferidas com runbook consolidado acionavel.

## O que foi entregue (tarefas auto)

### 1. DAILY-STANDUP.md (commit 0529f8f)

Log agregado dia-a-dia com:

- Cabecalho explicativo + cross-refs pra observations/ + BUG-TRIAGE + FRICTION-LOG
- Formato padrao por dia (pontos, grants, bugs reportados, bugs fixados, friction, alphas silenciosos, acao amanha)
- 10 entradas placeholder: T-1 (Confirmacao), D0 (Kickoff + Install), D1..D7 (D3 marcado como Mid-alpha checkpoint, D6 como recado de cut-off, D+7 como Cut-off), D+8 (Fechamento)

Estrutura pronta para Jonathan preencher durante o alpha sem pensar em formato.

### 2. BUG-TRIAGE.md (commit 0a4dd6e)

Template de triagem com:

- **Matriz de gravidade** com 3 niveis + SLA: Critico (<=24h, impede install/uso basico), Medio (<=3 dias, feature trava mas tem workaround), Menor (pos-alpha, detalhe que nao afeta fluxo principal).
- **Fluxo por bug** em 6 passos (alpha reporta → issue GitHub com label → entry aqui → fix → atualiza status → comunica no grupo se critico).
- **Tabela de log** com 10 colunas (data, alpha, gravidade, titulo, descricao, issue URL, status, fix commit, notas).
- **Secao de estatisticas** pra preencher no D+8 (total de bugs, contagem por severidade, % SLA atingido).

### 3. FRICTION-LOG.md (commit 0a4dd6e)

Template de friction log com:

- **Definicao clara do que e friction** (mensagem confusa, fluxo contra-intuitivo, label ruim, falta de feedback visual, onboarding vague, docs ambigua, performance percebida).
- **Definicao clara do que NAO e friction** (crash, feature nao responde, dado nao salva, erro nao tratado — tudo isso vai pro BUG-TRIAGE).
- **Tabela de log** com 7 colunas (data, alpha, categoria, descricao, gravidade 0-5, proposta de fix).
- **7 categorias fixas** (onboarding, install, dashboard, telegram, docs, harness, other).
- **Slot "Top 5 frictions apos cut-off"** para preencher no D+8 — input direto pra PLAN 31-03.

### 4. ALPHA-EXECUTION-RUNBOOK.md (commit 7564f9f)

Runbook consolidado cobrindo as 5 tarefas humanas deferidas:

- **Secao 1** (Task 1 — T-2 a T-1): convidar os 5 alphas via DM personalizando `{NOME}` + `{QUANDO_ENTROU}`, coletar GitHub username/SO/nivel tecnico/arquetipo, atualizar `ALPHA-CANDIDATES.md`. Inclui regra de pausa (<5 aceites → pausar fase).
- **Secao 2** (Task 2 — T-1): criar grupo privado Telegram "ForgeClaw Alpha 01", enviar confirmacao DM aos 5, postar boas-vindas. Inclui pre-requisito critico de ter formulario Tally publicado antes (criar se ausente).
- **Secao 3** (Task 5 — D0): kickoff call com 7 blocos do script + grant ao vivo via `bun run ops/gate/access.ts grant <user> --member-email=<email> --note="alpha fase 31 $(date +%Y-%m-%d)"` + gravacao salva em `recordings/kickoff-YYYY-MM-DD.mp4` + criacao dos 5 arquivos de observation sheet.
- **Secao 4** (Task 6 — D0 tarde ate D+7): ritual diario de 5-10 min em 5 passos (ler grupo, preencher sheets, triagem de bugs com issue + fix pra criticos, registro de friction sem fix, resumo em DAILY-STANDUP). Reforca regra "NAO AJUDAR nas primeiras 24h" com mensagem padrao.
- **Secao 5** (Task 7 — D+6 a D+8): reforco publico D+6, cut-off D+7 com DM pra faltantes, trancar formulario D+7 23h, export CSV D+8 com comando de move pra caminho canonico `.plano/fases/31-*/feedback-responses.csv`, conferir cobertura (5/4/3 respostas).

Cada secao tem checkboxes rastreaveis + bloco `<verify>` bash que espelha o `<verify><automated>` do plano, permitindo Jonathan auto-validar cada etapa antes de seguir.

## Tarefas executadas

| # | Tipo | Status | Commit |
|---|------|--------|--------|
| 1 | checkpoint:human-action | DEFERRED (runbook secao 1) | N/A (humana) |
| 2 | checkpoint:human-action | DEFERRED (runbook secao 2) | N/A (humana) |
| 3 | auto | COMPLETO | 0529f8f |
| 4 | auto | COMPLETO | 0a4dd6e |
| 5 | checkpoint:human-action | DEFERRED (runbook secao 3) | N/A (humana) |
| 6 | checkpoint:human-action | DEFERRED (runbook secao 4) | N/A (humana) |
| 7 | checkpoint:human-action | DEFERRED (runbook secao 5) | N/A (humana) |

## Criterios de Sucesso deste Summary

- [x] Todas tarefas TEMPLATE executadas (tasks 3 e 4 — DAILY-STANDUP, BUG-TRIAGE, FRICTION-LOG)
- [x] Tarefas humanas DEFERRED com runbook claro (ALPHA-EXECUTION-RUNBOOK.md com 5 secoes)
- [x] BUG-TRIAGE.md criado com matriz de gravidade + fluxo + tabela + estatisticas
- [x] FRICTION-LOG.md criado com 7 categorias + diferenciacao vs bug + slot top 5
- [x] DAILY-STANDUP.md criado com 10 entradas placeholder (cobre verify >=9)
- [x] `bun run audit:personal:ci` passa (0 critical findings)
- [x] SUMMARY.md criado (este arquivo)
- [ ] STATE.md e ROADMAP.md atualizados (proxima etapa, via up-tools)

## Criterios de Sucesso do PLAN 31-02 (quanto podemos verificar agora)

Os 10 criterios listados no plano so ficam verdadeiros APOS a execucao humana. Deixamos eles aqui marcados como N/A (DEFERRED) pra quando Jonathan rodar o runbook:

- [ ] `ops/gate/access-log.jsonl` contem >=5 entries novas com action=grant do D0 — DEFERRED (D0)
- [ ] `bun run ops/gate/access.ts list` mostra os 5 alphas — DEFERRED (D0)
- [ ] `observations/` tem 5 arquivos individuais com campos D0-D+7 preenchidos — DEFERRED (D0 a D+7)
- [ ] `DAILY-STANDUP.md` tem >=9 entradas diarias preenchidas — DEFERRED (template criado, preenchimento diario durante alpha)
- [ ] `BUG-TRIAGE.md` tem todos bugs criticos com status=fixed + fix commit — DEFERRED (durante alpha)
- [ ] `FRICTION-LOG.md` acumula friction points — DEFERRED (durante alpha)
- [ ] Gravacao `recordings/kickoff-*.mp4` existe — DEFERRED (D0)
- [ ] `feedback-responses.csv` tem >=3 respostas — DEFERRED (D+8)
- [ ] Nenhuma evidencia de ajuda individualizada nas 24h — DEFERRED (auditavel apos alpha)
- [ ] Bugs criticos tem issue linkada em github.com/Ecoupdigital/forgeclaw/issues — DEFERRED (durante alpha)

## Desvios do Plano

### Issues Auto-corrigidos

Nenhum. Tarefas 3 e 4 executadas exatamente conforme `<action>` do plano (bloco EXATO especificado).

### Decisoes de escopo (nao sao desvios)

**Decisao 1: 5 tarefas humanas DEFERRED em vez de paradas como checkpoints.**

O PLAN 31-02 marca 5 das 7 tarefas como `type="checkpoint:human-action"`. Por protocolo normal de execucao, atingir um `checkpoint:*` pararia o agente e retornaria para Jonathan. Neste caso, porem, o objetivo explicito da execucao parcial e:

1. Criar os artefatos que o agente consegue (DAILY-STANDUP, BUG-TRIAGE, FRICTION-LOG)
2. Consolidar as tarefas humanas em runbook acionavel (em vez de parar com 5 checkpoints separados)
3. Marcar as 5 tarefas como DEFERRED para execucao humana futura

Essa abordagem e explicita no prompt da execucao (`<important>: tarefas que requerem humanos... marcar como DEFERRED. Tarefas que podem ser feitas agora... executar`). Alinhado com o principio de "correto, nao rapido" — o valor esta em deixar Jonathan com tudo pronto pra executar o alpha, nao em parar 5 vezes seguidas pedindo confirmacao.

**Decisao 2: Criado ALPHA-EXECUTION-RUNBOOK.md (arquivo extra alem dos 3 templates especificados no plano).**

O plano especifica criar DAILY-STANDUP + BUG-TRIAGE + FRICTION-LOG. O `<context_extra>` do prompt da execucao adiciona "Runbook de coleta do CSV do formulario (instrucoes pro Jonathan)". Interpretamos isso como pedido mais amplo de runbook consolidado para TODAS as 5 tarefas humanas (nao so CSV), porque:

- A execucao humana e continua ao longo de 14 dias
- Jonathan precisa de um unico ponto de referencia em campo (vs cruzar PLAYBOOK + 5 tasks do PLAN)
- As 5 tarefas humanas compartilham contexto forte (regra "NAO AJUDAR", mesmo fluxo de bug-fix, mesmas pessoas)

Este arquivo complementa — nao substitui — o ALPHA-PLAYBOOK.md criado em 31-01. O PLAYBOOK da visao estrategica (por que, quando, fases). O RUNBOOK da execucao tactica (o que fazer agora, com que comando).

### Issues Adiados

Nenhum dos templates tem issue aberto. Templates estao 100% prontos para preenchimento.

**Items out-of-scope identificados (nao corrigidos):**

- Existem arquivos untracked e modificacoes pre-existentes no repo (`packages/bot/src/handlers/text.ts`, `packages/core/src/ws-server.ts`, varios `.gitkeep` em outras fases) — nao relacionados ao PLAN 31-02, deixados intactos.

## Self-Check: PASSOU

**Arquivos criados (4/4):**

- ENCONTRADO: `.plano/fases/31-*/DAILY-STANDUP.md`
- ENCONTRADO: `.plano/fases/31-*/BUG-TRIAGE.md`
- ENCONTRADO: `.plano/fases/31-*/FRICTION-LOG.md`
- ENCONTRADO: `.plano/fases/31-*/ALPHA-EXECUTION-RUNBOOK.md`

**Commits (3/3):**

- ENCONTRADO: 0529f8f — chore(31-02): add daily standup log template with T-1 through D+8 entries
- ENCONTRADO: 0a4dd6e — chore(31-02): add bug triage and friction log templates
- ENCONTRADO: 7564f9f — chore(31-02): add alpha execution runbook for deferred human actions

**Verificacoes automatizadas do plano (tasks 3 e 4):**

- PASS: Task 3 (DAILY-STANDUP tem D0 Kickoff + D3 Mid-alpha + D+7 Cut-off)
- PASS: Task 4 (BUG-TRIAGE tem Matriz de gravidade + Critico; FRICTION-LOG tem Top 5 frictions)

**Qualidade adicional:**

- `bun run audit:personal:ci`: PASS (0 critical findings in distributed code)
- Zero dados pessoais reais nos 4 artefatos (100% template com placeholders)
- Cross-referencias entre templates validadas (DAILY-STANDUP aponta pra BUG-TRIAGE + FRICTION-LOG + observations/; RUNBOOK aponta pros 3 templates + 6 artefatos da 31-01)

## Proximas acoes

Jonathan deve:

1. Executar `ALPHA-EXECUTION-RUNBOOK.md` seguindo secoes 1-5 em ordem cronologica (T-2 ate D+8, ~14 dias).
2. Preencher os 3 templates (DAILY-STANDUP, BUG-TRIAGE, FRICTION-LOG) diariamente durante o alpha.
3. Criar os 5 arquivos `observations/<username>.md` no D0 a partir de `ALPHA-OBSERVATION-SHEET.md`.
4. Ao final do alpha (D+8), confirmar que todos os 10 criterios de sucesso do PLAN 31-02 estao atendidos.
5. Abrir PLAN 31-03 para consolidacao, relatorio e decisao de release geral.

## Paralelo com 31-03

O PLAN 31-03 (paralelo — sendo executado por outro agente) cria os artefatos de ANALISE que consomem os outputs deste plano:

- `scripts/analyze-feedback.ts` — le `feedback-responses.csv` gerado pelo runbook secao 5
- `POST-ALPHA-REPORT-TEMPLATE.md` — consome BUG-TRIAGE + FRICTION-LOG + observations/ + CSV
- `RELEASE-DECISION.md` — decisao final go/no-go

Arquivos disjuntos garantem zero conflito de merge entre os dois planos.
