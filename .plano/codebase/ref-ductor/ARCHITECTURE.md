# Arquitetura

**Data da Analise:** 2026-04-09

## Visao Geral do Padrao

**Geral:** Arquitetura em camadas com supervisor multi-agente, message bus central, e execucao de CLI via subprocessos.

**Caracteristicas Chave:**
- Multi-transport: abstrai Telegram, Matrix (e futuramente outros) atras de um `BotProtocol`
- Multi-agent: um `AgentSupervisor` gerencia N agentes (main + sub-agents), cada um com workspace e sessoes independentes
- Message Bus: `MessageBus` centraliza toda entrega de mensagens (cron, webhook, heartbeat, background tasks, inter-agent)
- CLI como subprocesso: CLIs de AI (Claude/Codex/Gemini) rodam como processos filho com streaming de eventos via stdout
- Docker sandboxing: CLI executa dentro de container Docker compartilhado via `docker exec`
- Session isolation: topicos do Telegram = sessoes independentes, com chave composta `transport:chat_id:topic_id`

## Camadas

**Transport (Messenger):**
- Proposito: Receber mensagens do usuario e entregar respostas
- Localizacao: `ductor_bot/messenger/`
- Contem: Implementacoes Telegram (`telegram/`), Matrix (`matrix/`), multi-transport adapter (`multi.py`), protocolo abstrato (`protocol.py`)
- Depende de: Orchestrator (para processar mensagens), MessageBus (para receber resultados background)
- Usado por: AgentStack, AgentSupervisor

**Orchestrator:**
- Proposito: Roteamento de mensagens, dispatch de comandos, gerenciamento de sessoes, coordenacao de fluxos
- Localizacao: `ductor_bot/orchestrator/`
- Contem: Core router (`core.py`), command registry (`registry.py`), flows de conversacao (`flows.py`), lifecycle (`lifecycle.py`), injection de prompt (`injection.py`), hooks de mensagem (`hooks.py`), selectors (`selectors/`)
- Depende de: CLIService, SessionManager, CronManager, WebhookManager, BackgroundObserver, HeartbeatObserver
- Usado por: Transport layer, InterAgentBus

**CLI Service:**
- Proposito: Gateway unificado para todas as chamadas aos CLIs de AI
- Localizacao: `ductor_bot/cli/`
- Contem: Service (`service.py`), factory (`factory.py`), providers (Claude `claude_provider.py`, Codex `codex_provider.py`, Gemini `gemini_provider.py`), stream events (`stream_events.py`), process registry (`process_registry.py`), timeout controller (`timeout_controller.py`)
- Depende de: Provider-specific CLIs (subprocessos), DockerManager
- Usado por: Orchestrator (conversacao normal), BackgroundObserver (tarefas bg), HeartbeatObserver, CronObserver, TaskHub

**Session:**
- Proposito: Gerenciamento de sessoes CLI isoladas por chat/topico/transport
- Localizacao: `ductor_bot/session/`
- Contem: SessionKey (`key.py`), SessionManager (`manager.py`), NamedSessionRegistry (`named.py`)
- Depende de: JSON persistence via `infra/json_store.py`
- Usado por: Orchestrator, HeartbeatObserver

**Message Bus:**
- Proposito: Roteamento centralizado de todas as mensagens background (cron, webhook, heartbeat, inter-agent, tasks)
- Localizacao: `ductor_bot/bus/`
- Contem: MessageBus (`bus.py`), Envelope (`envelope.py`), transport adapters (`adapters.py`), lock pool (`lock_pool.py`), cron sanitize (`cron_sanitize.py`)
- Depende de: Transport adapters, SessionInjector (Orchestrator)
- Usado por: Observers (cron, webhook, heartbeat, background, cleanup)

