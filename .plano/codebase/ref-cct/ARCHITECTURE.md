# Arquitetura

**Data da Analise:** 2026-04-09
**Repositorio:** `~/repos/claude-code-telegram/`

## Visao Geral do Padrao

**Geral:** Arquitetura orientada a eventos com facade pattern, organizacao em camadas

**Caracteristicas Chave:**
- Event Bus central (`src/events/bus.py`) desacopla fontes de eventos (Telegram, webhooks, cron) de handlers (agente Claude, notificacoes)
- Facade pattern em `ClaudeIntegration` (`src/claude/facade.py`) e `Storage` (`src/storage/facade.py`) simplificam interfaces complexas
- Dependency injection manual via dicionario `deps` passado ao bot e orchestrator
- Feature flags controlam ativacao de componentes opcionais (API server, scheduler, project threads)
- Dois modos de operacao: "agentic" (conversacional, padrao) e "classic" (baseado em comandos)

## Camadas

**Configuracao (`src/config/`):**
- Proposito: Carregar e validar configuracao da aplicacao
- Localizacao: `src/config/`
- Contem: `settings.py` (Pydantic Settings), `features.py` (feature flags), `loader.py`, `environments.py`
- Depende de: Variaveis de ambiente, `.env`
- Usado por: Todas as camadas

**Bot Telegram (`src/bot/`):**
- Proposito: Interface Telegram - handlers, middleware, orchestrator de mensagens
- Localizacao: `src/bot/`
- Contem:
  - `core.py` - Classe principal `ClaudeCodeBot`, setup da Application python-telegram-bot
  - `orchestrator.py` - `MessageOrchestrator`, ponto unico de entrada para todos os updates Telegram
  - `handlers/command.py` - Handlers de comandos (`/start`, `/new`, `/status`, etc.)
  - `handlers/message.py` - Handler de mensagens de texto
  - `handlers/callback.py` - Handler de callback queries (inline keyboards)
  - `middleware/auth.py` - Middleware de autenticacao
  - `middleware/rate_limit.py` - Middleware de rate limiting
  - `middleware/security.py` - Middleware de seguranca
  - `features/` - Features modulares (voice, file upload, git, conversation mode, quick actions, image handler, session export)
  - `utils/` - Utilitarios (formatting HTML, draft streaming, image extraction)
- Depende de: Claude facade, storage, security, config, projects
- Usado por: Entry point (`src/main.py`)

**Integracao Claude (`src/claude/`):**
- Proposito: Interface com Claude Code via Python SDK
- Localizacao: `src/claude/`
- Contem:
  - `facade.py` - `ClaudeIntegration`, interface de alto nivel para o bot
  - `sdk_integration.py` - `ClaudeSDKManager`, wrapper do `claude-agent-sdk` (execucao de comandos, streaming, tool permission)
  - `session.py` - `SessionManager`, gerenciamento de sessoes Claude
  - `monitor.py` - Monitoramento de execucao (validacao de diretorios, paths internos)
  - `exceptions.py` - Excecoes especificas do Claude
- Depende de: `claude-agent-sdk`, config, security validators, storage (session)
- Usado por: Bot orchestrator, event handlers

**Sistema de Eventos (`src/events/`):**
- Proposito: Barramento de eventos async desacoplando fontes de handlers
- Localizacao: `src/events/`
- Contem:
  - `bus.py` - `EventBus` com fila async, dispatch concorrente, subscricoes tipadas
  - `types.py` - Tipos de eventos: `UserMessageEvent`, `WebhookEvent`, `ScheduledEvent`, `AgentResponseEvent`
  - `handlers.py` - `AgentHandler` (traduz webhooks/scheduled events em execucoes Claude)
  - `middleware.py` - `EventSecurityMiddleware` (validacao de seguranca no barramento)
- Depende de: Claude facade, security
- Usado por: API server, scheduler, notification service

**API Server (`src/api/`):**
- Proposito: Receber webhooks externos e expor endpoints HTTP
- Localizacao: `src/api/`
- Contem:
  - `server.py` - App FastAPI, endpoint `/webhooks/{provider}`, `/health`
  - `auth.py` - Verificacao de assinatura GitHub (HMAC-SHA256) e shared secret
- Depende de: Event bus, config, storage (deduplicacao)
- Usado por: Entry point (quando `ENABLE_API_SERVER=true`)

