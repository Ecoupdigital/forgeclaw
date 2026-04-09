# Stack de Tecnologia

**Data da Analise:** 2026-04-09
**Repositorio:** `~/repos/claude-code-telegram/`

## Linguagens

**Principal:**
- Python 3.11+ (target 3.11/3.12) - Todo o codebase (`src/`, `tests/`)

**Secundaria:**
- YAML - Configuracao de projetos (`config/projects.example.yaml`)
- SQL - Schema embarcado em Python (`src/storage/database.py`)

## Runtime

**Ambiente:**
- Python >= 3.11 (definido em `pyproject.toml` `requires-python`)
- asyncio como loop de eventos principal (todo o codebase e async)

**Gerenciador de Pacotes:**
- Poetry (poetry-core >= 2.0.0 como build backend)
- Lockfile: `poetry.lock` presente
- Entry point: `claude-telegram-bot = "src.main:run"`

## Frameworks

**Core:**
- python-telegram-bot ^22.6 (com extras `rate-limiter`) - Bot Telegram com AIORateLimiter
- FastAPI ^0.115.0 - Servidor de webhooks HTTP (`src/api/server.py`)
- Pydantic ^2.11.5 + pydantic-settings ^2.9.1 - Validacao e configuracao (`src/config/settings.py`)

**Testes:**
- pytest ^8.4.0 - Runner de testes
- pytest-asyncio ^1.0.0 - Suporte a testes async (mode `auto`)
- pytest-cov ^6.1.1 - Cobertura de codigo
- pytest-mock ^3.14.1 - Mocking

**Build/Dev:**
- black ^25.1.0 - Formatacao (line-length 88, target py311)
- isort ^6.0.1 - Ordenacao de imports (profile "black")
- flake8 ^7.2.0 - Linting
- mypy ^1.16.0 - Type checking (python_version 3.11, disallow_untyped_defs)
- autoflake ^2.3.2 - Remocao de imports nao usados
- pre-commit ^4.0.0 - Git hooks
- watchfiles ^1.1.1 - Hot reload em dev

## Dependencias Chave

**Criticas:**
- `claude-agent-sdk` ^0.1.39 - SDK Python oficial do Claude Code para execucao de agente (`src/claude/sdk_integration.py`)
- `anthropic` ^0.40.0 - SDK da Anthropic API (dependencia do agent SDK)

**Infraestrutura:**
- `aiosqlite` ^0.21.0 - Acesso async ao SQLite (`src/storage/database.py`)
- `structlog` ^25.4.0 - Logging estruturado (JSON em prod, console em dev) (`src/main.py`)
- `uvicorn` ^0.34.0 (extras `standard`) - Servidor ASGI para FastAPI (`src/api/server.py`)
- `apscheduler` ^3.10 - Scheduler de jobs cron (`src/scheduler/scheduler.py`)
- `PyYAML` ^6.0.2 - Parsing de configuracao YAML de projetos (`src/projects/registry.py`)
- `aiofiles` ^24.1.0 - I/O de arquivos async
- `python-dotenv` ^1.0.0 - Carregamento de `.env`

**Opcionais (extras `voice`):**
- `mistralai` ^1.0.0 - Transcricao de voz via Mistral Voxtral
- `openai` ^1.0.0 - Transcricao de voz via OpenAI Whisper
- Suporte local via whisper.cpp (binario externo)

## Configuracao

**Ambiente:**
- Configurado via variaveis de ambiente e `.env` (Pydantic Settings)
- Arquivo `.env.example` presente como referencia (nunca leia `.env`)
- Classe principal: `src/config/settings.py` (`Settings(BaseSettings)`)
- Feature flags: `src/config/features.py` (`FeatureFlags`)
- Loader: `src/config/loader.py`
- Suporte a ambientes via `src/config/environments.py`

**Variaveis criticas (nao leia valores, apenas nomes):**
- `TELEGRAM_BOT_TOKEN` - Token do bot
- `TELEGRAM_BOT_USERNAME` - Username do bot
- `APPROVED_DIRECTORY` - Diretorio base para projetos
- `ALLOWED_USERS` - Lista de IDs Telegram permitidos (whitelist)
- `ANTHROPIC_API_KEY` - Chave API Anthropic (opcional se CLI logado)
- `DATABASE_URL` - URL SQLite (default: `sqlite:///data/bot.db`)
- `GITHUB_WEBHOOK_SECRET` - Secret HMAC para webhooks GitHub
- `WEBHOOK_API_SECRET` - Secret compartilhado para webhooks genericos
- `ENABLE_API_SERVER` / `API_SERVER_PORT` - Ativacao do servidor FastAPI
- `ENABLE_SCHEDULER` - Ativacao do APScheduler
- `ENABLE_PROJECT_THREADS` / `PROJECT_THREADS_MODE` / `PROJECT_THREADS_CHAT_ID` - Topicos por projeto
- `PROJECTS_CONFIG_PATH` - Caminho para YAML de projetos

**Build:**
- `pyproject.toml` - Configuracao centralizada (Poetry, pytest, black, isort, mypy, flake8)
- `setup.cfg` - Configuracao complementar
- `Makefile` - Targets de automacao
- `.pre-commit-config.yaml` - Hooks de pre-commit

## Banco de Dados

**Tipo:** SQLite (via aiosqlite)
**Schema versionado:** Sim, migracao sequencial embarcada em `src/storage/database.py`
**Versao atual do schema:** 4 migracoes

**Tabelas principais:**
- `users` - Usuarios Telegram (id, username, stats de custo)
- `sessions` - Sessoes Claude Code (session_id, user_id, project_path, custos)
- `messages` - Historico de prompts/respostas
- `tool_usage` - Rastreamento de ferramentas usadas
- `audit_log` - Log de auditoria
- `user_tokens` - Tokens de autenticacao
- `cost_tracking` - Rastreamento de custos diarios
- `scheduled_jobs` - Jobs agendados do scheduler (persistidos)
- `webhook_events` - Deduplicacao de webhooks (delivery_id UNIQUE)
- `project_threads` - Mapeamento projeto <-> topico Telegram (chat_id, message_thread_id, project_slug)

**Views:**
- `daily_stats` - Estatisticas diarias agregadas
- `user_stats` - Estatisticas por usuario

**Connection pooling:** Pool manual de 5 conexoes em `DatabaseManager`
**WAL mode:** Habilitado (migracao 3)

## Requisitos de Plataforma

**Desenvolvimento:**
- Python 3.11+
- Poetry instalado
- Claude Code CLI instalado (para o agent SDK)
- SQLite3 (incluido no Python)

**Producao:**
- Linux (systemd setup documentado em `SYSTEMD_SETUP.md`)
- Suporte a proxy HTTP/HTTPS (configuravel via env vars `HTTP_PROXY`/`HTTPS_PROXY`)
- Porta 8080 (API server, quando habilitado)
- Porta 8443 (webhook Telegram, quando habilitado)
