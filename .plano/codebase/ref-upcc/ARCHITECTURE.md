# Arquitetura — UP-CC

**Data da Analise:** 2026-04-09

## Visao Geral do Padrao

**Geral:** Sistema de meta-prompting baseado em arquivos Markdown que orquestra agentes AI especializados atraves de slash commands em CLIs de AI (Claude Code, Gemini, OpenCode).

**Caracteristicas Chave:**
- Arquitetura command → workflow → agent: commands sao entry points, workflows definem orquestracao, agents executam trabalho especializado
- Estado persistido inteiramente em disco (`.plano/`) via Markdown e JSON — sobrevive a `/clear` e troca de sessao
- Zero dependencias externas — apenas Node.js built-ins + host CLI runtime
- Pipeline de fases: discutir → planejar → executar → verificar com ciclo de correcao de gaps
- 33 agentes especializados com contexto fresco por dominio (sem contaminacao de tokens)
- Multi-runtime: Claude Code (nativo), Gemini CLI (convertido), OpenCode (convertido)

## Camadas

**Commands (Entry Points):**
- Proposito: Definir slash commands que o usuario invoca (`/up:executar-fase`, `/up:modo-builder`, etc.)
- Localizacao: `commands/*.md` (publicados) / instalados em `~/.claude/commands/up/*.md`
- Contem: YAML frontmatter (name, description, allowed-tools, argument-hint) + XML body com `<objective>`, `<execution_context>`, `<context>`, `<process>`
- Depende de: Workflows (referenciados via `@~/.claude/up/workflows/*.md`)
- Usado por: Host CLI (Claude Code, Gemini, OpenCode) — o usuario digita `/up:comando`

**Workflows (Orquestracao):**
- Proposito: Logica passo-a-passo que o host CLI executa. Define o "como" de cada operacao.
- Localizacao: `workflows/*.md` / instalados em `~/.claude/up/workflows/*.md`
- Contem: XML estruturado com `<purpose>`, `<process>`, `<step>` tags. Chamadas a `up-tools.cjs` para init/state/roadmap. Spawn de agentes via `Task`.
- Depende de: Tools CLI (`up-tools.cjs`), Agents (spawned via Task), References (carregados via `@`)
- Usado por: Commands (referenciados em `<execution_context>`)

**Agents (Execucao Especializada):**
- Proposito: Subagentes com papel especifico. Cada um recebe contexto fresco e executa uma tarefa bem definida.
- Localizacao: `agents/up-*.md` / instalados em `~/.claude/agents/up-*.md`
- Contem: YAML frontmatter (name, description, tools, color, model) + Markdown com `<role>`, `<execution_flow>`, regras de comportamento
- Depende de: Arquivos do projeto (`.plano/`, codigo-fonte), Tools CLI
- Usado por: Workflows (spawned via `Task` tool do host CLI)

**Tools CLI (Operacoes de Estado):**
- Proposito: CLI Node.js que gerencia estado, parsing de roadmap, config, commits, progresso
- Localizacao: `bin/up-tools.cjs` (2505 linhas) + `bin/lib/core.cjs` (270 linhas)
- Contem: Router de comandos (`init`, `state`, `roadmap`, `phase`, `config`, `requirements`, `commit`, `progress`, `timestamp`, `slug`, `phase-plan-index`, `state-snapshot`, `summary-extract`)
- Depende de: Arquivos `.plano/` do projeto, Git
- Usado por: Workflows (chamado via `node "$HOME/.claude/up/bin/up-tools.cjs" <command>`)

**Hooks (Monitoramento de Runtime):**
- Proposito: Hooks do Claude Code para statusline e monitoramento de contexto
- Localizacao: `hooks/up-statusline.js`, `hooks/up-context-monitor.js`
- Contem: Scripts Node.js que leem JSON do stdin (dados de sessao do Claude Code)
- Depende de: Nada externo. Comunicam entre si via bridge file em `os.tmpdir()`
- Usado por: Claude Code (configurado em `settings.json` pelo installer)

**Templates (Geracao de Documentos):**
- Proposito: Templates Markdown para documentos que o UP cria nos projetos do usuario
- Localizacao: `templates/*.md` + `templates/config.json`
- Contem: Templates para STATE.md, ROADMAP.md, PROJECT.md, REQUIREMENTS.md, DELIVERY.md, etc.
- Depende de: Nada
- Usado por: Workflows (lidos durante `novo-projeto`, `builder`, etc.)

