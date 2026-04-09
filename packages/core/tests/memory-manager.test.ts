import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MemoryManager } from '../src/memory-manager';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

describe('MemoryManager', () => {
  const tmpMemory = `/tmp/forgeclaw-memory-test-${randomUUID()}`;
  const tmpHarness = `/tmp/forgeclaw-harness-test-${randomUUID()}`;
  let manager: MemoryManager;

  beforeAll(() => {
    mkdirSync(tmpMemory, { recursive: true });
    mkdirSync(tmpHarness, { recursive: true });
    manager = new MemoryManager(tmpMemory, tmpHarness);
  });

  afterAll(() => {
    rmSync(tmpMemory, { recursive: true, force: true });
    rmSync(tmpHarness, { recursive: true, force: true });
  });

  describe('addEntry', () => {
    it('deve criar daily log com entrada timestamped', async () => {
      await manager.addEntry('Primeira entrada do dia');

      const log = await manager.getDailyLog();
      expect(log).toContain('Primeira entrada do dia');
      expect(log).toMatch(/- \[\d{2}:\d{2}\]/);
    });

    it('deve acumular entradas no mesmo arquivo', async () => {
      await manager.addEntry('Segunda entrada');

      const log = await manager.getDailyLog();
      expect(log).toContain('Primeira entrada do dia');
      expect(log).toContain('Segunda entrada');
    });
  });

  describe('getDailyLog', () => {
    it('deve retornar conteudo do log de hoje', async () => {
      const log = await manager.getDailyLog();
      expect(log.length).toBeGreaterThan(0);
    });

    it('deve retornar string vazia para data sem log', async () => {
      const log = await manager.getDailyLog('1900-01-01');
      expect(log).toBe('');
    });
  });

  describe('getYesterdayLog', () => {
    it('deve retornar string vazia quando nao ha log de ontem', async () => {
      const log = await manager.getYesterdayLog();
      expect(log).toBe('');
    });

    it('deve retornar log de ontem quando existe', async () => {
      // Create yesterday's log manually
      const dailyDir = join(tmpMemory, 'DAILY');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().slice(0, 10);

      writeFileSync(join(dailyDir, `${dateStr}.md`), '- [10:00] Yesterday entry\n');

      const log = await manager.getYesterdayLog();
      expect(log).toContain('Yesterday entry');
    });
  });

  describe('listDailyLogs', () => {
    it('deve listar todos os daily logs com metadata', async () => {
      const logs = await manager.listDailyLogs();

      expect(logs.length).toBeGreaterThanOrEqual(1);
      logs.forEach(log => {
        expect(log.date).toBeTruthy();
        expect(log.path).toBeTruthy();
        expect(typeof log.entries).toBe('number');
      });
    });

    it('deve ordenar logs por data decrescente', async () => {
      const logs = await manager.listDailyLogs();
      if (logs.length >= 2) {
        expect(logs[0].date >= logs[1].date).toBe(true);
      }
    });
  });

  describe('listDailyLogs com diretorio vazio', () => {
    it('deve retornar array vazio quando DAILY nao existe', async () => {
      const emptyMgr = new MemoryManager(`/tmp/nonexistent-${randomUUID()}`, tmpHarness);
      const logs = await emptyMgr.listDailyLogs();
      expect(logs).toEqual([]);
    });
  });
});
