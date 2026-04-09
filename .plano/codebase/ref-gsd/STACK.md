# Stack de Tecnologia

**Data da Analise:** 2026-04-09
**Repositorio:** `~/repos/claude-telegram-gsd/`

## Linguagens

**Principal:**
- TypeScript 5.7+ - Todo o codigo fonte em `src/` e `ask_user_mcp/`

**Secundaria:**
- JavaScript (CJS) - `ecosystem.config.cjs` (PM2 config), `ask_user_mcp/server.cjs` (compiled MCP server)

## Runtime

**Ambiente:**
- Node.js (ESNext target, ESM modules via `tsx`)
- Compatibilidade Windows e Unix (deteccao de plataforma em `src/session.ts` e `src/config.ts`)

**Gerenciador de Pacotes:**
- npm (lockfile: `package-lock.json` presente)
- bun (lockfile: `bun.lock` presente — projeto originalmente adaptado de Bun)

## Frameworks

**Core:**
- grammy `^1.38.4` - Framework de bot Telegram (wrapper sobre Bot API)
  - `@grammyjs/auto-retry` `^2.0.2` - Retry automatico em rate limits da Telegram API
  - `@grammyjs/runner` `^2.0.3` - Runner concorrente com sequentialize por chat

**Testes:**
- vitest `^4.0.18` - Test runner
  - Config: `vitest.config.ts`
  - Testes em `tests/` (4 arquivos: registry, formatting, commands, security)

**Build/Dev:**
- tsx `^4.19.0` - Execucao direta de TypeScript (sem build step)
- typescript `^5.7.0` - Type checking (`tsc --noEmit`, sem emit)

## Dependencias Chave

**Criticas:**
- `openai` `^6.15.0` - SDK OpenAI para transcricao de voz (gpt-4o-transcribe)
  - Usado em `src/utils.ts` via `openai.audio.transcriptions.create()`
  - Requer `OPENAI_API_KEY` env var
- `better-sqlite3` `^12.6.2` - Acesso readonly ao banco SQLite do Basic Memory (Obsidian vault search)
  - Usado em `src/vault-search.ts` via FTS5 full-text search
  - Banco em `~/.basic-memory/memory.db`
- `zod` `^4.2.1` - Validacao de schema (dependencia declarada, uso indireto)
- `dotenv` `^16.4.0` - Carregamento de `.env` em `src/config.ts`

**Infraestrutura:**
- `@modelcontextprotocol/sdk` - SDK MCP para o ask_user server (`ask_user_mcp/server.ts`)
  - Nao esta no package.json principal (provavelmente instalado separadamente no diretorio ask_user_mcp)

## Configuracao

**Ambiente:**
- `.env` na raiz do projeto (template em `.env.example`)
- Variaveis obrigatorias:
  - `TELEGRAM_BOT_TOKEN` - Token do bot Telegram
  - `TELEGRAM_ALLOWED_USERS` - IDs de usuario autorizados (comma-separated)
- Variaveis recomendadas:
  - `CLAUDE_WORKING_DIR` - Diretorio de trabalho do Claude CLI
  - `OPENAI_API_KEY` - Para transcricao de voz
- Variaveis opcionais:
  - `CLAUDE_CLI_PATH` - Caminho para o CLI (auto-detectado via `where claude`)
  - `CLAUDE_MODEL` - Override de modelo
  - `CLAUDE_SYSTEM_PROMPT` - System prompt adicional
  - `ALLOWED_PATHS` - Paths acessiveis pelo Claude
  - `RATE_LIMIT_ENABLED`, `RATE_LIMIT_REQUESTS`, `RATE_LIMIT_WINDOW` - Rate limiting
  - `THINKING_KEYWORDS`, `THINKING_DEEP_KEYWORDS` - Keywords para extended thinking
  - `TRANSCRIPTION_CONTEXT_FILE` - Contexto adicional para transcricao
  - `AUDIT_LOG_PATH`, `AUDIT_LOG_JSON` - Logging
  - `BASIC_MEMORY_DB` - Path alternativo para o banco do vault search

**MCP Configuration:**
- `mcp-config.ts` na raiz - Arquivo TypeScript exportando `MCP_SERVERS`
- Template em `mcp-config.example.ts`
- Importado dinamicamente em `src/config.ts`
- Suporta servidores stdio e HTTP

**Build:**
- `tsconfig.json` - Strict mode, ESNext target, bundler module resolution, `noEmit: true`
- Sem build step real — execucao direta via `tsx`

## Processos e Deploy

**Desenvolvimento:**
- `npm run dev` → `tsx --watch src/index.ts` (hot reload)
- `npm run start` → `tsx src/index.ts`
- `npm run typecheck` → `tsc --noEmit`
- `npm test` → `vitest run`

**Producao:**
- PM2 via `ecosystem.config.cjs`:
  - Interpreta com `node --import tsx/esm`
  - `restart_delay: 5000`, `max_restarts: 50`
  - Exponential backoff on crash
- macOS launchd via `launchagent/` (plist template + start script)
- Self-restart: `/restart` command chama `process.exit(0)`, PM2/launchd reinicia

## Dependencias Externas (CLI)

**pdftotext (poppler):**
- Usado em `src/handlers/document.ts` para extracao de texto de PDFs
- Chamado via `execSync('pdftotext -layout ...')`
- Requer instalacao separada (`brew install poppler` ou equivalente)

**Claude CLI:**
- O cobertura do bot — spawna `claude -p --output-format stream-json` como subprocess
- Auto-detectado via `where claude` ou configuravel via `CLAUDE_CLI_PATH`
- Flags usadas: `-p`, `--verbose`, `--output-format stream-json`, `--include-partial-messages`, `--dangerously-skip-permissions`, `--resume`, `--add-dir`, `--model`, `--append-system-prompt`

**Himalaya CLI (email):**
- Usado em `src/autodoc.ts` para envio de email via SMTP
- Caminho hardcoded para Windows: `C:/Users/User/.local/bin/himalaya.exe`
- Fallback para `where himalaya`

**tar / PowerShell:**
- Usados em `src/handlers/document.ts` para extracao de arquivos (.zip, .tar, .tar.gz)
- Fallback de `tar -xf` para `PowerShell Expand-Archive` no Windows

## Requisitos de Plataforma

**Desenvolvimento:**
- Node.js (ESNext support)
- Claude CLI instalado e autenticado (Claude MAX subscription)
- Telegram bot token via @BotFather

**Producao:**
- Originalmente desenvolvido para Windows (paths com `D:\`, `taskkill`, `where`, `cmd.exe`)
- Suporte Unix presente (SIGTERM/SIGKILL, process groups com `-pid`)
- PM2 ou launchd como process manager
