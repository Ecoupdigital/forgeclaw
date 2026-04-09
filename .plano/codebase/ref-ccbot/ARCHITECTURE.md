# Arquitetura

**Data da Analise:** 2026-04-09

## Visao Geral do Padrao

**Geral:** Bridge bidirecional Telegram <-> tmux com monitoramento de sessoes Claude Code via JSONL polling

**Caracteristicas Chave:**
- 1 Topic Telegram = 1 Window tmux = 1 Sessao Claude Code
- Roteamento interno por window_id (ex: `@0`, `@12`), nunca por window name
- Hook-based session tracking: Claude Code `SessionStart` hook grava `session_map.json`
- Polling async de arquivos JSONL com byte offset incremental
- Per-user message queue com merge e deduplicacao

## Camadas

**UI Layer (Telegram Bot):**
- Proposito: Interface com usuario via Telegram, roteamento de mensagens, rendering
- Localizacao: `src/ccbot/bot.py`, `src/ccbot/handlers/`
- Contem: Command handlers (/start, /history, /screenshot, /esc, /kill, /unbind), callback query handler, message routing por topic, directory browser, interactive UI
- Depende de: SessionManager, TmuxManager, SessionMonitor, markdown_v2, telegram_sender
- Usado por: Telegram polling loop

**Session Management:**
- Proposito: Hub central de estado - mapeamentos Window<->Session, Thread<->Window, offsets de leitura
- Localizacao: `src/ccbot/session.py`
- Contem: `SessionManager` (singleton `session_manager`), `WindowState`, `ClaudeSession`, thread bindings, group chat IDs
- Depende de: Config, TmuxManager, TranscriptParser
- Usado por: Bot handlers, SessionMonitor, status polling, message queue

**Tmux Bridge:**
- Proposito: Toda interacao com tmux - criar/listar/matar windows, enviar keystrokes, capturar panes
- Localizacao: `src/ccbot/tmux_manager.py`
- Contem: `TmuxManager` (singleton `tmux_manager`), `TmuxWindow` dataclass
- Depende de: libtmux, Config
- Usado por: SessionManager, Bot handlers, SessionMonitor, status polling

**Session Monitoring:**
- Proposito: Detectar novas mensagens em sessoes Claude Code via polling de JSONL
- Localizacao: `src/ccbot/session_monitor.py`, `src/ccbot/monitor_state.py`
- Contem: `SessionMonitor`, `MonitorState`, `TrackedSession`, `NewMessage`
- Depende de: Config, TmuxManager, TranscriptParser, MonitorState
- Usado por: Bot (loop de monitoramento iniciado em post_init)

**JSONL Parsing:**
- Proposito: Parser de transcripts Claude Code - extrai mensagens estruturadas de arquivos JSONL
- Localizacao: `src/ccbot/transcript_parser.py`
- Contem: `TranscriptParser` (metodos estaticos), `ParsedEntry`, `ParsedMessage`, `PendingToolInfo`
- Depende de: Nenhum (modulo self-contained)
- Usado por: SessionManager (historico), SessionMonitor (real-time)

**Terminal Parsing:**
- Proposito: Detectar UIs interativas e status line no output do terminal tmux
- Localizacao: `src/ccbot/terminal_parser.py`
- Contem: `UIPattern`, `InteractiveUIContent`, `UsageInfo`, funcoes de parsing
- Depende de: Nenhum (modulo self-contained)
- Usado por: Status polling, interactive UI handler

**Hook System:**
- Proposito: Registrar sessoes Claude Code em `session_map.json` quando iniciam
- Localizacao: `src/ccbot/hook.py`
- Contem: `hook_main()` CLI, `_install_hook()`, leitura de stdin JSON, escrita atomica com file lock
- Depende de: utils (ccbot_dir, atomic_write_json)
- Usado por: Claude Code via SessionStart hook (processo separado, nao importa config.py)

**Message Delivery:**
- Proposito: Entrega ordenada de mensagens com merge, rate limiting, e formatacao MarkdownV2
- Localizacao: `src/ccbot/handlers/message_queue.py`, `src/ccbot/handlers/message_sender.py`
- Contem: Per-user queues, MessageTask, merge logic, tool_use/tool_result pairing, status tracking
- Depende de: markdown_v2, telegram_sender, session manager
- Usado por: Bot handlers, session monitor callback

## Fluxo de Dados

**Outbound (Usuario -> Claude Code):**

