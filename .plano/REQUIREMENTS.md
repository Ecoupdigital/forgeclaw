# Requisitos v1

## Setup (SETUP)
- [ ] SETUP-01: Inicializar monorepo Bun workspaces com packages/core, packages/bot, packages/dashboard, packages/cli
- [ ] SETUP-02: Configurar TypeScript strict, path aliases entre packages, scripts de dev/build
- [ ] SETUP-03: Configurar SQLite via bun:sqlite com schema inicial (sessions, messages, topics, cron_jobs, cron_logs)
- [ ] SETUP-04: Criar forgeclaw.config.json com schema de configuracao (tokens, paths, whitelist, harness dir)

## Core (CORE)
- [ ] CORE-01: Implementar SessionManager com SESSION_IDs compostos (chat_id:topic_id), suporte a --resume, persistencia em SQLite
- [ ] CORE-02: Implementar ClaudeRunner com Bun.spawn do claude CLI, NDJSON streaming stdout, callbacks tipados (thinking/tool/text/segment_end/done), auto-retry max 3
- [ ] CORE-03: Implementar EventBus pub/sub tipado com fila async, dispatch concorrente, subscricoes por tipo de evento
- [ ] CORE-04: Implementar StateStore com repository pattern sobre bun:sqlite (SessionRepository, MessageRepository, TopicRepository, CronJobRepository, CronLogRepository)

## Bot Telegram (BOT)
- [ ] BOT-01: Configurar bot grammy com polling, sequentialize por chat_id, auto-retry em rate limits
- [ ] BOT-02: Implementar roteamento de mensagens por topico (thread_id -> SessionManager -> ClaudeRunner)
- [ ] BOT-03: Implementar streaming de respostas com message edit throttled a 500ms, Markdown-to-HTML conversion
- [ ] BOT-04: Implementar whitelist de usuarios autorizados via forgeclaw.config.json
- [ ] BOT-05: Implementar fila de mensagens FIFO (max 5) quando query em execucao
- [ ] BOT-06: Implementar interrupt via prefixo `!` (kill process tree, processar nova mensagem imediatamente)

## Harness System (HARNESS)
- [ ] HARNESS-01: Definir formato e conteudo dos 7 arquivos (SOUL.md, USER.md, AGENTS.md, TOOLS.md, MEMORY.md, HEARTBEAT.md, STYLE.md) em ~/.forgeclaw/harness/
- [ ] HARNESS-02: Implementar HarnessLoader que le, parseia e valida os 7 arquivos com cache por mtime
- [ ] HARNESS-03: Implementar ContextBuilder que monta contexto completo (harness + session history + vault context) antes de cada chamada ao Claude
- [ ] HARNESS-04: Gerar CLAUDE.md orquestrador que referencia os harness files via --append-system-prompt

## Sistema de Memoria (MEM)
- [ ] MEM-01: Implementar auto-memory que extrai insights de cada conversa e persiste em MEMORY.md
- [ ] MEM-02: Implementar VaultNavigator para navegar Obsidian vault, buscar notas relevantes, injetar como contexto
- [ ] MEM-03: Implementar memory compiler que gera daily logs consolidando interacoes do dia
- [ ] MEM-04: Implementar dreaming (consolidacao periodica de memoria em periodos idle, reorganiza MEMORY.md)

## UP Detection (UP)
- [ ] UP-01: Implementar UPDetector que detecta patterns /up:* no output NDJSON do Claude
- [ ] UP-02: Transformar deteccoes /up:* em InlineKeyboard botoes do Telegram
- [ ] UP-03: Detectar opcoes numeradas (1. Opcao A, 2. Opcao B) no output e gerar botoes correspondentes

## Voz e Arquivos (VOICE/FILE)
- [ ] VOICE-01: Implementar transcricao de voz via OpenAI Whisper (download .ogg, transcrever, enviar texto ao Claude)
- [ ] FILE-01: Implementar recebimento de arquivos: PDF (pdftotext), imagens (path para Claude), archives (.zip/.tar.gz extrai e le)
- [ ] FILE-02: Implementar envio de arquivos gerados pelo Claude de volta ao usuario via Telegram

