---
phase: 24-templates-por-arqu-tipo
plan: 24-02
subsystem: cli/templates/archetypes
tags: [archetype, templates, markdown, harness, content, voice]
requires:
  - phase-24-01 (schema, loader, 5 archetype.json com metadata)
provides:
  - 35 arquivos .md (5 arquetipos x 7 arquivos) com conteudo real e distinguivel
  - Template base pronto para o installer (Fase 25) renderizar placeholders e escrever em ~/.forgeclaw/harness/
  - Tom e rotina (HEARTBEAT) especificos por perfil de usuario
affects:
  - Fase 25 (installer pode chamar loadArchetype + renderArchetype e ter harness completo)
  - Fase 26 (persona entrevistador tera templates por arquetipo como starting point para o diff)
  - Fase 27 (onboarding live-preview mostra esses .md renderizados)
tech-stack:
  added: []
  patterns:
    - "Template .md com placeholders universais restritos a USER.md (principio: minimo acoplamento)"
    - "Tom distinto por arquetipo validado por distinguibilidade de header e principios"
    - "AGENTS.md espelha archetype.json.suggestedAgents (contrato cruzado validado por script)"
    - "HEARTBEAT.md usa dialeto do parser (Todo dia as Xh, Toda segunda as Xh, Todo dia 1 as Xh, A cada N minutos)"
key-files:
  created:
    - packages/cli/src/templates/archetypes/solo-builder/SOUL.md
    - packages/cli/src/templates/archetypes/solo-builder/USER.md
    - packages/cli/src/templates/archetypes/solo-builder/AGENTS.md
    - packages/cli/src/templates/archetypes/solo-builder/TOOLS.md
    - packages/cli/src/templates/archetypes/solo-builder/MEMORY.md
    - packages/cli/src/templates/archetypes/solo-builder/STYLE.md
    - packages/cli/src/templates/archetypes/solo-builder/HEARTBEAT.md
    - packages/cli/src/templates/archetypes/content-creator/SOUL.md
    - packages/cli/src/templates/archetypes/content-creator/USER.md
    - packages/cli/src/templates/archetypes/content-creator/AGENTS.md
    - packages/cli/src/templates/archetypes/content-creator/TOOLS.md
    - packages/cli/src/templates/archetypes/content-creator/MEMORY.md
    - packages/cli/src/templates/archetypes/content-creator/STYLE.md
    - packages/cli/src/templates/archetypes/content-creator/HEARTBEAT.md
    - packages/cli/src/templates/archetypes/agency-freela/SOUL.md
    - packages/cli/src/templates/archetypes/agency-freela/USER.md
    - packages/cli/src/templates/archetypes/agency-freela/AGENTS.md
    - packages/cli/src/templates/archetypes/agency-freela/TOOLS.md
    - packages/cli/src/templates/archetypes/agency-freela/MEMORY.md
    - packages/cli/src/templates/archetypes/agency-freela/STYLE.md
    - packages/cli/src/templates/archetypes/agency-freela/HEARTBEAT.md
    - packages/cli/src/templates/archetypes/ecom-manager/SOUL.md
    - packages/cli/src/templates/archetypes/ecom-manager/USER.md
    - packages/cli/src/templates/archetypes/ecom-manager/AGENTS.md
    - packages/cli/src/templates/archetypes/ecom-manager/TOOLS.md
    - packages/cli/src/templates/archetypes/ecom-manager/MEMORY.md
    - packages/cli/src/templates/archetypes/ecom-manager/STYLE.md
    - packages/cli/src/templates/archetypes/ecom-manager/HEARTBEAT.md
    - packages/cli/src/templates/archetypes/generic/SOUL.md
    - packages/cli/src/templates/archetypes/generic/USER.md
    - packages/cli/src/templates/archetypes/generic/AGENTS.md
    - packages/cli/src/templates/archetypes/generic/TOOLS.md
    - packages/cli/src/templates/archetypes/generic/MEMORY.md
    - packages/cli/src/templates/archetypes/generic/STYLE.md
    - packages/cli/src/templates/archetypes/generic/HEARTBEAT.md
  modified: []
