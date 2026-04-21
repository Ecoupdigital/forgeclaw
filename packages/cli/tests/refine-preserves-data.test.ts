/**
 * Fase 28-03 Task 6: defensive test — refine NEVER touches operational data.
 *
 * For each refine mode (default / section / reset / archetype change) we
 * snapshot mtimes of protected operational files (db, memory, agents, logs,
 * sessions) BEFORE the flow runs, execute the flow, then assert every
 * protected file's mtime is IDENTICAL after.
 *
 * This is the "critical invariant" guard. Even if a refactor somewhere else
 * accidentally writes through the wrong directory, this test file catches
 * it across all 4 user-facing modes in one place.
 *
 * Rollback is excluded because it operates on harness-backups/ (not on
 * operational data by construction); its dedicated test file already covers
 * the relevant semantics.
 */

import { test, expect, beforeEach, afterEach, mock } from 'bun:test'
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  statSync,
  readFileSync,
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
} from './fixtures/mock-interviewer'
import { createScriptedIO } from './fixtures/test-io'

let tmp: string
let forgeclawDir: string

/**
 * Protected operational files that refine must NEVER touch, regardless of
 * mode. Paths are relative to `forgeclawDir`.
 */
const PROTECTED_FILES: readonly string[] = [
  'db/forgeclaw.db',
  'memory/MEMORY.md',
  'memory/DAILY/2026-04-21.md',
  'memory/projects/INDEX.md',
  'agents/agent1.json',
  'agents/agent2.json',
  'logs/bot.log',
  'logs/cron.log',
  'sessions/session-abc.jsonl',
]

/**
 * Protected content (used to verify no byte-level write happened).
 */
const PROTECTED_CONTENT: Record<string, string> = {
  'db/forgeclaw.db': 'SQLITE-STUB-CONTENT-do-not-touch',
  'memory/MEMORY.md': '# Memory\n- entry 1\n- entry 2\n',
  'memory/DAILY/2026-04-21.md': '# Daily log 2026-04-21\n',
  'memory/projects/INDEX.md': '# Project index\n',
  'agents/agent1.json': '{"id":"a1","name":"protected-agent-1"}',
  'agents/agent2.json': '{"id":"a2","name":"protected-agent-2"}',
  'logs/bot.log': '2026-04-21 08:00 startup\n',
  'logs/cron.log': '2026-04-21 08:05 cron fired\n',
  'sessions/session-abc.jsonl': '{"role":"user","text":"hi"}\n',
}

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'fc-refine-preserve-'))
  forgeclawDir = join(tmp, '.forgeclaw')
  // Harness
  mkdirSync(join(forgeclawDir, 'harness'), { recursive: true })
  // Protected dirs
  mkdirSync(join(forgeclawDir, 'db'), { recursive: true })
  mkdirSync(join(forgeclawDir, 'memory', 'DAILY'), { recursive: true })
  mkdirSync(join(forgeclawDir, 'memory', 'projects'), { recursive: true })
  mkdirSync(join(forgeclawDir, 'agents'), { recursive: true })
  mkdirSync(join(forgeclawDir, 'logs'), { recursive: true })
  mkdirSync(join(forgeclawDir, 'sessions'), { recursive: true })

  // Config with archetype
  writeFileSync(
    join(forgeclawDir, 'forgeclaw.config.json'),
    JSON.stringify({
      botToken: 'test',
      allowedUsers: [1],
      archetype: 'solo-builder',
    }),
  )

  // Harness baseline
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
      `# ${f} baseline\n`,
    )
  }

  // Protected files
  for (const relPath of PROTECTED_FILES) {
    writeFileSync(join(forgeclawDir, relPath), PROTECTED_CONTENT[relPath])
  }

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

function snapshotMtimes(): Record<string, number> {
  const snap: Record<string, number> = {}
  for (const f of PROTECTED_FILES) {
    snap[f] = statSync(join(forgeclawDir, f)).mtimeMs
  }
  return snap
}

