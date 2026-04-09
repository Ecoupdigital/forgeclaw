# @forgeclaw/core

Biblioteca compartilhada do ForgeClaw. Contem toda a logica de negocio: execucao do Claude CLI, gerenciamento de sessoes, persistencia, crons, memoria e contexto.

## Modulos

### ClaudeRunner

Executa o Claude Code CLI como processo filho com streaming JSON.

```typescript
import { ClaudeRunner } from '@forgeclaw/core';

const runner = new ClaudeRunner();

for await (const event of runner.run('Explique este codigo', {
  cwd: '/home/user/project',
  sessionId: 'abc-123',         // Resume sessao existente
  model: 'opus',
  allowedTools: ['Read', 'Glob'],
  systemPrompt: 'Responda em portugues',
})) {
  switch (event.type) {
    case 'thinking':
      console.log('Pensando:', event.data.text);
      break;
    case 'text':
      process.stdout.write(event.data.text as string);
      break;
    case 'tool_use':
      console.log('Usando ferramenta:', event.data.name);
      break;
    case 'done':
      console.log('Session ID:', event.data.sessionId);
      console.log('Tokens:', event.data.usage);
      break;
  }
}

// Abortar execucao
runner.abort(); // SIGTERM, depois SIGKILL apos 5s
```

Retry automatico: ate 3 tentativas com backoff exponencial (1s, 2s, 3s).

### SessionManager

Gerencia sessoes por chat/topico com locking.

```typescript
import { sessionManager } from '@forgeclaw/core';

// Obter ou criar sessao (thread-safe com lock por key)
const session = await sessionManager.getOrCreateSession(chatId, topicId, '/path/to/project');

// Atualizar session ID do Claude
await sessionManager.updateClaudeSessionId(chatId, topicId, 'claude-session-uuid');

// Atualizar uso de contexto (percentual)
await sessionManager.updateContextUsage(chatId, topicId, 45);

// Listar todas as sessoes
const sessions = sessionManager.listSessions();

// Deletar sessao
await sessionManager.deleteSession(chatId, topicId);
```

Key format: `chatId:topicId` (ex: `123456:789`).

### StateStore

Camada de persistencia SQLite (bun:sqlite) com WAL mode.

```typescript
import { stateStore } from '@forgeclaw/core';

// Tabelas: sessions, messages, topics, cron_jobs, cron_logs
// Todas com CRUD completo

// Sessoes
stateStore.createSession(session);
stateStore.getSession('123:456');
stateStore.updateSession('123:456', { projectDir: '/new/path' });
stateStore.listSessions();

// Mensagens
stateStore.createMessage({ topicId: 1, role: 'user', content: 'Hello', createdAt: Date.now() });
stateStore.getMessages(topicId, 50);

// Topicos
stateStore.createTopic({ threadId: 1, chatId: 123, name: 'Dev', projectDir: null, sessionId: null, createdAt: Date.now() });
stateStore.getTopicByChatAndThread(chatId, threadId);
stateStore.listTopics();

// Cron Jobs
stateStore.createCronJob({ name: 'Daily', schedule: '0 23 * * *', prompt: '...', targetTopicId: 1, enabled: true, lastRun: null, lastStatus: null });
stateStore.listCronJobs(true); // enabledOnly
stateStore.updateCronJob(id, { enabled: false });

// Cron Logs
stateStore.createCronLog({ jobId: 1, startedAt: Date.now(), finishedAt: null, status: 'running', output: null });
stateStore.getCronLogs(jobId, 20);
```

Database path: `~/.forgeclaw/db/forgeclaw.db`

### EventBus

Pub/sub assincrono tipado para comunicacao entre modulos.

```typescript
import { eventBus } from '@forgeclaw/core';

// Eventos disponiveis:
// 'message:incoming' | 'message:outgoing' | 'stream:chunk' | 'stream:done'
// 'session:created' | 'session:resumed' | 'cron:fired' | 'cron:result'

eventBus.on('cron:result', async (data) => {
  const { jobId, jobName, output, status } = data;
  // ...
});

eventBus.once('session:created', async (data) => { /* ... */ });

await eventBus.emit('cron:fired', { jobId: 1, name: 'Daily Review' });

eventBus.off('cron:result', handler);
eventBus.removeAllListeners('cron:result');
```

### CronEngine

Parser de HEARTBEAT.md + scheduler com croner.

```typescript
import { cronEngine } from '@forgeclaw/core';

// Iniciar (le HEARTBEAT.md, sincroniza com DB, agenda jobs)
await cronEngine.start();

// Executar job manualmente
await cronEngine.runJobNow(jobId);

// Listar jobs
const jobs = cronEngine.listJobs();

// Logs de um job
const logs = cronEngine.getJobLogs(jobId, 20);

// Status
cronEngine.isRunning;    // boolean
cronEngine.activeJobCount; // number

// Parar
await cronEngine.stop();
```

O engine faz watch no HEARTBEAT.md e recarrega automaticamente quando o arquivo muda (debounce 2s).

A funcao `naturalToCron` converte schedules em portugues para cron expressions:

```typescript
import { naturalToCron } from '@forgeclaw/core';

naturalToCron('Todo dia as 23h30');           // '30 23 * * *'
naturalToCron('Toda segunda as 8h');          // '0 8 * * 1'
naturalToCron('A cada 30 minutos');           // '*/30 * * * *'
naturalToCron('Toda terca e quinta as 9h');   // '0 9 * * 2,4'
naturalToCron('*/5 * * * *');                 // '*/5 * * * *' (passthrough)
```

