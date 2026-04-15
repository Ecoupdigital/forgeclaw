---
phase: 17-immediate-memory
plan: 17-01
type: feature
autonomous: true
wave: 1
depends_on: []
requirements: [HIG-H6]
must_haves:
  truths:
    - "User sends 'lembra que eu prefiro dark mode' and a memory entry with kind='preference' is created immediately in memory_entries table"
    - "User sends 'remember that the deploy key is on 1password' and a memory entry with kind='fact' is created immediately"
    - "The message still flows to Claude normally (user gets Claude's response)"
    - "Duplicate memory triggers are deduped by content_hash (builtin-store handles this)"
    - "Non-matching messages are not affected (zero overhead for normal messages)"
  artifacts:
    - path: "packages/bot/src/handlers/immediate-memory.ts"
      provides: "Regex detection + memory save logic"
    - path: "packages/bot/src/handlers/text.ts"
      provides: "Integration point — calls immediate memory before Claude processing"
  key_links:
    - from: "immediate-memory.ts"
      to: "memoryManagerV2.handleToolCall"
      via: "import { memoryManagerV2 } from '@forgeclaw/core'"
    - from: "text.ts"
      to: "immediate-memory.ts"
      via: "import { detectAndSaveImmediateMemory } from './immediate-memory'"
---

# Fase 17 Plano 01: Immediate Memory Save (H6)

**Objetivo:** Quando o usuario envia mensagens com frases trigger como "lembra que", "remember that", "nao esqueca", extrair o conteudo e salvar imediatamente como memory entry via memoryManagerV2. A mensagem continua fluindo para Claude normalmente. Isso elimina o delay de horas do janitor (que roda 1x/dia) para memorias explicitas.

## Contexto

@packages/bot/src/handlers/text.ts — text handler que recebe mensagens do usuario. `processMessage()` (linha 82) e onde o texto ja esta disponivel antes de ir para Claude. A integracao deve ser ANTES do `contextBuilder.build()` (linha 125) mas DEPOIS do `stateStore.createMessage()` (linha 103) para que a mensagem ja esteja persistida.

@packages/core/src/memory/manager.ts — MemoryManager singleton (`memoryManagerV2`). Metodo `handleToolCall('memory', { action: 'add', kind, content })` roteia para o BuiltinMemoryProvider que chama `store.add()` com dedup por hash, security scanner, audit trail e bounded limits. Este e o caminho correto -- NAO usar stateStore.createMemoryEntry() diretamente.

@packages/core/src/memory/builtin-provider.ts — handleToolCall com action='add' chama `this.store.add(kind, content, { actor: 'agent', sourceType: 'manual' })`. Para immediate-memory, queremos actor='user' e sourceType='session'.

@packages/core/src/memory/builtin-store.ts — `add()` faz: trim, security scan, sha256 dedup, bounded char limit check, createMemoryEntry + createMemoryAudit. Retorna `WriteResult { ok, reason?, entry? }`.

@packages/core/src/memory/types.ts — MemoryToolInput: `{ action, target?, query?, content?, kind? }`.

@packages/core/src/types.ts — MemoryEntryKind: 'behavior' | 'user_profile' | 'fact' | 'decision' | 'preference'.

## Tarefas

<task id="1" type="auto">
<files>packages/bot/src/handlers/immediate-memory.ts</files>
<action>
Criar o modulo `immediate-memory.ts` com a funcao principal e o regex de deteccao.

**Imports:**
```typescript
import { memoryManagerV2 } from '@forgeclaw/core';
import type { MemoryEntryKind } from '@forgeclaw/core';
```