function expectNoProtectedChanges(
  before: Record<string, number>,
  label: string,
): void {
  for (const f of PROTECTED_FILES) {
    const path = join(forgeclawDir, f)
    const after = statSync(path).mtimeMs
    expect(
      after,
      `[${label}] ${f}: mtime changed from ${before[f]} to ${after}`,
    ).toBe(before[f])
    // Content check too — belt-and-suspenders
    expect(
      readFileSync(path, 'utf-8'),
      `[${label}] ${f}: content changed`,
    ).toBe(PROTECTED_CONTENT[f])
  }
}

test('refine default does NOT touch db/memory/agents/logs/sessions', async () => {
  setMockInterviewerScript([
    askingResponse('Conte algo:'),
    doneDiffForFile('SOUL.md', 'default mode marker'),
  ])

  const { refine } = await import('../src/commands/refine')
  const io = createScriptedIO({
    texts: ['resposta'],
    confirms: [true],
  })

  const before = snapshotMtimes()
  await Bun.sleep(50)
  await refine({ forgeclawDir, terminal: true }, io)

  expectNoProtectedChanges(before, 'default')

  // Sanity: harness SOUL.md DID change (so we know the flow actually ran)
  const soul = readFileSync(
    join(forgeclawDir, 'harness', 'SOUL.md'),
    'utf-8',
  )
  expect(soul).toContain('default mode marker')
})

test('refine --section=USER does NOT touch any protected file', async () => {
  setMockInterviewerScript([
    askingResponse('Seu nome?'),
    doneDiffForFile('USER.md', 'section marker'),
  ])

  const { refine } = await import('../src/commands/refine')
  const io = createScriptedIO({
    texts: ['Ada'],
    confirms: [true],
  })

  const before = snapshotMtimes()
  await Bun.sleep(50)
  await refine({ forgeclawDir, terminal: true, section: 'USER' }, io)

  expectNoProtectedChanges(before, 'section=USER')

  // Sanity: USER.md got the marker
  expect(
    readFileSync(join(forgeclawDir, 'harness', 'USER.md'), 'utf-8'),
  ).toContain('section marker')
})

test('refine --reset does NOT touch any protected file', async () => {
  const { refine } = await import('../src/commands/refine')
  const io = createScriptedIO({
    texts: ['solo-builder'], // ack (must match current archetype slug)
    confirms: [
      false, // "Rodar entrevista agora?" -> skip
    ],
  })

  const before = snapshotMtimes()
  await Bun.sleep(50)
  await refine({ forgeclawDir, terminal: true, reset: true }, io)

  expectNoProtectedChanges(before, 'reset')

  // Sanity: harness was overwritten (no longer contains 'baseline')
  const soul = readFileSync(
    join(forgeclawDir, 'harness', 'SOUL.md'),
    'utf-8',
  )
  expect(soul).not.toBe('# SOUL.md baseline\n')
})

test('refine --archetype=generic does NOT touch any protected file', async () => {
  const { refine } = await import('../src/commands/refine')
  const io = createScriptedIO({
    confirms: [
      true, // "Continuar?"
      true, // "Aplicar etapa 1/2?"
      false, // "Rodar entrevista?" -> skip stage 2
    ],
  })

  const before = snapshotMtimes()
  await Bun.sleep(50)
  await refine(
    { forgeclawDir, terminal: true, archetype: 'generic' },
    io,
  )

  expectNoProtectedChanges(before, 'archetype=generic')

  // Sanity: config.archetype flipped
  const config = JSON.parse(
    readFileSync(
      join(forgeclawDir, 'forgeclaw.config.json'),
      'utf-8',
    ),
  ) as Record<string, unknown>
  expect(config.archetype).toBe('generic')
})

test('refine default with user rejecting confirm does NOT touch protected files', async () => {
  setMockInterviewerScript([
    askingResponse('Ping?'),
    doneDiffForFile('SOUL.md', 'never-applied'),
  ])

  const { refine } = await import('../src/commands/refine')
  const io = createScriptedIO({
    texts: ['pong'],
    confirms: [false], // reject apply
  })

  const before = snapshotMtimes()
  await Bun.sleep(50)
  await refine({ forgeclawDir, terminal: true }, io)

  expectNoProtectedChanges(before, 'default-reject')

  // Sanity: SOUL.md not modified (reject path)
  const soul = readFileSync(
    join(forgeclawDir, 'harness', 'SOUL.md'),
    'utf-8',
  )
  expect(soul).toBe('# SOUL.md baseline\n')
})
