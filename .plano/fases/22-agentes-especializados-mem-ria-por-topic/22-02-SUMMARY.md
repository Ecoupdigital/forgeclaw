---
phase: 22-agentes-especializados-mem-ria-por-topic
plan: 22-02
subsystem: dashboard-api
tags: [api, agents, crud, rest]
dependency_graph:
  requires: [22-01]
  provides: [agents-api, topic-agent-binding-api]
  affects: [dashboard-frontend]
tech_stack:
  added: []
  patterns: [next-api-routes, requireApiAuth, core-wrapper]
key_files:
  created:
    - packages/dashboard/src/app/api/agents/route.ts
    - packages/dashboard/src/app/api/agents/[id]/route.ts
    - packages/dashboard/src/app/api/topics/[id]/agent/route.ts
  modified: []
decisions: []
metrics:
  duration: 84s
  completed: 2026-04-17T23:22:57Z
---

# Fase 22 Plano 02: API Routes para Agents CRUD Summary

REST API completa para CRUD de agentes e vinculacao agente-topic, seguindo padrao existente de rotas com requireApiAuth e core wrapper.

## Tarefas Executadas

| Tarefa | Descricao | Commit | Arquivos |
|--------|-----------|--------|----------|
| 1 | GET + POST /api/agents | a4800d6 | agents/route.ts |
| 2 | GET/PUT/DELETE /api/agents/[id] | f3d163d | agents/[id]/route.ts |
| 3 | PUT /api/topics/[id]/agent | e30a6f3 | topics/[id]/agent/route.ts |

## Detalhes de Implementacao

### Task 1: GET + POST /api/agents
- GET retorna `{ agents: AgentConfig[], source: "core" }` ou array vazio se DB indisponivel
- POST valida name (obrigatorio), memoryMode (global|filtered), memoryDomainFilter (obrigatorio se filtered), defaultRuntime (claude-code|codex|null)
- Retorna 201 com id e agent criado

### Task 2: GET/PUT/DELETE /api/agents/[id]
- GET retorna agent + topics vinculados via `listTopicsByAgent`
- PUT faz update parcial com validacao de estado final (memoryMode+filter combinados)
- DELETE remove agente (core.deleteAgent desvincula topics automaticamente)
- Todas validam id numerico positivo e existencia do agente

### Task 3: PUT /api/topics/[id]/agent
- Vincula (agentId=number) ou desvincula (agentId=null) agente de topic
- Valida existencia do agente e do topic antes de atualizar

## Verificacao

- TypeScript: `tsc --noEmit` passou sem erros
- Todas as rotas seguem padrao existente (requireApiAuth, core wrapper, Response.json)

## Desvios do Plano

Nenhum - plano executado exatamente como escrito.

## Self-Check: PASSOU

- [x] packages/dashboard/src/app/api/agents/route.ts existe
- [x] packages/dashboard/src/app/api/agents/[id]/route.ts existe
- [x] packages/dashboard/src/app/api/topics/[id]/agent/route.ts existe
- [x] Commits a4800d6, f3d163d, e30a6f3 existem