**Constantes — trigger patterns:**
```typescript
/**
 * Regex patterns that indicate the user wants to save something to memory.
 * Each entry has: pattern (regex), extractGroup (capture group index for content),
 * and defaultKind (the MemoryEntryKind to use).
 *
 * Patterns are tested in order; first match wins.
 * All patterns are case-insensitive.
 */
const MEMORY_TRIGGERS: Array<{
  pattern: RegExp;
  extractGroup: number;
  defaultKind: MemoryEntryKind;
}> = [
  // Portuguese triggers
  { pattern: /^lembr[ae]\s+que\s+(.+)/i, extractGroup: 1, defaultKind: 'fact' },
  { pattern: /^n[aã]o\s+esque[cç]a\s+(?:que\s+)?(.+)/i, extractGroup: 1, defaultKind: 'fact' },
  { pattern: /^anota\s+(?:que\s+|a[ií]\s+)?(.+)/i, extractGroup: 1, defaultKind: 'fact' },
  { pattern: /^guarda\s+(?:que\s+|isso\s+)?(.+)/i, extractGroup: 1, defaultKind: 'fact' },
  { pattern: /^memoriz[ae]\s+(?:que\s+|isso\s+)?(.+)/i, extractGroup: 1, defaultKind: 'fact' },
  { pattern: /^eu\s+prefiro\s+(.+)/i, extractGroup: 1, defaultKind: 'preference' },
  { pattern: /^minha\s+prefer[eê]ncia\s+[eé]\s+(.+)/i, extractGroup: 1, defaultKind: 'preference' },
  // English triggers
  { pattern: /^remember\s+that\s+(.+)/i, extractGroup: 1, defaultKind: 'fact' },
  { pattern: /^don'?t\s+forget\s+(?:that\s+)?(.+)/i, extractGroup: 1, defaultKind: 'fact' },
  { pattern: /^memorize\s+(?:that\s+)?(.+)/i, extractGroup: 1, defaultKind: 'fact' },
  { pattern: /^note\s+that\s+(.+)/i, extractGroup: 1, defaultKind: 'fact' },
  { pattern: /^i\s+prefer\s+(.+)/i, extractGroup: 1, defaultKind: 'preference' },
];
```

**Funcao de deteccao e kind inference:**
```typescript
interface MemoryDetection {
  content: string;
  kind: MemoryEntryKind;
  trigger: string; // the matched trigger phrase (for logging)
}

/**
 * Check if a message matches any memory-save trigger pattern.
 * Returns null if no match.
 */
export function detectMemoryTrigger(text: string): MemoryDetection | null {
  const trimmed = text.trim();
  if (trimmed.length < 10) return null; // too short to be meaningful

  for (const { pattern, extractGroup, defaultKind } of MEMORY_TRIGGERS) {
    const match = trimmed.match(pattern);
    if (match && match[extractGroup]) {
      const content = match[extractGroup].trim();
      if (content.length < 5) continue; // extracted content too short

      // Infer kind from content keywords
      const kind = inferKind(content, defaultKind);
      const trigger = trimmed.slice(0, trimmed.indexOf(content)).trim();

      return { content, kind, trigger };
    }
  }

  return null;
}
```

**Kind inference helper:**
```typescript
/**
 * Refine the kind based on content keywords.
 * - Content mentioning "prefiro", "prefer", "gosto de" -> 'preference'
 * - Content mentioning "decidi", "decided", "a partir de agora" -> 'decision'
 * - Otherwise keep defaultKind
 */
function inferKind(content: string, defaultKind: MemoryEntryKind): MemoryEntryKind {
  const lower = content.toLowerCase();

  if (/\b(prefir[oa]|prefer[eo]?|gosto\s+de|i\s+like|i\s+prefer)\b/.test(lower)) {
    return 'preference';
  }
  if (/\b(decid[io]|decided|a\s+partir\s+de\s+agora|from\s+now\s+on)\b/.test(lower)) {
    return 'decision';
  }

  return defaultKind;
}
```

**Main save function:**
```typescript
/**
 * Detect memory trigger in message text and save immediately.
 * Best-effort: errors are logged but never block message processing.
 * Returns true if a memory was saved, false otherwise.
 */
export async function detectAndSaveImmediateMemory(text: string): Promise<boolean> {
  const detection = detectMemoryTrigger(text);
  if (!detection) return false;

  try {
    const result = await memoryManagerV2.handleToolCall('memory', {
      action: 'add',
      kind: detection.kind,
      content: detection.content,
    });

    if (result.ok) {
      console.log(
        `[immediate-memory] saved: kind=${detection.kind} trigger="${detection.trigger}" content="${detection.content.slice(0, 80)}"`
      );
    } else {
      console.warn(
        `[immediate-memory] rejected: ${result.message} (trigger="${detection.trigger}")`
      );
    }

    return result.ok;
  } catch (err) {
    console.error('[immediate-memory] failed to save:', err);
    return false;
  }
}
```

