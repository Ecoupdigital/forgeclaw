import type { Context } from 'grammy';
import { fileHandler } from '@forgeclaw/core';
import type { ForgeClawConfig } from '@forgeclaw/core';
import { createTextHandler } from './text';

export function createPhotoHandler(config: ForgeClawConfig) {
  const textHandler = createTextHandler(config);

  return async (ctx: Context): Promise<void> => {
    const photos = ctx.message?.photo;
    if (!photos || photos.length === 0) return;

    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const topicId = ctx.message?.message_thread_id ?? null;
    const caption = ctx.message?.caption;
    let filePath: string | null = null;

    try {
      // 1. Get highest resolution photo (last in array)
      const bestPhoto = photos[photos.length - 1];

      // 2. Download
      filePath = await fileHandler.downloadTelegramFile(ctx.api, bestPhoto.file_id);

      // 3. Build prompt
      const prompt = `[Foto: ${filePath}]\n${caption ?? 'Analise esta imagem'}`;

      // 4. Send to Claude via text handler
      if (ctx.message) {
        (ctx.message as any).text = prompt;
      }
      await textHandler(ctx);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[photo-handler] Error:', err);
      await ctx.reply(`Erro ao processar foto: ${errorMsg}`, {
        ...(topicId ? { message_thread_id: topicId } : {}),
      });
    } finally {
      if (filePath) {
        await fileHandler.cleanup(filePath);
      }
    }
  };
}
