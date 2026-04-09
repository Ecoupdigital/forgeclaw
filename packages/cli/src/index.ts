#!/usr/bin/env bun

import { install } from './commands/install'
import { uninstall } from './commands/uninstall'
import { status } from './commands/status'
import { logs } from './commands/logs'

const command = process.argv[2]

function showHelp(): void {
  console.log(`
  ForgeClaw CLI - Your Personal AI Command Center

  Usage:
    forgeclaw <command>

  Commands:
    install     Set up ForgeClaw (interactive onboarding)
    update      Re-run installer preserving existing config
    uninstall   Remove ForgeClaw service and optionally data
    status      Show service and configuration status
    logs        Tail bot logs in real-time

  Examples:
    forgeclaw install
    forgeclaw status
    forgeclaw logs
`)
}

switch (command) {
  case 'install':
    await install()
    break
  case 'update':
    await install({ update: true })
    break
  case 'uninstall':
    await uninstall()
    break
  case 'status':
    await status()
    break
  case 'logs':
    await logs()
    break
  default:
    showHelp()
    break
}
