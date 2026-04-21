import { describe, it, expect, beforeEach } from 'vitest';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, rmSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, 'access.ts');
const LOG = join(HERE, 'access-log.jsonl');
const MEMBERS = join(HERE, 'members.jsonl');

function runScript(args: string, env: NodeJS.ProcessEnv = {}): { code: number; stdout: string; stderr: string } {
  try {
    const stdout = execSync(`bun run ${SCRIPT} ${args}`, {
      encoding: 'utf-8',
      env: { ...process.env, ...env, GITHUB_TOKEN: env.GITHUB_TOKEN ?? 'fake-token-for-test' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, stdout, stderr: '' };
  } catch (err: any) {
    return {
      code: err.status ?? 1,
      stdout: err.stdout?.toString() ?? '',
      stderr: err.stderr?.toString() ?? '',
    };
  }
}

describe('access gate CLI', () => {
  beforeEach(() => {
    for (const f of [LOG, MEMBERS]) if (existsSync(f)) rmSync(f);
  });

  it('prints help when no args', () => {
    const { stdout } = runScript('--help');
    expect(stdout).toContain('ForgeClaw Access Gate');
    expect(stdout).toContain('grant');
    expect(stdout).toContain('revoke');
    expect(stdout).toContain('list');
    expect(stdout).toContain('audit');
  });

  it('fails grant without GITHUB_TOKEN', () => {
    const { code, stderr } = runScript('grant someuser', { GITHUB_TOKEN: '' });
    expect(code).toBe(2);
    expect(stderr).toContain('GITHUB_TOKEN nao configurado');
  });

  it('rejects invalid github username (special chars)', () => {
    const { code, stderr } = runScript('grant "has space"');
    expect(code).toBe(2);
    expect(stderr).toContain('invalido');
  });

  it('audit shows empty when log absent', () => {
    const { code, stdout } = runScript('audit');
    expect(code).toBe(0);
    expect(stdout).toContain('log vazio');
  });
});
