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
}

function cancelled(): never {
  log.warn('Refine cancelled.')
  process.exit(0)
}

function checkValue<T>(v: T | symbol): T {
  if (isCancel(v)) cancelled()
  return v as T
}

function getHarnessDir(): string {
  return join(homedir(), '.forgeclaw', 'harness')
}

function sectionToFile(section: RefineSection): HarnessFile {
  return `${section}.md` as HarnessFile
}

/**
 * Entry-point for `forgeclaw refine`. Dispatches to one of five modes based
 * on flags. First-match wins in the order: rollback > reset > archetype >
 * section > default.
 */
export async function refine(options: RefineOptions = {}): Promise<void> {
  try {
    if (options.rollback) {
      await runRollback()
    } else if (options.reset) {
      await runReset()
    } else if (options.archetype) {
      await runArchetypeChange(options.archetype)
    } else if (options.section) {
      await runSectionRefine(options.section)
    } else {
      await runDefaultRefine()
    }
  } catch (err) {
    const e = err as Error
    log.error(e.message)
    if (process.env.FORGECLAW_DEBUG) {
      console.error(e.stack)
    }
    process.exit(1)
  }
}

// ---------- Mode implementations ----------

async function runDefaultRefine(): Promise<void> {
  intro('ForgeClaw Refine — Refinar seu harness')

  const current = getCurrentArchetype()
  if (!current) {
    log.error('Archetype not set. Use --archetype=<slug> to set one or run forgeclaw install.')
    process.exit(1)
  }
  log.info(`Arquetipo atual: ${ARCHETYPE_LABELS[current]}`)

  const backup = createBackup('refine-default')
  log.info(`Backup criado: ${backup.id}`)

  const diff = await runInterviewLoop(current, null)
  if (!diff) {
    outro('Sem mudancas. Backup disponivel em ' + backup.id + '.')
    return
  }

  const applied = await previewAndApply(diff, null)
  if (applied) {
    outro(`Refine aplicado. Rollback: forgeclaw refine --rollback (backup: ${backup.id})`)
  } else {
    outro(`Abortado. Backup ${backup.id} preservado.`)
  }
}

async function runArchetypeChange(newArchetype: Archetype): Promise<void> {
  if (!ARCHETYPES.includes(newArchetype)) {
    log.error(
      `Invalid archetype: ${newArchetype}. Valid: ${ARCHETYPES.join(', ')}`,
    )
    process.exit(1)
  }

  intro(`Trocar arquetipo -> ${ARCHETYPE_LABELS[newArchetype]}`)
  log.warn(
    'Troca de arquetipo sobrescreve templates base. Sessoes/memoria/DB sao preservados.',
  )

  const proceed = checkValue(
    await confirm({
      message: 'Continuar?',
      initialValue: false,
    }),
  )
  if (!proceed) cancelled()

  const backup = createBackup(`archetype-change-to-${newArchetype}`)
  log.info(`Backup criado: ${backup.id}`)

  const newTemplates = loadArchetypeTemplates(newArchetype)
  const currentHarness = readCurrentHarness()

  const rawDiffs: RawFileDiff[] = Object.entries(newTemplates).map(([file, newContent]) => ({
    file,
    oldContent: currentHarness[file] ?? '',
    newContent,
    changed: (currentHarness[file] ?? '') !== newContent,
  }))

  if (!hasAnyRawChanges(rawDiffs)) {
    log.info('Templates sao identicos ao harness atual — nada a fazer.')
    outro(`Backup ${backup.id} preservado.`)
    return
  }

  console.log(renderRawDiff(rawDiffs))

  const apply = checkValue(
    await confirm({
      message: 'Aplicar estas mudancas (etapa 1/2: templates base)?',
      initialValue: true,
    }),
  )
  if (!apply) {
    outro(`Abortado. Backup ${backup.id} preservado.`)
    return
  }

  const harnessDir = getHarnessDir()
  mkdirSync(harnessDir, { recursive: true })
  for (const rd of rawDiffs) {
    writeFileSync(join(harnessDir, rd.file), rd.newContent, 'utf-8')
  }
  setArchetype(newArchetype)
  log.success('Templates base aplicados e arquetipo atualizado no config.')

  // Etapa 2 — entrevista de refinamento com o novo arquetipo
  const runInterview = checkValue(
    await confirm({
      message: 'Rodar entrevista agora pra customizar o novo arquetipo? (recomendado)',
      initialValue: true,
    }),
  )
  if (runInterview) {
    const diff = await runInterviewLoop(newArchetype, null)
    if (diff) {
      await previewAndApply(diff, null)
    } else {
      log.info('Nenhuma customizacao adicional proposta.')
    }
  }

  recompile()
  outro(`Arquetipo alterado para ${newArchetype}. Rollback: forgeclaw refine --rollback`)
}

