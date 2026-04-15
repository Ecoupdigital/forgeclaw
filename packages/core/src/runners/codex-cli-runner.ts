/**
 * CodexCliRunner — AgentCliRunner adapter for OpenAI's Codex CLI.
 *
 * Spawns `codex exec --json` and parses its JSONL event stream, mapping
 * Codex-native events to ForgeClaw's normalized StreamEvent type.
 *
 * System prompt injection: Codex reads `AGENTS.md` from the working
 * directory automatically. This runner writes a temporary AGENTS.md
 * before spawning (with the harness content from `appendSystemPromptFile`)
 * and restores any existing file afterwards.
 *
 * Session management: Codex uses `thread_id` (captured from the first
 * `thread.started` event). To resume, invoke `codex exec resume <thread_id>`.
 *
 * Verified against Codex CLI 0.120.0 with live event capture. The event
 * schema documented here matches what we saw on the wire:
 *   {"type":"thread.started","thread_id":"..."}
 *   {"type":"turn.started"}
 *   {"type":"item.started","item":{"id":"item_1","type":"command_execution",
 *     "command":"/bin/bash -lc ls","aggregated_output":"","exit_code":null,
 *     "status":"in_progress"}}
 *   {"type":"item.completed","item":{...,"status":"completed","exit_code":0}}
 *   {"type":"turn.completed","usage":{"input_tokens":13568,
 *     "cached_input_tokens":5504,"output_tokens":16}}
 *   {"type":"turn.failed","error":{"message":"..."}}
 *   {"type":"error","message":"..."}
 */

