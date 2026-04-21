# MEMORY.md — Sistema de memoria (Solo Builder)

## Como funciona

### Curto prazo
- Conversa atual (sessao)
- Ultimos comandos e resultados

### Medio prazo
- Daily logs em `~/.forgeclaw/memory/DAILY/YYYY-MM-DD.md`
- Preferencias aprendidas nas conversas

### Longo prazo
- Fatos permanentes (stack preferida, convencoes, links de projetos).
- Consolidados diariamente as 23h55 pelo janitor.

## O que salvar

- Decisoes tecnicas (escolha de biblioteca, versao, trade-off).
- Convencoes de projeto (estilo de commit, branch, deploy).
- Bugs recorrentes e a causa-raiz.
- Links de repos, dashboards, docs internos.

## O que NAO salvar

- Logs de execucao crus.
- Conteudo sensivel (tokens, senhas -- sempre rejeitar).
- Ruido de conversa ("obrigado", "blz").

## Retrieval

Memoria e buscada por:
1. Contexto do topic/agente ativo.
2. Similaridade FTS5 com a mensagem atual.
3. Recencia (ultimas 24h com peso maior).

## Template de entrada

```
## {{today}} — [projeto] tema curto
- Decisao: X
- Por que: Y
- Arquivo afetado: caminho/do/arquivo
```
