import {
  intro,
  outro,
  log,
  spinner,
  confirm,
  select,
  text,
  isCancel,
} from '@clack/prompts'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { writeFileSync, mkdirSync } from 'node:fs'
import {
  Interviewer,
  applyDiff,
  compileHarness,
  type HarnessDiff,
  type HarnessFile,
  type InterviewResponse,
  type FileDiff,
} from '@forgeclaw/core'
import {
  createBackup,
  listBackups,
  restoreBackup,
} from '../utils/refine-backup'
import {
  renderDiffSummary,
  renderRawDiff,
  hasAnyChanges,
  hasAnyRawChanges,
  type RawFileDiff,
} from '../utils/refine-diff'
import {
  getCurrentArchetype,
  setArchetype,
  loadArchetypeTemplates,
  readCurrentHarness,
  ARCHETYPES,
  ARCHETYPE_LABELS,
  type Archetype,
} from '../utils/refine-archetype'
import {
  isDashboardRunning,
  openDashboardRefine,
  waitForCompletion,
  readDashboardToken,
  type RefineMode,
} from '../utils/refine-dashboard'

/**
 * Harness section name accepted by `--section`. Matches the harness file
 * basename (without `.md`).
 */
export type RefineSection =
  | 'SOUL'
  | 'USER'
  | 'AGENTS'
  | 'TOOLS'
  | 'MEMORY'
  | 'STYLE'
  | 'HEARTBEAT'

export const VALID_SECTIONS: readonly RefineSection[] = [
  'SOUL',
  'USER',
  'AGENTS',
  'TOOLS',
  'MEMORY',
  'STYLE',
  'HEARTBEAT',
] as const

export interface RefineOptions {
  archetype?: Archetype
  section?: RefineSection
  reset?: boolean
  rollback?: boolean
  /**
   * Force terminal UX even when the dashboard is running. Useful for CI,
   * remote shells, or users who prefer the TUI. When false (default), the
   * CLI probes the dashboard and delegates when available.
   */
  terminal?: boolean
  /**
   * Override the `~/.forgeclaw` base directory. Tests pass a tmp dir here;
   * production callers omit it and get the real homedir (Bun caches
   * `homedir()` at process start, so env-based isolation is not reliable).
   *
   * When set, this override is threaded through every path-deriving helper
   * (createBackup/listBackups/restoreBackup/getCurrentArchetype/...) so the
   * entire refine flow operates under the tmp dir.
   */
  forgeclawDir?: string
}

/**
 * Injectable IO for testability. Production code uses `defaultIO()` which
 * delegates to `@clack/prompts`. Tests pass `createScriptedIO()` with
 * pre-recorded answers, so no interactive prompt ever blocks the suite.
 *
 * The shape is intentionally narrow — only the primitives actually used by
 * `refine()` (confirm/select/text for questions, log for diagnostics, output
 * for stdout capture of diff renders).
 */
export interface RefineIO {
  confirm: (message: string, initialValue?: boolean) => Promise<boolean>
  select: <T>(
    message: string,
    options: ReadonlyArray<{ value: T; label: string }>,
  ) => Promise<T>
  text: (
    message: string,
    opts?: {
      placeholder?: string
      validate?: (value: string) => string | undefined
    },
  ) => Promise<string>
  log: {
    info: (m: string) => void
    warn: (m: string) => void
    error: (m: string) => void
    success: (m: string) => void
  }
  /** stdout sink for diff previews (console.log in production). */
  output: (text: string) => void
  /** Called once at the top of a flow. */
  intro: (title: string) => void
  /** Called once when the flow ends normally. */
  outro: (message: string) => void
  /** Optional spinner factory. Default uses @clack spinner; tests pass a no-op. */
  spinner?: () => { start: (msg?: string) => void; stop: (msg?: string) => void }
}

function defaultIO(): RefineIO {
  return {
    confirm: async (message, initialValue = true) => {
      const v = await confirm({ message, initialValue })
      if (isCancel(v)) {
        log.warn('Refine cancelled.')
        process.exit(0)
      }
      return v as boolean
    },
    select: async (message, options) => {
      const v = await select({ message, options: options as Array<{ value: unknown; label: string }> })
      if (isCancel(v)) {
        log.warn('Refine cancelled.')
        process.exit(0)
      }
      // cast through unknown to respect the generic T
      return v as unknown as never
    },
    text: async (message, opts = {}) => {
      const v = await text({
        message,
        placeholder: opts.placeholder,
        validate: opts.validate,
      })
      if (isCancel(v)) {
        log.warn('Refine cancelled.')
        process.exit(0)
      }
      return v as string
    },
    log: {
      info: (m) => log.info(m),
      warn: (m) => log.warn(m),
      error: (m) => log.error(m),
      success: (m) => log.success(m),
    },
    output: (s) => {
      console.log(s)
    },
    intro: (title) => intro(title),
    outro: (message) => outro(message),
    spinner: () => spinner(),
  }
}

