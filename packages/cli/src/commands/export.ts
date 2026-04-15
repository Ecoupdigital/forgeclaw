import { intro, spinner, outro, log } from '@clack/prompts'
import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const FORGECLAW_DIR = join(homedir(), '.forgeclaw')

export async function exportData(): Promise<void> {
  intro('ForgeClaw Export')

  const s = spinner()

  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10)
  const outputFile = join(process.cwd(), `forgeclaw-backup-${dateStr}.tar.gz`)

  if (!existsSync(FORGECLAW_DIR)) {
    log.error(`ForgeClaw directory not found: ${FORGECLAW_DIR}`)
    log.info('Run "forgeclaw install" first.')
    process.exit(1)
  }

  const items = [
    'db/forgeclaw.db',
    'forgeclaw.config.json',
    'harness',
    'memory',
    '.env',
  ]

  const existingItems = items.filter(item => existsSync(join(FORGECLAW_DIR, item)))

  if (existingItems.length === 0) {
    log.error('No data found to export.')
    process.exit(1)
  }

  log.info(`Including ${existingItems.length} item(s):`)
  for (const item of existingItems) {
    log.message(`  - ${item}`)
  }

  s.start('Creating backup...')

  const proc = Bun.spawn(
    ['tar', 'czf', outputFile, ...existingItems],
    {
      cwd: FORGECLAW_DIR,
      stdout: 'pipe',
      stderr: 'pipe',
    }
  )

  const stderr = await new Response(proc.stderr).text()
  await proc.exited

  if (proc.exitCode !== 0) {
    s.stop('Backup failed.')
    log.error(`tar failed: ${stderr}`)
    process.exit(1)
  }

  const fileSize = statSync(outputFile).size
  const sizeMB = (fileSize / (1024 * 1024)).toFixed(2)

  s.stop('Backup created.')

  outro(`Backup saved: ${outputFile} (${sizeMB} MB)`)
}
