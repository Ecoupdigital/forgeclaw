# ForgeClaw

## What This Is

ForgeClaw e um sistema pessoal de IA proativo e reativo com 3 interfaces: bot Telegram (mobile), dashboard web (desktop) e instalador CLI (onboarding). O motor e o Claude Code CLI rodando como subprocess via Bun.spawn, com streaming NDJSON e sessoes persistidas em SQLite. O sistema e capaz de executar tarefas agendadas (crons), navegar um vault Obsidian para injetar contexto, e manter memoria persistente com daily logs e dreaming.

## Core Value

O Claude Code deve responder de forma confiavel via Telegram com isolamento perfeito entre topicos -- cada topico e uma sessao independente, e mensagens nunca vazam entre elas.

## Requirements

### Validated

(None yet -- ship to validate)

### Active

- [ ] SETUP-01: Inicializar monorepo Bun workspaces com packages/core, packages/bot, packages/dashboard, packages/cli
- [ ] SETUP-02: Configurar TypeScript strict, path aliases entre packages, scripts de dev/build
- [ ] SETUP-03: Configurar SQLite via bun:sqlite com schema inicial (sessions, messages, topics, cron_jobs, cron_logs)
- [ ] SETUP-04: Criar forgeclaw.config.json com schema de configuracao (tokens, paths, whitelist)
- [ ] CORE-01: Implementar SessionManager com SESSION_IDs compostos por topico, suporte a --resume
- [ ] CORE-02: Implementar ClaudeRunner com Bun.spawn, NDJSON streaming, auto-retry (max 3)
- [ ] CORE-03: Implementar EventBus pub/sub tipado com fila async
- [ ] CORE-04: Implementar StateStore (repository pattern sobre bun:sqlite)
- [ ] BOT-01: Configurar bot grammy com polling e sequentialize por chat_id
- [ ] BOT-02: Implementar roteamento de mensagens por topico (thread_id -> session)
- [ ] BOT-03: Implementar streaming de respostas com message edit throttled
- [ ] BOT-04: Implementar whitelist de usuarios autorizados
- [ ] BOT-05: Implementar fila de mensagens FIFO (max 5) quando query em execucao
- [ ] BOT-06: Implementar interrupt via prefixo `!`
- [ ] HARNESS-01: Definir formato dos 7 arquivos do harness (~/.forgeclaw/harness/)
- [ ] HARNESS-02: Implementar HarnessLoader que le e parseia os 7 arquivos
- [ ] HARNESS-03: Implementar ContextBuilder que monta contexto completo antes de cada chamada
- [ ] HARNESS-04: Gerar CLAUDE.md orquestrador que referencia os harness files
- [ ] MEM-01: Implementar auto-memory (extrair insights de conversas e salvar)
- [ ] MEM-02: Implementar VaultNavigator para navegar Obsidian vault e injetar contexto
- [ ] MEM-03: Implementar memory compiler com daily logs
- [ ] MEM-04: Implementar dreaming (consolidacao de memoria em idle)
- [ ] UP-01: Implementar UPDetector que detecta /up:* patterns no output do Claude
- [ ] UP-02: Transformar deteccoes /up:* em botoes inline do Telegram
- [ ] UP-03: Detectar opcoes numeradas no output e gerar botoes correspondentes
- [ ] VOICE-01: Implementar transcricao de voz via OpenAI Whisper
- [ ] FILE-01: Implementar recebimento de arquivos (PDF via pdftotext, imagens, archives)
- [ ] FILE-02: Implementar envio de arquivos gerados pelo Claude de volta ao usuario
- [ ] CRON-01: Implementar CronEngine com parser de expressoes cron
- [ ] CRON-02: Implementar parser de HEARTBEAT.md para extrair schedule de jobs
- [ ] CRON-03: Implementar hot reload de cron jobs (file watcher em HEARTBEAT.md)
- [ ] CRON-04: Implementar roteamento de resultado de cron para topico configurado
- [ ] DASH-01: Implementar dashboard Next.js 15 com layout base e autenticacao localhost-only
- [ ] DASH-02: Implementar chat view com streaming via WebSocket
- [ ] DASH-03: Implementar kanban de sessoes/topicos com atualizacao real-time
- [ ] DASH-04: Implementar UI de gerenciamento de crons
- [ ] DASH-05: Implementar UI de visualizacao/edicao de memoria
- [ ] DASH-06: Implementar UI de configuracao (forgeclaw.config.json)
- [ ] DASH-07: Implementar UI de edicao do harness (7 arquivos)
- [ ] CLI-01: Implementar npx forgeclaw install com onboarding interativo (@clack/prompts)
- [ ] CLI-02: Implementar deteccao de ambiente (Ubuntu/macOS) e instalacao de dependencias
- [ ] CLI-03: Gerar forgeclaw.config.json interativamente
- [ ] CLI-04: Configurar servico systemd (Linux) ou launchd (macOS)
- [ ] TEST-01: Testes unitarios para core modules (SessionManager, ClaudeRunner, EventBus, StateStore)
- [ ] TEST-02: Testes de integracao para fluxo completo (mensagem -> Claude -> resposta)
- [ ] TEST-03: Testes E2E do bot Telegram (mock da API)
- [ ] TEST-04: Testes do dashboard (componentes + WebSocket)
- [ ] DOC-01: README com arquitetura, setup, configuracao
- [ ] DOC-02: Documentacao do harness system
- [ ] DOC-03: Documentacao da API WebSocket do dashboard

### Out of Scope

