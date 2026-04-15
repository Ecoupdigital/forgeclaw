---
phase: 08-dashboard-web
plan: 08-04
type: feature
autonomous: true
wave: 1
depends_on: []
requirements: [DASH-04]
files_modified:
  - packages/core/src/cron-engine.ts
must_haves:
  truths:
    - "Antes de passar o prompt ao ClaudeRunner, CronEngine substitui {today}, {yesterday} e {now} pelos valores ISO locais correspondentes"
    - "Substituicao acontece em runtime (cada execucao), nao em parse/sync — um mesmo job roda amanha com {today} ja atualizado"
    - "Substituicao e case-sensitive e literal (sem regex backtracking caro). Apenas essas 3 vars sao expandidas"
    - "Valor original do prompt (com as vars nao substituidas) permanece no DB — a substituicao e efetuada em memoria na hora de executar"
  artifacts:
    - path: "packages/core/src/cron-engine.ts"
      provides: "Funcao interna expandTemplateVars(prompt: string, now: Date): string usada em executeJob"
  key_links:
    - from: "executeJob"
      to: "runner.run(prompt)"
      via: "prompt passa por expandTemplateVars(job.prompt, new Date()) antes do runner"
---

# Fase 8 Plano 04: Template vars runtime no CronEngine

**Objetivo:** Implementar substituicao runtime de `{today}`, `{yesterday}` e `{now}` no prompt do cron antes de enviar ao ClaudeRunner. Mudanca cross-cutting no codigo da Fase 7 (core) que habilita o hint visual do form (plano 05) a ter efeito real quando o usuario escrever `"Use /up:progresso e me envie um resumo do dia {today}"`. Independente dos outros planos da wave 1 — nao depende de schema, endpoints ou parser.

## Research

**Next.js docs consultados:**
- Nao aplicavel (mudanca puramente no core).

**Decisoes travadas do CONTEXT.md honradas:**
- `decisions > Template vars no prompt (cross-cutting Fase 7)`: "Incluir agora. Substituicao runtime de `{today}`, `{yesterday}`, `{now}` no prompt do cron antes de passar ao ClaudeRunner."
- `decisions > Template vars`: "Formato ISO local (ex: `2026-04-11`). `{now}` inclui hora (`2026-04-11T10:58`)."
- `decisions > Template vars`: "Nao adicionar novas vars alem dessas 3 nesta sessao."
- `decisions > Template vars`: "IMPORTANTE — cross-cutting: planner precisa coordenar duas mudancas: (1) Logica de substituicao no CronEngine, (2) Hint visual no form do dashboard com as vars suportadas." → Este plano faz (1); plano 05 faz (2).
- `deferred`: "Template vars alem das 3 basicas" ficam fora.

**Formato exato decidido:**
- `{today}` → `YYYY-MM-DD` (data local de `new Date()`)
- `{yesterday}` → `YYYY-MM-DD` (um dia antes)
- `{now}` → `YYYY-MM-DDTHH:MM` (data e hora local, sem segundos, sem timezone offset)
- TZ local da maquina (o CONTEXT diz "TZ local da maquina onde ForgeClaw roda"). Usar `.toLocaleString` com parametros ou construir manualmente via `getFullYear/getMonth/getDate/getHours/getMinutes` para evitar quirks de Intl.

**Achados do codebase:**
- `executeJob` (cron-engine.ts linhas 266-341) chama `runner.run(job.prompt, ...)` na linha 292. E nesse callsite que a substituicao deve ocorrer.
- Retry loop existe (linhas 281-308). A substituicao deve ser calculada UMA vez por execucao (nao por tentativa de retry) — usar uma `new Date()` no topo de `executeJob` e reutilizar.

## Contexto

@packages/core/src/cron-engine.ts — executeJob (linhas 266-341), especialmente o runner.run na linha 292

## Tarefas

