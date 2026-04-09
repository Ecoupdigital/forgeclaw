import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

const WHISPER_API_URL = 'https://api.openai.com/v1/audio/transcriptions';
const SUPPORTED_FORMATS = new Set(['.ogg', '.mp3', '.m4a', '.wav', '.webm', '.oga']);

class VoiceHandler {
  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.OPENAI_API_KEY ?? null;
  }

  /**
   * Transcribe an audio file using OpenAI Whisper API.
   * Uses native fetch() - no OpenAI SDK dependency.
   */
  async transcribe(audioPath: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error(
        'OpenAI API key not configured. Set OPENAI_API_KEY environment variable or add openaiApiKey to config.',
      );
    }

    const fileBuffer = await readFile(audioPath);
    const fileName = basename(audioPath);

    // Build multipart form data with native FormData
    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer]), fileName);
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');

    const response = await fetch(WHISPER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Whisper API error (${response.status}): ${errorBody}`);
    }

    const result = (await response.json()) as { text: string };
    return result.text;
  }
}

export const voiceHandler = new VoiceHandler();
