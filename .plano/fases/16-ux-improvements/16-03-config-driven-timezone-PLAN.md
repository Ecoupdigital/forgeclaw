---
phase: 16-ux-improvements
plan: 16-03
type: fix
autonomous: true
wave: 1
depends_on: []
requirements: [HIG-H10]
must_haves:
  truths:
    - "Timezone is configurable via ForgeClawConfig.timezone field"
    - "All dashboard date formatting uses config timezone instead of hardcoded BRT"
    - "Default timezone is America/Sao_Paulo for backward compatibility"
  artifacts:
    - path: "packages/core/src/types.ts"
      provides: "ForgeClawConfig.timezone?: string"
    - path: "packages/core/src/config.ts"
      provides: "timezone validation in validateConfig"
    - path: "packages/dashboard/src/lib/types.ts"
      provides: "ForgeClawConfig.timezone?: string (mirror)"
    - path: "packages/dashboard/src/hooks/use-timezone.ts"
      provides: "useTimezone hook + formatInTz utility"
    - path: "packages/dashboard/src/components/memory-tab.tsx"
      provides: "Uses useTimezone instead of brtTime"
    - path: "packages/dashboard/src/components/cron-form-sheet.tsx"
      provides: "Uses config timezone instead of hardcoded DISPLAY_TZ"
  key_links:
    - from: "use-timezone.ts"
      to: "api/config"
      via: "fetch config once, extract timezone field"
    - from: "memory-tab.tsx"
      to: "use-timezone.ts"
      via: "import { useTimezone, formatInTz } hook"
    - from: "cron-form-sheet.tsx"
      to: "use-timezone.ts"
      via: "import { useTimezone } hook"
---

# Fase 16 Plano 03: Config-Driven Timezone (H10)

**Objetivo:** Substituir todas as referencias hardcoded a BRT/America/Sao_Paulo no dashboard por timezone configuravel via `ForgeClawConfig.timezone`. O default continua `America/Sao_Paulo` para backward compatibility. A funcao `brtTime()` em memory-tab.tsx esta bugada (faz `new Date(ms - 3*60*60*1000)` que nao considera horario de verao) e sera substituida por `Intl.DateTimeFormat` com timezone explicito.

## Contexto

@packages/core/src/types.ts — ForgeClawConfig sem campo timezone
@packages/core/src/config.ts — validateConfig sem timezone
@packages/dashboard/src/lib/types.ts — ForgeClawConfig mirror sem timezone
@packages/dashboard/src/components/memory-tab.tsx — brtTime() bugado (UTC-3 manual)
@packages/dashboard/src/components/cron-form-sheet.tsx — DISPLAY_TZ = "America/Sao_Paulo" hardcoded

## Tarefas

<task id="1" type="auto">
<files>packages/core/src/types.ts</files>
<action>
Adicionar campo `timezone` ao interface `ForgeClawConfig`:

No interface `ForgeClawConfig` (linha ~12), adicionar apos `dashboardToken?: string;` (ultimo campo atual):
```typescript
  /**
   * IANA timezone for display purposes (dashboard, cron preview, memory timestamps).
   * Default: 'America/Sao_Paulo'. Examples: 'Europe/London', 'US/Eastern'.
   */
  timezone?: string;
```

Nenhuma outra mudanca neste arquivo.
</action>
<verify>
  <automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/core/tsconfig.json 2>&1 | head -20</automated>
</verify>
<done>ForgeClawConfig.timezone field adicionado com JSDoc. Tipo string opcional, default sera aplicado em config.ts.</done>
</task>

<task id="2" type="auto">
<files>packages/core/src/config.ts</files>
<action>
Adicionar timezone ao validateConfig e ao return object:

1. Na funcao `validateConfig` (linha ~12), no return object (comeca ~36), adicionar apos a linha do `dashboardToken`:
   ```typescript
   timezone: typeof obj.timezone === 'string' ? obj.timezone : 'America/Sao_Paulo',
   ```

Isso garante que configs existentes sem timezone recebem o default 'America/Sao_Paulo'.
Nao precisa validar se e um IANA timezone valido — Intl.DateTimeFormat lida com invalidos gracefully.
</action>
<verify>
  <automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/core/tsconfig.json 2>&1 | head -20</automated>
</verify>
<done>validateConfig retorna timezone do config ou default 'America/Sao_Paulo'. Backward compatible com configs existentes.</done>
</task>

<task id="3" type="auto">
<files>packages/dashboard/src/lib/types.ts</files>
<action>
Adicionar campo `timezone` ao interface `ForgeClawConfig` do dashboard (mirror do core):

No interface `ForgeClawConfig` (linha ~69), adicionar apos `dashboardToken?: string;`:
```typescript
  timezone?: string;
```

Manter sincronizado com o core type.
</action>
<verify>
  <automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 | head -20</automated>
