---
phase: 26-persona-entrevistador-forgeclaw
plan: 26-03
subsystem: packages/core/onboarding/scripts
tags: [onboarding, interviewer, archetype-scripts, prompts]
dependency_graph:
  requires:
    - "Fase 26-01: interviewer.md (system prompt base) + loadScript/loadInterviewerPrompt em prompts.ts"
    - "Fase 26-01: VALID_PLACEHOLDER_KEYS + HARNESS_FILES_ALL (whitelists)"
    - "Fase 24: templates em packages/cli/src/templates/archetypes/<slug>/USER.md (headers H2 referenciados)"
    - "Fase 24: archetype.json (suggestedAgents e recommendedTools por slug — consultados pra evitar divergencia)"
  provides:
    - "packages/core/src/onboarding/scripts/solo-builder.md: roteiro de entrevista Solo Builder (7 topicos)"
    - "packages/core/src/onboarding/scripts/content-creator.md: roteiro Criador de Conteudo (8 topicos)"
    - "packages/core/src/onboarding/scripts/agency-freela.md: roteiro Agencia/Freela (8 topicos)"
    - "packages/core/src/onboarding/scripts/ecom-manager.md: roteiro Gestor E-commerce (8 topicos)"
    - "packages/core/src/onboarding/scripts/generic.md: roteiro minimo Generic (4 topicos)"
    - "packages/core/src/onboarding/scripts/README.md: contrato de formato (titulo, estrutura, schema de topico, regras de content)"
  affects:
    - "packages/core/src/onboarding/prompts.ts: loadInterviewerPrompt(slug) agora retorna base + script (antes: so base com warning) para os 5 slugs"
tech-stack:
  added: []  # zero deps novas
  patterns:
    - "Scripts markdown puros versionados no repo, carregados sob demanda via fs+cache module-level"
    - "Schema de topico padronizado (Objetivo/Pergunta/Diff/Nota) para consistencia entre arquetipos"
    - "Whitelisting implicito: scripts so mencionam arquivos em HARNESS_FILES_ALL e placeholders em VALID_PLACEHOLDER_KEYS"
key-files:
  created:
    - "packages/core/src/onboarding/scripts/solo-builder.md (50 linhas)"
    - "packages/core/src/onboarding/scripts/content-creator.md (56 linhas)"
    - "packages/core/src/onboarding/scripts/agency-freela.md (56 linhas)"
    - "packages/core/src/onboarding/scripts/ecom-manager.md (55 linhas)"
    - "packages/core/src/onboarding/scripts/generic.md (34 linhas)"
    - "packages/core/src/onboarding/scripts/README.md (56 linhas)"
  modified: []
decisions:
  - "Cada script herda o tom do archetype.json do perfil (solo-builder direto/tecnico, content-creator com voz/pilares, agency-freela com cobranca/cliente, ecom-manager com plataforma/ads/meta, generic minimo) — scripts e archetype apontam pra mesma realidade sem duplicacao"
  - "Numero de topicos escolhido por profundidade do perfil: generic tem 4 (fallback minimo), solo-builder 7, content-creator/agency-freela/ecom-manager 8. Nunca ultrapassa 8 pra respeitar max 12 perguntas do interviewer.md"
  - "Topicos 1-3 (ou 1-4) sao sempre placeholders universais (userName/company/role/workingDir). Topicos 5+ sao especificos do arquetipo. Garante que qualquer interrupcao prematura ja produz diff util"
  - "createIfMissing=false explicito em replace_section que aponta pra secoes que JA existem nos templates da Fase 24 (## Pilares editoriais, ## Clientes ativos, ## Tom). Previne corrupcao de template"
  - "Secoes com createIfMissing=true usadas apenas em ## Projetos ativos (solo-builder) — secao ja existe no template mas a flag e defensiva caso o membro ja tenha editado"
  - "Sinal de done antecipado explicito em cada script sinaliza o turno seguro pro Entrevistador emitir status=done. Evita forca-lo a preencher 8 topicos quando 4 ja sao uteis"
  - "README de scripts separado do README do modulo (../README.md). Este e contrato para quem for adicionar novos arquetipos futuramente, nao documentacao geral"
  - "Validacao cruzada em Tarefa 7 (grep statico) confirma: nenhum arquivo fora de HARNESS_FILES_ALL referenciado, nenhum set_placeholder com key fora de VALID_PLACEHOLDER_KEYS. Tarefa 7 nao gera commit (validacao pura)"
metrics:
  duration: "~4 min (7 tarefas, execucao sequencial)"
  completed: "2026-04-21"
  commits: 6
  tasks_completed: 7
  lines_added: 307
  files_created: 6
  files_modified: 0
---

# Fase 26 Plano 03: Roteiros por Arquetipo — Summary

