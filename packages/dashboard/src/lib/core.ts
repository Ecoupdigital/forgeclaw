/**
 * Lazy initialization wrapper for @forgeclaw/core data access.
 *
 * The core package depends on bun:sqlite which is unavailable in the Node.js
 * runtime used by Next.js API routes. This module provides direct access to
 * the same SQLite database via better-sqlite3, and reads filesystem resources
 * (harness files, HEARTBEAT.md, config, memory) directly.
 *
 * If any resource is unavailable (no DB, no config file, etc.), functions
 * return null so API routes can fall back to mock data.
 */

import { join } from "node:path";
import { homedir } from "node:os";
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import type {
  SessionInfo,
  TopicInfo,
  Message,
  CronJob,
  CronLog,
  DailyLog,
  HarnessFile,
  ForgeClawConfig,
} from "./types";

// --- Paths ---

const FORGECLAW_DIR = join(homedir(), ".forgeclaw");
const DB_PATH = join(FORGECLAW_DIR, "db", "forgeclaw.db");
const CONFIG_PATH = join(FORGECLAW_DIR, "forgeclaw.config.json");
const HARNESS_DIR = join(FORGECLAW_DIR, "harness");
const HEARTBEAT_PATH = join(FORGECLAW_DIR, "HEARTBEAT.md");
const MEMORY_DIR = join(FORGECLAW_DIR, "memory");
const DAILY_DIR = join(MEMORY_DIR, "DAILY");
const MEMORY_FILE = join(HARNESS_DIR, "MEMORY.md");

// --- SQLite (lazy, singleton) ---

import BetterSqlite3 from "better-sqlite3";

let db: BetterSqlite3.Database | null = null;

function getDb(): BetterSqlite3.Database | null {
  if (db) return db;

  try {
    if (!existsSync(DB_PATH)) return null;

    db = new BetterSqlite3(DB_PATH, { readonly: false });
    db.pragma("journal_mode = WAL");
    return db;
  } catch (err) {
    console.warn("[core-wrapper] Failed to open SQLite DB:", err);
    return null;
  }
}

// --- Row mappers (mirror core/src/state-store.ts) ---

interface SessionRow {
  id: string;
  topic_id: number;
  project_dir: string | null;
  claude_session_id: string | null;
  created_at: number;
  updated_at: number;
  context_usage: number;
}

interface TopicRow {
  id: number;
  thread_id: number | null;
  chat_id: number;
  name: string | null;
  project_dir: string | null;
  session_id: string | null;
  created_at: number;
}

interface MessageRow {
  id: number;
  topic_id: number;
  role: string;
  content: string;
  created_at: number;
}

interface CronJobRow {
  id: number;
  name: string;
  schedule: string;
  prompt: string;
  target_topic_id: number | null;
  enabled: number;
  last_run: number | null;
  last_status: string | null;
}

interface CronLogRow {
  id: number;
  job_id: number;
  started_at: number;
  finished_at: number | null;
  status: string;
  output: string | null;
}

