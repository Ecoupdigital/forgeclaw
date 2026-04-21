---
phase: 30-docs-e-distribuicao
plan: 30-02
subsystem: docs
tags: [docs, getting-started, archetypes, dashboard-tour, harness, agents, crons, troubleshooting, faq]
requires: [30-01]
provides:
  - "docs/README.md como indice da documentacao"
  - "docs/getting-started.md tutorial end-to-end em 8 passos numerados"
  - "docs/archetypes.md descricao dos 5 arquetipos + guia de escolha"
  - "docs/dashboard-tour.md quick reference das 9 abas"
  - "docs/harness-guide.md 6 arquivos do harness + HEARTBEAT com exemplo editavel de cada"
  - "docs/agents.md criacao de agentes, 3 modos de memoria, vinculacao a topic, 4 exemplos prontos"
  - "docs/crons.md HEARTBEAT.md + dashboard + hot reload + template vars"
  - "docs/troubleshooting.md 12 erros comuns com sintoma/causa/solucao"
  - "docs/faq.md 16 perguntas frequentes"
affects:
  - "audit:personal:ci (allowlist atualizado para docs/getting-started.md:29 apos Task 2)"
tech-stack:
  added: []
  patterns:
    - "Placeholders `./screenshots/NOME.png` marcando onde o Plano 30-03 pousa imagens"
    - "Cross-links relativos entre guias (getting-started -> archetypes/troubleshooting/faq, etc)"
    - "Tom editorial: portugues brasileiro, voce-forma, sem emoji, sem jargao nao-explicado"
key-files:
  created:
    - /home/projects/ForgeClaw/docs/README.md
    - /home/projects/ForgeClaw/docs/getting-started.md
    - /home/projects/ForgeClaw/docs/archetypes.md
    - /home/projects/ForgeClaw/docs/dashboard-tour.md
    - /home/projects/ForgeClaw/docs/harness-guide.md
    - /home/projects/ForgeClaw/docs/agents.md
    - /home/projects/ForgeClaw/docs/crons.md
    - /home/projects/ForgeClaw/docs/troubleshooting.md
    - /home/projects/ForgeClaw/docs/faq.md
  modified:
    - /home/projects/ForgeClaw/.audit-personal-allowlist.txt
decisions:
  - "Troubleshooting tem 12 secoes (plano pedia 10, expandimos pra casar com o indice rapido no topo que ja listava 12)"
  - "FAQ tem 16 perguntas (dentro da faixa 12-15 alvo, escolheu 16 pra cobrir tambem 'v1.0 pagavel' que e duvida recorrente)"
  - "Placeholders `./screenshots/NOME.png` sem alt-text descritivo — Plano 30-03 vai capturar e pousar o NOME.png, texto alt vem depois via revisao manual se necessario"
  - "docs/README.md cita video-script.md ainda nao criado (plano 30-03) — decisao do plano autor, mantido como referencia forward"
  - "Conteudo de archetypes.md bate com os 5 slugs reais em packages/cli/src/templates/archetypes/ (solo-builder, content-creator, agency-freela, ecom-manager, generic) validando consistencia com Fase 24"
metrics:
  duration: "8min"
  completed: "2026-04-21T15:57Z"
  tasks: 9
  files_changed: 10
---

# Fase 30 Plano 02: Documentacao Completa em docs/ Summary

Criou os 9 arquivos que formam o corpo da documentacao do ForgeClaw em `docs/`: indice da pasta, tutorial end-to-end, guia de arquetipos, tour das 9 abas do dashboard, guia de edicao do harness, guia de agentes especializados, guia de crons, troubleshooting com 12 erros e FAQ com 16 perguntas. Todos falam com o membro da comunidade (nao com dev), usam placeholders `./screenshots/NOME.png` marcando onde o Plano 30-03 pousa imagens, e mantem cross-links consistentes entre si. Tom editorial: portugues brasileiro, voce-forma, sem emoji, sem jargao nao-explicado.

## O que foi feito

### Task 1: docs/README.md (commit 3af7572)