### MemoryManager

Sistema de memoria com daily logs e compilacao.

```typescript
import { memoryManager } from '@forgeclaw/core';

// Adicionar entrada ao log diario (com timestamp automatico)
await memoryManager.addEntry('Decidiu usar SQLite em vez de PostgreSQL');

// Ler log de hoje
const today = await memoryManager.getDailyLog();

// Ler log de ontem
const yesterday = await memoryManager.getYesterdayLog();

// Ler log de data especifica
const log = await memoryManager.getDailyLog('2026-04-08');

// Ler MEMORY.md consolidado
const memory = await memoryManager.getMemory();

// Compilar daily log para MEMORY.md (extrair decisoes/insights)
await memoryManager.compileDaily();

// Listar todos os daily logs
const logs = await memoryManager.listDailyLogs();
// [{ date: '2026-04-09', path: '...', entries: 12 }, ...]
```

`compileDaily()` filtra entradas com keywords de decisao/aprendizado (decid*, aprend*, bug, fix, pattern, erro, insight, etc). Se nenhuma keyword bate, inclui todas as entradas.

### HarnessLoader

Carrega arquivos do Harness com cache por mtime.

```typescript
import { harnessLoader } from '@forgeclaw/core';

// Carregar harness (SOUL, USER, AGENTS, TOOLS, MEMORY + STYLE se for content task)
const systemPrompt = await harnessLoader.load({ isContentTask: false });

// Detectar se mensagem e sobre conteudo
harnessLoader.isContentTask('Escreva um post para Instagram');  // true
harnessLoader.isContentTask('Corrija o bug na API');            // false
```

Keywords de conteudo: `post`, `conteudo`, `instagram`, `linkedin`, `escreve`, `copy`, `carrossel`, `reel`, `stories`.

### ContextBuilder

Monta o contexto completo para cada mensagem (harness + daily log + vault + state).

```typescript
import { ContextBuilder } from '@forgeclaw/core';

const builder = new ContextBuilder(config, harnessLoader);
const fullPrompt = await builder.build(userMessage, chatId, topicId);
// Retorna: harness + yesterday's log + vault instruction + project STATE.md + userMessage
```

### VaultNavigator

Integracao com Obsidian Vault.

```typescript
import { vaultNavigator } from '@forgeclaw/core';

// Instrucao para o Claude navegar o vault
const instruction = await vaultNavigator.getVaultInstruction();

// Estrutura do vault (top-level folders)
const structure = await vaultNavigator.getVaultStructure();

// Buscar arquivos .md contendo um termo
const files = await vaultNavigator.searchVault('decisao arquitetura');
// ['/vault/Notes/arch-decision.md', ...]
```

### FileHandler

Download e extracao de conteudo de arquivos do Telegram.

```typescript
import { fileHandler } from '@forgeclaw/core';

// Download de arquivo do Telegram
const localPath = await fileHandler.downloadTelegramFile(bot, fileId);

// Extrair conteudo baseado no MIME type
const result = await fileHandler.extractContent(localPath, 'application/pdf');
// { type: 'text', content: '...' }  -- PDF, texto, archives
// { type: 'image', content: '/path' } -- imagens

// Detectar caminhos de arquivo mencionados no output do Claude
const paths = await fileHandler.detectOutboundFiles(claudeOutput);

// Limpar arquivo temporario
await fileHandler.cleanup(localPath);
```

Suporte: PDF (via pdftotext), imagens, texto (30+ extensoes), ZIP, tar.gz.

### VoiceHandler

Transcricao de audio via OpenAI Whisper.

```typescript
import { voiceHandler } from '@forgeclaw/core';

const text = await voiceHandler.transcribe('/tmp/audio.ogg');
// Usa Whisper-1, idioma PT, via fetch nativo (sem SDK)
```

Requer `OPENAI_API_KEY` como variavel de ambiente.

### UPDetector

Detecta comandos UP e opcoes numeradas no output do Claude.

```typescript
import { upDetector } from '@forgeclaw/core';

// Extrair comandos /up: do texto
const commands = upDetector.extractUPCommands(text);
// [{ command: '/up:executar-fase 3', label: 'Executar Fase 3' }]

// Extrair opcoes numeradas
const options = upDetector.extractNumberedOptions(text);
// [{ number: 1, text: 'Opcao A' }, { number: 2, text: 'Opcao B' }]

// Extrair tudo de uma vez
const actions = upDetector.extractAllActions(text);

// Grid padrao de comandos UP
const grid = upDetector.getUPCommandsGrid();
```

### Config

Carrega, valida e faz hot-reload do `forgeclaw.config.json`.

```typescript
import { getConfig, reloadConfig, watchConfig, stopWatchingConfig } from '@forgeclaw/core';

const config = await getConfig();       // Cached
const fresh = await reloadConfig();     // Forca releitura

watchConfig((newConfig) => {
  console.log('Config atualizada:', newConfig);
});

stopWatchingConfig();
```

## Tipos

Todos os tipos sao exportados de `@forgeclaw/core`:

- `ForgeClawConfig` -- configuracao do sistema
- `SessionInfo` -- informacao de sessao
- `TopicInfo` -- topico (thread do Telegram)
- `CronJob` / `CronLog` -- cron jobs e logs
- `Message` -- mensagem (user/assistant)
- `StreamEvent` -- evento do stream do Claude
- `ClaudeRunnerOptions` -- opcoes do runner
