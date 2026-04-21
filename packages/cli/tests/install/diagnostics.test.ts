import { describe, test, expect } from 'bun:test';
import {
  checkBun,
  checkClaudeInstalled,
  checkClaudeAuth,
  MIN_BUN_VERSION,
} from '../../src/commands/install/diagnostics';

describe('checkBun', () => {
  test('returns BunCheck with installed flag and version on a machine running bun', async () => {
    const r = await checkBun();
    expect(typeof r.installed).toBe('boolean');
    // Este teste roda sob `bun test`, entao Bun E instalado.
    expect(r.installed).toBe(true);
    expect(typeof r.version).toBe('string');
    expect(r.minimum).toBe(MIN_BUN_VERSION);
    expect(typeof r.meetsMinimum).toBe('boolean');
  });
});

describe('checkClaudeInstalled', () => {
  test('returns shape with installed + optional binaryPath', async () => {
    const r = await checkClaudeInstalled();
    expect(typeof r.installed).toBe('boolean');
    if (r.installed) {
      expect(typeof r.binaryPath).toBe('string');
      expect(r.binaryPath!.length).toBeGreaterThan(0);
    }
  });
});

describe('checkClaudeAuth', () => {
  test('returns shape with authenticated boolean + optional hint', async () => {
    const installed = await checkClaudeInstalled();
    if (!installed.installed) {
      // Sem claude no PATH, auth e false com hint mencionando `claude login`.
      const auth = await checkClaudeAuth();
      expect(auth.authenticated).toBe(false);
      return;
    }
    // Claude instalado: o resultado depende do state de auth do runner.
    // Apenas validamos o shape; hint existe em caso de falha.
    const auth = await checkClaudeAuth();
    expect(typeof auth.authenticated).toBe('boolean');
    if (!auth.authenticated) {
      expect(typeof auth.hint).toBe('string');
      expect(auth.hint!.length).toBeGreaterThan(0);
    }
  }, 20000); // timeout 20s (o spawn interno e 8s + margem)
});
