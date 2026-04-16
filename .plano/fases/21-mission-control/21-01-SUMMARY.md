---
phase: 21-mission-control
plan: 21-01
subsystem: mission-control-foundation
tags: [schema, types, eventbus, sqlite, migration]
dependency_graph:
  requires: []
  provides: [token_usage-table, activities-table, webhooks-table, webhook_delivery_logs-table, mission-control-types, activity-created-event]
  affects: [state-store, event-bus, dashboard-core]
tech_stack:
  added: []
  patterns: [idempotent-migration, row-mapper, better-sqlite3-mirror]
key_files:
  created: []
  modified:
    - packages/core/src/types.ts
    - packages/core/src/event-bus.ts
    - packages/core/src/state-store.ts
    - packages/dashboard/src/lib/types.ts
    - packages/dashboard/src/lib/core.ts
decisions: []
metrics:
  duration: 210s
  completed: 2026-04-16T22:38:08Z
---

# Fase 21 Plano 01: Schema, Types & EventBus Extension Summary

Fundacao de dados para Mission Control: tabelas SQLite (token_usage, activities, webhooks, webhook_delivery_logs) com migrations idempotentes, tipos TypeScript espelhados em core e dashboard, e evento activity:created no EventBus.

## Tarefas Executadas

| # | Nome | Commit | Arquivos |
|---|------|--------|----------|
| 1 | Mission Control types em core/types.ts | 289760b | packages/core/src/types.ts |
| 2 | activity:created no EventBus | fee6d72 | packages/core/src/event-bus.ts |
| 3 | Migrations + CRUD no StateStore | 9d4254b | packages/core/src/state-store.ts |
| 4 | Types mirror no dashboard | b1d37d6 | packages/dashboard/src/lib/types.ts |
| 5 | Data access functions no dashboard/core.ts | 68b8ab3 | packages/dashboard/src/lib/core.ts |

## Desvios do Plano

Nenhum - plano executado exatamente como escrito.

## Notas Tecnicas

- Erros pre-existentes no tsc (codex-cli-runner.ts, registry.ts, index.ts) nao sao relacionados a estas mudancas e permanecem inalterados
- Dashboard compila limpo com zero erros
- Todas as migrations usam CREATE TABLE IF NOT EXISTS (idempotentes)
- Row types e mappers seguem o pattern existente do projeto (SessionRow/mapSessionRow, etc.)

## Self-Check: PASSOU

- [x] packages/core/src/types.ts - ENCONTRADO, contem TokenUsage, Activity, Webhook, WebhookDeliveryLog
- [x] packages/core/src/event-bus.ts - ENCONTRADO, contem activity:created
- [x] packages/core/src/state-store.ts - ENCONTRADO, contem token_usage, activities, webhooks tables + CRUD
- [x] packages/dashboard/src/lib/types.ts - ENCONTRADO, contem types mirror
- [x] packages/dashboard/src/lib/core.ts - ENCONTRADO, contem data access functions
- [x] Commit 289760b - ENCONTRADO
- [x] Commit fee6d72 - ENCONTRADO
- [x] Commit 9d4254b - ENCONTRADO
- [x] Commit b1d37d6 - ENCONTRADO
- [x] Commit 68b8ab3 - ENCONTRADO
