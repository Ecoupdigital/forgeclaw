---
phase: 19-dashboard-safety
plan: 19-01
type: fix
autonomous: true
wave: 0
depends_on: []
requirements: [MED-M4, MED-M6, MED-M9]
must_haves:
  truths:
    - "PUT /api/config rejects unknown fields with 400 and details"
    - "PUT /api/config accepts only whitelisted ForgeClawConfig fields"
    - "Cron failure messages in Telegram show a red X emoji prefix, success shows green check"
    - "allowedUsers is editable in the dashboard config tab (add/remove)"
    - "allowedGroups is editable in the dashboard config tab (add/remove)"
  artifacts:
    - path: "packages/dashboard/src/app/api/config/route.ts"
      provides: "Whitelist validation on PUT handler"
    - path: "packages/bot/src/index.ts"
      provides: "Emoji-prefixed cron:result messages"
    - path: "packages/dashboard/src/components/config-tab.tsx"
      provides: "Editable allowedUsers and allowedGroups lists"
  key_links:
    - from: "config-tab.tsx"
      to: "/api/config PUT"
      via: "fetch PUT with updated allowedUsers/allowedGroups arrays"
    - from: "cron-engine.ts eventBus.emit('cron:result')"
      to: "bot/src/index.ts cron:result listener"
      via: "eventBus event with status field"
---

# Fase 19 Plano 01: Config Validation + Cron Prefix + Editable Users

**Objetivo:** Fechar tres gaps MEDIUM de seguranca e UX do dashboard: (M4) validar campos do config contra whitelist, (M6) prefixar mensagens de cron no Telegram com emoji de status, (M9) tornar allowedUsers/allowedGroups editaveis no config tab.

## Contexto

@packages/dashboard/src/app/api/config/route.ts — PUT handler que aceita qualquer JSON sem validacao
@packages/core/src/types.ts — ForgeClawConfig interface com todos os campos validos
@packages/bot/src/index.ts — listener cron:result (linhas 292-330) que formata e envia msg pro Telegram
@packages/dashboard/src/components/config-tab.tsx — config tab com allowedUsers como texto readonly
@packages/dashboard/src/lib/core.ts — writeConfig() que persiste no disco (linhas 931-966)
@packages/dashboard/src/lib/types.ts — ForgeClawConfig mirror do dashboard

## Tarefas

<task id="1" type="auto">
<files>packages/dashboard/src/app/api/config/route.ts</files>
<action>
Adicionar validacao de whitelist no PUT handler. O handler deve:

1. Definir um `Set` com os nomes de campos validos do `ForgeClawConfig`:
```typescript
const VALID_CONFIG_FIELDS = new Set<string>([
  'botToken',
  'allowedUsers',
  'allowedGroups',
  'workingDir',
  'vaultPath',
  'voiceProvider',
  'claudeModel',
  'maxConcurrentSessions',
  'defaultRuntime',
  'runtimes',
  'writerRuntime',
  'writerModel',
  'showRuntimeBadge',
  'memoryReviewMode',
  'memoryAutoApproveThreshold',
  'dashboardToken',
  'timezone',
]);
```

2. Apos `const body = await request.json();`, validar o body:
```typescript
const body = await request.json();

// Validate: reject unknown fields
const incoming = body as Record<string, unknown>;
const unknownFields = Object.keys(incoming).filter(
  (key) => !VALID_CONFIG_FIELDS.has(key)
);

if (unknownFields.length > 0) {
  return Response.json(
    {
      success: false,
      error: 'Unknown config fields rejected',
      unknownFields,
    },
    { status: 400 }
  );
}
```

3. Manter o resto do handler inalterado (chamada a `core.writeConfig`, re-read, etc.).

Imports existentes nao mudam. Nenhuma dependencia nova.
</action>
<verify>
<automated>cd /home/projects/ForgeClaw && npx tsx -e "
const VALID = new Set(['botToken','allowedUsers','allowedGroups','workingDir','vaultPath','voiceProvider','claudeModel','maxConcurrentSessions','defaultRuntime','runtimes','writerRuntime','writerModel','showRuntimeBadge','memoryReviewMode','memoryAutoApproveThreshold','dashboardToken','timezone']);
// Simulate unknown field
const body = { botToken: 'x', hackedField: true };
const unknown = Object.keys(body).filter(k => !VALID.has(k));
if (unknown.length !== 1 || unknown[0] !== 'hackedField') throw new Error('Whitelist logic broken');
// Simulate valid body
const body2 = { botToken: 'x', claudeModel: 'sonnet' };
const unknown2 = Object.keys(body2).filter(k => !VALID.has(k));
if (unknown2.length !== 0) throw new Error('Valid fields wrongly rejected');
console.log('PASS: whitelist validation logic correct');
"</automated>
</verify>
<done>PUT /api/config com campo desconhecido (ex: `{hackedField: true}`) retorna 400 com `unknownFields: ['hackedField']`. PUT com apenas campos validos continua funcionando normalmente (200).</done>
</task>

<task id="2" type="auto">
<files>packages/bot/src/index.ts</files>
<action>
Modificar o listener `eventBus.on('cron:result', ...)` (linhas 292-330 do arquivo atual).

