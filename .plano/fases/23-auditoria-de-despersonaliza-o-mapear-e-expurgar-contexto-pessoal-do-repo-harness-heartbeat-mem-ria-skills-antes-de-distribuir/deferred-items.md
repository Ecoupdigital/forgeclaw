# Deferred Items — Fase 23

Itens descobertos durante a execucao dos planos da fase 23 que sao fora de escopo, mas devem ser enderecados em fase futura.

## 23-02

### Pre-existing typecheck errors em @forgeclaw/core

Detectados ao rodar `bun run --filter=@forgeclaw/core typecheck` em 2026-04-21 como verificacao de regressao das tarefas 3 e 4. Erros **pre-existiam** antes das mudancas de 23-02 (confirmado via `git diff`: 23-02 apenas alterou comentarios e strings).

- `src/index.ts:11` — Module './memory-manager' has already exported a member named 'MemoryManager'
- `src/runners/codex-cli-runner.ts:247,249,251` — Property 'once' does not exist on ChildProcess
- `src/runners/registry.ts:149,154` — Property 'on' does not exist on ChildProcessByStdio

Acao recomendada: sub-plano de hygiene em fase futura (provavel pos-31, junto com publicacao beta).

### Sugestao: gerador dinamico de systemd units (se ainda nao existir)

Task 7 decidiu converter `ops/*.service` em templates `.example`. Se o installer CLI ainda nao gera units dinamicamente, abrir plano para criar o gerador (referenciar placeholders dos templates).
