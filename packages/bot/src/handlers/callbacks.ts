import type { Context } from 'grammy';
import { sessionManager, stateStore, upDetector } from '@forgeclaw/core';
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
      const grid = upDetector.getUPCommandsGrid();
      const upKeyboard = new InlineKeyboard();

      for (let i = 0; i < grid.length; i++) {
        upKeyboard.text(grid[i].label, `up:${grid[i].command}`);
        if ((i + 1) % 3 === 0) upKeyboard.row();
      }
      if (grid.length % 3 !== 0) upKeyboard.row();

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

    if (data.startsWith('topic_create:')) {
      const projectName = data.replace('topic_create:', '');
      const isGeral = projectName === '__geral__';
      const topicName = isGeral ? 'Geral' : projectName;

      try {
        const topic = await ctx.api.createForumTopic(chatId, topicName);
        const projectDir = isGeral ? null : join(config.workingDir, projectName);

        stateStore.createTopic({
          threadId: topic.message_thread_id,
          chatId,
          name: topicName,
          projectDir,
          sessionId: null,
        });

        await ctx.api.sendMessage(chatId, `Tópico pronto.${projectDir ? `\nProjeto: <code>${projectName}</code>` : ''}\n\nMande uma mensagem aqui para iniciar a sessão.`, {
          parse_mode: 'HTML',
          message_thread_id: topic.message_thread_id,
        });
      } catch (err) {
        await ctx.reply(`Erro: ${err instanceof Error ? err.message : String(err)}`, {
          ...(topicId ? { message_thread_id: topicId } : {}),
        });
      }
      return;
    }

    if (data.startsWith('topic_link:')) {
      const projectName = data.replace('topic_link:', '');
      const isNone = projectName === '__none__';

      if (!topicId) {
        await ctx.reply('Use dentro de um tópico.');
        return;
      }

      // Find or create topic record
      let topicRecord = stateStore.getTopicByChatAndThread(chatId, topicId);
      if (!topicRecord) {
        const id = stateStore.createTopic({
          threadId: topicId,
          chatId,
          name: projectName === '__none__' ? 'Geral' : projectName,
          projectDir: isNone ? null : join(config.workingDir, projectName),
          sessionId: null,
        });
        topicRecord = stateStore.getTopic(id);
      } else {
        // Update existing topic
        stateStore.updateTopicName(topicRecord.id, isNone ? topicRecord.name : projectName);
        // Update project dir on session too
        const session = sessionManager.getSession(chatId, topicId);
        if (session) {
          stateStore.updateSession(session.id, {
            projectDir: isNone ? null : join(config.workingDir, projectName),
          });
        }
      }

      await ctx.reply(
        isNone
          ? 'Tópico desvinculado de projeto.'
          : `Tópico vinculado a <b>${projectName}</b>.\nClaude vai usar <code>--cwd</code> deste projeto.`,
        {
          parse_mode: 'HTML',
          message_thread_id: topicId,
        },
      );
      return;
    }

    if (data.startsWith('session_resume:')) {
      const sessionId = data.replace('session_resume:', '');
      const source = sessionManager.listSessions().find(s => s.id === sessionId);
      if (source && source.claudeSessionId) {
        // Remove the claude session ID from the source topic (prevent two topics sharing same session)
        sessionManager.updateClaudeSessionId(source.id, '');

        // Set the current topic's session to use the source's Claude session ID
        const currentSession = await sessionManager.getOrCreateSession(chatId, topicId);
        sessionManager.updateClaudeSessionId(
          `${chatId}:${topicId ?? 0}`,
          source.claudeSessionId,
        );
        if (source.projectDir) {
          stateStore.updateSession(currentSession.id, { projectDir: source.projectDir });
        }
        const project = source.projectDir ? source.projectDir.split('/').pop() : 'geral';
        await ctx.reply(
          `Sessão <b>${project}</b> movida para este tópico.\n`
          + `<code>--resume ${source.claudeSessionId.substring(0, 8)}...</code>\n\n`
          + `O tópico anterior ficou sem sessão (use /new lá para criar uma nova).`,
          {
            parse_mode: 'HTML',
            ...(topicId ? { message_thread_id: topicId } : {}),
          },
        );
      } else {
        await ctx.reply('Sessão não encontrada ou sem Claude session ID.', {
          ...(topicId ? { message_thread_id: topicId } : {}),
        });
      }
      return;
    }

    if (data.startsWith('session_close:')) {
      const sessionId = data.replace('session_close:', '');
      const session = sessionManager.listSessions().find(s => s.id === sessionId);
      if (session) {
        sessionManager.deleteSession(session.topicId, null);
        stateStore.deleteTopic(session.topicId);
        await ctx.reply(`Sessão fechada.`, {
          ...(topicId ? { message_thread_id: topicId } : {}),
        });
      }
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
