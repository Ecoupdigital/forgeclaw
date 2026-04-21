---
phase: 24-templates-por-arqu-tipo
plan: 24-01
subsystem: cli/templates/archetypes
tags: [archetype, templates, cli, schema, loader]
requires:
  - phase-23-audit-clean (repo sanitizado, CI guard ativo)
provides:
  - ArchetypeSlug enum (5 slugs estaveis)
  - ArchetypeMeta / SuggestedAgent / PlaceholderMap / ArchetypeTemplate types
  - loadArchetype(slug) / listArchetypes() / renderPlaceholders() / renderArchetype()
  - 5 archetype.json com metadata por perfil (solo-builder, content-creator, agency-freela, ecom-manager, generic)
  - Schema documentado em packages/cli/src/templates/archetypes/README.md
affects:
  - Fase 24-02 (criar os .md por arquetipo seguindo este schema)
  - Fase 25 (installer vai consumir loadArchetype)
  - Fase 28 (forgeclaw refine vai reexecutar com este loader)
tech-stack:
  added: []
  patterns:
    - Strict runtime validation via type predicate (asserts obj is ArchetypeMeta)
    - Unknown placeholder preservation ({{debug}} tokens mantidos)
    - Interface -> Record cast via unknown bridge
    - Barrel export para superficie publica enxuta
key-files:
  created:
    - packages/cli/src/templates/archetypes/types.ts
    - packages/cli/src/templates/archetypes/loader.ts
    - packages/cli/src/templates/archetypes/index.ts
    - packages/cli/src/templates/archetypes/README.md
    - packages/cli/src/templates/archetypes/solo-builder/archetype.json
    - packages/cli/src/templates/archetypes/content-creator/archetype.json
    - packages/cli/src/templates/archetypes/agency-freela/archetype.json
    - packages/cli/src/templates/archetypes/ecom-manager/archetype.json
    - packages/cli/src/templates/archetypes/generic/archetype.json
    - .plano/fases/24-.../deferred-items.md
  modified: []
decisions:
  - "[2026-04-21][24-01] Interface PlaceholderMap castada via `as unknown as Record<string,string>` pra indexacao dinamica: TS strict nao aceita cast direto pois interfaces nao carregam index signature. Alternativa (adicionar `[key:string]:string`) seria mais invasiva e abriria a API."
  - "[2026-04-21][24-01] `listArchetypes()` ignora silenciosamente arquetipos invalidos com console.warn, em vez de jogar. Pensado para o installer: se a comunidade adicionar um arquetipo quebrado no futuro, o CLI nao crasha — so nao mostra esse arquetipo na lista."
  - "[2026-04-21][24-01] Tokens `{{...}}` nao-reconhecidos sao preservados no output (em vez de virar string vazia ou erro). Permite debug facil de templates mal-escritos durante desenvolvimento dos .md em 24-02."
  - "[2026-04-21][24-01] `loadArchetype()` le TODOS os 7 .md obrigatoriamente e joga erro se qualquer faltar. Isso garante que a Fase 24-02 nao deixe metade do arquetipo vazio e que o installer nunca escreva harness parcial."
  - "[2026-04-21][24-01] `HEARTBEAT.md` incluido em ARCHETYPE_FILES mesmo nao estando em HARNESS_FILES do harness-compiler (que fecha em STYLE.md). HEARTBEAT e lido pelo cron-engine separadamente, entao pertence ao arquetipo, mas nao ao concatenado final CLAUDE.md."
metrics:
  tasks_planned: 6
  tasks_completed: 6
  commits: 5
  files_created: 10
  files_modified: 0
  duration_minutes: 5
  completed_at: "2026-04-21T11:10Z"
---

# Fase 24 Plano 01: Schema, Loader e Metadata dos Arquetipos — Summary

Arcabouco do sistema de arquetipos do ForgeClaw: tipos TypeScript, loader com validacao estrita de JSON, renderizador de placeholders e 5 `archetype.json` (um por perfil) compondo o contrato sobre o qual a Fase 24-02 vai gerar os 35 `.md` (5 arquetipos x 7 arquivos).

## O que foi construido

Modulo novo em `packages/cli/src/templates/archetypes/` com superficie publica de 4 funcoes e 7 tipos, documentacao completa, e metadata dos 5 perfis de usuario (Solo Builder, Criador de Conteudo, Agencia/Freela, Gestor E-commerce, Generico). API consumida na Fase 25 (installer) via `loadArchetype(slug)` + `renderArchetype(tpl, map)`.

Os 5 perfis sao claramente distinguiveis: cada um tem conjunto proprio de `suggestedAgents` (3, 4, 4, 4, 2 agentes respectivamente), `tags` e `recommendedTools`. Nenhum agente e repetido entre perfis — o installer vai mostrar para o usuario os agentes especificos do perfil escolhido.

## Tarefas executadas

| # | Nome | Commit | Arquivos |
|---|---|---|---|
| 1 | Criar types.ts | `c843983` | types.ts (103 linhas) |
| 2 | Criar loader.ts | `f113d7a` | loader.ts (180 linhas, com fix de cast) |
| 3 | Criar index.ts (barrel) | `b2eef28` | index.ts (17 linhas) |
| 4 | Criar README.md | `c8dc869` | README.md (97 linhas) |
| 5 | Criar 5 archetype.json | `06ec83c` | 5 arquivos JSON (~176 linhas) |
| 6 | Typecheck final (validacao) | (sem commit — so verificacao) | — |