## Sistema de Crons (CRON)
- [ ] CRON-01: Implementar CronEngine com parser de expressoes cron, tick a cada minuto, execucao one-shot via ClaudeRunner
- [ ] CRON-02: Implementar parser de HEARTBEAT.md que extrai schedule de jobs com prompt e target_topic_id
- [ ] CRON-03: Implementar hot reload de cron jobs via file watcher em HEARTBEAT.md e forgeclaw.config.json
- [ ] CRON-04: Implementar roteamento de resultado de cron para topico Telegram configurado via EventBus

## Dashboard Web (DASH)
- [ ] DASH-01: Implementar dashboard Next.js 15 com layout base (sidebar, header), Tailwind CSS, shadcn/ui, autenticacao localhost-only
- [ ] DASH-02: Implementar chat view com streaming bidirecional via WebSocket nativo do Bun
- [ ] DASH-03: Implementar kanban de sessoes/topicos com atualizacao real-time via WebSocket (< 1s)
- [x] DASH-04: Implementar UI de gerenciamento de crons (listar, criar, editar, toggle, ver logs)
- [ ] DASH-05: Implementar UI de visualizacao/edicao de memoria (MEMORY.md + daily logs)
- [ ] DASH-06: Implementar UI de configuracao (editar forgeclaw.config.json, salvar sem restart)
- [ ] DASH-07: Implementar UI de edicao do harness (editor de cada um dos 7 arquivos)

## Instalador CLI (CLI)
- [ ] CLI-01: Implementar npx forgeclaw install com onboarding interativo via @clack/prompts
- [x] CLI-02: Implementar deteccao de ambiente (Ubuntu/macOS), verificacao de dependencias (Bun, Claude CLI, pdftotext) — 25-02 cobre Bun+Claude CLI+Claude auth; pdftotext ainda nao coberto
- [ ] CLI-03: Gerar forgeclaw.config.json interativamente (tokens, paths, whitelist)
- [ ] CLI-04: Configurar servico systemd (Linux) ou launchd (macOS) para auto-start no boot

## Testes e Documentacao (TEST/DOC)
- [ ] TEST-01: Testes unitarios para core modules (SessionManager, ClaudeRunner, EventBus, StateStore) com bun:test
- [ ] TEST-02: Testes de integracao para fluxo completo (mensagem -> SessionManager -> ClaudeRunner -> resposta -> Telegram)
- [ ] TEST-03: Testes E2E do bot Telegram com mock da grammy API
- [ ] TEST-04: Testes do dashboard (componentes React + WebSocket connection)
- [ ] DOC-01: README com visao geral da arquitetura, setup rapido, configuracao completa
- [ ] DOC-02: Documentacao do harness system (formato de cada arquivo, exemplos, como personalizar)
- [ ] DOC-03: Documentacao da API WebSocket do dashboard (eventos, payloads, autenticacao)

## Rastreabilidade

