---
phase: 12-voice-harness-config
plan: 12-01
type: fix
autonomous: true
wave: 1
depends_on: []
requirements: [PKG-B3]
must_haves:
  truths:
    - "VoiceHandler uses only the provider specified in config.voiceProvider"
    - "If voiceProvider is 'none', transcribe() throws immediately even if API keys are present"
    - "If voiceProvider is 'groq', only Groq provider is used (no OpenAI fallback)"
    - "If voiceProvider is undefined (legacy configs), current behavior preserved (try all available keys)"
  artifacts:
    - path: "packages/core/src/voice-handler.ts"
      provides: "Config-aware VoiceHandler with getConfig() integration"
  key_links:
    - from: "voice-handler.ts"
      to: "config.ts"
      via: "import { getConfig } from './config'"
---

# Fase 12 Plano 01: VoiceHandler Respects voiceProvider Config

**Objetivo:** Fazer o VoiceHandler respeitar o campo `voiceProvider` do `forgeclaw.config.json` ao invés de simplesmente usar qualquer API key encontrada no environment. Isso corrige o blocker PKG-B3 onde `voiceProvider: 'none'` nao desabilita voz e `voiceProvider: 'groq'` pode cair para OpenAI.

## Contexto

@packages/core/src/voice-handler.ts -- VoiceHandler atual, stateless, ignora config
@packages/core/src/config.ts -- getConfig() retorna ForgeClawConfig com campo voiceProvider
@packages/core/src/types.ts -- ForgeClawConfig.voiceProvider: 'groq' | 'openai' | 'none' | undefined
@packages/bot/src/handlers/voice.ts -- Bot voice handler que chama voiceHandler.transcribe()

## Tarefas

<task id="1" type="auto">
<files>packages/core/src/voice-handler.ts</files>
<action>
Reescrever `voice-handler.ts` para respeitar o campo `voiceProvider` do config.

**Mudancas exatas:**

1. Adicionar import no topo:
```typescript
import { getConfig } from './config';
```

2. Modificar a funcao `getProviders()` para aceitar um parametro `voiceProvider`:
```typescript
function getProviders(voiceProvider?: 'groq' | 'openai' | 'none'): STTProvider[] {
  // Se voiceProvider === 'none', retornar array vazio imediatamente
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
```

Logica:
- `voiceProvider === 'none'` -> retorna [] (voz desabilitada)
- `voiceProvider === 'groq'` -> so inclui Groq (se key existir)
- `voiceProvider === 'openai'` -> so inclui OpenAI (se key existir)
- `voiceProvider === undefined` (legacy) -> inclui todos que tiverem key (backward compatible)

3. Modificar o metodo `transcribe()` da classe VoiceHandler para carregar o config:
```typescript
async transcribe(audioPath: string): Promise<string> {
  const config = await getConfig();
  const providers = getProviders(config.voiceProvider);

  if (providers.length === 0) {
    if (config.voiceProvider === 'none') {
      throw new Error('Voice transcription is disabled (voiceProvider: none).');
    }
    throw new Error(
      `No STT provider configured. voiceProvider is '${config.voiceProvider ?? 'auto'}' but no matching API key found in environment. ` +
      `Set ${config.voiceProvider === 'groq' ? 'GROQ_API_KEY' : config.voiceProvider === 'openai' ? 'OPENAI_API_KEY' : 'GROQ_API_KEY or OPENAI_API_KEY'} in ~/.forgeclaw/.env`
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
```

4. Manter TUDO mais intacto: `SUPPORTED_FORMATS`, `STTProvider` interface, `normalizeFileName()`, `callSTT()`, e o export `voiceHandler` singleton.

**NAO fazer:**
- NAO mudar a assinatura de `callSTT()` -- ela continua pura
- NAO adicionar parametro config ao construtor da classe -- usar `getConfig()` no metodo (config pode mudar em runtime via hot reload)
- NAO remover o fallback entre providers quando voiceProvider e undefined (backward compat)
</action>
<verify>
<automated>cd /home/projects/ForgeClaw && bun build packages/core/src/voice-handler.ts --no-bundle 2>&1 | head -20</automated>
</verify>
<done>
- `voiceProvider: 'none'` faz `transcribe()` lancar erro imediato "Voice transcription is disabled"
- `voiceProvider: 'groq'` usa apenas Groq, sem fallback para OpenAI
- `voiceProvider: 'openai'` usa apenas OpenAI, sem fallback para Groq
- `voiceProvider: undefined` (legacy) mantém comportamento anterior (tenta todos com keys)
- Mensagem de erro especifica qual key esta faltando baseado no voiceProvider configurado
</done>
</task>

<task id="2" type="auto">
<files>packages/bot/src/handlers/voice.ts</files>
<action>
Adicionar tratamento especifico para o caso `voiceProvider: 'none'` no voice handler do bot. Quando o usuario envia audio mas voz esta desabilitada, responder com mensagem clara ao inves de mostrar "Transcrevendo..." e depois falhar.

**Mudancas exatas:**

