import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import type { ForgeClawConfig } from './types';
import type { HarnessLoader } from './harness-loader';
import { stateStore } from './state-store';
import { memoryManagerV2 } from './memory';

/**
 * ContextBuilder — assembles the per-turn context injected above the user
 * message.
 *
 * Design goals (v1.5):
 *  - Minimal baseline cost: ~50-100 tokens per turn when nothing relevant
 *    is happening (just the stat line + optional project state).
 *  - Conditional retrieval: the memory system decides whether to inject
 *    recalled content based on FTS5 relevance, not a regex gate.
 *  - Cache-friendly: the HEAVY static context (harness MEMORY.md, USER.md,
 *    vault MOC.md) is NOT injected here — it goes through
 *    --append-system-prompt-file so Anthropic prefix cache hits stay high.
 *  - Vault pointer: one short line tells the agent where to look, not
 *    the entire MOC.md.
 */
export class ContextBuilder {
  private config: ForgeClawConfig;
  private harnessLoader: HarnessLoader;

  constructor(config: ForgeClawConfig, harnessLoader: HarnessLoader) {
    this.config = config;
    this.harnessLoader = harnessLoader;
  }

  async build(userMessage: string, _chatId: number, topicId: number, sessionId?: string | null): Promise<string> {
    const parts: string[] = [];

    // 1. Stat line: tiny, always present, ~50 tokens
    const stat = await this.buildStatLine();
    if (stat) parts.push(stat);

    // 2. Memory retrieval — only injects if the memory system finds something
    //    relevant to this message. Returns fenced <memory-context> block
    //    or empty string. Internally logs every retrieval to memory_retrievals.
    try {
      const memBlock = await memoryManagerV2.prefetchAll(userMessage, 'context_builder', sessionId ?? undefined);
      if (memBlock) parts.push(memBlock);
    } catch (err) {
      // Never block the turn on memory errors
      console.warn('[context-builder] prefetch failed (non-fatal):', err);
    }

    // 3. Vault pointer (one line, not full MOC.md)
    if (this.config.vaultPath) {
      parts.push(
        `Vault: \`${this.config.vaultPath}/\`. Consulta antes de falar sobre projetos, clientes, empresa, conteúdo. Cada subpasta tem CLAUDE.md próprio.`,
      );
    }

    // 4. Project STATE.md (only when the topic is bound to a project dir)
    const stateContent = await this.loadTopicState(topicId);
    if (stateContent) parts.push(stateContent);

    if (parts.length === 0) return userMessage;
    return parts.join('\n\n') + '\n\n---\n\n' + userMessage;
  }

  /**
   * One-line memory stats — no content, just telemetry so the agent knows
   * what's available to recall. Reading this costs ~50 tokens.
   */
  private async buildStatLine(): Promise<string> {
    try {
      const dailyDir =
        process.env.FORGECLAW_DAILY_LOG_DIR ?? '/home/vault/05-pessoal/daily-log';
      const today = this.isoDate(new Date());
      const path = `${dailyDir}/${today}.md`;

      let todayCount = 0;
      let lastEntryTime = '—';
      if (existsSync(path)) {
        const content = await readFile(path, 'utf-8');
        const lines = content.split('\n').filter((l) => l.trim().startsWith('- ['));
        todayCount = lines.length;
        const lastLine = lines[lines.length - 1];
        const tMatch = lastLine?.match(/\[(\d{2}:\d{2})\]/);
        if (tMatch) lastEntryTime = tMatch[1];
      }

      const memCount = stateStore.listMemoryEntries({
        userId: 'default',
        workspaceId: 'default',
        kind: 'behavior',
      }).length;

      return `# memória (stat)
daily hoje: ${todayCount} eventos${lastEntryTime !== '—' ? ` · último ${lastEntryTime} brt` : ''} · mem.md: ${memCount} entries · use a tool \`memory\` pra buscar ou editar. nunca invente contexto — busca primeiro.`;
    } catch {
      return '';
    }
  }

  private isoDate(d: Date): string {
    const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000);
    return brt.toISOString().slice(0, 10);
  }

  private async loadTopicState(topicId: number): Promise<string> {
    try {
      const topic = stateStore.getTopic(topicId);
      if (!topic?.projectDir) return '';

      const statePath = path.join(topic.projectDir, '.plano', 'STATE.md');
      const s = await stat(statePath).catch(() => null);
      if (!s) return '';
      return await readFile(statePath, 'utf-8');
    } catch {
      return '';
    }
  }
}
