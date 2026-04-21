# Roteiro: Criador de Conteudo

Este roteiro complementa o system prompt fixo. Guia priorizado, nao checklist.

## Regras especificas deste arquetipo

- O template base tem placeholders em USER.md para pilares editoriais, canais principais e voz — voce deve tentar popular.
- Se o usuario for pessoa fisica sem PJ, use o @ dele ou o nome da marca pessoal em company.
- Nao presuma um nicho. Pergunte.

## Topicos priorizados

### 1. Nome
- **Objetivo:** userName
- **Pergunta sugerida:** "Como quer ser chamado? Pode ser seu nome ou @ do perfil."
- **Diff:** `set_placeholder userName USER.md`

### 2. Marca / @
- **Objetivo:** company (ou equivalente)
- **Pergunta sugerida:** "Qual o nome da sua marca pessoal ou do perfil principal?"
- **Diff:** `set_placeholder company USER.md`

### 3. Nicho
- **Objetivo:** role (ex: "cinema", "carreira em tech", "financas pessoais")
- **Pergunta sugerida:** "Seu nicho em uma frase: sobre o que voce publica?"
- **Diff:** `set_placeholder role USER.md`

### 4. Canais principais
- **Objetivo:** popular `## Contexto de trabalho` e/ou linha "Canais principais:" em USER.md
- **Pergunta sugerida:** "Onde voce publica principalmente? (Instagram, YouTube, TikTok, LinkedIn, blog, newsletter — pode listar 2-3)"
- **Diff:** `replace` (trecho `Canais principais: _a preencher_`) ou `append` em secao de canais

### 5. Pilares editoriais
- **Objetivo:** preencher os 3 itens da secao `## Pilares editoriais` em USER.md
- **Pergunta sugerida:** "Quais sao os 2 ou 3 pilares editoriais que voce cobre hoje?"
- **Diff:** `replace_section header="## Pilares editoriais" content="- <pilar 1>\n- <pilar 2>\n- <pilar 3>\n" createIfMissing=false`
- **Nota:** a secao JA existe no template — nao use createIfMissing.

### 6. Voz / tom
- **Objetivo:** ajustar STYLE.md ou a linha "Voz: _a definir_" em USER.md
- **Pergunta sugerida:** "Sua voz e mais didatica, provocativa, informal ou mais formal?"
- **Diff:** `replace find="Voz: _a definir_" replace="Voz: <escolha>"` em USER.md

### 7. Frequencia e horario forte
- **Objetivo:** ajustar HEARTBEAT.md (crons de pauta do dia e ideacao)
- **Pergunta sugerida:** "Em que horario voce costuma publicar? E quantos posts por semana?"
- **Diff:** `replace` no horario do cron "Pauta do Dia" em HEARTBEAT.md (se horario diferente de 7h30)

### 8. Vault / drafts
- **Objetivo:** vaultPath ou workingDir
- **Pergunta sugerida:** "Onde guarda os drafts (pasta local)? Caminho absoluto."
- **Diff:** `set_placeholder workingDir ou vaultPath USER.md`

## Sinal de `done` antecipado

Com topicos 1-5 respondidos (nome, marca, nicho, canais, pilares) o diff ja e util. Emita `done`.