decisions:
  - "[2026-04-21][24-02] Placeholders universais restritos a USER.md por arquetipo. Os outros 6 .md (SOUL, AGENTS, TOOLS, MEMORY, STYLE, HEARTBEAT) usam placeholders somente quando precisam de contexto real (ex: workingDir em TOOLS/HEARTBEAT, vaultPath em TOOLS, today em MEMORY). Reduz acoplamento entre perfil e dados de usuario, deixa 6 arquivos reaproveitaveis entre usuarios sem re-renderizacao."
  - "[2026-04-21][24-02] Tom de voz validado por distinguibilidade: cada SOUL.md tem (a) header unico com slug do arquetipo, (b) conjunto proprio de principios numericos, (c) frase de comportamento especifica. Nenhum copy-paste entre arquetipos — solo-builder fala em 'ship', content-creator em 'hook/CTA', agency em 'cliente/prazo', ecom em 'ROAS/margem', generic em 'neutro/seguro'."
  - "[2026-04-21][24-02] HEARTBEAT por arquetipo modela rotina real do perfil: solo-builder tem monitoring a cada 60min (builds/containers), content-creator tem pauta-ideacao-weekly-retro, agency-freela tem pendencias-relatorios-weekly-financeiro-mensal (dia 1), ecom-manager tem 3 checkpoints diarios (abertura/midday/fechamento) + weekly. Generic minimo: 2 crons (daily + review)."
  - "[2026-04-21][24-02] Generic mantem 2 suggestedAgents e 2 crons propositalmente enxutos. E fallback — se o usuario nao se encaixa, recebe o minimo viavel sem ruido de sugestoes de outros perfis."
  - "[2026-04-21][24-02] Task 6 nao gerou commit. Era puramente validacao cruzada (existencia dos 35 arquivos, zero dados pessoais, placeholders em USER.md, AGENTS.md espelha archetype.json, HEARTBEAT usa dialeto do parser). Todos os checks passaram inline."
metrics:
  tasks_planned: 6
  tasks_completed: 6
  commits: 5
  files_created: 35
  files_modified: 0
  duration_minutes: 6
  completed_at: "2026-04-21T11:21Z"
---

# Fase 24 Plano 02: Conteudo dos 5 Arquetipos (35 arquivos .md) — Summary

Conjunto de 35 templates markdown (5 arquetipos x 7 arquivos) preenchendo o contrato criado em 24-01. Cada arquetipo tem voz, rotina e agentes distintos — o installer agora pode chamar `loadArchetype(slug)` e receber harness completo pronto pra renderizar.

## O que foi construido

Sete arquivos .md por arquetipo (SOUL, USER, AGENTS, TOOLS, MEMORY, STYLE, HEARTBEAT) com conteudo real, escritos em portugues brasileiro, sem dado pessoal, com tom distinguivel entre perfis:

- **Solo Builder:** dev indie, tom direto-informal, prioriza shipping. 3 agentes (Code Agent, Shipper, Ideia Lab). Cron a cada 60min monitorando builds.
- **Criador de Conteudo:** editorial, ritmo, hooks/CTA. 4 agentes (Editor de Carrossel, Roteirista de Reels, Editor SEO, Editorial Planner). HEARTBEAT com pauta diaria + weekly editorial + retrospectiva sexta.
- **Agencia/Freela:** profissional, multi-cliente, receita-primeiro. 4 agentes (Gestor de Clientes, Comercial, Financeiro, Projetos). HEARTBEAT inclui rotina mensal (dia 1) pra financeiro.
- **Gestor E-commerce:** orientado a numeros (ROAS, CPA, margem), urgencia. 4 agentes (Analista de Vendas, Ads Manager, Estoque, SAC). 3 checkpoints diarios (abertura 8h, midday 13h, fechamento 19h).
- **Generico:** fallback neutro. 2 agentes (General Assistant, Task Runner). HEARTBEAT minimo de 2 crons.

Total: **35 arquivos .md, 30138 chars de conteudo, 0 dado pessoal**.

## Tarefas executadas

| # | Nome | Commit | Arquivos |
|---|---|---|---|
| 1 | Solo Builder (7 .md) | `e551960` | solo-builder/{SOUL,USER,AGENTS,TOOLS,MEMORY,STYLE,HEARTBEAT}.md |
| 2 | Criador de Conteudo (7 .md) | `287cf90` | content-creator/{7 .md} |
| 3 | Agencia / Freela (7 .md) | `5e43d9d` | agency-freela/{7 .md} |
| 4 | Gestor E-commerce (7 .md) | `6104589` | ecom-manager/{7 .md} |
| 5 | Generico (7 .md) | `efd561f` | generic/{7 .md} |
| 6 | Validacao cruzada (sem commit) | — | — |

Total: 5 commits de conteudo + 1 tarefa de validacao puramente automatizada.

## Verificacoes funcionais executadas

**1. `listArchetypes()` retorna os 5 arquetipos com contagens corretas:**
```
- solo-builder | 3 agents | 7 files | 6427 chars | USER.md replaced: true
- content-creator | 4 agents | 7 files | 6580 chars | USER.md replaced: true
- agency-freela | 4 agents | 7 files | 6637 chars | USER.md replaced: true
- ecom-manager | 4 agents | 7 files | 6380 chars | USER.md replaced: true
- generic | 2 agents | 7 files | 4152 chars | USER.md replaced: true
```