| Requisito | Fase | Status |
|-----------|------|--------|
| SETUP-01 | Fase 1 | Pendente |
| SETUP-02 | Fase 1 | Pendente |
| SETUP-03 | Fase 1 | Pendente |
| SETUP-04 | Fase 1 | Pendente |
| CORE-01 | Fase 1 | Pendente |
| CORE-02 | Fase 1 | Pendente |
| CORE-03 | Fase 1 | Pendente |
| CORE-04 | Fase 1 | Pendente |
| BOT-01 | Fase 2 | Pendente |
| BOT-02 | Fase 2 | Pendente |
| BOT-03 | Fase 2 | Pendente |
| BOT-04 | Fase 2 | Pendente |
| BOT-05 | Fase 2 | Pendente |
| BOT-06 | Fase 2 | Pendente |
| HARNESS-01 | Fase 3 | Pendente |
| HARNESS-02 | Fase 3 | Pendente |
| HARNESS-03 | Fase 3 | Pendente |
| HARNESS-04 | Fase 3 | Pendente |
| MEM-01 | Fase 4 | Pendente |
| MEM-02 | Fase 4 | Pendente |
| MEM-03 | Fase 4 | Pendente |
| MEM-04 | Fase 4 | Pendente |
| UP-01 | Fase 5 | Pendente |
| UP-02 | Fase 5 | Pendente |
| UP-03 | Fase 5 | Pendente |
| VOICE-01 | Fase 6 | Pendente |
| FILE-01 | Fase 6 | Pendente |
| FILE-02 | Fase 6 | Pendente |
| CRON-01 | Fase 7 | Pendente |
| CRON-02 | Fase 7 | Pendente |
| CRON-03 | Fase 7 | Pendente |
| CRON-04 | Fase 7 | Pendente |
| DASH-01 | Fase 8 | Pendente |
| DASH-02 | Fase 8 | Pendente |
| DASH-03 | Fase 8 | Pendente |
| DASH-04 | Fase 8 | Completo |
| DASH-05 | Fase 8 | Pendente |
| DASH-06 | Fase 8 | Pendente |
| DASH-07 | Fase 8 | Pendente |
| CLI-01 | Fase 9 | Pendente |
| CLI-02 | Fase 25 | Completo (25-02) |
| CLI-03 | Fase 9 | Pendente |
| CLI-04 | Fase 9 | Pendente |
| TEST-01 | Fase 10 | Pendente |
| TEST-02 | Fase 10 | Pendente |
| TEST-03 | Fase 10 | Pendente |
| TEST-04 | Fase 10 | Pendente |
| DOC-01 | Fase 10 | Pendente |
| DOC-02 | Fase 10 | Pendente |
| DOC-03 | Fase 10 | Pendente |
| PKG-B1 | Fase 11 | Pendente |
| PKG-B2 | Fase 11 | Pendente |
| PKG-B3 | Fase 12 | Pendente |
| PKG-B4 | Fase 12 | Pendente |
| PKG-B5 | Fase 11 | Pendente |
| PKG-B6 | Fase 13 | Pendente |

## Packaging Blockers (PKG)
- [ ] PKG-B1: Dashboard instalado como serviço de sistema (systemd/launchd) em modo produção
- [ ] PKG-B2: API keys (OPENAI_API_KEY, GROQ_API_KEY) injetadas no environment dos serviços via env file
- [ ] PKG-B3: voiceProvider aceita valores válidos (groq/openai/none), installer oferece Groq, VoiceHandler respeita config
- [ ] PKG-B4: CLAUDE.md harness gerado automaticamente concatenando os 6 arquivos harness individuais
- [ ] PKG-B5: `bun install` executado automaticamente durante o onboarding
- [ ] PKG-B6: Dashboard protegido por token de autenticação (login page, middleware, API validation)

## HIGH Priority Gaps (HIG)
- [ ] HIG-H1: APIs retornam arrays vazios (não mock data) quando DB indisponível
- [ ] HIG-H2: Cron execução cria apenas UMA entry de log (não duas duplicadas)
- [ ] HIG-H3: Session keys padronizadas como "chatId:topicId" (0 para DMs) em bot e dashboard
- [ ] HIG-H4: writeConfig() protege tokens mascarados de serem escritos no config
- [ ] HIG-H5: Claude CLI fallback path é 'claude' (não /root/.local/bin/claude)
- [ ] HIG-H6: Pedidos explícitos de memória ("lembra que X") salvam entry imediatamente
- [ ] HIG-H7: Output completo de cron visível na aba de logs do dashboard
- [ ] HIG-H8: Memory tab com busca FTS5 e paginação (50 entries por página)
- [ ] HIG-H9: Bot envia typing indicator em loop durante processamento do Claude
- [ ] HIG-H10: Timezone configurável no config com default America/Sao_Paulo

## MEDIUM Priority Gaps (MED)
- [ ] MED-M1: Daily log dir default ~/.forgeclaw/memory/daily (não vault pessoal hardcoded)
- [ ] MED-M2: Memory v1 deprecated, v2 único sistema ativo, sem crons duplicados
- [ ] MED-M3: --dangerously-skip-permissions documentado e configurável via config
- [ ] MED-M4: Config PUT valida campos contra whitelist, rejeita desconhecidos
- [ ] MED-M5: `forgeclaw export` gera .tar.gz com db + config + harness + memory
- [ ] MED-M6: Cron failures com prefixo visual claro (❌) no Telegram
- [ ] MED-M7: Fotos copiadas para workingDir antes de enviar path ao Claude
- [x] MED-M8: Installer checa versão mínima do Bun (>= 1.1.0) — 25-02 (diagnostics.ts MIN_BUN_VERSION='1.1.0')
- [ ] MED-M9: allowedUsers e allowedGroups editáveis no config tab do dashboard
- [ ] MED-M10: Erros do Claude CLI traduzidos para mensagens amigáveis no Telegram

