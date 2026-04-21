# Roteiros do Entrevistador

Um arquivo por `ArchetypeSlug`. Cada script e anexado ao system prompt fixo
(`../interviewer.md`) em runtime via `loadInterviewerPrompt(slug)`.

## Arquivos esperados

- `solo-builder.md`
- `content-creator.md`
- `agency-freela.md`
- `ecom-manager.md`
- `generic.md`

Se um arquivo nao existir pro slug pedido, `loadInterviewerPrompt` retorna o
prompt base sozinho (com warning) — nao joga erro.

## Estrutura obrigatoria de cada script

1. **Titulo:** `# Roteiro: <Nome legivel>` (linha 1).
2. **Regras especificas deste arquetipo:** 2-4 bullets com contexto especifico (tom, caveats, sensibilidades).
3. **Topicos priorizados:** lista numerada (`### 1.`, `### 2.`, ...) com entre 4 e 8 topicos.
4. **Sinal de `done` antecipado:** paragrafo final explicando em quais topicos o entrevistador ja pode terminar.

## Schema de cada topico

```
### N. Titulo curto
- **Objetivo:** o que capturar (placeholder ou secao H2)
- **Pergunta sugerida:** uma frase, max ~150 chars
- **Diff:** `<op> <key ou header> <file>` — instrucao compacta de que diff emitir
- **Nota:** (opcional) caveat sobre createIfMissing / placeholder nao universal / etc.
```

## Regras de content

- Topicos 1-4 DEVEM cobrir os placeholders universais que fazem sentido para o arquetipo
  (no minimo `userName`, `company` ou equivalente, `role`, `workingDir` ou `vaultPath`).
- Topicos 5+ sao especificos do arquetipo.
- NUNCA referenciar secoes H2 que nao existem nos templates da Fase 24. Verifique
  em `packages/cli/src/templates/archetypes/<slug>/USER.md` (e outros) antes de citar.
- NUNCA pedir placeholder fora de `VALID_PLACEHOLDER_KEYS` (`userName`, `company`,
  `role`, `workingDir`, `vaultPath`, `timezone`).

## Como validar um novo script

1. `loadScript('<slug>')` em `prompts.ts` retorna o conteudo sem erros.
2. O entrevistador (plano 26-02) consegue usar o script num fixture de conversa
   (teste em 26-04) e gera JSON valido.
3. Nenhum topico referencia header H2 inexistente — checar rodando diff com
   `createIfMissing: false` contra o template de Fase 24.

## Como versionar

- Scripts sao parte do produto. Mudar um script e mudar comportamento do
  entrevistador pra TODOS os membros daquele arquetipo.
- Nao fazer breaking change sem bumpar a major do ForgeClaw e avisar nos docs.
