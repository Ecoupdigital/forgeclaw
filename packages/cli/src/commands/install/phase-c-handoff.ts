import { outro, log } from '@clack/prompts';
import type { InstallContext, PhaseAResult, PhaseBResult } from './types';
import { clearState } from './state';

/**
 * STUB — 25-03 substitui com spawn do dashboard, health-check e open() no browser.
 * Nesta fase ja imprime o outro final e limpa state file.
 */
export async function runPhaseC(
  ctx: InstallContext,
  phaseA: PhaseAResult,
  phaseB: PhaseBResult
): Promise<void> {
  if (ctx.options.noHandoff) {
    log.info('Skipping handoff (--no-handoff).');
  }

  // Dashboard spawn + open browser: implementados em 25-03.
  // Placeholder: informar URL e token.
  log.info(`Archetype installed: ${phaseB.archetype}`);
  log.info(`Harness files written: ${phaseB.harnessFilesWritten.length}`);
  log.info(`Dashboard token: ${phaseA.dashboardToken}`);

  outro(`ForgeClaw is ready!

  Open Telegram and send /start to your bot
  Dashboard: http://localhost:4040
  Dashboard Token: ${phaseA.dashboardToken}
  Status: forgeclaw status
  Logs: forgeclaw logs

  API keys stored in: ~/.forgeclaw/.env
  Config: ~/.forgeclaw/forgeclaw.config.json

  IMPORTANT: Save the Dashboard Token above. You'll need it to access the dashboard.`);

  clearState(ctx.stateFilePath);
}