**References (Documentos Compartilhados):**
- Proposito: Docs de referencia carregados por multiplos workflows/agents
- Localizacao: `references/*.md` + `references/blueprints/`
- Contem: Production requirements (70+ checks), UI/brand patterns, git integration, checkpoints, audit checklists
- Depende de: Nada
- Usado por: Agents (carregados via `@` em commands ou lidos durante execucao)

**Installer:**
- Proposito: Copiar arquivos para o config dir do host CLI com conversao de formato
- Localizacao: `bin/install.js` (825 linhas)
- Contem: Logica de copia, conversao de frontmatter (Claude→Gemini, Claude→OpenCode), configuracao de hooks
- Depende de: `package.json` (versao)
- Usado por: npx (`npx up-cc@latest --claude --global`)

## Fluxo de Dados

**Pipeline Manual de Fases (fluxo principal):**

1. `/up:novo-projeto` → Workflow `novo-projeto.md` → Questionamento profundo → Spawn `up-pesquisador-projeto` + `up-roteirista` → Cria `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`, `config.json` em `.plano/`
2. `/up:discutir-fase N` → Workflow `discutir-fase.md` → Analise de areas cinzentas → Cria `CONTEXT.md` em `.plano/fases/NN-slug/`
3. `/up:planejar-fase N` → Workflow `planejar-fase.md` → Spawn `up-planejador` → Le CONTEXT.md + ROADMAP.md + codebase docs → Cria `PLAN-001.md`, `PLAN-002.md`, etc.
4. `/up:executar-fase N` → Workflow `executar-fase.md` → Agrupa planos em waves → Spawn `up-executor` por plano (paralelo dentro de waves) → Commits atomicos + Cria `SUMMARY-001.md`, `SUMMARY-002.md`, etc.
5. `/up:verificar-trabalho N` → Workflow `verificar-trabalho.md` → Spawn `up-verificador` → Verificacao goal-backward → Cria `VERIFICATION.md` ou aprova fase

**Ciclo de Correcao de Gaps:**

1. `VERIFICATION.md` documenta gaps encontrados
2. `/up:planejar-fase N --gaps` → Le VERIFICATION.md → Cria planos de correcao
3. `/up:executar-fase N --gaps-only` → Executa apenas planos de correcao
4. `/up:verificar-trabalho N` → Re-verifica

**Builder Mode (fluxo autonomo completo):**

1. `/up:modo-builder "briefing"` → Command `modo-builder.md` → Carrega workflow `builder.md`
2. **Estagio 1 (Intake):** Detecta greenfield/brownfield → Perguntas criticas → Crash recovery via `LOCK.md`
3. **Estagio 2 (Arquitetura):** Spawn pipeline de 3 agentes: `up-product-analyst` → `up-system-designer` → `up-arquiteto` → `up-requirements-validator` (13 checks, score minimo 75%)
4. **Estagio 3 (Build):** Loop por fase com ciclo RARV: Reason (`up-planejador`) → Act (`up-executor`/`up-frontend-specialist`/`up-backend-specialist`/`up-database-specialist`) → Reflect (`up-code-reviewer`) → Verify (`up-verificador` + E2E Playwright)
5. **Estagio 4 (Quality Gate Loop):** Score composto de 7 dimensoes ate >= 9.0/10. Inclui `up-blind-validator`, 3 auditores, UX Tester, Mobile First, `up-security-reviewer`, `up-qa-agent`, `up-devops-agent`, `up-technical-writer`
6. **Estagio 5 (Entrega):** `DELIVERY.md` com quality score, metricas, screenshots

**Builder Light (`--light`):**

Pipeline enxuto (~50% menos tokens): Intake rapido → Mini-scan inline → Build + E2E → Resumo inline. Pula pesquisa, polish, UX tester, ideias, delivery.

