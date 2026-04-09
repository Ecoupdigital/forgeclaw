import type { Context } from 'grammy';
import { ClaudeRunner, sessionManager, stateStore } from '@forgeclaw/core';
import type { StreamEvent, ForgeClawConfig } from '@forgeclaw/core';
import { convertToHtml, buildContextBar, buildActionKeyboard, truncateForTelegram } from '../utils/formatting';
import { messageQueue } from '../utils/queue';

/** Minimum interval between message edits (ms) to respect Telegram rate limits. */
const EDIT_THROTTLE_MS = 500;

/** Active runners keyed by session key, for abort support. */
const activeRunners = new Map<string, ClaudeRunner>();

export function getActiveRunners(): Map<string, ClaudeRunner> {
  return activeRunners;
}

export function createTextHandler(config: ForgeClawConfig) {
  return async (ctx: Context): Promise<void> => {
    const text = ctx.message?.text;
    if (!text) return;

    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const topicId = ctx.message?.message_thread_id ?? null;
    const sessionKey = `${chatId}:${topicId ?? 0}`;

    // Handle interrupt: messages starting with "!"
    if (text.startsWith('!')) {
      await handleInterrupt(ctx, sessionKey, text.slice(1).trim(), config);
      return;
    }

    // Check if already processing in this topic
    if (messageQueue.isProcessing(sessionKey)) {
      const enqueued = messageQueue.enqueue(sessionKey, {
        text,
        chatId,
        topicId,
        messageId: ctx.message?.message_id ?? 0,
        timestamp: Date.now(),
      });

      if (!enqueued) {
        await ctx.reply('Queue full, wait for current processing to finish.', {
          ...(topicId ? { message_thread_id: topicId } : {}),
        });
      } else {
        await ctx.reply(`Queued (${messageQueue.size(sessionKey)} in queue)`, {
          ...(topicId ? { message_thread_id: topicId } : {}),
        });
      }
      return;
    }

    await processMessage(ctx, chatId, topicId, sessionKey, text, config);
  };
}