1. Adicionar import de `getConfig`:
```typescript
import { fileHandler, voiceHandler, getConfig } from '@forgeclaw/core';
```

2. No inicio do handler (antes do download do file), adicionar check:
```typescript
// Check if voice is disabled before downloading
const currentConfig = await getConfig();
if (currentConfig.voiceProvider === 'none') {
  await ctx.reply('Transcricao de voz esta desabilitada. Altere voiceProvider no config para ativar.', {
    ...(topicId ? { message_thread_id: topicId } : {}),
  });
  return;
}
```

Esse check fica ANTES do `fileHandler.downloadTelegramFile()` para evitar download desnecessario.

3. O restante do handler permanece identico. O try/catch existente ja captura o erro de "Voice transcription is disabled" caso o config mude entre o check e a chamada, entao e defense-in-depth.
</action>
<verify>
<automated>cd /home/projects/ForgeClaw && bun build packages/bot/src/handlers/voice.ts --no-bundle 2>&1 | head -20</automated>
</verify>
<done>
- Quando voiceProvider e 'none', usuario recebe mensagem informativa sem download/processamento
- Quando voiceProvider e 'groq' ou 'openai', fluxo continua normalmente
- Nenhum download desnecessario quando voz esta desabilitada
</done>
</task>

<task id="3" type="auto">
<files>packages/core/src/voice-handler.test.ts</files>
<action>
Criar teste unitario para validar o comportamento do VoiceHandler com diferentes valores de voiceProvider.

```typescript
import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';

// Mock getConfig before importing voice-handler
const mockConfig = {
  botToken: 'test',
  allowedUsers: [1],
  workingDir: '/tmp',
  voiceProvider: undefined as 'groq' | 'openai' | 'none' | undefined,
};

// We need to mock the config module
mock.module('./config', () => ({
  getConfig: async () => mockConfig,
  loadConfig: async () => mockConfig,
  reloadConfig: async () => mockConfig,
  watchConfig: () => {},
  stopWatchingConfig: () => {},
}));

// Now import the module under test
const { voiceHandler } = await import('./voice-handler');

describe('VoiceHandler', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore env
    process.env.GROQ_API_KEY = originalEnv.GROQ_API_KEY;
    process.env.OPENAI_API_KEY = originalEnv.OPENAI_API_KEY;
  });

  it('throws when voiceProvider is none even with keys present', async () => {
    mockConfig.voiceProvider = 'none';
    process.env.GROQ_API_KEY = 'gsk_test';
    process.env.OPENAI_API_KEY = 'sk-test';

    await expect(voiceHandler.transcribe('/tmp/test.ogg')).rejects.toThrow(
      'Voice transcription is disabled'
    );
  });

  it('throws when voiceProvider is groq but no GROQ_API_KEY', async () => {
    mockConfig.voiceProvider = 'groq';
    delete process.env.GROQ_API_KEY;
    delete process.env.OPENAI_API_KEY;

    await expect(voiceHandler.transcribe('/tmp/test.ogg')).rejects.toThrow(
      'GROQ_API_KEY'
    );
  });

  it('throws when voiceProvider is openai but no OPENAI_API_KEY', async () => {
    mockConfig.voiceProvider = 'openai';
    delete process.env.GROQ_API_KEY;
    delete process.env.OPENAI_API_KEY;

    await expect(voiceHandler.transcribe('/tmp/test.ogg')).rejects.toThrow(
      'OPENAI_API_KEY'
    );
  });

  it('throws generic message when voiceProvider is undefined and no keys', async () => {
    mockConfig.voiceProvider = undefined;
    delete process.env.GROQ_API_KEY;
    delete process.env.OPENAI_API_KEY;

    await expect(voiceHandler.transcribe('/tmp/test.ogg')).rejects.toThrow(
      'GROQ_API_KEY or OPENAI_API_KEY'
    );
  });
});
```

**Notas:**
- Testes nao fazem chamadas reais a APIs -- todos testam apenas a logica de selecao de provider
- O mock de `getConfig` permite controlar o voiceProvider por teste
- Limpar env vars no afterEach para evitar leak entre testes
</action>
<verify>
<automated>cd /home/projects/ForgeClaw && bun test packages/core/src/voice-handler.test.ts 2>&1 | tail -20</automated>
</verify>
<done>
- 4 testes passando: none bloqueia, groq sem key falha com mensagem especifica, openai sem key falha com mensagem especifica, undefined sem keys falha com mensagem generica
</done>
</task>

## Criterios de Sucesso

- [ ] VoiceHandler le voiceProvider do config via getConfig()
- [ ] voiceProvider='none' desabilita voz completamente (erro imediato, sem download)
- [ ] voiceProvider='groq' usa apenas Groq, sem fallback
- [ ] voiceProvider='openai' usa apenas OpenAI, sem fallback
- [ ] voiceProvider=undefined preserva comportamento legacy (tenta todos)
- [ ] Mensagens de erro indicam qual key esta faltando
- [ ] Bot voice handler faz early-return com mensagem amigavel quando voz desabilitada
- [ ] Testes unitarios validam todos os cenarios