function mapSession(row: SessionRow): SessionInfo {
  return {
    id: row.id,
    topicId: row.topic_id,
    claudeSessionId: row.claude_session_id,
    projectDir: row.project_dir,
    contextUsage: row.context_usage,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTopic(row: TopicRow): TopicInfo {
  return {
    id: row.id,
    threadId: row.thread_id,
    chatId: row.chat_id,
    name: row.name,
    projectDir: row.project_dir,
    sessionId: row.session_id,
    createdAt: row.created_at,
  };
}

function mapMessage(row: MessageRow): Message {
  return {
    id: row.id,
    topicId: row.topic_id,
    role: row.role as "user" | "assistant",
    content: row.content,
    createdAt: row.created_at,
  };
}

function mapCronJob(row: CronJobRow): CronJob {
  return {
    id: row.id,
    name: row.name,
    schedule: row.schedule,
    prompt: row.prompt,
    targetTopicId: row.target_topic_id,
    enabled: row.enabled === 1,
    lastRun: row.last_run,
    lastStatus: row.last_status,
  };
}

function mapCronLog(row: CronLogRow): CronLog {
  return {
    id: row.id,
    jobId: row.job_id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    status: row.status,
    output: row.output,
  };
}

// --- Public API: Sessions & Topics ---

export function listSessions(): SessionInfo[] | null {
  const d = getDb();
  if (!d) return null;
  try {
    const rows = d
      .prepare(
        "SELECT id, topic_id, project_dir, claude_session_id, created_at, updated_at, context_usage FROM sessions ORDER BY updated_at DESC"
      )
      .all() as SessionRow[];
    return rows.map(mapSession);
  } catch {
    return null;
  }
}

export function listTopics(): TopicInfo[] | null {
  const d = getDb();
  if (!d) return null;
  try {
    const rows = d
      .prepare(
        "SELECT id, thread_id, chat_id, name, project_dir, session_id, created_at FROM topics ORDER BY created_at DESC"
      )
      .all() as TopicRow[];
    return rows.map(mapTopic);
  } catch {
    return null;
  }
}

export function getMessages(
  topicId: number,
  limit: number = 50
): Message[] | null {
  const d = getDb();
  if (!d) return null;
  try {
    const rows = d
      .prepare(
        "SELECT id, topic_id, role, content, created_at FROM messages WHERE topic_id = ? ORDER BY created_at DESC LIMIT ?"
      )
      .all(topicId, limit) as MessageRow[];
    return rows.map(mapMessage);
  } catch {
    return null;
  }
}

// --- Public API: Cron Jobs ---

export function listCronJobs(): CronJob[] | null {
  const d = getDb();
  if (!d) return null;
  try {
    const rows = d
      .prepare(
        "SELECT id, name, schedule, prompt, target_topic_id, enabled, last_run, last_status FROM cron_jobs"
      )
      .all() as CronJobRow[];
    return rows.map(mapCronJob);
  } catch {
    return null;
  }
}

export function getCronJob(id: number): CronJob | null {
  const d = getDb();
  if (!d) return null;
  try {
    const row = d
      .prepare(
        "SELECT id, name, schedule, prompt, target_topic_id, enabled, last_run, last_status FROM cron_jobs WHERE id = ?"
      )
      .get(id) as CronJobRow | undefined;
    return row ? mapCronJob(row) : null;
  } catch {
    return null;
  }
}

export function createCronJob(
  job: Omit<CronJob, "id">
): number | null {
  const d = getDb();
  if (!d) return null;
  try {
    const result = d
      .prepare(
        "INSERT INTO cron_jobs (name, schedule, prompt, target_topic_id, enabled, last_run, last_status) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        job.name,
        job.schedule,
        job.prompt,
        job.targetTopicId,
        job.enabled ? 1 : 0,
        job.lastRun,
        job.lastStatus
      );
    return Number(result.lastInsertRowid);
  } catch {
    return null;
  }
}

export function updateCronJob(
  id: number,
  updates: Partial<Omit<CronJob, "id">>
): boolean {
  const d = getDb();
  if (!d) return false;
  try {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.name !== undefined) {
      fields.push("name = ?");
      values.push(updates.name);
    }
    if (updates.schedule !== undefined) {
      fields.push("schedule = ?");
      values.push(updates.schedule);
    }
    if (updates.prompt !== undefined) {
      fields.push("prompt = ?");
      values.push(updates.prompt);
    }
    if (updates.targetTopicId !== undefined) {
      fields.push("target_topic_id = ?");
      values.push(updates.targetTopicId);
    }
    if (updates.enabled !== undefined) {
      fields.push("enabled = ?");
      values.push(updates.enabled ? 1 : 0);
    }
    if (updates.lastRun !== undefined) {
      fields.push("last_run = ?");
      values.push(updates.lastRun);
    }
    if (updates.lastStatus !== undefined) {
      fields.push("last_status = ?");
      values.push(updates.lastStatus);
    }

    if (fields.length === 0) return true;
    values.push(id);
    d.prepare(`UPDATE cron_jobs SET ${fields.join(", ")} WHERE id = ?`).run(
      ...values
    );
    return true;
  } catch {
    return false;
  }
}

export function getCronLogs(
  jobId: number,
  limit: number = 20
): CronLog[] | null {
  const d = getDb();
  if (!d) return null;
  try {
    const rows = d
      .prepare(
        "SELECT id, job_id, started_at, finished_at, status, output FROM cron_logs WHERE job_id = ? ORDER BY started_at DESC LIMIT ?"
      )
      .all(jobId, limit) as CronLogRow[];
    return rows.map(mapCronLog);
  } catch {
    return null;
  }
}

// --- Public API: Memory ---

export async function getMemoryContent(): Promise<string | null> {
  try {
    if (!existsSync(MEMORY_FILE)) return null;
    return await readFile(MEMORY_FILE, "utf-8");
  } catch {
    return null;
  }
}

export async function writeMemoryContent(content: string): Promise<boolean> {
  try {
    await mkdir(HARNESS_DIR, { recursive: true });
    await writeFile(MEMORY_FILE, content, "utf-8");
    return true;
  } catch {
    return false;
  }
}

export async function listDailyLogs(): Promise<DailyLog[] | null> {
  try {
    if (!existsSync(DAILY_DIR)) return null;
    const files = await readdir(DAILY_DIR);
    const logs: DailyLog[] = [];

    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const date = file.replace(".md", "");
      const fullPath = join(DAILY_DIR, file);

      try {
        const content = await readFile(fullPath, "utf-8");
        const entries = content
          .split("\n")
          .filter((l) => l.trim().startsWith("-")).length;
        logs.push({ date, path: fullPath, entries });
      } catch {
        logs.push({ date, path: fullPath, entries: 0 });
      }
    }

    return logs.sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return null;
  }
}

