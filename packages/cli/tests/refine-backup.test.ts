import { test, expect, beforeEach, afterEach } from 'bun:test'
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  existsSync,
  readdirSync,
  readFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  createBackup,
  listBackups,
  restoreBackup,
} from '../src/utils/refine-backup'

/**
 * We pass an explicit `forgeclawDir` to every function under test rather
 * than relying on `process.env.HOME` — Bun caches `homedir()` at process
 * start, so env mutation is not a reliable isolation mechanism.
 */

let tmp: string
let forgeclawDir: string

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'fc-refine-backup-'))
  forgeclawDir = join(tmp, '.forgeclaw')
  const harnessDir = join(forgeclawDir, 'harness')
  mkdirSync(harnessDir, { recursive: true })
  writeFileSync(join(harnessDir, 'SOUL.md'), '# SOUL v1\n')
  writeFileSync(join(harnessDir, 'USER.md'), '# USER v1\n')
})

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true })
})

test('createBackup creates timestamped dir with metadata', () => {
  const backup = createBackup('test-reason', forgeclawDir)
  expect(backup.id).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/)
  expect(backup.path.startsWith(forgeclawDir)).toBe(true)
  expect(existsSync(backup.path)).toBe(true)
  expect(backup.fileCount).toBeGreaterThanOrEqual(2)
  const metaPath = join(backup.path, 'metadata.json')
  expect(existsSync(metaPath)).toBe(true)
  const meta = JSON.parse(readFileSync(metaPath, 'utf-8')) as {
    id: string
    reason: string
  }
  expect(meta.reason).toBe('test-reason')
})

test('createBackup throws when harness dir absent', () => {
  rmSync(join(forgeclawDir, 'harness'), { recursive: true, force: true })
  expect(() => createBackup('whatever', forgeclawDir)).toThrow(
    /Harness dir does not exist/,
  )
})

test('listBackups returns [] when backups dir absent', () => {
  expect(listBackups(forgeclawDir)).toEqual([])
})

test('listBackups returns sorted by createdAt desc', async () => {
  createBackup('first', forgeclawDir)
  await Bun.sleep(1100)
  createBackup('second', forgeclawDir)
  const list = listBackups(forgeclawDir)
  expect(list.length).toBe(2)
  expect(list[0].createdAt.getTime()).toBeGreaterThan(list[1].createdAt.getTime())
})

test('restoreBackup creates pre-restore backup and restores content', () => {
  const original = createBackup('original', forgeclawDir)
  const harnessDir = join(forgeclawDir, 'harness')
  writeFileSync(join(harnessDir, 'SOUL.md'), '# SOUL v2 (modified)\n')
  restoreBackup(original.id, forgeclawDir)
  const restored = readFileSync(join(harnessDir, 'SOUL.md'), 'utf-8')
  expect(restored).toBe('# SOUL v1\n')
  const list = listBackups(forgeclawDir)
  expect(list.some((b) => b.id.startsWith('pre-restore-'))).toBe(true)
})

test('restoreBackup throws on unknown id', () => {
  expect(() => restoreBackup('does-not-exist', forgeclawDir)).toThrow(
    /Backup not found/,
  )
})

test('restored harness does not contain metadata.json', () => {
  const backup = createBackup('pristine', forgeclawDir)
  const harnessDir = join(forgeclawDir, 'harness')
  writeFileSync(join(harnessDir, 'SOUL.md'), '# modified\n')
  restoreBackup(backup.id, forgeclawDir)
  const entries = readdirSync(harnessDir)
  expect(entries).not.toContain('metadata.json')
  expect(entries).toContain('SOUL.md')
})
