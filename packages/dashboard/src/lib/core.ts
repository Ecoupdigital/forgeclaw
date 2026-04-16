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

import { join, resolve } from "node:path";
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
// Daily log dir: resolved at call time, not module load time (config may not be loaded yet).
async function resolveDailyDir(): Promise<string> {
  if (process.env.FORGECLAW_DAILY_LOG_DIR) return process.env.FORGECLAW_DAILY_LOG_DIR;
  try {
    const config = await getConfig();
    if (config && typeof config.vaultPath === "string") {
      return join(config.vaultPath, "05-pessoal", "daily-log");
    }
  } catch {
    // fall through
  }
  return join(homedir(), ".forgeclaw", "memory", "daily");
}
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
  runtime: string | null;
  runtime_fallback: number;
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
  origin: string;
  source_file: string | null;
  runtime: string | null;
  model: string | null;
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
    runtime: (row.runtime as "claude-code" | "codex" | null) ?? null,
    runtimeFallback: row.runtime_fallback === 1,
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
    origin: row.origin === "db" ? "db" : "file",
    sourceFile: row.source_file,
    runtime: (row.runtime as "claude-code" | "codex" | null) ?? null,
    model: row.model,
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
        "SELECT id, thread_id, chat_id, name, project_dir, session_id, created_at, runtime, runtime_fallback FROM topics ORDER BY created_at DESC"
      )
      .all() as TopicRow[];
    return rows.map(mapTopic);
  } catch {
    return null;
  }
}

