import { describe, test, expect } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  compareSemver,
  validateBotTokenShape,
  validateTelegramUserId,
  validateDirectoryExists,
} from '../../src/commands/install/validators';

describe('compareSemver', () => {
  test('equal versions', () => {
    expect(compareSemver('1.1.0', '1.1.0')).toBe(0);
  });
  test('a < b', () => {
    expect(compareSemver('1.0.9', '1.1.0')).toBeLessThan(0);
  });
  test('a > b', () => {
    expect(compareSemver('1.2.0', '1.1.9')).toBeGreaterThan(0);
  });
  test('strips pre-release tags', () => {
    expect(compareSemver('1.1.0-rc.1', '1.1.0')).toBe(0);
  });
  test('handles missing patch', () => {
    expect(compareSemver('1.1', '1.1.0')).toBe(0);
  });
});

describe('validateBotTokenShape', () => {
  test('valid shape', () => {
    expect(validateBotTokenShape('123456:ABC-def_GHI').ok).toBe(true);
  });
  test('empty token', () => {
    const r = validateBotTokenShape('');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/required/i);
  });
  test('no colon', () => {
    const r = validateBotTokenShape('123456ABCdef');
    expect(r.ok).toBe(false);
  });
  test('prefix not digits', () => {
    const r = validateBotTokenShape('abc:def');
    expect(r.ok).toBe(false);
  });
});

describe('validateTelegramUserId', () => {
  test('valid id', () => {
    const r = validateTelegramUserId('12345');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data?.userId).toBe(12345);
  });
  test('zero', () => {
    const r = validateTelegramUserId('0');
    expect(r.ok).toBe(false);
  });
  test('negative', () => {
    const r = validateTelegramUserId('-1');
    expect(r.ok).toBe(false);
  });
  test('letters', () => {
    const r = validateTelegramUserId('abc');
    expect(r.ok).toBe(false);
  });
});

describe('validateDirectoryExists', () => {
  test('existing directory passes', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'fc-val-'));
    try {
      const r = validateDirectoryExists(tmp);
      expect(r.ok).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
  test('missing path fails', () => {
    const r = validateDirectoryExists(join(tmpdir(), 'does-not-exist-fc-xyz-9999'));
    expect(r.ok).toBe(false);
  });
  test('file path fails', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'fc-val-'));
    const file = join(tmp, 'a.txt');
    writeFileSync(file, 'hi');
    try {
      const r = validateDirectoryExists(file);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toMatch(/Not a directory/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
  test('empty path fails', () => {
    const r = validateDirectoryExists('');
    expect(r.ok).toBe(false);
  });
});
