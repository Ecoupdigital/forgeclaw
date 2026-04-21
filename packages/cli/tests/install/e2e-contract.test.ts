import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runPhaseB } from '../../src/commands/install/phase-b-archetype';
import type { InstallContext, PhaseAResult } from '../../src/commands/install/types';

// Reimplementa validate minimally (nao podemos importar do core se houver build side-effect).
// Aceita os campos que validateConfig do core exige.
function assertValidForgeClawConfig(cfg: Record<string, unknown>): void {
  expect(typeof cfg.botToken).toBe('string');
  expect(Array.isArray(cfg.allowedUsers)).toBe(true);
  expect((cfg.allowedUsers as unknown[]).length).toBeGreaterThan(0);
  for (const u of cfg.allowedUsers as unknown[]) {
    expect(typeof u).toBe('number');
  }
  if (cfg.voiceProvider !== undefined) {
    expect(['groq', 'openai', 'none']).toContain(cfg.voiceProvider);
  }
  if (cfg.workingDir !== undefined) {
    expect(typeof cfg.workingDir).toBe('string');
  }
  if (cfg.vaultPath !== undefined && cfg.vaultPath !== null) {
    expect(typeof cfg.vaultPath).toBe('string');
  }
  if (cfg.defaultRuntime !== undefined) {
    expect(['claude-code', 'codex']).toContain(cfg.defaultRuntime);
  }
  if (cfg.dashboardToken !== undefined) {
    expect(typeof cfg.dashboardToken).toBe('string');
  }
  if (cfg.timezone !== undefined) {
    expect(typeof cfg.timezone).toBe('string');
  }
  // Campo novo introduzido pela Fase 25
  expect(typeof cfg.archetype).toBe('string');
}

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'fc-contract-'));
  process.env.FORGECLAW_SKIP_SERVICE = '1';
});
afterEach(() => {
  delete process.env.FORGECLAW_SKIP_SERVICE;
  rmSync(tmp, { recursive: true, force: true });
});

function makeCtx(slug: string): InstallContext {
  const dir = join(tmp, '.forgeclaw');
  mkdirSync(dir, { recursive: true });
  return {
    options: { archetype: slug as any, noHandoff: true },
    forgeclawDir: dir,
    configPath: join(dir, 'forgeclaw.config.json'),
    stateFilePath: join(dir, '.install-state.json'),
    monorepoRoot: process.cwd(),
    existingConfig: {},
    existingState: null,
  };
}

const ALL_SLUGS = ['solo-builder', 'content-creator', 'agency-freela', 'ecom-manager', 'generic'];

describe('config.json contract after Phase B', () => {
  test.each(ALL_SLUGS.map((s) => [s]))(
    'archetype %s generates config compatible with ForgeClawConfig validator',
    async (slug) => {
      const ctx = makeCtx(slug);
      const phaseA: PhaseAResult = {
        botToken: '123:abc',
        userId: 7,
        voiceProvider: 'groq',
        openaiApiKey: null,
        groqApiKey: 'gsk_test',
        workingDir: tmp,
        vaultPath: null,
        userName: 'U',
        company: 'C',
        role: 'R',
        timezone: 'America/Sao_Paulo',
        dashboardToken: 'abcdef',
      };
      await runPhaseB(ctx, phaseA);
      const cfg = JSON.parse(readFileSync(ctx.configPath, 'utf-8'));
      assertValidForgeClawConfig(cfg);
    },
    120000
  );
});
