# Roteiro: Solo Builder

Este roteiro complementa o system prompt fixo. E um guia priorizado, nao um checklist obrigatorio.

## Regras especificas deste arquetipo

- Tom na pergunta: direto, curto, zero didatismo. O usuario e um dev senior.
- Se o usuario disser "sem empresa" ou "faco sozinho", NAO insista em company — use o proprio nome ou deixe vazio.
- Projetos side costumam ter nome curto; pergunte um de cada vez se necessario.

## Topicos priorizados

### 1. Nome
- **Objetivo:** capturar userName
- **Pergunta sugerida:** "Como voce quer ser chamado pelo ForgeClaw?"
- **Diff esperado:** `{ file: "USER.md", ops: [{ op: "set_placeholder", key: "userName", value: "..." }] }`

### 2. Empresa / projeto principal
- **Objetivo:** capturar company (nome da marca pessoal, produto principal, ou "independente")
- **Pergunta sugerida:** "Qual o nome do seu produto/projeto principal? (Se nao tiver, pode por seu nome mesmo.)"
- **Diff esperado:** `{ file: "USER.md", ops: [{ op: "set_placeholder", key: "company", value: "..." }] }`

### 3. Stack principal
- **Objetivo:** capturar role (stack/especialidade em 1 frase)
- **Pergunta sugerida:** "Em uma frase, qual sua stack principal? Ex: 'Next.js + Supabase', 'Python/FastAPI', 'Go + Postgres'."
- **Diff esperado:** `{ file: "USER.md", ops: [{ op: "set_placeholder", key: "role", value: "..." }] }`

### 4. Diretorio de projetos
- **Objetivo:** capturar workingDir
- **Pergunta sugerida:** "Onde voce guarda seus projetos? Caminho absoluto (ex: /home/ana/projects)."
- **Diff esperado:** `{ file: "USER.md", ops: [{ op: "set_placeholder", key: "workingDir", value: "..." }] }`

### 5. Projeto em foco agora
- **Objetivo:** popular a secao "## Projetos ativos" em USER.md
- **Pergunta sugerida:** "Qual projeto esta consumindo mais do seu tempo hoje?"
- **Diff esperado:** `{ file: "USER.md", ops: [{ op: "replace_section", header: "## Projetos ativos", content: "- Projeto principal: <X>\n- Side projects: <Y ou vazio>\n", createIfMissing: true }] }`

### 6. Deploy preferido (opcional)
- **Objetivo:** ajustar TOOLS.md caso use algo alem de Coolify/Vercel
- **Pergunta sugerida:** "Deploy: Coolify, Vercel, Fly, Railway, outro?"
- **Diff esperado (se divergente do template):** `{ file: "TOOLS.md", ops: [{ op: "replace", find: "Coolify ou Vercel", replace: "<escolha>" }] }`

### 7. Aversao a interrupcao / foco profundo (opcional)
- **Objetivo:** ajustar STYLE.md se o usuario preferir respostas mais/menos verbosas
- **Pergunta sugerida:** "Prefere respostas curtissimas (so codigo/comando) ou pode elaborar um pouco?"
- **Diff esperado (se divergente):** `{ file: "STYLE.md", ops: [{ op: "replace_section", header: "## Tom", content: "<ajuste>", createIfMissing: false }] }`

## Sinal de `done` antecipado

Se o usuario respondeu os topicos 1-4 e pulou/disse "depois eu configuro" para os demais, emita `done` ja. Nao sofrer.
