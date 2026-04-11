---
phase: 08-dashboard-web
plan: 08-01
type: refactor
autonomous: true
wave: 1
depends_on: []
requirements: [DASH-04]
files_modified:
  - packages/core/src/types.ts
  - packages/core/src/state-store.ts
  - packages/dashboard/src/lib/types.ts
  - packages/dashboard/src/lib/core.ts
  - packages/dashboard/src/app/api/crons/route.ts
must_haves:
  truths:
    - "Schema cron_jobs possui colunas origin TEXT CHECK IN ('file','db') NOT NULL DEFAULT 'file' e source_file TEXT"
    - "Migration idempotente (ALTER TABLE com try/catch), nao quebra DBs ja existentes sem as colunas"
    - "CronJob type em core + dashboard tem campos origin: 'file'|'db' e sourceFile: string|null"
    - "Jobs criados via POST /api/crons gravam origin='db'"
    - "Jobs criados pelo CronEngine (parser HEARTBEAT.md) gravam origin='file' e source_file apontando pro arquivo"
  artifacts:
    - path: "packages/core/src/state-store.ts"
      provides: "initSchema com migration idempotente, createCronJob aceita origin/sourceFile, mapCronJobRow retorna os novos campos"
    - path: "packages/core/src/types.ts"
      provides: "CronJob interface atualizada"
    - path: "packages/dashboard/src/lib/types.ts"
      provides: "CronJob interface mirror"
    - path: "packages/dashboard/src/lib/core.ts"
      provides: "mapCronJob inclui origin/sourceFile, createCronJob e updateCronJob aceitam os novos campos"
    - path: "packages/dashboard/src/app/api/crons/route.ts"
      provides: "POST default origin='db'"
  key_links:
    - from: "POST /api/crons"
      to: "stateStore/core createCronJob"
      via: "payload inclui origin='db' por default"
    - from: "CronEngine.syncJobsWithDb"
      to: "stateStore.createCronJob"
      via: "grava origin='file', source_file = heartbeatPath"
---

# Fase 8 Plano 01: Schema origin/source_file

**Objetivo:** Adicionar colunas `origin` e `source_file` na tabela `cron_jobs` com migration idempotente, atualizar todos os tipos/mappers/repositorios e garantir que jobs criados pelo dashboard marcam `origin='db'` enquanto jobs do parser HEARTBEAT.md marcam `origin='file'`. Base para os planos 03 (parser ignora Managed section), 05 (form) e 06 (badge visual + CRUD condicional por origem).

## Research

**Next.js docs consultados:**
- Nao aplicavel nesta tarefa (nao toca route handlers alem de passagem direta de payload).

**Decisoes travadas do CONTEXT.md honradas:**
- `decisions > Fonte de verdade`: "Requer no schema: campo origin ENUM('file','db') e source_file TEXT NULL na tabela cron_jobs (se ainda nao existe). Planner deve verificar." — confirmado ausente via leitura de `packages/core/src/state-store.ts` linhas 54-63 e `packages/dashboard/src/lib/core.ts` linhas 90-99.
- DB como fonte de verdade, HEARTBEAT.md coexiste. DB-origin e intocado por hot reload (logica vai pro plano 03, mas depende desta coluna).

**Achados do codebase:**
- Tabela atual (`state-store.ts` linhas 54-63):
  ```sql
  CREATE TABLE IF NOT EXISTS cron_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    schedule TEXT NOT NULL,
    prompt TEXT NOT NULL,
    target_topic_id INTEGER,
    enabled INTEGER DEFAULT 1,
    last_run INTEGER,
    last_status TEXT
  );
  ```
- Dashboard usa `better-sqlite3` (lib/core.ts), core usa `bun:sqlite`. Mesma sintaxe ALTER TABLE, mas logica de migration deve rodar em ambos os lados (o core faz CREATE TABLE IF NOT EXISTS no boot do bot; o dashboard nao roda initSchema hoje — basta o CREATE/ALTER rodar uma vez quando o bot inicia).

## Contexto

@packages/core/src/state-store.ts — schema + repositories (linhas 54-63 sao a tabela; 182-224 sao as operacoes CRUD; 275-328 sao os row types e mappers)
@packages/core/src/types.ts — interface CronJob (linhas 32-41)
@packages/dashboard/src/lib/types.ts — mirror da interface (linhas 21-30)
@packages/dashboard/src/lib/core.ts — mapCronJob e CRUD via better-sqlite3 (linhas 90-99, 144-155, 220-323)
@packages/dashboard/src/app/api/crons/route.ts — POST handler (linhas 17-61)