function noopSpinner(): {
  start: (msg?: string) => void
  stop: (msg?: string) => void
} {
  return { start: () => {}, stop: () => {} }
}

function getForgeclawDir(override: string | undefined): string {
  return override ?? join(homedir(), '.forgeclaw')
}

function getHarnessDir(override: string | undefined): string {
  return join(getForgeclawDir(override), 'harness')
}

function sectionToFile(section: RefineSection): HarnessFile {
  return `${section}.md` as HarnessFile
}

/**
 * Entry-point for `forgeclaw refine`. Dispatches to one of five modes based
 * on flags. First-match wins in the order: rollback > reset > archetype >
 * section > default.
 *
 * When the dashboard is running (probe at localhost:4040), default/archetype/
 * section/reset modes are delegated to the web UI (`/refine?mode=...`).
 * Rollback is always terminal — picking a backup from a select is faster in
 * the shell than loading a page. `--terminal` forces the terminal UX for
 * every mode.
 */
export async function refine(
  options: RefineOptions = {},
  io: RefineIO = defaultIO(),
): Promise<void> {
  try {
    // Rollback is always terminal — the UX is a single select, cheaper in TUI.
    if (options.rollback) {
      await runRollback(options, io)
      return
    }

    // User explicitly opted out of the dashboard.
    if (!options.terminal) {
      const dashboardUp = await isDashboardRunning()
      if (dashboardUp) {
        const token = readDashboardToken()
        if (!token) {
          io.log.warn(
            'Dashboard esta rodando mas dashboardToken nao foi encontrado em ~/.forgeclaw/forgeclaw.config.json. Usando modo terminal.',
          )
          // fall through to terminal flow
        } else {
          await runViaDashboard(options, token, io)
          return
        }
      }
      // dashboard down -> silent fallback to terminal
    }

    if (options.reset) {
      await runReset(options, io)
    } else if (options.archetype) {
      await runArchetypeChange(options.archetype, options, io)
    } else if (options.section) {
      await runSectionRefine(options.section, options, io)
    } else {
      await runDefaultRefine(options, io)
    }
  } catch (err) {
    const e = err as Error
    io.log.error(e.message)
    if (process.env.FORGECLAW_DEBUG) {
      console.error(e.stack)
    }
    process.exit(1)
  }
}

/**
 * Delegates the refine flow to the running dashboard:
 *   1. Build the /refine URL (mode + archetype/section + auth token)
 *   2. Best-effort open the browser (user can copy URL manually otherwise)
 *   3. Block here with a spinner until the dashboard writes
 *      ~/.forgeclaw/.refining-done
 *   4. Report the outcome and exit 0 (or exit 1 on error)
 */
async function runViaDashboard(
  options: RefineOptions,
  token: string,
  io: RefineIO,
): Promise<void> {
  io.intro('ForgeClaw Refine — via Dashboard')

  const mode: RefineMode = options.reset
    ? 'reset'
    : options.archetype
      ? 'archetype'
      : options.section
        ? 'section'
        : 'default'

  const url = await openDashboardRefine({
    mode,
    archetype: options.archetype,
    section: options.section,
    token,
  })
  io.log.info(`Abrindo dashboard: ${url}`)
  io.log.info('Se o navegador nao abriu, cole a URL acima no seu browser.')
  io.log.info('Use `forgeclaw refine --terminal` pra forcar a UX de terminal.')

  const s = (io.spinner ?? noopSpinner)()
  s.start('Aguardando voce completar o refine no dashboard...')
  const result = await waitForCompletion()
  s.stop('Refine concluido.')

  if (result.status === 'applied') {
    const backupInfo = result.backupId ? ` (backup: ${result.backupId})` : ''
    io.log.success(`Mudancas aplicadas${backupInfo}.`)
    io.outro('Rollback: forgeclaw refine --rollback')
    return
  }
  if (result.status === 'cancelled') {
    io.log.warn('Cancelado pelo usuario no dashboard. Nenhuma mudanca foi aplicada.')
    io.outro('')
    return
  }
  // status === 'error'
  io.log.error(`Erro reportado pelo dashboard: ${result.error ?? 'desconhecido'}`)
  process.exit(1)
}