- Multi-usuario simultaneo -- sistema pessoal, um usuario por vez
- Deploy em cloud -- roda local na maquina do usuario
- Interface web publica -- dashboard apenas em localhost
- Suporte a outros LLMs alem do Claude Code CLI -- motor unico
- App mobile nativo -- Telegram serve como interface mobile
- Banco de dados remoto (Postgres, MySQL) -- SQLite local e suficiente
- Docker/containerizacao -- roda direto no host com Bun
- Internacionalizacao -- interface em portugues brasileiro, harness em ingles
- Marketplace de harness/plugins -- escopo pessoal

## Context

### Stack
- **Runtime:** Bun (nao Node.js)
- **Linguagem:** TypeScript (strict)
- **Bot Telegram:** grammy (framework leve, bom suporte a TypeScript)
- **Dashboard:** Next.js 15 + Tailwind CSS + shadcn/ui
- **CLI Installer:** @clack/prompts (UX moderna para CLI)
- **Database:** SQLite via bun:sqlite (zero config, embarcado)
- **Realtime:** WebSocket nativo do Bun (sem socket.io)
- **Motor AI:** Claude Code CLI como subprocess (Bun.spawn)
- **Workflow:** UP-CC (npx up-cc@latest)
- **Monorepo:** Bun workspaces

### Credenciais/APIs Necessarias
- `TELEGRAM_BOT_TOKEN` -- token do BotFather
- `TELEGRAM_ALLOWED_USERS` -- IDs de usuarios permitidos
- `OPENAI_API_KEY` -- para transcricao de voz (Whisper)
- `OBSIDIAN_VAULT_PATH` -- caminho para o vault Obsidian

### Pesquisa de Referencia
Analisados 4 repos de referencia que implementam padroes similares:
- **GSD (TypeScript/grammy):** Streaming NDJSON via spawn, action keyboards, message queue FIFO, interrupt via `!`, voice via Whisper, file handling (PDF/images/archives)
- **CCT (Python):** EventBus pub/sub tipado, project thread manager, SQLite persistence com repository pattern, scheduler com cron, webhook server, notification service
- **Ductor (Python):** SessionKey composta (transport:chat_id:topic_id), MessageBus com Envelope pattern, lock pool per-session, heartbeat observer, cron observer com cronsim, config hot-reload, named sessions
- **CCBot (Python):** JSONL session file reading com byte offset, hook system para session registration, atomic file writes, per-user message queue com merge

### Decisoes de Design
- Monorepo com 4 packages: core (logica compartilhada), bot (grammy), dashboard (Next.js), cli (installer)
- Core e o package mais importante -- bot e dashboard sao consumidores
- EventBus desacopla fontes (bot, cron, webhook) de handlers (ClaudeRunner, notificacoes)
- SessionManager usa chave composta chat_id:topic_id (inspirado no Ductor)
- Lock por sessao para evitar acesso concorrente ao CLI (inspirado no Ductor)
- Streaming callbacks tipados: thinking, tool, text, segment_end, done (inspirado no GSD)
- Repository pattern para SQLite (inspirado no CCT)
- Harness system com 7 arquivos que definem a personalidade e comportamento do AI

## Constraints

- **Runtime:** Bun >= 1.1 -- projeto inteiro roda em Bun, nao Node.js
- **Motor AI:** Claude Code CLI -- unico motor, nao substituivel
- **Database:** SQLite via bun:sqlite -- sem ORM, queries diretas
- **Plataforma primaria:** Linux Ubuntu 22.04+ -- macOS como secundario
- **Seguranca:** Tokens em forgeclaw.config.json com chmod 600, dashboard localhost-only
- **Performance:** Streaming < 500ms para iniciar, kanban < 1s para atualizar
- **Confiabilidade:** Auto-retry max 3 em crash do CLI

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Bun como runtime | Especificado no briefing | Do usuario |
| grammy como framework Telegram | Especificado no briefing | Do usuario |
| Next.js 15 + shadcn/ui para dashboard | Especificado no briefing | Do usuario |
| @clack/prompts para CLI | Especificado no briefing | Do usuario |
| SQLite via bun:sqlite | Especificado no briefing | Do usuario |
| WebSocket nativo do Bun | Especificado no briefing | Do usuario |
| Monorepo com Bun workspaces | Especificado no briefing | Do usuario |
| UP-CC como workflow | Especificado no briefing | Do usuario |
| SessionKey composta chat_id:topic_id | Padrao do Ductor, melhor isolamento que session singleton do GSD | Decisao do arquiteto |
| Lock pool per-session | Evita concurrent CLI access ao mesmo topico (Ductor pattern) | Decisao do arquiteto |
| EventBus desacoplado | CCT provou que desacoplar fontes de handlers escala melhor que callbacks diretos | Decisao do arquiteto |
| Repository pattern para SQLite | CCT e Ductor usam com sucesso, encapsula queries | Decisao do arquiteto |
| Streaming callbacks tipados (thinking/tool/text/segment_end/done) | GSD provou que esse modelo funciona bem com grammy | Decisao do arquiteto |
| FIFO queue max 5 | GSD usa com sucesso, previne flood sem perder mensagens | Decisao do arquiteto |
| Interrupt via prefixo `!` | GSD pattern, intuitivo e nao conflita com texto normal | Decisao do arquiteto |
| Atomic file writes (temp+rename) | CCBot pattern para prevenir corrupcao de estado | Decisao do arquiteto |
| cronsim para parsing de cron expressions | Ductor usa com sucesso, leve e confiavel. Porta para TS sera via cron-parser npm | Decisao do arquiteto |
| pdftotext para PDFs | GSD pattern, nao depende de lib JS pesada | Decisao do arquiteto |
| Harness em ~/.forgeclaw/harness/ | Separado do projeto para ser pessoal e reutilizavel entre projetos | Decisao do arquiteto |

---
*Last updated: 2026-04-09 after project initialization*
