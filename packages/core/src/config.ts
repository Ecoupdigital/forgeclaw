import { readFile, watch } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { ForgeClawConfig } from './types';

const CONFIG_DIR = join(homedir(), '.forgeclaw');
const CONFIG_PATH = join(CONFIG_DIR, 'forgeclaw.config.json');

let cachedConfig: ForgeClawConfig | null = null;
let watchAbort: AbortController | null = null;

function validateConfig(raw: unknown): ForgeClawConfig {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`Invalid config: expected object, got ${typeof raw}`);
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.botToken !== 'string' || !obj.botToken) {
    throw new Error('Config missing required field: botToken');
  }

  if (!Array.isArray(obj.allowedUsers) || obj.allowedUsers.length === 0) {
    throw new Error('Config missing required field: allowedUsers (non-empty array of user IDs)');
  }

  for (const uid of obj.allowedUsers) {
    if (typeof uid !== 'number') {
      throw new Error(`allowedUsers must contain numbers, got ${typeof uid}`);
    }
  }

  return {
    botToken: obj.botToken,
    allowedUsers: obj.allowedUsers as number[],
    workingDir: (typeof obj.workingDir === 'string' ? obj.workingDir : join(homedir(), 'forgeclaw-projects')),
    vaultPath: typeof obj.vaultPath === 'string' ? obj.vaultPath : undefined,
    voiceProvider: isVoiceProvider(obj.voiceProvider) ? obj.voiceProvider : undefined,
    claudeModel: typeof obj.claudeModel === 'string' ? obj.claudeModel : undefined,
    maxConcurrentSessions: typeof obj.maxConcurrentSessions === 'number' ? obj.maxConcurrentSessions : undefined,
  };
}

function isVoiceProvider(val: unknown): val is 'openai' | 'google' | 'none' {
  return val === 'openai' || val === 'google' || val === 'none';
}

export async function loadConfig(): Promise<ForgeClawConfig> {
  const content = await readFile(CONFIG_PATH, 'utf-8');
  const parsed: unknown = JSON.parse(content);
  return validateConfig(parsed);
}

export async function getConfig(): Promise<ForgeClawConfig> {
  if (cachedConfig) return cachedConfig;
  cachedConfig = await loadConfig();
  return cachedConfig;
}

export async function reloadConfig(): Promise<ForgeClawConfig> {
  cachedConfig = await loadConfig();
  return cachedConfig;
}

export function watchConfig(onChange: (config: ForgeClawConfig) => void): void {
  if (watchAbort) {
    watchAbort.abort();
  }

  watchAbort = new AbortController();

  (async () => {
    try {
      const watcher = watch(CONFIG_PATH, { signal: watchAbort!.signal });
      for await (const event of watcher) {
        if (event.eventType === 'change') {
          try {
            const newConfig = await loadConfig();
            cachedConfig = newConfig;
            onChange(newConfig);
          } catch (err) {
            console.error('[config] Hot-reload failed, keeping previous config:', err);
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('[config] Watch error:', err);
    }
  })();
}

export function stopWatchingConfig(): void {
  if (watchAbort) {
    watchAbort.abort();
    watchAbort = null;
  }
}
