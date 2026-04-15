import type { Context } from 'grammy';
import { fileHandler, sessionManager } from '@forgeclaw/core';
import type { ForgeClawConfig } from '@forgeclaw/core';
import { createTextHandler } from './text';
import { copyFile, mkdir, unlink } from 'node:fs/promises';
import { join, basename } from 'node:path';

export function createDocumentHandler(config: ForgeClawConfig) {
  const textHandler = createTextHandler(config);

  return async (ctx: Context): Promise<void> => {
    const doc = ctx.message?.document;
    if (!doc) return;

    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const topicId = ctx.message?.message_thread_id ?? null;
    const caption = ctx.message?.caption;
    const fileName = doc.file_name ?? 'unknown';
    let filePath: string | null = null;
    let localPath: string | null = null;

    try {
      // 1. Download file
      filePath = await fileHandler.downloadTelegramFile(ctx.api, doc.file_id);

      // 2. Extract content
      const mimeType = doc.mime_type ?? 'application/octet-stream';
      const extracted = await fileHandler.extractContent(filePath, mimeType);

      // 3. Build prompt based on content type
      let prompt: string;

      if (extracted.type === 'text') {
        prompt = `[Arquivo: ${fileName}]\n\n${extracted.content}\n\n${caption ?? 'Analise este arquivo'}`;
      } else if (extracted.type === 'image') {
        // Copy image to projectDir so Claude CLI can read it
        const session = await sessionManager.getOrCreateSession(chatId, topicId);
        const projectDir = session.projectDir ?? config.workingDir;
        const uploadsDir = join(projectDir, '.forgeclaw-uploads');
        await mkdir(uploadsDir, { recursive: true });
        const imgFileName = basename(extracted.content);
        localPath = join(uploadsDir, imgFileName);
        await copyFile(extracted.content, localPath);
        const relativePath = `.forgeclaw-uploads/${imgFileName}`;
        prompt = `[Imagem: ${relativePath}]\n${caption ?? 'Leia esta imagem com Read tool.'}`;
      } else {
        prompt = `[Arquivo em ${extracted.content}]\n${caption ?? 'Analise este arquivo.'}`;
      }

      // 4. Send to Claude via text handler
      if (ctx.message) {
        (ctx.message as any).text = prompt;
      }
      await textHandler(ctx);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[document-handler] Error:', err);
      await ctx.reply(`Erro ao processar documento: ${errorMsg}`, {
        ...(topicId ? { message_thread_id: topicId } : {}),
      });
    } finally {
      if (filePath) {
        await fileHandler.cleanup(filePath);
      }
      if (localPath) {
        try { await unlink(localPath); } catch { /* ignore */ }
      }
    }
  };
}