**Multi-Agent:**
- Proposito: Gerenciar multiplos agentes (bots) no mesmo processo com comunicacao inter-agent
- Localizacao: `ductor_bot/multiagent/`
- Contem: AgentSupervisor (`supervisor.py`), AgentStack (`stack.py`), InterAgentBus (`bus.py`), InternalAgentAPI (`internal_api.py`), SharedKnowledgeSync (`shared_knowledge.py`), health monitoring (`health.py`), registry (`registry.py`), models (`models.py`)
- Depende de: AgentStack, InterAgentBus, FileWatcher
- Usado por: `__main__.py` (entry point)

**Infra:**
- Proposito: Servicos de infraestrutura transversais
- Localizacao: `ductor_bot/infra/`
- Contem: DockerManager (`docker.py`, `docker_extras.py`), service management por OS (`service_linux.py`, `service_macos.py`, `service_windows.py`), file watcher (`file_watcher.py`), atomic I/O (`atomic_io.py`), JSON store (`json_store.py`), PID lock (`pidlock.py`), process tree (`process_tree.py`), recovery (`recovery.py`), restart (`restart.py`), updater (`updater.py`)
- Depende de: OS-level APIs, Docker CLI
- Usado por: Todas as camadas

**Background Observers:**
- Proposito: Tarefas periodicas e assincronas (cron, heartbeat, cleanup, background tasks)
- Localizacao: `ductor_bot/cron/`, `ductor_bot/heartbeat/`, `ductor_bot/cleanup/`, `ductor_bot/background/`
- Contem: CronObserver/Manager, HeartbeatObserver, CleanupObserver, BackgroundObserver
- Depende de: MessageBus (para entrega), CLIService (para execucao)
- Usado por: Orchestrator (via ObserverManager em `orchestrator/observers.py`)

**Workspace:**
- Proposito: Gerenciamento do sistema de arquivos do workspace do agente
- Localizacao: `ductor_bot/workspace/`
- Contem: Path resolution (`paths.py`), init (`init.py`), cron tasks (`cron_tasks.py`), skill sync (`skill_sync.py`), rules selector (`rules_selector.py`), workspace loader (`loader.py`)
- Depende de: Filesystem
- Usado por: Orchestrator, CLIService, Observers

## Fluxo de Dados

**Mensagem Normal do Usuario (Telegram):**

1. Telegram envia update -> `aiogram` handler em `ductor_bot/messenger/telegram/handlers.py`
2. Middleware de auth e dedup em `ductor_bot/messenger/telegram/middleware.py`
3. Message dispatch em `ductor_bot/messenger/telegram/message_dispatch.py` resolve SessionKey (transport + chat_id + topic_id)
4. Orchestrator.handle_message_streaming() em `ductor_bot/orchestrator/core.py`
5. Command registry verifica se e um comando (`/new`, `/status`, `/model` etc.)
6. Se nao e comando: parse directives (`@model`, `@session_name`), resolve sessao via SessionManager
7. CLIService.call_streaming() spawna subprocesso do CLI (claude/codex/gemini) com `--session-id` e `--resume` se existente
8. Stream events fluem via stdout -> coalescer -> streaming callbacks -> Telegram message edits
9. Resultado final: SessionManager atualiza metricas, resposta enviada ao usuario

**Cron Job Execution:**

1. CronObserver tick (a cada minuto) verifica schedules via `cronsim`
2. Job encontrado -> `ductor_bot/cron/execution.py` prepara prompt com instrucao do agente
3. Cria Envelope com `Origin.CRON`, `needs_injection=True`
4. MessageBus.submit() -> adquire lock -> SessionInjector.inject_prompt() -> CLIService executa one-shot
5. Resultado injetado no Envelope -> entregue via transport adapter ao chat/topico de origem

**Heartbeat:**

1. HeartbeatObserver._tick() a cada N minutos (configuravel)
2. Verifica quiet hours, se chat esta busy
3. Chama Orchestrator.handle_heartbeat() -> CLI one-shot com prompt de heartbeat
4. Se resposta != "HEARTBEAT_OK" -> entrega alerta ao usuario via MessageBus

**Webhook Ingress:**

