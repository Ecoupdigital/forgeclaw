# Arquitetura

**Data da Analise:** 2026-04-09
**Repositorio:** `~/repos/claude-telegram-gsd/`

## Visao Geral do Padrao

**Geral:** Bot Telegram monolitico single-process com subprocess spawning

**Caracteristicas Chave:**
- Bot Telegram recebe mensagens, processa e delega ao Claude CLI via subprocess
- Sessao unica global (`ClaudeSession` singleton) — um usuario por vez
- Streaming de respostas via NDJSON parsing do stdout do Claude CLI
- Fila de mensagens FIFO quando uma query ja esta em execucao
- Comunicacao com MCP servers via arquivos temporarios no filesystem

## Camadas

**Telegram Layer (grammy):**
- Proposito: Receber mensagens, enviar respostas, gerenciar inline keyboards
- Localizacao: `src/index.ts` (setup), `src/handlers/` (logica)
- Contem: Handlers para cada tipo de mensagem e callback
- Depende de: grammy framework, Session layer
- Usado por: Usuarios via Telegram

**Handler Layer:**
- Proposito: Processar cada tipo de input (texto, voz, foto, documento, callback)
- Localizacao: `src/handlers/`
- Contem:
  - `src/handlers/text.ts` - Mensagens de texto (fluxo principal)
  - `src/handlers/voice.ts` - Mensagens de voz (transcricao + Claude)
  - `src/handlers/photo.ts` - Fotos (download + Claude com path)
  - `src/handlers/document.ts` - PDFs, text files, archives (extracao + Claude)
  - `src/handlers/audio.ts` - Arquivos de audio (transcricao + Claude)
  - `src/handlers/video.ts` - Videos (download + Claude com path)
  - `src/handlers/callback.ts` - Botoes inline (ask_user, GSD, project, resume, options)
  - `src/handlers/commands.ts` - Comandos slash (/new, /stop, /status, /gsd, /project, etc.)
  - `src/handlers/streaming.ts` - StreamingState e createStatusCallback (compartilhado)
  - `src/handlers/media-group.ts` - Buffer de album (agrupa fotos/docs enviados juntos)
- Depende de: Session, Security, Utils, Formatting, Config
- Usado por: Telegram Layer

**Session Layer:**
- Proposito: Gerenciar sessao Claude CLI, spawn de subprocesso, streaming
- Localizacao: `src/session.ts`
- Contem: `ClaudeSession` class (singleton exportado como `session`)
- Depende de: Config, child_process (Node.js)
- Usado por: Todos os handlers

**Security Layer:**
- Proposito: Autorizacao, rate limiting, validacao de paths, safety de comandos
- Localizacao: `src/security.ts`
- Contem: `RateLimiter` (token bucket), `isAuthorized()`, `isPathAllowed()`, `checkCommandSafety()`
- Depende de: Config (ALLOWED_PATHS, BLOCKED_PATTERNS, rate limit settings)
- Usado por: Handlers

**Formatting Layer:**
- Proposito: Conversao Markdown-para-HTML, formatacao de tool status, extracao de comandos GSD
- Localizacao: `src/formatting.ts`
- Contem: `convertMarkdownToHtml()`, `formatToolStatus()`, `extractGsdCommands()`, `extractNumberedOptions()`, `buildActionKeyboard()`
- Depende de: Config (limites de mensagem)
- Usado por: Streaming callbacks, handlers

**Utilities:**
- Proposito: Transcricao de voz, audit logging, typing indicator, interrupt handling
- Localizacao: `src/utils.ts`
- Contem: OpenAI client, `transcribeVoice()`, `auditLog*()`, `startTypingIndicator()`, `checkInterrupt()`
- Depende de: Config, OpenAI SDK
- Usado por: Handlers

**Supporting Modules:**
- `src/autodoc.ts` - Pipeline de auto-documentacao (classifica resposta, salva no Obsidian vault, envia email)
- `src/vault-search.ts` - Busca FTS5 no banco SQLite do Basic Memory
- `src/registry.ts` - Parser do registry.md de projetos (markdown table)
- `src/config.ts` - Carregamento de configuracao (env vars, paths, constantes)
- `src/types.ts` - Tipos TypeScript compartilhados