export function getTopic(id: number): TopicInfo | null {
  const d = getDb();
  if (!d) return null;
  try {
    const row = d
      .prepare(
        "SELECT id, thread_id, chat_id, name, project_dir, session_id, created_at, runtime, runtime_fallback FROM topics WHERE id = ?"
      )
      .get(id) as TopicRow | undefined;
    return row ? mapTopic(row) : null;
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
        "SELECT id, name, schedule, prompt, target_topic_id, enabled, last_run, last_status, origin, source_file, runtime, model FROM cron_jobs ORDER BY id DESC"
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
        "SELECT id, name, schedule, prompt, target_topic_id, enabled, last_run, last_status, origin, source_file, runtime, model FROM cron_jobs WHERE id = ?"
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
        "INSERT INTO cron_jobs (name, schedule, prompt, target_topic_id, enabled, last_run, last_status, origin, source_file, runtime, model) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        job.name,
        job.schedule,
        job.prompt,
        job.targetTopicId,
        job.enabled ? 1 : 0,
        job.lastRun,
        job.lastStatus,
        job.origin ?? "db",
        job.sourceFile ?? null,
        job.runtime ?? null,
        job.model ?? null
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
    if (updates.origin !== undefined) {
      fields.push("origin = ?");
      values.push(updates.origin);
    }
    if (updates.sourceFile !== undefined) {
      fields.push("source_file = ?");
      values.push(updates.sourceFile);
    }
    if (updates.runtime !== undefined) {
      fields.push("runtime = ?");
      values.push(updates.runtime);
    }
    if (updates.model !== undefined) {
      fields.push("model = ?");
      values.push(updates.model);
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

export function deleteCronJob(id: number): boolean {
  const d = getDb();
  if (!d) return false;
  try {
    d.prepare("DELETE FROM cron_jobs WHERE id = ?").run(id);
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

// --- Memory v1.5 helpers ---

export interface MemoryEntryDTO {
  id: number;
  userId: string;
  workspaceId: string;
  kind: string;
  content: string;
  contentHash: string;
  sourceType: string | null;
  createdAt: number;
  updatedAt: number;
  accessCount: number;
  pinned: boolean;
  archivedAt: number | null;
  reviewed: boolean;
  confidence: number | null;
}

export interface RetrievalDTO {
  id: number;
  query: string;
  source: string;
  hits: Array<{ memoryId: number; score: number; reason: string; contentPreview?: string }>;
  injected: boolean;
  at: number;
}

interface MemoryRow {
  id: number;
  user_id: string;
  workspace_id: string;
  kind: string;
  content: string;
  content_hash: string;
  source_type: string | null;
  source_session_id: string | null;
  created_at: number;
  updated_at: number;
  last_accessed_at: number | null;
  access_count: number;
  pinned: number;
  archived_at: number | null;
  metadata: string | null;
  reviewed: number;
  confidence: number | null;
}

function mapMemRow(r: MemoryRow): MemoryEntryDTO {
  return {
    id: r.id,
    userId: r.user_id,
    workspaceId: r.workspace_id,
    kind: r.kind,
    content: r.content,
    contentHash: r.content_hash,
    sourceType: r.source_type,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    accessCount: r.access_count,
    pinned: r.pinned === 1,
    archivedAt: r.archived_at,
    reviewed: r.reviewed === 1,
    confidence: r.confidence,
  };
}

export function listMemoryEntriesV2(
  opts: {
    kind?: string;
    reviewStatus?: "approved" | "pending" | "all";
    includeArchived?: boolean;
    limit?: number;
    offset?: number;
  } = {},
): MemoryEntryDTO[] | null {
  const d = getDb();
  if (!d) return null;
  try {
    const parts: string[] = ["user_id = 'default'", "workspace_id = 'default'"];
    const values: (string | number)[] = [];
    if (opts.kind) {
      parts.push("kind = ?");
      values.push(opts.kind);
    }
    if (!opts.includeArchived) {
      parts.push("archived_at IS NULL");
    }
    const reviewStatus = opts.reviewStatus ?? "approved";
    if (reviewStatus === "approved") parts.push("reviewed = 1");
    else if (reviewStatus === "pending") parts.push("reviewed = 0");

    const limit = opts.limit ?? 200;
    const offset = opts.offset ?? 0;
    values.push(limit);
    values.push(offset);

    const rows = d
      .prepare(
        `SELECT id, user_id, workspace_id, kind, content, content_hash, source_type, source_session_id,
                created_at, updated_at, last_accessed_at, access_count, pinned, archived_at, metadata, reviewed, confidence
         FROM memory_entries
         WHERE ${parts.join(" AND ")}
         ORDER BY pinned DESC, reviewed DESC, updated_at DESC LIMIT ? OFFSET ?`,
      )
      .all(...values) as MemoryRow[];
    return rows.map(mapMemRow);
  } catch {
    return null;
  }
}

function sanitizeFtsQuery(query: string): string {
  if (!query) return "";
  const tokens = query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);
  if (tokens.length === 0) return "";
  return tokens.map((t) => `"${t}"`).join(" OR ");
}

/**
 * FTS5 full-text search across memory entries.
 * Mirrors stateStore.searchMemoryEntries() but uses better-sqlite3.
 */
export function searchMemoryEntriesV2(
  query: string,
  opts: {
    reviewStatus?: "approved" | "pending" | "all";
    includeArchived?: boolean;
    limit?: number;
    offset?: number;
  } = {},
): MemoryEntryDTO[] | null {
  const d = getDb();
  if (!d) return null;

  const safeQuery = sanitizeFtsQuery(query);
  if (!safeQuery) return null;

  try {
    const parts: string[] = [
      "m.user_id = 'default'",
      "m.workspace_id = 'default'",
    ];
    const reviewStatus = opts.reviewStatus ?? "approved";
    if (reviewStatus === "approved") parts.push("m.reviewed = 1");
    else if (reviewStatus === "pending") parts.push("m.reviewed = 0");
    if (!opts.includeArchived) parts.push("m.archived_at IS NULL");

    const limit = opts.limit ?? 50;
    const offset = opts.offset ?? 0;

    const rows = d
      .prepare(
        `SELECT m.id, m.user_id, m.workspace_id, m.kind, m.content, m.content_hash,
                m.source_type, m.source_session_id, m.created_at, m.updated_at,
                m.last_accessed_at, m.access_count, m.pinned, m.archived_at,
                m.metadata, m.reviewed, m.confidence
         FROM memory_fts
         JOIN memory_entries m ON m.id = memory_fts.rowid
         WHERE memory_fts MATCH ?
           AND ${parts.join(" AND ")}
         ORDER BY bm25(memory_fts) LIMIT ? OFFSET ?`,
      )
      .all(safeQuery, limit, offset) as MemoryRow[];
    return rows.map(mapMemRow);
  } catch (err) {
    console.warn("[core-wrapper] FTS5 memory search failed:", err);
    return null;
  }
}

// --- Mutations ---

import { createHash } from "node:crypto";

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function auditLog(
  d: BetterSqlite3.Database,
  memoryId: number,
  action: string,
  oldContent: string | null,
  newContent: string | null,
  actor: string,
  reason: string | null,
) {
  d.prepare(
    `INSERT INTO memory_audit (memory_id, action, old_content, new_content, actor, reason, at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(memoryId, action, oldContent, newContent, actor, reason, Date.now());
}

export function createMemoryEntryV2(input: {
  kind: string;
  content: string;
  pinned?: boolean;
  reviewed?: boolean;
}): { id: number; error?: string } | null {
  const d = getDb();
  if (!d) return null;
  try {
    const now = Date.now();
    const hash = sha256(input.content);

    // Dedup check
    const existing = d
      .prepare(
        "SELECT id FROM memory_entries WHERE user_id = 'default' AND workspace_id = 'default' AND content_hash = ? AND archived_at IS NULL",
      )
      .get(hash) as { id: number } | undefined;
    if (existing) {
      return { id: existing.id, error: "duplicate (content already exists)" };
    }

    const result = d
      .prepare(
        `INSERT INTO memory_entries
         (user_id, workspace_id, kind, content, content_hash, source_type, source_session_id,
          created_at, updated_at, access_count, pinned, metadata, reviewed, confidence)
         VALUES ('default', 'default', ?, ?, ?, 'manual', NULL, ?, ?, 0, ?, NULL, ?, NULL)`,
      )
      .run(
        input.kind,
        input.content,
        hash,
        now,
        now,
        input.pinned ? 1 : 0,
        input.reviewed === false ? 0 : 1,
      );
    const id = Number(result.lastInsertRowid);
    auditLog(d, id, "create", null, input.content, "user", "dashboard manual create");
    return { id };
  } catch (err) {
    return { id: -1, error: err instanceof Error ? err.message : "create failed" };
  }
}

export function updateMemoryEntryV2(
  id: number,
  updates: { content?: string; kind?: string; pinned?: boolean; reviewed?: boolean },
): boolean {
  const d = getDb();
  if (!d) return false;
  try {
    const existing = d
      .prepare("SELECT content FROM memory_entries WHERE id = ?")
      .get(id) as { content: string } | undefined;
    if (!existing) return false;

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.content !== undefined) {
      fields.push("content = ?", "content_hash = ?");
      values.push(updates.content, sha256(updates.content));
    }
    if (updates.kind !== undefined) {
      fields.push("kind = ?");
      values.push(updates.kind);
    }
    if (updates.pinned !== undefined) {
      fields.push("pinned = ?");
      values.push(updates.pinned ? 1 : 0);
    }
    if (updates.reviewed !== undefined) {
      fields.push("reviewed = ?");
      values.push(updates.reviewed ? 1 : 0);
    }

    if (fields.length === 0) return true;

    fields.push("updated_at = ?");
    values.push(Date.now());
    values.push(id);

    d.prepare(
      `UPDATE memory_entries SET ${fields.join(", ")} WHERE id = ?`,
    ).run(...values);

    const action =
      updates.reviewed === true ? "approve"
      : updates.reviewed === false ? "unapprove"
      : updates.pinned === true ? "pin"
      : updates.pinned === false ? "unpin"
      : "update";

    auditLog(
      d,
      id,
      action,
      existing.content,
      updates.content ?? null,
      "user",
      "dashboard edit",
    );
    return true;
  } catch {
    return false;
  }
}

export function archiveMemoryEntryV2(id: number): boolean {
  const d = getDb();
  if (!d) return false;
  try {
    const existing = d
      .prepare("SELECT content FROM memory_entries WHERE id = ?")
      .get(id) as { content: string } | undefined;
    if (!existing) return false;
    d.prepare("UPDATE memory_entries SET archived_at = ? WHERE id = ?").run(
      Date.now(),
      id,
    );
    auditLog(d, id, "archive", existing.content, null, "user", "dashboard archive");
    return true;
  } catch {
    return false;
  }
}

export function restoreMemoryEntryV2(id: number): boolean {
  const d = getDb();
  if (!d) return false;
  try {
    d.prepare("UPDATE memory_entries SET archived_at = NULL WHERE id = ?").run(id);
    auditLog(d, id, "restore", null, null, "user", "dashboard restore");
    return true;
  } catch {
    return false;
  }
}

export function listRetrievalsV2(limit: number = 50): RetrievalDTO[] | null {
  const d = getDb();
  if (!d) return null;
  try {
    const rows = d
      .prepare(
        `SELECT id, query, source, hits_json, injected, at
         FROM memory_retrievals
         ORDER BY at DESC LIMIT ?`,
      )
      .all(limit) as Array<{
      id: number;
      query: string;
      source: string;
      hits_json: string;
      injected: number;
      at: number;
    }>;
    return rows.map((r) => ({
      id: r.id,
      query: r.query,
      source: r.source,
      hits: JSON.parse(r.hits_json) as RetrievalDTO['hits'],
      injected: r.injected === 1,
      at: r.at,
    }));
  } catch {
    return null;
  }
}

export function listMemoryAuditV2(memoryId?: number, limit: number = 50): Array<{
  id: number;
  memoryId: number;
  action: string;
  oldContent: string | null;
  newContent: string | null;
  actor: string;
  reason: string | null;
  at: number;
}> | null {
  const d = getDb();
  if (!d) return null;
  try {
    const rows = memoryId
      ? (d
          .prepare(
            `SELECT id, memory_id, action, old_content, new_content, actor, reason, at
             FROM memory_audit WHERE memory_id = ? ORDER BY at DESC LIMIT ?`,
          )
          .all(memoryId, limit) as Array<{
          id: number;
          memory_id: number;
          action: string;
          old_content: string | null;
          new_content: string | null;
          actor: string;
          reason: string | null;
          at: number;
        }>)
      : (d
          .prepare(
            `SELECT id, memory_id, action, old_content, new_content, actor, reason, at
             FROM memory_audit ORDER BY at DESC LIMIT ?`,
          )
          .all(limit) as Array<{
          id: number;
          memory_id: number;
          action: string;
          old_content: string | null;
          new_content: string | null;
          actor: string;
          reason: string | null;
          at: number;
        }>);
    return rows.map((r) => ({
      id: r.id,
      memoryId: r.memory_id,
      action: r.action,
      oldContent: r.old_content,
      newContent: r.new_content,
      actor: r.actor,
      reason: r.reason,
      at: r.at,
    }));
  } catch {
    return null;
  }
}

export async function readDailyLog(date: string): Promise<string | null> {
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const dailyDir = await resolveDailyDir();
    const filePath = join(dailyDir, `${date}.md`);
    if (!existsSync(filePath)) return null;
    return await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

export async function listDailyLogs(): Promise<DailyLog[] | null> {
  try {
    const dailyDir = await resolveDailyDir();
    if (!existsSync(dailyDir)) return null;
    const files = await readdir(dailyDir);
    const logs: DailyLog[] = [];

    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const date = file.replace(".md", "");
      const fullPath = join(dailyDir, file);

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
    // Mask dashboardToken for dashboard display
    if (parsed.dashboardToken) {
      parsed.dashboardToken = parsed.dashboardToken.slice(0, 8) + "***hidden***";
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Read the dashboard token from config WITHOUT masking.
 * Used server-side only (proxy, API auth) to validate incoming tokens.
 * Returns null if config doesn't exist or has no dashboardToken.
 */
export async function getDashboardToken(): Promise<string | null> {
  try {
    if (!existsSync(CONFIG_PATH)) return null;
    const raw = await readFile(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed.dashboardToken === "string" && parsed.dashboardToken.length > 0) {
      return parsed.dashboardToken;
    }
    return null;
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

    // Strip ANY field that contains the mask pattern — prevents masked
    // tokens (botToken, dashboardToken, or future secrets) from being
    // persisted back to disk.
    const MASK = "***hidden***";
    const incoming = { ...config };
    for (const key of Object.keys(incoming)) {
      if (typeof incoming[key] === "string" && (incoming[key] as string).includes(MASK)) {
        // Preserve original value from disk, or delete entirely if no original exists
        if (key in existing) {
          incoming[key] = existing[key];
        } else {
          delete incoming[key];
        }
      }
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
    // Guard against path traversal (e.g. "../../etc/passwd")
    if (name.includes("/") || name.includes("\\")) {
      throw new Error(`Invalid harness file name: ${name}`);
    }
    const resolved = resolve(HARNESS_DIR, name);
    if (!resolved.startsWith(HARNESS_DIR)) {
      throw new Error(`Invalid harness file name: ${name}`);
    }

    await mkdir(HARNESS_DIR, { recursive: true });
    await writeFile(resolved, content, "utf-8");
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

// --- Public API: Message Search (FTS5) ---

export interface MessageSearchResult {
  messageId: number;
  topicId: number;
  topicName: string | null;
  role: string;
  content: string;
  createdAt: number;
  rank: number;
}

/**
 * FTS5 full-text search across message history.
 * Mirrors stateStore.searchMessages() but uses better-sqlite3 and
 * enriches results with topic name.
 */
export function searchMessages(
  query: string,
  limit: number = 50,
): MessageSearchResult[] | null {
  const d = getDb();
  if (!d) return null;

  const safeQuery = sanitizeFtsQuery(query);
  if (!safeQuery) return null;

  try {
    const rows = d
      .prepare(
        `SELECT m.id AS message_id, m.topic_id, m.role, m.content, m.created_at,
                bm25(messages_fts) AS rank,
                t.name AS topic_name
         FROM messages_fts
         JOIN messages m ON m.id = messages_fts.rowid
         LEFT JOIN topics t ON t.id = m.topic_id
         WHERE messages_fts MATCH ?
         ORDER BY rank LIMIT ?`,
      )
      .all(safeQuery, limit) as Array<{
      message_id: number;
      topic_id: number;
      role: string;
      content: string;
      created_at: number;
      rank: number;
      topic_name: string | null;
    }>;
    return rows.map((r) => ({
      messageId: r.message_id,
      topicId: r.topic_id,
      topicName: r.topic_name,
      role: r.role,
      content: r.content,
      createdAt: r.created_at,
      rank: r.rank,
    }));
  } catch (err) {
    console.warn("[core-wrapper] FTS5 message search failed:", err);
    return null;
  }
}

// --- Utility: check if core data is available ---

export function isCoreAvailable(): boolean {
  return existsSync(DB_PATH);
}

export function isConfigAvailable(): boolean {
  return existsSync(CONFIG_PATH);
}