// ---------- Mode implementations ----------

async function runDefaultRefine(
  options: RefineOptions,
  io: RefineIO,
): Promise<void> {
  io.intro('ForgeClaw Refine — Refinar seu harness')

  const current = getCurrentArchetype(options.forgeclawDir)
  if (!current) {
    io.log.error(
      'Archetype not set. Use --archetype=<slug> to set one or run forgeclaw install.',
    )
    process.exit(1)
  }
  io.log.info(`Arquetipo atual: ${ARCHETYPE_LABELS[current]}`)

  const backup = createBackup('refine-default', options.forgeclawDir)
  io.log.info(`Backup criado: ${backup.id}`)

  const diff = await runInterviewLoop(current, null, options, io)
  if (!diff) {
    io.outro('Sem mudancas. Backup disponivel em ' + backup.id + '.')
    return
  }

  const applied = await previewAndApply(diff, null, options, io)
  if (applied) {
    io.outro(
      `Refine aplicado. Rollback: forgeclaw refine --rollback (backup: ${backup.id})`,
    )
  } else {
    io.outro(`Abortado. Backup ${backup.id} preservado.`)
  }
}

async function runArchetypeChange(
  newArchetype: Archetype,
  options: RefineOptions,
  io: RefineIO,
): Promise<void> {
  if (!ARCHETYPES.includes(newArchetype)) {
    io.log.error(
      `Invalid archetype: ${newArchetype}. Valid: ${ARCHETYPES.join(', ')}`,
    )
    process.exit(1)
  }

  io.intro(`Trocar arquetipo -> ${ARCHETYPE_LABELS[newArchetype]}`)
  io.log.warn(
    'Troca de arquetipo sobrescreve templates base. Sessoes/memoria/DB sao preservados.',
  )

  const proceed = await io.confirm('Continuar?', false)
  if (!proceed) {
    io.log.warn('Refine cancelled.')
    return
  }

  const backup = createBackup(
    `archetype-change-to-${newArchetype}`,
    options.forgeclawDir,
  )
  io.log.info(`Backup criado: ${backup.id}`)

  const newTemplates = loadArchetypeTemplates(newArchetype, options.forgeclawDir)
  const currentHarness = readCurrentHarness(options.forgeclawDir)

  const rawDiffs: RawFileDiff[] = Object.entries(newTemplates).map(
    ([file, newContent]) => ({
      file,
      oldContent: currentHarness[file] ?? '',
      newContent,
      changed: (currentHarness[file] ?? '') !== newContent,
    }),
  )

  if (!hasAnyRawChanges(rawDiffs)) {
    io.log.info('Templates sao identicos ao harness atual — nada a fazer.')
    io.outro(`Backup ${backup.id} preservado.`)
    return
  }

  io.output(renderRawDiff(rawDiffs))

  const apply = await io.confirm(
    'Aplicar estas mudancas (etapa 1/2: templates base)?',
    true,
  )
  if (!apply) {
    io.outro(`Abortado. Backup ${backup.id} preservado.`)
    return
  }

  const harnessDir = getHarnessDir(options.forgeclawDir)
  mkdirSync(harnessDir, { recursive: true })
  for (const rd of rawDiffs) {
    writeFileSync(join(harnessDir, rd.file), rd.newContent, 'utf-8')
  }
  setArchetype(newArchetype, options.forgeclawDir)
  io.log.success(
    'Templates base aplicados e arquetipo atualizado no config.',
  )

  // Etapa 2 — entrevista de refinamento com o novo arquetipo
  const runInterview = await io.confirm(
    'Rodar entrevista agora pra customizar o novo arquetipo? (recomendado)',
    true,
  )
  if (runInterview) {
    const diff = await runInterviewLoop(newArchetype, null, options, io)
    if (diff) {
      await previewAndApply(diff, null, options, io)
    } else {
      io.log.info('Nenhuma customizacao adicional proposta.')
    }
  }

  recompile(options, io)
  io.outro(
    `Arquetipo alterado para ${newArchetype}. Rollback: forgeclaw refine --rollback`,
  )
}

