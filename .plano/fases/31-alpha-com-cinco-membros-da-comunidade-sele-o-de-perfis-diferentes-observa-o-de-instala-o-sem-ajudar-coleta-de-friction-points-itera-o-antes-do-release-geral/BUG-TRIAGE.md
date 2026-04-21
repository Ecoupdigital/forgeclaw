# Bug Triage — Alpha Fase 31

Lista consolidada de todos os bugs reportados durante o alpha, com gravidade, SLA e status.

## Matriz de gravidade

| Gravidade | Criterio | SLA |
|-----------|----------|-----|
| Critico   | Impede install/uso basico. Exemplo: dashboard nao abre, install crasha, primeiro mensagem nunca e respondida. | <= 24h |
| Medio     | Feature trava mas tem workaround. Exemplo: cron nao salva mas pode editar HEARTBEAT.md direto. | <= 3 dias |
| Menor     | Detalhe que nao afeta fluxo principal. Exemplo: badge com cor errada. | Pos-alpha |

## Fluxo por bug

1. Alpha reporta no grupo privado ou DM.
2. Jonathan abre issue em `github.com/Ecoupdigital/forgeclaw/issues` com label `alpha-critical` / `alpha-medium` / `alpha-minor`.
3. Adiciona entry nesta tabela.
4. Fixa conforme SLA.
5. Atualiza coluna `status` e `fix commit` aqui.
6. Se fix critico, comunica no grupo: "Pull main + bun install + forgeclaw update pra retomar."

## Log de bugs

| # | Data | Alpha (username) | Gravidade | Titulo | Descricao/Stack | Issue URL | Status | Fix commit | Notas |
|---|------|------------------|-----------|--------|-----------------|-----------|--------|------------|-------|
| 1 |      |                  |           |        |                 |           | open   |            |       |

## Estatisticas (preencher no D+8)

- Total de bugs reportados: ___
- Criticos: ___ (fixados em <=24h: ___ de ___)
- Medios: ___ (fixados em <=3 dias: ___ de ___)
- Menores: ___ (deferidos para pos-alpha: ___)
- Taxa de SLA atingido: ___%