**MCP Server (ask_user):**
- Proposito: Permitir que Claude apresente opcoes como botoes inline no Telegram
- Localizacao: `ask_user_mcp/server.ts`
- Protocolo: MCP via stdio (spawned pelo Claude CLI)
- Comunicacao: Escreve arquivo JSON em tmpdir, bot le e exibe botoes

## Fluxo de Dados

### Fluxo Principal: Mensagem de Texto

1. Usuario envia mensagem no Telegram
2. grammy runner recebe update, sequentialize por chat_id (exceto comandos e `!` prefix)
3. `handleText()` em `src/handlers/text.ts`:
   a. Verifica autorizacao (`isAuthorized`)
   b. Verifica interrupt prefix (`!`) — se presente, mata query atual via `checkInterrupt()`
   c. Verifica rate limit (token bucket)
   d. Se query ja rodando: enfileira na fila FIFO (max 5)
   e. Marca processing, inicia typing indicator
   f. Envia "Processing..." placeholder message
4. `session.sendMessageStreaming()` em `src/session.ts`:
   a. Constroi args do CLI: `-p --verbose --output-format stream-json --include-partial-messages --dangerously-skip-permissions`
   b. Adiciona `--resume {session_id}` se sessao existente
   c. Adiciona `--add-dir` para paths permitidos
   d. Adiciona `--append-system-prompt` com safety rules e instrucoes ask_user
   e. Spawna `claude` como child process via `spawn()`
   f. Envia prompt via `stdin.write()` + `stdin.end()`
   g. Le stdout linha a linha via `readline.createInterface()`
   h. Cada linha e um evento JSON (NDJSON)
5. Parsing de eventos NDJSON:
   - `type: "assistant"` com `message.content[]`:
     - `block.type === "thinking"` → callback "thinking" (exibe no Telegram com emoji cerebro)
     - `block.type === "text"` → accumula delta, callback "text" throttled a 500ms
     - `block.type === "tool_use"` → callback "tool" (exibe status formatado), segmenta texto
   - `type: "result"` → captura `result`, `usage`, `modelUsage` (context %)
6. Streaming callbacks em `src/handlers/streaming.ts`:
   - "thinking" → Edita mensagem de status com preview do pensamento
   - "tool" → Edita mensagem de status com nome/input da tool
   - "text" → Cria/edita mensagem Telegram (throttled, HTML formatado)
   - "segment_end" → Finaliza segmento de texto (final edit com HTML completo)
   - "done" → Deleta mensagens de tool status (texto permanece)
7. Pos-resposta:
   a. Auto-documentacao (`autodoc.ts` - classifica, salva no vault, envia email)
   b. Exibe barra de contexto (% de uso) + botoes de acao (GSD, Stop, Retry, New)
   c. Deleta mensagem "Processing..."
   d. Processa proximo da fila FIFO se existir

### Fluxo de Voz

1. Usuario envia voice message
2. `handleVoice()` baixa arquivo .ogg via Telegram Bot API
3. Transcricao via OpenAI `gpt-4o-transcribe`
4. Mostra transcricao ao usuario
5. Envia texto transcrito ao Claude (mesmo fluxo do texto)
6. Limpa arquivo .ogg temporario

### Fluxo de Documentos (PDF/Text/Archive)

1. `handleDocument()` identifica tipo pelo MIME type e extensao
2. Baixa arquivo via Telegram Bot API
3. Extracao de conteudo:
   - PDF: `pdftotext -layout` via CLI (`execSync`)
   - Text files: `readFileSync` direto (max 100K chars)
   - Archives (.zip, .tar.gz): Extrai com `tar`/PowerShell, le arquivos texto internos (max 50K total)
   - Audio files: Redireciona para `processAudioFile()` (transcricao)
4. Media groups (albums): Buffer de 1 segundo via `createMediaGroupBuffer()`, processa todos juntos
5. Monta prompt com conteudo extraido e envia ao Claude

### Fluxo de Fotos

