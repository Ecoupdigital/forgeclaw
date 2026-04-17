---
phase: 22-agentes-especializados-mem-ria-por-topic
plan: 22-01
subsystem: data-layer
tags: [agents, schema, types, crud, sqlite]
dependency_graph:
  requires: []
  provides: [agents-table, agent-config-type, agent-crud, topic-agent-fk]
  affects: [state-store, dashboard-core, api-topics]
tech_stack:
  added: []
  patterns: [idempotent-migration, pragma-table-info-gate, row-mapper]
key_files:
  created: []
  modified:
    - packages/core/src/types.ts
    - packages/core/src/state-store.ts
    - packages/dashboard/src/lib/types.ts
    - packages/dashboard/src/lib/core.ts
    - packages/dashboard/src/app/api/topics/route.ts
decisions: []
metrics:
  duration: 178s
  completed: 2026-04-17T23:19:29Z
---

# Fase 22 Plano 01: Schema + Tipos + Data Access Layer Summary

Tabela `agents` no SQLite com CRUD completo em StateStore (Bun) e core.ts (better-sqlite3), FK `agent_id` em `topics`, tipos AgentConfig/MemoryMode em core e dashboard.

## Tarefas Executadas

| Tarefa | Descricao | Commit | Arquivos |
|--------|-----------|--------|----------|
| 1 | AgentConfig + MemoryMode types no core | b399d7f | packages/core/src/types.ts |
| 2 | Migration agents + CRUD no StateStore | a53f334 | packages/core/src/state-store.ts |
| 3 | AgentConfig + MemoryMode types no dashboard | 61e0324 | packages/dashboard/src/lib/types.ts |
| 4 | CRUD agents no dashboard core.ts | 78da564 | packages/dashboard/src/lib/core.ts |
| 5 | agentId no GET /api/topics | 9df7079 | packages/dashboard/src/app/api/topics/route.ts |

## Detalhes de Implementacao

### Tabela agents (SQLite)
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `name` TEXT NOT NULL
- `system_prompt` TEXT
- `memory_mode` TEXT NOT NULL DEFAULT 'global'
- `memory_domain_filter` TEXT (JSON array)
- `default_runtime` TEXT
- `created_at` INTEGER NOT NULL
- `updated_at` INTEGER NOT NULL

### FK topics.agent_id
- Adicionada via migration idempotente (PRAGMA table_info gate)
- REFERENCES agents(id)
- NULL = no agent linked

### CRUD StateStore (Bun)
- createAgent, getAgent, listAgents, updateAgent, deleteAgent, updateTopicAgent
- deleteAgent desvincula topics antes de deletar (SET agent_id = NULL)

### CRUD dashboard core.ts (better-sqlite3)
- Mesmos metodos, pattern de retorno null/false seguindo convencao existente
- listTopicsByAgent adicional para queries por agente

## Desvios do Plano

Nenhum - plano executado exatamente como escrito.

## Verificacao

- Dashboard build: PASSED (exit code 0)
- Todas queries de topics atualizadas para incluir agent_id
- Tipos espelhados entre core e dashboard

## Self-Check: PASSED
