# Briefing — ForgeClaw HIGH Priority Gaps (H1-H10)

## Modo
Brownfield — correção de 10 gaps HIGH em sistema existente

## Gaps a Corrigir

### H1: Mock data mascara DB vazio
- **Arquivos:** packages/dashboard/src/app/api/crons/route.ts, sessions/route.ts, crons/[id]/logs/route.ts
- **Problema:** Quando DB falha, GET endpoints caem em fallback com dados mock fake
- **Fix:** Retornar arrays vazios ao invés de mock data. Reservar mocks para NODE_ENV=development apenas.

### H2: Cron log duplicado
- **Arquivos:** packages/core/src/cron-engine.ts (linhas ~350-414)
- **Problema:** executeJob() cria entry "running" e depois cria OUTRA entry com status final. Entry "running" nunca atualiza.
- **Fix:** Adicionar updateCronLog() ao StateStore, ou remover a entry "running" inicial.

### H3: Session key mismatch bot vs dashboard
- **Arquivos:** packages/core/src/session-manager.ts, packages/core/src/ws-server.ts
- **Problema:** Bot usa "chatId" pra DMs (sem colon), dashboard usa "chatId:0". parseSessionKey() assume formato com colon.
- **Fix:** Padronizar formato sempre como "chatId:topicId" (com 0 para DMs).

### H4: Config write pode corromper botToken
- **Arquivos:** packages/dashboard/src/lib/core.ts (writeConfig)
- **Problema:** getConfig() mascara botToken. Se writeConfig() recebe config com token mascarado, sobrescreve com lixo.
- **Fix:** writeConfig() deve NUNCA escrever botToken/dashboardToken mascarados. Strip esses campos antes de merge.

### H5: Claude path hardcoded /root/.local/bin/claude
- **Arquivos:** packages/core/src/claude-runner.ts (linha ~192) OU packages/core/src/runners/claude-code-cli-runner.ts
- **Problema:** Fallback é '/root/.local/bin/claude'. Usuário não-root não tem Claude ali.
- **Fix:** Trocar fallback para 'claude' (usa PATH do sistema).

### H6: "Lembra que X" não salva memória imediata
- **Arquivos:** packages/bot/src/handlers/text.ts, packages/core/src/memory/
- **Problema:** Memória só é extraída pelo janitor que roda 1x/dia. Horas de delay.
- **Fix:** Detectar frases tipo "lembra que", "remember that" no input e criar memory entry imediata via memoryManagerV2.

### H7: Output de cron não aparece no dashboard
- **Arquivos:** packages/core/src/cron-engine.ts, packages/core/src/state-store.ts, packages/dashboard/src/app/api/crons/[id]/logs/route.ts
- **Problema:** CronLog tem campo output mas UI de logs só mostra status/timing.
- **Fix:** Garantir que output é salvo no cron_logs, e que a API/UI exibem o output.

### H8: Memory tab sem busca por texto nem paginação
- **Arquivos:** packages/dashboard/src/components/memory-tab.tsx, packages/dashboard/src/app/api/memory/entries/route.ts
- **Problema:** Fetch all entries de uma vez, sem search box, sem limit/offset.
- **Fix:** Adicionar search input na UI que usa FTS5 search do backend. Adicionar paginação.

### H9: Sem typing indicator no Telegram
- **Arquivos:** packages/bot/src/handlers/text.ts
- **Problema:** Claude demora, usuário vê "Processing..." estático sem typing bubble.
- **Fix:** Adicionar ctx.api.sendChatAction(chatId, "typing") em loop enquanto Claude processa.

### H10: Timezone hardcoded BRT
- **Arquivos:** packages/dashboard/src/components/memory-tab.tsx, cron-form-sheet.tsx, e potencialmente outros
- **Problema:** Tudo usa America/Sao_Paulo hardcoded.
- **Fix:** Mover timezone para config (com default America/Sao_Paulo) e usar Intl.DateTimeFormat.

## Restrições
- NÃO quebrar funcionalidades existentes
- Commits atômicos
- H11 (dashboard dev mode) já foi corrigido no B1
