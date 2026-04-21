import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runPhaseB } from '../../src/commands/install/phase-b-archetype';
import type { InstallContext, PhaseAResult } from '../../src/commands/install/types';

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'fc-phaseb-'));
  process.env.FORGECLAW_SKIP_SERVICE = '1';
});

afterEach(() => {
  delete process.env.FORGECLAW_SKIP_SERVICE;
  rmSync(tmp, { recursive: true, force: true });
});

function makeCtx(archetype: 'solo-builder' | 'generic' = 'generic'): InstallContext {
  const forgeclawDir = join(tmp, '.forgeclaw');
  mkdirSync(forgeclawDir, { recursive: true });
  return {
    options: { archetype, noHandoff: true },
    forgeclawDir,
    configPath: join(forgeclawDir, 'forgeclaw.config.json'),
    stateFilePath: join(forgeclawDir, '.install-state.json'),
    monorepoRoot: process.cwd(), // usar repo atual para bun install nao inventar dir
    existingConfig: {},
    existingState: null,
  };
}

function makePhaseA(workingDir: string, vaultPath: string | null = null): PhaseAResult {
  return {
    botToken: '123456:fake_token_for_tests',
    userId: 42,
    voiceProvider: 'groq',
    openaiApiKey: null,
    groqApiKey: 'gsk_test_fake',
    workingDir,
    vaultPath,
    userName: 'Tester',
    company: 'Acme',
    role: 'Builder',
    timezone: 'UTC',
    dashboardToken: 'tok_fake_32chars_len_aaaaaaaaaaaa',
  };
}

describe('runPhaseB (integration)', () => {
  test('writes 7 harness files, config.json with archetype field, state phase=b-complete', async () => {
    const ctx = makeCtx('generic');
    const phaseA = makePhaseA(tmp);
    const result = await runPhaseB(ctx, phaseA);

    // Resultado
    expect(result.archetype).toBe('generic');
    expect(result.harnessFilesWritten.length).toBe(7);
    expect(result.serviceInstalled).toBe(false); // FORGECLAW_SKIP_SERVICE ativo

    // Harness files
    const harnessDir = join(ctx.forgeclawDir, 'harness');
    for (const f of ['SOUL.md', 'USER.md', 'AGENTS.md', 'TOOLS.md', 'MEMORY.md', 'STYLE.md', 'HEARTBEAT.md']) {
      expect(existsSync(join(harnessDir, f))).toBe(true);
    }

    // USER.md teve placeholders substituidos
    const userMd = readFileSync(join(harnessDir, 'USER.md'), 'utf-8');
    expect(userMd).toContain('Tester');
    expect(userMd).toContain('Acme');
    expect(userMd).not.toContain('{{userName}}');

    // Config JSON
    const cfg = JSON.parse(readFileSync(ctx.configPath, 'utf-8'));
    expect(cfg.botToken).toBe('123456:fake_token_for_tests');
    expect(cfg.allowedUsers).toEqual([42]);
    expect(cfg.voiceProvider).toBe('groq');
    expect(cfg.archetype).toBe('generic');
    expect(cfg.defaultRuntime).toBe('claude-code');
    expect(cfg.timezone).toBe('UTC');

    // State file com phase=b-complete
    const state = JSON.parse(readFileSync(ctx.stateFilePath, 'utf-8'));
    expect(state.phase).toBe('b-complete');
    expect(state.phaseBResult?.archetype).toBe('generic');
  }, 120000); // dá tempo pro bun install interno rodar

  test('solo-builder archetype produces same 7 files with distinct content', async () => {
    const ctx = makeCtx('solo-builder');
    const phaseA = makePhaseA(tmp);
    const result = await runPhaseB(ctx, phaseA);
    expect(result.archetype).toBe('solo-builder');
    const soulMd = readFileSync(join(ctx.forgeclawDir, 'harness', 'SOUL.md'), 'utf-8');
    expect(soulMd.toLowerCase()).toContain('solo builder');
  }, 120000);
});
