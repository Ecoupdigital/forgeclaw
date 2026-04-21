---
phase: 31-alpha-com-cinco-membros-da-comunidade
plan: 31-03
subsystem: alpha-consolidation
tags: [alpha, ops, docs, release-decision, metrics, go-no-go, consolidation]
dependency_graph:
  requires:
    - "31-01 (ALPHA-FEEDBACK-TEMPLATE.md define as 28 perguntas que viram colunas do CSV)"
    - "31-02 (coletor de feedback + FRICTION-LOG + BUG-TRIAGE serao inputs reais do alpha)"
    - "29-02 (ops/gate/access.ts usado em loop para release em massa se GO)"
  provides:
    - "POST-ALPHA-REPORT-TEMPLATE.md — template 12 secoes do relatorio final"
    - "RELEASE-DECISION.md — 6 criterios Go/No-Go AND travados pre-dados"
    - "analyze-feedback.ts — script Bun zero-dep que parseia CSV e calcula metricas agregadas"
    - "IMPROVEMENTS-BACKLOG.md — template P0/P1/P2 com criterios numericos e cap de 3 P0"
  affects:
    - "release geral do ForgeClaw para a comunidade Dominando AutoIA (gatilho do GO)"
    - "alpha 02 (se NO-GO, vira Fase 32 nova)"
tech_stack:
  added: []
  patterns:
    - "Criterios de decisao travados pre-dados (anti-vies de confirmacao): RELEASE-DECISION.md define 6 gates numericos AND antes do analyze rodar"
    - "Zero-dep CSV analyzer em Bun: parser custom + flexible column resolver por substring match (suporta Tally pt-BR e ids genericos)"
    - "Cap forcado de 3 P0 no IMPROVEMENTS-BACKLOG (mais que 3 = automatic No-Go): anti-feature-creep estrutural"
    - "Defer explicito de tarefas human-action para deferred-items.md quando dependem de dados reais ainda nao coletados"
key_files:
  created:
    - ".plano/fases/31-*/POST-ALPHA-REPORT-TEMPLATE.md"
    - ".plano/fases/31-*/RELEASE-DECISION.md"
    - ".plano/fases/31-*/analyze-feedback.ts"
    - ".plano/fases/31-*/IMPROVEMENTS-BACKLOG.md"
    - ".plano/fases/31-*/deferred-items.md"
  modified: []
decisions:
  - "Tasks 5 e 6 (checkpoint:human-action) foram DEFERRED em deferred-items.md. Executar sem dados reais do alpha violaria principios de 'implementacao real, nao simulacao' e 'dados reais desde o primeiro momento'. Templates + script garantem ~4h de execucao mecanica quando o alpha rodar."
  - "Criterios Go/No-Go foram travados em RELEASE-DECISION.md antes de qualquer dado existir — anti-vies de confirmacao estrutural. Regra AND: falhar 1 de 6 = No-Go."
  - "Cap estrutural de 3 P0 no IMPROVEMENTS-BACKLOG: mais que 3 P0 aparecerem = produto nao esta pronto, automatic No-Go. Previne feature-creep pos-alpha disfarcado de 'fix'."
  - "analyze-feedback.ts usa substring match case-insensitive para resolver colunas do CSV — defensivo contra Tally exportar com header em pt-BR ou com ids hash. Jonathan ajusta array de candidates se algum gate aparecer zerado."
  - "Cobertura de abas (Q14) parseada como multi-select separado por , ; |. Tally e Google Forms exportam multi-select de jeitos diferentes; regex cobre ambos."
metrics:
  duration_seconds: 303
  duration_minutes: 5
  completed_date: "2026-04-21T17:31:26Z"
  tasks_completed: 4
  tasks_deferred: 2
  files_created: 5
  commits: 4
---

# Fase 31 Plano 03: Consolidacao + Decisao de Release Summary

