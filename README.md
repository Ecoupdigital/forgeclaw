# ForgeClaw

> Your Personal AI Command Center -- controle o Claude Code via Telegram e Dashboard Web.

ForgeClaw transforma o Claude Code CLI num assistente pessoal acessivel por Telegram, com streaming em tempo real, memoria persistente, agentes especializados e tarefas agendadas. Zero custo de API -- roda direto com sua assinatura Claude Max.

## Features

### Core
- **Bot Telegram** -- sessoes isoladas por topico, streaming em tempo real, fila de mensagens, botoes inline
- **Dashboard Web** -- chat, sessoes, crons, memoria, agentes, tokens, atividade, webhooks, harness editor
- **CLI Installer** -- onboarding interativo com deteccao de dependencias e setup de servico
- **Motor Claude Code CLI** -- `Bun.spawn` com output `stream-json`, retry automatico, abort gracioso
- **Multi-Runtime** -- Claude Code e Codex compartilham 100% da memoria, troca sem perder contexto

### Agentes Especializados
- **Agentes por Topic** -- cada topic do Telegram pode ter um agente com prompt e comportamento proprio
- **Controle de Memoria** -- 3 modos: Global (tudo), Filtrado (por tags) ou Nenhuma (zero acesso)
- **CRUD via Dashboard** -- criar, editar, deletar agentes na aba Agentes
- **Vinculacao a Topics** -- dropdown no sidebar pra associar agente ao topic

### Memoria
- **Memoria Persistente** -- daily logs automaticos + compilacao para MEMORY.md
- **FTS5 Search** -- busca full-text nas memorias e mensagens
- **Filtro por Tags** -- agentes filtrados so acessam memorias com tags correspondentes
- **Janitor Automatico** -- roda as 23h55, destila fatos permanentes, limpa ruido
- **Obsidian Vault** -- integra com vault existente pra contexto extra

### Automacao
- **Crons Proativos** -- HEARTBEAT.md com schedule em portugues natural, hot-reload
- **Webhooks Outbound** -- notificacoes HTTP com HMAC-SHA256, retry e circuit breaker
- **Token Tracking** -- uso por sessao/dia com breakdown cache vs fresh tokens
- **Activity Feed** -- timeline do sistema em tempo real com filtros por tipo

### Multimidia
- **Voz** -- transcricao via Whisper (Groq ou OpenAI)
- **Arquivos** -- PDF, imagens, ZIP, tar.gz enviados ao Claude com contexto
- **Outbound** -- arquivos gerados pelo Claude enviados de volta no Telegram
- **Formatacao** -- Markdown convertido pra HTML Telegram (headers, listas, code blocks, links)

## Quick Start

```bash
# Instalar
npx forgeclaw install

# Ou manualmente:
git clone https://github.com/<your-org>/forgeclaw.git
cd ForgeClaw
bun install
```

## Arquitetura

Monorepo com 4 packages:

```
packages/
  core/        @forgeclaw/core       Motor (runner, sessions, store, crons, memory, agents)
  bot/         @forgeclaw/bot        Bot Telegram (grammy + streaming + agentes)
  dashboard/   @forgeclaw/dashboard  Dashboard Web (Next.js 16, React 19, Tailwind 4)
  cli/         forgeclaw             CLI installer com onboarding interativo
```

### Fluxo de dados

```
Telegram msg → grammy → text-handler → load agent → ContextBuilder
                                                        ├─ harness (SOUL, USER, TOOLS, MEMORY, STYLE)
                                                        ├─ agent system_prompt (prepended)
                                                        ├─ memory retrieval (global/filtered/none)
                                                        └─ vault pointer
                                                    → ClaudeRunner (Bun.spawn claude CLI)
                                                    → streaming response → Telegram + Dashboard
```

## Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Bun >= 1.1 |
| Linguagem | TypeScript 5.7 |
| Bot | grammy 1.42 + @grammyjs/runner + @grammyjs/auto-retry |
| Dashboard | Next.js 16 + React 19 + Tailwind 4 + shadcn/ui |
| Database | SQLite (bun:sqlite core, better-sqlite3 dashboard) com WAL mode |
| Crons | croner 9.x + HEARTBEAT.md parser |
| Voice | Groq Whisper / OpenAI Whisper API |
| CLI UX | @clack/prompts |
| Servico | systemd (Linux) / launchd (macOS) |

## Setup (Desenvolvimento)

### Pre-requisitos