**2. `loadArchetype(slug)` para cada um dos 5 retorna ArchetypeTemplate completo (antes desta fase `loadArchetype` rejeitava com `missing template file`, agora carrega com sucesso).**

**3. `renderArchetype(template, map)` substitui placeholders em USER.md de cada arquetipo:**
- Token conhecido `{{userName}}` -> valor fornecido ("Test User")
- `{{today}}` injetado automaticamente pelo loader (YYYY-MM-DD)
- Tokens `{{company}}`, `{{role}}`, `{{timezone}}`, `{{workingDir}}`, `{{vaultPath}}` substituidos em todos os USER.md

**4. Contrato AGENTS.md <-> archetype.json: script node valida que todo nome em `suggestedAgents` aparece em AGENTS.md — 5/5 arquetipos passam.**

**5. Contrato TOOLS.md <-> archetype.json: primeira palavra de cada `recommendedTool` aparece em TOOLS.md — 0 missing across 26 tools (6+5+6+6+3).**

**6. HEARTBEAT.md usa dialeto suportado pelo parser: todos os 5 tem `Todo dia as`, `Toda segunda`, `Toda sexta`, `A cada` ou `Todo dia 1` (para rotina mensal).**

**7. `bun run audit:personal:ci` passa com 0 critical findings apos cada tarefa e no final.**

## Desvios do Plano

Nenhum desvio. Plano executado exatamente como escrito — 6 tarefas na ordem, conteudo dos 5 arquetipos identico ao especificado no PLAN.md, verificacoes automatizadas passaram sem ajustes. Tarefa 6 (validacao) nao gerou commit por ser puramente verificativa (conforme instrucao "Apos todos os checks acima passarem... a tarefa esta done").

## Pontos de conexao para proximos planos

- **Fase 24-03:** validar fim-a-fim que o harness gerado pelo installer (Fase 25) funciona com Claude Code. Pode usar esses templates renderizados como fixture.
- **Fase 25 (installer):** chama `loadArchetype(slug)` + `renderArchetype(template, map)` + escreve em `~/.forgeclaw/harness/`. Os 35 .md ja sao distinguiveis e nao vazarao contexto pessoal.
- **Fase 26 (entrevistador):** a persona vai produzir diff estruturado EM CIMA desses templates (baseline). Cada arquetipo tem `{{...}}` apenas onde faz sentido, entao o diff fica focado nas areas editaveis.
- **Fase 27 (onboarding live-preview):** pode renderizar os .md em tempo real no painel direito conforme o usuario conversa.

## Self-Check: PASSOU

**Arquivos verificados (35/35):**
- ENCONTRADO: packages/cli/src/templates/archetypes/solo-builder/SOUL.md
- ENCONTRADO: packages/cli/src/templates/archetypes/solo-builder/USER.md
- ENCONTRADO: packages/cli/src/templates/archetypes/solo-builder/AGENTS.md
- ENCONTRADO: packages/cli/src/templates/archetypes/solo-builder/TOOLS.md
- ENCONTRADO: packages/cli/src/templates/archetypes/solo-builder/MEMORY.md
- ENCONTRADO: packages/cli/src/templates/archetypes/solo-builder/STYLE.md
- ENCONTRADO: packages/cli/src/templates/archetypes/solo-builder/HEARTBEAT.md
- ENCONTRADO: packages/cli/src/templates/archetypes/content-creator/{7 .md} (validado por loader via listArchetypes)
- ENCONTRADO: packages/cli/src/templates/archetypes/agency-freela/{7 .md} (validado)
- ENCONTRADO: packages/cli/src/templates/archetypes/ecom-manager/{7 .md} (validado)
- ENCONTRADO: packages/cli/src/templates/archetypes/generic/{7 .md} (validado)

**Commits verificados:**
- ENCONTRADO: e551960 feat(24-02): add solo-builder archetype templates (7 .md)
- ENCONTRADO: 287cf90 feat(24-02): add content-creator archetype templates (7 .md)
- ENCONTRADO: 5e43d9d feat(24-02): add agency-freela archetype templates (7 .md)
- ENCONTRADO: 6104589 feat(24-02): add ecom-manager archetype templates (7 .md)
- ENCONTRADO: efd561f feat(24-02): add generic archetype templates (7 .md)

**Contratos cruzados validados:**
- AGENTS.md espelha archetype.json.suggestedAgents em 5/5 arquetipos
- TOOLS.md menciona archetype.json.recommendedTools em 5/5 arquetipos
- HEARTBEAT.md usa dialeto suportado em 5/5 arquetipos
- USER.md tem os 7 placeholders universais em 5/5 arquetipos
- Audit de contexto pessoal: PASS (0 critical)