**IMPORTANTE:** A funcao `handleToolCall('memory', ...)` no BuiltinMemoryProvider usa `{ actor: 'agent', sourceType: 'manual' }` por padrao. Para melhor rastreabilidade, apos o MVP funcionar, podemos refinar. Mas o caminho via handleToolCall ja garante dedup, security scan, audit, e bounded limits -- NAO reimplementar essa logica.

**Nao fazer:**
- NAO usar stateStore.createMemoryEntry() diretamente (pula security scan e dedup)
- NAO bloquear o fluxo da mensagem -- tudo e best-effort com try/catch
- NAO criar patterns muito amplos que gerem falsos positivos (ex: "lembra" sozinho sem "que")
</action>
<verify>
<automated>cd /home/projects/ForgeClaw && npx tsc --noEmit packages/bot/src/handlers/immediate-memory.ts 2>&1 | head -20</automated>
</verify>
<done>
- Arquivo `immediate-memory.ts` existe com funcoes `detectMemoryTrigger()` e `detectAndSaveImmediateMemory()` exportadas
- TypeScript compila sem erros
- Regex patterns cobrem: lembra que, lembre que, nao esqueca, anota, guarda, memoriza, remember that, don't forget, memorize, note that, eu prefiro, i prefer
- Kind inference distingue fact vs preference vs decision
</done>
</task>

<task id="2" type="auto">
<files>packages/bot/src/handlers/text.ts</files>
<action>
Integrar a deteccao de memoria imediata no `processMessage()`.

**Adicionar import no topo do arquivo (apos os imports existentes, ~linha 21):**
```typescript
import { detectAndSaveImmediateMemory } from './immediate-memory';
```

**Inserir chamada no `processMessage()`**, APOS o `stateStore.createMessage()` (linha 103-107) e ANTES do `contextBuilder.build()` (linha 124). A posicao exata e entre o bloco `eventBus.emit('message:incoming', ...)` (que termina na linha 121) e o comentario `// GAP 1:` (linha 123).

Inserir estas linhas entre a linha 121 (`});`) e a linha 123 (`// GAP 1:`):

```typescript
    // H6: Immediate memory save — detect "lembra que X" patterns and persist
    // to memory_entries before Claude processes the message. Best-effort:
    // fire-and-forget so it never delays the response.
    detectAndSaveImmediateMemory(text).catch((err) => {
      console.error('[text-handler] immediate memory save failed:', err);
    });
```

**Por que fire-and-forget (sem await)?**
- A mensagem NAO deve esperar o DB write para chegar ao Claude
- Se a memoria falhar, o usuario ainda recebe resposta normal
- O janitor continua como safety net para qualquer coisa que escape

**NAO modificar nenhum outro trecho do arquivo.** A unica mudanca e:
1. Um import novo no topo
2. 5 linhas inseridas entre o eventBus.emit e o contextBuilder.build
</action>
<verify>
<automated>cd /home/projects/ForgeClaw && npx tsc --noEmit packages/bot/src/handlers/text.ts 2>&1 | head -20</automated>
</verify>
<done>
- `text.ts` importa `detectAndSaveImmediateMemory` de `./immediate-memory`
- Chamada fire-and-forget inserida entre `eventBus.emit('message:incoming')` e `contextBuilder.build()`
- Mensagem continua fluindo para Claude normalmente independente do resultado da deteccao
- TypeScript compila sem erros
</done>
</task>

<task id="3" type="auto">
<files>packages/bot/src/handlers/__tests__/immediate-memory.test.ts</files>
<action>
Criar testes unitarios para a funcao `detectMemoryTrigger()` (logica pura, sem DB/side effects).

**Imports:**
```typescript
import { describe, test, expect } from 'bun:test';
import { detectMemoryTrigger } from '../immediate-memory';
```

**Test cases — matches (deve retornar detection com content e kind corretos):**