- [Bun](https://bun.sh) >= 1.1
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) instalado e autenticado
- Bot Telegram criado via [@BotFather](https://t.me/BotFather)

### Instalacao

```bash
git clone https://github.com/<your-org>/forgeclaw.git
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
  "voiceProvider": "groq",
  "claudeModel": "sonnet"
}
```

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `botToken` | string | Sim | Token do bot Telegram (obter em @BotFather) |
| `allowedUsers` | number[] | Sim | IDs de usuarios autorizados |
| `allowedGroups` | number[] | Nao | IDs de grupos Telegram autorizados |
| `workingDir` | string | Nao | Diretorio base dos projetos. Default: `~/forgeclaw-projects` |
| `vaultPath` | string | Nao | Caminho do Obsidian Vault |
| `voiceProvider` | string | Nao | `"groq"` (recomendado), `"openai"` ou `"none"` |
| `claudeModel` | string | Nao | Modelo Claude a usar (ex: `"sonnet"`, `"opus"`, `"haiku"`) |
| `defaultRuntime` | string | Nao | `"claude-code"` (default) ou `"codex"` |
| `dashboardToken` | string | Auto | Token de autenticacao do dashboard (gerado no install) |

### Rodar

```bash
# Bot Telegram
bun run dev:bot

# Dashboard (porta 4040)
bun run dev:dashboard

# Ambos
bun run dev
```

## Dashboard

O dashboard roda em `localhost:4040` com 9 abas:

| Aba | Funcao |
|-----|--------|
| **Sessoes** | Chat com topics, historico, streaming bidirecional |
| **Automacoes** | CRUD de cron jobs, logs de execucao, run-now |
| **Memoria** | Entradas de memoria, busca FTS5, audit trail |
| **Agentes** | CRUD de agentes especializados (prompt, memoria, runtime) |
| **Tokens** | Uso de tokens por dia/sessao, breakdown cache vs fresh |
| **Atividade** | Feed de eventos do sistema com filtros |
| **Webhooks** | Webhooks outbound com HMAC, delivery logs, retry |
| **Configuracoes** | Config do bot (read-only) |
| **Personalidade** | Editor do harness CLAUDE.md |

## Agentes Especializados

Agentes permitem criar personas especificas para diferentes contextos:

```
Agente: Financeiro
  Prompt: "Voce e especialista financeiro. Use a skill billing-api..."
  Memoria: Filtrada por tags ["financeiro", "clientes"]
  Runtime: Claude Code
```

### Modos de Memoria

| Modo | Comportamento |
|------|---------------|
| **Global** | Injeta toda a memoria (padrao) |
| **Filtrado** | Filtra por tags via memory_refs.entity_name |
| **Nenhuma** | Zero memoria injetada -- agente limpo |

### Como funciona

1. Crie um agente na aba **Agentes** do dashboard
2. No sidebar de **Sessoes**, vincule o agente a um topic via dropdown
3. Mensagens naquele topic usam o prompt e filtro de memoria do agente
4. O prompt do agente e prepended ao harness -- nao substitui

## Estrutura de Dados

Tudo fica em `~/.forgeclaw/`:

```
~/.forgeclaw/
  forgeclaw.config.json    # Configuracao principal
  db/
    forgeclaw.db           # SQLite -- sessoes, mensagens, topicos, crons, agentes, tokens, activities, webhooks
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

Cache por mtime -- se o arquivo nao mudou, nao rele do disco.

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
| `Toda hora` | `Toda hora` |
| `Toda segunda as Xh` | `Toda segunda as 9h` |
| `A cada N minutos` | `A cada 30 minutos` |
| Cron expression | `*/5 * * * *` |

Hot-reload automatico quando o HEARTBEAT.md e editado.

## Webhooks

Configure webhooks outbound pra integrar com outros sistemas:

- **Eventos**: session.created, cron.fired, cron.result, message.incoming, memory.created, etc.
- **Seguranca**: HMAC-SHA256 no header `X-ForgeClaw-Signature`
- **Retry**: backoff exponencial (1s, 4s, 16s) com circuit breaker apos 5 falhas
- **Logs**: historico de entregas com status code e tentativas

## Comandos do Bot

| Comando | Descricao |
|---------|-----------|
| `/start` | Inicializa sessao e mostra ajuda |
| `/new` | Nova sessao (limpa contexto anterior) |
| `/stop` | Aborta tarefa em execucao |
| `/status` | Status da sessao, contexto usado, fila |
| `/project` | Lista projetos e permite trocar |
| `/help` | Mostra todos os comandos |

### Prefixos especiais

| Prefixo | Efeito |
|---------|--------|
| `!` | Interrompe tarefa atual e envia novo prompt |

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
