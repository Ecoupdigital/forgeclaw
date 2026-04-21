import type {
  SessionInfo,
  TopicInfo,
  Message,
  CronJob,
  CronLog,
  DailyLog,
  HarnessFile,
  ForgeClawConfig,
  PlanCard,
} from "./types";

const now = Date.now();
const hour = 3600000;
const day = 86400000;

export const mockTopics: TopicInfo[] = [
  {
    id: 1,
    threadId: 101,
    chatId: 1001,
    name: "Demo Project",
    projectDir: "/home/example/projects/demo-app",
    sessionId: "sess-001",
    createdAt: now - 7 * day,
  },
  {
    id: 2,
    threadId: 102,
    chatId: 1001,
    name: "Demo Dashboard",
    projectDir: "/home/example/projects/demo-app/packages/dashboard",
    sessionId: "sess-002",
    createdAt: now - 2 * day,
  },
  {
    id: 3,
    threadId: 103,
    chatId: 1001,
    name: "Demo Memory",
    projectDir: "/home/example/projects/demo-app",
    sessionId: null,
    createdAt: now - 5 * day,
  },
  {
    id: 4,
    threadId: null,
    chatId: 1001,
    name: "Cron Jobs Setup",
    projectDir: "/home/example/projects/demo-app",
    sessionId: null,
    createdAt: now - 3 * day,
  },
];

export const mockSessions: SessionInfo[] = [
  {
    id: "sess-001",
    topicId: 1,
    claudeSessionId: "claude-abc123",
    projectDir: "/home/example/projects/demo-app",
    contextUsage: 34,
    createdAt: now - 2 * hour,
    updatedAt: now - 300000,
  },
  {
    id: "sess-002",
    topicId: 2,
    claudeSessionId: "claude-def456",
    projectDir: "/home/example/projects/demo-app/packages/dashboard",
    contextUsage: 12,
    createdAt: now - hour,
    updatedAt: now - 60000,
  },
];

export const mockMessages: Message[] = [
  {
    id: 1,
    topicId: 1,
    role: "user",
    content: "Implementa o StateStore com SQLite usando bun:sqlite",
    createdAt: now - 2 * hour,
  },
  {
    id: 2,
    topicId: 1,
    role: "assistant",
    content: `Vou implementar o StateStore. Primeiro, preciso criar a estrutura do banco de dados.

\`\`\`typescript
import { Database } from 'bun:sqlite';

class StateStore {
  private db: Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.init();
  }
}
\`\`\`

Criei as tabelas para sessions, messages, topics, cron_jobs e cron_logs. O StateStore exporta uma instancia singleton.`,
    createdAt: now - 2 * hour + 30000,
  },
  {
    id: 3,
    topicId: 1,
    role: "user",
    content: "Agora adiciona os metodos CRUD para sessions e messages",
    createdAt: now - hour,
  },
  {
    id: 4,
    topicId: 1,
    role: "assistant",
    content:
      "Implementei os metodos createSession, getSession, updateSession, listSessions, deleteSession, createMessage e getMessages. Todos usam prepared statements para seguranca.",
    createdAt: now - hour + 15000,
  },
  {
    id: 5,
    topicId: 2,
    role: "user",
    content: "Construa o dashboard web com Next.js 15 e shadcn/ui",
    createdAt: now - 30 * 60000,
  },
  {
    id: 6,
    topicId: 2,
    role: "assistant",
    content:
      "Vou construir o dashboard completo. O layout principal tera uma sidebar fixa com sessoes/topicos e uma area principal com tabs de navegacao.",
    createdAt: now - 29 * 60000,
  },
];

