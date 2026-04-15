import {
  intro,
  text,
  confirm,
  select,
  spinner,
  outro,
  log,
  isCancel,
} from '@clack/prompts'
import { existsSync, mkdirSync, writeFileSync, chmodSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'
import { soulTemplate } from '../templates/soul'
import { userTemplate } from '../templates/user'
import { agentsTemplate } from '../templates/agents'
import { toolsTemplate } from '../templates/tools'
import { memoryTemplate } from '../templates/memory'
import { styleTemplate } from '../templates/style'
import { randomBytes } from 'node:crypto'
import { setupService, writeEnvFile } from '../utils/service'
import { compileHarness } from '@forgeclaw/core'

interface InstallOptions {
  update?: boolean
}

const FORGECLAW_DIR = join(homedir(), '.forgeclaw')
const CONFIG_PATH = join(FORGECLAW_DIR, 'forgeclaw.config.json')
const MONOREPO_ROOT = resolve(__dirname, '..', '..', '..', '..')

function cancelled(): never {
  log.warn('Installation cancelled.')
  process.exit(0)
}

function checkValue<T>(value: T | symbol): T {
  if (isCancel(value)) cancelled()
  return value as T
}

async function checkDependency(name: string, command: string): Promise<boolean> {
  try {
    const proc = Bun.spawn(['which', command], { stdout: 'pipe', stderr: 'pipe' })
    await proc.exited
    return proc.exitCode === 0
  } catch {
    return false
  }
}

function readdirSyncSafe(dir: string): string[] {
  try {
    const { readdirSync } = require('node:fs')
    return readdirSync(dir) as string[]
  } catch {
    return []
  }
}

/**
 * Compare two semver strings. Returns negative if a < b, 0 if equal, positive if a > b.
 * Only handles major.minor.patch (no pre-release tags).
 */
function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export async function install(options: InstallOptions = {}): Promise<void> {
  const isUpdate = options.update ?? false

  intro('ForgeClaw - Your Personal AI Command Center')

  // --- Load existing config for update mode ---
  let existingConfig: Record<string, unknown> = {}
  if (isUpdate && existsSync(CONFIG_PATH)) {
    try {
      existingConfig = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
      log.info('Existing configuration loaded. Press Enter to keep current values.')
    } catch {
      log.warn('Could not parse existing config. Starting fresh.')
    }
  }

  // --- Step 1: Check dependencies ---
  const s = spinner()
  s.start('Checking dependencies...')

  const hasBun = await checkDependency('bun', 'bun')
  const hasClaude = await checkDependency('claude', 'claude')

  s.stop('Dependency check complete.')

  if (hasBun) {
    // M8: Check minimum bun version (1.1.0)
    let bunVersion = 'unknown';
    try {
      const versionProc = Bun.spawn(['bun', '--version'], { stdout: 'pipe', stderr: 'pipe' });
      const versionOutput = await new Response(versionProc.stdout).text();
      await versionProc.exited;
      bunVersion = versionOutput.trim(); // e.g. "1.2.3"
    } catch {
      // version check failed, continue anyway
    }

    const MIN_BUN_VERSION = '1.1.0';
    if (bunVersion !== 'unknown' && compareSemver(bunVersion, MIN_BUN_VERSION) < 0) {
      log.warn(`bun: version ${bunVersion} detected, minimum recommended is ${MIN_BUN_VERSION}`);
      log.warn('Some features may not work correctly. Update with: bun upgrade');
    } else {
      log.success(`bun: installed (${bunVersion})`);
    }
  } else {
    log.error('bun: not found. Install from https://bun.sh')
    process.exit(1)
  }

  if (hasClaude) {
    log.success('claude CLI: installed')
  } else {
    log.warn('claude CLI: not found. Install with: npm install -g @anthropic-ai/claude-code')
    log.warn('Continuing anyway -- you can install it later.')
  }

  // --- Step 2: Check Claude auth ---
  if (hasClaude) {
    try {
      const proc = Bun.spawn(['claude', '--version'], { stdout: 'pipe', stderr: 'pipe' })
      await proc.exited
      if (proc.exitCode === 0) {
        log.success('claude CLI: authenticated')
      } else {
        log.warn('claude CLI may not be authenticated. Run: claude auth login')
      }
    } catch {
      log.warn('Could not verify claude auth. Run: claude auth login')
    }
  }

  // --- Step 3: Telegram Bot Token ---
  const botToken = checkValue(
    await text({
      message: 'Telegram Bot Token (create at @BotFather):',
      placeholder: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
      initialValue: (existingConfig.botToken as string) ?? '',
      validate(value) {
        if (!value) return 'Token is required'
        if (!/^\d+:.+$/.test(value)) return 'Token must start with a number followed by :'
      },
    })
  )

  // --- Step 4: Telegram User ID ---
  const userId = checkValue(
    await text({
      message: 'Your Telegram User ID (get it from @userinfobot):',
      placeholder: '123456789',
      initialValue: existingConfig.allowedUsers
        ? String((existingConfig.allowedUsers as number[])[0] ?? '')
        : '',
      validate(value) {
        if (!value) return 'User ID is required'
        if (!/^\d+$/.test(value)) return 'User ID must be a number'
      },
    })
  )

  // --- Step 5: Projects directory ---
  const workingDir = checkValue(
    await text({
      message: 'Projects directory:',
      initialValue: (existingConfig.workingDir as string) ?? '/root/projects',
      validate(value) {
        if (!value) return 'Directory is required'
        if (!existsSync(value)) return `Directory does not exist: ${value}`
      },
    })
  )

  // --- Step 6: Obsidian Vault ---
  const useObsidian = checkValue(
    await confirm({
      message: 'Do you use an Obsidian Vault?',
      initialValue: !!(existingConfig.vaultPath),
    })
  )

  let vaultPath: string | null = null
  if (useObsidian) {
    vaultPath = checkValue(
      await text({
        message: 'Vault path:',
        initialValue: (existingConfig.vaultPath as string) ?? '/root/obsidian',
        validate(value) {
          if (!value) return 'Vault path is required'
        },
      })
    )
  }

  // --- Step 7: Voice provider ---
  const voiceProvider = checkValue(
    await select({
      message: 'Voice transcription provider:',
      initialValue: (existingConfig.voiceProvider as string) ?? 'groq',
      options: [
        { value: 'groq', label: 'Groq Whisper (recommended, fast & free tier)' },
        { value: 'openai', label: 'OpenAI Whisper' },
        { value: 'none', label: 'No voice transcription' },
      ],
    })
  )

  let openaiApiKey: string | null = null
  let groqApiKey: string | null = null

  if (voiceProvider === 'openai') {
    openaiApiKey = checkValue(
      await text({
        message: 'OpenAI API Key:',
        placeholder: 'sk-...',
        initialValue: (existingConfig.openaiApiKey as string) ?? '',
        validate(value) {
          if (!value) return 'API key is required for OpenAI Whisper'
        },
      })
    )
  }

  if (voiceProvider === 'groq') {
    groqApiKey = checkValue(
      await text({
        message: 'Groq API Key (get at console.groq.com):',
        placeholder: 'gsk_...',
        initialValue: (existingConfig.groqApiKey as string) ?? '',
        validate(value) {
          if (!value) return 'API key is required for Groq Whisper'
        },
      })
    )
  }

  // --- Step 8: User info for harness ---
  const userName = checkValue(
    await text({
      message: 'Your name:',
      initialValue: (existingConfig.userName as string) ?? '',
      validate(value) {
        if (!value) return 'Name is required'
      },
    })
  )

  const company = checkValue(
    await text({
      message: 'Your company:',
      initialValue: (existingConfig.company as string) ?? '',
      placeholder: 'Optional',
    })
  )

  const role = checkValue(
    await text({
      message: 'Your role:',
      initialValue: (existingConfig.role as string) ?? '',
      placeholder: 'Optional',
    })
  )

  // --- Step 9: Generate config ---
  s.start('Setting up ForgeClaw...')

  const config = {
    botToken,
    allowedUsers: [Number(userId)],
    workingDir,
    vaultPath,
    voiceProvider,
    userName,
    company,
    role,
    dashboardToken: (existingConfig.dashboardToken as string) ?? randomBytes(32).toString('hex'),
  }

  // Create directories
  const dirs = [
    FORGECLAW_DIR,
    join(FORGECLAW_DIR, 'harness'),
    join(FORGECLAW_DIR, 'memory'),
    join(FORGECLAW_DIR, 'memory', 'DAILY'),
    join(FORGECLAW_DIR, 'db'),
    join(FORGECLAW_DIR, 'logs'),
    join(FORGECLAW_DIR, 'logs', 'crons'),
    join(FORGECLAW_DIR, 'agents'),
  ]

  for (const dir of dirs) {
    mkdirSync(dir, { recursive: true })
  }

  // Write config with restrictive permissions
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
  chmodSync(CONFIG_PATH, 0o600)

  // Write API keys to env file (not in config JSON for security)
  writeEnvFile({ openaiApiKey, groqApiKey })

  s.stop('Configuration saved.')

  // --- Step 10: Generate harness files ---
  const harnessDir = join(FORGECLAW_DIR, 'harness')

  const harnessFiles: Array<{ name: string; template: string }> = [
    { name: 'SOUL.md', template: soulTemplate() },
    { name: 'USER.md', template: userTemplate({ name: userName, company, role }) },
    { name: 'AGENTS.md', template: agentsTemplate() },
    { name: 'TOOLS.md', template: toolsTemplate() },
    { name: 'MEMORY.md', template: memoryTemplate() },
    { name: 'STYLE.md', template: styleTemplate() },
  ]

  for (const file of harnessFiles) {
    const filePath = join(harnessDir, file.name)
    if (!existsSync(filePath) || isUpdate) {
      writeFileSync(filePath, file.template)
      log.info(`Generated ${file.name}`)
    } else {
      log.info(`Skipped ${file.name} (already exists)`)
    }
  }

  // --- Step 10.5: Compile CLAUDE.md from individual harness files ---
  const compileResult = compileHarness()
  if (compileResult.success) {
    log.success(`CLAUDE.md compiled (${compileResult.includedFiles.length} files)`)
  } else {
    log.warn('CLAUDE.md compilation failed — harness will not be injected into Claude prompts')
  }

  // --- Step 11: Detect projects ---
  const projectMarkers = ['package.json', '.git', 'pyproject.toml']
  const entries = readdirSyncSafe(workingDir)
  const projects: string[] = []

  for (const entry of entries) {
    const entryPath = join(workingDir, entry)
    try {
      const { statSync } = require('node:fs')
      const stat = statSync(entryPath)
      if (!stat.isDirectory()) continue
      for (const marker of projectMarkers) {
        if (existsSync(join(entryPath, marker))) {
          projects.push(entry)
          break
        }
      }
    } catch {
      // skip inaccessible entries
    }
  }

  if (projects.length > 0) {
    log.info(`Detected ${projects.length} project(s) in ${workingDir}:`)
    for (const p of projects) {
      log.message(`  - ${p}`)
    }
  } else {
    log.info(`No projects detected in ${workingDir}`)
  }

  // --- Step 12: Install dependencies ---
  const depSpinner = spinner()
  depSpinner.start('Installing dependencies (bun install)...')

  try {
    const bunInstall = Bun.spawn(['bun', 'install'], {
      cwd: MONOREPO_ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const [, installStderr] = await Promise.all([
      new Response(bunInstall.stdout).text(),
      new Response(bunInstall.stderr).text(),
    ])
    await bunInstall.exited

    if (bunInstall.exitCode === 0) {
      depSpinner.stop('Dependencies installed.')
    } else {
      depSpinner.stop('Dependency install had warnings.')
      log.warn(`bun install stderr: ${installStderr.slice(0, 200)}`)
    }
  } catch (err) {
    depSpinner.stop('Failed to install dependencies.')
    log.error(`bun install failed: ${err}`)
    log.warn('Run "bun install" manually in the project root.')
  }

  // --- Step 13: Setup system service ---
  const shouldSetupService = checkValue(
    await confirm({
      message: 'Set up ForgeClaw as a system service (auto-start on boot)?',
      initialValue: true,
    })
  )

  if (shouldSetupService) {
    const serviceResult = await setupService(config)
    if (serviceResult.success) {
      log.success(serviceResult.message)
    } else {
      log.warn(serviceResult.message)
    }
  }

  // --- Done ---
  outro(`ForgeClaw is ready!

  Open Telegram and send /start to your bot
  Dashboard: http://localhost:4040
  Dashboard Token: ${config.dashboardToken}
  Status: forgeclaw status
  Logs: forgeclaw logs

  API keys stored in: ~/.forgeclaw/.env
  Config: ~/.forgeclaw/forgeclaw.config.json

  IMPORTANT: Save the Dashboard Token above. You'll need it to access the dashboard.`)
}