```typescript
describe('detectMemoryTrigger', () => {
  describe('Portuguese triggers', () => {
    test('lembra que -> fact', () => {
      const r = detectMemoryTrigger('lembra que o deploy key está no 1password');
      expect(r).not.toBeNull();
      expect(r!.content).toBe('o deploy key está no 1password');
      expect(r!.kind).toBe('fact');
    });

    test('lembre que -> fact', () => {
      const r = detectMemoryTrigger('lembre que a reunião é toda terça');
      expect(r).not.toBeNull();
      expect(r!.content).toBe('a reunião é toda terça');
      expect(r!.kind).toBe('fact');
    });

    test('não esqueça que -> fact', () => {
      const r = detectMemoryTrigger('não esqueça que o servidor roda em UTC');
      expect(r).not.toBeNull();
      expect(r!.content).toBe('o servidor roda em UTC');
      expect(r!.kind).toBe('fact');
    });

    test('nao esqueca -> fact (without diacritics)', () => {
      const r = detectMemoryTrigger('nao esqueca que preciso revisar o PR');
      expect(r).not.toBeNull();
      expect(r!.kind).toBe('fact');
    });

    test('anota que -> fact', () => {
      const r = detectMemoryTrigger('anota que o cliente X paga no dia 15');
      expect(r).not.toBeNull();
      expect(r!.content).toBe('o cliente X paga no dia 15');
      expect(r!.kind).toBe('fact');
    });

    test('anota aí -> fact', () => {
      const r = detectMemoryTrigger('anota aí que mudei o schema do banco');
      expect(r).not.toBeNull();
      expect(r!.kind).toBe('fact');
    });

    test('guarda que -> fact', () => {
      const r = detectMemoryTrigger('guarda que o domínio expira em dezembro');
      expect(r).not.toBeNull();
      expect(r!.kind).toBe('fact');
    });

    test('memoriza que -> fact', () => {
      const r = detectMemoryTrigger('memoriza que prefiro commits pequenos');
      expect(r).not.toBeNull();
      expect(r!.kind).toBe('preference'); // inferKind detects "prefiro"
    });

    test('eu prefiro -> preference', () => {
      const r = detectMemoryTrigger('eu prefiro dark mode em tudo');
      expect(r).not.toBeNull();
      expect(r!.kind).toBe('preference');
    });
  });

  describe('English triggers', () => {
    test('remember that -> fact', () => {
      const r = detectMemoryTrigger('remember that the API key is in vault');
      expect(r).not.toBeNull();
      expect(r!.content).toBe('the API key is in vault');
      expect(r!.kind).toBe('fact');
    });

    test("don\'t forget -> fact", () => {
      const r = detectMemoryTrigger("don't forget that tests must pass before deploy");
      expect(r).not.toBeNull();
      expect(r!.kind).toBe('fact');
    });

    test('i prefer -> preference', () => {
      const r = detectMemoryTrigger('i prefer functional components over class ones');
      expect(r).not.toBeNull();
      expect(r!.kind).toBe('preference');
    });

    test('note that -> fact', () => {
      const r = detectMemoryTrigger('note that the DB runs on port 5433 not 5432');
      expect(r).not.toBeNull();
      expect(r!.kind).toBe('fact');
    });
  });

  describe('kind inference', () => {
    test('content with "decidi" -> decision', () => {
      const r = detectMemoryTrigger('lembra que eu decidi usar Bun ao invés de Node');
      expect(r).not.toBeNull();
      expect(r!.kind).toBe('decision');
    });

    test('content with "a partir de agora" -> decision', () => {
      const r = detectMemoryTrigger('anota que a partir de agora deployamos via GitHub Actions');
      expect(r).not.toBeNull();
      expect(r!.kind).toBe('decision');
    });

    test('content with "from now on" -> decision', () => {
      const r = detectMemoryTrigger('remember that from now on we use TypeScript strict mode');
      expect(r).not.toBeNull();
      expect(r!.kind).toBe('decision');
    });
  });

  describe('non-matches (should return null)', () => {
    test('normal question', () => {
      expect(detectMemoryTrigger('qual é o status do deploy?')).toBeNull();
    });

    test('"lembra" without "que"', () => {
      expect(detectMemoryTrigger('lembra daquele bug?')).toBeNull();
    });

    test('too short message', () => {
      expect(detectMemoryTrigger('oi')).toBeNull();
    });

    test('too short extracted content', () => {
      expect(detectMemoryTrigger('lembra que ok')).toBeNull();
    });

    test('empty string', () => {
      expect(detectMemoryTrigger('')).toBeNull();
    });

    test('normal english message', () => {
      expect(detectMemoryTrigger('can you help me debug this function?')).toBeNull();
    });

    test('message containing trigger word mid-sentence', () => {
      // "lembra que" must be at START of message
      expect(detectMemoryTrigger('voce lembra que eu te falei?')).toBeNull();
    });
  });
});
```