Criados 4 artefatos de consolidacao + decisao de release no diretorio da Fase 31 que formam o pipeline completo pos-alpha: POST-ALPHA-REPORT-TEMPLATE.md (estrutura de 12 secoes), RELEASE-DECISION.md (6 criterios Go/No-Go AND travados pre-dados), analyze-feedback.ts (script Bun zero-dep que parseia CSV e calcula metricas agregadas), IMPROVEMENTS-BACKLOG.md (template P0/P1/P2 com cap de 3 P0). Tarefas de preenchimento com dados reais (Tasks 5-6) foram DEFERRED em `deferred-items.md` — dependem do alpha real que ainda nao rodou.

## O que foi entregue

### 1. POST-ALPHA-REPORT-TEMPLATE.md (commit 3400a44)

Template estruturado em 12 secoes para o relatorio final consolidado:

- **Secao 1:** Sumario executivo (3-5 linhas que um futuro Jonathan leia daqui 6 meses).
- **Secao 2:** Tabela de 5 participantes com nivel, arquetipo, SO, status final.
- **Secao 3:** Metricas agregadas — bloco para colar output do analyze-feedback.ts + tabela de 8 metricas-chave com targets numericos (T2FM mediano/medio, % entrevista, auto-sucesso, cobertura, NPS, estabilidade, bugs criticos).
- **Secao 4:** Top 5 bugs extraidos de BUG-TRIAGE.md (ordem por impacto).
- **Secao 5:** Top 10 friction points (FRICTION-LOG + Q24 cluster).
- **Secao 6-7:** Qualitativo — o que mais amaram (Q23 cluster) e odiaram (Q24 cluster).
- **Secao 8:** Observacoes qualitativas do Jonathan cruzando os 5 observation sheets.
- **Secao 9:** Features mais pedidas (Q27 cluster).
- **Secao 10:** Decisao Go/No-Go com justificativa <=200 palavras + referencia cruzada para RELEASE-DECISION.md.
- **Secao 11:** Proximos passos (branches Go e No-Go separados).
- **Secao 12:** Retrospectiva de processo (nao sobre o produto — sobre como o alpha foi conduzido).

### 2. RELEASE-DECISION.md (commit c53e953)

Documento de decisao formal com os 6 criterios Go/No-Go **travados ANTES dos dados**:

1. **NPS >= 30** (bar baixo aceitavel pra SaaS B2C alpha).
2. **T2FM mediano <= 30 min** (se demora mais, base geral abandona).
3. **>= 4 de 5 alphas completaram entrevista** (gatekeeper do onboarding).
4. **Taxa auto-sucesso >= 80%** (valida que docs sao suficientes sem Jonathan de baba).
5. **Zero bugs criticos abertos** (sem produto-que-nao-instala pra comunidade).
6. **Cobertura de abas media >= 5 de 9** (dashboard e descoberto no uso real).

Regra de **AND absoluto**: falhar 1 gate = No-Go. Rationale por criterio documentado na secao "Por que esses bars?".

Tabela de resultados para preencher pos-alpha + branches GO (release geral) e NO-GO (alpha 02) com checklists acionaveis.

### 3. analyze-feedback.ts (commit 108ac9e)

Script Bun zero-dependencia que parseia feedback-responses.csv e calcula as metricas agregadas definidas em RELEASE-DECISION.md.

**Arquitetura:**

- **CSV parser nativo:** respeita quotes, escape de aspas duplas, CRLF/LF. ~40 linhas.
- **Column resolver flexivel:** `getCol(row, candidates)` faz substring match case-insensitive — aceita header em pt-BR ("T2FM") ou id gerado por Tally. Defensivo: retorna '' se nada bate.
- **Math helpers:** mean, median (sorted copy), toNumber (tolera virgula decimal + lixo de texto).
- **NPS classifier:** 0-6 detractor, 7-8 passive, 9-10 promoter.
- **Output duplo:** texto formatado humano + JSON estruturado para copy-paste no relatorio.
- **5 gate checks** booleanos + verdict agregado (TODOS passaram / ALGUM falhou).

