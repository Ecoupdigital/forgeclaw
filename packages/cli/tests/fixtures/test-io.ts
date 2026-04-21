/**
 * Scripted IO for refine() tests.
 *
 * Replaces @clack/prompts with a deterministic, script-driven implementation
 * that tests can inspect after the run. Every prompt answer must be provided
 * upfront — running out of answers throws (protects tests from accidentally
 * blocking on a prompt that was added in production code without updating
 * the fixture).
 */

import type { RefineIO } from '../../src/commands/refine'

export interface ScriptedAnswers {
  /** Boolean answers for each `io.confirm(...)` call in order. */
  confirms?: boolean[]
  /**
   * Answers for each `io.select(...)` call in order. If you pass `undefined`
   * for a particular call, the fixture falls back to `options[0].value`.
   */
  selects?: Array<unknown>
  /** String answers for each `io.text(...)` call in order. */
  texts?: string[]
}

export interface ScriptedIO extends RefineIO {
  /** Everything sent to `io.output` (diff renders etc). */
  outputs: string[]
  /** Every log.info/warn/error/success call in order. */
  logs: Array<{ level: 'info' | 'warn' | 'error' | 'success'; msg: string }>
  /** Every intro(title) call. */
  intros: string[]
  /** Every outro(message) call. */
  outros: string[]
  /** Answers that were actually consumed (for assertions). */
  consumed: {
    confirms: number
    selects: number
    texts: number
  }
}

export function createScriptedIO(answers: ScriptedAnswers = {}): ScriptedIO {
  const confirms = [...(answers.confirms ?? [])]
  const selects = [...(answers.selects ?? [])]
  const texts = [...(answers.texts ?? [])]

  const outputs: string[] = []
  const logs: ScriptedIO['logs'] = []
  const intros: string[] = []
  const outros: string[] = []
  const consumed = { confirms: 0, selects: 0, texts: 0 }

  const io: ScriptedIO = {
    outputs,
    logs,
    intros,
    outros,
    consumed,
    confirm: async (message, _initialValue) => {
      if (confirms.length === 0) {
        throw new Error(
          `ScriptedIO: no more confirm answers (asked: "${message}")`,
        )
      }
      const v = confirms.shift() as boolean
      consumed.confirms += 1
      return v
    },
    select: async (message, options) => {
      if (selects.length === 0) {
        // Fallback to first option so tests that don't care about selects
        // don't have to pre-populate every one.
        if (options.length === 0) {
          throw new Error(
            `ScriptedIO: no options for select (asked: "${message}")`,
          )
        }
        consumed.selects += 1
        return options[0].value as never
      }
      const v = selects.shift()
      consumed.selects += 1
      if (v === undefined) {
        if (options.length === 0) {
          throw new Error(
            `ScriptedIO: explicit undefined select with empty options (asked: "${message}")`,
          )
        }
        return options[0].value as never
      }
      return v as never
    },
    text: async (message, _opts) => {
      if (texts.length === 0) {
        throw new Error(
          `ScriptedIO: no more text answers (asked: "${message}")`,
        )
      }
      const v = texts.shift() as string
      consumed.texts += 1
      return v
    },
    log: {
      info: (m) => logs.push({ level: 'info', msg: m }),
      warn: (m) => logs.push({ level: 'warn', msg: m }),
      error: (m) => logs.push({ level: 'error', msg: m }),
      success: (m) => logs.push({ level: 'success', msg: m }),
    },
    output: (s) => outputs.push(s),
    intro: (title) => intros.push(title),
    outro: (message) => outros.push(message),
    spinner: () => ({ start: () => {}, stop: () => {} }),
  }
  return io
}

/**
 * Small convenience to help tests assert on log level presence.
 */
export function hasLog(
  io: ScriptedIO,
  level: 'info' | 'warn' | 'error' | 'success',
  matcher: string | RegExp,
): boolean {
  return io.logs.some((l) => {
    if (l.level !== level) return false
    return typeof matcher === 'string'
      ? l.msg.includes(matcher)
      : matcher.test(l.msg)
  })
}
