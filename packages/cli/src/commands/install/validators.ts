import { existsSync, statSync } from 'node:fs';

export interface ValidationOk<T = void> {
  ok: true;
  data?: T;
}
export interface ValidationErr {
  ok: false;
  reason: string;
}
export type ValidationResult<T = void> = ValidationOk<T> | ValidationErr;

/**
 * Compara semver "major.minor.patch". Retorna <0 se a<b, 0 igual, >0 se a>b.
 * Ignora pre-release tags (-rc, -beta, etc).
 */
export function compareSemver(a: string, b: string): number {
  const pa = a.replace(/-.*$/, '').split('.').map(Number);
  const pb = b.replace(/-.*$/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Valida formato superficial `digits:base64ish`. NAO faz network.
 */
export function validateBotTokenShape(token: string): ValidationResult {
  if (!token) return { ok: false, reason: 'Token is required' };
  if (!/^\d+:[\w-]+$/.test(token)) {
    return { ok: false, reason: 'Token must be `<digits>:<alphanumeric/_/->` (from @BotFather)' };
  }
  return { ok: true };
}

/**
 * Valida via Telegram Bot API `getMe`. Retorna botUsername quando ok.
 */
export async function validateBotToken(
  token: string,
  timeoutMs = 5000
): Promise<ValidationResult<{ botUsername: string; botId: number }>> {
  const shape = validateBotTokenShape(token);
  if (!shape.ok) return shape;

  try {
    const url = `https://api.telegram.org/bot${token}/getMe`;
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (res.status === 401) {
      return { ok: false, reason: 'Invalid bot token (Telegram returned 401 Unauthorized).' };
    }
    if (!res.ok) {
      return { ok: false, reason: `Telegram API error: HTTP ${res.status}` };
    }
    const body = (await res.json()) as {
      ok: boolean;
      result?: { id: number; username?: string };
      description?: string;
    };
    if (!body.ok || !body.result) {
      return { ok: false, reason: body.description ?? 'Telegram responded ok:false' };
    }
    return {
      ok: true,
      data: {
        botId: body.result.id,
        botUsername: body.result.username ?? 'unknown',
      },
    };
  } catch (err) {
    const msg = (err as Error).name === 'TimeoutError'
      ? `Timed out after ${timeoutMs}ms calling Telegram (check internet).`
      : `Network error: ${(err as Error).message}`;
    return { ok: false, reason: msg };
  }
}

/**
 * Valida user id do Telegram: inteiro positivo.
 */
export function validateTelegramUserId(input: string): ValidationResult<{ userId: number }> {
  if (!/^\d+$/.test(input)) return { ok: false, reason: 'User ID must be digits only' };
  const n = Number(input);
  if (!Number.isFinite(n) || n <= 0) return { ok: false, reason: 'User ID must be > 0' };
  if (n > Number.MAX_SAFE_INTEGER) return { ok: false, reason: 'User ID out of range' };
  return { ok: true, data: { userId: n } };
}

/**
 * Valida que um path existe e e diretorio. NAO cria nada.
 */
export function validateDirectoryExists(path: string): ValidationResult {
  if (!path) return { ok: false, reason: 'Directory path is required' };
  if (!existsSync(path)) return { ok: false, reason: `Directory does not exist: ${path}` };
  try {
    if (!statSync(path).isDirectory()) return { ok: false, reason: `Not a directory: ${path}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: `Cannot stat ${path}: ${(err as Error).message}` };
  }
}
