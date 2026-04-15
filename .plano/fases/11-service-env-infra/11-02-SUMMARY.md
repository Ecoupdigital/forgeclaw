# 11-02 SUMMARY: Installer - Env File, Groq Key e Bun Install

**Status:** DONE
**Data:** 2026-04-15

## O que foi feito

### Task 1: Imports e MONOREPO_ROOT
- Adicionado `resolve` ao import de `node:path`
- Adicionado `writeEnvFile` ao import de `../utils/service`
- Definido `MONOREPO_ROOT = resolve(__dirname, '..', '..', '..', '..')`

### Task 2: Step 7 -- Voice provider com Groq
- Default mudou de `'whisper'` para `'groq'`
- Adicionada opcao Groq Whisper (recommended, fast & free tier)
- Coleta GROQ_API_KEY quando provider === 'groq'
- Coleta OPENAI_API_KEY quando provider === 'openai'
- Cada provider valida que a key correspondente foi fornecida

### Task 3: API keys fora do config JSON
- Removido `openaiApiKey` do objeto `config` (seguranca)
- Adicionada chamada `writeEnvFile({ openaiApiKey, groqApiKey })` apos gravar o config
- Keys ficam em `~/.forgeclaw/.env` com permissoes 0o600

### Task 4: Bun install step
- Novo Step 12 roda `bun install` no MONOREPO_ROOT com spinner
- Error handling nao-fatal (continua installer se falhar)
- Stderr truncado a 200 chars para output limpo
- Step anterior 12 (service setup) renumerado para 13

### Task 5: Mensagem final atualizada
- Outro menciona localizacao do env file (`~/.forgeclaw/.env`)
- Outro menciona localizacao do config (`~/.forgeclaw/forgeclaw.config.json`)

### Task 6: Validacao final
- openaiApiKey aparece 4x (declaracao, coleta, leitura de existing, passagem ao writeEnvFile) -- nunca no config object
- voiceProvider usa valores validos: 'groq' | 'openai' | 'none'
- Typecheck passou sem erros

## Verificacao funcional

- [x] `writeEnvFile` importado corretamente
- [x] `resolve` importado de `node:path`
- [x] `MONOREPO_ROOT` definido
- [x] Groq aparece como opcao de voice provider (default)
- [x] API keys NAO estao no config JSON
- [x] `writeEnvFile()` chamado apos criar config
- [x] `bun install` step antes do service setup
- [x] Mensagem final menciona env file
- [x] Typecheck passa sem erros

## Commits

1. `02c9b4a` - feat(cli): add writeEnvFile import, resolve import, and MONOREPO_ROOT constant
2. `dce0c06` - feat(cli): add Groq Whisper as voice provider option in installer
3. `cb54a33` - feat(cli): store API keys in env file instead of config JSON
4. `c678a36` - feat(cli): add bun install step before service setup in installer
5. `5c8a745` - feat(cli): update installer outro to mention env file and config paths

## Arquivo modificado

- `packages/cli/src/commands/install.ts`
