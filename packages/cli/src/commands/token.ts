import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const CONFIG_PATH = join(homedir(), '.forgeclaw', 'forgeclaw.config.json')

export async function token(): Promise<void> {
  if (!existsSync(CONFIG_PATH)) {
    console.error('Config not found. Run "forgeclaw install" first.')
    process.exit(1)
  }

  try {
    const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
    const dashboardToken = config.dashboardToken

    if (!dashboardToken) {
      console.error('No dashboard token configured.')
      console.error('Run "forgeclaw update" to generate one.')
      process.exit(1)
    }

    console.log('')
    console.log('  Dashboard Token:')
    console.log('')
    console.log(`  ${dashboardToken}`)
    console.log('')
    console.log('  Paste this in the login page at http://localhost:4040/login')
    console.log('')
  } catch {
    console.error('Failed to read config file.')
    process.exit(1)
  }
}