Criados os 5 roteiros de entrevista (`packages/core/src/onboarding/scripts/<slug>.md`) que guiam o Entrevistador ForgeClaw em cada arquetipo, mais o `README.md` do diretorio documentando o contrato de formato. Cada roteiro e uma lista priorizada de topicos (4 a 8) com pergunta sugerida e diff esperado — o Entrevistador mantem liberdade de pular topicos ja respondidos ou encerrar cedo com `done`. Os scripts sao anexados ao system prompt base (interviewer.md da 26-01) em runtime via `loadInterviewerPrompt(slug)`.

## O que foi entregue

### 1. `solo-builder.md` (50 linhas, 7 topicos)

Roteiro para dev indie:
- Placeholders: userName, company (ou "independente"), role (stack em 1 frase), workingDir
- Especificos: projeto em foco (`## Projetos ativos`), deploy preferido (TOOLS.md), tom curto/elaborado (STYLE.md `## Tom`)
- Tom: direto, zero didatismo. Aceita "sem empresa" sem insistir.

### 2. `content-creator.md` (56 linhas, 8 topicos)

Roteiro para criador de conteudo:
- Placeholders: userName, company/@, role (nicho)
- Especificos: canais principais (replace em linha existente), pilares editoriais (`## Pilares editoriais` — existe), voz (linha "Voz: _a definir_"), frequencia/horario (HEARTBEAT.md cron), vault/drafts (workingDir ou vaultPath)
- Nota: nao presume nicho, pergunta explicitamente.

### 3. `agency-freela.md` (56 linhas, 8 topicos)

Roteiro para agencia/freelancer:
- Placeholders: userName, company (agencia/freela), role (servico), workingDir (base de clientes)
- Especificos: clientes ativos 1-3 (`## Clientes ativos` — existe), ferramenta de cobranca (Asaas/Conta Azul/outra), politica (mensal/projeto/hora/retainer), canal (email/WhatsApp/Slack)
- Nota: nao lista TODOS clientes (trabalho pro dashboard depois), so 1-3 principais.

### 4. `ecom-manager.md` (55 linhas, 8 topicos)

Roteiro para gestor e-commerce:
- Placeholders: userName, company (loja), role (dono/gestor/socio)
- Especificos: plataforma (Shopify/Woo/Nuvemshop/Tray — critico, cedo), ads (Meta/Google/TikTok), ERP (Tiny/Bling), atendimento (WhatsApp/DM/chat), meta de faturamento
- Nota: meta aceita "a definir" — dado sensivel, nao insiste.

### 5. `generic.md` (34 linhas, 4 topicos)

Roteiro fallback deliberadamente minimo:
- Placeholders: userName, role (+opcional company), workingDir
- Opcional: preferencia de tom curto/elaborado (`## Preferencias`)
- Done cedo: topicos 1-3 ja resolvem, tudo alem e bonus.

### 6. `README.md` (56 linhas)

Contrato para quem for adicionar novos arquetipos:
- Estrutura obrigatoria: titulo H1, regras especificas, topicos priorizados (4-8), sinal de done antecipado
- Schema por topico: Objetivo / Pergunta sugerida / Diff / Nota opcional
- Regras de content: placeholders 1-4 universais, topicos 5+ especificos, H2 deve existir no template da Fase 24, apenas VALID_PLACEHOLDER_KEYS
- Processo de validacao + versionamento (nao breaking change sem bumpar major)

## Verificacao Funcional

Runtime smoke test (`bun -e`) com os 5 slugs:

```
OK solo-builder: script=2888 chars, full=8063 chars
OK content-creator: script=2646 chars, full=7821 chars
OK agency-freela: script=2757 chars, full=7932 chars
OK ecom-manager: script=2462 chars, full=7637 chars
OK generic: script=1435 chars, full=6610 chars
RESULT: 5 ok, 0 fail
```

Confirmado para cada slug:
- `loadScript(slug)` retorna conteudo nao-vazio (>100 chars)
- Conteudo comeca com `# Roteiro:`
- `loadInterviewerPrompt(slug)` concatena base + script corretamente (contem `## Objetivo` da base + `# Roteiro:` do script)

## Verificacao de Typecheck

```
bunx tsc --noEmit -p packages/core/tsconfig.json
```

Zero erros em `packages/core/src/onboarding/` (incluindo novo `scripts/`). Os 8 erros pre-existentes (5 em `runners/codex-cli-runner.ts`, 2 em `runners/registry.ts`, 1 conflito MemoryManager em `index.ts`) seguem out-of-scope — ja documentados em STATE.md desde Fase 25 e 26-01.

## Verificacao de Audit Personal Context

```
bun run audit:personal:ci
AUDIT PASS — 0 critical findings in distributed code.
```

Scripts nao introduzem nenhum contexto pessoal. Usam apenas nomes genericos (Ana, Acme) vindos dos exemplos ja aprovados em `interviewer.md`.

## Verificacao de Validacao Cruzada (Tarefa 7)

Tres checks sobre os 5 scripts:

1. **Todos nao-vazios:** `ALL_FILES_EXIST`
2. **Arquivos referenciados dentro de HARNESS_FILES_ALL:** apenas `HEARTBEAT.md`, `STYLE.md`, `TOOLS.md`, `USER.md` — todos validos.
3. **set_placeholder keys dentro de VALID_PLACEHOLDER_KEYS:** apenas `userName`, `company`, `role`, `workingDir` — todos validos.

