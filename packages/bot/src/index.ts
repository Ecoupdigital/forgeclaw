import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { Bot, GrammyError, HttpError } from 'grammy';
import { run } from '@grammyjs/runner';
import { autoRetry } from '@grammyjs/auto-retry';
import { sequentialize } from '@grammyjs/runner';
import {
  getConfig,
  cronEngine,
  eventBus,
  stateStore,
  startWSServer,
  memoryManager,
  memoryManagerV2,
  runnerRegistry,
} from '@forgeclaw/core';
import { createAuthMiddleware } from './middleware/auth';
import { getSessionKey } from './middleware/sequentialize';
import { createTextHandler } from './handlers/text';
import { registerCommands } from './handlers/commands';
import { createCallbackHandler } from './handlers/callbacks';
import { createVoiceHandler } from './handlers/voice';
import { createDocumentHandler } from './handlers/document';
import { createPhotoHandler } from './handlers/photo';
import { bootstrapTopicsFromSessions } from './bootstrap-topics';

async function main(): Promise<void> {
  console.log('[forgeclaw] Loading configuration...');
  const config = await getConfig();

  // Check for compiled harness file
  const harnessClaude = join(homedir(), '.forgeclaw', 'harness', 'CLAUDE.md');
  if (!existsSync(harnessClaude)) {
    console.warn('[forgeclaw] WARNING: ~/.forgeclaw/harness/CLAUDE.md not found.');
    console.warn('[forgeclaw] Bot will run without personality/context harness.');
    console.warn('[forgeclaw] Run "npx forgeclaw install --update" or call compileHarness() to generate it.');
  } else {
    console.log('[forgeclaw] Harness CLAUDE.md loaded.');
  }

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
  const { upCommands, ...commands } = registerCommands(config);
  bot.command('start', commands.start);
  bot.command('new', commands.newSession);
  bot.command('stop', commands.stop);
  bot.command('status', commands.status);
  bot.command('help', commands.help);
  bot.command('project', commands.project);
  bot.command('up', commands.up);
  bot.command('runtime', commands.runtime);
  bot.command('topic_create', commands.topicCreate);
  bot.command('topic_rename', commands.topicRename);
  bot.command('topic_link', commands.topicLink);
  bot.command('sessions', commands.sessions);
  bot.command('sessions_resume', commands.sessionsResume);
  bot.command('sessions_close', commands.sessionsClose);
  bot.command('sessions_rename', commands.sessionsRename);

  // Register UP shortcut commands — each sends the /up:* text to Claude
  const textHandler = createTextHandler(config);
  for (const [cmd, upCmd] of Object.entries(upCommands)) {
    bot.command(cmd, async (ctx) => {
      const extra = ctx.match ? ` ${ctx.match}` : '';
      // Inject the UP command as the message text so the text handler processes it
      if (ctx.message) {
        (ctx.message as any).text = `${upCmd}${extra}`;
      }
      await textHandler(ctx);
    });
  }

  // Register callback query handler
  bot.on('callback_query:data', createCallbackHandler(config));

  // Register text message handler (must be after commands)
  bot.on('message:text', textHandler);

  // Register voice/audio handler
  bot.on('message:voice', createVoiceHandler(config));
  bot.on('message:audio', createVoiceHandler(config));

  // Register document handler
  bot.on('message:document', createDocumentHandler(config));

  // Register photo handler
  bot.on('message:photo', createPhotoHandler(config));

  // Forum topic lifecycle: capture real names as Telegram sends them.
  //
  // The Bot API has no method to fetch a topic name by thread_id (confirmed
  // via tdlib/telegram-bot-api#634, open since 2024, still unresolved). The
  // ONLY way to know a topic's real name is to listen for the two service
  // messages that carry it: forum_topic_created (on creation) and
  // forum_topic_edited (when someone renames, icon changes come without name).
  //
  // When a user creates a new topic in a forum supergroup, Telegram emits a
  // service message to that thread with the name and icon. We upsert the row.
  // Next time the dashboard cron form dropdown loads, it shows the real name
  // instead of the generic "Topic N" placeholder from the bootstrap.
  bot.on('message:forum_topic_created', async (ctx) => {
    const chatId = ctx.chat?.id;
    const threadId = ctx.message?.message_thread_id;
    const created = ctx.message?.forum_topic_created;
    if (!chatId || !threadId || !created?.name) return;
    try {
      stateStore.upsertTopic({ chatId, threadId, name: created.name });
      console.log(
        `[forgeclaw] forum_topic_created: ${chatId}/${threadId} → "${created.name}"`
      );
    } catch (err) {
      console.error('[forgeclaw] upsertTopic on create failed:', err);
    }
  });

  bot.on('message:forum_topic_edited', async (ctx) => {
    const chatId = ctx.chat?.id;
    const threadId = ctx.message?.message_thread_id;
    const edited = ctx.message?.forum_topic_edited;
    // name is optional: if only the icon changed, name is undefined — skip.
    if (!chatId || !threadId || !edited?.name) return;
    try {
      stateStore.upsertTopic({ chatId, threadId, name: edited.name });
      console.log(
        `[forgeclaw] forum_topic_edited: ${chatId}/${threadId} → "${edited.name}"`
      );
    } catch (err) {
      console.error('[forgeclaw] upsertTopic on edit failed:', err);
    }
  });

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

  // Register bot commands menu
  await bot.api.setMyCommands([
    { command: 'start', description: 'Iniciar sessão no tópico atual' },
    { command: 'new', description: 'Nova sessão (limpa contexto)' },
    { command: 'stop', description: 'Interromper tarefa em andamento' },
    { command: 'status', description: 'Estado da sessão atual' },
    { command: 'project', description: 'Listar/trocar projeto' },
    { command: 'topic_create', description: 'Criar tópico para um projeto' },
    { command: 'topic_rename', description: 'Renomear tópico: /topic_rename nome' },
    { command: 'topic_link', description: 'Vincular este tópico a um projeto' },
    { command: 'sessions', description: 'Listar todas as sessões ativas' },
    { command: 'sessions_resume', description: 'Retomar uma sessão existente' },
    { command: 'sessions_close', description: 'Fechar uma sessão' },
    { command: 'sessions_rename', description: 'Renomear sessão: /sessions_rename nome' },
    { command: 'up', description: 'Grid de comandos UP' },
    { command: 'runtime', description: 'Runtime deste topic (claude-code|codex)' },
    { command: 'up_progresso', description: 'UP: status do projeto' },
    { command: 'up_planejar', description: 'UP: planejar fase' },
    { command: 'up_executar', description: 'UP: executar fase' },
    { command: 'up_verificar', description: 'UP: verificar trabalho' },
    { command: 'up_rapido', description: 'UP: tarefa rápida' },
    { command: 'up_depurar', description: 'UP: modo depuração' },
    { command: 'up_retomar', description: 'UP: retomar sessão anterior' },
    { command: 'up_pausar', description: 'UP: pausar trabalho' },
    { command: 'help', description: 'Referência de comandos' },
  ]);

  // Start bot with concurrent runner
  console.log('[forgeclaw] Starting bot with concurrent runner...');
  const handle = run(bot);

  // Bug 688 fix: populate the `topics` table from existing sessions and
  // enrich names from the Telegram API. Must run BEFORE cron engine so the
  // cron:result listener can resolve target topics on the first run.
  // Non-blocking on errors — bot continues even if the bootstrap fails.
  try {
    console.log('[forgeclaw] Bootstrapping topics from sessions...');
    await bootstrapTopicsFromSessions(bot);
  } catch (err) {
    console.error('[forgeclaw] bootstrap-topics failed (non-fatal):', err);
  }

  // Initialize the agent runner registry (discovers claude-code + codex
  // and runs health checks). Runners are selected per topic/cron by the
  // text handler and cron engine via runnerRegistry.get(runtime).
  console.log('[forgeclaw] Initializing runner registry...');
  await runnerRegistry.initialize(config);

  // Start cron engine (HEARTBEAT.md scheduler)
  console.log('[forgeclaw] Starting cron engine...');
  await cronEngine.start();

  // Schedule the internal compile-daily job (legacy simple compile).
  memoryManager.startCompileCron();

  // Initialize the v1.5 memory system: registers the built-in provider,
  // loads the frozen snapshot from SQLite, primes FTS5 search.
  try {
    await memoryManagerV2.initializeAll({
      userId: 'default',
      workspaceId: 'default',
      platform: 'telegram',
      agentContext: 'primary',
    });
    memoryManagerV2.startCrons();
    console.log('[forgeclaw] memory v1.5 initialized + crons started');
  } catch (err) {
    console.error('[forgeclaw] memory v1.5 init failed:', err);
  }

  // Mirror chat messages that originated OUTSIDE Telegram (currently only the
  // dashboard) into the corresponding Telegram chat+thread. This gives the
  // dashboard a bidirectional chat: messages typed in the dashboard land in
  // the same Telegram topic as if the user had typed them on the phone.
  //
  // User messages get a "[dashboard]" prefix so it's obvious they came from
  // the other side (you can't impersonate yourself as a Telegram user with a
  // bot token — so the bot sends them on your behalf, labeled). Assistant
  // messages are sent plain because they are the bot's own output anyway.
  //
  // Loop safety: events with origin === 'telegram' are skipped, otherwise the
  // bot would echo its own messages back to itself forever.
  const mirrorToTelegram = async (data: Record<string, unknown>, kind: 'incoming' | 'outgoing') => {
    const origin = data.origin as 'telegram' | 'dashboard' | undefined;
    if (origin === 'telegram' || origin === undefined) return;

    const chatId = data.chatId as number | undefined;
    const topicId = data.topicId as number | null | undefined;
    const content = data.content as string | undefined;
    if (typeof chatId !== 'number' || typeof content !== 'string' || content.length === 0) {
      return;
    }

    const prefix = kind === 'incoming' ? '📱 [dashboard] ' : '';
    const text = (prefix + content).slice(0, 4000);

    try {
      await bot.api.sendMessage(chatId, text, {
        ...(topicId ? { message_thread_id: topicId } : {}),
      });
      console.log(
        `[forgeclaw] mirrored ${kind} from ${origin} → chat=${chatId} thread=${topicId ?? 'dm'} len=${content.length}`
      );
    } catch (err) {
      console.error(
        `[forgeclaw] Failed to mirror ${kind} message from ${origin} to Telegram:`,
        err instanceof Error ? err.message : err
      );
    }
  };

  eventBus.on('message:incoming', (data) => {
    mirrorToTelegram(data, 'incoming');
    // Log every incoming user message to today's daily log so the memory
    // pipeline has real data to compile at 23:55. Keeps the entry short.
    const content = (data as Record<string, unknown>).content;
    const origin = (data as Record<string, unknown>).origin;
    if (typeof content === 'string' && content.length > 0) {
      const preview = content.replace(/\s+/g, ' ').slice(0, 140);
      memoryManager
        .addEntry(`[${origin ?? 'unknown'}→user] ${preview}`)
        .catch((err) => console.error('[forgeclaw] memory addEntry (incoming) failed:', err));
    }
  });
  eventBus.on('message:outgoing', (data) => {
    mirrorToTelegram(data, 'outgoing');
  });

  // Route cron results to Telegram topics
  eventBus.on('cron:result', async (data) => {
    const { jobId, jobName, topicId, output, status } = data as {
      jobId: number;
      jobName: string;
      topicId: number | null;
      output: string;
      status: string;
    };

    // Log cron executions to daily memory log — this is a major source of
    // decisions/activity that should persist across days.
    const outputPreview = String(output ?? '').replace(/\s+/g, ' ').slice(0, 200);
    memoryManager
      .addEntry(`[cron:${status}] ${jobName} → ${outputPreview}`)
      .catch((err) => console.error('[forgeclaw] memory addEntry (cron) failed:', err));

    const statusIcon = status === 'success' ? '\u2705' : '\u274C';
    const statusLabel = status === 'success' ? 'OK' : 'FALHOU';
    const message = `${statusIcon} Cron ${statusLabel}: ${jobName}\n\n${String(output).slice(0, 4000)}`;

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

  // Start WebSocket server for dashboard real-time chat
  startWSServer();
  console.log('[forgeclaw] WebSocket server started on port 4041');

  console.log('[forgeclaw] ForgeClaw bot started');

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`[forgeclaw] Received ${signal}, shutting down...`);
    await cronEngine.stop();
    memoryManager.stopCompileCron();
    try { await memoryManagerV2.shutdownAll(); } catch {}
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
