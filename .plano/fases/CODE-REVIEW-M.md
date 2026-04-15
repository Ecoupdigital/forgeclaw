---
reviewed_at: 2026-04-15T22:00:00Z
reviewer: up-execution-supervisor
decision: REQUEST_CHANGES
phases_reviewed: [18, 19, 20]
gaps_covered: [M1, M2, M3, M4, M5, M6, M7, M8, M9, M10]
files_reviewed: 18
violations_critical: 2
violations_important: 3
violations_minor: 3
score: 7/10
---

# Code Review -- Fases 18-20 (Gaps M1-M10)

**Decisao:** REQUEST_CHANGES

**Score: 7/10** -- Boa cobertura dos 10 gaps, execucao geralmente solida, mas 2 bugs criticos impedem aprovacao.

## Criterios

| # | Criterio | Status | Violacoes |
|---|----------|--------|-----------|
| 1 | Aderencia ao Plano | PASS | 1 menor |
| 2 | Engineering Principles | FAIL | 2 criticas |
| 3 | Production Requirements | PASS | 0 |
| 4 | Code Quality | PASS | 1 menor |
| 5 | Security | FAIL | 1 importante |
| 6 | Runtime Verification | FAIL | 1 critica (inferred) |

---

## Violacoes Criticas

### V-001: Variable shadowing causa crash em runtime (context-builder.ts)

**Arquivo:** `packages/core/src/context-builder.ts:78`
**Principio:** 2 (Implementacao correta)

**Codigo atual:**
```typescript
// line 2: import path from 'node:path';
// ...
private async buildStatLine(): Promise<string> {
  try {
    const dailyDir = process.env.FORGECLAW_DAILY_LOG_DIR
      ?? (this.config.vaultPath
        ? path.join(this.config.vaultPath, '05-pessoal', 'daily-log')   // line 75: uses `path`
        : path.join(homedir(), '.forgeclaw', 'memory', 'daily'));       // line 76: uses `path`
    const today = this.isoDate(new Date());
    const path = `${dailyDir}/${today}.md`;  // line 78: shadows import `path`!!
```

**Problema:** `const path` na linha 78 cria uma variavel local que entra em TDZ (Temporal Dead Zone) para todo o bloco `try`. As linhas 75-76 usam `path.join()` do import, mas o `const path` na mesma funcao causa `ReferenceError: Cannot access 'path' before initialization` em runtime. Bundler/TypeScript nao detecta TDZ -- o erro so aparece quando `buildStatLine()` e chamado.

**Fix sugerido:**
```typescript
const today = this.isoDate(new Date());
const dailyFile = `${dailyDir}/${today}.md`;   // rename to avoid shadowing

let todayCount = 0;
let lastEntryTime = '\u2014';
if (existsSync(dailyFile)) {
  const content = await readFile(dailyFile, 'utf-8');
```

**Severidade:** CRITICA -- crash a cada mensagem recebida.

---

### V-002: `skipPermissions` ausente da whitelist do config PUT

**Arquivo:** `packages/dashboard/src/app/api/config/route.ts:29-47`
**Principio:** 3 (Conectado ponta a ponta)

**Codigo atual:**
```typescript
const VALID_CONFIG_FIELDS = new Set<string>([
  'botToken', 'allowedUsers', 'allowedGroups', 'workingDir', 'vaultPath',
  'voiceProvider', 'claudeModel', 'maxConcurrentSessions', 'defaultRuntime',
  'runtimes', 'writerRuntime', 'writerModel', 'showRuntimeBadge',
  'memoryReviewMode', 'memoryAutoApproveThreshold', 'dashboardToken', 'timezone',
]);
```

**Problema:** O campo `skipPermissions` foi adicionado a `ForgeClawConfig` na fase 18-01, mas a whitelist do PUT criada na fase 19-01 nao o inclui. Quando o dashboard carrega o config com `skipPermissions: true` e o usuario clica "Save Changes", o PUT faz `JSON.stringify(config)` incluindo `skipPermissions`, que sera rejeitado com 400 "Unknown config fields rejected". Isso impede salvar QUALQUER mudanca no config enquanto `skipPermissions` estiver no JSON.

**Fix sugerido:**
```typescript
const VALID_CONFIG_FIELDS = new Set<string>([
  // ... existing fields ...
  'timezone',
  'skipPermissions',   // added in 18-01
]);
```

**Severidade:** CRITICA -- dashboard config save completamente quebrado se config.json tiver o campo.

---

## Violacoes Importantes

### V-003: Import `mockConfig` nao usado no config route

**Arquivo:** `packages/dashboard/src/app/api/config/route.ts:2`
**Principio:** 1 (Implementacao real, nao simulacao) + 2 (Zero imports nao usados)

```typescript
import { mockConfig } from "@/lib/mock-data";  // UNUSED
```

**Problema:** `mockConfig` e importado mas nunca referenciado no corpo do arquivo. A rota ja usa defaults inline (linhas 19-26) em vez de mock. Import morto aumenta bundle e confunde sobre intencao.

**Fix:** Remover a linha 2.

---

### V-004: Paths hardcoded em arquivos de prompt (.md)

**Arquivo:** `packages/core/src/memory/prompts/writer.md:7` e `janitor.md:9`
**Principio:** 1 (nao simulacao -- path real hardcoded), relacionado a M1

