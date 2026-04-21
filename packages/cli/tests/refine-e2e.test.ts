/**
 * Fase 28-03 Task 2: end-to-end test of `forgeclaw refine` (default mode).
 *
 * Covers:
 *  1. Backup is created BEFORE the interviewer runs.
 *  2. Interviewer -> applyDiff happens when the user confirms.
 *  3. User rejecting the confirm leaves disk untouched (but backup stays).
 *  4. Recompile is invoked (gated off in tests via forgeclawDir override).
 *
 * Isolation strategy:
 *  - Pass `{ forgeclawDir, terminal: true }` to refine(). The dir override
 *    bypasses the cached `homedir()` (see STATE.md [28-01] deviation #3),
 *    and `terminal: true` skips the dashboard probe so the test does not
 *    accidentally delegate to a running dev server.
 *  - Mock `@forgeclaw/core`'s Interviewer via bun:test `mock.module` so no
 *    actual Claude subprocess is spawned.
 */

import { test, expect, beforeEach, afterEach, mock } from 'bun:test'
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
  readdirSync,
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import * as realCore from '@forgeclaw/core'
import {
  MockInterviewer,
  clearMockInterviewerScript,
  setMockInterviewerScript,
  doneDiffForFile,
  askingResponse,
  abortedResponse,
} from './fixtures/mock-interviewer'
import { createScriptedIO, hasLog } from './fixtures/test-io'

let tmp: string
let forgeclawDir: string

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'fc-refine-e2e-'))
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
    writeFileSync(
      join(forgeclawDir, 'harness', f),
      `# ${f} initial content\n`,
    )
  }

  // Mock the Interviewer so no Claude CLI is invoked. Re-use the real
  // module captured at test-file import time (before the mock was installed)
  // so we don't hit a recursive mock lookup when we go `require('@forgeclaw/core')`.
  mock.module('@forgeclaw/core', () => ({
    ...(realCore as Record<string, unknown>),
    Interviewer: MockInterviewer,
  }))
})

afterEach(() => {
  mock.restore()
  clearMockInterviewerScript()
  rmSync(tmp, { recursive: true, force: true })
})

test('refine default: backup + applies diff + logs success when user approves', async () => {
  // 1 ask -> 1 done. User answers the question then approves the apply.
  setMockInterviewerScript([
    askingResponse('Qual seu nome?'),
    doneDiffForFile('USER.md', 'E2E default apply marker'),
  ])

  const { refine } = await import('../src/commands/refine')
  const io = createScriptedIO({
    texts: ['Ada'], // answer to the interviewer's question
    confirms: [true], // approve applying the diff
  })

  await refine({ forgeclawDir, terminal: true }, io)

  // 1. Backup was created before applying
  const backupsDir = join(forgeclawDir, 'harness-backups')
  expect(existsSync(backupsDir)).toBe(true)
  const backups = readdirSync(backupsDir)
  expect(backups.length).toBeGreaterThanOrEqual(1)

  // 2. USER.md got the appended content from the scripted diff
  const user = readFileSync(
    join(forgeclawDir, 'harness', 'USER.md'),
    'utf-8',
  )
  expect(user).toContain('E2E default apply marker')

  // 3. Other files untouched
  const soul = readFileSync(
    join(forgeclawDir, 'harness', 'SOUL.md'),
    'utf-8',
  )
  expect(soul).toBe('# SOUL.md initial content\n')

  // 4. Success log emitted (applyDiff reported appliedFiles)
  expect(hasLog(io, 'success', /Aplicado/)).toBe(true)

  // 5. outro was called exactly once (flow terminated normally)
  expect(io.outros.length).toBe(1)
  expect(io.outros[0]).toContain('Rollback')
})