**Runtime verification:** script executa em CSV de 5 linhas (test-feedback.csv) produzindo output esperado — T2FM mediano=25, NPS=20, auto-sucesso=4/5, entrevista=4/5, cobertura abas=4.2. Gate checks renderizados como [X]/[ ] e JSON valido.

### 4. IMPROVEMENTS-BACKLOG.md (commit dc4e98f)

Template de backlog priorizado com 3 tiers e **criterios numericos objetivos**:

- **P0 (blocker do release):** citado por >=3 alphas como friction, OU citado em Q24 por >=2 alphas, OU causou T2FM>60min em algum alpha, OU bug medio em >=2 alphas.
- **P1 (2-4 semanas pos-release):** 1-2 alphas mencionam, OU >=2 mencoes em Q27 feature.
- **P2 (backlog geral):** 1 alpha sem replicacao.

**Regra anti-feature-creep estrutural:** **maximo 3 P0**. Mais que 3 P0 = automatic No-Go (produto nao esta pronto). Isso previne racionalizar "release com 5 P0 porque a gente conserta rapido".

Secao "Extracao automatica" documenta passos mecanicos para derivar o backlog dos 4 inputs (FRICTION-LOG, BUG-TRIAGE, Q27, Q24), reduzindo bias subjetivo de Jonathan.

### 5. deferred-items.md

Documentacao explicita de 5 items adiados (DEFERRED-01 a DEFERRED-05) que dependem de dados reais do alpha ainda nao coletados:

- DEFERRED-01: preencher POST-ALPHA-REPORT.md
- DEFERRED-02: preencher secao "Decisao final" em RELEASE-DECISION.md
- DEFERRED-03: preencher tabelas P0/P1/P2 em IMPROVEMENTS-BACKLOG.md
- DEFERRED-04: comunicacao final aos 5 alphas
- DEFERRED-05: execucao do release (GO) ou planejamento do alpha 02 (NO-GO)

Cada item documenta: estado atual, o que falta, quando executar, dependencia, esforco estimado. Total estimado pos-alpha: ~4h + (1-5 dias se GO) OU (1-3 dias se NO-GO).

## Verificacoes de sucesso

- [x] `POST-ALPHA-REPORT-TEMPLATE.md` existe com 12 secoes (sumario, participantes, metricas, bugs, frictions, amou/odiou, observacoes, features, Go/No-Go, proximos passos, retrospectiva)
- [x] `RELEASE-DECISION.md` tem 6 criterios Go/No-Go travados pre-dados + rationale por criterio + branches GO/NO-GO
- [x] `analyze-feedback.ts` funcional (zero deps, roda em CSV de teste, produz metricas + JSON + gate checks)
- [x] `IMPROVEMENTS-BACKLOG.md` tem 3 tabelas P0/P1/P2 + criterios numericos + cap de 3 P0 + guia de extracao
- [x] Criterios Go/No-Go documentados ANTES da analise real (anti-vies — arquivos criados hoje 2026-04-21)
- [x] Tasks 5 e 6 (human-action dependendo de dados reais) documentadas em `deferred-items.md` com 5 items rastreaveis
- [x] `bun run audit:personal:ci` passa: "AUDIT PASS — 0 critical findings in distributed code."
- [x] Cada tarefa committed individualmente (4 commits atomicos)

## Desvios do Plano

### Issues Auto-corrigidos

**1. [Regra 1 - Bug] Block comment nao terminava corretamente em analyze-feedback.ts**

