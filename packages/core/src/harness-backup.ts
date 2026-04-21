/**
 * Backup utilities for ~/.forgeclaw/harness.
 *
 * Originally authored in `packages/cli/src/utils/refine-backup.ts` as part of
 * Fase 28-01 and moved here in 28-02 so both the CLI (`forgeclaw refine
 * --rollback`) and the dashboard (`POST /api/refine/apply`, `/api/refine/rollback`)
 * share a single source of truth without duplicating logic or introducing a
 * dashboard->cli dependency.
 *
 * The default forgeclaw dir is derived from `homedir()` at call-time but
 * every function accepts an optional override (`forgeclawDir`) so tests
 * can redirect to a tmpdir without relying on `process.env.HOME` mutation
 * (Bun caches `homedir()` at process start, so HOME mutation does not
 * propagate).
 */

import {
  existsSync,
  mkdirSync,
  cpSync,
  readdirSync,
  readFileSync,
  statSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

function getForgeclawDir(override?: string): string {
  return override ?? join(homedir(), '.forgeclaw')
}

function getHarnessDir(override?: string): string {
  return join(getForgeclawDir(override), 'harness')
}

function getBackupsDir(override?: string): string {
  return join(getForgeclawDir(override), 'harness-backups')
}

export interface BackupInfo {
  /** Timestamp-based ID, e.g. "2026-04-21T14-30-00" (or "pre-restore-<id>"). */
  id: string
  /** Absolute path to the backup dir. */
  path: string
  createdAt: Date
  sizeBytes: number
  fileCount: number
}

interface BackupMetadata {
  id: string
  createdAt: string
  reason: string
  sourcePath: string
}

function calculateDirSize(dir: string): { sizeBytes: number; fileCount: number } {
  let sizeBytes = 0
  let fileCount = 0
  if (!existsSync(dir)) return { sizeBytes, fileCount }
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) {
      const sub = calculateDirSize(p)
      sizeBytes += sub.sizeBytes
      fileCount += sub.fileCount
    } else if (entry.isFile()) {
      try {
        sizeBytes += statSync(p).size
        fileCount += 1
      } catch {
        // skip unreadable
      }
    }
  }
  return { sizeBytes, fileCount }
}

function buildTimestampId(): string {
  // 2026-04-21T14:30:00.123Z -> 2026-04-21T14-30-00
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

/**
 * Creates a timestamped backup of ~/.forgeclaw/harness.
 *
 * Throws if the harness dir does not exist (user must run `forgeclaw install`
 * first). Writes a `metadata.json` inside the backup for listing purposes.
 *
 * @param reason        Human-readable reason persisted in metadata.json.
 * @param forgeclawDir  Optional override for the forgeclaw base dir (tests).
 */
export function createBackup(reason: string, forgeclawDir?: string): BackupInfo {
  const harnessDir = getHarnessDir(forgeclawDir)
  if (!existsSync(harnessDir)) {
    throw new Error('Harness dir does not exist — run forgeclaw install first')
  }
  const backupsDir = getBackupsDir(forgeclawDir)
  mkdirSync(backupsDir, { recursive: true })

  // Reason is used as prefix for pre-restore/auto backups so they're
  // identifiable. Sanitize to a single path segment.
  const base = buildTimestampId()
  const prefix = reason.startsWith('pre-restore-') ? 'pre-restore-' : ''
  let id = prefix ? `${prefix}${base}` : base

  // Avoid collisions if called twice in the same second.
  let dest = join(backupsDir, id)
  let counter = 1
  while (existsSync(dest)) {
    id = prefix ? `${prefix}${base}-${counter}` : `${base}-${counter}`
    dest = join(backupsDir, id)
    counter += 1
  }

  cpSync(harnessDir, dest, { recursive: true, force: true })

  const createdAt = new Date()
  const metadata: BackupMetadata = {
    id,
    createdAt: createdAt.toISOString(),
    reason,
    sourcePath: harnessDir,
  }
  writeFileSync(join(dest, 'metadata.json'), JSON.stringify(metadata, null, 2) + '\n', 'utf-8')

  const { sizeBytes, fileCount } = calculateDirSize(dest)

  return {
    id,
    path: dest,
    createdAt,
    sizeBytes,
    fileCount,
  }
}

/**
 * Lists every backup in ~/.forgeclaw/harness-backups/ ordered by createdAt
 * descending (most recent first). Returns [] if the dir does not exist.
 *
 * Reads metadata.json when present; falls back to parsing the dir name +
 * mtime when missing or corrupt.
 *
 * @param forgeclawDir Optional override for the forgeclaw base dir (tests).
 */
export function listBackups(forgeclawDir?: string): BackupInfo[] {
  const backupsDir = getBackupsDir(forgeclawDir)
  if (!existsSync(backupsDir)) return []

  const out: BackupInfo[] = []
  const entries = readdirSync(backupsDir, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const dirPath = join(backupsDir, entry.name)
    let createdAt: Date
    let reason: string | undefined

    const metadataPath = join(dirPath, 'metadata.json')
    if (existsSync(metadataPath)) {
      try {
        const parsed = JSON.parse(readFileSync(metadataPath, 'utf-8')) as Partial<BackupMetadata>
        if (parsed.createdAt) {
          createdAt = new Date(parsed.createdAt)
        } else {
          createdAt = statSync(dirPath).mtime
        }
        reason = parsed.reason
      } catch {
        createdAt = statSync(dirPath).mtime
      }
    } else {
      createdAt = statSync(dirPath).mtime
    }

    // Guard against invalid Date (e.g. metadata.json corrupted).
    if (Number.isNaN(createdAt.getTime())) {
      createdAt = statSync(dirPath).mtime
    }

    const { sizeBytes, fileCount } = calculateDirSize(dirPath)
    out.push({
      id: entry.name,
      path: dirPath,
      createdAt,
      sizeBytes,
      fileCount,
    })
    // reason is intentionally not exposed on BackupInfo today — if surfaced
    // later, add a field and propagate here.
    void reason
  }

  out.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  return out
}

/**
 * Restores a backup by ID. Before overwriting the harness, creates a
 * `pre-restore-<id>` backup of the current state so the operation is safe
 * to undo.
 *
 * The restored harness does NOT contain the `metadata.json` — it is pruned
 * so the harness itself stays clean.
 *
 * @param id            Backup id (dir name under harness-backups/).
 * @param forgeclawDir  Optional override for the forgeclaw base dir (tests).
 */
export function restoreBackup(id: string, forgeclawDir?: string): void {
  const backupsDir = getBackupsDir(forgeclawDir)
  const src = join(backupsDir, id)
  if (!existsSync(src)) {
    throw new Error(`Backup not found: ${id}`)
  }
  // Safety net: snapshot current state BEFORE restoring.
  try {
    createBackup(`pre-restore-${id}`, forgeclawDir)
  } catch (err) {
    // If harness dir doesn't exist yet, pre-restore backup is not possible;
    // that's fine — continue with the restore.
    const msg = (err as Error).message
    if (!msg.includes('Harness dir does not exist')) throw err
  }

  const harnessDir = getHarnessDir(forgeclawDir)
  rmSync(harnessDir, { recursive: true, force: true })
  cpSync(src, harnessDir, { recursive: true })
  // Prune metadata.json from the restored harness (backup-only artifact).
  const leakedMetadata = join(harnessDir, 'metadata.json')
  if (existsSync(leakedMetadata)) {
    rmSync(leakedMetadata, { force: true })
  }
}
