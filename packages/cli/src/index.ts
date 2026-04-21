#!/usr/bin/env bun

import { install } from './commands/install'
import { uninstall } from './commands/uninstall'
import { status } from './commands/status'
import { logs } from './commands/logs'
import { exportData } from './commands/export'
import { token } from './commands/token'
import type { ArchetypeSlug } from './templates/archetypes'

const VALID_SLUGS: ArchetypeSlug[] = [
  'solo-builder',
  'content-creator',
  'agency-freela',
  'ecom-manager',
  'generic',
]

function parseFlags(argv: string[]): {
  resume: boolean
  archetype?: ArchetypeSlug
  noHandoff: boolean
} {
  const out = { resume: false, noHandoff: false } as {
    resume: boolean
    archetype?: ArchetypeSlug
    noHandoff: boolean
  }
  for (const a of argv) {
    if (a === '--resume') out.resume = true
    else if (a === '--no-handoff') out.noHandoff = true
    else if (a.startsWith('--archetype=')) {
      const v = a.split('=')[1] as ArchetypeSlug
      if (!VALID_SLUGS.includes(v)) {
        console.error(
          `Invalid --archetype value: ${v}. Valid: ${VALID_SLUGS.join(', ')}`
        )
        process.exit(1)
      }
      out.archetype = v
    }
  }
  return out
}

const command = process.argv[2]
const extraArgs = process.argv.slice(3)
const flags = parseFlags(extraArgs)

function showHelp(): void {
  console.log(`
  ForgeClaw CLI - Your Personal AI Command Center

  Usage:
    forgeclaw <command> [flags]

  Commands:
    install     Set up ForgeClaw (interactive onboarding)
    update      Re-run installer preserving existing config
    uninstall   Remove ForgeClaw service and optionally data
    status      Show service and configuration status
    token       Show your dashboard login token
    export      Create backup of all ForgeClaw data (.tar.gz)
    logs        Tail bot logs in real-time

  Install flags:
    --resume                       Resume from last incomplete phase (~/.forgeclaw/.install-state.json)
    --archetype=<slug>             Skip the archetype prompt. Valid: solo-builder | content-creator | agency-freela | ecom-manager | generic
    --no-handoff                   Do not spawn dashboard nor open browser (useful in CI)

  Examples:
    forgeclaw install
    forgeclaw install --archetype=solo-builder
    forgeclaw install --resume
    forgeclaw update
    forgeclaw status
`)
}

switch (command) {
  case 'install':
    await install({
      resume: flags.resume,
      archetype: flags.archetype,
      noHandoff: flags.noHandoff,
    })
    break
  case 'update':
    await install({
      update: true,
      resume: flags.resume,
      archetype: flags.archetype,
      noHandoff: flags.noHandoff,
    })
    break
  case 'uninstall':
    await uninstall()
    break
  case 'status':
    await status()
    break
  case 'token':
    await token()
    break
  case 'export':
    await exportData()
    break
  case 'logs':
    await logs()
    break
  default:
    showHelp()
    break
}
