# Changelog

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
