---
phase: 08-dashboard-web
plan: 08-03
type: refactor
autonomous: true
wave: 1
depends_on: []
requirements: [DASH-04]
files_modified:
  - packages/core/src/cron-engine.ts
must_haves:
  truths:
    - "parseHeartbeat ignora conteudo dentro da secao '## Managed by Dashboard'"
    - "syncJobsWithDb NAO desabilita jobs com origin='db' ao reloadar HEARTBEAT.md"
    - "Nova funcao writeDashboardSection(jobs) existe e (re)escreve apenas a secao '## Managed by Dashboard' do HEARTBEAT.md, preservando o resto do conteudo"
    - "Hot reload do HEARTBEAT.md afeta APENAS jobs com origin='file'"
  artifacts:
    - path: "packages/core/src/cron-engine.ts"
      provides: "Parser atualizado + writer de mirror section + sync seletivo por origem"
  key_links:
    - from: "parseHeartbeat"
      to: "regex de sections"
      via: "descarta tudo a partir de '## Managed by Dashboard' antes de procurar headers"
    - from: "syncJobsWithDb"
      to: "stateStore.listCronJobs"
      via: "filtra por origin='file' antes de marcar como 'removidos'"
---

# Fase 8 Plano 03: Parser ignora secao Managed by Dashboard

**Objetivo:** Ajustar o parser de HEARTBEAT.md e a logica de sync do CronEngine para (a) ignorar uma secao dedicada `## Managed by Dashboard` durante o parsing, e (b) NUNCA desabilitar ou sobrescrever jobs com `origin='db'` durante o hot reload. Adicionar tambem uma funcao helper para escrever/atualizar a secao mirror (usada pelo dashboard apos POST/PUT/DELETE — integracao fina fica no plano 06 via `core.writeDashboardSection` chamado da route handler).

## Research

**Next.js docs consultados:**
- Nao aplicavel (mudanca puramente no core, sem toque em route handlers alem do uso futuro).

**Decisoes travadas do CONTEXT.md honradas:**
- `decisions > Fonte de verdade`: "HEARTBEAT vence em conflito. Se um job file-origin e DB-origin tem o mesmo identificador, declarative config (arquivo) sobrescreve DB na proxima reload." — logica mantida para jobs file-origin; jobs DB-origin sao intocados.
- `decisions > Fonte de verdade`: "Hot reload so afeta file-origin. Quando HEARTBEAT.md muda, CronEngine troca APENAS jobs com `origin='file'`. Jobs com `origin='db'` ficam intocados."
- `decisions > Fonte de verdade`: "Dashboard-origin tambem sao escritos numa secao dedicada do HEARTBEAT.md (ex: `## Managed by Dashboard`) para ficarem versionados no git. MAS o parser ignora explicitamente essa secao na releitura — a secao e apenas mirror de visibilidade, nao fonte de verdade funcional."

**Achados do codebase:**
- `parseHeartbeat` (cron-engine.ts linhas 123-166) usa regex `^## (.+?) → tópico: (.+)$` — qualquer header nessa forma e aceito. Precisamos cortar o conteudo antes do marcador `## Managed by Dashboard`.
- `syncJobsWithDb` (linhas 200-251) hoje itera TODOS os jobs e desabilita aqueles nao presentes no parsed. Precisa filtrar para agir apenas em jobs file-origin.
- O writer atual `writeHeartbeat` (em `packages/dashboard/src/lib/core.ts` linhas 504-512) sobrescreve o arquivo inteiro — isso e usado pelo editor raw. Para o mirror, precisamos de uma funcao que preserve tudo acima do marcador e reescreva apenas a secao. Esse writer vai no core (pois o CronEngine tambem pode precisar) e sera reexposto pelo dashboard wrapper no plano 06.

**Formato do marcador decidido:**
- Header exato: `## Managed by Dashboard` (linha exata em qualquer lugar do arquivo)
- Tudo apos esse header (ate o proximo header de mesmo nivel `^##` OU fim do arquivo) e considerado managed
- O writer substitui o conteudo entre o marcador e o proximo `##` (ou EOF)

## Contexto

@packages/core/src/cron-engine.ts — parseHeartbeat (linhas 123-166), syncJobsWithDb (linhas 200-251), dependencias de node:fs/promises ja importadas (linha 2)

