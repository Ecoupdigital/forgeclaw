/**
 * ClaudeCodeCliRunner — AgentCliRunner adapter for Anthropic's Claude Code CLI.
 *
 * Delegates to the existing `ClaudeRunner` for streaming + parsing. This
 * adapter exists so the rest of ForgeClaw talks to `AgentCliRunner`
 * generically, while preserving the battle-tested Claude Code integration.
 */

import type { AgentCliRunner, RunnerOptions } from './agent-runner';
import type { RuntimeName, StreamEvent, ForgeClawConfig } from '../types';
import { ClaudeRunner } from '../claude-runner';
import { checkCliVersion } from './registry';

export class ClaudeCodeCliRunner implements AgentCliRunner {
  readonly name: RuntimeName = 'claude-code';
  private inner: ClaudeRunner | null = null;
  private config: ForgeClawConfig;

  constructor(config: ForgeClawConfig) {
    this.config = config;
  }

  async isAvailable(): Promise<boolean> {
    return (await this.version()) !== null;
  }

  async version(): Promise<string | null> {
    const bin = this.binary();
    return checkCliVersion(bin);
  }

  private binary(): string {
    return (
      this.config.runtimes?.['claude-code']?.command ??
      process.env.CLAUDE_CLI_PATH ??
      'claude'
    );
  }

  get isRunning(): boolean {
    return this.inner !== null && this.inner.isRunning;
  }

  async *run(prompt: string, options: RunnerOptions = {}): AsyncGenerator<StreamEvent> {
    this.inner = new ClaudeRunner();

    // Translate our generic RunnerOptions into Claude Code's ClaudeRunnerOptions.
    const claudeOpts = {
      cwd: options.cwd,
      sessionId: options.sessionId,
      systemPrompt: options.systemPrompt,
      appendSystemPrompt: options.appendSystemPromptFile,
      allowedTools: options.allowedTools,
      model: options.model ?? this.config.runtimes?.['claude-code']?.model ?? this.config.claudeModel,
    };

    try {
      for await (const event of this.inner.run(prompt, claudeOpts)) {
        yield event;
      }
    } finally {
      this.inner = null;
    }
  }

  abort(): void {
    this.inner?.abort();
  }
}
