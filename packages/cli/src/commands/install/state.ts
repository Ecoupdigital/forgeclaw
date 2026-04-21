import { existsSync, readFileSync, writeFileSync, chmodSync, mkdirSync, unlinkSync } from 'node:fs';
import { dirname } from 'node:path';
import type { InstallState } from './types';

const CURRENT_VERSION = 1 as const;

/**
 * Le o state file se existir. Retorna null se ausente, invalido ou de versao incompativel.
 * NAO lanca — callers tratam null.
 */
export function readState(stateFilePath: string): InstallState | null {
  if (!existsSync(stateFilePath)) return null;
  try {
    const raw = readFileSync(stateFilePath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<InstallState>;
    if (parsed.version !== CURRENT_VERSION) return null;
    if (parsed.phase !== 'none' && parsed.phase !== 'a-complete' && parsed.phase !== 'b-complete') {
      return null;
    }
    return parsed as InstallState;
  } catch {
    return null;
  }
}

/**
 * Escreve state file com permissao restrita. Cria parent dir se nao existir.
 */
export function writeState(stateFilePath: string, state: InstallState): void {
  const parent = dirname(stateFilePath);
  mkdirSync(parent, { recursive: true });
  const body: InstallState = {
    ...state,
    version: CURRENT_VERSION,
    lastUpdatedAt: new Date().toISOString(),
  };
  writeFileSync(stateFilePath, JSON.stringify(body, null, 2));
  try {
    chmodSync(stateFilePath, 0o600);
  } catch {
    // chmod falha em windows/network drives — ignore silencioso
  }
}

/**
 * Remove state file apos instalacao bem-sucedida.
 */
export function clearState(stateFilePath: string): void {
  if (!existsSync(stateFilePath)) return;
  try {
    unlinkSync(stateFilePath);
  } catch {
    // tolerante a permission errors
  }
}

/**
 * Helper para criar um state novo zerado. Usado quando nao ha resume.
 */
export function createFreshState(): InstallState {
  const now = new Date().toISOString();
  return {
    version: CURRENT_VERSION,
    phase: 'none',
    startedAt: now,
    lastUpdatedAt: now,
  };
}
