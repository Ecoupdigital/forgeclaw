# Stack de Tecnologia

**Data da Analise:** 2026-04-09

## Linguagens

**Principal:**
- Python 3.12+ - Todo o codebase (`src/ccbot/`, `tests/`)

## Runtime

**Ambiente:**
- Python >= 3.12 (configurado em `pyproject.toml` target-version)
- tmux server (obrigatorio em runtime, o bot gerencia sessoes via libtmux)

**Gerenciador de Pacotes:**
- uv (gerenciador preferido, nao ha lock file pip)
- hatchling como build backend (`pyproject.toml` [build-system])
- Lockfile: nao detectado (sem `uv.lock` ou `requirements.txt`)

## Frameworks

**Core:**
- python-telegram-bot >= 21.0 (com plugin rate-limiter) - Toda a interface Telegram, polling loop, handlers
- libtmux >= 0.37.0 - Gerenciamento de sessoes/windows/panes tmux via API Python

**Testes:**
- pytest >= 8.0 - Test runner
- pytest-asyncio >= 0.24.0 - Suporte a testes async (modo `auto` configurado)
- pytest-cov >= 6.0 - Cobertura de codigo

**Build/Dev:**
- ruff >= 0.8.0 - Linting e formatacao (`uv run ruff check`, `uv run ruff format`)
- pyright >= 1.1.0 - Type checking estatico (`uv run pyright src/ccbot/`)
- hatchling - Build backend para empacotamento

## Dependencias Chave

**Criticas:**
- `python-telegram-bot[rate-limiter]` >= 21.0 - Core do bot Telegram, inclui `AIORateLimiter` para controle de flood
- `libtmux` >= 0.37.0 - Toda interacao com tmux (criar windows, enviar keystrokes, capturar panes)
- `python-dotenv` >= 1.0.0 - Carregamento de `.env` para configuracao

**Infraestrutura:**
- `aiofiles` >= 24.0.0 - Leitura async de arquivos JSONL (nao bloqueia o event loop)
- `Pillow` >= 10.0.0 - Renderizacao de screenshots do terminal em PNG (`src/ccbot/screenshot.py`)
- `telegramify-markdown` >= 0.5.0, < 1.0.0 - Conversao Markdown para MarkdownV2 do Telegram (`src/ccbot/markdown_v2.py`)
- `httpx` >= 0.27.0 - Cliente HTTP async para transcricao de voz via OpenAI API (`src/ccbot/transcribe.py`)

## Configuracao

**Ambiente:**
- Arquivo `.env` presente no diretorio de configuracao (`~/.ccbot/` ou `$CCBOT_DIR`)
- Prioridade de `.env`: local (cwd) > config dir
- Variaveis obrigatorias: `TELEGRAM_BOT_TOKEN`, `ALLOWED_USERS`
- Variaveis opcionais: `TMUX_SESSION_NAME` (default "ccbot"), `CLAUDE_COMMAND` (default "claude"), `MONITOR_POLL_INTERVAL` (default 2.0), `CCBOT_SHOW_USER_MESSAGES`, `CCBOT_SHOW_TOOL_CALLS`, `CCBOT_SHOW_HIDDEN_DIRS`, `CCBOT_CLAUDE_PROJECTS_PATH`, `CLAUDE_CONFIG_DIR`
- Variavel `OPENAI_API_KEY` e `OPENAI_BASE_URL` para transcricao de voz (opcional)
- Variaveis sensiveis (`TELEGRAM_BOT_TOKEN`, `ALLOWED_USERS`, `OPENAI_API_KEY`) sao removidas de `os.environ` apos captura para nao vazar para processos filhos

**Estado persistido:**
- `~/.ccbot/state.json` - Thread bindings, window states, display names, read offsets, group chat IDs
- `~/.ccbot/session_map.json` - Mapeamento window_id -> session gerado pelo hook
- `~/.ccbot/monitor_state.json` - Byte offsets de leitura por sessao monitorada

**Build:**
- `pyproject.toml` - Unica config de build, linting, testes e empacotamento
- Entry point CLI: `ccbot = "ccbot.main:main"` (definido em `[project.scripts]`)

## Requisitos de Plataforma

**Desenvolvimento:**
- Python >= 3.12
- tmux instalado e acessivel no PATH
- uv como gerenciador de pacotes (`uv run` para todos os comandos)
- Comandos de verificacao: `uv run ruff check src/ tests/`, `uv run ruff format src/ tests/`, `uv run pyright src/ccbot/`

**Producao:**
- Linux (uso de `fcntl.flock` para file locking em `src/ccbot/hook.py` - nao portavel para Windows)
- tmux server rodando (o bot cria/gerencia uma sessao tmux nomeada)
- Claude Code instalado e acessivel via comando configurado (default: `claude`)
- Bot Telegram configurado via BotFather com permissoes de Forum/Topics
- Deploy como servico systemd (script `scripts/restart.sh` para restart)
- Fontes bundled para screenshots: JetBrains Mono, Noto Sans Mono CJK SC, Symbola (`src/ccbot/fonts/`)
