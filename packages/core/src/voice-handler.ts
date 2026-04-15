import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { getConfig } from './config';

const SUPPORTED_FORMATS = new Set(['.ogg', '.mp3', '.m4a', '.wav', '.webm', '.oga']);

interface STTProvider {
  name: string;
  url: string;
  model: string;
  apiKey: string;
}

function getProviders(voiceProvider?: 'groq' | 'openai' | 'none'): STTProvider[] {
  if (voiceProvider === 'none') {
    return [];
  }

  const providers: STTProvider[] = [];

  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey && (!voiceProvider || voiceProvider === 'groq')) {
    providers.push({
      name: 'groq',
      url: 'https://api.groq.com/openai/v1/audio/transcriptions',
      model: 'whisper-large-v3-turbo',
      apiKey: groqKey,
    });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey && (!voiceProvider || voiceProvider === 'openai')) {
    providers.push({
      name: 'openai',
      url: 'https://api.openai.com/v1/audio/transcriptions',
      model: 'whisper-1',
      apiKey: openaiKey,
    });
  }

  return providers;
}

/** Telegram sends .oga files — normalize to .ogg so providers accept them. */
function normalizeFileName(name: string): string {
  return name.replace(/\.oga$/, '.ogg');
}

async function callSTT(provider: STTProvider, audioPath: string): Promise<string> {
  const fileBuffer = await readFile(audioPath);
  const fileName = normalizeFileName(basename(audioPath));

  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer]), fileName);
  formData.append('model', provider.model);
  formData.append('language', 'pt');

  const response = await fetch(provider.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${provider.apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`${provider.name} STT error (${response.status}): ${errorBody}`);
  }

  const result = (await response.json()) as { text: string };
  return result.text;
}

class VoiceHandler {
  /**
   * Transcribe audio using Groq (primary) with OpenAI Whisper fallback.
   * Provider order: GROQ_API_KEY present → try Groq first, then OpenAI.
   * If only one key exists, uses that provider with no fallback.
   */
  async transcribe(audioPath: string): Promise<string> {
    const config = await getConfig();
    const providers = getProviders(config.voiceProvider);

    if (providers.length === 0) {
      if (config.voiceProvider === 'none') {
        throw new Error('Voice transcription is disabled (voiceProvider: none).');
      }
      throw new Error(
        `No STT provider configured. voiceProvider is '${config.voiceProvider ?? 'auto'}' but no matching API key found in environment. ` +
        `Set ${config.voiceProvider === 'groq' ? 'GROQ_API_KEY' : config.voiceProvider === 'openai' ? 'OPENAI_API_KEY' : 'GROQ_API_KEY or OPENAI_API_KEY'} in ~/.forgeclaw/.env`,
      );
    }

    let lastError: Error | null = null;

    for (const provider of providers) {
      try {
        const text = await callSTT(provider, audioPath);
        console.log(`[voice] transcribed via ${provider.name} (${provider.model})`);
        return text;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(
          `[voice] ${provider.name} failed, ${providers.indexOf(provider) < providers.length - 1 ? 'trying fallback...' : 'no more providers'}`,
          lastError.message,
        );
      }
    }

    throw lastError!;
  }
}

export const voiceHandler = new VoiceHandler();
