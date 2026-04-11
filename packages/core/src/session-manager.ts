import { randomUUID } from 'node:crypto';
import { stateStore } from './state-store';
import type { SessionInfo } from './types';

class SessionManager {
  private locks = new Map<string, Promise<void>>();

  private buildKey(chatId: number, topicId: number | null): string {
    return topicId ? `${chatId}:${topicId}` : `${chatId}`;
  }

  async getOrCreateSession(chatId: number, topicId: number | null, projectDir?: string): Promise<SessionInfo> {
    const key = this.buildKey(chatId, topicId);

    return this.withLock(key, async () => {
      // Fix bug 688: ensure a topic row exists for every session. Prior to this,
      // `topics` stayed empty even after thousands of messages, which broke the
      // cron target-topic dropdown and the cron:result router. Safe to call on
      // every request — upsertTopic short-circuits if the row already exists.
      stateStore.upsertTopic({
        chatId,
        threadId: topicId,
        name: topicId ? `Topic ${topicId}` : `Direct chat`,
        projectDir: projectDir ?? null,
        sessionId: key,
      });

      const existing = stateStore.getSession(key);
      if (existing) return existing;

      const now = Date.now();
      const session: SessionInfo = {
        id: key,
        topicId: topicId ?? 0,
        claudeSessionId: null,
        projectDir: projectDir ?? null,
        contextUsage: 0,
        createdAt: now,
        updatedAt: now,
      };

      stateStore.createSession(session);
      return session;
    });
  }

  getSession(chatId: number, topicId: number | null): SessionInfo | null {
    const key = this.buildKey(chatId, topicId);
    return stateStore.getSession(key);
  }

  async updateClaudeSessionId(chatId: number, topicId: number | null, claudeSessionId: string): Promise<void> {
    const key = this.buildKey(chatId, topicId);
    stateStore.updateSession(key, { claudeSessionId });
  }

  async updateContextUsage(chatId: number, topicId: number | null, usage: number): Promise<void> {
    const key = this.buildKey(chatId, topicId);
    stateStore.updateSession(key, { contextUsage: usage });
  }

  listSessions(): SessionInfo[] {
    return stateStore.listSessions();
  }

  async deleteSession(chatId: number, topicId: number | null): Promise<void> {
    const key = this.buildKey(chatId, topicId);
    stateStore.deleteSession(key);
    this.locks.delete(key);
  }

  private async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }

    let resolve: () => void;
    const lockPromise = new Promise<void>((r) => { resolve = r; });
    this.locks.set(key, lockPromise);

    try {
      return await fn();
    } finally {
      this.locks.delete(key);
      resolve!();
    }
  }
}

export const sessionManager = new SessionManager();
export { SessionManager };
