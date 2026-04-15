/**
 * Runner registry — discovers available CLI agent runtimes at startup and
 * provides a lookup by runtime name.
 *
 * Health check is on-demand and cheap (just runs `<cli> --version`). Results
 * are cached for the lifetime of the process but can be refreshed manually.
 */

import { spawn } from 'node:child_process';
import type { AgentCliRunner } from './agent-runner';
import type { RuntimeName, ForgeClawConfig } from '../types';
import { ClaudeCodeCliRunner } from './claude-code-cli-runner';
import { CodexCliRunner } from './codex-cli-runner';

interface RuntimeHealth {
  available: boolean;
  version: string | null;
  checkedAt: number;
  error?: string;
}

class RunnerRegistry {
  private runners: Map<RuntimeName, AgentCliRunner> = new Map();
  private health: Map<RuntimeName, RuntimeHealth> = new Map();
  private config: ForgeClawConfig | null = null;

  async initialize(config: ForgeClawConfig): Promise<void> {
    this.config = config;

    // Register built-in runners. Config.runtimes can disable them explicitly.
    const claudeEnabled = config.runtimes?.['claude-code']?.enabled !== false;
    const codexEnabled = config.runtimes?.['codex']?.enabled !== false;

    if (claudeEnabled) {
      this.runners.set('claude-code', new ClaudeCodeCliRunner(config));
    }
    if (codexEnabled) {
      this.runners.set('codex', new CodexCliRunner(config));
    }

    // Run health checks in parallel so startup isn't serialized.
    await Promise.all(
      Array.from(this.runners.entries()).map(async ([name, runner]) => {
        try {
          const version = await runner.version();
          const available = version !== null;
          this.health.set(name, {
            available,
            version,
            checkedAt: Date.now(),
          });
          console.log(
            `[runner-registry] ${name}: ${available ? `v${version}` : 'NOT AVAILABLE'}`,
          );
        } catch (err) {
          this.health.set(name, {
            available: false,
            version: null,
            checkedAt: Date.now(),
            error: err instanceof Error ? err.message : String(err),
          });
          console.warn(`[runner-registry] ${name}: health check failed:`, err);
        }
      }),
    );
  }

  /**
   * Resolve a runtime to a runner instance. Applies config defaults and
   * fallback logic (if the requested runtime is unavailable and fallback
   * is enabled, return the default).
   */
  get(
    requested: RuntimeName | null | undefined,
    opts: { allowFallback?: boolean } = {},
  ): AgentCliRunner {
    const defaultName: RuntimeName = this.config?.defaultRuntime ?? 'claude-code';
    const target = requested ?? defaultName;

    const runner = this.runners.get(target);
    const health = this.health.get(target);

    if (runner && health?.available) {
      return runner;
    }

    // Requested unavailable and fallback allowed → try default
    if (opts.allowFallback && target !== defaultName) {
      const fallback = this.runners.get(defaultName);
      const fallbackHealth = this.health.get(defaultName);
      if (fallback && fallbackHealth?.available) {
        console.warn(
          `[runner-registry] '${target}' unavailable, falling back to '${defaultName}'`,
        );
        return fallback;
      }
    }

    // Last-ditch: return any available runner
    for (const [name, r] of this.runners) {
      if (this.health.get(name)?.available) {
        console.warn(
          `[runner-registry] requested '${target}' and default both unavailable, using '${name}'`,
        );
        return r;
      }
    }

    throw new Error(
      `No agent runtime available. Requested: ${target}. Install 'claude' or 'codex' CLI.`,
    );
  }

  isAvailable(name: RuntimeName): boolean {
    return this.health.get(name)?.available ?? false;
  }

  listHealth(): Array<{ name: RuntimeName; available: boolean; version: string | null; error?: string }> {
    return Array.from(this.health.entries()).map(([name, h]) => ({
      name,
      available: h.available,
      version: h.version,
      error: h.error,
    }));
  }

  defaultRuntime(): RuntimeName {
    return this.config?.defaultRuntime ?? 'claude-code';
  }
}

/**
 * Low-level helper for runners: check if a binary is on PATH and capture
 * its --version output. Fast, no network, ~50ms.
 */
export function checkCliVersion(binary: string, timeoutMs = 3000): Promise<string | null> {
  return new Promise((resolve) => {
    const proc = spawn(binary, ['--version'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      proc.kill();
      resolve(null);
    }, timeoutMs);

    proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    proc.on('error', () => {
      clearTimeout(timer);
      resolve(null);
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        resolve(null);
        return;
      }
      // Claude Code: "1.2.3 (Claude Code)" or just "1.2.3"
      // Codex: "codex-cli 0.120.0"
      const combined = (stdout + stderr).trim();
      const match = combined.match(/(\d+\.\d+\.\d+)/);
      resolve(match ? match[1] : combined.slice(0, 50));
    });
  });
}

export const runnerRegistry = new RunnerRegistry();