async function runSectionRefine(
  section: RefineSection,
  options: RefineOptions,
  io: RefineIO,
): Promise<void> {
  if (!VALID_SECTIONS.includes(section)) {
    io.log.error(
      `Invalid section: ${section}. Valid: ${VALID_SECTIONS.join(', ')}`,
    )
    process.exit(1)
  }

  const current = getCurrentArchetype(options.forgeclawDir)
  if (!current) {
    io.log.error(
      'Archetype not set. Use --archetype=<slug> to set one or run forgeclaw install.',
    )
    process.exit(1)
  }

  io.intro(`Refinar secao: ${section}.md`)
  io.log.info(`Arquetipo atual: ${ARCHETYPE_LABELS[current]}`)
  io.log.info(
    `Mudancas fora de ${section}.md propostas pela entrevista serao filtradas antes de aplicar.`,
  )

  const backup = createBackup(`section-${section}`, options.forgeclawDir)
  io.log.info(`Backup criado: ${backup.id}`)

  const targetFile = sectionToFile(section)
  const diff = await runInterviewLoop(current, targetFile, options, io)
  if (!diff) {
    io.outro('Sem mudancas. Backup disponivel em ' + backup.id + '.')
    return
  }

  const applied = await previewAndApply(diff, targetFile, options, io)
  if (applied) {
    io.outro(
      `${section}.md refinado. Rollback: forgeclaw refine --rollback (backup: ${backup.id})`,
    )
  } else {
    io.outro(`Abortado. Backup ${backup.id} preservado.`)
  }
}

async function runReset(options: RefineOptions, io: RefineIO): Promise<void> {
  io.intro('Reset harness -> templates do arquetipo')

  const current = getCurrentArchetype(options.forgeclawDir)
  if (!current) {
    io.log.error(
      'Archetype not set. Use --archetype=<slug> to set one or run forgeclaw install.',
    )
    process.exit(1)
  }

  io.log.warn(
    `Isto DESCARTA todas as customizacoes e volta ao template base de "${current}".`,
  )

  const ack = await io.text(`Digite "${current}" pra confirmar:`, {
    validate: (v) => (v !== current ? 'Digitacao nao bate' : undefined),
  })
  // validate() ensures ack === current at this point
  void ack

  const backup = createBackup(`reset-${current}`, options.forgeclawDir)
  io.log.info(`Backup criado: ${backup.id}`)

  const templates = loadArchetypeTemplates(current, options.forgeclawDir)
  const harnessDir = getHarnessDir(options.forgeclawDir)
  mkdirSync(harnessDir, { recursive: true })
  for (const [file, content] of Object.entries(templates)) {
    writeFileSync(join(harnessDir, file), content, 'utf-8')
  }
  io.log.success('Templates base restaurados.')

  const runInterview = await io.confirm(
    'Rodar entrevista agora pra recustomizar?',
    true,
  )
  if (runInterview) {
    const diff = await runInterviewLoop(current, null, options, io)
    if (diff) {
      await previewAndApply(diff, null, options, io)
    }
  }

  recompile(options, io)
  io.outro(
    `Reset concluido. Rollback: forgeclaw refine --rollback (backup: ${backup.id})`,
  )
}

async function runRollback(
  options: RefineOptions,
  io: RefineIO,
): Promise<void> {
  io.intro('ForgeClaw Refine — Rollback')

  const backups = listBackups(options.forgeclawDir)
  if (backups.length === 0) {
    io.log.warn('Nenhum backup disponivel.')
    io.outro('')
    return
  }

  const selectOpts = backups.slice(0, 20).map((b) => ({
    value: b.id,
    label: `${b.id} — ${b.fileCount} files (${(b.sizeBytes / 1024).toFixed(1)} KB)`,
  }))

  const chosen = await io.select<string>(
    'Escolha o backup pra restaurar:',
    selectOpts,
  )

  const yes = await io.confirm(
    `Restaurar ${chosen}? Um backup de seguranca do estado atual sera criado automaticamente.`,
    false,
  )
  if (!yes) {
    io.log.warn('Refine cancelled.')
    return
  }

  restoreBackup(chosen, options.forgeclawDir)
  recompile(options, io)
  io.outro(
    `Restaurado ${chosen}. Estado anterior salvo em pre-restore-${chosen}.`,
  )
}

// ---------- Interview loop + diff application ----------