</verify>
<done>Dashboard ForgeClawConfig type espelha o core com campo timezone.</done>
</task>

<task id="4" type="auto">
<files>packages/dashboard/src/hooks/use-timezone.ts</files>
<action>
Criar novo hook `useTimezone` que busca timezone do config e expoe funcao de formatacao:

```typescript
"use client";

import { useState, useEffect, useMemo } from "react";

const DEFAULT_TZ = "America/Sao_Paulo";

/**
 * Format a Unix-ms timestamp in the given IANA timezone.
 * Uses Intl.DateTimeFormat for DST-correct display.
 */
export function formatInTz(ms: number, tz: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(ms));
  } catch {
    // Fallback if tz is invalid
    return new Date(ms).toISOString().replace("T", " ").slice(0, 16);
  }
}

/**
 * Hook that fetches the configured timezone from /api/config.
 * Returns { timezone, formatTime } where formatTime(ms) produces
 * a locale string in the configured timezone.
 *
 * Fetches once on mount, caches in module-level variable.
 */
let cachedTz: string | null = null;

export function useTimezone(): {
  timezone: string;
  formatTime: (ms: number) => string;
} {
  const [tz, setTz] = useState<string>(cachedTz ?? DEFAULT_TZ);

  useEffect(() => {
    if (cachedTz) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/config", { cache: "no-store" });
        const data = await res.json();
        const configTz = data.config?.timezone;
        if (!cancelled && typeof configTz === "string" && configTz) {
          cachedTz = configTz;
          setTz(configTz);
        }
      } catch {
        // Keep default
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const formatTime = useMemo(
    () => (ms: number) => formatInTz(ms, tz),
    [tz],
  );

  return { timezone: tz, formatTime };
}
```

Este hook:
- Busca config uma vez, cacheia em variavel de modulo
- Retorna `timezone` (string IANA) e `formatTime(ms)` que formata usando Intl.DateTimeFormat
- Default 'America/Sao_Paulo' se config nao disponivel
- DST-correct (nao faz subtracao manual)
</action>
<verify>
  <automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 | head -20</automated>
</verify>
<done>Hook useTimezone criado. Busca timezone da config API, expoe formatTime() com Intl.DateTimeFormat. Cached em modulo para evitar re-fetches.</done>
</task>

<task id="5" type="auto">
<files>packages/dashboard/src/components/memory-tab.tsx</files>
<action>
Substituir `brtTime()` hardcoded pelo hook `useTimezone`:

1. **Remover a funcao brtTime** (linhas 49-52):
   ```typescript
   // DELETE THIS:
   function brtTime(ms: number): string {
     const d = new Date(ms - 3 * 60 * 60 * 1000);
     return d.toISOString().replace("T", " ").slice(0, 16);
   }
   ```

2. **Adicionar import do hook** (apos os imports existentes, antes dos type definitions):
   ```typescript
   import { useTimezone } from "@/hooks/use-timezone";
   ```

3. **Usar o hook dentro do componente MemoryTab** (primeira linha do corpo da funcao):
   ```typescript
   const { formatTime } = useTimezone();
   ```

4. **Substituir todas as chamadas `brtTime(...)` por `formatTime(...)`**:
   - Linha ~296 (no renderEntryCard): `{brtTime(entry.updatedAt)}` -> `{formatTime(entry.updatedAt)}`
   - Linha ~674 (em retrievals): `{brtTime(r.at)}` -> `{formatTime(r.at)}`
   - Linha ~716 (em audit): `{brtTime(a.at)}` -> `{formatTime(a.at)}`

Sao exatamente 3 ocorrencias de `brtTime(` no arquivo. Substituir todas por `formatTime(`.
</action>
<verify>
  <automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 | head -20 && grep -n "brtTime\|BRT\|3 \* 60" /home/projects/ForgeClaw/packages/dashboard/src/components/memory-tab.tsx || echo "clean"</automated>
</verify>
<done>memory-tab.tsx nao tem mais brtTime() nem subtracao manual de UTC-3. Usa formatTime() do useTimezone hook. DST-correct.</done>
</task>

<task id="6" type="auto">
<files>packages/dashboard/src/components/cron-form-sheet.tsx</files>
<action>
Substituir constante DISPLAY_TZ hardcoded pelo hook useTimezone:

1. **Adicionar import do hook** (apos imports existentes):
   ```typescript
   import { useTimezone, formatInTz } from "@/hooks/use-timezone";
   ```

2. **Remover constantes hardcoded** (linhas 58-80 do original):
   - REMOVER: `const DISPLAY_TZ = "America/Sao_Paulo";`
   - REMOVER: `const BROWSER_TZ = ...` (linhas 64-67)
   - REMOVER: `const displayFormatter = ...` (linhas 69-80)
   - REMOVER: funcao `formatInDisplayTz` (linhas 82-85)

