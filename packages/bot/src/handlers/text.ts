import type { Context } from 'grammy';
import { InputFile, InlineKeyboard } from 'grammy';
import {
  ClaudeRunner,
  sessionManager,
  stateStore,
  upDetector,
  fileHandler,
  ContextBuilder,
  harnessLoader,
  memoryManager,
  eventBus,
  runnerRegistry,
  type AgentCliRunner,
} from '@forgeclaw/core';
import type { StreamEvent, ForgeClawConfig, RuntimeName } from '@forgeclaw/core';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { convertToHtml, buildContextBar, buildActionKeyboard, truncateForTelegram } from '../utils/formatting';
import { messageQueue } from '../utils/queue';

/** Minimum interval between message edits (ms) to respect Telegram rate limits. */
const EDIT_THROTTLE_MS = 500;

/** Keywords that trigger extended thinking mode. */
const THINKING_KEYWORDS = ['pense', 'raciocine', 'think', 'analise profundamente', 'pense bem', 'reflita'];

/** Path to the harness CLAUDE.md for append-system-prompt. */
const HARNESS_CLAUDE_MD = join(homedir(), '.forgeclaw', 'harness', 'CLAUDE.md');

/** Active runners keyed by session key, for abort support. */
const activeRunners = new Map<string, AgentCliRunner>();

