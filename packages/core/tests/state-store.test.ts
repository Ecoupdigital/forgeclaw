import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { StateStore } from '../src/state-store';
import { randomUUID } from 'node:crypto';
import { unlinkSync } from 'node:fs';

describe('StateStore', () => {
  const dbPath = `/tmp/forgeclaw-test-${randomUUID()}.db`;
  let store: StateStore;

  beforeAll(() => {
    store = new StateStore(dbPath);
  });

  afterAll(() => {
    store.close();
    try { unlinkSync(dbPath); } catch {}
    try { unlinkSync(dbPath + '-wal'); } catch {}
    try { unlinkSync(dbPath + '-shm'); } catch {}
  });

  describe('Sessions', () => {
    const sessionId = 'test-session-1';
    const now = Date.now();

    it('deve criar e buscar session', () => {
      store.createSession({
        id: sessionId,
        topicId: 42,
        claudeSessionId: null,
        projectDir: '/tmp/test',
        contextUsage: 0,
        createdAt: now,
        updatedAt: now,
      });

      const session = store.getSession(sessionId);
      expect(session).not.toBeNull();
      expect(session!.id).toBe(sessionId);
      expect(session!.topicId).toBe(42);
      expect(session!.projectDir).toBe('/tmp/test');
      expect(session!.contextUsage).toBe(0);
    });

    it('deve retornar null para session inexistente', () => {
      expect(store.getSession('nonexistent')).toBeNull();
    });

    it('deve atualizar session', () => {
      store.updateSession(sessionId, {
        claudeSessionId: 'claude-123',
        contextUsage: 45.5,
      });

      const updated = store.getSession(sessionId);
      expect(updated!.claudeSessionId).toBe('claude-123');
      expect(updated!.contextUsage).toBe(45.5);
      expect(updated!.updatedAt).toBeGreaterThanOrEqual(now);
    });

    it('deve listar sessions ordenadas por updated_at DESC', () => {
      store.createSession({
        id: 'test-session-2',
        topicId: 99,
        claudeSessionId: null,
        projectDir: null,
        contextUsage: 0,
        createdAt: now + 1000,
        updatedAt: now + 1000,
      });

      const sessions = store.listSessions();
      expect(sessions.length).toBeGreaterThanOrEqual(2);
      // Most recently updated first
      expect(sessions[0].updatedAt).toBeGreaterThanOrEqual(sessions[1].updatedAt);
    });

    it('deve deletar session', () => {
      store.deleteSession('test-session-2');
      expect(store.getSession('test-session-2')).toBeNull();
    });
  });

  describe('Topics', () => {
    let topicId: number;

    it('deve criar e buscar topic', () => {
      topicId = store.createTopic({
        threadId: 100,
        chatId: 200,
        name: 'Test Topic',
        projectDir: '/tmp/proj',
        sessionId: 'test-session-1',
        createdAt: Date.now(),
      });

      expect(topicId).toBeGreaterThan(0);

      const topic = store.getTopic(topicId);
      expect(topic).not.toBeNull();
      expect(topic!.name).toBe('Test Topic');
      expect(topic!.chatId).toBe(200);
      expect(topic!.threadId).toBe(100);
    });

    it('deve buscar topic por chat e thread', () => {
      const found = store.getTopicByChatAndThread(200, 100);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(topicId);
    });

    it('deve buscar topic com threadId null', () => {
      const id = store.createTopic({
        threadId: null,
        chatId: 300,
        name: 'No Thread',
        projectDir: null,
        sessionId: null,
        createdAt: Date.now(),
      });

      const found = store.getTopicByChatAndThread(300, null);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(id);
    });

    it('deve listar topics', () => {
      const topics = store.listTopics();
      expect(topics.length).toBeGreaterThanOrEqual(2);
    });

    it('deve retornar null para topic inexistente', () => {
      expect(store.getTopic(99999)).toBeNull();
    });
  });

  describe('Messages', () => {
    it('deve criar e buscar messages por topic', () => {
      const topicId = 42;
      const msgId = store.createMessage({
        topicId,
        role: 'user',
        content: 'Hello world',
        createdAt: Date.now(),
      });

      expect(msgId).toBeGreaterThan(0);

      store.createMessage({
        topicId,
        role: 'assistant',
        content: 'Hi there',
        createdAt: Date.now() + 1,
      });

      const messages = store.getMessages(topicId);
      expect(messages.length).toBe(2);
    });

    it('deve respeitar limit ao buscar messages', () => {
      const topicId = 42;
      const messages = store.getMessages(topicId, 1);
      expect(messages.length).toBe(1);
    });
  });

  describe('CronJobs', () => {
    let jobId: number;

    it('deve criar e buscar cron job', () => {
      jobId = store.createCronJob({
        name: 'Daily Report',
        schedule: '0 9 * * *',
        prompt: 'Generate daily report',
        targetTopicId: null,
        enabled: true,
        lastRun: null,
        lastStatus: null,
      });

      expect(jobId).toBeGreaterThan(0);

      const job = store.getCronJob(jobId);
      expect(job).not.toBeNull();
      expect(job!.name).toBe('Daily Report');
      expect(job!.enabled).toBe(true);
    });

    it('deve listar cron jobs', () => {
      store.createCronJob({
        name: 'Disabled Job',
        schedule: '0 0 * * *',
        prompt: 'noop',
        targetTopicId: null,
        enabled: false,
        lastRun: null,
        lastStatus: null,
      });

      const all = store.listCronJobs();
      expect(all.length).toBeGreaterThanOrEqual(2);

      const enabledOnly = store.listCronJobs(true);
      expect(enabledOnly.every(j => j.enabled)).toBe(true);
    });

    it('deve atualizar cron job', () => {
      store.updateCronJob(jobId, {
        lastRun: Date.now(),
        lastStatus: 'success',
        enabled: false,
      });

      const updated = store.getCronJob(jobId);
      expect(updated!.lastStatus).toBe('success');
      expect(updated!.enabled).toBe(false);
    });

    it('deve deletar cron job', () => {
      store.deleteCronJob(jobId);
      expect(store.getCronJob(jobId)).toBeNull();
    });

    it('deve ignorar update sem campos', () => {
      // Should not throw
      store.updateCronJob(99999, {});
    });
  });

  describe('CronLogs', () => {
    it('deve criar e buscar cron logs', () => {
      const jobId = store.createCronJob({
        name: 'Log Test Job',
        schedule: '* * * * *',
        prompt: 'test',
        targetTopicId: null,
        enabled: true,
        lastRun: null,
        lastStatus: null,
      });

      const logId = store.createCronLog({
        jobId,
        startedAt: Date.now(),
        finishedAt: Date.now() + 1000,
        status: 'success',
        output: 'Done!',
      });

      expect(logId).toBeGreaterThan(0);

      const logs = store.getCronLogs(jobId);
      expect(logs.length).toBe(1);
    });
  });
});
