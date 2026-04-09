import type { Context, NextFunction } from 'grammy';
import type { ForgeClawConfig } from '@forgeclaw/core';

/**
 * Creates an auth middleware that checks if the user is in the allowedUsers whitelist.
 */
export function createAuthMiddleware(config: ForgeClawConfig) {
  return async (ctx: Context, next: NextFunction): Promise<void> => {
    const userId = ctx.from?.id;

    if (!userId || !config.allowedUsers.includes(userId)) {
      console.warn(`[auth] Unauthorized access attempt from user ${userId ?? 'unknown'}`);
      await ctx.reply('Unauthorized');
      return;
    }

    await next();
  };
}
