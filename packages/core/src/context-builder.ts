import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import type { ForgeClawConfig, AgentConfig } from './types';
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

  async build(userMessage: string, _chatId: number, topicId: number, sessionId?: string | null, agent?: AgentConfig | null): Promise<{ prompt: string; agentSystemPrompt?: string }> {
    const parts: string[] = [];

    // Agent system prompt -- returned separately so the handler can inject it
    // via --append-system-prompt (system-layer) instead of prepending to the
    // user message. Putting a multi-KB persona in the user turn trips the
    // Anthropic safety classifier (pattern: "user claims to be an agent").
    const agentSystemPrompt = agent?.systemPrompt
      ? `# Agent: ${agent.name}\n\n${agent.systemPrompt}`
      : undefined;

    // 1. Stat line: tiny, always present, ~50 tokens
    const stat = await this.buildStatLine();
    if (stat) parts.push(stat);

    // 2. Memory retrieval — skip entirely when agent has memoryMode='none',
    //    filter by tags when 'filtered', inject all when 'global' (default).
    if (agent?.memoryMode !== 'none') {
      try {
        const entityFilter = agent?.memoryMode === 'filtered' && agent.memoryDomainFilter.length > 0
          ? agent.memoryDomainFilter
          : undefined;
        const memBlock = await memoryManagerV2.prefetchAll(userMessage, 'context_builder', sessionId ?? undefined, entityFilter);
        if (memBlock) parts.push(memBlock);
      } catch (err) {
        // Never block the turn on memory errors
        console.warn('[context-builder] prefetch failed (non-fatal):', err);
      }
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

    const prompt = parts.length === 0
      ? userMessage
      : parts.join('\n\n') + '\n\n---\n\n' + userMessage;
    return { prompt, agentSystemPrompt };
  }

  /**
   * One-line memory stats — no content, just telemetry so the agent knows
   * what's available to recall. Reading this costs ~50 tokens.
   */
  private async buildStatLine(): Promise<string> {
    try {
      const dailyDir = process.env.FORGECLAW_DAILY_LOG_DIR
        ?? this.config.vaultDailyLogPath
        ?? path.join(homedir(), '.forgeclaw', 'memory', 'daily');
      const today = this.isoDate(new Date());
      const dailyFilePath = `${dailyDir}/${today}.md`;

      let todayCount = 0;
      let lastEntryTime = '—';
      if (existsSync(dailyFilePath)) {
        const content = await readFile(dailyFilePath, 'utf-8');
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