**Gerenciamento de Estado:**
- `STATE.md` e o hub central — lido primeiro em cada workflow, atualizado apos cada acao significativa
- Tools CLI (`up-tools.cjs`) faz todas as operacoes de estado via subcomandos: `state load`, `state update`, `state save-session`, `state advance-plan`, etc.
- Persistencia entre sessoes: `/up:pausar` cria `.continue-aqui.md` → `/up:retomar` restaura contexto completo
- `state save-session` salva estado mesmo fora de comandos `/up:` (integrado via `CLAUDE.md` do projeto e instrucoes globais em `~/.claude/CLAUDE.md`)

## Abstracoes Chave

**Fase (Phase):**
- Proposito: Unidade de trabalho coerente no roadmap. Entrega algo completo e verificavel.
- Exemplos: `.plano/fases/01-autenticacao/`, `.plano/fases/02-dashboard/`
- Padrao: Diretorio com CONTEXT.md, RESEARCH.md, PLAN-NNN.md, SUMMARY-NNN.md, VERIFICATION.md
- Numeracao: Inteiros (1, 2, 3) para planejadas, decimais (2.1, 2.2) para insercoes urgentes

**Plano (Plan):**
- Proposito: Prompt executavel para um agente executor. Contem tarefas, dependencias, waves, must-haves.
- Exemplos: `.plano/fases/01-autenticacao/01-01-PLAN.md`, `.plano/fases/01-autenticacao/01-02-PLAN.md`
- Padrao: Frontmatter YAML + `<objective>`, tasks com especificacao detalhada, grafo de dependencias, ondas de execucao
- Nomeacao: `{fase_padded}-{plano_padded}-PLAN.md` (ex: `01-02-PLAN.md`)

**Summary:**
- Proposito: Registro do que foi realmente feito durante execucao de um plano
- Exemplos: `.plano/fases/01-autenticacao/01-01-SUMMARY.md`
- Padrao: Gerado pelo `up-executor` apos completar plano. Usado pelo verificador para comparar claims vs realidade.

**Wave:**
- Proposito: Grupo de planos que podem executar em paralelo (sem dependencias entre si)
- Padrao: Planos dentro de uma wave rodam simultaneamente via spawn de agentes. Waves executam em sequencia.

**Checkpoint:**
- Proposito: Ponto de pausa/retomada dentro de um plano longo
- Padrao: Definido no PLAN.md. Executor para e permite revisao antes de continuar.

## Pontos de Entrada

**Slash Commands (invocados pelo usuario):**
- Localizacao: `commands/*.md` → instalados em `~/.claude/commands/up/*.md`
- Gatilhos: Usuario digita `/up:nome-comando [args]` no CLI
- Responsabilidades: Definir escopo do comando, referenciar workflow, passar argumentos

**Principais commands e seus workflows:**

| Command | Workflow | Agentes Spawned |
|---------|----------|-----------------|
| `/up:novo-projeto` | `novo-projeto.md` → `iniciar.md` | `up-pesquisador-projeto`, `up-roteirista` |
| `/up:discutir-fase N` | `discutir-fase.md` | Nenhum (orquestrador faz direto) |
| `/up:planejar-fase N` | `planejar-fase.md` | `up-planejador` |
| `/up:executar-fase N` | `executar-fase.md` → `executar-plano.md` | `up-executor` (ou specialists) |
| `/up:verificar-trabalho N` | `verificar-trabalho.md` | `up-verificador` |
| `/up:modo-builder` | `builder.md` + `builder-e2e.md` | 33 agentes em pipeline |
| `/up:mapear-codigo` | `mapear-codigo.md` | `up-mapeador-codigo` (4 instancias paralelas) |
| `/up:retomar` | `retomar.md` | Nenhum |
| `/up:progresso` | `progresso.md` | Nenhum |
| `/up:rapido "tarefa"` | `rapido.md` | `up-executor` |
| `/up:depurar` | Inline | `up-depurador` |
| `/up:ux-tester` | `ux-tester.md` | Inline (usa Playwright MCP) |
| `/up:mobile-first` | `mobile-first.md` | Inline (usa Playwright MCP) |
| `/up:clone-builder` | `clone-builder.md` → `builder.md` | `up-clone-*` (5 agentes) + builder pipeline |
| `/up:pausar` | `pausar.md` | Nenhum |
| `/up:adicionar-fase` | `adicionar-fase.md` | Nenhum |
| `/up:remover-fase` | `remover-fase.md` | Nenhum |
| `/up:saude` | Inline | Nenhum |
| `/up:configurar` | Inline | Nenhum |
| `/up:atualizar` | Inline | Nenhum |
| `/up:ajuda` | Inline | Nenhum |
| `/up:dashboard` | Inline | Nenhum |

