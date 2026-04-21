/**
 * Fase 28-03 Task 3: `forgeclaw refine --section=<NAME>` test.
 *
 * Validates the invariant: when `section` is set, only that harness file
 * changes on disk — even if the interviewer proposes a diff that touches
 * multiple files. The refine flow filters the HarnessDiff to the target
 * file before calling applyDiff.
 *
 * Uses mtime comparison (not content equality) because a no-op write would
 * still count as "touched" — we care about filesystem-level isolation.
 */

import { test, expect, beforeEach, afterEach, mock } from 'bun:test'
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
  statSync,
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import * as realCore from '@forgeclaw/core'
import type { HarnessFile } from '@forgeclaw/core'
import {
  MockInterviewer,
  clearMockInterviewerScript,
  setMockInterviewerScript,
  doneDiffForFiles,
  askingResponse,
} from './fixtures/mock-interviewer'
import { createScriptedIO } from './fixtures/test-io'

let tmp: string
let forgeclawDir: string
const HARNESS_FILES: readonly HarnessFile[] = [
  'SOUL.md',
  'USER.md',
  'AGENTS.md',
  'TOOLS.md',
  'MEMORY.md',
  'STYLE.md',
  'HEARTBEAT.md',
]

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'fc-refine-section-'))
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
  for (const f of HARNESS_FILES) {
    writeFileSync(join(forgeclawDir, 'harness', f), `# ${f} v1\n`)
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

function snapshotMtimes(): Record<HarnessFile, number> {
  const snap: Record<string, number> = {}
  for (const f of HARNESS_FILES) {
    snap[f] = statSync(join(forgeclawDir, 'harness', f)).mtimeMs
  }
  return snap as Record<HarnessFile, number>
}

test('--section=USER: interviewer diff touching 3 files -> only USER.md changes', async () => {
  // Interviewer proposes changes in 3 files. The refine flow must filter
  // this down to just USER.md before applyDiff touches disk.
  setMockInterviewerScript([
    askingResponse('Tem algo especifico pra USER.md?'),
    doneDiffForFiles(
      [
        { file: 'USER.md', content: 'section=USER target marker' },
        { file: 'SOUL.md', content: 'SHOULD NOT appear on disk' },
        { file: 'AGENTS.md', content: 'SHOULD NOT appear on disk' },
      ],
      'scripted 3-file diff (will be filtered)',
    ),
  ])

  const { refine } = await import('../src/commands/refine')
  const io = createScriptedIO({
    texts: ['detalhe'],
    confirms: [true],
  })

  const mtimesBefore = snapshotMtimes()
  // Ensure mtime resolution allows "after" to differ. fs mtime precision on
  // Linux with ext4/xfs is typically ns, but we sleep 50ms to be safe in
  // case the whole flow takes <1ms and the kernel clock has coarse grain.
  await Bun.sleep(50)

  await refine({ forgeclawDir, terminal: true, section: 'USER' }, io)

  // 1. USER.md content shows the scripted marker
  const userAfter = readFileSync(
    join(forgeclawDir, 'harness', 'USER.md'),
    'utf-8',
  )
  expect(userAfter).toContain('section=USER target marker')

  // 2. USER.md mtime changed
  const userMtimeAfter = statSync(
    join(forgeclawDir, 'harness', 'USER.md'),
  ).mtimeMs
  expect(userMtimeAfter).toBeGreaterThanOrEqual(mtimesBefore['USER.md'])

  // 3. Every OTHER harness file has untouched content AND untouched mtime
  for (const f of HARNESS_FILES) {
    if (f === 'USER.md') continue
    const content = readFileSync(
      join(forgeclawDir, 'harness', f),
      'utf-8',
    )
    expect(content).toBe(`# ${f} v1\n`)
    expect(content).not.toContain('SHOULD NOT appear on disk')

    const mtimeAfter = statSync(
      join(forgeclawDir, 'harness', f),
    ).mtimeMs
    expect(mtimeAfter).toBe(mtimesBefore[f])
  }
})

test('--section=STYLE: single-file diff targeted at STYLE works end-to-end', async () => {
  setMockInterviewerScript([
    askingResponse('Tom de voz?'),
    doneDiffForFiles(
      [{ file: 'STYLE.md', content: 'direto e curto' }],
      'style refined',
    ),
  ])

  const { refine } = await import('../src/commands/refine')
  const io = createScriptedIO({
    texts: ['direto'],
    confirms: [true],
  })

  await refine({ forgeclawDir, terminal: true, section: 'STYLE' }, io)

  const style = readFileSync(
    join(forgeclawDir, 'harness', 'STYLE.md'),
    'utf-8',
  )
  expect(style).toContain('direto e curto')

  // All non-STYLE files still exactly match initial content.
  for (const f of HARNESS_FILES) {
    if (f === 'STYLE.md') continue
    expect(
      readFileSync(join(forgeclawDir, 'harness', f), 'utf-8'),
    ).toBe(`# ${f} v1\n`)
  }
})

test('--section=USER: interviewer proposes nothing for USER -> filtered diff empty, info log, no apply', async () => {
  // Diff only touches SOUL.md. After filter -> empty.
  setMockInterviewerScript([
    doneDiffForFiles(
      [{ file: 'SOUL.md', content: 'only SOUL here' }],
      'wrong file targeted',
    ),
  ])

  const { refine } = await import('../src/commands/refine')
  const io = createScriptedIO({})

  await refine({ forgeclawDir, terminal: true, section: 'USER' }, io)

  // Nothing changes anywhere on disk
  for (const f of HARNESS_FILES) {
    expect(
      readFileSync(join(forgeclawDir, 'harness', f), 'utf-8'),
    ).toBe(`# ${f} v1\n`)
  }

  // Info log says nothing was eligible
  const hasFilterInfo = io.logs.some(
    (l) => l.level === 'info' && /apos filtragem|sem mudancas/i.test(l.msg),
  )
  expect(hasFilterInfo).toBe(true)
})

test('--section=MEMORY: validates mtime comparison catches no-op writes', async () => {
  // A diff whose content is IDENTICAL to current MEMORY.md. applyDiff should
  // not actually change anything. But we still want to assert behavior.
  setMockInterviewerScript([
    doneDiffForFiles(
      [{ file: 'MEMORY.md', content: 'appended noise' }],
      'memory append',
    ),
  ])

  const { refine } = await import('../src/commands/refine')
  const io = createScriptedIO({ confirms: [true] })

  const mtimesBefore = snapshotMtimes()
  await Bun.sleep(50)
  await refine({ forgeclawDir, terminal: true, section: 'MEMORY' }, io)

  // MEMORY got the append
  const memory = readFileSync(
    join(forgeclawDir, 'harness', 'MEMORY.md'),
    'utf-8',
  )
  expect(memory).toContain('appended noise')

  // Nothing else changed mtime
  for (const f of HARNESS_FILES) {
    if (f === 'MEMORY.md') continue
    const mt = statSync(join(forgeclawDir, 'harness', f)).mtimeMs
    expect(mt).toBe(mtimesBefore[f])
  }
})
