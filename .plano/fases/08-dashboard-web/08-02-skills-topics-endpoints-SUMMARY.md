---
phase: 08-dashboard-web
plan: 08-02
subsystem: dashboard
tags: [api, route-handler, skills, topics, next16]
requires: []
provides:
  - "GET /api/skills"
  - "GET /api/topics"
  - "SkillInfo type"
affects:
  - "Plano 08-05 CronFormSheet (consumer)"
tech-stack:
  added: []
  patterns:
    - "Route handler with module-level in-memory cache (30s TTL)"
    - "Regex-based YAML frontmatter parser (zero deps)"
    - "Graceful degradation: empty array + tagged source on failure"
key-files:
  created:
    - "packages/dashboard/src/app/api/skills/route.ts"
    - "packages/dashboard/src/app/api/topics/route.ts"
  modified:
    - "packages/dashboard/src/lib/types.ts"
decisions:
  - "No new deps (gray-matter/yaml): regex parse 'name:' and 'description:' from first 30 lines"
  - "Cache at module scope — Next dev HMR will reset it on file edit, prod stays warm per process"
  - "/api/skills returns skills=[] with HTTP 200 on any error — form degrades silently"
  - "/api/topics is read-only; topics are created by the bot on first Telegram message"
metrics:
  duration-seconds: 130
  tasks-completed: 3
  files-created: 2
  files-modified: 1
  completed-at: "2026-04-11T11:44:52Z"
---

# Fase 8 Plano 02: Endpoints /api/skills e /api/topics Summary

Dois endpoints GET read-only (`/api/skills`, `/api/topics`) que o form de criacao de crons (plano 05) consome para popular o helper lateral de skills e o dropdown de target topic, com cache in-memory de 30s e degradacao graciosa quando filesystem/DB estao indisponiveis.

## O que foi construido

### 1. `SkillInfo` type (`packages/dashboard/src/lib/types.ts`)

Interface exportada apos `PlanCard` com `name`, `description`, `source` (path relativo dentro de `~/.claude/skills/`). Consumida pelo route handler `/api/skills` e disponivel para futuros consumidores (CronFormSheet do plano 05).

### 2. `GET /api/skills` (`packages/dashboard/src/app/api/skills/route.ts`)

Route handler que le `~/.claude/skills/` dinamicamente e retorna lista com frontmatter parseado.

**Comportamento:**
- Le todas as entradas de `~/.claude/skills/`
- Para cada subdir (`apify/`, `asaas-api/`, etc.): procura `SKILL.md` dentro, usa se existir
- Para cada arquivo `.md` solto (`buscar-x.md`, `Chat para LLMs.md`): usa diretamente
- Parser regex simples extrai `name:` e `description:` do bloco YAML frontmatter (primeiras 30 linhas)
- Fallback: se nao tem `name:`, deriva do path (ex: `apify/SKILL.md` → `apify`)
- Ordena alfabeticamente por nome
- Cache in-memory 30s no escopo do modulo
- Qualquer erro retorna `{ skills: [], source: "error", error }` com HTTP 200 (form nunca quebra)

**Formato da resposta:**
```json
{
  "skills": [
    { "name": "apify", "description": "Web scraping...", "source": "apify/SKILL.md" },
    { "name": "buscar-x", "description": "Busca posts no X/Twitter...", "source": "buscar-x.md" }
  ],
  "source": "fs" | "cache" | "error"
}
```

**Verificado:** 33 skills carregadas da instalacao local, mix de subdirs e arquivos soltos, cache ativo na segunda request (`source: "cache"`).

### 3. `GET /api/topics` (`packages/dashboard/src/app/api/topics/route.ts`)

Route handler que wrap `core.listTopics()` e projeta apenas os campos necessarios para o dropdown de target topic.

**Comportamento:**
- Chama `core.listTopics()` (DB via better-sqlite3)
- Projeta `{ id, name, chatId, threadId }` (exclui `projectDir`, `sessionId`, `createdAt` desnecessarios pro dropdown)
- Fallback: se topic nao tem `name`, usa `"Topic #<id>"`
- Se DB indisponivel ou throw: retorna `{ topics: [], source: "empty" }` com HTTP 200
- Nao suporta POST/PUT/DELETE — topics sao criados pelo bot quando usuario abre novo topico no Telegram

**Formato da resposta:**
```json
{ "topics": [], "source": "core" | "empty" }
```

**Verificado:** HTTP 200 com `source: "core"` (DB aberto com sucesso) e array vazio (nenhum topic criado ainda neste DB — estado empty valido que o form de plano 05 tratara com "Default (use harness default)").

## Decisoes de implementacao

### Parser de frontmatter sem dependencia nova

O CONTEXT.md mencionava "parsing do YAML frontmatter" mas o package `dashboard` nao tem `gray-matter` nem `yaml`. Optamos por regex simples (`^---\s*\n([\s\S]*?)\n---` + `^name\s*:\s*(.+?)$` + `^description\s*:\s*(.+?)$`) das primeiras 30 linhas em vez de adicionar dep. Funciona para 100% dos casos reais em `~/.claude/skills/` (frontmatter padrao simples). Se no futuro alguem usar YAML nested/multiline em skills, migrar para `yaml`. Principio 1 (implementacao real) respeitado: parser real, nao simulacao.