1. `handlePhoto()` baixa foto (maior resolucao) via Telegram Bot API
2. Monta prompt com path local do arquivo: `[Photo: /tmp/telegram-bot/photo_xxx.jpg]`
3. Claude CLI le a imagem do path local (capacidade multimodal)
4. Media groups: mesmo buffer de 1s que documentos

### Fluxo de ask_user (MCP Buttons)

1. Claude chama tool `mcp__ask-user__ask_user` durante execucao
2. MCP server (`ask_user_mcp/server.ts`) escreve arquivo JSON em tmpdir:
   ```
   /tmp/ask-user-{uuid}.json = { request_id, question, options, status: "pending", chat_id }
   ```
3. Bot detecta tool_use block `mcp__ask-user*` no stream NDJSON
4. `checkPendingAskUserRequests()` le arquivos `ask-user-*.json` do tmpdir
5. Cria `InlineKeyboard` com opcoes e envia ao usuario
6. Marca arquivo como `status: "sent"`
7. `sendMessageStreaming()` retorna `[Waiting for user selection]`
8. Usuario clica botao → `handleCallback()` com `askuser:{request_id}:{index}`
9. Deleta arquivo de request, envia escolha como nova mensagem ao Claude

### Fluxo GSD (Get Stuff Done)

1. `/gsd` command → exibe grid de operacoes como inline keyboard
2. Operacoes disponives: Progress, Quick Task, Plan/Execute/Discuss/Research Phase, Verify, Audit, Pause/Resume Work, Todos, Add/Remove Phase, New Project/Milestone, Settings, Debug, Help
3. Operacoes com fase (Execute, Plan, etc.) → mostram phase picker baseado em `ROADMAP.md`
4. ROADMAP.md parseado de `.planning/ROADMAP.md` no working dir
5. Comando GSD enviado como texto ao Claude (ex: `/gsd:execute-phase 8`)
6. Resposta processada normalmente, com extracao de comandos GSD sugeridos para botoes

### Fluxo de Interrupcao

1. Mensagem com prefixo `!` → `checkInterrupt()` em `src/utils.ts`
2. Marca interrupt flag na sessao (`markInterrupt()`)
3. Mata processo CLI via `killProcessTree()`:
   - Windows: `taskkill /pid {pid} /T /F`
   - Unix: `SIGTERM` ao process group (`-pid`), depois `SIGKILL` apos 5s
4. Limpa `stopRequested`, processa nova mensagem imediatamente
5. Bypass sequentialize (mensagens com `!` nao sao sequentializadas)

**Gerenciamento de Estado:**
- Sessao unica global: `ClaudeSession` singleton em `src/session.ts`
- `session_id` capturado do primeiro evento NDJSON que contem um
- Sessoes persistidas em JSON no tmpdir (max 5, per working dir)
- Working directory persistido em `STATE_FILE` (sobrevive restart)
- Fila de mensagens: array in-memory (max 5), FIFO
- Sem banco de dados proprio — usa filesystem (tmpdir) para tudo

## Abstracoes Chave

**ClaudeSession (`src/session.ts`):**
- Proposito: Encapsula estado da sessao e comunicacao com Claude CLI
- Instancia: Singleton global (`export const session = new ClaudeSession()`)
- Padrao: Stateful singleton com fila FIFO
- Metodos principais: `sendMessageStreaming()`, `stop()`, `kill()`, `resumeSession()`, `queueMessage()`

**StreamingState (`src/handlers/streaming.ts`):**
- Proposito: Rastrear mensagens Telegram criadas durante streaming
- Instancia: Nova para cada request
- Padrao: Mutable state bag
- Contem: `textMessages` (Map segmentId → Message), `toolMessages` (Array), `statusMsg`, `lastEditTimes`, `lastContent`

**StatusCallback (`src/types.ts`):**
- Proposito: Interface de callback para atualizar UI durante streaming
- Tipos: `"thinking" | "tool" | "text" | "segment_end" | "done"`
- Factory: `createStatusCallback()` em `src/handlers/streaming.ts`

**MediaGroupBuffer (`src/handlers/media-group.ts`):**
- Proposito: Agrupar itens de album Telegram (fotos/docs enviados juntos)
- Padrao: Timer-based debounce (1 segundo timeout)
- Factory: `createMediaGroupBuffer(config)` retorna `{ addToGroup, processGroup, pendingGroups }`

