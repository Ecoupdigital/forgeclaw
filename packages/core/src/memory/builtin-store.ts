/**
 * BuiltinMemoryStore — the always-on memory provider for ForgeClaw.
 *
 * Responsibilities:
 *  - Persist `behavior` (MEMORY.md-equivalent) and `user_profile` (USER.md)
 *    entries to `memory_entries` in SQLite, with full audit trail.
 *  - Maintain a frozen snapshot loaded at session start — the system prompt
 *    stays byte-stable during the session so Anthropic prefix cache hits
 *    stay maximal. Live writes via tool calls persist to disk immediately
 *    but do NOT refresh the snapshot mid-session.
 *  - Enforce char-based bounds (model-agnostic) so MEMORY.md can't balloon.
 *  - Run security scanner on every write (block prompt injection / exfil).
 *  - Mirror a human-readable copy to `~/.forgeclaw/harness/MEMORY.md` and
 *    `USER.md` so the harness CLAUDE.md can append-system-prompt them.
 *
 * Port notes: based on Hermes `tools/memory_tool.py::MemoryStore` but
 * adapted to SQLite-backed storage + audit trail (neither Hermes nor
 * openclaw-memory has audit trail).
 */

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type {
  MemoryEntry,
  MemoryEntryKind,
  MemorySearchHit,
} from '../types';
import { stateStore } from '../state-store';
import { scanMemoryContent } from './security-scanner';

const DEFAULT_USER_ID = 'default';
const DEFAULT_WORKSPACE_ID = 'default';

// Char limits (model-agnostic). Based on Hermes defaults (2200 / 1375)
// scaled up because ForgeClaw users have rich context (clients, projects).
const DEFAULT_MEMORY_CHAR_LIMIT = 12_000;
const DEFAULT_USER_CHAR_LIMIT = 5_000;

const HARNESS_DIR = join(homedir(), '.forgeclaw', 'harness');
const MEMORY_MD_PATH = join(HARNESS_DIR, 'MEMORY.md');
const USER_MD_PATH = join(HARNESS_DIR, 'USER.md');

export interface BuiltinStoreOptions {
  userId?: string;
  workspaceId?: string;
  memoryCharLimit?: number;
  userCharLimit?: number;
}

export interface WriteResult {
  ok: boolean;
  reason?: string;
  entry?: MemoryEntry;
  bytesUsed?: number;
  bytesLimit?: number;
}

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Normalize content for comparison — lowercase, collapse whitespace, trim.
 * Used by the reverse "similar?" check before add and by replace/remove
 * needle matching.
 */
function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

export class BuiltinMemoryStore {
  private readonly userId: string;
  private readonly workspaceId: string;
  private readonly memoryCharLimit: number;
  private readonly userCharLimit: number;

  // Frozen snapshot captured at load time.
  private snapshot: { memory: string; user: string } = { memory: '', user: '' };
  private snapshotLoadedAt: number = 0;

  constructor(opts: BuiltinStoreOptions = {}) {
    this.userId = opts.userId ?? DEFAULT_USER_ID;
    this.workspaceId = opts.workspaceId ?? DEFAULT_WORKSPACE_ID;
    this.memoryCharLimit = opts.memoryCharLimit ?? DEFAULT_MEMORY_CHAR_LIMIT;
    this.userCharLimit = opts.userCharLimit ?? DEFAULT_USER_CHAR_LIMIT;
  }

  // ---------------- Snapshot (frozen at session start) ----------------

  /**
   * Load all behavior + user_profile entries and build the frozen snapshot.
   * Called ONCE per session by MemoryManager. Mid-session writes go to
   * disk but do not rebuild the snapshot — that happens next session.
   */
  loadSnapshot(): void {
    const memoryEntries = stateStore.listMemoryEntries({
      userId: this.userId,
      workspaceId: this.workspaceId,
      kind: 'behavior',
      limit: 500,
    });
    const userEntries = stateStore.listMemoryEntries({
      userId: this.userId,
      workspaceId: this.workspaceId,
      kind: 'user_profile',
      limit: 500,
    });

    this.snapshot.memory = this.assembleMarkdown('behavior', memoryEntries);
    this.snapshot.user = this.assembleMarkdown('user_profile', userEntries);
    this.snapshotLoadedAt = Date.now();

    // Mirror to harness files so --append-system-prompt picks them up.
    this.writeMirror(MEMORY_MD_PATH, this.snapshot.memory);
    this.writeMirror(USER_MD_PATH, this.snapshot.user);
  }