1. HTTP POST chega em `/hooks/{hook_id}` no `ductor_bot/webhook/server.py`
2. Autenticacao (Bearer token ou HMAC signature) e rate limiting
3. Resposta 202 imediata, dispatch em background task
4. WebhookObserver cria Envelope com `needs_injection=True` se hook tem `agent_instruction`
5. MessageBus processa: inject prompt -> entrega resultado

**Inter-Agent Communication:**

1. CLI tool script (ex: `ask_agent.py`) faz HTTP POST para `localhost:8799/interagent/send` ou `/send_async`
2. InternalAgentAPI em `ductor_bot/multiagent/internal_api.py` recebe request
3. InterAgentBus.send() ou send_async() em `ductor_bot/multiagent/bus.py`
4. Resolve target AgentStack -> Orchestrator.handle_interagent_message()
5. CLI one-shot no workspace do agente destino -> resposta retornada
6. Sync: resposta HTTP direta. Async: callback entrega resultado ao sender via `AsyncResultCallback`

**Named Sessions (Background):**

1. Usuario envia mensagem com `@` prefix (ex: `@boldcat continue the analysis`)
2. Orchestrator verifica se e nome de sessao existente no NamedSessionRegistry
3. Se sim: BackgroundObserver.submit() cria task com `session_name` e `resume_session_id`
4. Task roda em background, resultado entregue via MessageBus como Envelope com `Origin.BACKGROUND`
5. Se nao existe: cria nova named session via `Orchestrator.submit_named_session()`

**Gerenciamento de Estado:**
- Sessoes: `~/.ductor/sessions.json` (SessionManager, JSON atomico)
- Named sessions: `~/.ductor/named_sessions.json` (NamedSessionRegistry)
- Cron jobs: `~/.ductor/cron_jobs.json` (CronManager)
- Webhooks: `~/.ductor/webhooks.json` (WebhookManager)
- Tasks: `~/.ductor/tasks.json` (TaskRegistry)
- Sub-agents: `~/.ductor/agents.json` (AgentRegistry, watched via FileWatcher)
- Config: `~/.ductor/config/config.json` (hot-reloadable)
- Memoria persistente: `~/.ductor/workspace/memory_system/MAINMEMORY.md`
- Shared knowledge: `~/.ductor/SHAREDMEMORY.md` (sincronizado para todos agentes)
- Inflight turns: `~/.ductor/inflight_turns.json` (crash recovery)

## Abstracoes Chave

**SessionKey:**
- Proposito: Identificador composto de sessao, transport-agnostic
- Exemplos: `ductor_bot/session/key.py`
- Padrao: `transport:chat_id[:topic_id]` (ex: `tg:12345:99`, `mx:67890`)
- Topicos Telegram (`message_thread_id`) = sessoes isoladas: cada topico tem sua propria sessao CLI
- Channels WebSocket API mapeiam para `topic_id`

**Envelope:**
- Proposito: Container unificado para todo roteamento de mensagens no MessageBus
- Exemplos: `ductor_bot/bus/envelope.py`
- Padrao: Origin (de onde veio) + DeliveryMode (unicast/broadcast) + LockMode + injection flag
- Origins: BACKGROUND, CRON, WEBHOOK_WAKE, WEBHOOK_CRON, HEARTBEAT, INTERAGENT, TASK_RESULT, TASK_QUESTION, USER, API

**BotProtocol:**
- Proposito: Interface que todos os transport bots implementam
- Exemplos: `ductor_bot/messenger/protocol.py`
- Padrao: Protocol class (structural typing) com run(), shutdown(), orchestrator, notification_service
- Implementacoes: TelegramBot (`messenger/telegram/app.py`), MatrixBot (`messenger/matrix/bot.py`), MultiBotAdapter (`messenger/multi.py`)

**AgentStack:**
- Proposito: Container completo para um agente (Bot + Orchestrator + CLIService + workspace)
- Exemplos: `ductor_bot/multiagent/stack.py`
- Padrao: Cada agente (main ou sub) tem seu proprio stack isolado com paths, sessoes, cron, webhooks

