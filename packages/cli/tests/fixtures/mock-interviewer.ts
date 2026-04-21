/**
 * Scripted mock of @forgeclaw/core's `Interviewer` class.
 *
 * Drives the real conversational protocol (start() -> InterviewResponse,
 * then answer(text) -> InterviewResponse ...) without touching the Claude
 * CLI. Tests inject this via `mock.module('@forgeclaw/core', () => ({ ...,
 * Interviewer: MockInterviewer }))`.
 *
 * Design notes:
 *   - Emits the REAL HarnessDiff shape (`{ diffs: FileDiff[], summary }`)
 *     with surgical DiffOps (append/replace/replace_section/set_placeholder).
 *   - The plan's earlier shape `{[file]: {oldContent, newContent, changed}}`
 *     no longer exists in core (Fase 26-01 redesign).
 *   - Default scripts produce a minimal but plausible diff per archetype+mode
 *     so every test file gets a free, archetype-aware scenario. Individual
 *     tests can override via `scriptedResponses` to force a specific
 *     sequence (e.g. budget edge cases, aborts).
 */

import type {
  HarnessDiff,
  HarnessFile,
  InterviewResponse,
  InterviewerOptions,
} from '@forgeclaw/core'

/**
 * Optional override: full script of responses. When provided, MockInterviewer
 * emits them in order (first call to start() returns scripted[0], each
 * answer() returns scripted[n]). When not provided, uses `defaultScript()`.
 */
export type MockInterviewerScript = InterviewResponse[]

export class MockInterviewer {
  public readonly archetype: string
  public readonly harnessDir: string
  public readonly script: MockInterviewerScript
  /** Index of the next response to emit (0-based). */
  public pointer = 0
  /** Captures every answer() call for assertions. */
  public answers: string[] = []
  /** Captures whether start() has been called. */
  public startCalls = 0

  constructor(opts: InterviewerOptions) {
    this.archetype = opts.archetype
    this.harnessDir = opts.harnessDir
    // Allow tests to shove a custom script in via a global sidechannel — the
    // Interviewer constructor signature (from core) does not accept it, and
    // we keep this class drop-in compatible.
    const sink = (globalThis as Record<string, unknown>).__MOCK_INTERVIEWER_SCRIPT__
    if (Array.isArray(sink) && sink.length > 0) {
      this.script = sink as MockInterviewerScript
    } else {
      this.script = defaultScript(opts.archetype)
    }
  }

  async start(): Promise<InterviewResponse> {
    this.startCalls += 1
    return this.nextResponse()
  }

  async answer(text: string): Promise<InterviewResponse> {
    this.answers.push(text)
    return this.nextResponse()
  }

  abort(): void {
    // No-op in tests — we control flow via scripted responses.
  }

  getState(): unknown {
    // Minimal shape so callers that do getState() don't crash. Real
    // InterviewState has way more fields but refine() never inspects it.
    return {
      archetype: this.archetype,
      turns: [],
      status: this.pointer >= this.script.length ? 'done' : 'asking',
      finalDiff: null,
      budget: { turnsUsed: this.pointer, inputTokensUsed: 0, outputTokensUsed: 0, elapsedMs: 0, withinLimits: true },
      startedAt: 0,
      updatedAt: 0,
    }
  }

  private nextResponse(): InterviewResponse {
    if (this.pointer >= this.script.length) {
      // Past-the-end: emit a final 'done' with whatever default diff makes sense
      return {
        status: 'done',
        summary: 'script exhausted — emitting empty done',
        harnessDiff: { diffs: [], summary: 'no changes' },
      }
    }
    const r = this.script[this.pointer]
    this.pointer += 1
    return r
  }
}

/**
 * Replaces the global script for the next `new MockInterviewer()` call. Each
 * test that wants custom responses calls this in its body BEFORE dynamically
 * importing `refine`.
 *
 * Remember to call `clearMockInterviewerScript()` in afterEach to avoid
 * leaking scripts between tests.
 */
export function setMockInterviewerScript(script: MockInterviewerScript): void {
  ;(globalThis as Record<string, unknown>).__MOCK_INTERVIEWER_SCRIPT__ = script
}

export function clearMockInterviewerScript(): void {
  delete (globalThis as Record<string, unknown>).__MOCK_INTERVIEWER_SCRIPT__
}

/**
 * Default script by archetype: 1 question then 'done' with a minimal diff
 * that appends a marker to USER.md. Enough to prove the pipeline works
 * end-to-end (backup -> diff -> apply -> recompile) without per-test setup.
 */
export function defaultScript(archetype: string): MockInterviewerScript {
  const summary = `mock script applied for ${archetype}`
  const doneResponse: InterviewResponse = {
    status: 'done',
    summary,
    harnessDiff: {
      summary,
      diffs: [
        {
          file: 'USER.md' as HarnessFile,
          ops: [
            {
              op: 'append',
              content: `\n# Mock update (${archetype})\nAdded by MockInterviewer.\n`,
            },
          ],
        },
      ],
    },
  }
  return [
    {
      status: 'asking',
      nextQuestion: `Conte sobre seu trabalho como ${archetype}:`,
    },
    doneResponse,
  ]
}

/**
 * Helper: builds a "done" response that only touches a single file. Used by
 * section-focused tests so the diff has a deterministic target.
 */
export function doneDiffForFile(file: HarnessFile, note: string): InterviewResponse {
  return {
    status: 'done',
    summary: note,
    harnessDiff: {
      summary: note,
      diffs: [
        {
          file,
          ops: [{ op: 'append', content: `\n# ${note}\n` }],
        },
      ],
    },
  }
}

/**
 * Helper: builds a "done" response that touches MULTIPLE files at once. Used
 * by section tests to verify filtering leaves only the targeted file alive.
 */
export function doneDiffForFiles(
  ops: ReadonlyArray<{ file: HarnessFile; content: string }>,
  summary: string,
): InterviewResponse {
  return {
    status: 'done',
    summary,
    harnessDiff: {
      summary,
      diffs: ops.map(({ file, content }) => ({
        file,
        ops: [{ op: 'append', content: `\n${content}\n` }],
      })),
    },
  }
}

/**
 * Helper: builds an 'asking' response (intermediate turn).
 */
export function askingResponse(question: string): InterviewResponse {
  return {
    status: 'asking',
    nextQuestion: question,
  }
}

/**
 * Helper: builds an 'aborted' response.
 */
export function abortedResponse(reason: string): InterviewResponse {
  return {
    status: 'aborted',
    reason,
  }
}