**Tools CLI:**
- Localizacao: `bin/up-tools.cjs`
- Gatilhos: Chamado por workflows via `node "$HOME/.claude/up/bin/up-tools.cjs" <command> [args]`
- Subcomandos principais:
  - `init <workflow> [phase]` — Retorna JSON com contexto completo para um workflow iniciar
  - `state load|update|save-session|advance-plan|add-decision|snapshot` — CRUD de STATE.md
  - `roadmap get-phase|analyze|update-plan-progress` — Parsing e update de ROADMAP.md
  - `phase add|remove|find|complete|generate-from-report` — Operacoes de fase
  - `phase-plan-index <phase>` — Inventario de planos com agrupamento por wave
  - `config get|set` — Ler/escrever config.json
  - `commit <msg> --files` — Commit atomico via git
  - `progress [json|table|bar]` — Calcular e exibir progresso
  - `slug <text>` — Gerar slug para nome de fase/diretorio
  - `timestamp` — Timestamp formatado
  - `summary-extract <path>` — Extrair campos de SUMMARY.md

**Hooks:**
- `up-statusline.js` — StatusLine hook. Mostra: model, diretorio, uso de contexto (barra de progresso). Escreve metricas de contexto em bridge file (`/tmp/claude-ctx-{session}.json`).
- `up-context-monitor.js` — PostToolUse hook. Le bridge file do statusline. Emite warnings quando contexto esta cheio (remaining < 15% = warning, < 8% = critico). Debounce de 5 chamadas.

## Estrutura do `.plano/` (Diretorio de Planejamento)

Criado em cada projeto do usuario. Layout completo:

```
.plano/
├── PROJECT.md              # Descricao, requisitos, valor central, decisoes
├── REQUIREMENTS.md         # Requisitos detalhados com categorias e rastreabilidade
├── ROADMAP.md              # Fases com status, dependencias, criterios de sucesso
├── STATE.md                # Posicao atual, progresso, continuidade (< 150 linhas)
├── config.json             # Configuracoes do workflow
├── BRIEFING.md             # Briefing do usuario (builder mode)
├── LOCK.md                 # Crash recovery (builder mode, frontmatter com stage/phase/step)
├── DELIVERY.md             # Relatorio de entrega (builder mode)
│
├── codebase/               # Mapeamento do codebase existente (brownfield)
│   ├── STACK.md            # Tecnologias, frameworks, dependencias
│   ├── ARCHITECTURE.md     # Design, fluxo de dados, padroes
│   ├── STRUCTURE.md        # Organizacao de diretorios
│   ├── CONVENTIONS.md      # Estilo de codigo, nomeacao
│   ├── INTEGRATIONS.md     # APIs externas, banco de dados, auth
│   ├── TESTING.md          # Infraestrutura de testes
│   └── CONCERNS.md         # Divida tecnica, areas frageis
│
├── fases/                  # Diretorio por fase
│   ├── 01-autenticacao/
│   │   ├── CONTEXT.md      # Decisoes da discussao (discutir-fase)
│   │   ├── RESEARCH.md     # Pesquisa de dominio/tecnologia
│   │   ├── 01-01-PLAN.md   # Plano executavel 1
│   │   ├── 01-02-PLAN.md   # Plano executavel 2
│   │   ├── 01-01-SUMMARY.md # Resultado da execucao do plano 1
│   │   ├── 01-02-SUMMARY.md # Resultado da execucao do plano 2
│   │   └── VERIFICATION.md # Resultado da verificacao
│   └── 02-dashboard/
│       └── ...
│
├── rapido/                 # Tarefas rapidas
│   └── TASK-001.md
│
├── debug/                  # Sessoes de debug
│   ├── bug-login.md
│   └── resolved/
│
├── melhorias/              # Auditoria de codigo
│   └── RELATORIO.md
│
├── ideias/                 # Sugestoes de features com ICE scoring
│   └── RELATORIO.md
│
├── ux-review/              # UX tester (Playwright)
│   ├── UX-REPORT.md
│   └── screenshots/
│
├── e2e/                    # Testes E2E (builder mode)
│   ├── E2E-REPORT.md
│   ├── smoke/
│   └── responsive/
│
├── captures/               # Insights de agentes durante build
│   └── TRIAGE.md
│
└── clone/                  # Clone builder artifacts
    ├── DESIGN-SYSTEM.md
    ├── FEATURE-MAP.md
    └── screenshots/
```

