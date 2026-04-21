/**
 * Fase 28-03 Task 5: `forgeclaw refine --rollback` test.
 *
 * Covers:
 *  1. List empty backups -> warn + early return
 *  2. Single backup -> restores content, creates pre-restore-* safety backup
 *  3. Multiple backups -> user picks v1, state is restored to v1 regardless
 *     of intermediate versions
 *  4. User rejects the final confirm -> no restore happens
 *  5. Restored harness does NOT contain metadata.json (pruned during restore)
 *
 * Rollback does NOT invoke the Interviewer, so we skip mock.module here.
 */

import { test, expect, beforeEach, afterEach } from 'bun:test'
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  existsSync,
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createBackup } from '@forgeclaw/core'
import { createScriptedIO, hasLog } from './fixtures/test-io'

let tmp: string
let forgeclawDir: string

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'fc-refine-rollback-'))
  forgeclawDir = join(tmp, '.forgeclaw')
  mkdirSync(join(forgeclawDir, 'harness'), { recursive: true })
  writeFileSync(
    join(forgeclawDir, 'forgeclaw.config.json'),
    JSON.stringify({
      botToken: 'test',
      allowedUsers: [1],
      archetype: 'generic',
    }),
  )
  for (const f of [
    'SOUL.md',
    'USER.md',
    'AGENTS.md',
    'TOOLS.md',
    'MEMORY.md',
    'STYLE.md',
    'HEARTBEAT.md',
  ]) {
    writeFileSync(join(forgeclawDir, 'harness', f), `# ${f} v1\n`)
  }
})

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true })
})

test('--rollback: no backups available -> warn log + no mutation', async () => {
  const { refine } = await import('../src/commands/refine')
  const io = createScriptedIO({})

  await refine({ forgeclawDir, terminal: true, rollback: true }, io)

  // Warn log about no backups
  expect(hasLog(io, 'warn', /Nenhum backup/)).toBe(true)

  // Harness files still exactly as initialized
  for (const f of ['SOUL.md', 'USER.md']) {
    expect(
      readFileSync(join(forgeclawDir, 'harness', f), 'utf-8'),
    ).toBe(`# ${f} v1\n`)
  }

  // Backups dir either missing or empty
  const backupsDir = join(forgeclawDir, 'harness-backups')
  if (existsSync(backupsDir)) {
    expect(readdirSync(backupsDir)).toEqual([])
  }
})

test('--rollback: single backup -> restores content + creates pre-restore safety', async () => {
  // Snapshot v1 state
  const b1 = createBackup('state-v1', forgeclawDir)

  // Mutate harness past v1
  writeFileSync(join(forgeclawDir, 'harness', 'SOUL.md'), '# SOUL v999\n')
  writeFileSync(join(forgeclawDir, 'harness', 'USER.md'), '# USER v999\n')

  const { refine } = await import('../src/commands/refine')
  const io = createScriptedIO({
    selects: [b1.id],
    confirms: [true],
  })

  await refine({ forgeclawDir, terminal: true, rollback: true }, io)

  // Content matches v1
  expect(
    readFileSync(join(forgeclawDir, 'harness', 'SOUL.md'), 'utf-8'),
  ).toBe('# SOUL.md v1\n')
  expect(
    readFileSync(join(forgeclawDir, 'harness', 'USER.md'), 'utf-8'),
  ).toBe('# USER.md v1\n')

  // Pre-restore backup exists (captures the v999 state before we restored)
  const backupsDir = join(forgeclawDir, 'harness-backups')
  const allBackups = readdirSync(backupsDir)
  const preRestore = allBackups.filter((id) =>
    id.startsWith('pre-restore-'),
  )
  expect(preRestore.length).toBeGreaterThanOrEqual(1)

  // Reading any pre-restore backup file gives the v999 content that was live
  // at the moment we invoked rollback.
  const preRestoreDir = join(backupsDir, preRestore[0])
  const preRestoreSoul = readFileSync(
    join(preRestoreDir, 'SOUL.md'),
    'utf-8',
  )
  expect(preRestoreSoul).toBe('# SOUL v999\n')
})