Trocar a formatacao da mensagem de:
```typescript
const statusIcon = status === 'success' ? '[OK]' : '[FAIL]';
const message = `${statusIcon} Cron: ${jobName}\n\n${String(output).slice(0, 4000)}`;
```

Para:
```typescript
const statusIcon = status === 'success' ? '\u2705' : '\u274C';
const statusLabel = status === 'success' ? 'OK' : 'FALHOU';
const message = `${statusIcon} Cron ${statusLabel}: ${jobName}\n\n${String(output).slice(0, 4000)}`;
```

Onde `\u2705` e o emoji check verde e `\u274C` e o emoji X vermelho. Usar unicode escapes para evitar problemas de encoding no arquivo fonte.

Nao alterar mais nada no listener — a logica de roteamento (topic vs DM fallback) permanece identica.

Nao alterar a linha de memory log (`[cron:${status}]`) que fica acima — ela e para o daily log, nao para Telegram.
</action>
<verify>
<automated>cd /home/projects/ForgeClaw && grep -n 'statusIcon\|statusLabel\|\\\\u2705\|\\\\u274C\|FALHOU' packages/bot/src/index.ts | head -10</automated>
</verify>
<done>Mensagem de cron no Telegram mostra "check_verde Cron OK: jobName" para sucesso e "X_vermelho Cron FALHOU: jobName" para falha, visualmente distinto no chat.</done>
</task>

<task id="3" type="auto">
<files>packages/dashboard/src/components/config-tab.tsx</files>
<action>
Substituir a exibicao readonly de `allowedUsers` e `allowedGroups` por listas editaveis. O padrao e: cada ID em uma row com botao de remover, e um input + botao "Add" no final.

1. Criar um componente inline `EditableIdList` dentro do mesmo arquivo (antes do `ConfigTab`):

```typescript
interface EditableIdListProps {
  label: string;
  ids: number[];
  onChange: (ids: number[]) => void;
}

function EditableIdList({ label, ids, onChange }: EditableIdListProps) {
  const [draft, setDraft] = useState('');

  const handleAdd = () => {
    const parsed = parseInt(draft, 10);
    if (Number.isNaN(parsed)) return;
    if (ids.includes(parsed)) return; // no duplicates
    onChange([...ids, parsed]);
    setDraft('');
  };

  const handleRemove = (id: number) => {
    onChange(ids.filter((x) => x !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="py-2">
      <span className="text-sm text-text-secondary">{label}</span>
      <div className="mt-2 space-y-1.5">
        {ids.map((id) => (
          <div
            key={id}
            className="flex items-center justify-between rounded-md border border-violet-dim bg-night-panel px-3 py-1.5"
          >
            <span className="font-mono text-sm text-text-body">{id}</span>
            <button
              type="button"
              onClick={() => handleRemove(id)}
              className="ml-2 text-xs text-red-400 hover:text-red-300"
              aria-label={`Remove ${id}`}
            >
              Remove
            </button>
          </div>
        ))}
        {ids.length === 0 && (
          <span className="text-xs text-text-secondary/60 italic">
            No IDs configured
          </span>
        )}
        <div className="flex gap-2 pt-1">
          <Input
            type="number"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Telegram user/group ID"
            className="max-w-[220px] border-violet-dim bg-night-panel text-sm font-mono text-text-body focus-visible:ring-violet"
          />
          <Button
            type="button"
            onClick={handleAdd}
            disabled={!draft || Number.isNaN(parseInt(draft, 10))}
            variant="outline"
            size="sm"
            className="border-violet-dim text-text-secondary hover:bg-violet/10 hover:text-text-body"
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
```

2. No card "Telegram" do `ConfigTab`, substituir o bloco readonly de `allowedUsers` (linhas ~285-292 atuais):

De:
```tsx
<div className="flex items-center justify-between py-2">
  <span className="text-sm text-text-secondary">Allowed Users</span>
  <span className="font-mono text-sm text-text-body">
    {config.allowedUsers.join(", ")}
  </span>
</div>
```

Para:
```tsx
<EditableIdList
  label="Allowed Users"
  ids={config.allowedUsers}
  onChange={(ids) => updateField('allowedUsers', ids)}
/>
```

3. Substituir o bloco readonly de `allowedGroups` (linhas ~293-305 atuais):

De:
```tsx
{config.allowedGroups && config.allowedGroups.length > 0 && (
  <>
    <Separator className="bg-white/[0.06]" />
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-text-secondary">Allowed Groups</span>
      <span className="font-mono text-sm text-text-body">
        {config.allowedGroups.join(", ")}
      </span>
    </div>
  </>
)}
```

Para (SEMPRE visivel, mesmo se vazio — permite adicionar o primeiro grupo):
```tsx
<Separator className="bg-white/[0.06]" />
<EditableIdList
  label="Allowed Groups"
  ids={config.allowedGroups ?? []}
  onChange={(ids) => updateField('allowedGroups', ids)}
/>
```