1. Usuario envia mensagem em topic Telegram (thread_id=42)
2. `bot.py` autentica usuario, resolve `thread_bindings[user_id][42]` -> window_id `@0`
3. Se topic nao bound: dispara directory browser -> usuario seleciona diretorio -> `tmux_manager.create_window()` -> `session_manager.bind_thread()`
4. `session_manager.send_to_window("@0", text)` -> `tmux_manager.send_keys(window_id, text)`
5. TmuxManager localiza window via `session.windows.get(window_id=window_id)`, pega active pane
6. Texto enviado literalmente via `pane.send_keys(text, enter=False, literal=True)`, pausa 500ms, depois Enter separado
7. Para comandos `!bash`: envia `!` primeiro, pausa 1s, depois o resto do comando

**Inbound (Claude Code -> Usuario):**

1. Claude Code SessionStart hook (`hook.py`) recebe JSON de stdin com session_id e cwd
2. Hook detecta tmux window_id via `tmux display-message -t $TMUX_PANE -p "#{session_name}:#{window_id}:#{window_name}"`
3. Hook escreve em `session_map.json` com file lock (`fcntl.flock`): `{"ccbot:@0": {"session_id": "uuid", "cwd": "/path", "window_name": "project"}}`
4. `SessionMonitor._monitor_loop()` polls a cada 2s:
   a. `session_manager.load_session_map()` - atualiza window_states com novos session_ids
   b. `_detect_and_cleanup_changes()` - detecta sessoes removidas/alteradas
   c. `check_for_updates(active_session_ids)` - le JSONL incremental
5. Para cada sessao, verifica mtime + file size do JSONL. Se mudou, le novas linhas desde `last_byte_offset`
6. Novas linhas parseadas por `TranscriptParser.parse_entries()` com carry-over de `pending_tools` entre ciclos
7. `NewMessage` emitido via callback -> `handle_new_message()` em `bot.py`
8. Bot resolve usuarios para a sessao via `session_manager.find_users_for_session(session_id)` -> itera thread_bindings
9. Mensagem enfileirada na per-user message queue com thread_id para entrega no topic correto

**Gerenciamento de Estado:**
- `state.json`: Thread bindings, window states, display names, user read offsets, group chat IDs. Escrito por SessionManager via `atomic_write_json()` (temp file + rename)
- `session_map.json`: Window -> session mapping. Escrito pelo hook com `fcntl.flock`, lido pelo monitor
- `monitor_state.json`: Byte offsets por sessao JSONL. Escrito por MonitorState via `atomic_write_json()`
- Todos os writes atomicos para prevenir corrupcao em caso de crash

## Abstracoes Chave

**Window ID (`@0`, `@12`):**
- Proposito: Identificador unico de window tmux, chave primaria de todo roteamento interno
- Exemplos: Usado em `session_manager.window_states`, `thread_bindings`, `session_map.json`
- Padrao: Prefixo `@` + numero. Validado por `_is_window_id()`. Resetado quando tmux server reinicia (recovery via `resolve_stale_ids()`)

**Session Map Key (`ccbot:@0`):**
- Proposito: Chave composta tmux_session_name:window_id para `session_map.json`
- Exemplos: `"ccbot:@0"`, `"ccbot:@12"`
- Padrao: Permite multiplas sessoes tmux coexistirem

**Thread Binding (user_id -> thread_id -> window_id):**
- Proposito: Mapear topic Telegram para window tmux por usuario
- Exemplos: `thread_bindings[123456789][42] = "@0"`
- Padrao: Dict aninhado, persistido em `state.json`

**JSONL Session File:**
- Proposito: Transcript completo de uma sessao Claude Code
- Exemplos: `~/.claude/projects/-home-user-project/uuid.jsonl`
- Padrao: Path construido por `_encode_cwd()` que substitui caracteres nao-alfanumericos por `-`. Fallback: glob search se path direto nao existe

**Byte Offset Tracking:**
- Proposito: Leitura incremental de JSONL sem reprocessar mensagens antigas
- Exemplos: `TrackedSession.last_byte_offset` em `monitor_state.json`
- Padrao: Seek para offset, le novas linhas, detecta truncacao (offset > file_size), detecta corrupcao (mid-line offset)

## Pontos de Entrada

**CLI - Bot Mode (default):**
- Localizacao: `src/ccbot/main.py:main()`
- Gatilhos: Comando `ccbot` sem argumentos
- Responsabilidades: Configura logging, valida config, inicializa sessao tmux, inicia bot polling

