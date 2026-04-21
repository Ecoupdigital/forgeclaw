import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  previewDiff,
  type HarnessDiff,
  type MergeResult,
} from '@forgeclaw/core'

/**
 * Terminal-friendly diff renderer for refine previews.
 *
 * The core `HarnessDiff` shape is `{ diffs: FileDiff[], summary: string }`
 * with surgical DiffOps (append / replace / replace_section / set_placeholder).
 * To show a human-readable before/after we rely on `previewDiff` from core,
 * which computes the final file contents without touching disk.
 *
 * For the archetype-switch path where we compute before/after manually
 * (without going through DiffOps), we also expose `renderRawDiff` which
 * takes explicit `{ file, oldContent, newContent }` records.
 */

const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const GRAY = '\x1b[90m'
const BOLD = '\x1b[1m'
const RESET = '\x1b[0m'

export interface RawFileDiff {
  file: string
  oldContent: string
  newContent: string
  /** true when oldContent !== newContent. */
  changed: boolean
}

/**
 * Renders a single file diff with colored +/- markers.
 *
 * Uses an O(n*m) LCS walk-back (fine for harness files <500 lines) and
 * writes 3 lines of context around each change block for readability.
 */
export function renderFileDiff(
  fileName: string,
  oldContent: string,
  newContent: string,
): string {
  if (oldContent === newContent) {
    return `${GRAY}${fileName}: unchanged${RESET}`
  }

  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')

  const diffLines = computeLineDiff(oldLines, newLines)
  const rendered = renderWithContext(diffLines, 3)

  const header = `${BOLD}=== ${fileName} ===${RESET}`
  return [header, ...rendered].join('\n')
}

/**
 * Renders a colored summary for a core-shape HarnessDiff by computing
 * before/after via previewDiff. Files that the merger skipped (missing on
 * disk, invalid op, etc.) are reported explicitly.
 *
 * @param diff       The HarnessDiff returned by Interviewer.
 * @param harnessDir The harness directory whose CURRENT files are the "old" side.
 */
export function renderDiffSummary(diff: HarnessDiff, harnessDir: string): string {
  let preview: MergeResult
  try {
    preview = previewDiff(harnessDir, diff)
  } catch (err) {
    return `${RED}Failed to compute preview: ${(err as Error).message}${RESET}`
  }

  const parts: string[] = []
  parts.push('Preview of changes:')
  if (diff.summary) parts.push(`  ${GRAY}${diff.summary}${RESET}`)
  parts.push('')

  let changedCount = 0
  for (const fileDiff of diff.diffs) {
    const previewContent = preview.finalContents[fileDiff.file]
    if (previewContent === undefined) {
      // merger skipped this file — surface why
      const reason =
        preview.skippedFiles.find((s) => s.file === fileDiff.file)?.reason ?? 'skipped'
      parts.push(`${RED}${fileDiff.file}: ${reason}${RESET}`)
      continue
    }
    const originalPath = join(harnessDir, fileDiff.file)
    const oldContent = existsSync(originalPath) ? readFileSync(originalPath, 'utf-8') : ''
    if (oldContent === previewContent) continue
    changedCount += 1
    parts.push(renderFileDiff(fileDiff.file, oldContent, previewContent))
    parts.push('')
  }

  if (changedCount === 0) {
    parts.push(`${GRAY}(no file content will actually change)${RESET}`)
  }
  parts.push(`${changedCount} file(s) will change.`)
  return parts.join('\n')
}

/**
 * Renders a colored summary from explicit before/after pairs — used when we
 * build the diff manually (archetype switch: overwrite each template file).
 */
export function renderRawDiff(rawDiffs: RawFileDiff[]): string {
  const parts: string[] = ['Preview of changes:', '']
  let changedCount = 0
  for (const rd of rawDiffs) {
    if (!rd.changed || rd.oldContent === rd.newContent) continue
    changedCount += 1
    parts.push(renderFileDiff(rd.file, rd.oldContent, rd.newContent))
    parts.push('')
  }
  if (changedCount === 0) {
    parts.push(`${GRAY}(no file content will actually change)${RESET}`)
  }
  parts.push(`${changedCount} file(s) will change.`)
  return parts.join('\n')
}

/**
 * Returns true when any FileDiff in the HarnessDiff contains at least one op.
 *
 * We intentionally do not dry-run the merger here; empty diffs (`diffs: []`)
 * or diffs with empty `ops` arrays are the canonical "no changes" signal.
 */
export function hasAnyChanges(diff: HarnessDiff): boolean {
  if (!diff.diffs || diff.diffs.length === 0) return false
  return diff.diffs.some((fd) => Array.isArray(fd.ops) && fd.ops.length > 0)
}

/** True when any RawFileDiff has differing before/after content. */
export function hasAnyRawChanges(rawDiffs: RawFileDiff[]): boolean {
  return rawDiffs.some((rd) => rd.changed && rd.oldContent !== rd.newContent)
}

// ---------- internals ----------

type DiffLine =
  | { kind: 'equal'; text: string }
  | { kind: 'add'; text: string }
  | { kind: 'remove'; text: string }

/**
 * Minimal LCS-based line diff. Builds the m*n table once then walks back.
 */
function computeLineDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const m = oldLines.length
  const n = newLines.length
  // table[i][j] = LCS length of oldLines[0..i) and newLines[0..j)
  const table: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0))
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        table[i][j] = table[i - 1][j - 1] + 1
      } else {
        table[i][j] = Math.max(table[i - 1][j], table[i][j - 1])
      }
    }
  }
  // Walk back
  const out: DiffLine[] = []
  let i = m
  let j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      out.push({ kind: 'equal', text: oldLines[i - 1] })
      i -= 1
      j -= 1
    } else if (j > 0 && (i === 0 || table[i][j - 1] >= table[i - 1][j])) {
      out.push({ kind: 'add', text: newLines[j - 1] })
      j -= 1
    } else if (i > 0) {
      out.push({ kind: 'remove', text: oldLines[i - 1] })
      i -= 1
    } else {
      break
    }
  }
  return out.reverse()
}

function renderWithContext(diffLines: DiffLine[], contextLines: number): string[] {
  // Mark which equal-lines are "close enough" to a change to be kept as context.
  const keepEqual: boolean[] = new Array(diffLines.length).fill(false)
  for (let idx = 0; idx < diffLines.length; idx += 1) {
    if (diffLines[idx].kind !== 'equal') {
      const start = Math.max(0, idx - contextLines)
      const end = Math.min(diffLines.length - 1, idx + contextLines)
      for (let k = start; k <= end; k += 1) {
        if (diffLines[k].kind === 'equal') keepEqual[k] = true
      }
    }
  }
  const out: string[] = []
  let lastRendered = -2
  for (let idx = 0; idx < diffLines.length; idx += 1) {
    const dl = diffLines[idx]
    if (dl.kind === 'equal' && !keepEqual[idx]) continue
    // Emit a separator when skipping a chunk of unchanged lines.
    if (idx > lastRendered + 1 && lastRendered !== -2) {
      out.push(`${GRAY}...${RESET}`)
    }
    if (dl.kind === 'equal') {
      out.push(`${GRAY}  ${dl.text}${RESET}`)
    } else if (dl.kind === 'add') {
      out.push(`${GREEN}+ ${dl.text}${RESET}`)
    } else {
      out.push(`${RED}- ${dl.text}${RESET}`)
    }
    lastRendered = idx
  }
  return out
}
