# @forgeclaw/bot

Bot Telegram do ForgeClaw. Roda com grammy + runner concorrente, streaming em tempo real via edits de mensagem, e fila de mensagens por sessao.

## Rodar

```bash
# Desenvolvimento (com watch)
bun run dev

# Producao
bun run start
```

Pre-requisito: `~/.forgeclaw/forgeclaw.config.json` configurado com `botToken` e `allowedUsers`.

## Arquitetura

```
src/
  index.ts                  # Entry point -- cria bot, registra handlers, inicia cron engine
  handlers/
    commands.ts             # /start, /new, /stop, /status, /project, /help
    text.ts                 # Handler principal -- processa mensagens, roda Claude, streaming
    voice.ts                # Download + transcricao Whisper + encaminha para text handler
    document.ts             # Download + extracao (PDF, texto, zip) + encaminha para text handler
    photo.ts                # Download foto (maior resolucao) + encaminha para text handler
    callbacks.ts            # Botoes inline (UP, Parar, Novo, opcoes, troca de projeto)
  middleware/
    auth.ts                 # Whitelist de usuarios por ID
    sequentialize.ts        # Serializa updates por chat:topicId (! bypassa)
  utils/
    formatting.ts           # Markdown->HTML, context bar, truncate para Telegram
    queue.ts                # Fila de mensagens por sessao (max 5)
```

## Fluxo de uma Mensagem

1. Update chega via grammy runner (concorrente)
2. `sequentialize` agrupa por `chatId:topicId` (mensagens com `!` bypassam)
3. `auth` verifica se o userId esta em `allowedUsers`
4. Text handler:
   - Se comeca com `!`: aborta runner ativo + processa novo prompt
   - Se ja esta processando: enfileira (max 5, senao rejeita)
   - Senao: cria/resume sessao, spawna `ClaudeRunner`, faz streaming
5. Durante streaming:
   - `thinking` -> edita mensagem com "Thinking..."
   - `tool_use` -> edita com nome da tool e preview do input
   - `text` -> edita mensagem a cada 500ms (rate limit)
   - `done` -> edita com texto final + context bar + botoes inline
6. Ao terminar: processa proximo da fila (se houver)

## Handlers

### Commands (`/start`, `/new`, `/stop`, `/status`, `/project`, `/help`)

- `/start` -- inicializa sessao, mostra mensagem de boas-vindas
- `/new` -- deleta sessao atual, limpa contexto do Claude
- `/stop` -- envia SIGTERM para o ClaudeRunner ativo
- `/status` -- mostra session ID, Claude session, projeto, barra de contexto, fila
- `/project` -- lista diretorios em `workingDir`, gera inline keyboard para trocar
- `/help` -- lista comandos e prefixos

### Text

Handler principal. Para cada mensagem:
- Salva no StateStore (role: user)
- Cria `ClaudeRunner` com `sessionId` (resume) e `cwd` (projeto)
- Faz streaming com edits throttled a 500ms
- Converte Markdown para HTML do Telegram
- Detecta `/up:` commands e opcoes numeradas, gera botoes
- Salva resposta no StateStore (role: assistant)
- Atualiza `contextUsage` com base em tokens/limit

### Voice

1. Download do arquivo de audio via Telegram API
2. Transcricao com `VoiceHandler` (Whisper)
3. Mostra transcricao ao usuario
4. Encaminha texto transcrito para o text handler

### Document

1. Download do arquivo
2. Extracao de conteudo via `FileHandler`:
   - PDF -> pdftotext
   - Texto (30+ extensoes) -> leitura direta
   - ZIP/tar.gz -> extrai e concatena arquivos de texto
   - Imagem -> passa caminho para Claude ler
3. Monta prompt com conteudo + caption
4. Encaminha para text handler

### Photo

1. Download da foto na maior resolucao (ultima do array)
2. Monta prompt com caminho + caption
3. Encaminha para text handler

### Callbacks

Processa botoes inline:
- `action:stop` -- aborta runner
- `action:new` -- deleta sessao
- `action:up` -- mostra grid de comandos UP
- `up:*` -- envia comando UP como mensagem
- `option:N` -- seleciona opcao numerada
- `project:nome` -- troca projeto da sessao

## Middleware

### Auth

Whitelist simples por `userId`. Se nao esta em `config.allowedUsers`, retorna "Unauthorized".

### Sequentialize

Serializa updates por `chatId:topicId`. Mensagens com prefixo `!` retornam `undefined` como key, bypassando a serializacao (interrupt).

## Fila de Mensagens

Cada sessao tem uma fila (max 5). Se o Claude esta processando e o usuario manda outra mensagem:
- Enfileira e responde "Queued (N in queue)"
- Se a fila esta cheia, rejeita

Ao terminar processamento, automaticamente processa o proximo da fila.

## Cron Engine

O bot inicia o `CronEngine` junto com o grammy runner. Resultados de crons sao roteados para topicos do Telegram via `EventBus`:

- Se o job tem `targetTopicId` e o topico existe -> envia no topico
- Senao -> envia como DM para o primeiro usuario em `allowedUsers`

## Variaveis de Ambiente

Nenhuma variavel de ambiente obrigatoria -- toda config vem de `~/.forgeclaw/forgeclaw.config.json`.

Opcional:
- `OPENAI_API_KEY` -- necessario para transcricao de voz (Whisper)
