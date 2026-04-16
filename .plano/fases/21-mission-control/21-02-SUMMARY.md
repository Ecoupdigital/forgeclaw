---
phase: 21-mission-control
plan: 21-02
subsystem: mission-control
tags: [token-usage, activity-tracking, event-bus, recorder]
dependency_graph:
  requires: [21-01]
  provides: [token-recorder, activity-recorder, stream:done-emit, activity:created-emit]
  affects: [ws-server, bot/text, bot/index, core/index]
tech_stack:
  added: []
  patterns: [event-driven-recorder, singleton-start-guard]
key_files:
  created:
    - packages/core/src/token-recorder.ts
    - packages/core/src/activity-recorder.ts
  modified:
    - packages/core/src/ws-server.ts
    - packages/bot/src/handlers/text.ts
    - packages/core/src/index.ts
    - packages/bot/src/index.ts
decisions:
  - "cfgForRuntime.claudeModel used as model source in ws-server (runOptions has no model field)"
  - "Recorders initialized before webhookDispatcher in boot sequence for correct EventBus pipeline order"
metrics:
  duration: 176s
  completed: 2026-04-16T22:43:05Z
  tasks: 5/5
  files_created: 2
  files_modified: 4
---

# Fase 21 Plano 02: Token Recorder & Activity Recorder Summary

Dois modulos core que capturam dados de uso de tokens (via stream:done) e atividades do sistema (sessao, mensagem, cron), persistindo no SQLite e emitindo activity:created para consumers downstream.

## Tarefas Completadas

| Tarefa | Nome | Commit | Arquivos Chave |
|--------|------|--------|----------------|
| 1 | token-recorder.ts | 731a2b9 | packages/core/src/token-recorder.ts |
| 2 | Emit stream:done com dados completos | 115bfb7 | ws-server.ts, text.ts |
| 3 | activity-recorder.ts | e49f223 | packages/core/src/activity-recorder.ts |
| 4 | Re-exports no core/index.ts | 4349130 | packages/core/src/index.ts |
| 5 | Inicializacao no bot startup | 85708bc | packages/bot/src/index.ts |

## Detalhes de Implementacao

### Token Recorder (token-recorder.ts)
- Escuta `stream:done` no EventBus
- Extrai sessionKey, topicId, usage (input/output/cache_creation/cache_read), model, source
- Persiste via `stateStore.createTokenUsage()`
- Guard de singleton (`started` flag) para chamada idempotente

### Activity Recorder (activity-recorder.ts)
- Escuta 6 eventos: session:created, session:resumed, message:incoming, message:outgoing, cron:fired, cron:result
- Mapeia para ActivityType correto (ex: message:incoming -> message:sent, cron:result -> cron:completed|cron:failed)
- Persiste via `stateStore.createActivity()`
- Emite `activity:created` apos cada write para webhook dispatcher e dashboard feed

### Stream Emitters (ws-server.ts, text.ts)
- Tipo de `usage` expandido para incluir `cache_creation_input_tokens` e `cache_read_input_tokens`
- Novo `eventBus.emit('stream:done', {...})` em ambos os arquivos
- ws-server usa source='dashboard', text.ts usa source='telegram'
- Model extraido de config (claudeModel) ja que runOptions nao carrega model

## Desvios do Plano

### Issues Auto-corrigidos

**1. [Regra 1 - Bug] Model source em ws-server.ts**
- **Encontrado durante:** Tarefa 2
- **Issue:** Plano sugeria `runOptions.model` mas runOptions nao tem campo model no ws-server
- **Correcao:** Usado `cfgForRuntime.claudeModel` que ja estava disponivel no escopo
- **Arquivos modificados:** packages/core/src/ws-server.ts
- **Commit:** 115bfb7

**2. [Regra 3 - Bloqueante] webhook-dispatcher ja exportado em index.ts**
- **Encontrado durante:** Tarefa 4
- **Issue:** core/index.ts ja tinha `export * from './webhook-dispatcher'` (de 21-03 executado antes)
- **Correcao:** Adicionado exports de token-recorder e activity-recorder apos webhook-dispatcher
- **Commit:** 4349130

**3. [Regra 3 - Bloqueante] startWebhookDispatcher ja importado em bot/index.ts**
- **Encontrado durante:** Tarefa 5
- **Issue:** bot/index.ts ja importava startWebhookDispatcher (21-03 executado antes)
- **Correcao:** Adicionado startTokenRecorder e startActivityRecorder ao import existente, chamados antes do webhookDispatcher
- **Commit:** 85708bc

## Self-Check: PASSOU

Verificacao de arquivos e commits realizada com sucesso.
