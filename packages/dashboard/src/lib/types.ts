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
  workingDir: string;
  vaultPath?: string;
  voiceProvider?: "openai" | "google" | "none";
  claudeModel?: string;
  maxConcurrentSessions?: number;
}

export interface PlanCard {
  id: string;
  name: string;
  description: string;
  status: "planned" | "executing" | "completed";
  agent?: string;
}