export const mockCronJobs: CronJob[] = [
  {
    id: 1,
    name: "Todo dia as 23h30",
    schedule: "30 23 * * *",
    prompt: "Compile o daily log em MEMORY.md",
    targetTopicId: 1,
    enabled: true,
    lastRun: now - day,
    lastStatus: "success",
    origin: "file",
    sourceFile: "~/.forgeclaw/HEARTBEAT.md",
  },
  {
    id: 2,
    name: "Todo dia as 8h",
    schedule: "0 8 * * *",
    prompt: "Bom dia! Verifique tarefas pendentes e me de um resumo",
    targetTopicId: 1,
    enabled: true,
    lastRun: now - 16 * hour,
    lastStatus: "success",
    origin: "file",
    sourceFile: "~/.forgeclaw/HEARTBEAT.md",
  },
  {
    id: 3,
    name: "Toda hora",
    schedule: "0 * * * *",
    prompt: "Verifique se ha atualizacoes no repositorio",
    targetTopicId: null,
    enabled: false,
    lastRun: now - 2 * hour,
    lastStatus: "failed",
    origin: "db",
    sourceFile: null,
  },
];

export const mockCronLogs: CronLog[] = [
  {
    id: 1,
    jobId: 1,
    startedAt: now - day,
    finishedAt: now - day + 45000,
    status: "success",
    output: "Daily log compiled. 12 entries processed, 5 insights extracted.",
  },
  {
    id: 2,
    jobId: 1,
    startedAt: now - 2 * day,
    finishedAt: now - 2 * day + 38000,
    status: "success",
    output: "Daily log compiled. 8 entries processed, 3 insights extracted.",
  },
  {
    id: 3,
    jobId: 2,
    startedAt: now - 16 * hour,
    finishedAt: now - 16 * hour + 12000,
    status: "success",
    output:
      "Bom dia! 3 tarefas pendentes: finalizar dashboard, configurar crons, testar WebSocket.",
  },
  {
    id: 4,
    jobId: 3,
    startedAt: now - 2 * hour,
    finishedAt: now - 2 * hour + 5000,
    status: "failed",
    output: "Error: Git repository not configured for this topic.",
  },
];

export const mockDailyLogs: DailyLog[] = [
  { date: "2026-04-09", path: "~/.forgeclaw/memory/DAILY/2026-04-09.md", entries: 12 },
  { date: "2026-04-08", path: "~/.forgeclaw/memory/DAILY/2026-04-08.md", entries: 8 },
  { date: "2026-04-07", path: "~/.forgeclaw/memory/DAILY/2026-04-07.md", entries: 15 },
  { date: "2026-04-06", path: "~/.forgeclaw/memory/DAILY/2026-04-06.md", entries: 5 },
  { date: "2026-04-05", path: "~/.forgeclaw/memory/DAILY/2026-04-05.md", entries: 10 },
];

export const mockMemoryContent = `# MEMORY.md

## Decisoes Importantes
- [2026-04-08] Escolhido banco local como store principal
- [2026-04-07] Arquitetura: monorepo com multiplos packages
- [2026-04-06] Stack definida: runtime moderno, TypeScript, framework fullstack

## Padroes Aprendidos
- [2026-04-08] Store deve ser singleton para evitar locks
- [2026-04-07] Arquivos de configuracao cached por mtime para performance
- [2026-04-06] Engine de agendamento com hot-reload via fs.watch

## Contexto do Usuario
- Prefere respostas concisas
- Projeto de demo (example-project)
- Usa agente de IA como backend de execucao
`;

