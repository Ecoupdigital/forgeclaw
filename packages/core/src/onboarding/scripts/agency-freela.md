# Roteiro: Agencia / Freela

Este roteiro complementa o system prompt fixo.

## Regras especificas deste arquetipo

- O template base tem placeholders em USER.md para lista de clientes, politica de cobranca, canal preferido.
- Nao tente listar todos os clientes — isso e trabalho pro dashboard depois. Aqui so capture 1-3 ativos e deixe o resto pra edicao posterior.
- Se o usuario usa Asaas/Conta Azul/outra, registre; o template ja menciona ambos.

## Topicos priorizados

### 1. Nome
- **Objetivo:** userName
- **Pergunta sugerida:** "Como quer ser chamado?"
- **Diff:** `set_placeholder userName USER.md`

### 2. Agencia / marca
- **Objetivo:** company (ou "Freela" + nome)
- **Pergunta sugerida:** "Voce opera sob nome de agencia, CNPJ ou como freelancer individual? Qual o nome que aparece pro cliente?"
- **Diff:** `set_placeholder company USER.md`

### 3. Servico principal
- **Objetivo:** role
- **Pergunta sugerida:** "Em uma frase, o que voce entrega pros clientes? (ex: desenvolvimento web, gestao de trafego, SEO, branding...)"
- **Diff:** `set_placeholder role USER.md`

### 4. Diretorio base dos clientes
- **Objetivo:** workingDir (geralmente uma pasta que contem subpastas por cliente)
- **Pergunta sugerida:** "Onde ficam os documentos e projetos de clientes? Caminho absoluto."
- **Diff:** `set_placeholder workingDir USER.md`

### 5. Clientes ativos (resumo)
- **Objetivo:** preencher secao `## Clientes ativos` em USER.md
- **Pergunta sugerida:** "Quantos clientes ativos voce tem agora? Pode citar 1-3 dos principais para eu registrar?"
- **Diff:** `replace_section header="## Clientes ativos" content="- <cliente 1> — <servico>\n- <cliente 2> — <servico>\n..." createIfMissing=false`
- **Nota:** secao JA existe — use createIfMissing=false.

### 6. Ferramenta de cobranca
- **Objetivo:** ajustar a linha `Ferramenta de cobranca: _Asaas / Conta Azul / outra_` em USER.md
- **Pergunta sugerida:** "Qual ferramenta voce usa pra cobrar? Asaas, Conta Azul, PagSeguro, boleto manual?"
- **Diff:** `replace find="Ferramenta de cobranca: _Asaas / Conta Azul / outra_" replace="Ferramenta de cobranca: <escolha>"` em USER.md

### 7. Politica de cobranca
- **Objetivo:** `Politica de cobranca: _a definir (mensal, por projeto, hora, retainer)_`
- **Pergunta sugerida:** "Como voce cobra: mensal (retainer), por projeto, por hora, ou misto?"
- **Diff:** `replace` na linha correspondente em USER.md

### 8. Canal com cliente
- **Objetivo:** `Canal preferido com cliente: _email / WhatsApp / reuniao_`
- **Pergunta sugerida:** "Canal principal com cliente: email, WhatsApp, Slack, reuniao recorrente?"
- **Diff:** `replace` na linha em USER.md

## Sinal de `done` antecipado

Com topicos 1-5 respondidos ja e valioso. Cobranca e canal sao bonus.
