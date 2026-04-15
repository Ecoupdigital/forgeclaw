---
reviewed_at: 2026-04-15T14:30:00-03:00
chief: up-chief-engineer
phases: 11-17
decision: REQUEST_CHANGES
coherence_score: 82/100
---

# Chief Engineer Coherence Review -- Fases 11-17

## 1. Aderencia ao System Design

### Separacao core/bot/dashboard/cli: PASS

A separacao de pacotes foi respeitada em todas as fases:
- core: types.ts, config.ts, session-manager.ts, cron-engine.ts, ws-server.ts, voice-handler.ts
- bot: handlers/text.ts, handlers/immediate-memory.ts, handlers/voice.ts
- dashboard: lib/types.ts, lib/auth.ts, lib/core.ts, proxy.ts

Nenhum modulo cruza boundaries indevidamente. O dashboard usa better-sqlite3 (lib/core.ts) em vez de importar bun:sqlite do core -- correto, pois Next.js roda em Node.js.

### Stack: PASS

Bun + TypeScript + Grammy + Next.js + SQLite. Sem introducao de dependencias fora do previsto. Zod aparece apenas em validacao de input de API (crons route), o que e aceitavel.

## 2. Coerencia de Tipos -- ForgeClawConfig

### ISSUE C1: Dashboard ForgeClawConfig incompleto (MEDIUM)

**core/src/types.ts** define ForgeClawConfig com 18 campos.
**dashboard/src/lib/types.ts** define ForgeClawConfig com 13 campos.

Campos ausentes no dashboard:
- `runtimes?: Partial<Record<RuntimeName, RuntimeConfig>>`
- `writerRuntime?: RuntimeName`
- `writerModel?: string`

Campos presentes em ambos e alinhados:
- botToken, allowedUsers, allowedGroups, workingDir, vaultPath, voiceProvider, claudeModel,
  maxConcurrentSessions, defaultRuntime, showRuntimeBadge, memoryReviewMode,
  memoryAutoApproveThreshold, dashboardToken, timezone

**Impacto:** Baixo hoje (dashboard nao usa runtimes/writerRuntime diretamente), mas viola DRY e pode causar problemas quando o config editor do dashboard for implementado -- writeConfig() poderia silenciosamente dropar esses campos. Atualmente writeConfig() preserva campos desconhecidos via spread do existing, entao nao perde dados. Risco futuro, nao blocker.

**RuntimeConfig interface** tambem esta ausente no dashboard. Se alguem adicionar UI de runtimes, vai ter que redescobrir o tipo.

### Novos campos dashboardToken e timezone: PASS

Ambos presentes em core/types.ts e dashboard/types.ts. Validacao:
- **core/config.ts** valida dashboardToken como string e timezone como string com default 'America/Sao_Paulo' (linha 57).
- **dashboard/lib/core.ts** mascara dashboardToken antes de enviar ao frontend (linha 903-905).
- **dashboard/lib/auth.ts** usa getDashboardToken() que le direto do disco sem mascaramento (linha 917-929).

## 3. Auth Flow -- Coerencia Cross-Layer

### ISSUE C2: Timing-unsafe comparison no WS server (MEDIUM)

**dashboard/src/lib/auth.ts** usa timing-safe XOR comparison (linhas 34-41).
**core/src/ws-server.ts** usa `queryToken === expected` (linha 323) -- comparacao direta, vulneravel a timing attack.

O WS server roda na mesma maquina (127.0.0.1), entao o risco pratico e minimo. Mas a inconsistencia de pattern e um debt: dois caminhos de auth, dois metodos de comparacao.

### Auth flow completo: PASS (com ressalva acima)

O fluxo e coerente:
1. **proxy.ts** (Next.js 16 proxy) -- checa presenca do cookie `fc-token`, redireciona para /login se ausente. Nao valida o token (evita async config read).
2. **API routes** -- usam `requireApiAuth()` que valida Bearer header OU cookie contra dashboardToken via timing-safe comparison.
3. **WS server** -- valida token via query param OU Bearer header antes do upgrade.
4. **IPC endpoints** (/cron/reload, /cron/run-now) -- validam token via `validateWsToken()`.
5. **Backward compat** -- se dashboardToken nao esta configurado, auth e desabilitado em todos os layers.

## 4. Session Key Change (H3)

### PASS, com nota de migracao

buildKey() em session-manager.ts agora gera `"chatId:0"` para DMs (topicId null -> 0).

**Sessoes existentes** que tinham key `"chatId"` (sem `:0`) ficam orfas no DB -- getOrCreateSession criara uma nova sessao para o mesmo chat. Isso e aceitavel porque:
1. O conteudo das mensagens permanece (messages usam topic_id, nao session key).
2. O claudeSessionId (session resume) se perde, mas Claude sessions tem TTL curto de qualquer forma.
3. Nenhum dado destrutivo -- o usuario apenas perde o historico de context_usage da sessao anterior.

**Recomendacao:** Adicionar migration one-shot que renomeia sessions com key sem ":" para key + ":0". Nao e blocker.

## 5. Immediate Memory (H6) -- Uso de memoryManagerV2

### PASS

`packages/bot/src/handlers/immediate-memory.ts` importa `memoryManagerV2` de `@forgeclaw/core` e usa `handleToolCall('memory', { action: 'add', ... })`. Isso e o path correto do memory v2 -- cria entry na tabela memory_entries com dedup por content_hash, reviewed=true (auto-approved), audit trail.

Os patterns de deteccao sao razoaveis (lembra que, remember that, anota, guarda, etc.) com inferencia de kind (fact/preference/decision).