**BaseCLI / CLIService:**
- Proposito: Abstrai execucao de diferentes CLIs de AI como subprocessos
- Exemplos: `ductor_bot/cli/base.py`, `ductor_bot/cli/service.py`, `ductor_bot/cli/factory.py`
- Padrao: Factory cria provider correto (ClaudeCodeCLI, CodexCLI, GeminiCLI), CLIService e o gateway unico

**MessageBus:**
- Proposito: Coordenador central para roteamento de mensagens background
- Exemplos: `ductor_bot/bus/bus.py`
- Padrao: Register transport adapters, set injector (Orchestrator), submit Envelopes
- Lock pool: per-session locks para evitar concurrent CLI access ao mesmo chat/topico

## Pontos de Entrada

**CLI Entry Point:**
- Localizacao: `ductor_bot/__main__.py` (`main()`)
- Gatilhos: Comando `ductor` (pip install) ou `python -m ductor_bot`
- Responsabilidades: Parse CLI args, dispatch para subcomandos (start, stop, status, setup, docker, agents, api, service, etc.)

**Bot Run:**
- Localizacao: `ductor_bot/__main__.py` (`run_bot()`)
- Gatilhos: `ductor` sem subcomando (ou apos onboarding)
- Responsabilidades: Valida config, cria AgentSupervisor, inicia main + sub-agents, aguarda shutdown

**Supervisor (dev hot-reload):**
- Localizacao: `ductor_bot/run.py` (`supervisor()`)
- Gatilhos: `python -m ductor_bot.run` (modo dev)
- Responsabilidades: Spawna bot como child process, watch files via `watchfiles`, restart on change/crash

**AgentSupervisor.start():**
- Localizacao: `ductor_bot/multiagent/supervisor.py`
- Gatilhos: Chamado por `run_bot()`
- Responsabilidades: 
  1. Cria InterAgentBus + InternalAgentAPI (HTTP localhost:8799)
  2. Inicializa TaskHub se tasks habilitadas
  3. Cria e starta AgentStack "main" (workspace init, Docker setup, transport bot)
  4. Aguarda main ficar ready (Docker built, auth ok)
  5. Carrega sub-agents de `agents.json`, cria AgentStack para cada
  6. Inicia SharedKnowledgeSync (SHAREDMEMORY.md -> todos agentes)
  7. Inicia FileWatcher para `agents.json` (hot-reload de sub-agents)

## Docker Sandboxing

**Modelo:**
- Container unico `ductor-sandbox` rodando `sleep infinity` (sidecar persistente)
- CLIs executam via `docker exec` dentro do container
- Image base: `node:22-bookworm-slim` com Python 3, Claude Code CLI, Codex CLI, Gemini CLI pre-instalados
- Extras configuriaveis: ffmpeg, pandoc, matplotlib, pandas etc. (`ductor_bot/infra/docker_extras.py`)

**Mounts:**
- `~/.ductor` montado em `/ductor` (workspace do agente)
- `~/.claude`, `~/.codex`, `~/.gemini` montados em `/home/node/` (auth dos CLIs)
- Mounts de projeto do usuario configurados via `docker.mounts` em `/mnt/<name>`
- `host.docker.internal` configurado para comunicacao container -> host (InternalAgentAPI)

**Multi-agent Docker:**
- Lock de classe (`DockerManager._setup_lock`) garante que apenas o primeiro agente cria o container
- Sub-agents reutilizam o container existente
- Cada agente tem seu workspace em `/ductor/agents/<name>/workspace`

**Gerenciamento:**
- `ductor_bot/infra/docker.py` (`DockerManager`) - setup, ensure_running, teardown
- Auto-build: constroi imagem automaticamente se nao existir
- Auto-recover: detecta container parado e reinicia

## Sistema de Topicos como Sessoes

**Mecanismo:**
- Telegram forum topics mapeiam diretamente para `SessionKey.topic_id`
- Cada topico tem sessao CLI independente: provider, model, session_id, message_count, cost separados
- Storage key: `tg:<chat_id>:<topic_id>` (ex: `tg:-1001234:42`)
- Topic name resolver: callback `(chat_id, topic_id) -> name` registrado no SessionManager
- Topic handler: `ductor_bot/messenger/telegram/topic.py`

