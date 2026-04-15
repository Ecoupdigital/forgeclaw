---
tested: 2026-04-11T12:40:00Z
phase: 08-dashboard-web
subrecorte: DCRV (dashboard cron / skills / topics / heartbeat endpoints)
routes_tested: 8
total_tests: 42
passed: 30
failed: 12
skipped: 0
pass_rate: 71
base_url: http://localhost:4040
---

# DCRV API Test Report — Fase 08

**Pass Rate:** 71% (30/42 testes)
**Rotas testadas:** 8
**Total de issues:** 12 (1 critica, 5 altas, 5 medias, 1 baixa)

## Resumo por Rota

| Rota | Method | Testes | Pass | Fail | Rate |
|------|--------|--------|------|------|------|
| `/api/crons` | GET | 2 | 2 | 0 | 100% |
| `/api/crons` | POST | 13 | 5 | 8 | 38% |
| `/api/crons` | PUT | 8 | 4 | 4 | 50% |
| `/api/crons` | DELETE | 4 | 4 | 0 | 100% |
| `/api/crons/:id/logs` | GET | 3 | 3 | 0 | 100% |
| `/api/skills` | GET | 4 | 4 | 0 | 100% |
| `/api/topics` | GET | 1 | 1 | 0 | 100% |
| `/api/heartbeat` | GET+PUT | 7 | 7 | 0 | 100% |

O problema esta concentrado em `POST /api/crons` e `PUT /api/crons` — nenhuma validacao de campos obrigatorios, tipos, origem ou schedule. DELETE esta solido (valida id, 403 em file-origin, 404 em ids inexistentes). Rotas de leitura (GET crons/skills/topics/logs, GET/PUT heartbeat) estao todas OK.

## Issues por Categoria

| Categoria | Count | Exemplos |
|-----------|-------|----------|
| Validacao faltando no POST | 8 | Aceita sem name, sem schedule, sem prompt, schedule="foo bar", origin=file via API, tipos errados, array no body, text/plain |
| Autorizacao bypass no PUT | 1 | `action=toggle` nao verifica `origin==="file"`, permite dashboard modificar jobs cuja unica fonte de verdade e HEARTBEAT.md |
| Tratamento silencioso 200 | 3 | PUT com id inexistente, action desconhecida ou sem id retornam 200 `{success:true,source:"mock"}` |

## Issues Criticas

### DCRV-API-001 (CRITICAL): `action=toggle` permite bypass da protecao de file-origin
**Rota:** `PUT /api/crons`
**Request:**
```json
{"id":7, "action":"toggle"}
```
(id 7 e um job com `origin="file"`, carregado de HEARTBEAT.md)
**Response:** `200` `{"success":true,"id":7,"action":"toggle","enabled":true,"source":"core"}`
**Esperado:** `403 "Cannot update file-origin jobs from dashboard"` (igual ao branch `action=update`)
**Impacto:**
- Comprovado mudando estado real: jobs 2, 3, 4, 5, 6, 7 (todos `origin="file"`, oriundos do HEARTBEAT.md real) foram revertidos de enabled=true -> enabled=false via esse endpoint.
- Proximo parser de HEARTBEAT.md nao vai reconciliar (DB passa a divergir do arquivo-fonte).
- 08-01 explicitamente proibiu mutacao de file-origin a partir do dashboard (a logica existe, mas so esta no branch `action=update`).

**Fix sugerido:** mover a checagem `existing.origin === "file"` para antes do `if (action === "toggle")`, apos o `getCronJob(id)`. Ou aplicar em ambos os branches separadamente:
```ts
const existing = core.getCronJob(id);
if (!existing) return Response.json({success:false,error:"Not found"},{status:404});
if (existing.origin === "file") return Response.json({success:false,error:"Cannot modify file-origin jobs from dashboard"},{status:403});
```
Nota: a delecao ja esta protegida corretamente (verificado em D13 -> 403).

## Issues Altas