## Tarefas

<task id="1" type="auto">
<files>packages/core/src/state-store.ts</files>
<action>
Atualizar `initSchema()` (linhas 16-74) para garantir colunas origin e source_file em cron_jobs.

1. Dentro do metodo `initSchema()`, apos o bloco `this.db.exec(...)` que cria as tabelas (linha 73 fecha o exec), adicionar um bloco de migration idempotente:

```typescript
// Migration: adicionar colunas origin e source_file em cron_jobs se nao existirem
try {
  const cols = (this.db.query("PRAGMA table_info(cron_jobs)").all() as Array<{ name: string }>).map(c => c.name);
  if (!cols.includes('origin')) {
    this.db.exec("ALTER TABLE cron_jobs ADD COLUMN origin TEXT NOT NULL DEFAULT 'file'");
  }
  if (!cols.includes('source_file')) {
    this.db.exec("ALTER TABLE cron_jobs ADD COLUMN source_file TEXT");
  }
} catch (err) {
  console.warn('[state-store] Failed to run cron_jobs migration:', err);
}
```

2. Atualizar `CREATE TABLE IF NOT EXISTS cron_jobs` (linhas 54-63) para incluir as colunas diretamente (para instalacoes novas):

```sql
CREATE TABLE IF NOT EXISTS cron_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  schedule TEXT NOT NULL,
  prompt TEXT NOT NULL,
  target_topic_id INTEGER,
  enabled INTEGER DEFAULT 1,
  last_run INTEGER,
  last_status TEXT,
  origin TEXT NOT NULL DEFAULT 'file',
  source_file TEXT
);
```

3. Atualizar `CronJobRow` interface (linhas 275-284) adicionando:
```typescript
origin: string;
source_file: string | null;
```

4. Atualizar `mapCronJobRow` (linhas 319-328) adicionando:
```typescript
origin: row.origin === 'db' ? 'db' : 'file',
sourceFile: row.source_file,
```

5. Atualizar `createCronJob` (linhas 183-189) para incluir origin e source_file no INSERT:
```typescript
createCronJob(job: Omit<CronJob, 'id'>): number {
  const result = this.db.run(
    'INSERT INTO cron_jobs (name, schedule, prompt, target_topic_id, enabled, last_run, last_status, origin, source_file) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [job.name, job.schedule, job.prompt, job.targetTopicId, job.enabled ? 1 : 0, job.lastRun, job.lastStatus, job.origin ?? 'db', job.sourceFile ?? null]
  );
  return Number(result.lastInsertRowid);
}
```
Default `origin='db'` quando nao especificado (chamadas sem origin sao do dashboard; o CronEngine agora deve passar origin='file' explicitamente — isso vira no plano 03).

6. Atualizar `updateCronJob` (linhas 205-220) adicionando suporte a:
```typescript
if (updates.origin !== undefined) { fields.push('origin = ?'); values.push(updates.origin); }
if (updates.sourceFile !== undefined) { fields.push('source_file = ?'); values.push(updates.sourceFile); }
```

7. Atualizar TODAS as queries SELECT de cron_jobs (linhas 193, 200, 201) para incluir `origin, source_file` no final da lista de colunas.
</action>
<verify>
<automated>cd /home/projects/ForgeClaw/packages/core && bunx tsc --noEmit src/state-store.ts src/types.ts</automated>
</verify>
<done>Compila sem erros. initSchema contem logica idempotente. Todas as queries SELECT de cron_jobs retornam origin e source_file. createCronJob INSERT tem 9 placeholders e os mappers preenchem os campos novos.</done>
</task>

<task id="2" type="auto">
<files>packages/core/src/types.ts</files>
<action>
Atualizar interface `CronJob` (linhas 32-41). Adicionar dois campos ao final:
```typescript
export interface CronJob {
  id: number;
  name: string;
  schedule: string;
  prompt: string;
  targetTopicId: number | null;
  enabled: boolean;
  lastRun: number | null;
  lastStatus: string | null;
  origin: 'file' | 'db';
  sourceFile: string | null;
}
```
Nenhuma outra interface muda.
</action>
<verify>
<automated>cd /home/projects/ForgeClaw/packages/core && bunx tsc --noEmit src/types.ts</automated>
</verify>
<done>Interface CronJob tem origin e sourceFile. Compila.</done>
</task>

