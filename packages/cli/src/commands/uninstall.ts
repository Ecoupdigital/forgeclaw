import { confirm, intro, log, isCancel, spinner } from '@clack/prompts'
import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { stopService, removeService } from '../utils/service'

const FORGECLAW_DIR = join(homedir(), '.forgeclaw')

export async function uninstall(): Promise<void> {
  intro('ForgeClaw - Uninstall')

  const shouldContinue = isCancel(
    await confirm({
      message: 'Are you sure you want to uninstall ForgeClaw?',
      initialValue: false,
    })
  )
    ? (log.warn('Cancelled.'), process.exit(0), false)
    : true

  if (!shouldContinue) return

  const proceedConfirm = await confirm({
    message: 'Are you sure you want to uninstall ForgeClaw?',
    initialValue: false,
  })
  if (isCancel(proceedConfirm) || !proceedConfirm) {
    log.warn('Uninstall cancelled.')
    process.exit(0)
  }

  const s = spinner()

  // Stop service
  s.start('Stopping ForgeClaw service...')
  const stopResult = await stopService()
  s.stop(stopResult.message)

  // Remove service files
  s.start('Removing service configuration...')
  const removeResult = await removeService()
  s.stop(removeResult.message)

  // Ask about data
  const removeData = await confirm({
    message: 'Remove all ForgeClaw data (~/.forgeclaw/)? This cannot be undone.',
    initialValue: false,
  })

  if (isCancel(removeData)) {
    log.warn('Keeping data directory.')
  } else if (removeData) {
    s.start('Removing data...')
    if (existsSync(FORGECLAW_DIR)) {
      rmSync(FORGECLAW_DIR, { recursive: true, force: true })
    }
    s.stop('Data removed.')
    log.success('ForgeClaw has been completely removed.')
  } else {
    log.info(`Data preserved at ${FORGECLAW_DIR}`)
    log.success('ForgeClaw service removed. Data kept.')
  }
}
