import type { StreamEvent, ClaudeRunnerOptions } from './types';

const MAX_RETRIES = 3;
const KILL_TIMEOUT_MS = 5000;

interface ContentBlock {
  type: string;
  thinking?: string;
  text?: string;
  name?: string;
  input?: Record<string, unknown>;
}

interface StreamMessage {
  type: string;
  subtype?: string;
  session_id?: string;
  content?: ContentBlock[];
  result?: string;
  is_error?: boolean;
  errors?: string[];
  usage?: { input_tokens: number; output_tokens: number };
  model_context_limit?: number;
  cost_usd?: number;
  duration_ms?: number;
  duration_api_ms?: number;
  num_turns?: number;
}

export class ClaudeRunner {
  private proc: ReturnType<typeof Bun.spawn> | null = null;
  private aborted = false;

  async *run(prompt: string, options: ClaudeRunnerOptions = {}): AsyncGenerator<StreamEvent> {
    let attempts = 0;

    while (attempts < MAX_RETRIES) {
      attempts++;
      try {
        yield* this.spawnAndStream(prompt, options);
        return;
      } catch (err) {
        if (this.aborted) throw err;
        const errMsg = err instanceof Error ? err.message : String(err);

        // If resume session not found, retry without session ID
        if (errMsg.includes('No conversation found') && options.sessionId) {
          console.warn(`[claude-runner] Session ${options.sessionId} expired, starting fresh`);
          options = { ...options, sessionId: undefined };
          continue;
        }

        if (attempts >= MAX_RETRIES) {
          throw new Error(`Claude CLI failed after ${MAX_RETRIES} attempts: ${errMsg}`);
        }
        console.error(`[claude-runner] Attempt ${attempts} failed, retrying...`, err);
        await new Promise((r) => setTimeout(r, 1000 * attempts));
      }
    }
  }

  private async *spawnAndStream(prompt: string, options: ClaudeRunnerOptions): AsyncGenerator<StreamEvent> {
    const args = this.buildArgs(options);
    args.push(prompt);

    console.log('[claude-runner] Spawning:', args.join(' ').substring(0, 200));
    console.log('[claude-runner] CWD:', options.cwd || process.cwd());

    this.proc = Bun.spawn(args, {
      stdin: 'ignore',
      stdout: 'pipe',
      stderr: 'pipe',
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, PATH: process.env.PATH },
    });

    // Capture stderr in background for debugging
    const stderrStream = this.proc.stderr;
    if (stderrStream && typeof stderrStream !== 'number') {
      (async () => {
        const reader = (stderrStream as ReadableStream<Uint8Array>).getReader();
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = decoder.decode(value, { stream: true });
            if (text.trim()) console.error('[claude-runner] stderr:', text.trim());
          }
        } catch { /* ignore */ } finally { reader.releaseLock(); }
      })();
    }

    const stdout = this.proc.stdout;
    if (!stdout || typeof stdout === 'number') {
      throw new Error('Expected readable stdout from Bun.spawn');
    }
    const reader = (stdout as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          let parsed: StreamMessage;
          try {
            parsed = JSON.parse(trimmed) as StreamMessage;
          } catch {
            continue;
          }

          yield* this.processMessage(parsed);
        }
      }

      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer.trim()) as StreamMessage;
          yield* this.processMessage(parsed);
        } catch {
          // ignore trailing incomplete JSON
        }
      }
    } finally {
      reader.releaseLock();
    }

    const exitCode = await this.proc.exited;
    this.proc = null;

    if (exitCode !== 0 && !this.aborted) {
      throw new Error(`Claude CLI exited with code ${exitCode}`);
    }
  }

  private *processMessage(msg: StreamMessage): Generator<StreamEvent> {
    if (msg.type === 'assistant' && msg.subtype === 'thinking' && msg.content) {
      for (const block of msg.content) {
        if (block.type === 'thinking' && block.thinking) {
          yield { type: 'thinking', data: { text: block.thinking } };
        }
      }
    }

    if (msg.type === 'assistant' && msg.content) {
      for (const block of msg.content) {
        if (block.type === 'text' && block.text) {
          yield { type: 'text', data: { text: block.text } };
        }
        if (block.type === 'tool_use') {
          yield { type: 'tool_use', data: { name: block.name, input: block.input } };
        }
        if (block.type === 'tool_result') {
          yield { type: 'tool_result', data: { content: block } };
        }
      }
    }

    if (msg.type === 'result') {
      // Check for error results (e.g. session not found)
      if (msg.is_error && msg.errors?.length) {
        throw new Error(msg.errors.join('; '));
      }

      yield {
        type: 'done',
        data: {
          result: msg.result,
          sessionId: msg.session_id,
          usage: msg.usage,
          costUsd: msg.cost_usd,
          durationMs: msg.duration_ms,
          numTurns: msg.num_turns,
          contextLimit: msg.model_context_limit,
        },
      };
    }
  }

  private buildArgs(options: ClaudeRunnerOptions): string[] {
    const claudePath = process.env.CLAUDE_CLI_PATH || '/root/.local/bin/claude';
    const args = [claudePath, '-p', '--verbose', '--output-format', 'stream-json'];

    if (options.sessionId) {
      args.push('--resume', options.sessionId);
    }

    // cwd is handled via Bun.spawn({ cwd }), not as CLI arg

    if (options.model) {
      args.push('--model', options.model);
    }

    if (options.allowedTools && options.allowedTools.length > 0) {
      for (const tool of options.allowedTools) {
        args.push('--allowedTools', tool);
      }
    }

    if (options.systemPrompt) {
      args.push('--system-prompt', options.systemPrompt);
    }

    if (options.appendSystemPrompt) {
      // If the value looks like a file path, use --append-system-prompt-file
      if (options.appendSystemPrompt.startsWith('/') || options.appendSystemPrompt.startsWith('~')) {
        args.push('--append-system-prompt-file', options.appendSystemPrompt);
      } else {
        args.push('--append-system-prompt', options.appendSystemPrompt);
      }
    }

    args.push('--permission-mode', 'bypassPermissions');

    return args;
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
          // process already dead
        }
        this.proc = null;
      }
    }, KILL_TIMEOUT_MS);
  }

  get isRunning(): boolean {
    return this.proc !== null;
  }
}