### DCRV-API-002 (HIGH): POST aceita payload sem `name`
**Rota:** `POST /api/crons`
**Request:** `{"schedule":"*/5 * * * *","prompt":"echo hi","targetTopicId":null,"enabled":true}`
**Response:** `200 {"success":true,"job":{"id":N,"name":undefined,...}}`
**Esperado:** `400` com mensagem clara.
**Impacto:** Insere row com `name=NULL`, corrompendo a listagem (UI acaba renderizando "undefined" ou quebrando).
**Fix:** validar com `zod` (ou checagem manual) antes de chamar `core.createCronJob`. Schema: `name: z.string().min(1)`.

### DCRV-API-003 (HIGH): POST aceita payload sem `schedule`
**Rota:** `POST /api/crons`
**Request:** `{"name":"DCRV-TEST-no-sched","prompt":"echo hi","enabled":true}`
**Response:** `200`
**Esperado:** `400`. Sem schedule o cron nunca executa — job virou lixo no DB.

### DCRV-API-004 (HIGH): POST aceita schedule invalido `"foo bar"`
**Rota:** `POST /api/crons`
**Request:** `{"name":"DCRV-TEST-bad-sched","schedule":"foo bar","prompt":"echo hi"}`
**Response:** `200`
**Esperado:** `400` — validar com `cron-parser` ou equivalente antes de inserir.
**Impacto:** a fase 08-04 introduziu template vars; o engine recebe um schedule que nunca casa e o log nao avisa o usuario.

### DCRV-API-005 (HIGH): POST aceita payload sem `prompt`
**Rota:** `POST /api/crons`
**Request:** `{"name":"DCRV-TEST-no-prompt","schedule":"*/5 * * * *"}`
**Response:** `200` (prompt=NULL inserido)
**Esperado:** `400`. Cron sem prompt nao executa nada.

### DCRV-API-006 (HIGH): POST permite criar jobs com `origin: "file"` via API
**Rota:** `POST /api/crons`
**Request:** `{"name":"DCRV-TEST-as-file","schedule":"*/5 * * * *","prompt":"echo hi","origin":"file","sourceFile":"HEARTBEAT.md"}`
**Response:** `200 {"success":true,"job":{"id":13,"origin":"file",...}}`
**Esperado:** `400` ou coercao automatica para `"db"`.
**Impacto CRITICO EM CASCATA:** o job criado herda a protecao 403 do file-origin e nao pode mais ser deletado/editado via API — precisei remover manualmente via `better-sqlite3`. Qualquer cliente malicioso/curioso consegue plantar jobs imutaveis no DB via dashboard, sem mesmo tocar em HEARTBEAT.md.
**Fix:** ignorar `origin` vindo do body do dashboard — sempre forcar `origin: "db"`, `sourceFile: null`:
```ts
// Em POST:
const id = core.createCronJob({
  ...
  origin: "db",        // dashboard so cria DB-origin
  sourceFile: null,
});
```
A nova rota para importar file-origin (se existir) deve ser um endpoint diferente, chamado apenas pelo parser de HEARTBEAT.

## Issues Medias

### DCRV-API-007 (MEDIUM): POST aceita body como array
**Rota:** `POST /api/crons`
**Request:** `[1,2,3]` (Content-Type: application/json)
**Response:** `200 {"success":true,"job":{"id":N,"name":undefined,"schedule":undefined,...}}`
**Esperado:** `400 "body must be an object"`.
**Impacto:** mesmos corrompimentos de DCRV-API-002/003/005 combinados. O destructuring `const {name,schedule,prompt} = body` silenciosamente resulta em undefined em cada campo, e o SQLite grava `NULL` em colunas NOT NULL sem reclamar (o schema nao esta com NOT NULL em `name`/`schedule`/`prompt` — verificar com `PRAGMA table_info(cron_jobs)`).

### DCRV-API-008 (MEDIUM): POST aceita Content-Type: text/plain com body JSON
**Rota:** `POST /api/crons`
**Request:** header `Content-Type: text/plain`, body e JSON valido
**Response:** `200` (Next.js/node fetch ignoram Content-Type e fazem `request.json()` mesmo assim)
**Esperado:** `415 Unsupported Media Type` ou `400`.
**Impacto:** Baixa, mas afeta ferramentas que presumem que rejeitar por CT e uma forma de evitar CSRF (nao ha auth, entao o vetor e fraco, mas ainda e inconsistente com boas praticas REST).

