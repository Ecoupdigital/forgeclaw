import type { Context } from 'grammy';
import { sessionManager } from '@forgeclaw/core';
import type { ForgeClawConfig } from '@forgeclaw/core';
import { InlineKeyboard } from 'grammy';
import { buildContextBar } from '../utils/formatting';
import { messageQueue } from '../utils/queue';
import { getActiveRunners } from './text';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export function registerCommands(config: ForgeClawConfig) {
  const commands = {
    start: async (ctx: Context): Promise<void> => {
      const chatId = ctx.chat?.id;
      if (!chatId) return;
      const topicId = ctx.message?.message_thread_id ?? null;

      await sessionManager.getOrCreateSession(chatId, topicId);

      await ctx.reply(
        '<b>ForgeClaw</b> - Your Personal AI Command Center\n\n'
        + 'Send me a message and I will process it with Claude.\n\n'
        + 'Commands:\n'
        + '/new - Start a new session\n'
        + '/stop - Stop current task\n'
        + '/status - Show session status\n'
        + '/project - Switch project\n'
        + '/help - Show all commands',
        {
          parse_mode: 'HTML',
          ...(topicId ? { message_thread_id: topicId } : {}),
        },
      );
    },

    newSession: async (ctx: Context): Promise<void> => {
      const chatId = ctx.chat?.id;
      if (!chatId) return;
      const topicId = ctx.message?.message_thread_id ?? null;

      await sessionManager.deleteSession(chatId, topicId);

      await ctx.reply('New session created. Previous context cleared.', {
        ...(topicId ? { message_thread_id: topicId } : {}),
      });
    },

    stop: async (ctx: Context): Promise<void> => {
      const chatId = ctx.chat?.id;
      if (!chatId) return;
      const topicId = ctx.message?.message_thread_id ?? null;
      const sessionKey = `${chatId}:${topicId ?? 0}`;

      const runner = getActiveRunners().get(sessionKey);
      if (runner?.isRunning) {
        runner.abort();
        await ctx.reply('Task interrupted.', {
          ...(topicId ? { message_thread_id: topicId } : {}),
        });
      } else {
        await ctx.reply('No active task to stop.', {
          ...(topicId ? { message_thread_id: topicId } : {}),
        });
      }
    },

    status: async (ctx: Context): Promise<void> => {
      const chatId = ctx.chat?.id;
      if (!chatId) return;
      const topicId = ctx.message?.message_thread_id ?? null;
      const sessionKey = `${chatId}:${topicId ?? 0}`;

      const session = sessionManager.getSession(chatId, topicId);

      if (!session) {
        await ctx.reply('No active session. Send a message to start one.', {
          ...(topicId ? { message_thread_id: topicId } : {}),
        });
        return;
      }

      const isProcessing = messageQueue.isProcessing(sessionKey);
      const queueSize = messageQueue.size(sessionKey);
      const contextBar = buildContextBar(session.contextUsage);

      const statusText = [
        '<b>Session Status</b>',
        '',
        `Session: <code>${session.id}</code>`,
        `Claude Session: <code>${session.claudeSessionId ?? 'none'}</code>`,
        `Project: <code>${session.projectDir ?? config.workingDir}</code>`,
        `${contextBar}`,
        `Processing: ${isProcessing ? 'Yes' : 'No'}`,
        `Queue: ${queueSize} message(s)`,
      ].join('\n');

      await ctx.reply(statusText, {
        parse_mode: 'HTML',
        ...(topicId ? { message_thread_id: topicId } : {}),
      });
    },

    help: async (ctx: Context): Promise<void> => {
      const topicId = ctx.message?.message_thread_id ?? null;

      const helpText = [
        '<b>ForgeClaw Commands</b>',
        '',
        '/start - Initialize session',
        '/new - Start fresh session (clear context)',
        '/stop - Abort current task',
        '/status - Session status and context usage',
        '/project - List and switch projects',
        '/help - Show this help',
        '',
        '<b>Special prefixes:</b>',
        '<code>!</code> - Interrupt current task and send new prompt',
        '',
        '<b>Inline buttons:</b>',
        'UP - Show UP commands grid',
        'Parar - Stop current task',
        'Novo - Start new session',
      ].join('\n');

      await ctx.reply(helpText, {
        parse_mode: 'HTML',
        ...(topicId ? { message_thread_id: topicId } : {}),
      });
    },

    project: async (ctx: Context): Promise<void> => {
      const chatId = ctx.chat?.id;
      if (!chatId) return;
      const topicId = ctx.message?.message_thread_id ?? null;

      // List directories in workingDir
      let projects: string[] = [];
      try {
        const entries = readdirSync(config.workingDir);
        projects = entries.filter((entry) => {
          try {
            return statSync(join(config.workingDir, entry)).isDirectory();
          } catch {
            return false;
          }
        });
      } catch {
        await ctx.reply(`Cannot read projects directory: ${config.workingDir}`, {
          ...(topicId ? { message_thread_id: topicId } : {}),
        });
        return;
      }

      if (projects.length === 0) {
        await ctx.reply(`No projects found in ${config.workingDir}`, {
          ...(topicId ? { message_thread_id: topicId } : {}),
        });
        return;
      }

      const keyboard = new InlineKeyboard();
      for (const project of projects.slice(0, 10)) {
        keyboard.text(project, `project:${project}`).row();
      }

      await ctx.reply('<b>Available Projects:</b>', {
        parse_mode: 'HTML',
        reply_markup: keyboard,
        ...(topicId ? { message_thread_id: topicId } : {}),
      });
    },
  };

  return commands;
}