**Action Keyboard (`src/formatting.ts`):**
- Proposito: Gerar teclado inline contextual pos-resposta
- Extracao automatica: Detecta `/gsd:*` commands e opcoes numeradas na resposta do Claude
- Sempre inclui: GSD, Pause, Resume, Stop, Retry, New

## Pontos de Entrada

**Bot Startup (`src/index.ts`):**
- Localizacao: `src/index.ts`
- Gatilhos: `npm start` ou `npm run dev`
- Responsabilidades: Cria bot grammy, registra handlers, inicia runner concorrente, registra menu de comandos, verifica restart pendente

**Claude CLI Subprocess:**
- Localizacao: Spawned em `src/session.ts` linha 342
- Gatilhos: Qualquer mensagem processada pelo bot
- Responsabilidades: Executa Claude com prompt, streama NDJSON de volta

**Ask User MCP Server (`ask_user_mcp/server.ts`):**
- Localizacao: `ask_user_mcp/server.ts`
- Gatilhos: Claude CLI spawna como MCP server quando configurado
- Responsabilidades: Recebe `ask_user` tool calls, escreve JSON para o bot ler

## Tratamento de Erros

**Estrategia:** Try-catch em cada handler com mensagem generica ao usuario

**Detalhes:**
- Crash do Claude CLI: Retry automatico 1x (`MAX_RETRIES = 1` em `src/handlers/text.ts`)
  - Detecta `exited with code` no erro
  - Mata sessao corrompida, recria streaming state, retenta
- Context limit: Detecta "prompt too long" patterns no stderr/result
  - Auto-clear da sessao
  - Mensagem ao usuario sobre limite atingido
- Cancelamento: Distingue stop explicito (`/stop`) de interrupt (`!`)
  - Interrupt: Nao mostra "Query stopped" (nova mensagem ja esta sendo processada)
  - Stop explicito: Mostra "Query stopped"
- Erros de formatacao HTML: Fallback para texto plano
- Mensagens longas demais: Chunking automatico (split em `TELEGRAM_SAFE_LIMIT`)
- Erros silenciados: Tool message deletion, edit failures (console.debug)

## Preocupacoes Transversais

**Logging:**
- Console.log para operacoes normais (session start, tool use, usage stats)
- Console.error para erros reais
- Console.debug para falhas ignoraveis (edit message failed, etc.)
- Audit log em arquivo: `src/utils.ts` (`AUDIT_LOG_PATH`)
  - Tipos: message, auth, tool_use, error, rate_limit
  - Formato: texto legivel ou JSON (config)

**Validacao:**
- Autorizacao: Whitelist de user IDs via env var (`ALLOWED_USERS`)
- Rate limiting: Token bucket por user (20 req / 60s default)
- Path validation: Whitelist de diretorios permitidos
- Command safety: Blacklist de padroes perigosos (rm -rf /, fork bomb, etc.)
- File size limits: 10MB docs, 50MB videos

**Seguranca:**
- Safety prompt injetado via `--append-system-prompt` com regras de delecao e paths
- `--dangerously-skip-permissions` no CLI (bot gerencia seguranca, nao o CLI)
- Blocked patterns em `src/config.ts`: `rm -rf /`, `sudo rm`, fork bomb, `mkfs.`, `dd if=`, etc.
- Path validation pre-execucao em `src/security.ts`

**Auto-documentacao (`src/autodoc.ts`):**
- Classifica resposta por categoria (ATM, TOFD, Ideas, Biz, Social, Writing, Knowledge Base, Inbox)
- Keyword scoring com pesos por categoria
- Gera titulo, tags, summary, YAML frontmatter
- Salva como markdown no Obsidian vault (`D:/Obsidian/Ideas/`)
- Atualiza arquivo de indice da categoria
- Envia email via Himalaya CLI
- Ativado automaticamente para respostas com 50+ palavras

**Sequentializacao:**
- `@grammyjs/runner` com `sequentialize()` por chat_id
- Comandos (`/`), interrupts (`!`), e callbacks bypassam sequentializacao
- Fila FIFO in-memory (max 5) para mensagens quando query ja esta rodando
