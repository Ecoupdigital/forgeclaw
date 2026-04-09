import { Database } from 'bun:sqlite';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { SessionInfo, Message, TopicInfo, CronJob, CronLog } from './types';

const DB_DIR = join(homedir(), '.forgeclaw', 'db');
const DB_PATH = join(DB_DIR, 'forgeclaw.db');

class StateStore {
  private db: Database;

  constructor(dbPath: string = DB_PATH) {
    if (!existsSync(join(dbPath, '..'))) {
      mkdirSync(join(dbPath, '..'), { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec('PRAGMA foreign_keys = ON');
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        topic_id INTEGER NOT NULL,
        project_dir TEXT,
        claude_session_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        context_usage REAL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topic_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS topics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        thread_id INTEGER,
        chat_id INTEGER,
        name TEXT,
        project_dir TEXT,
        session_id TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cron_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        schedule TEXT NOT NULL,
        prompt TEXT NOT NULL,
        target_topic_id INTEGER,
        enabled INTEGER DEFAULT 1,
        last_run INTEGER,
        last_status TEXT
      );

      CREATE TABLE IF NOT EXISTS cron_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER NOT NULL,
        started_at INTEGER NOT NULL,
        finished_at INTEGER,
        status TEXT NOT NULL,
        output TEXT
      );
    `);
  }

  // Sessions
  createSession(session: SessionInfo): void {
    this.db.run(
      `INSERT INTO sessions (id, topic_id, project_dir, claude_session_id, created_at, updated_at, context_usage)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [session.id, session.topicId ?? 0, session.projectDir, session.claudeSessionId, session.createdAt, session.updatedAt, session.contextUsage]
    );
  }

  getSession(id: string): SessionInfo | null {
    const row = this.db.query(
      'SELECT id, topic_id, project_dir, claude_session_id, created_at, updated_at, context_usage FROM sessions WHERE id = ?'
    ).get(id) as SessionRow | null;
    return row ? mapSessionRow(row) : null;
  }

