#!/usr/bin/env bun

import { install } from './commands/install'
import { uninstall } from './commands/uninstall'
import { status } from './commands/status'
import { logs } from './commands/logs'
import { exportData } from './commands/export'
import { token } from './commands/token'
import { refine, VALID_SECTIONS, type RefineSection } from './commands/refine'
import type { ArchetypeSlug } from './templates/archetypes'

const VALID_SLUGS: ArchetypeSlug[] = [
  'solo-builder',
  'content-creator',
  'agency-freela',
  'ecom-manager',
  'generic',
]

function isArchetypeSlug(v: unknown): v is ArchetypeSlug {
  return typeof v === 'string' && VALID_SLUGS.includes(v as ArchetypeSlug)
}

function isRefineSection(v: unknown): v is RefineSection {
  return typeof v === 'string' && VALID_SECTIONS.includes(v as RefineSection)
}

interface RefineFlags {
  archetype?: ArchetypeSlug
  section?: RefineSection
  reset: boolean
  rollback: boolean
}

/**
 * Parse `refine`-specific flags. Unknown flags are silently ignored so
 * `--bogus=x` does not crash. Invalid values for known flags (`--archetype=foo`,
 * `--section=XYZ`) abort with a clear error listing valid options.
 */
function parseRefineFlags(argv: string[]): RefineFlags {
  const out: RefineFlags = { reset: false, rollback: false }
  for (const a of argv) {
    if (!a.startsWith('--')) continue
    const [key, ...rest] = a.slice(2).split('=')
    const value = rest.length > 0 ? rest.join('=') : true
    if (key === 'reset' && value === true) {
      out.reset = true
    } else if (key === 'rollback' && value === true) {
      out.rollback = true
    } else if (key === 'archetype' && typeof value === 'string') {
      if (!isArchetypeSlug(value)) {
        console.error(`Invalid --archetype value: ${value}`)
        console.error(`Valid: ${VALID_SLUGS.join(', ')}`)
        process.exit(1)
      }
      out.archetype = value
    } else if (key === 'section' && typeof value === 'string') {
      if (!isRefineSection(value)) {
        console.error(`Invalid --section value: ${value}`)
        console.error(`Valid: ${VALID_SECTIONS.join(', ')}`)
        process.exit(1)
      }
      out.section = value
    }
    // unknown flags: ignore silently
  }
  return out
}

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
// Only parse install-scoped flags when the command actually is install/update.
// Other commands (notably `refine`) own their flag parsing and reuse names
// like `--archetype` with the same valid slugs but different semantics.
const flags =
  command === 'install' || command === 'update'
    ? parseFlags(extraArgs)
    : { resume: false, noHandoff: false as boolean }

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
    refine      Refine harness without reinstalling (re-run interviewer)
                  --archetype=<slug>  Switch archetype (preserves DB/memory)
                  --section=<NAME>    Refine single section (SOUL|USER|AGENTS|TOOLS|MEMORY|STYLE|HEARTBEAT)
                  --reset             Reset harness to archetype template
                  --rollback          Restore a previous backup

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
    forgeclaw refine
    forgeclaw refine --section=USER
    forgeclaw refine --archetype=content-creator
    forgeclaw refine --rollback
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
  case 'refine': {
    const refineFlags = parseRefineFlags(extraArgs)
    await refine({
      archetype: refineFlags.archetype,
      section: refineFlags.section,
      reset: refineFlags.reset,
      rollback: refineFlags.rollback,
    })
    break
  }
  default:
    showHelp()
    break
}
