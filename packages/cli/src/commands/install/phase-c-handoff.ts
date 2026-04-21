import { outro, log, spinner } from '@clack/prompts';
import type { InstallContext, PhaseAResult, PhaseBResult } from './types';
import { clearState } from './state';
import {
  spawnDashboardIfNeeded,
  waitForDashboardUp,
  buildOnboardingUrl,
} from './dashboard-handoff';
import { openUrl } from '../../utils/open-url';

function formatFinalOutro(
  phaseA: PhaseAResult,
  phaseB: PhaseBResult,
  url: string,
  dashboardReady: boolean,
  handoffSkipped: boolean
): string {
  const readyLine = dashboardReady
    ? `Dashboard: ${url}`
    : `Dashboard did not respond yet. Try opening manually: ${url}`;
  const handoffLine = handoffSkipped
    ? 'Handoff skipped (--no-handoff). Open the URL above manually when ready.'
    : 'The dashboard should be opening in your browser.';

  return `ForgeClaw is ready!

  Archetype: ${phaseB.archetype}
  Harness files: ${phaseB.harnessFilesWritten.length}
  ${readyLine}
  Dashboard Token: ${phaseA.dashboardToken}

  Open Telegram and send /start to your bot
  Status: forgeclaw status
  Logs:   forgeclaw logs

  API keys stored in: ~/.forgeclaw/.env
  Config:            ~/.forgeclaw/forgeclaw.config.json

  ${handoffLine}

  IMPORTANT: Save the Dashboard Token above. You'll need it to access the dashboard.`;
}

export async function runPhaseC(
  ctx: InstallContext,
  phaseA: PhaseAResult,
  phaseB: PhaseBResult
): Promise<void> {
  const url = buildOnboardingUrl(phaseA.dashboardToken);

  if (ctx.options.noHandoff) {
    log.info('Skipping dashboard handoff (--no-handoff).');
    outro(formatFinalOutro(phaseA, phaseB, url, false, true));
    clearState(ctx.stateFilePath);
    return;
  }

  // --- 1) Spawn dashboard ---
  const spSpawn = spinner();
  spSpawn.start('Starting dashboard...');
  const spawnResult = await spawnDashboardIfNeeded(
    ctx.monorepoRoot,
    phaseB.serviceInstalled
  );
  spSpawn.stop(`Dashboard: ${spawnResult.strategy} — ${spawnResult.message}`);

  // --- 2) Wait until up ---
  const spWait = spinner();
  spWait.start('Waiting for dashboard to accept connections...');
  const up = await waitForDashboardUp(15000);
  spWait.stop(up ? 'Dashboard is up.' : 'Dashboard did not respond within 15s.');

  // --- 3) Open browser ---
  if (up) {
    const openResult = await openUrl(url);
    if (!openResult.ok) {
      log.warn(`Could not open browser automatically: ${openResult.reason ?? 'unknown'}`);
      log.info(`Open manually: ${url}`);
    } else {
      log.success(`Opened browser via ${openResult.command}.`);
    }
  } else {
    log.warn(`Dashboard not responding. Open manually after it starts: ${url}`);
  }

  // --- 4) Outro final ---
  outro(formatFinalOutro(phaseA, phaseB, url, up, false));

  // --- 5) Limpar state apos handoff ---
  clearState(ctx.stateFilePath);
}
