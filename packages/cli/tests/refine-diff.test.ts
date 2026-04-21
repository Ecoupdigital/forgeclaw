import { test, expect } from 'bun:test'
import {
  hasAnyChanges,
  hasAnyRawChanges,
  renderRawDiff,
  renderFileDiff,
} from '../src/utils/refine-diff'
import type { HarnessDiff } from '@forgeclaw/core'

test('hasAnyChanges returns false when diffs array empty', () => {
  const diff: HarnessDiff = { diffs: [], summary: 'noop' }
  expect(hasAnyChanges(diff)).toBe(false)
})

test('hasAnyChanges returns false when every FileDiff has no ops', () => {
  const diff: HarnessDiff = {
    diffs: [{ file: 'SOUL.md', ops: [] }],
    summary: 'empty ops',
  }
  expect(hasAnyChanges(diff)).toBe(false)
})

test('hasAnyChanges returns true when at least one op present', () => {
  const diff: HarnessDiff = {
    diffs: [
      { file: 'SOUL.md', ops: [] },
      { file: 'USER.md', ops: [{ op: 'append', content: 'something' }] },
    ],
    summary: 'one change',
  }
  expect(hasAnyChanges(diff)).toBe(true)
})

test('hasAnyRawChanges detects changes in raw diffs', () => {
  expect(
    hasAnyRawChanges([
      { file: 'SOUL.md', oldContent: 'x', newContent: 'x', changed: false },
    ]),
  ).toBe(false)
  expect(
    hasAnyRawChanges([
      { file: 'SOUL.md', oldContent: 'x', newContent: 'x', changed: false },
      { file: 'USER.md', oldContent: 'a', newContent: 'b', changed: true },
    ]),
  ).toBe(true)
})

test('renderFileDiff returns unchanged marker when contents equal', () => {
  const out = renderFileDiff('SOUL.md', 'same\n', 'same\n')
  expect(out).toContain('unchanged')
})

test('renderFileDiff includes filename and +/- markers', () => {
  const out = renderFileDiff(
    'USER.md',
    'line one\nline two\n',
    'line one\nline two-modified\n',
  )
  expect(out).toContain('USER.md')
  // LCS will mark one line as remove and one as add
  expect(out).toContain('- line two')
  expect(out).toContain('+ line two-modified')
})

test('renderRawDiff aggregates multiple file diffs', () => {
  const out = renderRawDiff([
    { file: 'SOUL.md', oldContent: 'a\n', newContent: 'a\n', changed: false },
    { file: 'USER.md', oldContent: 'old\n', newContent: 'new\n', changed: true },
  ])
  expect(out).toContain('USER.md')
  expect(out).toContain('old')
  expect(out).toContain('new')
  expect(out).toContain('1 file(s) will change.')
})

test('renderRawDiff reports 0 changes when everything equal', () => {
  const out = renderRawDiff([
    { file: 'SOUL.md', oldContent: 'a\n', newContent: 'a\n', changed: false },
  ])
  expect(out).toContain('0 file(s) will change.')
})
