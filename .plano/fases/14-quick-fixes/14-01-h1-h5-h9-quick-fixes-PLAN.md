---
phase: 14-quick-fixes
plan: 14-01
type: fix
autonomous: true
wave: 0
depends_on: []
requirements: [HIG-H1, HIG-H5, HIG-H9]
must_haves:
  truths:
    - "API routes retornam arrays/objetos vazios quando core falha, nunca mock data"
    - "Claude CLI usa PATH do sistema, nao path hardcoded /root/.local/bin/claude"
    - "Telegram mostra typing indicator enquanto Claude processa"
  artifacts:
    - path: "packages/dashboard/src/app/api/crons/route.ts"
      provides: "GET retorna { jobs: [], source: 'empty' } no fallback"
    - path: "packages/dashboard/src/app/api/crons/[id]/logs/route.ts"
      provides: "GET retorna { logs: [], source: 'empty' } no fallback"
    - path: "packages/dashboard/src/app/api/sessions/route.ts"
      provides: "GET retorna arrays vazios no fallback"
    - path: "packages/core/src/claude-runner.ts"
      provides: "buildArgs usa 'claude' como fallback ao inves de /root/.local/bin/claude"
    - path: "packages/bot/src/handlers/text.ts"
      provides: "sendChatAction('typing') em loop durante processamento Claude"
  key_links:
    - from: "crons/route.ts"
      to: "mock-data.ts"
      via: "import mantido mas nunca retornado em fallback de producao"
    - from: "text.ts"
      to: "grammy ctx.api"
      via: "sendChatAction loop com setInterval a cada 4s"
---

# Fase 14 Plano 01: Quick Fixes (H1 + H5 + H9)

**Objetivo:** Corrigir 3 gaps HIGH independentes: mock data mascarando DB vazio (H1), Claude path hardcoded (H5), e falta de typing indicator no Telegram (H9).

## Contexto

@packages/dashboard/src/app/api/crons/route.ts — GET cai em mockCronJobs quando core falha (linha 177)
@packages/dashboard/src/app/api/crons/[id]/logs/route.ts — GET cai em mockCronLogs quando core falha (linhas 28-29)
@packages/dashboard/src/app/api/sessions/route.ts — GET cai em mockSessions/mockMessages quando core falha (linhas 66-76)
@packages/core/src/claude-runner.ts — buildArgs usa '/root/.local/bin/claude' hardcoded (linha 192)
@packages/bot/src/handlers/text.ts — processMessage nao envia typing indicator durante streaming

## Tarefas

<task id="1" type="auto">
<files>packages/dashboard/src/app/api/crons/route.ts</files>
<action>
Modificar a funcao GET (linhas 164-178).

**Estado atual (linhas 168-178):**
```typescript
try {
  const jobs = core.listCronJobs();
  if (jobs) {
    return Response.json({ jobs, source: "core" });
  }
} catch (err) {
  console.warn("[api/crons] Core unavailable, using mock data:", err);
}

return Response.json({ jobs: mockCronJobs, source: "mock" });
```

**Substituir por:**
```typescript
try {
  const jobs = core.listCronJobs();
  if (jobs) {
    return Response.json({ jobs, source: "core" });
  }
} catch (err) {
  console.warn("[api/crons] Core unavailable:", err);
}

// H1: Never return mock data — return empty array so UI shows empty state
return Response.json({ jobs: [], source: "empty" });
```

NAO remover o `import { mockCronJobs } from "@/lib/mock-data"` na linha 2 — pode ser util em dev no futuro. Apenas mudar o fallback de `mockCronJobs` para `[]` e source de `"mock"` para `"empty"`.

Atualizar a mensagem do console.warn para nao dizer "using mock data".
</action>
<verify><automated>cd /home/projects/ForgeClaw && grep -n 'mockCronJobs' packages/dashboard/src/app/api/crons/route.ts | grep -v import | wc -l | xargs test 0 -eq && echo "PASS: mockCronJobs not returned in fallback" || echo "FAIL: mockCronJobs still returned"</automated></verify>
<done>GET /api/crons retorna `{ jobs: [], source: "empty" }` quando core falha. Import do mock mantido mas nunca retornado.</done>
</task>

<task id="2" type="auto">
<files>packages/dashboard/src/app/api/crons/[id]/logs/route.ts</files>
<action>
Modificar a funcao GET (linhas 19-30).

