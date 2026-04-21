# Roteiro: Gestor E-commerce

Este roteiro complementa o system prompt fixo.

## Regras especificas deste arquetipo

- O template base tem placeholders para plataforma, gateway, ERP, ads, atendimento, e metas numericas (faturamento, margem, ROAS, CPA).
- Metas sao sensiveis — se o usuario nao quiser informar valor, aceite "a definir" e nao insista.
- Plataforma e dado critico: Shopify e Woo tem integracoes bem diferentes. Pergunte cedo.

## Topicos priorizados

### 1. Nome
- **Objetivo:** userName
- **Pergunta sugerida:** "Como quer ser chamado?"
- **Diff:** `set_placeholder userName USER.md`

### 2. Loja / marca
- **Objetivo:** company
- **Pergunta sugerida:** "Qual o nome da loja / marca?"
- **Diff:** `set_placeholder company USER.md`

### 3. Cargo
- **Objetivo:** role (ex: "dono", "gestor de trafego", "gestor de e-commerce full-stack")
- **Pergunta sugerida:** "Qual seu papel na operacao? Dono, gestor, socio, responsavel por trafego?"
- **Diff:** `set_placeholder role USER.md`

### 4. Plataforma
- **Objetivo:** preencher linha `Plataforma: _Shopify / WooCommerce / Nuvemshop / outra_` em USER.md
- **Pergunta sugerida:** "Em qual plataforma a loja roda? Shopify, Woo, Nuvemshop, Tray, outra?"
- **Diff:** `replace find="Plataforma: _Shopify / WooCommerce / Nuvemshop / outra_" replace="Plataforma: <escolha>"` em USER.md

### 5. Ads
- **Objetivo:** linha `Ads: _Meta Ads / Google Ads / TikTok Ads / ..._`
- **Pergunta sugerida:** "Quais canais de ads voce usa? Meta, Google, TikTok, organico?"
- **Diff:** `replace` na linha correspondente em USER.md

### 6. ERP / estoque
- **Objetivo:** linha `ERP / estoque: _TinyERP / Bling / outra_`
- **Pergunta sugerida:** "Qual ERP/sistema de estoque? Tiny, Bling, nenhum, outro?"
- **Diff:** `replace` na linha em USER.md

### 7. Atendimento
- **Objetivo:** linha `Atendimento: _WhatsApp (...) / Instagram DM / chat_`
- **Pergunta sugerida:** "Onde voce atende cliente final? WhatsApp, Instagram DM, chat na loja?"
- **Diff:** `replace` em USER.md

### 8. Meta de faturamento
- **Objetivo:** linha `Faturamento mensal: _a definir_`
- **Pergunta sugerida:** "Meta de faturamento mensal (pode ser faixa). Se preferir nao dizer, tudo bem."
- **Diff:** `replace find="Faturamento mensal: _a definir_" replace="Faturamento mensal: <valor ou 'a definir'>"` em USER.md

## Sinal de `done` antecipado

Topicos 1-4 (nome/loja/cargo/plataforma) ja sao base critica — se o usuario pular 5-8, pode emitir `done`.
