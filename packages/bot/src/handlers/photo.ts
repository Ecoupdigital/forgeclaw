import type { Context } from 'grammy';
import { fileHandler, sessionManager } from '@forgeclaw/core';
import type { ForgeClawConfig } from '@forgeclaw/core';
import { createTextHandler } from './text';
import { copyFile, mkdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { tmpdir } from 'node:os';

export function createPhotoHandler(config: ForgeClawConfig) {
  const textHandler = createTextHandler(config);

  return async (ctx: Context): Promise<void> => {
    const photos = ctx.message?.photo;
    if (!photos || photos.length === 0) return;

    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const topicId = ctx.message?.message_thread_id ?? null;
    const caption = ctx.message?.caption;
    let tmpPath: string | null = null;
    let localPath: string | null = null;

    try {
      // 0. Opportunistic cleanup: remove stale files (>1h) from previous photo processing
      const tmpForgeDir = join(tmpdir(), 'forgeclaw');
      fileHandler.cleanupStaleFiles([tmpForgeDir]).catch(() => {});

      // 1. Get highest resolution photo (last in array)
      const bestPhoto = photos[photos.length - 1];

      // 2. Download to /tmp
      tmpPath = await fileHandler.downloadTelegramFile(ctx.api, bestPhoto.file_id);

      // 3. Resolve projectDir for session
      const session = await sessionManager.getOrCreateSession(chatId, topicId);
      const projectDir = session.projectDir ?? config.workingDir;

      // 4. Copy to projectDir/.forgeclaw-uploads/
      const uploadsDir = join(projectDir, '.forgeclaw-uploads');
      await mkdir(uploadsDir, { recursive: true });
      // Opportunistic cleanup of stale uploads (>1h)
      fileHandler.cleanupStaleFiles([uploadsDir]).catch(() => {});
      const fileName = basename(tmpPath);
      localPath = join(uploadsDir, fileName);
      await copyFile(tmpPath, localPath);

      // 5. Build prompt with relative path (Claude CLI runs with cwd=projectDir)
      const relativePath = `.forgeclaw-uploads/${fileName}`;
      const prompt = `[Foto: ${relativePath}]\n${caption ?? 'Analise esta imagem. Use a ferramenta Read para ler o arquivo de imagem.'}`;

      // 6. Send to Claude via text handler
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
    }
  };
}
