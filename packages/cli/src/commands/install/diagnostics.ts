import { compareSemver } from './validators';

export interface BunCheck {
  installed: boolean;
  version?: string;
  meetsMinimum: boolean;
  minimum: string;
}

export interface ClaudeCheck {
  installed: boolean;
  binaryPath?: string;
}

export interface ClaudeAuthCheck {
  authenticated: boolean;
  hint?: string;
}

export const MIN_BUN_VERSION = '1.1.0';

/**
 * Executa um binary com timeout e captura stdout/stderr.
 */
async function runWithTimeout(
  cmd: string[],
  timeoutMs: number
): Promise<{ exitCode: number; stdout: string; stderr: string; timedOut: boolean }> {
  try {
    const proc = Bun.spawn(cmd, {
      stdout: 'pipe',
      stderr: 'pipe',
      stdin: 'ignore',
    });
    const timer = new Promise<'timeout'>((resolve) =>
      setTimeout(() => resolve('timeout'), timeoutMs)
    );
    const finished = proc.exited.then(() => 'exit' as const);
    const race = await Promise.race([finished, timer]);
    if (race === 'timeout') {
      try {
        proc.kill();
      } catch {
        // ignore
      }
      return { exitCode: -1, stdout: '', stderr: '', timedOut: true };
    }
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    return {
      exitCode: proc.exitCode ?? -1,
      stdout,
      stderr,
      timedOut: false,
    };
  } catch (err) {
    return { exitCode: -1, stdout: '', stderr: String(err), timedOut: false };
  }
}

async function which(binary: string): Promise<string | null> {
  const r = await runWithTimeout(['which', binary], 3000);
  if (r.exitCode !== 0 || r.timedOut) return null;
  const path = r.stdout.trim();
  return path.length > 0 ? path : null;
}

export async function checkBun(): Promise<BunCheck> {
  const path = await which('bun');
  if (!path) {
    return { installed: false, meetsMinimum: false, minimum: MIN_BUN_VERSION };
  }
  const v = await runWithTimeout(['bun', '--version'], 3000);
  if (v.exitCode !== 0) {
    return { installed: true, meetsMinimum: false, minimum: MIN_BUN_VERSION };
  }
  const version = v.stdout.trim();
  return {
    installed: true,
    version,
    meetsMinimum: compareSemver(version, MIN_BUN_VERSION) >= 0,
    minimum: MIN_BUN_VERSION,
  };
}

export async function checkClaudeInstalled(): Promise<ClaudeCheck> {
  const binaryPath = await which('claude');
  if (!binaryPath) return { installed: false };
  return { installed: true, binaryPath };
}

/**
 * Valida autenticacao do Claude Code CLI rodando `claude --print ping`.
 *
 * Regras:
 * - exit code 0 E stdout nao vazio -> autenticado
 * - timeout (>8s) -> nao autenticado (provavelmente preso em auth flow)
 * - stderr contem `/login|unauthoriz|invalid api key|not authenticated/i` -> nao autenticado
 * - exit code != 0 + stderr generico -> assume nao autenticado com hint
 */
export async function checkClaudeAuth(): Promise<ClaudeAuthCheck> {
  const r = await runWithTimeout(['claude', '--print', 'ping'], 8000);
  if (r.timedOut) {
    return {
      authenticated: false,
      hint: 'claude --print hung for 8s (likely not authenticated). Run: claude login',
    };
  }
  if (r.exitCode === 0 && r.stdout.trim().length > 0) {
    return { authenticated: true };
  }
  const stderr = (r.stderr || '').toLowerCase();
  if (
    /login|unauthoriz|invalid api key|not authenticated|no credentials/.test(stderr) ||
    /login/i.test(r.stdout)
  ) {
    return {
      authenticated: false,
      hint: 'Claude CLI reported auth failure. Run: claude login',
    };
  }
  return {
    authenticated: false,
    hint: `claude --print exited ${r.exitCode}. Check your Claude Code CLI install. Run: claude login`,
  };
}