## Tarefas

<task id="1" type="auto">
<files>packages/core/src/cron-engine.ts</files>
<action>
Modificar `parseHeartbeat(content: string)` (linhas 123-166) para descartar a secao `## Managed by Dashboard` antes de procurar headers.

Adicionar no topo do metodo (logo apos `parseHeartbeat(content: string): ParsedJob[] {`):

```typescript
parseHeartbeat(content: string): ParsedJob[] {
  // Descartar a secao "## Managed by Dashboard" (mirror do dashboard, nao fonte de verdade)
  const managedHeader = /^## Managed by Dashboard\s*$/m;
  const managedMatch = managedHeader.exec(content);
  if (managedMatch) {
    const start = managedMatch.index;
    // Procurar proximo header '^## ' DEPOIS do marcador
    const rest = content.slice(start + managedMatch[0].length);
    const nextHeader = rest.match(/^## /m);
    if (nextHeader && nextHeader.index !== undefined) {
      // Remove so o trecho do marcador ate o proximo header
      content = content.slice(0, start) + content.slice(start + managedMatch[0].length + nextHeader.index);
    } else {
      // Remove ate o fim
      content = content.slice(0, start);
    }
  }

  const jobs: ParsedJob[] = [];
  // ... resto do metodo permanece igual (linhas 124-165)
```

O resto do metodo fica inalterado — apenas o `content` agora vem sem a secao managed.
</action>
<verify>
<automated>cd /home/projects/ForgeClaw/packages/core && bunx tsc --noEmit src/cron-engine.ts</automated>
</verify>
<done>Compila. parseHeartbeat descarta a secao Managed antes de procurar jobs.</done>
</task>

<task id="2" type="auto">
<files>packages/core/src/cron-engine.ts</files>
<action>
Modificar `syncJobsWithDb(parsedJobs: ParsedJob[])` (linhas 200-251) para filtrar apenas jobs file-origin.

1. Substituir `const existingJobs = stateStore.listCronJobs();` (linha 201) por:
```typescript
const allJobs = stateStore.listCronJobs();
const existingJobs = allJobs.filter((j) => j.origin === 'file');
```

2. O `Map existingByName` (linha 202) continua usando `existingJobs` (agora so file). Isso ja evita que um job DB-origin com mesmo nome seja atualizado pelo parser — decisao correta: parser cria um NOVO job file-origin se o nome colide, e DB vence pro ciclo atual ate o dashboard detectar. MAS o CONTEXT diz "HEARTBEAT vence em conflito". Para implementar isso corretamente, adicionar um passo extra antes do loop de create/update:

```typescript
// HEARTBEAT vence em conflito: se um job db-origin tem mesmo name que um parsed job,
// desabilitar o db-origin (marcacao, nao delete, para preservar cron_logs).
const parsedNamesSet = new Set(parsedJobs.map((p) => p.name));
for (const job of allJobs) {
  if (job.origin === 'db' && parsedNamesSet.has(job.name) && job.enabled) {
    stateStore.updateCronJob(job.id, { enabled: false });
    console.log(`[cron-engine] DB-origin job "${job.name}" conflicts with HEARTBEAT.md, disabled.`);
  }
}
```

3. O loop final que desabilita jobs removidos do HEARTBEAT.md (linhas 245-250) AGORA so age em `existingJobs` (que ja foi filtrado para file-origin). Assim jobs DB-origin nao sao tocados quando um parsed job some:
```typescript
// Disable jobs removed from HEARTBEAT.md (apenas file-origin)
for (const existing of existingJobs) {
  if (!parsedNames.has(existing.name) && existing.enabled) {
    stateStore.updateCronJob(existing.id, { enabled: false });
    console.log(`[cron-engine] Disabled removed job (file-origin): ${existing.name}`);
  }
}
```

4. Tambem ajustar o trecho `scheduleJob` callsite dentro de `start()` (linha 189-192) — hoje agenda apenas `dbJobs = stateStore.listCronJobs(true)` (enabledOnly). Deixar como esta: agenda ambos origens desde que enabled. Isso ja e o comportamento desejado (jobs DB-origin enabled disparam via croner igual aos file-origin).
</action>
<verify>
<automated>cd /home/projects/ForgeClaw/packages/core && bunx tsc --noEmit src/cron-engine.ts</automated>
</verify>
<done>Compila. syncJobsWithDb (a) desabilita DB-origin que colidem com parsed name, (b) cria/atualiza file-origin, (c) desabilita file-origin removidos do arquivo, (d) nunca toca DB-origin nao-colidentes.</done>
</task>