### DCRV-API-009 (MEDIUM): PUT com id inexistente em `action=toggle` retorna 200
**Rota:** `PUT /api/crons`
**Request:** `{"id":999999,"action":"toggle"}`
**Response:** `200 {"success":true,"id":999999,"action":"toggle","enabled":true,"source":"core"}`
**Esperado:** `404`.
**Causa raiz:** `core.getCronJob(999999)?.enabled` retorna `undefined`, negado vira `true`, e `updateCronJob(999999,...)` aceita sem erro (UPDATE ... WHERE id=999999 afeta 0 rows mas nao throw).
**Fix:** checar se o job existe antes de qualquer mutacao; retornar 404 se nao.

### DCRV-API-010 (MEDIUM): PUT com `action` desconhecido cai no fallback `{success:true,source:"mock"}`
**Rota:** `PUT /api/crons`
**Request:** `{"id":X,"action":"nuke_everything"}`
**Response:** `200 {"success":true,"id":X,"action":"nuke_everything","source":"mock"}`
**Esperado:** `400 "Unknown action"`.
**Impacto:** Silenciosamente ignora comandos desconhecidos. Consumidores (frontend futuro) nao veem erro e presumem sucesso.
**Fix:** remover o fallback `return Response.json({success:true,...source:"mock"})` do final do PUT. Substituir por:
```ts
return Response.json({success:false,error:`Unknown action: ${action}`},{status:400});
```

### DCRV-API-011 (MEDIUM): POST aceita `targetTopicId` inexistente
**Rota:** `POST /api/crons`
**Request:** `{"name":"DCRV-TEST-bad-topic","schedule":"*/5 * * * *","prompt":"x","targetTopicId":999999}`
**Response:** `200`
**Esperado:** `400 "Topic not found"` OU aceitar, mas documentar. Atualmente nao ha FK no schema, entao o job roda e tenta postar em topic fantasma.
**Fix:** validar via `core.listTopics()` (ou `getTopic(id)`) antes de inserir, ou adicionar FK no schema SQLite com `ON DELETE SET NULL`.

## Issue Baixa

### DCRV-API-012 (LOW): PUT sem `id` no body retorna 200
**Rota:** `PUT /api/crons`
**Request:** `{"action":"toggle"}`
**Response:** `200 {"success":true,"id":undefined,"action":"toggle","enabled":true,"source":"core"}` (mesmo fluxo do DCRV-API-009)
**Esperado:** `400 "Missing id"`.
**Fix:** checar `if (typeof id !== "number") return 400` no comeco do handler.

## Detalhamento por Rota

### GET /api/crons (2 testes — 100% PASS)

| # | Cenario | Status | Esperado | Resultado |
|---|---------|--------|----------|-----------|
| C01 | Happy path retorna jobs + source | 200 | 200 | PASS |
| C02 | Cada job tem `origin` e `sourceFile` | 200 | 200 | PASS |

Contagem de jobs retornados: 11 (7 file-origin + 4 db-origin existentes de outros testes).

### POST /api/crons (13 testes — 38% PASS)

| # | Cenario | Request | Status | Esperado | Resultado |
|---|---------|---------|--------|----------|-----------|
| C10 | Happy path db-origin | payload completo | 200 | 200 | PASS |
| C11 | Sem `name` | `{schedule,prompt,enabled}` | 200 | 400 | **FAIL** |
| C12 | Sem `schedule` | `{name,prompt,enabled}` | 200 | 400 | **FAIL** |
| C13 | `schedule:"foo bar"` | payload completo | 200 | 400 | **FAIL** |
| C14 | Sem `prompt` | `{name,schedule,enabled}` | 200 | 400 | **FAIL** |
| C15 | `targetTopicId:999999` | payload completo | 200 | 400/404 | **FAIL** |
| C16 | `origin:"file"` via API | payload completo | 200 | 400/403 | **FAIL** |
| C17 | SQL injection em `name` | `"Robert'; DROP TABLE cron_jobs;--"` | 200 | 200/400 | PASS |
| C18 | Prompt 1MB | 1_000_000 chars | 200 | 200/400/413 | PASS |
| C19 | `Content-Type: text/plain` | payload JSON | 200 | 400/415 | **FAIL** |
| C20 | Body vazio | `""` | 400 | 400 | PASS |
| C21 | JSON malformado | `{bad` | 400 | 400 | PASS |
| C22 | Body como array | `[1,2,3]` | 200 | 400 | **FAIL** |

