import { Bot, GrammyError, HttpError } from 'grammy';
import { run } from '@grammyjs/runner';
import { autoRetry } from '@grammyjs/auto-retry';
import { sequentialize } from '@grammyjs/runner';
import { getConfig } from '@forgeclaw/core';
import { createAuthMiddleware } from './middleware/auth';
import { getSessionKey } from './middleware/sequentialize';
import { createTextHandler } from './handlers/text';
import { registerCommands } from './handlers/commands';
import { createCallbackHandler } from './handlers/callbacks';

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

  console.log('[forgeclaw] ForgeClaw bot started');

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`[forgeclaw] Received ${signal}, shutting down...`);
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
