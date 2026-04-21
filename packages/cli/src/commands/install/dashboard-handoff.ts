import { resolve } from 'node:path';
import { startService, isServiceRunning } from '../../utils/service';

export const DASHBOARD_HOST = 'localhost';
export const DASHBOARD_PORT = 4040;

export interface SpawnResult {
  strategy: 'service-started' | 'service-already-up' | 'background-spawn' | 'skipped';
  pid?: number;
  message: string;
}

/**
 * Em cenario ideal o servico systemd/launchd ja foi instalado em Fase B,
 * entao apenas startamos (ou consultamos se ja sobe). Fallback: spawn em background
 * rodando `bun run start` no diretorio do dashboard.
 */
export async function spawnDashboardIfNeeded(
  monorepoRoot: string,
  serviceInstalled: boolean
): Promise<SpawnResult> {
  if (serviceInstalled) {
    const running = await isServiceRunning();
    if (running) {
      return { strategy: 'service-already-up', message: 'forgeclaw service already running.' };
    }
    const r = await startService();
    if (r.success) {
      return { strategy: 'service-started', message: r.message };
    }
    // Falhou a subir servico — nao fatal, tenta fallback
    // eslint-disable-next-line no-console
    console.warn(`[handoff] startService failed: ${r.message} — falling back to background spawn.`);
  }

  // Fallback: background spawn do dashboard em modo producao (se build existe) ou dev
  const dashboardDir = resolve(monorepoRoot, 'packages', 'dashboard');
  try {
    const proc = Bun.spawn(['bun', 'run', 'start'], {
      cwd: dashboardDir,
      stdout: 'ignore',
      stderr: 'ignore',
      stdin: 'ignore',
      // Desacoplar do processo pai pra sobreviver apos `forgeclaw install` terminar
      env: { ...process.env, NODE_ENV: 'production' },
    });
    // Pequena espera pra processo falhar imediatamente se start nao existir
    await Promise.race([
      new Promise((r) => setTimeout(r, 800)),
      proc.exited,
    ]);
    if (proc.exitCode !== null && proc.exitCode !== 0) {
      return {
        strategy: 'skipped',
        message: `Dashboard spawn exited ${proc.exitCode}. Start it manually: cd packages/dashboard && bun run start`,
      };
    }
    return {
      strategy: 'background-spawn',
      pid: proc.pid,
      message: `Dashboard spawned in background (pid ${proc.pid}).`,
    };
  } catch (err) {
    return {
      strategy: 'skipped',
      message: `Failed to spawn dashboard: ${(err as Error).message}`,
    };
  }
}

/**
 * Polla o dashboard com backoff exponencial ate ficar up ou timeout.
 * Primeiro tenta /api/health (Fase 27). Se 404, aceita qualquer resposta < 500 em /.
 */
export async function waitForDashboardUp(maxMs = 15000): Promise<boolean> {
  const start = Date.now();
  let delay = 400;
  const probes = [
    `http://${DASHBOARD_HOST}:${DASHBOARD_PORT}/api/health`,
    `http://${DASHBOARD_HOST}:${DASHBOARD_PORT}/`,
  ];
  while (Date.now() - start < maxMs) {
    for (const url of probes) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
        if (res.status < 500) return true;
      } catch {
        // connection refused / timeout — continua polling
      }
    }
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.5, 2500);
  }
  return false;
}

/**
 * Constroi a URL de onboarding para o browser.
 */
export function buildOnboardingUrl(token: string): string {
  const safe = encodeURIComponent(token);
  return `http://${DASHBOARD_HOST}:${DASHBOARD_PORT}/onboarding?token=${safe}`;
}