```markdown
<!-- writer.md -->
daily log (`/home/vault/05-pessoal/daily-log/YYYY-MM-DD.md`)

<!-- janitor.md -->
Daily log (`/home/vault/05-pessoal/daily-log/*.md`)
```

**Problema:** O gap M1 tinha como objetivo eliminar TODOS os hardcoded paths para `/home/vault/05-pessoal/daily-log`. O plano e verificacao (task 7 do 18-01) fizeram `grep` apenas em `packages/**/*.ts`, nao em `*.md`. Estes prompts sao enviados ao Claude CLI e contem paths que podem nao existir no servidor.

**Fix:** Substituir por path generico ou placeholder nos prompts:
```markdown
daily log (`{dailyDir}/YYYY-MM-DD.md`)
```
Ou melhor: injetar o path real dinamicamente no prompt template.

**Nota:** Estes sao prompts para o modelo, nao codigo executavel. O impacto real e menor (o modelo nao usa o path para file ops, o JS cuida disso), mas contradiz o objetivo declarado do M1.

---

### V-005: photo.ts limpa localPath imediatamente no finally, antes do Claude processar

**Arquivo:** `packages/bot/src/handlers/photo.ts:56-63`
**Principio:** 3 (Conectado ponta a ponta)

```typescript
// line 49: await textHandler(ctx);  <-- textHandler spawns ClaudeRunner which reads the file
// ...
} finally {
  if (tmpPath) await fileHandler.cleanup(tmpPath);
  if (localPath) {
    try { await unlink(localPath); } catch { /* ignore */ }  // deletes before Claude reads!
  }
}
```

**Problema:** O `textHandler(ctx)` inicia o `ClaudeRunner.run()` que e um `AsyncGenerator`. O handler pode retornar antes do Claude CLI terminar de processar a imagem (o text handler aguarda stream, mas a questao e se `await textHandler(ctx)` realmente espera o `for await` loop completo). Se `textHandler` retorna apos enviar o prompt ao Claude CLI mas antes do CLI ler o arquivo, o `unlink` no finally deletara a imagem antes do Claude poder le-la.

**Analise:** Revisando o text handler, `processMessage` faz `for await (const event of runner.run(prompt, ...))` que consome todo o stream. Entao `await textHandler(ctx)` provavelmente espera o Claude CLI terminar. **Risco baixo na pratica**, mas o design e fragil -- qualquer mudanca futura no text handler que retorne early quebraria fotos.

**Recomendacao:** Manter como esta por agora, mas documentar a dependencia. O mesmo se aplica a `document.ts`.

---

## Violacoes Menores

### V-006: `classifyClaudeError` pode false-positive em "auth" substring

**Arquivo:** `packages/bot/src/handlers/text.ts:395`

```typescript
lower.includes('auth')  // matches "author", "authenticate", etc.
```

Uma mensagem de erro contendo "author" ou "unauthorized access to author data" causaria match incorreto. Risco baixo na pratica (erros do Claude CLI dificilmente contem "author"), mas o check `lower.includes('auth')` e muito broad.

**Fix sugerido:** Usar regex word boundary ou remover o check generico `'auth'`, ja que `'not authenticated'`, `'unauthorized'`, e `'401'` cobrem os casos reais.

---

### V-007: `resolveDailyDir()` duplicada em 3 arquivos

**Arquivo:** `packages/core/src/memory/janitor.ts:29`, `writer.ts:23`, `packages/dashboard/src/lib/core.ts:36`

A mesma funcao `resolveDailyDir()` com logica identica foi copiada em 3 lugares. Deveria ser extraida para `packages/core/src/config.ts` (ou util) e re-exportada.

**Nota:** O plano 18-01 estava ciente disso e escolheu inlining por pragmatismo (evitar dependencia cruzada dashboard->core). Aceitavel como tradeoff, mas anotado como tech debt.

---

### V-008: Telegram group IDs podem ser negativos

**Arquivo:** `packages/dashboard/src/components/config-tab.tsx:91-93`

```typescript
const parsed = parseInt(draft, 10);
if (Number.isNaN(parsed)) return;
```

Group IDs no Telegram sao numeros negativos (ex: `-1001234567890`). O `<Input type="number">` pode nao aceitar o caractere `-` dependendo do browser. O `parseInt` funciona com negativos, mas o UX pode confundir.

**Recomendacao:** Mudar para `type="text"` com validacao manual, ou adicionar nota "Group IDs are negative numbers (e.g. -1001234567890)" no placeholder.

---

## Sumario por Gap

| Gap | Status | Notas |
|-----|--------|-------|
| M1 | PARTIAL | Codigo OK, mas prompts .md ainda tem path hardcoded (V-004) |
| M2 | OK | v1 cron removido, @deprecated adicionado |
| M3 | OK | skipPermissions funciona no claude-runner |
| M4 | BROKEN | Whitelist falta skipPermissions (V-002), import morto (V-003) |
| M5 | OK | Export funciona, testado E2E |
| M6 | OK | Emoji prefix com unicode escapes |
| M7 | OK | Photo copy funciona (cleanup timing e fragil mas funcional, V-005) |
| M8 | OK | Bun version check com compareSemver |
| M9 | OK | EditableIdList com anti-lockout |
| M10 | OK | classifyClaudeError com 7 categorias |

## Mudancas Requeridas (ordenadas por prioridade)

1. **[CRITICO]** `packages/core/src/context-builder.ts:78` -- Renomear `const path` para `const dailyFile` (ou similar) para eliminar shadowing do import `path` (V-001)
2. **[CRITICO]** `packages/dashboard/src/app/api/config/route.ts:29` -- Adicionar `'skipPermissions'` ao `VALID_CONFIG_FIELDS` Set (V-002)
3. **[IMPORTANTE]** `packages/dashboard/src/app/api/config/route.ts:2` -- Remover import nao usado `mockConfig` (V-003)
4. **[MENOR]** `packages/core/src/memory/prompts/writer.md:7` e `janitor.md:9` -- Substituir paths hardcoded por descricao generica (V-004)
