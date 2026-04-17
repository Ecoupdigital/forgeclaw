import { Database } from 'bun:sqlite';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type {
  SessionInfo,
  Message,
  TopicInfo,
  CronJob,
  CronLog,
  MemoryEntry,
  MemoryEntryKind,
  MemoryAuditAction,
  MemorySearchHit,
} from './types';

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
        last_status TEXT,
        origin TEXT NOT NULL DEFAULT 'file',
        source_file TEXT
      );

      CREATE TABLE IF NOT EXISTS cron_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER NOT NULL,
        started_at INTEGER NOT NULL,
        finished_at INTEGER,
        status TEXT NOT NULL,
        output TEXT
      );

      -- Memory entries: canonical storage for the behaviour/user/fact/decision
      -- memory. Markdown mirrors (harness/MEMORY.md) are regenerated from this
      -- table, not the other way around. user_id + workspace_id are set from
      -- day one so multi-tenant mode is a WHERE clause, not a rewrite.
      CREATE TABLE IF NOT EXISTS memory_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL DEFAULT 'default',
        workspace_id TEXT NOT NULL DEFAULT 'default',
        kind TEXT NOT NULL,                      -- 'behavior'|'user_profile'|'fact'|'decision'|'preference'
        content TEXT NOT NULL,
        content_hash TEXT NOT NULL,              -- sha256 for dedup
        source_type TEXT,                        -- 'session'|'manual'|'janitor'|'writer'|'import'
        source_session_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_accessed_at INTEGER,
        access_count INTEGER NOT NULL DEFAULT 0,
        pinned INTEGER NOT NULL DEFAULT 0,
        archived_at INTEGER,
        metadata TEXT                            -- JSON blob
      );
      CREATE INDEX IF NOT EXISTS idx_mem_user_kind ON memory_entries(user_id, workspace_id, kind, archived_at);
      CREATE INDEX IF NOT EXISTS idx_mem_hash ON memory_entries(user_id, workspace_id, content_hash);

      -- Entity junction table: resolves "give me all memories tagged X" in
      -- O(log n) without embedding or graph DB. Populated by the writer
      -- extraction pipeline and by manual tool calls.
      CREATE TABLE IF NOT EXISTS memory_refs (
        memory_id INTEGER NOT NULL,
        entity_type TEXT NOT NULL,               -- 'project'|'client'|'person'|'tech'|'file'|'topic'
        entity_name TEXT NOT NULL,
        PRIMARY KEY (memory_id, entity_type, entity_name),
        FOREIGN KEY (memory_id) REFERENCES memory_entries(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_refs_entity ON memory_refs(entity_type, entity_name);

      -- Audit trail: every mutation gets a row. Enables undo, "what was this
      -- 3 days ago", and trust for commercial users. Cheap — append only.
      CREATE TABLE IF NOT EXISTS memory_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_id INTEGER NOT NULL,
        action TEXT NOT NULL,                    -- 'create'|'update'|'delete'|'archive'|'restore'|'pin'|'unpin'
        old_content TEXT,
        new_content TEXT,
        actor TEXT NOT NULL,                     -- 'user'|'janitor'|'writer'|'import'|'security-scanner'
        reason TEXT,
        at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_audit_memory ON memory_audit(memory_id, at DESC);

      -- Retrieval log: what was recalled, with what score, for which query.
      -- Powers the observability dashboard ("why did the agent remember X?").
      CREATE TABLE IF NOT EXISTS memory_retrievals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL DEFAULT 'default',
        workspace_id TEXT NOT NULL DEFAULT 'default',
        query TEXT NOT NULL,
        source TEXT NOT NULL,                    -- 'prefetch'|'tool_search'|'context_builder'
        hits_json TEXT NOT NULL,                 -- JSON array of {memory_id, score, reason}
        injected INTEGER NOT NULL DEFAULT 0,     -- 0 = retrieved but not injected
        at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_retr_at ON memory_retrievals(at DESC);
    `);

    // Migration: add origin and source_file columns to cron_jobs if they don't exist.
    // Idempotent — safe to run on existing DBs that predate these columns.
    try {
      const cols = (this.db.query("PRAGMA table_info(cron_jobs)").all() as Array<{ name: string }>).map(
        (c) => c.name
      );
      if (!cols.includes('origin')) {
        this.db.exec("ALTER TABLE cron_jobs ADD COLUMN origin TEXT NOT NULL DEFAULT 'file'");
      }
      if (!cols.includes('source_file')) {
        this.db.exec('ALTER TABLE cron_jobs ADD COLUMN source_file TEXT');
      }
      // Runtime override (multi-CLI-agent support). NULL = use default.
      if (!cols.includes('runtime')) {
        this.db.exec('ALTER TABLE cron_jobs ADD COLUMN runtime TEXT');
      }
      if (!cols.includes('model')) {
        this.db.exec('ALTER TABLE cron_jobs ADD COLUMN model TEXT');
      }
    } catch (err) {
      console.warn('[state-store] Failed to run cron_jobs migration:', err);
    }

    // Migration: add reviewed + confidence columns to memory_entries.
    // reviewed=1 means "active and visible to the agent". reviewed=0 means
    // "pending review — janitor proposed but user hasn't approved".
    // Existing rows default to reviewed=1 (backward compatible).
    try {
      const memCols = (this.db.query("PRAGMA table_info(memory_entries)").all() as Array<{ name: string }>).map((c) => c.name);
      if (!memCols.includes('reviewed')) {
        this.db.exec('ALTER TABLE memory_entries ADD COLUMN reviewed INTEGER NOT NULL DEFAULT 1');
      }
      if (!memCols.includes('confidence')) {
        this.db.exec('ALTER TABLE memory_entries ADD COLUMN confidence INTEGER');
      }
      // Index for fast review queue queries
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_mem_review ON memory_entries(user_id, workspace_id, reviewed, archived_at)');
    } catch (err) {
      console.warn('[state-store] Failed to run memory_entries review migration:', err);
    }

    // Migration: add runtime override and fallback flag to topics.
    try {
      const cols = (this.db.query("PRAGMA table_info(topics)").all() as Array<{ name: string }>).map(
        (c) => c.name
      );
      if (!cols.includes('runtime')) {
        this.db.exec('ALTER TABLE topics ADD COLUMN runtime TEXT');
      }
      if (!cols.includes('runtime_fallback')) {
        this.db.exec('ALTER TABLE topics ADD COLUMN runtime_fallback INTEGER NOT NULL DEFAULT 0');
      }
    } catch (err) {
      console.warn('[state-store] Failed to run topics runtime migration:', err);
    }

    // FTS5 virtual tables — separate from CREATE IF NOT EXISTS block because
    // Bun's sqlite doesn't always cooperate with multi-statement executescript
    // for virtual tables. Guarded manually for idempotency.
    try {
      const fts5Tables = (this.db.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('messages_fts','memory_fts')"
      ).all() as Array<{ name: string }>).map((r) => r.name);

      if (!fts5Tables.includes('messages_fts')) {
        this.db.exec(`
          CREATE VIRTUAL TABLE messages_fts USING fts5(
            content,
            content='messages',
            content_rowid='id',
            tokenize='unicode61 remove_diacritics 2'
          );
        `);
        // Backfill from existing rows
        this.db.exec(`
          INSERT INTO messages_fts(rowid, content)
          SELECT id, content FROM messages;
        `);
        // Keep FTS synced on writes
        this.db.exec(`
          CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
            INSERT INTO messages_fts(rowid, content) VALUES (new.id, new.content);
          END;
          CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
            INSERT INTO messages_fts(messages_fts, rowid, content) VALUES('delete', old.id, old.content);
          END;
          CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
            INSERT INTO messages_fts(messages_fts, rowid, content) VALUES('delete', old.id, old.content);
            INSERT INTO messages_fts(rowid, content) VALUES (new.id, new.content);
          END;
        `);
        console.log('[state-store] messages_fts created and backfilled');
      }

      if (!fts5Tables.includes('memory_fts')) {
        this.db.exec(`
          CREATE VIRTUAL TABLE memory_fts USING fts5(
            content,
            entity_names,
            content='memory_entries',
            content_rowid='id',
            tokenize='unicode61 remove_diacritics 2'
          );
        `);
        this.db.exec(`
          CREATE TRIGGER IF NOT EXISTS memory_ai AFTER INSERT ON memory_entries BEGIN
            INSERT INTO memory_fts(rowid, content, entity_names) VALUES (new.id, new.content, '');
          END;
          CREATE TRIGGER IF NOT EXISTS memory_ad AFTER DELETE ON memory_entries BEGIN
            INSERT INTO memory_fts(memory_fts, rowid, content, entity_names) VALUES('delete', old.id, old.content, '');
          END;
          CREATE TRIGGER IF NOT EXISTS memory_au AFTER UPDATE ON memory_entries BEGIN
            INSERT INTO memory_fts(memory_fts, rowid, content, entity_names) VALUES('delete', old.id, old.content, '');
            INSERT INTO memory_fts(rowid, content, entity_names) VALUES (new.id, new.content, '');
          END;
        `);
        console.log('[state-store] memory_fts created');
      }
    } catch (err) {
      console.warn('[state-store] FTS5 migration failed (memory features may be degraded):', err);
    }

    // Mission Control tables
    try {
      // Mission Control: token_usage table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS token_usage (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_key TEXT NOT NULL,
          topic_id INTEGER,
          input_tokens INTEGER NOT NULL DEFAULT 0,
          output_tokens INTEGER NOT NULL DEFAULT 0,
          cache_creation_tokens INTEGER NOT NULL DEFAULT 0,
          cache_read_tokens INTEGER NOT NULL DEFAULT 0,
          model TEXT,
          source TEXT NOT NULL DEFAULT 'telegram',
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_token_usage_session ON token_usage(session_key);
        CREATE INDEX IF NOT EXISTS idx_token_usage_date ON token_usage(created_at);
      `);

      // Mission Control: activities table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS activities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          actor TEXT NOT NULL DEFAULT 'system',
          description TEXT NOT NULL,
          metadata TEXT,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
        CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_activities_entity ON activities(entity_type, entity_id);
      `);

      // Mission Control: webhooks + delivery logs
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS webhooks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          url TEXT NOT NULL,
          events TEXT NOT NULL DEFAULT '[]',
          secret TEXT NOT NULL,
          enabled INTEGER NOT NULL DEFAULT 1,
          created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          webhook_id INTEGER NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
          event_type TEXT NOT NULL,
          payload TEXT NOT NULL,
          status_code INTEGER,
          response_body TEXT,
          attempt INTEGER NOT NULL DEFAULT 1,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_wdl_webhook ON webhook_delivery_logs(webhook_id, created_at DESC);
      `);

      console.log('[state-store] Mission Control tables ready');
    } catch (err) {
      console.warn('[state-store] Mission Control migration failed:', err);
    }

    // Agents: specialized agents linked to topics
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS agents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          system_prompt TEXT,
          memory_mode TEXT NOT NULL DEFAULT 'global',
          memory_domain_filter TEXT,
          default_runtime TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);

      // Migration: add agent_id FK to topics
      const topicCols = (this.db.query("PRAGMA table_info(topics)").all() as Array<{ name: string }>).map(c => c.name);
      if (!topicCols.includes('agent_id')) {
        this.db.exec('ALTER TABLE topics ADD COLUMN agent_id INTEGER REFERENCES agents(id)');
      }

      console.log('[state-store] Agents tables ready');
    } catch (err) {
      console.warn('[state-store] Agents migration failed:', err);
    }
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
    const rows = this.db.query(
      'SELECT id, topic_id, role, content, created_at FROM messages WHERE topic_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(topicId, limit) as MessageRow[];
    return rows.map((r) => ({
      id: r.id,
      topicId: r.topic_id,
      role: r.role as 'user' | 'assistant',
      content: r.content,
      createdAt: r.created_at,
    }));
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
      'SELECT id, thread_id, chat_id, name, project_dir, session_id, created_at, runtime, runtime_fallback, agent_id FROM topics WHERE id = ?'
    ).get(id) as TopicRow | null;
    return row ? mapTopicRow(row) : null;
  }

  getTopicByChatAndThread(chatId: number, threadId: number | null): TopicInfo | null {
    const row = threadId
      ? this.db.query('SELECT id, thread_id, chat_id, name, project_dir, session_id, created_at, runtime, runtime_fallback, agent_id FROM topics WHERE chat_id = ? AND thread_id = ?').get(chatId, threadId) as TopicRow | null
      : this.db.query('SELECT id, thread_id, chat_id, name, project_dir, session_id, created_at, runtime, runtime_fallback, agent_id FROM topics WHERE chat_id = ? AND thread_id IS NULL').get(chatId) as TopicRow | null;
    return row ? mapTopicRow(row) : null;
  }

  /**
   * Insert-if-missing a topic row by its composite key (chatId, threadId).
   *
   * Fixes bug 688: sessionManager historically never created rows in `topics`,
   * leaving the table empty even when messages flowed through. Callers now
   * ensure a topic row exists before creating a session.
   *
   * **Name policy is INSERT-ONLY.** If the row already exists, the existing
   * name is kept verbatim — no comparison, no merge, no overwrite. This is
   * the key invariant: the only paths that CHANGE a topic name are explicit
   * renames:
   *   - `updateTopicName(id, name)` called from forum_topic_created /
   *     forum_topic_edited listeners in the bot
   *   - `/topic_rename` command
   *   - bootstrap-topics enrichment (guarded by isGenericName so user-set
   *     names are never touched)
   *
   * Without this invariant, every incoming message reset the name to the
   * generic fallback sessionManager passes ('Topic N'), quietly erasing
   * whatever the user had set.
   */
  upsertTopic(args: {
    chatId: number;
    threadId: number | null;
    name?: string | null;
    projectDir?: string | null;
    sessionId?: string | null;
  }): TopicInfo {
    const existing = this.getTopicByChatAndThread(args.chatId, args.threadId);
    if (existing) {
      return existing;
    }

    const id = this.createTopic({
      chatId: args.chatId,
      threadId: args.threadId,
      name: args.name ?? null,
      projectDir: args.projectDir ?? null,
      sessionId: args.sessionId ?? null,
      createdAt: Date.now(),
    });
    const created = this.getTopic(id);
    if (!created) {
      throw new Error(`Failed to read back upserted topic (id=${id})`);
    }
    return created;
  }

  updateTopicName(id: number, name: string): void {
    this.db.run('UPDATE topics SET name = ? WHERE id = ?', [name, id]);
  }

  /**
   * Set or clear the runtime override for a topic. Passing `null` resets
   * the topic to the global default runtime.
   */
  updateTopicRuntime(id: number, runtime: string | null, fallback?: boolean): void {
    if (fallback !== undefined) {
      this.db.run('UPDATE topics SET runtime = ?, runtime_fallback = ? WHERE id = ?', [
        runtime,
        fallback ? 1 : 0,
        id,
      ]);
    } else {
      this.db.run('UPDATE topics SET runtime = ? WHERE id = ?', [runtime, id]);
    }
  }

  deleteTopic(id: number): void {
    this.db.run('DELETE FROM messages WHERE topic_id = ?', [id]);
    this.db.run('DELETE FROM sessions WHERE topic_id = ?', [id]);
    this.db.run('DELETE FROM topics WHERE id = ?', [id]);
  }

  listTopics(): TopicInfo[] {
    const rows = this.db.query(
      'SELECT id, thread_id, chat_id, name, project_dir, session_id, created_at, runtime, runtime_fallback, agent_id FROM topics ORDER BY created_at DESC'
    ).all() as TopicRow[];
    return rows.map(mapTopicRow);
  }

  // Cron Jobs
  createCronJob(job: Omit<CronJob, 'id'>): number {
    const result = this.db.run(
      'INSERT INTO cron_jobs (name, schedule, prompt, target_topic_id, enabled, last_run, last_status, origin, source_file, runtime, model) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        job.name,
        job.schedule,
        job.prompt,
        job.targetTopicId,
        job.enabled ? 1 : 0,
        job.lastRun,
        job.lastStatus,
        job.origin ?? 'db',
        job.sourceFile ?? null,
        job.runtime ?? null,
        job.model ?? null,
      ]
    );
    return Number(result.lastInsertRowid);
  }

  getCronJob(id: number): CronJob | null {
    const row = this.db.query(
      'SELECT id, name, schedule, prompt, target_topic_id, enabled, last_run, last_status, origin, source_file, runtime, model FROM cron_jobs WHERE id = ?'
    ).get(id) as CronJobRow | null;
    return row ? mapCronJobRow(row) : null;
  }

  listCronJobs(enabledOnly: boolean = false): CronJob[] {
    const query = enabledOnly
      ? 'SELECT id, name, schedule, prompt, target_topic_id, enabled, last_run, last_status, origin, source_file, runtime, model FROM cron_jobs WHERE enabled = 1'
      : 'SELECT id, name, schedule, prompt, target_topic_id, enabled, last_run, last_status, origin, source_file, runtime, model FROM cron_jobs';
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
    if (updates.origin !== undefined) { fields.push('origin = ?'); values.push(updates.origin); }
    if (updates.sourceFile !== undefined) { fields.push('source_file = ?'); values.push(updates.sourceFile); }
    if (updates.runtime !== undefined) { fields.push('runtime = ?'); values.push(updates.runtime); }
    if (updates.model !== undefined) { fields.push('model = ?'); values.push(updates.model); }

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

  updateCronLog(id: number, updates: Partial<Pick<CronLog, 'finishedAt' | 'status' | 'output'>>): void {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.finishedAt !== undefined) {
      fields.push('finished_at = ?');
      values.push(updates.finishedAt);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.output !== undefined) {
      fields.push('output = ?');
      values.push(updates.output);
    }

    if (fields.length === 0) return;
    values.push(id);
    this.db.run(`UPDATE cron_logs SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  getCronLogs(jobId: number, limit: number = 20): CronLog[] {
    const rows = this.db.query(
      'SELECT id, job_id, started_at, finished_at, status, output FROM cron_logs WHERE job_id = ? ORDER BY started_at DESC LIMIT ?'
    ).all(jobId, limit) as CronLogRow[];
    return rows.map((r) => ({
      id: r.id,
      jobId: r.job_id,
      startedAt: r.started_at,
      finishedAt: r.finished_at,
      status: r.status,
      output: r.output,
    }));
  }

  // ---------------- Memory Entries ----------------

  createMemoryEntry(
    entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'accessCount' | 'pinned' | 'archivedAt' | 'lastAccessedAt' | 'reviewed' | 'confidence'> & {
      pinned?: boolean;
      reviewed?: boolean;
      confidence?: number | null;
    },
  ): number {
    const now = Date.now();
    const result = this.db.run(
      `INSERT INTO memory_entries
        (user_id, workspace_id, kind, content, content_hash, source_type, source_session_id,
         created_at, updated_at, access_count, pinned, metadata, reviewed, confidence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
      [
        entry.userId,
        entry.workspaceId,
        entry.kind,
        entry.content,
        entry.contentHash,
        entry.sourceType,
        entry.sourceSessionId,
        now,
        now,
        entry.pinned ? 1 : 0,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
        entry.reviewed === false ? 0 : 1,
        entry.confidence ?? null,
      ],
    );
    return Number(result.lastInsertRowid);
  }

  getMemoryEntry(id: number): MemoryEntry | null {
    const row = this.db
      .query(
        `SELECT id, user_id, workspace_id, kind, content, content_hash, source_type, source_session_id,
                created_at, updated_at, last_accessed_at, access_count, pinned, archived_at, metadata, reviewed, confidence
         FROM memory_entries WHERE id = ?`,
      )
      .get(id) as MemoryEntryRow | null;
    return row ? mapMemoryEntryRow(row) : null;
  }

  getMemoryEntryByHash(
    userId: string,
    workspaceId: string,
    contentHash: string,
  ): MemoryEntry | null {
    const row = this.db
      .query(
        `SELECT id, user_id, workspace_id, kind, content, content_hash, source_type, source_session_id,
                created_at, updated_at, last_accessed_at, access_count, pinned, archived_at, metadata, reviewed, confidence
         FROM memory_entries
         WHERE user_id = ? AND workspace_id = ? AND content_hash = ? AND archived_at IS NULL
         LIMIT 1`,
      )
      .get(userId, workspaceId, contentHash) as MemoryEntryRow | null;
    return row ? mapMemoryEntryRow(row) : null;
  }

  listMemoryEntries(opts: {
    userId: string;
    workspaceId: string;
    kind?: MemoryEntryKind;
    includeArchived?: boolean;
    /** 'approved' = reviewed=1, 'pending' = reviewed=0, 'all' = both (default 'approved') */
    reviewStatus?: 'approved' | 'pending' | 'all';
    limit?: number;
  }): MemoryEntry[] {
    const parts: string[] = ['user_id = ?', 'workspace_id = ?'];
    const values: (string | number)[] = [opts.userId, opts.workspaceId];
    if (opts.kind) {
      parts.push('kind = ?');
      values.push(opts.kind);
    }
    if (!opts.includeArchived) {
      parts.push('archived_at IS NULL');
    }
    const reviewStatus = opts.reviewStatus ?? 'approved';
    if (reviewStatus === 'approved') {
      parts.push('reviewed = 1');
    } else if (reviewStatus === 'pending') {
      parts.push('reviewed = 0');
    }
    const limit = opts.limit ?? 500;
    values.push(limit);
    const rows = this.db
      .query(
        `SELECT id, user_id, workspace_id, kind, content, content_hash, source_type, source_session_id,
                created_at, updated_at, last_accessed_at, access_count, pinned, archived_at, metadata, reviewed, confidence
         FROM memory_entries WHERE ${parts.join(' AND ')}
         ORDER BY pinned DESC, updated_at DESC LIMIT ?`,
      )
      .all(...values) as MemoryEntryRow[];
    return rows.map(mapMemoryEntryRow);
  }

  updateMemoryEntry(
    id: number,
    updates: Partial<Pick<MemoryEntry, 'content' | 'contentHash' | 'kind' | 'pinned' | 'metadata'>>,
  ): void {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    if (updates.content !== undefined) {
      fields.push('content = ?');
      values.push(updates.content);
    }
    if (updates.contentHash !== undefined) {
      fields.push('content_hash = ?');
      values.push(updates.contentHash);
    }
    if (updates.kind !== undefined) {
      fields.push('kind = ?');
      values.push(updates.kind);
    }
    if (updates.pinned !== undefined) {
      fields.push('pinned = ?');
      values.push(updates.pinned ? 1 : 0);
    }
    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(updates.metadata ? JSON.stringify(updates.metadata) : null);
    }
    if (fields.length === 0) return;
    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);
    this.db.run(`UPDATE memory_entries SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  archiveMemoryEntry(id: number): void {
    this.db.run('UPDATE memory_entries SET archived_at = ? WHERE id = ?', [Date.now(), id]);
  }

  restoreMemoryEntry(id: number): void {
    this.db.run('UPDATE memory_entries SET archived_at = NULL WHERE id = ?', [id]);
  }

  /** Mark a pending entry as approved (visible to agent). */
  approveMemoryEntry(id: number): void {
    this.db.run('UPDATE memory_entries SET reviewed = 1, updated_at = ? WHERE id = ?', [
      Date.now(),
      id,
    ]);
  }

  /** Revert an approved entry back to pending (rare — undo approve). */
  unapproveMemoryEntry(id: number): void {
    this.db.run('UPDATE memory_entries SET reviewed = 0, updated_at = ? WHERE id = ?', [
      Date.now(),
      id,
    ]);
  }

  /**
   * Auto-expire pending-review entries older than `daysOld` days. Archives
   * them so they don't pollute the review queue forever. Returns how many
   * were archived.
   */
  expirePendingReviews(daysOld: number = 7): number {
    const cutoff = Date.now() - daysOld * 86_400_000;
    const result = this.db.run(
      `UPDATE memory_entries
       SET archived_at = ?
       WHERE reviewed = 0 AND archived_at IS NULL AND created_at < ?`,
      [Date.now(), cutoff],
    );
    return Number(result.changes ?? 0);
  }

  deleteMemoryEntry(id: number): void {
    this.db.run('DELETE FROM memory_entries WHERE id = ?', [id]);
  }

  touchMemoryEntry(id: number): void {
    this.db.run(
      'UPDATE memory_entries SET last_accessed_at = ?, access_count = access_count + 1 WHERE id = ?',
      [Date.now(), id],
    );
  }

  // ---------------- Memory Refs (entities) ----------------

  addMemoryRef(memoryId: number, entityType: string, entityName: string): void {
    this.db.run(
      'INSERT OR IGNORE INTO memory_refs (memory_id, entity_type, entity_name) VALUES (?, ?, ?)',
      [memoryId, entityType, entityName],
    );
  }

  listMemoryRefs(memoryId: number): Array<{ entityType: string; entityName: string }> {
    return (
      this.db
        .query('SELECT entity_type, entity_name FROM memory_refs WHERE memory_id = ?')
        .all(memoryId) as Array<{ entity_type: string; entity_name: string }>
    ).map((r) => ({ entityType: r.entity_type, entityName: r.entity_name }));
  }

  findMemoriesByEntity(
    userId: string,
    workspaceId: string,
    entityName: string,
    limit: number = 10,
  ): MemoryEntry[] {
    const rows = this.db
      .query(
        `SELECT m.id, m.user_id, m.workspace_id, m.kind, m.content, m.content_hash, m.source_type, m.source_session_id,
                m.created_at, m.updated_at, m.last_accessed_at, m.access_count, m.pinned, m.archived_at, m.metadata
         FROM memory_entries m
         JOIN memory_refs r ON r.memory_id = m.id
         WHERE m.user_id = ? AND m.workspace_id = ? AND m.archived_at IS NULL
           AND LOWER(r.entity_name) = LOWER(?)
         ORDER BY m.pinned DESC, m.access_count DESC, m.updated_at DESC LIMIT ?`,
      )
      .all(userId, workspaceId, entityName, limit) as MemoryEntryRow[];
    return rows.map(mapMemoryEntryRow);
  }

  // ---------------- Memory Audit ----------------

  createMemoryAudit(entry: Omit<MemoryAuditEntry, 'id' | 'at'>): number {
    const result = this.db.run(
      `INSERT INTO memory_audit (memory_id, action, old_content, new_content, actor, reason, at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [entry.memoryId, entry.action, entry.oldContent, entry.newContent, entry.actor, entry.reason, Date.now()],
    );
    return Number(result.lastInsertRowid);
  }

  listMemoryAudit(memoryId: number, limit: number = 20): MemoryAuditEntry[] {
    const rows = this.db
      .query(
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
    }>;
    return rows.map((r) => ({
      id: r.id,
      memoryId: r.memory_id,
      action: r.action as MemoryAuditAction,
      oldContent: r.old_content,
      newContent: r.new_content,
      actor: r.actor,
      reason: r.reason,
      at: r.at,
    }));
  }

  // ---------------- Retrieval log ----------------

  logRetrieval(entry: Omit<MemoryRetrievalLog, 'id' | 'at'>): number {
    const result = this.db.run(
      `INSERT INTO memory_retrievals (user_id, workspace_id, query, source, hits_json, injected, at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.userId,
        entry.workspaceId,
        entry.query,
        entry.source,
        JSON.stringify(entry.hits),
        entry.injected ? 1 : 0,
        Date.now(),
      ],
    );
    return Number(result.lastInsertRowid);
  }

  listRetrievals(limit: number = 50): MemoryRetrievalLog[] {
    const rows = this.db
      .query(
        `SELECT id, user_id, workspace_id, query, source, hits_json, injected, at
         FROM memory_retrievals ORDER BY at DESC LIMIT ?`,
      )
      .all(limit) as Array<{
      id: number;
      user_id: string;
      workspace_id: string;
      query: string;
      source: string;
      hits_json: string;
      injected: number;
      at: number;
    }>;
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      workspaceId: r.workspace_id,
      query: r.query,
      source: r.source as MemoryRetrievalLog['source'],
      hits: JSON.parse(r.hits_json) as MemoryRetrievalLog['hits'],
      injected: r.injected === 1,
      at: r.at,
    }));
  }

  // ---------------- Token Usage (Mission Control) ----------------

  createTokenUsage(entry: Omit<import('./types').TokenUsage, 'id'>): number {
    const result = this.db.run(
      `INSERT INTO token_usage (session_key, topic_id, input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens, model, source, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [entry.sessionKey, entry.topicId, entry.inputTokens, entry.outputTokens, entry.cacheCreationTokens, entry.cacheReadTokens, entry.model, entry.source, entry.createdAt]
    );
    return Number(result.lastInsertRowid);
  }

  listTokenUsage(opts: { sessionKey?: string; limit?: number; since?: number }): import('./types').TokenUsage[] {
    const parts: string[] = [];
    const values: (string | number)[] = [];
    if (opts.sessionKey) { parts.push('session_key = ?'); values.push(opts.sessionKey); }
    if (opts.since) { parts.push('created_at >= ?'); values.push(opts.since); }
    const where = parts.length > 0 ? `WHERE ${parts.join(' AND ')}` : '';
    const limit = opts.limit ?? 500;
    values.push(limit);
    const rows = this.db.query(
      `SELECT id, session_key, topic_id, input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens, model, source, created_at
       FROM token_usage ${where} ORDER BY created_at DESC LIMIT ?`
    ).all(...values) as TokenUsageRow[];
    return rows.map(mapTokenUsageRow);
  }

  getTokenUsageDailySummary(days: number = 30): Array<{ date: string; inputTokens: number; outputTokens: number; cacheCreationTokens: number; cacheReadTokens: number; count: number }> {
    const since = Date.now() - days * 86_400_000;
    const rows = this.db.query(
      `SELECT
         DATE(created_at / 1000, 'unixepoch') AS date,
         SUM(input_tokens) AS input_tokens,
         SUM(output_tokens) AS output_tokens,
         SUM(cache_creation_tokens) AS cache_creation_tokens,
         SUM(cache_read_tokens) AS cache_read_tokens,
         COUNT(*) AS count
       FROM token_usage
       WHERE created_at >= ?
       GROUP BY date
       ORDER BY date ASC`
    ).all(since) as Array<{ date: string; input_tokens: number; output_tokens: number; cache_creation_tokens: number; cache_read_tokens: number; count: number }>;
    return rows.map(r => ({
      date: r.date,
      inputTokens: r.input_tokens,
      outputTokens: r.output_tokens,
      cacheCreationTokens: r.cache_creation_tokens,
      cacheReadTokens: r.cache_read_tokens,
      count: r.count,
    }));
  }

  getTokenUsageTopSessions(limit: number = 10): Array<{ sessionKey: string; totalInput: number; totalOutput: number; totalCache: number; count: number }> {
    const rows = this.db.query(
      `SELECT
         session_key,
         SUM(input_tokens) AS total_input,
         SUM(output_tokens) AS total_output,
         SUM(cache_creation_tokens + cache_read_tokens) AS total_cache,
         COUNT(*) AS count
       FROM token_usage
       GROUP BY session_key
       ORDER BY (total_input + total_output) DESC
       LIMIT ?`
    ).all(limit) as Array<{ session_key: string; total_input: number; total_output: number; total_cache: number; count: number }>;
    return rows.map(r => ({
      sessionKey: r.session_key,
      totalInput: r.total_input,
      totalOutput: r.total_output,
      totalCache: r.total_cache,
      count: r.count,
    }));
  }

  // ---------------- Activities (Mission Control) ----------------

  createActivity(entry: Omit<import('./types').Activity, 'id'>): number {
    const result = this.db.run(
      `INSERT INTO activities (type, entity_type, entity_id, actor, description, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [entry.type, entry.entityType, entry.entityId, entry.actor, entry.description, entry.metadata ? JSON.stringify(entry.metadata) : null, entry.createdAt]
    );
    return Number(result.lastInsertRowid);
  }

  listActivities(opts: { type?: string; entityType?: string; limit?: number; since?: number; offset?: number }): import('./types').Activity[] {
    const parts: string[] = [];
    const values: (string | number)[] = [];
    if (opts.type) { parts.push('type = ?'); values.push(opts.type); }
    if (opts.entityType) { parts.push('entity_type = ?'); values.push(opts.entityType); }
    if (opts.since) { parts.push('created_at >= ?'); values.push(opts.since); }
    const where = parts.length > 0 ? `WHERE ${parts.join(' AND ')}` : '';
    const limit = opts.limit ?? 100;
    const offset = opts.offset ?? 0;
    values.push(limit, offset);
    const rows = this.db.query(
      `SELECT id, type, entity_type, entity_id, actor, description, metadata, created_at
       FROM activities ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(...values) as ActivityRow[];
    return rows.map(mapActivityRow);
  }

  // ---------------- Webhooks (Mission Control) ----------------

  createWebhook(entry: Omit<import('./types').Webhook, 'id'>): number {
    const result = this.db.run(
      `INSERT INTO webhooks (url, events, secret, enabled, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [entry.url, JSON.stringify(entry.events), entry.secret, entry.enabled ? 1 : 0, entry.createdAt]
    );
    return Number(result.lastInsertRowid);
  }

  getWebhook(id: number): import('./types').Webhook | null {
    const row = this.db.query(
      'SELECT id, url, events, secret, enabled, created_at FROM webhooks WHERE id = ?'
    ).get(id) as WebhookRow | null;
    return row ? mapWebhookRow(row) : null;
  }

  listWebhooks(): import('./types').Webhook[] {
    const rows = this.db.query(
      'SELECT id, url, events, secret, enabled, created_at FROM webhooks ORDER BY created_at DESC'
    ).all() as WebhookRow[];
    return rows.map(mapWebhookRow);
  }

  updateWebhook(id: number, updates: Partial<Omit<import('./types').Webhook, 'id' | 'createdAt'>>): void {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    if (updates.url !== undefined) { fields.push('url = ?'); values.push(updates.url); }
    if (updates.events !== undefined) { fields.push('events = ?'); values.push(JSON.stringify(updates.events)); }
    if (updates.secret !== undefined) { fields.push('secret = ?'); values.push(updates.secret); }
    if (updates.enabled !== undefined) { fields.push('enabled = ?'); values.push(updates.enabled ? 1 : 0); }
    if (fields.length === 0) return;
    values.push(id);
    this.db.run(`UPDATE webhooks SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  deleteWebhook(id: number): void {
    this.db.run('DELETE FROM webhooks WHERE id = ?', [id]);
  }

  listWebhookDeliveryLogs(webhookId: number, limit: number = 50): import('./types').WebhookDeliveryLog[] {
    const rows = this.db.query(
      `SELECT id, webhook_id, event_type, payload, status_code, response_body, attempt, created_at
       FROM webhook_delivery_logs WHERE webhook_id = ? ORDER BY created_at DESC LIMIT ?`
    ).all(webhookId, limit) as WebhookDeliveryLogRow[];
    return rows.map(mapWebhookDeliveryLogRow);
  }

  createWebhookDeliveryLog(entry: Omit<import('./types').WebhookDeliveryLog, 'id'>): number {
    const result = this.db.run(
      `INSERT INTO webhook_delivery_logs (webhook_id, event_type, payload, status_code, response_body, attempt, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [entry.webhookId, entry.eventType, entry.payload, entry.statusCode, entry.responseBody, entry.attempt, entry.createdAt]
    );
    return Number(result.lastInsertRowid);
  }

  getEnabledWebhooksForEvent(eventType: string): import('./types').Webhook[] {
    // events column is JSON array. Use LIKE for SQLite JSON compatibility.
    const rows = this.db.query(
      `SELECT id, url, events, secret, enabled, created_at FROM webhooks
       WHERE enabled = 1 AND events LIKE ?`
    ).all(`%"${eventType}"%`) as WebhookRow[];
    return rows.map(mapWebhookRow);
  }

  // ---------------- FTS5 search ----------------

  /**
   * Full-text search across message history.  FTS5 query syntax is sanitized
   * so user-supplied queries like ``don-vicente`` or ``claude code``
   * don't crash the tokenizer.
   */
  searchMessages(query: string, limit: number = 20): Array<{ messageId: number; topicId: number; content: string; createdAt: number; rank: number }> {
    const safeQuery = sanitizeFtsQuery(query);
    if (!safeQuery) return [];
    try {
      return (
        this.db
          .query(
            `SELECT m.id AS message_id, m.topic_id, m.content, m.created_at, bm25(messages_fts) AS rank
             FROM messages_fts
             JOIN messages m ON m.id = messages_fts.rowid
             WHERE messages_fts MATCH ?
             ORDER BY rank LIMIT ?`,
          )
          .all(safeQuery, limit) as Array<{
          message_id: number;
          topic_id: number;
          content: string;
          created_at: number;
          rank: number;
        }>
      ).map((r) => ({
        messageId: r.message_id,
        topicId: r.topic_id,
        content: r.content,
        createdAt: r.created_at,
        rank: r.rank,
      }));
    } catch (err) {
      console.warn('[state-store] FTS5 message search failed:', err);
      return [];
    }
  }

  /**
   * Full-text search across memory_entries (active only).  Caller should
   * re-fetch via getMemoryEntry() if it needs full metadata.
   */
  searchMemoryEntries(
    userId: string,
    workspaceId: string,
    query: string,
    limit: number = 10,
  ): MemorySearchHit[] {
    const safeQuery = sanitizeFtsQuery(query);
    if (!safeQuery) return [];
    try {
      const rows = this.db
        .query(
          `SELECT m.id, m.user_id, m.workspace_id, m.kind, m.content, m.content_hash, m.source_type, m.source_session_id,
                  m.created_at, m.updated_at, m.last_accessed_at, m.access_count, m.pinned, m.archived_at, m.metadata,
                  bm25(memory_fts) AS rank
           FROM memory_fts
           JOIN memory_entries m ON m.id = memory_fts.rowid
           WHERE memory_fts MATCH ?
             AND m.user_id = ? AND m.workspace_id = ?
             AND m.archived_at IS NULL AND m.reviewed = 1
           ORDER BY rank LIMIT ?`,
        )
        .all(safeQuery, userId, workspaceId, limit) as Array<MemoryEntryRow & { rank: number }>;
      return rows.map((r) => ({
        entry: mapMemoryEntryRow(r),
        // bm25 returns negative; invert so larger = better
        score: -r.rank,
        reason: 'fts',
      }));
    } catch (err) {
      console.warn('[state-store] FTS5 memory search failed:', err);
      return [];
    }
  }

  // ---------------- Agents ----------------

  createAgent(agent: Omit<import('./types').AgentConfig, 'id'>): number {
    const result = this.db.run(
      `INSERT INTO agents (name, system_prompt, memory_mode, memory_domain_filter, default_runtime, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [agent.name, agent.systemPrompt, agent.memoryMode, agent.memoryDomainFilter.length > 0 ? JSON.stringify(agent.memoryDomainFilter) : null, agent.defaultRuntime, agent.createdAt, agent.updatedAt]
    );
    return Number(result.lastInsertRowid);
  }

  getAgent(id: number): import('./types').AgentConfig | null {
    const row = this.db.query(
      'SELECT id, name, system_prompt, memory_mode, memory_domain_filter, default_runtime, created_at, updated_at FROM agents WHERE id = ?'
    ).get(id) as AgentRow | null;
    return row ? mapAgentRow(row) : null;
  }

  listAgents(): import('./types').AgentConfig[] {
    const rows = this.db.query(
      'SELECT id, name, system_prompt, memory_mode, memory_domain_filter, default_runtime, created_at, updated_at FROM agents ORDER BY name ASC'
    ).all() as AgentRow[];
    return rows.map(mapAgentRow);
  }

  updateAgent(id: number, updates: Partial<Omit<import('./types').AgentConfig, 'id' | 'createdAt'>>): void {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.systemPrompt !== undefined) { fields.push('system_prompt = ?'); values.push(updates.systemPrompt); }
    if (updates.memoryMode !== undefined) { fields.push('memory_mode = ?'); values.push(updates.memoryMode); }
    if (updates.memoryDomainFilter !== undefined) {
      fields.push('memory_domain_filter = ?');
      values.push(updates.memoryDomainFilter.length > 0 ? JSON.stringify(updates.memoryDomainFilter) : null);
    }
    if (updates.defaultRuntime !== undefined) { fields.push('default_runtime = ?'); values.push(updates.defaultRuntime); }
    if (fields.length === 0) return;
    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);
    this.db.run(`UPDATE agents SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  deleteAgent(id: number): void {
    // Unlink topics first (set agent_id = NULL)
    this.db.run('UPDATE topics SET agent_id = NULL WHERE agent_id = ?', [id]);
    this.db.run('DELETE FROM agents WHERE id = ?', [id]);
  }

  // Update topic's agent_id
  updateTopicAgent(id: number, agentId: number | null): void {
    this.db.run('UPDATE topics SET agent_id = ? WHERE id = ?', [agentId, id]);
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
  runtime: string | null;
  runtime_fallback: number;
  agent_id: number | null;
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

interface MemoryEntryRow {
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

function mapMemoryEntryRow(row: MemoryEntryRow): MemoryEntry {
  return {
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    kind: row.kind as MemoryEntryKind,
    content: row.content,
    contentHash: row.content_hash,
    sourceType: row.source_type,
    sourceSessionId: row.source_session_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastAccessedAt: row.last_accessed_at,
    accessCount: row.access_count,
    pinned: row.pinned === 1,
    archivedAt: row.archived_at,
    metadata: row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : null,
    reviewed: row.reviewed === 1,
    confidence: row.confidence,
  };
}

/**
 * Sanitize user-supplied text into a valid FTS5 MATCH query. FTS5 has its own
 * mini-query language where characters like ``"``, ``(``, ``)``, ``*``, ``-``,
 * ``:``, ``.`` have meaning.  For user queries we want "phrase + phrase"
 * behaviour: split on whitespace, quote each token, OR them together.
 *
 * Rejects empty/whitespace-only input by returning empty string.
 */
function sanitizeFtsQuery(query: string): string {
  if (!query) return '';
  const tokens = query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // strip punctuation (letters + digits + space survive)
    .split(/\s+/)
    .filter((t) => t.length >= 2);
  if (tokens.length === 0) return '';
  return tokens.map((t) => `"${t}"`).join(' OR ');
}

// Import type aliases locally — needed because stateStore methods return them
type MemoryAuditEntry = import('./types').MemoryAuditEntry;
type MemoryRetrievalLog = import('./types').MemoryRetrievalLog;

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
    runtime: (row.runtime as 'claude-code' | 'codex' | null) ?? null,
    runtimeFallback: row.runtime_fallback === 1,
    agentId: row.agent_id ?? null,
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
    origin: row.origin === 'db' ? 'db' : 'file',
    sourceFile: row.source_file,
    runtime: (row.runtime as 'claude-code' | 'codex' | null) ?? null,
    model: row.model,
  };
}

interface TokenUsageRow {
  id: number;
  session_key: string;
  topic_id: number | null;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  model: string | null;
  source: string;
  created_at: number;
}

function mapTokenUsageRow(row: TokenUsageRow): import('./types').TokenUsage {
  return {
    id: row.id,
    sessionKey: row.session_key,
    topicId: row.topic_id,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    cacheCreationTokens: row.cache_creation_tokens,
    cacheReadTokens: row.cache_read_tokens,
    model: row.model,
    source: row.source as 'dashboard' | 'telegram' | 'cron',
    createdAt: row.created_at,
  };
}

interface ActivityRow {
  id: number;
  type: string;
  entity_type: string;
  entity_id: string;
  actor: string;
  description: string;
  metadata: string | null;
  created_at: number;
}

function mapActivityRow(row: ActivityRow): import('./types').Activity {
  return {
    id: row.id,
    type: row.type as import('./types').ActivityType,
    entityType: row.entity_type as import('./types').ActivityEntityType,
    entityId: row.entity_id,
    actor: row.actor,
    description: row.description,
    metadata: row.metadata ? JSON.parse(row.metadata) as Record<string, unknown> : null,
    createdAt: row.created_at,
  };
}

interface WebhookRow {
  id: number;
  url: string;
  events: string;
  secret: string;
  enabled: number;
  created_at: number;
}

function mapWebhookRow(row: WebhookRow): import('./types').Webhook {
  return {
    id: row.id,
    url: row.url,
    events: JSON.parse(row.events) as string[],
    secret: row.secret,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
  };
}

interface WebhookDeliveryLogRow {
  id: number;
  webhook_id: number;
  event_type: string;
  payload: string;
  status_code: number | null;
  response_body: string | null;
  attempt: number;
  created_at: number;
}

function mapWebhookDeliveryLogRow(row: WebhookDeliveryLogRow): import('./types').WebhookDeliveryLog {
  return {
    id: row.id,
    webhookId: row.webhook_id,
    eventType: row.event_type,
    payload: row.payload,
    statusCode: row.status_code,
    responseBody: row.response_body,
    attempt: row.attempt,
    createdAt: row.created_at,
  };
}

interface AgentRow {
  id: number;
  name: string;
  system_prompt: string | null;
  memory_mode: string;
  memory_domain_filter: string | null;
  default_runtime: string | null;
  created_at: number;
  updated_at: number;
}

function mapAgentRow(row: AgentRow): import('./types').AgentConfig {
  return {
    id: row.id,
    name: row.name,
    systemPrompt: row.system_prompt,
    memoryMode: (row.memory_mode as 'global' | 'filtered') ?? 'global',
    memoryDomainFilter: row.memory_domain_filter ? JSON.parse(row.memory_domain_filter) as string[] : [],
    defaultRuntime: (row.default_runtime as 'claude-code' | 'codex' | null) ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const stateStore = new StateStore();
export { StateStore };