Nota positiva C17: SQLite usa bind parameters em `createCronJob`, entao SQL injection NAO afeta a estrutura do DB. A string e gravada literalmente como `name`. Nao e uma vulnerabilidade real de injection.

Nota C18: o dev server aceitou 1MB em ~1s sem erro. Nao ha limite de tamanho configurado. Recomendado adicionar `bodyParser.limit` ou equivalente para proteger de DoS via payload inflado.

### PUT /api/crons (8 testes — 50% PASS)

| # | Cenario | Request | Status | Esperado | Resultado |
|---|---------|---------|--------|----------|-----------|
| P10 | `toggle` em DB-origin | `{id,action:"toggle"}` | 200 | 200 | PASS |
| P11 | `toggle` em file-origin | `{id:7,action:"toggle"}` | 200 | 403 | **FAIL** (DCRV-API-001) |
| P12 | `update` em DB-origin | `{id,action:"update",name:"..."}` | 200 | 200 | PASS |
| P13 | `update` em file-origin | `{id:7,action:"update",name:"HACK"}` | 403 | 403 | PASS |
| P14 | `run_now` | `{id,action:"run_now"}` | 200 | 200/501 | PASS (retorna success:false + msg `requires the bot process`) |
| P15 | `toggle` id inexistente | `{id:999999,action:"toggle"}` | 200 | 404 | **FAIL** |
| P16 | Action desconhecida | `{id,action:"nuke"}` | 200 | 400 | **FAIL** |
| P17 | Sem id | `{action:"toggle"}` | 200 | 400 | **FAIL** |

### DELETE /api/crons (4 testes — 100% PASS)

| # | Cenario | Request | Status | Esperado | Resultado |
|---|---------|---------|--------|----------|-----------|
| D10 | Id inexistente | `?id=999999` | 404 | 404 | PASS |
| D11 | Sem id | `(nenhum)` | 400 | 400 | PASS |
| D12 | Id nao numerico | `?id=abc` | 400 | 400 | PASS |
| D13 | File-origin (expect 403) | `?id=7` | 403 | 403 | PASS |

DELETE esta **solido**. Mensagens de erro sao especificas ("Invalid id", "Not found", "Cannot delete file-origin jobs from dashboard").

Tambem testado fora do script: `?id=0` -> 400, `?id=-1` -> 400. OK.

### GET /api/crons/:id/logs (3 testes — 100% PASS)

| # | Cenario | Status | Esperado | Resultado |
|---|---------|--------|----------|-----------|
| L10 | Id valido | 200 | 200 | PASS |
| L11 | Id inexistente (999999) | 200 `{"logs":[],"source":"core"}` | 200/404 | PASS (retorna array vazio, decisao de design aceitavel) |
| L12 | Id nao numerico (`abc`) | 400 `{"error":"Invalid job ID"}` | 400 | PASS |

### GET /api/skills (4 testes — 100% PASS)

| # | Cenario | Status | Esperado | Resultado |
|---|---------|--------|----------|-----------|
| S10 | Happy path primeira chamada | 200 `source:"fs"` | 200 | PASS |
| S11 | Segunda chamada -> cache | 200 `source:"cache"` | 200 | PASS |
| S12 | Cada skill tem `name`+`description` | 200 | 200 | PASS |
| S13 | Query strings inesperadas (`?foo=bar&limit=-1`) | 200 | 200 | PASS (ignoradas silenciosamente, OK) |

Retornou ~40+ skills validas. Cache TTL de 30s funciona.

### GET /api/topics (1 teste — 100% PASS)

| # | Cenario | Status | Response | Resultado |
|---|---------|--------|----------|-----------|
| T10 | Happy path | 200 | `{"topics":[],"source":"core"}` | PASS |

Nota: a tabela `topics` esta vazia no DB atual, por isso array vazio. Schema correto (`{id,name,chatId,threadId}` slim). Nao afeta os testes de `targetTopicId` no POST, apenas explica porque C15 (topic=999999) nao tinha nada pra validar.

### GET + PUT /api/heartbeat (7 testes — 100% PASS)