test('--rollback: user rejects final confirm -> NO restore (harness stays modified)', async () => {
  const b1 = createBackup('would-be-target', forgeclawDir)

  writeFileSync(
    join(forgeclawDir, 'harness', 'SOUL.md'),
    '# SOUL post-backup modified\n',
  )

  const { refine } = await import('../src/commands/refine')
  const io = createScriptedIO({
    selects: [b1.id],
    confirms: [false], // reject restore
  })

  await refine({ forgeclawDir, terminal: true, rollback: true }, io)

  // Harness SOUL remains modified (no restore happened)
  expect(
    readFileSync(join(forgeclawDir, 'harness', 'SOUL.md'), 'utf-8'),
  ).toBe('# SOUL post-backup modified\n')

  // No pre-restore backup was created (we never called restoreBackup)
  const backupsDir = join(forgeclawDir, 'harness-backups')
  const ids = readdirSync(backupsDir)
  const preRestore = ids.filter((id) => id.startsWith('pre-restore-'))
  expect(preRestore.length).toBe(0)
})

test('--rollback: restored harness does not leak metadata.json into harness/', async () => {
  const b1 = createBackup('with-metadata', forgeclawDir)

  // Confirm the backup DOES have metadata.json
  expect(
    existsSync(join(forgeclawDir, 'harness-backups', b1.id, 'metadata.json')),
  ).toBe(true)

  writeFileSync(join(forgeclawDir, 'harness', 'SOUL.md'), '# SOUL dirty\n')

  const { refine } = await import('../src/commands/refine')
  const io = createScriptedIO({
    selects: [b1.id],
    confirms: [true],
  })

  await refine({ forgeclawDir, terminal: true, rollback: true }, io)

  // After restore, harness/ should NOT contain metadata.json
  const harnessContents = readdirSync(join(forgeclawDir, 'harness'))
  expect(harnessContents).not.toContain('metadata.json')
  // But should contain the expected harness files
  expect(harnessContents).toContain('SOUL.md')
  expect(harnessContents).toContain('USER.md')
})

test('--rollback: multiple backups, user picks first one, restore matches that version', async () => {
  // v1 baseline (beforeEach)
  const b1 = createBackup('state-v1', forgeclawDir)

  // mutate -> v2
  await Bun.sleep(1100) // ensure ts-based backup IDs differ
  writeFileSync(join(forgeclawDir, 'harness', 'SOUL.md'), '# SOUL v2\n')
  createBackup('state-v2', forgeclawDir)

  // mutate -> v3 (live)
  await Bun.sleep(1100)
  writeFileSync(join(forgeclawDir, 'harness', 'SOUL.md'), '# SOUL v3\n')

  const { refine } = await import('../src/commands/refine')
  // Pick v1
  const io = createScriptedIO({
    selects: [b1.id],
    confirms: [true],
  })

  await refine({ forgeclawDir, terminal: true, rollback: true }, io)

  // Live SOUL.md now matches v1
  expect(
    readFileSync(join(forgeclawDir, 'harness', 'SOUL.md'), 'utf-8'),
  ).toBe('# SOUL.md v1\n')

  // Pre-restore backup captured v3 (the state we had right before restore)
  const backupsDir = join(forgeclawDir, 'harness-backups')
  const preRestore = readdirSync(backupsDir).filter((id) =>
    id.startsWith('pre-restore-'),
  )
  expect(preRestore.length).toBeGreaterThanOrEqual(1)
  const preSoul = readFileSync(
    join(backupsDir, preRestore[0], 'SOUL.md'),
    'utf-8',
  )
  expect(preSoul).toBe('# SOUL v3\n')
})