export function getActiveRunners(): Map<string, AgentCliRunner> {
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
    const userCreatedAt = Date.now();
    stateStore.createMessage({
      topicId: topicId ?? chatId,
      role: 'user',
      content: text,
      createdAt: userCreatedAt,
    });

    // Mirror to dashboard (and any other listeners). `origin: 'telegram'` so
    // the mirror listener in ws-server forwards to dashboard subscribers, and
    // the listener in bot/index.ts ignores it (would loop to itself otherwise).
    eventBus.emit('message:incoming', {
      sessionKey,
      chatId,
      topicId,
      role: 'user',
      content: text,
      origin: 'telegram',
      createdAt: userCreatedAt,
    });

    // GAP 1: Build enriched prompt with context (harness, memory, vault, state)
    const contextBuilder = new ContextBuilder(config, harnessLoader);
    const enrichedPrompt = await contextBuilder.build(text, chatId, topicId ?? 0, session.claudeSessionId);

    // GAP 5: Detect thinking keywords
    const shouldThink = THINKING_KEYWORDS.some(k => text.toLowerCase().includes(k));

    // Resolve runtime: topic override → config default → claude-code
    const topicRow = stateStore.getTopicByChatAndThread(chatId, topicId);
    const requestedRuntime = (topicRow?.runtime ?? config.defaultRuntime) as RuntimeName | undefined;
    const allowFallback = topicRow?.runtimeFallback ?? false;
    const runner = runnerRegistry.get(requestedRuntime, { allowFallback });
    console.log(`[text-handler] using runtime '${runner.name}' for ${sessionKey}`);
    activeRunners.set(sessionKey, runner);

    let accumulatedText = '';
    let lastEditTime = 0;
    let currentStatus = 'Processing...';

    try {
      const runOptions: Record<string, unknown> = {
        sessionId: session.claudeSessionId ?? undefined,
        cwd: session.projectDir ?? config.workingDir,
        model: config.claudeModel,
        // Inject harness as a file path — runner adapts per-CLI:
        //   claude-code: --append-system-prompt-file
        //   codex: writes to AGENTS.md in cwd, restores after
        ...(existsSync(HARNESS_CLAUDE_MD) ? { appendSystemPromptFile: HARNESS_CLAUDE_MD } : {}),
        // GAP 5: If thinking keywords detected, instruct extended thinking
        ...(shouldThink ? { systemPrompt: 'Use extended thinking. Think deeply and step-by-step before responding. Show your reasoning process.' } : {}),
      };

      // H9: Send "typing" chat action every 4s while Claude processes.
      // Telegram typing indicator expires after ~5s, so 4s keeps it alive.
      const typingInterval = setInterval(async () => {
        try {
          await ctx.api.sendChatAction(chatId, "typing", {
            ...(topicId ? { message_thread_id: topicId } : {}),
          });
        } catch {
          // Ignore — chat action failures are harmless
        }
      }, 4000);

      // Send initial typing action immediately (don't wait 4s for first one)
      ctx.api.sendChatAction(chatId, "typing", {
        ...(topicId ? { message_thread_id: topicId } : {}),
      }).catch(() => {});

      for await (const event of runner.run(enrichedPrompt, runOptions as any)) {
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

            // Build keyboard only if Claude output contains UP commands or numbered options
            const fullResponseText = accumulatedText || ((event.data.result as string) ?? '');
            const actions = upDetector.extractAllActions(fullResponseText);
            let keyboard: InlineKeyboard | undefined;

            if (actions.upCommands.length > 0 || actions.numberedOptions.length > 0) {
              keyboard = new InlineKeyboard();

              for (let i = 0; i < actions.upCommands.length; i++) {
                const cmd = actions.upCommands[i];
                keyboard.text(cmd.label, `up:${cmd.command}`);
                if ((i + 1) % 3 === 0) keyboard.row();
              }
              if (actions.upCommands.length > 0 && actions.upCommands.length % 3 !== 0) keyboard.row();

              for (let i = 0; i < actions.numberedOptions.length; i++) {
                const opt = actions.numberedOptions[i];
                const optLabel = opt.text.length > 28 ? opt.text.slice(0, 25) + '...' : opt.text;
                keyboard.text(`${opt.number}. ${optLabel}`, `option:${opt.number}`);
                keyboard.row();
              }
            }

            await safeEditText(
              ctx,
              chatId,
              placeholder.message_id,
              finalMessage,
              'HTML',
              keyboard,
            );

            // Save assistant message
            const assistantContent = accumulatedText || ((event.data.result as string) ?? '');
            const assistantCreatedAt = Date.now();
            stateStore.createMessage({
              topicId: topicId ?? chatId,
              role: 'assistant',
              content: assistantContent,
              createdAt: assistantCreatedAt,
            });

            // Mirror to dashboard subscribers via eventBus.
            eventBus.emit('message:outgoing', {
              sessionKey,
              chatId,
              topicId,
              role: 'assistant',
              content: assistantContent,
              origin: 'telegram',
              createdAt: assistantCreatedAt,
            });

            // GAP 9: Memory auto-extract — save brief entry in daily log
            if (accumulatedText && accumulatedText.length > 100) {
              const projectName = session.projectDir?.split('/').pop() ?? 'geral';
              memoryManager.addEntry(
                `[${projectName}] User: ${text.substring(0, 80)}... -> Claude respondeu (${accumulatedText.length} chars)`,
              ).catch((err) => {
                console.error('[text-handler] Failed to save memory entry:', err);
              });
            }

            // Detect and send outbound files mentioned in Claude's output
            const outboundFiles = await fileHandler.detectOutboundFiles(fullResponseText);
            for (const filePath of outboundFiles) {
              try {
                await ctx.api.sendDocument(chatId, new InputFile(filePath), {
                  caption: filePath.split('/').pop(),
                  ...(topicId ? { message_thread_id: topicId } : {}),
                });
              } catch (err) {
                console.error('[text-handler] Failed to send outbound file:', err);
              }
            }

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
      clearInterval(typingInterval);
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
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('message is not modified')) return;

    // If HTML parse failed, retry as plain text so the user isn't stuck on "Processing..."
    if (parseMode === 'HTML' && msg.includes("can't parse entities")) {
      console.warn('[text-handler] HTML parse failed, retrying as plain text');
      try {
        // Strip HTML tags for plain text fallback
        const plain = text.replace(/<[^>]+>/g, '');
        await ctx.api.editMessageText(chatId, messageId, plain, {
          ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        });
        return;
      } catch (retryErr) {
        console.error('[text-handler] Plain text retry also failed:', retryErr);
      }
    }

    console.error('[text-handler] Edit failed:', msg);
  }
}
