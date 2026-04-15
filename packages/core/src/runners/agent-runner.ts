/**
 * AgentCliRunner — abstraction over CLI agent runtimes.
 *
 * ForgeClaw delegates the actual agent work to battle-tested CLI agents
 * (Claude Code and Codex). This interface normalizes them so the rest of
 * the system (bot handlers, ws-server, cron engine) doesn't care which
 * one is running.
 *
 * Each runner is responsible for:
 *   - spawning the CLI with the right flags
 *   - parsing the CLI's native event stream
 *   - emitting normalized StreamEvent objects
 *   - managing session resume in the CLI's native format
 *   - injecting the harness system prompt the way the CLI expects
 *     (Claude Code: --append-system-prompt-file, Codex: AGENTS.md in cwd)
 */

import type { StreamEvent, RuntimeName } from '../types';

export interface RunnerOptions {
  /** Working directory for the spawned CLI. Defaults to process.cwd(). */
  cwd?: string;
  /** Agent model override. Values depend on runtime (sonnet, haiku, gpt-5, etc). */
  model?: string;
  /** Codex profile name (only used by codex runner). */
  profile?: string | null;
  /**
   * Runtime-specific session ID to resume. For claude-code this is the
   * Claude session UUID, for codex this is the thread_id.
   */
  sessionId?: string;
  /** Absolute path to a markdown file appended to the system prompt. */
  appendSystemPromptFile?: string;
  /** Inline system prompt text (less preferred than file). */
  systemPrompt?: string;
  /** Explicit tool allow-list (claude-code only). */
  allowedTools?: string[];
  /** If true, bypass sandbox + approvals (claude-code --dangerously-skip, codex --yolo). */
  dangerouslySkipPermissions?: boolean;
  /** Additional writable dirs (codex --add-dir). */
  additionalWritableDirs?: string[];
  /** Custom env vars to inject when spawning. */
  env?: Record<string, string>;
  /** Hard timeout in milliseconds. Aborts on expiry. */
  timeoutMs?: number;
}

/**
 * Normalized stream events shared by all runners. Each runner maps its
 * native CLI events to these.
 */
export type { StreamEvent } from '../types';

export interface AgentCliRunner {
  readonly name: RuntimeName;

  /** Check if the CLI binary is installed and responsive. Fast, no network. */
  isAvailable(): Promise<boolean>;

  /** Return the CLI version string, or null if unavailable. */
  version(): Promise<string | null>;

  /** True while an agent invocation is in flight. */
  readonly isRunning: boolean;

  /**
   * Run the agent with the given prompt. Yields normalized StreamEvent
   * objects as the CLI produces them.
   */
  run(prompt: string, options?: RunnerOptions): AsyncGenerator<StreamEvent>;

  /** Abort the in-flight run (if any). Idempotent. */
  abort(): void;
}

/**
 * Normalize a tool name across runtimes so the UI (Telegram status bar,
 * dashboard context bar) shows consistent labels regardless of which CLI
 * is running.
 *
 * Claude Code native: Bash, Read, Write, Edit, Grep, Glob, WebSearch, Task
 * Codex native: shell, file_changes, web_searches, mcp_tool_calls, reasoning
 */
export function normalizeToolName(runtime: RuntimeName, raw: string): string {
  if (runtime === 'claude-code') {
    // Claude Code tool names are already user-friendly.
    return raw;
  }
  // Codex item types → friendly names
  const codexMap: Record<string, string> = {
    shell: 'shell',
    command_execution: 'shell',
    file_changes: 'edit',
    web_searches: 'web_search',
    mcp_tool_calls: 'mcp',
    reasoning: 'thinking',
    plan_updates: 'plan',
    agent_message: 'text',
  };
  return codexMap[raw] ?? raw;
}