**CLI - Hook Mode:**
- Localizacao: `src/ccbot/main.py:main()` -> `src/ccbot/hook.py:hook_main()`
- Gatilhos: `ccbot hook` (chamado pelo SessionStart hook do Claude Code)
- Responsabilidades: Le JSON do stdin, determina window_id via tmux, escreve `session_map.json`

**CLI - Hook Install:**
- Localizacao: `src/ccbot/hook.py:_install_hook()`
- Gatilhos: `ccbot hook --install`
- Responsabilidades: Instala hook em `~/.claude/settings.json`

**Bot Lifecycle:**
- `post_init()` em `bot.py`: Resolve stale IDs, inicia SessionMonitor, inicia status poll loop, configura comandos do bot
- `post_shutdown()` em `bot.py`: Para monitor, salva estado
- `create_bot()` em `bot.py`: Cria Application com handlers registrados, configura rate limiter

## Tratamento de Erros

**Estrategia:** Resiliencia com fallback em todos os niveis

- **Telegram API:** `safe_reply`/`safe_edit`/`safe_send` com fallback de MarkdownV2 para plain text. `AIORateLimiter(max_retries=5)` para 429 errors
- **File I/O:** Escrita atomica (temp + rename) para prevenir corrupcao. Deteccao de truncacao e offset corrompido em leitura JSONL
- **tmux:** Todas as operacoes libtmux wrappadas em `asyncio.to_thread()`. Falhas capturadas e logadas, nao propagam
- **Hook:** File lock (`fcntl.flock`) para prevenir race conditions entre hooks concorrentes. UUID validation no session_id
- **Startup Recovery:** `resolve_stale_ids()` remapeia window IDs invalidos contra windows live por display name. Migra formato antigo (window_name keys -> window_id keys)
- **Session Map Cleanup:** Remove entradas para windows que nao existem mais, remove chaves em formato antigo

## Preocupacoes Transversais

**Logging:**
- `logging` stdlib, nivel WARNING global com DEBUG para modulo `ccbot`
- `AIORateLimiter` em nivel INFO
- Formato: `%(asctime)s - %(name)s - %(levelname)s - %(message)s`

**Validacao:**
- Hook valida session_id como UUID regex, cwd como path absoluto
- Config valida TELEGRAM_BOT_TOKEN e ALLOWED_USERS presentes e formatados
- `is_user_allowed()` checado em cada handler

**Autenticacao:**
- Whitelist de user IDs Telegram via `ALLOWED_USERS` env var
- Checagem em cada command/message/callback handler
- Variaveis sensiveis scrubbed de `os.environ` e de session env tmux (`_scrub_session_env`)

**Markdown/Formatacao:**
- Toda saida Telegram em MarkdownV2 via `telegramify-markdown` + custom expandable quotes
- Fallback automatico para plain text em caso de parse error
- Splitting de mensagens longas respeitando code blocks e limite de 4096 chars (`src/ccbot/telegram_sender.py`)

## Bridge tmux - Detalhes de Implementacao

**Leitura de Output (capture_pane):**
- `src/ccbot/tmux_manager.py:capture_pane()` - Dois modos:
  - Plain text: `pane.capture_pane()` via libtmux (sync, wrappado em `asyncio.to_thread()`)
  - Com ANSI colors: `tmux capture-pane -e -p -t {window_id}` via `asyncio.create_subprocess_exec()`
- Usado para screenshots (`/screenshot`) e deteccao de UI interativa (status polling)

**Envio de Keystrokes (send_keys):**
- `src/ccbot/tmux_manager.py:send_keys()` - Modos:
  - Literal + Enter: Envia texto literal via `pane.send_keys(text, enter=False, literal=True)`, pausa 500ms, depois Enter separado. A pausa previne que o TUI interprete Enter como newline
  - Comando `!bash`: Envia `!` primeiro, pausa 1s (para TUI entrar em bash mode), depois resto do texto
  - Special keys (Escape, Up, Down, etc.): `pane.send_keys(key, enter=False, literal=False)` - interpreta nomes de teclas

**Status Polling:**
- `src/ccbot/handlers/status_polling.py` - Loop a cada 1 segundo:
  - Itera todos os thread_bindings ativos
  - Para cada window: captura pane -> `terminal_parser.parse_status_line()` para status, `terminal_parser.is_interactive_ui()` para UIs
  - Se UI interativa detectada: entra em modo interativo com teclado inline
  - Se status mudou: enfileira atualizacao na message queue do usuario
  - A cada 60s: probe de existencia de topic via `unpin_all_forum_topic_messages` (no-op silencioso)

