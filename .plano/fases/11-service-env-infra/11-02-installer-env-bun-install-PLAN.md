---
phase: 11-service-env-infra
plan: 11-02
type: feature
autonomous: true
wave: 1
depends_on: [11-01]
requirements: [PKG-B2, PKG-B5]
must_haves:
  truths:
    - "Installer coleta GROQ_API_KEY quando voice provider e groq ou openai (ambos precisam da key correspondente)"
    - "Installer chama writeEnvFile() para criar ~/.forgeclaw/.env com API keys"
    - "Installer roda bun install no root do monorepo antes de setup de service"
    - "API keys NAO sao salvas no config JSON (removidas do objeto config)"
  artifacts:
    - path: "packages/cli/src/commands/install.ts"
      provides: "Installer atualizado com coleta de Groq key, env file, bun install step"
  key_links:
    - from: "install.ts step 7"
      to: "service.ts writeEnvFile()"
      via: "import { writeEnvFile } from '../utils/service'"
    - from: "install.ts bun install step"
      to: "monorepo root"
      via: "Bun.spawn(['bun', 'install'], { cwd: MONOREPO_ROOT })"
---

# Fase 11 Plano 02: Installer - Env File, Groq Key e Bun Install

**Objetivo:** Modificar o installer para: (1) coletar GROQ_API_KEY alem da OpenAI key, (2) salvar API keys em `~/.forgeclaw/.env` via `writeEnvFile()` ao inves de no config JSON, (3) rodar `bun install` antes de setup de service.

## Contexto

@packages/cli/src/commands/install.ts -- Installer atual (coleta openaiApiKey, salva no JSON, nao roda bun install)
@packages/cli/src/utils/service.ts -- Service utils (writeEnvFile adicionado no plano 11-01)
@packages/core/src/voice-handler.ts -- Le GROQ_API_KEY e OPENAI_API_KEY do process.env

## Tarefas

<task id="1" type="auto">
<files>packages/cli/src/commands/install.ts</files>
<action>
Adicionar import de `writeEnvFile` no topo do arquivo:

```typescript
import { setupService, writeEnvFile } from '../utils/service'
```

A linha atual e:
```typescript
import { setupService } from '../utils/service'
```

Apenas adicionar `writeEnvFile` ao import existente.

Tambem adicionar constante para o root do monorepo (necessario para bun install):

```typescript
import { resolve } from 'node:path'
```

`resolve` ja e importado? Verificar. Se nao, adicionar ao import de `node:path` existente (que ja importa `join`).

Adicionar apos as constantes FORGECLAW_DIR e CONFIG_PATH:

```typescript
const MONOREPO_ROOT = resolve(__dirname, '..', '..', '..', '..')
```
</action>
<verify><automated>cd /home/projects/ForgeClaw && grep 'writeEnvFile' packages/cli/src/commands/install.ts | head -1 | grep -q 'import' && echo PASS || echo FAIL</automated></verify>
<done>writeEnvFile importado de '../utils/service', MONOREPO_ROOT definido</done>
</task>

<task id="2" type="auto">
<files>packages/cli/src/commands/install.ts</files>
<action>
Modificar o Step 7 (Voice provider) para:
1. Adicionar opcao "Groq Whisper (recommended, faster)" ao select
2. Coletar a key correspondente ao provider selecionado
3. Coletar GROQ_API_KEY quando provider e groq

Substituir o bloco do Step 7 inteiro (linhas ~174-197) por:

```typescript
  // --- Step 7: Voice provider ---
  const voiceProvider = checkValue(
    await select({
      message: 'Voice transcription provider:',
      initialValue: (existingConfig.voiceProvider as string) ?? 'groq',
      options: [
        { value: 'groq', label: 'Groq Whisper (recommended, fast & free tier)' },
        { value: 'openai', label: 'OpenAI Whisper' },
        { value: 'none', label: 'No voice transcription' },
      ],
    })
  )

  let openaiApiKey: string | null = null
  let groqApiKey: string | null = null

  if (voiceProvider === 'openai') {
    openaiApiKey = checkValue(
      await text({
        message: 'OpenAI API Key:',
        placeholder: 'sk-...',
        initialValue: (existingConfig.openaiApiKey as string) ?? '',
        validate(value) {
          if (!value) return 'API key is required for OpenAI Whisper'
        },
      })
    )
  }

  if (voiceProvider === 'groq') {
    groqApiKey = checkValue(
      await text({
        message: 'Groq API Key (get at console.groq.com):',
        placeholder: 'gsk_...',
        initialValue: (existingConfig.groqApiKey as string) ?? '',
        validate(value) {
          if (!value) return 'API key is required for Groq Whisper'
        },
      })
    )
  }
```