**Nota:** Os testes cobrem apenas `detectMemoryTrigger()` (logica pura). A funcao `detectAndSaveImmediateMemory()` depende de memoryManagerV2 inicializado com DB, o que requer teste de integracao (fora do escopo deste plano).
</action>
<verify>
<automated>cd /home/projects/ForgeClaw && bun test packages/bot/src/handlers/__tests__/immediate-memory.test.ts 2>&1 | tail -20</automated>
</verify>
<done>
- Todos os testes passam
- Cobertura: 12+ triggers em PT e EN testados
- Kind inference (fact/preference/decision) testada
- Non-matches verificados (sem falsos positivos)
- Trigger mid-sentence corretamente rejeitado (pattern anchored to start)
</done>
</task>

<task id="4" type="checkpoint:human-verify">
<files>packages/bot/src/handlers/immediate-memory.ts, packages/bot/src/handlers/text.ts</files>
<action>
Verificacao manual end-to-end via Telegram:

1. Enviar no Telegram: "lembra que o servidor de staging usa porta 3001"
2. Verificar que Claude responde normalmente (mensagem nao e bloqueada)
3. Checar no DB se memory entry foi criada:
   ```bash
   sqlite3 ~/.forgeclaw/db/forgeclaw.db "SELECT id, kind, content, source_type, reviewed FROM memory_entries ORDER BY created_at DESC LIMIT 5;"
   ```
4. Verificar que a entry tem: kind='fact', content contem "o servidor de staging usa porta 3001", source_type='manual', reviewed=1
5. Enviar no Telegram: "eu prefiro respostas curtas e diretas"
6. Verificar que a entry tem kind='preference'
7. Enviar mensagem normal sem trigger: "qual o status do projeto?"
8. Verificar que NENHUMA entry nova foi criada (nao gera falsos positivos)
9. Repetir o passo 1 com a mesma frase -- verificar que NAO cria duplicata (dedup por hash)

Checar logs do bot para mensagens `[immediate-memory]`:
```bash
journalctl -u forgeclaw-bot --since "5 min ago" | grep immediate-memory
```
</action>
<verify>
<automated>sqlite3 ~/.forgeclaw/db/forgeclaw.db "SELECT count(*) FROM memory_entries WHERE source_type='manual' AND created_at > (strftime('%s','now')*1000 - 300000);" 2>/dev/null || echo "DB check skipped"</automated>
</verify>
<done>
- Mensagem com trigger "lembra que" cria entry imediata no DB
- Mensagem com trigger "eu prefiro" cria entry com kind='preference'
- Mensagem normal NAO cria entry
- Mensagem duplicada NAO cria segunda entry
- Claude responde normalmente em todos os casos
- Logs mostram `[immediate-memory] saved:` para triggers validos
</done>
</task>

## Criterios de Sucesso

- [ ] Mensagens com triggers de memoria ("lembra que", "remember that", "nao esqueca", etc.) criam entry imediata no memory_entries
- [ ] Kind e inferido corretamente: fact (padrao), preference (quando contem "prefiro"/"prefer"), decision (quando contem "decidi"/"from now on")
- [ ] Mensagem continua fluindo para Claude normalmente (fire-and-forget, sem await blocking)
- [ ] Entradas duplicadas sao dedupadas (builtin-store sha256 check)
- [ ] Security scanner roda antes de persistir (via handleToolCall path)
- [ ] Audit trail criado para cada entry (via builtin-store)
- [ ] Mensagens sem trigger nao sao afetadas
- [ ] Testes unitarios passam para todos os patterns
