export type RuntimeName = "claude-code" | "codex";

export interface SessionInfo {
  id: string;
  topicId: number | null;
  claudeSessionId: string | null;
  projectDir: string | null;
  contextUsage: number;
  createdAt: number;
  updatedAt: number;
}

export interface TopicInfo {
  id: number;
  threadId: number | null;
  chatId: number;
  name: string | null;
  projectDir: string | null;
  sessionId: string | null;
  createdAt: number;
  runtime?: RuntimeName | null;
  runtimeFallback?: boolean;
  agentId?: number | null;
}

export type MemoryMode = "global" | "filtered" | "none";

export interface AgentConfig {
  id: number;
  name: string;
  systemPrompt: string | null;
  memoryMode: MemoryMode;
  memoryDomainFilter: string[];
  defaultRuntime: RuntimeName | null;
  createdAt: number;
  updatedAt: number;
}

export interface CronJob {
  id: number;
  name: string;
  schedule: string;
  prompt: string;
  targetTopicId: number | null;
  enabled: boolean;
  lastRun: number | null;
  lastStatus: string | null;
  origin: "file" | "db";
  sourceFile: string | null;
  runtime?: RuntimeName | null;
  model?: string | null;
}

export interface CronLog {
  id: number;
  jobId: number;
  startedAt: number;
  finishedAt: number | null;
  status: string;
  output: string | null;
}

export interface Message {
  id: number;
  topicId: number;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

export interface DailyLog {
  date: string;
  path: string;
  entries: number;
}

export interface HarnessFile {
  name: string;
  path: string;
  content: string;
}

export interface ForgeClawConfig {
  botToken: string;
  allowedUsers: number[];
  allowedGroups?: number[];
  workingDir: string;
  vaultPath?: string;
  voiceProvider?: "groq" | "openai" | "none";
  claudeModel?: string;
  maxConcurrentSessions?: number;
  defaultRuntime?: RuntimeName;
  showRuntimeBadge?: boolean;
  memoryReviewMode?: "auto" | "hybrid" | "review";
  memoryAutoApproveThreshold?: number;
  dashboardToken?: string;
  timezone?: string;
}

export interface PlanCard {
  id: string;
  name: string;
  description: string;
  status: "planned" | "executing" | "completed";
  agent?: string;
}

export interface SkillInfo {
  name: string;
  description: string;
  source: string;
}

// ------ Mission Control types ------

export type ActivityType =
  | 'session:created'
  | 'session:resumed'
  | 'message:sent'
  | 'message:received'
  | 'cron:fired'
  | 'cron:completed'
  | 'cron:failed'
  | 'memory:created'
  | 'memory:updated'
  | 'webhook:delivered'
  | 'webhook:failed';

export type ActivityEntityType = 'session' | 'cron' | 'message' | 'memory' | 'webhook';

export interface TokenUsage {
  id: number;
  sessionKey: string;
  topicId: number | null;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  model: string | null;
  source: 'dashboard' | 'telegram' | 'cron';
  createdAt: number;
}

export interface Activity {
  id: number;
  type: ActivityType;
  entityType: ActivityEntityType;
  entityId: string;
  actor: string;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: number;
}

export interface Webhook {
  id: number;
  url: string;
  events: string[];
  secret: string;
  enabled: boolean;
  createdAt: number;
}

export interface WebhookDeliveryLog {
  id: number;
  webhookId: number;
  eventType: string;
  payload: string;
  statusCode: number | null;
  responseBody: string | null;
  attempt: number;
  createdAt: number;
}