/**
 * Runs the conversational Interviewer loop, prompting the user with the
 * injected IO each time the interviewer asks a question. Returns the final
 * HarnessDiff when the interviewer signals 'done', or null on abort / no-op.
 *
 * @param archetype       The archetype to brief the interviewer with.
 * @param sectionHint     When set, prepends a single-line hint telling the
 *                        interviewer to focus only on this harness file.
 */
async function runInterviewLoop(
  archetype: Archetype,
  sectionHint: HarnessFile | null,
  options: RefineOptions,
  io: RefineIO,
): Promise<HarnessDiff | null> {
  const harnessDir = getHarnessDir(options.forgeclawDir)
  const itv = new Interviewer({
    archetype,
    harnessDir,
  })

  const s = (io.spinner ?? noopSpinner)()
  s.start('Iniciando entrevista...')
  let response: InterviewResponse
  try {
    response = await itv.start()
  } catch (err) {
    s.stop('Falha ao iniciar entrevista.')
    io.log.error((err as Error).message)
    return null
  }
  s.stop('Entrevista iniciada.')

  if (sectionHint) {
    io.log.info(
      `Foco: ${sectionHint}. Responda com informacoes que alimentem apenas essa secao.`,
    )
  }

  while (true) {
    if (response.status === 'aborted') {
      io.log.warn(`Entrevista abortada: ${response.reason}`)
      return null
    }
    if (response.status === 'done') {
      if (!hasAnyChanges(response.harnessDiff)) {
        io.log.info('Entrevista finalizada sem mudancas propostas.')
        return null
      }
      return response.harnessDiff
    }
    // status === 'asking'
    const question = response.nextQuestion
    const answer = await io.text(question, {
      placeholder: 'sua resposta (ou vazio pra pular)',
    })

    const reply = answer.trim().length > 0 ? answer : '(sem resposta)'
    s.start('Processando resposta...')
    try {
      response = await itv.answer(reply)
    } catch (err) {
      s.stop('Falha no turno.')
      io.log.error((err as Error).message)
      return null
    }
    s.stop('Resposta recebida.')
  }
}

/**
 * Shows a preview of the diff, asks the user to confirm, applies via
 * `applyDiff` and recompiles CLAUDE.md. Returns true when the diff was
 * actually applied to disk.
 *
 * @param filterToFile  When set, strips every FileDiff whose `file` is not
 *                      this harness file before applying.
 */
async function previewAndApply(
  diff: HarnessDiff,
  filterToFile: HarnessFile | null,
  options: RefineOptions,
  io: RefineIO,
): Promise<boolean> {
  const harnessDir = getHarnessDir(options.forgeclawDir)
  const effective: HarnessDiff = filterToFile
    ? {
        summary: diff.summary,
        diffs: diff.diffs.filter((fd: FileDiff) => fd.file === filterToFile),
      }
    : diff

  if (!hasAnyChanges(effective)) {
    io.log.info('Nenhuma mudanca elegivel apos filtragem.')
    return false
  }

  io.output(renderDiffSummary(effective, harnessDir))

  const apply = await io.confirm('Aplicar estas mudancas?', true)
  if (!apply) return false

  const result = applyDiff(harnessDir, effective)
  if (result.skippedFiles.length > 0) {
    for (const s of result.skippedFiles) {
      io.log.warn(`Pulado ${s.file}: ${s.reason}`)
    }
  }
  io.log.success(`Aplicado: ${result.appliedFiles.join(', ') || '(nenhum)'}`)
  recompile(options, io)
  return true
}

function recompile(options: RefineOptions, io: RefineIO): void {
  try {
    // compileHarness from @forgeclaw/core reads ~/.forgeclaw/harness via its
    // own homedir resolution. In tests we use a tmp forgeclawDir, so the
    // compiler would look at the wrong path. Guard with the override: when
    // set, skip recompile (tests verify the harness files directly).
    if (options.forgeclawDir) {
      io.log.info('CLAUDE.md recompile skipped (forgeclawDir override).')
      return
    }
    const r = compileHarness()
    if (r.success) {
      io.log.success(
        `CLAUDE.md recompilado (${r.includedFiles.length} arquivos).`,
      )
    } else {
      io.log.warn(
        'CLAUDE.md nao pode ser recompilado — verifique os arquivos do harness.',
      )
    }
  } catch (err) {
    io.log.warn(`Falha ao recompilar CLAUDE.md: ${(err as Error).message}`)
  }
}
