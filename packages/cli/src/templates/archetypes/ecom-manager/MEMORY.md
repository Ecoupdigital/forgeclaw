# MEMORY.md — Sistema de memoria (Gestor E-commerce)

## Como funciona

### Curto prazo
- Vendas de hoje, campanhas ativas hoje, tickets de SAC abertos.

### Medio prazo
- Daily logs com snapshot de vendas, ROAS, estoque critico.

### Longo prazo
- Comportamento sazonal (Black Friday, Dia das Maes).
- Top SKUs historicos.
- Publicos que converteram melhor.
- Problemas recorrentes em logistica / fornecedor.

## O que salvar

- Numero bruto + contexto (data, fonte, comparacao).
- Decisoes de campanha (pausou, escalou, testou novo criativo).
- Eventos que afetaram venda (fora de estoque, problema no gateway, virada de lua).
- Scripts de atendimento validados.

## O que NAO salvar

- Dados pessoais brutos de clientes.
- Conversas de SAC completas (so o padrao resolvido).

## Retrieval

1. Categoria/SKU mencionada.
2. Campanha ativa.
3. Recencia (hoje > ontem > semana passada).

## Template de entrada

```
## {{today}} — [canal] assunto
- Numero: ...
- Comparacao: vs ontem / vs mesmo dia semana passada
- Hipotese: ...
- Acao tomada: ...
```
