import type { Context } from 'grammy';
import { sessionManager, stateStore } from '@forgeclaw/core';
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

    sessions: async (ctx: Context): Promise<void> => {
      const topicId = ctx.message?.message_thread_id ?? null;
      const sessions = sessionManager.listSessions();

      if (sessions.length === 0) {
        await ctx.reply('Nenhuma sessão ativa.', {
          ...(topicId ? { message_thread_id: topicId } : {}),
        });
        return;
      }

      const lines = sessions.map((s, i) => {
        const project = s.projectDir ? s.projectDir.split('/').pop() : 'geral';
        const ctx_pct = s.contextUsage ? `${Math.round(s.contextUsage)}%` : '—';
        const resumed = s.claudeSessionId ? '●' : '○';
        return `${resumed} <b>${project}</b> — context: ${ctx_pct}`;
      });

      await ctx.reply(
        `<b>Sessões Ativas (${sessions.length})</b>\n\n${lines.join('\n')}`,
        {
          parse_mode: 'HTML',
          ...(topicId ? { message_thread_id: topicId } : {}),
        },
      );
    },

    topicCreate: async (ctx: Context): Promise<void> => {
      const chatId = ctx.chat?.id;
      if (!chatId) return;
      const topicId = ctx.message?.message_thread_id ?? null;
      const args = (ctx.message?.text ?? '').replace(/^\/topic_create\s*/, '').trim();

      if (!args) {
        // List projects as buttons to create topic for
        let projects: string[] = [];
        try {
          const entries = readdirSync(config.workingDir);
          projects = entries.filter((entry) => {
            try { return statSync(join(config.workingDir, entry)).isDirectory(); } catch { return false; }
          });
        } catch { /* ignore */ }

        const keyboard = new InlineKeyboard();
        keyboard.text('Geral (sem projeto)', 'topic_create:__geral__').row();
        for (const project of projects.slice(0, 15)) {
          keyboard.text(project, `topic_create:${project}`).row();
        }

        await ctx.reply('<b>Criar tópico para qual projeto?</b>', {
          parse_mode: 'HTML',
          reply_markup: keyboard,
          ...(topicId ? { message_thread_id: topicId } : {}),
        });
        return;
      }

      // Create topic directly with given name
      try {
        const topic = await ctx.api.createForumTopic(chatId, args);
        const projectDir = join(config.workingDir, args);
        const hasProject = (() => { try { return statSync(projectDir).isDirectory(); } catch { return false; } })();

        stateStore.createTopic({
          threadId: topic.message_thread_id,
          chatId,
          name: args,
          projectDir: hasProject ? projectDir : null,
          sessionId: null,
        });

        await ctx.api.sendMessage(chatId, `Tópico criado e vinculado.${hasProject ? `\nProjeto: <code>${args}</code>` : ''}`, {
          parse_mode: 'HTML',
          message_thread_id: topic.message_thread_id,
        });
      } catch (err) {
        await ctx.reply(`Erro ao criar tópico: ${err instanceof Error ? err.message : String(err)}`, {
          ...(topicId ? { message_thread_id: topicId } : {}),
        });
      }
    },

    topicRename: async (ctx: Context): Promise<void> => {
      const chatId = ctx.chat?.id;
      if (!chatId) return;
      const topicId = ctx.message?.message_thread_id ?? null;

      if (!topicId) {
        await ctx.reply('Use dentro de um tópico.');
        return;
      }

      const newName = (ctx.message?.text ?? '').replace(/^\/topic_rename\s*/, '').trim();
      if (!newName) {
        await ctx.reply('Uso: /topic_rename novo nome', { message_thread_id: topicId });
        return;
      }

      try {
        await ctx.api.editForumTopic(chatId, topicId, { name: newName });
        const topicRecord = stateStore.getTopicByChatAndThread(chatId, topicId);
        if (topicRecord) {
          stateStore.updateTopicName(topicRecord.id, newName);
        }
        await ctx.reply(`Tópico renomeado para <b>${newName}</b>`, {
          parse_mode: 'HTML',
          message_thread_id: topicId,
        });
      } catch (err) {
        await ctx.reply(`Erro: ${err instanceof Error ? err.message : String(err)}`, {
          message_thread_id: topicId,
        });
      }
    },

    topicLink: async (ctx: Context): Promise<void> => {
      const chatId = ctx.chat?.id;
      if (!chatId) return;
      const topicId = ctx.message?.message_thread_id ?? null;

      if (!topicId) {
        await ctx.reply('Use este comando dentro de um tópico para vinculá-lo a um projeto.');
        return;
      }

      // List projects to link
      let projects: string[] = [];
      try {
        const entries = readdirSync(config.workingDir);
        projects = entries.filter((entry) => {
          try { return statSync(join(config.workingDir, entry)).isDirectory(); } catch { return false; }
        });
      } catch { /* ignore */ }

      const keyboard = new InlineKeyboard();
      keyboard.text('Sem projeto (geral)', 'topic_link:__none__').row();
      for (const project of projects.slice(0, 15)) {
        keyboard.text(project, `topic_link:${project}`).row();
      }

      await ctx.reply('<b>Vincular este tópico a qual projeto?</b>', {
        parse_mode: 'HTML',
        reply_markup: keyboard,
        message_thread_id: topicId,
      });
    },

    sessionsResume: async (ctx: Context): Promise<void> => {
      const chatId = ctx.chat?.id;
      if (!chatId) return;
      const topicId = ctx.message?.message_thread_id ?? null;
      const sessions = sessionManager.listSessions();

      if (sessions.length === 0) {
        await ctx.reply('Nenhuma sessão salva.', {
          ...(topicId ? { message_thread_id: topicId } : {}),
        });
        return;
      }

      const keyboard = new InlineKeyboard();
      for (const s of sessions) {
        const project = s.projectDir ? s.projectDir.split('/').pop() : 'geral';
        const ctxPct = s.contextUsage ? ` (${Math.round(s.contextUsage)}%)` : '';
        const label = `${project}${ctxPct}`;
        keyboard.text(label, `session_resume:${s.id}`).row();
      }

      await ctx.reply('<b>Selecione a sessão para retomar neste tópico:</b>', {
        parse_mode: 'HTML',
        reply_markup: keyboard,
        ...(topicId ? { message_thread_id: topicId } : {}),
      });
    },

    sessionsClose: async (ctx: Context): Promise<void> => {
      const chatId = ctx.chat?.id;
      if (!chatId) return;
      const topicId = ctx.message?.message_thread_id ?? null;
      const sessions = sessionManager.listSessions();

      if (sessions.length === 0) {
        await ctx.reply('Nenhuma sessão ativa.', {
          ...(topicId ? { message_thread_id: topicId } : {}),
        });
        return;
      }

      const keyboard = new InlineKeyboard();
      for (const s of sessions) {
        const project = s.projectDir ? s.projectDir.split('/').pop() : 'geral';
        keyboard.text(`Fechar: ${project}`, `session_close:${s.id}`).row();
      }

      await ctx.reply('<b>Selecione a sessão para fechar:</b>', {
        parse_mode: 'HTML',
        reply_markup: keyboard,
        ...(topicId ? { message_thread_id: topicId } : {}),
      });
    },

    sessionsRename: async (ctx: Context): Promise<void> => {
      const topicId = ctx.message?.message_thread_id ?? null;
      const args = (ctx.message?.text ?? '').replace(/^\/sessions_rename\s*/, '').trim();

      if (!args) {
        await ctx.reply('Uso: /sessions_rename novo nome\n\nRenomeia a sessão do tópico atual.', {
          ...(topicId ? { message_thread_id: topicId } : {}),
        });
        return;
      }

      const chatId = ctx.chat?.id;
      if (!chatId) return;

      const session = sessionManager.getSession(chatId, topicId);
      if (!session) {
        await ctx.reply('Nenhuma sessão neste tópico.', {
          ...(topicId ? { message_thread_id: topicId } : {}),
        });
        return;
      }

      // Update the topic name in stateStore
      const { stateStore } = await import('@forgeclaw/core');
      stateStore.updateTopicName(session.topicId, args);

      await ctx.reply(`Sessão renomeada para: <b>${args}</b>`, {
        parse_mode: 'HTML',
        ...(topicId ? { message_thread_id: topicId } : {}),
      });
    },

    up: async (ctx: Context): Promise<void> => {
      const topicId = ctx.message?.message_thread_id ?? null;
      const { upDetector } = await import('@forgeclaw/core');
      const grid = upDetector.getUPCommandsGrid();
      const keyboard = new InlineKeyboard();
      for (let i = 0; i < grid.length; i++) {
        keyboard.text(grid[i].label, `up:${grid[i].command}`);
        if ((i + 1) % 3 === 0) keyboard.row();
      }

      await ctx.reply('<b>UP Commands</b>', {
        parse_mode: 'HTML',
        reply_markup: keyboard,
        ...(topicId ? { message_thread_id: topicId } : {}),
      });
    },
  };

  // UP shortcut commands — each sends the real /up:* command as text to Claude
  const upCommands: Record<string, string> = {
    up_progresso: '/up:progresso',
    up_planejar: '/up:planejar-fase',
    up_executar: '/up:executar-fase',
    up_verificar: '/up:verificar-trabalho',
    up_rapido: '/up:rapido',
    up_depurar: '/up:depurar',
    up_retomar: '/up:retomar',
    up_pausar: '/up:pausar',
  };

  return { ...commands, upCommands };
}
