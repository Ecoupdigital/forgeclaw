import { writeFileSync, existsSync, unlinkSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'

interface ServiceResult {
  success: boolean
  message: string
}

const SERVICE_NAME = 'forgeclaw'
const SYSTEMD_PATH = `/etc/systemd/system/${SERVICE_NAME}.service`
const LAUNCHD_LABEL = 'com.forgeclaw.bot'
const LAUNCHD_PATH = join(homedir(), 'Library', 'LaunchAgents', `${LAUNCHD_LABEL}.plist`)

const DASHBOARD_SERVICE_NAME = 'forgeclaw-dashboard'
const SYSTEMD_DASHBOARD_PATH = `/etc/systemd/system/${DASHBOARD_SERVICE_NAME}.service`
const LAUNCHD_DASHBOARD_LABEL = 'com.forgeclaw.dashboard'
const LAUNCHD_DASHBOARD_PATH = join(homedir(), 'Library', 'LaunchAgents', `${LAUNCHD_DASHBOARD_LABEL}.plist`)

const ENV_FILE_PATH = join(homedir(), '.forgeclaw', '.env')

// Resolve path to the bot entry point relative to CLI package
const BOT_ENTRY = resolve(__dirname, '..', '..', '..', 'bot', 'src', 'index.ts')
const DASHBOARD_DIR = resolve(__dirname, '..', '..', '..', 'dashboard')

function getSystemdUnit(): string {
  return `[Unit]
Description=ForgeClaw - Personal AI Command Center
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/bun run ${BOT_ENTRY}
Restart=always
RestartSec=5
EnvironmentFile=-${ENV_FILE_PATH}
Environment=HOME=${homedir()}
WorkingDirectory=${resolve(__dirname, '..', '..', '..', '..')}

[Install]
WantedBy=multi-user.target
`
}

function getSystemdDashboardUnit(): string {
  return `[Unit]
Description=ForgeClaw Dashboard
After=forgeclaw.service
Requires=forgeclaw.service

[Service]
Type=simple
ExecStartPre=/usr/bin/bun run build
ExecStart=/usr/bin/bun run start
Restart=always
RestartSec=5
EnvironmentFile=-${ENV_FILE_PATH}
Environment=HOME=${homedir()}
Environment=NODE_ENV=production
WorkingDirectory=${DASHBOARD_DIR}

[Install]
WantedBy=multi-user.target
`
}

function getLaunchdPlist(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCHD_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/bun</string>
    <string>run</string>
    <string>${BOT_ENTRY}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${join(homedir(), '.forgeclaw', 'logs', 'bot.log')}</string>
  <key>StandardErrorPath</key>
  <string>${join(homedir(), '.forgeclaw', 'logs', 'bot.err.log')}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>HOME</key>
    <string>${homedir()}</string>
  </dict>
</dict>
</plist>
`
}

async function runCommand(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  try {
    const proc = Bun.spawn(args, { stdout: 'pipe', stderr: 'pipe' })
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ])
    await proc.exited
    return { exitCode: proc.exitCode ?? 1, stdout, stderr }
  } catch (err) {
    return { exitCode: 1, stdout: '', stderr: String(err) }
  }
}

export async function setupService(_config: Record<string, unknown>): Promise<ServiceResult> {
  const platform = process.platform

  if (platform === 'linux') {
    return setupSystemdService()
  } else if (platform === 'darwin') {
    return setupLaunchdService()
  } else {
    return {
      success: false,
      message: `Unsupported platform: ${platform}. Manual service setup required.`,
    }
  }
}

async function setupSystemdService(): Promise<ServiceResult> {
  try {
    writeFileSync(SYSTEMD_PATH, getSystemdUnit())

    const reload = await runCommand(['systemctl', 'daemon-reload'])
    if (reload.exitCode !== 0) {
      return { success: false, message: `Failed to reload systemd: ${reload.stderr}` }
    }

    const enable = await runCommand(['systemctl', 'enable', SERVICE_NAME])
    if (enable.exitCode !== 0) {
      return { success: false, message: `Failed to enable service: ${enable.stderr}` }
    }

    const start = await runCommand(['systemctl', 'start', SERVICE_NAME])
    if (start.exitCode !== 0) {
      return { success: false, message: `Failed to start service: ${start.stderr}` }
    }

    return { success: true, message: 'Systemd service installed and started.' }
  } catch (err) {
    return { success: false, message: `Service setup failed: ${err}. Try running with sudo.` }
  }
}

async function setupLaunchdService(): Promise<ServiceResult> {
  try {
    const agentDir = join(homedir(), 'Library', 'LaunchAgents')
    mkdirSync(agentDir, { recursive: true })

    writeFileSync(LAUNCHD_PATH, getLaunchdPlist())

    const load = await runCommand(['launchctl', 'load', LAUNCHD_PATH])
    if (load.exitCode !== 0) {
      return { success: false, message: `Failed to load launchd service: ${load.stderr}` }
    }

    return { success: true, message: 'Launchd service installed and started.' }
  } catch (err) {
    return { success: false, message: `Service setup failed: ${err}` }
  }
}

export async function startService(): Promise<ServiceResult> {
  const platform = process.platform
  if (platform === 'linux') {
    const result = await runCommand(['systemctl', 'start', SERVICE_NAME])
    return {
      success: result.exitCode === 0,
      message: result.exitCode === 0 ? 'Service started.' : `Failed: ${result.stderr}`,
    }
  } else if (platform === 'darwin') {
    const result = await runCommand(['launchctl', 'start', LAUNCHD_LABEL])
    return {
      success: result.exitCode === 0,
      message: result.exitCode === 0 ? 'Service started.' : `Failed: ${result.stderr}`,
    }
  }
  return { success: false, message: 'Unsupported platform.' }
}

export async function stopService(): Promise<ServiceResult> {
  const platform = process.platform
  if (platform === 'linux') {
    const result = await runCommand(['systemctl', 'stop', SERVICE_NAME])
    return {
      success: result.exitCode === 0,
      message: result.exitCode === 0 ? 'Service stopped.' : `Failed to stop: ${result.stderr}`,
    }
  } else if (platform === 'darwin') {
    const result = await runCommand(['launchctl', 'stop', LAUNCHD_LABEL])
    return {
      success: result.exitCode === 0,
      message: result.exitCode === 0 ? 'Service stopped.' : `Failed to stop: ${result.stderr}`,
    }
  }
  return { success: false, message: 'Unsupported platform.' }
}

export async function removeService(): Promise<ServiceResult> {
  const platform = process.platform
  if (platform === 'linux') {
    await runCommand(['systemctl', 'disable', SERVICE_NAME])
    if (existsSync(SYSTEMD_PATH)) {
      unlinkSync(SYSTEMD_PATH)
      await runCommand(['systemctl', 'daemon-reload'])
    }
    return { success: true, message: 'Systemd service removed.' }
  } else if (platform === 'darwin') {
    if (existsSync(LAUNCHD_PATH)) {
      await runCommand(['launchctl', 'unload', LAUNCHD_PATH])
      unlinkSync(LAUNCHD_PATH)
    }
    return { success: true, message: 'Launchd service removed.' }
  }
  return { success: false, message: 'Unsupported platform.' }
}

export async function isServiceRunning(): Promise<boolean> {
  const platform = process.platform
  if (platform === 'linux') {
    const result = await runCommand(['systemctl', 'is-active', SERVICE_NAME])
    return result.stdout.trim() === 'active'
  } else if (platform === 'darwin') {
    const result = await runCommand(['launchctl', 'list', LAUNCHD_LABEL])
    return result.exitCode === 0
  }
  return false
}