Mudancas vs atual:
- `'whisper'` substituido por `'groq'` (valor valido) como default
- Adicionada opcao groq com label descritivo
- Label de openai mudado de "OpenAI Whisper (recommended)" para "OpenAI Whisper"
- Adicionada variavel `groqApiKey` 
- Coleta GROQ_API_KEY quando provider === 'groq'
- Validacao: cada provider requer sua key
</action>
<verify><automated>cd /home/projects/ForgeClaw && grep -c "groq\|Groq" packages/cli/src/commands/install.ts | grep -q '[3-9]' && echo PASS || echo FAIL</automated></verify>
<done>Step 7 oferece groq/openai/none, coleta key correspondente, default e groq</done>
</task>

<task id="3" type="auto">
<files>packages/cli/src/commands/install.ts</files>
<action>
Modificar o Step 9 (Generate config) para:
1. REMOVER `openaiApiKey` do objeto config (NAO salvar API keys no JSON)
2. Adicionar `groqApiKey` ao NOT-saved (nao incluir tambem)
3. O objeto config deve conter `voiceProvider` com valor valido ('groq', 'openai', 'none')

O objeto config deve ficar:

```typescript
  const config = {
    botToken,
    allowedUsers: [Number(userId)],
    workingDir,
    vaultPath,
    voiceProvider,
    userName,
    company,
    role,
  }
```

Note que `openaiApiKey` FOI REMOVIDO do objeto config. API keys vao para o env file, nao para o JSON.

Logo apos `writeFileSync(CONFIG_PATH, ...)` e `chmodSync(CONFIG_PATH, ...)`, adicionar a chamada ao writeEnvFile:

```typescript
  // Write API keys to env file (not in config JSON for security)
  writeEnvFile({ openaiApiKey, groqApiKey })
```

Isso cria ~/.forgeclaw/.env com as keys (se houver alguma). O diretorio ~/.forgeclaw/ ja foi criado no passo anterior (mkdirSync).
</action>
<verify><automated>cd /home/projects/ForgeClaw && grep 'writeEnvFile' packages/cli/src/commands/install.ts | grep -v import | grep -q 'openaiApiKey' && echo PASS || echo FAIL</automated></verify>
<done>Config JSON nao contem API keys, writeEnvFile() chamado com openaiApiKey e groqApiKey</done>
</task>

<task id="4" type="auto">
<files>packages/cli/src/commands/install.ts</files>
<action>
Adicionar um novo step entre o Step 11 (Detect projects) e o Step 12 (Setup service). Este step roda `bun install` no root do monorepo.

Inserir APOS o bloco de deteccao de projetos (apos o `log.info('No projects detected...')`) e ANTES do bloco de setup de service (antes de `const shouldSetupService = ...`):

```typescript
  // --- Step 12: Install dependencies ---
  const depSpinner = spinner()
  depSpinner.start('Installing dependencies (bun install)...')

  try {
    const bunInstall = Bun.spawn(['bun', 'install'], {
      cwd: MONOREPO_ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const [, installStderr] = await Promise.all([
      new Response(bunInstall.stdout).text(),
      new Response(bunInstall.stderr).text(),
    ])
    await bunInstall.exited

    if (bunInstall.exitCode === 0) {
      depSpinner.stop('Dependencies installed.')
    } else {
      depSpinner.stop('Dependency install had warnings.')
      log.warn(`bun install stderr: ${installStderr.slice(0, 200)}`)
    }
  } catch (err) {
    depSpinner.stop('Failed to install dependencies.')
    log.error(`bun install failed: ${err}`)
    log.warn('Run "bun install" manually in the project root.')
  }
```

