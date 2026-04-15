---
phase: 20-data-export-photo
plan: 20-02
type: fix
autonomous: true
wave: 0
depends_on: []
requirements: [MED-M7]
must_haves:
  truths:
    - "Photos sent via Telegram are copied to the session's projectDir (or config.workingDir) before being sent to Claude"
    - "The prompt sent to Claude uses a path inside the projectDir, not /tmp/"
    - "The copied file is cleaned up after Claude processes it (not the /tmp/ original which is also cleaned)"
    - "Document handler for images also copies to projectDir"
  artifacts:
    - path: "packages/bot/src/handlers/photo.ts"
      provides: "Photo handler that copies to projectDir"
    - path: "packages/bot/src/handlers/document.ts"
      provides: "Document handler that copies images to projectDir"
  key_links:
    - from: "packages/bot/src/handlers/photo.ts"
      to: "packages/core/src/file-handler.ts"
      via: "fileHandler.downloadTelegramFile() returns /tmp/ path"
    - from: "packages/bot/src/handlers/photo.ts"
      to: "packages/bot/src/handlers/text.ts"
      via: "injects prompt with projectDir-local path, calls textHandler(ctx)"
---

# Fase 20 Plano 02: Fix Photo Path for Claude CLI Access

**Objetivo:** Corrigir o handler de fotos/imagens para copiar arquivos do /tmp/forgeclaw/ para o projectDir da sessao, garantindo que o Claude CLI (que roda com cwd=projectDir) consiga ler as imagens via Read tool.

## Contexto

@packages/bot/src/handlers/photo.ts -- Atual: envia `[Foto: /tmp/forgeclaw/uuid.jpg]` pro Claude. Claude CLI roda em projectDir e pode nao ter acesso ao /tmp/
@packages/bot/src/handlers/document.ts -- Mesmo problema quando extracted.type === 'image'
@packages/bot/src/handlers/text.ts -- Linha 153: `cwd: session.projectDir ?? config.workingDir` -- o cwd do Claude runner
@packages/core/src/file-handler.ts -- downloadTelegramFile() salva em /tmp/forgeclaw/
@packages/bot/src/handlers/voice.ts -- Referencia de pattern: download -> process -> cleanup

## Tarefas

<task id="1" type="auto">
<files>packages/bot/src/handlers/photo.ts</files>
<action>
Reescrever `packages/bot/src/handlers/photo.ts` com a seguinte implementacao:

```typescript
import type { Context } from 'grammy';
import { fileHandler, sessionManager } from '@forgeclaw/core';
import type { ForgeClawConfig } from '@forgeclaw/core';
import { createTextHandler } from './text';
import { copyFile, mkdir, unlink } from 'node:fs/promises';
import { join, basename } from 'node:path';
```

**Funcao `createPhotoHandler(config: ForgeClawConfig)`:**

O return deve ser um async handler que faz:

1. Extrair `photos`, `chatId`, `topicId`, `caption` do ctx (mesmo pattern atual).

2. Declarar DUAS variaveis de path para cleanup:
```typescript
let tmpPath: string | null = null;    // /tmp/forgeclaw/uuid.jpg
let localPath: string | null = null;  // projectDir/.forgeclaw-uploads/uuid.jpg
```

3. No try:
   a. Pegar a foto de maior resolucao: `const bestPhoto = photos[photos.length - 1]`
   b. Download para /tmp: `tmpPath = await fileHandler.downloadTelegramFile(ctx.api, bestPhoto.file_id)`
   c. Resolver o projectDir da sessao:
   ```typescript
   const session = await sessionManager.getOrCreateSession(chatId, topicId);
   const projectDir = session.projectDir ?? config.workingDir;
   ```
   d. Criar subdiretorio `.forgeclaw-uploads` dentro do projectDir:
   ```typescript
   const uploadsDir = join(projectDir, '.forgeclaw-uploads');
   await mkdir(uploadsDir, { recursive: true });
   ```
   e. Copiar o arquivo do /tmp para o uploadsDir:
   ```typescript
   const fileName = basename(tmpPath);
   localPath = join(uploadsDir, fileName);
   await copyFile(tmpPath, localPath);
   ```
   f. Construir o prompt usando o path RELATIVO ao projectDir (porque o Claude CLI roda com cwd=projectDir):
   ```typescript
   const relativePath = `.forgeclaw-uploads/${fileName}`;
   const prompt = `[Foto: ${relativePath}]\n${caption ?? 'Analise esta imagem. Use a ferramenta Read para ler o arquivo de imagem.'}`;
   ```
   g. Injetar no ctx.message.text e chamar textHandler (pattern existente).

4. No catch: mesmo pattern atual (log error + reply erro).

5. No finally: limpar AMBOS os arquivos:
```typescript
if (tmpPath) await fileHandler.cleanup(tmpPath);
if (localPath) {
  try { await unlink(localPath); } catch { /* ignore */ }
}
```

**IMPORTANTE:** O prompt deve usar path relativo (`.forgeclaw-uploads/filename`), NAO absoluto. O Claude CLI roda com cwd=projectDir, entao path relativo funciona. Isso evita problemas de permissao e portabilidade.

