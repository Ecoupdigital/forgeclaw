# Agentes Especializados

Agentes sao personas que voce cria pra rodar em topics especificos do Telegram. Cada topic pode ter **um** agente. Se nao tem agente, o topic usa o harness padrao.

Cada agente tem:
- **Nome**
- **Prompt** (prepended ao harness, NAO substitui)
- **Memory mode:** Global / Filtrada / Nenhuma
- **Memory domain filter** (tags — so usado em modo Filtrada)
- **Default runtime:** Claude Code ou Codex

![screenshot](./screenshots/agents-overview.png)

## Criar um agente

No dashboard, abra a aba **Agentes** e clique em **Novo Agente**.

Preencha:

- **Nome:** curto, descritivo. Ex: "Editor de Copy", "Analista Financeiro".
- **Prompt:** 1-5 paragrafos descrevendo papel, tom, limites. Evite reescrever o SOUL.md — apenas diferencie.
- **Memory mode:** veja secao abaixo.
- **Tags:** so se memory mode = Filtrada. Ex: `conteudo, copy, social`.
- **Runtime:** Claude Code (recomendado) ou Codex.

Salvar. O agente aparece na lista.

![screenshot](./screenshots/agents-create.png)

## Modos de memoria

| Modo | O que injeta |
|------|--------------|
| **Global** | Toda a memoria consolidada (MEMORY.md + daily logs). Padrao. |
| **Filtrada** | So memorias com tags do `memory_domain_filter`. Usa `memory_refs.entity_name` como match. |
| **Nenhuma** | Zero memoria. Agente "limpo", so usa o prompt dele + o harness. |

### Quando usar cada um

- **Global:** agente que precisa de contexto amplo. Ex: "Gestor de Clientes" precisa saber de tudo.
- **Filtrada:** agente especialista que quer focar. Ex: "Editor de Copy" so quer ver memorias de conteudo.
- **Nenhuma:** agente de testes, agente de tarefa pontual (parser, formatador), agente que precisa ser reprodutivel.

## Vincular agente a um topic

No dashboard, aba **Sessoes**, cada card de topic tem um dropdown **Agente**. Selecione o agente criado. Mudanca vale a partir da proxima mensagem nesse topic.

![screenshot](./screenshots/agents-bind-topic.png)

Alternativa: API `PUT /api/topics/[id]` com `{ "agent_id": 3 }`.

## Exemplos prontos

### Editor de Copy (criador de conteudo)

```
Nome: Editor de Copy
Memory mode: Filtrada
Tags: conteudo, copy, social
Prompt:
Voce e especialista em copy para social media. Toda resposta em portugues
brasileiro, tom informal, sem jargao. Priorize hooks de 3 segundos.
Sempre termine com 1 sugestao de CTA. Se a pessoa quer "bonito", entregue
estrutura, nao floreio.
```

### Shipper (solo builder)

```
Nome: Shipper
Memory mode: Filtrada
Tags: ship, deploy, release
Prompt:
Voce e o agente de deploy. Foco em embarcar rapido. Toda resposta tem um
checklist acionavel (quais arquivos commit, qual branch, qual servidor).
Se algo e manual e repetitivo, sugere um script.
```

### Financeiro (agencia/freela)

```
Nome: Financeiro
Memory mode: Filtrada
Tags: financeiro, cobranca, cliente
Prompt:
Voce integra com Asaas. Antes de toda resposta sobre cobranca, verifica se
a skill asaas-api esta ativa. Se um cliente aparecer, tras historico dele
(valores, pendencias). Nunca aprove um desconto — so registra o pedido.
```

### SAC (gestor e-commerce)

```
Nome: SAC
Memory mode: Filtrada
Tags: sac, cliente, pedido
Prompt:
Voce responde duvidas de cliente final. Tom educado, direto. Se a duvida e
sobre rastreio, tenta consultar a API da transportadora (Correios/Jadlog).
Se e sobre troca/devolucao, escala humano — informa o cliente que vai ser
respondido em 24h.
```

## O prompt do agente e prepended

O bot monta o contexto assim:

```
[Prompt do agente]  <- se existir
[SOUL.md]
[USER.md]
[AGENTS.md]
[TOOLS.md]
[MEMORY.md filtrada por tags]  <- quando memory_mode=filtered
[STYLE.md]
```

Ou seja: o agente nao apaga o SOUL.md. Ele **especializa** o comportamento por cima. Se o SOUL diz "sem emoji" e o agente diz "tom casual", o agente funciona com tom casual mas sem emoji.

## Problemas comuns

- [Agente nao esta filtrando memoria pelas tags](./troubleshooting.md#agente-nao-filtra-memoria)
- [Vinculei agente ao topic mas nao mudou nada](./troubleshooting.md#agente-nao-aplicou)