Detalhes:
- Usa `Bun.spawn` (mesmo pattern usado em checkDependency)
- `cwd: MONOREPO_ROOT` garante que roda no root do monorepo, nao no dir do CLI
- stdout/stderr consumidos para evitar blocking
- Nao faz process.exit em caso de erro -- continua o install (bun install pode falhar por razoes nao criticas)
- Spinner para feedback visual
- Trunca stderr a 200 chars para nao poluir o output

O step que era 12 (Setup service) agora e Step 13. NAO renumerar os comentarios no codigo -- os numeros sao apenas referencia interna. Manter o comentario existente `// --- Step 12: Setup system service ---` e renomear para `// --- Step 13: Setup system service ---`.
</action>
<verify><automated>cd /home/projects/ForgeClaw && grep -c 'bun install\|bun.*install' packages/cli/src/commands/install.ts | grep -q '[2-9]' && echo PASS || echo FAIL</automated></verify>
<done>Step de bun install adicionado com spinner, error handling nao-fatal, cwd=monorepo root</done>
</task>

<task id="5" type="auto">
<files>packages/cli/src/commands/install.ts</files>
<action>
Atualizar a mensagem final do `outro()` para refletir que ambos services estao instalados e mencionar o env file:

```typescript
  outro(`ForgeClaw is ready!

  Open Telegram and send /start to your bot
  Dashboard: http://localhost:4040
  Status: forgeclaw status
  Logs: forgeclaw logs

  API keys stored in: ~/.forgeclaw/.env
  Config: ~/.forgeclaw/forgeclaw.config.json`)
```

Tambem verificar que a funcao `setupService` recebe o config corretamente. A assinatura atual e `setupService(config: Record<string, unknown>)` -- o config ja e passado. Nenhuma mudanca necessaria na chamada.
</action>
<verify><automated>cd /home/projects/ForgeClaw && grep '\.env' packages/cli/src/commands/install.ts | grep -q 'API keys' && echo PASS || echo FAIL</automated></verify>
<done>Mensagem final menciona localizacao do env file e do config</done>
</task>

<task id="6" type="auto">
<files>packages/cli/src/commands/install.ts</files>
<action>
Verificacao final de consistencia. Revisar o arquivo completo e garantir:

1. NAO existe `openaiApiKey` no objeto `config` (removido na task 3)
2. `voiceProvider` usa valores validos: 'groq' | 'openai' | 'none' (nao 'whisper')
3. `writeEnvFile()` e chamado APOS criar diretorios e APOS writeFileSync do config
4. `bun install` step esta ANTES do `setupService()` call
5. Imports estao corretos: `{ setupService, writeEnvFile }` de '../utils/service'
6. `resolve` importado de 'node:path'
7. `MONOREPO_ROOT` definido
8. Nenhum `groqApiKey` no objeto config JSON (keys ficam so no env file)

Se qualquer item falhar, corrigir. Esta task e de validacao/cleanup -- so faz mudancas se necessario.

Rodar typecheck:
```bash
cd /home/projects/ForgeClaw && bunx tsc --noEmit -p packages/cli/tsconfig.json 2>&1 | head -20
```

Se houver erro de tipo, corrigir.
</action>
<verify><automated>cd /home/projects/ForgeClaw && grep -c 'openaiApiKey' packages/cli/src/commands/install.ts | xargs -I{} bash -c 'if [ {} -le 3 ]; then echo PASS; else echo FAIL; fi'</automated></verify>
<done>openaiApiKey aparece no maximo 3 vezes (declaracao da variavel, coleta via text(), passagem ao writeEnvFile) -- nunca no objeto config</done>
</task>

## Criterios de Sucesso

- [ ] Installer oferece Groq como opcao de voice provider (com label recomendado)
- [ ] GROQ_API_KEY coletada quando provider e groq
- [ ] API keys salvas em ~/.forgeclaw/.env (nao no config JSON)
- [ ] `bun install` roda automaticamente com spinner antes do setup de service
- [ ] voiceProvider salva valores validos ('groq', 'openai', 'none') no config JSON
- [ ] Mensagem final menciona localizacao do env file
- [ ] Typecheck passa sem erros
