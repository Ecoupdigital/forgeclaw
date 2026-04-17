/**
 * ForgeClaw Memory System — public types.
 *
 * The memory system is pluggable via the MemoryProvider interface, inspired
 * by Hermes Agent's architecture but adapted to ForgeClaw's SQLite-backed
 * store, Telegram-first UX, and Obsidian vault integration.
 *
 * Built-in provider always runs. External providers (semantic embedding,
 * external KV, cross-device sync) can be registered via MemoryManager in
 * future commercial tiers.
 */

export type MemoryAction = 'search' | 'read' | 'add' | 'replace' | 'remove';

export interface MemoryToolInput {
  action: MemoryAction;
  target?: 'memory' | 'user' | 'daily';
  query?: string;
  date?: string;
  content?: string;
  needle?: string;
  kind?: string;
}

export interface MemoryToolResult {
  ok: boolean;
  message: string;
  data?: unknown;
}

export interface ProviderInitContext {
  userId: string;
  workspaceId: string;
  platform: 'cli' | 'telegram' | 'dashboard' | 'cron' | 'test';
  sessionId?: string;
  agentContext?: 'primary' | 'subagent' | 'cron' | 'flush';
}

export interface PrefetchResult {
  text: string; // the actual content to inject
  hits: Array<{ memoryId: number; score: number; reason: string; contentPreview: string }>;
}

export interface ToolSchema {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/**
 * Abstract interface every memory provider must implement.
 *
 * Lifecycle (called by MemoryManager):
 *  - isAvailable()       — check config/deps, no network
 *  - initialize()        — connect, warm caches, start threads
 *  - systemPromptBlock() — static text for system prompt (frozen snapshot)
 *  - prefetch()          — fast recall before each turn, cached
 *  - queuePrefetch()     — queue background recall for next turn
 *  - syncTurn()          — persist turn data, async OK
 *  - getToolSchemas()    — tools exposed to the agent
 *  - handleToolCall()    — dispatch a tool call
 *  - onSessionEnd()      — optional end-of-session hook
 *  - shutdown()          — clean exit
 */
export interface MemoryProvider {
  readonly name: string;

  isAvailable(): boolean;
  initialize(ctx: ProviderInitContext): Promise<void>;

  systemPromptBlock(): Promise<string>;

  prefetch(query: string, ctx: { sessionId?: string; entityFilter?: string[] }): Promise<PrefetchResult | null>;
  queuePrefetch(query: string, ctx: { sessionId?: string; entityFilter?: string[] }): void;

  syncTurn(userContent: string, assistantContent: string, ctx: { sessionId?: string }): Promise<void>;

  getToolSchemas(): ToolSchema[];
  handleToolCall(name: string, args: MemoryToolInput): Promise<MemoryToolResult>;

  onSessionEnd?(): Promise<void>;
  shutdown(): Promise<void>;
}