**Estado atual (linhas 19-30):**
```typescript
try {
  const logs = core.getCronLogs(jobId);
  if (logs) {
    return Response.json({ logs, source: "core" });
  }
} catch (err) {
  console.warn("[api/crons/logs] Core unavailable, using mock data:", err);
}

const logs = mockCronLogs.filter((l) => l.jobId === jobId);
return Response.json({ logs, source: "mock" });
```

**Substituir por:**
```typescript
try {
  const logs = core.getCronLogs(jobId);
  if (logs) {
    return Response.json({ logs, source: "core" });
  }
} catch (err) {
  console.warn("[api/crons/logs] Core unavailable:", err);
}

// H1: Never return mock data — return empty array so UI shows empty state
return Response.json({ logs: [], source: "empty" });
```

NAO remover o `import { mockCronLogs } from "@/lib/mock-data"` na linha 2. Apenas mudar o fallback.
</action>
<verify><automated>cd /home/projects/ForgeClaw && grep -n 'mockCronLogs' packages/dashboard/src/app/api/crons/\[id\]/logs/route.ts | grep -v import | wc -l | xargs test 0 -eq && echo "PASS: mockCronLogs not returned in fallback" || echo "FAIL: mockCronLogs still returned"</automated></verify>
<done>GET /api/crons/[id]/logs retorna `{ logs: [], source: "empty" }` quando core falha. Import do mock mantido mas nunca retornado.</done>
</task>

<task id="3" type="auto">
<files>packages/dashboard/src/app/api/sessions/route.ts</files>
<action>
Modificar a funcao GET (linhas 61-76, o bloco de fallback).

**Estado atual (linhas 61-76):**
```typescript
} catch (err) {
  console.warn("[api/sessions] Core unavailable:", err);
}

// Fallback to mock
if (topicId) {
  return Response.json({
    messages: mockMessages.filter((m) => m.topicId === Number(topicId)),
    source: "mock",
  });
}

return Response.json({
  sessions: mockSessions,
  source: "mock",
});
```

**Substituir por:**
```typescript
} catch (err) {
  console.warn("[api/sessions] Core unavailable:", err);
}

// H1: Never return mock data — return empty arrays so UI shows empty state
if (topicId) {
  return Response.json({
    messages: [],
    source: "empty",
  });
}

return Response.json({
  sessions: [],
  source: "empty",
});
```

NAO remover os imports de `mockSessions`, `mockMessages`, `mockTopics` na linha 2-6. Apenas mudar o fallback.

ATENCAO: Ha tambem um caso sutil na linha 22-25 onde `msgs` pode ser null:
```typescript
if (topicId) {
  const msgs = core.getMessages(Number(topicId), 100);
  return Response.json({
    messages: msgs ?? [],
    source: msgs ? "core" : "mock",  // <-- mudar "mock" para "empty"
  });
}
```
Mudar `source: msgs ? "core" : "mock"` para `source: msgs ? "core" : "empty"`.
</action>
<verify><automated>cd /home/projects/ForgeClaw && grep -n 'mockSessions\|mockMessages\|mockTopics' packages/dashboard/src/app/api/sessions/route.ts | grep -v import | wc -l | xargs test 0 -eq && echo "PASS: mocks not returned in fallback" || echo "FAIL: mocks still returned"</automated></verify>
<done>GET /api/sessions retorna arrays vazios quando core falha. Nenhum mock data retornado em nenhum caminho de fallback.</done>
</task>

<task id="4" type="auto">
<files>packages/core/src/claude-runner.ts</files>
<action>
Modificar a funcao `buildArgs` (linha 192).

**Estado atual (linha 192):**
```typescript
const claudePath = process.env.CLAUDE_CLI_PATH || '/root/.local/bin/claude';
```

**Substituir por:**
```typescript
const claudePath = process.env.CLAUDE_CLI_PATH || 'claude';
```

Isso faz o fallback usar o `claude` do PATH do sistema, que funciona em qualquer usuario (nao apenas root). A env var `CLAUDE_CLI_PATH` continua como override explicito.

NOTA: O arquivo `packages/core/src/runners/claude-code-cli-runner.ts` ja esta correto — linha 35 usa `'claude'` como fallback na funcao `binary()`. Apenas `claude-runner.ts` tem o path hardcoded.
</action>
<verify><automated>cd /home/projects/ForgeClaw && grep -c '/root/.local/bin/claude' packages/core/src/claude-runner.ts | xargs test 0 -eq && echo "PASS: no hardcoded path" || echo "FAIL: hardcoded path still present"</automated></verify>
<done>ClaudeRunner.buildArgs() usa `'claude'` como fallback, respeitando PATH do sistema. Env var CLAUDE_CLI_PATH continua funcionando como override.</done>
</task>