// --- Public API: Config ---

export async function getConfig(): Promise<ForgeClawConfig | null> {
  try {
    if (!existsSync(CONFIG_PATH)) return null;
    const raw = await readFile(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as ForgeClawConfig;
    // Mask botToken for dashboard display
    if (parsed.botToken) {
      parsed.botToken = parsed.botToken.slice(0, 6) + "***hidden***";
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function writeConfig(
  config: Record<string, unknown>
): Promise<boolean> {
  try {
    await mkdir(FORGECLAW_DIR, { recursive: true });
    // Read existing config to preserve botToken if masked
    let existing: Record<string, unknown> = {};
    try {
      const raw = await readFile(CONFIG_PATH, "utf-8");
      existing = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      // No existing config
    }

    // If the incoming botToken looks masked, preserve original
    const incoming = config as Record<string, unknown>;
    if (
      typeof incoming.botToken === "string" &&
      incoming.botToken.includes("***hidden***")
    ) {
      incoming.botToken = existing.botToken;
    }

    await writeFile(CONFIG_PATH, JSON.stringify(incoming, null, 2), "utf-8");
    return true;
  } catch {
    return false;
  }
}

// --- Public API: Harness files ---

const HARNESS_FILE_NAMES = [
  "SOUL.md",
  "USER.md",
  "AGENTS.md",
  "TOOLS.md",
  "MEMORY.md",
  "STYLE.md",
];

export async function listHarnessFiles(): Promise<HarnessFile[] | null> {
  try {
    if (!existsSync(HARNESS_DIR)) return null;

    const files: HarnessFile[] = [];

    // Read known files and any additional .md files
    const dirFiles = await readdir(HARNESS_DIR);
    const mdFiles = dirFiles.filter((f) => f.endsWith(".md"));
    const allNames = [
      ...new Set([...HARNESS_FILE_NAMES, ...mdFiles]),
    ];

    for (const name of allNames) {
      const filePath = join(HARNESS_DIR, name);
      try {
        const content = await readFile(filePath, "utf-8");
        files.push({ name, path: filePath, content });
      } catch {
        // File doesn't exist, skip
      }
    }

    return files.length > 0 ? files : null;
  } catch {
    return null;
  }
}

export async function writeHarnessFile(
  name: string,
  content: string
): Promise<boolean> {
  try {
    await mkdir(HARNESS_DIR, { recursive: true });
    const filePath = join(HARNESS_DIR, name);
    await writeFile(filePath, content, "utf-8");
    return true;
  } catch {
    return false;
  }
}

// --- Public API: Heartbeat ---

export async function getHeartbeat(): Promise<string | null> {
  try {
    if (!existsSync(HEARTBEAT_PATH)) return null;
    return await readFile(HEARTBEAT_PATH, "utf-8");
  } catch {
    return null;
  }
}

export async function writeHeartbeat(content: string): Promise<boolean> {
  try {
    await mkdir(FORGECLAW_DIR, { recursive: true });
    await writeFile(HEARTBEAT_PATH, content, "utf-8");
    return true;
  } catch {
    return false;
  }
}

// --- Utility: check if core data is available ---

export function isCoreAvailable(): boolean {
  return existsSync(DB_PATH);
}

export function isConfigAvailable(): boolean {
  return existsSync(CONFIG_PATH);
}
