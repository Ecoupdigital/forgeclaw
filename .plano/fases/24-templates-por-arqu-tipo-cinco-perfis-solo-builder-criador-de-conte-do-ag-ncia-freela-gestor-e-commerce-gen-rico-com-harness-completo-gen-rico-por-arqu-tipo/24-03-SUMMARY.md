---
phase: 24-templates-por-arqu-tipo
plan: 24-03
subsystem: cli/templates/archetypes
tags: [archetype, templates, cli, tests, snapshot, schema, loader, bun-test]
requires:
  - phase-24-01 (schema, loader, 5 archetype.json)
  - phase-24-02 (35 .md de conteudo por arquetipo)
provides:
  - Suite de testes bun:test em packages/cli/tests/archetypes/ (3 arquivos, 27 testes)
  - Gate de regressao via snapshot deterministico dos 5 arquetipos renderizados
  - Contrato validado: AGENTS.md espelha archetype.json.suggestedAgents
  - Guarda de conteudo: teste falha se qualquer dado pessoal (Jonathan/EcoUp/LFpro/Kovvy/etc.) vazar para os templates
  - Script `test` em packages/cli/package.json rodando `bun test`
affects:
  - Fase 25 (installer) pode evoluir sem medo de quebrar templates silenciosamente
  - Fase 26 (entrevistador persona) tera snapshot como baseline confiavel ao gerar diffs
  - Fase 27/28 (onboarding / forgeclaw refine) consomem o loader com contrato testado
tech-stack:
  added: []
  patterns:
    - "bun:test nativo (zero deps). Consistente com padrao do Bun, diferente de packages/core (vitest) que e pre-Bun"
    - "toMatchSnapshot do bun:test (disponivel desde Bun 1.x) — snapshot file em __snapshots__/snapshot.test.ts.snap"
    - "test.each para parametrizar todos os 5 arquetipos sem duplicar codigo"
    - "Fixed placeholder map (__USER__, __COMPANY__, etc.) para determinismo — {{today}} nao contamina snapshot"
    - "Audit allowlist com match EXATO por file:line:category: edicao do array de FORBIDDEN nos testes forca re-revisao da suppressao"
key-files:
  created:
    - packages/cli/tests/archetypes/loader.test.ts
    - packages/cli/tests/archetypes/render.test.ts
    - packages/cli/tests/archetypes/snapshot.test.ts
    - packages/cli/tests/archetypes/__snapshots__/.gitkeep
    - packages/cli/tests/archetypes/__snapshots__/snapshot.test.ts.snap
  modified:
    - packages/cli/package.json (adicionado script `test`)
    - .audit-personal-allowlist.txt (8 entries para a blacklist intencional do teste)
decisions:
  - "[2026-04-21][24-03] Runner: bun:test nativo. Seguindo a instrucao explicita do plano ('Nao usar vitest ou jest') e o padrao do proprio Bun. Os testes antigos em packages/core/tests/ usam vitest mas isso eh legado pre-Bun — novo codigo em packages/cli/ segue bun:test. Zero dependencias novas."
  - "[2026-04-21][24-03] toMatchSnapshot do bun:test usado diretamente, sem fallback manual. Bun 1.3.11 suporta nativamente (verificado via smoke test antes da implementacao). Snapshot file gerado em __snapshots__/snapshot.test.ts.snap, 1323 linhas, commitado no repo."
  - "[2026-04-21][24-03] Snapshot usa placeholder map com valores sentinel (__USER__, __COMPANY__, etc.) em vez dos valores realistas do render.test.ts. Razao: isola o snapshot do conteudo real dos templates para ficar claro no diff qual mudanca aconteceu — se __USER__ sumir do snapshot, foi mudanca de template; se aparecer 'Fulano de Tal' no snapshot, bug no teste."
  - "[2026-04-21][24-03] Array FORBIDDEN no loader.test.ts (Jonathan, EcoUp, LFpro, etc.) adicionado ao allowlist do audit:personal:ci com 8 entries. Alternativa considerada: construir os strings dinamicamente via String.fromCharCode para burlar o regex — descartada porque diminui legibilidade e confia em obscurecimento em vez do mecanismo oficial de allowlist com match exato por linha."
  - "[2026-04-21][24-03] Nao alteramos packages/cli/tsconfig.json. O 'include' do tsconfig e 'src' apenas; testes fora do include nao sao checados pelo typecheck, mas o bun:test roda o .ts diretamente com seu proprio type-erasure sem precisar do tsc. Escopo minimo, nao quebra nada."
