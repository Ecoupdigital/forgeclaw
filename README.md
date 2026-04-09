# ForgeClaw

> Your Personal AI Command Center -- controle o Claude Code via Telegram e Dashboard Web.

ForgeClaw transforma o Claude Code CLI num assistente pessoal acessivel por Telegram, com streaming em tempo real, memoria persistente e tarefas agendadas. Zero custo de API -- roda direto com sua assinatura Claude Max.

## Features

- **Bot Telegram** -- sessoes isoladas por topico, streaming em tempo real com edits, fila de mensagens, botoes inline
- **Dashboard Web** -- chat, sessoes, crons, memoria, harness editor e configuracao
- **CLI Installer** -- onboarding interativo com deteccao de dependencias e setup de servico
- **Motor Claude Code CLI** -- `Bun.spawn` com output `stream-json`, retry automatico, abort gracioso
- **Memoria Persistente** -- daily logs automaticos + compilacao para MEMORY.md + Obsidian Vault integration
- **Crons Proativos** -- HEARTBEAT.md com schedule em portugues natural, hot-reload no file watch
- **Harness System** -- 6 arquivos markdown que definem personalidade, estilo, ferramentas e contexto
- **Multimidia** -- voz (Whisper), fotos, documentos (PDF, ZIP, tar.gz, texto)
- **UP Commands** -- deteccao automatica de `/up:` commands e opcoes numeradas com botoes inline

## Quick Start

```bash
# Instalar
npx forgeclaw install

# Ou manualmente:
git clone https://github.com/seu-usuario/ForgeClaw.git
cd ForgeClaw
bun install
```

## Arquitetura

Monorepo com 4 packages:

```
packages/
  core/        @forgeclaw/core       Logica compartilhada (runner, sessions, store, crons, memory)
  bot/         @forgeclaw/bot        Bot Telegram (grammy + runner concorrente)
  dashboard/   @forgeclaw/dashboard  Dashboard Web (Next.js 16, React 19, Tailwind 4)
  cli/         forgeclaw             CLI installer com onboarding interativo
```

## Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Bun >= 1.1 |
| Linguagem | TypeScript 5.7 |
| Bot | grammy 1.38 + @grammyjs/runner + @grammyjs/auto-retry |
| Dashboard | Next.js 16 + React 19 + Tailwind 4 + shadcn/ui |
| Database | SQLite (bun:sqlite) com WAL mode |
| Crons | croner 9.x + HEARTBEAT.md parser |
| Voice | OpenAI Whisper API |
| CLI UX | @clack/prompts |
| Servico | systemd (Linux) / launchd (macOS) |

## Setup Manual (Desenvolvimento)

### Pre-requisitos