- **Encontrado durante:** Tarefa 3 (runtime verification do analyze-feedback.ts)
- **Issue:** JSDoc header tinha `* bun run .plano/fases/31-*/analyze-feedback.ts ...` — a sequencia `*/` dentro do comentario `/** ... */` fechava o bloco prematuramente, causando erro de parse Bun/TS ao executar: `error: Unexpected * at ...:13:68`.
- **Correcao:** Substituido literal `31-*/` por `31-FASE_SLUG/` no comentario com nota explicativa para o usuario substituir pelo nome real da pasta. Zero impacto funcional — so afeta documentacao JSDoc.
- **Arquivos modificados:** `analyze-feedback.ts` (linhas 13-14, +2 -1)
- **Commit:** 108ac9e

### Issues Adiados

**Tasks 5 e 6 do plano** (`type="checkpoint:human-action"`) foram documentadas em `deferred-items.md` em vez de executadas. Justificativa: executar sem dados reais do alpha produziria artefatos fabricados — violaria principio "implementacao real, nao simulacao" e "dados reais desde o primeiro momento". Templates estao prontos para ~4h de execucao mecanica quando o alpha rodar. Essa e a interpretacao correta do prompt do usuario: "Execute: templates, scripts, frameworks. Defira: preenchimento com dados reais do alpha."

## Self-Check: PASSOU

**Arquivos criados (5/5):**
- ENCONTRADO: `.plano/fases/31-*/POST-ALPHA-REPORT-TEMPLATE.md`
- ENCONTRADO: `.plano/fases/31-*/RELEASE-DECISION.md`
- ENCONTRADO: `.plano/fases/31-*/analyze-feedback.ts`
- ENCONTRADO: `.plano/fases/31-*/IMPROVEMENTS-BACKLOG.md`
- ENCONTRADO: `.plano/fases/31-*/deferred-items.md`

**Commits (4/4):**
- ENCONTRADO: 3400a44 — POST-ALPHA-REPORT-TEMPLATE.md
- ENCONTRADO: c53e953 — RELEASE-DECISION.md
- ENCONTRADO: 108ac9e — analyze-feedback.ts (inclui fix do bloco de comentario)
- ENCONTRADO: dc4e98f — IMPROVEMENTS-BACKLOG.md

**Verificacoes automatizadas:**
- PASS: Task 1 verify (Sumario executivo + Metricas agregadas + Top 5 bugs + Decisao Go/No-Go + NPS + T2FM)
- PASS: Task 2 verify (Criterios Go/No-Go travados + NPS >= 30 + T2FM mediano <= 30 + Zero bugs criticos + Se GO + Se NO-GO)
- PASS: Task 3 verify (script contem "FORGECLAW ALPHA" + "NPS" no output; CSV parser funcional em 2-row e 5-row tests)
- PASS: Task 4 verify (P0 — Blockers + Criterios de priorizacao P0 + maximo 3 P0 + Extracao automatica)
- PASS: `bun run audit:personal:ci` — 0 critical findings

**Qualidade adicional:**
- Zero dados pessoais em nenhum artefato (100% template)
- Anti-vies de confirmacao estruturalmente reforcado (criterios pre-dados)
- Anti-feature-creep estrutural (cap max 3 P0)
- Cross-references entre arquivos validas (TEMPLATE -> DECISION -> BACKLOG -> analyze-feedback.ts)
- Defer explicito com rastreabilidade (5 items em deferred-items.md com esforco e dependencias)

## Proximas acoes

Jonathan deve:

1. **Antes do alpha:** revisar os 4 artefatos e aprovar criterios Go/No-Go como travados. Qualquer ajuste em criterios precisa acontecer ANTES do alpha comecar, nunca durante a analise.
2. **Executar PLAN 31-02:** consolidar daily-standup/bug-triage/friction-log durante os 14 dias do alpha real.
3. **D+7 do alpha:** enviar formulario aos 5 alphas, coletar CSV.
4. **D+8 do alpha:** executar os 5 items DEFERRED seguindo o runbook em `deferred-items.md` (~4h totais).
5. **Apos decisao:** executar branch GO (release geral + mass grant) ou branch NO-GO (alpha 02 em Fase 32).