| # | Cenario | Status | Esperado | Resultado |
|---|---------|--------|----------|-----------|
| H10 | GET retorna content | 200 | 200 | PASS |
| H11 | PUT round-trip content valido | 200 | 200 | PASS |
| H12 | PUT sem `content` | 400 | 400 | PASS (erro: write undefined) |
| H13 | PUT `content:12345` (numero) | 400 | 400 | PASS |
| H14 | PUT `content:null` | 400 | 400 | PASS |
| H15 | Path traversal (`path:"../../etc/passwd"`) | 200 | 200 | PASS — handler ignora `path`, escreve apenas em `~/.forgeclaw/HEARTBEAT.md`. Nao e vulneravel. |
| H16 | PUT 5MB content | 200 | 200/400/413 | PASS (aceita, mas sem limite — ver nota abaixo) |

**Nota H16:** o arquivo foi escrito com 5_000_000 bytes sem reclamar. Nao ha body-size limit no PUT. Mesma observacao do C18: adicionar limite razoavel (ex: 1MB) para evitar DoS local de disco. Impacto real baixo porque nao ha auth e isto e dashboard local.

## Observacoes de Setup / Side-Effects

### Dano colateral detectado e reparado durante os testes

Durante as baterias, o bug DCRV-API-001 (toggle bypass em file-origin) causou efeito colateral real:
- Jobs 2, 3, 4, 5, 6, 7 (todos file-origin, vindos do HEARTBEAT.md real) tiveram `enabled` alterado de `true` para `false` via chamadas `PUT {action:"toggle"}`.
- Esse estado foi persistido no SQLite.
- **Reparo:** executei via `better-sqlite3` diretamente: `UPDATE cron_jobs SET enabled=1 WHERE id IN (2,3,4,5,6,7) AND origin='file'`. Estado original capturado do snapshot C01 confirma que os 6 jobs estavam `enabled=true` antes da bateria.
- Verificado pos-reparo: ver `[rerun: b32]`.

Tambem durante os testes:
- Job 13 (`DCRV-TEST-as-file`, origin=file) foi criado via DCRV-API-006 e nao podia ser deletado via API (protegido pela regra file-origin). Removido via `DELETE FROM cron_jobs WHERE name='DCRV-TEST-as-file' AND origin='file'`.
- Heartbeat sofreu 2 overwrites acidentais (um script meu enviou `{"content":null}` devido a variavel shell nao exportada, e depois um envio de 5MB). Restaurado duas vezes a partir do snapshot capturado em H10. Estado final: 780 bytes, conteudo identico ao original (23 linhas do HEARTBEAT.md gerenciado).

### Cleanup final confirmado

```
DCRV-TEST leftover: [] (0 jobs)
Total cron_jobs: 11 (igual ao inicio dos testes)
HEARTBEAT.md: 780 bytes (igual ao inicio dos testes)
File-origin enabled states: restaurados ao snapshot C01
```

## Priorizacao de Correcao

Ordem recomendada para os devs:

1. **DCRV-API-001** (toggle bypass file-origin) — blocker para 08-01/08-06, risco de dessincronia entre HEARTBEAT.md e DB.
2. **DCRV-API-006** (POST permite `origin:"file"`) — mesmo risco, cria jobs imutaveis no DB.
3. **DCRV-API-002/003/004/005** (validacao POST: name/schedule/prompt/schedule-valido) — uma unica passada de zod resolve os 4.
4. **DCRV-API-009/010/012** (PUT falha silenciosamente) — refatorar handler para checar `existing` antes de qualquer branch.
5. **DCRV-API-007/011** (array body / topic inexistente) — podem entrar no mesmo schema zod.
6. **DCRV-API-008** (Content-Type text/plain) — nice-to-have.

Um schema `zod` compartilhado para `cron-job input` resolveria C11, C12, C13, C14, C15, C16, C22, C19 em um lugar so.

## Arquivos

- Resultados brutos: `/tmp/dcrv-api-results.jsonl` (42 linhas JSONL)
- Script de bateria principal: `/tmp/dcrv-api-test.sh`
- Script de bateria adicional: `/tmp/dcrv-api-test-part2.sh`
- Issues em formato estruturado: `.plano/fases/08-dashboard-web/dcrv/API-ISSUES.json`
