/**
 * Fase 28-03 Task 4: `forgeclaw refine --archetype=<slug>` test.
 *
 * Invariant under test: changing the archetype writes new harness files +
 * updates `config.archetype`, but NEVER touches operational data outside
 * ~/.forgeclaw/harness (db/, memory/, agents/, logs/, sessions).
 *
 * Verified via file mtime comparison before/after — the only safe way to
 * catch "we accidentally wrote the same bytes" bugs.
 *
 * The archetype flow has two confirmation steps (archetype switch + optional
 * refinement interview). This test opts OUT of the refinement interview so
 * we can assert on a clean "templates-only" outcome.
 */

import { test, expect, beforeEach, afterEach, mock } from 'bun:test'
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import * as realCore from '@forgeclaw/core'
import {
  MockInterviewer,
  clearMockInterviewerScript,
} from './fixtures/mock-interviewer'
import { createScriptedIO } from './fixtures/test-io'

let tmp: string
let forgeclawDir: string

// Operational files that refine must NEVER touch, no matter the mode.
const PROTECTED_FILES = [
  'db/forgeclaw.db',
  'memory/MEMORY.md',
  'memory/DAILY/2026-04-21.md',
  'agents/agent1.json',
  'logs/bot.log',
]

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'fc-refine-archetype-'))
  forgeclawDir = join(tmp, '.forgeclaw')
  mkdirSync(join(forgeclawDir, 'harness'), { recursive: true })
  mkdirSync(join(forgeclawDir, 'db'), { recursive: true })
  mkdirSync(join(forgeclawDir, 'memory', 'DAILY'), { recursive: true })
  mkdirSync(join(forgeclawDir, 'agents'), { recursive: true })
  mkdirSync(join(forgeclawDir, 'logs'), { recursive: true })

  // Start as solo-builder with some secrets in the config
  writeFileSync(
    join(forgeclawDir, 'forgeclaw.config.json'),
    JSON.stringify({
      botToken: 'preserved-token',
      allowedUsers: [42],
      archetype: 'solo-builder',
      dashboardToken: 'dashtoken-should-survive',
      groqApiKey: 'gsk_preserve_this',
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
      `# ${f} solo-builder baseline\n`,
    )
  }

  // Protected files with arbitrary pre-existing content
  writeFileSync(
    join(forgeclawDir, 'db', 'forgeclaw.db'),
    'SQLITE-BINARY-STUB-CONTENT',
  )
  writeFileSync(
    join(forgeclawDir, 'memory', 'MEMORY.md'),
    '# Memory entries\n- entry 1\n- entry 2\n',
  )
  writeFileSync(
    join(forgeclawDir, 'memory', 'DAILY', '2026-04-21.md'),
    '# Daily log\n',
  )
  writeFileSync(
    join(forgeclawDir, 'agents', 'agent1.json'),
    '{"name":"preserved-agent"}',
  )
  writeFileSync(
    join(forgeclawDir, 'logs', 'bot.log'),
    '2026-04-21 10:00 info startup\n',
  )

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

function snapshotProtectedMtimes(): Record<string, number> {
  const snap: Record<string, number> = {}
  for (const f of PROTECTED_FILES) {
    snap[f] = statSync(join(forgeclawDir, f)).mtimeMs
  }
  return snap
}

function expectProtectedUntouched(before: Record<string, number>, label: string): void {
  for (const f of PROTECTED_FILES) {
    const path = join(forgeclawDir, f)
    const after = statSync(path).mtimeMs
    expect(after, `${label}: ${f} mtime changed`).toBe(before[f])
  }
}

function expectProtectedContentUntouched(): void {
  expect(
    readFileSync(join(forgeclawDir, 'db/forgeclaw.db'), 'utf-8'),
  ).toBe('SQLITE-BINARY-STUB-CONTENT')
  expect(
    readFileSync(join(forgeclawDir, 'memory/MEMORY.md'), 'utf-8'),
  ).toBe('# Memory entries\n- entry 1\n- entry 2\n')
  expect(
    readFileSync(join(forgeclawDir, 'memory/DAILY/2026-04-21.md'), 'utf-8'),
  ).toBe('# Daily log\n')
  expect(
    readFileSync(join(forgeclawDir, 'agents/agent1.json'), 'utf-8'),
  ).toBe('{"name":"preserved-agent"}')
  expect(
    readFileSync(join(forgeclawDir, 'logs/bot.log'), 'utf-8'),
  ).toBe('2026-04-21 10:00 info startup\n')
}

test('--archetype=generic: changes config + harness, zero impact on db/memory/agents/logs', async () => {
  const { refine } = await import('../src/commands/refine')

  const mtimesBefore = snapshotProtectedMtimes()
  await Bun.sleep(50)

  const io = createScriptedIO({
    confirms: [
      true, // "Continuar?" (proceed with archetype change)
      true, // "Aplicar estas mudancas (etapa 1/2: templates base)?"
      false, // "Rodar entrevista agora pra customizar?" (skip interview)
    ],
  })

  await refine(
    { forgeclawDir, terminal: true, archetype: 'generic' },
    io,
  )

  // 1. config.archetype flipped to generic
  const config = JSON.parse(
    readFileSync(
      join(forgeclawDir, 'forgeclaw.config.json'),
      'utf-8',
    ),
  ) as Record<string, unknown>
  expect(config.archetype).toBe('generic')

  // 2. Secrets and other fields preserved
  expect(config.botToken).toBe('preserved-token')
  expect(config.dashboardToken).toBe('dashtoken-should-survive')
  expect(config.groqApiKey).toBe('gsk_preserve_this')
  expect(config.allowedUsers).toEqual([42])

  // 3. Harness files got overwritten with new archetype content
  //    (we don't assert exact content to avoid coupling to template changes —
  //    just that the old baseline is gone.)
  const soul = readFileSync(
    join(forgeclawDir, 'harness', 'SOUL.md'),
    'utf-8',
  )
  expect(soul).not.toBe('# SOUL.md solo-builder baseline\n')
  expect(soul.length).toBeGreaterThan(0)

  // 4. All 7 harness files now exist and are non-empty
  for (const f of [
    'SOUL.md',
    'USER.md',
    'AGENTS.md',
    'TOOLS.md',
    'MEMORY.md',
    'STYLE.md',
    'HEARTBEAT.md',
  ]) {
    const p = join(forgeclawDir, 'harness', f)
    const content = readFileSync(p, 'utf-8')
    expect(content.length).toBeGreaterThan(0)
  }

  // 5. Backup was created
  const backupsDir = join(forgeclawDir, 'harness-backups')
  const backups = readdirSync(backupsDir)
  expect(backups.length).toBeGreaterThanOrEqual(1)

  // 6. PROTECTED FILES: zero mtime change, zero content change
  expectProtectedUntouched(mtimesBefore, 'archetype change')
  expectProtectedContentUntouched()
})

test('--archetype: user rejects first confirm -> zero disk mutation (no backup either)', async () => {
  // User says "no" to "Continuar?" on the warn step. refine() should return
  // BEFORE the backup and BEFORE setting archetype.
  const { refine } = await import('../src/commands/refine')

  const mtimesBefore = snapshotProtectedMtimes()
  const harnessMtimesBefore: Record<string, number> = {}
  for (const f of ['SOUL.md', 'USER.md', 'AGENTS.md']) {
    harnessMtimesBefore[f] = statSync(
      join(forgeclawDir, 'harness', f),
    ).mtimeMs
  }

  const io = createScriptedIO({
    confirms: [false], // reject at "Continuar?"
  })

  await refine(
    { forgeclawDir, terminal: true, archetype: 'generic' },
    io,
  )

  // Config archetype NOT changed
  const config = JSON.parse(
    readFileSync(
      join(forgeclawDir, 'forgeclaw.config.json'),
      'utf-8',
    ),
  ) as Record<string, unknown>
  expect(config.archetype).toBe('solo-builder')

  // Harness files unchanged
  for (const f of Object.keys(harnessMtimesBefore)) {
    expect(
      readFileSync(join(forgeclawDir, 'harness', f), 'utf-8'),
    ).toBe(`# ${f} solo-builder baseline\n`)
  }

  // Protected files unchanged
  expectProtectedUntouched(mtimesBefore, 'archetype reject early')
  expectProtectedContentUntouched()
})

test('--archetype: identical slug -> templates identical if reused, no confirm needed for no-change path', async () => {
  // Reload solo-builder while we're already solo-builder. loadArchetypeTemplates
  // will produce content similar (but not byte-identical — today's date,
  // placeholders) vs the baseline we seeded. This is a sanity test: the
  // archetype slug IS valid and the flow completes without crashing.
  const { refine } = await import('../src/commands/refine')

  const mtimesBefore = snapshotProtectedMtimes()

  const io = createScriptedIO({
    // Accept the change + templates + skip interview. If templates are
    // identical, flow short-circuits after the first confirm with an "already
    // up to date" info log and we don't need the 2nd/3rd confirms. Pass
    // them anyway — ScriptedIO ignores unconsumed answers.
    confirms: [true, true, false],
  })

  await refine(
    { forgeclawDir, terminal: true, archetype: 'solo-builder' },
    io,
  )

  // Config archetype remains solo-builder
  const config = JSON.parse(
    readFileSync(
      join(forgeclawDir, 'forgeclaw.config.json'),
      'utf-8',
    ),
  ) as Record<string, unknown>
  expect(config.archetype).toBe('solo-builder')

  // Protected files still untouched
  expectProtectedUntouched(mtimesBefore, 'same archetype')
})

test('--archetype invalid slug -> error + exit 1, no mutation', async () => {
  const { refine } = await import('../src/commands/refine')

  const originalExit = process.exit
  let exitCode: number | undefined
  // @ts-expect-error — test override
  process.exit = ((code?: number) => {
    exitCode = code ?? 0
    throw new Error('__PROCESS_EXIT__')
  }) as typeof process.exit

  const io = createScriptedIO({})
  const mtimesBefore = snapshotProtectedMtimes()

  try {
    await refine(
      // @ts-expect-error — deliberately bogus slug
      { forgeclawDir, terminal: true, archetype: 'not-a-real-archetype' },
      io,
    )
  } catch (err) {
    if ((err as Error).message !== '__PROCESS_EXIT__') throw err
  } finally {
    process.exit = originalExit
  }

  expect(exitCode).toBe(1)

  // Config archetype untouched
  const config = JSON.parse(
    readFileSync(
      join(forgeclawDir, 'forgeclaw.config.json'),
      'utf-8',
    ),
  ) as Record<string, unknown>
  expect(config.archetype).toBe('solo-builder')

  // Protected files untouched
  expectProtectedUntouched(mtimesBefore, 'invalid archetype')
  expectProtectedContentUntouched()
})
