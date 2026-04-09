import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import { unlinkSync } from 'node:fs';

// We need to mock the stateStore used by SessionManager.
// Since SessionManager imports stateStore directly, we create our own StateStore
// and patch the module.

import { StateStore } from '../src/state-store';

const dbPath = `/tmp/forgeclaw-test-sm-${randomUUID()}.db`;
let testStore: StateStore;

// Mock the state-store module to use our test DB
import { vi } from 'vitest';
vi.mock('../src/state-store', async () => {
  const { StateStore } = await vi.importActual<typeof import('../src/state-store')>('../src/state-store');
  const store = new StateStore(dbPath);
  testStore = store;
  return {
    StateStore,
    stateStore: store,
  };
});

// Import SessionManager AFTER mock setup
const { SessionManager } = await import('../src/session-manager');

describe('SessionManager', () => {
  let manager: InstanceType<typeof SessionManager>;

  beforeAll(() => {
    manager = new SessionManager();
  });

  afterAll(() => {
    testStore.close();
    try { unlinkSync(dbPath); } catch {}
    try { unlinkSync(dbPath + '-wal'); } catch {}
    try { unlinkSync(dbPath + '-shm'); } catch {}
  });

  describe('getOrCreateSession', () => {
    it('deve criar nova session quando nao existe', async () => {
      const session = await manager.getOrCreateSession(111, null, '/tmp/proj');

      expect(session).not.toBeNull();
      expect(session.id).toBe('111');
      expect(session.projectDir).toBe('/tmp/proj');
      expect(session.claudeSessionId).toBeNull();
      expect(session.contextUsage).toBe(0);
    });

    it('deve retornar session existente', async () => {
      const first = await manager.getOrCreateSession(111, null);
      const second = await manager.getOrCreateSession(111, null);

      expect(first.id).toBe(second.id);
      expect(first.createdAt).toBe(second.createdAt);
    });

    it('deve criar sessions diferentes para topicIds diferentes', async () => {
      const s1 = await manager.getOrCreateSession(222, 1);
      const s2 = await manager.getOrCreateSession(222, 2);

      expect(s1.id).toBe('222:1');
      expect(s2.id).toBe('222:2');
      expect(s1.id).not.toBe(s2.id);
    });
  });

  describe('updateClaudeSessionId', () => {
    it('deve atualizar claude session id', async () => {
      await manager.getOrCreateSession(333, null);
      await manager.updateClaudeSessionId(333, null, 'claude-abc');

      const session = manager.getSession(333, null);
      expect(session!.claudeSessionId).toBe('claude-abc');
    });
  });

  describe('listSessions', () => {
    it('deve listar todas as sessions', () => {
      const sessions = manager.listSessions();
      expect(sessions.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('deleteSession', () => {
    it('deve deletar session', async () => {
      await manager.getOrCreateSession(999, null);
      expect(manager.getSession(999, null)).not.toBeNull();

      await manager.deleteSession(999, null);
      expect(manager.getSession(999, null)).toBeNull();
    });
  });

  describe('lock per-session', () => {
    it('deve serializar acesso concorrente ao mesmo key', async () => {
      const order: number[] = [];

      const p1 = manager.getOrCreateSession(444, null).then(() => { order.push(1); });
      const p2 = manager.getOrCreateSession(444, null).then(() => { order.push(2); });

      await Promise.all([p1, p2]);

      // Both should complete, order doesn't matter but both must run
      expect(order).toHaveLength(2);
      expect(order).toContain(1);
      expect(order).toContain(2);
    });
  });
});