**Scheduler (`src/scheduler/`):**
- Proposito: Jobs cron recorrentes que disparam execucoes de agente
- Localizacao: `src/scheduler/scheduler.py`
- Contem: `JobScheduler` wrapping APScheduler `AsyncIOScheduler`
- Depende de: Event bus, storage (persistencia de jobs), config
- Usado por: Entry point (quando `ENABLE_SCHEDULER=true`)

**Projetos e Topicos (`src/projects/`):**
- Proposito: Registro de projetos e roteamento por topicos Telegram
- Localizacao: `src/projects/`
- Contem:
  - `registry.py` - `ProjectRegistry`, `ProjectDefinition`, carregamento de YAML
  - `thread_manager.py` - `ProjectThreadManager`, sincronizacao de topicos Telegram, resolucao projeto <-> thread
- Depende de: Storage (ProjectThreadRepository), python-telegram-bot API
- Usado por: Bot orchestrator (roteamento), entry point (sync inicial)

**Seguranca (`src/security/`):**
- Proposito: Autenticacao, rate limiting, validacao, auditoria
- Localizacao: `src/security/`
- Contem:
  - `auth.py` - `AuthenticationManager`, providers (Whitelist, Token), `UserSession`
  - `rate_limiter.py` - `RateLimiter`
  - `validators.py` - `SecurityValidator` (validacao de paths, patterns perigosos)
  - `audit.py` - `AuditLogger`, `InMemoryAuditStorage`
- Depende de: Config
- Usado por: Bot middleware, event middleware, Claude SDK integration

**Storage (`src/storage/`):**
- Proposito: Persistencia em SQLite com repository pattern
- Localizacao: `src/storage/`
- Contem:
  - `database.py` - `DatabaseManager` (connection pool, migracao, schema)
  - `facade.py` - `Storage` (interface unificada com todos os repositories)
  - `repositories.py` - Repositories: User, Session, Message, ToolUsage, AuditLog, CostTracking, Analytics, ProjectThread
  - `models.py` - Dataclasses de modelo
  - `session_storage.py` - `SQLiteSessionStorage` (implementacao de `SessionStorage` para o `SessionManager`)
- Depende de: aiosqlite
- Usado por: Todas as camadas

**Notificacoes (`src/notifications/`):**
- Proposito: Entrega proativa de respostas de agente via Telegram
- Localizacao: `src/notifications/service.py`
- Contem: `NotificationService` (subscribe a `AgentResponseEvent`, rate limiting por chat)
- Depende de: Event bus, python-telegram-bot API
- Usado por: Entry point

**MCP (`src/mcp/`):**
- Proposito: Suporte a Model Context Protocol
- Localizacao: `src/mcp/telegram_server.py`
- Contem: Servidor MCP para Telegram
- Depende de: Config
- Usado por: Claude SDK (quando `ENABLE_MCP=true`)

## Fluxo de Dados

**Fluxo 1: Mensagem Telegram (modo agentic)**

1. Update Telegram chega via polling em `ClaudeCodeBot` (`src/bot/core.py`)
2. `MessageOrchestrator._inject_deps()` injeta dependencias e aplica roteamento de threads se habilitado (`src/bot/orchestrator.py`)
3. Se project threads habilitado: `_apply_thread_routing_context()` resolve o projeto pelo `message_thread_id` via `ProjectThreadManager.resolve_project()` (`src/projects/thread_manager.py`)
4. Auth middleware verifica usuario na whitelist (`src/bot/middleware/auth.py`)
5. Handler agentic envia prompt para `ClaudeIntegration.run_command()` (`src/claude/facade.py`)
6. `SessionManager` busca/cria sessao persistida em SQLite (`src/storage/session_storage.py`)
7. `ClaudeSDKManager.execute_command()` executa via `claude-agent-sdk` com streaming (`src/claude/sdk_integration.py`)
8. Resposta e enviada de volta ao chat/topico Telegram via orchestrator
9. Interacao salva no storage (mensagem, tools, custo, audit)

**Fluxo 2: Webhook externo (ex: GitHub push)**