test('refine default: user rejects confirm -> diff NOT applied but backup preserved', async () => {
  setMockInterviewerScript([
    askingResponse('Qual sua empresa?'),
    doneDiffForFile('USER.md', 'This should NOT be applied'),
  ])

  const { refine } = await import('../src/commands/refine')
  const io = createScriptedIO({
    texts: ['Acme'],
    confirms: [false], // reject
  })

  await refine({ forgeclawDir, terminal: true }, io)

  // USER.md remains pristine
  const user = readFileSync(
    join(forgeclawDir, 'harness', 'USER.md'),
    'utf-8',
  )
  expect(user).toBe('# USER.md initial content\n')

  // Backup WAS still created (invariant: backup before we even ask to apply)
  const backupsDir = join(forgeclawDir, 'harness-backups')
  expect(existsSync(backupsDir)).toBe(true)
  const backups = readdirSync(backupsDir)
  expect(backups.length).toBeGreaterThanOrEqual(1)

  // Outro mentions abort
  expect(io.outros.length).toBe(1)
  expect(io.outros[0]).toContain('Abortado')
})

test('refine default: empty answer (just Enter) submits placeholder text to interviewer', async () => {
  setMockInterviewerScript([
    askingResponse('Tem algo a dizer?'),
    doneDiffForFile('USER.md', 'empty-answer path ran'),
  ])

  const { refine } = await import('../src/commands/refine')
  const io = createScriptedIO({
    texts: [''], // empty answer -> should be coerced to '(sem resposta)'
    confirms: [true],
  })

  await refine({ forgeclawDir, terminal: true }, io)

  const user = readFileSync(
    join(forgeclawDir, 'harness', 'USER.md'),
    'utf-8',
  )
  expect(user).toContain('empty-answer path ran')
})

test('refine default: interviewer aborts -> no diff applied, warn logged', async () => {
  setMockInterviewerScript([abortedResponse('out of budget')])

  const { refine } = await import('../src/commands/refine')
  const io = createScriptedIO({})

  await refine({ forgeclawDir, terminal: true }, io)

  // No change to harness
  const user = readFileSync(
    join(forgeclawDir, 'harness', 'USER.md'),
    'utf-8',
  )
  expect(user).toBe('# USER.md initial content\n')

  // Abort log
  expect(hasLog(io, 'warn', /abortada/)).toBe(true)

  // But backup still exists
  const backupsDir = join(forgeclawDir, 'harness-backups')
  expect(existsSync(backupsDir)).toBe(true)
})

test('refine default: interviewer emits done with empty diff -> info logged, no apply', async () => {
  setMockInterviewerScript([
    {
      status: 'done',
      summary: 'nothing to change',
      harnessDiff: { diffs: [], summary: 'nothing to change' },
    },
  ])

  const { refine } = await import('../src/commands/refine')
  const io = createScriptedIO({})

  await refine({ forgeclawDir, terminal: true }, io)

  expect(hasLog(io, 'info', /sem mudancas propostas/)).toBe(true)

  // USER.md untouched
  const user = readFileSync(
    join(forgeclawDir, 'harness', 'USER.md'),
    'utf-8',
  )
  expect(user).toBe('# USER.md initial content\n')
})

test('refine default: archetype missing in config -> error + exit', async () => {
  // Wipe the config archetype field
  writeFileSync(
    join(forgeclawDir, 'forgeclaw.config.json'),
    JSON.stringify({ botToken: 'test', allowedUsers: [1] }),
  )

  const { refine } = await import('../src/commands/refine')
  const io = createScriptedIO({})

  // We expect refine() to call process.exit(1). Wrap and capture.
  const originalExit = process.exit
  let exitCode: number | undefined
  // @ts-expect-error — test override
  process.exit = ((code?: number) => {
    exitCode = code ?? 0
    throw new Error('__PROCESS_EXIT__')
  }) as typeof process.exit

  try {
    await refine({ forgeclawDir, terminal: true }, io)
  } catch (err) {
    // process.exit override throws to unwind
    if ((err as Error).message !== '__PROCESS_EXIT__') throw err
  } finally {
    process.exit = originalExit
  }

  expect(exitCode).toBe(1)
  expect(hasLog(io, 'error', /Archetype not set/)).toBe(true)
})
