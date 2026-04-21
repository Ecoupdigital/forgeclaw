# MEMORY.md — Sistema de memoria (Agencia / Freela)

## Como funciona

### Curto prazo
- Conversa atual sobre o cliente no topic.

### Medio prazo
- Daily logs de progresso por cliente.
- Historico recente de cobrancas e recebimentos.

### Longo prazo
- Perfil de cada cliente (contato principal, stack, particularidades).
- Escopo contratado (o que esta dentro e fora).
- Historico de problemas com o cliente.

## O que salvar

- Dados de contato do cliente (so publicos/acordados).
- Escopo do contrato.
- Datas-chave (inicio, renovacao, fim).
- Decisoes importantes validadas por email.

## O que NAO salvar

- Dados sensiveis brutos (senhas, tokens, documentos internos do cliente sem autorizacao).
- Conversa informal sem insight.

## Retrieval

Memoria e buscada por:
1. Cliente vinculado ao topic ativo.
2. Similaridade FTS5 com a mensagem.
3. Recencia.

## Template de entrada

```
## {{today}} — [cliente] assunto
- Decisao / pendencia
- Proximo passo e prazo
- Com quem foi tratado
```