1. POST em `/webhooks/github` chega no FastAPI (`src/api/server.py`)
2. Assinatura HMAC-SHA256 verificada via `verify_github_signature()` (`src/api/auth.py`)
3. Deduplicacao atomica via `INSERT OR IGNORE` na tabela `webhook_events`
4. `WebhookEvent` publicado no `EventBus` (`src/events/bus.py`)
5. `AgentHandler.handle_webhook()` constroi prompt e executa via `ClaudeIntegration` (`src/events/handlers.py`)
6. Resposta publicada como `AgentResponseEvent`
7. `NotificationService` entrega para chats configurados (`src/notifications/service.py`)

**Fluxo 3: Job agendado (cron)**

1. APScheduler dispara job no horario configurado (`src/scheduler/scheduler.py`)
2. `JobScheduler._fire_event()` cria `ScheduledEvent` e publica no `EventBus`
3. `AgentHandler.handle_scheduled()` executa prompt via `ClaudeIntegration` (`src/events/handlers.py`)
4. Resposta entregue para `target_chat_ids` via `AgentResponseEvent` -> `NotificationService`

**Gerenciamento de Estado:**
- Sessoes Claude persistidas em SQLite com auto-resume por user+directory
- Estado de thread (per-topic) mantido em `context.user_data["thread_state"]` no orchestrator
- Jobs agendados persistidos em SQLite (tabela `scheduled_jobs`) e recarregados no restart
- Mapeamento projeto-topico persistido em SQLite (tabela `project_threads`)

## Abstracoes Chave

**EventBus (`src/events/bus.py`):**
- Proposito: Desacoplar fontes de eventos de handlers
- Padrao: Pub/Sub tipado com fila async
- Handlers registrados por tipo de evento, dispatch concorrente via `asyncio.gather`
- Fila interna `asyncio.Queue` com processor task

**ClaudeIntegration (`src/claude/facade.py`):**
- Proposito: Facade para toda interacao com Claude Code
- Padrao: Facade
- Encapsula: SDK manager, session manager, auto-resume de sessoes, retry com fallback para sessao nova

**Storage (`src/storage/facade.py`):**
- Proposito: Interface unificada para persistencia
- Padrao: Facade + Repository
- Encapsula: DatabaseManager, 8 repositories especializados

**ProjectThreadManager (`src/projects/thread_manager.py`):**
- Proposito: Manter mapeamento bidirecional entre projetos YAML e topicos Telegram
- Padrao: Sync/reconcile
- Operacoes: sync_topics (create/reuse/rename/close), resolve_project (lookup)
- Rate limiting interno para chamadas API Telegram durante sync

**MessageOrchestrator (`src/bot/orchestrator.py`):**
- Proposito: Ponto unico de entrada para todos os updates Telegram
- Padrao: Front Controller
- Responsavel por: injection de deps, routing de threads, modo agentic vs classic, streaming de drafts, formatacao de output

## Pontos de Entrada

**CLI (`src/main.py`):**
- Localizacao: `src/main.py`
- Funcao: `run()` (sync) -> `main()` (async) -> `create_application()` -> `run_application()`
- Responsabilidades: Parse de args, setup de logging, criacao de componentes, orquestracao de lifecycle
- Shutdown ordenado: scheduler -> API -> notification -> bot -> claude -> storage

**Bot Telegram (`src/bot/core.py`):**
- Localizacao: `src/bot/core.py`
- Classe: `ClaudeCodeBot`
- Gatilhos: Polling de updates Telegram
- Responsabilidades: Registrar handlers, feature registry, gerenciar Application

**API Server (`src/api/server.py`):**
- Localizacao: `src/api/server.py`
- Funcao: `run_api_server()` -> uvicorn
- Gatilhos: HTTP POST em `/webhooks/{provider}`
- Responsabilidades: Validacao de assinatura, deduplicacao, publicacao de eventos

## Sistema de Topicos por Projeto

**Conceito:**
Cada projeto definido em YAML recebe um topico (forum topic) dedicado no Telegram. Mensagens enviadas em um topico sao automaticamente roteadas para o diretorio do projeto correspondente.

**Modos:**
- `private` - Topicos em chat privado com o bot
- `group` - Topicos em supergrupo forum

**Configuracao de projetos (`config/projects.example.yaml`):**
```yaml
projects:
  - slug: claude-code-telegram
    name: Claude Code Telegram
    path: claude-code-telegram-main  # relativo ao APPROVED_DIRECTORY
    enabled: true
```

