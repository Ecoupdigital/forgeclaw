# Stack de Tecnologia

**Data da Analise:** 2026-04-09

## Linguagens

**Principal:**
- Python 3.11+ (suporta 3.11, 3.12, 3.13, 3.14) - Todo o codebase

**Secundaria:**
- Shell scripts - `ductor_bot/_home_defaults/workspace/tools/` (tool scripts executados pelo CLI dentro do sandbox)
- Dockerfile - `Dockerfile.sandbox` (definicao do container sandbox)

## Runtime

**Ambiente:**
- Python >= 3.11 (definido em `pyproject.toml` campo `requires-python`)
- Node.js 22 (dentro do Docker sandbox, base image `node:22-bookworm-slim`)
- asyncio como runtime assincrono principal (framework inteiro e async-first)

**Gerenciador de Pacotes:**
- pip/hatch (build system: `hatchling>=1.28.0`)
- Lockfile: ausente (sem `requirements.lock` ou `poetry.lock`)

## Frameworks

**Core:**
- aiogram 3.24+ (`>=3.24.0,<4.0.0`) - Framework async Telegram Bot API
- aiohttp 3.9+ (`>=3.9.0,<4.0.0`) - HTTP server (webhook server, internal API, WebSocket API)
- pydantic 2.12+ (`>=2.12.5`) - Config validation e serialization (`ductor_bot/config.py`)

**Testes:**
- pytest 9+ - Runner de testes
- pytest-asyncio 1.3+ - Testes async com `asyncio_mode = "auto"`
- pytest-aiohttp 1.1+ - Testes de endpoints HTTP
- pytest-cov 7+ - Cobertura
- time-machine 3.2+ - Manipulacao de tempo em testes

**Build/Dev:**
- hatchling 1.28+ - Build backend
- ruff 0.15+ - Linter e formatter (substitui eslint+prettier+black+isort)
- mypy 1.19+ - Type checking estrito (`strict = true`)

## Dependencias Chave

**Criticas:**
- `aiogram` - Toda comunicacao Telegram (polling, handlers, inline buttons, streaming edits)
- `aiohttp` - Webhook server (`ductor_bot/webhook/server.py`), internal agent API (`ductor_bot/multiagent/internal_api.py`), WebSocket API (`ductor_bot/api/server.py`)
- `pydantic` - Config model (`AgentConfig` em `ductor_bot/config.py`), validacao de entrada
- `cronsim` (`>=2.7`) - Parser de expressoes cron para scheduling (`ductor_bot/cron/`)

**Infraestrutura:**
- `pyyaml` (`>=6.0.3`) - Parsing de YAML (agent configs, workspace files)
- `rich` (`>=14.3.2`) - CLI output formatado, Rich console para setup wizard e Docker build progress
- `questionary` (`>=2.1.1`) - Interactive prompts no onboarding wizard (`ductor_bot/cli/init_wizard.py`)
- `filetype` (`>=1.2.0`) - Deteccao de tipo de arquivo para media handling
- `Pillow` (`>=10.0.0`) - Processamento de imagens (resize, format conversion em `ductor_bot/files/image_processor.py`)
- `tzdata` (`>=2024.1`) - Timezone data para cron scheduling e quiet hours

**Opcionais (extras):**
- `PyNaCl` (`>=1.6.2`) - Criptografia E2E para WebSocket API (`ductor_bot/api/crypto.py`), extra `api`
- `matrix-nio` (`>=0.25.0`) - Cliente Matrix protocol, extra `matrix`

## Configuracao

**Ambiente:**
- Config principal: `~/.ductor/config/config.json` (criado automaticamente na primeira execucao)
- Template: `config.example.json` na raiz do repositorio
- Segredos: `~/.ductor/.env` (carregado e injetado como env vars no Docker container)
- Env var `DUCTOR_HOME` sobrescreve o diretorio home padrao `~/.ductor`
- Env var `DUCTOR_FRAMEWORK_ROOT` sobrescreve a localizacao do framework root
- Config hot-reload: `ductor_bot/config_reload.py` monitora mudancas no config.json

**Build:**
- `pyproject.toml` - Config unica para build, lint, type-check e testes
- Entry point CLI: `ductor = "ductor_bot.__main__:main"` (comando `ductor` apos install)
- Wheel inclui `config.example.json` e `Dockerfile.sandbox` como bundled assets

## CLIs Controlados

**Claude Code CLI:**
- Provider: `ductor_bot/cli/claude_provider.py`
- Streaming via stdout JSON events (`ductor_bot/cli/stream_events.py`)
- Flags configuriaveis via `cli_parameters.claude` no config

**OpenAI Codex CLI:**
- Provider: `ductor_bot/cli/codex_provider.py`
- Cache observer: `ductor_bot/cli/codex_cache.py` e `ductor_bot/cli/codex_cache_observer.py`
- Discovery: `ductor_bot/cli/codex_discovery.py`

**Google Gemini CLI:**
- Provider: `ductor_bot/cli/gemini_provider.py`
- Cache observer: `ductor_bot/cli/gemini_cache.py` e `ductor_bot/cli/gemini_cache_observer.py`
- Utils: `ductor_bot/cli/gemini_utils.py`

**Selecao dinamica:**
- Factory pattern em `ductor_bot/cli/factory.py` (`create_cli()`)
- Model registry resolve `model_name -> (provider, actual_model)` automaticamente
- Model selector: `ductor_bot/orchestrator/selectors/model_selector.py`

## Requisitos de Plataforma

**Desenvolvimento:**
- Python 3.11+
- Docker (opcional, para sandbox mode)
- Acesso a pelo menos um dos CLIs: Claude Code, Codex, ou Gemini CLI (instalados globalmente via npm)
- Token de bot Telegram ou credenciais Matrix

**Producao:**
- Linux (suporta systemd service via `ductor_bot/infra/service_linux.py`)
- macOS (suporta launchd via `ductor_bot/infra/service_macos.py`)
- Windows (suporta Windows Service via `ductor_bot/infra/service_windows.py`)
- Docker opcional para sandboxing (container `ductor-sandbox` com `sleep infinity`)
- Memoria suficiente para CLIs de AI rodando como subprocessos

## Internacionalizacao

**Sistema i18n:**
- Diretorio: `ductor_bot/i18n/`
- Idiomas suportados: en, pt, es, fr, de, nl, ru
- Loader: `ductor_bot/i18n/loader.py`
- Config: campo `language` no config.json
