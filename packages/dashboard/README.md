# @forgeclaw/dashboard

Dashboard Web do ForgeClaw. Interface para gerenciar sessoes, crons, memoria, harness e configuracao.

## Rodar

```bash
# Desenvolvimento (porta 4040)
bun run dev

# Build de producao
bun run build

# Producao (porta 4040)
bun run start
```

Acesse: http://localhost:4040

## Stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- shadcn/ui + Lucide icons
- better-sqlite3 (dashboard le o mesmo DB do bot)
- Fontes: Inter + JetBrains Mono

## Abas

### Sessions

Visualizacao de sessoes ativas com sidebar de sessoes. Chat com input para enviar mensagens ao Claude, barra de contexto mostrando uso, e historico de mensagens.

Componentes: `sessions-tab.tsx`, `session-sidebar.tsx`, `chat-input.tsx`, `chat-message.tsx`, `context-bar.tsx`

### Crons

Gerenciamento de cron jobs definidos no HEARTBEAT.md. Cards com nome, schedule, status do ultimo run, e botoes para executar manualmente ou desabilitar.

Componentes: `crons-tab.tsx`, `cron-card.tsx`

### Memory

Visualizacao e edicao da memoria (MEMORY.md + daily logs). Lista de daily logs com contagem de entradas.

Componentes: `memory-tab.tsx`

### Harness

Editor dos 6 arquivos do Harness (SOUL.md, USER.md, AGENTS.md, TOOLS.md, MEMORY.md, STYLE.md). Edicao in-place com save.

Componentes: `harness-tab.tsx`, `harness-editor.tsx`

### Config

Visualizacao e edicao do `forgeclaw.config.json`. Campos com descricao e validacao.

Componentes: `config-tab.tsx`

## Componente Principal

`dashboard-shell.tsx` -- shell do dashboard com navegacao por abas. Recebe cada aba como prop.

## API Routes

Todas as rotas ficam em `src/app/api/`:

### GET /api/sessions

Retorna sessoes, topicos e mensagens.

```json
{
  "sessions": [...],
  "topics": [...],
  "messages": [...]
}
```

### POST /api/sessions

Envia mensagem para uma sessao.

**Body:** `{ topicId: number, message: string }`

### GET /api/crons

Lista cron jobs.

### POST /api/crons

Cria cron job.

### PUT /api/crons

Acao em cron job (executar, toggle).

**Body:** `{ id: number, action: string }`

### GET /api/crons/[id]/logs

Logs de um cron job especifico.

### GET /api/memory

Retorna MEMORY.md e lista de daily logs.

### PUT /api/memory

Atualiza MEMORY.md.

**Body:** `{ content: string }`

### GET /api/harness

Lista arquivos do harness com conteudo.

### PUT /api/harness

Atualiza um arquivo do harness.

**Body:** `{ name: string, content: string }`

### GET /api/config

Retorna configuracao atual.

### PUT /api/config

Atualiza configuracao.

### GET /api/heartbeat

Retorna conteudo do HEARTBEAT.md.

### PUT /api/heartbeat

Atualiza HEARTBEAT.md.

**Body:** `{ content: string }`

## Estrutura

```
src/
  app/
    layout.tsx              # Root layout (Inter + JetBrains Mono, dark theme)
    page.tsx                # Home -- DashboardShell com todas as abas
    globals.css             # Tailwind + tema custom
    api/
      sessions/route.ts     # CRUD sessoes + mensagens
      crons/route.ts        # CRUD crons
      crons/[id]/logs/      # Logs de cron especifico
      memory/route.ts       # CRUD memoria
      harness/route.ts      # CRUD harness files
      config/route.ts       # CRUD config
      heartbeat/route.ts    # CRUD HEARTBEAT.md
  components/
    dashboard-shell.tsx     # Shell principal com tabs
    sessions-tab.tsx        # Aba de sessoes
    session-sidebar.tsx     # Sidebar com lista de sessoes
    chat-input.tsx          # Input de chat
    chat-message.tsx        # Bolha de mensagem
    context-bar.tsx         # Barra visual de uso de contexto
    crons-tab.tsx           # Aba de crons
    cron-card.tsx           # Card de cron job
    kanban-board.tsx        # Board kanban
    memory-tab.tsx          # Aba de memoria
    harness-tab.tsx         # Aba do harness
    harness-editor.tsx      # Editor de arquivo harness
    config-tab.tsx          # Aba de configuracao
    ui/                     # Componentes shadcn/ui
```
