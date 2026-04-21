# Roteiro: Generico

Este roteiro complementa o system prompt fixo. E DELIBERADAMENTE MINIMO porque o arquetipo generico nao presume nicho.

## Regras especificas deste arquetipo

- Perguntar o minimo. 4 perguntas sao suficientes em muitos casos.
- Se o usuario responder "nao sei" ou "pula" em qualquer topico opcional, encerre imediatamente com `done`.

## Topicos priorizados

### 1. Nome
- **Objetivo:** userName
- **Pergunta sugerida:** "Como quer ser chamado?"
- **Diff:** `set_placeholder userName USER.md`

### 2. Contexto em uma frase
- **Objetivo:** role + company combinados (em prosa curta)
- **Pergunta sugerida:** "Em uma frase, o que voce faz? Pode ser profissao, projeto, empresa — o que for mais util pra mim saber."
- **Diff:** `set_placeholder role USER.md` (e opcionalmente `set_placeholder company` se vier obvio da resposta)

### 3. Diretorio de trabalho
- **Objetivo:** workingDir
- **Pergunta sugerida:** "Qual pasta voce mais usa no dia a dia? Caminho absoluto (ex: /home/seu-nome/work)."
- **Diff:** `set_placeholder workingDir USER.md`

### 4. Preferencia de resposta (opcional)
- **Objetivo:** tom curto vs elaborado
- **Pergunta sugerida:** "Prefere respostas curtas e diretas, ou com mais contexto?"
- **Diff:** opcional — `replace_section header="## Preferencias" content="- Formato: <curto|medio>\n- Emoji: evitar"` em USER.md

## Sinal de `done` antecipado

Topicos 1-3 ja resolvem. Tudo alem e bonus.