<task id="3" type="auto">
<files>packages/dashboard/src/lib/types.ts</files>
<action>
Atualizar interface `CronJob` (linhas 21-30) para espelhar o core. Adicionar:
```typescript
export interface CronJob {
  id: number;
  name: string;
  schedule: string;
  prompt: string;
  targetTopicId: number | null;
  enabled: boolean;
  lastRun: number | null;
  lastStatus: string | null;
  origin: 'file' | 'db';
  sourceFile: string | null;
}
```
</action>
<verify>
<automated>cd /home/projects/ForgeClaw/packages/dashboard && bunx tsc --noEmit</automated>
</verify>
<done>Interface mirror atualizada. Compila (sera verificada junto com core.ts na tarefa 4).</done>
</task>

<task id="4" type="auto">
<files>packages/dashboard/src/lib/core.ts</files>
<action>
Atualizar a camada de acesso via better-sqlite3.

1. Atualizar `CronJobRow` interface (linhas 90-99) adicionando:
```typescript
origin: string;
source_file: string | null;
```

2. Atualizar `mapCronJob` (linhas 144-155) adicionando:
```typescript
origin: row.origin === 'db' ? 'db' : 'file',
sourceFile: row.source_file,
```

3. Atualizar `listCronJobs` (linhas 220-233): a query SELECT deve virar:
```typescript
"SELECT id, name, schedule, prompt, target_topic_id, enabled, last_run, last_status, origin, source_file FROM cron_jobs ORDER BY id DESC"
```
Nota: Adicionar `ORDER BY id DESC` para jobs mais novos aparecerem primeiro (sera refinado no plano 06 para ordenar por proximo disparo, mas por agora id DESC e bom o suficiente).

4. Atualizar `getCronJob` (linhas 235-248): mesmo SELECT com as colunas novas.

5. Atualizar `createCronJob` (linhas 250-273):
```typescript
export function createCronJob(job: Omit<CronJob, "id">): number | null {
  const d = getDb();
  if (!d) return null;
  try {
    const result = d
      .prepare(
        "INSERT INTO cron_jobs (name, schedule, prompt, target_topic_id, enabled, last_run, last_status, origin, source_file) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        job.name,
        job.schedule,
        job.prompt,
        job.targetTopicId,
        job.enabled ? 1 : 0,
        job.lastRun,
        job.lastStatus,
        job.origin ?? 'db',
        job.sourceFile ?? null
      );
    return Number(result.lastInsertRowid);
  } catch {
    return null;
  }
}
```

6. Atualizar `updateCronJob` (linhas 275-323) adicionando:
```typescript
if (updates.origin !== undefined) {
  fields.push("origin = ?");
  values.push(updates.origin);
}
if (updates.sourceFile !== undefined) {
  fields.push("source_file = ?");
  values.push(updates.sourceFile);
}
```

7. Adicionar um novo `deleteCronJob` apos `updateCronJob` (CRUD Delete sera usado pelo plano 06):
```typescript
export function deleteCronJob(id: number): boolean {
  const d = getDb();
  if (!d) return false;
  try {
    d.prepare("DELETE FROM cron_jobs WHERE id = ?").run(id);
    return true;
  } catch {
    return false;
  }
}
```
</action>
<verify>
<automated>cd /home/projects/ForgeClaw/packages/dashboard && bunx tsc --noEmit</automated>
</verify>
<done>core.ts compila. listCronJobs/getCronJob retornam origin+sourceFile. createCronJob aceita origin ('db' default). deleteCronJob exportado.</done>
</task>

<task id="5" type="auto">
<files>packages/dashboard/src/app/api/crons/route.ts</files>
<action>
Atualizar o handler POST (linhas 17-61) para aceitar e gravar origin.

1. Expandir o tipo do body para incluir origin e sourceFile opcional:
```typescript
const body = await request.json();
const { name, schedule, prompt, targetTopicId, enabled, origin, sourceFile } = body as {
  name: string;
  schedule: string;
  prompt: string;
  targetTopicId: number | null;
  enabled: boolean;
  origin?: 'file' | 'db';
  sourceFile?: string | null;
};
```