4. O `handleSave` existente ja faz `JSON.stringify(config)` e PUT pro `/api/config` — os arrays `allowedUsers` e `allowedGroups` serao enviados automaticamente como parte do config object. Nao precisa de mudanca no handleSave.

Nao adicionar imports novos — `useState` ja esta importado, `Input`, `Button`, `Separator` tambem.
</action>
<verify>
<automated>cd /home/projects/ForgeClaw && grep -c 'EditableIdList' packages/dashboard/src/components/config-tab.tsx</automated>
</verify>
<done>allowedUsers exibe lista de IDs com botao Remove em cada row e input+Add no final. allowedGroups exibe o mesmo layout (visivel mesmo quando vazio). Ao clicar Save Changes, o PUT envia os arrays atualizados.</done>
</task>

<task id="4" type="auto">
<files>packages/dashboard/src/components/config-tab.tsx</files>
<action>
Adicionar protecao contra auto-lockout na `EditableIdList` de `allowedUsers`:

No callback `onChange` passado para o `EditableIdList` de `allowedUsers`, impedir que a lista fique vazia:

```tsx
<EditableIdList
  label="Allowed Users"
  ids={config.allowedUsers}
  onChange={(ids) => {
    if (ids.length === 0) return; // prevent lockout — at least 1 user required
    updateField('allowedUsers', ids);
  }}
/>
```

Tambem adicionar feedback visual: quando `ids.length === 1` no `EditableIdList`, o botao Remove do ultimo item deve ficar desabilitado. Modificar o componente `EditableIdList` para aceitar um prop opcional `minItems?: number`:

```typescript
interface EditableIdListProps {
  label: string;
  ids: number[];
  onChange: (ids: number[]) => void;
  minItems?: number;
}
```

E no botao Remove:
```tsx
<button
  type="button"
  onClick={() => handleRemove(id)}
  disabled={minItems !== undefined && ids.length <= minItems}
  className={`ml-2 text-xs ${
    minItems !== undefined && ids.length <= minItems
      ? 'text-text-secondary/30 cursor-not-allowed'
      : 'text-red-400 hover:text-red-300'
  }`}
  aria-label={`Remove ${id}`}
>
  Remove
</button>
```

Passar `minItems={1}` para allowedUsers:
```tsx
<EditableIdList
  label="Allowed Users"
  ids={config.allowedUsers}
  onChange={(ids) => {
    if (ids.length === 0) return;
    updateField('allowedUsers', ids);
  }}
  minItems={1}
/>
```

Nao passar `minItems` para allowedGroups (pode ser vazio).
</action>
<verify>
<automated>cd /home/projects/ForgeClaw && grep -c 'minItems' packages/dashboard/src/components/config-tab.tsx</automated>
</verify>
<done>O ultimo usuario em allowedUsers nao pode ser removido (botao desabilitado + visual de cursor-not-allowed). allowedGroups pode ficar vazio normalmente.</done>
</task>

<task id="5" type="checkpoint:human-verify">
<files>packages/dashboard/src/app/api/config/route.ts, packages/bot/src/index.ts, packages/dashboard/src/components/config-tab.tsx</files>
<action>
Verificacao manual fim-a-fim das tres mudancas:

1. **M4 — Config Whitelist:**
   - Abrir terminal e testar com curl:
     ```bash
     curl -X PUT http://localhost:4040/api/config \
       -H "Content-Type: application/json" \
       -H "Authorization: Bearer TOKEN" \
       -d '{"botToken":"test","invalidField":"hack","anotherBad":123}'
     ```
   - Deve retornar 400 com `unknownFields: ["invalidField", "anotherBad"]`
   - Testar com campos validos — deve retornar 200

2. **M6 — Cron Prefix:**
   - Verificar o codigo do listener em `packages/bot/src/index.ts`
   - Confirmar que `statusIcon` usa unicode check/X e `statusLabel` usa OK/FALHOU
   - (Teste real de cron requer trigger manual — verificar visualmente no codigo)

3. **M9 — Editable Users:**
   - Abrir dashboard http://localhost:4040 → tab Config → secao Telegram
   - Verificar que allowedUsers mostra lista com Remove por item e Add no final
   - Tentar remover o ultimo user — botao deve estar disabled
   - Verificar que allowedGroups aparece mesmo vazio, com input para adicionar
   - Adicionar um ID, clicar Save, recarregar — deve persistir
</action>
<verify>
<automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 | head -20</automated>
</verify>
<done>Todas as tres features (whitelist, emoji prefix, editable users) funcionam corretamente no browser e via API. TypeScript compila sem erros.</done>
</task>

## Criterios de Sucesso

- [ ] PUT /api/config com campo desconhecido retorna 400 com lista de campos rejeitados
- [ ] PUT /api/config com apenas campos validos funciona normalmente (200)
- [ ] Mensagem de cron no Telegram usa emoji check verde para sucesso e X vermelho para falha
- [ ] allowedUsers exibe lista editavel com add/remove no config tab
- [ ] allowedGroups exibe lista editavel (visivel mesmo quando vazia)
- [ ] Ultimo usuario em allowedUsers nao pode ser removido (protecao anti-lockout)
- [ ] TypeScript compila sem erros