<task id="5" type="auto">
<files>packages/bot/src/handlers/text.ts</files>
<action>
Adicionar typing indicator loop na funcao `processMessage`.

**Onde inserir:** Imediatamente ANTES do `for await (const event of runner.run(...))` (linha 155), iniciar um interval que envia typing action. Limpar o interval no `finally` do try/catch que envolve o streaming (o try na linha 142).

**Codigo a inserir ANTES da linha 155 (`for await...`):**
```typescript
// H9: Send "typing" chat action every 4s while Claude processes.
// Telegram typing indicator expires after ~5s, so 4s keeps it alive.
const typingInterval = setInterval(async () => {
  try {
    await ctx.api.sendChatAction(chatId, "typing", {
      ...(topicId ? { message_thread_id: topicId } : {}),
    });
  } catch {
    // Ignore — chat action failures are harmless
  }
}, 4000);

// Send initial typing action immediately (don't wait 4s for first one)
ctx.api.sendChatAction(chatId, "typing", {
  ...(topicId ? { message_thread_id: topicId } : {}),
}).catch(() => {});
```

**Onde limpar:** No bloco `finally` que ja existe na linha ~301 (o finally do inner try que contem o streaming loop). Adicionar `clearInterval(typingInterval);` como PRIMEIRA linha do finally:

```typescript
} finally {
  clearInterval(typingInterval);  // <-- adicionar esta linha
  activeRunners.delete(sessionKey);
}
```

**Escopo:** O `typingInterval` deve ser declarado no escopo da funcao `processMessage`, DENTRO do bloco `try` que comeca na linha 142, mas FORA do `for await` loop. Especificamente:

1. Declarar `typingInterval` entre as linhas 153-154 (apos `runOptions` e antes do `for await`)
2. Limpar no `finally` da linha ~301 (inner finally que faz `activeRunners.delete`)

**NAO inserir** dentro do switch/case do event loop. O interval roda em paralelo ao streaming.

**Assinatura grammy:** `ctx.api.sendChatAction(chat_id: number, action: string, other?: { message_thread_id?: number })` — o terceiro parametro e um objeto com opcoes opcionais incluindo message_thread_id para forum topics.
</action>
<verify><automated>cd /home/projects/ForgeClaw && grep -c 'sendChatAction' packages/bot/src/handlers/text.ts | xargs test 2 -le && echo "PASS: typing indicator present" || echo "FAIL: typing indicator missing"</automated></verify>
<done>Typing indicator aparece no Telegram durante todo o processamento Claude. Interval de 4s mantem o indicador ativo. Limpo automaticamente no finally (sucesso ou erro).</done>
</task>

<task id="6" type="checkpoint:human-verify">
<files>packages/bot/src/handlers/text.ts, packages/dashboard/src/app/api/crons/route.ts, packages/dashboard/src/app/api/sessions/route.ts</files>
<action>
Verificacao manual fim-a-fim:

1. **H1 — Mock data:** Abrir dashboard no browser. Se o bot estiver offline ou DB vazio, as tabs de Crons e Sessions devem mostrar empty states (sem dados fake de "Todo dia as 23h30" ou "ForgeClaw Core").

2. **H5 — Claude path:** Verificar que o bot inicia sem erro. Enviar mensagem pelo Telegram e confirmar que Claude responde (se `claude` esta no PATH).

3. **H9 — Typing indicator:** Enviar mensagem pelo Telegram. Observar que o Telegram mostra "typing..." com os 3 pontinhos enquanto Claude processa. O indicador deve sumir quando a resposta final aparece.
</action>
<verify><automated>cd /home/projects/ForgeClaw && grep -c "source.*empty" packages/dashboard/src/app/api/crons/route.ts packages/dashboard/src/app/api/crons/\[id\]/logs/route.ts packages/dashboard/src/app/api/sessions/route.ts</automated></verify>
<done>Todos os 3 fixes funcionam corretamente em teste manual: dashboard mostra empty state, bot usa claude do PATH, typing indicator visivel no Telegram.</done>
</task>

## Criterios de Sucesso

- [ ] Nenhuma API route retorna mock data em fallback (source: "empty" ao inves de "mock")
- [ ] `grep -r '/root/.local/bin/claude' packages/` retorna zero resultados
- [ ] `grep 'sendChatAction' packages/bot/src/handlers/text.ts` retorna pelo menos 2 ocorrencias (initial + interval)
- [ ] Bot inicia sem erro apos mudancas
- [ ] Dashboard mostra empty states quando core esta indisponivel