2. Passar pro createCronJob:
```typescript
const id = core.createCronJob({
  name,
  schedule,
  prompt,
  targetTopicId: targetTopicId ?? null,
  enabled: enabled ?? true,
  lastRun: null,
  lastStatus: null,
  origin: origin ?? 'db',
  sourceFile: sourceFile ?? null,
});
```

3. Atualizar o objeto `job` retornado em sucesso (linha 41) para incluir origin e sourceFile.

4. Adicionar handler DELETE exportado (vai servir o plano 06):
```typescript
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = Number(url.searchParams.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      return Response.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }
    const job = core.getCronJob(id);
    if (!job) {
      return Response.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    if (job.origin === 'file') {
      return Response.json({ success: false, error: 'Cannot delete file-origin jobs from dashboard' }, { status: 403 });
    }
    const deleted = core.deleteCronJob(id);
    return Response.json({ success: deleted, id });
  } catch (err) {
    return Response.json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 400 });
  }
}
```

5. Atualizar o bloco PUT action `update` (linhas 85-94) para tambem rejeitar updates em jobs file-origin:
```typescript
if (action === "update" && updates) {
  const existing = core.getCronJob(id);
  if (existing && existing.origin === 'file') {
    return Response.json({ success: false, error: 'Cannot update file-origin jobs from dashboard' }, { status: 403 });
  }
  const updated = core.updateCronJob(id, updates as Partial<Omit<import("@/lib/types").CronJob, "id">>);
  if (updated) {
    return Response.json({ success: true, id, action, source: "core" });
  }
}
```
</action>
<verify>
<automated>cd /home/projects/ForgeClaw/packages/dashboard && bunx tsc --noEmit</automated>
</verify>
<done>POST grava origin='db' por default. DELETE handler existe e rejeita file-origin com 403. PUT update tambem bloqueia file-origin. Compila.</done>
</task>

<task id="6" type="auto">
<files>packages/core/src/cron-engine.ts</files>
<action>
Atualizar `syncJobsWithDb` (linhas 200-251) para gravar `origin='file'` e `sourceFile=this.heartbeatPath` ao criar jobs vindos do HEARTBEAT.md. Isso e o minimo necessario nesta fase — a logica completa de "HEARTBEAT vence em conflito" e "hot reload so afeta file-origin" fica no plano 03. Aqui so garantimos que jobs criados pelo parser sao marcados corretamente.

No bloco `// Create new` (linhas 230-241), alterar a chamada `stateStore.createCronJob`:
```typescript
stateStore.createCronJob({
  name: parsed.name,
  schedule: parsed.schedule,
  prompt: parsed.prompt,
  targetTopicId,
  enabled: true,
  lastRun: null,
  lastStatus: null,
  origin: 'file',
  sourceFile: this.heartbeatPath,
});
```

No bloco `// Update if changed` (linhas 214-229), quando chamar `stateStore.updateCronJob`, tambem passar `origin: 'file'` e `sourceFile: this.heartbeatPath` para garantir que jobs pre-existentes migrados (com origin default 'file' da migration) fiquem consistentes:
```typescript
stateStore.updateCronJob(existing.id, {
  schedule: parsed.schedule,
  prompt: parsed.prompt,
  targetTopicId,
  enabled: true,
  origin: 'file',
  sourceFile: this.heartbeatPath,
});
```
</action>
<verify>
<automated>cd /home/projects/ForgeClaw/packages/core && bunx tsc --noEmit</automated>
</verify>
<done>cron-engine.ts compila. Jobs criados pelo parser gravam origin='file' e source_file. Conclui este plano — a logica de "parser ignora secao Managed" e do plano 03.</done>
</task>

## Criterios de Sucesso

- [ ] `packages/core` compila sem erro (`bunx tsc --noEmit`)
- [ ] `packages/dashboard` compila sem erro (`bunx tsc --noEmit`)
- [ ] Schema cron_jobs tem colunas origin (DEFAULT 'file') e source_file (nullable)
- [ ] Migration e idempotente (rodar 2x nao quebra)
- [ ] POST /api/crons sem origin no body grava origin='db'
- [ ] DELETE /api/crons?id=X existe e retorna 403 para file-origin
- [ ] CronEngine.syncJobsWithDb grava origin='file' + source_file