Indice de 36 linhas com tabela "Por onde comecar" (9 destinos: 8 guias + landing), ordem sugerida de leitura em 6 passos numerados, referencia ao video walkthrough futuro (plano 30-03) e ponteiro pro canal #forgeclaw-suporte da comunidade.

### Task 2: docs/getting-started.md (commit 3d0ae4c)

Tutorial end-to-end de 165 linhas em 8 passos numerados:
1. Pre-requisitos (Linux/macOS, Bun 1.1+, Claude Code CLI, bot Telegram, User ID)
2. Instalar (`git clone` + `bun install` + `bun run cli install`) explicando Fase A/B/C
3. Onboarding conversacional (rota /onboarding, chat + diff preview, comando `refine`)
4. Subir o bot (`bun run dev:bot` ou systemd/launchd)
5. Primeira mensagem (pergunta "Qual e o meu arquetipo?" usando harness preenchido)
6. Criar 2 topics pra testar isolamento de contexto
7. Primeiro cron na aba Automacoes do dashboard
8. Primeiro agente especializado (Editor de Copy com tags conteudo/copy/social)

Com 11 placeholders de screenshot (`screenshots/01-prerequisitos.png` .. `11-primeiro-agente.png`) e cross-links para archetypes, troubleshooting, faq, dashboard-tour.

### Task 3: docs/archetypes.md (commit c5c3cf4)

Guia dos 5 arquetipos em 122 linhas. Tabela "Qual escolher?" conecta perfil do membro a arquetipo (constroi sozinho -> Solo Builder, social media -> Criador de Conteudo, multiplos clientes -> Agencia/Freela, loja e-commerce -> Gestor E-commerce, fallback -> Generico). Cada arquetipo tem:

- Quem e (1 paragrafo)
- Tabela de agentes sugeridos com papel
- Lista de ferramentas recomendadas (MCPs e CLIs)
- Linha "escolha esse se..." pra auto-selecao

Mais secao "Trocar de arquetipo" com `forgeclaw refine` (caminho soft) ou `install --archetype` (resetao). Slugs batem com `packages/cli/src/templates/archetypes/` (Fase 24).

### Task 4: docs/dashboard-tour.md (commit 8df3add)

Quick reference das 9 abas em 111 linhas. Cada aba tem 1 paragrafo do que faz + "voce usa aqui para" + placeholder de screenshot. Abas cobertas: Sessoes (kanban de topics), Automacoes (CRUD de crons db/file), Memoria (FTS5 paginada 50/pg), Agentes (CRUD), Tokens (chart cache vs fresh), Atividade (feed cronologico WebSocket), Webhooks (outbound com HMAC-SHA256), Configuracoes (forgeclaw.config.json com mascara de secrets), Personalidade (editor do harness com hot reload). Termina com atalhos globais, nota de seguranca (localhost-only + token) e troubleshooting.

### Task 5: docs/harness-guide.md (commit 134dc6b)

Guia editorial do harness em 180 linhas. Mostra a estrutura `~/.forgeclaw/harness/` com os 6 arquivos (SOUL, USER, AGENTS, TOOLS, MEMORY, STYLE) + HEARTBEAT.md na mesma pasta. Para cada arquivo: "o que e" + "quando voce edita" + exemplo editavel. Cobre cache por mtime (nao precisa reiniciar bot), compilacao automatica em CLAUDE.md via `compileHarness()`, recomendacoes editoriais (manter curto, ser especifico, atualizar quando mudar) e troubleshooting.

### Task 6: docs/agents.md (commit 17cd44a)

Guia de agentes em 123 linhas. Explica estrutura (Nome/Prompt/Memory mode/Tags/Runtime), 3 modos de memoria com tabela (Global/Filtrada/Nenhuma) + "quando usar cada um", vinculacao a topic via dropdown ou API `PUT /api/topics/[id]`. 4 exemplos prontos (um por arquetipo principal): Editor de Copy (criador), Shipper (solo builder), Financeiro (agencia/freela), SAC (gestor e-commerce). Explica que prompt do agente e **prepended** ao harness (nao substitui), especializando o comportamento por cima.