### Cache no escopo do modulo

Cache lives at module scope (`let cache: { at, data } | null`). Isso significa:
- Em producao (Next start): uma instancia do processo Node → cache persiste por 30s entre requests
- Em dev (Next dev): HMR pode reimportar o modulo ao mudar o arquivo, o que reseta o cache — comportamento desejavel (mudancas em skills refletem imediatamente ao salvar)
- Multi-processo (PM2 cluster): cada worker tem seu proprio cache — aceitavel para um form de 30s

Alternativa rejeitada: `unstable_cache` do Next. Requer opt-in explicito via `force-static` e invalidacao via `revalidateTag`, overkill para cache de 30s em GET simples.

### Degradacao graciosa em vez de erro HTTP 500

O form de criacao de crons (plano 05) precisa abrir mesmo se `/api/skills` falhar (filesystem corrompido, permissao negada, etc.). Retornar HTTP 500 quebraria o form. Optamos por **sempre HTTP 200** com `skills: []` e `source: "error"` para o cliente conseguir distinguir "sem skills" (`source: "fs"` + array vazio) de "erro ao ler" (`source: "error"`).

### `/api/topics` read-only

Topics no ForgeClaw sao criados pelo bot quando o usuario manda a primeira mensagem em um novo topico do Telegram (fluxo da Fase 2). Dashboard nao cria topics — so le. Portanto nao implementamos POST/PUT/DELETE. Se uma fase futura precisar (ex: admin editando nome de topic), cria-se um handler separado.

## Desvios do Plano

Nenhum desvio. Plano executado exatamente como escrito — as 3 tarefas seguiram o codigo literal especificado, os testes `tsc --noEmit` passaram sem erro nos arquivos criados, e as verificacoes funcionais via curl confirmaram o comportamento esperado.

### Issues fora de escopo (nao corrigidos)

- `src/components/sessions-tab.tsx(185,9)`: erro pre-existente `TopicInfo` faltando `createdAt` em mock data inline. Nao relacionado a este plano. Registrar como item a resolver em plano futuro quando sessions-tab for tocado.

## Verificacao funcional (runtime)

Dev server rodando em `http://localhost:4040`. Ambos endpoints testados via curl:

| Endpoint | Status | Source | Payload |
|----------|--------|--------|---------|
| `GET /api/skills` (1a) | 200 | `fs` | 33 skills ordenadas |
| `GET /api/skills` (2a) | 200 | `cache` | 33 skills (mesmo array) |
| `GET /api/topics` | 200 | `core` | `[]` (DB vazio de topics) |

Subdirs com `SKILL.md` detectados corretamente (ex: `apify/SKILL.md`, `asaas-api/SKILL.md`). Arquivos `.md` soltos detectados (ex: `buscar-x.md`).

## Commits

| Task | Hash | Mensagem |
|------|------|----------|
| 1 | e71bca7 | feat(08-02): add SkillInfo type for /api/skills endpoint |
| 2 | f80e0d3 | feat(08-02): add GET /api/skills route handler |
| 3 | a1e7d72 | feat(08-02): add GET /api/topics route handler |

## Wiring / Conexao fim-a-fim

- [x] `SkillInfo` exportado em `types.ts` e importado em `app/api/skills/route.ts`
- [x] `core.listTopics()` chamado em `app/api/topics/route.ts`
- [x] `GET /api/skills` responde HTTP 200 via dev server real em `localhost:4040`
- [x] `GET /api/topics` responde HTTP 200 via dev server real em `localhost:4040`
- [ ] Consumido pelo CronFormSheet (plano 05) — dependencia foward, sera conectado naquele plano

## Proximos passos

Este plano e **dependencia do plano 08-05 (cron-form-sheet)**, que ira:
1. Adicionar botao "Skills disponiveis" no form → sheet lateral consumindo `GET /api/skills`
2. Preencher dropdown "Target topic" consumindo `GET /api/topics`

Ambos endpoints estao prontos e podem ser chamados com `fetch('/api/skills')` / `fetch('/api/topics')` diretamente.

## Self-Check: PASSOU

Verificacao:
- ENCONTRADO: packages/dashboard/src/lib/types.ts (SkillInfo adicionado)
- ENCONTRADO: packages/dashboard/src/app/api/skills/route.ts
- ENCONTRADO: packages/dashboard/src/app/api/topics/route.ts
- ENCONTRADO: commit e71bca7 (Task 1)
- ENCONTRADO: commit f80e0d3 (Task 2)
- ENCONTRADO: commit a1e7d72 (Task 3)
- ENCONTRADO: /api/skills HTTP 200 com 33 skills reais
- ENCONTRADO: /api/topics HTTP 200 com source=core