metrics:
  tasks_planned: 5
  tasks_completed: 5
  commits: 5
  files_created: 5
  files_modified: 2
  duration_minutes: 3
  completed_at: "2026-04-21T11:28Z"
---

# Fase 24 Plano 03: Testes (Schema, Loader, Render, Snapshot) — Summary

Suite de testes bun:test fecha a Fase 24: os 5 arquetipos ganham gate de regressao end-to-end cobrindo loader, render, contratos cruzados e snapshot deterministico do output renderizado. `bun test packages/cli/tests/archetypes/` roda 27 testes verdes em ~80ms.

## O que foi construido

Tres arquivos de teste (319 linhas totais) + snapshot file (1323 linhas) + script `test` no package.json. Cobertura:

- **loader.test.ts (11 testes, 210 expects)** — valida listArchetypes (5 slugs, metadata completa), loadArchetype (carrega cada um dos 5, rejeita slug invalido), contrato AGENTS.md <-> suggestedAgents, 7 placeholders universais em todo USER.md, ausencia de 11 dados pessoais em qualquer arquivo.
- **render.test.ts (11 testes, 122 expects)** — valida renderPlaceholders (knowns, unknowns preservados, repeticao, default de timezone, today auto-injetado) e renderArchetype (7 arquivos por arquetipo, sem placeholders leftover em USER.md).
- **snapshot.test.ts (5 testes, 5 snapshots)** — gera 1 snapshot por arquetipo com map fixo (__USER__, etc.). Qualquer mudanca em qualquer um dos 35 .md ou em qualquer archetype.json quebra o snapshot e forca revisao manual.

## Tarefas executadas

| # | Nome | Commit | Arquivos |
|---|---|---|---|
| 1 | Script test no cli/package.json | `f137aa4` | packages/cli/package.json |
| 2 | loader.test.ts | `83d7e33` | tests/archetypes/loader.test.ts |
| 3 | render.test.ts | `9420554` | tests/archetypes/render.test.ts |
| 4 | snapshot.test.ts + __snapshots__/ | `32933ca` | 3 arquivos (teste + .gitkeep + .snap) |
| 5 | Suite verde + allowlist fix | `e1fb300` | .audit-personal-allowlist.txt |

Total: 5 commits de codigo (100% das tarefas commitadas individualmente).

## Verificacoes funcionais executadas

**1. Suite completa verde:**
```
bun test v1.3.11 (af24e281)
 27 pass
 0 fail
 5 snapshots, 337 expect() calls
Ran 27 tests across 3 files. [80.00ms]
```

**2. Snapshot estavel em rerun:**
```
 5 pass / 0 fail / 5 snapshots, 5 expect() calls
```
Segunda execucao reporta `5 snapshots` (nao `+5 added`), confirmando determinismo.

**3. Audit de contexto pessoal continua verde:**
```
AUDIT PASS — 0 critical findings in distributed code.
```

**4. Script `test` do cli package confirmado:**
```
OK: bun test
```

**5. toMatchSnapshot validado antes da implementacao** (smoke test em /tmp/snaptest.test.ts) — Bun 1.3.11 suporta nativamente, evitando o fallback manual do plano.

## Desvios do Plano

### Issues Auto-corrigidos

**1. [Regra 3 - Bloqueio] Allowlist do audit-personal-context para a blacklist do proprio teste**
- **Encontrado durante:** Tarefa 5 (smoke test final, ao rodar `audit:personal:ci`)
- **Issue:** O scanner de despersonalizacao detectou 8 findings critical no loader.test.ts linhas 91-99 — os strings 'Jonathan', 'EcoUp', 'Don Vicente', 'Donvicente', 'Kovvy', 'LFpro', 'LF Pro', 'Clearify' que compoem o array FORBIDDEN do teste 'no template contains forbidden personal data'.
- **Por que:** O teste existe precisamente para garantir que esses nomes nunca apareçam nos 35 templates renderizados. Mas o scanner nao sabe diferenciar "string que eh alvo de assertion negativa" de "string que vaza dado pessoal" — e nao deveria saber, porque qualquer heuristica para isso criaria buraco de seguranca.
- **Correcao:** Adicionei 8 entries ao `.audit-personal-allowlist.txt` com justificativa explicita em cada uma, usando o mecanismo oficial de suppressao do scanner (match exato por file:line:category, que forca re-revisao se o array for editado). Alternativas consideradas e descartadas:
  - Construir os strings dinamicamente com `String.fromCharCode` — obscurecimento, diminui legibilidade do teste.
  - Mover o array para fora do arquivo de teste (fixture separado) — apenas move o problema, nao resolve.
  - Ignorar a categoria inteira em `tests/` — abre brecha para vazamento real em outros testes no futuro.