3. **Dentro do componente `CronFormSheet`**, adicionar na primeira linha do corpo:
   ```typescript
   const { timezone: displayTz } = useTimezone();
   ```

4. **Recriar formatInDisplayTz usando o hook:**
   Mover para dentro do componente (ou logo apos o hook call):
   ```typescript
   const formatInDisplayTz = (d: Date) => formatInTz(d.getTime(), displayTz);
   ```

5. **Atualizar as referencias a DISPLAY_TZ no JSX:**
   - Linha ~362: `Runs on server ({SERVER_TZ}), displayed in {DISPLAY_TZ}` -> `Runs on server ({SERVER_TZ}), displayed in {displayTz}`
   - Linha ~363: `{BROWSER_TZ !== DISPLAY_TZ && ...}` -> remover essa linha inteira (nao faz mais sentido comparar com browser TZ quando config e a fonte de verdade). Ou substituir por:
     ```tsx
     {typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone !== displayTz && (
       <span className="ml-1 text-[10px]">
         (browser: {Intl.DateTimeFormat().resolvedOptions().timeZone})
       </span>
     )}
     ```

6. **Manter SERVER_TZ** como constante (`"Etc/UTC"`) — essa e a TZ do servidor e nao muda com config.

Resumo: `DISPLAY_TZ` hardcoded vira `displayTz` do hook. `displayFormatter` e `formatInDisplayTz` sao substituidos pela funcao importada `formatInTz`. Logica de BROWSER_TZ opcionalmente mantida como info comparativa.
</action>
<verify>
  <automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 | head -20 && grep -n 'DISPLAY_TZ\|"America/Sao_Paulo"\|hardcoded\|BRT' /home/projects/ForgeClaw/packages/dashboard/src/components/cron-form-sheet.tsx || echo "clean"</automated>
</verify>
<done>cron-form-sheet.tsx usa timezone da config via useTimezone hook. Nenhuma referencia hardcoded a America/Sao_Paulo ou BRT. displayFormatter substituido por formatInTz importado.</done>
</task>

<task id="7" type="auto">
<files>packages/dashboard/src/components/cron-card.tsx</files>
<action>
O `formatTimestamp` no cron-card.tsx (linha 39-47) usa `toLocaleString("pt-BR")` sem timezone explicito, o que depende do locale do server Next.js. Corrigir para usar timezone da config:

1. **Adicionar import do hook**:
   ```typescript
   import { useTimezone } from "@/hooks/use-timezone";
   ```

2. **Dentro do componente CronCard**, adicionar na primeira linha:
   ```typescript
   const { formatTime } = useTimezone();
   ```

3. **Remover funcao `formatTimestamp`** (linhas 39-47) e substituir as chamadas por `formatTime`:
   - Linha ~125 (schedule/Last run): `{formatTimestamp(job.lastRun)}` -> `{job.lastRun ? formatTime(job.lastRun) : "Never"}`
   - Linha ~265 (logs timestamp): `{formatTimestamp(log.startedAt)}` -> `{formatTime(log.startedAt)}`

A funcao `formatTimestamp` standalone precisa ser removida pois nao tem acesso ao hook. Mover a logica para dentro do componente usando `formatTime`.
</action>
<verify>
  <automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 | head -20</automated>
</verify>
<done>cron-card.tsx usa formatTime() do useTimezone hook. Timestamps respeitam timezone configurado.</done>
</task>

<task id="8" type="checkpoint:human-verify">
<files>packages/dashboard/src/components/memory-tab.tsx, packages/dashboard/src/components/cron-form-sheet.tsx</files>
<action>
Verificacao visual:
1. Abrir dashboard, aba Memory — timestamps devem mostrar hora em formato pt-BR com timezone correto (nao mais UTC-3 manual)
2. Abrir aba Crons, clicar "New cron" — "Next runs:" deve mostrar horarios no timezone da config
3. A label deve dizer "displayed in America/Sao_Paulo" (ou o que estiver na config)
4. Se mudar timezone na config para outro valor (ex: "Etc/UTC"), recarregar dashboard e confirmar que timestamps mudaram
</action>
<verify>
  <automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 | head -10</automated>
</verify>
<done>Todas as datas no dashboard usam timezone da config. Nenhum hardcode de BRT/America/Sao_Paulo restante nos componentes.</done>
</task>

## Criterios de Sucesso

- [ ] ForgeClawConfig.timezone existe em core/types.ts e dashboard/types.ts
- [ ] validateConfig retorna timezone com default America/Sao_Paulo
- [ ] useTimezone hook busca timezone da API config
- [ ] brtTime() removido do memory-tab.tsx
- [ ] DISPLAY_TZ removido do cron-form-sheet.tsx
- [ ] Todos timestamps no dashboard usam Intl.DateTimeFormat com timezone da config
- [ ] TypeScript compila sem erros
- [ ] Backward compatible: config sem timezone usa default America/Sao_Paulo