## Mission Control (MC)
- [ ] MC-01: Tabela token_usage no SQLite (session_key, topic_id, input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens, model, timestamp) com migration idempotente
- [ ] MC-02: Persistir usage data no banco a cada stream:done event no ws-server e text handler
- [ ] MC-03: API routes GET /api/tokens (agregado por dia/sessão) e GET /api/tokens/stats (totais, médias, top sessões)
- [ ] MC-04: Nova aba Tokens no dashboard com chart de uso diário, top sessões por consumo, breakdown cache vs fresh tokens
- [ ] MC-05: Tabela activities no SQLite (type, entity_type, entity_id, actor, description, metadata JSON, timestamp) com migration idempotente
- [ ] MC-06: Emitir activities nos pontos-chave do sistema (session, cron, message, memory) via EventBus → activity recorder
- [ ] MC-07: Componente ActivityFeed no dashboard com timeline cronológica, filtros por tipo, atualização em tempo real via WebSocket
- [ ] MC-08: Tabela webhooks (url, events JSON, secret, enabled, created_at) e webhook_delivery_logs (webhook_id, event_type, payload, status_code, response_body, attempt, created_at) com CRUD via API
- [ ] MC-09: Webhook dispatcher com HMAC-SHA256 signature, retry com backoff exponencial (3 tentativas), circuit breaker básico

## Agentes Especializados (AGT)
- [ ] AGT-01: Tabela agents no SQLite (id, name, system_prompt, memory_mode, memory_domain_filter, default_runtime, created_at, updated_at) com migration idempotente
- [ ] AGT-02: Tabela topics ganha coluna agent_id (FK pra agents) com migration idempotente
- [ ] AGT-03: CRUD completo de agentes — API routes GET/POST/PUT/DELETE /api/agents
- [ ] AGT-04: Dashboard aba Agentes com lista, formulário de criação/edição (nome, prompt textarea, memory mode select, tags chips, runtime select)
- [ ] AGT-05: Vincular agente ao topic — dropdown de agente no topic card do dashboard + API PUT /api/topics/[id] com agent_id
- [ ] AGT-06: ContextBuilder prependa system_prompt do agente ao harness e filtra memória por tags quando memory_mode='filtered'
- [ ] AGT-07: text.ts e ws-server.ts carregam agente do topic e passam config ao ContextBuilder
- [ ] AGT-08: Retrieval de memória filtra por memory_domain_filter (memory_refs.entity_name) quando agente tem memory_mode='filtered'

## Dashboard First-run Onboarding (DASH-ONB)
- [x] DASH-ONB-01: Sentinel `~/.forgeclaw/.onboarded` (JSON atomic write via tmp+renameSync) + helpers lib/onboarding-state.ts (isOnboarded/markOnboarded/readOnboardedMeta/clearOnboarded) — completed in 27-01
- [x] DASH-ONB-02: proxy.ts com gate 4 (sem sentinel -> redirect /onboarding) e gate 5 (com sentinel + /onboarding -> redirect /) + endpoint publico GET /api/onboarding/health + scaffold /onboarding layout+page — completed in 27-01
- [x] DASH-ONB-03: 6 rotas REST auth-gated (/start, /message, /state, /preview, /approve, /skip) consumindo Interviewer (fase 26) via store singleton in-memory; preview HarnessDiff computado em snapshot via previewDiff; aprovar via POST /approve (applyDiff + markOnboarded source=interview) ou POST /skip (markOnboarded source=skipped) — completed in 27-02 (trocou SSE por request-response — first-run e turn-taking, streaming ficaria dentro de /message)
- [ ] DASH-ONB-04: UI split-pane (chat conversacional esquerda + preview ao vivo dos 7 harness files direita) + integracao com installer handoff (buildOnboardingUrl token cookie swap) — planejado pra 27-03/27-04