Resultado: `ALL_OK`.

### Cross-check adicional: H2 headers referenciados existem nos templates

Confirmado via grep nos templates da Fase 24:

| Header referenciado | Script | Template | Existe? |
|---------------------|--------|----------|---------|
| `## Projetos ativos` | solo-builder | solo-builder/USER.md | Sim |
| `## Pilares editoriais` | content-creator | content-creator/USER.md | Sim |
| `## Clientes ativos` | agency-freela | agency-freela/USER.md | Sim |
| `## Preferencias` | generic | generic/USER.md | Sim |
| `## Tom` | solo-builder | solo-builder/STYLE.md | Sim |

Nenhuma referencia fantasma.

## Commits

| Tarefa | Commit | Arquivos | Descricao |
|--------|--------|----------|-----------|
| 1 | 70359d6 | scripts/solo-builder.md | Roteiro Solo Builder (7 topicos) |
| 2 | 6fa55b4 | scripts/content-creator.md | Roteiro Criador de Conteudo (8 topicos) |
| 3 | b322402 | scripts/agency-freela.md | Roteiro Agencia/Freela (8 topicos) |
| 4 | 47bc369 | scripts/ecom-manager.md | Roteiro Gestor E-commerce (8 topicos) |
| 5 | cad2ffb | scripts/generic.md | Roteiro Generic minimo (4 topicos) |
| 6 | 444cd78 | scripts/README.md | Contrato de formato e schema de topico |
| 7 | — (validacao) | — | Typecheck + runtime smoke test + grep statico + H2 cross-check (sem arquivos modificados) |

## Desvios do Plano

Nenhum — plano executado exatamente como escrito.

Obs: Tarefa 7 e validacao pura (typecheck + grep + smoke test), entao nao gera commit proprio. Os 6 arquivos do escopo foram validados.

## Criterios de Sucesso

- [x] 5 scripts criados em `packages/core/src/onboarding/scripts/` (um por ArchetypeSlug)
- [x] Cada script tem entre 4 e 8 topicos priorizados no formato padrao
- [x] `solo-builder.md` cobre stack principal e projeto em foco alem dos placeholders base
- [x] `content-creator.md` cobre canais, pilares editoriais e voz
- [x] `agency-freela.md` cobre clientes ativos, ferramenta/politica de cobranca e canal
- [x] `ecom-manager.md` cobre plataforma, ads, ERP, atendimento e meta
- [x] `generic.md` e deliberadamente minimo (4 topicos)
- [x] Nenhum script referencia arquivo de harness fora da lista canonica (7 arquivos)
- [x] Nenhum `set_placeholder` usa key fora de VALID_PLACEHOLDER_KEYS
- [x] `scripts/README.md` documenta contrato de formato, schema de topico e regras de content
- [x] `loadScript(slug)` carrega qualquer um dos 5 sem erro (validado em smoke test — 26-04 tera cobertura formal)

## Issues Fora de Escopo (nao-acao)

- `packages/core/src/runners/codex-cli-runner.ts` (5 erros TS pre-existentes — Fase 25)
- `packages/core/src/runners/registry.ts` (2 erros TS pre-existentes — Fase 25)
- `packages/core/src/index.ts` (TS2308 conflito MemoryManager — pre-existente)

Nenhum introduzido por este plano. Todos ja documentados nos summaries anteriores.

## Proximas Acoes

- **26-02 (em paralelo):** motor Interviewer + merger + budget — ja consumidos os scripts via loadInterviewerPrompt no runtime. Commits detectados no historico do branch (7240980, 80712e4, ed81f44, f8ee696) mostram que o plano 26-02 rodou em paralelo e os artefatos ja estao integrados.
- **26-04:** testes formais do motor usando fixtures de conversa por arquetipo. Vai validar em E2E que cada script leva o Entrevistador a um diff util em <10 turnos.
- **Fase 27:** dashboard first-run onboarding com chat conversacional e preview do harness.

## Self-Check: PASSOU

- [x] `packages/core/src/onboarding/scripts/solo-builder.md` existe (50 linhas)
- [x] `packages/core/src/onboarding/scripts/content-creator.md` existe (56 linhas)
- [x] `packages/core/src/onboarding/scripts/agency-freela.md` existe (56 linhas)
- [x] `packages/core/src/onboarding/scripts/ecom-manager.md` existe (55 linhas)
- [x] `packages/core/src/onboarding/scripts/generic.md` existe (34 linhas)
- [x] `packages/core/src/onboarding/scripts/README.md` existe (56 linhas)
- [x] Commits 70359d6, 6fa55b4, b322402, 47bc369, cad2ffb, 444cd78 no git log
- [x] Typecheck: zero erros em onboarding/scripts/**
- [x] Runtime smoke test: 5/5 slugs carregam
- [x] Validacao cruzada (grep statico): ALL_OK
- [x] Audit CI: PASS