## 33 Agentes Especializados

Organizados por funcao no pipeline:

**Arquitetura (planejamento de projeto):**
- `up-product-analyst` — Pesquisa concorrentes, define personas, features obrigatorias do mercado
- `up-system-designer` — Define modulos, roles, schema, permissoes. Aplica 10 blueprints de producao
- `up-arquiteto` — Transforma analise + design em PROJECT.md, REQUIREMENTS.md, ROADMAP.md
- `up-requirements-validator` — 13 checks automaticos. Score minimo 75% para prosseguir

**Execucao (build de codigo):**
- `up-planejador` — Cria PLAN.md com pesquisa inline, self-check, grafo de dependencias
- `up-executor` — Executor generico. Executa PLAN.md com commits atomicos, cria SUMMARY.md
- `up-frontend-specialist` — Componentes com todos estados de UI, responsivo, a11y
- `up-backend-specialist` — API design, validacao, auth, rate limiting, paginacao
- `up-database-specialist` — Schema, migrations, RLS, indices, seed data, soft delete

**Qualidade (review + teste):**
- `up-code-reviewer` — Reflect step: revisa contra production-requirements
- `up-verificador` — Verificacao goal-backward. Nao confia em SUMMARY.md, verifica codigo real
- `up-blind-validator` — Testa como usuario final SEM ler codigo (20% do score no builder)
- `up-security-reviewer` — OWASP Top 10, auth bypass, injection, secrets
- `up-qa-agent` — Escreve e roda testes, identifica gaps de cobertura

**Auditoria (polish):**
- `up-auditor-ux` — Audit de UX patterns
- `up-auditor-performance` — Audit de performance
- `up-auditor-modernidade` — Audit de modernidade de codigo
- `up-sintetizador-melhorias` — Consolida auditorias em acoes

**Producao (finalizacao):**
- `up-devops-agent` — Dockerfile, CI/CD, .env.example, seed data
- `up-technical-writer` — README, API docs, CHANGELOG, setup guide

**Codebase Mapping (brownfield):**
- `up-mapeador-codigo` — Analisa codebase por area de foco (tech, arch, quality, concerns)
- `up-analista-codigo` — Analise detalhada de codigo

**Pesquisa:**
- `up-pesquisador-projeto` — Pesquisa de dominio e tecnologia para novo projeto
- `up-pesquisador-mercado` — Pesquisa de mercado/concorrentes

**Pipeline:**
- `up-roteirista` — Cria ROADMAP.md com fases e criterios de sucesso
- `up-sintetizador` — Sintetiza pesquisa em documentos estruturados
- `up-consolidador-ideias` — Consolida sugestoes de features com ICE scoring
- `up-depurador` — Investigacao de bugs com metodo cientifico

**Clone Builder:**
- `up-clone-crawler` — Navega app via Playwright, screenshots, intercepta APIs
- `up-clone-design-extractor` — Extrai design system: cores, fontes, espacamento
- `up-clone-feature-mapper` — Mapeia modulos, features, roles, data model
- `up-clone-prd-writer` — Sintetiza em PRD para builder
- `up-clone-verifier` — Verifica fidelidade funcional + visual contra original

## Formato de Agents

Frontmatter YAML + corpo Markdown com XML estruturado:

```yaml
---
name: up-executor
description: Executa PLAN.md com commits atomicos e SUMMARY.md
tools: Read, Write, Edit, Bash, Grep, Glob
color: yellow
---
```

- `tools`: Comma-separated list de tools permitidas (Read, Write, Edit, Bash, Grep, Glob, WebFetch, WebSearch, Task, AskUserQuestion, mcp__context7__*, mcp__plugin_playwright_playwright__*)
- `color`: blue, green, yellow, red, cyan, magenta, orange, purple
- `model`: opus, sonnet, haiku, inherit (opcional — default depende do host)

## Formato de Commands

