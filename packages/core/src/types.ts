export interface ForgeClawConfig {
  botToken: string;
  allowedUsers: number[];
  allowedGroups?: number[];
  workingDir: string;
  vaultPath?: string;
  voiceProvider?: 'openai' | 'google' | 'none';
  claudeModel?: string;
  maxConcurrentSessions?: number;
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