async function processMessage(
  ctx: Context,
  chatId: number,
  topicId: number | null,
  sessionKey: string,
  text: string,
  config: ForgeClawConfig,
): Promise<void> {
  messageQueue.setProcessing(sessionKey, true);

  try {
    // Get or create session
    const session = await sessionManager.getOrCreateSession(chatId, topicId);

    // Send placeholder
    const placeholder = await ctx.reply('Processing...', {
      ...(topicId ? { message_thread_id: topicId } : {}),
    });

    // Save user message
    stateStore.createMessage({
      topicId: topicId ?? chatId,
      role: 'user',
      content: text,
      createdAt: Date.now(),
    });

    // Create runner and stream
    const runner = new ClaudeRunner();
    activeRunners.set(sessionKey, runner);

    let accumulatedText = '';
    let lastEditTime = 0;
    let currentStatus = 'Processing...';

    try {
      const runOptions = {
        sessionId: session.claudeSessionId ?? undefined,
        cwd: session.projectDir ?? config.workingDir,
        model: config.claudeModel,
      };

      for await (const event of runner.run(text, runOptions)) {
        switch (event.type) {
          case 'thinking': {
            currentStatus = '\uD83E\uDDE0 Thinking...';
            await safeEditText(ctx, chatId, placeholder.message_id, currentStatus);
            break;
          }

          case 'tool_use': {
            const toolName = (event.data.name as string) ?? 'tool';
            const inputPreview = event.data.input
              ? JSON.stringify(event.data.input).slice(0, 60)
              : '';
            currentStatus = `\uD83D\uDD27 ${toolName}: ${inputPreview}`;
            await safeEditText(ctx, chatId, placeholder.message_id, currentStatus);
            break;
          }

          case 'text': {
            const chunk = event.data.text as string;
            accumulatedText += chunk;

            const now = Date.now();
            if (now - lastEditTime >= EDIT_THROTTLE_MS) {
              lastEditTime = now;
              const html = convertToHtml(accumulatedText);
              const truncated = truncateForTelegram(html);
              await safeEditText(ctx, chatId, placeholder.message_id, truncated, 'HTML');
            }
            break;
          }

          case 'done': {
            // Final message edit with full text
            const resultSessionId = event.data.sessionId as string | undefined;
            if (resultSessionId) {
              await sessionManager.updateClaudeSessionId(chatId, topicId, resultSessionId);
            }

            // Calculate context usage
            const usage = event.data.usage as { input_tokens: number; output_tokens: number } | undefined;
            const contextLimit = event.data.contextLimit as number | undefined;
            let contextPercent = 0;
            if (usage && contextLimit && contextLimit > 0) {
              contextPercent = Math.round(((usage.input_tokens + usage.output_tokens) / contextLimit) * 100);
              await sessionManager.updateContextUsage(chatId, topicId, contextPercent);
            }

            // Build final message
            const finalHtml = accumulatedText
              ? convertToHtml(accumulatedText)
              : (event.data.result as string) ?? 'Done.';

            const contextBar = buildContextBar(contextPercent);
            const finalMessage = truncateForTelegram(`${finalHtml}\n\n<i>${contextBar}</i>`);

            await safeEditText(
              ctx,
              chatId,
              placeholder.message_id,
              finalMessage,
              'HTML',
              buildActionKeyboard(),
            );

            // Save assistant message
            stateStore.createMessage({
              topicId: topicId ?? chatId,
              role: 'assistant',
              content: accumulatedText || ((event.data.result as string) ?? ''),
              createdAt: Date.now(),
            });

            break;
          }
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[text-handler] Error processing message:`, err);
      await safeEditText(
        ctx,
        chatId,
        placeholder.message_id,
        `Error: ${errorMsg}`,
      );
    } finally {
      activeRunners.delete(sessionKey);
    }
  } finally {
    messageQueue.setProcessing(sessionKey, false);

    // Process next queued message
    const next = messageQueue.dequeue(sessionKey);
    if (next) {
      // Fire and forget — process next in queue
      processMessage(ctx, next.chatId, next.topicId, sessionKey, next.text, config).catch((err) => {
        console.error('[text-handler] Error processing queued message:', err);
      });
    }
  }
}

async function handleInterrupt(
  ctx: Context,
  sessionKey: string,
  command: string,
  config: ForgeClawConfig,
): Promise<void> {
  const runner = activeRunners.get(sessionKey);
  if (runner?.isRunning) {
    runner.abort();
    await ctx.reply('Interrupted current task.', {
      ...(ctx.message?.message_thread_id ? { message_thread_id: ctx.message.message_thread_id } : {}),
    });
  }

  // If there's text after "!", send it as a new prompt
  if (command) {
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    const topicId = ctx.message?.message_thread_id ?? null;

    // Wait a moment for the abort to take effect
    await new Promise((r) => setTimeout(r, 500));

    messageQueue.setProcessing(sessionKey, false);
    await processMessage(ctx, chatId, topicId, sessionKey, command, config);
  }
}

/**
 * Safely edit a message, catching errors from Telegram
 * (e.g., message not modified, message too old).
 */
async function safeEditText(
  ctx: Context,
  chatId: number,
  messageId: number,
  text: string,
  parseMode?: 'HTML',
  replyMarkup?: ReturnType<typeof buildActionKeyboard>,
): Promise<void> {
  try {
    await ctx.api.editMessageText(chatId, messageId, text, {
      ...(parseMode ? { parse_mode: parseMode } : {}),
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    });
  } catch (err) {
    // Telegram returns error if message content hasn't changed — ignore
    const msg = err instanceof Error ? err.message : '';
    if (!msg.includes('message is not modified')) {
      console.error('[text-handler] Edit failed:', msg);
    }
  }
}
