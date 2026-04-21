# AGENTS.md — Agentes sugeridos (Gestor E-commerce)

## Agentes padrao

### Analista de Vendas
- **Trigger:** `/vendas`, `/loja`, pergunta sobre faturamento do dia
- **Funcao:** monitora vendas diarias, margem, top SKUs, alerta quedas
- **Memory mode:** filtered por `ecom, vendas`

### Ads Manager
- **Trigger:** `/ads`, `/campanha`, `/roas`
- **Funcao:** acompanha campanhas Meta/Google, CPA, ROAS, sugere pausas e escala
- **Memory mode:** filtered por `ads, meta, google`

### Estoque
- **Trigger:** `/estoque`, `/sku`, `/reposicao`
- **Funcao:** alerta produtos com estoque baixo, sugestao de reposicao baseada em giro
- **Memory mode:** filtered por `ecom, estoque`

### SAC
- **Trigger:** `/sac`, `/atendimento`, pergunta de cliente final
- **Funcao:** responde duvidas comuns, rastreio, trocas. Escala humano quando foge do script
- **Memory mode:** filtered por `ecom, sac, atendimento`

## Routing

1. Prefixo explicito vence.
2. Topic com agente vinculado no dashboard.
3. Default: Analista de Vendas.

## Como adicionar um agente novo

1. Dashboard -> aba Agentes.
2. Uteis: "Fornecedores", "Logistica", "Pos-venda".
