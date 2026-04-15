# Briefing — ForgeClaw MEDIUM Priority Gaps (M1-M10)

## Modo
Brownfield — correção de 10 gaps MEDIUM em sistema existente

## Gaps a Corrigir

### M1: Daily log dir hardcoded para vault pessoal
- **Arquivos:** packages/core/src/memory-manager.ts, context-builder.ts, memory/janitor.ts, memory/writer.ts, memory/prompts/*.md, packages/dashboard/src/lib/core.ts
- **Problema:** Todos usam `/home/vault/05-pessoal/daily-log` como fallback. Clientes não têm esse path.
- **Fix:** Default para `~/.forgeclaw/memory/daily`. Se config tem `vaultPath`, usar `{vaultPath}/05-pessoal/daily-log`. Env var FORGECLAW_DAILY_LOG_DIR continua como override.

### M2: Memory v1 e v2 rodam em paralelo com overlap
- **Arquivos:** packages/bot/src/index.ts, packages/core/src/memory-manager.ts (v1), packages/core/src/memory/manager.ts (v2)
- **Problema:** Ambos têm crons, ambos processam daily logs, potencial race.
- **Fix:** Deprecar v1 MemoryManager. Manter v2 como único sistema. Remover crons de v1 do bot startup.

### M3: --dangerously-skip-permissions sem documentar risco
- **Arquivos:** packages/core/src/claude-runner.ts (linha 224)
- **Problema:** Flag usada em toda invocação sem doc.
- **Fix:** Adicionar comentário explicativo no código + doc no README/install outro. Tornar configurável via config field `skipPermissions: boolean` (default true).

### M4: Dashboard config tab aceita campos arbitrários sem validação
- **Arquivos:** packages/dashboard/src/app/api/config/route.ts (PUT handler)
- **Problema:** PUT aceita qualquer JSON e escreve no config. Pode corromper.
- **Fix:** Validar incoming config contra schema (whitelist de campos conhecidos). Rejeitar campos desconhecidos.

### M5: Sem backup/export de dados
- **Arquivos:** packages/cli/ (novo comando)
- **Problema:** Não há forgeclaw export/backup. Dados em SQLite + markdown espalhados.
- **Fix:** Adicionar `forgeclaw export` que cria um .tar.gz com db + config + harness + memory.

### M6: Sem notificação de falha de cron
- **Arquivos:** packages/core/src/cron-engine.ts, packages/bot/src/index.ts
- **Problema:** Cron falha → log no DB + msg no Telegram. Se user não está olhando Telegram, não sabe.
- **Fix:** Na verdade, o cron JÁ envia msg no Telegram (via eventBus cron:result). O gap real é que não há destaque visual (emoji/prefix de FALHA). Adicionar prefixo ❌ e log level no Telegram quando cron falha.

### M7: Foto manda file PATH pro Claude ao invés de vision API
- **Arquivos:** packages/bot/src/handlers/ (photo handler)
- **Problema:** Envia path local como "[Foto: /tmp/forgeclaw/uuid.jpg]". Claude CLI precisa do arquivo acessível.
- **Fix:** Copiar foto para o workingDir do projeto atual (não /tmp/) para que o Claude CLI consiga ler via Read tool. O Claude Code CLI JÁ suporta ler imagens via Read tool.

### M8: Installer não checa versão mínima do Bun
- **Arquivos:** packages/cli/src/commands/install.ts
- **Problema:** Só checa se bun existe via `which bun`. Versão antiga pode falhar.
- **Fix:** Parsear `bun --version`, comparar com mínimo 1.1.0. Warn se abaixo.

### M9: Sem adicionar users/groups pelo dashboard
- **Arquivos:** packages/dashboard/src/components/config-tab.tsx
- **Problema:** allowedUsers mostrado como texto readonly. Não dá pra adicionar/remover.
- **Fix:** Transformar em lista editável com input + botão add + botão remove. Mesmo para allowedGroups.

### M10: Erro de Claude CLI expirado mostra mensagem crua
- **Arquivos:** packages/bot/src/handlers/text.ts, packages/core/src/claude-runner.ts
- **Problema:** Se Claude CLI não autenticado, erro raw vai pro Telegram.
- **Fix:** Detectar erros comuns (auth expired, not found, rate limit) e traduzir para mensagens amigáveis.