<task id="3" type="auto">
<files>packages/core/src/cron-engine.ts</files>
<action>
Adicionar metodo publico `writeDashboardSection(jobs: CronJob[])` ao CronEngine para (re)escrever a secao `## Managed by Dashboard` no HEARTBEAT.md. Adicionar ANTES de `async runJobNow(jobId: number)` (linha 396).

Importar `writeFile` de `node:fs/promises` — ja importado na linha 2 (`readFile, watch`). Adicionar `writeFile` ali:
```typescript
import { readFile, writeFile, watch } from 'node:fs/promises';
```

Novo metodo:
```typescript
/**
 * Reescreve apenas a secao "## Managed by Dashboard" do HEARTBEAT.md com os jobs fornecidos.
 * Preserva todo o conteudo antes do marcador e qualquer header apos o bloco managed.
 * Esta secao e ignorada pelo parser — e apenas um mirror legivel por humanos/git.
 */
async writeDashboardSection(jobs: CronJob[]): Promise<void> {
  let content = '';
  if (existsSync(this.heartbeatPath)) {
    content = await readFile(this.heartbeatPath, 'utf-8');
  }

  const marker = '## Managed by Dashboard';
  const markerRegex = /^## Managed by Dashboard\s*$/m;
  const match = markerRegex.exec(content);

  // Monta o corpo da secao managed
  const lines: string[] = [marker, '', '> Auto-generated mirror from dashboard DB. Edits here are ignored by the parser.', ''];
  for (const job of jobs) {
    if (job.origin !== 'db') continue;
    const topicLabel = job.targetTopicId ? `topic#${job.targetTopicId}` : 'default';
    // Formato identico ao parser para legibilidade (mas parser ignora esta secao)
    lines.push(`### ${job.schedule} → tópico: ${topicLabel}`);
    lines.push(`- ${job.prompt.replace(/\n/g, ' ').slice(0, 500)}`);
    lines.push('');
  }
  const sectionBody = lines.join('\n') + '\n';

  let newContent: string;
  if (match) {
    const start = match.index;
    // Procura proximo header '^## ' apos o marcador (nao '### ', os '### ' do body sao protegidos)
    const rest = content.slice(start + match[0].length);
    const nextTopLevel = rest.match(/^## /m);
    if (nextTopLevel && nextTopLevel.index !== undefined) {
      newContent = content.slice(0, start) + sectionBody + '\n' + content.slice(start + match[0].length + nextTopLevel.index);
    } else {
      newContent = content.slice(0, start) + sectionBody;
    }
  } else {
    // Append no fim
    const trimmed = content.trimEnd();
    newContent = (trimmed ? trimmed + '\n\n' : '') + sectionBody;
  }

  await writeFile(this.heartbeatPath, newContent, 'utf-8');
  console.log(`[cron-engine] Wrote ${jobs.filter((j) => j.origin === 'db').length} DB-origin jobs to HEARTBEAT.md managed section`);
}
```

Nota: usa `###` (h3) dentro da secao managed para evitar colisao com o regex do parser que procura `^## `. O parser ja ignora tudo na secao managed entao isso e defense-in-depth.
</action>
<verify>
<automated>cd /home/projects/ForgeClaw/packages/core && bunx tsc --noEmit src/cron-engine.ts</automated>
</verify>
<done>Metodo `writeDashboardSection` existe e compila. Testavel unit-wise no plano 06 via endpoint POST /api/crons.</done>
</task>

## Criterios de Sucesso

- [ ] `packages/core` compila sem erro
- [ ] parseHeartbeat descarta conteudo da secao `## Managed by Dashboard`
- [ ] syncJobsWithDb NAO desabilita jobs DB-origin (exceto em conflito de nome)
- [ ] syncJobsWithDb desabilita apenas file-origin removidos do arquivo
- [ ] CronEngine.writeDashboardSection existe como metodo publico
- [ ] writeDashboardSection preserva conteudo do arquivo fora da secao managed