### Task 7: docs/crons.md (commit aae8c55)

Guia de crons em 135 linhas. Duas formas (HEARTBEAT.md/origem file ou dashboard/origem db). Sintaxe do HEARTBEAT.md com exemplo completo (Daily Review, Weekly Planning, Monitoring). Tabela de schedules suportados (Todo dia as Xh, Toda hora, Toda segunda as Xh, A cada N minutos, cron expression classica). Template vars (`{today}`, `{yesterday}`, `{now}`). Roteamento por topico via EventBus -> bot. Run-now, logs na tabela `cron_logs`, hot reload (debounce 500ms), retry/falha.

### Task 8: docs/troubleshooting.md (commit 0c0763b)

12 erros comuns em 224 linhas. Indice rapido no topo, entry point no canal da comunidade no fim. Formato consistente: Sintoma + Causa + Solucao passo-a-passo. Cobre:

1. Pre-requisitos (Bun/claude command not found)
2. Claude CLI nao autenticado
3. Bot nao responde no Telegram (3 causas possiveis)
4. Usuario nao autorizado (allowedUsers do config)
5. Porta 4040 em uso (`lsof -i :4040`)
6. Token dashboard invalido
7. Schedule invalido (exemplos de sintaxe errada)
8. Cron nao disparou (timezone/bot caido)
9. Cron output perdido (target_topic_id ou limite 4096 chars do Telegram)
10. Harness nao atualiza (arquivo errado ou mtime)
11. Agente nao filtra memoria (tags com acento, dedup errada)
12. Tom do SOUL ignorado (agente prepended sobrescreve)

### Task 9: docs/faq.md (commit 3efacd6)

16 perguntas de membro iniciante em 71 linhas. Cobre custo, plataforma (WSL2 funciona, Windows direto nao), VPS opcional, limite de tokens Claude Max, privacidade (dados ficam local, so prompts vao pra Anthropic), modelos alternativos (so Claude Code CLI, Codex experimental), revenda proibida pela LICENSE, bot sumido, backup via `bun run cli export`, multi-bot (nao, use topics), troca de maquina, revogacao de acesso ao repo, update, harness publico (nao), contribuicao com codigo, v1.0 pagavel.

## Desvios do Plano

### Issues Auto-corrigidos

**1. [Regra 3 - Bloqueante] Allowlist de audit:personal:ci precisava de backfill apos Task 2**

- **Encontrado durante:** Self-check automatizado `bun run audit:personal:ci` apos as 9 tasks
- **Issue:** Audit falhava com 2 findings em `docs/getting-started.md:29` — a linha `git clone https://github.com/Ecoupdigital/forgeclaw.git` dispara `personal_company` e `private_repo_url`. Sao instrucoes legitimas pra membro instalar, mesmo padrao semantico da entry ja allowlistada `README.md:22` (Fase 30-01).
- **Verificacao:** Diff do audit mostrou exatamente 2 criticos, ambos em `docs/getting-started.md:29`. Nenhum finding pre-existente vazou de outros planos paralelos.
- **Correcao:** Adicionou bloco na `.audit-personal-allowlist.txt` seguindo o padrao das entries existentes:
  ```
  docs/getting-started.md:29:personal_company  # Quick Start: URL oficial do repo privado para membros que ja tem acesso
  docs/getting-started.md:29:private_repo_url  # Quick Start: URL oficial do repo privado para membros que ja tem acesso
  ```
- **Arquivos modificados:** /home/projects/ForgeClaw/.audit-personal-allowlist.txt
- **Commit:** f8bafd1
- **Verificacao pos-fix:** `bun run audit:personal:ci` -> `AUDIT PASS — 0 critical findings in distributed code.`

### Issues Nao-corrigidos

Nenhum.

## Self-Check: PASSOU

