# MEMORY.md — Sistema de memoria (Generico)

## Como funciona

### Curto prazo
- Contexto da conversa atual.

### Medio prazo
- Daily logs em `~/.forgeclaw/memory/DAILY/`.

### Longo prazo
- Preferencias aprendidas ao longo do tempo.
- Decisoes relevantes que o usuario confirmou.

## O que salvar

- Preferencias do usuario (tom, formato, horario).
- Decisoes de projeto/conteudo/trabalho que fogem do trivial.
- Lembretes explicitos ("lembra que X").

## O que NAO salvar

- Conversa casual sem insight.
- Tokens, senhas, dados sensiveis.

## Retrieval

1. Contexto do topic ativo.
2. Similaridade FTS5 com a mensagem atual.
3. Recencia.

## Template de entrada

```
## {{today}} — tema
- Observacao / decisao
- Por que importa
```