- **Arquivos modificados:** `.audit-personal-allowlist.txt` (12 linhas adicionadas com header explicativo)
- **Commit:** `e1fb300`

**Observacao importante:** Tres outros strings do array FORBIDDEN (`LF-Pro`, `Passini`, `Mybrows`) NAO entraram no allowlist:
- `LF-Pro` (linha 98) — nao matchou regex algum do scanner.
- `Passini`, `Mybrows` (linhas 100-101) — matcham mas em severidade `high`, nao `critical`. O CI gate so avalia findings `critical` em codigo distribuido, entao nao precisam de suppressao.

### Fora de escopo

Nenhum item novo detectado alem do que ja estava em deferred-items.md da fase 24.

## Cobertura de requisitos

- **ARCH-TPL-07** — Suite de testes em packages/cli/tests/archetypes: DONE (3 arquivos, 27 testes, 337 expects)
- **ARCH-TPL-08** — Gate de regressao de conteudo: DONE (snapshot com fixed map, 5 snapshots commitados)

## Must-haves (todos satisfeitos)

- Suite cobre loader + render + snapshot: SIM (3 arquivos, areas distintas)
- `bun test packages/cli/tests/archetypes` roda verde: SIM (27 pass, 0 fail)
- Snapshot detecta regressoes: SIM (1323 linhas de output determinidtico por arquetipo)
- Teste verifica 5 slugs carregam 7 arquivos: SIM (test.each sobre ARCHETYPE_SLUGS validando os 7 *Raw)
- Teste verifica contrato AGENTS.md <-> suggestedAgents: SIM (iteracao sobre meta.suggestedAgents validando inclusao)

## Pontos de conexao para proximas fases

- **Fase 25 (installer):** pode chamar `loadArchetype(slug)` + `renderArchetype(map)` com seguranca — qualquer bug no loader quebra a suite, nao o deploy do usuario.
- **Fase 26 (entrevistador):** a persona gera diff EM CIMA dos templates. Se o diff introduzir conteudo pessoal ou quebrar estrutura, `bun test packages/cli/tests/archetypes/` pega imediatamente no CI antes do install.
- **Fase 27 (onboarding live-preview):** render em tempo real pode usar `renderArchetype` direto — a suite garante que os 7 arquivos saem bem formados.
- **Fase 28 (forgeclaw refine):** reexecuta a entrevista; snapshot serve como baseline para comparar o diff.
- **Regressao futura:** se a Fase 24-02 precisar adicionar/modificar conteudo em algum arquetipo, `bun test -u packages/cli/tests/archetypes/snapshot.test.ts` regenera snapshots. O commit do .snap fica como audit trail da mudanca.

## Self-Check: PASSOU

**Arquivos criados (5/5):**
- ENCONTRADO: packages/cli/tests/archetypes/loader.test.ts
- ENCONTRADO: packages/cli/tests/archetypes/render.test.ts
- ENCONTRADO: packages/cli/tests/archetypes/snapshot.test.ts
- ENCONTRADO: packages/cli/tests/archetypes/__snapshots__/.gitkeep
- ENCONTRADO: packages/cli/tests/archetypes/__snapshots__/snapshot.test.ts.snap

**Arquivos modificados (2/2):**
- ENCONTRADO: packages/cli/package.json (script `test` adicionado)
- ENCONTRADO: .audit-personal-allowlist.txt (8 entries novas)

**Commits verificados (5/5):**
- ENCONTRADO: f137aa4 chore(24-03): add test script to cli package
- ENCONTRADO: 83d7e33 test(24-03): add archetype loader test suite
- ENCONTRADO: 9420554 test(24-03): add renderPlaceholders and renderArchetype test suite
- ENCONTRADO: 32933ca test(24-03): add deterministic snapshot tests for all 5 archetypes
- ENCONTRADO: e1fb300 chore(24-03): allowlist forbidden-data blacklist in loader test

**Invariantes externas validadas:**
- `bun test packages/cli/tests/archetypes/`: 27 pass / 0 fail
- `bun run audit:personal:ci`: AUDIT PASS (0 critical findings)
