import { join } from 'node:path'
import { homedir } from 'node:os'
import { existsSync } from 'node:fs'

const LOG_PATH = join(homedir(), '.forgeclaw', 'logs', 'bot.log')

export async function logs(): Promise<void> {
  if (!existsSync(LOG_PATH)) {
    console.log(`\n  Log file not found: ${LOG_PATH}`)
    console.log('  The bot may not have started yet. Run "forgeclaw status" to check.\n')
    return
  }

  console.log(`\n  Tailing ${LOG_PATH} (Ctrl+C to stop)\n`)

  const proc = Bun.spawn(['tail', '-f', LOG_PATH], {
    stdout: 'inherit',
    stderr: 'inherit',
  })

  // Forward SIGINT to child process for clean exit
  process.on('SIGINT', () => {
    proc.kill()
    process.exit(0)
  })

  await proc.exited
}
