export type RuntimeName = 'claude-code' | 'codex';

export interface RuntimeConfig {
  enabled: boolean;
  command?: string; // defaults to 'claude' / 'codex'
  model?: string;
  profile?: string | null; // codex profile name
  extraArgs?: string[];
}

export interface ForgeClawConfig {
  botToken: string;
  allowedUsers: number[];
  allowedGroups?: number[];
  workingDir: string;
  vaultPath?: string;
  voiceProvider?: 'groq' | 'openai' | 'none';
  claudeModel?: string;
  maxConcurrentSessions?: number;
  /** Default runtime used when a topic/cron has no explicit override. */
  defaultRuntime?: RuntimeName;
  /** Runtime-specific configuration. */
  runtimes?: Partial<Record<RuntimeName, RuntimeConfig>>;
  /** Runtime used by the writer/janitor crons for memory extraction. */
  writerRuntime?: RuntimeName;
  writerModel?: string;
  /** If true, show runtime name in Telegram message footer. Default false. */
  showRuntimeBadge?: boolean;
  /**
   * How the janitor handles entries it proposes from daily log distillation:
   *   - 'auto': commit directly, no review queue (trust the janitor)
   *   - 'hybrid': auto-approve confidence >= 85, queue uncertain ones (default)
   *   - 'review': everything goes to review queue, manual approve
   */
  memoryReviewMode?: 'auto' | 'hybrid' | 'review';
  /** Minimum confidence (0-100) for auto-approve in hybrid mode. Default 85. */
  memoryAutoApproveThreshold?: number;
  /** Random token for dashboard authentication. Generated during install. */
  dashboardToken?: string;
  /**
   * IANA timezone for display purposes (dashboard, cron preview, memory timestamps).
   * Default: 'America/Sao_Paulo'. Examples: 'Europe/London', 'US/Eastern'.
   */
  timezone?: string;
  /**
   * Whether to pass --dangerously-skip-permissions to the Claude CLI.
   * Default: true (current behavior). Set to false to run in interactive
   * permission mode — useful for auditing what tools Claude uses.
   *
   * SECURITY NOTE: When true, Claude Code runs with full filesystem and
   * shell access without prompting. This is required for unattended
   * Telegram bot operation but means the LLM can execute arbitrary
   * commands in the bot's working directory.
   */
  skipPermissions?: boolean;
}

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
  /** Runtime override for this topic. NULL = use config default. */
  runtime?: RuntimeName | null;
  /** If true, fall back to default runtime when the chosen one is unavailable. */
  runtimeFallback?: boolean;
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
  origin: 'file' | 'db';
  sourceFile: string | null;
  /** Runtime override for this cron. NULL = use config default. */
  runtime?: RuntimeName | null;
  /** Optional model override (e.g. 'claude-haiku-4-5-20251001', 'gpt-5', 'gpt-5-codex'). */
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
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export interface StreamEvent {
  type: 'thinking' | 'text' | 'tool_use' | 'tool_result' | 'done';
  data: Record<string, unknown>;
}

export interface ClaudeRunnerOptions {
  cwd?: string;
  sessionId?: string;
  systemPrompt?: string;
  appendSystemPrompt?: string;
  allowedTools?: string[];
  model?: string;
}

// ------ Memory system types ------

export type MemoryEntryKind =
  | 'behavior' // behavior rules injected into the system prompt
  | 'user_profile' // facts about the user
  | 'fact' // objective facts (people, infra, integrations)
  | 'decision' // decisions taken in past sessions
  | 'preference'; // user preferences

export type MemoryAuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'archive'
  | 'restore'
  | 'pin'
  | 'unpin';

export interface MemoryEntry {
  id: number;
  userId: string;
  workspaceId: string;
  kind: MemoryEntryKind;
  content: string;
  contentHash: string;
  sourceType: string | null;
  sourceSessionId: string | null;
  createdAt: number;
  updatedAt: number;
  lastAccessedAt: number | null;
  accessCount: number;
  pinned: boolean;
  archivedAt: number | null;
  metadata: Record<string, unknown> | null;
  /** 0 = pending review (not visible to agent), 1 = approved & active. */
  reviewed: boolean;
  /** 0-100 confidence score from janitor distillation. null for manual/import. */
  confidence: number | null;
}

export interface MemoryRef {
  memoryId: number;
  entityType: 'project' | 'client' | 'person' | 'tech' | 'file' | 'topic';
  entityName: string;
}

export interface MemoryAuditEntry {
  id: number;
  memoryId: number;
  action: MemoryAuditAction;
  oldContent: string | null;
  newContent: string | null;
  actor: string;
  reason: string | null;
  at: number;
}

export interface MemoryRetrievalLog {
  id: number;
  userId: string;
  workspaceId: string;
  query: string;
  source: 'prefetch' | 'tool_search' | 'context_builder';
  hits: Array<{ memoryId: number; score: number; reason: string; contentPreview?: string }>;
  injected: boolean;
  at: number;
}

export interface MemorySearchHit {
  entry: MemoryEntry;
  score: number;
  reason: string; // 'fts' | 'entity' | 'kind-match' | ...
}