  getSnapshot(): { memory: string; user: string } {
    return { ...this.snapshot };
  }

  snapshotLoadedAtMs(): number {
    return this.snapshotLoadedAt;
  }

  // ---------------- Live state (reads hit DB directly) ----------------

  listLive(kind: MemoryEntryKind): MemoryEntry[] {
    // Snapshot only contains APPROVED entries. Pending review entries are
    // NOT visible to the agent until the user approves them.
    return stateStore.listMemoryEntries({
      userId: this.userId,
      workspaceId: this.workspaceId,
      kind,
      reviewStatus: 'approved',
      limit: 500,
    });
  }

  currentBytes(kind: MemoryEntryKind): number {
    const entries = this.listLive(kind);
    return entries.reduce((sum, e) => sum + e.content.length, 0);
  }

  limitFor(kind: MemoryEntryKind): number {
    if (kind === 'user_profile') return this.userCharLimit;
    return this.memoryCharLimit;
  }

  // ---------------- Write actions ----------------

  /**
   * Add a new entry. Dedups by content hash, enforces char limit,
   * runs security scan, writes audit trail. Does NOT update snapshot.
   */
  add(
    kind: MemoryEntryKind,
    content: string,
    opts: {
      actor?: string;
      reason?: string;
      sourceType?: string;
      sourceSessionId?: string;
      pinned?: boolean;
      reviewed?: boolean;
      confidence?: number | null;
    } = {},
  ): WriteResult {
    const cleaned = content.trim();
    if (!cleaned) return { ok: false, reason: 'empty content' };

    // Security scan first — never persist something that will own the prompt.
    const violation = scanMemoryContent(cleaned);
    if (violation) {
      return { ok: false, reason: violation.message };
    }

    // Dedup by hash
    const hash = sha256(cleaned);
    const existing = stateStore.getMemoryEntryByHash(this.userId, this.workspaceId, hash);
    if (existing) {
      // Touch so the existing entry bumps its access count instead of failing
      stateStore.touchMemoryEntry(existing.id);
      return {
        ok: true,
        reason: 'duplicate (touched existing)',
        entry: stateStore.getMemoryEntry(existing.id) ?? undefined,
      };
    }

    // Enforce bounded char limit
    const limit = this.limitFor(kind);
    const current = this.currentBytes(kind);
    if (current + cleaned.length > limit) {
      return {
        ok: false,
        reason: `bounded limit exceeded: ${kind} has ${current} chars, limit ${limit}, tried to add ${cleaned.length}. compress first.`,
        bytesUsed: current,
        bytesLimit: limit,
      };
    }

    const id = stateStore.createMemoryEntry({
      userId: this.userId,
      workspaceId: this.workspaceId,
      kind,
      content: cleaned,
      contentHash: hash,
      sourceType: opts.sourceType ?? 'manual',
      sourceSessionId: opts.sourceSessionId ?? null,
      metadata: null,
      pinned: opts.pinned ?? false,
      reviewed: opts.reviewed,
      confidence: opts.confidence ?? null,
    });

    stateStore.createMemoryAudit({
      memoryId: id,
      action: 'create',
      oldContent: null,
      newContent: cleaned,
      actor: opts.actor ?? 'user',
      reason: opts.reason ?? null,
    });

    const entry = stateStore.getMemoryEntry(id);
    return { ok: true, entry: entry ?? undefined };
  }