**IMPORTANTE:** A mensagem default mudou de 'Analise esta imagem' para incluir instrucao explicita de usar Read tool, porque o Claude Code CLI precisa saber que deve ler o arquivo como imagem.
</action>
<verify>
<automated>cd /home/projects/ForgeClaw && bun build --target=bun packages/bot/src/handlers/photo.ts --outdir /tmp/forgeclaw-check-photo 2>&1 && echo "BUILD OK"</automated>
</verify>
<done>O photo handler: (1) baixa para /tmp, (2) copia para projectDir/.forgeclaw-uploads/, (3) envia path relativo no prompt, (4) limpa ambos os arquivos no finally.</done>
</task>

<task id="2" type="auto">
<files>packages/bot/src/handlers/document.ts</files>
<action>
Modificar `packages/bot/src/handlers/document.ts` para aplicar o mesmo fix quando o conteudo extraido e uma imagem (extracted.type === 'image').

Adicionar imports necessarios no topo:
```typescript
import { copyFile, mkdir, unlink } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { sessionManager } from '@forgeclaw/core';
```

Atualizar o `import` do @forgeclaw/core para incluir `sessionManager`:
```typescript
import { fileHandler, sessionManager } from '@forgeclaw/core';
```

**Mudancas no handler:**

1. Declarar `localPath` no topo do handler (junto com filePath):
```typescript
let filePath: string | null = null;
let localPath: string | null = null;
```

2. No bloco `if (extracted.type === 'image')` (atualmente na linha ~35), substituir a construcao do prompt por:
```typescript
} else if (extracted.type === 'image') {
  // Copy image to projectDir so Claude CLI can read it
  const session = await sessionManager.getOrCreateSession(chatId, topicId);
  const projectDir = session.projectDir ?? config.workingDir;
  const uploadsDir = join(projectDir, '.forgeclaw-uploads');
  await mkdir(uploadsDir, { recursive: true });
  const imgFileName = basename(extracted.content); // extracted.content is the /tmp path for images
  localPath = join(uploadsDir, imgFileName);
  await copyFile(extracted.content, localPath);
  const relativePath = `.forgeclaw-uploads/${imgFileName}`;
  prompt = `[Imagem: ${relativePath}]\n${caption ?? 'Leia esta imagem com Read tool.'}`;
```

3. No finally, adicionar cleanup do localPath:
```typescript
} finally {
  if (filePath) {
    await fileHandler.cleanup(filePath);
  }
  if (localPath) {
    try { await unlink(localPath); } catch { /* ignore */ }
  }
}
```

**Nao alterar** o comportamento para extracted.type === 'text' ou 'file' -- apenas 'image' precisa do fix.
</action>
<verify>
<automated>cd /home/projects/ForgeClaw && bun build --target=bun packages/bot/src/handlers/document.ts --outdir /tmp/forgeclaw-check-doc 2>&1 && echo "BUILD OK"</automated>
</verify>
<done>O document handler copia imagens para projectDir/.forgeclaw-uploads/ e usa path relativo no prompt. Outros tipos de arquivo (text, file) continuam com comportamento inalterado.</done>
</task>

<task id="3" type="auto">
<files>packages/bot/src/handlers/photo.ts, packages/bot/src/handlers/document.ts</files>
<action>
Verificar que o bot compila inteiro sem erros apos as mudancas.

1. Rodar o type-check do monorepo (se disponivel):
```bash
cd /home/projects/ForgeClaw && bun run --filter @forgeclaw/bot typecheck 2>&1 || true
```

2. Se nao houver script typecheck, compilar o entrypoint do bot:
```bash
cd /home/projects/ForgeClaw && bun build --target=bun packages/bot/src/index.ts --outdir /tmp/forgeclaw-bot-check 2>&1
```

3. Verificar que `sessionManager` esta sendo exportado do @forgeclaw/core (ja e -- ver packages/core/src/index.ts). Se houver erro de import, verificar se o export existe:
```bash
grep -n 'sessionManager' packages/core/src/index.ts
```

Se houver erros de compilacao, corrigir os arquivos photo.ts e document.ts ate que o bot compile limpo.
</action>
<verify>
<automated>cd /home/projects/ForgeClaw && bun build --target=bun packages/bot/src/index.ts --outdir /tmp/forgeclaw-bot-check 2>&1 && echo "BOT BUILD OK"</automated>
</verify>
<done>O bot compila sem erros. Os handlers photo.ts e document.ts usam imports validos e a logica de copia/cleanup esta correta.</done>
</task>

## Criterios de Sucesso

- [ ] Fotos enviadas via Telegram sao copiadas de /tmp/forgeclaw/ para projectDir/.forgeclaw-uploads/
- [ ] O prompt enviado ao Claude usa path relativo (.forgeclaw-uploads/filename), nao /tmp/
- [ ] Documentos do tipo imagem tambem sao copiados para projectDir
- [ ] Ambos os arquivos (tmp + upload) sao limpos no finally
- [ ] O bot compila sem erros
