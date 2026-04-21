import { test, expect, beforeEach, afterEach } from 'bun:test'
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
  statSync,
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir, platform } from 'node:os'
import {
  getCurrentArchetype,
  setArchetype,
  readCurrentHarness,
  loadArchetypeTemplates,
  ARCHETYPES,
  ARCHETYPE_LABELS,
} from '../src/utils/refine-archetype'

let tmp: string
let forgeclawDir: string

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'fc-refine-archetype-'))
  forgeclawDir = join(tmp, '.forgeclaw')
  mkdirSync(forgeclawDir, { recursive: true })
})

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true })
})

test('getCurrentArchetype returns null when no config', () => {
  expect(getCurrentArchetype(forgeclawDir)).toBeNull()
})

test('getCurrentArchetype reads archetype from config', () => {
  writeFileSync(
    join(forgeclawDir, 'forgeclaw.config.json'),
    JSON.stringify({ botToken: 'x', allowedUsers: [1], archetype: 'content-creator' }),
  )
  expect(getCurrentArchetype(forgeclawDir)).toBe('content-creator')
})

test('getCurrentArchetype returns null for invalid archetype value', () => {
  writeFileSync(
    join(forgeclawDir, 'forgeclaw.config.json'),
    JSON.stringify({ botToken: 'x', allowedUsers: [1], archetype: 'bogus' }),
  )
  expect(getCurrentArchetype(forgeclawDir)).toBeNull()
})

test('getCurrentArchetype returns null when config is unparseable', () => {
  writeFileSync(join(forgeclawDir, 'forgeclaw.config.json'), '{ corrupt json')
  expect(getCurrentArchetype(forgeclawDir)).toBeNull()
})

test('setArchetype writes to config preserving other fields and perms', () => {
  const cfgPath = join(forgeclawDir, 'forgeclaw.config.json')
  writeFileSync(cfgPath, JSON.stringify({ botToken: 'preserved', allowedUsers: [42] }))
  setArchetype('solo-builder', forgeclawDir)
  const saved = JSON.parse(readFileSync(cfgPath, 'utf-8')) as Record<string, unknown>
  expect(saved.archetype).toBe('solo-builder')
  expect(saved.botToken).toBe('preserved')
  expect(saved.allowedUsers).toEqual([42])
  if (platform() !== 'win32') {
    const mode = statSync(cfgPath).mode & 0o777
    expect(mode).toBe(0o600)
  }
})

test('setArchetype rejects invalid slug', () => {
  const cfgPath = join(forgeclawDir, 'forgeclaw.config.json')
  writeFileSync(cfgPath, JSON.stringify({}))
  // @ts-expect-error — deliberately passing bogus slug to exercise runtime guard
  expect(() => setArchetype('bogus', forgeclawDir)).toThrow(/Invalid archetype/)
})

test('setArchetype throws when config missing', () => {
  expect(() => setArchetype('generic', forgeclawDir)).toThrow(/Config not found/)
})

test('readCurrentHarness returns empty strings for missing files', () => {
  const result = readCurrentHarness(forgeclawDir)
  expect(result['SOUL.md']).toBe('')
  expect(result['USER.md']).toBe('')
  expect(result['HEARTBEAT.md']).toBe('')
})

test('readCurrentHarness reads files that exist', () => {
  const harnessDir = join(forgeclawDir, 'harness')
  mkdirSync(harnessDir, { recursive: true })
  writeFileSync(join(harnessDir, 'USER.md'), '# Real user content\n')
  const result = readCurrentHarness(forgeclawDir)
  expect(result['USER.md']).toBe('# Real user content\n')
  expect(result['SOUL.md']).toBe('')
})

test('loadArchetypeTemplates returns all 7 harness files for a valid slug', () => {
  writeFileSync(
    join(forgeclawDir, 'forgeclaw.config.json'),
    JSON.stringify({
      userName: 'Ada',
      company: 'Babbage Labs',
      role: 'Solo Dev',
      workingDir: '/tmp/proj',
    }),
  )
  const tpl = loadArchetypeTemplates('generic', forgeclawDir)
  expect(Object.keys(tpl).sort()).toEqual(
    [
      'AGENTS.md',
      'HEARTBEAT.md',
      'MEMORY.md',
      'SOUL.md',
      'STYLE.md',
      'TOOLS.md',
      'USER.md',
    ].sort(),
  )
  for (const [file, content] of Object.entries(tpl)) {
    expect(content.length).toBeGreaterThan(0)
    expect(typeof content).toBe('string')
    void file
  }
})

test('ARCHETYPE_LABELS covers every ARCHETYPES slug', () => {
  for (const slug of ARCHETYPES) {
    expect(typeof ARCHETYPE_LABELS[slug]).toBe('string')
    expect(ARCHETYPE_LABELS[slug].length).toBeGreaterThan(0)
  }
})