import { readFile, writeFile, unlink, stat, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import type { AgentCliRunner, RunnerOptions } from './agent-runner';
import type { RuntimeName, StreamEvent, ForgeClawConfig } from '../types';
import { checkCliVersion } from './registry';

const KILL_TIMEOUT_MS = 5000;
const MAX_RETRIES = 2;

// --- Codex event types (from github.com/openai/codex) ---

interface CodexEventBase {
  type: string;
}

interface CodexThreadStarted extends CodexEventBase {
  type: 'thread.started';
  thread_id: string;
}

interface CodexTurnStarted extends CodexEventBase {
  type: 'turn.started';
}

interface CodexTurnCompleted extends CodexEventBase {
  type: 'turn.completed';
  usage?: {
    input_tokens?: number;
    cached_input_tokens?: number;
    output_tokens?: number;
  };
}

interface CodexTurnFailed extends CodexEventBase {
  type: 'turn.failed';
  error?: { message: string };
}

interface CodexItem {
  id: string;
  type:
    | 'agent_message'
    | 'reasoning'
    | 'command_execution'
    | 'file_changes'
    | 'mcp_tool_calls'
    | 'web_searches'
    | 'plan_updates';
  text?: string;
  command?: string;
  aggregated_output?: string;
  exit_code?: number | null;
  status?: 'in_progress' | 'completed' | 'failed';
  // unknown fields tolerated for forward-compat
  [key: string]: unknown;
}

interface CodexItemStarted extends CodexEventBase {
  type: 'item.started';
  item: CodexItem;
}

interface CodexItemCompleted extends CodexEventBase {
  type: 'item.completed';
  item: CodexItem;
}

interface CodexError extends CodexEventBase {
  type: 'error';
  message: string;
}

type CodexEvent =
  | CodexThreadStarted
  | CodexTurnStarted
  | CodexTurnCompleted
  | CodexTurnFailed
  | CodexItemStarted
  | CodexItemCompleted
  | CodexError;

// --- Runner ---

export class CodexCliRunner implements AgentCliRunner {
  readonly name: RuntimeName = 'codex';
  private proc: ChildProcess | null = null;
  private aborted = false;
  private threadId: string | null = null;
  private config: ForgeClawConfig;

  constructor(config: ForgeClawConfig) {
    this.config = config;
  }

  async isAvailable(): Promise<boolean> {
    return (await this.version()) !== null;
  }

  async version(): Promise<string | null> {
    return checkCliVersion(this.binary());
  }

  private binary(): string {
    return this.config.runtimes?.['codex']?.command ?? 'codex';
  }

  get isRunning(): boolean {
    return this.proc !== null && !this.proc.killed;
  }

  async *run(prompt: string, options: RunnerOptions = {}): AsyncGenerator<StreamEvent> {
    let attempts = 0;
    while (attempts < MAX_RETRIES) {
      attempts++;
      try {
        yield* this.spawnAndStream(prompt, options);
        return;
      } catch (err) {
        if (this.aborted) throw err;
        const errMsg = err instanceof Error ? err.message : String(err);

        // If session not found or rollout missing, retry without session
        const sessionDead =
          errMsg.includes('no rollout found') ||
          errMsg.includes('thread/resume failed') ||
          errMsg.includes('thread not found') ||
          errMsg.includes('session not found');

        if (sessionDead && options.sessionId) {
          console.warn(`[codex-runner] thread ${options.sessionId} expired, starting fresh`);
          options = { ...options, sessionId: undefined };
          continue;
        }

        if (attempts >= MAX_RETRIES) throw err;
        console.error(`[codex-runner] attempt ${attempts} failed, retrying...`, err);
        await new Promise((r) => setTimeout(r, 500 * attempts));
      }
    }
  }

  private async *spawnAndStream(
    prompt: string,
    options: RunnerOptions,
  ): AsyncGenerator<StreamEvent> {
    const cwd = options.cwd ?? process.cwd();

    // Inject harness via AGENTS.md in cwd. Backup any existing AGENTS.md.
    const agentsMdPath = join(cwd, 'AGENTS.md');
    const backupPath = join(cwd, '.AGENTS.md.forgeclaw-backup');
    let existingBackedUp = false;
    let agentsMdWritten = false;

    try {
      // Backup existing AGENTS.md if present
      if (options.appendSystemPromptFile || options.systemPrompt) {
        try {
          await stat(agentsMdPath);
          await rename(agentsMdPath, backupPath);
          existingBackedUp = true;
        } catch {
          // no existing file, nothing to backup
        }

        // Assemble AGENTS.md content: preferably from file, fall back to inline
        let content = '';
        if (options.appendSystemPromptFile) {
          try {
            content = await readFile(options.appendSystemPromptFile, 'utf-8');
          } catch (err) {
            console.warn(
              `[codex-runner] failed to read appendSystemPromptFile ${options.appendSystemPromptFile}:`,
              err,
            );
          }
        }
        if (options.systemPrompt) {
          content = content ? `${content}\n\n${options.systemPrompt}` : options.systemPrompt;
        }

        if (content) {
          await writeFile(agentsMdPath, content, 'utf-8');
          agentsMdWritten = true;
        }
      }

      // Build the command — resume mode has a much smaller flag set than
      // fresh exec, so the two paths are separate.
      const spawnArgs = options.sessionId
        ? this.buildResumeArgs(options)
        : this.buildArgs(options);

      console.log('[codex-runner] spawning:', this.binary(), spawnArgs.slice(0, 8).join(' '));
      console.log('[codex-runner] cwd:', cwd);
      console.log('[codex-runner] prompt length:', prompt.length);

      const binary = this.binary();

      this.proc = spawn(binary, spawnArgs, {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...(options.env ?? {}) },
      });

      // CRITICAL: attach exit listener BEFORE consuming stdout to avoid the
      // race where a fast-failing child exits before we observe it. This
      // promise resolves regardless of whether the exit fires before or
      // after we await it.
      const proc = this.proc;
      let resolvedExit: number | null = null;
      const exitPromise: Promise<number> = new Promise((resolve) => {
        if (proc.exitCode !== null) {
          // Already exited
          resolvedExit = proc.exitCode;
          resolve(proc.exitCode);
          return;
        }
        proc.once('exit', (code) => {
          resolvedExit = code ?? 0;
          resolve(resolvedExit);
        });
        proc.once('error', () => {
          resolvedExit = -1;
          resolve(-1);
        });
      });

      // Stream prompt via stdin (avoids argv length limits for large contexts)
      if (proc.stdin) {
        try {
          proc.stdin.write(prompt);
          proc.stdin.end();
        } catch (err) {
          console.warn('[codex-runner] stdin write failed:', err);
        }
      }

      // Buffer stderr so retry logic can match against session errors.
      let stderrBuffer = '';
      if (proc.stderr) {
        proc.stderr.on('data', (chunk) => {
          const text = chunk.toString();
          stderrBuffer += text;
          const trimmed = text.trim();
          if (trimmed) console.error('[codex-runner] stderr:', trimmed);
        });
      }

      // Parse stdout line-by-line as JSONL. parseStdout returns when the
      // stdout stream ends (which happens when the child closes its stdout).
      try {
        yield* this.parseStdout(proc);
      } catch (parseErr) {
        console.error('[codex-runner] stdout parse error:', parseErr);
      }

      // By now the stdout stream is done. Wait for exit (already captured).
      const exitCode = await exitPromise;

      if (exitCode !== 0 && !this.aborted) {
        const errMsg = stderrBuffer.trim().slice(0, 500);
        throw new Error(
          `codex exec exited with code ${exitCode}${errMsg ? `: ${errMsg}` : ''}`,
        );
      }
    } finally {
      // Restore AGENTS.md
      if (agentsMdWritten) {
        try {
          await unlink(agentsMdPath);
        } catch {
          // ignore
        }
      }
      if (existingBackedUp) {
        try {
          await rename(backupPath, agentsMdPath);
        } catch (err) {
          console.warn('[codex-runner] failed to restore AGENTS.md backup:', err);
        }
      }

      this.proc = null;
      this.aborted = false;
    }
  }

  private buildArgs(options: RunnerOptions): string[] {
    const args: string[] = ['exec', '--json'];

    // Working dir (we also set via spawn cwd, but --cd is belt-and-suspenders)
    if (options.cwd) {
      args.push('--cd', options.cwd);
    }

    // Sandbox mode: prefer --full-auto for tool-heavy work, fall back to read-only
    if (options.dangerouslySkipPermissions) {
      args.push('--dangerously-bypass-approvals-and-sandbox');
    } else {
      args.push('--full-auto');
    }

    // Needed when running outside a git repo
    args.push('--skip-git-repo-check');

    // Additional writable dirs
    if (options.additionalWritableDirs) {
      for (const dir of options.additionalWritableDirs) {
        args.push('--add-dir', dir);
      }
    }

    // Model override (or runtime default, or config default)
    const model =
      options.model ?? this.config.runtimes?.['codex']?.model;
    if (model) {
      args.push('--model', model);
    }

    // Profile (codex-specific)
    const profile = options.profile ?? this.config.runtimes?.['codex']?.profile;
    if (profile) {
      args.push('--profile', profile);
    }

    // Read prompt from stdin — allows long prompts without argv limits
    args.push('-');

    return args;
  }

  /**
   * Build args for `codex exec resume <SESSION_ID>`. Resume has a much
   * smaller flag set than fresh exec — no --cd, --sandbox, --profile,
   * --add-dir. Working directory must come from spawn cwd, not a flag.
   *
   * Verified against `codex exec resume --help` (v0.120.0).
   */
  private buildResumeArgs(options: RunnerOptions): string[] {
    const args: string[] = ['exec', 'resume'];

    if (options.dangerouslySkipPermissions) {
      args.push('--dangerously-bypass-approvals-and-sandbox');
    } else {
      args.push('--full-auto');
    }
    args.push('--skip-git-repo-check');
    args.push('--json');
    // --all disables cwd filtering, so a session created in cwd A can be
    // resumed from cwd B. ForgeClaw spawns the same session from different
    // cwds (telegram handler vs ws-server), so we need this.
    args.push('--all');

    const model = options.model ?? this.config.runtimes?.['codex']?.model;
    if (model) {
      args.push('--model', model);
    }

    // SESSION_ID is positional, must come after flags
    args.push(options.sessionId!);

    // Prompt from stdin
    args.push('-');

    return args;
  }

  /**
   * Parse JSONL stdout line-by-line, mapping each Codex event to normalized
   * StreamEvent.
   */
  private async *parseStdout(proc: ChildProcess): AsyncGenerator<StreamEvent> {
    if (!proc.stdout) return;

    let buffer = '';

    const chunks: Buffer[] = [];
    const reader: AsyncIterable<Buffer> = proc.stdout as unknown as AsyncIterable<Buffer>;

    for await (const chunk of reader) {
      buffer += chunk.toString('utf-8');
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        let event: CodexEvent;
        try {
          event = JSON.parse(trimmed) as CodexEvent;
        } catch {
          // Non-JSON lines are Codex warnings to stdout — ignore
          continue;
        }

        yield* this.mapEvent(event);
      }
    }

    // Final flush
    if (buffer.trim()) {
      try {
        const event = JSON.parse(buffer.trim()) as CodexEvent;
        yield* this.mapEvent(event);
      } catch {
        // ignore trailing incomplete JSON
      }
    }
  }

  /**
   * Map a Codex JSONL event to zero or more normalized StreamEvents.
   */
  private *mapEvent(event: CodexEvent): Generator<StreamEvent> {
    switch (event.type) {
      case 'thread.started':
        this.threadId = event.thread_id;
        // Don't emit — the session ID is captured in `done`
        return;

      case 'turn.started':
        // Nothing to emit
        return;

      case 'item.started': {
        const item = event.item;
        if (item.type === 'command_execution' && item.command) {
          yield {
            type: 'tool_use',
            data: {
              name: 'shell',
              input: { command: item.command },
              id: item.id,
            },
          };
        } else if (item.type === 'reasoning' && item.text) {
          yield { type: 'thinking', data: { text: item.text } };
        }
        return;
      }

      case 'item.completed': {
        const item = event.item;

        switch (item.type) {
          case 'agent_message':
            if (item.text) {
              yield { type: 'text', data: { text: item.text } };
            }
            return;

          case 'reasoning':
            if (item.text) {
              yield { type: 'thinking', data: { text: item.text } };
            }
            return;

          case 'command_execution':
            yield {
              type: 'tool_result',
              data: {
                toolId: item.id,
                output: item.aggregated_output ?? '',
                exitCode: item.exit_code ?? 0,
                status: item.status ?? 'completed',
              },
            };
            return;

          case 'file_changes':
            yield {
              type: 'tool_use',
              data: { name: 'edit', input: item, id: item.id },
            };
            return;

          case 'web_searches':
            yield {
              type: 'tool_use',
              data: { name: 'web_search', input: item, id: item.id },
            };
            return;

          case 'mcp_tool_calls':
            yield {
              type: 'tool_use',
              data: { name: 'mcp', input: item, id: item.id },
            };
            return;

          case 'plan_updates':
            if (item.text) {
              yield { type: 'text', data: { text: `📋 ${item.text}` } };
            }
            return;

          default:
            // Unknown item type: forward as text if it has text content
            if (typeof item.text === 'string' && item.text) {
              yield { type: 'text', data: { text: item.text } };
            }
            return;
        }
      }

      case 'turn.completed': {
        const usage = event.usage ?? {};
        yield {
          type: 'done',
          data: {
            result: undefined, // Codex doesn't emit a final "result" string separately
            sessionId: this.threadId ?? undefined,
            usage: {
              input_tokens: usage.input_tokens ?? 0,
              output_tokens: usage.output_tokens ?? 0,
              cache_read_tokens: usage.cached_input_tokens ?? 0,
            },
          },
        };
        return;
      }

      case 'turn.failed':
        throw new Error(event.error?.message ?? 'codex turn failed');

      case 'error':
        throw new Error(event.message);

      default:
        return;
    }
  }

  abort(): void {
    this.aborted = true;
    if (!this.proc) return;

    this.proc.kill('SIGTERM');

    setTimeout(() => {
      if (this.proc) {
        try {
          this.proc.kill('SIGKILL');
        } catch {
          // already dead
        }
        this.proc = null;
      }
    }, KILL_TIMEOUT_MS);
  }
}
