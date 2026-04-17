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
import { detectAndSaveImmediateMemory } from './immediate-memory';

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

    // H6: Immediate memory save — detect "lembra que X" patterns and persist
    // to memory_entries before Claude processes the message. Best-effort:
    // fire-and-forget so it never delays the response.
    detectAndSaveImmediateMemory(text).then((saved) => {
      if (saved) {
        ctx.reply('✓ Anotado na memória.', {
          reply_parameters: { message_id: ctx.message!.message_id },
          ...(topicId ? { message_thread_id: topicId } : {}),
        }).catch(() => {});
      }
    }).catch((err) => {
      console.error('[text-handler] immediate memory save failed:', err);
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
    let typingInterval: ReturnType<typeof setInterval> | undefined;

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
      typingInterval = setInterval(async () => {
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
            const usage = event.data.usage as {
              input_tokens: number;
              output_tokens: number;
              cache_creation_input_tokens?: number;
              cache_read_input_tokens?: number;
            } | undefined;
            const contextLimit = event.data.contextLimit as number | undefined;
            let contextPercent = 0;
            if (usage && contextLimit && contextLimit > 0) {
              contextPercent = Math.round(((usage.input_tokens + usage.output_tokens) / contextLimit) * 100);
              await sessionManager.updateContextUsage(chatId, topicId, contextPercent);
            }

            // Emit stream:done for token-recorder (Mission Control)
            eventBus.emit('stream:done', {
              sessionKey,
              topicId,
              usage: usage ?? undefined,
              model: config.claudeModel ?? null,
              source: 'telegram',
            });

            // Build final message
            const rawResult = (event.data.result as string) ?? '';
            const textToConvert = accumulatedText || rawResult;
            const finalHtml = textToConvert
              ? convertToHtml(textToConvert)
              : 'Done.';
            const finalMessage = truncateForTelegram(finalHtml);

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

      // M10: Translate common Claude CLI errors to friendly messages
      // instead of forwarding raw error text to Telegram.
      const friendlyMsg = classifyClaudeError(errorMsg);
      await safeEditText(
        ctx,
        chatId,
        placeholder.message_id,
        friendlyMsg,
      );
    } finally {
      if (typingInterval) clearInterval(typingInterval);
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
 * Detect common Claude CLI error patterns and return a user-friendly
 * message in Portuguese. Falls back to a generic message for unknown errors.
 *
 * Known patterns:
 * - Auth expired/invalid: "not authenticated", "auth", "unauthorized", "401"
 * - Rate limited: "rate limit", "429", "too many requests", "overloaded"
 * - CLI not found: "ENOENT", "not found", "command not found"
 * - Context window: "context window", "context_length", "too long"
 * - Session expired: "No conversation found", "session"
 * - Network: "ECONNREFUSED", "ETIMEDOUT", "fetch failed"
 * - Generic CLI failure: "exited with code"
 */
function classifyClaudeError(errorMsg: string): string {
  const lower = errorMsg.toLowerCase();

  // Auth issues
  if (
    lower.includes('not authenticated') ||
    lower.includes('unauthorized') ||
    lower.includes('401') ||
    lower.includes('invalid api key') ||
    lower.includes('invalid_api_key')
  ) {
    return 'Claude CLI nao esta autenticado. Rode `claude auth login` no servidor para reconectar.';
  }

  // Rate limiting
  if (
    lower.includes('rate limit') ||
    lower.includes('rate_limit') ||
    lower.includes('429') ||
    lower.includes('too many requests') ||
    lower.includes('overloaded')
  ) {
    return 'Rate limit atingido na API. Aguarde alguns minutos e tente novamente.';
  }

  // CLI not found / not installed
  if (
    lower.includes('enoent') ||
    (lower.includes('not found') && (lower.includes('claude') || lower.includes('command'))) ||
    lower.includes('command not found')
  ) {
    return 'Claude CLI nao encontrado no servidor. Verifique a instalacao com `which claude`.';
  }

  // Context window exceeded
  if (
    lower.includes('context window') ||
    lower.includes('context_length') ||
    lower.includes('too long') ||
    lower.includes('maximum context')
  ) {
    return 'Contexto excedeu o limite. Use /new para iniciar uma sessao limpa.';
  }

  // Session expired (already handled by runner retry, but just in case)
  if (
    lower.includes('no conversation found') ||
    lower.includes('session not found')
  ) {
    return 'Sessao expirou. Use /new para iniciar uma nova.';
  }

  // Network errors
  if (
    lower.includes('econnrefused') ||
    lower.includes('etimedout') ||
    lower.includes('fetch failed') ||
    lower.includes('network')
  ) {
    return 'Erro de rede ao conectar com a API. Verifique a conexao do servidor.';
  }

  // Generic CLI exit code (keep the code for debugging)
  const exitMatch = errorMsg.match(/exited with code (\d+)/);
  if (exitMatch) {
    return `Claude CLI falhou (exit code ${exitMatch[1]}). Verifique os logs com \`forgeclaw logs\`.`;
  }

  // Unknown error — never forward raw error text to Telegram.
  // Log the full error server-side for debugging.
  console.error('[classifyClaudeError] unclassified error:', errorMsg);
  return 'Erro interno ao processar sua mensagem. Verifique os logs com `forgeclaw logs`.';
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
