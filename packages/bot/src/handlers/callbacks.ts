import type { Context } from 'grammy';
import { sessionManager, stateStore } from '@forgeclaw/core';
import type { ForgeClawConfig } from '@forgeclaw/core';
import { InlineKeyboard } from 'grammy';
import { getActiveRunners } from './text';
import { join } from 'node:path';

export function createCallbackHandler(config: ForgeClawConfig) {
  return async (ctx: Context): Promise<void> => {
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const topicId = ctx.callbackQuery?.message?.message_thread_id ?? null;
    const sessionKey = `${chatId}:${topicId ?? 0}`;

    await ctx.answerCallbackQuery();

    if (data === 'action:stop') {
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
      return;
    }

    if (data === 'action:new') {
      await sessionManager.deleteSession(chatId, topicId);
      await ctx.reply('New session created. Previous context cleared.', {
        ...(topicId ? { message_thread_id: topicId } : {}),
      });
      return;
    }

    if (data === 'action:up') {
      const upKeyboard = new InlineKeyboard()
        .text('/up:status', 'up:status').text('/up:plan', 'up:plan').row()
        .text('/up:next', 'up:next').text('/up:review', 'up:review').row()
        .text('/up:fix', 'up:fix').text('/up:test', 'up:test').row();

      await ctx.reply('<b>UP Commands:</b>', {
        parse_mode: 'HTML',
        reply_markup: upKeyboard,
        ...(topicId ? { message_thread_id: topicId } : {}),
      });
      return;
    }

    if (data.startsWith('up:')) {
      const upCommand = `/${data.replace(':', ':')}`;
      // Send the UP command as if the user typed it
      await ctx.reply(`Sending: <code>${upCommand}</code>`, {
        parse_mode: 'HTML',
        ...(topicId ? { message_thread_id: topicId } : {}),
      });
      return;
    }

    if (data.startsWith('option:')) {
      const optionNum = data.replace('option:', '');
      await ctx.reply(`Selected option: ${optionNum}`, {
        ...(topicId ? { message_thread_id: topicId } : {}),
      });
      return;
    }

    if (data.startsWith('project:')) {
      const projectName = data.replace('project:', '');
      const projectDir = join(config.workingDir, projectName);

      stateStore.updateSession(`${chatId}:${topicId ?? 0}`, { projectDir });

      await ctx.reply(`Project switched to: <code>${projectName}</code>`, {
        parse_mode: 'HTML',
        ...(topicId ? { message_thread_id: topicId } : {}),
      });
      return;
    }
  };
}
