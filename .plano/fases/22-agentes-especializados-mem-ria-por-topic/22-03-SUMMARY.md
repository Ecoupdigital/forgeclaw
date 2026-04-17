---
phase: 22-agentes-especializados-mem-ria-por-topic
plan: 22-03
subsystem: core-logic
tags: [context-builder, memory-filtering, agent-wiring, persona]
dependency_graph:
  requires: [22-01]
  provides: [context-builder-agent-support, memory-entity-filtering, agent-topic-wiring]
  affects: [text-handler, ws-server, memory-manager, builtin-provider]
tech_stack:
  added: []
  patterns: [entity-filter-post-filtering, agent-persona-prepend, priority-chain-runtime]
key_files:
  created: []
  modified:
    - packages/core/src/memory/types.ts
    - packages/core/src/memory/builtin-provider.ts
    - packages/core/src/memory/manager.ts
    - packages/core/src/context-builder.ts
    - packages/bot/src/handlers/text.ts
    - packages/core/src/ws-server.ts
decisions:
  - "topicRow loading moved before ContextBuilder.build() in text.ts to enable agent lookup before context assembly"
  - "Entity filtering uses post-filter strategy (fetch 20, filter, cap at 5) to avoid starving result set"
  - "Agent runtime priority chain: agent > topic > config default"
metrics:
  duration: "3m10s"
  completed: "2026-04-17T23:24:59Z"
  tasks: 6
  files_modified: 6
---

# Fase 22 Plano 03: Core Logic -- ContextBuilder + Memory Filtering + Wiring Summary

ContextBuilder aceita AgentConfig opcional para injetar system_prompt como persona e filtrar memoria por entity tags via memory_refs quando memoryMode='filtered'. text.ts e ws-server.ts carregam agente do topic e passam ao ContextBuilder com prioridade de runtime agent > topic > config.

## Tarefas Executadas

| # | Descricao | Commit | Arquivos |
|---|-----------|--------|----------|
| 1 | entityFilter em MemoryProvider interface | 0516e39 | memory/types.ts |
| 2 | Filtro por entity tags em BuiltinMemoryProvider | ebd2317 | memory/builtin-provider.ts |
| 3 | Propagacao de entityFilter em MemoryManager.prefetchAll | 506f4fa | memory/manager.ts |
| 4 | ContextBuilder aceita AgentConfig + persona + entityFilter | 8fb2b0d | context-builder.ts |
| 5 | text.ts carrega agent e passa ao ContextBuilder | 2889da2 | handlers/text.ts |
| 6 | ws-server.ts carrega agent e passa ao ContextBuilder | 17e06b2 | ws-server.ts |

## Cadeia Completa

```
topic (agentId) --> stateStore.getAgent(id) --> AgentConfig
  --> ContextBuilder.build(..., agentConfig)
    --> parts.push(agent.systemPrompt)         // persona prepend
    --> entityFilter = agent.memoryDomainFilter // when memoryMode='filtered'
    --> memoryManagerV2.prefetchAll(..., entityFilter)
      --> provider.prefetch(query, { entityFilter })
        --> store.search(query, 20)            // wider search
        --> post-filter by memory_refs.entity_name
        --> cap at 5 results
```

## Desvios do Plano

### Issues Auto-corrigidos

**1. [Regra 3 - Bloqueante] topicRow carregado antes de ContextBuilder.build() em text.ts**
- **Encontrado durante:** Tarefa 5
- **Issue:** O plano assumia que topicRow era resolvido antes de build(), mas no codigo real topicRow era carregado DEPOIS (linha 146 vs build na linha 140). Para carregar o agente e passa-lo ao build, topicRow precisava ser movido para antes.
- **Correcao:** Movido `const topicRow = stateStore.getTopicByChatAndThread(...)` para antes da chamada a `contextBuilder.build()`, junto com o bloco de agent loading.
- **Arquivos modificados:** packages/bot/src/handlers/text.ts
- **Commit:** 2889da2

## Self-Check: PASSOU

- [x] packages/core/src/memory/types.ts -- entityFilter em prefetch e queuePrefetch
- [x] packages/core/src/memory/builtin-provider.ts -- filtro por entity tags
- [x] packages/core/src/memory/manager.ts -- prefetchAll propaga entityFilter
- [x] packages/core/src/context-builder.ts -- AgentConfig, systemPrompt, entityFilter
- [x] packages/bot/src/handlers/text.ts -- agentConfig loading e passagem
- [x] packages/core/src/ws-server.ts -- agentConfig loading e passagem
- [x] Commits: 0516e39, ebd2317, 506f4fa, 8fb2b0d, 2889da2, 17e06b2 -- todos verificados
- [x] TypeScript: nenhum erro novo introduzido (pre-existentes em codex-cli-runner/registry nao relacionados)