  /**
   * Replace a unique substring within an entry (matches openclaw-memory and
   * Hermes' short-needle-match pattern — no IDs, less hallucination).
   */
  replace(
    kind: MemoryEntryKind,
    needle: string,
    replacement: string,
    opts: { actor?: string; reason?: string } = {},
  ): WriteResult {
    const needleNorm = normalize(needle);
    if (!needleNorm) return { ok: false, reason: 'empty needle' };

    const violation = scanMemoryContent(replacement);
    if (violation) return { ok: false, reason: violation.message };

    const entries = this.listLive(kind);
    const matches = entries.filter((e) => normalize(e.content).includes(needleNorm));
    if (matches.length === 0) return { ok: false, reason: 'no match' };
    if (matches.length > 1) {
      return {
        ok: false,
        reason: `ambiguous needle — ${matches.length} entries match, make the needle more specific`,
      };
    }

    const target = matches[0];
    // Case-insensitive replace of the first occurrence in the original text
    const idx = target.content.toLowerCase().indexOf(needle.toLowerCase());
    const newContent =
      target.content.slice(0, idx) + replacement + target.content.slice(idx + needle.length);
    const newHash = sha256(newContent);

    stateStore.updateMemoryEntry(target.id, { content: newContent, contentHash: newHash });
    stateStore.createMemoryAudit({
      memoryId: target.id,
      action: 'update',
      oldContent: target.content,
      newContent,
      actor: opts.actor ?? 'user',
      reason: opts.reason ?? null,
    });

    return { ok: true, entry: stateStore.getMemoryEntry(target.id) ?? undefined };
  }

  /**
   * Remove an entry by unique substring match. Archives (soft delete) so
   * the audit trail preserves history.
   */
  remove(
    kind: MemoryEntryKind,
    needle: string,
    opts: { actor?: string; reason?: string } = {},
  ): WriteResult {
    const needleNorm = normalize(needle);
    if (!needleNorm) return { ok: false, reason: 'empty needle' };

    const entries = this.listLive(kind);
    const matches = entries.filter((e) => normalize(e.content).includes(needleNorm));
    if (matches.length === 0) return { ok: false, reason: 'no match' };
    if (matches.length > 1) {
      return {
        ok: false,
        reason: `ambiguous needle — ${matches.length} entries match`,
      };
    }

    const target = matches[0];
    stateStore.archiveMemoryEntry(target.id);
    stateStore.createMemoryAudit({
      memoryId: target.id,
      action: 'archive',
      oldContent: target.content,
      newContent: null,
      actor: opts.actor ?? 'user',
      reason: opts.reason ?? null,
    });

    return { ok: true, entry: target };
  }

  /** Read current (live) state as assembled markdown. */
  read(kind: MemoryEntryKind): string {
    return this.assembleMarkdown(kind, this.listLive(kind));
  }

  /** Search memory entries via FTS5. */
  search(query: string, limit: number = 10): MemorySearchHit[] {
    return stateStore.searchMemoryEntries(this.userId, this.workspaceId, query, limit);
  }

  // ---------------- Helpers ----------------

  private assembleMarkdown(kind: MemoryEntryKind, entries: MemoryEntry[]): string {
    if (entries.length === 0) return '';
    const title =
      kind === 'user_profile'
        ? '# USER — perfil e preferências do dono'
        : '# MEMORY — memória de longo prazo do ForgeClaw';
    const lines: string[] = [title, ''];

    // Group: pinned first, then everything else
    const pinned = entries.filter((e) => e.pinned);
    const rest = entries.filter((e) => !e.pinned);

    if (pinned.length) {
      lines.push('## pinned');
      lines.push('');
      for (const e of pinned) lines.push(e.content, '');
    }
    if (rest.length) {
      if (pinned.length) lines.push('## outras');
      for (const e of rest) lines.push(e.content, '');
    }
    return lines.join('\n').trim() + '\n';
  }

  private writeMirror(path: string, content: string): void {
    try {
      if (!existsSync(HARNESS_DIR)) mkdirSync(HARNESS_DIR, { recursive: true });
      writeFileSync(path, content || '# (empty)\n', 'utf-8');
    } catch (err) {
      console.warn('[builtin-store] failed to mirror', path, err);
    }
  }
}