async function runSectionRefine(section: RefineSection): Promise<void> {
  if (!VALID_SECTIONS.includes(section)) {
    log.error(
      `Invalid section: ${section}. Valid: ${VALID_SECTIONS.join(', ')}`,
    )
    process.exit(1)
  }

  const current = getCurrentArchetype()
  if (!current) {
    log.error('Archetype not set. Use --archetype=<slug> to set one or run forgeclaw install.')
    process.exit(1)
  }

  intro(`Refinar secao: ${section}.md`)
  log.info(`Arquetipo atual: ${ARCHETYPE_LABELS[current]}`)
  log.info(
    `Mudancas fora de ${section}.md propostas pela entrevista serao filtradas antes de aplicar.`,
  )

  const backup = createBackup(`section-${section}`)
  log.info(`Backup criado: ${backup.id}`)

  const targetFile = sectionToFile(section)
  const diff = await runInterviewLoop(current, targetFile)
  if (!diff) {
    outro('Sem mudancas. Backup disponivel em ' + backup.id + '.')
    return
  }

  const applied = await previewAndApply(diff, targetFile)
  if (applied) {
    outro(`${section}.md refinado. Rollback: forgeclaw refine --rollback (backup: ${backup.id})`)
  } else {
    outro(`Abortado. Backup ${backup.id} preservado.`)
  }
}

async function runReset(): Promise<void> {
  intro('Reset harness -> templates do arquetipo')

  const current = getCurrentArchetype()
  if (!current) {
    log.error('Archetype not set. Use --archetype=<slug> to set one or run forgeclaw install.')
    process.exit(1)
  }

  log.warn(
    `Isto DESCARTA todas as customizacoes e volta ao template base de "${current}".`,
  )

  const ack = checkValue(
    await text({
      message: `Digite "${current}" pra confirmar:`,
      validate: (v) => (v !== current ? 'Digitacao nao bate' : undefined),
    }),
  )
  // validate() ensures ack === current at this point
  void ack

  const backup = createBackup(`reset-${current}`)
  log.info(`Backup criado: ${backup.id}`)

  const templates = loadArchetypeTemplates(current)
  const harnessDir = getHarnessDir()
  mkdirSync(harnessDir, { recursive: true })
  for (const [file, content] of Object.entries(templates)) {
    writeFileSync(join(harnessDir, file), content, 'utf-8')
  }
  log.success('Templates base restaurados.')

  const runInterview = checkValue(
    await confirm({
      message: 'Rodar entrevista agora pra recustomizar?',
      initialValue: true,
    }),
  )
  if (runInterview) {
    const diff = await runInterviewLoop(current, null)
    if (diff) {
      await previewAndApply(diff, null)
    }
  }

  recompile()
  outro(`Reset concluido. Rollback: forgeclaw refine --rollback (backup: ${backup.id})`)
}

