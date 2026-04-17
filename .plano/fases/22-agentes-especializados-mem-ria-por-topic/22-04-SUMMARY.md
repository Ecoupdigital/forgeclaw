---
phase: 22-agentes-especializados-mem-ria-por-topic
plan: 22-04
subsystem: dashboard
tags: [dashboard, agents, ui, crud, topics]
dependency_graph:
  requires: [22-01, 22-02]
  provides: [agents-tab, agent-topic-binding-ui]
  affects: [dashboard-shell, session-sidebar, sessions-tab, sessions-api]
tech_stack:
  added: []
  patterns: [inline-toast, tag-chips-input, native-select-dropdown]
key_files:
  created:
    - packages/dashboard/src/components/agents-tab.tsx
  modified:
    - packages/dashboard/src/components/dashboard-shell.tsx
    - packages/dashboard/src/app/page.tsx
    - packages/dashboard/src/components/session-sidebar.tsx
    - packages/dashboard/src/components/sessions-tab.tsx
    - packages/dashboard/src/app/api/sessions/route.ts
decisions: []
metrics:
  duration: 220s
  completed: 2026-04-17T23:31:25Z
---

# Fase 22 Plano 04: Dashboard UI -- Aba Agentes + Agent Dropdown em Topics Summary

Aba Agentes no dashboard com CRUD completo (cards, formulario inline, tag chips, badges) e dropdown de vinculacao de agente nos topic cards do session sidebar, tudo conectado aos endpoints REST criados no 22-02.

## Tarefas Executadas

| Tarefa | Descricao | Commit | Arquivos |
|--------|-----------|--------|----------|
| 1 | Add Agentes tab to dashboard shell | 8795a05 | dashboard-shell.tsx |
| 2 | Create AgentsTab component with full CRUD | e6aefd6 | agents-tab.tsx (new) |
| 3 | Wire AgentsTab into page.tsx | f6b45f5 | page.tsx |
| 4 | Add agent dropdown to session sidebar | 79d0803 | session-sidebar.tsx |
| 5 | Pipe agentId through sessions API | bcaaeca | sessions-tab.tsx, api/sessions/route.ts |

## Detalhes de Implementacao

### AgentsTab (agents-tab.tsx)
- Grid de cards com nome, badge de memory mode (Global/Filtrado), badge de runtime, contagem de topics vinculados
- Formulario inline de criacao/edicao com: nome (Input), system prompt (textarea 6 rows), memory mode (select), tag chips (input + Enter), runtime (select)
- Delete com confirmacao inline (Confirmar/Cancelar)
- Toast inline para feedback (sucesso/erro, 3s timeout)
- Todos labels em pt-BR
- Fetch de topic counts via GET /api/agents/[id] para cada agente

### Session Sidebar Agent Dropdown
- Fetch de agentes no mount para popular dropdown
- Select nativo por topic card com "Sem agente" + lista de agentes
- PUT /api/topics/[id]/agent no onChange
- stopPropagation no onClick para evitar selecao de topic ao clicar no dropdown
- Estado local otimista (atualiza antes da resposta do servidor)

### Pipeline de dados agentId
- API /api/sessions enriquece response com agentId do topics table
- SessionData interface recebeu campo agentId
- sidebarTopics useMemo inclui agentId no mapeamento
- TopicInfo type ja tinha agentId (do 22-01)

## Desvios do Plano

Nenhum -- plano executado exatamente como escrito.

## Verificacao

- TypeScript type-check passou sem erros (tsc --noEmit)
- Todos os 5 commits atomicos criados com sucesso

## Self-Check: PASSOU

Todos os arquivos criados/modificados existem e todos os commits estao presentes no historico git.