Integracao no text.ts (linha 127): fire-and-forget com `.catch()`, nao bloqueia processamento. Correto.

## 6. Mock Data (H1) -- Remocao Incompleta

### ISSUE C3: Mock data ainda presente em 4 API routes (HIGH)

O H1 deveria substituir mock data por arrays vazios. Verificacao:

| Route               | Mock removido? | Status |
|---------------------|---------------|--------|
| /api/sessions       | SIM           | PASS   |
| /api/crons          | SIM           | PASS   |
| /api/crons/[id]/logs| SIM           | PASS   |
| /api/memory/retrievals | SIM (retorna []) | PASS |
| /api/memory/audit   | SIM (retorna []) | PASS |
| /api/config         | NAO           | FAIL   |
| /api/harness        | NAO           | FAIL   |
| /api/heartbeat      | NAO           | FAIL   |
| /api/memory         | NAO           | FAIL   |

4 routes ainda fazem fallback para mock data quando core esta indisponivel. O mock-data.ts ainda exporta todos os mocks. Os imports ainda estao presentes.

**Impacto:** Em producao isso nao seria atingido (core sempre disponivel), mas viola o principio do H1 e confunde o estado real do sistema durante desenvolvimento. Um usuario novo veria dados fake no dashboard sem aviso claro.

**Acao:** Substituir mock fallbacks por objetos vazios/null nessas 4 routes. Manter mock-data.ts apenas para testes, se necessario.

## 7. Cron Log Duplication (H2)

### PASS

cron-engine.ts executeJob() (linhas 350-410):
1. `createCronLog()` com status='running' -- UMA entrada
2. ... execucao ...
3. `updateCronLog(logId, { finishedAt, status, output })` -- ATUALIZA a mesma entrada

Pattern correto: create + update, nao create + create. stateStore.updateCronLog() existe e usa UPDATE WHERE id=?.

## 8. writeConfig Token Protection (H4)

### PASS

dashboard/lib/core.ts writeConfig() (linhas 931-966):
1. Le config existente do disco
2. Detecta campos com `***hidden***` no incoming
3. Preserva valor original do disco para esses campos
4. Escreve merged config

Isso protege botToken E dashboardToken (e qualquer futuro campo mascarado). Pattern correto e extensivel.

## 9. Voice Provider (B3)

### PASS

- core/types.ts: `voiceProvider?: 'groq' | 'openai' | 'none'`
- core/config.ts: `isVoiceProvider()` valida os 3 valores
- core/voice-handler.ts: `getProviders()` respeita o valor, retorna [] para 'none'
- dashboard/types.ts: mesmo tipo `'groq' | 'openai' | 'none'`

## 10. Typing Indicator (H9)

### PASS

text.ts linhas 163-178: setInterval a cada 4s + chamada imediata. clearInterval no finally (linha 326). Escopo do `typingInterval` e valido (declarado no try, acessivel no finally do mesmo bloco).

## 11. Timezone (H10)

### PASS

- core/config.ts: default `'America/Sao_Paulo'` (linha 57)
- core/types.ts: campo `timezone?: string`
- dashboard/types.ts: campo `timezone?: string`
- Nao ha validacao IANA (ex: Intl.supportedValuesOf) -- aceita qualquer string. Risco baixo.

## 12. Pattern Consistency

### Naming: PASS
- camelCase consistente (sessionKey, topicId, chatId, cronJob)
- snake_case apenas em SQLite columns com mapper para camelCase

### Error handling: PASS
- API routes retornam `{ ok: false, error: "..." }` ou `Response.json({ error }, { status })`
- Core functions retornam null on failure (lib/core.ts)
- Bot handlers usam try/catch com console.error

### Import pattern: PASS
- Bot importa de `@forgeclaw/core`
- Dashboard importa de `@/lib/core` (wrapper), nunca direto do `@forgeclaw/core`

## Summary de Issues

| ID  | Severidade | Tipo            | Descricao                                           |
|-----|-----------|-----------------|-----------------------------------------------------|
| C1  | MEDIUM    | inconsistencia  | Dashboard ForgeClawConfig falta 3 campos do core    |
| C2  | MEDIUM    | inconsistencia  | WS server usa comparacao timing-unsafe vs auth.ts   |
| C3  | HIGH      | drift           | 4 API routes ainda retornam mock data (H1 incompleto)|

## Technical Debt

- Debt novo introduzido: 3 items
- Debt total acumulado: 3 items (C1, C2, C3)
- Session key migration (H3): desejavel mas nao blocker

## Veredito

**REQUEST_CHANGES**

A issue C3 (mock data residual) e HIGH porque contradiz diretamente o requisito H1 e pode causar confusao em ambiente de desenvolvimento/onboarding. As issues C1 e C2 sao MEDIUM e podem ser resolvidas em paralelo ou na proxima fase.

### Acoes Requeridas (para APPROVE)

1. **C3 (blocker):** Remover mock fallback de /api/config, /api/harness, /api/heartbeat, /api/memory. Retornar objetos vazios/null quando core indisponivel.
2. **C2 (recomendado):** Usar timing-safe comparison em ws-server.ts validateWsToken().
3. **C1 (recomendado):** Adicionar campos faltantes ao dashboard ForgeClawConfig ou criar tipo compartilhado.

### Score: 82/100

- Separacao arquitetural: 10/10
- Coerencia de tipos: 7/10 (C1)
- Auth flow: 8/10 (C2)
- Data integrity: 9/10
- Mock removal: 6/10 (C3)
- Pattern consistency: 10/10
- Memory system: 10/10
- Config safety: 10/10
- UX features: 10/10
