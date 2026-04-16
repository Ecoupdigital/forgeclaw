---
phase: 21-mission-control
plan: 21-04
subsystem: dashboard-api
tags: [api, rest, tokens, activities, webhooks, next.js]
dependency_graph:
  requires: [21-01]
  provides: [api/tokens, api/tokens/stats, api/activities, api/webhooks, api/webhooks/:id, api/webhooks/:id/logs]
  affects: [dashboard-ui]
tech_stack:
  added: []
  patterns: [requireApiAuth guard, core wrapper fallback, pt-BR error messages]
key_files:
  created:
    - packages/dashboard/src/app/api/tokens/route.ts
    - packages/dashboard/src/app/api/tokens/stats/route.ts
    - packages/dashboard/src/app/api/activities/route.ts
    - packages/dashboard/src/app/api/webhooks/route.ts
    - packages/dashboard/src/app/api/webhooks/[id]/route.ts
    - packages/dashboard/src/app/api/webhooks/[id]/logs/route.ts
  modified: []
decisions: []
metrics:
  duration: 112s
  completed: 2026-04-16T22:47:47Z
  tasks: 6/6
  files_created: 6
---

# Fase 21 Plano 04: API Routes (Tokens, Activities, Webhooks) Summary

6 REST endpoints serving token usage, activity feed, and webhook CRUD via better-sqlite3 core wrapper with requireApiAuth protection on all routes.

## Tarefas Executadas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | GET /api/tokens | 7741cb1 | tokens/route.ts |
| 2 | GET /api/tokens/stats | 4c77314 | tokens/stats/route.ts |
| 3 | GET /api/activities | 83d251f | activities/route.ts |
| 4 | GET/POST /api/webhooks | 35592eb | webhooks/route.ts |
| 5 | PUT/DELETE /api/webhooks/:id | a76e328 | webhooks/[id]/route.ts |
| 6 | GET /api/webhooks/:id/logs | 999efbd | webhooks/[id]/logs/route.ts |

## Detalhes dos Endpoints

- **GET /api/tokens?days=30** -- Daily aggregated token usage for last N days
- **GET /api/tokens/stats?topLimit=10** -- Aggregate totals + top sessions by consumption
- **GET /api/activities?type=&entityType=&limit=&offset=&since=** -- Chronological activity feed with optional filters
- **GET /api/webhooks** -- List all configured webhooks
- **POST /api/webhooks** -- Create webhook with URL/events validation, auto-generated HMAC secret
- **PUT /api/webhooks/:id** -- Update webhook fields (url, events, enabled)
- **DELETE /api/webhooks/:id** -- Delete webhook (cascade via DB)
- **GET /api/webhooks/:id/logs?limit=50** -- Delivery logs for specific webhook

## Patterns Seguidos

- `requireApiAuth(request)` guard no topo de cada handler (pattern de auth.ts)
- `core.*` wrapper functions com fallback para null quando DB indisponivel
- Response `{ data: [], source: 'core' | 'empty' }` pattern (consistente com sessions/route.ts)
- `params: Promise<{ id: string }>` para dynamic routes (Next.js 15 pattern)
- Error messages em pt-BR
- Limits com cap maximo (365 dias, 500 activities, 200 logs, 50 top sessions)

## Desvios do Plano

Nenhum -- plano executado exatamente como escrito.

## Verificacao

- Next.js build: PASSED (todos 6 endpoints registrados)
- Todos os arquivos criados: CONFIRMED

## Self-Check: PASSOU

- [x] tokens/route.ts exists
- [x] tokens/stats/route.ts exists
- [x] activities/route.ts exists
- [x] webhooks/route.ts exists
- [x] webhooks/[id]/route.ts exists
- [x] webhooks/[id]/logs/route.ts exists
- [x] All 6 commits verified in git log
- [x] Next.js build passes with all routes registered