Frontmatter YAML + corpo Markdown com XML:

```yaml
---
name: up:executar-fase
description: Executar todos os planos de uma fase com paralelizacao por ondas
argument-hint: "<fase> [--gaps-only]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
  - AskUserQuestion
---
```

Corpo usa: `<objective>`, `<execution_context>` (com `@path` references), `<context>` (`$ARGUMENTS`), `<process>`

## Comunicacao entre Componentes

**Workflow → Tools CLI:**
```bash
INIT=$(node "$HOME/.claude/up/bin/up-tools.cjs" init executar-fase "${PHASE_ARG}")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```
- Output: JSON com contexto completo (paths, flags, estado atual)
- Se output > 200KB: salvo em arquivo temporario, retorna `@file:/tmp/up-*.json`

**Workflow → Agent (spawn):**
Via `Task` tool do host CLI. Cada agente recebe:
- Instrucoes em `<files_to_read>` block (caminhos de arquivos para carregar)
- Contexto do projeto (STATE.md, ROADMAP.md, PLAN.md, etc.)
- Agente opera com contexto fresco (sem herdar tokens do orquestrador)

**Hooks → Hooks (bridge file):**
- `up-statusline.js` escreve metricas em `/tmp/claude-ctx-{session_id}.json`
- `up-context-monitor.js` le esse bridge file para decidir se emite warning
- Debounce: counter file em `/tmp/claude-ctx-warn-{session_id}.json`

## Tratamento de Erros

**Estrategia:** Falhas sao contornadas, nunca bloqueiam. O builder "SEMPRE entrega algo."

- Tools CLI: `error()` function que escreve em stderr e sai com exit code 1
- Workflows: Verificam JSON de retorno do init. Se `phase_found: false`, exibem erro amigavel.
- Builder Mode: Crash recovery via `LOCK.md` — frontmatter com `stage`, `phase`, `step`. Ao reiniciar, detecta LOCK.md e retoma de onde parou.
- Output grande: Se JSON > 200KB, salvo em temp file com protocolo `@file:` para evitar estouro de contexto

## Preocupacoes Transversais

**Logging:** Nenhum logging formal. Workflows usam output direto para o usuario. Agentes escrevem SUMMARY.md como registro de execucao.

**Validacao:** Tools CLI valida existencia de `.plano/`, `STATE.md`, `ROADMAP.md` antes de operar. Requirements validator roda 13 checks automaticos antes do build.

**Autenticacao:** Nao aplicavel (ferramenta local). Credenciais de projeto sao passadas via briefing do usuario, nunca armazenadas pelo UP.

**Internacionalizacao:** Todo texto user-facing em Portugues Brasileiro. Nomes de arquivo/diretorio em portugues (`.plano/`, `fases/`, `rapido/`).

**Conversao Multi-Runtime:**
- Claude Code: Formato nativo (YAML frontmatter + Markdown)
- Gemini CLI: Tools como YAML array, color removido, `${VAR}` escapado, commands em TOML
- OpenCode: Tools como object (`tool: true`), color em hex, name removido, commands flat (`up-*.md`)

## Instalacao e Layout Instalado

O installer (`bin/install.js`) copia para o config dir do host CLI:

```
~/.claude/                    # (ou ~/.gemini/, ~/.config/opencode/)
├── up/                       # Core do UP (copia completa do pacote)
│   ├── bin/
│   │   ├── up-tools.cjs      # CLI de estado/operacoes
│   │   └── lib/core.cjs      # Utilidades compartilhadas
│   ├── workflows/*.md         # Logica de orquestracao
│   ├── templates/*.md         # Templates de documentos
│   ├── references/*.md        # Docs compartilhados
│   └── VERSION                # Versao instalada
├── agents/
│   └── up-*.md               # 33 agentes especializados
├── commands/
│   └── up/*.md               # ~25 slash commands
├── hooks/
│   ├── up-statusline.js      # StatusLine hook
│   └── up-context-monitor.js # PostToolUse hook
├── settings.json             # Atualizado com hooks
└── builder-defaults.md       # Preferencias do usuario (opcional, criado manualmente)
```

Caminhos no conteudo dos arquivos sao substituidos durante instalacao:
- `$HOME/.claude/` → path real do target dir (global) ou `./.claude/` (local)
