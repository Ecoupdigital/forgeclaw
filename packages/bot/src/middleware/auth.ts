import type { Context, NextFunction } from 'grammy';
import type { ForgeClawConfig } from '@forgeclaw/core';

/**
 * Creates an auth middleware that checks if the user is in the allowedUsers whitelist.
 */
export function createAuthMiddleware(config: ForgeClawConfig) {
  return async (ctx: Context, next: NextFunction): Promise<void> => {
    const userId = ctx.from?.id;
    const chatType = ctx.chat?.type;
    const chatId = ctx.chat?.id;

    // Allow if user is in whitelist
    if (userId && config.allowedUsers.includes(userId)) {
      return next();
    }

    // Allow if message is in an allowed group
    if (chatId && (chatType === 'group' || chatType === 'supergroup')) {
      const allowedGroups = config.allowedGroups ?? [];
      if (allowedGroups.includes(chatId)) {
        return next();
      }
    }

    console.warn(`[auth] Unauthorized: user ${userId ?? 'unknown'} in chat ${chatId}`);
    // Don't reply "Unauthorized" in groups — just ignore silently
    if (chatType === 'private') {
      await ctx.reply('Unauthorized');
    }
    return;
  };
}
