# Deferred Items — Fase 24

Itens descobertos durante a execucao desta fase que estao FORA do escopo
dos planos 24-XX e devem ser tratados separadamente.

## 1. `packages/cli/src/commands/install.ts:22` nao resolve `@forgeclaw/core`

**Descoberto em:** 24-01 tarefa 6 (typecheck final)
**Mensagem:**
```
packages/cli/src/commands/install.ts(22,32): error TS2307:
Cannot find module '@forgeclaw/core' or its corresponding type declarations.
```

**Diagnostico rapido:**
- Erro existe em `HEAD~5` (antes das tarefas de 24-01 comecarem), validado via `git stash`.
- Provavelmente falta a dependencia `@forgeclaw/core` em `packages/cli/package.json` (hoje so tem `@clack/prompts`).
- Nao afeta os arquivos novos em `packages/cli/src/templates/archetypes/*`.
- Nao bloqueia Fase 24; bloqueara a Fase 25 quando o installer for escrever arquivos reais.

**Acao sugerida:** Adicionar `"@forgeclaw/core": "workspace:*"` em `packages/cli/package.json` como primeira tarefa do primeiro plano da Fase 25 (CLI installer em duas fases).