<task id="1" type="auto">
<files>packages/core/src/cron-engine.ts</files>
<action>
Adicionar funcao helper `expandTemplateVars` no topo do arquivo (logo apos a constante `SCHEDULE_PATTERNS` e a funcao `naturalToCron`, linha ~110, antes de `class CronEngine`).

```typescript
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatDateIso(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatDateTimeIso(d: Date): string {
  return `${formatDateIso(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * Substitui template vars no prompt do cron antes de enviar ao ClaudeRunner.
 * Vars suportadas:
 *   - {today}     -> YYYY-MM-DD local
 *   - {yesterday} -> YYYY-MM-DD local de ontem
 *   - {now}       -> YYYY-MM-DDTHH:MM local
 *
 * Substituicao literal (sem regex). Vars desconhecidas sao deixadas intactas.
 */
function expandTemplateVars(prompt: string, now: Date = new Date()): string {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  return prompt
    .split('{today}').join(formatDateIso(now))
    .split('{yesterday}').join(formatDateIso(yesterday))
    .split('{now}').join(formatDateTimeIso(now));
}
```

Exportar para permitir reuso/teste (util no plano 05 se o form quiser previsualizar):
```typescript
export { CronEngine, naturalToCron, expandTemplateVars };
```
A linha 423 atual ja e `export { CronEngine, naturalToCron };` — estender para incluir `expandTemplateVars`.
</action>
<verify>
<automated>cd /home/projects/ForgeClaw/packages/core && bunx tsc --noEmit src/cron-engine.ts</automated>
</verify>
<done>Funcao exportada, compila. Chamada `expandTemplateVars("hoje e {today} e ontem foi {yesterday}", new Date(2026,3,11,10,58))` retorna `"hoje e 2026-04-11 e ontem foi 2026-04-10"`.</done>
</task>

<task id="2" type="auto">
<files>packages/core/src/cron-engine.ts</files>
<action>
Usar `expandTemplateVars` no `executeJob` (linhas 266-341) antes de passar pro runner.

No inicio do metodo `executeJob(job: CronJob)`, apos `const startedAt = Date.now();` e antes do `stateStore.createCronLog(...)`:
```typescript
async executeJob(job: CronJob): Promise<void> {
  const startedAt = Date.now();
  const executedAt = new Date(startedAt);
  const expandedPrompt = expandTemplateVars(job.prompt, executedAt);

  const logId = stateStore.createCronLog({...});
  // ...
```

Substituir o uso de `job.prompt` dentro do retry loop (linha 292):
```typescript
for await (const event of runner.run(expandedPrompt, { cwd: config.workingDir })) {
```

Apenas esse uso muda. O DB continua armazenando o prompt com vars nao-expandidas (que e o comportamento correto — a substituicao e a tempo de execucao).

Nota: o `logId` ja existia e nao e modificado. Nao alterar o output gravado no cron_log — continua sendo a saida do Claude, nao o prompt.

Opcional (e util para debug): adicionar log:
```typescript
if (expandedPrompt !== job.prompt) {
  console.log(`[cron-engine] Expanded template vars in job "${job.name}"`);
}
```
</action>
<verify>
<automated>cd /home/projects/ForgeClaw/packages/core && bunx tsc --noEmit src/cron-engine.ts</automated>
</verify>
<done>Compila. O prompt passado pro runner e o expandido, o DB nao muda. Retry loop usa a mesma expandedPrompt (consistencia dentro da mesma execucao).</done>
</task>

## Criterios de Sucesso

- [ ] `packages/core` compila sem erro
- [ ] Funcao `expandTemplateVars` exportada de cron-engine.ts
- [ ] executeJob usa prompt expandido na chamada ao runner
- [ ] DB continua com prompt literal (nao expandido)
- [ ] Formato `YYYY-MM-DD` para `{today}` e `{yesterday}`
- [ ] Formato `YYYY-MM-DDTHH:MM` para `{now}`
- [ ] Apenas essas 3 vars sao substituidas (sem expansao generica)
