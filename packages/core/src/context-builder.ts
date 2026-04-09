import { readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { ForgeClawConfig } from './types';
import type { HarnessLoader } from './harness-loader';
import { stateStore } from './state-store';

export class ContextBuilder {
  private config: ForgeClawConfig;
  private harnessLoader: HarnessLoader;

  constructor(config: ForgeClawConfig, harnessLoader: HarnessLoader) {
    this.config = config;
    this.harnessLoader = harnessLoader;
  }

  async build(userMessage: string, chatId: number, topicId: number): Promise<string> {
    const isContent = this.harnessLoader.isContentTask(userMessage);
    const parts: string[] = [];

    // 1. Harness files
    const harness = await this.harnessLoader.load({ isContentTask: isContent });
    if (harness) parts.push(harness);

    // 2. Yesterday's daily log
    const dailyLog = await this.loadYesterdayLog();
    if (dailyLog) parts.push(dailyLog);

    // 3. Vault path instruction
    if (this.config.vaultPath) {
      parts.push(`Meu Obsidian Vault est\u00e1 em ${this.config.vaultPath}/\nUse Read e LS para navegar quando relevante.`);
    }

    // 4. Project STATE.md
    const stateContent = await this.loadTopicState(topicId);
    if (stateContent) parts.push(stateContent);

    // 5. Assemble
    if (parts.length === 0) return userMessage;
    return parts.join('\n\n') + '\n\n---\n\n' + userMessage;
  }

  private async loadYesterdayLog(): Promise<string> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().slice(0, 10); // YYYY-MM-DD
    const logPath = path.join(os.homedir(), '.forgeclaw', 'memory', 'DAILY', `${dateStr}.md`);

    try {
      return await readFile(logPath, 'utf-8');
    } catch {
      return '';
    }
  }

  private async loadTopicState(topicId: number): Promise<string> {
    try {
      const topic = stateStore.getTopic(topicId);
      if (!topic?.projectDir) return '';

      const statePath = path.join(topic.projectDir, '.plano', 'STATE.md');
      return await readFile(statePath, 'utf-8');
    } catch {
      return '';
    }
  }
}