**Fluxo de sync (startup e `/sync_threads`):**
1. `load_project_registry()` carrega YAML, valida slugs/paths unicos, resolve paths absolutos dentro de `APPROVED_DIRECTORY` (`src/projects/registry.py`)
2. `ProjectThreadManager.sync_topics()` para cada projeto habilitado (`src/projects/thread_manager.py`):
   - Se mapeamento existe: reopen se inativo, rename se nome mudou, reuse
   - Se nao existe: `bot.create_forum_topic()`, persiste mapeamento, envia bootstrap message
   - Topicos de projetos removidos/desabilitados sao fechados e desativados
3. Rate limiting entre chamadas API Telegram (configuravel via `PROJECT_THREADS_SYNC_ACTION_INTERVAL_SECONDS`)

**Resolucao em runtime:**
1. `MessageOrchestrator._extract_message_thread_id()` extrai thread ID do update
2. `ProjectThreadManager.resolve_project()` busca mapeamento no SQLite por `(chat_id, message_thread_id)` -> `project_slug` -> `ProjectDefinition`
3. `working_directory` e `claude_session_id` sao setados no context com base no projeto resolvido

**Persistencia:** Tabela `project_threads` com constraints UNIQUE em `(chat_id, project_slug)` e `(chat_id, message_thread_id)`

## Tratamento de Erros

**Estrategia:** Multi-camada
- Claude: Retry com backoff exponencial para erros transientes, fallback para sessao nova se resume falhar (`src/claude/facade.py`)
- Webhooks: Deduplicacao atomica, fail-closed para assinatura invalida (`src/api/server.py`)
- Event bus: Isolamento de erro por handler - um handler falhando nao impede outros (`src/events/bus.py`)
- Topic sync: Cada projeto sincronizado independentemente, falhas contabilizadas em `TopicSyncResult` (`src/projects/thread_manager.py`)
- Excecoes customizadas: `src/exceptions.py`, `src/claude/exceptions.py`

## Preocupacoes Transversais

**Logging:**
- structlog com processadores configurados em `src/main.py`
- JSON em producao, ConsoleRenderer em debug
- Logging estruturado com contexto (user_id, session_id, event_id, etc.)

**Validacao:**
- Input: Pydantic Settings com validators para config (`src/config/settings.py`)
- Seguranca: `SecurityValidator` valida paths dentro de `APPROVED_DIRECTORY`, detecta patterns perigosos (`src/security/validators.py`)
- Redacao de secrets em output do orchestrator (`src/bot/orchestrator.py` `_redact_secrets()`)

**Autenticacao:**
- Strategy pattern com multiplos providers (`src/security/auth.py`):
  - `WhitelistAuthProvider` - Lista de IDs Telegram (primario)
  - `TokenAuthProvider` - Tokens com hash SHA-256, expiracao de 30 dias
  - Allow-all provider em modo development
- `AuthenticationManager` tenta providers em sequencia
- Sessoes em memoria com timeout de 24h, auto-cleanup
- Middleware aplica auth em toda mensagem Telegram (`src/bot/middleware/auth.py`)

**Rate Limiting:**
- Bot level: `AIORateLimiter` do python-telegram-bot (max 1 retry)
- Application level: `RateLimiter` customizado (`src/security/rate_limiter.py`)
- Notification service: 1.1s entre mensagens por chat (`src/notifications/service.py`)
- Topic sync: Intervalo configuravel entre chamadas API (`src/projects/thread_manager.py`)

## Diagrama de Dependencias (simplificado)

```
main.py
  |
  +-- bot/core.py (ClaudeCodeBot)
  |     +-- bot/orchestrator.py (MessageOrchestrator)
  |           +-- claude/facade.py (ClaudeIntegration)
  |           |     +-- claude/sdk_integration.py (ClaudeSDKManager)
  |           |     +-- claude/session.py (SessionManager)
  |           +-- projects/thread_manager.py (ProjectThreadManager)
  |           +-- security/auth.py (AuthenticationManager)
  |
  +-- events/bus.py (EventBus)
  |     +-- events/handlers.py (AgentHandler)
  |     +-- events/middleware.py (EventSecurityMiddleware)
  |     +-- notifications/service.py (NotificationService)
  |
  +-- api/server.py (FastAPI) ----> EventBus
  +-- scheduler/scheduler.py (JobScheduler) ----> EventBus
  +-- storage/facade.py (Storage)
        +-- storage/database.py (DatabaseManager)
        +-- storage/repositories.py (Repositories)
```
