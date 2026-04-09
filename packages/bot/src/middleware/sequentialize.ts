import type { Context } from 'grammy';

/**
 * Returns a session key for sequentializing updates.
 * Groups by chat ID and topic thread ID.
 * Messages starting with "!" bypass sequentialize (interrupt) by returning undefined.
 */
export function getSessionKey(ctx: Context): string | undefined {
  const text = ctx.message?.text ?? ctx.callbackQuery?.data ?? '';

  // Interrupt messages bypass sequentialize
  if (text.startsWith('!')) {
    return undefined;
  }

  const chatId = ctx.chat?.id;
  if (!chatId) return undefined;

  const threadId = ctx.message?.message_thread_id ?? 0;
  return `${chatId}:${threadId}`;
}