**Mapeamento Topic -> Sessao tmux:**
- Persistido em `state.json` como `thread_bindings: {user_id: {thread_id: window_id}}`
- Criado quando usuario seleciona diretorio no directory browser de um topic nao-bound
- Removido quando topic e fechado/deletado ou comando `/unbind`
- Recovery: `resolve_stale_ids()` remapeia IDs invalidos por display name no startup

## Leitura de JSONL - Pipeline Completo

**Localizacao dos Arquivos:**
- Claude Code escreve em `~/.claude/projects/{encoded_cwd}/{session_id}.jsonl`
- `_encode_cwd()` transforma `/home/user/project` em `-home-user-project`
- Configuravel via `CCBOT_CLAUDE_PROJECTS_PATH` ou `CLAUDE_CONFIG_DIR`

**Monitor Loop (`session_monitor.py`):**
1. `_monitor_loop()` a cada `poll_interval` (default 2s):
   - `session_manager.load_session_map()` - sincroniza window_states
   - `_detect_and_cleanup_changes()` - diff contra `_last_session_map`
   - `check_for_updates(active_session_ids)` - le JSONL incremental
2. `check_for_updates()`:
   - `scan_projects()` - lista sessoes que tem tmux windows ativos (verifica cwds)
   - Para cada sessao em `session_map`: checa mtime + file size vs cache
   - Se arquivo mudou: `_read_new_lines()` desde byte offset
3. `_read_new_lines()`:
   - Abre arquivo, seek para `last_byte_offset`
   - Detecta truncacao: offset > file_size -> reset para 0
   - Detecta offset corrompido: primeiro char nao e `{` -> skip para proxima linha
   - Le linhas, `TranscriptParser.parse_line()` para cada
   - Se linha nao-vazia falha parse JSON: para (partial write), retry no proximo ciclo
   - Atualiza `last_byte_offset` para posicao segura
4. `TranscriptParser.parse_entries()`:
   - Processa blocos: text, thinking, tool_use, tool_result, local_command
   - tool_use registra `PendingToolInfo` (summary, tool_name, input_data para Edit diffs)
   - tool_result faz match via `tool_use_id` contra pending_tools
   - `pending_tools` carry-over entre ciclos de polling (tool_use e tool_result podem chegar em ciclos diferentes)

## Notification System

**Callback Chain:**
- `SessionMonitor` emite `NewMessage` via callback registrado
- `bot.py:handle_new_message()` recebe, resolve usuarios via `session_manager.find_users_for_session(session_id)`
- Para cada usuario+thread: enfileira `MessageTask` na per-user queue

**Message Queue (`handlers/message_queue.py`):**
- Uma `asyncio.Queue` por user_id com worker dedicado
- Worker faz merge de mensagens consecutivas mergeaveis (mesmo window, < 3800 chars)
- tool_use quebra merge chain (enviado separado, message_id salvo)
- tool_result quebra merge chain (editado in-place na mensagem do tool_use)
- Status updates: deduplicados por `last_text`, editados na mensagem existente

**Interactive UI (`handlers/interactive_ui.py`):**
- Detectada por status polling via `terminal_parser.is_interactive_ui()`
- Tipos: AskUserQuestion, ExitPlanMode, PermissionPrompt, BashApproval, RestoreCheckpoint, Settings
- Entra em modo interativo: captura pane -> renderiza como mensagem com teclado inline (setas, Enter, Esc, Tab, Space)
- Keystroke enviado via `tmux_manager.send_keys(window_id, key, literal=False)` (interpreta nomes de teclas especiais)

## Session Management - Lifecycle

**Criacao:**
1. Usuario envia mensagem em topic nao-bound -> directory browser
2. Seleciona diretorio -> `tmux_manager.create_window(work_dir, window_name, start_claude=True)`
3. Window criada com `allow-rename=off` para preservar nome
4. `session_manager.bind_thread(user_id, thread_id, window_id)`
5. `session_manager.wait_for_session_map_entry(window_id, timeout=5.0)` - poll ate hook gravar

**Resume:**
1. Ao selecionar diretorio com sessoes existentes: session picker UI
2. Escolha de sessao existente: `create_window(resume_session_id=id)` -> `claude --resume {id}`
3. Hook reporta novo session_id mas JSONL continua no arquivo original

**Destruicao:**
1. Topic fechado no Telegram -> `topic_closed_handler` -> `tmux_manager.kill_window()` + `session_manager.unbind_thread()`
2. Window fechada externamente -> status polling detecta, limpa bindings
3. Monitor detecta window removida de `session_map.json` -> limpa tracked session