Total: 5 commits de codigo + verificacao final.

## Verificacoes funcionais executadas

1. **listArchetypes()** retornou os 5 arquetipos validos com metadata correta:
   ```
   - solo-builder | Solo Builder | 3 agents | 6 tools
   - content-creator | Criador de Conteudo | 4 agents | 5 tools
   - agency-freela | Agencia / Freela | 4 agents | 6 tools
   - ecom-manager | Gestor E-commerce | 4 agents | 6 tools
   - generic | Generico | 2 agents | 3 tools
   ```

2. **renderPlaceholders()** comportamento validado:
   - Token conhecido substituido (`{{userName}}` -> `"Test"`)
   - Token desconhecido preservado (`{{unknownKey}}` -> `{{unknownKey}}`)
   - Chave ausente vira string vazia (`{{userName}}` sem map -> `""`)
   - `{{today}}` injetado automaticamente no formato `YYYY-MM-DD`

3. **loadArchetype()** rejeita corretamente:
   - Slug invalido: `Unknown archetype slug: xpto`
   - .md faltando: `[archetype:solo-builder] missing template file: SOUL.md`
   (comportamento esperado ate Fase 24-02 adicionar os .md)

4. **Audit de contexto pessoal:** `bun run audit:personal:ci` continua passando com 0 findings critical. Nenhum dos 5 `archetype.json` ou outros arquivos criados contem referencia pessoal.

5. **Typecheck:** `bunx tsc --noEmit -p packages/cli/tsconfig.json` nao reporta erros nos arquivos novos de `archetypes/`.

## Desvios do Plano

### Issues Auto-corrigidos

**1. [Regra 3 - Bloqueio] Cast de PlaceholderMap para Record<string,string>**
- **Encontrado durante:** Tarefa 2 (typecheck do loader.ts)
- **Issue:** `error TS2352: Conversion of type 'PlaceholderMap' to type 'Record<string, string>' may be a mistake because neither type sufficiently overlaps with the other.`
- **Por que:** TS strict exige bridge `unknown` para castar interface sem index-signature em tipo indexavel.
- **Correcao:** Mudei `(full as Record<string, string>)[key]` para `(full as unknown as Record<string, string>)[key]` (1 caractere extra por seguranca). Semantica identica, apenas silencia o check com intencao explicita.
- **Arquivos modificados:** packages/cli/src/templates/archetypes/loader.ts (linha 158)
- **Commit:** `f113d7a` (inclui o fix — nao foi commit separado pois a tarefa 2 so tinha um passo de implementacao)

### Fora de escopo (registrado em deferred-items.md)

**1. Erro TS2307 pre-existente em `packages/cli/src/commands/install.ts:22`**
- `Cannot find module '@forgeclaw/core'` — validado como pre-existente via `git stash` em `HEAD~5`.
- Nao afeta os novos arquivos. Bloqueara Fase 25.
- Acao: adicionar `@forgeclaw/core` como dependencia workspace em `packages/cli/package.json` na primeira tarefa de 25-01.

## Pontos de conexao para Fase 24-02

- Cada arquetipo tem `ARCHETYPE_FILES = [SOUL, USER, AGENTS, TOOLS, MEMORY, STYLE, HEARTBEAT]` esperados pelo loader
- Placeholders universais disponiveis: `{{userName}}`, `{{company}}`, `{{role}}`, `{{workingDir}}`, `{{vaultPath}}`, `{{timezone}}`, `{{today}}`
- 24-02 deve preencher 35 arquivos `.md` (5 arquetipos x 7 arquivos) — loader ja rejeita se algum faltar
- `archetype.json` de cada perfil lista `suggestedAgents` que o AGENTS.md correspondente deve documentar, e `recommendedTools` que TOOLS.md deve referenciar

## Self-Check: PASSOU

**Arquivos verificados:**
- ENCONTRADO: packages/cli/src/templates/archetypes/types.ts
- ENCONTRADO: packages/cli/src/templates/archetypes/loader.ts
- ENCONTRADO: packages/cli/src/templates/archetypes/index.ts
- ENCONTRADO: packages/cli/src/templates/archetypes/README.md
- ENCONTRADO: packages/cli/src/templates/archetypes/solo-builder/archetype.json
- ENCONTRADO: packages/cli/src/templates/archetypes/content-creator/archetype.json
- ENCONTRADO: packages/cli/src/templates/archetypes/agency-freela/archetype.json
- ENCONTRADO: packages/cli/src/templates/archetypes/ecom-manager/archetype.json
- ENCONTRADO: packages/cli/src/templates/archetypes/generic/archetype.json

**Commits verificados:**
- ENCONTRADO: c843983 feat(24-01): add archetype types and slug registry
- ENCONTRADO: f113d7a feat(24-01): add archetype loader with strict JSON validation and placeholder renderer
- ENCONTRADO: b2eef28 feat(24-01): add archetypes barrel export
- ENCONTRADO: c8dc869 docs(24-01): document archetype contract, schema and public API
- ENCONTRADO: 06ec83c feat(24-01): add metadata for 5 archetypes