async function runRollback(): Promise<void> {
  intro('ForgeClaw Refine — Rollback')

  const backups = listBackups()
  if (backups.length === 0) {
    log.warn('Nenhum backup disponivel.')
    outro('')
    return
  }

  const options = backups.slice(0, 20).map((b) => ({
    value: b.id,
    label: `${b.id} — ${b.fileCount} files (${(b.sizeBytes / 1024).toFixed(1)} KB)`,
  }))

  const chosen = checkValue(
    await select({
      message: 'Escolha o backup pra restaurar:',
      options,
    }),
  ) as string

  const yes = checkValue(
    await confirm({
      message: `Restaurar ${chosen}? Um backup de seguranca do estado atual sera criado automaticamente.`,
      initialValue: false,
    }),
  )
  if (!yes) cancelled()

  restoreBackup(chosen)
  recompile()
  outro(`Restaurado ${chosen}. Estado anterior salvo em pre-restore-${chosen}.`)
}

// ---------- Interview loop + diff application ----------

/**
 * Runs the conversational Interviewer loop, prompting the user with @clack
 * each time the interviewer asks a question. Returns the final HarnessDiff
 * when the interviewer signals 'done', or null on abort / no-op.
 *
 * @param archetype       The archetype to brief the interviewer with.
 * @param sectionHint     When set, prepends a single-line hint telling the
 *                        interviewer to focus only on this harness file.
 */
async function runInterviewLoop(
  archetype: Archetype,
  sectionHint: HarnessFile | null,
): Promise<HarnessDiff | null> {
  const harnessDir = getHarnessDir()
  const itv = new Interviewer({
    archetype,
    harnessDir,
  })

  const s = spinner()
  s.start('Iniciando entrevista...')
  let response: InterviewResponse
  try {
    response = await itv.start()
  } catch (err) {
    s.stop('Falha ao iniciar entrevista.')
    log.error((err as Error).message)
    return null
  }
  s.stop('Entrevista iniciada.')

  if (sectionHint) {
    log.info(
      `Foco: ${sectionHint}. Responda com informacoes que alimentem apenas essa secao.`,
    )
  }

  while (true) {
    if (response.status === 'aborted') {
      log.warn(`Entrevista abortada: ${response.reason}`)
      return null
    }
    if (response.status === 'done') {
      if (!hasAnyChanges(response.harnessDiff)) {
        log.info('Entrevista finalizada sem mudancas propostas.')
        return null
      }
      return response.harnessDiff
    }
    // status === 'asking'
    const question = response.nextQuestion
    const answer = checkValue(
      await text({
        message: question,
        placeholder: 'sua resposta (ou vazio pra pular)',
      }),
    ) as string

    const reply = answer.trim().length > 0 ? answer : '(sem resposta)'
    s.start('Processando resposta...')
    try {
      response = await itv.answer(reply)
    } catch (err) {
      s.stop('Falha no turno.')
      log.error((err as Error).message)
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
): Promise<boolean> {
  const harnessDir = getHarnessDir()
  const effective: HarnessDiff = filterToFile
    ? {
        summary: diff.summary,
        diffs: diff.diffs.filter((fd: FileDiff) => fd.file === filterToFile),
      }
    : diff

  if (!hasAnyChanges(effective)) {
    log.info('Nenhuma mudanca elegivel apos filtragem.')
    return false
  }

  console.log(renderDiffSummary(effective, harnessDir))

  const apply = checkValue(
    await confirm({
      message: 'Aplicar estas mudancas?',
      initialValue: true,
    }),
  )
  if (!apply) return false

  const result = applyDiff(harnessDir, effective)
  if (result.skippedFiles.length > 0) {
    for (const s of result.skippedFiles) {
      log.warn(`Pulado ${s.file}: ${s.reason}`)
    }
  }
  log.success(`Aplicado: ${result.appliedFiles.join(', ') || '(nenhum)'}`)
  recompile()
  return true
}

function recompile(): void {
  try {
    const r = compileHarness()
    if (r.success) {
      log.success(`CLAUDE.md recompilado (${r.includedFiles.length} arquivos).`)
    } else {
      log.warn('CLAUDE.md nao pode ser recompilado — verifique os arquivos do harness.')
    }
  } catch (err) {
    log.warn(`Falha ao recompilar CLAUDE.md: ${(err as Error).message}`)
  }
}

