import { eventBus } from './event-bus';
import { stateStore } from './state-store';

/**
 * Token Recorder — listens to stream:done events and persists token usage.
 *
 * Usage data comes from the Claude CLI stream in two shapes:
 * 1. Standard: { input_tokens, output_tokens }
 * 2. Extended (cache): { input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens }
 *
 * Both ws-server.ts and bot/text.ts already extract `event.data.usage` on
 * stream:done. This module centralizes persistence so neither caller needs
 * to write to the DB directly.
 *
 * Call `startTokenRecorder()` once at boot (in bot/index.ts).
 */

let started = false;

export function startTokenRecorder(): void {
  if (started) return;
  started = true;

  eventBus.on('stream:done', async (data) => {
    try {
      const sessionKey = data.sessionKey as string | undefined;
      if (!sessionKey) return;

      const usage = data.usage as {
        input_tokens?: number;
        output_tokens?: number;
        cache_creation_input_tokens?: number;
        cache_read_input_tokens?: number;
      } | undefined;

      if (!usage) return;

      const inputTokens = usage.input_tokens ?? 0;
      const outputTokens = usage.output_tokens ?? 0;
      // If both are zero, nothing to record
      if (inputTokens === 0 && outputTokens === 0) return;

      const topicId = data.topicId as number | null ?? null;
      const model = data.model as string | null ?? null;
      const source = (data.source as string | undefined) ?? 'telegram';

      stateStore.createTokenUsage({
        sessionKey,
        topicId,
        inputTokens,
        outputTokens,
        cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
        cacheReadTokens: usage.cache_read_input_tokens ?? 0,
        model,
        source: source as 'dashboard' | 'telegram' | 'cron',
        createdAt: Date.now(),
      });
    } catch (err) {
      console.error('[token-recorder] Failed to record token usage:', err);
    }
  });

  console.log('[token-recorder] Started — listening for stream:done events');
}
