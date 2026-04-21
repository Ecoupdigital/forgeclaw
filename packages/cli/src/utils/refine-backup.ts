/**
 * Re-export of harness backup utilities.
 *
 * The implementation lives in `@forgeclaw/core` (see `harness-backup.ts`) so
 * both the CLI and the dashboard share a single source of truth. This
 * barrel stays for backwards compatibility with existing CLI imports from
 * Fase 28-01.
 */

export {
  createBackup,
  listBackups,
  restoreBackup,
  type BackupInfo,
} from '@forgeclaw/core'