**Sessao por topico inclui:**
- Provider e model independentes (pode ser Claude num topico, Gemini em outro)
- Historico de sessao separado (session_id do CLI)
- Metricas independentes (message_count, total_cost_usd, total_tokens)
- Estado de freshness independente (idle timeout, daily reset)

## Named Sessions

**Proposito:** Multiplas sessoes background nomeadas dentro do mesmo chat, cada uma com identidade CLI propria
- Localizacao: `ductor_bot/session/named.py`
- Nomes auto-gerados: `adjetivo+animal` (ex: `boldcat`, `calmowl`)
- Max 10 sessoes ativas por chat (`MAX_SESSIONS_PER_CHAT`)
- Estados: `running` | `idle` | `ended`
- Persistencia: `~/.ductor/named_sessions.json`
- Recovery: sessoes `running` no shutdown sao restauradas como `idle` no startup (CLI session ID preservado para `--resume`)
- Follow-up: `@sessionname <mensagem>` envia prompt para sessao existente
- Inter-agent sessions: prefixo `ia-` (ex: `ia-researcher`)

## Tratamento de Erros

**Estrategia:**
- Hierarquia de excecoes tipadas em `ductor_bot/errors.py`: CLIError, StreamError, SessionError, CronError, WebhookError, WorkspaceError
- Orchestrator captura e retorna mensagem generica ao usuario
- Observers (cron, heartbeat, webhook) logam excecoes e continuam
- AgentSupervisor: crash recovery com backoff exponencial (5s, 10s, 20s, 40s, 80s), max 5 retries
- Docker: fallback para host execution se Docker falha

## Preocupacoes Transversais

**Logging:**
- `ductor_bot/logging_config.py` - Config centralizada
- `ductor_bot/log_context.py` - Context vars para operation/chat_id/agent_name (structured logging)
- Log files em `~/.ductor/logs/`

**Validacao:**
- Pydantic models para config (`AgentConfig` e sub-models)
- Input sanitization: `ductor_bot/security/content.py` (`detect_suspicious_patterns`)
- Path safety: `ductor_bot/security/paths.py` (`is_path_safe`)

**Autenticacao:**
- Telegram: `allowed_user_ids` e `allowed_group_ids` no config
- Matrix: `allowed_rooms` e `allowed_users`
- Webhook: Bearer token global + per-hook HMAC signatures (`ductor_bot/webhook/auth.py`)
- WebSocket API: token auth + E2E encryption via NaCl (`ductor_bot/api/crypto.py`)
- CLI auth: credenciais de `~/.claude`, `~/.codex`, `~/.gemini` montadas no container

**Persistent Memory:**
- `~/.ductor/workspace/memory_system/MAINMEMORY.md` - Memoria principal do agente (lida pelo CLI a cada sessao)
- `~/.ductor/SHAREDMEMORY.md` - Memoria compartilhada entre todos agentes (sync via `SharedKnowledgeSync`)
- Cron task folders: `~/.ductor/workspace/cron_tasks/<task>/` com arquivos de contexto
- Task memory: `~/.ductor/workspace/tasks/<task_id>/TASKMEMORY.md`

**Config Hot-Reload:**
- `ductor_bot/config_reload.py` monitora `config.json` via FileWatcher
- Campos hot-reloadable: model, provider, reasoning_effort, language, heartbeat, streaming, timeouts
- Campos que requerem restart: telegram_token, transport, matrix credentials

**Multi-Transport:**
- `ductor_bot/messenger/registry.py` - Factory com `_TRANSPORT_FACTORIES` dict
- `ductor_bot/messenger/multi.py` - MultiBotAdapter wraps N bots atras de BotProtocol
- Primary bot cria Orchestrator; secondary bots recebem referencia compartilhada
- Todos compartilham MessageBus e LockPool
- Adicionar novo transport: implementar BotProtocol + registrar factory em `_TRANSPORT_FACTORIES`
