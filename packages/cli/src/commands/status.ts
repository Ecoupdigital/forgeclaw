import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { isServiceRunning } from '../utils/service'

const FORGECLAW_DIR = join(homedir(), '.forgeclaw')
const CONFIG_PATH = join(FORGECLAW_DIR, 'forgeclaw.config.json')
const DB_PATH = join(FORGECLAW_DIR, 'db', 'forgeclaw.db')
const HARNESS_DIR = join(FORGECLAW_DIR, 'harness')

const HARNESS_FILES = ['SOUL.md', 'USER.md', 'AGENTS.md', 'TOOLS.md', 'MEMORY.md', 'STYLE.md']

function indicator(ok: boolean): string {
  return ok ? '\x1b[32m●\x1b[0m' : '\x1b[31m○\x1b[0m'
}

async function checkClaude(): Promise<boolean> {
  try {
    const proc = Bun.spawn(['which', 'claude'], { stdout: 'pipe', stderr: 'pipe' })
    await proc.exited
    return proc.exitCode === 0
  } catch {
    return false
  }
}

export async function status(): Promise<void> {
  console.log('\n  ForgeClaw Status\n')

  // Service
  const serviceRunning = await isServiceRunning()
  console.log(`  ${indicator(serviceRunning)} Service: ${serviceRunning ? 'running' : 'stopped'}`)

  // Config
  const configExists = existsSync(CONFIG_PATH)
  console.log(`  ${indicator(configExists)} Config: ${configExists ? CONFIG_PATH : 'not found'}`)

  // Database
  const dbExists = existsSync(DB_PATH)
  console.log(`  ${indicator(dbExists)} Database: ${dbExists ? DB_PATH : 'not found'}`)

  // Harness files
  const harnessResults = HARNESS_FILES.map((f) => ({
    name: f,
    exists: existsSync(join(HARNESS_DIR, f)),
  }))
  const allHarness = harnessResults.every((r) => r.exists)
  const harnessCount = harnessResults.filter((r) => r.exists).length
  console.log(
    `  ${indicator(allHarness)} Harness: ${harnessCount}/${HARNESS_FILES.length} files`
  )
  if (!allHarness) {
    for (const r of harnessResults) {
      if (!r.exists) {
        console.log(`    ${indicator(false)} ${r.name}`)
      }
    }
  }

  // Claude CLI
  const claudeOk = await checkClaude()
  console.log(`  ${indicator(claudeOk)} Claude CLI: ${claudeOk ? 'available' : 'not found'}`)

  console.log()

  if (!configExists) {
    console.log('  Run "forgeclaw install" to set up ForgeClaw.\n')
  } else if (!serviceRunning) {
    console.log('  Service is not running. Run "forgeclaw install" to set up the service.\n')
  }
}