export const mockHarnessFiles: HarnessFile[] = [
  {
    name: "SOUL.md",
    path: "~/.forgeclaw/harness/SOUL.md",
    content: `# SOUL.md - Personalidade do ForgeClaw

Voce e o ForgeClaw, um assistente pessoal de IA.
Voce e direto, eficiente e tecnico.
Responda sempre em portugues brasileiro.`,
  },
  {
    name: "USER.md",
    path: "~/.forgeclaw/harness/USER.md",
    content: `# USER.md - Perfil do Usuario

Desenvolvedor senior, trabalha com TypeScript/Bun.
Prefere codigo limpo e bem tipado.
Fuso horario: America/Sao_Paulo.`,
  },
  {
    name: "AGENTS.md",
    path: "~/.forgeclaw/harness/AGENTS.md",
    content: `# AGENTS.md - Agentes Disponiveis

## Planejador
Arquiteto de software para mudancas complexas.

## Depurador
Especialista em debugging sistematico.

## Revisor
Revisa codigo para escalabilidade.`,
  },
  {
    name: "TOOLS.md",
    path: "~/.forgeclaw/harness/TOOLS.md",
    content: `# TOOLS.md - Ferramentas

## Read - Leitura de arquivos
## Edit - Edicao de arquivos
## Bash - Execucao de comandos
## Glob - Busca de arquivos
## Grep - Busca de conteudo`,
  },
  {
    name: "MEMORY.md",
    path: "~/.forgeclaw/harness/MEMORY.md",
    content: mockMemoryContent,
  },
  {
    name: "STYLE.md",
    path: "~/.forgeclaw/harness/STYLE.md",
    content: `# STYLE.md - Guia de Estilo de Conteudo

Tom: profissional mas acessivel.
Formato: markdown com headers claros.
Codigo: sempre com tipos e comentarios.`,
  },
];

export const mockConfig: ForgeClawConfig = {
  botToken: "***hidden***",
  allowedUsers: [123456789],
  workingDir: "/home/example/projects/demo-app",
  vaultPath: "/home/example/vault",
  voiceProvider: "groq",
  claudeModel: "claude-sonnet-4-20250514",
  maxConcurrentSessions: 3,
  defaultRuntime: "claude-code",
  showRuntimeBadge: false,
  memoryReviewMode: "hybrid",
  memoryAutoApproveThreshold: 85,
};

export const mockHeartbeat = `# HEARTBEAT.md

## Todo dia as 23h30 -> topico: Example Topic
- Compile o daily log em MEMORY.md
- Extraia insights e decisoes importantes

## Todo dia as 8h -> topico: Example Topic
- Bom dia! Verifique tarefas pendentes e me de um resumo
- Liste issues abertas no GitHub

## Toda hora -> topico: Cron Jobs Setup
- Verifique se ha atualizacoes no repositorio
`;

export const mockPlans: PlanCard[] = [
  {
    id: "PLAN-001",
    name: "Core Engine",
    description: "StateStore, EventBus, ClaudeRunner, SessionManager",
    status: "completed",
  },
  {
    id: "PLAN-002",
    name: "Telegram Bot",
    description: "Integracao com Telegram Bot API",
    status: "completed",
  },
  {
    id: "PLAN-003",
    name: "Harness System",
    description: "SOUL.md, USER.md, MEMORY.md loader com cache",
    status: "completed",
  },
  {
    id: "PLAN-004",
    name: "Cron Engine",
    description: "HEARTBEAT.md parser, scheduler, hot-reload",
    status: "completed",
  },
  {
    id: "PLAN-005",
    name: "Memory Manager",
    description: "Daily logs, MEMORY.md compilation",
    status: "completed",
  },
  {
    id: "PLAN-006",
    name: "Voice Handler",
    description: "Transcricao de audio via OpenAI Whisper",
    status: "completed",
  },
  {
    id: "PLAN-007",
    name: "UP Integration",
    description: "Deteccao de botoes UP, state persistence",
    status: "executing",
    agent: "up-executor",
  },
  {
    id: "PLAN-008",
    name: "Dashboard Web",
    description: "Next.js dashboard com chat, kanban, crons, memory",
    status: "executing",
    agent: "frontend-specialist",
  },
  {
    id: "PLAN-009",
    name: "WebSocket Streaming",
    description: "Real-time streaming de respostas Claude",
    status: "planned",
  },
  {
    id: "PLAN-010",
    name: "Vault Navigator",
    description: "Exploracao de Obsidian vault",
    status: "planned",
  },
];