- **Arquivos:** 9/9 criados em docs/ (README.md, getting-started.md, archetypes.md, dashboard-tour.md, harness-guide.md, agents.md, crons.md, troubleshooting.md, faq.md).
- **getting-started.md:** 8 passos numerados (grep `^## [0-9]\.` = 8), 11 screenshots placeholder, linka archetypes + troubleshooting + faq + dashboard-tour.
- **archetypes.md:** 5 secoes (Solo Builder, Criador de Conteudo, Agencia / Freela, Gestor E-commerce, Generico), 5 linhas "Escolha esse se...".
- **dashboard-tour.md:** 9 abas com header proprio (Sessoes, Automacoes, Memoria, Agentes, Tokens, Atividade, Webhooks, Configuracoes, Personalidade), 9 placeholders `screenshots/tab-*.png`.
- **harness-guide.md:** 7 headers dos arquivos do harness (SOUL.md, USER.md, AGENTS.md, TOOLS.md, MEMORY.md, STYLE.md, HEARTBEAT.md).
- **agents.md:** 3 modos de memoria na tabela + quando usar, 4 exemplos prontos, secao "Vincular agente a um topic".
- **crons.md:** HEARTBEAT.md mencionado 4x, tabela de schedules, template vars `{today}`, Hot reload, run-now em 2 lugares.
- **troubleshooting.md:** 14 secoes (12 erros + Indice + Nao resolveu?), 12 `**Sintoma:**`, 17 `**Solucao:**`, indice rapido no topo.
- **faq.md:** 16 perguntas numeradas (grep `^## [0-9]` = 16), 1 ref a Dominando AutoIA no topo + canal no rodape.
- **audit:personal:ci:** `AUDIT PASS — 0 critical findings in distributed code.`
- **Commits:** 9 de task (3af7572, 3d0ae4c, c5c3cf4, 8df3add, 134dc6b, 17cd44a, aae8c55, 0c0763b, 3efacd6) + 1 de desvio (f8bafd1) = 10 commits.
- **Zero checkpoints disparados** (plano totalmente autonomo, wave 1).
- **Paralelo com 30-04:** zero conflito — 30-04 mexe em `.github/` e `docs/support-channel.md`; este plano mexe nos 9 arquivos de `docs/*.md` restantes. Allowlist foi editada por ambos em blocos separados.

## Commits gerados

| # | Hash | Escopo | Descricao |
|---|------|--------|-----------|
| 1 | `3af7572` | Task 1 | docs(30-02): add docs/ index with links to all guides |
| 2 | `3d0ae4c` | Task 2 | docs(30-02): add getting-started tutorial with 8 numbered steps |
| 3 | `c5c3cf4` | Task 3 | docs(30-02): add archetypes guide with 5 profiles and choice matrix |
| 4 | `8df3add` | Task 4 | docs(30-02): add dashboard tour covering the 9 tabs |
| 5 | `134dc6b` | Task 5 | docs(30-02): add harness editing guide with examples per file |
| 6 | `17cd44a` | Task 6 | docs(30-02): add specialized agents guide with memory modes and examples |
| 7 | `aae8c55` | Task 7 | docs(30-02): add crons guide covering HEARTBEAT.md and dashboard |
| 8 | `0c0763b` | Task 8 | docs(30-02): add troubleshooting guide with 12 common errors |
| 9 | `3efacd6` | Task 9 | docs(30-02): add FAQ with 16 common questions from community members |
| 10 | `f8bafd1` | Desvio (Regra 3) | chore(30-02): allowlist repo URL in docs/getting-started.md |

## Proximos passos

Plano **30-03** captura os screenshots referenciados (`01-prerequisitos.png` .. `11-primeiro-agente.png`, `archetype-*.png`, `tab-*.png`, `harness-editor.png`, `agents-*.png`, `crons-*.png`, `dashboard-home.png`, `archetype-picker.png`, `cron-form.png`) e pousa em `docs/screenshots/`. Tambem escreve `docs/video-script.md` (roteiro 5min). Plano **30-04** (paralelo) ja criou templates `.github/ISSUE_TEMPLATE/`, `.github/SUPPORT.md` e `docs/support-channel.md`. Fase **31** grava alpha com 5 membros usando esta documentacao como guia.