  updateSession(id: string, updates: Partial<Pick<SessionInfo, 'claudeSessionId' | 'contextUsage' | 'projectDir'>>): void {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.claudeSessionId !== undefined) {
      fields.push('claude_session_id = ?');
      values.push(updates.claudeSessionId);
    }
    if (updates.contextUsage !== undefined) {
      fields.push('context_usage = ?');
      values.push(updates.contextUsage);
    }
    if (updates.projectDir !== undefined) {
      fields.push('project_dir = ?');
      values.push(updates.projectDir);
    }

    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    this.db.run(`UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  listSessions(): SessionInfo[] {
    const rows = this.db.query(
      'SELECT id, topic_id, project_dir, claude_session_id, created_at, updated_at, context_usage FROM sessions ORDER BY updated_at DESC'
    ).all() as SessionRow[];
    return rows.map(mapSessionRow);
  }

  deleteSession(id: string): void {
    this.db.run('DELETE FROM sessions WHERE id = ?', [id]);
  }

  // Messages
  createMessage(msg: Omit<Message, 'id'>): number {
    const result = this.db.run(
      'INSERT INTO messages (topic_id, role, content, created_at) VALUES (?, ?, ?, ?)',
      [msg.topicId, msg.role, msg.content, msg.createdAt]
    );
    return Number(result.lastInsertRowid);
  }

  getMessages(topicId: number, limit: number = 50): Message[] {
    return this.db.query(
      'SELECT id, topic_id, role, content, created_at FROM messages WHERE topic_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(topicId, limit) as MessageRow[] as unknown as Message[];
  }

  // Topics
  createTopic(topic: Omit<TopicInfo, 'id'>): number {
    const result = this.db.run(
      'INSERT INTO topics (thread_id, chat_id, name, project_dir, session_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [topic.threadId, topic.chatId, topic.name, topic.projectDir, topic.sessionId, topic.createdAt]
    );
    return Number(result.lastInsertRowid);
  }

  getTopic(id: number): TopicInfo | null {
    const row = this.db.query(
      'SELECT id, thread_id, chat_id, name, project_dir, session_id, created_at FROM topics WHERE id = ?'
    ).get(id) as TopicRow | null;
    return row ? mapTopicRow(row) : null;
  }

  getTopicByChatAndThread(chatId: number, threadId: number | null): TopicInfo | null {
    const row = threadId
      ? this.db.query('SELECT id, thread_id, chat_id, name, project_dir, session_id, created_at FROM topics WHERE chat_id = ? AND thread_id = ?').get(chatId, threadId) as TopicRow | null
      : this.db.query('SELECT id, thread_id, chat_id, name, project_dir, session_id, created_at FROM topics WHERE chat_id = ? AND thread_id IS NULL').get(chatId) as TopicRow | null;
    return row ? mapTopicRow(row) : null;
  }

  listTopics(): TopicInfo[] {
    const rows = this.db.query(
      'SELECT id, thread_id, chat_id, name, project_dir, session_id, created_at FROM topics ORDER BY created_at DESC'
    ).all() as TopicRow[];
    return rows.map(mapTopicRow);
  }

  // Cron Jobs
  createCronJob(job: Omit<CronJob, 'id'>): number {
    const result = this.db.run(
      'INSERT INTO cron_jobs (name, schedule, prompt, target_topic_id, enabled, last_run, last_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [job.name, job.schedule, job.prompt, job.targetTopicId, job.enabled ? 1 : 0, job.lastRun, job.lastStatus]
    );
    return Number(result.lastInsertRowid);
  }

  getCronJob(id: number): CronJob | null {
    const row = this.db.query(
      'SELECT id, name, schedule, prompt, target_topic_id, enabled, last_run, last_status FROM cron_jobs WHERE id = ?'
    ).get(id) as CronJobRow | null;
    return row ? mapCronJobRow(row) : null;
  }

  listCronJobs(enabledOnly: boolean = false): CronJob[] {
    const query = enabledOnly
      ? 'SELECT id, name, schedule, prompt, target_topic_id, enabled, last_run, last_status FROM cron_jobs WHERE enabled = 1'
      : 'SELECT id, name, schedule, prompt, target_topic_id, enabled, last_run, last_status FROM cron_jobs';
    return (this.db.query(query).all() as CronJobRow[]).map(mapCronJobRow);
  }

  updateCronJob(id: number, updates: Partial<Omit<CronJob, 'id'>>): void {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.schedule !== undefined) { fields.push('schedule = ?'); values.push(updates.schedule); }
    if (updates.prompt !== undefined) { fields.push('prompt = ?'); values.push(updates.prompt); }
    if (updates.targetTopicId !== undefined) { fields.push('target_topic_id = ?'); values.push(updates.targetTopicId); }
    if (updates.enabled !== undefined) { fields.push('enabled = ?'); values.push(updates.enabled ? 1 : 0); }
    if (updates.lastRun !== undefined) { fields.push('last_run = ?'); values.push(updates.lastRun); }
    if (updates.lastStatus !== undefined) { fields.push('last_status = ?'); values.push(updates.lastStatus); }

    if (fields.length === 0) return;
    values.push(id);
    this.db.run(`UPDATE cron_jobs SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  deleteCronJob(id: number): void {
    this.db.run('DELETE FROM cron_jobs WHERE id = ?', [id]);
  }

  // Cron Logs
  createCronLog(log: Omit<CronLog, 'id'>): number {
    const result = this.db.run(
      'INSERT INTO cron_logs (job_id, started_at, finished_at, status, output) VALUES (?, ?, ?, ?, ?)',
      [log.jobId, log.startedAt, log.finishedAt, log.status, log.output]
    );
    return Number(result.lastInsertRowid);
  }

  getCronLogs(jobId: number, limit: number = 20): CronLog[] {
    return this.db.query(
      'SELECT id, job_id, started_at, finished_at, status, output FROM cron_logs WHERE job_id = ? ORDER BY started_at DESC LIMIT ?'
    ).all(jobId, limit) as CronLogRow[] as unknown as CronLog[];
  }

  close(): void {
    this.db.close();
  }
}

// Row types from SQLite
interface SessionRow {
  id: string;
  topic_id: number;
  project_dir: string | null;
  claude_session_id: string | null;
  created_at: number;
  updated_at: number;
  context_usage: number;
}

interface MessageRow {
  id: number;
  topic_id: number;
  role: string;
  content: string;
  created_at: number;
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

function mapSessionRow(row: SessionRow): SessionInfo {
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

function mapTopicRow(row: TopicRow): TopicInfo {
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

function mapCronJobRow(row: CronJobRow): CronJob {
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

export const stateStore = new StateStore();
export { StateStore };