- [Bun](https://bun.sh) >= 1.1
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) instalado e autenticado
- Bot Telegram criado via [@BotFather](https://t.me/BotFather)

### Instalacao

```bash
git clone https://github.com/seu-usuario/ForgeClaw.git
cd ForgeClaw
bun install
```

### Configuracao

Crie o arquivo `~/.forgeclaw/forgeclaw.config.json`:

```json
{
  "botToken": "123456:ABC-DEF...",
  "allowedUsers": [123456789],
  "workingDir": "/home/usuario/projects",
  "vaultPath": "/home/usuario/obsidian",
  "voiceProvider": "openai",
  "claudeModel": "opus"
}
```

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `botToken` | string | Sim | Token do bot Telegram (obter em @BotFather) |
| `allowedUsers` | number[] | Sim | IDs de usuarios autorizados (obter em @userinfobot) |
| `workingDir` | string | Nao | Diretorio base dos projetos. Default: `~/forgeclaw-projects` |
| `vaultPath` | string | Nao | Caminho do Obsidian Vault |
| `voiceProvider` | string | Nao | `"openai"`, `"google"` ou `"none"` |
| `claudeModel` | string | Nao | Modelo Claude a usar (ex: `"opus"`, `"sonnet"`) |
| `maxConcurrentSessions` | number | Nao | Limite de sessoes simultaneas |

### Rodar

```bash
# Bot Telegram
bun run dev:bot

# Dashboard (porta 4040)
bun run dev:dashboard

# Ambos
bun run dev
```

## Estrutura de Dados

Tudo fica em `~/.forgeclaw/`:

```
~/.forgeclaw/
  forgeclaw.config.json    # Configuracao principal
  db/
    forgeclaw.db           # SQLite -- sessoes, mensagens, topicos, crons
  harness/
    SOUL.md                # Identidade e principios da IA
    USER.md                # Perfil do usuario
    AGENTS.md              # Agentes disponiveis e routing
    TOOLS.md               # Ferramentas disponiveis
    MEMORY.md              # Memoria consolidada (longo prazo)
    STYLE.md               # Guia de estilo de comunicacao
  memory/
    DAILY/
      2026-04-09.md        # Log diario com timestamps
  logs/
    bot.log                # Log do bot
    crons/                 # Logs de cron jobs
  HEARTBEAT.md             # Definicao de cron jobs
```

## Harness System

O Harness e o sistema de personalidade do ForgeClaw. Sao 6 arquivos markdown injetados como system prompt:

| Arquivo | Funcao |
|---------|--------|
| `SOUL.md` | Identidade, principios, tom de comunicacao |
| `USER.md` | Perfil do usuario (nome, empresa, preferencias) |
| `AGENTS.md` | Agentes disponiveis e regras de routing |
| `TOOLS.md` | Ferramentas disponiveis (built-in, MCP, integracoes) |
| `MEMORY.md` | Memoria de longo prazo (compilada dos daily logs) |
| `STYLE.md` | Guia de estilo -- formatacao, emoji, linguagem |

Os arquivos CORE (`SOUL`, `USER`, `AGENTS`, `TOOLS`, `MEMORY`) sao sempre carregados. O `STYLE.md` so e carregado quando a mensagem contem keywords de conteudo (post, instagram, linkedin, etc).

O cache e feito por mtime -- se o arquivo nao mudou, nao relê do disco.

## Crons (HEARTBEAT.md)

O `~/.forgeclaw/HEARTBEAT.md` define tarefas agendadas com schedule em portugues natural:

```markdown
## Todo dia as 23h30 -> topico: Daily Review

- Revise o log diario e compile insights para MEMORY.md
- Liste tarefas pendentes para amanha

## Toda segunda as 8h -> topico: Weekly Planning

- Analise o progresso da semana anterior
- Sugira prioridades para esta semana

## A cada 30 minutos -> topico: Monitoring

- Verifique se os servicos estao rodando
```

### Schedules suportados

| Formato | Exemplo |
|---------|---------|
| `Todo dia as Xh` | `Todo dia as 8h` |
| `Todo dia as XhYY` | `Todo dia as 23h30` |
| `Toda hora` | `Toda hora` |
| `Toda segunda as Xh` | `Toda segunda as 9h` |
| `Toda terca e quinta as Xh` | `Toda terca e quinta as 9h` |
| `A cada N minutos` | `A cada 30 minutos` |
| `A cada N horas` | `A cada 2 horas` |
| Cron expression | `*/5 * * * *` |

O engine faz hot-reload automatico quando o HEARTBEAT.md e editado (debounce de 2s).

## Comandos do Bot Telegram

| Comando | Descricao |
|---------|-----------|
| `/start` | Inicializa sessao e mostra ajuda |
| `/new` | Nova sessao (limpa contexto anterior) |
| `/stop` | Aborta tarefa em execucao |
| `/status` | Mostra status da sessao, contexto usado, fila |
| `/project` | Lista projetos e permite trocar |
| `/help` | Mostra todos os comandos |

### Prefixos especiais

| Prefixo | Efeito |
|---------|--------|
| `!` | Interrompe tarefa atual e envia novo prompt |

### Botoes inline

Toda resposta do Claude vem com botoes:
- **UP** -- abre grid de comandos UP (progresso, planejar fase, executar, etc)
- **Parar** -- aborta tarefa
- **Novo** -- nova sessao

Alem disso, o bot detecta automaticamente:
- Comandos `/up:` no texto e gera botoes
- Opcoes numeradas (1. Opcao X, 2. Opcao Y) e gera botoes clicaveis

## Scripts

| Script | Descricao |
|--------|-----------|
| `bun run dev` | Roda bot + dashboard em paralelo |
| `bun run dev:bot` | Roda so o bot com watch |
| `bun run dev:dashboard` | Roda so o dashboard (porta 4040) |
| `bun run build` | Build de producao de todos os packages |
| `bun run start` | Inicia o bot em producao |
| `bun run typecheck` | Type-check de todos os packages |

## License

MIT
