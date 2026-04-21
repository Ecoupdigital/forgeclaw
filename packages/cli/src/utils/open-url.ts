import { platform } from 'node:os';

export interface OpenUrlResult {
  ok: boolean;
  command?: string;
  reason?: string;
}

/**
 * Abre `url` no browser default. Retorna ok:false silenciosamente se o spawn
 * falhar. NAO e responsabilidade desta funcao validar a URL.
 */
export async function openUrl(url: string, timeoutMs = 5000): Promise<OpenUrlResult> {
  const p = platform();
  let cmd: string[];
  if (p === 'linux') cmd = ['xdg-open', url];
  else if (p === 'darwin') cmd = ['open', url];
  else if (p === 'win32') cmd = ['cmd', '/c', 'start', '""', url];
  else return { ok: false, reason: `Unsupported platform: ${p}` };

  try {
    const proc = Bun.spawn(cmd, {
      stdout: 'ignore',
      stderr: 'pipe',
      stdin: 'ignore',
    });
    const timer = new Promise<'timeout'>((resolve) =>
      setTimeout(() => resolve('timeout'), timeoutMs)
    );
    const done = proc.exited.then(() => 'exit' as const);
    const race = await Promise.race([timer, done]);
    if (race === 'timeout') {
      // xdg-open/open as vezes retorna apos o browser abrir — consideramos ok
      return { ok: true, command: cmd[0] };
    }
    if (proc.exitCode === 0) return { ok: true, command: cmd[0] };
    const stderr = await new Response(proc.stderr).text();
    return {
      ok: false,
      command: cmd[0],
      reason: `${cmd[0]} exited ${proc.exitCode}: ${stderr.slice(0, 200)}`,
    };
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }
}
