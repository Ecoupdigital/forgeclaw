import type { Context } from 'grammy';
import { fileHandler, voiceHandler } from '@forgeclaw/core';
import type { ForgeClawConfig } from '@forgeclaw/core';
import { createTextHandler } from './text';

export function createVoiceHandler(config: ForgeClawConfig) {
  const textHandler = createTextHandler(config);

  return async (ctx: Context): Promise<void> => {
    const voice = ctx.message?.voice ?? ctx.message?.audio;
    if (!voice) return;

    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const topicId = ctx.message?.message_thread_id ?? null;
    let filePath: string | null = null;

    try {
      // 1. Download voice file
      filePath = await fileHandler.downloadTelegramFile(ctx.api, voice.file_id);

      // 2. Notify user
      await ctx.reply('\uD83C\uDFA4 Transcrevendo...', {
        ...(topicId ? { message_thread_id: topicId } : {}),
      });

      // 3. Transcribe
      const transcription = await voiceHandler.transcribe(filePath);

      // 4. Show transcription to user
      await ctx.reply(`\uD83D\uDCDD Transcricao: ${transcription}`, {
        ...(topicId ? { message_thread_id: topicId } : {}),
      });

      // 5. Send transcribed text to Claude by faking a text message on ctx
      // We override the message text so the text handler processes it
      if (ctx.message) {
        (ctx.message as any).text = transcription;
      }
      await textHandler(ctx);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[voice-handler] Error:', err);
      await ctx.reply(`Erro ao processar audio: ${errorMsg}`, {
        ...(topicId ? { message_thread_id: topicId } : {}),
      });
    } finally {
      // 6. Cleanup
      if (filePath) {
        await fileHandler.cleanup(filePath);
      }
    }
  };
}
