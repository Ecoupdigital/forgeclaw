import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync, chmodSync, existsSync, statSync } from 'node:fs';
import { tmpdir, platform } from 'node:os';
import { join } from 'node:path';
import {
  readState,
  writeState,
  clearState,
  createFreshState,
} from '../../src/commands/install/state';
import type { InstallState } from '../../src/commands/install/types';

let tmp: string;
let stateFile: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'fc-state-'));
  stateFile = join(tmp, '.install-state.json');
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe('state IO', () => {
  test('readState returns null when file absent', () => {
    expect(readState(stateFile)).toBeNull();
  });

  test('createFreshState has phase=none and version=1', () => {
    const s = createFreshState();
    expect(s.phase).toBe('none');
    expect(s.version).toBe(1);
    expect(typeof s.startedAt).toBe('string');
  });

  test('writeState then readState round-trip preserves data', () => {
    const state: InstallState = {
      version: 1,
      phase: 'a-complete',
      startedAt: '2026-01-01T00:00:00.000Z',
      lastUpdatedAt: '2026-01-01T00:00:01.000Z',
      pauseReason: undefined,
      phaseAResult: {
        botToken: '123:abc',
        userId: 42,
        voiceProvider: 'groq',
        openaiApiKey: null,
        groqApiKey: 'gsk_x',
        workingDir: '/tmp/work',
        vaultPath: null,
        userName: 'Tester',
        company: '',
        role: '',
        timezone: 'UTC',
        dashboardToken: 'tok123',
      },
    };
    writeState(stateFile, state);
    expect(existsSync(stateFile)).toBe(true);
    const loaded = readState(stateFile);
    expect(loaded).not.toBeNull();
    expect(loaded?.phase).toBe('a-complete');
    expect(loaded?.phaseAResult?.userId).toBe(42);
    expect(loaded?.phaseAResult?.groqApiKey).toBe('gsk_x');
  });

  test('writeState applies 0600 permissions on unix', () => {
    if (platform() === 'win32') return; // skip
    writeState(stateFile, createFreshState());
    const mode = statSync(stateFile).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  test('readState returns null on invalid JSON', () => {
    writeFileSync(stateFile, '{not valid json}');
    chmodSync(stateFile, 0o600);
    expect(readState(stateFile)).toBeNull();
  });

  test('readState returns null on incompatible version', () => {
    writeFileSync(stateFile, JSON.stringify({ version: 999, phase: 'none' }));
    expect(readState(stateFile)).toBeNull();
  });

  test('readState returns null on invalid phase value', () => {
    writeFileSync(
      stateFile,
      JSON.stringify({ version: 1, phase: 'bogus', startedAt: '', lastUpdatedAt: '' })
    );
    expect(readState(stateFile)).toBeNull();
  });

  test('clearState removes file', () => {
    writeState(stateFile, createFreshState());
    expect(existsSync(stateFile)).toBe(true);
    clearState(stateFile);
    expect(existsSync(stateFile)).toBe(false);
  });

  test('clearState on missing file is a no-op', () => {
    expect(() => clearState(stateFile)).not.toThrow();
  });
});
