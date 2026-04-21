# Changelog

## [0.2.0] - 2026-04-21

Mudanca grande: ForgeClaw deixa de ser uso pessoal do Jonathan e vira produto distribuido pra comunidade Dominando AutoIA.

### Added

**Distribuicao (Fase 23, Fase 29)**
- LICENSE: ForgeClaw Community Source License v1.0 (source-available, sem redistribuicao/revenda)
- ACCESS.md com fluxo de concessao e revogacao de acesso via repo privado GitHub
- Script ops/gate/access.ts (grant/revoke/list/audit) para operar invites manualmente
- Audit log em ops/gate/access-log.jsonl com cada acao de acesso
- Auditor automatizado em scripts/audit-personal-context.ts que detecta contexto pessoal vazando no repo
- CI guard anti-vazamento rodando a cada push

**Arquetipos (Fase 24)**
- 5 arquetipos prontos: Solo Builder, Criador de Conteudo, Agencia/Freela, Gestor E-commerce, Generico
- Cada arquetipo com harness completo (SOUL, USER, AGENTS, TOOLS, MEMORY, STYLE, HEARTBEAT) + metadata (archetype.json)
- API publica `loadArchetype`, `listArchetypes`, `renderArchetype` em `packages/cli/src/templates/archetypes`
- Placeholders universais: `{{userName}}`, `{{company}}`, `{{role}}`, `{{workingDir}}`, `{{vaultPath}}`, `{{timezone}}`, `{{today}}`

**Installer em 3 fases (Fase 25)**
- Fase A tecnica: valida Claude Code CLI autenticado, coleta credenciais, verifica Bun >= 1.1
- Fase B arquetipo: escolha interativa ou flag `--archetype <slug>`, renderiza harness no ~/.forgeclaw/harness/
- Fase C handoff: sobe dashboard, polling em /api/health, abre browser em /onboarding com token
- Flag `--resume` retoma de `.install-state.json` se interrompido
- Flag `--no-handoff` para CI/tests
- Comando `forgeclaw refine` (Fase 28) reexecuta a entrevista sem reinstalar o produto

**Onboarding conversacional (Fase 26, Fase 27)**
- Persona Entrevistador ForgeClaw com system prompt fixo e roteiro por arquetipo
- Output em diff estruturado do harness (bounded por turnos e tokens)
- Rota `/onboarding` no dashboard: chat conversacional esquerda + preview dos arquivos do harness direita
- Sentinel `.onboarded` em `~/.forgeclaw/` marca entrevista concluida

### Changed

- README.md reescrito como guia de boas-vindas para membro da comunidade (nao mais para dev curioso). Quick Start em 4 passos. Linguagem de beneficio, nao de feature.
- Campo `license` do `package.json` passou de "MIT" (mentiroso) para "SEE LICENSE IN LICENSE"
- Visibilidade do repo `github.com/Ecoupdigital/forgeclaw`: de public para private
- Installer deixa de ser monolito (install.ts ~435 linhas) e passa a ser orquestrador A/B/C

### Removed

- Contexto pessoal do Jonathan que vazava em: harness prompts, mock-data do dashboard, daily-log paths hardcoded, sessoes do .playwright-mcp, unit files do ops/ — todos substituidos por placeholders genericos
- Mencao a "MIT License" no README (licenca mudou, nao esta mais open-source)

## [0.1.0] - 2026-04-09

### Added

**Core (@forgeclaw/core)**
- ClaudeRunner: execucao do Claude Code CLI com streaming JSON, retry (3x), abort gracioso
- SessionManager: sessoes por chat/topico com locking por key
- StateStore: persistencia SQLite (bun:sqlite) com WAL -- sessions, messages, topics, cron_jobs, cron_logs
- EventBus: pub/sub assincrono tipado (message, stream, session, cron events)
- CronEngine: parser de HEARTBEAT.md com schedule em portugues natural, hot-reload com debounce
- MemoryManager: daily logs com timestamps + compilacao para MEMORY.md
- HarnessLoader: carregamento de harness files com cache por mtime
- ContextBuilder: montagem de contexto completo (harness + daily log + vault + state)
- VaultNavigator: integracao Obsidian (instrucoes, estrutura, busca)
- FileHandler: download Telegram + extracao (PDF, texto, ZIP, tar.gz, imagens)
- VoiceHandler: transcricao via OpenAI Whisper (fetch nativo)
- UPDetector: deteccao de /up: commands e opcoes numeradas
- Config: carregamento com validacao, cache, hot-reload via file watch

**Bot (@forgeclaw/bot)**
- Bot Telegram com grammy + runner concorrente
- Handlers: text, voice, document, photo, callbacks
- Streaming em tempo real via edits de mensagem (throttle 500ms)
- Fila de mensagens por sessao (max 5)
- Interrupcao com prefixo `!`
- Auth middleware (whitelist por user ID)
- Sequentialize por chat:topicId
- Conversao Markdown -> Telegram HTML
- Barra visual de contexto usage
- Deteccao automatica de botoes (UP commands + opcoes numeradas)
- Roteamento de resultados de cron para topicos

**Dashboard (@forgeclaw/dashboard)**
- Dashboard Web com Next.js 16 + React 19 + Tailwind 4
- 5 abas: Sessions, Crons, Memory, Harness, Config
- API routes para todas as entidades
- Tema dark com Inter + JetBrains Mono
- Componentes shadcn/ui

**CLI (forgeclaw)**
- Installer interativo com @clack/prompts
- Deteccao de dependencias (bun, claude CLI)
- Geracao de config e harness files
- Setup de servico (systemd/launchd)
- Comandos: install, update, uninstall, status, logs
