# Briefing — ForgeClaw Packaging Blockers

## Modo
Brownfield — correção de 6 blockers em sistema existente

## Objetivo
Corrigir todos os blockers que impedem a distribuição do ForgeClaw como pacote npm instalável por clientes.

## Stack Existente
- Runtime: Bun 1.1+
- Bot: grammY (Telegram)
- Core: SQLite (bun:sqlite), croner, Claude CLI
- Dashboard: Next.js 16 + React 19 + Tailwind + shadcn/ui
- CLI: @clack/prompts (interactive installer)
- Monorepo: Bun workspaces (packages/bot, core, dashboard, cli)

## Blockers a Corrigir

### B1: Dashboard não é instalado como serviço
- O installer (`packages/cli/src/commands/install.ts`) só cria systemd service pro bot
- Dashboard service template existe em `ops/forgeclaw-dashboard.service` mas não é instalado
- O service roda `bun run dev` ao invés de `bun run build && bun run start`
- Após install, "Dashboard: localhost:4040" não funciona
- **Fix:** Instalar dashboard service no step 12, rodar em production mode

### B2: OpenAI/Groq API key coletada mas nunca injetada no env
- Install salva `openaiApiKey` no JSON config
- VoiceHandler lê `process.env.OPENAI_API_KEY` e `process.env.GROQ_API_KEY`
- Systemd service não seta essas env vars
- Voz nunca funciona para install fresh
- **Fix:** Setar env vars no systemd service a partir do config

### B3: voiceProvider: 'whisper' não é valor válido
- Install salva `voiceProvider: 'whisper'` no config
- Config validator só aceita `'groq' | 'openai' | 'none'`
- VoiceHandler ignora o campo completamente — só checa env vars
- **Fix:** Mudar install pra salvar 'openai' quando user seleciona Whisper, adicionar opção Groq, fazer VoiceHandler respeitar o campo

### B4: CLAUDE.md harness nunca é gerado
- Bot injeta `~/.forgeclaw/harness/CLAUDE.md` via `--append-system-prompt-file`
- Installer gera SOUL.md, USER.md, AGENTS.md, TOOLS.md, MEMORY.md, STYLE.md separados
- Mas nunca compila um CLAUDE.md unificado
- Resultado: personalidade/contexto do bot não é injetada
- **Fix:** Gerar CLAUDE.md que concatena os harness files, com mecanismo de recompilação

### B5: Install não roda `bun install`
- Se cliente clona repo fresh, não tem node_modules
- Bot crasha no start imediatamente
- **Fix:** Adicionar step de `bun install` no installer após gerar config

### B6: Dashboard sem autenticação
- Porta 4040 aberta sem login, sem API key, sem nada
- Qualquer pessoa com acesso à rede lê mensagens, edita config, manda mensagens
- WS server (4041) está em localhost only (bom), mas dashboard Next.js binda em 0.0.0.0
- **Fix:** Adicionar auth por token/senha simples no dashboard

## Restrições
- NÃO mudar funcionalidades que já funcionam
- Manter backward compatibility com configs existentes
- Seguir padrões e convenções do codebase
- Commits atômicos por mudança
