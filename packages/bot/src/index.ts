import { Bot, GrammyError, HttpError } from 'grammy';
import { run } from '@grammyjs/runner';
import { autoRetry } from '@grammyjs/auto-retry';
import { sequentialize } from '@grammyjs/runner';
import { getConfig, cronEngine, eventBus, stateStore } from '@forgeclaw/core';
import { createAuthMiddleware } from './middleware/auth';
import { getSessionKey } from './middleware/sequentialize';
import { createTextHandler } from './handlers/text';
import { registerCommands } from './handlers/commands';
import { createCallbackHandler } from './handlers/callbacks';
import { createVoiceHandler } from './handlers/voice';
import { createDocumentHandler } from './handlers/document';
import { createPhotoHandler } from './handlers/photo';

async function main(): Promise<void> {
  console.log('[forgeclaw] Loading configuration...');
  const config = await getConfig();

  console.log('[forgeclaw] Creating bot instance...');
  const bot = new Bot(config.botToken);

  // Install auto-retry transformer for rate limiting
  bot.api.config.use(autoRetry({
    maxDelaySeconds: 60,
    maxRetryAttempts: 5,
  }));

  // Middleware: sequentialize by chat/topic
  bot.use(sequentialize(getSessionKey));

  // Middleware: auth whitelist
  bot.use(createAuthMiddleware(config));

  // Register command handlers
  const commands = registerCommands(config);
  bot.command('start', commands.start);
  bot.command('new', commands.newSession);
  bot.command('stop', commands.stop);
  bot.command('status', commands.status);
  bot.command('help', commands.help);
  bot.command('project', commands.project);

  // Register callback query handler
  bot.on('callback_query:data', createCallbackHandler(config));

  // Register text message handler (must be after commands)
  bot.on('message:text', createTextHandler(config));

  // Register voice/audio handler
  bot.on('message:voice', createVoiceHandler(config));
  bot.on('message:audio', createVoiceHandler(config));

  // Register document handler
  bot.on('message:document', createDocumentHandler(config));

  // Register photo handler
  bot.on('message:photo', createPhotoHandler(config));

  // Error handler
  bot.catch((err) => {
    const ctx = err.ctx;
    const e = err.error;

    console.error(`[forgeclaw] Error while handling update ${ctx.update.update_id}:`);

    if (e instanceof GrammyError) {
      console.error('[forgeclaw] Grammy error:', e.description);
    } else if (e instanceof HttpError) {
      console.error('[forgeclaw] HTTP error:', e);
    } else {
      console.error('[forgeclaw] Unknown error:', e);
    }
  });

  // Start bot with concurrent runner
  console.log('[forgeclaw] Starting bot with concurrent runner...');
  const handle = run(bot);

  // Start cron engine (HEARTBEAT.md scheduler)
  console.log('[forgeclaw] Starting cron engine...');
  await cronEngine.start();

  // Route cron results to Telegram topics
  eventBus.on('cron:result', async (data) => {
    const { jobId, jobName, topicId, output, status } = data as {
      jobId: number;
      jobName: string;
      topicId: number | null;
      output: string;
      status: string;
    };

    const statusIcon = status === 'success' ? '[OK]' : '[FAIL]';
    const message = `${statusIcon} Cron: ${jobName}\n\n${String(output).slice(0, 4000)}`;

    try {
      if (topicId) {
        // Find the topic to get chat_id and thread_id
        const topic = stateStore.getTopic(topicId);
        if (topic) {
          await bot.api.sendMessage(topic.chatId, message, {
            message_thread_id: topic.threadId ?? undefined,
          });
          return;
        }
      }

      // Fallback: send to first allowed user as DM
      if (config.allowedUsers.length > 0) {
        await bot.api.sendMessage(config.allowedUsers[0], message);
      }
    } catch (err) {
      console.error(`[forgeclaw] Failed to send cron result for job ${jobId}:`, err);
    }
  });

  console.log('[forgeclaw] ForgeClaw bot started');

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`[forgeclaw] Received ${signal}, shutting down...`);
    await cronEngine.stop();
    await handle.stop();
    console.log('[forgeclaw] Bot stopped gracefully.');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[forgeclaw] Fatal error:', err);
  process.exit(1);
});
